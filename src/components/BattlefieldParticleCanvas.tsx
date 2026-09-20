import React, { useEffect, useRef } from 'react';

interface BattlefieldParticleCanvasProps {
  type: 'fire_embers' | 'bamboo_mist' | 'ice_crystals' | 'storm_sparks' | 'jade_water' | 'void_motes' | 'golden_sand' | 'astral_stardust' | 'poison_spores';
  className?: string;
}

export const BattlefieldParticleCanvas: React.FC<BattlefieldParticleCanvasProps> = ({
  type,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = Math.max(canvas.offsetWidth || window.innerWidth || 800, 300));
    let height = (canvas.height = Math.max(canvas.offsetHeight || 300, 150));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = Math.max(canvas.offsetWidth || window.innerWidth || 800, 300);
      height = canvas.height = Math.max(canvas.offsetHeight || 300, 150);
    };
    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      alpha: number;
      maxAlpha: number;
      decay: number;
      color: string;
      wobble?: number;
      wobbleSpeed?: number;
    }

    const particles: Particle[] = [];
    const count = 35; // optimal balance of atmosphere and 60fps performance

    const getColorsForType = () => {
      switch (type) {
        case 'fire_embers':
          return ['#f97316', '#ef4444', '#fbbf24', '#ea580c', '#eab308'];
        case 'bamboo_mist':
          return ['#10b981', '#34d399', '#6ee7b7', '#059669', '#a7f3d0'];
        case 'ice_crystals':
          return ['#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe', '#ffffff'];
        case 'storm_sparks':
          return ['#c084fc', '#a855f7', '#e879f9', '#38bdf8', '#ffffff'];
        case 'jade_water':
          return ['#2dd4bf', '#14b8a6', '#5eead4', '#0d9488', '#99f6e4'];
        case 'void_motes':
          return ['#f43f5e', '#e11d48', '#fb7185', '#9333ea', '#c084fc'];
        case 'golden_sand':
          return ['#f59e0b', '#fbbf24', '#d97706', '#fde68a', '#b45309'];
        case 'astral_stardust':
          return ['#818cf8', '#a78bfa', '#c084fc', '#38bdf8', '#ffffff'];
        default:
          return ['#fbbf24', '#f59e0b'];
      }
    };

    const colors = getColorsForType();

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: type === 'ice_crystals' ? 1.5 + Math.random() * 2.5 : 1 + Math.random() * 3,
        speedX: (Math.random() - 0.5) * (type === 'storm_sparks' ? 2 : 0.8),
        speedY: type === 'ice_crystals' ? 0.6 + Math.random() * 1.2 : -0.4 - Math.random() * 1.2,
        alpha: Math.random() * 0.8,
        maxAlpha: 0.3 + Math.random() * 0.6,
        decay: 0.003 + Math.random() * 0.006,
        color: colors[Math.floor(Math.random() * colors.length)],
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Light directional haze
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.wobble !== undefined && p.wobbleSpeed !== undefined) {
          p.wobble += p.wobbleSpeed;
          p.x += Math.sin(p.wobble) * 0.3;
        }

        p.alpha -= p.decay;

        // Reset particle when out of bounds
        if (p.y < -10 || p.y > height + 10 || p.x < -10 || p.x > width + 10 || p.alpha <= 0) {
          p.x = Math.random() * width;
          p.y = type === 'ice_crystals' ? -5 : height + 5;
          p.alpha = p.maxAlpha;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow aura for magical particles
        if (p.size > 2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha * 0.25);
          ctx.fill();
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [type]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};
