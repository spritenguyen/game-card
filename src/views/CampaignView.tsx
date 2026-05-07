import React, { useState, useEffect } from "react";
import { Icon } from '../components/ui/Icon';
import { Card, Boss } from "../types";
import { CAMPAIGN_STAGES, CampaignStage } from "../data/campaign";
import { generateDialogueFromAI } from "../services/ai";

interface Props {
  cards: Card[];
  campaignProgress: { chapter: number, stage: number };
  setCampaignProgress: (progress: { chapter: number, stage: number }) => void;
  setBattlefieldEnemySquad: (squad: (Boss | null)[]) => void;
  onStartCombat: () => void;
  onAlert: (t: string, m: string) => void;
  config: any;
}

export const CampaignView: React.FC<Props> = ({
  cards,
  campaignProgress,
  setCampaignProgress,
  setBattlefieldEnemySquad,
  onStartCombat,
  onAlert,
  config
}) => {
  const [selectedStage, setSelectedStage] = useState<CampaignStage | null>(null);
  const [isPlayingDialogue, setIsPlayingDialogue] = useState(false);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);

  const stages = CAMPAIGN_STAGES.filter(s => s.chapter === campaignProgress.chapter);

  const handleSelectStage = (stage: CampaignStage) => {
    setSelectedStage(stage);
    setCurrentDialogueIndex(0);
    if (stage.dialogue && stage.dialogue.length > 0) {
        setIsPlayingDialogue(true);
    } else {
        setIsPlayingDialogue(false);
    }
  };

  const nextDialogue = () => {
    if (!selectedStage) return;
    if (currentDialogueIndex < selectedStage.dialogue.length - 1) {
      setCurrentDialogueIndex(prev => prev + 1);
    } else {
      setIsPlayingDialogue(false);
      startStageCombat(selectedStage);
    }
  };

  const skipDialogue = () => {
    if (!selectedStage) return;
    setIsPlayingDialogue(false);
    startStageCombat(selectedStage);
  };

  const startStageCombat = (stage: CampaignStage) => {
    // Fill boss array up to 6 slots
    const enemiesToSet = stage.enemies.map(e => e ? {
        id: e.id || `enemy_${Date.now()}_${Math.random()}`,
        name: e.name || "Unknown Entity",
        universe: e.universe || "Core",
        faction: e.faction || "CyberCore",
        element: e.element,
        threatLevel: e.threatLevel || "Low",
        hp: e.hp || 100,
        attack: e.attack || 10,
        reward: e.reward || stage.rewardDC,
        lore: e.lore || "",
        visualDescription: e.visualDescription || "",
        campaignStageId: stage.id
    } : null);
    
    while(enemiesToSet.length < 6) enemiesToSet.push(null);
    setBattlefieldEnemySquad(enemiesToSet as (Boss | null)[]);
    onStartCombat();
  };

  return (
    <div className="w-full h-full flex flex-col items-center p-4">
      <div className="max-w-4xl w-full">
        <h2 className="font-serif text-3xl text-white mb-6 tracking-widest text-center uppercase">Chương {campaignProgress.chapter}</h2>
        
        {/* Stage selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {stages.map(stage => {
                const isLocked = stage.stage > campaignProgress.stage;
                return (
                    <button 
                        key={stage.id} 
                        onClick={() => !isLocked && handleSelectStage(stage)}
                        className={`p-4 rounded-xl border text-left transition-all ${isLocked ? 'bg-zinc-900 border-zinc-800 opacity-50 cursor-not-allowed' : 'bg-black border-zinc-600 hover:border-cinematic-cyan shadow-lg'}`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-xs text-zinc-400">STAGE {stage.chapter}-{stage.stage}</span>
                            {isLocked && <Icon name="fa-lock text-zinc-600" className="fa-lock text-zinc-600" />}
                        </div>
                        <h3 className={`font-bold text-lg mb-1 ${isLocked ? 'text-zinc-500' : 'text-white'}`}>{stage.name}</h3>
                        <p className={`text-xs ${isLocked ? 'text-zinc-700' : 'text-zinc-400'} line-clamp-2`}>{stage.description}</p>
                    </button>
                )
            })}
        </div>

        {/* Dialogue overlay */}
        {isPlayingDialogue && selectedStage && (
            <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col justify-end p-4 sm:p-8 animate-fade-in">
                <div className="max-w-4xl w-full mx-auto relative mb-12 sm:mb-24">
                   <div className="bg-zinc-900 border-2 border-zinc-700 rounded-xl p-6 shadow-2xl relative">
                        <div className="absolute -top-4 left-6 bg-cinematic-cyan text-black font-bold px-4 py-1 text-xs uppercase tracking-widest rounded-sm">
                            {selectedStage.dialogue[currentDialogueIndex].speaker}
                        </div>
                        <p className="text-xl text-white mt-2 mb-4">"{selectedStage.dialogue[currentDialogueIndex].text}"</p>

                        <div className="flex justify-between items-center mt-6 border-t border-zinc-800 pt-4">
                           <button onClick={skipDialogue} className="text-zinc-500 text-xs font-mono uppercase hover:text-white transition-colors">Skip</button>
                           <button onClick={nextDialogue} className="text-cinematic-cyan text-sm font-bold uppercase flex items-center gap-2 hover:text-white transition-colors">Next <Icon name="fa-chevron-right" className="fa-chevron-right" /></button>
                        </div>
                   </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
