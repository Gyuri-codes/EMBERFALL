import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Shield, Sparkles, Flame, Zap, Compass, CheckCircle2 } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const tutorialSteps = [
    {
      title: "1. The Sacred Formation Pedestals",
      desc: "Tap or click any glowing Taiji (☯) stone pedestal along the inkwash path. This reveals your roster of immortal cultivators. Place them strategically at turns and choke points where their elemental range covers multiple enemies.",
      icon: <Compass className="w-8 h-8 text-amber-400" />
    },
    {
      title: "2. Elemental Affinities & Attacks",
      desc: "Each Cultivator commands a primordial element. Fire deals burn damage over time, Ice slows demon advance speeds, Lightning chains across clustered shadows, and Wind cuts through armor. Pair complementary elements for maximum synergy.",
      icon: <Flame className="w-8 h-8 text-red-400" />
    },
    {
      title: "3. Five Cultivation Upgrade Tiers",
      desc: "Tap any placed cultivator on the field to open their Ascension panel. Upgrade them through 5 tiers: Spirit Awakening, Qi Condensation, Foundation Realm, Core Formation, and Immortal Sovereign. Each breakthrough multiplies attack power and expands spiritual weapon auras!",
      icon: <Sparkles className="w-8 h-8 text-purple-400" />
    },
    {
      title: "4. Unleash Sacred Battlefield Arts",
      desc: "When waves overwhelm your formations, cast your active abilities located at the bottom-right (or press hotkeys 1-5). Summon the Inferno Dragon, call down Heavenly Thunder, or invoke Celestial Rebirth to instantly restore your Realm Core's spiritual shield.",
      icon: <Zap className="w-8 h-8 text-cyan-400" />
    },
    {
      title: "5. Calamity Boss Tactics & Endless Trials",
      desc: "Every 5th wave brings a formidable Calamity Boss with multi-phase mechanics and immense health bars. Defeat bosses to earn Celestial Shards, then spend them in the Cultivation Pavilion to permanently enhance all future battles!",
      icon: <Shield className="w-8 h-8 text-emerald-400" />
    }
  ];

  const step = tutorialSteps[currentStep];

  const nextStep = () => {
    soundEngine.playPlacement();
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    soundEngine.playPlacement();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div 
      id="tutorial-modal-backdrop"
      className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div 
        id="tutorial-modal-panel"
        className="bg-neutral-900 border border-amber-500/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-neutral-400 hover:text-neutral-200"
          aria-label="Close tutorial"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center space-x-1.5 mb-4">
          {tutorialSteps.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1.5 rounded-full transition-all ${idx === currentStep ? 'w-8 bg-amber-400' : 'w-3 bg-neutral-800'}`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
            {step.icon}
          </div>
          <h2 id="tutorial-title" className="font-cinzel text-lg sm:text-xl font-bold text-amber-300">
            {step.title}
          </h2>
        </div>

        <p className="text-sm text-neutral-300 leading-relaxed min-h-[90px]">
          {step.desc}
        </p>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-cinzel flex items-center space-x-1 ${
              currentStep > 0 ? 'text-neutral-300 hover:text-white bg-neutral-800' : 'text-neutral-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={nextStep}
            className="px-5 py-2 rounded-xl text-xs font-cinzel font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 shadow-md flex items-center space-x-1"
          >
            <span>{currentStep === tutorialSteps.length - 1 ? 'Understood' : 'Next Step'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
