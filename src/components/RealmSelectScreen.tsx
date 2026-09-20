import React, { useState } from 'react';
import { REALMS_DATA } from '../data/realms';
import { CHALLENGE_MODES } from '../data/store';
import { GameMode, RealmData, ChallengeModifier, GameSaveState } from '../types/game';
import { Flame, Compass, Snowflake, Zap, Skull, Shield, Swords, Play, Sparkles, AlertTriangle, ArrowLeft } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface RealmSelectScreenProps {
  onSelectRealm: (realm: RealmData, mode: GameMode, challenge?: ChallengeModifier) => void;
  onBack: () => void;
  saveState: GameSaveState;
}

export const RealmSelectScreen: React.FC<RealmSelectScreenProps> = ({
  onSelectRealm,
  onBack,
  saveState
}) => {
  const [selectedRealm, setSelectedRealm] = useState<RealmData>(REALMS_DATA[0]);
  const [selectedMode, setSelectedMode] = useState<GameMode>('story');
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeModifier>(CHALLENGE_MODES[0]);

  const getRealmIcon = (id: string) => {
    switch (id) {
      case 'emberfall_valley': return <Flame className="w-5 h-5 text-orange-400" />;
      case 'moonlit_bamboo': return <Compass className="w-5 h-5 text-emerald-400" />;
      case 'frozen_heaven': return <Snowflake className="w-5 h-5 text-cyan-400" />;
      case 'thundercloud_peaks': return <Zap className="w-5 h-5 text-purple-400" />;
      case 'abyssal_realm': return <Skull className="w-5 h-5 text-rose-500" />;
      default: return <Flame className="w-5 h-5 text-amber-400" />;
    }
  };

  const handleStart = () => {
    soundEngine.playTempleBell(330, 0.3);
    onSelectRealm(
      selectedRealm, 
      selectedMode, 
      selectedMode === 'challenge' ? selectedChallenge : undefined
    );
  };

  return (
    <div 
      id="realm-select-screen"
      className="min-h-[calc(100vh-50px)] w-full p-4 sm:p-6 lg:p-8 bg-neutral-950 text-neutral-100 flex flex-col justify-between max-w-7xl mx-auto"
    >
      {/* Header with Back button and Mode selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-900/30 pb-4">
        <div className="flex items-center space-x-3">
          <button
            id="realm-back-btn"
            onClick={onBack}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-800 transition-colors"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wider text-amber-300">
              SELECT REALM BATTLEFIELD
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400">
              Deploy cultivators to defend ancient spiritual formations
            </p>
          </div>
        </div>

        {/* Game Mode Tabs */}
        <div 
          id="game-mode-tabs"
          className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800 self-start md:self-auto overflow-x-auto max-w-full"
          role="tablist"
        >
          <button
            id="mode-tab-story"
            role="tab"
            aria-selected={selectedMode === 'story'}
            onClick={() => setSelectedMode('story')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-cinzel tracking-wider whitespace-nowrap transition-all ${selectedMode === 'story' ? 'bg-amber-600 text-white font-bold shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            Story Mode
          </button>
          <button
            id="mode-tab-endless"
            role="tab"
            aria-selected={selectedMode === 'endless'}
            onClick={() => setSelectedMode('endless')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-cinzel tracking-wider whitespace-nowrap transition-all ${selectedMode === 'endless' ? 'bg-amber-600 text-white font-bold shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            Endless Mode
          </button>
          <button
            id="mode-tab-challenge"
            role="tab"
            aria-selected={selectedMode === 'challenge'}
            onClick={() => setSelectedMode('challenge')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-cinzel tracking-wider whitespace-nowrap transition-all ${selectedMode === 'challenge' ? 'bg-amber-600 text-white font-bold shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            Challenge
          </button>
          <button
            id="mode-tab-training"
            role="tab"
            aria-selected={selectedMode === 'training'}
            onClick={() => setSelectedMode('training')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-cinzel tracking-wider whitespace-nowrap transition-all ${selectedMode === 'training' ? 'bg-amber-600 text-white font-bold shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            Training
          </button>
        </div>
      </div>

      {/* Main Content: Map Carousel / Grid and Selected Realm Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6">
        {/* Left Column: Realm Cards List */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="text-xs font-cinzel text-neutral-400 uppercase tracking-widest px-1">
            Territories ({REALMS_DATA.length})
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[480px] pr-1">
            {REALMS_DATA.map((realm, idx) => {
              const isSelected = selectedRealm.id === realm.id;
              const isCleared = saveState.completedRealmIds.includes(realm.id);

              return (
                <button
                  key={realm.id}
                  id={`realm-card-${realm.id}`}
                  onClick={() => {
                    setSelectedRealm(realm);
                    soundEngine.playPlacement();
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected 
                      ? 'bg-neutral-900 border-amber-500 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500' 
                      : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-950 border border-neutral-700">
                      {getRealmIcon(realm.id)}
                    </div>
                    <div>
                      <div className="font-cinzel text-sm sm:text-base font-bold text-neutral-100 flex items-center space-x-2">
                        <span>{realm.name}</span>
                        {isCleared && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-sans">
                            CLEARED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400 line-clamp-1">
                        {realm.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-amber-400 font-cinzel font-semibold">
                      {selectedMode === 'endless' ? '∞ Waves' : `${realm.totalWaves} Waves`}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {realm.recommendedPower}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Realm Showcase & Battle Launch */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-neutral-900/70 border border-amber-900/30 rounded-2xl p-5 lg:p-6 backdrop-blur-sm">
          <div>
            {/* Realm Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-cinzel text-amber-400 tracking-wider">
                  REALM INTEL & TACTICS
                </span>
                <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-amber-200 mt-1">
                  {selectedRealm.name}
                </h2>
                <div className="text-xs sm:text-sm text-neutral-400 italic mt-0.5">
                  &ldquo;{selectedRealm.subtitle}&rdquo;
                </div>
              </div>

              <div className="px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-xs text-amber-300 font-cinzel">
                First Clear: +{selectedRealm.firstClearReward} ✦
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-neutral-300 mt-4 leading-relaxed">
              {selectedRealm.description}
            </p>

            {/* Tactical Intel Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
              <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800">
                <div className="text-[11px] text-neutral-500 uppercase tracking-wider font-cinzel">Formation Nodes</div>
                <div className="text-lg font-bold text-neutral-200 mt-0.5">
                  {selectedRealm.placementNodes.length} Strategic Pedestals
                </div>
              </div>

              <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800">
                <div className="text-[11px] text-neutral-500 uppercase tracking-wider font-cinzel">Required Cultivation</div>
                <div className="text-lg font-bold text-amber-300 mt-0.5">
                  {selectedRealm.recommendedPower}
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800">
                <div className="text-[11px] text-neutral-500 uppercase tracking-wider font-cinzel">Wave Density</div>
                <div className="text-lg font-bold text-neutral-200 mt-0.5">
                  {selectedMode === 'endless' ? 'Infinite Scaling' : `${selectedRealm.totalWaves} Waves`}
                </div>
              </div>
            </div>

            {/* Boss Threat Profile */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-neutral-950 to-neutral-950 border border-red-900/40">
              <div className="flex items-center space-x-2 text-xs font-cinzel text-red-400 font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Supreme Calamity Threat</span>
              </div>
              <div className="font-cinzel text-base sm:text-lg font-bold text-red-200 mt-1">
                {selectedRealm.bossName}
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                {selectedRealm.bossDescription}
              </div>
            </div>

            {/* Challenge Mode Modifier Picker (if Challenge Mode active) */}
            {selectedMode === 'challenge' && (
              <div className="mt-4 p-3 rounded-xl bg-amber-950/30 border border-amber-600/40">
                <div className="text-xs font-cinzel text-amber-300 font-semibold mb-2">
                  Select Tribulation Modifier:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {CHALLENGE_MODES.map(mod => (
                    <button
                      key={mod.id}
                      onClick={() => setSelectedChallenge(mod)}
                      className={`p-2 rounded-lg text-left border transition-all ${
                        selectedChallenge.id === mod.id 
                          ? 'bg-amber-900/50 border-amber-400 text-amber-200' 
                          : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <div className="text-xs font-bold">{mod.name}</div>
                      <div className="text-[10px] line-clamp-2 mt-0.5">{mod.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enter Battle Action Button */}
          <div className="mt-8 pt-4 border-t border-neutral-800/80 flex items-center justify-between">
            <div className="text-xs text-neutral-400 hidden sm:block">
              Clicking below will deploy you to the frontline immediately.
            </div>

            <button
              id="btn-enter-battle"
              onClick={handleStart}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-cinzel font-bold text-base tracking-wider text-amber-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-xl shadow-amber-900/30 border border-amber-300 transform hover:scale-105 active:scale-100 transition-all flex items-center justify-center space-x-2.5"
            >
              <Swords className="w-5 h-5 text-amber-950" />
              <span>COMMENCE DEFENSE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
