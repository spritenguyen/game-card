import React, { useState } from 'react';
import { Card, AppConfig } from '../types';
import { FullCard } from '../components/FullCard';
import { getFusionCost, getFactionInfo } from '../lib/gameLogic';
import { generateFusionFromAI, generateImageFromAi } from '../services/ai';

interface Props {
  config: AppConfig;
  currency: number;
  modifyCurrency: (amount: number) => boolean;
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

export const FusionView: React.FC<Props> = ({ config, currency, modifyCurrency, fusionSlot1, fusionSlot2, setFusionSlot1, setFusionSlot2, onOpenSelector, onCompleteFusion, onError, onAlert, isGlobalProcessing, setGlobalProcessing }) => {
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
            if (!modifyCurrency(-dynamicCost)) throw new Error("Giao dịch Credit bị từ chối.");

            // Calculate target rank purely on frontend
            const getRankIdx = (cls?: string) => { const u=cls?.toUpperCase()||''; if(u.includes('UR'))return 4; if(u.includes('SSR'))return 3; if(u.includes('SR'))return 2; if(u.includes('R'))return 1; return 0; };
            const r1 = getRankIdx(fusionSlot1.cardClass);
            const r2 = getRankIdx(fusionSlot2.cardClass);
            const roll = Math.random()*100;
            let inc = roll<30?0:(roll<80?1:(roll<95?2:3));
            const tgtR = Math.min(4, Math.max(r1,r2)+inc);
            const targetRank = ['N', 'R', 'SR', 'SSR', 'UR'][tgtR];
            setTargetRankString(targetRank);

            const cardData = await generateFusionFromAI(fusionSlot1, fusionSlot2, targetRank, config);
            cardData.cardClass = targetRank;
            cardData.id = 'CINE-F-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
            cardData.faction = fusionSlot1.faction || 'Tech';
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
            onAlert("Hệ Thống Cine-Tech", `Lai tạo thành công!<br>Nhận Thẻ hạng <strong>${targetRank}</strong>.<br>2 Thẻ gốc đã bị tiêu hủy.`);
            
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
                        <div className="absolute -top-6 bg-cinematic-900 border border-cinematic-cyan/50 text-cinematic-cyan text-[10px] px-3 py-1 rounded-full font-bold shadow-lg z-10 whitespace-nowrap">
                            Phí: {canFuse ? `${dynamicCost} DC` : 'Tùy cấp độ'}
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
