import React, { useState } from 'react';
import { GUARDIANS_DATA, UPGRADE_LEVELS } from '../data/guardians';
import { GuardianConfig, GameSaveState } from '../types/game';
import { ArrowLeft, Lock, Unlock, Shield, Sparkles, Sword, Target, Clock, Zap, Flame, Snowflake, Wind, HeartPulse } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface GuardiansScreenProps {
  saveState: GameSaveState;
  onUnlockGuardian: (guardianId: string, cost: number) => void;
  onBack: () => void;
}

export const GuardiansScreen: React.FC<GuardiansScreenProps> = ({
  saveState,
  onUnlockGuardian,
  onBack
}) => {
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianConfig>(GUARDIANS_DATA[0]);

  const isUnlocked = (id: string) => {
    const guardian = GUARDIANS_DATA.find(g => g.id === id);
    return Boolean(guardian?.unlockedByDefault || saveState.unlockedGuardianIds.includes(id));
  };

  const handleUnlock = (guardian: GuardianConfig) => {
    if (saveState.celestialShards >= guardian.unlockCostShards) {
      soundEngine.playUpgrade();
      onUnlockGuardian(guardian.id, guardian.unlockCostShards);
    }
  };

  const getElementBadge = (element: string) => {
    switch (element) {
      case 'fire': return { text: '火 Fire', color: 'text-red-400 bg-red-950/40 border-red-500/40' };
      case 'lightning': return { text: '雷 Lightning', color: 'text-purple-400 bg-purple-950/40 border-purple-500/40' };
      case 'ice': return { text: '冰 Ice', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/40' };
      case 'wind': return { text: '风 Wind', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40' };
      case 'celestial': return { text: '天 Celestial', color: 'text-yellow-400 bg-yellow-950/40 border-yellow-500/40' };
      case 'shadow': return { text: '暗 Shadow', color: 'text-violet-400 bg-violet-950/40 border-violet-500/40' };
      case 'life': return { text: '生 Life', color: 'text-green-400 bg-green-950/40 border-green-500/40' };
      case 'dragon': return { text: '龙 Dragon', color: 'text-sky-400 bg-sky-950/40 border-sky-500/40' };
      default: return { text: element, color: 'text-neutral-400 bg-neutral-900 border-neutral-700' };
    }
  };

  const selectedIsUnlocked = isUnlocked(selectedGuardian.id);
  const elementInfo = getElementBadge(selectedGuardian.element);

  return (
    <div 
      id="guardians-screen"
      className="min-h-[calc(100vh-50px)] w-full p-4 sm:p-6 lg:p-8 bg-neutral-950 text-neutral-100 flex flex-col justify-between max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-900/30 pb-4">
        <div className="flex items-center space-x-3">
          <button
            id="guardians-back-btn"
            onClick={onBack}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-800 transition-colors"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wider text-amber-300">
              IMMORTAL GUARDIAN CULTIVATORS
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400">
              Living masters of martial Dao and spiritual elements defending the Last Realm
            </p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-neutral-900 border border-amber-500/30 text-xs text-amber-300 font-cinzel">
          ✦ {saveState.celestialShards.toLocaleString()} Shards Available
        </div>
      </div>

      {/* Main Grid: Cultivator Cards Roster & Detailed Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6">
        {/* Roster Column */}
        <div className="lg:col-span-5 flex flex-col space-y-2.5 overflow-y-auto max-h-[550px] pr-1">
          <div className="text-xs font-cinzel text-neutral-400 uppercase tracking-widest px-1">
            Cultivator Roster ({GUARDIANS_DATA.length})
          </div>

          {GUARDIANS_DATA.map(g => {
            const unlocked = g.unlockedByDefault || saveState.unlockedGuardianIds.includes(g.id);
            const isSelected = selectedGuardian.id === g.id;

            return (
              <button
                key={g.id}
                id={`roster-guardian-${g.id}`}
                onClick={() => {
                  setSelectedGuardian(g);
                  soundEngine.playPlacement();
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                  isSelected 
                    ? 'bg-neutral-900 border-amber-500 ring-1 ring-amber-500' 
                    : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-900 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg border"
                    style={{ borderColor: g.color, backgroundColor: `${g.color}15`, color: g.color }}
                  >
                    ☯
                  </div>
                  <div>
                    <div className="font-cinzel text-sm sm:text-base font-bold text-neutral-100 flex items-center space-x-2">
                      <span>{g.name}</span>
                      {!unlocked && <Lock className="w-3.5 h-3.5 text-neutral-500" />}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {g.weapon}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getElementBadge(g.element).color} uppercase font-bold`}>
                    {g.element}
                  </span>
                  <div className="text-xs text-cyan-300 font-bold font-sans mt-1">
                    💧 {g.baseCost}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Guardian Showcase */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-neutral-900/70 border border-amber-900/30 rounded-2xl p-5 lg:p-6 backdrop-blur-sm">
          <div>
            {/* Title & Element */}
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${elementInfo.color} font-bold uppercase`}>
                  {elementInfo.text}
                </span>
                <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-amber-200 mt-2">
                  {selectedGuardian.name}
                </h2>
                <div className="text-xs sm:text-sm text-neutral-400 italic">
                  {selectedGuardian.title}
                </div>
              </div>

              {!selectedIsUnlocked ? (
                <button
                  id="btn-unlock-guardian"
                  onClick={() => handleUnlock(selectedGuardian)}
                  disabled={saveState.celestialShards < selectedGuardian.unlockCostShards}
                  className={`px-4 py-2 rounded-xl font-cinzel text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    saveState.celestialShards >= selectedGuardian.unlockCostShards
                      ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-lg shadow-amber-950/40'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <Unlock className="w-4 h-4" />
                  <span>Awaken (✦ {selectedGuardian.unlockCostShards})</span>
                </button>
              ) : (
                <span className="text-xs font-cinzel text-emerald-400 flex items-center space-x-1 bg-emerald-950/50 border border-emerald-500/40 px-3 py-1 rounded-full">
                  <span>Awakened to Realm</span>
                </span>
              )}
            </div>

            {/* Lore Quote */}
            <div className="my-4 p-3 rounded-xl bg-neutral-950/70 border-l-2 border-amber-500 text-xs sm:text-sm text-amber-100/90 italic">
              &ldquo;{selectedGuardian.quote}&rdquo;
            </div>

            {/* Description & Weapon */}
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {selectedGuardian.description}
            </p>

            <div className="mt-3 text-xs text-neutral-400">
              <span className="text-amber-400 font-cinzel font-semibold">Spiritual Weapon: </span>
              {selectedGuardian.weapon}
            </div>

            {/* Base Combat Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
              <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-cinzel">Base Damage</div>
                <div className="text-base font-bold text-neutral-200 mt-0.5">{selectedGuardian.baseDamage}</div>
              </div>
              <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-cinzel">Range Radius</div>
                <div className="text-base font-bold text-neutral-200 mt-0.5">{selectedGuardian.baseRange}</div>
              </div>
              <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-cinzel">Attack Speed</div>
                <div className="text-base font-bold text-neutral-200 mt-0.5">{selectedGuardian.attackSpeed} / sec</div>
              </div>
              <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-cinzel">Essence Cost</div>
                <div className="text-base font-bold text-cyan-300 mt-0.5">💧 {selectedGuardian.baseCost}</div>
              </div>
            </div>

            {/* Ultimate Secret Art */}
            <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-950/30 to-neutral-950 border border-amber-600/30">
              <div className="flex items-center space-x-2 text-xs font-cinzel text-amber-300 font-bold uppercase">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Supreme Secret Art: {selectedGuardian.ultimateName}</span>
              </div>
              <div className="text-xs text-neutral-300 mt-1">
                {selectedGuardian.ultimateDesc}
              </div>
            </div>

            {/* In-Battle Cultivation Transformation Levels (1 to 5) */}
            <div className="mt-5">
              <div className="text-xs font-cinzel text-neutral-400 uppercase tracking-wider mb-2">
                In-Battle Cultivation Breakthroughs (5 Levels)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center text-xs">
                {UPGRADE_LEVELS.map(lvl => (
                  <div key={lvl.level} className="bg-neutral-950/80 p-2 rounded-lg border border-neutral-800 text-[11px]">
                    <div className="font-bold text-amber-300 font-cinzel">Lv.{lvl.level}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{lvl.rankName}</div>
                    <div className="text-[9px] text-neutral-500 mt-1">{lvl.visualTitle}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
