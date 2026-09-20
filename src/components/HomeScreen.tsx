import React, { useEffect, useRef } from 'react';
import { Play, Shield, Map, Award, Settings, HelpCircle, Sparkles, ShoppingBag, Trophy, Flame } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface HomeScreenProps {
  onPlayGame: () => void;
  onNavigate: (screen: string) => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlayGame,
  onNavigate,
  onOpenSettings,
  onOpenTutorial
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    soundEngine.setMusicState('menu');
    soundEngine.playTempleBell(220, 0.2);

    // Floating Ember animation on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = Math.max(canvas.offsetWidth || window.innerWidth || 800, 300));
    let height = (canvas.height = Math.max(canvas.offsetHeight || window.innerHeight || 600, 300));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = Math.max(canvas.offsetWidth || window.innerWidth || 800, 300);
      height = canvas.height = Math.max(canvas.offsetHeight || window.innerHeight || 600, 300);
    };
    window.addEventListener('resize', handleResize);

    interface Ember {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      alpha: number;
      decay: number;
      color: string;
    }

    const embers: Ember[] = [];
    const colors = ['#f97316', '#ef4444', '#fbbf24', '#ea580c', '#eab308'];

    for (let i = 0; i < 60; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * 3,
        speedY: 0.5 + Math.random() * 1.5,
        speedX: (Math.random() - 0.5) * 0.8,
        alpha: 0.2 + Math.random() * 0.8,
        decay: 0.003 + Math.random() * 0.005,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Celestial Gate Light Cone in background
      const centerGrad = ctx.createRadialGradient(width / 2, height * 0.45, 10, width / 2, height * 0.45, width * 0.6);
      centerGrad.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
      centerGrad.addColorStop(0.4, 'rgba(234, 88, 12, 0.06)');
      centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = centerGrad;
      ctx.fillRect(0, 0, width, height);

      // Embers
      embers.forEach(e => {
        e.y -= e.speedY;
        e.x += e.speedX;
        e.alpha -= e.decay;

        if (e.y < -10 || e.alpha <= 0) {
          e.y = height + 10;
          e.x = Math.random() * width;
          e.alpha = 0.4 + Math.random() * 0.6;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, e.alpha);
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleStartPlay = () => {
    soundEngine.playTempleBell(440, 0.3);
    onPlayGame();
  };

  return (
    <div 
      id="home-screen"
      className="relative min-h-[calc(100vh-50px)] w-full flex flex-col items-center justify-between px-4 py-8 overflow-hidden bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100"
    >
      {/* Background Embers Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none z-0" 
      />

      {/* Background Mountain Silhouette & Celestial Gate */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(217,119,6,0.12),transparent_70%)] pointer-events-none" />

      {/* Ancient Talisman seal rings in center background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-amber-500/10 pointer-events-none animate-[spin_120s_linear_infinite]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full border border-dashed border-amber-600/10 pointer-events-none animate-[spin_180s_linear_infinite_reverse]" />

      {/* Top Banner / Donghua seal */}
      <div className="relative z-10 flex flex-col items-center pt-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 font-cinzel mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>CHINESE CULTIVATION STRATEGIC TOWER DEFENSE</span>
        </div>
      </div>

      {/* Center Cinematic Title Section */}
      <div className="relative z-10 max-w-2xl text-center my-auto flex flex-col items-center">
        {/* Calligraphy seal */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-800 to-amber-700 flex items-center justify-center border-2 border-amber-400/60 shadow-xl shadow-red-950/60 mb-4 transform hover:scale-105 transition-transform">
          <span className="font-calligraphy text-3xl text-amber-200 font-bold">仙域</span>
        </div>

        {/* Primary Title */}
        <h1 
          id="home-main-title"
          className="font-cinzel text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-orange-500 drop-shadow-[0_4px_24px_rgba(245,158,11,0.35)]"
        >
          EMBERFALL
        </h1>

        <h2 
          id="home-subtitle"
          className="font-cinzel text-base sm:text-xl md:text-2xl font-semibold tracking-widest text-amber-300/90 mt-2"
        >
          GUARDIANS OF THE LAST REALM
        </h2>

        <p 
          id="home-narrative-quote"
          className="text-neutral-400 italic font-serif text-sm sm:text-base mt-4 max-w-lg leading-relaxed border-t border-b border-amber-500/20 py-2"
        >
          &ldquo;When the realms fall, the guardians awaken.&rdquo;
        </p>

        {/* Primary Action Button: PLAY GAME */}
        <div className="mt-8 flex flex-col items-center w-full max-w-xs">
          <button
            id="home-btn-play-game"
            onClick={handleStartPlay}
            className="w-full group relative px-8 py-4 rounded-xl font-cinzel text-lg sm:text-xl font-bold tracking-widest text-amber-950 bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-2xl shadow-orange-500/30 border-2 border-amber-200 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center space-x-3"
            aria-label="Play Game: Select realm and defend the Last Realm"
          >
            <Play className="w-6 h-6 fill-amber-950 text-amber-950 group-hover:scale-110 transition-transform" />
            <span>PLAY GAME</span>
          </button>
        </div>

        {/* Secondary Menu Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-8 w-full max-w-xl">
          <button
            id="home-btn-guardians"
            onClick={() => onNavigate('guardians')}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800/90 border border-amber-900/40 hover:border-amber-500/60 text-xs sm:text-sm font-cinzel text-neutral-200 hover:text-amber-300 transition-all"
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Guardians</span>
          </button>

          <button
            id="home-btn-realms"
            onClick={() => onNavigate('realms')}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800/90 border border-amber-900/40 hover:border-amber-500/60 text-xs sm:text-sm font-cinzel text-neutral-200 hover:text-amber-300 transition-all"
          >
            <Map className="w-4 h-4 text-emerald-400" />
            <span>Realms</span>
          </button>

          <button
            id="home-btn-cultivation"
            onClick={() => onNavigate('cultivation')}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800/90 border border-amber-900/40 hover:border-amber-500/60 text-xs sm:text-sm font-cinzel text-neutral-200 hover:text-amber-300 transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Cultivation</span>
          </button>

          <button
            id="home-btn-achievements"
            onClick={() => onNavigate('achievements')}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800/90 border border-amber-900/40 hover:border-amber-500/60 text-xs sm:text-sm font-cinzel text-neutral-200 hover:text-amber-300 transition-all"
          >
            <Award className="w-4 h-4 text-yellow-400" />
            <span>Achievements</span>
          </button>

          <button
            id="home-btn-store"
            onClick={() => onNavigate('store')}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800/90 border border-amber-900/40 hover:border-amber-500/60 text-xs sm:text-sm font-cinzel text-neutral-200 hover:text-amber-300 transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
            <span>Store</span>
          </button>

          <button
            id="home-btn-leaderboard"
            onClick={() => onNavigate('leaderboard')}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800/90 border border-amber-900/40 hover:border-amber-500/60 text-xs sm:text-sm font-cinzel text-neutral-200 hover:text-amber-300 transition-all"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Rankings</span>
          </button>

          <button
            id="home-btn-settings"
            onClick={onOpenSettings}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800/90 border border-amber-900/40 hover:border-amber-500/60 text-xs sm:text-sm font-cinzel text-neutral-200 hover:text-amber-300 transition-all"
          >
            <Settings className="w-4 h-4 text-neutral-400" />
            <span>Settings</span>
          </button>

          <button
            id="home-btn-tutorial"
            onClick={onOpenTutorial}
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800/90 border border-amber-900/40 hover:border-amber-500/60 text-xs sm:text-sm font-cinzel text-neutral-200 hover:text-amber-300 transition-all"
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>How to Play</span>
          </button>
        </div>
      </div>

      {/* Footer & Creator Credit */}
      <footer className="relative z-10 w-full text-center pt-6 pb-2 border-t border-neutral-800/40 text-xs text-neutral-500">
        <div id="game-creator-credit" className="font-cinzel tracking-wider text-amber-400/80">
          Game Creator: RURU
        </div>
        <div className="text-[11px] text-neutral-600 mt-0.5">
          Emberfall: Guardians of the Last Realm &bull; Pure Browser Cross-Platform TD
        </div>
      </footer>
    </div>
  );
};
