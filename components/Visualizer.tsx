import React from 'react';

interface VisualizerProps {
  inputVolume: number; // 0-255
  outputVolume: number; // 0-255
  isActive: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ inputVolume, outputVolume, isActive }) => {
  // Normalize volumes to 0-1 range for easier CSS usage
  const normInput = Math.min(inputVolume / 50, 1.5); 
  const normOutput = Math.min(outputVolume / 50, 1.5);
  
  // If not active, show flat line
  const activeInput = isActive ? Math.max(0.2, normInput) : 0.1;
  const activeOutput = isActive ? Math.max(0.2, normOutput) : 0.1;

  return (
    <div className="relative flex items-center justify-center h-48 w-full bg-slate-900 rounded-2xl overflow-hidden shadow-inner">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 opacity-90"></div>
      
      {/* Central Glow */}
      <div 
        className={`absolute w-32 h-32 rounded-full blur-3xl transition-all duration-100 ease-out ${isActive ? 'bg-indigo-500/30' : 'bg-slate-700/10'}`}
        style={{ transform: `scale(${1 + (normInput + normOutput) / 2})` }}
      />

      <div className="relative flex items-end justify-center gap-3 h-16">
        {/* User Bars (Left) - Greenish */}
        {[...Array(3)].map((_, i) => (
            <div
                key={`user-${i}`}
                className="w-3 rounded-full bg-emerald-400/80 transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                style={{ 
                    height: `${activeInput * (30 + i * 20)}%`,
                    opacity: isActive ? 0.8 + (i * 0.1) : 0.3
                }}
            />
        ))}

        {/* Center Separator */}
        <div className="w-1 h-full bg-slate-700/50 rounded-full mx-2"></div>

        {/* AI Bars (Right) - Indigo/Blue */}
        {[...Array(3)].map((_, i) => (
            <div
                key={`ai-${i}`}
                className="w-3 rounded-full bg-indigo-400/80 transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(129,140,248,0.5)]"
                style={{ 
                    height: `${activeOutput * (30 + i * 20)}%`,
                    opacity: isActive ? 0.8 + (i * 0.1) : 0.3
                }}
            />
        ))}
      </div>

      <div className="absolute bottom-4 text-xs font-mono text-slate-400 flex gap-8">
        <span className={normInput > 0.1 ? "text-emerald-400 font-bold" : ""}>YOU</span>
        <span className={normOutput > 0.1 ? "text-indigo-400 font-bold" : ""}>GEMINI</span>
      </div>
    </div>
  );
};
