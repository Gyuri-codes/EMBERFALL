import React, { useEffect, useRef, useState } from 'react';
import {
  ActiveEnemy,
  ChallengeModifier,
  GameMode,
  GuardianConfig,
  PlacedGuardian,
  PlacementNode,
  PlayerAbility,
  RealmData,
  GameSaveState
} from '../types/game';
import { GameEngine } from '../game/GameEngine';
import { GUARDIANS_DATA, UPGRADE_LEVELS } from '../data/guardians';
import { PLAYER_ABILITIES } from '../data/cultivation';
import { soundEngine } from '../audio/soundEngine';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Sparkles,
  Shield,
  Trash2,
  ChevronUp,
  Maximize2,
  X,
  Volume2,
  VolumeX,
  Flame,
  Zap,
  Snowflake,
  Wind,
  Sun,
  Award,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

interface BattleScreenProps {
  realm: RealmData;
  gameMode: GameMode;
  challenge?: ChallengeModifier;
  saveState: GameSaveState;
  onVictory: (stars: number, shardsEarned: number, totalKills: number) => void;
  onDefeat: (wave: number, totalKills: number) => void;
  onExit: () => void;
  onScreenReaderNotice: (msg: string) => void;
}

export const BattleScreen: React.FC<BattleScreenProps> = ({
  realm,
  gameMode,
  challenge,
  saveState,
  onVictory,
  onDefeat,
  onExit,
  onScreenReaderNotice
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // HUD State
  const [spiritEssence, setSpiritEssence] = useState(250);
  const [celestialShards, setCelestialShards] = useState(0);
  const [coreHp, setCoreHp] = useState(1000);
  const [coreMaxHp, setCoreMaxHp] = useState(1000);
  const [currentWave, setCurrentWave] = useState(0);
  const [totalWaves, setTotalWaves] = useState(realm.totalWaves);
  const [isWaveActive, setIsWaveActive] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [activeBoss, setActiveBoss] = useState<ActiveEnemy | null>(null);

  // Inspector & Placement
  const [selectedGuardian, setSelectedGuardian] = useState<PlacedGuardian | null>(null);
  const [selectedNode, setSelectedNode] = useState<PlacementNode | null>(null);
  const [selectedConfigToPlace, setSelectedConfigToPlace] = useState<GuardianConfig | null>(null);

  // Abilities
  const [abilities, setAbilities] = useState<PlayerAbility[]>(PLAYER_ABILITIES.map(a => ({ ...a })));
  const [abilityCooldowns, setAbilityCooldowns] = useState<Record<string, number>>({});

  // End game dialogs
  const [victoryData, setVictoryData] = useState<{ stars: number; shards: number; kills: number } | null>(null);
  const [defeatData, setDefeatData] = useState<{ wave: number; kills: number } | null>(null);

  // Filter unlocked guardians
  const availableGuardians = GUARDIANS_DATA.filter(g => 
    g.unlockedByDefault || saveState.unlockedGuardianIds.includes(g.id)
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(
      canvas,
      realm,
      {
        onEssenceChange: setSpiritEssence,
        onShardsChange: setCelestialShards,
        onCoreHpChange: (hp, max) => {
          setCoreHp(hp);
          setCoreMaxHp(max);
        },
        onWaveChange: (w, total, active) => {
          setCurrentWave(w);
          setTotalWaves(total);
          setIsWaveActive(active);
        },
        onBossStateChange: setActiveBoss,
        onSelectedGuardianChange: (guardian, node) => {
          setSelectedGuardian(guardian);
          setSelectedNode(node);
          if (node && !node.placedGuardianInstanceId) {
            // Pick first affordable guardian as default selection
            setSelectedConfigToPlace(availableGuardians[0]);
          } else {
            setSelectedConfigToPlace(null);
          }
        },
        onVictory: (stars, shards, kills) => {
          setVictoryData({ stars, shards, kills });
          onVictory(stars, shards, kills);
        },
        onDefeat: (wave, kills) => {
          setDefeatData({ wave, kills });
          onDefeat(wave, kills);
        },
        onScreenReaderNotice: onScreenReaderNotice
      },
      saveState.settings,
      gameMode,
      abilities,
      saveState.equippedCosmetics
    );

    engineRef.current = engine;
    engine.start();

    // Poll ability cooldowns for UI
    const cdInterval = setInterval(() => {
      const cds: Record<string, number> = {};
      abilities.forEach(a => {
        cds[a.id] = Math.ceil(a.currentCooldown);
      });
      setAbilityCooldowns(cds);
    }, 200);

    // Keyboard Shortcuts Remapping
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      const bindings = saveState.settings.keybindings;

      if (e.code === 'Space' || key === bindings.pause.toUpperCase()) {
        e.preventDefault();
        togglePause();
      } else if (key === bindings.fastForward.toUpperCase()) {
        cycleSpeed();
      } else if (e.code === 'Enter' || key === bindings.startWave.toUpperCase()) {
        startNextWave();
      } else if (e.code === 'Escape' || key === bindings.deselect.toUpperCase()) {
        setSelectedNode(null);
        setSelectedGuardian(null);
        setSelectedConfigToPlace(null);
      } else if (key === bindings.ability1) {
        handleCastAbility(abilities[0]?.id);
      } else if (key === bindings.ability2) {
        handleCastAbility(abilities[1]?.id);
      } else if (key === bindings.ability3) {
        handleCastAbility(abilities[2]?.id);
      } else if (key === bindings.ability4) {
        handleCastAbility(abilities[3]?.id);
      } else if (key === bindings.ability5) {
        handleCastAbility(abilities[4]?.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(cdInterval);
      window.removeEventListener('keydown', handleKeyDown);
      engine.destroy();
    };
  }, [realm]);

  const togglePause = () => {
    if (engineRef.current) {
      const paused = engineRef.current.togglePause();
      setIsPaused(paused);
    }
  };

  const cycleSpeed = () => {
    const next = gameSpeed === 1 ? 2 : gameSpeed === 2 ? 3 : 1;
    setGameSpeed(next);
    if (engineRef.current) {
      engineRef.current.setSpeed(next);
    }
  };

  const startNextWave = () => {
    if (engineRef.current) {
      engineRef.current.startNextWave();
    }
  };

  const handlePlaceGuardianOnSelected = (config: GuardianConfig) => {
    if (engineRef.current && selectedNode && !selectedNode.placedGuardianInstanceId) {
      engineRef.current.placeGuardian(config.id, selectedNode);
    }
  };

  const handleUpgrade = () => {
    if (engineRef.current && selectedGuardian) {
      engineRef.current.upgradeGuardian(selectedGuardian.instanceId);
    }
  };

  const handleSell = () => {
    if (engineRef.current && selectedGuardian) {
      engineRef.current.sellGuardian(selectedGuardian.instanceId);
    }
  };

  const handlePriorityChange = (priority: 'first' | 'last' | 'strongest' | 'closest') => {
    if (engineRef.current && selectedGuardian) {
      engineRef.current.setTargetPriority(selectedGuardian.instanceId, priority);
    }
  };

  const handleCastAbility = (abilityId?: string) => {
    if (!abilityId || !engineRef.current) return;
    engineRef.current.castAbility(abilityId);
  };

  const getAbilityIcon = (id: string) => {
    switch (id) {
      case 'inferno_dragon': return <Flame className="w-5 h-5 text-orange-400" />;
      case 'heavenly_thunder': return <Zap className="w-5 h-5 text-purple-400" />;
      case 'frozen_domain': return <Snowflake className="w-5 h-5 text-cyan-400" />;
      case 'world_cleaving_wind': return <Wind className="w-5 h-5 text-emerald-400" />;
      case 'celestial_rebirth': return <Sun className="w-5 h-5 text-amber-400" />;
      default: return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  const selectedGuardianConfig = selectedGuardian 
    ? GUARDIANS_DATA.find(g => g.id === selectedGuardian.configId) 
    : null;

  const currentUpgradeData = selectedGuardian 
    ? UPGRADE_LEVELS.find(u => u.level === selectedGuardian.level) 
    : null;

  const nextUpgradeData = selectedGuardian && selectedGuardian.level < 5
    ? UPGRADE_LEVELS.find(u => u.level === selectedGuardian.level + 1)
    : null;

  const coreHpPercent = Math.max(0, Math.round((coreHp / coreMaxHp) * 100));

  return (
    <div 
      id="battle-screen"
      className="relative w-full h-[calc(100vh-50px)] bg-neutral-950 text-neutral-100 flex flex-col justify-between overflow-hidden select-none"
    >
      {/* 1. TOP BATTLE HUD */}
      <div 
        id="battle-top-hud"
        className="relative z-20 w-full px-3 py-2 bg-gradient-to-b from-neutral-950/95 via-neutral-950/80 to-transparent flex items-center justify-between pointer-events-auto"
      >
        {/* Top Left: Wave Information */}
        <div id="hud-wave-info" className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-lg bg-neutral-900/90 border border-amber-500/30 flex flex-col">
            <div className="text-[10px] text-neutral-400 font-cinzel uppercase tracking-wider">
              {gameMode === 'endless' ? 'Endless Trial' : 'Defensive Wave'}
            </div>
            <div className="text-base sm:text-lg font-bold font-cinzel text-amber-300 flex items-center space-x-1">
              <span>Wave {currentWave}</span>
              <span className="text-neutral-500 text-xs">/ {gameMode === 'endless' ? '∞' : totalWaves}</span>
            </div>
          </div>

          {!isWaveActive && (
            <button
              id="hud-btn-start-wave"
              onClick={startNextWave}
              className="px-4 py-2 rounded-lg font-cinzel font-bold text-xs sm:text-sm tracking-wider text-amber-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-md shadow-orange-950/40 border border-amber-300 animate-pulse flex items-center space-x-1.5 transition-all"
              aria-label="Start next wave of enemies"
            >
              <Play className="w-4 h-4 fill-amber-950" />
              <span>START WAVE</span>
            </button>
          )}
        </div>

        {/* Top Center: Realm Core Integrity Bar */}
        <div id="hud-core-health" className="flex flex-col items-center max-w-[220px] sm:max-w-xs w-full px-2">
          <div className="flex items-center justify-between w-full text-[11px] font-cinzel text-neutral-300 mb-1">
            <span className="flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold">REALM CORE</span>
            </span>
            <span className={`font-bold ${coreHpPercent > 50 ? 'text-emerald-400' : coreHpPercent > 25 ? 'text-amber-400' : 'text-red-400'}`}>
              {coreHp} / {coreMaxHp} ({coreHpPercent}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-700/60 p-0.5">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                coreHpPercent > 50 
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' 
                  : coreHpPercent > 25 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                  : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
              }`}
              style={{ width: `${coreHpPercent}%` }}
            />
          </div>
        </div>

        {/* Top Right: Currencies & Speed / Pause Controls */}
        <div id="hud-controls-right" className="flex items-center space-x-2 sm:space-x-3">
          {/* Spirit Essence (Placement Currency) */}
          <div 
            id="hud-essence-counter"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-cyan-950/40 border border-cyan-500/40 text-xs sm:text-sm font-bold text-cyan-300"
            title="Spirit Essence (Earned by vanquishing enemies, used for placing and upgrading cultivators)"
          >
            <span className="text-cyan-400">💧</span>
            <span>{spiritEssence}</span>
          </div>

          {/* Celestial Shards Earned in this battle */}
          <div 
            id="hud-shards-counter"
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-500/40 text-xs sm:text-sm font-bold text-amber-300"
            title="Celestial Shards gathered"
          >
            <span className="text-amber-400">✦</span>
            <span>{celestialShards}</span>
          </div>

          {/* Speed Toggle: 1x, 2x, 3x */}
          <button
            id="hud-btn-speed"
            onClick={cycleSpeed}
            className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-700 hover:border-amber-500/50 text-xs font-cinzel font-bold text-amber-300 transition-colors"
            title="Change Game Speed (1x, 2x, 3x)"
            aria-label={`Current speed ${gameSpeed}x. Click to cycle.`}
          >
            {gameSpeed}x
          </button>

          {/* Pause Toggle */}
          <button
            id="hud-btn-pause"
            onClick={togglePause}
            className="p-1.5 rounded-md bg-neutral-900 border border-neutral-700 hover:border-amber-500/50 text-neutral-300 hover:text-amber-300 transition-colors"
            title={isPaused ? "Resume Battle" : "Pause Battle"}
            aria-label={isPaused ? "Game paused, click to resume" : "Game running, click to pause"}
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Exit / Surrender */}
          <button
            id="hud-btn-exit"
            onClick={onExit}
            className="p-1.5 rounded-md bg-neutral-900 border border-neutral-700 hover:border-red-500/50 text-neutral-400 hover:text-red-400 transition-colors"
            title="Exit Battlefield"
            aria-label="Exit Battlefield"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. BOSS HEALTH OVERLAY (Appears when Boss arrives) */}
      {activeBoss && (
        <div 
          id="boss-health-banner"
          className="absolute top-14 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 pointer-events-none"
        >
          <div className="bg-neutral-950/90 border-2 border-red-600 rounded-xl p-3 shadow-2xl shadow-red-950/80 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-cinzel font-bold text-red-300">
              <span className="flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                <span>{activeBoss.config.name}</span>
              </span>
              <span>{Math.max(0, Math.round(activeBoss.hp))} / {activeBoss.maxHp} HP</span>
            </div>
            <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden border border-red-800 mt-1.5">
              <div 
                className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, (activeBoss.hp / Math.max(1, activeBoss.maxHp)) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN CANVAS CONTAINER (Full Interactive Touch & Canvas) */}
      <div 
        id="battle-canvas-stage"
        className="relative flex-1 w-full h-full cursor-crosshair overflow-hidden"
      >
        <canvas 
          ref={canvasRef} 
          className="w-full h-full block" 
        />

        {/* Strategic instructions hint when empty */}
        {currentWave === 0 && !selectedNode && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none bg-neutral-950/80 border border-amber-500/30 rounded-xl px-4 py-2.5 text-center text-xs text-amber-200 backdrop-blur-sm shadow-xl">
            <span className="font-cinzel font-bold">Tap any ☯ Pedestal</span> along the path to deploy your Cultivators.
          </div>
        )}
      </div>

      {/* 4. SELECTION / INSPECTOR DRAWER (When a Pedestal or Placed Guardian is selected) */}
      {selectedNode && (
        <div 
          id="node-inspector-drawer"
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-3 pointer-events-auto"
        >
          <div className="bg-neutral-950/95 border-2 border-amber-500/60 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-md">
            {/* If empty node: Show deploy options */}
            {!selectedGuardian ? (
              <div>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
                  <div className="font-cinzel text-xs sm:text-sm font-bold text-amber-300">
                    Deploy Cultivator to Pedestal
                  </div>
                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="text-neutral-400 hover:text-neutral-200 text-xs px-2 py-0.5 rounded border border-neutral-800"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availableGuardians.map(g => {
                    const canAfford = spiritEssence >= g.baseCost;
                    return (
                      <button
                        key={g.id}
                        id={`deploy-btn-${g.id}`}
                        onClick={() => handlePlaceGuardianOnSelected(g)}
                        disabled={!canAfford}
                        className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          canAfford 
                            ? 'bg-neutral-900/90 border-neutral-700 hover:border-amber-400 hover:bg-neutral-800' 
                            : 'bg-neutral-950/60 border-neutral-800/60 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-100">{g.name}</span>
                            <span className="text-[10px] uppercase font-bold" style={{ color: g.color }}>
                              {g.element}
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                            {g.attackName}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-cyan-300 font-cinzel">
                          <span>💧 {g.baseCost}</span>
                          <span className="text-[10px] text-neutral-400">Dmg {g.baseDamage}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* If Guardian already placed: Show Upgrade, Stats, Priority, Dissolve */
              <div>
                <div className="flex items-start justify-between border-b border-neutral-800 pb-2 mb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-neutral-900 border" style={{ borderColor: selectedGuardianConfig?.color }}>
                      ☯
                    </div>
                    <div>
                      <div className="font-cinzel text-sm font-bold text-amber-300 flex items-center space-x-2">
                        <span>{selectedGuardianConfig?.name}</span>
                        <span className="text-xs px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/40 text-amber-200">
                          Lv.{selectedGuardian.level}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Rank: <span className="text-amber-400">{currentUpgradeData?.rankName}</span> &bull; {currentUpgradeData?.visualTitle}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedNode(null);
                      setSelectedGuardian(null);
                    }}
                    className="text-neutral-400 hover:text-neutral-200 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Stat Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                  <div className="bg-neutral-900/80 p-1.5 rounded-lg border border-neutral-800">
                    <div className="text-[10px] text-neutral-500 uppercase">Damage</div>
                    <div className="font-bold text-neutral-200">
                      {Math.round((selectedGuardianConfig?.baseDamage || 20) * (currentUpgradeData?.damageMultiplier || 1))}
                    </div>
                  </div>
                  <div className="bg-neutral-900/80 p-1.5 rounded-lg border border-neutral-800">
                    <div className="text-[10px] text-neutral-500 uppercase">Range</div>
                    <div className="font-bold text-neutral-200">
                      {Math.round((selectedGuardianConfig?.baseRange || 120) * (currentUpgradeData?.rangeMultiplier || 1))}
                    </div>
                  </div>
                  <div className="bg-neutral-900/80 p-1.5 rounded-lg border border-neutral-800">
                    <div className="text-[10px] text-neutral-500 uppercase">Total Dmg</div>
                    <div className="font-bold text-amber-400">
                      {selectedGuardian.damageDealt.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Priority Selector & Actions */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  {/* Targeting Priority */}
                  <div className="flex items-center space-x-1 text-[11px] bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] px-1 font-cinzel">Target:</span>
                    {(['first', 'strongest', 'closest', 'last'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => handlePriorityChange(p)}
                        className={`px-1.5 py-0.5 rounded capitalize ${
                          selectedGuardian.targetPriority === p 
                            ? 'bg-amber-600 text-white font-bold' 
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* Upgrade and Dissolve Buttons */}
                  <div className="flex items-center space-x-2">
                    {nextUpgradeData ? (
                      <button
                        id="btn-upgrade-guardian"
                        onClick={handleUpgrade}
                        disabled={spiritEssence < nextUpgradeData.costEssence}
                        className={`px-3 py-1.5 rounded-lg font-cinzel text-xs font-bold transition-all flex items-center space-x-1 ${
                          spiritEssence >= nextUpgradeData.costEssence
                            ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-md shadow-amber-950'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Ascend (💧 {nextUpgradeData.costEssence})</span>
                      </button>
                    ) : (
                      <span className="text-xs font-cinzel font-bold text-amber-400 px-2">
                        Max Realm Reached
                      </span>
                    )}

                    <button
                      id="btn-sell-guardian"
                      onClick={handleSell}
                      className="p-1.5 rounded-lg bg-neutral-900 hover:bg-red-950/60 border border-neutral-800 hover:border-red-500/50 text-neutral-400 hover:text-red-400 transition-colors"
                      title="Dissolve Cultivator (Refunds 65% Essence)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. BOTTOM BARS: Guardian Quick Selection & Active Player Abilities */}
      <div 
        id="battle-bottom-hud"
        className="relative z-20 w-full px-3 py-2 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent flex flex-col sm:flex-row items-center justify-between gap-2 pointer-events-auto"
      >
        {/* Left: Guardian Quick Drag/Click Selection Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
          <div className="text-[10px] font-cinzel text-neutral-500 uppercase tracking-widest hidden md:block pr-1">
            Cultivators
          </div>
          {availableGuardians.map(g => {
            const canAfford = spiritEssence >= g.baseCost;
            return (
              <button
                key={g.id}
                id={`bar-guardian-${g.id}`}
                onPointerDown={(e) => {
                  if (canAfford && engineRef.current) {
                    engineRef.current.startDragGuardian(g, e.clientX, e.clientY);
                  }
                }}
                onClick={() => {
                  if (selectedNode && !selectedNode.placedGuardianInstanceId) {
                    handlePlaceGuardianOnSelected(g);
                  } else {
                    setSelectedConfigToPlace(g);
                  }
                }}
                disabled={!canAfford}
                className={`relative px-2.5 py-1.5 rounded-xl border flex items-center space-x-2 transition-all shrink-0 cursor-grab active:cursor-grabbing ${
                  canAfford 
                    ? 'bg-neutral-900/90 border-neutral-700/80 hover:border-amber-400 hover:scale-105 active:scale-95' 
                    : 'bg-neutral-950/60 border-neutral-800/60 opacity-40 cursor-not-allowed'
                }`}
                title={`${g.name} (${g.element.toUpperCase()}) - Click to select or drag onto pedestal`}
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs" 
                  style={{ backgroundColor: `${g.color}33`, color: g.color }}
                >
                  ☯
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-neutral-100 font-cinzel leading-tight">{g.name}</div>
                  <div className="text-[10px] text-cyan-300 font-bold font-sans">💧 {g.baseCost}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Battlefield Active Abilities Bar */}
        <div id="hud-player-abilities" className="flex items-center space-x-2 shrink-0">
          <div className="text-[10px] font-cinzel text-neutral-500 uppercase tracking-widest hidden lg:block pr-1">
            Sacred Arts
          </div>
          {abilities.map((ability, idx) => {
            const cd = abilityCooldowns[ability.id] || 0;
            const isOnCd = cd > 0;
            const canAfford = spiritEssence >= ability.costEssence;

            return (
              <button
                key={ability.id}
                id={`ability-btn-${ability.id}`}
                draggable={false}
                onClick={() => handleCastAbility(ability.id)}
                disabled={isOnCd || !canAfford}
                className={`relative p-2 sm:px-3 sm:py-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  !isOnCd && canAfford
                    ? 'bg-neutral-900 border-amber-500/60 hover:border-amber-400 hover:bg-neutral-800 shadow-md shadow-amber-950/40 active:scale-95'
                    : 'bg-neutral-950/70 border-neutral-800 text-neutral-600 opacity-60 cursor-not-allowed'
                }`}
                title={`${ability.name} (💧 ${ability.costEssence}) [Key: ${idx + 1}] - ${ability.description}`}
              >
                {/* Hotkey badge */}
                <span className="absolute top-0.5 right-1 text-[9px] text-neutral-500 font-mono">
                  {idx + 1}
                </span>

                {getAbilityIcon(ability.id)}

                <span className="text-[9px] font-bold text-neutral-300 hidden sm:block mt-0.5">
                  💧 {ability.costEssence}
                </span>

                {/* Cooldown Overlay */}
                {isOnCd && (
                  <div className="absolute inset-0 bg-neutral-950/80 rounded-xl flex items-center justify-center font-bold text-xs text-amber-400 font-mono">
                    {cd}s
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. VICTORY MODAL */}
      {victoryData && (
        <div 
          id="victory-modal"
          className="absolute inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-neutral-900 border-2 border-amber-400 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl shadow-amber-500/20">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 mb-3">
              <Award className="w-8 h-8" />
            </div>

            <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-amber-300">
              REALM DEFENDED!
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              The shadow incursions have been purged by the Dao.
            </p>

            {/* Stars */}
            <div className="flex justify-center space-x-2 my-4 text-2xl text-amber-400">
              {'★'.repeat(victoryData.stars)}{'☆'.repeat(3 - victoryData.stars)}
            </div>

            {/* Reward details */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 my-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-400">Celestial Shards Acquired:</span>
                <span className="font-bold text-amber-300">+{victoryData.shards} ✦</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Demons Vanquished:</span>
                <span className="font-bold text-neutral-200">{victoryData.kills}</span>
              </div>
            </div>

            <button
              id="victory-btn-continue"
              onClick={onExit}
              className="w-full py-3 rounded-xl font-cinzel font-bold text-sm tracking-wider text-amber-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-lg shadow-orange-950/40"
            >
              RETURN TO TERRITORIES
            </button>
          </div>
        </div>
      )}

      {/* 7. DEFEAT MODAL */}
      {defeatData && (
        <div 
          id="defeat-modal"
          className="absolute inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-neutral-900 border-2 border-red-600 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl shadow-red-950/40">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-400 mb-3">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-red-400">
              REALM CORE SHATTERED
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              The darkness breached your spiritual formations on Wave {defeatData.wave}.
            </p>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 my-4 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Demons Banished Before Fall:</span>
                <span className="font-bold text-neutral-200">{defeatData.kills}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                id="defeat-btn-retry"
                onClick={() => {
                  setDefeatData(null);
                  if (engineRef.current) {
                    engineRef.current.coreHp = engineRef.current.coreMaxHp;
                    engineRef.current.spiritEssence = 250;
                    engineRef.current.start();
                  }
                }}
                className="flex-1 py-2.5 rounded-xl font-cinzel font-bold text-xs sm:text-sm tracking-wider bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
              >
                RETRY REALM
              </button>

              <button
                id="defeat-btn-exit"
                onClick={onExit}
                className="flex-1 py-2.5 rounded-xl font-cinzel font-bold text-xs sm:text-sm tracking-wider text-amber-950 bg-amber-400 hover:bg-amber-300"
              >
                FALL BACK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
