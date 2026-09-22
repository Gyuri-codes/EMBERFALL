import React from 'react';

interface ShadowTowerGuardianProps {
  parallaxX: number;
  parallaxY: number;
}

export const ShadowTowerGuardian: React.FC<ShadowTowerGuardianProps> = ({
  parallaxX,
  parallaxY
}) => {
  return (
    <div 
      className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden select-none z-15"
      aria-hidden="true"
    >
      <div 
        className="relative w-[500px] sm:w-[650px] md:w-[820px] lg:w-[960px] h-[650px] sm:h-[800px] md:h-[950px] lg:h-[1050px] -mt-10 sm:-mt-16 md:-mt-24 transition-transform duration-700 ease-out will-change-transform opacity-95 filter contrast-[1.08] brightness-[0.96] drop-shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
        style={{
          transform: `translate3d(${parallaxX * 10}px, ${parallaxY * 6}px, 0)`
        }}
      >
        <svg
          className="w-full h-full object-contain filter drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)]"
          viewBox="0 0 900 1100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Guardian Body Gradients */}
            <linearGradient id="guardianDarkBody" x1="450" y1="100" x2="450" y2="1000" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1a0f0d" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#100706" stopOpacity="0.98" />
              <stop offset="70%" stopColor="#080302" stopOpacity="0.99" />
              <stop offset="100%" stopColor="#020101" stopOpacity="0.85" />
            </linearGradient>

            <linearGradient id="obsidianPlates" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22110c" />
              <stop offset="50%" stopColor="#120806" />
              <stop offset="100%" stopColor="#070302" />
            </linearGradient>

            {/* ELEMENT 1: FIRE (Molten magma fissures & flame energy) */}
            <linearGradient id="fireMagmaGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#ea580c" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="fireSmokeAura" x1="200" y1="350" x2="100" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#991b1b" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </linearGradient>

            {/* ELEMENT 2: ICE (Crystalline frost structures & icy armor) */}
            <linearGradient id="iceCrystalGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#7dd3fc" stopOpacity="0.75" />
              <stop offset="75%" stopColor="#0284c7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.2" />
            </linearGradient>

            <linearGradient id="iceFrostAura" x1="700" y1="350" x2="800" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#0369a1" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </linearGradient>

            {/* ELEMENT 3: LIGHTNING (Thin electric arcs) */}
            <linearGradient id="lightningArc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#c084fc" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#818cf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>

            {/* ELEMENT 4: EARTH (Ancient carved rock & stone fortress armor) */}
            <linearGradient id="earthRuneStone" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#382618" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#1e130a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0a0603" stopOpacity="1" />
            </linearGradient>

            {/* ELEMENT 5: WIND (Flowing translucent spiritual ribbons) */}
            <linearGradient id="windRibbon1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity="0.02" />
            </linearGradient>

            <linearGradient id="windRibbon2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </linearGradient>

            {/* ELEMENT 6: ARCANE / SPIRIT CORE */}
            <radialGradient id="arcaneCoreGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.75" />
              <stop offset="55%" stopColor="#06b6d4" stopOpacity="0.45" />
              <stop offset="85%" stopColor="#6366f1" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            {/* Restrained Eye Glow */}
            <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
              <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.85" />
              <stop offset="75%" stopColor="#d97706" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            {/* Soft Controlled Rim Lighting */}
            <filter id="softRimGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="restrainedCoreGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ========================================================== */}
          {/* LAYER 0: REAR SMOKE SILHOUETTE & AURA ENVELOPE             */}
          {/* ========================================================== */}
          {/* Ethereal dark smoke halo behind the colossus */}
          <path
            d="M 450 70 C 310 110, 160 220, 140 400 C 120 580, 200 780, 220 950 L 680 950 C 700 780, 780 580, 760 400 C 740 220, 590 110, 450 70 Z"
            fill="black"
            fillOpacity="0.55"
            filter="url(#softRimGlow)"
          />

          {/* Elemental Aura Zones (Fire on Right Arm/Shoulder, Ice on Left Arm/Shoulder) */}
          {/* Note: Viewer perspective: Left side is Fire (x: 100-350), Right side is Ice (x: 550-800) */}
          <circle cx="230" cy="340" r="160" fill="url(#fireSmokeAura)" />
          <circle cx="670" cy="340" r="160" fill="url(#iceFrostAura)" />

          {/* ========================================================== */}
          {/* LAYER 1: WIND - Translucent Spiritual Energy Ribbons (Rear) */}
          {/* ========================================================== */}
          <g opacity="0.85">
            {/* Flowing Heavenly Scarf (Tianyi) Ribbon Left -> Behind Head -> Right */}
            <path
              d="M 120 540 Q 160 360, 260 280 Q 370 190, 450 170 Q 530 190, 640 280 Q 740 360, 780 540 Q 750 420, 630 320 Q 520 230, 450 210 Q 380 230, 270 320 Q 150 420, 120 540 Z"
              fill="url(#windRibbon1)"
            />
            {/* Secondary Undulating Wind Streamers */}
            <path
              d="M 190 620 C 130 500, 180 380, 280 340 C 230 420, 200 520, 230 620 Z"
              fill="url(#windRibbon2)"
            />
            <path
              d="M 710 620 C 770 500, 720 380, 620 340 C 670 420, 700 520, 670 620 Z"
              fill="url(#windRibbon2)"
            />
          </g>

          {/* ========================================================== */}
          {/* LAYER 2: FOUNDATION - Monolithic Tower Base & Battlements   */}
          {/* ========================================================== */}
          {/* Bottom massive fortress tower base anchoring the guardian */}
          <g>
            {/* Lower Fortress Pedestal & Ramparts */}
            <polygon 
              points="200,1050 240,820 320,740 580,740 660,820 700,1050" 
              fill="url(#earthRuneStone)" 
            />
            {/* Ancient Tower Fortress crenellations / battlements */}
            <polygon points="260,820 280,820 280,790 310,790 310,820 340,820 340,790 370,790 370,820 400,820 400,790 430,790 430,820 470,820 470,790 500,790 500,820 530,820 530,790 560,790 560,820 590,820 590,790 620,790 620,820 640,820 630,850 270,850" fill="#150b08" />
            
            {/* Deep foundation fissure cracks with subdued ember heat */}
            <path 
              d="M 450,1050 L 440,940 L 460,880 L 430,820" 
              stroke="url(#fireMagmaGlow)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              opacity="0.65" 
            />
            <path 
              d="M 330,1050 L 350,960 L 320,910" 
              stroke="#ea580c" 
              strokeWidth="1.5" 
              opacity="0.45" 
            />
            <path 
              d="M 570,1050 L 550,970 L 580,920" 
              stroke="#0284c7" 
              strokeWidth="1.5" 
              opacity="0.45" 
            />
          </g>

          {/* ========================================================== */}
          {/* LAYER 3: MAIN SILHOUETTE - Colossal Humanoid Tower Torso   */}
          {/* ========================================================== */}
          {/* Main Body Hull: Broad shoulders, massive chest, tapering waist */}
          <path
            d="M 450 140 
               C 420 140, 390 160, 360 190 
               C 300 240, 240 280, 190 360 
               C 170 400, 165 470, 180 540 
               C 195 610, 230 670, 270 730 
               C 310 780, 370 820, 450 830 
               C 530 820, 590 780, 630 730 
               C 670 670, 705 610, 720 540 
               C 735 470, 730 400, 710 360 
               C 660 280, 600 240, 540 190 
               C 510 160, 480 140, 450 140 Z"
            fill="url(#guardianDarkBody)"
            stroke="#1b0c08"
            strokeWidth="2"
          />

          {/* Subtle Outer Rim Highlights: Amber on Left, Ice-Cyan on Right */}
          {/* Left Rim (Fire side) */}
          <path
            d="M 450 140 C 390 160, 360 190, 300 240 C 240 280, 190 360, 180 440"
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeOpacity="0.45"
            fill="none"
          />
          {/* Right Rim (Ice side) */}
          <path
            d="M 450 140 C 510 160, 540 190, 600 240 C 660 280, 710 360, 720 440"
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeOpacity="0.45"
            fill="none"
          />

          {/* ========================================================== */}
          {/* LAYER 4: ELEMENT 4 - EARTH Rock Armor Plates               */}
          {/* ========================================================== */}
          {/* Layered monolithic basalt & carved stone chest plates */}
          <g>
            {/* Upper Chest Monolith Prow */}
            <polygon points="450,260 380,330 410,430 450,470 490,430 520,330" fill="url(#obsidianPlates)" stroke="#2b150c" strokeWidth="1.5" />
            
            {/* Flanking Rib Rock Plates */}
            <polygon points="360,350 310,410 330,500 390,460 380,380" fill="url(#obsidianPlates)" stroke="#220e07" strokeWidth="1.5" />
            <polygon points="540,350 590,410 570,500 510,460 520,380" fill="url(#obsidianPlates)" stroke="#220e07" strokeWidth="1.5" />

            {/* Lower Abdominal Monolith Tiers (Pagoda tower gate geometry) */}
            <polygon points="410,590 450,550 490,590 470,680 450,710 430,680" fill="#0d0604" stroke="#26120a" strokeWidth="1.5" />
            <polygon points="360,540 400,530 410,640 370,660 340,590" fill="#0b0503" stroke="#220e07" strokeWidth="1" />
            <polygon points="540,540 500,530 490,640 530,660 560,590" fill="#0b0503" stroke="#220e07" strokeWidth="1" />
          </g>

          {/* ========================================================== */}
          {/* LAYER 5: ELEMENT 1 - FIRE (Right Pauldron, Arm & Fissures) */}
          {/* ========================================================== */}
          <g>
            {/* Massive Volcanic Pauldron (Left side in view) */}
            <path
              d="M 330 240 L 220 230 L 160 280 L 140 370 L 210 420 L 290 380 L 340 320 Z"
              fill="url(#obsidianPlates)"
              stroke="#381308"
              strokeWidth="2"
            />
            {/* Horned Volcanic Ridge on Pauldron */}
            <polygon points="210,230 180,160 240,210" fill="#1f0a05" stroke="#7c2d12" strokeWidth="1" />
            <polygon points="160,280 110,230 170,270" fill="#170704" stroke="#7c2d12" strokeWidth="1" />

            {/* Molten Magma Cracks flowing across the right shoulder and arm */}
            <path
              d="M 230,230 Q 200,290 220,340 Q 200,380 180,450 Q 190,520 170,580"
              stroke="url(#fireMagmaGlow)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              filter="url(#softRimGlow)"
            />
            {/* Branching Magma Tributaries */}
            <path
              d="M 220,340 Q 260,360 280,390"
              stroke="url(#fireMagmaGlow)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
            <path
              d="M 200,290 Q 160,310 150,350"
              stroke="#f97316"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
            <path
              d="M 180,450 Q 150,470 140,510"
              stroke="#ea580c"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.75"
            />

            {/* Flame-shaped crest energy rising from shoulder (restrained, dark fantasy) */}
            <path
              d="M 180 160 Q 165 110, 195 80 Q 190 120, 210 140 Z"
              fill="url(#fireMagmaGlow)"
              opacity="0.55"
              filter="url(#softRimGlow)"
            />
          </g>

          {/* ========================================================== */}
          {/* LAYER 6: ELEMENT 2 - ICE (Left Pauldron & Crystalline Shards)*/}
          {/* ========================================================== */}
          <g>
            {/* Jagged Crystalline Glacier Pauldron (Right side in view) */}
            <path
              d="M 570 240 L 680 230 L 740 280 L 760 370 L 690 420 L 610 380 L 560 320 Z"
              fill="url(#obsidianPlates)"
              stroke="#075985"
              strokeWidth="2"
            />
            {/* Sharp Ice Horns & Spikes on Pauldron */}
            <polygon points="690,230 720,150 660,210" fill="url(#iceCrystalGlow)" stroke="#bae6fd" strokeWidth="1" opacity="0.85" />
            <polygon points="740,280 790,220 730,270" fill="url(#iceCrystalGlow)" stroke="#7dd3fc" strokeWidth="1" opacity="0.8" />
            <polygon points="710,260 760,180 690,240" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" opacity="0.9" />

            {/* Crystalline Frost Armor Plates Tracing Down Left Arm */}
            <polygon points="690,380 730,420 710,480 670,450" fill="url(#iceCrystalGlow)" stroke="#e0f2fe" strokeWidth="1" opacity="0.7" />
            <polygon points="680,470 720,520 690,580 660,540" fill="#082f49" stroke="#38bdf8" strokeWidth="1" opacity="0.85" />
          </g>

          {/* ========================================================== */}
          {/* LAYER 7: ELEMENT 3 - LIGHTNING (Thin Electric Arcs)        */}
          {/* ========================================================== */}
          <g opacity="0.8">
            {/* Jagged electric discharge along left forearm & ice crest */}
            <path
              d="M 720,160 L 705,210 L 730,240 L 710,300 L 740,350 L 715,410 L 735,470 L 695,530 L 710,580"
              stroke="url(#lightningArc)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              filter="url(#softRimGlow)"
            />
            {/* Small Forked Lightning Spark */}
            <path
              d="M 710,300 L 675,320 L 685,340 L 660,360"
              stroke="#c084fc"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.85"
            />
            <path
              d="M 715,410 L 750,430 L 740,445"
              stroke="#38bdf8"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.75"
            />
          </g>

          {/* ========================================================== */}
          {/* LAYER 8: HEAD & HELM - Ancient Pagoda Spire & Tower Sentinel*/}
          {/* ========================================================== */}
          <g>
            {/* Neck / Throat Foundation */}
            <polygon points="420,240 480,240 470,280 430,280" fill="#080302" />

            {/* Imposing Helm / Head Silhouette */}
            <path
              d="M 450 70 
                 L 465 140 L 485 160 L 475 220 L 460 250 L 450 260 L 440 250 L 425 220 L 415 160 L 435 140 Z"
              fill="#120705"
              stroke="#2e140b"
              strokeWidth="2"
            />

            {/* Tower Spire Crown (Pagoda-style central blade crest) */}
            <polygon points="450,20 458,110 442,110" fill="#0a0403" stroke="#b45309" strokeWidth="1.5" />
            {/* Flanking Spire Tier Roofs */}
            <path d="M 430 110 Q 450 120 470 110 L 465 130 Q 450 135 435 130 Z" fill="#240c06" stroke="#f59e0b" strokeWidth="0.8" opacity="0.8" />
            <path d="M 420 140 Q 450 150 480 140 L 475 160 Q 450 165 425 160 Z" fill="#1b0804" stroke="#d97706" strokeWidth="0.8" opacity="0.75" />

            {/* RESTAINED GLOWING EYES (Twin piercing golden slits) */}
            <g filter="url(#softRimGlow)">
              {/* Right Eye (Viewer Left) */}
              <polygon points="432,185 444,188 442,192 430,190" fill="url(#eyeGlow)" />
              {/* Left Eye (Viewer Right) */}
              <polygon points="456,188 468,185 470,190 458,192" fill="url(#eyeGlow)" />
            </g>
            {/* Eye core points */}
            <circle cx="437" cy="189" r="1.5" fill="#ffffff" opacity="0.95" />
            <circle cx="463" cy="189" r="1.5" fill="#ffffff" opacity="0.95" />
          </g>

          {/* ========================================================== */}
          {/* LAYER 9: ELEMENT 6 - ARCANE / SPIRIT CORE                  */}
          {/* ========================================================== */}
          {/* Mystic Spiritual Core at the Solar Plexus */}
          <g filter="url(#restrainedCoreGlow)">
            {/* Outer Astrolabe Spiritual Seal Ring */}
            <circle cx="450" cy="480" r="54" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.45" strokeDasharray="6 4" fill="none" />
            <circle cx="450" cy="480" r="44" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.35" fill="none" />

            {/* Core Radiant Nucleus */}
            <circle cx="450" cy="480" r="32" fill="url(#arcaneCoreGrad)" />
            <circle cx="450" cy="480" r="14" fill="#fef08a" fillOpacity="0.7" />

            {/* Ancient Seal Daoist Hexagram/Diamond Sigil Lines */}
            <polygon points="450,442 478,480 450,518 422,480" stroke="#fef3c7" strokeWidth="1.2" fill="none" opacity="0.75" />
            <polygon points="450,450 472,480 450,510 428,480" stroke="#38bdf8" strokeWidth="1" fill="none" opacity="0.6" />
          </g>

          {/* ========================================================== */}
          {/* LAYER 10: ELEMENT 5 - WIND Flowing Translucent Ribbons (Front)*/}
          {/* ========================================================== */}
          <g opacity="0.7">
            {/* Front drape of celestial wind ribbon crossing torso */}
            <path
              d="M 230 420 Q 330 520, 450 540 Q 570 520, 670 420 Q 590 560, 450 580 Q 310 560, 230 420 Z"
              fill="url(#windRibbon1)"
            />
            {/* Rising misty tendrils around waist */}
            <path
              d="M 280 720 Q 360 640, 450 660 Q 540 640, 620 720 Q 530 680, 450 690 Q 370 680, 280 720 Z"
              fill="url(#windRibbon2)"
            />
          </g>

          {/* Foreground Bottom Fade-to-Black Gradient Mask (Seamless blend with UI) */}
          <rect x="0" y="700" width="900" height="400" fill="url(#guardianBottomMask)" />
          <linearGradient id="guardianBottomMask" x1="450" y1="700" x2="450" y2="1100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0a0505" stopOpacity="0" />
            <stop offset="45%" stopColor="#0a0505" stopOpacity="0.6" />
            <stop offset="85%" stopColor="#0a0505" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0a0505" stopOpacity="1" />
          </linearGradient>
        </svg>
      </div>
    </div>
  );
};
