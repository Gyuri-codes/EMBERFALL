import React from 'react';
import { ACHIEVEMENTS_DATA } from '../data/store';
import { Achievement, GameSaveState } from '../types/game';
import { ArrowLeft, Award, CheckCircle2, Sparkles } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface AchievementsScreenProps {
  saveState: GameSaveState;
  onClaimAchievement: (achievementId: string, rewardShards: number) => void;
  onBack: () => void;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  saveState,
  onClaimAchievement,
  onBack
}) => {
  const getProgress = (ach: Achievement) => {
    const req = ach.requirement || ach.maxProgress || 1;
    switch (ach.id) {
      case 'first_blood':
        return Math.min(req, (saveState.stats.totalBattlesWon > 0 || saveState.stats.totalEnemiesDefeated > 0) ? 1 : 0);
      case 'slayer_50':
      case 'slayer_300':
      case 'demon_slayer':
      case 'calamity_cleanser':
        return Math.min(req, saveState.stats.totalEnemiesDefeated);
      case 'realm_purifier':
        return Math.min(req, saveState.completedRealmIds.length);
      case 'first_boss':
      case 'boss_conqueror':
        return Math.min(req, saveState.stats.totalBossesSlain || saveState.stats.totalBossesDefeated || 0);
      case 'master_upgrade':
      case 'immortal_ascendance':
        return Math.min(req, saveState.stats.highestLevelCultivatorReached || 1);
      case 'dao_master':
        return Math.min(req, Object.values(saveState.allocatedSkills).reduce((a, b) => a + b, 0));
      case 'endless_survivor':
      case 'endless_voyager':
        return Math.min(req, saveState.endlessHighScore);
      default:
        return 0;
    }
  };

  const handleClaim = (ach: Achievement) => {
    soundEngine.playUpgrade();
    onClaimAchievement(ach.id, ach.rewardShards);
  };

  return (
    <div 
      id="achievements-screen"
      className="min-h-[calc(100vh-50px)] w-full p-4 sm:p-6 lg:p-8 bg-neutral-950 text-neutral-100 flex flex-col justify-between max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/30 pb-4">
        <div className="flex items-center space-x-3">
          <button
            id="achievements-back-btn"
            onClick={onBack}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-800 transition-colors"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wider text-amber-300">
              IMMORTAL FEATS & ACHIEVEMENTS
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400">
              Accomplish legendary trials to reap Celestial Shards
            </p>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-amber-500/40 text-xs sm:text-sm text-amber-300 font-cinzel font-bold">
          ✦ {saveState.celestialShards.toLocaleString()} Shards Available
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 overflow-y-auto max-h-[550px] pr-1">
        {ACHIEVEMENTS_DATA.map((ach: Achievement) => {
          const req = ach.requirement || ach.maxProgress || 1;
          const progress = getProgress(ach);
          const isCompleted = progress >= req;
          const isClaimed = saveState.claimedAchievements?.includes(ach.id) || false;
          const percent = Math.min(100, Math.round((progress / req) * 100));

          return (
            <div
              key={ach.id}
              id={`achievement-card-${ach.id}`}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                isClaimed 
                  ? 'bg-neutral-900/40 border-neutral-800/60 opacity-70' 
                  : isCompleted 
                  ? 'bg-amber-950/25 border-amber-500 shadow-md shadow-amber-950/20' 
                  : 'bg-neutral-900/70 border-neutral-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl border ${isCompleted ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-neutral-950 border-neutral-800 text-neutral-500'}`}>
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-cinzel text-sm sm:text-base font-bold text-neutral-100">
                        {ach.name || ach.title}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {ach.description || ach.desc}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-cinzel font-bold text-amber-300">
                      +{ach.rewardShards} ✦
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Progress</span>
                    <span className="font-mono">{progress} / {req} ({percent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                    <div 
                      className={`h-full transition-all duration-300 ${isCompleted ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-neutral-600'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Claim Action */}
              <div className="mt-4 pt-2 flex items-center justify-end">
                {isClaimed ? (
                  <span className="text-xs text-neutral-500 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Claimed</span>
                  </span>
                ) : isCompleted ? (
                  <button
                    onClick={() => handleClaim(ach)}
                    className="px-4 py-1.5 rounded-lg font-cinzel text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-md shadow-orange-950/40 animate-pulse"
                  >
                    Claim +{ach.rewardShards} Shards
                  </button>
                ) : (
                  <span className="text-xs text-neutral-500 italic">
                    In Progress
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
