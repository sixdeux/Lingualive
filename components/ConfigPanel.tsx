import React from 'react';
import { LanguageConfig, VoiceName } from '../types';
import { Mic, BookOpen, Settings2, User } from 'lucide-react';

interface ConfigPanelProps {
  config: LanguageConfig;
  voice: VoiceName;
  setConfig: (config: LanguageConfig) => void;
  setVoice: (voice: VoiceName) => void;
  onConnect: () => void;
  isConnecting: boolean;
  apiKey?: string;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ 
  config, voice, setConfig, setVoice, onConnect, isConnecting, apiKey 
}) => {
  return (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-2xl shadow-xl max-w-md w-full mx-auto mt-10 border border-slate-100">
      <div className="text-center mb-2">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
            <Mic size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Start Conversation</h2>
        <p className="text-slate-500 text-sm">Configure your practice session</p>
      </div>

      <div className="space-y-4">
        {/* Language */}
        <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Target Language
            </label>
            <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none appearance-none text-slate-700 font-medium transition-all hover:border-primary/30"
                    value={config.language}
                    onChange={(e) => setConfig({ ...config, language: e.target.value })}
                >
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Mandarin">Mandarin</option>
                    <option value="English">English</option>
                    <option value="Italian">Italian</option>
                </select>
            </div>
        </div>

        {/* Proficiency */}
        <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Proficiency Level
            </label>
            <div className="flex gap-2">
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
                    <button
                        key={level}
                        onClick={() => setConfig({ ...config, proficiency: level })}
                        className={`flex-1 py-2 px-2 text-sm rounded-lg font-medium transition-all ${
                            config.proficiency === level 
                            ? 'bg-primary text-white shadow-md shadow-primary/30' 
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {level}
                    </button>
                ))}
            </div>
        </div>

         {/* Voice Selection */}
         <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                AI Voice
            </label>
            <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none appearance-none text-slate-700 font-medium"
                    value={voice}
                    onChange={(e) => setVoice(e.target.value as VoiceName)}
                >
                    {Object.values(VoiceName).map(v => (
                        <option key={v} value={v}>{v}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Topic */}
        <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Topic
            </label>
             <div className="relative">
                <Settings2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-slate-700"
                    value={config.topic}
                    onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                    placeholder="e.g., Ordering Coffee, Daily Routine"
                />
            </div>
        </div>
      </div>

      <button
        onClick={onConnect}
        disabled={isConnecting || !apiKey}
        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
            isConnecting 
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
            : !apiKey 
                ? 'bg-red-100 text-red-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90 hover:shadow-primary/40'
        }`}
      >
        {isConnecting ? (
            <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
            </span>
        ) : !apiKey ? (
            'API Key Not Found'
        ) : (
            'Start Practicing'
        )}
      </button>
      {!apiKey && <p className="text-xs text-center text-red-400">Please configure API_KEY in metadata/env</p>}
    </div>
  );
};
