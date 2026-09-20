import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Shield, 
  Map, 
  Award, 
  Settings, 
  HelpCircle, 
  Flame,
  Zap,
  ShoppingBag, 
  Trophy, 
  Volume2, 
  VolumeX 
} from 'lucide-react';
import { HomeAtmosphereCanvas } from './HomeAtmosphereCanvas';
import { HomeCitadelBackdrop } from './HomeCitadelBackdrop';
import { ShadowTowerGuardian } from './ShadowTowerGuardian';
import { soundEngine } from '../audio/soundEngine';
import { GameSaveState } from '../types/game';

interface HomeScreenProps {
  onPlayGame: () => void;
  onNavigate: (screen: string) => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
  saveState?: GameSaveState;
  audioMuted?: boolean;
  onToggleAudio?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlayGame,
  onNavigate,
  onOpenSettings,
  onOpenTutorial,
  saveState,
  audioMuted = false,
  onToggleAudio
}) => {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    soundEngine.setMusicState('menu');
    soundEngine.playTempleBell(220, 0.25);

    let isMouseActive = false;
    let idleTimer: number;

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      isMouseActive = true;
      clearTimeout(idleTimer);

      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      setParallax({ x: normX, y: normY });

      idleTimer = window.setTimeout(() => {
        isMouseActive = false;
      }, 2500);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Subtle ambient breathing oscillation when idle or on mobile
    let animId: number;
    const animateAmbient = () => {
      if (!isMouseActive) {
        const time = Date.now() * 0.001;
        setParallax(prev => ({
          x: prev.x + (Math.sin(time * 0.5) * 0.2 - prev.x) * 0.03,
          y: prev.y + (Math.cos(time * 0.4) * 0.15 - prev.y) * 0.03
        }));
      }
      animId = requestAnimationFrame(animateAmbient);
    };
    animId = requestAnimationFrame(animateAmbient);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      clearTimeout(idleTimer);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleStartPlay = () => {
    soundEngine.playTempleBell(440, 0.35);
    onPlayGame();
  };

  const handleSecondaryNav = (screen: string) => {
    soundEngine.playPlacement();
    onNavigate(screen);
  };

  const currentRank = saveState?.playerCultivationRank || 'SPIRIT AWAKENING';
  const currencyAmount = saveState ? saveState.celestialShards.toLocaleString() : '0';

  return (
    <div 
      id="home-screen"
      className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden overflow-y-auto bg-neutral-950 text-neutral-100 select-none"
    >
      {/* 1. Deep Layer: Dramatic Ruined Citadel, Volcanic Mountains, Levitating Islands & Guardian Cliff */}
      <HomeCitadelBackdrop parallaxX={parallax.x} parallaxY={parallax.y} />

      {/* 2. Atmospheric Realm Layer: Celestial Portal in Sky, Drifting Ash, Quiet Soft Embers (NO SPARKLES) */}
      <HomeAtmosphereCanvas 
        mouseX={parallax.x} 
        mouseY={parallax.y} 
        className="absolute inset-0 w-full h-full z-10" 
      />

      {/* 3. Central Hero Feature: Mysterious Shadowlike Multi-Element Tower Guardian */}
      <ShadowTowerGuardian 
        parallaxX={parallax.x} 
        parallaxY={parallax.y} 
      />

      {/* 4. SLIM PREMIUM GAME HEADER (Top) */}
      <header 
        id="home-header"
        className="relative z-30 w-full px-4 sm:px-6 md:px-8 py-3 bg-neutral-950/60 backdrop-blur-md border-b border-amber-500/20 flex items-center justify-between shadow-lg shadow-black/60"
      >
        {/* Left: Emblem, Title, Subtitle, Cultivation Badge */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div 
            className="group flex items-center space-x-2.5 text-left focus:outline-none cursor-pointer"
            onClick={() => soundEngine.playPlacement()}
          >
            {/* Circular Emberfall Emblem / Logo */}
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-700 via-amber-800 to-red-950 flex items-center justify-center border-2 border-amber-400/70 shadow-[0_0_14px_rgba(245,158,11,0.35)] group-hover:scale-105 transition-transform shrink-0">
              <span className="text-amber-200 text-base sm:text-lg font-calligraphy font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">仙</span>
              <div className="absolute inset-0 rounded-full border border-amber-200/20 pointer-events-none" />
            </div>

            <div>
              <div className="font-cinzel text-xs sm:text-sm font-black tracking-[0.16em] text-amber-300 group-hover:text-amber-200 transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                EMBERFALL
              </div>
              <div className="text-[9px] sm:text-[10px] tracking-wider text-neutral-400 font-cinzel hidden sm:block">
                GUARDIANS OF THE LAST REALM
              </div>
            </div>
          </div>

          {/* Compact Cultivation Rank Badge (Clean, serene) */}
          <div 
            id="home-spirit-awakening-badge"
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-neutral-950/75 border border-amber-500/40 text-[10px] sm:text-[11px] font-cinzel font-semibold tracking-wider text-amber-300 shadow-sm"
            title="Spirit Awakening Cultivation Realm"
          >
            <Flame className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{currentRank}</span>
          </div>
        </div>

        {/* Right: Currency Counter, Audio Toggle, Help, Settings */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Currency / Ember Counter */}
          <div 
            id="home-currency-display"
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-md bg-neutral-950/75 border border-amber-500/40 text-xs sm:text-sm font-cinzel font-bold text-amber-300 shadow-sm"
            title="Celestial Shards"
            aria-label={`${currencyAmount} Celestial Shards`}
          >
            <span className="text-amber-400 text-sm">✦</span>
            <span>{currencyAmount}</span>
          </div>

          {/* Sound / Music Toggle */}
          {onToggleAudio && (
            <button
              id="home-audio-toggle"
              onClick={onToggleAudio}
              className="p-1.5 sm:p-2 rounded-md bg-neutral-950/75 hover:bg-neutral-900 border border-amber-900/40 hover:border-amber-400/60 text-neutral-300 hover:text-amber-300 transition-colors shadow-sm cursor-pointer"
              title={audioMuted ? "Unmute Music & SFX" : "Mute Music & SFX"}
              aria-label={audioMuted ? "Audio muted, click to unmute" : "Audio active, click to mute"}
            >
              {audioMuted ? (
                <VolumeX className="w-4 h-4 text-neutral-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-400" />
              )}
            </button>
          )}

          {/* Help Button */}
          <button
            id="home-btn-help"
            onClick={() => {
              soundEngine.playPlacement();
              onOpenTutorial();
            }}
            className="p-1.5 sm:p-2 rounded-md bg-neutral-950/75 hover:bg-neutral-900 border border-amber-900/40 hover:border-amber-400/60 text-neutral-300 hover:text-amber-300 transition-colors shadow-sm cursor-pointer"
            title="How to Play Tutorial"
            aria-label="Open how to play tutorial"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Settings Button */}
          <button
            id="home-btn-settings"
            onClick={() => {
              soundEngine.playPlacement();
              onOpenSettings();
            }}
            className="p-1.5 sm:p-2 rounded-md bg-neutral-950/75 hover:bg-neutral-900 border border-amber-900/40 hover:border-amber-400/60 text-neutral-300 hover:text-amber-300 transition-colors shadow-sm cursor-pointer"
            title="Game Settings"
            aria-label="Open game settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 5. CENTER HERO SECTION (Depth: foreground UI sitting cleanly in front of the Shadow Tower Guardian) */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-6 max-w-4xl mx-auto w-full text-center my-auto">
        {/* Above Title Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-neutral-950/80 backdrop-blur-md border border-amber-500/40 text-amber-300 font-cinzel mb-3 sm:mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
          <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-cinzel font-bold tracking-[0.2em] text-[11px] sm:text-xs text-amber-300">
            STRATE<span className="relative inline-block">G<span className="absolute right-[0.05em] top-[53%] w-[0.25em] h-[0.11em] bg-current rounded-[0.5px] pointer-events-none -translate-y-1/2" aria-hidden="true" /></span>IC TOWER DEFENSE
          </span>
        </div>

        {/* Title & Branding Box (with soft dark background blur for pristine text legibility) */}
        <div className="relative flex flex-col items-center mb-1 px-6 py-3 rounded-3xl bg-neutral-950/40 backdrop-blur-[2px]">
          {/* Crimson Calligraphy Seal */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-red-700 via-amber-800 to-red-950 flex items-center justify-center border-2 border-amber-400/75 shadow-[0_0_20px_rgba(220,38,38,0.4)] mb-2 sm:mb-3 transform hover:scale-105 transition-transform duration-300">
            <span className="font-calligraphy text-2xl sm:text-3xl text-amber-200 font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">仙域</span>
          </div>

          {/* Main Title: EMBERFALL */}
          <h1 
            id="home-main-title"
            className="font-cinzel text-5xl sm:text-7xl md:text-8xl font-black tracking-[0.16em] sm:tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 drop-shadow-[0_4px_28px_rgba(0,0,0,0.95)] select-none"
          >
            EMBERFALL
          </h1>

          {/* Below Title: GUARDIANS OF THE LAST REALM */}
          <h2 
            id="home-subtitle"
            className="font-cinzel text-xs sm:text-base md:text-lg font-bold tracking-[0.24em] sm:tracking-[0.28em] text-amber-300/90 mt-1 sm:mt-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
          >
            GUARDIANS OF THE LAST REALM
          </h2>

          {/* Narrative Tagline */}
          <p 
            id="home-narrative-quote"
            className="text-neutral-300/90 italic font-serif text-xs sm:text-sm md:text-base mt-2 sm:mt-2.5 max-w-lg leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]"
          >
            &ldquo;When the realms fall, the guardians awaken.&rdquo;
          </p>

          {/* Decorative Divider */}
          <div className="flex items-center justify-center space-x-2 my-3.5 sm:my-4 w-full max-w-xs sm:max-w-sm mx-auto">
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            <div className="w-1.5 h-1.5 rotate-45 border border-amber-400/60 bg-amber-500/40" />
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          </div>
        </div>

        {/* 6. PRIMARY CTA: "▶ PLAY GAME" */}
        <div className="w-full max-w-xs sm:max-w-sm px-2 mt-1">
          <button
            id="home-btn-play-game"
            onClick={handleStartPlay}
            className="group relative w-full overflow-hidden px-8 py-3.5 sm:py-4.5 rounded-xl sm:rounded-2xl font-cinzel text-lg sm:text-2xl font-black tracking-widest text-neutral-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 hover:from-amber-300 hover:via-yellow-300 hover:to-orange-300 shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.7)] border-2 border-amber-200/90 transform hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center justify-center space-x-3 cursor-pointer"
            aria-label="Play Game: Select realm and defend the Last Realm"
          >
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-neutral-950 text-neutral-950 group-hover:scale-110 transition-transform duration-200 shrink-0" />
            <span className="font-cinzel font-black tracking-[0.16em]">PLAY GAME</span>
          </button>
        </div>

        {/* 7. SECONDARY NAVIGATION (2 Rows of 4 Cards) */}
        <div className="mt-5 sm:mt-6 w-full max-w-2xl flex flex-col space-y-2 sm:space-y-2.5 px-2">
          {/* Row 1: GUARDIANS • REALMS • CULTIVATION • ACHIEVEMENTS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 w-full">
            <button
              id="home-btn-guardians"
              onClick={() => handleSecondaryNav('guardians')}
              className="group relative flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-neutral-950/80 hover:bg-neutral-900/90 backdrop-blur-md border border-amber-900/40 hover:border-amber-400/80 shadow-md shadow-black/50 hover:shadow-lg hover:shadow-amber-500/15 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-cinzel font-bold text-xs sm:text-[13px] tracking-wider text-neutral-200 group-hover:text-amber-200 transition-colors uppercase whitespace-nowrap">
                Guardians
              </span>
            </button>

            <button
              id="home-btn-realms"
              onClick={() => handleSecondaryNav('realms')}
              className="group relative flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-neutral-950/80 hover:bg-neutral-900/90 backdrop-blur-md border border-amber-900/40 hover:border-amber-400/80 shadow-md shadow-black/50 hover:shadow-lg hover:shadow-amber-500/15 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <Map className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-cinzel font-bold text-xs sm:text-[13px] tracking-wider text-neutral-200 group-hover:text-amber-200 transition-colors uppercase whitespace-nowrap">
                Realms
              </span>
            </button>

            <button
              id="home-btn-cultivation"
              onClick={() => handleSecondaryNav('cultivation')}
              className="group relative flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-neutral-950/80 hover:bg-neutral-900/90 backdrop-blur-md border border-amber-900/40 hover:border-amber-400/80 shadow-md shadow-black/50 hover:shadow-lg hover:shadow-amber-500/15 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-cinzel font-bold text-xs sm:text-[13px] tracking-wider text-neutral-200 group-hover:text-amber-200 transition-colors uppercase whitespace-nowrap">
                Cultivation
              </span>
            </button>

            <button
              id="home-btn-achievements"
              onClick={() => handleSecondaryNav('achievements')}
              className="group relative flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-neutral-950/80 hover:bg-neutral-900/90 backdrop-blur-md border border-amber-900/40 hover:border-amber-400/80 shadow-md shadow-black/50 hover:shadow-lg hover:shadow-amber-500/15 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <Award className="w-4 h-4 text-yellow-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-cinzel font-bold text-xs sm:text-[13px] tracking-wider text-neutral-200 group-hover:text-amber-200 transition-colors uppercase whitespace-nowrap">
                Achievements
              </span>
            </button>
          </div>

          {/* Row 2: STORE • RANKINGS • SETTINGS • HOW TO PLAY */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 w-full">
            <button
              id="home-btn-store"
              onClick={() => handleSecondaryNav('store')}
              className="group relative flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-neutral-950/80 hover:bg-neutral-900/90 backdrop-blur-md border border-amber-900/40 hover:border-amber-400/80 shadow-md shadow-black/50 hover:shadow-lg hover:shadow-amber-500/15 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-cinzel font-bold text-xs sm:text-[13px] tracking-wider text-neutral-200 group-hover:text-amber-200 transition-colors uppercase whitespace-nowrap">
                Store
              </span>
            </button>

            <button
              id="home-btn-rankings"
              onClick={() => handleSecondaryNav('leaderboard')}
              className="group relative flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-neutral-950/80 hover:bg-neutral-900/90 backdrop-blur-md border border-amber-900/40 hover:border-amber-400/80 shadow-md shadow-black/50 hover:shadow-lg hover:shadow-amber-500/15 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-cinzel font-bold text-xs sm:text-[13px] tracking-wider text-neutral-200 group-hover:text-amber-200 transition-colors uppercase whitespace-nowrap">
                Rankings
              </span>
            </button>

            <button
              id="home-btn-settings-bottom"
              onClick={() => {
                soundEngine.playPlacement();
                onOpenSettings();
              }}
              className="group relative flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-neutral-950/80 hover:bg-neutral-900/90 backdrop-blur-md border border-amber-900/40 hover:border-amber-400/80 shadow-md shadow-black/50 hover:shadow-lg hover:shadow-amber-500/15 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-neutral-300 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-cinzel font-bold text-xs sm:text-[13px] tracking-wider text-neutral-200 group-hover:text-amber-200 transition-colors uppercase whitespace-nowrap">
                Settings
              </span>
            </button>

            <button
              id="home-btn-howtoplay"
              onClick={() => {
                soundEngine.playPlacement();
                onOpenTutorial();
              }}
              className="group relative flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-neutral-950/80 hover:bg-neutral-900/90 backdrop-blur-md border border-amber-900/40 hover:border-amber-400/80 shadow-md shadow-black/50 hover:shadow-lg hover:shadow-amber-500/15 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-cinzel font-bold text-xs sm:text-[13px] tracking-wider text-neutral-200 group-hover:text-amber-200 transition-colors uppercase whitespace-nowrap">
                How to Play
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* 8. BOTTOM FOOTER */}
      <footer 
        id="home-footer"
        className="relative z-30 w-full text-center py-2.5 sm:py-3 border-t border-amber-900/20 bg-neutral-950/70 backdrop-blur-md shadow-inner"
      >
        <div id="game-creator-credit" className="font-cinzel font-bold tracking-[0.22em] text-xs sm:text-sm text-amber-400/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          GAME CREATOR: RURU
        </div>
        <div className="text-[10px] sm:text-[11px] text-neutral-400 tracking-wider mt-0.5 font-sans">
          Emberfall: Guardians of the Last Realm &bull; Pure Browser &bull; Cross-Platform TD
        </div>
      </footer>
    </div>
  );
};
