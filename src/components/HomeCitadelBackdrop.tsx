import React from 'react';

interface HomeCitadelBackdropProps {
  parallaxX: number;
  parallaxY: number;
}

export const HomeCitadelBackdrop: React.FC<HomeCitadelBackdropProps> = ({
  parallaxX,
  parallaxY
}) => {
  return (
    <div 
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Deepest Base Layer: Atmospheric Volcanic Sky & Distant Mountain Ranges */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out will-change-transform scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1509565840034-3c385fa646d3?auto=format&fit=crop&w=2000&q=85')`,
          transform: `translate3d(${parallaxX * 8}px, ${parallaxY * 6}px, 0) scale(1.05)`,
          filter: 'brightness(0.55) contrast(1.25) saturate(1.2)'
        }}
      />

      {/* Volcanic Dark Crimson & Smoky Charcoal Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/80 via-transparent to-neutral-950/95" />
      <div className="absolute inset-0 bg-radial-[circle_at_78%_20%] from-amber-500/15 via-orange-950/20 to-transparent" />
      <div className="absolute inset-0 bg-radial-[circle_at_50%_90%] from-orange-600/25 via-red-950/30 to-transparent" />

      {/* Midground Layer: Silhouetted Gothic Castle Spires, Floating Islands & Guardian Cliff */}
      <svg
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out will-change-transform scale-105"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{
          transform: `translate3d(${parallaxX * 14}px, ${parallaxY * 10}px, 0)`
        }}
      >
        <defs>
          <linearGradient id="spireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a0a05" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#0f0705" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#050202" stopOpacity="0.98" />
          </linearGradient>

          <linearGradient id="cliffGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1c0b06" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#0c0402" stopOpacity="0.97" />
            <stop offset="100%" stopColor="#020101" stopOpacity="1" />
          </linearGradient>

          <linearGradient id="lavaVein" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.9" />
            <stop offset="25%" stopColor="#fbbf24" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#f97316" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.4" />
          </linearGradient>

          <filter id="lavaGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>

          <filter id="distantHaze" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* 1. Distant Floating Crags in the Sky */}
        <g filter="url(#distantHaze)" opacity="0.75">
          {/* Upper Left Levitating Island */}
          <polygon points="120,180 200,160 250,195 230,260 180,310 140,270 100,220" fill="#140805" />
          {/* Small spires on island */}
          <polygon points="150,165 155,120 162,165" fill="#1c0a06" />
          <polygon points="180,160 186,105 192,160" fill="#140805" />

          {/* Far Upper Right Floating Crag (near portal) */}
          <polygon points="1220,240 1280,220 1340,250 1310,320 1260,360 1210,310" fill="#1c0905" />
          <polygon points="1270,225 1275,170 1282,225" fill="#240c06" />

          {/* Mid-level floating shards */}
          <polygon points="320,320 370,305 400,335 380,380 340,410 310,365" fill="#120603" />
          <polygon points="1050,380 1100,365 1130,395 1110,440 1070,470 1040,425" fill="#160804" />
        </g>

        {/* 2. Soaring Central Gothic Citadel & Towers (Center-Right Background) */}
        <g opacity="0.9">
          {/* Central Main Spire (piercing high into clouds) */}
          <polygon points="705,420 720,140 735,420" fill="url(#spireGrad)" />
          <polygon points="717,140 720,80 723,140" fill="#240c05" />
          
          {/* Spire buttresses and ornate gothic tiers */}
          <polygon points="680,440 700,260 710,440" fill="url(#spireGrad)" />
          <polygon points="730,440 740,260 760,440" fill="url(#spireGrad)" />
          <polygon points="660,520 685,340 705,520" fill="url(#spireGrad)" />
          <polygon points="735,520 755,340 780,520" fill="url(#spireGrad)" />

          {/* Citadel battlements and body */}
          <polygon points="610,650 630,480 660,480 680,450 760,450 780,480 810,480 830,650" fill="url(#spireGrad)" />
          {/* Windows with faint burning embers inside */}
          <rect x="715" y="280" width="10" height="24" rx="5" fill="#f59e0b" opacity="0.3" filter="url(#lavaGlow)" />
          <rect x="716" y="340" width="8" height="20" rx="4" fill="#f97316" opacity="0.3" filter="url(#lavaGlow)" />
          <rect x="690" y="470" width="8" height="18" rx="4" fill="#fbbf24" opacity="0.25" filter="url(#lavaGlow)" />
          <rect x="742" y="470" width="8" height="18" rx="4" fill="#fbbf24" opacity="0.25" filter="url(#lavaGlow)" />
        </g>

        {/* 3. Midground Promontory Cliff on Left with Hooded Guardian Figure & Banner */}
        <g opacity="0.96">
          {/* Jagged Promontory Cliff Base */}
          <polygon points="0,480 180,440 240,490 280,580 250,720 0,780" fill="url(#cliffGrad)" />
          <polygon points="120,440 180,390 210,410 180,440" fill="#140603" />

          {/* Stone Alter / Archway Structure */}
          <polygon points="150,390 170,330 190,330 200,390" fill="#1a0a05" />

          {/* Hooded Guardian Warrior Silhouette on the edge */}
          {/* Body/Robes */}
          <path d="M 180,330 Q 185,290 182,250 Q 188,235 192,250 Q 196,290 202,330 Z" fill="#080302" />
          {/* Hood/Head */}
          <circle cx="188" cy="235" r="9" fill="#0c0403" />
          {/* Cape/Cloth flutter */}
          <path d="M 182,260 Q 170,275 168,310 Q 175,295 182,280 Z" fill="#160603" />
          {/* Guardian's Staff / Weapon standing tall */}
          <line x1="195" y1="220" x2="197" y2="335" stroke="#220c06" strokeWidth="2.5" />
          {/* Staff glowing crystal tip */}
          <circle cx="195" cy="218" r="3.5" fill="#f59e0b" opacity="0.8" filter="url(#lavaGlow)" />

          {/* Ancient Battle Banner fluttering from cliff stake */}
          <line x1="125" y1="440" x2="125" y2="360" stroke="#200a04" strokeWidth="3" />
          {/* Crimson Banner Flag */}
          <path d="M 125,365 Q 105,375 90,395 Q 110,410 125,415 Z" fill="#7f1d1d" opacity="0.85" />
          <line x1="125" y1="365" x2="90" y2="395" stroke="#b91c1c" strokeWidth="1" />
        </g>

        {/* 4. Foreground Volcanic Terrain, Chasm Ridges & Magma Rivers */}
        <g>
          {/* Left Basalt Fore-ridge */}
          <polygon points="0,700 160,660 310,750 360,840 280,900 0,900" fill="#0c0402" />
          {/* Right Basalt Fore-ridge */}
          <polygon points="1440,680 1280,640 1140,730 1090,830 1180,900 1440,900" fill="#0e0503" />

          {/* Deep Valley Base */}
          <polygon points="260,880 720,780 1160,880 1440,900 0,900" fill="#070201" />

          {/* Molten Lava Rivers through the Rocky Ravines */}
          <path 
            d="M 540,900 Q 640,820 680,780 Q 720,740 760,710 Q 820,760 920,830 Q 1020,870 1080,900" 
            fill="none" 
            stroke="url(#lavaVein)" 
            strokeWidth="18" 
            strokeLinecap="round"
            filter="url(#lavaGlow)"
            opacity="0.88" 
          />

          {/* Core White-Hot Magma Centerline */}
          <path 
            d="M 540,900 Q 640,820 680,780 Q 720,740 760,710 Q 820,760 920,830 Q 1020,870 1080,900" 
            fill="none" 
            stroke="#fff7ed" 
            strokeWidth="5" 
            strokeLinecap="round"
            opacity="0.9" 
          />

          {/* Secondary Tributary Magma Crack */}
          <path 
            d="M 320,900 Q 400,840 450,810 Q 520,830 650,800" 
            fill="none" 
            stroke="url(#lavaVein)" 
            strokeWidth="8" 
            filter="url(#lavaGlow)"
            opacity="0.75" 
          />

          {/* Right Tributary Magma Crack */}
          <path 
            d="M 1240,900 Q 1150,850 1060,820 Q 980,820 880,800" 
            fill="none" 
            stroke="url(#lavaVein)" 
            strokeWidth="8" 
            filter="url(#lavaGlow)"
            opacity="0.75" 
          />

          {/* Additional Battle Stakes/Banners in the Rocky Foreground */}
          <line x1="80" y1="840" x2="80" y2="760" stroke="#1c0904" strokeWidth="2.5" />
          <path d="M 80,765 Q 60,775 45,795 Q 65,808 80,812 Z" fill="#991b1b" opacity="0.8" />

          <line x1="1360" y1="830" x2="1360" y2="750" stroke="#1c0904" strokeWidth="2.5" />
          <path d="M 1360,755 Q 1380,765 1395,785 Q 1375,798 1360,802 Z" fill="#7f1d1d" opacity="0.8" />
        </g>
      </svg>

      {/* Cinematic Edge & Center Vignettes for Maximum Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-neutral-950/80" />
      <div className="absolute inset-0 bg-radial-[circle_at_50%_48%] from-neutral-950/75 via-neutral-950/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-neutral-950 via-neutral-950/80 to-transparent" />
    </div>
  );
};
