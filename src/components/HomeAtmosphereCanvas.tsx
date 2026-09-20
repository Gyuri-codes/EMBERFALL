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

    // Particle definitions
    interface Ember {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      wobble: number;
      wobbleSpeed: number;
      alpha: number;
      maxAlpha: number;
      decay: number;
      color: string;
    }

    interface Ash {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      alpha: number;
      rotation: number;
      rotSpeed: number;
    }

    interface PortalMote {
      angle: number;
      distance: number;
      speed: number;
      size: number;
      alpha: number;
      color: string;
    }

    const embers: Ember[] = [];
    const emberColors = ['#fbbf24', '#f59e0b', '#f97316', '#ef4444', '#ea580c'];
    const emberCount = 50;

    for (let i = 0; i < emberCount; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * 2.8,
        speedY: 0.4 + Math.random() * 1.2,
        speedX: (Math.random() - 0.5) * 0.6,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
        alpha: Math.random() * 0.8,
        maxAlpha: 0.3 + Math.random() * 0.7,
        decay: 0.002 + Math.random() * 0.005,
        color: emberColors[Math.floor(Math.random() * emberColors.length)]
      });
    }

    const ashes: Ash[] = [];
    const ashCount = 25;
    for (let i = 0; i < ashCount; i++) {
      ashes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1.5 + Math.random() * 3,
        speedY: 0.2 + Math.random() * 0.5,
        speedX: 0.2 + Math.random() * 0.4,
        alpha: 0.15 + Math.random() * 0.35,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02
      });
    }

    const portalMotes: PortalMote[] = [];
    const portalMoteCount = 35;
    for (let i = 0; i < portalMoteCount; i++) {
      portalMotes.push({
        angle: Math.random() * Math.PI * 2,
        distance: 15 + Math.random() * 120,
        speed: 0.008 + Math.random() * 0.02,
        size: 1 + Math.random() * 2.2,
        alpha: 0.3 + Math.random() * 0.7,
        color: Math.random() > 0.3 ? '#fef08a' : '#f97316'
      });
    }

    let time = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      // Smooth parallax interpolation
      const targetParallaxX = (mouseX || 0) * 16;
      const targetParallaxY = (mouseY || 0) * 12;
      currentParallaxX += (targetParallaxX - currentParallaxX) * 0.06;
      currentParallaxY += (targetParallaxY - currentParallaxY) * 0.06;

      ctx.save();
      ctx.translate(currentParallaxX * 0.3, currentParallaxY * 0.3);

      // 1. CELESTIAL EMBER PORTAL (Upper Right Sky)
      // Responsive portal position (around 80% width, 18% height on desktop, 75% width, 15% height on mobile)
      const portalX = width > 768 ? width * 0.82 : width * 0.76;
      const portalY = height * 0.16;
      const portalRadius = Math.min(width, height) * (width > 768 ? 0.18 : 0.24);

      // A. Portal Downward Light Beam
      const beamGrad = ctx.createLinearGradient(portalX, portalY, portalX + 20, height * 0.85);
      beamGrad.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
      beamGrad.addColorStop(0.3, 'rgba(245, 158, 11, 0.12)');
      beamGrad.addColorStop(0.7, 'rgba(234, 88, 12, 0.04)');
      beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(portalX - portalRadius * 0.5, portalY);
      ctx.lineTo(portalX + portalRadius * 0.5, portalY);
      ctx.lineTo(portalX + portalRadius * 1.8, height * 0.85);
      ctx.lineTo(portalX - portalRadius * 1.4, height * 0.85);
      ctx.closePath();
      ctx.fillStyle = beamGrad;
      ctx.fill();
      ctx.restore();

      // B. Ambient Portal Outer Glow
      const outerGlow = ctx.createRadialGradient(portalX, portalY, 5, portalX, portalY, portalRadius * 2.4);
      outerGlow.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
      outerGlow.addColorStop(0.2, 'rgba(249, 115, 22, 0.28)');
      outerGlow.addColorStop(0.5, 'rgba(220, 38, 38, 0.12)');
      outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(portalX, portalY, portalRadius * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // C. Rotating Concentric Accretion Disc Rings
      ctx.save();
      ctx.translate(portalX, portalY);
      ctx.rotate(-0.35); // Perspective tilt matching reference image
      ctx.scale(1, 0.36); // Elliptical perspective

      const ringCount = 7;
      for (let r = 0; r < ringCount; r++) {
        const radius = (portalRadius * (0.3 + (r / ringCount) * 1.2));
        const rotOffset = time * (0.4 - r * 0.04) * (r % 2 === 0 ? 1 : -0.7);

        ctx.beginPath();
        ctx.arc(0, 0, radius, rotOffset, rotOffset + Math.PI * 1.4);
        ctx.lineWidth = 2 + (r % 3);
        ctx.strokeStyle = r % 2 === 0 
          ? `rgba(251, 191, 36, ${0.45 - r * 0.05})` 
          : `rgba(249, 115, 22, ${0.4 - r * 0.05})`;
        ctx.stroke();

        // Secondary counter-arc
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.95, rotOffset + Math.PI, rotOffset + Math.PI * 2.2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(254, 240, 138, ${0.35 - r * 0.04})`;
        ctx.stroke();
      }

      // D. Incandescent Portal Core
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, portalRadius * 0.35);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      coreGrad.addColorStop(0.3, 'rgba(254, 240, 138, 0.85)');
      coreGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.6)');
      coreGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, portalRadius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // Restore portal rotation

      // E. Orbiting Portal Sparkles/Motes
      portalMotes.forEach(pm => {
        pm.angle += pm.speed;
        const currentDist = pm.distance;
        // Elliptical orbit around portal
        const px = portalX + Math.cos(pm.angle) * currentDist;
        const py = portalY + Math.sin(pm.angle) * (currentDist * 0.4);

        ctx.save();
        ctx.globalAlpha = pm.alpha * (0.6 + Math.sin(time * 3 + pm.angle) * 0.4);
        ctx.fillStyle = pm.color;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px, py, pm.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 2. LOWER LAVA RIVER GLOW (Bottom Valleys)
      const lavaPulse = 0.22 + Math.sin(time * 1.5) * 0.06;
      const lavaGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.95,
        10,
        width * 0.5,
        height * 0.95,
        width * 0.65
      );
      lavaGrad.addColorStop(0, `rgba(249, 115, 22, ${lavaPulse})`);
      lavaGrad.addColorStop(0.4, `rgba(220, 38, 38, ${lavaPulse * 0.6})`);
      lavaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lavaGrad;
      ctx.fillRect(0, height * 0.6, width, height * 0.4);

      // Subtle lateral lava veins
      const leftLava = ctx.createRadialGradient(width * 0.15, height * 0.85, 5, width * 0.15, height * 0.85, width * 0.25);
      leftLava.addColorStop(0, `rgba(234, 88, 12, ${lavaPulse * 0.8})`);
      leftLava.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = leftLava;
      ctx.fillRect(0, height * 0.7, width * 0.4, height * 0.3);

      const rightLava = ctx.createRadialGradient(width * 0.85, height * 0.78, 5, width * 0.85, height * 0.78, width * 0.3);
      rightLava.addColorStop(0, `rgba(249, 115, 22, ${lavaPulse * 0.9})`);
      rightLava.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rightLava;
      ctx.fillRect(width * 0.6, height * 0.65, width * 0.4, height * 0.35);

      ctx.restore(); // Restore base parallax

      // 3. DRIFTING ASH FLAKES (Foreground / Midground)
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
        ctx.fillStyle = '#404040';
        ctx.fillRect(-a.size / 2, -a.size / 2, a.size, a.size * 0.6);
        ctx.restore();
      });

      // 4. RISING GLOWING EMBERS
      embers.forEach(e => {
        e.y -= e.speedY;
        e.wobble += e.wobbleSpeed;
        e.x += e.speedX + Math.sin(e.wobble) * 0.35;
        e.alpha -= e.decay;

        if (e.y < -10 || e.alpha <= 0) {
          e.y = height + 10;
          e.x = Math.random() * width;
          e.alpha = e.maxAlpha;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, e.alpha);
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();

        // Subtle soft halo for larger embers
        if (e.size > 2) {
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.size * 2.2, 0, Math.PI * 2);
          ctx.globalAlpha = Math.max(0, e.alpha * 0.25);
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
  }, [mouseX, mouseY]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};
