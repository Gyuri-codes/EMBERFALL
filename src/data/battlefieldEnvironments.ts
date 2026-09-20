import { RealmData } from '../types/game';

export interface BattlefieldComposition {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string;
  timeOfDay: string;
  environmentalHazard: string;
  qiResonance: string;
  particlesType: 'fire_embers' | 'bamboo_mist' | 'ice_crystals' | 'storm_sparks' | 'jade_water' | 'void_motes' | 'golden_sand' | 'astral_stardust' | 'poison_spores';
  compositionAngle: string;
  ambienceDescription: string;
  accentGradient: [string, string];
  fogDensity: 'light' | 'moderate' | 'heavy';
}

export const REALM_BATTLEFIELD_VARIATIONS: Record<string, BattlefieldComposition[]> = {
  emberfall_valley: [
    {
      id: 'ev_comp_1',
      name: 'Caldera of Dragon-Forged Basalt',
      subtitle: 'Ancient Patriarch Crucible • High Flame Qi Surge',
      imageUrl: 'https://images.unsplash.com/photo-1509565840034-3c385fa646d3?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Molten Dusk',
      environmentalHazard: 'Magma Rivers & Scorching Cinder Rain',
      qiResonance: 'Pure Yang Flame 96%',
      particlesType: 'fire_embers',
      compositionAngle: 'Panoramic Volcanic Chasm Overlook',
      ambienceDescription: 'Towering obsidian peaks split by glowing rivers of liquefied spirit fire. Dragon-forged runes pulse across ancient rock walls.',
      accentGradient: ['#f97316', '#dc2626'],
      fogDensity: 'heavy'
    },
    {
      id: 'ev_comp_2',
      name: 'Ashen Ridge & Dragon Horn Gate',
      subtitle: 'Scorched Cliffline • Volcanic Ash Vortex',
      imageUrl: 'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Crimson Midnight',
      environmentalHazard: 'Sulfuric Smoke & Thermal Updrafts',
      qiResonance: 'Subterranean Lava Dao 92%',
      particlesType: 'fire_embers',
      compositionAngle: 'Low Angle Burning Cliffside Rampart',
      ambienceDescription: 'Jagged volcanic formations illuminated by subterranean magma plumes. Burning basalt cliffs stand sentinel over the demon pathway.',
      accentGradient: ['#ea580c', '#b91c1c'],
      fogDensity: 'moderate'
    },
    {
      id: 'ev_comp_3',
      name: 'Searing Basin of the First Altar',
      subtitle: 'Primordial Ignition Point • Ember Gale',
      imageUrl: 'https://images.unsplash.com/photo-1542332213-31f87348057f?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Solar Flare Eclipse',
      environmentalHazard: 'Floating Fire Embers & Ground Fissures',
      qiResonance: 'Dragon Fire Resonance 94%',
      particlesType: 'fire_embers',
      compositionAngle: 'Elevated Shrine Perch View',
      ambienceDescription: 'A sprawling molten plain where ancient masters forged spirit weapons. Swirling embers dance on thermal currents.',
      accentGradient: ['#fb923c', '#991b1b'],
      fogDensity: 'moderate'
    }
  ],

  moonlit_bamboo: [
    {
      id: 'mb_comp_1',
      name: 'Emerald Mist Pavilion & Whispering Glade',
      subtitle: 'Thousand Immortals Trail • Ethereal Moon Tide',
      imageUrl: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Silvery Midnight',
      environmentalHazard: 'Spiritual Illusion Mist & Drifting Spores',
      qiResonance: 'Verdant Wood Dao 95%',
      particlesType: 'bamboo_mist',
      compositionAngle: 'Through Dense Ancient Bamboo Stems',
      ambienceDescription: 'A quiet bamboo sea illuminated by cold moonlight. Soft spiritual mist drifts between ancient stone lanterns and quiet moss.',
      accentGradient: ['#10b981', '#059669'],
      fogDensity: 'heavy'
    },
    {
      id: 'mb_comp_2',
      name: 'Jade Brook Bridge of Solitude',
      subtitle: 'Koi Pool Crossroads • Phosphorescent Canopy',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Emerald Twilight',
      environmentalHazard: 'Dense Night Vapor & Shadow Blinks',
      qiResonance: 'Pure Moon Yin Qi 91%',
      particlesType: 'bamboo_mist',
      compositionAngle: 'Wide Valley Waterway Perspective',
      ambienceDescription: 'Verdant bamboo towers overhead as spiritual fireflies hover over serene streams. Ancient stone steps lead into sacred meditation grounds.',
      accentGradient: ['#34d399', '#047857'],
      fogDensity: 'moderate'
    },
    {
      id: 'mb_comp_3',
      name: 'Sanctuary of Whispering Leaves',
      subtitle: 'Inner Daoist Enclosure • Soft Wind Gusts',
      imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Dawn Mist Awakening',
      environmentalHazard: 'Drifting Jade Spores',
      qiResonance: 'Breeze Circulation Dao 89%',
      particlesType: 'bamboo_mist',
      compositionAngle: 'Elevated Tree Canopy Vista',
      ambienceDescription: 'The upper levels of the sanctuary where bamboo stalks bend gracefully under the morning celestial glow.',
      accentGradient: ['#6ee7b7', '#065f46'],
      fogDensity: 'light'
    }
  ],

  frozen_heaven: [
    {
      id: 'fh_comp_1',
      name: 'Glacial Spires of the Pure Yang Peak',
      subtitle: 'Eternal Permafrost Crags • Diamond Frost Gale',
      imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Sub-Zero Aurora Dawn',
      environmentalHazard: 'Blinding Whiteouts & Freezing Gale',
      qiResonance: 'Absolute Zero Yin Ice 97%',
      particlesType: 'ice_crystals',
      compositionAngle: 'Massive Alpine Glacier Vista',
      ambienceDescription: 'Colossal jagged peaks crowned with timeless ice formations. Crystalline blue-white spiritual lights shimmer through heavy mountain fog.',
      accentGradient: ['#38bdf8', '#0284c7'],
      fogDensity: 'heavy'
    },
    {
      id: 'fh_comp_2',
      name: 'Frozen Daoist Shrine Precipice',
      subtitle: 'Snow-Covered Ruins • Glacial Wyrm Watch',
      imageUrl: 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Celestial Noon Frost',
      environmentalHazard: 'Glacial Crevasse Ice Slides',
      qiResonance: 'Crystal Ice Core 93%',
      particlesType: 'ice_crystals',
      compositionAngle: 'Narrow Ridge Approach to Shrine',
      ambienceDescription: 'Ancient prayer flags and frozen stone pagodas locked within crystal ice. Glacial winds whisper forgotten cultivation sutras.',
      accentGradient: ['#7dd3fc', '#0369a1'],
      fogDensity: 'moderate'
    },
    {
      id: 'fh_comp_3',
      name: 'Summit of Absolute Silence',
      subtitle: 'Highest Glacial Crest • Cold Sun Flare',
      imageUrl: 'https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Glacial Twilight',
      environmentalHazard: 'Floating Ice Particles & Cold Snaps',
      qiResonance: 'Deep Winter Yang 90%',
      particlesType: 'ice_crystals',
      compositionAngle: 'Panoramic Mountain Sea View',
      ambienceDescription: 'Above the clouds, pure pristine snow sheets stretch to infinity beneath a pale violet sky.',
      accentGradient: ['#bae6fd', '#075985'],
      fogDensity: 'light'
    }
  ],

  thundercloud_peaks: [
    {
      id: 'tp_comp_1',
      name: 'Ninth Tribulation Floating Citadel',
      subtitle: 'Levitating Crags • Continuous Lightning Tempest',
      imageUrl: 'https://images.unsplash.com/photo-1516912481808-3406841bd33c?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Storm Eclipse',
      environmentalHazard: 'Ground Tribulation Lightning & Static Surge',
      qiResonance: 'Heavenly Tribulation Thunder 98%',
      particlesType: 'storm_sparks',
      compositionAngle: 'Floating Island Sky Chasm Overlook',
      ambienceDescription: 'Massive levitating mountain islands bound together by roaring bridges of violet arc lightning. Thunder echoes through thunderous storm clouds.',
      accentGradient: ['#c084fc', '#9333ea'],
      fogDensity: 'heavy'
    },
    {
      id: 'tp_comp_2',
      name: 'Skyward Magnetic Ridge',
      subtitle: 'Suspended Spires • Charged Ion Field',
      imageUrl: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Violet Thunder Dusk',
      environmentalHazard: 'Disruptive Magnetic Waves',
      qiResonance: 'Electro-Magnetic Dao 92%',
      particlesType: 'storm_sparks',
      compositionAngle: 'Looking Upward at Levitating Platforms',
      ambienceDescription: 'Antigravity rock formations hovering above a boiling sea of purple clouds, crackling with perpetual electrical discharges.',
      accentGradient: ['#a855f7', '#7e22ce'],
      fogDensity: 'moderate'
    },
    {
      id: 'tp_comp_3',
      name: 'Perch of the Lightning Sovereign',
      subtitle: 'High Stratosphere Outlook • Chain Lightning',
      imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Night Tempest Arc',
      environmentalHazard: 'Perpetual Thunder Gale',
      qiResonance: 'Divine Roar Resonance 95%',
      particlesType: 'storm_sparks',
      compositionAngle: 'Distant Peak Silhouette in Lightning Flashes',
      ambienceDescription: 'The highest floating platform where the sky is split open by jagged bolts of divine purple lightning.',
      accentGradient: ['#e879f9', '#a21caf'],
      fogDensity: 'moderate'
    }
  ],

  jade_serpent_river: [
    {
      id: 'jsr_comp_1',
      name: 'Gorge of the Verdant Dragon River',
      subtitle: 'Serpent Cascades • Dense River Vapor',
      imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Morning Mist Tide',
      environmentalHazard: 'High Rapids & Swirling Water Currents',
      qiResonance: 'Azure Water Dao 93%',
      particlesType: 'jade_water',
      compositionAngle: 'Winding Serpentine Gorge Perspective',
      ambienceDescription: 'A majestic jade-colored spiritual river winding through steep limestone gorges. Ancient moss-covered serpent pillars line the water paths.',
      accentGradient: ['#2dd4bf', '#0f766e'],
      fogDensity: 'heavy'
    },
    {
      id: 'jsr_comp_2',
      name: 'Ancient Serpent Archway Shallows',
      subtitle: 'Sunken Stone Monuments • Phosphorescent Waters',
      imageUrl: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Verdant Twilight',
      environmentalHazard: 'Sudden River Surges & Slick Boulders',
      qiResonance: 'Serpent Vitality 90%',
      particlesType: 'jade_water',
      compositionAngle: 'Water-Level Shoreline Look',
      ambienceDescription: 'Glowing turquoise water rushes over ancient carved stone bridges, sending cool droplets into the surrounding thick mist.',
      accentGradient: ['#14b8a6', '#115e59'],
      fogDensity: 'moderate'
    }
  ],

  abyssal_realm: [
    {
      id: 'ar_comp_1',
      name: 'Chasm of the Shattered Void',
      subtitle: 'Nether Abyss • Glowing Fissures of Demon Qi',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Pitch Void Perpetual',
      environmentalHazard: 'Void Gravity Collapse & Dark Flames',
      qiResonance: 'Nether Void Essence 98%',
      particlesType: 'void_motes',
      compositionAngle: 'Deep Subterranean Trench Vista',
      ambienceDescription: 'A colossal subterranean rift where gravity fractures. Red and purple glowing cracks split the obsidian terrain as dark particles drift upwards.',
      accentGradient: ['#f43f5e', '#881337'],
      fogDensity: 'heavy'
    },
    {
      id: 'ar_comp_2',
      name: 'Ruined Monoliths of the Demonic Seal',
      subtitle: 'Broken Chains of Binding • Nether Mists',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Bleeding Sky Eclipse',
      environmentalHazard: 'Demon Aura Mists & Spirit Poison',
      qiResonance: 'Dark Soul Tribulation 94%',
      particlesType: 'void_motes',
      compositionAngle: 'Shattered Megalithic Gate View',
      ambienceDescription: 'Titanic stone fragments suspended in mid-air above bottomless ravines. Malevolent crimson energy seeps from broken seals.',
      accentGradient: ['#e11d48', '#4c0519'],
      fogDensity: 'heavy'
    },
    {
      id: 'ar_comp_3',
      name: 'Gates of the Netherworld Trench',
      subtitle: 'Bottomless Cavern Throat • Void Radiation',
      imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Void Horizon',
      environmentalHazard: 'Mind-Twisting Whispers',
      qiResonance: 'Abyssal Chaos 91%',
      particlesType: 'void_motes',
      compositionAngle: 'Wide Chasm Horizon',
      ambienceDescription: 'Dense supernatural fog clings to ancient ruined spires that plunge into the infinite darkness below.',
      accentGradient: ['#fb7185', '#9f1239'],
      fogDensity: 'heavy'
    }
  ],

  crimson_lotus_peak: [
    {
      id: 'clp_comp_1',
      name: 'Summit of the Blooming Flame Lotus',
      subtitle: 'High Ridge Altar • Spiritual Sun Crest',
      imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Crimson Sunset Bloom',
      environmentalHazard: 'Solar Flame Radiance & Thermal Winds',
      qiResonance: 'Scarlet Lotus Dao 95%',
      particlesType: 'fire_embers',
      compositionAngle: 'Summit Pinnacle Panorama',
      ambienceDescription: 'A razor-sharp mountain summit bathed in fiery crimson sunset light, surrounded by clouds shaped like blooming lotus petals.',
      accentGradient: ['#f43f5e', '#ea580c'],
      fogDensity: 'moderate'
    }
  ],

  whispering_pine_pass: [
    {
      id: 'wpp_comp_1',
      name: 'Mist-Veiled Ancient Pine Defile',
      subtitle: 'High Mountain Pass • Whispering Wind Currents',
      imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Morning Mountain Dawn',
      environmentalHazard: 'Gusting Mountain Drafts & Cold Mist',
      qiResonance: 'Ancient Wood Wind Dao 91%',
      particlesType: 'bamboo_mist',
      compositionAngle: 'Rocky Pass Roadway Perspective',
      ambienceDescription: 'Ancient thousand-year gnarled pine trees cling to sheer cliff edges as ethereal white mountain clouds roll through the pass.',
      accentGradient: ['#10b981', '#065f46'],
      fogDensity: 'heavy'
    }
  ],

  golden_sands_desert: [
    {
      id: 'gsd_comp_1',
      name: 'Dune Sea of Forgotten Dynasties',
      subtitle: 'Sun-Bleached Tombs • Golden Sandstorms',
      imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Blazing Desert Noon',
      environmentalHazard: 'Biting Sand Grains & Mirage Illusions',
      qiResonance: 'Golden Earth Dao 93%',
      particlesType: 'golden_sand',
      compositionAngle: 'Endless Dunes Vista with Sunken Temple',
      ambienceDescription: 'Vast golden undulating dunes stretching beneath an intense solar sphere. Sunken sandstone monuments reveal ancient dao glyphs.',
      accentGradient: ['#f59e0b', '#d97706'],
      fogDensity: 'moderate'
    }
  ],

  astral_observatory: [
    {
      id: 'aso_comp_1',
      name: 'Starlight Spire of the Celestial Astrolabe',
      subtitle: 'Cosmic Summit • Nebula Starlight Infusion',
      imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Cosmic Stellar Midnight',
      environmentalHazard: 'Meteorite Dust & Gravity Fluctuations',
      qiResonance: 'Astral Constellation Dao 99%',
      particlesType: 'astral_stardust',
      compositionAngle: 'Looking Up to the Infinite Galactic Core',
      ambienceDescription: 'A soaring peak reaching above the atmosphere into a sea of glittering nebulas and cosmic auroras.',
      accentGradient: ['#6366f1', '#4338ca'],
      fogDensity: 'light'
    }
  ],

  spirit_crystal_caverns: [
    {
      id: 'scc_comp_1',
      name: 'Resonating Geode of Luminous Amethyst',
      subtitle: 'Underground Crystal Vault • Prismatic Echoes',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Crystal Luminescence',
      environmentalHazard: 'Resonant Sound Waves & Sharp Crystal Spires',
      qiResonance: 'Pure Crystal Spirit Qi 96%',
      particlesType: 'astral_stardust',
      compositionAngle: 'Gleaming Cave Chamber Panorama',
      ambienceDescription: 'Towering clusters of glowing amethyst and cyan crystals illuminate subterranean waterways with brilliant prismatic light.',
      accentGradient: ['#8b5cf6', '#6d28d9'],
      fogDensity: 'moderate'
    }
  ],

  celestial_sovereign_throne: [
    {
      id: 'cst_comp_1',
      name: 'Golden Cloud Palace of the Sovereign',
      subtitle: 'Apex of the Nine Heavens • Imperial Dao Halo',
      imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Immortal Dawn Glow',
      environmentalHazard: 'Overwhelming Sovereign Pressure',
      qiResonance: 'Supreme Sovereign Dao 100%',
      particlesType: 'astral_stardust',
      compositionAngle: 'Grand Imperial Courtyard Overlook',
      ambienceDescription: 'Floating golden palace pavilions perched atop radiant white clouds, shining with the divine light of the primordial heaven.',
      accentGradient: ['#fbbf24', '#b45309'],
      fogDensity: 'light'
    }
  ],

  last_realm_core: [
    {
      id: 'lrc_comp_1',
      name: 'Heart of the Last Realm • Dao Origin',
      subtitle: 'The Final Bastion • Convergence of All Five Elements',
      imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80',
      timeOfDay: 'Eternal Convergence',
      environmentalHazard: 'World-Breaking Dimensional Rifts',
      qiResonance: 'Primordial Ember Core 100%',
      particlesType: 'fire_embers',
      compositionAngle: 'Epic Core Sanctum Vista',
      ambienceDescription: 'The sacred genesis point where the last ember of the realm burns against encroaching absolute darkness.',
      accentGradient: ['#f59e0b', '#dc2626'],
      fogDensity: 'heavy'
    }
  ]
};

