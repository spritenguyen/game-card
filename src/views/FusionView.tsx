import React, { useState } from 'react';
import { Card, AppConfig } from '../types';
import { FullCard } from '../components/FullCard';
import { getFusionCost, getFactionInfo, getRankIndex } from '../lib/gameLogic';
import { generateFusionFromAI, generateImageFromAi } from '../services/ai';
import { FACTIONS, ELEMENTS } from '../lib/constants';

interface Props {
  config: AppConfig;
  currency: number;
  modifyCurrency: (amount: number) => boolean;
  inventory: any;
  modifyInventory: (bd: number, ed: number, m?: Record<string, number>, dd?: number) => void;
  fusionSlot1: Card | null;
  fusionSlot2: Card | null;
  setFusionSlot1: (c: Card | null) => void;
  setFusionSlot2: (c: Card | null) => void;
  onOpenSelector: (slot: 1 | 2) => void;
  onCompleteFusion: (newCard: Card, old1: string, old2: string) => Promise<void>;
  onError: (msg: string) => void;
  onAlert: (t: string, m: string) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (v: boolean) => void;
}

export const FusionView: React.FC<Props> = ({ config, currency, modifyCurrency, inventory, modifyInventory, fusionSlot1, fusionSlot2, setFusionSlot1, setFusionSlot2, onOpenSelector, onCompleteFusion, onError, onAlert, isGlobalProcessing, setGlobalProcessing }) => {
    const [card, setCard] = useState<Card | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [targetRankString, setTargetRankString] = useState<string>('');

    const dynamicCost = getFusionCost(fusionSlot1, fusionSlot2);
    const canFuse = fusionSlot1 && fusionSlot2 && !isGlobalProcessing;

    const executeFusion = async () => {
        if (!canFuse) return;
        if (currency < dynamicCost) return onError(`Không đủ Data Credits (Yêu cầu ${dynamicCost} DC).`);

        setGlobalProcessing(true);
        try {
            const r1 = getRankIndex(fusionSlot1.cardClass);
            const r2 = getRankIndex(fusionSlot2.cardClass);
            
            if (r1 === 4 || r2 === 4) {
                 setGlobalProcessing(false);
                 return onError("Không thể dùng thẻ UR làm vật liệu lai tạo.");
            }

            const maxR = Math.max(r1, r2);
            let reqCore = 0;
            let reqShard = 0;
            let reqDust = 0;

            if (maxR === 2) { // SR
                reqCore = 1;
                reqShard = 1;
            } else if (maxR === 3) { // SSR
                reqCore = 2;
                reqShard = 2;
                reqDust = 50;
            }

            const coreName = `${fusionSlot1.faction} Core`;
            const shardName = `${fusionSlot2.element} Shard`;

            if (reqCore > 0 && (inventory.materials?.[coreName] || 0) < reqCore) {
                setGlobalProcessing(false);
                return onError(`Thiếu ${reqCore} ${coreName} (Yêu cầu bởi Thẻ SR+).`);
            }
            if (reqShard > 0 && (inventory.materials?.[shardName] || 0) < reqShard) {
                setGlobalProcessing(false);
                return onError(`Thiếu ${reqShard} ${shardName} (Yêu cầu bởi Thẻ SR+).`);
            }
            if (reqDust > 0 && (inventory.quantumDust || 0) < reqDust) {
                setGlobalProcessing(false);
                return onError(`Thiếu ${reqDust} Quantum Dust (Yêu cầu bởi Thẻ SSR).`);
            }

            if (!modifyCurrency(-dynamicCost)) {
                setGlobalProcessing(false);
                return onError("Giao dịch Credit bị từ chối.");
            }

            if (reqCore > 0 || reqShard > 0 || reqDust > 0) {
                 const dedMaterials: Record<string, number> = {};
                 if (reqCore > 0) dedMaterials[coreName] = -reqCore;
                 if (reqShard > 0) {
                     dedMaterials[shardName] = (dedMaterials[shardName] || 0) - reqShard;
                 }
                 modifyInventory(0, 0, dedMaterials, -reqDust);
            }

            const roll = Math.random()*100;
            let tgtR = maxR;
            if (maxR === 0) {
                if (roll < 50) tgtR = 0;
                else if (roll < 90) tgtR = 1; // 40% R
                else tgtR = 2; // 10% SR
            } else if (maxR === 1) { 
                if (roll < 60) tgtR = 1;
                else if (roll < 95) tgtR = 2; // 35% SR
                else tgtR = 3; // 5% SSR
            } else if (maxR === 2) { 
                if (roll < 70) tgtR = 2;
                else if (roll < 97) tgtR = 3; // 27% SSR
                else tgtR = 4; // 3% UR
            } else if (maxR === 3) { 
                if (roll < 95) tgtR = 3;
                else tgtR = 4; // 5% UR
            }
            if (tgtR > 4) tgtR = 4;

            const targetRank = ['N', 'R', 'SR', 'SSR', 'UR'][tgtR];
            setTargetRankString(targetRank);

            let newFaction = fusionSlot1.faction || 'Tech';
            let newElement = fusionSlot2.element || 'Neutral';
            const factionKeys = Object.keys(FACTIONS);
            const elementKeys = Object.keys(ELEMENTS);
            let isMutated = false;

            if (Math.random() < 0.15) { // 15% mutation chance
                isMutated = true;
                if (Math.random() < 0.5) {
                    newFaction = factionKeys[Math.floor(Math.random() * factionKeys.length)] as any;
                } else {
                    newElement = elementKeys[Math.floor(Math.random() * elementKeys.length)] as any;
                }
            }

            const cardData = await generateFusionFromAI(fusionSlot1, fusionSlot2, targetRank, config);
            cardData.cardClass = targetRank;
            cardData.id = 'CINE-F-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
            cardData.faction = newFaction as any;
            cardData.element = newElement as any;
            cardData.universe = fusionSlot2.universe || 'Unknown';
            
            setCard(cardData);
            setIsLoadingImage(true);

            try {
                const imgUrl = await generateImageFromAi(cardData, config);
                cardData.imageUrl = imgUrl; // Need string for later passing to save
                setCard({ ...cardData });
            } catch(e) {}
            finally {
                setIsLoadingImage(false);
            }

            await onCompleteFusion(cardData, fusionSlot1.id, fusionSlot2.id);
            if (isMutated) {
                onAlert("ĐỘT BIẾN GEN", `DNA phát sinh bất thường! Thể mới đạt hệ: ${newFaction} - ${newElement}`);
            } else {
                onAlert("Hệ Thống Cine-Tech", `Lai tạo thành công!<br>Nhận Thẻ hạng <strong>${targetRank}</strong>.<br>2 Thẻ gốc đã bị tiêu hủy.`);
            }
            
        } catch(e: any) {
            modifyCurrency(dynamicCost);
            if(e.message === "API_KEY_INVALID") onAlert("Hệ Thống Cine-Tech", "API Key không hợp lệ. Kiểm tra cài đặt.");
            else onError("Lỗi lai tạo. Đã hoàn tiền.");
        } finally {
            setGlobalProcessing(false);
        }
    };

    const renderSlot = (c: Card | null, label: string, desc: string, slotNum: 1 | 2) => {
        if (c) {
            return (
                <div className="w-full h-full p-2 flex flex-col">
                    <img src={c.imageUrl} className="w-full h-2/3 object-cover rounded-xl border border-white/10 opacity-80 mb-2" crossOrigin="anonymous" alt={c.name} />
                    <div className="text-[10px] text-cinematic-cyan uppercase tracking-widest text-center truncate">{c.name}</div>
                    <div className="text-[8px] text-cinematic-muted text-center font-bold">Class: {c.cardClass} | {getFactionInfo(c.faction).name}</div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); slotNum === 1 ? setFusionSlot1(null) : setFusionSlot2(null); }}
                        className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-red-500/80 text-white/70 hover:text-white border border-white/10 hover:border-red-400/50 transition-all z-20 shadow-lg group relative"
                    >
                        <i className="fa-solid fa-xmark text-xs sm:text-sm"></i>
                        <span className="absolute -bottom-6 right-0 text-[8px] bg-red-900/80 text-red-100 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase font-mono">Gỡ bỏ slot</span>
                    </button>
                </div>
            );
        }
        return (
            <>
                <i className="fa-solid fa-plus text-4xl text-white/20 mb-3"></i>
                <p className="text-[10px] text-cinematic-gold tracking-widest uppercase mb-1">{label}</p>
                <p className="text-[8px] text-cinematic-muted tracking-widest uppercase text-center px-2 opacity-70">{desc}</p>
            </>
        );
    };

    return (
        <div className="w-full flex flex-col items-center animate-fade-in pb-12">
            <div className="w-full max-w-4xl glass-panel rounded-3xl p-6 sm:p-10 mb-8 relative overflow-hidden shadow-2xl border border-cinematic-cyan/20">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #00f3ff 0%, transparent 60%)" }}></div>
                <h2 className="text-center font-serif text-2xl text-white mb-2 tracking-widest relative z-10">GIAO THỨC CHIMERA</h2>
                <div className="text-center mb-8 relative z-10">
                    <p className="text-[10px] text-red-400 uppercase tracking-widest bg-red-900/20 py-1 inline-block px-4 border border-red-900/50 rounded-full mx-auto mb-2"><i className="fa-solid fa-triangle-exclamation mr-2"></i> Thể gốc bị tiêu hủy vĩnh viễn (Cấm thẻ UR)</p>
                    <p className="text-[9px] text-cinematic-cyan/70 tracking-widest uppercase block mt-1">Nghiên cứu Chiến thuật: Sự sắp xếp DNA định hình sinh vật mới.</p>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 relative z-10">
                    <div onClick={() => onOpenSelector(1)} className={`w-48 h-72 sm:w-56 sm:h-80 fusion-slot rounded-2xl flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden bg-black/40 backdrop-blur-sm shadow-lg ${fusionSlot1 ? 'filled' : ''}`}>
                        {renderSlot(fusionSlot1, 'Alpha (Gen Trội)', 'Quyết định Faction & Giới tính', 1)}
                    </div>

                    <div className="flex flex-col items-center justify-center py-4 relative">
                        <div className="absolute -top-10 sm:-top-8 flex flex-col items-center gap-1 w-max">
                            <div className="bg-cinematic-900 border border-cinematic-cyan/50 text-cinematic-cyan text-[10px] px-3 py-1 rounded-full font-bold shadow-lg z-10 whitespace-nowrap">
                                Phí: {canFuse ? `${dynamicCost} DC` : 'Tùy cấp độ'}
                            </div>
                            {canFuse && Math.max(getRankIndex(fusionSlot1.cardClass), getRankIndex(fusionSlot2.cardClass)) >= 2 && (
                                <div className="text-[8px] bg-red-900/50 text-red-200 px-2 py-0.5 rounded border border-red-500/30 whitespace-nowrap">
                                    + Cần v.phẩm đặc thù (Core/Shard)
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={executeFusion} 
                            disabled={!canFuse}
                            className={`bg-cinematic-900 border border-cinematic-cyan/30 text-cinematic-cyan hover:bg-cinematic-cyan/20 px-6 py-4 rounded-full font-bold tracking-widest uppercase transition-all duration-300 transform shadow-[0_0_30px_rgba(0,243,255,0.2)] disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center my-2 ${canFuse && !isGlobalProcessing ? 'hover:scale-110 animate-pulse' : ''}`}
                        >
                            <i className={`fa-solid ${isGlobalProcessing ? 'fa-circle-notch fa-spin' : 'fa-dna'} text-xl`}></i>
                        </button>
                        <p className="text-[10px] text-cinematic-cyan tracking-widest mt-2 uppercase opacity-50">
                            {isGlobalProcessing ? `Mục tiêu hạng ${targetRankString}...` : (canFuse ? 'Bắt đầu Lai tạo' : 'Chờ dữ liệu...')}
                        </p>
                    </div>

                    <div onClick={() => onOpenSelector(2)} className={`w-48 h-72 sm:w-56 sm:h-80 fusion-slot rounded-2xl flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden bg-black/40 backdrop-blur-sm shadow-lg ${fusionSlot2 ? 'filled' : ''}`}>
                        {renderSlot(fusionSlot2, 'Omega (Gen Lặn)', 'Quyết định Universe & Thể chất', 2)}
                    </div>
                </div>
            </div>

            {card && (
                <div className="w-full flex justify-center animate-slide-up mb-12">
                    <FullCard card={card} isModal={false} isLoadingImage={isLoadingImage} isSaved={true} context="fusion" config={config} />
                </div>
            )}
        </div>
    );
};
