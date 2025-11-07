import React from 'react';

interface TabIconProps {
  isActive: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}

export const TabIcon: React.FC<TabIconProps> = ({ isActive, children, label, onClick }) => {
  const handleClick = () => {
    // Subtle haptic for tab switch
    if (navigator.vibrate) navigator.vibrate(5);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors duration-200 ${
        isActive ? 'text-yellow-500' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <div className={`h-6 w-6 mb-1 ${isActive ? '[&>svg]:stroke-[2.5px]' : ''}`}>
        {children}
      </div>
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  );
};
