import React, { useState } from 'react';

export const RedeemPanel: React.FC = () => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Haptic helper with try-catch for robust older iOS support
  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error' | 'heavy') => {
    if (!navigator.vibrate) return;
    try {
        switch (type) {
          case 'light': navigator.vibrate(10); break;
          case 'medium': navigator.vibrate(20); break;
          case 'success': navigator.vibrate([10, 30, 10]); break; 
          case 'error': navigator.vibrate([50]); break; 
          case 'heavy': navigator.vibrate(75); break; 
        }
    } catch (e) { /* ignore */ }
  };

  const handleRedeem = () => {
    triggerHaptic('light');
    
    if (code.length < 12) {
      setStatus('error');
      setMessage('Invalid code (too short).');
      triggerHaptic('error');
      return;
    }

    setStatus('processing');
    setMessage('Verifying with server...');

    // Simulate network request
    setTimeout(() => {
      const randomOutcome = Math.random();
      if (randomOutcome > 0.5) {
         setStatus('success');
         setMessage('CONFIRMED: Rewards sent to in-game mail.');
         triggerHaptic('success');
      } else {
         setStatus('error');
         setMessage('ERROR: Code invalid, expired, or already redeemed.');
         triggerHaptic('error');
      }
    }, 2500);
  };

  const handleReset = (isLongPress = false) => {
    setCode('');
    setStatus('idle');
    triggerHaptic(isLongPress ? 'heavy' : 'medium');
  };

  const formatCode = (val: string) => {
    // Auto-capitalize, strip spaces/hyphens explicitly, and limit length to standard FF codes (12 or 16 chars usually)
    return val.toUpperCase().replace(/[\s-]/g, '').replace(/[^A-Z0-9]/g, '').slice(0, 16);
  };

  return (
    <div className="p-6 flex flex-col h-full overflow-y-auto no-scrollbar pb-safe-nav">
      <div className="flex-1 flex flex-col justify-center min-h-[400px]">
        <div className="bg-zinc-900/70 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl relative overflow-hidden shrink-0">
          {/* Ambient light effect in background of card */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>
          
          <div className="relative group">
            <input
              id="code-input"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck="false"
              value={code}
              onChange={(e) => {
                setCode(formatCode(e.target.value));
                if (status !== 'idle') setStatus('idle');
              }}
              placeholder="FFFF-XXXX-XXXX"
              className="w-full bg-black/40 border-2 border-zinc-700/50 focus:border-yellow-500 text-center text-2xl font-mono text-white rounded-2xl py-5 px-10 outline-none transition-all duration-300 placeholder-zinc-700 focus:bg-black/60"
            />
            {/* Clear button shows if code exists OR if we need to reset a status message */}
            {(code.length > 0 || status !== 'idle') && (
               <button
                 onClick={() => handleReset(false)}
                 onContextMenu={(e) => {
                   e.preventDefault();
                   handleReset(true);
                 }}
                 className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 bg-zinc-800/80 hover:bg-zinc-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors z-10"
                 aria-label="Clear code and reset status (Long press for hard reset)"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
               </button>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={handleRedeem}
              disabled={status === 'processing' || code.length < 12}
              className={`w-full py-4 rounded-2xl font-bold text-lg uppercase tracking-widest transition-all duration-200 ${
                status === 'processing'
                  ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                  : code.length < 12
                    ? 'bg-zinc-800 text-zinc-600'
                    : 'bg-yellow-500 active:bg-yellow-600 text-black shadow-lg shadow-yellow-500/20 active:scale-[0.97]'
              }`}
            >
              {status === 'processing' ? (
                <span className="flex items-center justify-center">
                   <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </span>
              ) : 'Redeem Code'}
            </button>
          </div>

          {/* Status Message Area */}
          <div className={`mt-6 overflow-hidden transition-all duration-500 ease-spring ${
            status === 'idle' ? 'max-h-0 opacity-0 scale-95' : 'max-h-40 opacity-100 scale-100'
          }`}>
            <div className={`p-4 rounded-2xl text-center text-sm font-medium border ${
               status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
               status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
               'bg-zinc-800/50 text-zinc-300 border-zinc-700/50'
            }`}>
              {message}
            </div>
          </div>
        </div>

        <p className="text-[10px] uppercase tracking-wider text-zinc-600 text-center px-8 mt-8 font-medium shrink-0">
          Free Fire Fan Utility &bull; v1.2.3
        </p>
      </div>
    </div>
  );
};