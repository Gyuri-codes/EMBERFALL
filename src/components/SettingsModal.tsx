import React, { useState } from 'react';
import { GameSettings, GameSaveState } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { saveManager } from '../utils/saveManager';
import { X, Volume2, Monitor, Eye, Keyboard, Cloud, RotateCcw, Copy, Check, AlertTriangle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  saveState: GameSaveState;
  onRestoreSave: (state: GameSaveState) => void;
  onResetProgress: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  saveState,
  onRestoreSave,
  onResetProgress
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'graphics' | 'accessibility' | 'controls' | 'cloud'>('audio');
  const [copied, setCopied] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState('');
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Cloud Cultivator ID stored in localStorage or generated
  const [cultivatorId, setCultivatorId] = useState<string>(() => {
    return localStorage.getItem('emberfall_cultivator_id') || `cultivator_${Math.random().toString(36).substring(2, 9)}`;
  });

  if (!isOpen) return null;

  const handleExport = () => {
    const code = saveManager.exportSaveString(saveState);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleImport = () => {
    if (!importCode.trim()) return;
    const restored = saveManager.importSaveString(importCode);
    if (restored) {
      onRestoreSave(restored);
      setImportError('');
      setCloudStatus('Save profile restored successfully!');
      setTimeout(() => setCloudStatus(null), 3500);
    } else {
      setImportError('Invalid save string format.');
    }
  };

  const handleSyncToCloud = async () => {
    setIsCloudLoading(true);
    setCloudStatus(null);
    try {
      localStorage.setItem('emberfall_cultivator_id', cultivatorId);
      const res = await fetch('/api/cloud-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: cultivatorId,
          saveState
        })
      });
      const data = await res.json();
      if (data.success) {
        setCloudStatus(`Cultivation synced to Celestial Cloud at ${new Date(data.updatedAt).toLocaleTimeString()}`);
      } else {
        setCloudStatus(`Cloud sync failed: ${data.error}`);
      }
    } catch {
      setCloudStatus('Cloud sync service temporarily offline (local save active).');
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleLoadFromCloud = async () => {
    setIsCloudLoading(true);
    setCloudStatus(null);
    try {
      const res = await fetch(`/api/cloud-save/${encodeURIComponent(cultivatorId)}`);
      const data = await res.json();
      if (data.success && data.saveState) {
        onRestoreSave(data.saveState);
        setCloudStatus(`Restored cloud state from ${new Date(data.updatedAt).toLocaleString()}`);
      } else {
        setCloudStatus(data.error || 'No saved profile found for this ID.');
      }
    } catch {
      setCloudStatus('Could not reach cloud server.');
    } finally {
      setIsCloudLoading(false);
    }
  };

  return (
    <div 
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div 
        id="settings-modal-panel"
        className="bg-neutral-900 border border-amber-500/40 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <h2 id="settings-title" className="font-cinzel text-lg sm:text-xl font-bold text-amber-300">
            SYSTEM & ACCESSIBILITY SETTINGS
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 overflow-x-auto text-xs font-cinzel">
          {[
            { id: 'audio', label: 'Audio', icon: <Volume2 className="w-3.5 h-3.5" /> },
            { id: 'graphics', label: 'Display', icon: <Monitor className="w-3.5 h-3.5" /> },
            { id: 'accessibility', label: 'Accessibility', icon: <Eye className="w-3.5 h-3.5" /> },
            { id: 'controls', label: 'Controls', icon: <Keyboard className="w-3.5 h-3.5" /> },
            { id: 'cloud', label: 'Cloud Save', icon: <Cloud className="w-3.5 h-3.5" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-4 py-2.5 whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id 
                  ? 'border-amber-500 text-amber-300 font-bold bg-neutral-900/60' 
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-sm">
          {/* AUDIO TAB */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-neutral-300 mb-1">
                  <span>Music Volume ({Math.round(settings.musicVolume * 100)}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateSettings({ ...settings, musicVolume: val });
                    soundEngine.setVolume(val, settings.sfxVolume);
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-neutral-300 mb-1">
                  <span>SFX Volume ({Math.round(settings.sfxVolume * 100)}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateSettings({ ...settings, sfxVolume: val });
                    soundEngine.setVolume(settings.musicVolume, val);
                    soundEngine.playSwordQi();
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <span className="text-neutral-300">Mute All Audio</span>
                <input
                  type="checkbox"
                  checked={settings.audioMuted}
                  onChange={(e) => {
                    const muted = e.target.checked;
                    onUpdateSettings({ ...settings, audioMuted: muted });
                    soundEngine.toggleMute();
                  }}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* GRAPHICS TAB */}
          {activeTab === 'graphics' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-cinzel text-neutral-300 mb-2">
                  Rendering Quality
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'ultra'] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => onUpdateSettings({ ...settings, graphicsQuality: q })}
                      className={`py-2 rounded-lg text-xs font-cinzel uppercase transition-all border ${
                        settings.graphicsQuality === q 
                          ? 'bg-amber-600 border-amber-400 text-white font-bold' 
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <div>
                  <div className="text-neutral-200">Show Damage Numbers</div>
                  <div className="text-xs text-neutral-500">Display floating combat text above demons</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showDamageNumbers}
                  onChange={(e) => onUpdateSettings({ ...settings, showDamageNumbers: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* ACCESSIBILITY TAB */}
          {activeTab === 'accessibility' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-neutral-200 font-semibold">High Contrast Mode</div>
                  <div className="text-xs text-neutral-500">Enforces high-contrast borders and sharp readability</div>
                </div>
                <input
                  type="checkbox"
                  checked={!!(settings.highContrastMode || settings.highContrast)}
                  onChange={(e) => onUpdateSettings({ ...settings, highContrastMode: e.target.checked, highContrast: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-neutral-800">
                <label className="block text-xs font-cinzel text-neutral-300 mb-2">
                  UI Font Size Scaling
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'large', 'xlarge'] as const).map(sz => (
                    <button
                      key={sz}
                      onClick={() => onUpdateSettings({ ...settings, fontSize: sz })}
                      className={`py-2 rounded-lg text-xs font-cinzel capitalize transition-all border ${
                        settings.fontSize === sz 
                          ? 'bg-amber-600 border-amber-400 text-white font-bold' 
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <div>
                  <div className="text-neutral-200 font-semibold">Screen Reader Announcements</div>
                  <div className="text-xs text-neutral-500">Live vocal announcements on waves and bosses</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.screenReaderAnnouncements}
                  onChange={(e) => onUpdateSettings({ ...settings, screenReaderAnnouncements: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* CONTROLS TAB */}
          {activeTab === 'controls' && (
            <div className="space-y-3 text-xs">
              <div className="text-neutral-400 mb-2">
                Click a hotkey input to assign custom battlefield shortcuts:
              </div>

              {Object.entries(settings.keybindings).map(([action, key]) => (
                <div key={action} className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                  <span className="capitalize text-neutral-300">{action.replace(/([A-Z])/g, ' $1')}</span>
                  <input
                    type="text"
                    maxLength={1}
                    value={key}
                    onChange={(e) => {
                      const newKey = e.target.value.toUpperCase();
                      if (newKey) {
                        onUpdateSettings({
                          ...settings,
                          keybindings: { ...settings.keybindings, [action]: newKey }
                        });
                      }
                    }}
                    className="w-12 text-center py-1 rounded bg-neutral-900 border border-amber-500/40 text-amber-300 font-mono font-bold uppercase"
                  />
                </div>
              ))}
            </div>
          )}

          {/* CLOUD SAVE TAB */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              {cloudStatus && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 text-xs text-amber-200 flex items-center justify-between">
                  <span>{cloudStatus}</span>
                  <button
                    onClick={() => setCloudStatus(null)}
                    className="text-neutral-400 hover:text-white text-xs ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Server Cloud Sync */}
              <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-neutral-200 font-semibold text-xs flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Celestial Cloud Sync</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Cross-device cloud synchronization for your cultivation progress.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Cultivator Cloud ID</label>
                  <input
                    type="text"
                    value={cultivatorId}
                    onChange={(e) => setCultivatorId(e.target.value.trim())}
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-amber-300 font-mono"
                    placeholder="cultivator_id"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSyncToCloud}
                    disabled={isCloudLoading}
                    className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-cinzel text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {isCloudLoading ? 'Syncing...' : 'Sync To Cloud'}
                  </button>
                  <button
                    onClick={handleLoadFromCloud}
                    disabled={isCloudLoading}
                    className="flex-1 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-cinzel text-xs font-bold border border-amber-500/30 transition-all disabled:opacity-50"
                  >
                    {isCloudLoading ? 'Loading...' : 'Load From Cloud'}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-neutral-300 font-semibold text-xs mb-1">Export Save Profile</div>
                <p className="text-xs text-neutral-500 mb-2">Copy your full cultivation and realm progress as an encrypted backup string.</p>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-cinzel text-amber-300 border border-neutral-700 flex items-center space-x-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Save Code'}</span>
                </button>
              </div>

              <div className="pt-3 border-t border-neutral-800">
                <div className="text-neutral-300 font-semibold text-xs mb-1">Import Save Profile</div>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Paste save code here..."
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200"
                  />
                  <button
                    onClick={handleImport}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-cinzel text-xs font-bold"
                  >
                    Restore
                  </button>
                </div>
                {importError && <p className="text-xs text-red-400 mt-1">{importError}</p>}
              </div>

              {/* Reset Section */}
              <div className="pt-4 border-t border-red-900/30">
                {!showResetConfirm ? (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="text-xs text-red-400 hover:text-red-300 font-cinzel flex items-center space-x-1"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Reset All Cultivation Data</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-600 space-y-2">
                    <p className="text-xs text-red-200">Are you certain? All unlocked cultivators, shards, and completed realms will be reset to default.</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          onResetProgress();
                          setShowResetConfirm(false);
                          onClose();
                        }}
                        className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-cinzel"
                      >
                        Confirm Reset
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="px-3 py-1 rounded bg-neutral-800 text-neutral-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
