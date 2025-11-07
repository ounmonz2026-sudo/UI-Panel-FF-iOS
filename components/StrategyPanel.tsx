import React, { useState } from 'react';
import { GameMode, PlayStyle, StrategyResponse } from '../types';
import { generateTacticalBrief } from '../services/geminiService';

export const StrategyPanel: React.FC = () => {
  const [mode, setMode] = useState<GameMode>(GameMode.BATTLE_ROYALE);
  const [style, setStyle] = useState<PlayStyle>(PlayStyle.RUSHER);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const result = await generateTacticalBrief(mode, style);
      setStrategy(result);
    } catch (e: any) {
      setError(e.message || "Failed to generate strategy.");
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (type: 'up' | 'down') => {
      if (feedback === type) return; // Prevent duplicate
      setFeedback(type);

      // Haptic with try-catch for robustness
      if (navigator.vibrate) {
          try {
             navigator.vibrate(type === 'up' ? [10, 30] : 40);
          } catch (e) { /* ignore */ }
      }

      // Local Storage Logging
      try {
          const history = JSON.parse(localStorage.getItem('ff_feedback_history') || '[]');
          history.push({ timestamp: Date.now(), panel: 'strategy', type });
          localStorage.setItem('ff_feedback_history', JSON.stringify(history.slice(-50)));
      } catch (e) {
          // Ignore storage errors
      }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto no-scrollbar pb-safe-nav">
       <header className="mb-6 shrink-0">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
          Tactical<span className="text-yellow-500">AI</span>
        </h1>
        <p className="text-zinc-400 text-sm">Advanced Combat Analysis</p>
      </header>

      <div className="space-y-4 shrink-0">
        {/* Controls */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800/50">
            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Game Mode</label>
            <div className="flex bg-zinc-950 p-1 rounded-xl overflow-hidden">
              {Object.values(GameMode).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                    mode === m ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  {m.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800/50">
            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Play Style</label>
             <select
              value={style}
              onChange={(e) => setStyle(e.target.value as PlayStyle)}
              className="w-full bg-zinc-950 text-white text-sm rounded-xl p-3 border-r-[16px] border-transparent outline-none ring-1 ring-zinc-800 focus:ring-yellow-500 appearance-none"
            >
              {Object.values(PlayStyle).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`w-full py-4 rounded-2xl font-bold text-lg uppercase tracking-widest transition-all duration-300 flex items-center justify-center ${
             loading ? 'bg-zinc-800 text-zinc-500' : 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black shadow-lg shadow-yellow-500/20 active:scale-95'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            'Generate Brief'
          )}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl text-sm text-center animate-pulse">
          {error}
        </div>
      )}

      {/* Results Area */}
      {strategy && !loading && (
        <div className="mt-6 space-y-4 pb-8 animate-fadeIn">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-yellow-500/30 p-5 rounded-3xl shadow-2xl relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

            <h2 className="text-xl font-black italic text-yellow-500 uppercase mb-4 relative">
              {strategy.title}
            </h2>

            <div className="space-y-4 relative">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Squad Composition</h3>
                <div className="flex flex-wrap gap-2">
                  {strategy.characterCombination.map((char, i) => (
                    <span key={i} className="bg-zinc-800/80 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-100 border border-zinc-700/50">
                      {char}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Loadout</h3>
                 <div className="flex gap-2">
                  {strategy.weaponLoadout.map((weapon, i) => (
                    <span key={i} className="flex-1 bg-zinc-800/50 px-3 py-2 rounded-lg text-sm font-mono text-yellow-500/90 border border-yellow-900/30 text-center">
                      {weapon}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Directives</h3>
                <p className="text-sm text-zinc-300 leading-relaxed bg-black/20 p-3 rounded-xl">
                  {strategy.tacticalAdvice}
                </p>
              </div>

              {/* Feedback Section */}
              <div className="pt-4 mt-2 border-t border-white/5 flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Was this helpful?</span>
                  <div className="flex gap-2">
                      <button 
                          onClick={() => handleFeedback('up')}
                          className={`p-1.5 rounded-lg transition-all active:scale-90 ${feedback === 'up' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' : 'bg-zinc-900 text-zinc-600 hover:text-zinc-400'}`}
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M1 8.25a1.25 1.25 0 112.5 0v7.5a1.25 1.25 0 11-2.5 0v-7.5zM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0114 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 01-1.341 5.974C17.153 16.323 16.072 17 14.9 17h-3.192a3 3 0 01-1.341-.317l-2.734-1.366A3 3 0 006.292 15H5V8h.963c.685 0 1.258-.483 1.612-1.068a4.011 4.011 0 012.166-1.738L11 3z" />
                          </svg>
                      </button>
                      <button 
                          onClick={() => handleFeedback('down')}
                           className={`p-1.5 rounded-lg transition-all active:scale-90 ${feedback === 'down' ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50' : 'bg-zinc-900 text-zinc-600 hover:text-zinc-400'}`}
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M18.905 12.75a1.25 1.25 0 01-2.5 0v-7.5a1.25 1.25 0 112.5 0v7.5zM8.905 17v1.3c0 .268-.14.526-.395.607A2 2 0 015.905 17c0-.995.182-1.948.514-2.826.204-.54-.166-1.174-.744-1.174h-2.52c-1.243 0-2.261-1.01-2.146-2.247.193-2.08.652-4.082 1.341-5.974C2.752 3.678 3.833 3 5.005 3h3.192a3 3 0 011.341.317l2.734 1.366A3 3 0 0013.613 5h1.292v7h-.963c-.685 0-1.258.483-1.612 1.068a4.011 4.011 0 01-2.166 1.738L8.905 17z" />
                          </svg>
                      </button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};