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
  private dragScreenPos = { x: 0, y: 0 };
  private isDragging = false;

  // Projectiles & Particles
  private projectiles: Projectile[] = [];
  private particles: VisualParticle[] = [];
  private floatingTexts: FloatingText[] = [];

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
    soundEngine.setMusicState('battle');
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

  // --- WAVE SYSTEM ---

  public startNextWave() {
    if (this.isWaveActive || (!this.isRunning && this.currentWave > 0)) return;
    this.currentWave++;
    this.isWaveActive = true;
    this.waveSpawnTimer = 0;
    this.waveSpawnQueue = this.generateWaveEnemies(this.currentWave);

    const isBossWave = (this.currentWave % 10 === 0) || (this.currentWave === this.totalWaves);
    if (isBossWave) {
      soundEngine.setMusicState('boss');
      this.callbacks.onScreenReaderNotice(`Alert: Boss wave ${this.currentWave} initiated!`);
      this.addFloatingText('BOSS CALAMITY ARRIVES!', this.VIRTUAL_WIDTH / 2, 180, '#ef4444', 28, true);
    } else {
      soundEngine.setMusicState('battle');
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

  public placeGuardian(configId: string, node: PlacementNode): boolean {
    const config = GUARDIANS_DATA.find(g => g.id === configId);
    if (!config || node.placedGuardianInstanceId) return false;
    if (this.spiritEssence < config.baseCost) {
      this.addFloatingText('Insufficient Essence!', node.x, node.y - 20, '#ef4444', 16);
      return false;
    }

    this.spiritEssence -= config.baseCost;
    const instanceId = `guardian_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const placed: PlacedGuardian = {
      instanceId,
      configId: config.id,
      x: node.x,
      y: node.y,
      level: 1,
      damageDealt: 0,
      kills: 0,
      lastAttackTime: 0,
      targetPriority: 'first',
      ultimateTimer: config.ultimateCooldown,
      isUltimateActive: false
    };

    node.placedGuardianInstanceId = instanceId;
    this.placedGuardians.set(instanceId, placed);
    soundEngine.playPlacement();

    // Spawn placement lotus aura particles
    this.createLotusBurst(node.x, node.y, config.color, 25);
    this.addFloatingText(`${config.name} Deployed!`, node.x, node.y - 30, config.color, 16);

    this.callbacks.onEssenceChange(this.spiritEssence);
    this.callbacks.onSelectedGuardianChange(placed, node);
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
    this.callbacks.onSelectedGuardianChange(placed, this.selectedNode);
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

    this.callbacks.onEssenceChange(this.spiritEssence);
    this.callbacks.onSelectedGuardianChange(null, null);
    this.selectedNode = null;
    return true;
  }

  public setTargetPriority(instanceId: string, priority: 'first' | 'last' | 'strongest' | 'closest') {
    const placed = this.placedGuardians.get(instanceId);
    if (placed) {
      placed.targetPriority = priority;
      this.callbacks.onSelectedGuardianChange(placed, this.selectedNode);
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
    const now = performance.now() / 1000;
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

      // Check attack target
      if (now - guardian.lastAttackTime >= attackInterval) {
        const target = this.findTargetForGuardian(guardian, effectiveRange);
        if (target) {
          this.executeGuardianAttack(guardian, config, upgradeData, target);
          guardian.lastAttackTime = now;
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

        // Add small trail particle
        if (Math.random() < 0.6) {
          this.addParticle({
            id: `trail_${Math.random()}`,
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            color: p.trailColor,
            size: p.scale * 3.5,
            alpha: 0.8,
            decay: 3.5,
            shape: 'spark'
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
      soundEngine.setMusicState('victory');
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
    soundEngine.setMusicState('victory');
    const stars = this.coreHp >= this.coreMaxHp * 0.9 ? 3 : this.coreHp >= this.coreMaxHp * 0.4 ? 2 : 1;
    const finalShards = this.celestialShardsEarned + this.realm.firstClearReward;
    this.callbacks.onVictory(stars, finalShards, this.totalKills);
  }

  private handleDefeat() {
    this.stop();
    soundEngine.setMusicState('defeat');
    this.callbacks.onDefeat(this.currentWave, this.totalKills);
  }

  // --- TARGETING & COMBAT ---

  private findTargetForGuardian(guardian: PlacedGuardian, range: number): ActiveEnemy | null {
    const inRange = this.activeEnemies.filter(e => {
      if (e.hp <= 0) return false;
      const dx = e.x - guardian.x;
      const dy = e.y - guardian.y;
      return Math.sqrt(dx * dx + dy * dy) <= range;
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
      default: soundEngine.playSwordQi(); break;
    }

    if (config.attackType === 'instant_strike') {
      // Shadow assassin instant strike
      const effectiveDef = config.element === 'metal' ? Math.floor(target.defense * 0.5) : target.defense;
      const isWeakness = target.config.elementWeakness === config.element;
      const dmgMult = isWeakness ? 1.4 : 1.0;
      const appliedDmg = Math.max(1, Math.round((finalDamage - effectiveDef) * dmgMult));

      target.hp -= appliedDmg;
      guardian.damageDealt += appliedDmg;
      this.createSlashEffect(target.x, target.y, config.color);
      this.addFloatingText(`${appliedDmg}`, target.x, target.y - 10, config.color, isCrit ? 18 : 14, isCrit);
      if (isWeakness) {
        this.addFloatingText('WEAKNESS!', target.x, target.y - 25, '#fbbf24', 11, true);
      }
      if (target.config.isBoss) {
        this.callbacks.onBossStateChange({ ...target });
      }
      return;
    }

    if (config.attackType === 'beam') {
      // Prismatic laser beam: direct instantaneous damage & defense shred
      const effectiveDef = Math.max(0, target.defense - 2);
      const isWeakness = target.config.elementWeakness === config.element;
      const dmgMult = isWeakness ? 1.4 : 1.0;
      const appliedDmg = Math.max(1, Math.round((finalDamage - effectiveDef) * dmgMult));

      target.hp -= appliedDmg;
      target.defense = Math.max(0, target.defense - 1);
      guardian.damageDealt += appliedDmg;

      // Draw beam particles from guardian to target
      this.createBeamEffect(guardian.x, guardian.y, target.x, target.y, config.color);
      this.addFloatingText(`${appliedDmg}`, target.x, target.y - 10, config.color, isCrit ? 18 : 14, isCrit);
      if (isWeakness) {
        this.addFloatingText('WEAKNESS!', target.x, target.y - 25, '#fbbf24', 11, true);
      }
      if (target.config.isBoss) {
        this.callbacks.onBossStateChange({ ...target });
      }
      return;
    }

    if (config.attackType === 'vortex_pull') {
      // Pull enemy back along path and burst AOE
      const effectiveDef = target.defense;
      const appliedDmg = Math.max(1, finalDamage - effectiveDef);
      target.hp -= appliedDmg;
      target.pathProgress = Math.max(0, target.pathProgress - 0.04);
      guardian.damageDealt += appliedDmg;

      this.createExplosionParticles(target.x, target.y, '#8b5cf6', 16);
      this.addFloatingText(`${appliedDmg}`, target.x, target.y - 10, '#c084fc', 14, isCrit);

      // Nearby enemies pull
      this.activeEnemies.forEach(e => {
        if (e.hp > 0 && e.id !== target.id && Math.hypot(e.x - target.x, e.y - target.y) <= 70) {
          e.pathProgress = Math.max(0, e.pathProgress - 0.025);
          e.hp -= Math.max(1, Math.round(appliedDmg * 0.5));
        }
      });
      if (target.config.isBoss) {
        this.callbacks.onBossStateChange({ ...target });
      }
      return;
    }

    if (config.attackType === 'chain') {
      // Lightning chain to up to 3 targets
      let currentTarget = target;
      const hitList = [target];
      target.hp -= Math.max(1, finalDamage - target.defense);
      this.createLightningParticles(target.x, target.y, config.color, 10);
      if (target.config.isBoss) {
        this.callbacks.onBossStateChange({ ...target });
      }

      for (let c = 0; c < 2; c++) {
        const nextTarget = this.activeEnemies.find(e => e.hp > 0 && !hitList.includes(e) && Math.hypot(e.x - currentTarget.x, e.y - currentTarget.y) < 100);
        if (nextTarget) {
          hitList.push(nextTarget);
          const chainDmg = Math.round(finalDamage * 0.7);
          nextTarget.hp -= Math.max(1, chainDmg - nextTarget.defense);
          this.createLightningParticles(nextTarget.x, nextTarget.y, config.color, 8);
          if (nextTarget.config.isBoss) {
            this.callbacks.onBossStateChange({ ...nextTarget });
          }
          currentTarget = nextTarget;
        }
      }
      guardian.damageDealt += finalDamage;
      return;
    }

    // Launch projectile (fire, ice, wind, dragon, sand, lava, metal, celestial, etc.)
    const isAoe = config.element === 'fire' || config.element === 'dragon' || config.element === 'lava';
    this.projectiles.push({
      id: `proj_${Math.random()}`,
      guardianId: guardian.instanceId,
      element: config.element,
      x: guardian.x,
      y: guardian.y,
      targetX: target.x,
      targetY: target.y,
      targetEnemyId: target.id,
      damage: finalDamage,
      speed: 460,
      aoeRadius: isAoe ? 40 : 0,
      trailColor: config.color,
      scale: 1 + (guardian.level - 1) * 0.12
    });
  }

  private createBeamEffect(x1: number, y1: number, x2: number, y2: number, color: string) {
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.addParticle({
        id: `beam_${Math.random()}`,
        x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * 4,
        y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color,
        size: 3,
        alpha: 0.9,
        decay: 3.5,
        shape: 'ember'
      });
    }
  }

  private handleProjectileHit(p: Projectile, directTarget?: ActiveEnemy) {
    const color = p.trailColor || '#f97316';

    if (p.aoeRadius > 0) {
      // AOE explosion
      this.createExplosionParticles(p.targetX, p.targetY, color, 18);
      this.activeEnemies.forEach(e => {
        if (e.hp <= 0) return;
        const dist = Math.hypot(e.x - p.targetX, e.y - p.targetY);
        if (dist <= p.aoeRadius + e.size) {
          const effectiveDef = p.element === 'metal' ? Math.floor(e.defense * 0.5) : e.defense;
          const isWeak = e.config.elementWeakness === p.element;
          const dmgMult = isWeak ? 1.4 : 1.0;
          const dmg = Math.max(1, Math.round((p.damage - effectiveDef) * dmgMult));
          e.hp -= dmg;

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
    } else {
      // Direct single-target hit: reliably detect living target even if in fast motion
      let hitEnemy = (directTarget && directTarget.hp > 0) ? directTarget : null;

      if (!hitEnemy) {
        // Find nearest living enemy within generous collision radius
        hitEnemy = this.activeEnemies.find(e => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= (e.size + 24)) || null;
      }

      // If still not matched, check near target location
      if (!hitEnemy) {
        hitEnemy = this.activeEnemies.find(e => e.hp > 0 && Math.hypot(e.x - p.targetX, e.y - p.targetY) <= (e.size + 30)) || null;
      }

      if (hitEnemy) {
        const effectiveDef = p.element === 'metal' ? Math.floor(hitEnemy.defense * 0.5) : hitEnemy.defense;
        const isWeak = hitEnemy.config.elementWeakness === p.element;
        const dmgMult = isWeak ? 1.4 : 1.0;
        const dmg = Math.max(1, Math.round((p.damage - effectiveDef) * dmgMult));
        hitEnemy.hp -= dmg;

        if (p.element === 'ice') {
          hitEnemy.slowFactor = 0.50;
          hitEnemy.slowTimer = 3.0;
        } else if (p.element === 'sand') {
          hitEnemy.slowFactor = 0.65;
          hitEnemy.slowTimer = 2.5;
        }

        this.createLotusBurst(hitEnemy.x, hitEnemy.y, color, 8);
        this.addFloatingText(`${dmg}`, hitEnemy.x, hitEnemy.y - 10, color, 14);
        if (isWeak) {
          this.addFloatingText('WEAKNESS!', hitEnemy.x, hitEnemy.y - 25, '#fbbf24', 11, true);
        }

        if (hitEnemy.config.isBoss) {
          this.callbacks.onBossStateChange({ ...hitEnemy });
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

    // 7. Draw Projectiles
    this.renderProjectiles(ctx);

    // 8. Draw Visual Particles
    this.renderParticles(ctx);

    // 9. Draw Floating Numbers & Notifications
    if (this.settings.showDamageNumbers) {
      this.renderFloatingTexts(ctx);
    }

    // 10. Draw Dragging Guardian Preview
    if (this.isDragging && this.draggingGuardianConfig) {
      this.renderDraggingGuardian(ctx);
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
    this.placementNodes.forEach(node => {
      const isSelected = this.selectedNode?.id === node.id;
      const isOccupied = !!node.placedGuardianInstanceId;

      ctx.save();
      ctx.translate(node.x, node.y);

      // Stone Pedestal
      ctx.fillStyle = isOccupied ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.75)';
      ctx.strokeStyle = isSelected ? '#fbbf24' : isOccupied ? '#38bdf8' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;

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
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☯', 0, 0);

        // Gentle breathing pulse if not occupied
        const pulse = Math.sin(time + node.x) * 3;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(0, 0, r + 4 + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });
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

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    this.projectiles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
      ctx.rotate(angle);

      ctx.fillStyle = p.trailColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;

      if (p.element === 'fire' || p.element === 'dragon') {
        // Crescent Sword Qi Slash
        ctx.beginPath();
        ctx.arc(0, 0, 10 * p.scale, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.element === 'lava') {
        // Molten magma orb with glowing core
        ctx.beginPath();
        ctx.arc(0, 0, 8 * p.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, 4 * p.scale, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.element === 'metal') {
        // Flying Spirit Dagger / Sword
        ctx.beginPath();
        ctx.moveTo(12 * p.scale, 0);
        ctx.lineTo(-6 * p.scale, -3 * p.scale);
        ctx.lineTo(-4 * p.scale, 0);
        ctx.lineTo(-6 * p.scale, 3 * p.scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.element === 'ice') {
        // Crystalline icicle
        ctx.beginPath();
        ctx.moveTo(11 * p.scale, 0);
        ctx.lineTo(-5 * p.scale, -4 * p.scale);
        ctx.lineTo(-8 * p.scale, 0);
        ctx.lineTo(-5 * p.scale, 4 * p.scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.element === 'sand') {
        // Swirling sand bead
        ctx.beginPath();
        ctx.arc(0, 0, 6 * p.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.stroke();
      } else if (p.element === 'crystal') {
        // Prismatic diamond facet
        ctx.beginPath();
        ctx.moveTo(8 * p.scale, 0);
        ctx.lineTo(0, -5 * p.scale);
        ctx.lineTo(-8 * p.scale, 0);
        ctx.lineTo(0, 5 * p.scale);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Energy arrow / dart
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

    // Touch events for responsive mobile
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
  }

  public handleResize = () => {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight || 550;

    // Set canvas internal resolution to high DPI
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    // Scale virtual coords into display space
    const scaleX = (w * dpr) / this.VIRTUAL_WIDTH;
    const scaleY = (h * dpr) / this.VIRTUAL_HEIGHT;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = ((w * dpr) - (this.VIRTUAL_WIDTH * this.scale)) / 2;
    this.offsetY = ((h * dpr) - (this.VIRTUAL_HEIGHT * this.scale)) / 2;
  };

  private screenToVirtual(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasX = (clientX - rect.left) * dpr;
    const canvasY = (clientY - rect.top) * dpr;

    return {
      x: (canvasX - this.offsetX) / this.scale,
      y: (canvasY - this.offsetY) / this.scale
    };
  }

  private handleMouseDown = (e: MouseEvent) => {
    const vPos = this.screenToVirtual(e.clientX, e.clientY);
    this.checkNodeClick(vPos.x, vPos.y);
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isDragging) {
      this.dragScreenPos = { x: e.clientX, y: e.clientY };
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (this.isDragging && this.draggingGuardianConfig) {
      const vPos = this.screenToVirtual(e.clientX, e.clientY);
      const nearestNode = this.findNearestEmptyNode(vPos.x, vPos.y, 45);
      if (nearestNode) {
        this.placeGuardian(this.draggingGuardianConfig.id, nearestNode);
      }
      this.isDragging = false;
      this.draggingGuardianConfig = null;
    }
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const vPos = this.screenToVirtual(touch.clientX, touch.clientY);
      this.checkNodeClick(vPos.x, vPos.y);
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (this.isDragging && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      this.dragScreenPos = { x: touch.clientX, y: touch.clientY };
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (this.isDragging && this.draggingGuardianConfig) {
      const vPos = this.screenToVirtual(this.dragScreenPos.x, this.dragScreenPos.y);
      const nearestNode = this.findNearestEmptyNode(vPos.x, vPos.y, 50);
      if (nearestNode) {
        this.placeGuardian(this.draggingGuardianConfig.id, nearestNode);
      }
      this.isDragging = false;
      this.draggingGuardianConfig = null;
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    this.scale = Math.max(0.6, Math.min(2.0, this.scale * zoomFactor));
  };

  private checkNodeClick(vx: number, vy: number) {
    // Check if player clicked a placement node
    for (const node of this.placementNodes) {
      const dist = Math.hypot(node.x - vx, node.y - vy);
      if (dist <= 30) {
        this.selectedNode = node;
        const placed = node.placedGuardianInstanceId 
          ? this.placedGuardians.get(node.placedGuardianInstanceId) || null 
          : null;
        this.callbacks.onSelectedGuardianChange(placed, node);
        soundEngine.playPlacement();
        return;
      }
    }

    // Deselect if clicked outside
    this.selectedNode = null;
    this.callbacks.onSelectedGuardianChange(null, null);
  }

  public startDragGuardian(config: GuardianConfig, clientX: number, clientY: number) {
    this.draggingGuardianConfig = config;
    this.isDragging = true;
    this.dragScreenPos = { x: clientX, y: clientY };
  }

  private findNearestEmptyNode(vx: number, vy: number, maxDist: number): PlacementNode | null {
    let bestNode: PlacementNode | null = null;
    let minDist = maxDist;

    this.placementNodes.forEach(node => {
      if (node.placedGuardianInstanceId) return;
      const dist = Math.hypot(node.x - vx, node.y - vy);
      if (dist < minDist) {
        minDist = dist;
        bestNode = node;
      }
    });

    return bestNode;
  }
}
