import React, { useState } from "react";
import { Icon } from '../components/ui/Icon';
import { Card, Boss, AppConfig } from "../types";
import { CAMPAIGN_STAGES, CampaignStage } from "../data/campaign";
import { generateCampaignScenarioFromAI, generateBackgroundImageFromAi } from "../services/ai";

interface Props {
  cards: Card[];
  squad: (Card | null)[];
  campaignProgress: { chapter: number, stage: number };
  setCampaignProgress: (progress: { chapter: number, stage: number }) => void;
  setBattlefieldEnemySquad: (squad: (Boss | null)[]) => void;
  onStartCombat: () => void;
  onAlert: (t: string, m: string) => void;
  config: AppConfig;
}

export const CampaignView: React.FC<Props> = ({
  cards,
  squad,
  campaignProgress,
  setCampaignProgress,
  setBattlefieldEnemySquad,
  onStartCombat,
  onAlert,
  config
}) => {
  const [selectedStage, setSelectedStage] = useState<CampaignStage | null>(null);
  const [isPlayingDialogue, setIsPlayingDialogue] = useState(false);
  const [isLoadingScenario, setIsLoadingScenario] = useState(false);
  
  // Scenario state
  const [bgImage, setBgImage] = useState<string>('');
  const [situationText, setSituationText] = useState<string>('');
  const [choices, setChoices] = useState<any[]>([]);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [resultText, setResultText] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const stages = CAMPAIGN_STAGES.filter(s => s.chapter === campaignProgress.chapter);

  const handleSelectStage = async (stage: CampaignStage) => {
    setSelectedStage(stage);
    
    // Quick fallback checks
    if (!config.useCustomGemini && !(config.pollinationsKey && config.pollinationsKey.trim() !== '')) {
      // If AI is likely to fail, just start combat? Or try anyway since we have free tier API
    }

    setIsLoadingScenario(true);
    setIsPlayingDialogue(true);
    setShowResult(false);
    setBgImage('');
    setSituationText('');
    setChoices([]);
    setResultText('');

    try {
        const squadNames = squad.filter(Boolean).map(c => c!.name).join(", ");
        const squadStr = squadNames ? squadNames : 'Một chỉ huy cô độc';
        
        const scenario = await generateCampaignScenarioFromAI(stage.name, stage.description, squadStr, config);
        setSituationText(scenario.situation);
        setChoices(scenario.choices || []);
        
        if (scenario.backgroundPrompt) {
            try {
                const bg = await generateBackgroundImageFromAi(scenario.backgroundPrompt, config);
                setBgImage(bg);
            } catch (bgErr) {
                console.warn("Failed to gen background", bgErr);
            }
        }
    } catch (e: any) {
        onAlert("Mất Tín Hiệu", "AI Narrative Error: " + (e.message || "Unknown").substring(0, 50));
        // Fallback to combat
        startStageCombat(stage, false);
        return;
    } finally {
        setIsLoadingScenario(false);
    }
  };

  const handleChoice = (isCorrect: boolean, effectText: string) => {
    setShowResult(true);
    setIsSuccess(isCorrect);
    setResultText(effectText || (isCorrect ? 'Thành công vượt qua thử thách.' : 'Thất bại. Kẻ địch chiếm ưu thế.'));
  };

  const proceedToCombat = () => {
    if (!selectedStage) return;
    setIsPlayingDialogue(false);
    startStageCombat(selectedStage, isSuccess);
  };

  const skipDialogue = () => {
    if (!selectedStage) return;
    setIsPlayingDialogue(false);
    startStageCombat(selectedStage, false); // No buff if skipped
  };

  const startStageCombat = (stage: CampaignStage, buffed: boolean) => {
    // Fill boss array up to 6 slots
    const enemiesToSet = stage.enemies.map(e => {
        if (!e) return null;
        return {
            id: e.id || `enemy_${Date.now()}_${Math.random()}`,
            name: e.name || "Unknown Entity",
            universe: e.universe || "Core",
            faction: e.faction || "CyberCore",
            element: e.element,
            threatLevel: e.threatLevel || "Low",
            hp: buffed ? Math.floor((e.hp || 100) * 0.8) : (e.hp || 100), // Reduce Enemy HP if buffed
            attack: buffed ? Math.floor((e.attack || 10) * 0.9) : (e.attack || 10), // Reduce Enemy ATK
            reward: e.reward || stage.rewardDC,
            lore: e.lore || "",
            visualDescription: e.visualDescription || "",
            campaignStageId: stage.id
        }
    });
    
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
            <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col justify-end p-0 sm:p-8 animate-fade-in">
                {/* Background Image */}
                {bgImage && (
                    <div className="absolute inset-0 z-0">
                        <img src={bgImage} alt="Environment" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    </div>
                )}
                
                <div className="max-w-4xl w-full mx-auto relative mb-0 sm:mb-12 z-10 w-[100vw] h-full sm:h-auto flex flex-col justify-end">
                    
                   <div className="bg-black/80 sm:bg-black/60 border-t-2 sm:border-2 border-cinematic-cyan/50 sm:rounded-xl p-6 shadow-2xl relative backdrop-blur-md">
                        {isLoadingScenario ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Icon name="fa-spinner animate-spin text-4xl text-cinematic-cyan mb-4" />
                                <p className="text-zinc-300 font-mono tracking-widest text-sm uppercase animate-pulse">Generating Scenario...</p>
                            </div>
                        ) : (
                            <>
                                <div className="absolute -top-4 left-6 bg-cinematic-cyan text-black font-bold px-4 py-1 text-xs uppercase tracking-widest rounded-sm">
                                    SYSTEM OVERRIDE
                                </div>
                                <p className="text-lg md:text-xl text-white mt-2 mb-6 font-serif italic border-l-4 border-cinematic-cyan/50 pl-4 py-2">
                                    {situationText || "Đường truyền đang gặp nhiễu tặc... Kẻ thù có thể ẩn nấp quanh đây."}
                                </p>

                                {!showResult ? (
                                    <div className="space-y-3 mt-8">
                                        <p className="text-xs text-zinc-400 font-mono uppercase tracking-widest mb-3"><Icon name="fa-code-branch" /> Lựa chọn:</p>
                                        {choices.length > 0 ? choices.map((choice, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleChoice(choice.isCorrect, choice.effectDescribe)}
                                                className="w-full text-left p-3 sm:p-4 rounded-lg bg-white/5 border border-white/10 hover:border-cinematic-cyan hover:bg-cinematic-cyan/10 transition-all group flex items-start sm:items-center gap-3"
                                            >
                                                <span className="font-mono text-cinematic-cyan opacity-50 group-hover:opacity-100">&gt;</span>
                                                <span className="text-sm md:text-base text-zinc-300 group-hover:text-white leading-relaxed">{choice.text}</span>
                                            </button>
                                        )) : (
                                            <button 
                                                onClick={() => handleChoice(true, "Không có lựa chọn nào, buộc phải tiến lên.")}
                                                className="w-full text-left p-4 rounded-lg bg-white/5 border border-white/10 hover:border-cinematic-cyan transition-all group"
                                            >
                                                <span className="font-mono text-cinematic-cyan">&gt;</span> Tiếp tục tiến độ một cách thận trọng...
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className={`mt-6 p-4 rounded-lg border ${isSuccess ? 'bg-green-950/30 border-green-500/50' : 'bg-red-950/30 border-red-500/50'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                           <Icon name={isSuccess ? "fa-check-circle text-green-400" : "fa-triangle-exclamation text-red-500"} className="text-xl" />
                                           <h4 className={`font-bold ${isSuccess ? 'text-green-400' : 'text-red-500'} uppercase font-mono`}>
                                               {isSuccess ? 'Phân Tích Thành Công' : 'Cảnh Báo Nguy Hiểm'}
                                            </h4>
                                        </div>
                                        <p className="text-zinc-300">{resultText}</p>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mt-8 pt-4 border-t border-zinc-800/50 gap-4 sm:gap-0">
                                   <button onClick={skipDialogue} className="text-zinc-500 text-xs font-mono uppercase hover:text-white transition-colors order-2 sm:order-1">Bỏ qua / Bắt đầu ngay</button>
                                   
                                   {showResult && (
                                       <button 
                                            onClick={proceedToCombat} 
                                            className={`w-full sm:w-auto px-8 py-3 rounded text-sm font-bold uppercase flex justify-center items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] order-1 sm:order-2 ${isSuccess ? 'bg-cinematic-cyan text-black hover:bg-white' : 'bg-red-600 text-white hover:bg-red-500'}`}
                                        >
                                            {isSuccess ? 'Khai Chiến Kẻ Địch (Buffed)' : 'Chiến đấu trong bất lợi'} <Icon name="fa-khanda" />
                                       </button>
                                   )}
                                </div>
                            </>
                        )}
                   </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
