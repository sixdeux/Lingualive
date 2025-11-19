import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, LiveSession } from '@google/genai';
import { base64ToBytes, pcmToAudioBuffer, float32ToBase64PCM } from '../utils/audioUtils';
import { Message, VoiceName, LanguageConfig } from '../types';

interface UseLiveSessionProps {
  apiKey: string;
  voice: VoiceName;
  config: LanguageConfig;
}

export const useLiveSession = ({ apiKey, voice, config }: UseLiveSessionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [volume, setVolume] = useState({ input: 0, output: 0 });
  const [error, setError] = useState<string | null>(null);

  // Audio Contexts
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  
  // Audio Nodes
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputGainNodeRef = useRef<GainNode | null>(null);
  const outputAnalyzerRef = useRef<AnalyserNode | null>(null);
  const inputAnalyzerRef = useRef<AnalyserNode | null>(null);

  // Session & State
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentInputTranscriptRef = useRef<string>('');
  const currentOutputTranscriptRef = useRef<string>('');

  // Clean up audio resources
  const cleanupAudio = useCallback(() => {
    if (inputSourceRef.current) inputSourceRef.current.disconnect();
    if (processorRef.current) processorRef.current.disconnect();
    if (outputGainNodeRef.current) outputGainNodeRef.current.disconnect();
    
    audioSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) { /* ignore */ }
    });
    audioSourcesRef.current.clear();

    if (inputAudioContextRef.current?.state !== 'closed') {
        inputAudioContextRef.current?.close();
    }
    if (outputAudioContextRef.current?.state !== 'closed') {
        outputAudioContextRef.current?.close();
    }
  }, []);

  const connect = useCallback(async () => {
    if (!apiKey) {
        setError("API Key is missing.");
        return;
    }

    setIsConnecting(true);
    setError(null);

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        // Initialize Audio Contexts
        // Input must be 16kHz for Gemini
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        // Output should be 24kHz (Gemini's native output rate)
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        // Setup Analyzers for visualization
        inputAnalyzerRef.current = inputAudioContextRef.current.createAnalyser();
        outputAnalyzerRef.current = outputAudioContextRef.current.createAnalyser();
        inputAnalyzerRef.current.fftSize = 32;
        outputAnalyzerRef.current.fftSize = 32;

        // Setup Output Chain
        outputGainNodeRef.current = outputAudioContextRef.current.createGain();
        outputGainNodeRef.current.connect(outputAnalyzerRef.current);
        outputAnalyzerRef.current.connect(outputAudioContextRef.current.destination);

        // Request Microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Setup Input Chain
        inputSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
        inputSourceRef.current.connect(inputAnalyzerRef.current);
        
        // Script Processor for raw PCM extraction
        // Buffer size 4096 provides a balance between latency and performance
        processorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        inputSourceRef.current.connect(processorRef.current);
        processorRef.current.connect(inputAudioContextRef.current.destination); // Required for chrome to fire callback

        // Initialize Gemini Live Session
        const systemInstruction = `You are a friendly and helpful language tutor helping a student practice ${config.language}. 
        The student is at a ${config.proficiency} level. 
        Topic: ${config.topic}.
        Keep your responses concise and encouraging. Correct major mistakes gently but focus on flow.`;

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
                },
                systemInstruction: systemInstruction,
                inputAudioTranscription: {},
                outputAudioTranscription: {}
            },
            callbacks: {
                onopen: () => {
                    console.log('Session opened');
                    setIsConnected(true);
                    setIsConnecting(false);
                    nextStartTimeRef.current = outputAudioContextRef.current?.currentTime || 0;
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle Audio Output
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio && outputAudioContextRef.current && outputGainNodeRef.current) {
                        const ctx = outputAudioContextRef.current;
                        const bytes = base64ToBytes(base64Audio);
                        const audioBuffer = pcmToAudioBuffer(bytes, ctx, 24000, 1);
                        
                        // Schedule playback
                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputGainNodeRef.current);
                        
                        const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
                        source.start(startTime);
                        nextStartTimeRef.current = startTime + audioBuffer.duration;
                        
                        audioSourcesRef.current.add(source);
                        source.onended = () => audioSourcesRef.current.delete(source);
                    }

                    // Handle Interruption
                    if (message.serverContent?.interrupted) {
                        audioSourcesRef.current.forEach(s => s.stop());
                        audioSourcesRef.current.clear();
                        nextStartTimeRef.current = outputAudioContextRef.current?.currentTime || 0;
                        currentOutputTranscriptRef.current = ''; // Clear pending output
                    }

                    // Handle Transcription
                    handleTranscription(message);
                },
                onclose: () => {
                    console.log('Session closed');
                    setIsConnected(false);
                    cleanupAudio();
                },
                onerror: (err) => {
                    console.error('Session error:', err);
                    setError("Connection error. Please try again.");
                    // Do not immediately disconnect here to allow the user to see the error, 
                    // but usually the session is dead.
                }
            }
        });

        // Audio Process Loop
        processorRef.current.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const base64Data = float32ToBase64PCM(inputData);
            
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => {
                    session.sendRealtimeInput({
                        media: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64Data
                        }
                    });
                }).catch(e => console.error("Failed to send input", e));
            }
        };

    } catch (err: any) {
        console.error("Setup error:", err);
        setError(err.message || "Failed to start session");
        setIsConnecting(false);
        cleanupAudio();
    }
  }, [apiKey, voice, config, cleanupAudio]);

  const disconnect = useCallback(() => {
     if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
     }
     cleanupAudio();
     setIsConnected(false);
     setMessages([]);
     currentInputTranscriptRef.current = '';
     currentOutputTranscriptRef.current = '';
  }, [cleanupAudio]);

  // Transcription Logic
  const handleTranscription = (message: LiveServerMessage) => {
    const content = message.serverContent;
    if (!content) return;

    // User Input Transcription
    if (content.inputTranscription) {
        currentInputTranscriptRef.current += content.inputTranscription.text;
    }

    // Model Output Transcription
    if (content.outputTranscription) {
        currentOutputTranscriptRef.current += content.outputTranscription.text;
    }

    // Turn Complete: Commit messages
    if (content.turnComplete) {
        const userText = currentInputTranscriptRef.current.trim();
        const modelText = currentOutputTranscriptRef.current.trim();

        if (userText) {
            setMessages(prev => [...prev, {
                id: Date.now() + '-user',
                role: 'user',
                text: userText,
                timestamp: new Date(),
                isFinal: true
            }]);
        }
        
        if (modelText) {
             setMessages(prev => [...prev, {
                id: Date.now() + '-model',
                role: 'model',
                text: modelText,
                timestamp: new Date(),
                isFinal: true
            }]);
        }

        currentInputTranscriptRef.current = '';
        currentOutputTranscriptRef.current = '';
    }
  };

  // Visualization Loop
  useEffect(() => {
    let animationFrame: number;

    const updateMeters = () => {
        if (!isConnected) {
             setVolume({ input: 0, output: 0 });
             return;
        }

        const getInputLevel = () => {
            if (!inputAnalyzerRef.current) return 0;
            const data = new Uint8Array(inputAnalyzerRef.current.frequencyBinCount);
            inputAnalyzerRef.current.getByteFrequencyData(data);
            return data.reduce((a, b) => a + b, 0) / data.length;
        };

        const getOutputLevel = () => {
             if (!outputAnalyzerRef.current) return 0;
            const data = new Uint8Array(outputAnalyzerRef.current.frequencyBinCount);
            outputAnalyzerRef.current.getByteFrequencyData(data);
            return data.reduce((a, b) => a + b, 0) / data.length;
        }

        setVolume({
            input: getInputLevel(),
            output: getOutputLevel()
        });

        animationFrame = requestAnimationFrame(updateMeters);
    };

    if (isConnected) {
        updateMeters();
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isConnected]);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    messages,
    volume,
    error
  };
};