/**
 * Procedural fallback generator for any existing or future realm
 */
export function getBattlefieldComposition(
  realm: RealmData,
  variationIndex?: number
): BattlefieldComposition {
  const variations = REALM_BATTLEFIELD_VARIATIONS[realm.id];

  if (variations && variations.length > 0) {
    if (typeof variationIndex === 'number') {
      const idx = Math.abs(variationIndex) % variations.length;
      return variations[idx];
    }
    const randomIdx = Math.floor(Math.random() * variations.length);
    return variations[randomIdx];
  }

  // Automatic procedural composition synthesis based on lore, element, and name
  const theme = realm.theme || 'volcanic_mountains';
  let particleType: BattlefieldComposition['particlesType'] = 'fire_embers';
  let image = 'https://images.unsplash.com/photo-1509565840034-3c385fa646d3?auto=format&fit=crop&w=1600&q=80';
  let hazard = 'Spatial Calamity Distortion & Chaotic Qi';
  let resonance = 'Ancient Dao Resonance 90%';

  if (theme.includes('snow') || theme.includes('frost') || theme.includes('ice')) {
    particleType = 'ice_crystals';
    image = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80';
    hazard = 'Blinding Frost Blizzard & Sub-Zero Mists';
    resonance = 'Absolute Frost Dao 94%';
  } else if (theme.includes('bamboo') || theme.includes('forest') || theme.includes('wood')) {
    particleType = 'bamboo_mist';
    image = 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1600&q=80';
    hazard = 'Spiritual Mist Maze & Hallucinatory Spores';
    resonance = 'Verdant Wood Dao 91%';
  } else if (theme.includes('floating') || theme.includes('thunder') || theme.includes('storm')) {
    particleType = 'storm_sparks';
    image = 'https://images.unsplash.com/photo-1516912481808-3406841bd33c?auto=format&fit=crop&w=1600&q=80';
    hazard = 'Tribulation Arc Lightning & High Altitude Gale';
    resonance = 'Heavenly Thunder Tribulation 96%';
  } else if (theme.includes('water') || theme.includes('river') || theme.includes('sea')) {
    particleType = 'jade_water';
    image = 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80';
    hazard = 'Torrential Spirit Rapids & Deep Water Fog';
    resonance = 'Serpentine Water Dao 92%';
  } else if (theme.includes('abyss') || theme.includes('dark') || theme.includes('void')) {
    particleType = 'void_motes';
    image = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80';
    hazard = 'Void Gravity Cracks & Demonic Mists';
    resonance = 'Nether Demonic Resonance 97%';
  } else if (theme.includes('desert') || theme.includes('sand')) {
    particleType = 'golden_sand';
    image = 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80';
    hazard = 'Golden Sand Whirlwinds & Scorching Sun';
    resonance = 'Desolate Earth Dao 90%';
  }

  return {
    id: `${realm.id}_procedural`,
    name: `${realm.name} • Frontline Sector`,
    subtitle: realm.subtitle || 'Spiritual Bastion Front',
    imageUrl: image,
    timeOfDay: 'Celestial Convergence',
    environmentalHazard: hazard,
    qiResonance: resonance,
    particlesType: particleType,
    compositionAngle: 'Wide Cinematic Battlefield Vista',
    ambienceDescription: realm.description,
    accentGradient: [realm.accentColor || '#f59e0b', '#b45309'],
    fogDensity: 'moderate'
  };
}
