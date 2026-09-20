import React, { useState } from 'react';
import { COSMETICS_STORE } from '../data/store';
import { CosmeticItem, GameSaveState } from '../types/game';
import { ArrowLeft, ShoppingBag, Sparkles, Check, Crown, Palette } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface StoreScreenProps {
  saveState: GameSaveState;
  onBuyCosmetic: (cosmeticId: string, cost: number) => void;
  onEquipCosmetic: (cosmeticId: string, targetType: string) => void;
  onBack: () => void;
}

export const StoreScreen: React.FC<StoreScreenProps> = ({
  saveState,
  onBuyCosmetic,
  onEquipCosmetic,
  onBack
}) => {
  const [filter, setFilter] = useState<'all' | 'guardian_skin' | 'core_relic' | 'battlefield_theme'>('all');

  const isUnlocked = (id: string) => saveState.unlockedCosmetics.includes(id);
  const isEquipped = (id: string, targetType: string) => saveState.equippedCosmetics[targetType] === id;

  const handleBuy = (item: CosmeticItem) => {
    if (saveState.celestialShards >= item.costShards) {
      soundEngine.playUpgrade();
      onBuyCosmetic(item.id, item.costShards);
    }
  };

  const filteredItems = filter === 'all' 
    ? COSMETICS_STORE 
    : COSMETICS_STORE.filter(i => i.targetType === filter);

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'divine': return 'text-yellow-300 bg-yellow-950/60 border-yellow-500/50';
      case 'legendary': return 'text-orange-400 bg-orange-950/60 border-orange-500/50';
      case 'epic': return 'text-purple-400 bg-purple-950/60 border-purple-500/50';
      default: return 'text-blue-400 bg-blue-950/60 border-blue-500/50';
    }
  };

  return (
    <div 
      id="store-screen"
      className="min-h-[calc(100vh-50px)] w-full p-4 sm:p-6 lg:p-8 bg-neutral-950 text-neutral-100 flex flex-col justify-between max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/30 pb-4">
        <div className="flex items-center space-x-3">
          <button
            id="store-back-btn"
            onClick={onBack}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-800 transition-colors"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wider text-amber-300">
              CELESTIAL TREASURY & COSMETICS
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400">
              Adorn your cultivators and realm core with illustrious Donghua visual attire
            </p>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-amber-500/40 text-xs sm:text-sm text-amber-300 font-cinzel font-bold">
          ✦ {saveState.celestialShards.toLocaleString()} Shards Available
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 my-4 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Artifacts' },
          { id: 'guardian_skin', label: 'Cultivator Attire' },
          { id: 'core_relic', label: 'Core Relics' },
          { id: 'battlefield_theme', label: 'Inkwash Themes' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-cinzel whitespace-nowrap transition-colors ${
              filter === tab.id 
                ? 'bg-amber-600 text-white font-bold' 
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items Showcase Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-4 overflow-y-auto max-h-[520px] pr-1">
        {filteredItems.map(item => {
          const targetType = item.targetType || 'guardian_skin';
          const unlocked = isUnlocked(item.id);
          const equipped = isEquipped(item.id, targetType);
          const canAfford = saveState.celestialShards >= item.costShards;

          return (
            <div
              key={item.id}
              id={`cosmetic-card-${item.id}`}
              className="p-4 rounded-xl bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 flex flex-col justify-between transition-all"
            >
              <div>
                {/* Visual Avatar / Preview */}
                <div 
                  className="w-full h-32 rounded-lg flex items-center justify-center relative overflow-hidden border border-neutral-800 mb-3"
                  style={{ backgroundColor: `${item.previewColor}15` }}
                >
                  <div 
                    className="w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl font-bold"
                    style={{ borderColor: item.previewColor, color: item.previewColor }}
                  >
                    ☯
                  </div>

                  <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold ${getRarityBadge(item.rarity)}`}>
                    {item.rarity}
                  </span>
                </div>

                <h3 className="font-cinzel text-base font-bold text-neutral-100">
                  {item.name}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Action: Buy or Equip */}
              <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
                <div>
                  {unlocked ? (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Owned</span>
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-300 font-cinzel">
                      ✦ {item.costShards}
                    </span>
                  )}
                </div>

                {unlocked ? (
                  <button
                    onClick={() => {
                      soundEngine.playPlacement();
                      onEquipCosmetic(item.id, targetType);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-cinzel font-bold transition-all ${
                      equipped 
                        ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300' 
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                    }`}
                  >
                    {equipped ? 'Equipped' : 'Equip'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={!canAfford}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-cinzel font-bold transition-all ${
                      canAfford 
                        ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-md shadow-amber-950/40' 
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    Acquire
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
