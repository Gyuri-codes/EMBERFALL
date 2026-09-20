import { GameSaveState, GameSettings } from '../types/game';

const SAVE_STORAGE_KEY = 'emberfall_guardians_save_v1';

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

export const INITIAL_SAVE_STATE: GameSaveState = {
  version: 1,
  lastSaved: new Date().toISOString(),
  playerCultivationRank: 'Spirit Awakening',
  celestialShards: 80, // initial starting bonus for first play
  unlockedGuardianIds: ['flame_sovereign', 'thunder_immortal', 'frost_empress', 'wind_blade_saint'],
  completedRealmIds: [],
  highestWavesByRealm: {},
  endlessHighScore: 0,
  unlockedCosmetics: [],
  equippedCosmetics: {},
  allocatedSkills: {},
  achievements: {},
  settings: DEFAULT_SETTINGS,
  stats: {
    totalEnemiesDefeated: 0,
    totalBossesSlain: 0,
    totalEssenceGathered: 0,
    totalBattlesWon: 0,
    totalDamageDealt: 0
  }
};

export class SaveManager {
  public static load(): GameSaveState {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return { ...INITIAL_SAVE_STATE };
      const parsed = JSON.parse(raw);
      // Merge with defaults in case of missing keys
      return {
        ...INITIAL_SAVE_STATE,
        ...parsed,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings || {})
        },
        stats: {
          ...INITIAL_SAVE_STATE.stats,
          ...(parsed.stats || {})
        }
      };
    } catch {
      return { ...INITIAL_SAVE_STATE };
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

  public static reset(): GameSaveState {
    try {
      localStorage.removeItem(SAVE_STORAGE_KEY);
    } catch {}
    return { ...INITIAL_SAVE_STATE };
  }

  public static exportSaveCode(state: GameSaveState): string {
    const jsonStr = JSON.stringify(state);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  }

  public static importSaveCode(code: string): GameSaveState | null {
    try {
      const decoded = decodeURIComponent(escape(atob(code.trim())));
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed.celestialShards === 'number') {
        const validated: GameSaveState = {
          ...INITIAL_SAVE_STATE,
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
  exportSaveCode: SaveManager.exportSaveCode,
  exportSaveString: SaveManager.exportSaveCode,
  importSaveCode: SaveManager.importSaveCode,
  importSaveString: SaveManager.importSaveCode
};
