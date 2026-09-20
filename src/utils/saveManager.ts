import { GameSaveState, GameSettings } from '../types/game';

const SAVE_STORAGE_KEY = 'emberfall_guardians_save_v2';
const LEGACY_STORAGE_KEYS = ['emberfall_guardians_save_v1', 'emberfall_save_v1'];

export const DEFAULT_SETTINGS: GameSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  graphicsQuality: 'high',
  highContrast: false,
  screenReaderAnnouncements: false,
  fontSize: 'normal',
  screenShake: true,
  showDamageNumbers: true,
  keybindings: {
    ability1: '1',
    ability2: '2',
    ability3: '3',
    ability4: '4',
    ability5: '5',
    pause: 'Space',
    fastForward: 'F',
    startWave: 'Enter',
    deselect: 'Escape'
  }
};

/**
 * Creates a brand-new pristine initial game save state.
 * All territories (except starting Emberfall Valley) are locked.
 * All tower upgrades, skills, achievements, and statistics are reset to 0.
 * Currencies and resources are reset to 0.
 */
export function createInitialSaveState(preserveSettings?: GameSettings): GameSaveState {
  return {
    version: 2,
    lastSaved: new Date().toISOString(),
    playerCultivationRank: 'Spirit Awakening',
    celestialShards: 0,
    unlockedGuardianIds: ['flame_sovereign', 'thunder_immortal', 'frost_empress', 'wind_blade_saint'],
    completedRealmIds: [],
    highestWavesByRealm: {},
    endlessHighScore: 0,
    unlockedCosmetics: [],
    unlockedStoreItems: [],
    equippedCosmetics: {},
    activeConsumables: {},
    inventory: {},
    allocatedSkills: {},
    achievements: {},
    claimedAchievements: [],
    settings: preserveSettings ? { ...preserveSettings } : { ...DEFAULT_SETTINGS },
    stats: {
      totalEnemiesDefeated: 0,
      totalBossesSlain: 0,
      totalBossesDefeated: 0,
      totalRealmsDefended: 0,
      totalEssenceGathered: 0,
      totalBattlesWon: 0,
      totalDamageDealt: 0,
      highestLevelCultivatorReached: 1
    }
  };
}

export const INITIAL_SAVE_STATE: GameSaveState = createInitialSaveState();

export class SaveManager {
  public static load(): GameSaveState {
    try {
      // Clear legacy storage keys if present
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        try {
          if (localStorage.getItem(legacyKey)) {
            localStorage.removeItem(legacyKey);
          }
        } catch {
          // ignore
        }
      }

      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) {
        const initial = createInitialSaveState();
        SaveManager.save(initial);
        return initial;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        const initial = createInitialSaveState();
        SaveManager.save(initial);
        return initial;
      }

      // Merge with defaults in case of missing keys, ensuring no undefined fields
      const initial = createInitialSaveState();
      return {
        ...initial,
        ...parsed,
        unlockedGuardianIds: Array.isArray(parsed.unlockedGuardianIds) && parsed.unlockedGuardianIds.length > 0
          ? parsed.unlockedGuardianIds
          : initial.unlockedGuardianIds,
        completedRealmIds: Array.isArray(parsed.completedRealmIds) ? parsed.completedRealmIds : [],
        highestWavesByRealm: typeof parsed.highestWavesByRealm === 'object' && parsed.highestWavesByRealm ? parsed.highestWavesByRealm : {},
        unlockedCosmetics: Array.isArray(parsed.unlockedCosmetics) ? parsed.unlockedCosmetics : [],
        unlockedStoreItems: Array.isArray(parsed.unlockedStoreItems) ? parsed.unlockedStoreItems : [],
        equippedCosmetics: typeof parsed.equippedCosmetics === 'object' && parsed.equippedCosmetics ? parsed.equippedCosmetics : {},
        allocatedSkills: typeof parsed.allocatedSkills === 'object' && parsed.allocatedSkills ? parsed.allocatedSkills : {},
        achievements: typeof parsed.achievements === 'object' && parsed.achievements ? parsed.achievements : {},
        claimedAchievements: Array.isArray(parsed.claimedAchievements) ? parsed.claimedAchievements : [],
        settings: {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings || {})
        },
        stats: {
          ...initial.stats,
          ...(parsed.stats || {})
        }
      };
    } catch {
      return createInitialSaveState();
    }
  }

  public static save(state: GameSaveState): boolean {
    try {
      state.lastSaved = new Date().toISOString();
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
      return false;
    }
  }

  /**
   * Completely resets all saved progression back to the brand-new first-time starting state.
   * Cleans localStorage and immediately writes the clean initial state to prevent any corrupted or partial data.
   */
  public static reset(preserveSettings?: GameSettings): GameSaveState {
    try {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        localStorage.removeItem(legacyKey);
      }
      localStorage.removeItem(SAVE_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear save key from localStorage', e);
    }

    const fresh = createInitialSaveState(preserveSettings);
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(fresh));
    } catch (e) {
      console.error('Failed to write fresh initial save state to localStorage', e);
    }

    return fresh;
  }

  /**
   * Specific resets for individual progression categories
   */
  public static resetCultivation(state: GameSaveState): GameSaveState {
    return {
      ...state,
      playerCultivationRank: 'Spirit Awakening',
      allocatedSkills: {},
      unlockedGuardianIds: ['flame_sovereign', 'thunder_immortal', 'frost_empress', 'wind_blade_saint']
    };
  }

  public static resetRealms(state: GameSaveState): GameSaveState {
    return {
      ...state,
      completedRealmIds: [],
      highestWavesByRealm: {},
      endlessHighScore: 0
    };
  }

  public static resetAchievements(state: GameSaveState): GameSaveState {
    return {
      ...state,
      achievements: {},
      claimedAchievements: [],
      stats: {
        totalEnemiesDefeated: 0,
        totalBossesSlain: 0,
        totalBossesDefeated: 0,
        totalRealmsDefended: 0,
        totalEssenceGathered: 0,
        totalBattlesWon: 0,
        totalDamageDealt: 0,
        highestLevelCultivatorReached: 1
      }
    };
  }

  public static resetStore(state: GameSaveState): GameSaveState {
    return {
      ...state,
      unlockedCosmetics: [],
      unlockedStoreItems: [],
      equippedCosmetics: {},
      activeConsumables: {},
      inventory: {},
      celestialShards: 0
    };
  }

  public static exportSaveCode(state: GameSaveState): string {
    const jsonStr = JSON.stringify(state);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  }

  public static importSaveCode(code: string): GameSaveState | null {
    try {
      const decoded = decodeURIComponent(escape(atob(code.trim())));
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === 'object') {
        const initial = createInitialSaveState();
        const validated: GameSaveState = {
          ...initial,
          ...parsed,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(parsed.settings || {})
          }
        };
        SaveManager.save(validated);
        return validated;
      }
    } catch (e) {
      console.error('Save code import error:', e);
    }
    return null;
  }
}

export const saveManager = {
  load: SaveManager.load,
  loadSaveState: SaveManager.load,
  save: SaveManager.save,
  saveState: SaveManager.save,
  reset: SaveManager.reset,
  resetSave: SaveManager.reset,
  resetCultivation: SaveManager.resetCultivation,
  resetRealms: SaveManager.resetRealms,
  resetAchievements: SaveManager.resetAchievements,
  resetStore: SaveManager.resetStore,
  exportSaveCode: SaveManager.exportSaveCode,
  exportSaveString: SaveManager.exportSaveCode,
  importSaveCode: SaveManager.importSaveCode,
  importSaveString: SaveManager.importSaveCode
};
