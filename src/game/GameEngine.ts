import {
  ActiveEnemy,
  EnemyConfig,
  ElementType,
  FloatingText,
  GameMode,
  GuardianConfig,
  PlacedGuardian,
  PlacementNode,
  PlayerAbility,
  Projectile,
  RealmData,
  VisualParticle,
  VisualAttackBeam,
  GameSettings
} from '../types/game';
import { GUARDIANS_DATA, UPGRADE_LEVELS } from '../data/guardians';
import { ENEMIES_DATA } from '../data/enemies';
import { REALMS_DATA } from '../data/realms';
import { soundEngine } from '../audio/soundEngine';

export interface GameEngineCallbacks {
  onEssenceChange: (essence: number) => void;
  onShardsChange: (shards: number) => void;
  onCoreHpChange: (hp: number, maxHp: number) => void;
  onWaveChange: (wave: number, totalWaves: number, waveActive: boolean) => void;
  onBossStateChange: (boss: ActiveEnemy | null) => void;
  onSelectedGuardianChange: (guardian: PlacedGuardian | null, node: PlacementNode | null) => void;
  onSelectedConfigChange?: (config: GuardianConfig | null) => void;
  onVictory: (stars: number, earnedShards: number, totalKills: number) => void;
  onDefeat: (waveReached: number, totalKills: number) => void;
  onScreenReaderNotice: (message: string) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private realm: RealmData;
  private callbacks: GameEngineCallbacks;
  private settings: GameSettings;
  private gameMode: GameMode;

  // Game state
  private isRunning = false;
  private isPaused = false;
  private gameSpeed = 1; // 1x, 2x, 3x
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private battleSimulationTime = 0;

  // Currencies & Core
  public spiritEssence = 250;
  public celestialShardsEarned = 0;
  public coreMaxHp = 1000;
  public coreHp = 1000;
  public totalKills = 0;

  // Wave management
  public currentWave = 0;
  public totalWaves = 25;
  public isWaveActive = false;
  private waveSpawnQueue: { config: EnemyConfig; delay: number }[] = [];
  private waveSpawnTimer = 0;
  private activeEnemies: ActiveEnemy[] = [];
  private activeBoss: ActiveEnemy | null = null;

  // Guardians & Placement
  private placedGuardians: Map<string, PlacedGuardian> = new Map(); // instanceId -> PlacedGuardian
  private placementNodes: PlacementNode[] = [];
  public selectedNode: PlacementNode | null = null;
  public draggingGuardianConfig: GuardianConfig | null = null;
  public selectedConfigToPlace: GuardianConfig | null = null;
  private dragScreenPos = { x: 0, y: 0 };
  private isDragging = false;

  // Touch tracking for reliable mobile single-tap interaction
  private lastTouchTime = 0;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private touchMoved = false;

  // Projectiles & Particles
  private projectiles: Projectile[] = [];
  private particles: VisualParticle[] = [];
  private floatingTexts: FloatingText[] = [];
  private visualAttackBeams: VisualAttackBeam[] = [];

  // Active abilities
  private abilities: PlayerAbility[] = [];
  private essenceMultiplier = 1.0;
  private doubleEssenceTimer = 0;

  // Camera & Viewport (Virtual coordinates: 1000 x 620)
  public readonly VIRTUAL_WIDTH = 1000;
  public readonly VIRTUAL_HEIGHT = 620;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private screenShakeIntensity = 0;

  // Particle limit based on graphics setting
  private maxParticles = 250;
  private equippedCosmetics: Record<string, string> = {};
  private resizeObserver: ResizeObserver | null = null;
  private touchActiveOnCanvas = false;

