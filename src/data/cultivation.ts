import { CultivationSkillNode, PlayerAbility } from '../types/game';

export const PLAYER_ABILITIES: PlayerAbility[] = [
  {
    id: 'inferno_dragon',
    name: 'Inferno Dragon',
    element: 'fire',
    icon: 'Flame',
    description: 'Summons a blazing dragon flame that incinerates all enemies along the center line, dealing 280 fire damage and inflicting severe burn.',
    cooldown: 25,
    currentCooldown: 0,
    costEssence: 60,
    effectType: 'inferno_dragon'
  },
  {
    id: 'heavenly_thunder',
    name: 'Heavenly Thunder',
    element: 'lightning',
    icon: 'Zap',
    description: 'Calls down divine tribulation lightning bolts onto the 6 most dangerous targets, dealing 340 lightning damage and stunning for 2 seconds.',
    cooldown: 30,
    currentCooldown: 0,
    costEssence: 80,
    effectType: 'heavenly_thunder'
  },
  {
    id: 'frozen_domain',
    name: 'Frozen Domain',
    element: 'ice',
    icon: 'Snowflake',
    description: 'Manifests a glacial spiritual field encasing all enemies on screen in solid ice for 4.0 seconds, halting all movement.',
    cooldown: 35,
    currentCooldown: 0,
    costEssence: 75,
    effectType: 'frozen_domain'
  },
  {
    id: 'world_cleaving_wind',
    name: 'World-Cleaving Wind',
    element: 'wind',
    icon: 'Wind',
    description: 'Summons an astral storm that pushes enemies backward along the path by 120 units and shreds 40% of their armor for 8 seconds.',
    cooldown: 28,
    currentCooldown: 0,
    costEssence: 70,
    effectType: 'world_cleaving_wind'
  },
  {
    id: 'celestial_rebirth',
    name: 'Celestial Rebirth',
    element: 'celestial',
    icon: 'Sun',
    description: 'Sacred ancient miracle that restores 25% Realm Core health, dispels active curses, and doubles Spirit Essence gains for 15 seconds.',
    cooldown: 60,
    currentCooldown: 0,
    costEssence: 120,
    effectType: 'celestial_rebirth'
  }
];

export const CULTIVATION_SKILL_TREE: CultivationSkillNode[] = [
  // Branch 1: Elemental Mastery
  {
    id: 'elem_fire_amplification',
    branch: 'elemental',
    name: 'True Yang Flame Flame Dao',
    rankReq: 'Spirit Awakening',
    costShards: 25,
    description: 'Increases burn damage over time by +15% per rank.',
    icon: 'Flame',
    currentLevel: 0,
    maxLevel: 5,
    effectType: 'burn_damage',
    effectValuePerLevel: 0.15
  },
  {
    id: 'elem_ice_permafrost',
    branch: 'elemental',
    name: 'Permafrost Condensation',
    rankReq: 'Qi Condensation',
    costShards: 35,
    description: 'Extends freeze and slow durations by +12% per rank.',
    icon: 'Snowflake',
    currentLevel: 0,
    maxLevel: 5,
    effectType: 'slow_duration',
    effectValuePerLevel: 0.12
  },
  {
    id: 'elem_lightning_conductance',
    branch: 'elemental',
    name: 'Nine Tribulations Chain',
    rankReq: 'Foundation Realm',
    costShards: 50,
    description: 'Allows lightning spear attacks to jump to +1 additional enemy per rank.',
    icon: 'Zap',
    currentLevel: 0,
    maxLevel: 3,
    effectType: 'chain_targets',
    effectValuePerLevel: 1
  },
  {
    id: 'elem_dragon_blood',
    branch: 'elemental',
    name: 'Primordial Dragon Ancestry',
    rankReq: 'Nascent Soul',
    costShards: 100,
    description: 'Dragon Ascendant and Flame Sovereign attacks gain +8% critical strike chance per rank.',
    icon: 'Sparkles',
    currentLevel: 0,
    maxLevel: 4,
    effectType: 'crit_chance',
    effectValuePerLevel: 0.08
  },

  // Branch 2: Core Fortification
  {
    id: 'core_vitality_barrier',
    branch: 'core',
    name: 'Golden Bell Core Barrier',
    rankReq: 'Spirit Awakening',
    costShards: 20,
    description: 'Increases Realm Core maximum health by +100 per rank.',
    icon: 'Shield',
    currentLevel: 0,
    maxLevel: 5,
    effectType: 'core_max_hp',
    effectValuePerLevel: 100
  },
  {
    id: 'core_spirit_gathering',
    branch: 'core',
    name: 'Spirit Spring Array',
    rankReq: 'Qi Condensation',
    costShards: 30,
    description: 'Increases Spirit Essence gathered from defeated monsters by +10% per rank.',
    icon: 'Coins',
    currentLevel: 0,
    maxLevel: 5,
    effectType: 'essence_bonus',
    effectValuePerLevel: 0.10
  },
  {
    id: 'core_passive_regen',
    branch: 'core',
    name: 'Eternal Spring Restoration',
    rankReq: 'Core Formation',
    costShards: 60,
    description: 'The Realm Core passively regenerates 10 health every wave completion per rank.',
    icon: 'Heart',
    currentLevel: 0,
    maxLevel: 4,
    effectType: 'core_wave_heal',
    effectValuePerLevel: 10
  },

  // Branch 3: Celestial Arts (Abilities)
  {
    id: 'celestial_cooldown_art',
    branch: 'celestial',
    name: 'Time Cleaving Sutra',
    rankReq: 'Qi Condensation',
    costShards: 40,
    description: 'Reduces cooldown of all player battlefield abilities by 8% per rank.',
    icon: 'Clock',
    currentLevel: 0,
    maxLevel: 4,
    effectType: 'ability_cdr',
    effectValuePerLevel: 0.08
  },
  {
    id: 'celestial_potency',
    branch: 'celestial',
    name: 'Heavenly Mandate Power',
    rankReq: 'Foundation Realm',
    costShards: 55,
    description: 'Increases damage and healing of player abilities by +18% per rank.',
    icon: 'Sparkle',
    currentLevel: 0,
    maxLevel: 5,
    effectType: 'ability_damage',
    effectValuePerLevel: 0.18
  },

  // Branch 4: Guardian Dao
  {
    id: 'guardian_qi_stride',
    branch: 'guardian',
    name: 'Void Step Acuity',
    rankReq: 'Spirit Awakening',
    costShards: 30,
    description: 'Expands the attack range of all deployed Guardians by +6% per rank.',
    icon: 'Target',
    currentLevel: 0,
    maxLevel: 5,
    effectType: 'guardian_range',
    effectValuePerLevel: 0.06
  },
  {
    id: 'guardian_flawless_strike',
    branch: 'guardian',
    name: 'Seven Stars Blade Art',
    rankReq: 'Core Formation',
    costShards: 65,
    description: 'Increases the attack speed of all deployed Guardians by +7% per rank.',
    icon: 'Sword',
    currentLevel: 0,
    maxLevel: 5,
    effectType: 'guardian_haste',
    effectValuePerLevel: 0.07
  },
  {
    id: 'guardian_ascended_might',
    branch: 'guardian',
    name: 'Immortal Awakening Transcendence',
    rankReq: 'Soul Transformation',
    costShards: 120,
    description: 'Guardians upgraded to Level 5 gain an additional +25% raw damage per rank.',
    icon: 'Crown',
    currentLevel: 0,
    maxLevel: 3,
    effectType: 'level5_damage_boost',
    effectValuePerLevel: 0.25
  }
];
