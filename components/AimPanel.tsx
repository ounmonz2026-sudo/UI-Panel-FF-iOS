import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SensitivityResponse, Tab } from '../types';
import { generateHeadshotConfig } from '../services/geminiService';

const STORAGE_KEY_DEVICE = 'ff_aim_device_model';
const STORAGE_KEY_PRESETS = 'ff_aim_presets';
const STORAGE_KEY_ASSIST_POS = 'ff_assist_pos';
const STORAGE_KEY_MACRO_POS = 'ff_macro_pos';

// iOS Safe Zones for Clamping
const SAFE = {
    TOP: 60,      // Notch / Dynamic Island clearance
    BOTTOM: 90,   // Home indicator / Tab bar clearance
    X: 12         // Side bezel clearance
};

interface Preset {
  id: number;
  name: string;
  config: SensitivityResponse;
  timestamp: number;
}

interface Position {
    x: number;
    y: number;
}

interface AimPanelProps {
    onSwitchTab?: (tab: Tab) => void;
}

// Updated to support 0-200 scale. Width is percentage (value / 2)%
const SensitivityBar: React.FC<{ label: string; value: number; delay: number }> = ({ label, value, delay }) => (
  <div className="mb-4 animate-fadeIn" style={{ animationDelay: `${delay}ms` }}>
    <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1">
      <span className="text-zinc-400">{label}</span>
      <span className="text-yellow-500">{value}</span>
    </div>
    <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 relative">
      {/* Background marker for 100 (midpoint) */}
      <div className="absolute left-1/2 top-0 h-full w-0.5 bg-zinc-800/50"></div>
      <div
        className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000 ease-out"
        style={{ width: `${Math.min((value / 200) * 100, 100)}%` }}
      ></div>
    </div>
  </div>
);

