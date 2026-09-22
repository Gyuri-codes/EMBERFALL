import React from 'react';
import { Volume2, VolumeX, Settings, HelpCircle, Shield, Sparkles, Home, Trophy, ShoppingBag, Eye } from 'lucide-react';
import { GameSaveState, CultivationRank } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface NavbarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  saveState: GameSaveState;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
  audioMuted: boolean;
  onToggleAudio: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  saveState,
  onOpenSettings,
  onOpenTutorial,
  audioMuted,
  onToggleAudio
}) => {
  return (
    <header 
      id="main-navbar"
      className="sticky top-0 z-40 w-full bg-neutral-950/85 backdrop-blur-md border-b border-amber-900/30 px-3 py-2 flex items-center justify-between text-neutral-200 select-none"
      role="banner"
    >
      {/* Brand & Realm Title */}
      <div className="flex items-center space-x-3">
        <button
          id="nav-home-brand"
          onClick={() => onNavigate('home')}
          className="flex items-center space-x-2 text-left group focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-md px-1"
          aria-label="Return to Emberfall Home Screen"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 via-orange-700 to-red-800 flex items-center justify-center shadow-md shadow-orange-900/40 border border-amber-400/40">
            <span className="text-amber-200 text-sm font-calligraphy font-bold">仙</span>
          </div>
          <div>
            <div className="font-cinzel text-xs sm:text-sm font-bold tracking-wider text-amber-300 group-hover:text-amber-200 transition-colors">
              EMBERFALL
            </div>
            <div className="text-[10px] text-neutral-400 tracking-tight hidden sm:block">
              GUARDIANS OF THE LAST REALM
            </div>
          </div>
        </button>

        {/* Cultivation Rank Badge */}
        <div 
          id="nav-cultivation-rank-badge"
          className="hidden md:flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 font-cinzel"
          title="Current Cultivation Realm"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>{saveState.playerCultivationRank}</span>
        </div>
      </div>

      {/* Navigation Links for Quick Access */}
      <nav className="hidden lg:flex items-center space-x-1 text-xs font-cinzel tracking-wider" aria-label="Main Navigation">
        <button
          id="nav-btn-home"
          onClick={() => onNavigate('home')}
          className={`px-2.5 py-1 rounded transition-colors ${currentScreen === 'home' ? 'text-amber-400 bg-amber-950/50 border border-amber-600/40' : 'text-neutral-300 hover:text-amber-300'}`}
        >
          Home
        </button>
        <button
          id="nav-btn-realms"
          onClick={() => onNavigate('realms')}
          className={`px-2.5 py-1 rounded transition-colors ${currentScreen === 'realms' ? 'text-amber-400 bg-amber-950/50 border border-amber-600/40' : 'text-neutral-300 hover:text-amber-300'}`}
        >
          Realms
        </button>
        <button
          id="nav-btn-guardians"
          onClick={() => onNavigate('guardians')}
          className={`px-2.5 py-1 rounded transition-colors ${currentScreen === 'guardians' ? 'text-amber-400 bg-amber-950/50 border border-amber-600/40' : 'text-neutral-300 hover:text-amber-300'}`}
        >
          Guardians
        </button>
        <button
          id="nav-btn-cultivation"
          onClick={() => onNavigate('cultivation')}
          className={`px-2.5 py-1 rounded transition-colors ${currentScreen === 'cultivation' ? 'text-amber-400 bg-amber-950/50 border border-amber-600/40' : 'text-neutral-300 hover:text-amber-300'}`}
        >
          Cultivation
        </button>
        <button
          id="nav-btn-store"
          onClick={() => onNavigate('store')}
          className={`px-2.5 py-1 rounded transition-colors ${currentScreen === 'store' ? 'text-amber-400 bg-amber-950/50 border border-amber-600/40' : 'text-neutral-300 hover:text-amber-300'}`}
        >
          Store
        </button>
        <button
          id="nav-btn-leaderboard"
          onClick={() => onNavigate('leaderboard')}
          className={`px-2.5 py-1 rounded transition-colors ${currentScreen === 'leaderboard' ? 'text-amber-400 bg-amber-950/50 border border-amber-600/40' : 'text-neutral-300 hover:text-amber-300'}`}
        >
          Rankings
        </button>
      </nav>

      {/* Right Stats & Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Celestial Shards Meta Currency */}
        <div 
          id="nav-shards-display"
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-neutral-900/90 border border-amber-500/40 text-xs sm:text-sm font-semibold text-amber-300 shadow-sm"
          title="Celestial Shards (Meta Currency)"
          aria-label={`${saveState.celestialShards} Celestial Shards`}
        >
          <span className="text-amber-400 animate-pulse">✦</span>
          <span>{saveState.celestialShards.toLocaleString()}</span>
        </div>

        {/* Audio Toggle */}
        <button
          id="nav-audio-toggle"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleAudio();
          }}
          className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 transition-colors border border-neutral-700/60 cursor-pointer active:scale-95"
          title={audioMuted ? "Unmute Music & SFX" : "Mute Music & SFX"}
          aria-label={audioMuted ? "Audio muted, click to unmute" : "Audio active, click to mute"}
        >
          {audioMuted ? <VolumeX className="w-4 h-4 text-neutral-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Tutorial / Help */}
        <button
          id="nav-tutorial-btn"
          onClick={onOpenTutorial}
          className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 transition-colors border border-neutral-700/60"
          title="How to Play Tutorial"
          aria-label="Open game guide and tutorial"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          id="nav-settings-btn"
          onClick={onOpenSettings}
          className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 transition-colors border border-neutral-700/60"
          title="Game & Accessibility Settings"
          aria-label="Open settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
