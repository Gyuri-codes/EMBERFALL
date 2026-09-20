import React, { useState } from 'react';
import { CULTIVATION_RANKS } from '../data/guardians';
import { CULTIVATION_SKILL_TREE } from '../data/cultivation';
import { CultivationRank, CultivationSkillNode, GameSaveState } from '../types/game';
import { ArrowLeft, Sparkles, Shield, Flame, Sword, Clock, Heart, Target, Crown, Award, CheckCircle2 } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface CultivationScreenProps {
  saveState: GameSaveState;
  onUpgradeSkill: (skillId: string, cost: number) => void;
  onRankBreakthrough: (nextRank: CultivationRank) => void;
  onBack: () => void;
}

export const CultivationScreen: React.FC<CultivationScreenProps> = ({
  saveState,
  onUpgradeSkill,
  onRankBreakthrough,
  onBack
}) => {
  const [activeBranch, setActiveBranch] = useState<'all' | 'elemental' | 'core' | 'celestial' | 'guardian'>('all');

  const currentRankIndex = CULTIVATION_RANKS.indexOf(saveState.playerCultivationRank);
  const nextRank = currentRankIndex < CULTIVATION_RANKS.length - 1 ? CULTIVATION_RANKS[currentRankIndex + 1] : null;

  // Breakthrough requirement: e.g. total allocated skill levels >= (currentRankIndex + 1) * 3
  const totalSkillPointsAllocated = Object.values(saveState.allocatedSkills).reduce((a, b) => a + b, 0);
  const requiredSkillPointsForNext = (currentRankIndex + 1) * 3;
  const canBreakthrough = nextRank && totalSkillPointsAllocated >= requiredSkillPointsForNext;

  const handleBreakthrough = () => {
    if (canBreakthrough && nextRank) {
      soundEngine.playUpgrade();
      onRankBreakthrough(nextRank);
    }
  };

  const handleLevelUpSkill = (skill: CultivationSkillNode) => {
    const curLevel = saveState.allocatedSkills[skill.id] || 0;
    if (curLevel >= skill.maxLevel) return;
    if (saveState.celestialShards >= skill.costShards) {
      soundEngine.playUpgrade();
      onUpgradeSkill(skill.id, skill.costShards);
    }
  };

  const filteredSkills = activeBranch === 'all' 
    ? CULTIVATION_SKILL_TREE 
    : CULTIVATION_SKILL_TREE.filter(s => s.branch === activeBranch);

  const getBranchIcon = (branch: string) => {
    switch (branch) {
      case 'elemental': return <Flame className="w-4 h-4 text-red-400" />;
      case 'core': return <Shield className="w-4 h-4 text-cyan-400" />;
      case 'celestial': return <Clock className="w-4 h-4 text-amber-400" />;
      case 'guardian': return <Sword className="w-4 h-4 text-purple-400" />;
      default: return <Sparkles className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div 
      id="cultivation-screen"
      className="min-h-[calc(100vh-50px)] w-full p-4 sm:p-6 lg:p-8 bg-neutral-950 text-neutral-100 flex flex-col justify-between max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/30 pb-4">
        <div className="flex items-center space-x-3">
          <button
            id="cultivation-back-btn"
            onClick={onBack}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-800 transition-colors"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wider text-amber-300">
              CULTIVATION & PERMANENT DAO PROGRESSION
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400">
              Absorb Celestial Shards to ascend through immortal cultivation realms
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-amber-500/40 text-xs sm:text-sm text-amber-300 font-cinzel font-bold">
            ✦ {saveState.celestialShards.toLocaleString()} Shards Available
          </div>
        </div>
      </div>

      {/* Cultivation Realm Breakthrough Tracker Bar */}
      <div className="my-6 p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-neutral-900 to-neutral-900 border border-amber-600/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-cinzel text-amber-400 uppercase tracking-widest">
              Current Cultivation Rank
            </div>
            <div className="font-cinzel text-xl sm:text-2xl font-bold text-amber-200 mt-0.5 flex items-center space-x-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>{saveState.playerCultivationRank}</span>
              <span className="text-xs text-neutral-400 font-sans font-normal">
                (Stage {currentRankIndex + 1} of 8)
              </span>
            </div>
          </div>

          {nextRank ? (
            <div className="flex items-center space-x-3">
              <div className="text-left md:text-right text-xs">
                <div className="text-neutral-400">Dao Breakthrough to: <span className="font-bold text-amber-300">{nextRank}</span></div>
                <div className="text-neutral-500">
                  Skills: {totalSkillPointsAllocated} / {requiredSkillPointsForNext} Required
                </div>
              </div>

              <button
                id="btn-rank-breakthrough"
                onClick={handleBreakthrough}
                disabled={!canBreakthrough}
                className={`px-5 py-2.5 rounded-xl font-cinzel font-bold text-xs sm:text-sm tracking-wider transition-all flex items-center space-x-2 ${
                  canBreakthrough
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-amber-950 shadow-lg shadow-orange-950/50 animate-pulse'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Ascend Realm</span>
              </button>
            </div>
          ) : (
            <div className="text-xs font-cinzel text-amber-400 font-bold flex items-center space-x-1.5">
              <Award className="w-4 h-4" />
              <span>Supreme Immortal Sovereign Attained!</span>
            </div>
          )}
        </div>

        {/* 8-Tier Path Progress Dots */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 mt-4">
          {CULTIVATION_RANKS.map((rank, idx) => {
            const isReached = idx <= currentRankIndex;
            const isCurrent = idx === currentRankIndex;

            return (
              <div 
                key={rank}
                className={`p-2 rounded-lg text-center text-[10px] font-cinzel transition-all border ${
                  isCurrent 
                    ? 'bg-amber-900/60 border-amber-400 text-amber-200 font-bold shadow-sm' 
                    : isReached 
                    ? 'bg-neutral-900 border-neutral-700 text-neutral-300' 
                    : 'bg-neutral-950 border-neutral-900 text-neutral-600'
                }`}
              >
                <div className="text-[9px] text-neutral-500">Tier {idx + 1}</div>
                <div className="truncate mt-0.5">{rank}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skill Tree Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-neutral-800">
        {[
          { id: 'all', label: 'All Dao Paths' },
          { id: 'elemental', label: 'Elemental Mastery' },
          { id: 'core', label: 'Core Fortification' },
          { id: 'celestial', label: 'Celestial Arts' },
          { id: 'guardian', label: 'Guardian Dao' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveBranch(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-cinzel whitespace-nowrap transition-colors ${
              activeBranch === tab.id 
                ? 'bg-amber-600 text-white font-bold' 
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Skill Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 my-6 overflow-y-auto max-h-[460px] pr-1">
        {filteredSkills.map(skill => {
          const currentLevel = saveState.allocatedSkills[skill.id] || 0;
          const isMaxed = currentLevel >= skill.maxLevel;
          const canAfford = saveState.celestialShards >= skill.costShards;

          return (
            <div
              key={skill.id}
              id={`skill-node-${skill.id}`}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                isMaxed 
                  ? 'bg-neutral-900/90 border-amber-500/60 shadow-md shadow-amber-950/20' 
                  : 'bg-neutral-900/60 border-neutral-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                      {getBranchIcon(skill.branch)}
                    </div>
                    <div>
                      <h3 className="font-cinzel text-sm font-bold text-neutral-100">
                        {skill.name}
                      </h3>
                      <div className="text-[10px] text-neutral-400 capitalize">
                        {skill.branch} Dao &bull; Req: {skill.rankReq}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-bold font-mono text-amber-300 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                    {currentLevel} / {skill.maxLevel}
                  </div>
                </div>

                <p className="text-xs text-neutral-300 mt-3 leading-relaxed">
                  {skill.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                <div className="text-xs text-neutral-400">
                  {isMaxed ? (
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Max Mastery</span>
                    </span>
                  ) : (
                    <span>Cost: <span className="text-amber-300 font-bold">✦ {skill.costShards}</span></span>
                  )}
                </div>

                {!isMaxed && (
                  <button
                    onClick={() => handleLevelUpSkill(skill)}
                    disabled={!canAfford}
                    className={`px-3 py-1.5 rounded-lg text-xs font-cinzel font-bold transition-all ${
                      canAfford 
                        ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-sm' 
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    Cultivate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
