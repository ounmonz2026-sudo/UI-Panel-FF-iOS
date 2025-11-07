import React, { useState } from 'react';
import { RedeemPanel } from './RedeemPanel';
import { User } from '../types';

type SubTab = 'system' | 'redeem' | 'about';

interface SettingsPanelProps {
    user?: User | null;
    onLogout?: () => void;
}

const ToggleItem: React.FC<{ 
    label: string; 
    icon: React.ReactNode; 
    color: string;
    description?: string;
}> = ({ label, icon, color, description }) => {
    const [isOn, setIsOn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = () => {
        if (navigator.vibrate) navigator.vibrate(15); // Light haptic on tap
        
        if (!isOn) {
             setIsLoading(true);
             // Simulate system activation delay
             setTimeout(() => {
                 setIsOn(true);
                 setIsLoading(false);
                 if (navigator.vibrate) navigator.vibrate([10, 30]); // Success double-tap
             }, 600 + Math.random() * 800);
        } else {
            setIsOn(false);
        }
    };

    return (
        <div className="flex items-center justify-between py-3 px-4 active:bg-zinc-800/50 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${color}`}>
                    {icon}
                </div>
                <div>
                    <div className="text-sm font-semibold text-zinc-100">{label}</div>
                    {description && <div className="text-[10px] font-medium text-zinc-500">{description}</div>}
                </div>
            </div>
            <button 
                onClick={handleToggle}
                disabled={isLoading}
                className={`relative w-[50px] h-[30px] rounded-full transition-colors duration-300 ease-in-out ${isOn ? 'bg-green-500' : 'bg-zinc-600/50'}`}
            >
                 <div className={`absolute top-[2px] left-[2px] w-[26px] h-[26px] bg-white rounded-full shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center ${isOn ? 'translate-x-[20px]' : 'translate-x-0'}`}>
                    {isLoading && (
                         <svg className="animate-spin h-4 w-4 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                    )}
                 </div>
            </button>
        </div>
    );
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ user, onLogout }) => {
  const [subTab, setSubTab] = useState<SubTab>('system');
  const [clearingCache, setClearingCache] = useState(false);
  const [showResetAlert, setShowResetAlert] = useState(false);

  const handleClearCache = () => {
      if (clearingCache) return;
      if (navigator.vibrate) navigator.vibrate(20);
      setClearingCache(true);
      setTimeout(() => {
          setClearingCache(false);
          if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
          alert("Free Fire Cache Cleared.\n0.4GB freed.");
      }, 2000);
  }

  const handleResetApp = () => {
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      localStorage.clear();
      window.location.reload();
  };

  return (
    <div className="h-full flex flex-col bg-black/20 relative">
      {/* iOS-style Segmented Control */}
      <div className="px-6 pt-4 shrink-0">
          <div className="bg-zinc-900/80 p-1 rounded-xl flex font-semibold relative z-10 border border-zinc-800/50">
            <button
              onClick={() => setSubTab('system')}
              className={`flex-1 py-1.5 text-xs rounded-[0.6rem] transition-all duration-300 ${
                subTab === 'system' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500'
              }`}
            >
              Config
            </button>
             <button
              onClick={() => setSubTab('redeem')}
              className={`flex-1 py-1.5 text-xs rounded-[0.6rem] transition-all duration-300 ${
                subTab === 'redeem' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500'
              }`}
            >
              Redeem
            </button>
            <button
              onClick={() => setSubTab('about')}
              className={`flex-1 py-1.5 text-xs rounded-[0.6rem] transition-all duration-300 ${
                subTab === 'about' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500'
              }`}
            >
              About
            </button>
          </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {/* System Settings View */}
        <div className={`absolute inset-0 flex flex-col p-6 overflow-y-auto transition-all duration-300 ease-spring ${
            subTab === 'system' ? 'translate-x-0 opacity-100 z-10' : '-translate-x-[10%] opacity-0 pointer-events-none'
        }`}>
             <header className="mb-6 shrink-0">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                  System<span className="text-zinc-500">Tools</span>
                </h1>
                <p className="text-zinc-400 text-sm">Device Optimization</p>
              </header>

            <div className="space-y-6 pb-8">
                {/* User Account Section */}
                {user && (
                    <div>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-4">Account</h3>
                        <div className="bg-zinc-900/70 backdrop-blur-md rounded-2xl overflow-hidden border border-zinc-800/50 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                    {user.avatar || user.name[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">{user.name}</div>
                                    <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Signed in via {user.method}</div>
                                </div>
                            </div>
                            {onLogout && (
                                <button 
                                    onClick={() => { if (navigator.vibrate) navigator.vibrate(20); onLogout(); }}
                                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 transition-colors"
                                >
                                    Log Out
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Optimization Group */}
                <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-4">Performance</h3>
                    <div className="bg-zinc-900/70 backdrop-blur-md rounded-2xl overflow-hidden border border-zinc-800/50 divide-y divide-zinc-800/50">
                        <ToggleItem 
                            label="FF Game Mode" 
                            description="Prioritize CPU/GPU for Free Fire"
                            color="bg-orange-500"
                            icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.75 9a.75.75 0 01.75.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75V10zM10.5 14.25a3.75 3.75 0 11-4.16-6.12l-.136-.531a.75.75 0 111.453-.372l.14.543A3.745 3.745 0 0110.5 6.75v.906l.894-1.074a.75.75 0 111.153.96L11.25 9l1.297 1.457a.75.75 0 11-1.153.96l-.894-1.073v.906zM2 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 012 10z" /></svg>}
                        />
                        <ToggleItem 
                            label="Network Boost" 
                            description="Reduce ping via DNS optimized routing"
                            color="bg-blue-500"
                            icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 13a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M13.91 6.445a7.046 7.046 0 00-7.82 0 .75.75 0 01-.78-1.264 8.546 8.546 0 019.38 0 .75.75 0 11-.78 1.264zM5.2 14.5a.75.75 0 111.06 1.06 6.515 6.515 0 01-2.522-2.12.75.75 0 011.056-.888c.29.342.63.653 1.012.928a5.015 5.015 0 00-1.62-2.246.75.75 0 01.866-1.192A6.515 6.515 0 018.5 12.044V10a1.5 1.5 0 113 0v2.044a6.515 6.515 0 013.446-2.02.75.75 0 01.866 1.191 5.015 5.015 0 00-1.62 2.247c.382-.275.722-.586 1.012-.928a.75.75 0 011.056.888 6.515 6.515 0 01-2.522 2.12.75.75 0 111.06-1.06c.23-.23.442-.478.633-.74a5.015 5.015 0 00-1.977-2.68V13a3 3 0 11-6 0v-1.938a5.015 5.015 0 00-1.977 2.68c.191.262.403.51.633.74z" clipRule="evenodd" /></svg>}
                        />
                         <ToggleItem 
                            label="Gaming DND" 
                            description="Block banners during gameplay"
                            color="bg-indigo-500"
                            icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 4a.75.75 0 00-1.5 0v5.25H5a.75.75 0 000 1.5h5a.75.75 0 00.75-.75V6z" clipRule="evenodd" /></svg>}
                        />
                    </div>
                </div>

                 {/* Storage Group */}
                 <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-4">Storage</h3>
                     <div className="bg-zinc-900/70 backdrop-blur-md rounded-2xl overflow-hidden border border-zinc-800/50">
                        <button 
                            onClick={handleClearCache}
                            disabled={clearingCache}
                            className="w-full flex items-center justify-between py-4 px-4 active:bg-zinc-800/50 transition-colors text-left"
                        >
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-amber-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <span className="text-zinc-100 font-semibold text-sm">Clear Game Cache</span>
                            </div>
                            {clearingCache ? (
                                 <svg className="animate-spin h-5 w-5 text-zinc-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-zinc-600">
                                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                     </div>
                 </div>

                {/* Danger Zone */}
                <div>
                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 ml-4">Danger Zone</h3>
                    <div className="bg-zinc-900/70 backdrop-blur-md rounded-2xl overflow-hidden border border-red-900/30">
                        <button
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(50);
                                setShowResetAlert(true);
                            }}
                            className="w-full flex items-center justify-between py-4 px-4 active:bg-red-500/10 transition-colors text-left"
                        >
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-red-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                      <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <span className="text-red-500 font-semibold text-sm">Reset All Data</span>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-zinc-600">
                                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

             <p className="text-center text-zinc-600 text-[10px] font-medium uppercase tracking-widest opacity-50">
                 Simulated iOS Configuration Environment
             </p>
        </div>

        {/* Redeem Code View */}
        <div className={`absolute inset-0 transition-all duration-300 ease-spring ${
            subTab === 'redeem' ? 'translate-x-0 opacity-100 z-10' : (subTab === 'system' ? 'translate-x-[10%] opacity-0 pointer-events-none' : '-translate-x-[10%] opacity-0 pointer-events-none')
        }`}>
            <RedeemPanel />
        </div>

        {/* About View */}
        <div className={`absolute inset-0 flex flex-col p-6 overflow-y-auto transition-all duration-300 ease-spring ${
             subTab === 'about' ? 'translate-x-0 opacity-100 z-10' : 'translate-x-[10%] opacity-0 pointer-events-none'
        }`}>
             <header className="mb-8 shrink-0 text-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-yellow-500 to-orange-600 rounded-3xl mx-auto mb-4 shadow-2xl shadow-orange-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
                      <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436h.004c-.148.115-.295.226-.442.335-.157.117-.314.23-.472.34-1.295.904-2.739 1.64-4.306 2.153a3.495 3.495 0 01-1.887-.297l-.519-.26a.38.38 0 00-.457.085l-.588.588a.38.38 0 00.085.457l.26.519c.203.405.303.856.297 1.31a3.488 3.488 0 00-2.153 4.306c-.11.157-.223.315-.34.472-.108.148-.22.294-.335.442v-.004c-2.881 3.701-7.38 6.084-12.436 6.084a.75.75 0 01-.75-.75c0-5.055 2.383-9.555 6.084-12.436h-.004c.148-.115.295-.226.442-.335.157-.117.314-.23.472-.34 1.295-.904 2.739-1.64 4.306-2.153a3.494 3.494 0 011.31-.297 3.495 3.495 0 01.577.046l.519.26c.149.075.326.044.457-.085l.588-.588a.38.38 0 00-.085-.457l-.26-.519a3.495 3.495 0 00-.297-1.31 3.489 3.489 0 002.153-4.306c.11-.157.223-.315.34-.472.108-.148.22-.294.335-.442v.004z" clipRule="evenodd" />
                    </svg>
                </div>
                <h1 className="text-2xl font-black text-white mb-1">
                  FF Command Center
                </h1>
                <p className="text-zinc-500 text-sm font-medium">
                  Version 1.2.2 (Build 2410)
                </p>
              </header>
              
              <div className="space-y-6">
                  <div className="bg-zinc-900/70 backdrop-blur-md p-4 rounded-2xl border border-zinc-800/50">
                      <p className="text-sm text-zinc-300 leading-relaxed">
                          A fan-made utility dashboard for Free Fire players on iOS, featuring AI-powered strategy generation, sensitivity calibration, and a simulated code redemption interface.
                      </p>
                  </div>

                  <div>
                       <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-4">Community & Support</h3>
                       <div className="bg-zinc-900/70 backdrop-blur-md rounded-2xl overflow-hidden border border-zinc-800/50 divide-y divide-zinc-800/50">
                            {[
                                { 
                                    label: 'YouTube Channel', 
                                    url: 'https://www.youtube.com/@3DVK-Gaming',
                                    icon: (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
                                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                                        </svg>
                                    )
                                },
                                { 
                                    label: 'TikTok', 
                                    url: 'https://www.tiktok.com/@3d.vk_1m7',
                                    icon: (
                                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v10.1c-.05 2.31-1.53 4.35-3.65 5.04-2.13.69-4.53.26-6.22-1.12-1.7-1.38-2.52-3.58-2.14-5.78.38-2.2 2.03-4.07 4.15-4.71.5-.15 1.02-.23 1.54-.25V15.7c-1.57.16-2.97 1.23-3.49 2.73-.52 1.5.04 3.2 1.32 4.2 1.29 1.01 3.15 1.11 4.55.25 1.39-.86 2.22-2.38 2.21-4.02V6.82c0-1.6-.02-3.19.01-4.79 0-.66.08-1.33.08-2.01z"/>
                                        </svg>
                                    )
                                },
                                { 
                                    label: 'Support Center', 
                                    url: 'https://ffsupport.garena.com/hc/en-us',
                                    icon: (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-400">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A9.99 9.99 0 0010 18c2.314 0 4.438-.784 6.131-2.1.43-.333-.604-2.472-1.338-2.472H10z" clipRule="evenodd" />
                                        </svg>
                                    )
                                },
                            ].map((item, i) => (
                                <a 
                                    key={i}
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => navigator.vibrate && navigator.vibrate(10)}
                                    className="w-full flex items-center justify-between py-4 px-4 active:bg-zinc-800/50 transition-colors text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        {item.icon && <div className="shrink-0">{item.icon}</div>}
                                        <span className="text-zinc-100 font-medium text-sm">{item.label}</span>
                                    </div>
                                     <div className="flex items-center text-zinc-600 group-active:text-zinc-400 transition-colors">
                                        <span className="text-[10px] mr-2 opacity-0 group-active:opacity-100 transition-opacity font-bold tracking-widest">OPEN</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path fillRule="evenodd" d="M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z" clipRule="evenodd" />
                                        </svg>
                                     </div>
                                </a>
                            ))}
                       </div>
                  </div>
              </div>

              <div className="mt-auto pt-8 pb-4 text-center">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                      Made with <span className="text-red-500">♥</span> for the community
                  </p>
              </div>
        </div>
      </div>

      {/* Custom Reset Alert Modal */}
      {showResetAlert && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-xs text-center border border-white/10 shadow-2xl animate-[spring_0.4s_ease-out]">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-red-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Reset App?</h3>
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                    This will delete all saved device models, strategies, and preferences. This action cannot be undone.
                </p>
                <div className="space-y-3">
                    <button
                        onClick={handleResetApp}
                        className="w-full py-3.5 font-bold text-white bg-red-600 hover:bg-red-500 rounded-2xl transition-colors"
                    >
                        Reset Everything
                    </button>
                    <button
                        onClick={() => setShowResetAlert(false)}
                        className="w-full py-3.5 font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
