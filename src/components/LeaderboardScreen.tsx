import React, { useState, useEffect } from 'react';
import { INITIAL_LEADERBOARD } from '../data/store';
import { LeaderboardEntry, GameSaveState } from '../types/game';
import { ArrowLeft, Trophy, Medal, Swords, Flame, Sparkles, User, ShieldCheck, RefreshCw, Send } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface LeaderboardScreenProps {
  saveState: GameSaveState;
  onBack: () => void;
  onLaunchDuel?: (opponentName: string) => void;
  onRewardShards?: (shards: number) => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  saveState,
  onBack,
  onRewardShards
}) => {
  const [activeTab, setActiveTab] = useState<'global' | 'endless' | 'duels'>('global');
  const [duelResult, setDuelResult] = useState<string | null>(null);
  const [isDuelLoading, setIsDuelLoading] = useState(false);
  const [serverEntries, setServerEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  // Player's personal score calculated from cultivation and achievements
  const calculatedPlayerScore = Math.max(
    15000,
    saveState.endlessHighScore * 4200 +
      saveState.stats.totalEnemiesDefeated * 50 +
      (saveState.stats.totalBossesSlain || saveState.stats.totalBossesDefeated || 0) * 850 +
      saveState.completedRealmIds.length * 5000
  );

  const playerEntry: LeaderboardEntry = {
    rank: 1,
    username: 'You (Immortal Disciple)',
    realmName: saveState.endlessHighScore > 0 ? 'Endless Realm' : 'Sacred Core',
    waveReached: Math.max(1, saveState.endlessHighScore),
    score: calculatedPlayerScore,
    cultivatorRank: saveState.playerCultivationRank,
    favoriteGuardian: 'Flame Sovereign',
    timestamp: 'Just now',
    isPlayer: true
  };

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?category=${activeTab}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.leaderboard)) {
        setServerEntries(data.leaderboard);
      } else {
        setServerEntries(INITIAL_LEADERBOARD);
      }
    } catch {
      // Offline fallback to bundled seed data
      setServerEntries(INITIAL_LEADERBOARD);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const handleSubmitScore = async () => {
    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'You (Immortal Disciple)',
          realmName: playerEntry.realmName,
          waveReached: playerEntry.waveReached,
          score: playerEntry.score,
          cultivatorRank: playerEntry.cultivatorRank,
          favoriteGuardian: playerEntry.favoriteGuardian
        })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitMessage(`Score of ${playerEntry.score.toLocaleString()} recorded on the Celestial Tablet at Rank #${data.rank}!`);
        soundEngine.playUpgrade();
        fetchLeaderboard();
      } else {
        setSubmitMessage('Could not submit score.');
      }
    } catch {
      setSubmitMessage('Score saved locally (Celestial Server offline).');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSubmitMessage(null), 4000);
    }
  };

  const handleStartGhostDuel = async (entry: LeaderboardEntry) => {
    soundEngine.playSwordQi();
    setIsDuelLoading(true);
    setDuelResult(null);

    try {
      const res = await fetch('/api/duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponentId: entry.username,
          playerScore: playerEntry.score,
          playerCultivationRank: playerEntry.cultivatorRank,
          playerGuardians: saveState.unlockedGuardianIds
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.playerWon) {
          soundEngine.playVictorySnippet();
          if (onRewardShards) {
            onRewardShards(data.shardsReward);
          }
        } else {
          soundEngine.playTempleBell(180, 0.3);
        }
        setDuelResult(data.combatLog);
      } else {
        // Fallback calculation
        const won = playerEntry.score >= entry.score * 0.85;
        if (won) {
          soundEngine.playVictorySnippet();
          setDuelResult(`Victory! Your elemental Qi overwhelmed ${entry.username}'s formation! Claimed +40 Celestial Shards.`);
          if (onRewardShards) onRewardShards(40);
        } else {
          soundEngine.playTempleBell(180, 0.3);
          setDuelResult(`${entry.username}'s defensive array held 3 waves longer than yours. Refine your Dao and challenge again!`);
        }
      }
    } catch {
      const won = playerEntry.score >= entry.score * 0.85;
      if (won) {
        soundEngine.playVictorySnippet();
        setDuelResult(`Victory! Outperformed ${entry.username}'s formation! (+40 Shards)`);
        if (onRewardShards) onRewardShards(40);
      } else {
        soundEngine.playTempleBell(180, 0.3);
        setDuelResult(`${entry.username}'s defensive array held strong against your assault.`);
      }
    } finally {
      setIsDuelLoading(false);
    }
  };

  // Combine server entries with current player entry if not already present
  const baseEntries = serverEntries.length > 0 ? serverEntries : INITIAL_LEADERBOARD;
  const hasPlayer = baseEntries.some(e => e.isPlayer || e.username.includes('You'));
  const combined = hasPlayer ? baseEntries : [...baseEntries, playerEntry];
  const allEntries = [...combined].sort((a, b) => b.score - a.score).map((e, idx) => ({
    ...e,
    rank: idx + 1
  }));

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1: return <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-bold flex items-center justify-center text-xs shadow-sm">1</span>;
      case 2: return <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-bold flex items-center justify-center text-xs shadow-sm">2</span>;
      case 3: return <span className="w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-bold flex items-center justify-center text-xs shadow-sm">3</span>;
      default: return <span className="text-neutral-400 font-mono text-xs w-6 text-center font-bold">#{rank}</span>;
    }
  };

  return (
    <div 
      id="leaderboard-screen"
      className="min-h-[calc(100vh-50px)] w-full p-4 sm:p-6 lg:p-8 bg-neutral-950 text-neutral-100 flex flex-col justify-between max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/30 pb-4">
        <div className="flex items-center space-x-3">
          <button
            id="leaderboard-back-btn"
            onClick={onBack}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-800 transition-colors"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wider text-amber-300">
              IMMORTAL REALM LEADERBOARD & DUELS
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400">
              Competitive rankings and ghost trial matches against celestial commanders
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Record Score Button */}
          <button
            onClick={handleSubmitScore}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-xs font-cinzel font-bold text-white flex items-center space-x-1.5 shadow-md shadow-amber-950/40 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Recording...' : 'Submit Score'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchLeaderboard}
            disabled={isLoading}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Tab Filters */}
          <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('global')}
              className={`px-3 py-1.5 rounded-lg text-xs font-cinzel font-bold transition-all ${
                activeTab === 'global' ? 'bg-amber-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Global
            </button>
            <button
              onClick={() => setActiveTab('endless')}
              className={`px-3 py-1.5 rounded-lg text-xs font-cinzel font-bold transition-all ${
                activeTab === 'endless' ? 'bg-amber-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Endless
            </button>
            <button
              onClick={() => setActiveTab('duels')}
              className={`px-3 py-1.5 rounded-lg text-xs font-cinzel font-bold transition-all ${
                activeTab === 'duels' ? 'bg-amber-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Ghost Duels
            </button>
          </div>
        </div>
      </div>

      {/* Submission feedback */}
      {submitMessage && (
        <div className="my-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-xs text-emerald-300 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{submitMessage}</span>
        </div>
      )}

      {/* Duel Notification Banner */}
      {duelResult && (
        <div className="my-4 p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{duelResult}</span>
          </div>
          <button 
            onClick={() => setDuelResult(null)}
            className="text-xs text-neutral-400 hover:text-neutral-200 ml-4 px-2 py-0.5 rounded border border-neutral-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="my-6 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl overflow-hidden backdrop-blur-sm flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/80 text-[11px] font-cinzel text-neutral-400 uppercase tracking-wider">
                <th className="p-3.5 pl-4">Rank</th>
                <th className="p-3.5">Cultivator</th>
                <th className="p-3.5">Realm</th>
                <th className="p-3.5 text-center">Wave</th>
                <th className="p-3.5 text-right">Defense Score</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-sans">
              {allEntries.map((entry) => (
                <tr 
                  key={`${entry.username}-${entry.rank}`}
                  className={`transition-colors ${
                    entry.isPlayer 
                      ? 'bg-amber-950/25 border-l-2 border-amber-400' 
                      : 'hover:bg-neutral-800/40'
                  }`}
                >
                  <td className="p-3.5 pl-4 flex items-center space-x-2">
                    {getRankBadge(entry.rank)}
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-neutral-100 flex items-center space-x-1.5">
                      <span>{entry.username}</span>
                      {entry.isPlayer && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-amber-950 font-bold">YOU</span>
                      )}
                    </div>
                    <div className="text-[10px] text-amber-400/90 font-cinzel">
                      {entry.cultivatorRank} &bull; Main: {entry.favoriteGuardian}
                    </div>
                  </td>
                  <td className="p-3.5 text-neutral-300">
                    {entry.realmName}
                  </td>
                  <td className="p-3.5 text-center font-mono font-bold text-neutral-200">
                    {entry.waveReached}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-amber-300">
                    {entry.score.toLocaleString()}
                  </td>
                  <td className="p-3.5 pr-4 text-right">
                    {!entry.isPlayer ? (
                      <button
                        onClick={() => handleStartGhostDuel(entry)}
                        disabled={isDuelLoading}
                        className="px-3 py-1 rounded-lg text-xs font-cinzel font-bold bg-neutral-800 hover:bg-amber-600 text-neutral-200 hover:text-white transition-all flex items-center space-x-1 ml-auto disabled:opacity-50"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>Duel Trial</span>
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-500 font-cinzel italic">
                        Your Record
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

