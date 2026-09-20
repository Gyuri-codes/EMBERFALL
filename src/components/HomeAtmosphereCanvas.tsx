import React, { useEffect, useRef } from 'react';

interface HomeAtmosphereCanvasProps {
  mouseX: number;
  mouseY: number;
  className?: string;
}

export const HomeAtmosphereCanvas: React.FC<HomeAtmosphereCanvasProps> = ({
  mouseX,
  mouseY,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = Math.max(canvas.offsetWidth || window.innerWidth, 320));
    let height = (canvas.height = Math.max(canvas.offsetHeight || window.innerHeight, 480));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = Math.max(canvas.offsetWidth || window.innerWidth, 320);
      height = canvas.height = Math.max(canvas.offsetHeight || window.innerHeight, 480);
    };
    window.addEventListener('resize', handleResize);

    // Subtle, calm environmental embers (No flickering, no glittering, no sparkles)
    interface SoftEmber {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      alpha: number;
      color: string;
    }

    interface DriftAsh {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      alpha: number;
      rotation: number;
      rotSpeed: number;
    }

    // Retain only 12 gentle, non-flickering, non-sparkling ambient embers
    const embers: SoftEmber[] = [];
    const emberColors = ['#d97706', '#ea580c', '#c2410c', '#b45309'];
    const emberCount = 14;

    for (let i = 0; i < emberCount; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1.2 + Math.random() * 1.5,
        speedY: 0.25 + Math.random() * 0.45,
        speedX: (Math.random() - 0.5) * 0.3,
        alpha: 0.15 + Math.random() * 0.2, // Low, constant, eye-safe opacity
        color: emberColors[Math.floor(Math.random() * emberColors.length)]
      });
    }

    // Faint drifting ash flakes
    const ashes: DriftAsh[] = [];
    const ashCount = 18;
    for (let i = 0; i < ashCount; i++) {
      ashes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1.5 + Math.random() * 2.5,
        speedY: 0.18 + Math.random() * 0.35,
        speedX: 0.1 + Math.random() * 0.25,
        alpha: 0.12 + Math.random() * 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.015
      });
    }

    let time = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;

    const render = () => {
      time += 0.012; // Slow, majestic pacing
      ctx.clearRect(0, 0, width, height);

      // Smooth parallax interpolation
      const targetParallaxX = (mouseX || 0) * 12;
      const targetParallaxY = (mouseY || 0) * 8;
      currentParallaxX += (targetParallaxX - currentParallaxX) * 0.05;
      currentParallaxY += (targetParallaxY - currentParallaxY) * 0.05;

      ctx.save();
      ctx.translate(currentParallaxX * 0.25, currentParallaxY * 0.25);

      // 1. CELESTIAL EMBER PORTAL (Upper Right Sky - Clean, Atmospheric, NO SPARKLES)
      const portalX = width > 768 ? width * 0.82 : width * 0.76;
      const portalY = height * 0.16;
      const portalRadius = Math.min(width, height) * (width > 768 ? 0.18 : 0.24);

      // A. Portal Downward Pillar of Light
      const beamGrad = ctx.createLinearGradient(portalX, portalY, portalX + 20, height * 0.85);
      beamGrad.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
      beamGrad.addColorStop(0.3, 'rgba(234, 88, 12, 0.09)');
      beamGrad.addColorStop(0.7, 'rgba(180, 83, 9, 0.03)');
      beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(portalX - portalRadius * 0.45, portalY);
      ctx.lineTo(portalX + portalRadius * 0.45, portalY);
      ctx.lineTo(portalX + portalRadius * 1.6, height * 0.85);
      ctx.lineTo(portalX - portalRadius * 1.2, height * 0.85);
      ctx.closePath();
      ctx.fillStyle = beamGrad;
      ctx.fill();
      ctx.restore();

      // B. Ambient Portal Outer Glow (Soft, constant, non-flickering)
      const outerGlow = ctx.createRadialGradient(portalX, portalY, 5, portalX, portalY, portalRadius * 2.2);
      outerGlow.addColorStop(0, 'rgba(245, 158, 11, 0.32)');
      outerGlow.addColorStop(0.25, 'rgba(234, 88, 12, 0.18)');
      outerGlow.addColorStop(0.55, 'rgba(153, 27, 27, 0.08)');
      outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(portalX, portalY, portalRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // C. Rotating Concentric Accretion Disc Rings (Smooth, calm motion)
      ctx.save();
      ctx.translate(portalX, portalY);
      ctx.rotate(-0.35);
      ctx.scale(1, 0.36);

      const ringCount = 6;
      for (let r = 0; r < ringCount; r++) {
        const radius = portalRadius * (0.35 + (r / ringCount) * 1.15);
        const rotOffset = time * (0.25 - r * 0.025) * (r % 2 === 0 ? 1 : -0.6);

        ctx.beginPath();
        ctx.arc(0, 0, radius, rotOffset, rotOffset + Math.PI * 1.35);
        ctx.lineWidth = 1.8 + (r % 2);
        ctx.strokeStyle = r % 2 === 0 
          ? `rgba(245, 158, 11, ${0.32 - r * 0.04})` 
          : `rgba(234, 88, 12, ${0.28 - r * 0.04})`;
        ctx.stroke();
      }

      // D. Incandescent Portal Core
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, portalRadius * 0.32);
      coreGrad.addColorStop(0, 'rgba(255, 247, 237, 0.85)');
      coreGrad.addColorStop(0.35, 'rgba(251, 191, 36, 0.65)');
      coreGrad.addColorStop(0.7, 'rgba(234, 88, 12, 0.35)');
      coreGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, portalRadius * 0.32, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 2. LOWER LAVA & CANYON GLOW (Slow, restrained atmospheric breathing)
      const lavaPulse = 0.18 + Math.sin(time * 0.8) * 0.03;
      const lavaGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.96,
        10,
        width * 0.5,
        height * 0.96,
        width * 0.65
      );
      lavaGrad.addColorStop(0, `rgba(234, 88, 12, ${lavaPulse})`);
      lavaGrad.addColorStop(0.4, `rgba(153, 27, 27, ${lavaPulse * 0.5})`);
      lavaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lavaGrad;
      ctx.fillRect(0, height * 0.65, width, height * 0.35);

      // 3. FAINT DRIFTING MIST (Horizontal gentle haze)
      const mistOffset = (time * 12) % width;
      const mistGrad = ctx.createLinearGradient(0, height * 0.72, 0, height * 0.88);
      mistGrad.addColorStop(0, 'rgba(0,0,0,0)');
      mistGrad.addColorStop(0.5, 'rgba(26, 12, 8, 0.12)');
      mistGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, height * 0.72, width, height * 0.16);

      ctx.restore();

      // 4. DRIFTING ASH FLAKES (Dark, quiet flakes drifting slowly)
      ashes.forEach(a => {
        a.y += a.speedY;
        a.x += a.speedX;
        a.rotation += a.rotSpeed;

        if (a.y > height + 10 || a.x > width + 10) {
          a.y = -10;
          a.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rotation);
        ctx.globalAlpha = a.alpha;
        ctx.fillStyle = '#302624';
        ctx.fillRect(-a.size / 2, -a.size / 2, a.size, a.size * 0.55);
        ctx.restore();
      });

      // 5. CALM, STEADY RISING EMBERS (Subtle, non-flickering, no sparkles)
      embers.forEach(e => {
        e.y -= e.speedY;
        e.x += e.speedX;

        if (e.y < -10) {
          e.y = height + 10;
          e.x = Math.random() * width;
        }

        ctx.save();
        ctx.globalAlpha = e.alpha;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [mouseX, mouseY]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};
