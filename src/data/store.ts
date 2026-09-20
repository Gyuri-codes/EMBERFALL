import { CosmeticItem, Achievement, LeaderboardEntry, ChallengeModifier } from '../types/game';

export const COSMETICS_STORE: CosmeticItem[] = [
  {
    id: 'skin_flame_solar',
    targetType: 'guardian_skin',
    targetGuardianId: 'flame_sovereign',
    name: 'Solar Phoenix Sovereign',
    description: 'Robes woven from solar corona flares with golden phoenix sword Qi.',
    costShards: 80,
    rarity: 'rare',
    previewColor: '#ea580c',
    unlocked: false
  },
  {
    id: 'skin_thunder_jade',
    targetType: 'guardian_skin',
    targetGuardianId: 'thunder_immortal',
    name: 'Jade Dragon Thunder God',
    description: 'Emerald-lacquered dragon plate armor with turquoise tribulation lightning.',
    costShards: 120,
    rarity: 'epic',
    previewColor: '#059669',
    unlocked: false
  },
  {
    id: 'skin_frost_lotus',
    targetType: 'guardian_skin',
    targetGuardianId: 'frost_empress',
    name: 'Glacial Lotus Empress',
    description: 'Transcendent silver silk dress trailing blooming crystalline lotus petals.',
    costShards: 140,
    rarity: 'epic',
    previewColor: '#38bdf8',
    unlocked: false
  },
  {
    id: 'skin_dragon_golden',
    targetType: 'guardian_skin',
    targetGuardianId: 'dragon_ascendant',
    name: 'Golden Ancestral Sovereign',
    description: 'Radiant golden five-clawed imperial dragon form with divine starlight rays.',
    costShards: 250,
    rarity: 'divine',
    previewColor: '#eab308',
    unlocked: false
  },
  {
    id: 'relic_yinyang_core',
    targetType: 'core_relic',
    name: 'Yin-Yang Taiji Core',
    description: 'Transforms the Realm Core into a spinning Taiji Lotus that radiates balancing aura.',
    costShards: 100,
    rarity: 'epic',
    previewColor: '#f8fafc',
    unlocked: false
  },
  {
    id: 'theme_golden_ink',
    targetType: 'battlefield_theme',
    name: 'Imperial Golden Inkwash',
    description: 'Applies rich gold-leaf calligraphy borders and luminous path highlights.',
    costShards: 150,
    rarity: 'legendary',
    previewColor: '#d97706',
    unlocked: false
  }
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    title: 'First Awakening',
    name: 'First Awakening',
    desc: 'Deploy your first Guardian cultivator on any battlefield.',
    description: 'Deploy your first Guardian cultivator on any battlefield.',
    requirement: 1,
    rewardShards: 15,
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    icon: 'Sword'
  },
  {
    id: 'slayer_50',
    title: 'Shadow Cleaver',
    name: 'Shadow Cleaver',
    desc: 'Vanquish 50 shadow monsters.',
    description: 'Vanquish 50 shadow monsters.',
    requirement: 50,
    rewardShards: 25,
    unlocked: false,
    progress: 0,
    maxProgress: 50,
    icon: 'Skull'
  },
  {
    id: 'slayer_300',
    title: 'Immortal Exterminator',
    name: 'Immortal Exterminator',
    desc: 'Vanquish 300 shadow monsters across all realms.',
    description: 'Vanquish 300 shadow monsters across all realms.',
    requirement: 300,
    rewardShards: 60,
    unlocked: false,
    progress: 0,
    maxProgress: 300,
    icon: 'Flame'
  },
  {
    id: 'first_boss',
    title: 'Calamity Queller',
    name: 'Calamity Queller',
    desc: 'Defeat your first Realm Boss in combat.',
    description: 'Defeat your first Realm Boss in combat.',
    requirement: 1,
    rewardShards: 50,
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    icon: 'Crown'
  },
  {
    id: 'ascension_rank',
    title: 'Breakthrough the Clouds',
    name: 'Breakthrough the Clouds',
    desc: 'Reach the Core Formation rank in Cultivation.',
    description: 'Reach the Core Formation rank in Cultivation.',
    requirement: 1,
    rewardShards: 45,
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    icon: 'Sparkles'
  },
  {
    id: 'master_upgrade',
    title: 'Transcendent Form',
    name: 'Transcendent Form',
    desc: 'Upgrade any deployed Guardian to Level 5 during battle.',
    description: 'Upgrade any deployed Guardian to Level 5 during battle.',
    requirement: 1,
    rewardShards: 40,
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    icon: 'Zap'
  },
  {
    id: 'ability_virtuoso',
    title: 'Daoist Arcanist',
    name: 'Daoist Arcanist',
    desc: 'Cast 20 player battlefield abilities.',
    description: 'Cast 20 player battlefield abilities.',
    requirement: 20,
    rewardShards: 35,
    unlocked: false,
    progress: 0,
    maxProgress: 20,
    icon: 'Target'
  },
  {
    id: 'endless_survivor',
    title: 'Endless Dao',
    name: 'Endless Dao',
    desc: 'Reach Wave 15 or higher in Endless Mode.',
    description: 'Reach Wave 15 or higher in Endless Mode.',
    requirement: 15,
    rewardShards: 80,
    unlocked: false,
    progress: 0,
    maxProgress: 15,
    icon: 'Award'
  }
];