  constructor(
    canvas: HTMLCanvasElement,
    realm: RealmData,
    callbacks: GameEngineCallbacks,
    settings: GameSettings,
    gameMode: GameMode = 'story',
    abilities: PlayerAbility[] = [],
    equippedCosmetics: Record<string, string> = {}
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;
    this.realm = realm;
    this.callbacks = callbacks;
    this.settings = settings;
    this.gameMode = gameMode;
    this.totalWaves = gameMode === 'endless' ? 999 : realm.totalWaves;
    this.abilities = abilities.map(a => ({ ...a }));
    this.equippedCosmetics = equippedCosmetics;

    // Deep copy nodes
    this.placementNodes = realm.placementNodes.map(n => ({ ...n }));

    // Adjust settings
    this.applySettings(settings);

    // Initial resize
    this.handleResize();
    this.setupInputs();

    // Attach ResizeObserver to container for immediate layout tracking
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  public applySettings(settings: GameSettings) {
    this.settings = settings;
    switch (settings.graphicsQuality) {
      case 'low': this.maxParticles = 80; break;
      case 'medium': this.maxParticles = 160; break;
      case 'high': this.maxParticles = 280; break;
      case 'ultra': this.maxParticles = 450; break;
    }
  }

  public start() {
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    soundEngine.setMusicState('battle', this.realm.musicMood, this.realm.id);
    this.loop(this.lastTimestamp);
    this.callbacks.onWaveChange(this.currentWave, this.totalWaves, this.isWaveActive);
    this.callbacks.onCoreHpChange(this.coreHp, this.coreMaxHp);
    this.callbacks.onEssenceChange(this.spiritEssence);
    this.callbacks.onShardsChange(this.celestialShardsEarned);
    this.callbacks.onScreenReaderNotice(`Entered ${this.realm.name}. Prepare your cultivators.`);
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public setSpeed(speed: number) {
    this.gameSpeed = speed;
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public resetBattle() {
    this.stop();
    this.spiritEssence = 250;
    this.celestialShardsEarned = 0;
    this.coreHp = this.coreMaxHp;
    this.totalKills = 0;
    this.currentWave = 0;
    this.isWaveActive = false;
    this.waveSpawnQueue = [];
    this.waveSpawnTimer = 0;
    this.activeEnemies = [];
    this.activeBoss = null;
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.visualAttackBeams = [];
    this.battleSimulationTime = 0;
    this.placedGuardians.clear();
    this.placementNodes = this.realm.placementNodes.map(n => ({ ...n }));
    this.selectedNode = null;
    this.selectedConfigToPlace = null;
    this.callbacks.onEssenceChange(this.spiritEssence);
    this.callbacks.onShardsChange(this.celestialShardsEarned);
    this.callbacks.onCoreHpChange(this.coreHp, this.coreMaxHp);
    this.callbacks.onWaveChange(this.currentWave, this.totalWaves, this.isWaveActive);
    this.callbacks.onBossStateChange(null);
    this.callbacks.onSelectedGuardianChange(null, null);
    this.start();
  }

  // --- WAVE SYSTEM ---

  public startNextWave() {
    if (this.isWaveActive || (!this.isRunning && this.currentWave > 0)) return;
    this.currentWave++;
    this.isWaveActive = true;
    this.waveSpawnTimer = 0;
    this.waveSpawnQueue = this.generateWaveEnemies(this.currentWave);

    const isBossWave = (this.currentWave % 10 === 0) || (this.currentWave === this.totalWaves);
    if (isBossWave) {
      soundEngine.setMusicState('boss', this.realm.musicMood, this.realm.id);
      this.callbacks.onScreenReaderNotice(`Alert: Boss wave ${this.currentWave} initiated!`);
      this.addFloatingText('BOSS CALAMITY ARRIVES!', this.VIRTUAL_WIDTH / 2, 180, '#ef4444', 28, true);
    } else {
      soundEngine.setMusicState('battle', this.realm.musicMood, this.realm.id);
      this.callbacks.onScreenReaderNotice(`Wave ${this.currentWave} has begun.`);
    }

    this.callbacks.onWaveChange(this.currentWave, this.totalWaves, true);
  }

  private generateWaveEnemies(wave: number): { config: EnemyConfig; delay: number }[] {
    const queue: { config: EnemyConfig; delay: number }[] = [];
    const isBossWave = (wave % 10 === 0) || (wave === this.totalWaves);

    // Number of enemies scales with wave
    const count = Math.min(8 + wave * 2, 36);

    // Territory Difficulty Multiplier
    const difficultyMultipliers: Record<string, number> = {
      EASY: 1.0,
      MEDIUM: 1.35,
      HARD: 1.85,
      EXPERT: 2.6
    };
    const diffMultiplier = difficultyMultipliers[this.realm.difficulty] || 1.0;

    // Progression scaling
    const realmIndex = Math.max(0, REALMS_DATA.findIndex(r => r.id === this.realm.id));
    const areaHpMultiplier = 1 + realmIndex * 0.18;
    const waveHpMultiplier = 1 + (wave - 1) * 0.16;
    const hpScale = waveHpMultiplier * areaHpMultiplier * diffMultiplier;

    // Theme-specific monster selection
    const theme = this.realm.musicMood || 'fire';
    const isLateTerritory = realmIndex >= 5;

    for (let i = 0; i < count; i++) {
      let enemyType = 'emberling';

      if (theme === 'sands') {
        enemyType = Math.random() < 0.6 ? 'sand_stalker' : 'dune_wyrm';
      } else if (theme === 'crystal') {
        enemyType = Math.random() < 0.6 ? 'crystal_scuttler' : 'prismatic_colossus';
      } else if (theme === 'frost') {
        enemyType = Math.random() < 0.5 ? 'frost_wraith' : 'ironhide_beast';
      } else if (theme === 'bamboo') {
        enemyType = Math.random() < 0.5 ? 'void_crawler' : 'soul_leech';
      } else if (theme === 'chaos') {
        enemyType = Math.random() < 0.5 ? 'chaos_abomination' : 'celestial_heretic';
      } else {
        // General distribution based on wave & territory depth
        const roll = Math.random();
        if (wave >= 20 || isLateTerritory) {
          if (roll < 0.2) enemyType = 'chaos_abomination';
          else if (roll < 0.4) enemyType = 'terracotta_soldier';
          else if (roll < 0.6) enemyType = 'magma_drake';
          else if (roll < 0.8) enemyType = 'nether_phantom';
          else enemyType = 'demon_knight';
        } else if (wave >= 12) {
          if (roll < 0.25) enemyType = 'demon_knight';
          else if (roll < 0.5) enemyType = 'spirit_devourer';
          else if (roll < 0.75) enemyType = 'frost_wraith';
          else enemyType = 'shadow_assassin';
        } else if (wave >= 6) {
          if (roll < 0.3) enemyType = 'ironhide_beast';
          else if (roll < 0.6) enemyType = 'soul_leech';
          else if (roll < 0.8) enemyType = 'void_crawler';
          else enemyType = 'emberling';
        } else {
          enemyType = roll < 0.6 ? 'emberling' : 'void_crawler';
        }
      }

      const baseConfig = ENEMIES_DATA[enemyType] || ENEMIES_DATA.emberling;
      const scaledConfig: EnemyConfig = {
        ...baseConfig,
        baseHp: Math.round(baseConfig.baseHp * hpScale),
        rewardEssence: Math.round(baseConfig.rewardEssence * (1 + wave * 0.05))
      };

      queue.push({
        config: scaledConfig,
        delay: i * (1.1 - Math.min(wave * 0.02, 0.6))
      });
    }

    // Mini-boss or Signature Territory Boss
    if (isBossWave) {
      const isFinalBoss = wave === this.totalWaves;
      const REALM_BOSS_MAP: Record<string, string> = {
        emberfall_valley: 'molten_behemoth',
        moonlit_bamboo: 'mist_phantom',
        frozen_heaven: 'glacial_wyrm',
        thundercloud_peaks: 'thunder_lord',
        jade_serpent_river: 'river_dragon_king',
        crimson_lotus_peak: 'vermilion_phoenix',
        whispering_pine_pass: 'grave_watcher',
        golden_sands_dunes: 'dune_empress',
        astral_observatory: 'astral_warden',
        spirit_crystal_caverns: 'crystal_overlord',
        vortex_sky_chasm: 'singularity_devourer',
        molten_iron_foundry: 'forge_titan',
        blighted_bone_marsh: 'nether_lich',
        nine_heavens_spire: 'tribulation_sovereign',
        primordial_chaos_rift: 'chaos_hydra',
        nether_dragon_lair: 'undying_nether_dragon',
        timeless_frost_glacier: 'chrono_frost_colossus',
        celestial_sovereign_throne: 'corrupted_immortal_sovereign',
        abyssal_rift_core: 'abyssal_emperor',
        heart_of_the_last_realm: 'chaos_overlord_genesis',
      };

      const bossKey = isFinalBoss 
        ? (REALM_BOSS_MAP[this.realm.id] || 'abyssal_emperor')
        : (realmIndex > 8 ? 'prismatic_colossus' : 'abyssal_behemoth');

      const rawBoss = ENEMIES_DATA[bossKey] || ENEMIES_DATA.abyssal_emperor;
      const bossConfig: EnemyConfig = {
        ...rawBoss,
        baseHp: Math.round(rawBoss.baseHp * hpScale * (isFinalBoss ? 1.2 : 0.8))
      };

      queue.push({
        config: bossConfig,
        delay: count * 0.8 + 1.5
      });
    }

    return queue;
  }

  // --- GUARDIAN PLACEMENT & UPGRADE ---

  public setSelectedConfigToPlace(config: GuardianConfig | null) {
    this.selectedConfigToPlace = config;
    if (this.callbacks.onSelectedConfigChange) {
      this.callbacks.onSelectedConfigChange(config);
    }
  }

  public clearSelection() {
    this.selectedNode = null;
    this.selectedConfigToPlace = null;
    this.callbacks.onSelectedGuardianChange(null, null);
    if (this.callbacks.onSelectedConfigChange) {
      this.callbacks.onSelectedConfigChange(null);
    }
  }

  public placeGuardian(configId: string, node: PlacementNode): boolean {
    const config = GUARDIANS_DATA.find(g => g.id === configId);
    if (!config) {
      console.warn(`[Emberfall] Configuration not found for guardian: ${configId}`);
      return false;
    }

    // Canonical reference lookup to ensure placementNodes array is properly mutated
    const targetNode = this.placementNodes.find(n => n.id === node.id) || node;
    if (targetNode.placedGuardianInstanceId) {
      this.addFloatingText('Pedestal already occupied!', targetNode.x, targetNode.y - 20, '#f59e0b', 15);
      return false;
    }

    if (this.spiritEssence < config.baseCost) {
      this.addFloatingText('Insufficient Essence!', targetNode.x, targetNode.y - 20, '#ef4444', 16);
      return false;
    }

    this.spiritEssence -= config.baseCost;
    const instanceId = `guardian_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const placed: PlacedGuardian = {
      instanceId,
      configId: config.id,
      x: targetNode.x,
      y: targetNode.y,
      level: 1,
      damageDealt: 0,
      kills: 0,
      lastAttackTime: this.battleSimulationTime - (1 / config.attackSpeed),
      targetPriority: 'first',
      ultimateTimer: config.ultimateCooldown,
      isUltimateActive: false
    };

    targetNode.placedGuardianInstanceId = instanceId;
    node.placedGuardianInstanceId = instanceId;
    this.placedGuardians.set(instanceId, placed);
    this.selectedConfigToPlace = null;
    this.selectedNode = targetNode;
    soundEngine.playPlacement();

    // Spawn placement lotus aura particles
    this.createLotusBurst(targetNode.x, targetNode.y, config.color, 25);
    this.addFloatingText(`${config.name} Deployed!`, targetNode.x, targetNode.y - 30, config.color, 16);

    this.callbacks.onEssenceChange(this.spiritEssence);
    this.callbacks.onSelectedGuardianChange({ ...placed }, targetNode);
    if (this.callbacks.onSelectedConfigChange) {
      this.callbacks.onSelectedConfigChange(null);
    }
    this.callbacks.onScreenReaderNotice(`Deployed ${config.name} at defense node.`);
    return true;
  }

  public upgradeGuardian(instanceId: string): boolean {
    const placed = this.placedGuardians.get(instanceId);
    if (!placed || placed.level >= 10) return false;
    const nextLevel = placed.level + 1;
    const upgradeData = UPGRADE_LEVELS.find(u => u.level === nextLevel);
    if (!upgradeData) return false;

    if (this.spiritEssence < upgradeData.costEssence) {
      this.addFloatingText('Insufficient Essence for Upgrade!', placed.x, placed.y - 20, '#ef4444', 16);
      return false;
    }

    this.spiritEssence -= upgradeData.costEssence;
    placed.level = nextLevel;
    soundEngine.playUpgrade();
    this.screenShakeIntensity = 6;

    // Golden ascension burst scales with level
    this.createAscensionBurst(placed.x, placed.y, '#f59e0b', 35 + nextLevel * 3);
    this.addFloatingText(`Ascended to ${upgradeData.rankName}!`, placed.x, placed.y - 35, '#fbbf24', 18, true);

    this.callbacks.onEssenceChange(this.spiritEssence);
    this.callbacks.onSelectedGuardianChange({ ...placed }, this.selectedNode);
    this.callbacks.onScreenReaderNotice(`Cultivator advanced to rank ${upgradeData.rankName}!`);
    return true;
  }

  public sellGuardian(instanceId: string): boolean {
    const placed = this.placedGuardians.get(instanceId);
    if (!placed) return false;
    const config = GUARDIANS_DATA.find(g => g.id === placed.configId);
    if (!config) return false;

    // Refund 65% of base + upgrades
    let totalInvested = config.baseCost;
    for (let l = 2; l <= placed.level; l++) {
      const u = UPGRADE_LEVELS.find(lvl => lvl.level === l);
      if (u) totalInvested += u.costEssence;
    }
    const refund = Math.round(totalInvested * 0.65);
    this.spiritEssence += refund;

    // Clear node
    const node = this.placementNodes.find(n => n.placedGuardianInstanceId === instanceId);
    if (node) node.placedGuardianInstanceId = undefined;

    this.placedGuardians.delete(instanceId);
    this.createLotusBurst(placed.x, placed.y, '#94a3b8', 20);
    this.addFloatingText(`Dissolved (+${refund} Essence)`, placed.x, placed.y - 20, '#38bdf8', 16);

    this.selectedNode = null;
    this.selectedConfigToPlace = null;
    this.callbacks.onEssenceChange(this.spiritEssence);
    this.callbacks.onSelectedGuardianChange(null, null);
    if (this.callbacks.onSelectedConfigChange) {
      this.callbacks.onSelectedConfigChange(null);
    }
    return true;
  }

  public setTargetPriority(instanceId: string, priority: 'first' | 'last' | 'strongest' | 'closest') {
    const placed = this.placedGuardians.get(instanceId);
    if (placed) {
      placed.targetPriority = priority;
      this.callbacks.onSelectedGuardianChange({ ...placed }, this.selectedNode);
    }
  }

  // --- PLAYER BATTLEFIELD ABILITIES ---

  public castAbility(abilityId: string): boolean {
    const ability = this.abilities.find(a => a.id === abilityId);
    if (!ability || ability.currentCooldown > 0) return false;
    if (this.spiritEssence < ability.costEssence) {
      this.addFloatingText('Insufficient Essence for Art!', this.VIRTUAL_WIDTH / 2, 200, '#ef4444', 18);
      return false;
    }

    this.spiritEssence -= ability.costEssence;
    ability.currentCooldown = ability.cooldown;
    soundEngine.playAbilityCast();
    this.screenShakeIntensity = 12;

    switch (ability.effectType) {
      case 'inferno_dragon':
        soundEngine.playDragonRoar();
        this.activeEnemies.forEach(e => {
          e.hp -= 280;
          e.burnTimer = 6;
          e.burnDps = 35;
          this.createExplosionParticles(e.x, e.y, '#ef4444', 15);
        });
        this.addFloatingText('🔥 INFERNO DRAGON AWAKENED!', this.VIRTUAL_WIDTH / 2, 240, '#f97316', 26, true);
        break;

      case 'heavenly_thunder':
        soundEngine.playLightning();
        // Target up to 6 highest hp enemies
        const sorted = [...this.activeEnemies].sort((a, b) => b.hp - a.hp).slice(0, 6);
        sorted.forEach(e => {
          e.hp -= 340;
          e.freezeTimer = 2.0; // stun
          this.createLightningParticles(e.x, e.y, '#8b5cf6', 20);
        });
        this.addFloatingText('⚡ HEAVENLY THUNDERFALL!', this.VIRTUAL_WIDTH / 2, 240, '#8b5cf6', 26, true);
        break;

      case 'frozen_domain':
        soundEngine.playIce();
        this.activeEnemies.forEach(e => {
          e.freezeTimer = 4.0;
          this.createLotusBurst(e.x, e.y, '#06b6d4', 12);
        });
        this.addFloatingText('❄️ FROZEN DOMAIN ACTIVE!', this.VIRTUAL_WIDTH / 2, 240, '#38bdf8', 26, true);
        break;

      case 'world_cleaving_wind':
        soundEngine.playWind();
        this.activeEnemies.forEach(e => {
          e.pathProgress = Math.max(0, e.pathProgress - 0.15);
          e.defense = Math.max(0, e.defense - 15);
          this.createLotusBurst(e.x, e.y, '#10b981', 14);
        });
        this.addFloatingText('🌪️ WORLD-CLEAVING WIND!', this.VIRTUAL_WIDTH / 2, 240, '#34d399', 26, true);
        break;

      case 'celestial_rebirth':
        soundEngine.playTempleBell(523, 0.4);
        this.coreHp = Math.min(this.coreMaxHp, this.coreHp + Math.round(this.coreMaxHp * 0.25));
        this.doubleEssenceTimer = 15;
        this.createAscensionBurst(this.realm.corePosition.x, this.realm.corePosition.y, '#eab308', 40);
        this.addFloatingText('☯️ CELESTIAL REBIRTH (+25% Core HP)', this.realm.corePosition.x, this.realm.corePosition.y - 40, '#eab308', 22, true);
        break;
    }

    this.callbacks.onEssenceChange(this.spiritEssence);
    this.callbacks.onCoreHpChange(this.coreHp, this.coreMaxHp);
    if (this.activeBoss) {
      this.callbacks.onBossStateChange({ ...this.activeBoss });
    }
    this.callbacks.onScreenReaderNotice(`Activated sacred art: ${ability.name}`);
    return true;
  }

  // --- MAIN GAME LOOP ---

  private loop = (timestamp: number) => {
    if (!this.isRunning) return;
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    // Cap delta time to prevent physics explosions when tab is inactive
    const dt = Math.min(rawDt, 0.1) * (this.isPaused ? 0 : this.gameSpeed);

    if (dt > 0) {
      this.update(dt);
    }
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.battleSimulationTime += dt;

    // Advance visual attack beams (lightning strikes, lasers, dragon breath)
    for (let bIdx = this.visualAttackBeams.length - 1; bIdx >= 0; bIdx--) {
      const b = this.visualAttackBeams[bIdx];
      b.elapsed += dt;
      if (b.elapsed >= b.duration) {
        this.visualAttackBeams.splice(bIdx, 1);
      }
    }

    // 1. Update ability cooldowns
    this.abilities.forEach(a => {
      if (a.currentCooldown > 0) {
        a.currentCooldown = Math.max(0, a.currentCooldown - dt);
      }
    });

    if (this.doubleEssenceTimer > 0) {
      this.doubleEssenceTimer = Math.max(0, this.doubleEssenceTimer - dt);
    }

    // 2. Wave spawning
    if (this.isWaveActive && this.waveSpawnQueue.length > 0) {
      this.waveSpawnTimer += dt;
      while (this.waveSpawnQueue.length > 0 && this.waveSpawnQueue[0].delay <= this.waveSpawnTimer) {
        const item = this.waveSpawnQueue.shift();
        if (item) {
          this.spawnEnemy(item.config);
        }
      }
    }

    // 3. Update Enemies
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];

      // Status effects
      if (enemy.freezeTimer > 0) {
        enemy.freezeTimer = Math.max(0, enemy.freezeTimer - dt);
      }

      if (enemy.slowTimer > 0) {
        enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
        if (enemy.slowTimer <= 0) enemy.slowFactor = 1.0;
      }

      if (enemy.burnTimer > 0) {
        enemy.burnTimer = Math.max(0, enemy.burnTimer - dt);
        const burnDamage = enemy.burnDps * dt;
        enemy.hp -= burnDamage;
        if (enemy.config.isBoss && this.activeBoss) {
          this.callbacks.onBossStateChange({ ...enemy });
        }
        if (Math.random() < 0.25) {
          this.addParticle({
            id: `burn_${Math.random()}`,
            x: enemy.x + (Math.random() - 0.5) * 12,
            y: enemy.y + (Math.random() - 0.5) * 12,
            vx: (Math.random() - 0.5) * 15,
            vy: -25 - Math.random() * 20,
            color: '#f97316',
            size: 3,
            alpha: 1,
            decay: 2.5,
            shape: 'ember'
          });
        }
      }

      // Check death
      if (enemy.hp <= 0) {
        this.handleEnemyDeath(enemy, i);
        continue;
      }

      // Movement if not frozen
      if (enemy.freezeTimer <= 0) {
        this.moveEnemyAlongPath(enemy, dt);
      }

      // Check reaching Realm Core
      if (enemy.pathIndex >= this.realm.path.length - 1) {
        this.handleEnemyReachCore(enemy, i);
      }
    }

    // Check wave completion
    if (this.isWaveActive && this.waveSpawnQueue.length === 0 && this.activeEnemies.length === 0) {
      this.handleWaveCompleted();
    }

    // 4. Update Placed Guardians & Attacks
    this.placedGuardians.forEach(guardian => {
      const config = GUARDIANS_DATA.find(g => g.id === guardian.configId);
      if (!config) return;

      const upgradeData = UPGRADE_LEVELS.find(u => u.level === guardian.level) || UPGRADE_LEVELS[0];
      const effectiveRange = config.baseRange * upgradeData.rangeMultiplier;
      const effectiveAttackSpeed = config.attackSpeed * upgradeData.speedMultiplier;
      const attackInterval = 1 / effectiveAttackSpeed;

      // Ultimate charge
      if (guardian.ultimateTimer > 0) {
        guardian.ultimateTimer = Math.max(0, guardian.ultimateTimer - dt);
      }

      // Check attack target using battle simulation time (scales accurately with 1x, 2x, 3x game speed)
      if (this.battleSimulationTime - guardian.lastAttackTime >= attackInterval) {
        const target = this.findTargetForGuardian(guardian, effectiveRange);
        if (target) {
          this.executeGuardianAttack(guardian, config, upgradeData, target);
          guardian.lastAttackTime = this.battleSimulationTime;
        }
      }
    });

    // 5. Update Projectiles
    for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const p = this.projectiles[pIdx];
      const targetEnemy = this.activeEnemies.find(e => e.id === p.targetEnemyId && e.hp > 0);
      
      // Update destination if enemy still alive
      if (targetEnemy) {
        p.targetX = targetEnemy.x;
        p.targetY = targetEnemy.y;
      }

      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = p.speed * dt;

      // Generous, accurate hitbox: based on target enemy size or default radius
      const targetHitRadius = targetEnemy ? Math.max(16, targetEnemy.size + 4) : 16;

      if (dist <= step || dist <= targetHitRadius) {
        // Hit
        this.handleProjectileHit(p, targetEnemy);
        this.projectiles.splice(pIdx, 1);
      } else {
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;

        // Add elemental trail particle
        if (Math.random() < 0.6) {
          let shape: VisualParticle['shape'] = 'spark';
          let decay = 3.5;
          let pColor = p.trailColor;
          if (p.element === 'fire' || p.element === 'lava' || p.element === 'dragon') {
            shape = 'ember';
          } else if (p.element === 'wind' || p.element === 'shadow') {
            shape = 'slash';
            decay = 4.0;
          } else if (p.element === 'life') {
            shape = 'petal';
            decay = 3.0;
          } else if (p.element === 'sand' || p.element === 'vortex') {
            shape = 'circle';
            decay = 3.0;
          } else if (p.element === 'lightning') {
            shape = 'spark';
            pColor = Math.random() < 0.5 ? '#ffffff' : '#c084fc';
            decay = 4.5;
          }

          this.addParticle({
            id: `trail_${Math.random()}`,
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            color: pColor,
            size: p.scale * 3.5,
            alpha: 0.85,
            decay,
            shape
          });
        }
      }
    }

    // 6. Update Particles
    for (let ptIdx = this.particles.length - 1; ptIdx >= 0; ptIdx--) {
      const pt = this.particles[ptIdx];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.alpha -= pt.decay * dt;
      if (pt.vRot && pt.rotation !== undefined) {
        pt.rotation += pt.vRot * dt;
      }
      if (pt.alpha <= 0) {
        this.particles.splice(ptIdx, 1);
      }
    }

    // 7. Update Floating Texts
    for (let ftIdx = this.floatingTexts.length - 1; ftIdx >= 0; ftIdx--) {
      const ft = this.floatingTexts[ftIdx];
      ft.y += ft.vy * dt;
      ft.alpha -= 0.8 * dt;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(ftIdx, 1);
      }
    }

    // 8. Screen shake decay
    if (this.screenShakeIntensity > 0) {
      this.screenShakeIntensity = Math.max(0, this.screenShakeIntensity - dt * 25);
    }
  }

  // --- ENEMY PATHFINDING & BEHAVIOR ---

  private spawnEnemy(config: EnemyConfig) {
    const id = `enemy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const startPt = this.realm.path[0];

    const activeEnemy: ActiveEnemy = {
      id,
      config,
      maxHp: config.baseHp,
      hp: config.baseHp,
      defense: config.defense || 0,
      x: startPt.x,
      y: startPt.y,
      speed: config.speed,
      pathIndex: 0,
      pathProgress: 0,
      totalDistanceTraveled: 0,
      size: config.size,
      slowFactor: 1.0,
      slowTimer: 0,
      freezeTimer: 0,
      burnTimer: 0,
      burnDps: 0,
      stealthVisible: true
    };

    this.activeEnemies.push(activeEnemy);
    if (config.isBoss) {
      this.activeBoss = activeEnemy;
      this.callbacks.onBossStateChange({ ...activeEnemy });
    }
  }

  private moveEnemyAlongPath(enemy: ActiveEnemy, dt: number) {
    const path = this.realm.path;
    if (enemy.pathIndex >= path.length - 1) return;

    const cur = path[enemy.pathIndex];
    const next = path[enemy.pathIndex + 1];

    const segDx = next.x - cur.x;
    const segDy = next.y - cur.y;
    const segLength = Math.sqrt(segDx * segDx + segDy * segDy);

    const actualSpeed = enemy.speed * enemy.slowFactor;
    const distanceStep = actualSpeed * dt;
    enemy.totalDistanceTraveled += distanceStep;

    enemy.pathProgress += distanceStep / segLength;

    if (enemy.pathProgress >= 1.0) {
      enemy.pathIndex++;
      enemy.pathProgress = 0;
      if (enemy.pathIndex >= path.length - 1) {
        enemy.x = path[path.length - 1].x;
        enemy.y = path[path.length - 1].y;
        return;
      }
    }

    const currentStart = path[enemy.pathIndex];
    const currentEnd = path[enemy.pathIndex + 1];
    enemy.x = currentStart.x + (currentEnd.x - currentStart.x) * enemy.pathProgress;
    enemy.y = currentStart.y + (currentEnd.y - currentStart.y) * enemy.pathProgress;
  }

  private handleEnemyDeath(enemy: ActiveEnemy, index: number) {
    this.activeEnemies.splice(index, 1);
    this.totalKills++;

    const essenceYield = Math.round(enemy.config.rewardEssence * (this.doubleEssenceTimer > 0 ? 2.0 : 1.0) * this.essenceMultiplier);
    this.spiritEssence += essenceYield;
    this.celestialShardsEarned += enemy.config.rewardShards;

    soundEngine.playEnemyDefeat();
    this.createLotusBurst(enemy.x, enemy.y, enemy.config.color, enemy.config.isBoss ? 45 : 16);
    this.addFloatingText(`+${essenceYield} Essence`, enemy.x, enemy.y - 12, '#38bdf8', 14);

    if (enemy.config.rewardShards > 0) {
      this.addFloatingText(`+${enemy.config.rewardShards} ✦`, enemy.x, enemy.y - 28, '#fbbf24', 14);
    }

    if (enemy.config.isBoss) {
      this.activeBoss = null;
      this.callbacks.onBossStateChange(null);
      soundEngine.setMusicState('battle', this.realm.musicMood, this.realm.id);
      this.screenShakeIntensity = 10;
      this.addFloatingText('BOSS SLAIN!', enemy.x, enemy.y - 45, '#fbbf24', 24, true);
    }

    this.callbacks.onEssenceChange(this.spiritEssence);
    this.callbacks.onShardsChange(this.celestialShardsEarned);
  }

  private handleEnemyReachCore(enemy: ActiveEnemy, index: number) {
    this.activeEnemies.splice(index, 1);
    const damage = enemy.config.isBoss ? 350 : Math.round(enemy.hp * 0.4 + 15);
    this.coreHp = Math.max(0, this.coreHp - damage);

    soundEngine.playCoreHit();
    this.screenShakeIntensity = enemy.config.isBoss ? 16 : 8;
    this.createExplosionParticles(this.realm.corePosition.x, this.realm.corePosition.y, '#ef4444', 25);
    this.addFloatingText(`-${damage} Core Integrity!`, this.realm.corePosition.x, this.realm.corePosition.y - 25, '#ef4444', 18, true);

    if (enemy.config.isBoss) {
      this.activeBoss = null;
      this.callbacks.onBossStateChange(null);
    }

    this.callbacks.onCoreHpChange(this.coreHp, this.coreMaxHp);

    if (this.coreHp <= 0) {
      this.handleDefeat();
    }
  }

  private handleWaveCompleted() {
    this.isWaveActive = false;
    soundEngine.playTempleBell(523, 0.25);
    this.addFloatingText(`WAVE ${this.currentWave} REPELLED!`, this.VIRTUAL_WIDTH / 2, 200, '#34d399', 24, true);

    // End-of-wave essence bonus
    const waveBonus = 40 + this.currentWave * 5;
    this.spiritEssence += waveBonus;
    this.callbacks.onEssenceChange(this.spiritEssence);
    this.callbacks.onWaveChange(this.currentWave, this.totalWaves, false);

    if (this.currentWave >= this.totalWaves && this.gameMode !== 'endless') {
      this.handleVictory();
    }
  }

  private handleVictory() {
    this.stop();
    soundEngine.setMusicState('victory', this.realm.musicMood, this.realm.id);
    const stars = this.coreHp >= this.coreMaxHp * 0.9 ? 3 : this.coreHp >= this.coreMaxHp * 0.4 ? 2 : 1;
    const finalShards = this.celestialShardsEarned + this.realm.firstClearReward;
    this.callbacks.onVictory(stars, finalShards, this.totalKills);
  }

  private handleDefeat() {
    this.stop();
    soundEngine.setMusicState('defeat', this.realm.musicMood, this.realm.id);
    this.callbacks.onDefeat(this.currentWave, this.totalKills);
  }

  // --- TARGETING & COMBAT ---

  private findTargetForGuardian(guardian: PlacedGuardian, range: number): ActiveEnemy | null {
    const inRange = this.activeEnemies.filter(e => {
      if (e.hp <= 0) return false;
      const dx = e.x - guardian.x;
      const dy = e.y - guardian.y;
      return Math.sqrt(dx * dx + dy * dy) <= (range + e.size * 0.4);
    });

    if (inRange.length === 0) return null;

    switch (guardian.targetPriority) {
      case 'strongest':
        return inRange.reduce((prev, curr) => curr.hp > prev.hp ? curr : prev);
      case 'last':
        return inRange.reduce((prev, curr) => curr.totalDistanceTraveled < prev.totalDistanceTraveled ? curr : prev);
      case 'closest':
        return inRange.reduce((prev, curr) => {
          const dCurr = Math.hypot(curr.x - guardian.x, curr.y - guardian.y);
          const dPrev = Math.hypot(prev.x - guardian.x, prev.y - guardian.y);
          return dCurr < dPrev ? curr : prev;
        });
      case 'first':
      default:
        return inRange.reduce((prev, curr) => curr.totalDistanceTraveled > prev.totalDistanceTraveled ? curr : prev);
    }
  }

  private executeGuardianAttack(
    guardian: PlacedGuardian,
    config: GuardianConfig,
    upgrade: typeof UPGRADE_LEVELS[0],
    target: ActiveEnemy
  ) {
    const rawDamage = config.baseDamage * upgrade.damageMultiplier;
    const isCrit = Math.random() < 0.15;
    const finalDamage = Math.round(rawDamage * (isCrit ? 1.75 : 1.0));

    // Elemental procedural audio dispatch
    switch (config.element) {
      case 'fire': soundEngine.playFireball(); break;
      case 'lightning': soundEngine.playLightning(); break;
      case 'ice': soundEngine.playIce(); break;
      case 'wind': soundEngine.playWind(); break;
      case 'dragon': soundEngine.playSwordQi(); break;
      case 'metal': soundEngine.playMetalClash(); break;
      case 'lava': soundEngine.playLavaExplosion(); break;
      case 'sand': soundEngine.playSandSwirl(); break;
      case 'crystal': soundEngine.playCrystalResonance(); break;
      case 'vortex': soundEngine.playVortexPull(); break;
      case 'shadow': soundEngine.playSwordQi(); break;
      case 'celestial': soundEngine.playTempleBell(880, 0.2); break;
      case 'life': soundEngine.playTempleBell(659, 0.15); break;
      default: soundEngine.playSwordQi(); break;
    }

    // Determine projectile properties
    const isAoe = config.element === 'fire' || config.element === 'dragon' || config.element === 'lava';
    let aoeRadius = 0;
    if (config.element === 'lava') aoeRadius = 55;
    else if (config.element === 'fire') aoeRadius = 40;
    else if (config.element === 'dragon') aoeRadius = 45;

    let projSpeed = 470;
    if (config.element === 'celestial') projSpeed = 580;
    else if (config.element === 'shadow') projSpeed = 540;
    else if (config.element === 'lightning') projSpeed = 540;
    else if (config.element === 'wind') projSpeed = 520;
    else if (config.element === 'metal') projSpeed = 500;
    else if (config.element === 'crystal') projSpeed = 500;
    else if (config.element === 'ice') projSpeed = 480;
    else if (config.element === 'sand') projSpeed = 460;
    else if (config.element === 'life') projSpeed = 460;
    else if (config.element === 'vortex') projSpeed = 440;
    else if (config.element === 'lava') projSpeed = 420;

    // Launch traveling elemental projectile toward targeted monster
    this.projectiles.push({
      id: `proj_${Math.random()}`,
      guardianId: guardian.instanceId,
      guardianLevel: guardian.level,
      guardianConfigId: guardian.configId,
      element: config.element,
      x: guardian.x,
      y: guardian.y,
      targetX: target.x,
      targetY: target.y,
      targetEnemyId: target.id,
      damage: finalDamage,
      speed: projSpeed,
      aoeRadius,
      trailColor: config.color,
      scale: 1 + (guardian.level - 1) * 0.12
    });

    // Add visible connecting attack beam/arc for lightning, laser, and dragon breath
    if (config.element === 'lightning') {
      this.addVisualBeam({
        id: `beam_${Math.random()}`,
        startX: guardian.x,
        startY: guardian.y,
        targetX: target.x,
        targetY: target.y,
        color: config.color,
        secondaryColor: config.secondaryColor || '#ec4899',
        duration: 0.16,
        elapsed: 0,
        type: 'lightning'
      });
    } else if (config.element === 'crystal') {
      this.addVisualBeam({
        id: `beam_${Math.random()}`,
        startX: guardian.x,
        startY: guardian.y,
        targetX: target.x,
        targetY: target.y,
        color: config.color,
        secondaryColor: config.secondaryColor || '#a855f7',
        duration: 0.14,
        elapsed: 0,
        type: 'laser'
      });
    } else if (config.element === 'dragon') {
      this.addVisualBeam({
        id: `beam_${Math.random()}`,
        startX: guardian.x,
        startY: guardian.y,
        targetX: target.x,
        targetY: target.y,
        color: config.color,
        secondaryColor: config.secondaryColor || '#38bdf8',
        duration: 0.18,
        elapsed: 0,
        type: 'dragon_breath'
      });
    } else if (config.element === 'shadow') {
      this.createSlashEffect(target.x, target.y, config.color);
    }
  }

  public addVisualBeam(beam: VisualAttackBeam) {
    this.visualAttackBeams.push(beam);
  }

  private createElementalImpact(element: ElementType, x: number, y: number, color: string) {
    switch (element) {
      case 'lightning': {
        for (let i = 0; i < 7; i++) {
          const angle = (Math.PI * 2 * i) / 7 + (Math.random() - 0.5) * 0.5;
          const spd = 40 + Math.random() * 45;
          this.addParticle({
            id: `lt_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: Math.random() < 0.5 ? '#ffffff' : color,
            size: 2.5 + Math.random() * 2.5,
            alpha: 1.0,
            decay: 3.2,
            shape: 'spark'
          });
        }
        break;
      }
      case 'fire': {
        for (let i = 0; i < 7; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 30 + Math.random() * 35;
          this.addParticle({
            id: `fire_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - 15,
            color: Math.random() < 0.6 ? '#f97316' : '#ef4444',
            size: 3 + Math.random() * 3,
            alpha: 1.0,
            decay: 2.8,
            shape: 'ember'
          });
        }
        break;
      }
      case 'lava': {
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 25 + Math.random() * 40;
          this.addParticle({
            id: `lava_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - 10,
            color: Math.random() < 0.5 ? '#ea580c' : '#fef08a',
            size: 3.5 + Math.random() * 3,
            alpha: 1.0,
            decay: 2.4,
            shape: 'ember'
          });
        }
        break;
      }
      case 'ice': {
        for (let i = 0; i < 7; i++) {
          const angle = (Math.PI * 2 * i) / 7;
          const spd = 28 + Math.random() * 30;
          this.addParticle({
            id: `ice_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: Math.random() < 0.5 ? '#e0f2fe' : '#38bdf8',
            size: 2.5 + Math.random() * 2.5,
            alpha: 1.0,
            decay: 2.5,
            shape: 'spark'
          });
        }
        break;
      }
      case 'wind': {
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 45 + Math.random() * 45;
          this.addParticle({
            id: `wind_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: '#34d399',
            size: 3 + Math.random() * 2,
            alpha: 0.9,
            decay: 3.4,
            shape: 'slash'
          });
        }
        break;
      }
      case 'metal': {
        for (let i = 0; i < 7; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 40 + Math.random() * 45;
          this.addParticle({
            id: `metal_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: Math.random() < 0.5 ? '#fef08a' : '#eab308',
            size: 2.5 + Math.random() * 2.5,
            alpha: 1.0,
            decay: 3.5,
            shape: 'spark'
          });
        }
        break;
      }
      case 'sand': {
        for (let i = 0; i < 7; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 25 + Math.random() * 35;
          this.addParticle({
            id: `sand_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: Math.random() < 0.5 ? '#f59e0b' : '#d97706',
            size: 3 + Math.random() * 2.5,
            alpha: 0.95,
            decay: 2.6,
            shape: 'circle'
          });
        }
        break;
      }
      case 'crystal': {
        for (let i = 0; i < 7; i++) {
          const angle = (Math.PI * 2 * i) / 7;
          const spd = 30 + Math.random() * 35;
          this.addParticle({
            id: `crys_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: Math.random() < 0.5 ? '#f472b6' : '#c084fc',
            size: 3 + Math.random() * 2.5,
            alpha: 1.0,
            decay: 3.0,
            shape: 'spark'
          });
        }
        break;
      }
      case 'vortex': {
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 30 + Math.random() * 30;
          this.addParticle({
            id: `vort_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: '#818cf8',
            size: 3 + Math.random() * 3,
            alpha: 0.9,
            decay: 2.8,
            shape: 'circle'
          });
        }
        break;
      }
      case 'celestial': {
        for (let i = 0; i < 7; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 35 + Math.random() * 40;
          this.addParticle({
            id: `cel_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: Math.random() < 0.5 ? '#ffffff' : '#facc15',
            size: 2.5 + Math.random() * 2.5,
            alpha: 1.0,
            decay: 3.2,
            shape: 'spark'
          });
        }
        break;
      }
      case 'shadow': {
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 30 + Math.random() * 35;
          this.addParticle({
            id: `shd_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: '#a855f7',
            size: 3.5 + Math.random() * 2.5,
            alpha: 0.9,
            decay: 3.0,
            shape: 'slash'
          });
        }
        break;
      }
      case 'life': {
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 25 + Math.random() * 30;
          this.addParticle({
            id: `life_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: '#4ade80',
            size: 3 + Math.random() * 2.5,
            alpha: 0.95,
            decay: 2.5,
            shape: 'petal',
            rotation: Math.random() * Math.PI,
            vRot: (Math.random() - 0.5) * 5
          });
        }
        break;
      }
      case 'dragon': {
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 35 + Math.random() * 40;
          this.addParticle({
            id: `drg_imp_${Math.random()}`,
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: Math.random() < 0.5 ? '#38bdf8' : '#0284c7',
            size: 3 + Math.random() * 3,
            alpha: 1.0,
            decay: 2.8,
            shape: 'ember'
          });
        }
        break;
      }
      default: {
        this.createLotusBurst(x, y, color, 8);
        break;
      }
    }
  }

  private handleProjectileHit(p: Projectile, directTarget?: ActiveEnemy) {
    const color = p.trailColor || '#f97316';
    const guardian = this.placedGuardians.get(p.guardianId);

    // Find hit enemy
    let hitEnemy = (directTarget && directTarget.hp > 0) ? directTarget : null;

    if (!hitEnemy) {
      hitEnemy = this.activeEnemies.find(e => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= (e.size + 24)) || null;
    }
    if (!hitEnemy) {
      hitEnemy = this.activeEnemies.find(e => e.hp > 0 && Math.hypot(e.x - p.targetX, e.y - p.targetY) <= (e.size + 30)) || null;
    }

    const hitX = hitEnemy ? hitEnemy.x : p.targetX;
    const hitY = hitEnemy ? hitEnemy.y : p.targetY;

    // Trigger dedicated elemental impact visual effect
    this.createElementalImpact(p.element, hitX, hitY, color);

    if (p.aoeRadius > 0) {
      // AOE explosion (Fire, Lava, Dragon)
      this.activeEnemies.forEach(e => {
        if (e.hp <= 0) return;
        const dist = Math.hypot(e.x - hitX, e.y - hitY);
        if (dist <= p.aoeRadius + e.size) {
          const effectiveDef = p.element === 'metal' ? Math.floor(e.defense * 0.5) : e.defense;
          const isWeak = e.config.elementWeakness === p.element;
          const dmgMult = isWeak ? 1.4 : 1.0;
          const dmg = Math.max(1, Math.round((p.damage - effectiveDef) * dmgMult));
          e.hp -= dmg;
          if (guardian) guardian.damageDealt += dmg;

          if (p.element === 'fire' || p.element === 'lava') {
            e.burnTimer = 3.5;
            e.burnDps = p.element === 'lava' ? 30 : 20;
          }
          this.addFloatingText(`${dmg}`, e.x, e.y - 10, color, 14);
          if (isWeak) {
            this.addFloatingText('WEAKNESS!', e.x, e.y - 25, '#fbbf24', 11, true);
          }
          if (e.config.isBoss) {
            this.callbacks.onBossStateChange({ ...e });
          }
        }
      });
    } else if (hitEnemy) {
      // Direct single-target hit: calculate defense reduction, status effects & weakness
      const effectiveDef = p.element === 'metal' 
        ? Math.floor(hitEnemy.defense * 0.5) 
        : p.element === 'crystal' 
          ? Math.max(0, hitEnemy.defense - 2) 
          : hitEnemy.defense;

      if (p.element === 'crystal') {
        hitEnemy.defense = Math.max(0, hitEnemy.defense - 1);
      }

      const isWeak = hitEnemy.config.elementWeakness === p.element;
      const dmgMult = isWeak ? 1.4 : 1.0;
      const dmg = Math.max(1, Math.round((p.damage - effectiveDef) * dmgMult));
      hitEnemy.hp -= dmg;
      if (guardian) guardian.damageDealt += dmg;

      // Elemental status effects
      if (p.element === 'ice') {
        hitEnemy.slowFactor = 0.50;
        hitEnemy.slowTimer = 3.0;
      } else if (p.element === 'sand') {
        hitEnemy.slowFactor = 0.65;
        hitEnemy.slowTimer = 2.5;
      } else if (p.element === 'vortex') {
        hitEnemy.pathProgress = Math.max(0, hitEnemy.pathProgress - 0.04);
        // Minor pull for nearby enemies
        this.activeEnemies.forEach(e => {
          if (e.hp > 0 && e.id !== hitEnemy!.id && Math.hypot(e.x - hitEnemy!.x, e.y - hitEnemy!.y) <= 70) {
            e.pathProgress = Math.max(0, e.pathProgress - 0.025);
            const splashDmg = Math.max(1, Math.round(dmg * 0.4));
            e.hp -= splashDmg;
            if (guardian) guardian.damageDealt += splashDmg;
          }
        });
      }

      this.addFloatingText(`${dmg}`, hitEnemy.x, hitEnemy.y - 10, color, 14);
      if (isWeak) {
        this.addFloatingText('WEAKNESS!', hitEnemy.x, hitEnemy.y - 25, '#fbbf24', 11, true);
      }

      if (hitEnemy.config.isBoss) {
        this.callbacks.onBossStateChange({ ...hitEnemy });
      }

      // Identify attacker configuration and upgrade level
      const guardianLevel = guardian?.level ?? p.guardianLevel ?? 1;
      const guardianConfigId = guardian?.configId ?? p.guardianConfigId ?? '';
      const isMaxUpgrade = guardianLevel >= 10;

      // Thunder Immortal Tower — Maximum Upgrade (Level 10 Sovereign)
      // When Thunder Immortal attacks at max upgrade, the primary hit strikes the targeted monster,
      // and the lightning chains to additional nearby monsters with connected electric arcs and damage.
      // Strictly preserved: do NOT add chain effect to lower upgrade levels.
      if (guardianConfigId === 'thunder_immortal' && isMaxUpgrade) {
        soundEngine.playLightning();
        let prevTarget = hitEnemy;
        const hitList = [hitEnemy];
        const chainRadius = 150;

        // Chain between up to 4 additional nearby enemies
        for (let c = 0; c < 4; c++) {
          const candidates = this.activeEnemies.filter(e =>
            e.hp > 0 &&
            !hitList.includes(e) &&
            (Math.hypot(e.x - prevTarget.x, e.y - prevTarget.y) <= chainRadius ||
             Math.hypot(e.x - hitEnemy.x, e.y - hitEnemy.y) <= chainRadius)
          ).sort((a, b) =>
            Math.hypot(a.x - prevTarget.x, a.y - prevTarget.y) - Math.hypot(b.x - prevTarget.x, b.y - prevTarget.y)
          );

          const nextTarget = candidates[0];
          if (nextTarget) {
            hitList.push(nextTarget);

            // Connect with visible crackling chain lightning arc
            this.addVisualBeam({
              id: `chain_${Math.random()}`,
              startX: prevTarget.x,
              startY: prevTarget.y,
              targetX: nextTarget.x,
              targetY: nextTarget.y,
              color: '#c084fc',
              secondaryColor: '#f472b6',
              duration: 0.18,
              elapsed: 0,
              type: 'chain_lightning'
            });

            // Impact electric spark burst on chained enemy
            this.createElementalImpact('lightning', nextTarget.x, nextTarget.y, '#e879f9');

            const chainWeak = nextTarget.config.elementWeakness === 'lightning';
            const chainDmgMult = chainWeak ? 1.4 : 1.0;
            const chainDmg = Math.max(1, Math.round((p.damage * 0.8 - nextTarget.defense) * chainDmgMult));
            nextTarget.hp -= chainDmg;
            if (guardian) guardian.damageDealt += chainDmg;

            this.addFloatingText(`${chainDmg}`, nextTarget.x, nextTarget.y - 10, '#c084fc', 13);
            if (chainWeak) {
              this.addFloatingText('WEAKNESS!', nextTarget.x, nextTarget.y - 25, '#fbbf24', 11, true);
            }
            if (nextTarget.config.isBoss) {
              this.callbacks.onBossStateChange({ ...nextTarget });
            }
            prevTarget = nextTarget;
          }
        }
      }

      // Frozen Empress Tower — Maximum Upgrade (Level 10 Sovereign)
      // When Frozen Empress attacks at max upgrade, the primary hit strikes the targeted monster,
      // and the attack spreads to additional nearby monsters with connected crystalline frost beams,
      // permafrost slow chill, and frost damage.
      // Strictly preserved: do NOT add spread effect to lower upgrade levels.
      if (guardianConfigId === 'frost_empress' && isMaxUpgrade) {
        soundEngine.playIceShatter();
        let prevFrostTarget = hitEnemy;
        const frostHitList = [hitEnemy];
        const spreadRadius = 150;

        // Spread to up to 4 additional nearby enemies
        for (let c = 0; c < 4; c++) {
          const candidates = this.activeEnemies.filter(e =>
            e.hp > 0 &&
            !frostHitList.includes(e) &&
            (Math.hypot(e.x - prevFrostTarget.x, e.y - prevFrostTarget.y) <= spreadRadius ||
             Math.hypot(e.x - hitEnemy.x, e.y - hitEnemy.y) <= spreadRadius)
          ).sort((a, b) =>
            Math.hypot(a.x - prevFrostTarget.x, a.y - prevFrostTarget.y) - Math.hypot(b.x - prevFrostTarget.x, b.y - prevFrostTarget.y)
          );

          const nextFrostTarget = candidates[0];
          if (nextFrostTarget) {
            frostHitList.push(nextFrostTarget);

            // Connect with visible crystal frost chain beam
            this.addVisualBeam({
              id: `frost_chain_${Math.random()}`,
              startX: prevFrostTarget.x,
              startY: prevFrostTarget.y,
              targetX: nextFrostTarget.x,
              targetY: nextFrostTarget.y,
              color: '#06b6d4',
              secondaryColor: '#e0f2fe',
              duration: 0.22,
              elapsed: 0,
              type: 'frost_chain'
            });

            // Impact visual effect: ice frost shatter
            this.createElementalImpact('ice', nextFrostTarget.x, nextFrostTarget.y, '#38bdf8');

            // Apply slowing permafrost chill
            nextFrostTarget.slowFactor = 0.45;
            nextFrostTarget.slowTimer = 3.2;

            // Secondary spread damage (85% of base hit)
            const chainWeak = nextFrostTarget.config.elementWeakness === 'ice';
            const chainDmgMult = chainWeak ? 1.4 : 1.0;
            const chainDmg = Math.max(1, Math.round((p.damage * 0.85 - nextFrostTarget.defense) * chainDmgMult));
            nextFrostTarget.hp -= chainDmg;
            if (guardian) guardian.damageDealt += chainDmg;

            this.addFloatingText(`${chainDmg}`, nextFrostTarget.x, nextFrostTarget.y - 10, '#38bdf8', 13);
            if (chainWeak) {
              this.addFloatingText('WEAKNESS!', nextFrostTarget.x, nextFrostTarget.y - 25, '#fbbf24', 11, true);
            }
            if (nextFrostTarget.config.isBoss) {
              this.callbacks.onBossStateChange({ ...nextFrostTarget });
            }
            prevFrostTarget = nextFrostTarget;
          }
        }
      }
    }
  }

  // --- VFX & PARTICLES ---

  public addParticle(p: VisualParticle) {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push(p);
  }

  public addFloatingText(text: string, x: number, y: number, color = '#ffffff', fontSize = 14, isCrit = false) {
    this.floatingTexts.push({
      id: `ft_${Math.random()}`,
      text,
      x,
      y,
      vy: -35,
      color,
      alpha: 1.0,
      fontSize,
      isCrit
    });
  }

  private createLotusBurst(x: number, y: number, color: string, count = 15) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 25 + Math.random() * 45;
      this.addParticle({
        id: `lotus_${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 3,
        alpha: 1.0,
        decay: 1.8 + Math.random(),
        shape: 'petal',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 4
      });
    }
  }

  private createAscensionBurst(x: number, y: number, color: string, count = 30) {
    for (let i = 0; i < count; i++) {
      this.addParticle({
        id: `asc_${Math.random()}`,
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 60,
        vy: -40 - Math.random() * 70,
        color,
        size: 3.5 + Math.random() * 3,
        alpha: 1.0,
        decay: 1.4,
        shape: 'ember'
      });
    }
  }

  private createExplosionParticles(x: number, y: number, color: string, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.addParticle({
        id: `exp_${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 4,
        alpha: 1.0,
        decay: 2.2,
        shape: 'spark'
      });
    }
  }

  private createLightningParticles(x: number, y: number, color: string, count = 12) {
    for (let i = 0; i < count; i++) {
      this.addParticle({
        id: `lt_${Math.random()}`,
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 50,
        vy: (Math.random() - 0.5) * 50,
        color,
        size: 2 + Math.random() * 3,
        alpha: 1.0,
        decay: 3.0,
        shape: 'spark'
      });
    }
  }

  private createSlashEffect(x: number, y: number, color: string) {
    for (let i = 0; i < 10; i++) {
      this.addParticle({
        id: `sl_${Math.random()}`,
        x,
        y,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        color,
        size: 4,
        alpha: 1,
        decay: 2.5,
        shape: 'slash'
      });
    }
  }

  // --- RENDERING PIPELINE ---

  private render() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Keep internal canvas resolution strictly synced with display container
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.floor(rect.width * dpr);
      const targetH = Math.floor(rect.height * dpr);
      if (Math.abs(width - targetW) > 2 || Math.abs(height - targetH) > 2) {
        this.handleResize();
      }
    }

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply camera transformation & screen shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShakeIntensity > 0 && this.settings.screenShake) {
      shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
    }

    ctx.translate(this.offsetX + shakeX, this.offsetY + shakeY);
    ctx.scale(this.scale, this.scale);

    // 1. Draw Realm Background & Inkwash Landscape
    this.renderRealmBackground(ctx);

    // 2. Draw Spiritual Path
    this.renderPath(ctx);

    // 3. Draw Placement Pedestals & Nodes
    this.renderPlacementNodes(ctx);

    // 4. Draw Realm Core
    this.renderRealmCore(ctx);

    // 5. Draw Placed Guardians
    this.renderPlacedGuardians(ctx);

    // 6. Draw Enemies
    this.renderEnemies(ctx);

    // 7. Draw Visual Attack Beams (Lightning arcs, lasers, dragon breath)
    this.renderVisualAttackBeams(ctx);

    // 8. Draw Projectiles
    this.renderProjectiles(ctx);

    // 9. Draw Visual Particles
    this.renderParticles(ctx);

    // 9. Draw Floating Numbers & Notifications
    if (this.settings.showDamageNumbers) {
      this.renderFloatingTexts(ctx);
    }

    // 10. Draw Dragging Guardian Preview or Selected Node Preview
    if (this.isDragging && this.draggingGuardianConfig) {
      this.renderDraggingGuardian(ctx);
    } else if (this.selectedNode && this.selectedConfigToPlace && !this.selectedNode.placedGuardianInstanceId) {
      this.renderSelectedNodePreview(ctx);
    }

    ctx.restore();
  }

  private renderRealmBackground(ctx: CanvasRenderingContext2D) {
    const [c1, c2] = this.realm.bgGradient;
    const grad = ctx.createLinearGradient(0, 0, this.VIRTUAL_WIDTH, this.VIRTUAL_HEIGHT);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.VIRTUAL_WIDTH, this.VIRTUAL_HEIGHT);

    // Donghua Ink-Wash Mountain Silhouettes in background
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, 220);
    ctx.bezierCurveTo(150, 120, 300, 260, 480, 140);
    ctx.bezierCurveTo(620, 40, 780, 200, 1000, 130);
    ctx.lineTo(1000, 620);
    ctx.lineTo(0, 620);
    ctx.closePath();
    ctx.fill();

    // Secondary lower ridge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, 320);
    ctx.bezierCurveTo(220, 240, 400, 360, 600, 280);
    ctx.bezierCurveTo(750, 220, 880, 340, 1000, 270);
    ctx.lineTo(1000, 620);
    ctx.lineTo(0, 620);
    ctx.closePath();
    ctx.fill();

    // Floating mountain islands or spiritual clouds based on theme
    if (this.realm.theme === 'floating_mountains' || this.realm.theme === 'volcanic_mountains') {
      this.renderFloatingIslands(ctx);
    }

    ctx.restore();
  }

  private renderFloatingIslands(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.strokeStyle = this.realm.accentColor;
    ctx.lineWidth = 1;

    // Small floating crag 1
    ctx.beginPath();
    ctx.ellipse(220, 80, 45, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Small floating crag 2
    ctx.beginPath();
    ctx.ellipse(750, 90, 55, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private renderPath(ctx: CanvasRenderingContext2D) {
    const path = this.realm.path;
    if (path.length < 2) return;

    ctx.save();

    // Path ambient outer glow
    ctx.strokeStyle = this.realm.accentColor;
    ctx.lineWidth = 42;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    // Path stone/ink foundation
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 32;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    // Center spiritual Qi stream
    ctx.strokeStyle = this.realm.accentColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 12]);
    ctx.lineDashOffset = -performance.now() * 0.02;
    ctx.globalAlpha = 0.6;
    ctx.stroke();

    ctx.restore();
  }

  private renderPlacementNodes(ctx: CanvasRenderingContext2D) {
    const time = performance.now() * 0.002;
    const selectedToPlace = this.selectedConfigToPlace;

    this.placementNodes.forEach(node => {
      const isSelected = this.selectedNode?.id === node.id;
      const isOccupied = !!node.placedGuardianInstanceId;

      ctx.save();
      ctx.translate(node.x, node.y);

      // Stone Pedestal
      ctx.fillStyle = isOccupied ? 'rgba(30, 41, 59, 0.9)' : (selectedToPlace && !isOccupied ? 'rgba(30, 27, 20, 0.85)' : 'rgba(15, 23, 42, 0.75)');
      ctx.strokeStyle = isSelected 
        ? '#fbbf24' 
        : isOccupied 
        ? '#38bdf8' 
        : (selectedToPlace && !isOccupied ? (selectedToPlace.color || '#f59e0b') : 'rgba(255, 255, 255, 0.25)');
      ctx.lineWidth = isSelected ? 2.5 : (selectedToPlace && !isOccupied ? 2.0 : 1.5);

      // Octagonal Bagua Pedestal
      ctx.beginPath();
      const r = 24;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Empty Node Symbol
      if (!isOccupied) {
        ctx.fillStyle = selectedToPlace ? '#fbbf24' : 'rgba(255, 255, 255, 0.4)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☯', 0, 0);

        if (selectedToPlace) {
          // Prominent pulsating beacon ring indicating valid placement target on touch devices
          const pulse = Math.sin(time * 3 + node.x * 0.05) * 4;
          ctx.strokeStyle = selectedToPlace.color || '#f59e0b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, r + 6 + pulse, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Gentle breathing pulse if not occupied
          const pulse = Math.sin(time + node.x) * 3;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.arc(0, 0, r + 4 + pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.restore();
    });
  }

  private renderSelectedNodePreview(ctx: CanvasRenderingContext2D) {
    if (!this.selectedNode || !this.selectedConfigToPlace) return;
    const config = this.selectedConfigToPlace;

    ctx.save();
    ctx.translate(this.selectedNode.x, this.selectedNode.y);

    // Range preview dashed circle
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, config.baseRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = config.color;
    ctx.globalAlpha = 0.12;
    ctx.fill();

    // Ghost Cultivator avatar
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderRealmCore(ctx: CanvasRenderingContext2D) {
    const core = this.realm.corePosition;
    const time = performance.now() * 0.003;
    const relic = this.equippedCosmetics['core_relic'];

    ctx.save();
    ctx.translate(core.x, core.y);

    // Glowing protective spiritual field (customized by relic)
    const pulse = Math.sin(time) * 4;
    let fieldColorInner = 'rgba(56, 189, 248, 0.8)';
    let fieldColorMid = 'rgba(14, 165, 233, 0.3)';
    let fieldColorOuter = 'rgba(3, 105, 161, 0)';
    let coreRingColor = '#38bdf8';

    if (relic === 'relic_phoenix_core') {
      fieldColorInner = 'rgba(249, 115, 22, 0.85)';
      fieldColorMid = 'rgba(234, 88, 12, 0.35)';
      fieldColorOuter = 'rgba(194, 65, 12, 0)';
      coreRingColor = '#f97316';
    } else if (relic === 'relic_glacial_core') {
      fieldColorInner = 'rgba(165, 243, 252, 0.85)';
      fieldColorMid = 'rgba(56, 189, 248, 0.35)';
      fieldColorOuter = 'rgba(2, 132, 199, 0)';
      coreRingColor = '#38bdf8';
    } else if (relic === 'relic_yinyang_core') {
      fieldColorInner = 'rgba(250, 204, 21, 0.8)';
      fieldColorMid = 'rgba(217, 119, 6, 0.3)';
      fieldColorOuter = 'rgba(180, 83, 9, 0)';
      coreRingColor = '#fbbf24';
    }

    const coreGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 45 + pulse);
    coreGrad.addColorStop(0, fieldColorInner);
    coreGrad.addColorStop(0.6, fieldColorMid);
    coreGrad.addColorStop(1, fieldColorOuter);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 45 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Sacred Core Base
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = coreRingColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (relic === 'relic_yinyang_core') {
      // Rotating Taiji Yin-Yang
      ctx.rotate(time * 0.8);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 22, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, 22, Math.PI / 2, (3 * Math.PI) / 2);
      ctx.fill();
      // Swirls
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, -11, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 11, 11, 0, Math.PI * 2);
      ctx.fill();
      // Dots
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -11, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 11, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(-time * 0.8);
    } else if (relic === 'relic_phoenix_core') {
      // Blazing Phoenix Halo
      ctx.rotate(time * 1.2);
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2;
      for (let p = 0; p < 8; p++) {
        ctx.beginPath();
        ctx.moveTo(0, 20);
        ctx.lineTo(6, 32);
        ctx.lineTo(0, 28);
        ctx.lineTo(-6, 32);
        ctx.closePath();
        ctx.stroke();
        ctx.rotate(Math.PI / 4);
      }
      ctx.rotate(-time * 1.2);
    } else if (relic === 'relic_glacial_core') {
      // Frost Crystal Obelisks
      ctx.rotate(time * 0.6);
      ctx.strokeStyle = '#a5f3fc';
      ctx.lineWidth = 2;
      for (let p = 0; p < 6; p++) {
        ctx.beginPath();
        ctx.moveTo(0, 18);
        ctx.lineTo(4, 30);
        ctx.lineTo(0, 34);
        ctx.lineTo(-4, 30);
        ctx.closePath();
        ctx.stroke();
        ctx.rotate(Math.PI / 3);
      }
      ctx.rotate(-time * 0.6);
    } else {
      // Rotating default inner lotus petals
      ctx.rotate(time * 0.5);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      for (let p = 0; p < 6; p++) {
        ctx.beginPath();
        ctx.ellipse(0, 12, 6, 12, (p * Math.PI) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.rotate(-time * 0.5);
    }

    // Health text & Bar under core
    const hpRatio = Math.max(0, this.coreHp / this.coreMaxHp);
    const barW = 60;
    const barH = 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(-barW / 2, 34, barW, barH);
    ctx.fillStyle = hpRatio > 0.5 ? '#10b981' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(-barW / 2, 34, barW * hpRatio, barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barW / 2, 34, barW, barH);

    ctx.restore();
  }

  private renderPlacedGuardians(ctx: CanvasRenderingContext2D) {
    const time = performance.now() * 0.003;

    this.placedGuardians.forEach(guardian => {
      const config = GUARDIANS_DATA.find(g => g.id === guardian.configId);
      if (!config) return;
      const isSelected = this.selectedNode?.placedGuardianInstanceId === guardian.instanceId;

      ctx.save();
      ctx.translate(guardian.x, guardian.y);

      // Selected Range Indicator
      if (isSelected) {
        const upgradeData = UPGRADE_LEVELS.find(u => u.level === guardian.level) || UPGRADE_LEVELS[0];
        const effectiveRange = config.baseRange * upgradeData.rangeMultiplier;

        ctx.strokeStyle = config.color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, effectiveRange, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = config.color;
        ctx.globalAlpha = 0.08;
        ctx.fill();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
      }

      // Visual upgrade level evolution (Levels 1 to 10)
      this.renderGuardianEvolutionVisuals(ctx, guardian, config, time);

      // Cultivator Body / Avatar
      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.arc(0, -6, 12, 0, Math.PI * 2);
      ctx.fill();

      // Flowing Cultivation Robes
      ctx.fillStyle = guardian.level >= 7 ? '#1e1b4b' : '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-10, 6);
      ctx.lineTo(10, 6);
      ctx.lineTo(14, 18);
      ctx.lineTo(-14, 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = guardian.level >= 7 ? '#fbbf24' : config.color;
      ctx.lineWidth = guardian.level >= 7 ? 2 : 1.5;
      ctx.stroke();

      // Celestial Tribulation Pauldrons (Level 7+)
      if (guardian.level >= 7) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-15, 6, 5, 4);
        ctx.fillRect(10, 6, 5, 4);
      }

      // Level badge
      ctx.fillStyle = guardian.level === 10 ? '#facc15' : guardian.level >= 7 ? '#e0e7ff' : '#fbbf24';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Lv.${guardian.level}`, 0, 32);

      // Supreme crown for Level 10
      if (guardian.level === 10) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-8, -18);
        ctx.lineTo(-4, -24);
        ctx.lineTo(0, -20);
        ctx.lineTo(4, -24);
        ctx.lineTo(8, -18);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    });
  }

  private renderGuardianEvolutionVisuals(
    ctx: CanvasRenderingContext2D,
    guardian: PlacedGuardian,
    config: GuardianConfig,
    time: number
  ) {
    const lvl = guardian.level;

    // Level 1: Subtle breathing Qi ring at feet
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35 + Math.sin(time * 2) * 0.15;
    ctx.beginPath();
    ctx.arc(0, 12, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Level 2: Elemental Qi ring
    if (lvl >= 2) {
      ctx.strokeStyle = config.secondaryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Level 3: Floating spiritual sword/weapon at side
    if (lvl >= 3) {
      const swordBob = Math.sin(time * 4) * 3;
      ctx.save();
      ctx.translate(18, -4 + swordBob);
      ctx.rotate(0.3);
      ctx.fillStyle = config.secondaryColor;
      ctx.fillRect(-2, -14, 4, 20);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-5, 6, 10, 3); // hilt
      ctx.beginPath();
      ctx.arc(0, -14, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Level 4: 4 Orbiting Bagua talismans
    if (lvl >= 4) {
      const talismanCount = lvl >= 8 ? 8 : 4;
      for (let i = 0; i < talismanCount; i++) {
        const a = time * 1.6 + (i * Math.PI * 2) / talismanCount;
        const rx = Math.cos(a) * (28 + (lvl >= 8 ? 4 : 0));
        const ry = Math.sin(a) * (20 + (lvl >= 8 ? 4 : 0));
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(a);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-3, -6, 6, 12);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-2, -3, 4, 1.5);
        ctx.fillRect(-2, 0, 4, 1.5);
        ctx.restore();
      }
    }

    // Level 5: Golden Nascent Soul spirit phantom aura
    if (lvl >= 5) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(time * 2.5) * 0.15;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, -12, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Level 6: Dual counter-rotating concentric elemental rings
    if (lvl >= 6) {
      ctx.save();
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = time * 15;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = config.secondaryColor;
      ctx.lineDashOffset = -time * 20;
      ctx.beginPath();
      ctx.arc(0, 0, 35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Level 7: Radiating starlight rays
    if (lvl >= 7) {
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 1.5;
      for (let r = 0; r < 8; r++) {
        const rayAngle = (r * Math.PI) / 4 + time;
        ctx.beginPath();
        ctx.moveTo(Math.cos(rayAngle) * 22, Math.sin(rayAngle) * 22);
        ctx.lineTo(Math.cos(rayAngle) * 38, Math.sin(rayAngle) * 38);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Level 8: 3D gyroscopic tilted orbital rings
    if (lvl >= 8) {
      ctx.save();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 42, 14, time * 0.8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 42, 14, -time * 0.8 + Math.PI / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Level 9: Shimmering ethereal Qi wings
    if (lvl >= 9) {
      ctx.save();
      const wingFlap = Math.sin(time * 5) * 0.15;
      ctx.fillStyle = 'rgba(234, 179, 8, 0.35)';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;

      // Left wing
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.bezierCurveTo(-28, -25 + wingFlap * 20, -42, -10, -12, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right wing
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.bezierCurveTo(28, -25 + wingFlap * 20, 42, -10, 12, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Level 10: Supreme Transcendent Primordial Sovereign Mandala
    if (lvl === 10) {
      ctx.save();
      // Outer 12-ray solar mandala
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.stroke();

      for (let m = 0; m < 12; m++) {
        const ma = (m * Math.PI) / 6 + time * 0.5;
        const mx = Math.cos(ma) * 46;
        const my = Math.sin(ma) * 46;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Floating golden ascension stars
      for (let s = 0; s < 3; s++) {
        const sa = time * 2 + (s * Math.PI * 2) / 3;
        const sr = 34 + Math.sin(time * 3 + s) * 5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderEnemies(ctx: CanvasRenderingContext2D) {
    this.activeEnemies.forEach(enemy => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // Status aura
      if (enemy.freezeTimer > 0) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.size + 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (enemy.slowTimer > 0) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-enemy.size, -enemy.size, enemy.size * 2, enemy.size * 2);
      }

      // Enemy Body
      ctx.fillStyle = enemy.config.color;
      ctx.strokeStyle = enemy.config.isBoss ? '#f59e0b' : '#000000';
      ctx.lineWidth = enemy.config.isBoss ? 3 : 1.5;

      if (enemy.config.isBoss) {
        // Boss Spiky Diamond Avatar
        ctx.beginPath();
        ctx.moveTo(0, -enemy.size);
        ctx.lineTo(enemy.size, 0);
        ctx.lineTo(0, enemy.size);
        ctx.lineTo(-enemy.size, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crown / horns
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(-12, -enemy.size);
        ctx.lineTo(-6, -enemy.size - 10);
        ctx.lineTo(0, -enemy.size - 4);
        ctx.lineTo(6, -enemy.size - 10);
        ctx.lineTo(12, -enemy.size);
        ctx.closePath();
        ctx.fill();
      } else {
        // Standard Monster Circle
        ctx.beginPath();
        ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Health Bar
      const safeMaxHp = Math.max(1, enemy.maxHp);
      const hpRatio = Math.max(0, Math.min(1, enemy.hp / safeMaxHp));
      const barW = enemy.config.isBoss ? Math.max(48, enemy.size * 2.5) : enemy.size * 2.2;
      const barH = enemy.config.isBoss ? 6 : 4;
      const barY = -enemy.size - (enemy.config.isBoss ? 12 : 8);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(-barW / 2, barY, barW, barH);
      ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);

      // Subtle crisp border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barW / 2, barY, barW, barH);

      ctx.restore();
    });
  }

  private renderVisualAttackBeams(ctx: CanvasRenderingContext2D) {
    if (this.visualAttackBeams.length === 0) return;

    this.visualAttackBeams.forEach(b => {
      const alpha = Math.max(0, 1 - (b.elapsed / b.duration));
      if (alpha <= 0) return;

      ctx.save();

      if (b.type === 'lightning' || b.type === 'chain_lightning') {
        // Multi-segment jagged crackling lightning bolt
        const dx = b.targetX - b.startX;
        const dy = b.targetY - b.startY;
        const dist = Math.hypot(dx, dy);
        const segments = Math.max(5, Math.floor(dist / 22));
        const nx = -dy / dist;
        const ny = dx / dist;

        const points: { x: number; y: number }[] = [{ x: b.startX, y: b.startY }];
        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          // Seeded zig-zag offset that flickers
          const seed = (Math.sin(i * 99 + b.elapsed * 50) + Math.cos(i * 33)) * 0.5;
          const jitter = seed * (b.type === 'chain_lightning' ? 12 : 16);
          points.push({
            x: b.startX + dx * t + nx * jitter,
            y: b.startY + dy * t + ny * jitter
          });
        }
        points.push({ x: b.targetX, y: b.targetY });

        // Outer electric purple/pink glow
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.type === 'chain_lightning' ? 4 : 5.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = alpha * 0.75;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // Inner high-voltage white core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // Lightning impact spark star at target
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.targetX, b.targetY, 4 * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.type === 'laser') {
        // High-intensity prismatic laser beam
        ctx.lineCap = 'round';
        // Outer beam
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 4.5;
        ctx.globalAlpha = alpha * 0.7;
        ctx.beginPath();
        ctx.moveTo(b.startX, b.startY);
        ctx.lineTo(b.targetX, b.targetY);
        ctx.stroke();

        // Inner white beam
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(b.startX, b.startY);
        ctx.lineTo(b.targetX, b.targetY);
        ctx.stroke();
      } else if (b.type === 'dragon_breath') {
        // Azure celestial dragon breath stream
        ctx.lineCap = 'round';
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 6;
        ctx.globalAlpha = alpha * 0.65;
        ctx.beginPath();
        ctx.moveTo(b.startX, b.startY);
        ctx.lineTo(b.targetX, b.targetY);
        ctx.stroke();

        ctx.strokeStyle = b.secondaryColor || b.color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = alpha * 0.9;
        ctx.beginPath();
        ctx.moveTo(b.startX, b.startY);
        ctx.lineTo(b.targetX, b.targetY);
        ctx.stroke();
      } else if (b.type === 'frost_chain') {
        // Crystalline Glacial Frost Chain with Ice Diamonds & Shimmering Frost Arc
        const dx = b.targetX - b.startX;
        const dy = b.targetY - b.startY;
        const dist = Math.hypot(dx, dy);
        const segments = Math.max(4, Math.floor(dist / 24));
        const nx = -dy / dist;
        const ny = dx / dist;

        const points: { x: number; y: number }[] = [{ x: b.startX, y: b.startY }];
        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          // Crystalline angular offset that resembles jagged ice fractures
          const angleOffset = Math.sin(i * 1.57 + b.elapsed * 20) * 8;
          points.push({
            x: b.startX + dx * t + nx * angleOffset,
            y: b.startY + dy * t + ny * angleOffset
          });
        }
        points.push({ x: b.targetX, y: b.targetY });

        // Outer frost glow (cyan/azure)
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';
        ctx.globalAlpha = alpha * 0.75;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // Inner icy white crystalline core
        ctx.strokeStyle = b.secondaryColor || '#f0fdfa';
        ctx.lineWidth = 2.0;
        ctx.globalAlpha = alpha * 0.95;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // Crystalline diamond nodes along the chain
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          const nodeSize = (i === 0 || i === points.length - 1) ? 5 : 3.5;
          ctx.globalAlpha = alpha * 0.9;
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y - nodeSize);
          ctx.lineTo(pt.x + nodeSize, pt.y);
          ctx.lineTo(pt.x, pt.y + nodeSize);
          ctx.lineTo(pt.x - nodeSize, pt.y);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.restore();
    });
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    this.projectiles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
      ctx.rotate(angle);

      ctx.fillStyle = p.trailColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;

      if (p.element === 'lightning') {
        // Nine Heavens Tribulation Lightning Spear Bolt
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.moveTo(14 * p.scale, 0);
        ctx.lineTo(4 * p.scale, -4 * p.scale);
        ctx.lineTo(6 * p.scale, -1.5 * p.scale);
        ctx.lineTo(-8 * p.scale, -5 * p.scale);
        ctx.lineTo(-5 * p.scale, 0);
        ctx.lineTo(-8 * p.scale, 5 * p.scale);
        ctx.lineTo(6 * p.scale, 1.5 * p.scale);
        ctx.lineTo(4 * p.scale, 4 * p.scale);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#f472b6';
        ctx.stroke();

        // White electric core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4 * p.scale, 0);
        ctx.lineTo(12 * p.scale, 0);
        ctx.stroke();
      } else if (p.element === 'fire') {
        // Crescent Flaming Sword Qi Slash
        ctx.beginPath();
        ctx.arc(0, 0, 11 * p.scale, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.stroke();

        // Fiery inner core
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(1 * p.scale, 0, 6 * p.scale, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.lineTo(1 * p.scale, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.element === 'dragon') {
        // Azure Dragon Qi Crescent Blade
        ctx.beginPath();
        ctx.arc(0, 0, 12 * p.scale, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();

        // Azure dragon eye glint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(4 * p.scale, 0, 2.5 * p.scale, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.element === 'lava') {
        // Molten magma boulder with glowing core
        ctx.beginPath();
        ctx.arc(0, 0, 8.5 * p.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ea580c';
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5 * p.scale, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.element === 'metal') {
        // Flying Spirit Broadsword
        ctx.beginPath();
        ctx.moveTo(13 * p.scale, 0);
        ctx.lineTo(-4 * p.scale, -3.5 * p.scale);
        ctx.lineTo(-7 * p.scale, -5 * p.scale);
        ctx.lineTo(-6 * p.scale, 0);
        ctx.lineTo(-7 * p.scale, 5 * p.scale);
        ctx.lineTo(-4 * p.scale, 3.5 * p.scale);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.stroke();

        // Sword blade fuller line
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-3 * p.scale, 0);
        ctx.lineTo(10 * p.scale, 0);
        ctx.stroke();
      } else if (p.element === 'ice') {
        // Crystalline Glacial Icicle Lance
        ctx.beginPath();
        ctx.moveTo(12 * p.scale, 0);
        ctx.lineTo(-4 * p.scale, -4.5 * p.scale);
        ctx.lineTo(-8 * p.scale, 0);
        ctx.lineTo(-4 * p.scale, 4.5 * p.scale);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#e0f2fe';
        ctx.stroke();

        // Ice crystal spine
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-6 * p.scale, 0);
        ctx.lineTo(10 * p.scale, 0);
        ctx.stroke();
      } else if (p.element === 'wind') {
        // Emerald Jade Wind Crescent Blade
        ctx.beginPath();
        ctx.arc(0, 0, 10 * p.scale, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.lineTo(-2 * p.scale, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#a7f3d0';
        ctx.stroke();
      } else if (p.element === 'sand') {
        // Swirling Ancient Sand Bead
        ctx.beginPath();
        ctx.arc(0, 0, 6.5 * p.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.stroke();

        // Swirling sand orbit arc
        ctx.strokeStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(0, 0, 9 * p.scale, 0, Math.PI * 1.2);
        ctx.stroke();
      } else if (p.element === 'crystal') {
        // Prismatic Diamond Facet Gem
        ctx.beginPath();
        ctx.moveTo(9 * p.scale, 0);
        ctx.lineTo(0, -6 * p.scale);
        ctx.lineTo(-9 * p.scale, 0);
        ctx.lineTo(0, 6 * p.scale);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Diamond facets
        ctx.beginPath();
        ctx.moveTo(-9 * p.scale, 0);
        ctx.lineTo(9 * p.scale, 0);
        ctx.moveTo(0, -6 * p.scale);
        ctx.lineTo(0, 6 * p.scale);
        ctx.stroke();
      } else if (p.element === 'vortex') {
        // Spatial Singularity Vortex Orb
        ctx.beginPath();
        ctx.arc(0, 0, 6.5 * p.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c084fc';
        ctx.stroke();

        // Gravitational ring
        ctx.strokeStyle = '#a855f7';
        ctx.beginPath();
        ctx.ellipse(0, 0, 10 * p.scale, 4 * p.scale, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.element === 'celestial') {
        // Radiant Starlight Comet Arrow
        ctx.beginPath();
        ctx.moveTo(13 * p.scale, 0);
        ctx.lineTo(2 * p.scale, -4 * p.scale);
        ctx.lineTo(-7 * p.scale, -2 * p.scale);
        ctx.lineTo(-4 * p.scale, 0);
        ctx.lineTo(-7 * p.scale, 2 * p.scale);
        ctx.lineTo(2 * p.scale, 4 * p.scale);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.stroke();

        // Starlight core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(3 * p.scale, 0, 2.5 * p.scale, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.element === 'shadow') {
        // Nether Shadow Dagger
        ctx.beginPath();
        ctx.moveTo(12 * p.scale, 0);
        ctx.lineTo(-4 * p.scale, -4 * p.scale);
        ctx.lineTo(-2 * p.scale, 0);
        ctx.lineTo(-4 * p.scale, 4 * p.scale);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#c084fc';
        ctx.stroke();
      } else if (p.element === 'life') {
        // Emerald Spiritual Lotus Seed
        ctx.beginPath();
        ctx.ellipse(0, 0, 8 * p.scale, 5 * p.scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bbf7d0';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(2 * p.scale, 0, 2 * p.scale, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Generic Spiritual Energy Dart
        ctx.beginPath();
        ctx.moveTo(10 * p.scale, 0);
        ctx.lineTo(-6 * p.scale, -4 * p.scale);
        ctx.lineTo(-3 * p.scale, 0);
        ctx.lineTo(-6 * p.scale, 4 * p.scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    this.particles.forEach(pt => {
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.globalAlpha = Math.max(0, pt.alpha);
      ctx.fillStyle = pt.color;

      if (pt.shape === 'petal') {
        if (pt.rotation !== undefined) ctx.rotate(pt.rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, pt.size, pt.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.shape === 'ember') {
        ctx.beginPath();
        ctx.arc(0, 0, pt.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.shape === 'slash') {
        ctx.fillRect(-pt.size * 2, -1, pt.size * 4, 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `${ft.isCrit ? 'bold ' : ''}${ft.fontSize}px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  private renderDraggingGuardian(ctx: CanvasRenderingContext2D) {
    if (!this.draggingGuardianConfig) return;
    const config = this.draggingGuardianConfig;

    // Convert screen coordinates to virtual coordinates
    const vPos = this.screenToVirtual(this.dragScreenPos.x, this.dragScreenPos.y);

    ctx.save();
    ctx.translate(vPos.x, vPos.y);

    // Range circle preview
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, config.baseRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = config.color;
    ctx.globalAlpha = 0.12;
    ctx.fill();

    // Ghost Cultivator avatar
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- INPUT & TOUCH INTERACTION ---

  private setupInputs() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });

    // Touch events for responsive mobile and tablet placement
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: false });

    window.addEventListener('resize', this.handleResize);
  }

  public destroy() {
    this.stop();
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);

    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);

    window.removeEventListener('resize', this.handleResize);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  public handleResize = () => {
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();
    const w = Math.floor(rect.width || window.innerWidth);
    const h = Math.floor(rect.height || (window.innerHeight - 150));
    if (w <= 0 || h <= 0) return;

    // Set canvas internal resolution to crisp high DPI, capped at 2 to avoid memory bloat
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    // Scale virtual coords into display space
    const scaleX = (w * dpr) / this.VIRTUAL_WIDTH;
    const scaleY = (h * dpr) / this.VIRTUAL_HEIGHT;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = ((w * dpr) - (this.VIRTUAL_WIDTH * this.scale)) / 2;
    this.offsetY = ((h * dpr) - (this.VIRTUAL_HEIGHT * this.scale)) / 2;
  };

  public screenToVirtual(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 0, y: 0 };
    // Mathematically exact CSS client to canvas buffer pixel conversion
    const dpr = this.canvas.width / rect.width;
    const canvasX = (clientX - rect.left) * dpr;
    const canvasY = (clientY - rect.top) * dpr;

    return {
      x: (canvasX - this.offsetX) / this.scale,
      y: (canvasY - this.offsetY) / this.scale
    };
  }

  public findNearestPlacementNode(vx: number, vy: number, maxDist: number = 85): PlacementNode | null {
    let bestNode: PlacementNode | null = null;
    let minDist = maxDist;

    for (const node of this.placementNodes) {
      const dist = Math.hypot(node.x - vx, node.y - vy);
      if (dist < minDist) {
        minDist = dist;
        bestNode = node;
      }
    }
    return bestNode;
  }

  /**
   * High-forgiveness Touch-Buffer Zone for mobile & tablet screens.
   * Compares both physical CSS screen-space distance (>=56px touch target)
   * and virtual Euclidean distance without affecting the visual layout.
   */
  public findNearestPlacementNodeWithBuffer(
    clientX: number,
    clientY: number,
    vx: number,
    vy: number,
    maxVirtualDist: number = 130
  ): PlacementNode | null {
    let bestNode: PlacementNode | null = null;
    let minDist = maxVirtualDist;

    const rect = this.canvas.getBoundingClientRect();
    const dpr = (rect.width > 0) ? (this.canvas.width / rect.width) : 1;

    for (const node of this.placementNodes) {
      // 1. Virtual Euclidean distance
      const vDist = Math.hypot(node.x - vx, node.y - vy);

      // 2. Exact physical screen distance in CSS pixels
      const nodeScreenX = rect.left + ((node.x * this.scale + this.offsetX) / dpr);
      const nodeScreenY = rect.top + ((node.y * this.scale + this.offsetY) / dpr);
      const screenDist = Math.hypot(clientX - nodeScreenX, clientY - nodeScreenY);

      // Generous touch buffer: within 56 CSS pixels or within virtual radius
      const isWithinScreenBuffer = screenDist <= 56;
      const isWithinVirtualBuffer = vDist <= maxVirtualDist;

      if (isWithinScreenBuffer || isWithinVirtualBuffer) {
        // Combined scoring to pick the closest intended pedestal
        const score = Math.min(vDist, screenDist * (this.VIRTUAL_WIDTH / Math.max(1, rect.width)));
        if (score < minDist) {
          minDist = score;
          bestNode = node;
        }
      }
    }
    return bestNode;
  }

  public handleCanvasTap(clientX: number, clientY: number, isTouch: boolean = false) {
    const vPos = this.screenToVirtual(clientX, clientY);
    // Touch buffer: expanded hit detection area (up to 135 virtual px or 56 CSS screen px)
    const touchBufferDist = isTouch ? 135 : 95;
    const nearestNode = this.findNearestPlacementNodeWithBuffer(clientX, clientY, vPos.x, vPos.y, touchBufferDist);

    if (this.selectedConfigToPlace) {
      // User tapped a tower option first, now tapping battlefield
      if (nearestNode) {
        if (!nearestNode.placedGuardianInstanceId) {
          // Empty pedestal -> place the selected tower!
          const success = this.placeGuardian(this.selectedConfigToPlace.id, nearestNode);
          if (success) {
            this.selectedConfigToPlace = null;
            if (this.callbacks.onSelectedConfigChange) {
              this.callbacks.onSelectedConfigChange(null);
            }
            return;
          }
          return;
        } else {
          // Tapped an existing guardian -> inspect that guardian instead
          const placed = this.placedGuardians.get(nearestNode.placedGuardianInstanceId) || null;
          this.selectedNode = nearestNode;
          this.selectedConfigToPlace = null;
          if (this.callbacks.onSelectedConfigChange) {
            this.callbacks.onSelectedConfigChange(null);
          }
          this.callbacks.onSelectedGuardianChange(placed ? { ...placed } : null, nearestNode);
          soundEngine.playPlacement();
          return;
        }
      } else {
        // Tapped far away from any pedestal - cancel placement safely so player is not locked
        this.selectedConfigToPlace = null;
        if (this.callbacks.onSelectedConfigChange) {
          this.callbacks.onSelectedConfigChange(null);
        }
        this.addFloatingText('Placement cancelled', vPos.x, vPos.y - 15, '#94a3b8', 13);
        return;
      }
    }

    // No tower was pre-selected -> inspect or select pedestal
    if (nearestNode) {
      this.selectedNode = nearestNode;
      const placed = nearestNode.placedGuardianInstanceId 
        ? this.placedGuardians.get(nearestNode.placedGuardianInstanceId) || null 
        : null;
      this.callbacks.onSelectedGuardianChange(placed ? { ...placed } : null, nearestNode);
      soundEngine.playPlacement();
    } else {
      // Tapped outside any pedestal -> clear selection
      this.selectedNode = null;
      this.callbacks.onSelectedGuardianChange(null, null);
    }
  }

  private handleMouseDown = (e: MouseEvent) => {
    // Only handle mouse click if directly target is the canvas
    if (e.target !== this.canvas) return;
    // Ignore synthetic mouse events fired after touch
    if (performance.now() - this.lastTouchTime < 600) {
      return;
    }
    if (e.button !== 0) return; // Left click only
    this.handleCanvasTap(e.clientX, e.clientY, false);
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (performance.now() - this.lastTouchTime < 600) return;
    if (this.isDragging) {
      this.dragScreenPos = { x: e.clientX, y: e.clientY };
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (performance.now() - this.lastTouchTime < 600) return;
    if (this.isDragging && this.draggingGuardianConfig) {
      const vPos = this.screenToVirtual(e.clientX, e.clientY);
      const nearestNode = this.findNearestPlacementNodeWithBuffer(e.clientX, e.clientY, vPos.x, vPos.y, 110);
      if (nearestNode && !nearestNode.placedGuardianInstanceId) {
        this.placeGuardian(this.draggingGuardianConfig.id, nearestNode);
      }
      this.isDragging = false;
      this.draggingGuardianConfig = null;
    }
  };

  private handleTouchStart = (e: TouchEvent) => {
    // Strictly ensure touch started directly on the canvas, NOT on an HTML button, drawer, or HUD
    if (e.target !== this.canvas) {
      this.touchActiveOnCanvas = false;
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.touchActiveOnCanvas = true;
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = performance.now();
      this.touchMoved = false;
      this.lastTouchTime = performance.now();
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.touchActiveOnCanvas) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const dist = Math.hypot(touch.clientX - this.touchStartX, touch.clientY - this.touchStartY);
      // Forgiving touch movement threshold (20px)
      if (dist > 20) {
        this.touchMoved = true;
      }
      if (this.isDragging) {
        if (e.cancelable) e.preventDefault();
        this.dragScreenPos = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    // CRITICAL: If touch did not originate on canvas (e.g. on Ascend/Delete/Exit/Drawer buttons),
    // NEVER intercept, prevent default, or trigger a canvas tap! Let native button click fire!
    if (!this.touchActiveOnCanvas) return;
    this.touchActiveOnCanvas = false;
    this.lastTouchTime = performance.now();

    const endTouch = (e.changedTouches && e.changedTouches[0]) || null;
    const clientX = endTouch ? endTouch.clientX : this.touchStartX;
    const clientY = endTouch ? endTouch.clientY : this.touchStartY;

    // Check if finger was released over an overlaid UI element (e.g. drawer, hud, button)
    const elementUnderTouch = document.elementFromPoint(clientX, clientY);
    if (elementUnderTouch && elementUnderTouch !== this.canvas) {
      return;
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    if (this.isDragging && this.draggingGuardianConfig) {
      const vPos = this.screenToVirtual(this.dragScreenPos.x, this.dragScreenPos.y);
      const nearestNode = this.findNearestPlacementNodeWithBuffer(
        this.dragScreenPos.x,
        this.dragScreenPos.y,
        vPos.x,
        vPos.y,
        135
      );
      if (nearestNode && !nearestNode.placedGuardianInstanceId) {
        this.placeGuardian(this.draggingGuardianConfig.id, nearestNode);
      }
      this.isDragging = false;
      this.draggingGuardianConfig = null;
      return;
    }

    // Touch tap detection: if finger didn't drag far (>20px) and tap duration was < 800ms
    const tapDuration = performance.now() - this.touchStartTime;
    if (!this.touchMoved && tapDuration < 800) {
      this.handleCanvasTap(clientX, clientY, true);
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    const newScale = Math.max(0.6, Math.min(2.0, this.scale * zoomFactor));
    if (newScale !== this.scale) {
      this.scale = newScale;
      const parent = this.canvas.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = (parent ? parent.clientWidth : window.innerWidth) * dpr;
      const h = ((parent && parent.clientHeight) ? parent.clientHeight : 550) * dpr;
      this.offsetX = (w - (this.VIRTUAL_WIDTH * this.scale)) / 2;
      this.offsetY = (h - (this.VIRTUAL_HEIGHT * this.scale)) / 2;
    }
  };

  public startDragGuardian(config: GuardianConfig, clientX: number, clientY: number) {
    this.draggingGuardianConfig = config;
    this.isDragging = true;
    this.dragScreenPos = { x: clientX, y: clientY };
  }
}
