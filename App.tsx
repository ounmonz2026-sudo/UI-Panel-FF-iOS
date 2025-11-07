import React, { useState, useEffect } from 'react';
import { Tab, User } from './types';
import { TabIcon } from './components/TabIcon';
import { StrategyPanel } from './components/StrategyPanel';
import { AimPanel } from './components/AimPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { AuthScreen } from './components/AuthScreen';

// Simple SVG icons for tabs
const Icons = {
  Aim: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 8.667a1.083 1.083 0 100 2.166 1.083 1.083 0 000-2.166zm0-4.683a5.767 5.767 0 00-5.767 5.767c0 1.29.426 2.483 1.145 3.445l1.054-1.054a4.266 4.266 0 01-.704-2.391c0-2.353 1.913-4.266 4.272-4.266s4.272 1.913 4.272 4.266c0 .903-.28 1.74-.757 2.426l1.032 1.032c.8-1.03 1.225-2.17 1.225-3.458 0-3.185-2.582-5.767-5.772-5.767z" clipRule="evenodd" />
    </svg>
  ),
  Strategy: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
       <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  Settings: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.633c-.01.01-.122.086-.325.086-.102 0-.198-.017-.285-.05l-1.22-.45c-.822-.303-1.764.053-2.196.83l-1.03 1.852c-.432.777-.17 1.762.613 2.295l.997.679c.078.054.145.264.013.556a7.534 7.534 0 000 1.704c.132.292.065.502-.013.556l-.997.679c-.783.533-1.045 1.518-.613 2.295l1.03 1.853c.432.777 1.374 1.132 2.196.83l1.22-.45c.087-.033.183-.05.285-.05.203 0 .315.076.325.086.308.233.638.445.986.633.182.088.277.228.297.348l.178 1.072c.151.904.933 1.567 1.85 1.567h2.06c.917 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.115-.26.297-.348.348-.188.678-.4 1.009-.646.01-.01.122-.086.325-.086.102 0 .198.017.285.05l1.22.45c.822.303 1.764-.053 2.196-.83l1.03-1.852c.432-.777.17-1.762-.613-2.295l-.997-.679c-.078-.054-.145-.264-.013-.556.076-.166.135-.339.18-.514.044-.175.066-.355.066-.538 0-.183-.022-.363-.066-.538a7.55 7.55 0 00-.18-.514c-.132-.292-.065-.502.013-.556l.997-.679c.783-.533 1.045-1.518.613-2.295l-1.03-1.853c-.432-.777-1.374-1.132-2.196-.83l-1.22.45c-.087.033-.183.05-.285.05-.203 0-.315-.076-.325-.086a7.553 7.553 0 00-.986-.633c-.182-.088-.277-.228-.297-.348L13.138 3.817A1.877 1.877 0 0011.288 2.25h-2.06zM12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z" clipRule="evenodd" />
    </svg>
  )
};

const STORAGE_KEY_TAB = 'ff_command_center_active_tab';
const STORAGE_KEY_USER = 'ff_command_center_user_session';

interface TabPanelProps {
  isActive: boolean;
  children: React.ReactNode;
}

// Persistent wrapper for each tab to maintain state (input, scroll position, etc.)
const TabPanel: React.FC<TabPanelProps> = ({
  isActive,
  children
}) => (
  <div
    aria-hidden={!isActive}
    className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-all duration-200 ease-in-out ${
      isActive ? 'opacity-100 visible z-10' : 'opacity-0 invisible z-0 pointer-events-none'
    }`}
  >
    {children}
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    try {
      const savedTab = localStorage.getItem(STORAGE_KEY_TAB);
      if (savedTab && Object.values(Tab).includes(savedTab as Tab)) {
        return savedTab as Tab;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return Tab.AIM;
  });

  // Check for persisted user session on mount
  useEffect(() => {
      try {
          const savedUserStr = localStorage.getItem(STORAGE_KEY_USER);
          if (savedUserStr) {
              setUser(JSON.parse(savedUserStr));
          }
      } catch (e) {
          console.error("Failed to restore user session", e);
          localStorage.removeItem(STORAGE_KEY_USER);
      } finally {
          setIsAuthChecking(false);
      }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TAB, activeTab);
    } catch (e) {
       console.warn('Failed to save tab state');
    }
  }, [activeTab]);

  const handleAuthSuccess = (newUser: User) => {
      setUser(newUser);
      try {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
      } catch (e) {
          console.error("Failed to save user session", e);
      }
  };

  const handleLogout = () => {
      setUser(null);
      try {
          localStorage.removeItem(STORAGE_KEY_USER);
      } catch (e) { /* ignore */ }
  };

  if (isAuthChecking) {
      return <div className="h-full bg-zinc-950"></div>; // Or a splash screen
  }

  if (!user) {
      return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <main className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden safe-top">
      {/* Ambient Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-10%] left-[-20%] w-[70%] h-[40%] bg-yellow-600/10 blur-[100px] rounded-full opacity-40 animate-pulse"></div>
         <div className="absolute bottom-[10%] right-[-10%] w-[60%] h-[50%] bg-orange-700/10 blur-[120px] rounded-full opacity-30"></div>
      </div>

      {/* Main Content Area - Stacked Layers */}
      <div className="flex-1 z-10 relative overflow-hidden">
        <TabPanel isActive={activeTab === Tab.AIM}>
          <AimPanel onSwitchTab={setActiveTab} />
        </TabPanel>

        <TabPanel isActive={activeTab === Tab.STRATEGY}>
          <StrategyPanel />
        </TabPanel>

        <TabPanel isActive={activeTab === Tab.SETTINGS}>
           <SettingsPanel user={user} onLogout={handleLogout} />
        </TabPanel>
      </div>

      {/* iOS-style Tab Bar */}
      <nav className="shrink-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800/50 safe-bottom">
        <div className="flex justify-around items-center px-2 pt-2 pb-1 max-w-md mx-auto">
          <TabIcon
            isActive={activeTab === Tab.AIM}
            label="AimHQ"
            onClick={() => setActiveTab(Tab.AIM)}
          >
            <Icons.Aim className="h-6 w-6" />
          </TabIcon>

           <TabIcon
            isActive={activeTab === Tab.STRATEGY}
            label="Tactics"
            onClick={() => setActiveTab(Tab.STRATEGY)}
          >
            <Icons.Strategy />
          </TabIcon>

          <TabIcon
            isActive={activeTab === Tab.SETTINGS}
            label="Tools"
            onClick={() => setActiveTab(Tab.SETTINGS)}
          >
            <Icons.Settings className="h-6 w-6" />
          </TabIcon>
        </div>
      </nav>
    </main>
  );
};

export default App;