export const ACHIEVEMENTS_DATA = INITIAL_ACHIEVEMENTS;

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    username: 'Xue_Lian_SwordGod',
    realmName: 'Abyssal Realm',
    waveReached: 42,
    score: 184500,
    cultivatorRank: 'Heavenly Ascension',
    favoriteGuardian: 'Dragon Ascendant',
    timestamp: '2 hours ago'
  },
  {
    rank: 2,
    username: 'RURU_Immortal',
    realmName: 'Thundercloud Peaks',
    waveReached: 38,
    score: 162900,
    cultivatorRank: 'Soul Transformation',
    favoriteGuardian: 'Thunder Immortal',
    timestamp: '4 hours ago'
  },
  {
    rank: 3,
    username: 'GhostBlade_99',
    realmName: 'Moonlit Bamboo',
    waveReached: 35,
    score: 148200,
    cultivatorRank: 'Nascent Soul',
    favoriteGuardian: 'Shadow Sovereign',
    timestamp: 'Yesterday'
  },
  {
    rank: 4,
    username: 'AzureFlame_Chen',
    realmName: 'Emberfall Valley',
    waveReached: 30,
    score: 125400,
    cultivatorRank: 'Core Formation',
    favoriteGuardian: 'Flame Sovereign',
    timestamp: 'Yesterday'
  },
  {
    rank: 5,
    username: 'Lotus_Mistress',
    realmName: 'Frozen Heaven',
    waveReached: 28,
    score: 112000,
    cultivatorRank: 'Foundation Realm',
    favoriteGuardian: 'Frost Empress',
    timestamp: '2 days ago'
  }
];

export const CHALLENGE_MODES: ChallengeModifier[] = [
  {
    id: 'essence_drought',
    name: 'Essence Drought',
    description: 'Monster essence yield reduced by 35%. Every placement decision must be calculated with absolute precision.',
    difficulty: 'hard',
    essenceMultiplier: 0.65,
    enemyHpMultiplier: 1.0,
    enemySpeedMultiplier: 1.0
  },
  {
    id: 'speed_of_shadows',
    name: 'Shadow Incursion',
    description: 'All monsters gain +30% movement speed and 15% evasion against basic projectile attacks.',
    difficulty: 'hard',
    essenceMultiplier: 1.2,
    enemyHpMultiplier: 1.0,
    enemySpeedMultiplier: 1.3
  },
  {
    id: 'titan_onslaught',
    name: 'Calamity Tribulation',
    description: 'Monster health increased by +70%, but Celestial Shard rewards are doubled upon victory.',
    difficulty: 'hell',
    essenceMultiplier: 1.3,
    enemyHpMultiplier: 1.7,
    enemySpeedMultiplier: 0.95
  }
];
