import React, { useState, useEffect, useRef } from 'react';
import { Visualizer } from './components/Visualizer';
import { ConfigPanel } from './components/ConfigPanel';
import { useLiveSession } from './hooks/useLiveSession';
import { LanguageConfig, VoiceName } from './types';
import { MessageSquare, X, User, Sparkles } from 'lucide-react';

// Pre-configured API Key (In a real app this comes from env, but here we access process.env per instructions)
const API_KEY = process.env.API_KEY || '';

const App: React.FC = () => {
  // State
  const [hasStarted, setHasStarted] = useState(false);
  const [voice, setVoice] = useState<VoiceName>(VoiceName.Puck);
  const [config, setConfig] = useState<LanguageConfig>({
    language: 'Spanish',
    proficiency: 'Beginner',
    topic: 'Daily Routine'
  });

  // Hook
  const { 
    connect, 
    disconnect, 
    isConnected, 
    isConnecting, 
    messages, 
    volume,
    error 
  } = useLiveSession({
    apiKey: API_KEY,
    voice,
    config
  });

  // Auto-scroll chat
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handlers
  const handleStart = () => {
    connect();
  };

  const handleDisconnect = () => {
    disconnect();
    setHasStarted(false);
  };

  useEffect(() => {
    if (isConnected) {
      setHasStarted(true);
    }
  }, [isConnected]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
                <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">
              LinguaLive
            </span>
          </div>
          {hasStarted && (
             <div className="flex items-center gap-4">
                 <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs text-slate-400 font-medium uppercase">Practice</span>
                    <span className="text-sm font-bold text-slate-700">{config.language} • {config.topic}</span>
                 </div>
                 <button 
                    onClick={handleDisconnect}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    title="End Session"
                 >
                    <X size={20} />
                 </button>
             </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 flex flex-col">
        
        {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                <span className="font-bold">Error:</span> {error}
            </div>
        )}

        {!hasStarted ? (
           <div className="flex-1 flex items-center justify-center">
              <ConfigPanel 
                config={config} 
                setConfig={setConfig}
                voice={voice}
                setVoice={setVoice}
                onConnect={handleStart}
                isConnecting={isConnecting}
                apiKey={API_KEY}
              />
           </div>
        ) : (
          <div className="flex flex-col h-full gap-4">
            
            {/* Visualizer Area */}
            <div className="flex-shrink-0">
                <Visualizer 
                    inputVolume={volume.input} 
                    outputVolume={volume.output}
                    isActive={isConnected}
                />
            </div>

            {/* Chat/Transcript Area */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <MessageSquare size={16} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Transcript</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                            <MessageSquare size={48} className="opacity-20" />
                            <p>Start speaking to begin the conversation...</p>
                        </div>
                    )}
                    
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                msg.role === 'user' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                            }`}>
                                {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                            </div>
                            
                            <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-emerald-500 text-white rounded-tr-none' 
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                }`}>
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-slate-400 mt-1 px-1">
                                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
            </div>
            
            <div className="text-center text-xs text-slate-400 py-2">
                Powered by Gemini 2.5 Live API
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
