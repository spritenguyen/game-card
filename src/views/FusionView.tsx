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
  cards: Card[];
  modifyInventory: (bd: number, ed: number, m?: Record<string, number>, dd?: number) => void;
  fusionSlot1: Card | null;
  fusionSlot2: Card | null;
  setFusionSlot1: (c: Card | null) => void;
  setFusionSlot2: (c: Card | null) => void;
  onOpenSelector: (slot: 1 | 2) => void;
  onCompleteFusion: (newCard: Card, oldIdsToDelete: string[]) => Promise<void>;
  onError: (msg: string) => void;
  onAlert: (t: string, m: string) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (v: boolean) => void;
}

export type UpgradeItem = { type: 'item'; id: string; amount: number } | { type: 'card'; card: Card };

export const FusionView: React.FC<Props> = ({ config, currency, modifyCurrency, inventory, cards, modifyInventory, fusionSlot1, fusionSlot2, setFusionSlot1, setFusionSlot2, onOpenSelector, onCompleteFusion, onError, onAlert, isGlobalProcessing, setGlobalProcessing }) => {
    const [card, setCard] = useState<Card | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [targetRankString, setTargetRankString] = useState<string>('');
    const [upgradeItem, setUpgradeItem] = useState<UpgradeItem | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [activeUpgradeTab, setActiveUpgradeTab] = useState<'item'|'card'>('item');
    const [tempUpgradeAmount, setTempUpgradeAmount] = useState(1);
    const [tempUpgradeId, setTempUpgradeId] = useState<string | null>(null);
    const [tempUpgradeCard, setTempUpgradeCard] = useState<Card | null>(null);

    const dynamicCost = getFusionCost(fusionSlot1, fusionSlot2);
    const canFuse = fusionSlot1 && fusionSlot2 && !isGlobalProcessing;

    let maxR = 0;
    let reqCore = 0;
    let reqShard = 0;
    let reqDust = 0;
    let coreName = '';
    let shardName = '';

    if (fusionSlot1 && fusionSlot2) {
        const r1 = getRankIndex(fusionSlot1.cardClass);
        const r2 = getRankIndex(fusionSlot2.cardClass);
        maxR = Math.max(r1, r2);
        
        if (maxR === 1) { // R
            reqCore = 1;
            reqShard = 1;
        } else if (maxR === 2) { // SR
            reqCore = 3;
            reqShard = 3;
            reqDust = 25;
        } else if (maxR === 3) { // SSR
            reqCore = 8;
            reqShard = 8;
            reqDust = 100;
        }
        
        coreName = `${fusionSlot1.faction} Core`;
        shardName = `${fusionSlot2.element} Shard`;
    }

    const executeFusion = async () => {
        if (!canFuse) return;
        if (currency < dynamicCost) return onError(`Không đủ Data Credits (Yêu cầu ${dynamicCost} DC).`);

        setGlobalProcessing(true);
        try {
            const r1 = getRankIndex(fusionSlot1!.cardClass);
            const r2 = getRankIndex(fusionSlot2!.cardClass);
            
            if (r1 === 4 || r2 === 4) {
                 setGlobalProcessing(false);
                 return onError("Không thể dùng thẻ UR làm vật liệu lai tạo.");
            }

            if (reqCore > 0 && (inventory.materials?.[coreName] || 0) < reqCore) {
                setGlobalProcessing(false);
                return onError(`Thiếu ${reqCore} ${coreName}`);
            }
            if (reqShard > 0 && (inventory.materials?.[shardName] || 0) < reqShard) {
                setGlobalProcessing(false);
                return onError(`Thiếu ${reqShard} ${shardName}`);
            }
            if (reqDust > 0 && (inventory.quantumDust || 0) < reqDust) {
                setGlobalProcessing(false);
                return onError(`Thiếu ${reqDust} Quantum Dust.`);
            }

            if (upgradeItem) {
                if (upgradeItem.type === 'item') {
                    if (upgradeItem.id === 'quantumDust') {
                        if ((inventory.quantumDust || 0) < reqDust + upgradeItem.amount) {
                             setGlobalProcessing(false);
                             return onError("Không đủ Quantum Dust.");
                        }
                    } else {
                        let requiredThisMat = 0;
                        if (upgradeItem.id === coreName) requiredThisMat += reqCore;
                        if (upgradeItem.id === shardName) requiredThisMat += reqShard;
                        if ((inventory.materials?.[upgradeItem.id] || 0) < requiredThisMat + upgradeItem.amount) {
                            setGlobalProcessing(false);
                            return onError(`Không đủ ${upgradeItem.id}.`);
                        }
                    }
                }
            }

            if (!modifyCurrency(-dynamicCost)) {
                setGlobalProcessing(false);
                return onError("Giao dịch Credit bị từ chối.");
            }

            const Object_keys = Object.keys; // Help TypeScript out
            if (reqCore > 0 || reqShard > 0 || reqDust > 0 || (upgradeItem && upgradeItem.type === 'item')) {
                 const dedMaterials: Record<string, number> = {};
                 if (reqCore > 0) dedMaterials[coreName] = -reqCore;
                 if (reqShard > 0) dedMaterials[shardName] = (dedMaterials[shardName] || 0) - reqShard;
                 
                 let totalDustToDed = reqDust;

                 if (upgradeItem && upgradeItem.type === 'item') {
                     if (upgradeItem.id === 'quantumDust') {
                         totalDustToDed += upgradeItem.amount;
                     } else {
                         dedMaterials[upgradeItem.id] = (dedMaterials[upgradeItem.id] || 0) - upgradeItem.amount;
                     }
                 }
                 modifyInventory(0, 0, dedMaterials, -totalDustToDed);
            }

            let mutationChance = 0.15;
            let roll = Math.random()*100;
            let dustBonus = 0;
            let newFaction = fusionSlot1.faction || 'Tech';
            let newElement = fusionSlot2.element || 'Neutral';

            if (upgradeItem) {
                if (upgradeItem.type === 'item') {
                    if (upgradeItem.id === 'quantumDust') {
                        dustBonus = (upgradeItem.amount / 100) * 10; 
                        roll += dustBonus; // Increase the roll value making higher ranks easier
                    } else {
                        mutationChance += 0.05 * upgradeItem.amount; 
                    }
                } else if (upgradeItem.type === 'card') {
                    const cRank = getRankIndex(upgradeItem.card.cardClass);
                    // Sacrifice card boosts
                    if (cRank === 3) roll += 20; // SSR
                    else if (cRank === 2) roll += 10; // SR
                    else roll += 5; // N, R
                    
                    mutationChance += 0.15; 
                    
                    if (Math.random() < mutationChance) {
                        // Force mutation to match the sacrificed card's traits
                        if (Math.random() < 0.5) newFaction = upgradeItem.card.faction;
                        else newElement = upgradeItem.card.element;
                        mutationChance = 0; // Prevent second mutation block below
                    }
                }
            }

            let tgtR = maxR;
            if (maxR === 0) {
                if (roll < 50) tgtR = 0;
                else if (roll < 90) tgtR = 1; 
                else tgtR = 2; 
            } else if (maxR === 1) { 
                if (roll < 60) tgtR = 1;
                else if (roll < 95) tgtR = 2; 
                else tgtR = 3; 
            } else if (maxR === 2) { 
                if (roll < 70) tgtR = 2;
                else if (roll < 97) tgtR = 3; 
                else tgtR = 4; 
            } else if (maxR === 3) { 
                if (roll < 95) tgtR = 3;
                else tgtR = 4; 
            }
            if (tgtR > 4) tgtR = 4;

            const targetRank = ['N', 'R', 'SR', 'SSR', 'UR'][tgtR] as any;
            setTargetRankString(targetRank);

            const factionKeys = Object.keys(FACTIONS);
            const elementKeys = Object.keys(ELEMENTS);
            let isMutated = false;

            if (mutationChance > 0 && Math.random() < mutationChance) { 
                isMutated = true;
                if (Math.random() < 0.5) {
                    newFaction = factionKeys[Math.floor(Math.random() * factionKeys.length)] as any;
                } else {
                    newElement = elementKeys[Math.floor(Math.random() * elementKeys.length)] as any;
                }
            } else if (mutationChance === 0) {
                isMutated = true; // mutated from sacrifice card above
            }

            const cardData = await generateFusionFromAI(fusionSlot1, fusionSlot2, targetRank, config);
            cardData.cardClass = targetRank;
            cardData.id = 'CINE-F-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
            cardData.faction = newFaction as any;
            cardData.element = newElement as any;
            cardData.universe = fusionSlot2.universe || 'Unknown';
            
            setCard(cardData);
            setIsLoadingImage(true);
            setUpgradeItem(null); // Reset upgrade item after use

            try {
                const imgUrl = await generateImageFromAi(cardData, config);
                cardData.imageUrl = imgUrl; 
                setCard({ ...cardData });
            } catch(e) {}
            finally {
                setIsLoadingImage(false);
            }

            const oldIds = [fusionSlot1.id, fusionSlot2.id];
            if (upgradeItem && upgradeItem.type === 'card') {
                oldIds.push(upgradeItem.card.id);
            }
            await onCompleteFusion(cardData, oldIds);
            if (isMutated) {
                onAlert("ĐỘT BIẾN GEN", `DNA phát sinh bất thường! Thể mới đạt hệ: ${newFaction} - ${newElement}`);
            } else {
                onAlert("Hệ Thống Cine-Tech", `Lai tạo thành công!<br>Nhận Thẻ hạng <strong>${targetRank}</strong>.<br>${oldIds.length} Thẻ gốc đã bị tiêu hủy.`);
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
                    <img src={c.imageUrl} className="w-full h-[60%] sm:h-[65%] object-cover rounded-xl border border-white/10 opacity-80 mb-2" crossOrigin="anonymous" alt={c.name} />
                    <div className="text-[10px] sm:text-xs text-cinematic-cyan uppercase tracking-widest text-center truncate px-1">{c.name}</div>
                    <div className="text-[8px] sm:text-[10px] text-cinematic-muted text-center font-bold">Class: {c.cardClass} | {getFactionInfo(c.faction).name}</div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); slotNum === 1 ? setFusionSlot1(null) : setFusionSlot2(null); }}
                        className="absolute top-2 right-2 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-red-500/80 text-white/70 hover:text-white border border-white/10 hover:border-red-400/50 transition-all z-20 shadow-lg group"
                    >
                        <i className="fa-solid fa-xmark text-xs sm:text-sm"></i>
                    </button>
                </div>
            );
        }
        return (
            <>
                <i className="fa-solid fa-plus text-3xl sm:text-4xl text-white/20 mb-3 group-hover:text-white/40 transition-colors"></i>
                <p className="text-[9px] sm:text-[10px] text-cinematic-gold tracking-widest uppercase mb-1">{label}</p>
                <p className="text-[7px] sm:text-[8px] text-cinematic-muted tracking-widest uppercase text-center px-2 opacity-70">{desc}</p>
            </>
        );
    };

    const openUpgradeModal = () => {
        setActiveUpgradeTab('item');
        setTempUpgradeId('quantumDust');
        setTempUpgradeAmount(100);
        setTempUpgradeCard(null);
        setShowUpgradeModal(true);
    };

    const confirmUpgradeSelect = () => {
        if (activeUpgradeTab === 'item' && tempUpgradeId) {
            setUpgradeItem({ type: 'item', id: tempUpgradeId, amount: tempUpgradeAmount });
        } else if (activeUpgradeTab === 'card' && tempUpgradeCard) {
            setUpgradeItem({ type: 'card', card: tempUpgradeCard });
        }
        setShowUpgradeModal(false);
    };

    const matsAvailable = Object.keys(inventory.materials || {}).filter(k => (inventory.materials[k] || 0) > 0);
    const availableCardsForSacrifice = cards.filter(c => 
        c.id !== fusionSlot1?.id && 
        c.id !== fusionSlot2?.id &&
        c.id !== 'demo-1' && c.id !== 'demo-2'
    );

    return (
        <div className="w-full flex flex-col items-center animate-fade-in pb-12">
            <div className="w-full max-w-4xl glass-panel rounded-3xl p-6 sm:p-10 mb-8 relative overflow-hidden shadow-2xl border border-cinematic-cyan/20">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #00f3ff 0%, transparent 60%)" }}></div>
                <h2 className="text-center font-serif text-2xl text-white mb-2 tracking-widest relative z-10">GIAO THỨC CHIMERA</h2>
                <div className="text-center mb-10 relative z-10">
                    <p className="text-[10px] text-red-400 uppercase tracking-widest bg-red-900/20 py-1 inline-block px-4 border border-red-900/50 rounded-full mx-auto mb-2"><i className="fa-solid fa-triangle-exclamation mr-2"></i> Thể gốc bị tiêu hủy vĩnh viễn</p>
                    <p className="text-[9px] text-cinematic-cyan/70 tracking-widest uppercase block mt-1">Kết nối hai chuỗi DNA và bổ sung Xúc tác nâng cấp.</p>
                </div>

                <div className="flex flex-col items-center relative z-10">
                    {/* Top Row: The Two Slots */}
                    <div className="flex flex-row items-center justify-center gap-4 sm:gap-12 w-full mb-8">
                        <div onClick={() => onOpenSelector(1)} className={`w-36 h-56 sm:w-56 sm:h-80 fusion-slot rounded-2xl flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden bg-black/40 backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/5 hover:border-cinematic-cyan/30 transition-all ${fusionSlot1 ? 'filled border-cinematic-cyan/50' : ''}`}>
                            {renderSlot(fusionSlot1, 'Alpha (Gen Trội)', 'Faction & Giới tính', 1)}
                        </div>

                        <div className="flex flex-col items-center justify-center relative hidden sm:flex">
                           <i className="fa-solid fa-link text-2xl text-cinematic-cyan/30"></i>
                        </div>

                        <div onClick={() => onOpenSelector(2)} className={`w-36 h-56 sm:w-56 sm:h-80 fusion-slot rounded-2xl flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden bg-black/40 backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/5 hover:border-cinematic-cyan/30 transition-all ${fusionSlot2 ? 'filled border-cinematic-cyan/50' : ''}`}>
                            {renderSlot(fusionSlot2, 'Omega (Gen Lặn)', 'Universe & Thể chất', 2)}
                        </div>
                    </div>

                    {/* Middle Row: The Catalyst Slot */}
                    <div className="relative flex flex-col items-center mb-10">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cinematic-gold/5 blur-[80px] rounded-full pointer-events-none"></div>
                        <div 
                            onClick={openUpgradeModal}
                            className={`w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group p-2 relative bg-black/60 backdrop-blur-md shadow-lg ${(upgradeItem || isGlobalProcessing) ? 'border-cinematic-gold shadow-[0_0_20px_rgba(255,184,0,0.2)]' : 'border-cinematic-gold/30 hover:border-cinematic-gold/70 hover:bg-cinematic-gold/5'}`}
                        >
                            {upgradeItem ? (
                                upgradeItem.type === 'item' ? (
                                    <>
                                        <i className={`fa-solid ${upgradeItem.id === 'quantumDust' ? 'fa-meteor' : 'fa-gem'} text-xl sm:text-3xl text-cinematic-gold mb-1`}></i>
                                        <span className="text-[8px] sm:text-[10px] text-white text-center font-bold tracking-wider uppercase truncate w-full px-1">{upgradeItem.id === 'quantumDust' ? 'Dust' : upgradeItem.id.split(' ')[0]}</span>
                                        <span className="text-[10px] sm:text-xs text-cinematic-gold font-mono font-bold mt-0.5">x{upgradeItem.amount}</span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setUpgradeItem(null); }}
                                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-900 rounded-full text-white text-[10px] flex items-center justify-center border border-red-500 hover:scale-110 shadow-lg z-20"
                                        ><i className="fa-solid fa-xmark"></i></button>
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute inset-0 rounded-full overflow-hidden opacity-60">
                                            <img src={upgradeItem.card.imageUrl} className="w-full h-full object-cover" alt="sacrificed card" crossOrigin="anonymous" />
                                        </div>
                                        <i className="fa-solid fa-skull text-xl sm:text-2xl text-red-500 mb-1 z-10 drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]"></i>
                                        <span className="text-[7px] sm:text-[8px] text-red-300 font-bold uppercase z-10 tracking-widest drop-shadow-[0_0_5px_rgba(0,0,0,0.8)] text-center px-1 truncate w-full">Vật Hiến Tế</span>
                                        <span className="text-[9px] sm:text-[10px] text-cinematic-gold font-bold z-10 drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]">{upgradeItem.card.cardClass}</span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setUpgradeItem(null); }}
                                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-900 rounded-full text-white text-[10px] flex items-center justify-center border border-red-500 hover:scale-110 shadow-lg z-20"
                                        ><i className="fa-solid fa-xmark"></i></button>
                                    </>
                                )
                            ) : (
                                <>
                                    <i className="fa-solid fa-plus text-xl sm:text-2xl text-cinematic-gold/40 group-hover:text-cinematic-gold/80 transition-colors mb-1"></i>
                                    <span className="text-[7px] sm:text-[9px] uppercase tracking-widest text-cinematic-gold/50 group-hover:text-cinematic-gold/80 text-center px-2">Xúc tác</span>
                                    <span className="text-[6px] sm:text-[7px] text-red-500/80 mt-1 uppercase text-center block leading-tight px-1 group-hover:text-red-400">Có thể hiến tế Thẻ</span>
                                </>
                            )}
                        </div>
                        {upgradeItem ? (
                            <div className="absolute -bottom-6 w-max text-[8px] sm:text-[9px] text-cinematic-gold bg-cinematic-gold/10 px-3 py-1 rounded-full border border-cinematic-gold/30 shadow-lg whitespace-nowrap tracking-wider z-10">
                                {upgradeItem.type === 'item' ? 
                                    (upgradeItem.id === 'quantumDust' ? `+${((upgradeItem.amount/100)*10).toFixed(0)} Roll Rank` : `+${(upgradeItem.amount * 5)}% Đột biến`) 
                                : `Hiến Tế: Tăng mạnh cấp thẻ`}
                            </div>
                        ) : (
                            <div className="absolute -bottom-6 w-max text-[8px] sm:text-[9px] text-cinematic-muted tracking-widest uppercase">
                                (Tùy chọn)
                            </div>
                        )}
                    </div>

                    {/* Bottom Row: Info & Execute Button */}
                    <div className="flex flex-col items-center w-full max-w-sm relative">
                        <div className="bg-cinematic-900 border border-cinematic-cyan/30 text-cinematic-cyan text-[10px] sm:text-xs px-4 py-1.5 rounded-full font-bold shadow-lg mb-4 whitespace-nowrap tracking-widest">
                            Phí Lai Tạo: {canFuse ? `${dynamicCost} DC` : 'Tùy cấp độ'}
                        </div>
                        
                        {canFuse && maxR >= 1 && (
                            <div className="text-[9px] text-cinematic-muted uppercase tracking-widest mb-4 flex flex-col items-center gap-1">
                                <span className="flex items-center gap-2"><i className="fa-solid fa-circle-info"></i> Hệ thống sẽ tự động trừ phí Nguyên liệu:</span>
                                {reqCore > 0 && <span className="text-cinematic-cyan">- {reqCore} {coreName}</span>}
                                {reqShard > 0 && <span className="text-cinematic-cyan">- {reqShard} {shardName}</span>}
                                {reqDust > 0 && <span className="text-cinematic-gold border border-cinematic-gold/30 px-2 rounded bg-cinematic-gold/10 mt-0.5">- {reqDust} Quantum Dust</span>}
                            </div>
                        )}

                        <button 
                            onClick={executeFusion} 
                            disabled={!canFuse}
                            className={`w-full max-w-xs bg-cinematic-900 border border-cinematic-cyan/50 text-cinematic-cyan hover:bg-cinematic-cyan/20 py-4 sm:py-5 rounded-2xl font-bold tracking-widest uppercase transition-all duration-300 transform shadow-[0_0_30px_rgba(0,243,255,0.15)] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-3 ${canFuse && !isGlobalProcessing ? 'hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(0,243,255,0.3)]' : ''}`}
                        >
                            <i className={`fa-solid ${isGlobalProcessing ? 'fa-circle-notch fa-spin' : 'fa-dna'} text-xl sm:text-2xl`}></i>
                            <span className="text-sm sm:text-base">{isGlobalProcessing ? `ĐANG XỬ LÝ...` : (canFuse ? 'BẮT ĐẦU CHUỖI LAI TẠO' : 'CHỜ THẺ VẬT LIỆU')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {card && (
                <div className="w-full flex justify-center animate-slide-up mb-12">
                    <FullCard card={card} isModal={false} isLoadingImage={isLoadingImage} isSaved={true} context="fusion" config={config} />
                </div>
            )}

            {/* Catalyst Selector Modal */}
            {showUpgradeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)}></div>
                    <div className="relative z-10 w-full max-w-md bg-cinematic-900 border border-cinematic-gold/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(255,184,0,0.1)] flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-serif text-cinematic-gold tracking-widest uppercase"><i className="fa-solid fa-flask mr-2"></i> Trợ Lực Lai Tạo</h3>
                            <button onClick={() => setShowUpgradeModal(false)} className="text-white/50 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
                        </div>
                        
                        <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
                            <button 
                                onClick={() => setActiveUpgradeTab('item')}
                                className={`flex-1 py-2 text-xs uppercase tracking-widest font-bold rounded-lg transition-colors ${activeUpgradeTab === 'item' ? 'bg-cinematic-gold/20 text-cinematic-gold border border-cinematic-gold/30' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                            ><i className="fa-solid fa-box mr-2"></i>Vật Phẩm</button>
                            <button 
                                onClick={() => setActiveUpgradeTab('card')}
                                className={`flex-1 py-2 text-xs uppercase tracking-widest font-bold rounded-lg transition-colors ${activeUpgradeTab === 'card' ? 'bg-red-900/40 text-red-400 border border-red-500/30' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                            ><i className="fa-solid fa-skull mr-2"></i>Hiến Tế Thẻ</button>
                        </div>

                        {activeUpgradeTab === 'item' && (
                            <>
                                <div className="space-y-4 mb-6 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                                    <label className={`flex flex-row items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${tempUpgradeId === 'quantumDust' ? 'bg-cinematic-gold/10 border-cinematic-gold/50' : 'bg-black/40 border-white/10 hover:border-cinematic-gold/30'}`}>
                                        <input type="radio" name="catalyst" className="hidden" checked={tempUpgradeId === 'quantumDust'} onChange={() => setTempUpgradeId('quantumDust')} />
                                        <div className="w-10 h-10 rounded-full bg-cinematic-gold/20 flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-meteor text-cinematic-gold text-xl"></i>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-white mb-0.5">Quantum Dust</div>
                                            <div className="text-[10px] text-cinematic-gold/80">+Tỉ lệ nhận hạng cao</div>
                                            <div className="text-[10px] text-white/50 mt-1">Đang có: {inventory.quantumDust || 0}</div>
                                        </div>
                                    </label>

                                    {matsAvailable.map(mat => (
                                        <label key={mat} className={`flex flex-row items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${tempUpgradeId === mat ? 'bg-cinematic-gold/10 border-cinematic-gold/50' : 'bg-black/40 border-white/10 hover:border-cinematic-gold/30'}`}>
                                            <input type="radio" name="catalyst" className="hidden" checked={tempUpgradeId === mat} onChange={() => setTempUpgradeId(mat)} />
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                                                <i className="fa-solid fa-gem text-cinematic-cyan text-lg"></i>
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-white mb-0.5">{mat}</div>
                                                <div className="text-[10px] text-cinematic-cyan/80">+Tỉ lệ đột biến Gen</div>
                                                <div className="text-[10px] text-white/50 mt-1">Đang có: {inventory.materials[mat]}</div>
                                            </div>
                                        </label>
                                    ))}
                                    {matsAvailable.length === 0 && (
                                        <div className="text-center p-4 border border-dashed border-white/10 rounded-xl bg-black/20">
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Không có nguyên liệu (Core/Shard) trong kho</p>
                                        </div>
                                    )}
                                </div>

                                {tempUpgradeId && (
                                    <div className="bg-black/40 border border-cinematic-gold/20 p-4 rounded-xl mb-6">
                                        <div className="text-[10px] uppercase text-cinematic-gold tracking-widest mb-3 text-center">Số lượng Xúc tác</div>
                                        <div className="flex items-center justify-center gap-4">
                                            <button 
                                                onClick={() => setTempUpgradeAmount(Math.max(1, tempUpgradeId === 'quantumDust' ? tempUpgradeAmount - 50 : tempUpgradeAmount - 1))}
                                                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center"
                                            ><i className="fa-solid fa-minus"></i></button>
                                            
                                            <div className="w-24 text-center">
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-transparent text-center text-xl font-bold text-white font-mono border-b border-cinematic-gold/30 focus:outline-none focus:border-cinematic-gold pb-1"
                                                    value={tempUpgradeAmount}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const max = tempUpgradeId === 'quantumDust' ? (inventory.quantumDust || 0) : (inventory.materials[tempUpgradeId] || 0);
                                                        setTempUpgradeAmount(Math.min(max, Math.max(0, val)));
                                                    }}
                                                    min={0}
                                                />
                                                <div className="text-[8px] text-white/40 mt-1">Tối đa: {tempUpgradeId === 'quantumDust' ? (inventory.quantumDust || 0) : (inventory.materials[tempUpgradeId] || 0)}</div>
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    const max = tempUpgradeId === 'quantumDust' ? (inventory.quantumDust || 0) : (inventory.materials[tempUpgradeId] || 0);
                                                    setTempUpgradeAmount(Math.min(max, tempUpgradeId === 'quantumDust' ? tempUpgradeAmount + 50 : tempUpgradeAmount + 1));
                                                }}
                                                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center"
                                            ><i className="fa-solid fa-plus"></i></button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {activeUpgradeTab === 'card' && (
                            <div className="flex-1 min-h-0 flex flex-col mb-6">
                                <div className="text-[9px] text-red-400 bg-red-900/20 border border-red-900/50 p-2 rounded-lg mb-4 uppercase tracking-widest text-center leading-relaxed">
                                    <i className="fa-solid fa-triangle-exclamation mr-1"></i> Cảnh Báo: Tiến trình này sẽ tiêu hủy vĩnh viễn Thẻ mục tiêu!<br/>
                                    Thẻ hạng càng cao, phần trăm nhận thẻ UR càng lớn. Có khả năng di truyền Tộc/Hệ cho dạng mới.
                                </div>
                                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                                    {availableCardsForSacrifice.length > 0 ? availableCardsForSacrifice.sort((a,b) => getRankIndex(b.cardClass) - getRankIndex(a.cardClass)).map(c => (
                                        <label key={c.id} className={`flex flex-row items-center gap-4 p-2 rounded-xl border cursor-pointer transition-all ${tempUpgradeCard?.id === c.id ? 'bg-red-900/20 border-red-500/50' : 'bg-black/40 border-white/10 hover:border-red-900/30'}`}>
                                            <input type="radio" name="catalystCard" className="hidden" checked={tempUpgradeCard?.id === c.id} onChange={() => setTempUpgradeCard(c)} />
                                            <img src={c.imageUrl} className="w-12 h-12 rounded object-cover border border-white/10" crossOrigin="anonymous" alt={c.name} />
                                            <div className="flex-1 overflow-hidden">
                                                <div className="text-xs font-bold text-white mb-0.5 truncate">{c.name}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${c.cardClass === 'SSR' ? 'bg-yellow-600/30 text-yellow-500 border border-yellow-600' : c.cardClass === 'SR' ? 'bg-purple-600/30 text-purple-400 border border-purple-600' : 'bg-white/10 text-white/70'}`}>{c.cardClass}</span>
                                                    <span className="text-[10px] text-white/50">{getFactionInfo(c.faction).name} • {c.element}</span>
                                                </div>
                                            </div>
                                        </label>
                                    )) : (
                                        <div className="text-center p-4 border border-dashed border-white/10 rounded-xl bg-black/20">
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Không có thẻ khả dụng để hiến tế</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 mt-auto shrink-0">
                            <button onClick={() => setShowUpgradeModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-colors uppercase tracking-widest text-[10px]">Hủy</button>
                            {activeUpgradeTab === 'item' ? (
                                <button 
                                    onClick={confirmUpgradeSelect} 
                                    disabled={!tempUpgradeId || tempUpgradeAmount <= 0}
                                    className="flex-1 bg-cinematic-gold/90 hover:bg-cinematic-gold text-black py-3 rounded-xl font-bold transition-colors shadow-[0_0_20px_rgba(255,184,0,0.3)] disabled:opacity-50 disabled:shadow-none uppercase tracking-widest text-[10px]"
                                >Kết nối Xúc tác</button>
                            ) : (
                                <button 
                                    onClick={confirmUpgradeSelect} 
                                    disabled={!tempUpgradeCard}
                                    className="flex-1 bg-red-800 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-colors shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:shadow-none uppercase tracking-widest text-[10px]"
                                ><i className="fa-solid fa-fire mr-1"></i> Xác Nhận Hiến Tế</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

