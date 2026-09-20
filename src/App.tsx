import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeScreen } from './components/HomeScreen';
import { RealmSelectScreen } from './components/RealmSelectScreen';
import { BattleScreen } from './components/BattleScreen';
import { GuardiansScreen } from './components/GuardiansScreen';
import { CultivationScreen } from './components/CultivationScreen';
import { StoreScreen } from './components/StoreScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { AchievementsScreen } from './components/AchievementsScreen';
import { SettingsModal } from './components/SettingsModal';
import { TutorialModal } from './components/TutorialModal';
import { ScreenReaderAnnouncer } from './components/ScreenReaderAnnouncer';
import { saveManager } from './utils/saveManager';
import { soundEngine } from './audio/soundEngine';
import { REALMS_DATA } from './data/realms';
import {
  GameSaveState,
  GameSettings,
  RealmData,
  GameMode,
  ChallengeModifier,
  CultivationRank
} from './types/game';

export default function App() {
  const [saveState, setSaveState] = useState<GameSaveState>(() => saveManager.loadSaveState());
  const [currentScreen, setCurrentScreen] = useState<string>('home');
  const [selectedRealm, setSelectedRealm] = useState<RealmData>(REALMS_DATA[0]);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('story');
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeModifier | undefined>();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [srMessage, setSrMessage] = useState('');

  // Synchronize audio and accessibility settings with DOM & audio engine
  useEffect(() => {
    // Unlock browser Web Audio API on first user touch/click/keypress
    const unlockAudio = () => {
      soundEngine.init();
      soundEngine.resume();
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    soundEngine.setVolume(saveState.settings.musicVolume, saveState.settings.sfxVolume);
    if (saveState.settings.audioMuted) {
      soundEngine.toggleMute();
    }

    // High contrast mode attribute
    if (saveState.settings.highContrastMode || saveState.settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Font size scaling
    document.documentElement.classList.remove('text-size-normal', 'text-size-large', 'text-size-xlarge');
    document.documentElement.classList.add(`text-size-${saveState.settings.fontSize}`);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Save whenever saveState changes
  useEffect(() => {
    saveManager.saveState(saveState);
  }, [saveState]);

  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSaveState(prev => ({
      ...prev,
      settings: newSettings
    }));

    if (newSettings.highContrastMode) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    document.documentElement.classList.remove('text-size-normal', 'text-size-large', 'text-size-xlarge');
    document.documentElement.classList.add(`text-size-${newSettings.fontSize}`);
  };

  const handleToggleAudio = () => {
    const nextMuted = !saveState.settings.audioMuted;
    handleUpdateSettings({
      ...saveState.settings,
      audioMuted: nextMuted
    });
    soundEngine.toggleMute();
  };

  const handleAnnounce = (msg: string) => {
    if (saveState.settings.screenReaderAnnouncements) {
      setSrMessage(msg);
    }
  };

  const handleSelectRealmForBattle = (realm: RealmData, mode: GameMode, challenge?: ChallengeModifier) => {
    setSelectedRealm(realm);
    setSelectedGameMode(mode);
    setSelectedChallenge(challenge);
    setCurrentScreen('battle');
    handleAnnounce(`Entering ${realm.name} in ${mode} mode.`);
  };

  const handleVictory = (stars: number, shardsEarned: number, totalKills: number) => {
    setSaveState(prev => {
      const completed = prev.completedRealmIds.includes(selectedRealm.id)
        ? prev.completedRealmIds
        : [...prev.completedRealmIds, selectedRealm.id];

      return {
        ...prev,
        celestialShards: prev.celestialShards + shardsEarned,
        completedRealmIds: completed,
        stats: {
          ...prev.stats,
          totalEnemiesDefeated: prev.stats.totalEnemiesDefeated + totalKills,
          totalBossesDefeated: (prev.stats.totalBossesDefeated || 0) + 1,
          totalRealmsDefended: (prev.stats.totalRealmsDefended || 0) + 1
        }
      };
    });
    handleAnnounce(`Victory! Realm defended with ${stars} stars. Acquired ${shardsEarned} Celestial Shards.`);
  };

  const handleDefeat = (waveReached: number, totalKills: number) => {
    setSaveState(prev => ({
      ...prev,
      endlessHighScore: Math.max(prev.endlessHighScore, waveReached),
      stats: {
        ...prev.stats,
        totalEnemiesDefeated: prev.stats.totalEnemiesDefeated + totalKills
      }
    }));
    handleAnnounce(`Defeat on wave ${waveReached}. ${totalKills} enemies banished.`);
  };

  const handleUnlockGuardian = (guardianId: string, cost: number) => {
    setSaveState(prev => ({
      ...prev,
      celestialShards: Math.max(0, prev.celestialShards - cost),
      unlockedGuardianIds: [...prev.unlockedGuardianIds, guardianId]
    }));
    handleAnnounce(`Unlocked new cultivator!`);
  };

  const handleUpgradeSkill = (skillId: string, cost: number) => {
    setSaveState(prev => ({
      ...prev,
      celestialShards: Math.max(0, prev.celestialShards - cost),
      allocatedSkills: {
        ...prev.allocatedSkills,
        [skillId]: (prev.allocatedSkills[skillId] || 0) + 1
      }
    }));
  };

  const handleRankBreakthrough = (nextRank: CultivationRank) => {
    setSaveState(prev => ({
      ...prev,
      playerCultivationRank: nextRank
    }));
    handleAnnounce(`Cultivation breakthrough achieved! You have ascended to ${nextRank}!`);
  };

  const handleBuyCosmetic = (cosmeticId: string, cost: number) => {
    setSaveState(prev => ({
      ...prev,
      celestialShards: Math.max(0, prev.celestialShards - cost),
      unlockedCosmetics: [...prev.unlockedCosmetics, cosmeticId]
    }));
  };

  const handleEquipCosmetic = (cosmeticId: string, targetType: string) => {
    setSaveState(prev => {
      const isAlready = prev.equippedCosmetics[targetType] === cosmeticId;
      const nextEquipped = { ...prev.equippedCosmetics };
      if (isAlready) {
        delete nextEquipped[targetType];
      } else {
        nextEquipped[targetType] = cosmeticId;
      }
      return {
        ...prev,
        equippedCosmetics: nextEquipped
      };
    });
  };

  const handleClaimAchievement = (achievementId: string, rewardShards: number) => {
    setSaveState(prev => ({
      ...prev,
      celestialShards: prev.celestialShards + rewardShards,
      claimedAchievements: [...(prev.claimedAchievements || []), achievementId]
    }));
    handleAnnounce(`Claimed achievement reward of ${rewardShards} Celestial Shards!`);
  };

  const handleResetProgress = () => {
    const fresh = saveManager.resetSave(saveState.settings);
    setSaveState(fresh);
    setSelectedRealm(REALMS_DATA[0]);
    setSelectedGameMode('story');
    setSelectedChallenge(undefined);
    setCurrentScreen('home');
    soundEngine.setMusicState('menu');
    soundEngine.playTempleBell(220, 0.4);
    handleAnnounce('All game progress has been completely reset to original state.');
  };

  const handleResetCultivation = () => {
    setSaveState(prev => {
      const updated = saveManager.resetCultivation(prev);
      saveManager.saveState(updated);
      return updated;
    });
    soundEngine.playPlacement();
    handleAnnounce('Cultivation talents and rank reset.');
  };

  const handleResetRealms = () => {
    setSaveState(prev => {
      const updated = saveManager.resetRealms(prev);
      saveManager.saveState(updated);
      return updated;
    });
    setSelectedRealm(REALMS_DATA[0]);
    soundEngine.playPlacement();
    handleAnnounce('Realms and wave progress reset.');
  };

  const handleResetAchievements = () => {
    setSaveState(prev => {
      const updated = saveManager.resetAchievements(prev);
      saveManager.saveState(updated);
      return updated;
    });
    soundEngine.playPlacement();
    handleAnnounce('Achievements and statistics reset.');
  };

  const handleResetStore = () => {
    setSaveState(prev => {
      const updated = saveManager.resetStore(prev);
      saveManager.saveState(updated);
      return updated;
    });
    soundEngine.playPlacement();
    handleAnnounce('Store unlocked cosmetics and shards reset.');
  };

  return (
    <div id="emberfall-app-root" className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Accessible Live Region */}
      <ScreenReaderAnnouncer message={srMessage} />

      {/* Global Navigation (Except in Full Battle Immersion Mode and Home Screen which has integrated header) */}
      {currentScreen !== 'battle' && currentScreen !== 'home' && (
        <Navbar
          currentScreen={currentScreen}
          onNavigate={(s) => {
            soundEngine.playPlacement();
            setCurrentScreen(s);
          }}
          saveState={saveState}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTutorial={() => setIsTutorialOpen(true)}
          audioMuted={Boolean(saveState.settings.audioMuted)}
          onToggleAudio={handleToggleAudio}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 w-full flex flex-col">
        {currentScreen === 'home' && (
          <HomeScreen
            onPlayGame={() => setCurrentScreen('realms')}
            onNavigate={(s) => setCurrentScreen(s)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenTutorial={() => setIsTutorialOpen(true)}
            saveState={saveState}
            audioMuted={Boolean(saveState.settings.audioMuted)}
            onToggleAudio={handleToggleAudio}
          />
        )}

        {currentScreen === 'realms' && (
          <RealmSelectScreen
            onSelectRealm={handleSelectRealmForBattle}
            onBack={() => setCurrentScreen('home')}
            saveState={saveState}
          />
        )}

        {currentScreen === 'battle' && (
          <BattleScreen
            realm={selectedRealm}
            gameMode={selectedGameMode}
            challenge={selectedChallenge}
            saveState={saveState}
            onVictory={handleVictory}
            onDefeat={handleDefeat}
            onExit={() => {
              soundEngine.setMusicState('menu');
              setCurrentScreen('realms');
            }}
            onScreenReaderNotice={handleAnnounce}
          />
        )}

        {currentScreen === 'guardians' && (
          <GuardiansScreen
            saveState={saveState}
            onUnlockGuardian={handleUnlockGuardian}
            onBack={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'cultivation' && (
          <CultivationScreen
            saveState={saveState}
            onUpgradeSkill={handleUpgradeSkill}
            onRankBreakthrough={handleRankBreakthrough}
            onBack={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'store' && (
          <StoreScreen
            saveState={saveState}
            onBuyCosmetic={handleBuyCosmetic}
            onEquipCosmetic={handleEquipCosmetic}
            onBack={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'leaderboard' && (
          <LeaderboardScreen
            saveState={saveState}
            onBack={() => setCurrentScreen('home')}
            onLaunchDuel={(opponent) => {
              handleAnnounce(`Challenging ${opponent} to a trial!`);
            }}
            onRewardShards={(shards) => {
              setSaveState(prev => ({
                ...prev,
                celestialShards: prev.celestialShards + shards
              }));
              handleAnnounce(`Earned +${shards} Celestial Shards from PvP ghost duel!`);
            }}
          />
        )}

        {currentScreen === 'achievements' && (
          <AchievementsScreen
            saveState={saveState}
            onClaimAchievement={handleClaimAchievement}
            onBack={() => setCurrentScreen('home')}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={saveState.settings}
        onUpdateSettings={handleUpdateSettings}
        saveState={saveState}
        onRestoreSave={(imported) => {
          setSaveState(imported);
          saveManager.saveState(imported);
        }}
        onResetProgress={handleResetProgress}
        onResetCultivation={handleResetCultivation}
        onResetRealms={handleResetRealms}
        onResetAchievements={handleResetAchievements}
        onResetStore={handleResetStore}
      />

      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
}
