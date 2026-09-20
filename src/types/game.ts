export type ElementType = 
  | 'fire' 
  | 'lightning' 
  | 'ice' 
  | 'wind' 
  | 'celestial' 
  | 'shadow' 
  | 'life' 
  | 'dragon';

export type CultivationRank = 
  | 'Spirit Awakening'
  | 'Qi Condensation'
  | 'Foundation Realm'
  | 'Core Formation'
  | 'Nascent Soul'
  | 'Soul Transformation'
  | 'Heavenly Ascension'
  | 'Immortal Sovereign';

export interface GuardianConfig {
  id: string;
  name: string;
  title: string;
  element: ElementType;
  weapon: string;
  baseCost: number;
  baseDamage: number;
  baseRange: number; // in canvas coordinate units
  attackSpeed: number; // attacks per second
  attackType: 'projectile' | 'instant_strike' | 'chain' | 'beam' | 'support_aura';
  description: string;
  attackName: string;
  ultimateName: string;
  ultimateDesc: string;
  ultimateCooldown: number; // seconds
  color: string;
  secondaryColor: string;
  avatarIcon: string; // Lucide icon name or emoji representation
  unlockedByDefault: boolean;
  unlockCostShards: number;
  quote: string;
}

export interface PlacedGuardian {
  instanceId: string;
  configId: string;
  x: number;
  y: number;
  level: number; // 1 to 5
  damageDealt: number;
  kills: number;
  lastAttackTime: number;
  targetPriority: 'first' | 'last' | 'strongest' | 'closest';
  equippedSkinId?: string;
  ultimateTimer: number; // seconds until ready
  isUltimateActive: boolean;
}

export interface EnemyConfig {
  type: string;
  name: string;
  elementWeakness?: ElementType;
  baseHp: number;
  speed: number;
  defense: number;
  rewardEssence: number;
  rewardShards: number;
  size: number;
  color: string;
  isBoss?: boolean;
  isFlying?: boolean;
  isStealth?: boolean;
  description: string;
  specialAbility?: string;
}

export interface ActiveEnemy {
  id: string;
  config: EnemyConfig;
  maxHp: number;
  hp: number;
  defense: number;
  x: number;
  y: number;
  speed: number;
  pathIndex: number;
  pathProgress: number; // 0 to 1 along current segment
  totalDistanceTraveled: number;
  size: number;
  // Status effects
  slowFactor: number; // multiplier e.g. 0.5
  slowTimer: number; // seconds remaining
  freezeTimer: number;
  burnTimer: number;
  burnDps: number;
  stealthVisible: boolean;
  bossPhase?: number;
  bossActionTimer?: number;
}

export interface Projectile {
  id: string;
  guardianId: string;
  element: ElementType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetEnemyId: string;
  damage: number;
  speed: number;
  aoeRadius: number;
  trailColor: string;
  scale: number;
}

export interface VisualParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  shape: 'circle' | 'spark' | 'petal' | 'ember' | 'slash' | 'rune';
  rotation?: number;
  vRot?: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  alpha: number;
  fontSize: number;
  isCrit?: boolean;
}

export interface RealmPoint {
  x: number;
  y: number;
}

export interface PlacementNode {
  id: string;
  x: number;
  y: number;
  placedGuardianInstanceId?: string;
}

export interface RealmData {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  theme: string;
  totalWaves: number;
  path: RealmPoint[];
  placementNodes: PlacementNode[];
  corePosition: RealmPoint;
  spawnPosition: RealmPoint;
  bgGradient: [string, string];
  accentColor: string;
  musicMood: 'fire' | 'bamboo' | 'frost' | 'thunder' | 'abyss';
  bossName: string;
  bossDescription: string;
  recommendedPower: string;
  firstClearReward: number; // shards
}

export interface PlayerAbility {
  id: string;
  name: string;
  element: ElementType;
  icon: string;
  description: string;
  cooldown: number; // seconds
  currentCooldown: number;
  costEssence: number;
  effectType: 'inferno_dragon' | 'heavenly_thunder' | 'frozen_domain' | 'world_cleaving_wind' | 'celestial_rebirth';
}

export type GameMode = 'story' | 'endless' | 'challenge' | 'training';

export interface ChallengeModifier {
  id: string;
  name: string;
  description: string;
  difficulty: 'normal' | 'hard' | 'hell';
  essenceMultiplier: number;
  enemyHpMultiplier: number;
  enemySpeedMultiplier: number;
  restriction?: string;
}

export interface CultivationSkillNode {
  id: string;
  branch: 'elemental' | 'core' | 'celestial' | 'guardian';
  name: string;
  rankReq: CultivationRank;
  costShards: number;
  description: string;
  icon: string;
  currentLevel: number;
  maxLevel: number;
  effectType: string;
  effectValuePerLevel: number;
}

export interface CosmeticItem {
  id: string;
  targetType: 'guardian_skin' | 'core_relic' | 'battlefield_theme';
  targetGuardianId?: string;
  name: string;
  description: string;
  costShards: number;
  rarity: 'rare' | 'epic' | 'legendary' | 'divine';
  previewColor: string;
  unlocked: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  name?: string;
  description?: string;
  requirement?: number;
  rewardShards: number;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  icon: string;
}

export interface GameSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  masterVolume: number; // 0 to 1
  musicVolume: number;
  sfxVolume: number;
  audioMuted?: boolean;
  graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
  highContrast: boolean;
  highContrastMode?: boolean;
  screenReaderAnnouncements: boolean;
  fontSize: 'normal' | 'large' | 'xl' | 'xlarge';
  screenShake: boolean;
  showDamageNumbers: boolean;
  keybindings: {
    ability1: string;
    ability2: string;
    ability3: string;
    ability4: string;
    ability5: string;
    pause: string;
    fastForward: string;
    startWave: string;
    deselect: string;
  };
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  realmName: string;
  waveReached: number;
  score: number;
  cultivatorRank: CultivationRank;
  favoriteGuardian: string;
  timestamp: string;
  isPlayer?: boolean;
}

export interface GameSaveState {
  version: number;
  lastSaved: string;
  playerCultivationRank: CultivationRank;
  celestialShards: number;
  unlockedGuardianIds: string[];
  completedRealmIds: string[];
  highestWavesByRealm: Record<string, number>;
  endlessHighScore: number;
  unlockedCosmetics: string[];
  equippedCosmetics: Record<string, string>;
  allocatedSkills: Record<string, number>;
  achievements: Record<string, { unlocked: boolean; progress: number }>;
  claimedAchievements?: string[];
  settings: GameSettings;
  stats: {
    totalEnemiesDefeated: number;
    totalBossesSlain: number;
    totalBossesDefeated?: number;
    totalRealmsDefended?: number;
    totalEssenceGathered: number;
    totalBattlesWon: number;
    totalDamageDealt: number;
    highestLevelCultivatorReached?: number;
  };
}