export const AimPanel: React.FC<AimPanelProps> = ({ onSwitchTab }) => {
  const [device, setDevice] = useState(() => {
      try {
          return localStorage.getItem(STORAGE_KEY_DEVICE) || '';
      } catch (e) {
          return '';
      }
  });
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<SensitivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  
  // Preset states
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [presetName, setPresetName] = useState('');

  // --- GAME ASSIST / OVERLAY STATES ---
  const [assistOpen, setAssistOpen] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);
  // Default positions (will try to load from storage)
  const [assistPos, setAssistPos] = useState<Position>(() => {
      try {
          const saved = localStorage.getItem(STORAGE_KEY_ASSIST_POS);
          // Default to bottom right, safe from native UI
          return saved ? JSON.parse(saved) : { x: window.innerWidth - 80, y: window.innerHeight - 200 };
      } catch { return { x: window.innerWidth - 80, y: window.innerHeight - 200 }; }
  });
  const [macroPos, setMacroPos] = useState<Position>(() => {
       try {
          const saved = localStorage.getItem(STORAGE_KEY_MACRO_POS);
          return saved ? JSON.parse(saved) : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      } catch { return { x: window.innerWidth / 2, y: window.innerHeight / 2 }; }
  });

  // Custom Function States
  const [crosshairMode, setCrosshairMode] = useState<0 | 1 | 2 | 3>(0); // 0:off, 1:dot, 2:cross, 3:circle
  const [crosshairColor, setCrosshairColor] = useState<string>('#ef4444'); // Default red-500 hex
  const [macroActive, setMacroActive] = useState(false);
  const [isMacroTapping, setIsMacroTapping] = useState(false);
  const [autoClickCPS, setAutoClickCPS] = useState(20); // Clicks per second
  const macroIntervalRef = useRef<number | null>(null);
  const [isBoosting, setIsBoosting] = useState(false);

  // Dragging refs and states (refs for logic, states for visuals)
  const isDraggingAssist = useRef(false);
  const assistDragStartPos = useRef({ x: 0, y: 0 }); // For threshold detection
  const [isDraggingAssistVisual, setIsDraggingAssistVisual] = useState(false);
  const assistDragOffset = useRef({ x: 0, y: 0 });

  const isDraggingMacro = useRef(false);
  const [isDraggingMacroVisual, setIsDraggingMacroVisual] = useState(false);
  const macroDragOffset = useRef({ x: 0, y: 0 });

  // --- AIM TRAINER STATES ---
  const [showTrainer, setShowTrainer] = useState(false);
  const [trainerState, setTrainerState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [score, setScore] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 }); // Percentages
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const lastSpawnTime = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  // Load presets on mount
  useEffect(() => {
      try {
          const saved = localStorage.getItem(STORAGE_KEY_PRESETS);
          if (saved) {
              setPresets(JSON.parse(saved));
          }
      } catch (e) {
          console.error("Failed to load presets", e);
      }
  }, []);

  useEffect(() => {
      try {
          localStorage.setItem(STORAGE_KEY_DEVICE, device);
      } catch (e) {
          // Ignore storage errors
      }
  }, [device]);

  // Persist positions when they change
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_ASSIST_POS, JSON.stringify(assistPos));
  }, [assistPos]);
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_MACRO_POS, JSON.stringify(macroPos));
  }, [macroPos]);

  // Macro-Tap Simulation Logic
  useEffect(() => {
      if (macroActive) {
          const intervalMs = 1000 / autoClickCPS;
          macroIntervalRef.current = window.setInterval(() => {
              setIsMacroTapping(true);
              setTimeout(() => setIsMacroTapping(false), intervalMs * 0.5); // Flash for half the interval
          }, intervalMs);
      } else {
          if (macroIntervalRef.current) window.clearInterval(macroIntervalRef.current);
          setIsMacroTapping(false);
      }
      return () => {
          if (macroIntervalRef.current) window.clearInterval(macroIntervalRef.current);
      };
  }, [macroActive, autoClickCPS]);

  // Trainer Timer Logic
  useEffect(() => {
      if (trainerState === 'playing' && timeLeft > 0) {
          timerRef.current = window.setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      } else if (timeLeft === 0 && trainerState === 'playing') {
          endTraining();
      }
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, trainerState]);

  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error' | 'toggle_on' | 'toggle_off' | 'hit' | 'miss') => {
      if (!navigator.vibrate) return;
      // Wrap in try-catch for robust older iOS support where vibrate might exist but fail
      try {
          switch (type) {
              case 'light': navigator.vibrate(10); break;
              case 'medium': navigator.vibrate(20); break;
              case 'success': navigator.vibrate([10, 50, 10]); break;
              case 'error': navigator.vibrate([50]); break;
              case 'toggle_on': navigator.vibrate([15, 30, 15]); break;
              case 'toggle_off': navigator.vibrate(30); break;
              case 'hit': navigator.vibrate(15); break; 
              case 'miss': navigator.vibrate(40); break; 
          }
      } catch (e) { /* ignore haptic failure */ }
  }

  const handleGenerate = async () => {
    const trimmedDevice = device.trim();
    if (!trimmedDevice) { triggerHaptic('error'); setError("ENTER DEVICE MODEL"); return; }
    if (trimmedDevice.length < 3) { triggerHaptic('error'); setError("INVALID MODEL NAME"); return; }

    setLoading(true); setError(null); setCopied(false); setFeedback(null); triggerHaptic('light');
    try {
      const result = await generateHeadshotConfig(trimmedDevice);
      setConfig(result);
      triggerHaptic('success');
    } catch (e: any) {
      setError("CONFIG FAILED");
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (type: 'up' | 'down') => {
      if (feedback === type) return;
      setFeedback(type);
      triggerHaptic(type === 'up' ? 'success' : 'medium');
      try {
          const history = JSON.parse(localStorage.getItem('ff_feedback_history') || '[]');
          history.push({ timestamp: Date.now(), panel: 'aim', type });
          localStorage.setItem('ff_feedback_history', JSON.stringify(history.slice(-50)));
      } catch (e) { /* ignore */ }
  };

  const handleShare = async () => {
    if (!config) return;
    const text = `[FF COMMAND CENTER]\nAUTO HEADSHOT INTEL // ${config.deviceName.toUpperCase()}\n---------------------------\nGeneral: ${config.settings.general}\nRed Dot: ${config.settings.redDot}\n2x: ${config.settings.scope2x} | 4x: ${config.settings.scope4x}\nSniper: ${config.settings.sniperScope}\nFree Look: ${config.settings.freeLook}\n---------------------------\nFire Button: ${config.fireButtonSize}% | DPI: ${config.dpi}`;
    try {
        await navigator.clipboard.writeText(text);
        setCopied(true); triggerHaptic('success'); setTimeout(() => setCopied(false), 2500);
    } catch (err) { triggerHaptic('error'); }
  };

  const handleInitSave = () => {
    if (!config) return;
    setPresetName(config.deviceName);
    setShowSaveModal(true);
    triggerHaptic('light');
  };

  const handleConfirmSave = () => {
    if (!presetName.trim() || !config) return;
    
    const newPreset: Preset = {
        id: Date.now(),
        name: presetName.trim(),
        config: config,
        timestamp: Date.now()
    };
    
    const updatedPresets = [newPreset, ...presets].slice(0, 50); // Limit to 50 presets
    setPresets(updatedPresets);
    try {
        localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(updatedPresets));
    } catch (e) { console.error("Failed to save preset to storage", e); }
    
    setShowSaveModal(false);
    triggerHaptic('success');
  };

  const handleDeletePreset = (id: number) => {
      const updatedPresets = presets.filter(p => p.id !== id);
      setPresets(updatedPresets);
      try {
          localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(updatedPresets));
      } catch (e) { console.error("Failed to update presets in storage", e); }
      triggerHaptic('medium');
  };

  const handleLoadPreset = (preset: Preset) => {
      setConfig(preset.config);
      setDevice(preset.config.deviceName);
      setShowLoadModal(false);
      triggerHaptic('success');
  };

  // --- GAME ASSIST FUNCTIONS ---
  const cycleCrosshair = () => {
      setCrosshairMode(prev => (prev + 1) % 4 as 0 | 1 | 2 | 3);
      triggerHaptic('light');
  };

  const toggleMacro = () => {
      setMacroActive(!macroActive);
      triggerHaptic(!macroActive ? 'toggle_on' : 'toggle_off');
  };

  const handleBoost = () => {
      if (isBoosting) return;
      setIsBoosting(true);
      triggerHaptic('medium');
      setTimeout(() => {
          triggerHaptic('success');
          setIsBoosting(false);
      }, 1500);
  };

  const toggleStealth = () => {
      setStealthMode(!stealthMode);
      triggerHaptic('medium');
  }

  const handleNotify = async () => {
      triggerHaptic('light');
      if (!("Notification" in window)) {
        alert("Enabled (Simulated for this device)");
        return;
      }
      
      if (Notification.permission === "granted") {
         new Notification("AimHQ Active", { 
             body: "Game Assist is running. Tap to return to HQ.",
             tag: 'ff-assist'
         });
      } else if (Notification.permission !== "denied") {
          try {
              const permission = await Notification.requestPermission();
               if (permission === "granted") {
                 new Notification("AimHQ Active", { 
                     body: "Game Assist is running. Tap to return to HQ.",
                     tag: 'ff-assist'
                 });
               }
          } catch (e) { /* ignore notification errors on weird iOS webviews */ }
      }
  }

  // --- REFINED DRAG HANDLERS ---
  
  // Anchor-aware clamping specifically tuned for iOS safe areas
  const clamp = (x: number, y: number, w: number, h: number, anchor: 'top-left' | 'center') => {
      let minX, maxX, minY, maxY;

      if (anchor === 'center') {
           // For elements positioned by their center point (like Macro Target)
           minX = SAFE.X + (w / 2);
           maxX = window.innerWidth - SAFE.X - (w / 2);
           minY = SAFE.TOP + (h / 2);
           maxY = window.innerHeight - SAFE.BOTTOM - (h / 2);
      } else { 
           // For elements positioned by their top-left corner (like Assist Menu)
           minX = SAFE.X;
           maxX = window.innerWidth - SAFE.X - w;
           minY = SAFE.TOP;
           maxY = window.innerHeight - SAFE.BOTTOM - h;
      }

      return {
          x: Math.max(minX, Math.min(x, maxX)),
          y: Math.max(minY, Math.min(y, maxY))
      };
  };

  const handleAssistTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
      isDraggingAssist.current = false;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      assistDragStartPos.current = { x: clientX, y: clientY };
      assistDragOffset.current = {
          x: clientX - assistPos.x,
          y: clientY - assistPos.y
      };
  };

  const handleAssistTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
       const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
       const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

       const dx = Math.abs(clientX - assistDragStartPos.current.x);
       const dy = Math.abs(clientY - assistDragStartPos.current.y);

       // Small threshold before considering it a drag (prevents accidental moves during taps)
       if (dx > 5 || dy > 5) {
           isDraggingAssist.current = true;
           if (!isDraggingAssistVisual) setIsDraggingAssistVisual(true);
       }

       if (isDraggingAssist.current) {
           if (e.cancelable && 'touches' in e) e.preventDefault();
           
           const rawX = clientX - assistDragOffset.current.x;
           const rawY = clientY - assistDragOffset.current.y;
           // Clamp specifically for the assist button (approx 48x48, top-left anchored)
           setAssistPos(clamp(rawX, rawY, 48, 48, 'top-left'));
       }
  };

  const handleAssistTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
      setIsDraggingAssistVisual(false);
      
      if (!isDraggingAssist.current) {
          // It was a tap, not a drag
          if (e.cancelable && e.type === 'touchend') e.preventDefault();
          setAssistOpen(prev => {
              if (!prev && stealthMode) setStealthMode(false);
              return !prev;
          });
          triggerHaptic('light');
      }
      isDraggingAssist.current = false;
  };

  const handleMacroTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
      isDraggingMacro.current = false;
      setIsDraggingMacroVisual(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      macroDragOffset.current = {
          x: clientX - macroPos.x,
          y: clientY - macroPos.y
      };
  };

  const handleMacroTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
      if (e.cancelable && 'touches' in e) e.preventDefault();
      isDraggingMacro.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const rawX = clientX - macroDragOffset.current.x;
      const rawY = clientY - macroDragOffset.current.y;
      // Clamp for macro target (approx 56x56, center anchored due to negative margins)
      setMacroPos(clamp(rawX, rawY, 56, 56, 'center'));
  };

  const handleMacroTouchEnd = () => {
      setIsDraggingMacroVisual(false);
      isDraggingMacro.current = false;
  };

  // --- TRAINER FUNCTIONS ---
  const startTraining = () => {
      setTrainerState('playing');
      setScore(0);
      setTotalTaps(0);
      setTimeLeft(30);
      setReactionTimes([]);
      moveTarget();
      triggerHaptic('success');
  };

  const endTraining = () => {
      setTrainerState('finished');
      triggerHaptic('success');
  };

  const moveTarget = useCallback(() => {
      // Keep away from very edges (10% - 90% range) to avoid edge swipe conflicts on iOS
      setTargetPos({
          x: 15 + Math.random() * 70,
          y: 20 + Math.random() * 60 // Account for header/footer areas nicely
      });
      lastSpawnTime.current = Date.now();
  }, []);

  const handleTrainerTap = (isHit: boolean, e?: React.MouseEvent | React.TouchEvent) => {
      if (trainerState !== 'playing') return;
      if (e && e.cancelable) { e.preventDefault(); e.stopPropagation(); }

      setTotalTaps(prev => prev + 1);
      if (isHit) {
          const reaction = Date.now() - lastSpawnTime.current;
          setReactionTimes(prev => [...prev, reaction]);
          setScore(prev => prev + 1);
          triggerHaptic('hit');
          moveTarget();
      } else {
          triggerHaptic('miss');
      }
  };

  const getAverageReaction = () => {
      if (reactionTimes.length === 0) return 0;
      return Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length);
  };

  const getAccuracy = () => {
      if (totalTaps === 0) return 0;
      return Math.round((score / totalTaps) * 100);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto no-scrollbar relative pb-safe-nav">
      <header className="mb-8 shrink-0 flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
              Auto<span className="text-red-500">Headshot</span>
            </h1>
            <p className="text-zinc-400 text-sm">AimLock Configuration Hub</p>
        </div>
        
        {/* Main Preset Manager Button (Top Right) */}
        <button 
            onClick={() => { setShowLoadModal(true); triggerHaptic('light'); }}
            className="p-3 bg-zinc-900/80 border border-zinc-800/50 rounded-xl text-zinc-400 active:bg-zinc-800 transition-colors active:scale-95"
            aria-label="Manage Presets"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
            </svg>
        </button>
      </header>

       <div className="shrink-0 -mt-2 space-y-4">
        {/* Device Input Section */}
        <div className="bg-zinc-900/80 backdrop-blur-md p-5 rounded-3xl border border-white/5 shadow-xl relative z-10">
          <label htmlFor="device-model" className="block text-xs font-bold text-red-500 uppercase tracking-widest mb-3 ml-1">
            Target Device Model
          </label>
          <div className="flex gap-3">
             <input
              id="device-model"
              type="text"
              value={device}
              onChange={(e) => { setDevice(e.target.value); if (error) setError(null); }}
              placeholder="e.g. iPhone 13"
              className="flex-1 bg-black/40 border-2 border-zinc-800 focus:border-red-500 text-base text-white rounded-xl py-3 px-4 outline-none transition-all placeholder-zinc-600"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
             <button
              onClick={handleGenerate}
              disabled={loading}
              className={`px-6 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
                 loading ? 'bg-zinc-800 text-zinc-500' : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 active:scale-95'
              }`}
            >
                 {loading ? (
                 <svg className="animate-spin h-5 w-5 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                 ) : "CALIBRATE"}
            </button>
          </div>
             {error && <p className="text-red-500 text-xs font-bold mt-3 ml-1 animate-pulse">[ERROR]: {error}</p>}
        </div>
      </div>

      {/* Results Zone */}
      {config && !loading ? (
        <div className="mt-6 pb-8 animate-fadeInUp">
          <div className="bg-gradient-to-b from-zinc-900 to-black border border-red-900/30 p-5 rounded-[2rem] relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-yellow-500 opacity-70"></div>
             <div className="mb-6">
                 <h3 className="text-lg font-black italic text-white uppercase truncate pr-4">{config.deviceName}</h3>
             </div>

             <div className="space-y-6">
                <div>
                    <div className="flex justify-between items-end mb-3">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase">Optic Calibration (0-200)</h4>
                    </div>
                    <SensitivityBar label="General" value={config.settings.general} delay={100} />
                    <SensitivityBar label="Red Dot" value={config.settings.redDot} delay={200} />
                    <SensitivityBar label="2x Scope" value={config.settings.scope2x} delay={300} />
                    <SensitivityBar label="4x Scope" value={config.settings.scope4x} delay={400} />
                    <SensitivityBar label="Sniper" value={config.settings.sniperScope} delay={500} />
                    <SensitivityBar label="Free Look" value={config.settings.freeLook} delay={600} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">Fire Button</div>
                        <div className="text-xl font-black text-red-500">{config.fireButtonSize}%</div>
                     </div>
                     {/* Interactive DPI Slider */}
                     <div className="bg-black/30 px-3 py-2 rounded-xl border border-yellow-500/10 relative">
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="dpi-slider" className="text-[10px] text-zinc-500 uppercase font-bold">DPI Customizer</label>
                            <div className="text-lg font-black text-yellow-500">{config.dpi}</div>
                        </div>
                        <input
                            id="dpi-slider"
                            type="range"
                            min="300"
                            max="1600"
                            step="10"
                            value={config.dpi}
                            onChange={(e) => {
                                setConfig(prev => prev ? { ...prev, dpi: Number(e.target.value) } : null);
                            }}
                            className="w-full h-6 bg-transparent appearance-none outline-none [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-zinc-800 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:-mt-1.5"
                        />
                    </div>
                </div>

                {/* CUSTOM FUNCTIONS SECTION */}
                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 space-y-5">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Custom Functions</h4>
                    
                    {/* Crosshair Style Selector */}
                    <div>
                        <span className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Crosshair Style</span>
                        <div className="flex bg-black/40 p-1 rounded-xl">
                             <button onClick={() => { setCrosshairMode(0); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${crosshairMode === 0 ? 'bg-zinc-700 text-zinc-300 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}>OFF</button>
                             <button onClick={() => { setCrosshairMode(1); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-all ${crosshairMode === 1 ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                 <div className="w-1.5 h-1.5 rounded-full bg-current"/>
                             </button>
                             <button onClick={() => { setCrosshairMode(2); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-all ${crosshairMode === 2 ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
                             </button>
                             <button onClick={() => { setCrosshairMode(3); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-all ${crosshairMode === 3 ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                 <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                                     <div className="w-0.5 h-0.5 rounded-full bg-current"/>
                                 </div>
                             </button>
                        </div>
                    </div>

                    {/* Crosshair Color Picker */}
                    <div>
                        <span className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Crosshair Color</span>
                        <div className="flex gap-2">
                            {['#ef4444', '#22c55e', '#eab308', '#06b6d4', '#d946ef', '#ffffff'].map((color) => (
                                <button
                                    key={color}
                                    onClick={() => { setCrosshairColor(color); triggerHaptic('light'); }}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${crosshairColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: color, boxShadow: crosshairColor === color ? `0 0 10px ${color}50` : 'none' }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Auto Clicker Speed */}
                     <div>
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] font-bold text-zinc-400 uppercase">Auto-Click Speed</span>
                             <span className="text-xs font-black text-blue-400">{autoClickCPS} CPS</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            value={autoClickCPS}
                            onChange={(e) => setAutoClickCPS(Number(e.target.value))}
                             className="w-full h-6 bg-transparent appearance-none outline-none [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-zinc-800 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:-mt-1.5"
                        />
                    </div>
                </div>

                <div className="bg-red-900/10 p-3 rounded-xl border border-red-500/20">
                     <p className="text-xs font-medium text-red-300 leading-relaxed">
                        <span className="font-bold bg-red-500/20 px-1 rounded mr-1">PRO TIP:</span>
                        {config.notes}
                     </p>
                </div>

                {/* Quick Access Actions Bar */}
                <div className="grid grid-cols-4 gap-2">
                    {/* Train */}
                    <button 
                        onClick={() => { setShowTrainer(true); triggerHaptic('light'); }}
                        className="flex flex-col items-center justify-center py-3 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 rounded-xl active:scale-95 transition-all group"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500 group-hover:text-red-400 mb-1">
                           <path fillRule="evenodd" d="M15.97 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 11-1.06-1.06l3.22-3.22H7.5a.75.75 0 00-.75.75v9.75a.75.75 0 01-1.5 0V9a2.25 2.25 0 012.25-2.25h11.69l-3.22-3.22a.75.75 0 010-1.06z" clipRule="evenodd" />
                           <path fillRule="evenodd" d="M3.53 2.47a.75.75 0 00-1.06 0l-4.5 4.5a.75.75 0 000 1.06l4.5 4.5a.75.75 0 001.06-1.06L.28 8.25H16.5a2.25 2.25 0 012.25 2.25v9.75a.75.75 0 01-1.5 0V10.5a.75.75 0 00-.75-.75H.28l3.22-3.22a.75.75 0 000-1.06z" clipRule="evenodd" transform="translate(4, 10) rotate(180) translate(-4, -10)"/>
                           <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.75 12a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zM12 18.75a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zM3.75 12a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75z" />
                         </svg>
                        <span className="text-[10px] font-bold text-zinc-400">TRAIN</span>
                    </button>
                    {/* Save */}
                    <button 
                        onClick={handleInitSave}
                        className="flex flex-col items-center justify-center py-3 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 rounded-xl active:scale-95 transition-all group"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-zinc-400 group-hover:text-white mb-1">
                           <path fillRule="evenodd" d="M6.32 2.577a4.92 4.92 0 017.05 0l.63.63.63-.63a4.92 4.92 0 016.963 7.075l-6.963 6.963-6.963-6.963a4.92 4.92 0 010-6.963z" clipRule="evenodd" />
                         </svg>
                         <span className="text-[10px] font-bold text-zinc-400">SAVE</span>
                    </button>
                    {/* Load */}
                    <button 
                        onClick={() => { setShowLoadModal(true); triggerHaptic('light'); }}
                        className="flex flex-col items-center justify-center py-3 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 rounded-xl active:scale-95 transition-all group"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-zinc-400 group-hover:text-white mb-1">
                            <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
                         </svg>
                         <span className="text-[10px] font-bold text-zinc-400">LOAD</span>
                    </button>
                    {/* Share */}
                    <button 
                        onClick={handleShare}
                        className={`flex flex-col items-center justify-center py-3 border border-white/5 rounded-xl active:scale-95 transition-all group ${copied ? 'bg-emerald-500/10' : 'bg-zinc-800/50 hover:bg-zinc-800'}`}
                    >
                         {copied ? (
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-400 mb-1">
                               <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                             </svg>
                         ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-zinc-400 group-hover:text-white mb-1">
                               <path fillRule="evenodd" d="M15.75 4.5a3 3 0 11.825 2.066l-8.421 4.679a3.002 3.002 0 010 1.51l8.421 4.679a3 3 0 11-.729 1.31l-8.421-4.678a3 3 0 110-4.132l8.421-4.679a3 3 0 01-.096-.755z" clipRule="evenodd" />
                             </svg>
                         )}
                         <span className={`text-[10px] font-bold ${copied ? 'text-emerald-400' : 'text-zinc-400'}`}>
                             {copied ? 'COPIED' : 'SHARE'}
                         </span>
                    </button>
                </div>

                {/* Feedback Section */}
                <div className="flex justify-between items-center pt-2 opacity-80 hover:opacity-100 transition-opacity border-t border-white/5 mt-4">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Was this config helpful?</span>
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
      ) : null}

      {/* --- FLOATING OVERLAYS --- */}

      {/* Crosshair Overlay (Fixed Center) */}
      {crosshairMode > 0 && (
          <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
              {crosshairMode === 1 && (
                  <div className="w-2 h-2 rounded-full ring-2 ring-black/50 shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: crosshairColor, boxShadow: `0 0 10px ${crosshairColor}` }}></div>
              )}
              {crosshairMode === 2 && (
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]" style={{ color: crosshairColor }}>
                    <path fillRule="evenodd" d="M12 2.25c.414 0 .75.336.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V3c0-.414.336-.75.75-.75z" clipRule="evenodd" />
                  </svg>
              )}
              {crosshairMode === 3 && (
                   <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ borderColor: crosshairColor }}>
                       <div className="w-1 h-1 rounded-full" style={{ backgroundColor: crosshairColor }}></div>
                   </div>
              )}
          </div>
      )}

      {/* Macro Tap Target (Draggable with Clamping) */}
      {macroActive && (
           <div 
               className={`fixed z-[55] w-14 h-14 -ml-7 -mt-7 flex items-center justify-center touch-none ${isMacroTapping ? 'pointer-events-none' : 'cursor-move'}`}
               style={{ 
                   left: macroPos.x, 
                   top: macroPos.y,
                   // Disable position transitions while dragging for instant 1:1 response
                   transition: isDraggingMacroVisual ? 'transform 0.15s ease-out, opacity 0.2s' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                   transform: isDraggingMacroVisual ? 'scale(1.15)' : 'scale(1)'
               }}
               onTouchStart={handleMacroTouchStart}
               onTouchMove={handleMacroTouchMove}
               onTouchEnd={handleMacroTouchEnd}
               onMouseDown={handleMacroTouchStart}
           >
               {/* The visible target when not tapping */}
               <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${isDraggingMacroVisual ? 'border-blue-400 bg-blue-500/30 ring-4 ring-blue-500/20 backdrop-blur-sm' : 'border-2 border-blue-400/50 bg-blue-500/10'} ${isMacroTapping ? 'opacity-0' : 'opacity-100'} relative overflow-hidden`}>
                   {/* Precision Crosshair Lines */}
                   <div className="absolute w-full h-[1px] bg-blue-400/30"></div>
                   <div className="absolute h-full w-[1px] bg-blue-400/30"></div>
                   <div className="w-1.5 h-1.5 bg-blue-400 rounded-full z-10 shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>
               </div>
               {/* The ping animation when tapping */}
               {isMacroTapping && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-full h-full bg-white/50 rounded-full animate-ping opacity-75"></div>
                   </div>
               )}
           </div>
      )}

      {/* Game Assist Draggable Menu (with Clamping) */}
      <div 
        className="fixed z-[70] touch-none select-none"
        style={{ 
            left: assistPos.x, 
            top: assistPos.y,
            // Disable position transitions while dragging for instant response
            transition: isDraggingAssistVisual ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
          {/* Expanded Menu - Absolutely positioned above handle so it doesn't shift layout */}
          <div className={`absolute bottom-full right-0 mb-3 transition-all duration-300 origin-bottom-right ${assistOpen && !isDraggingAssistVisual ? 'scale-100 opacity-100' : 'scale-50 opacity-0 pointer-events-none'}`}>
               <div className="bg-zinc-900/95 backdrop-blur-2xl border border-zinc-700/50 p-1.5 rounded-2xl shadow-2xl flex flex-col gap-1 min-w-[60px]">
                 
                 {/* Close Button - Explicit Exit */}
                 <button
                    onClick={() => setAssistOpen(false)}
                    className="p-1 mb-1 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                 </button>

                 {/* SHORTCUT: Tools (Settings/Redeem) */}
                 <button
                    onClick={() => {
                        if (onSwitchTab) {
                            onSwitchTab(Tab.SETTINGS);
                            setAssistOpen(false);
                            triggerHaptic('medium');
                        }
                    }}
                    className="p-2.5 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 text-zinc-400 hover:text-yellow-500"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-0.5">
                      <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.633c-.01.01-.122.086-.325.086-.102 0-.198-.017-.285-.05l-1.22-.45c-.822-.303-1.764.053-2.196.83l-1.03 1.852c-.432.777-.17 1.762.613 2.295l.997.679c.078.054.145.264.013.556a7.534 7.534 0 000 1.704c.132.292.065.502-.013.556l-.997.679c-.783.533-1.045 1.518-.613 2.295l1.03 1.853c.432.777 1.374 1.132 2.196.83l1.22-.45c.087-.033.183-.05.285-.05.203 0 .315.076.325.086.308.233.638.445.986.633.182.088.277.228.297.348l.178 1.072c.151.904.933 1.567 1.85 1.567h2.06c.917 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.115-.26.297-.348.348-.188.678-.4 1.009-.646.01-.01.122-.086.325-.086.102 0 .198.017.285.05l1.22.45c.822.303 1.764-.053 2.196-.83l1.03-1.852c.432-.777.17-1.762-.613-2.295l-.997-.679c-.078-.054-.145-.264-.013-.556.076-.166.135-.339.18-.514.044-.175.066-.355.066-.538 0-.183-.022-.363-.066-.538a7.55 7.55 0 00-.18-.514c-.132-.292-.065-.502.013-.556l.997-.679c.783-.533 1.045-1.518.613-2.295l-1.03-1.853c-.432-.777-1.374-1.132-2.196-.83l-1.22.45c-.087.033-.183.05-.285.05-.203 0-.315-.076-.325-.086a7.553 7.553 0 00-.986-.633c-.182-.088-.277-.228-.297-.348L13.138 3.817A1.877 1.877 0 0011.288 2.25h-2.06zM12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[7px] font-bold uppercase">TOOLS</span>
                 </button>

                 {/* SHORTCUT: Trainer */}
                 <button
                    onClick={() => {
                        setShowTrainer(true);
                        setAssistOpen(false);
                        triggerHaptic('light');
                    }}
                    className="p-2.5 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 text-zinc-400 hover:text-red-500"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-0.5">
                           <path fillRule="evenodd" d="M15.97 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 11-1.06-1.06l3.22-3.22H7.5a.75.75 0 00-.75.75v9.75a.75.75 0 01-1.5 0V9a2.25 2.25 0 012.25-2.25h11.69l-3.22-3.22a.75.75 0 010-1.06z" clipRule="evenodd" />
                           <path fillRule="evenodd" d="M3.53 2.47a.75.75 0 00-1.06 0l-4.5 4.5a.75.75 0 000 1.06l4.5 4.5a.75.75 0 001.06-1.06L.28 8.25H16.5a2.25 2.25 0 012.25 2.25v9.75a.75.75 0 01-1.5 0V10.5a.75.75 0 00-.75-.75H.28l3.22-3.22a.75.75 0 000-1.06z" clipRule="evenodd" transform="translate(4, 10) rotate(180) translate(-4, -10)"/>
                    </svg>
                    <span className="text-[7px] font-bold uppercase">TRAIN</span>
                 </button>

                 {/* Crosshair Toggle */}
                 <button
                    onClick={cycleCrosshair}
                    className={`p-2.5 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 ${crosshairMode > 0 ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-400 hover:text-zinc-200'}`}
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-0.5">
                      <path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm14.25 6a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM12 12.75a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[7px] font-bold uppercase">{crosshairMode === 0 ? 'OFF' : `V.${crosshairMode}`}</span>
                 </button>

                 {/* Macro Tap Toggle */}
                 <button
                    onClick={toggleMacro}
                    className={`p-2.5 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 ${macroActive ? 'bg-blue-500/20 text-blue-400 shadow-inner' : 'text-zinc-400 hover:text-zinc-200'}`}
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-0.5">
                      <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[7px] font-bold uppercase leading-none text-center">CLICKER</span>
                 </button>

                 {/* Notification Trigger */}
                 <button
                    onClick={handleNotify}
                    className="p-2.5 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 text-zinc-400 hover:text-white"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-0.5">
                      <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9c.465 1.494 1.643 3.025 5.497 3.096.047.001.093.003.14.003h.302c.375 0 .745-.031 1.107-.093.484-.083.917-.16 1.284-.22.92-.15 1.76-.287 2.53-.427 1.46-.265 2.99-.553 4.465-1.33a.75.75 0 00.298-1.02c-.298-.55-.614-1.09-1.044-1.596-.44-.518-.96-1.018-1.567-1.496-1.36-1.066-3.04-2.386-3.85-4.82-.82-2.45-1.31-5.09-1.31-7.74a6.75 6.75 0 00-13.5 0c0 2.65-.49 5.29-1.31 7.74-.81 2.434-2.49 3.754-3.85 4.82-.607.478-1.127.978-1.567 1.496a.75.75 0 00-.298 1.02c.75.395 1.53.698 2.336.91a.75.75 0 00.387-1.453 23.168 23.168 0 01-1.958-.76c1.35-1.06 2.9-2.38 3.7-4.82.8-2.45 1.3-5.09 1.3-7.74 0-2.13-.8-4.06-2.12-5.52a.75.75 0 01.3-1.206c1.54-.57 3.16-.99 4.83-1.243a3.75 3.75 0 117.48 0c1.67.253 3.29.673 4.83 1.244.097.036.197.076.3.12v-.006z" clipRule="evenodd" />
                      <path d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9z" />
                    </svg>
                    <span className="text-[7px] font-bold uppercase">NOTIFY</span>
                 </button>

                  {/* Stealth Mode Toggle */}
                  <button
                    onClick={toggleStealth}
                    className={`p-2.5 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 ${stealthMode ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-400 hover:text-zinc-200'}`}
                 >
                    {stealthMode ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-0.5">
                          <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z" />
                          <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.53 15.713l-4.243-4.244a3.75 3.75 0 004.243 4.243z" />
                          <path d="M6.75 12c0-.619.107-1.215.304-1.764l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 016.75 12z" />
                        </svg>
                    ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-0.5">
                          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                          <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.489 4.467-5.705 7.69-10.675 7.69-4.97 0-9.185-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                        </svg>
                    )}
                    <span className="text-[7px] font-bold uppercase">{stealthMode ? 'HIDDEN' : 'VISIBLE'}</span>
                 </button>

                 {/* Boost Button */}
                 <button
                    onClick={handleBoost}
                    disabled={isBoosting}
                    className={`p-2.5 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 ${isBoosting ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50' : 'text-zinc-400 hover:text-zinc-200'}`}
                 >
                    {isBoosting ? (
                        <svg className="animate-spin h-5 w-5 mb-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mb-0.5">
                           <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
                        </svg>
                    )}
                    <span className="text-[7px] font-bold uppercase">BOOST</span>
                 </button>
             </div>
          </div>

          {/* Draggable Handle / Toggle Button */}
          <div
             onTouchStart={handleAssistTouchStart}
             onTouchMove={handleAssistTouchMove}
             onTouchEnd={handleAssistTouchEnd}
             onMouseDown={handleAssistTouchStart}
             onMouseUp={(e) => handleAssistTouchEnd(e)}
             className={`relative z-10 w-12 h-12 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-150 cursor-move pointer-events-auto ${isDraggingAssistVisual ? 'scale-115 ring-4 ring-yellow-500/30 bg-zinc-800' : ''} ${!assistOpen && stealthMode && !isDraggingAssistVisual ? 'opacity-15' : ''} ${!assistOpen && !stealthMode && !isDraggingAssistVisual ? 'opacity-80 hover:opacity-100 active:scale-95' : ''} ${assistOpen && !isDraggingAssistVisual ? 'opacity-100 bg-zinc-800' : ''}`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-500">
               <path fillRule="evenodd" d="M3 6a3 3 0 013-3h2.25a3 3 0 013 3v2.25a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm9.75 0a3 3 0 013-3H18a3 3 0 013 3v2.25a3 3 0 01-3 3h-2.25a3 3 0 01-3-3V6zM3 15.75a3 3 0 013-3h2.25a3 3 0 013 3v2.25a3 3 0 01-3 3H6a3 3 0 01-3-3v-2.25zm9.75 0a3 3 0 013-3H18a3 3 0 013 3v2.25a3 3 0 01-3 3h-2.25a3 3 0 01-3-3v-2.25z" clipRule="evenodd" />
             </svg>
          </div>
      </div>
      
      {/* Mouse Move Listener for Desktop Dragging */}
      {(isDraggingAssist.current || isDraggingMacro.current) && (
          <div 
            className="fixed inset-0 z-[100] cursor-move"
            onMouseMove={(e) => {
                if (isDraggingAssist.current) handleAssistTouchMove(e);
                if (isDraggingMacro.current) handleMacroTouchMove(e);
            }}
            onMouseUp={(e) => {
                if (isDraggingAssist.current) handleAssistTouchEnd(e);
                if (isDraggingMacro.current) handleMacroTouchEnd();
            }}
          ></div>
      )}

      {/* --- MODALS --- */}

      {/* Save Preset Modal */}
      {showSaveModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-zinc-900/95 backdrop-blur-2xl rounded-3xl p-6 w-full max-w-xs border border-zinc-800 shadow-2xl animate-[spring_0.4s_ease-out]">
                <h3 className="text-white font-bold text-lg mb-1 text-center">Save Preset</h3>
                <p className="text-zinc-500 text-xs text-center mb-4">Name your configuration for quick access.</p>
                <input 
                    type="text" 
                    value={presetName} 
                    onChange={(e) => setPresetName(e.target.value)} 
                    placeholder="e.g. Ranked MP40" 
                    className="w-full bg-black/50 border-2 border-zinc-800 focus:border-red-500 text-base text-white rounded-xl py-3 px-4 outline-none transition-all mb-4 text-center font-medium"
                    autoFocus
                />
                <div className="flex gap-3">
                     <button onClick={() => setShowSaveModal(false)} className="flex-1 py-3 font-semibold text-zinc-400 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors text-sm active:scale-95">Cancel</button>
                    <button onClick={handleConfirmSave} disabled={!presetName.trim()} className={`flex-1 py-3 font-bold text-sm rounded-xl transition-all active:scale-95 ${!presetName.trim() ? 'bg-zinc-800 text-zinc-600' : 'bg-red-600 text-white shadow-lg shadow-red-600/20'}`}>Save</button>
                </div>
            </div>
        </div>
      )}

      {/* Preset Manager Drawer */}
      <div className={`fixed inset-x-0 bottom-0 z-50 bg-zinc-950 border-t border-zinc-800/80 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-spring safe-bottom ${showLoadModal ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '80vh' }}>
          <div className="p-2 flex justify-center">
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full"></div>
          </div>
          <div className="px-6 pb-4 flex justify-between items-center border-b border-white/5">
              <h3 className="text-lg font-black italic uppercase text-white">Saved<span className="text-red-500">Presets</span></h3>
              <button onClick={() => setShowLoadModal(false)} className="p-2 bg-zinc-900 rounded-full text-zinc-400">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
              </button>
          </div>
          <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(80vh - 80px)' }}>
              {presets.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 opacity-50">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                      </svg>
                      <p className="text-sm font-medium">No saved presets yet.</p>
                  </div>
              ) : (
                  presets.map(preset => (
                      <div key={preset.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between group active:bg-zinc-900 transition-colors">
                          <div className="overflow-hidden">
                              <div className="font-bold text-white truncate">{preset.name}</div>
                              <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider truncate">{preset.config.deviceName}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                              <button 
                                  onClick={() => handleLoadPreset(preset)}
                                  className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase rounded-lg active:scale-95 transition-transform"
                              >
                                  LOAD
                              </button>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                                  className="p-2 text-zinc-600 hover:text-red-500 active:scale-95 transition-colors"
                                  aria-label="Delete Preset"
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                  </svg>
                              </button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>
      {/* Overlay for drawer */}
      {showLoadModal && <div className="fixed inset-0 bg-black/60 z-40 transition-opacity animate-fadeIn" onClick={() => setShowLoadModal(false)} />}

      {/* Aim Trainer Overlay */}
      {showTrainer && (
          <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col safe-top safe-bottom animate-fadeIn">
              {/* Trainer Header */}
              <div className="shrink-0 p-4 flex justify-between items-center bg-zinc-900/50 border-b border-white/5">
                  <div>
                      <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">Reflex<span className="text-red-500">Trainer</span></h2>
                      {trainerState === 'playing' && <div className="text-2xl font-mono font-bold text-yellow-500">{timeLeft}s</div>}
                  </div>
                  <button onClick={() => { setShowTrainer(false); setTrainerState('idle'); }} className="p-2 bg-zinc-800 rounded-full text-zinc-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                  </button>
              </div>

              {/* Game Area */}
              <div 
                className="flex-1 relative overflow-hidden touch-none select-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 to-zinc-950"
                onTouchStart={(e) => handleTrainerTap(false, e)}
                onMouseDown={(e) => handleTrainerTap(false, e as any)}
               >
                  {trainerState === 'idle' && (
                      <div className="absolute inset-0 flex items-center justify-center flex-col p-6 text-center">
                          <p className="text-zinc-400 mb-8 max-w-xs">Test your reaction time. Tap the red targets as fast as you can. 30 seconds on the clock.</p>
                          <button onClick={startTraining} className="px-12 py-5 bg-red-600 hover:bg-red-500 rounded-2xl font-black text-xl uppercase tracking-widest text-white shadow-lg shadow-red-600/30 active:scale-95 transition-transform">
                              START
                          </button>
                      </div>
                  )}

                  {trainerState === 'playing' && (
                      <>
                        {/* Score Display */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-xl font-black text-white font-mono pointer-events-none">
                            {score}
                        </div>
                        {/* The Target */}
                        <div 
                            className="absolute w-16 h-16 -ml-8 -mt-8 rounded-full bg-red-500 border-4 border-red-600/50 shadow-[0_0_30px_rgb(239,68,68)] flex items-center justify-center active:scale-90 transition-transform duration-75 touch-manipulation"
                            style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%` }}
                            onTouchStart={(e) => { e.stopPropagation(); handleTrainerTap(true); }}
                            onMouseDown={(e) => { e.stopPropagation(); handleTrainerTap(true); }}
                        >
                            <div className="w-4 h-4 bg-white rounded-full opacity-80"></div>
                        </div>
                      </>
                  )}

                  {trainerState === 'finished' && (
                      <div className="absolute inset-0 flex items-center justify-center flex-col p-8 bg-black/80 backdrop-blur-md animate-fadeIn">
                          <h3 className="text-3xl font-black italic text-white uppercase mb-8">Training Complete</h3>
                          <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
                              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
                                  <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Final Score</div>
                                  <div className="text-4xl font-black text-red-500">{score}</div>
                              </div>
                              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
                                  <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Accuracy</div>
                                  <div className="text-4xl font-black text-white">{getAccuracy()}<span className="text-lg text-zinc-500">%</span></div>
                              </div>
                              <div className="col-span-2 bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
                                  <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Avg Reaction Time</div>
                                  <div className="text-4xl font-black text-yellow-500">{getAverageReaction()}<span className="text-lg text-zinc-500 font-bold ml-1">ms</span></div>
                              </div>
                          </div>
                          <button onClick={startTraining} className="w-full max-w-sm py-4 bg-white text-black rounded-xl font-bold text-lg uppercase tracking-widest active:scale-95 transition-transform mb-3">
                              TRY AGAIN
                          </button>
                          <button onClick={() => { setShowTrainer(false); setTrainerState('idle'); }} className="text-zinc-500 font-semibold text-sm py-2">
                              CLOSE TRAINER
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};