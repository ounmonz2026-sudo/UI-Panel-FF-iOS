export enum Tab {
  AIM = 'aim',
  STRATEGY = 'strategy',
  SETTINGS = 'settings'
}

export enum GameMode {
  BATTLE_ROYALE = 'Battle Royale',
  CLASH_SQUAD = 'Clash Squad',
  LONE_WOLF = 'Lone Wolf'
}

export enum PlayStyle {
  RUSHER = 'Rusher (Aggressive)',
  SUPPORT = 'Support (Healer/Sniper)',
  IGL = 'IGL (Tactical)',
  FLANKER = 'Flanker (Stealth)',
  RECON = 'Recon (Information Gathering)',
  DEMOLITION = 'Demolition (Area Denial)'
}

export interface StrategyResponse {
  title: string;
  characterCombination: string[];
  weaponLoadout: string[];
  tacticalAdvice: string;
}

export interface SensitivityResponse {
  deviceName: string;
  settings: {
    general: number;
    redDot: number;
    scope2x: number;
    scope4x: number;
    sniperScope: number;
    freeLook: number;
  };
  fireButtonSize: number;
  dpi: number;
  notes: string;
}

export interface User {
  id: string;
  name: string;
  method: 'google' | 'phone' | 'email';
  avatar?: string; // URL or Initials
}
