import React, { useState } from 'react';
import { Card, AppConfig } from '../types';
import { FullCard } from '../components/FullCard';
import { getRankIndex } from '../lib/gameLogic';
import { MiniCard } from '../components/MiniCard';

interface Props {
  config: AppConfig;
  currency: number;
  modifyCurrency: (amount: number) => boolean;
  inventory: any;
  cards: Card[];
  modifyInventory: (bd: number, ed: number, m?: Record<string, number>, dd?: number) => void;
  onUpdateCard: (updatedCard: Card, consumedIds?: string[]) => Promise<void>;
  onError: (msg: string) => void;
  onAlert: (t: string, m: string) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (v: boolean) => void;
}

export const OverclockView: React.FC<Props> = ({ config, currency, modifyCurrency, inventory, cards, modifyInventory, onUpdateCard, onError, onAlert, isGlobalProcessing, setGlobalProcessing }) => {
    const [targetSlot, setTargetSlot] = useState<Card | null>(null);
    const [sacrificeSlots, setSacrificeSlots] = useState<(Card | null)[]>([]);
    const [selectorTarget, setSelectorTarget] = useState<{type: 'target' | 'sacrifice', index?: number} | null>(null);

    const getUpgradeCost = (currentLvl: number) => {
        const baseDC = 5000;
        const baseDust = 100;
        return {
            dc: Math.floor(baseDC * Math.pow(2.5, currentLvl)),
            dust: Math.floor(baseDust * Math.pow(2.2, currentLvl))
        };
    };

    const getSuccessRate = (currentLvl: number) => {
        const rates = [100, 80, 60, 40, 20];
        return rates[currentLvl] || 0;
    };

    const getSacrificeReqs = (currentLvl: number): {rank: string}[] => {
        switch(currentLvl) {
            case 0: return [{rank: 'SSR'}];
            case 1: return [{rank: 'SSR'}, {rank: 'SR'}];
            case 2: return [{rank: 'SSR'}, {rank: 'SR'}, {rank: 'SR'}];
            case 3: return [{rank: 'SSR'}, {rank: 'SSR'}, {rank: 'SR'}];
            case 4: return [{rank: 'SSR'}, {rank: 'SSR'}, {rank: 'SR'}, {rank: 'SR'}, {rank: 'SR'}];
            default: return [];
        }
    };

    const currentLvl = targetSlot?.overclockLevel || 0;
    const maxLvl = 5;
    const cost = getUpgradeCost(currentLvl);
    const successRate = getSuccessRate(currentLvl);
    const requiredSacrifices = getSacrificeReqs(currentLvl);
    const isMax = currentLvl >= maxLvl;

    const canOverclock = targetSlot !== null && !isMax && !isGlobalProcessing && sacrificeSlots.length === requiredSacrifices.length && sacrificeSlots.every(s => s !== null);

    const handleSelectCard = (id: string) => {
        const c = cards.find(x => x.id === id);
        if (!c || !selectorTarget) return;
        
        if (selectorTarget.type === 'target') {
            if (c.cardClass !== 'UR') return onError("Chỉ có thể Overclock thẻ hệ UR.");
            setTargetSlot(c);
            setSacrificeSlots(new Array(getSacrificeReqs(c.overclockLevel || 0).length).fill(null));
        } else if (selectorTarget.type === 'sacrifice' && selectorTarget.index !== undefined) {
            const reqRank = requiredSacrifices[selectorTarget.index].rank;
            if (c.cardClass !== reqRank) return onError(`Khe này yêu cầu thẻ hệ ${reqRank}.`);
            if (targetSlot?.id === c.id) return onError("Không thể dùng thẻ mục tiêu làm vật tế.");
            if (sacrificeSlots.some(s => s?.id === c.id)) return onError("Bạn đã chọn thẻ này vào khe khác.");
            const newSlots = [...sacrificeSlots];
            newSlots[selectorTarget.index] = c;
            setSacrificeSlots(newSlots);
        }
        setSelectorTarget(null);
    };

    const executeOverclock = async () => {
        if (!canOverclock || !targetSlot) return;
        
        if (currency < cost.dc) return onError(`Không đủ Data Credits (Yêu cầu ${cost.dc} DC).`);
        if ((inventory.quantumDust || 0) < cost.dust) return onError(`Không đủ ${cost.dust} Quantum Dust.`);

        setGlobalProcessing(true);
        try {
            if (!modifyCurrency(-cost.dc)) {
                setGlobalProcessing(false);
                return onError("Giao dịch Credit bị từ chối.");
            }
            modifyInventory(0, 0, {}, -cost.dust);

            const isSuccess = Math.random() * 100 < successRate;
            const consumedIds = sacrificeSlots.map(s => s!.id);
            
            if (isSuccess) {
                const nextLvl = currentLvl + 1;
                const updatedCard = { ...targetSlot, overclockLevel: nextLvl };
                await onUpdateCard(updatedCard, consumedIds);
                setTargetSlot(updatedCard);
                setSacrificeSlots(new Array(getSacrificeReqs(nextLvl).length).fill(null));
                onAlert("OVERCLOCK THÀNH CÔNG", `Thẻ ${targetSlot.name} đã được cường hóa lên mức +${nextLvl}! Chỉ số tăng thêm 10%.`);
            } else {
                await onUpdateCard(targetSlot, consumedIds);
                setSacrificeSlots(new Array(getSacrificeReqs(currentLvl).length).fill(null));
                onAlert("OVERCLOCK THẤT BẠI", `Các thẻ hiến tế và tài nguyên đã bị phá hủy. Thẻ ${targetSlot.name} được giữ nguyên.`);
            }
            
        } catch (e: any) {
            onError(e.message || "Overclock thất bại");
        } finally {
            setGlobalProcessing(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center mt-4 sm:mt-8">
            <div className="text-center mb-6 sm:mb-8 max-w-lg px-4">
                <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cinematic-cyan uppercase tracking-[0.2em] mb-2 font-mono" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}>
                    QUANTUM OVERCLOCK
                </h1>
                <p className="text-[10px] sm:text-xs text-zinc-400 font-mono">
                    Nâng cấp Tối Thượng (UR). Phá vỡ giới hạn chỉ số bằng Quantum Dust.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6 w-full items-start justify-center">
                <div className="w-full md:w-1/2 flex flex-col items-center">
                    <div className="flex gap-4 mb-4">
                        {/* Target Slot */}
                        <div className="flex flex-col items-center">
                            <div 
                                onClick={() => !isGlobalProcessing && setSelectorTarget({type: 'target'})}
                                className={`w-32 h-44 sm:w-40 sm:h-56 rounded-2xl flex flex-col items-center justify-center cursor-pointer border-2 transition-all relative overflow-hidden ${targetSlot ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)] bg-black/60' : 'border-dashed border-white/20 bg-black/40 hover:bg-black/60 hover:border-cinematic-cyan/50'}`}
                            >
                                {targetSlot ? (
                                    <>
                                        <img src={targetSlot.imageUrl} alt="Core" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                        <div className="absolute bottom-2 left-0 w-full text-center p-2">
                                            <span className="text-white font-bold text-xs bg-black/80 px-2 py-1 rounded truncate block">
                                                {targetSlot.name}
                                            </span>
                                        </div>
                                        {targetSlot.overclockLevel ? (
                                        <div className="absolute top-2 left-2 bg-purple-600 text-white font-black text-xs px-2 py-1 rounded shadow-lg">
                                            +{targetSlot.overclockLevel}
                                        </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <div className="text-center px-2">
                                        <i className="fa-solid fa-microchip text-3xl text-white/20 mb-2"></i>
                                        <p className="text-[8px] text-zinc-400 uppercase tracking-widest">Chọn UR</p>
                                    </div>
                                )}
                            </div>
                            {targetSlot && (
                                <button onClick={() => !isGlobalProcessing && setTargetSlot(null)} className="mt-2 text-[10px] text-red-400 hover:text-red-300 uppercase tracking-widest">
                                    <i className="fa-solid fa-xmark mr-1"></i> Gỡ
                                </button>
                            )}
                        </div>

                         {/* Arrow */}
                         <div className="flex flex-col justify-center items-center px-2">
                            <i className="fa-solid fa-plus text-xl text-zinc-600"></i>
                         </div>

                        {/* Sacrifice Slots */}
                         <div className="flex flex-col items-center justify-center">
                            {targetSlot && !isMax ? (
                                <div className={`grid gap-2 ${requiredSacrifices.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {requiredSacrifices.map((req, idx) => {
                                        const sCard = sacrificeSlots[idx];
                                        return (
                                            <div 
                                                key={idx}
                                                onClick={() => !isGlobalProcessing && setSelectorTarget({type:'sacrifice', index: idx})}
                                                className={`w-20 h-28 sm:w-24 sm:h-32 rounded-xl flex flex-col items-center justify-center cursor-pointer border-2 transition-all relative overflow-hidden ${sCard ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] bg-black/60' : 'border-dashed border-red-500/30 bg-black/40 hover:bg-black/60 hover:border-red-500/50'}`}
                                            >
                                                {sCard ? (
                                                    <>
                                                        <img src={sCard.imageUrl} alt="Sacrifice" className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale-[50%] sepia-[20%] hue-rotate-[-30deg]" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-red-900/60 via-red-900/20 to-transparent"></div>
                                                        <div className="absolute bottom-1 left-0 w-full text-center px-1">
                                                            <span className="text-red-200 font-bold text-[9px] bg-red-950/80 px-1 py-0.5 rounded truncate block">
                                                                {sCard.name}
                                                            </span>
                                                        </div>
                                                        <div className="absolute top-1 right-1 text-red-500 font-black text-[8px] px-1 py-0.5 bg-red-950/80 rounded border border-red-500/50">
                                                            Tế
                                                        </div>
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                if(!isGlobalProcessing) {
                                                                    const newSlots = [...sacrificeSlots];
                                                                    newSlots[idx] = null;
                                                                    setSacrificeSlots(newSlots);
                                                                }
                                                            }} 
                                                            className="absolute top-1 left-1 w-4 h-4 bg-red-900/80 hover:bg-red-700 text-white rounded-full flex items-center justify-center"
                                                        >
                                                            <i className="fa-solid fa-xmark text-[8px]"></i>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="text-center px-1 flex flex-col items-center">
                                                        <i className="fa-solid fa-skull text-xl text-red-500/30 mb-1"></i>
                                                        <p className="text-[8px] text-red-400 uppercase tracking-widest font-bold">{req.rank}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-zinc-500/30 bg-black/40">
                                    <i className="fa-solid fa-lock text-xl text-zinc-600/50 mb-1"></i>
                                    <p className="text-[8px] text-zinc-500 uppercase tracking-widest text-center px-1">Cần Thẻ UR</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-1/2 flex flex-col gap-4">
                    <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                        <h3 className="text-cinematic-cyan font-bold text-sm tracking-widest uppercase mb-4 border-b border-white/10 pb-2 font-mono flex items-center justify-between">
                            <span><i className="fa-solid fa-chart-line mr-2"></i> THÔNG SỐ OVERCLOCK</span>
                            {targetSlot && <span className="text-purple-400 shrink-0 ml-2">Cấp {currentLvl} / {maxLvl}</span>}
                        </h3>
                        <ul className="text-[11px] text-zinc-300 flex flex-col gap-2 font-mono">
                            <li className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-zinc-500">Mục tiêu nâng cấp:</span>
                                <span className="text-purple-400 font-bold">UR (Ultra Rare)</span>
                            </li>
                            {targetSlot && !isMax && (
                                <li className="flex justify-between items-start pt-1">
                                    <span className="text-zinc-500">Thẻ tế yêu cầu:</span>
                                    <div className="flex flex-col items-end gap-1">
                                    {Object.entries(requiredSacrifices.reduce((acc, curr) => {
                                        acc[curr.rank] = (acc[curr.rank] || 0) + 1;
                                        return acc;
                                    }, {} as Record<string, number>)).map(([rank, count]) => (
                                        <span key={rank} className={`font-bold ${rank === 'SSR' ? 'text-cinematic-gold' : 'text-purple-400'} bg-black/40 px-2 py-0.5 rounded border border-white/10`}>
                                            {count}x {rank}
                                        </span>
                                    ))}
                                    </div>
                                </li>
                            )}
                            <li className="flex justify-between">
                                <span className="text-zinc-500">Hiệu ứng:</span>
                                <span className="text-green-400">+10% Tất cả chỉ số cơ bản / Thuộc tính</span>
                            </li>
                             <li className="flex justify-between">
                                <span className="text-zinc-500">Cấp độ hiện tại:</span>
                                <span className="text-white">{currentLvl > 0 ? `+${currentLvl}` : "Chưa nâng cấp"}</span>
                            </li>
                            {targetSlot && !isMax && (
                                <li className="flex justify-between py-2 border-t border-dashed border-white/10 mt-2">
                                    <span className="text-zinc-400">Buff kỳ vọng:</span>
                                    <span className="text-cinematic-cyan font-bold">+{(currentLvl + 1) * 10}% Tổng Chỉ Số</span>
                                </li>
                            )}
                            {targetSlot && !isMax && (
                                <li className="flex justify-between py-2 border-t border-dashed border-red-500/30">
                                    <span className="text-red-400 flex items-center gap-1"><i className="fa-solid fa-skull"></i> Tỷ Lệ Thành Công:</span>
                                    <span className={`font-bold ${successRate >= 80 ? 'text-green-400' : successRate >= 50 ? 'text-yellow-400' : 'text-red-500'}`}>{successRate}%</span>
                                </li>
                            )}
                            {isMax && (
                                <li className="flex justify-center py-2 border-t border-dashed border-white/10 mt-2">
                                    <span className="text-cinematic-gold font-bold uppercase tracking-widest">MAX OVERCLOCK REACHED</span>
                                </li>
                            )}
                        </ul>
                    </div>

                    <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                       <h3 className="text-cinematic-gold font-bold text-sm tracking-widest uppercase mb-4 border-b border-white/10 pb-2 font-mono flex items-center">
                             <i className="fa-solid fa-server mr-2"></i> CHI PHÍ OVERCLOCK
                        </h3>
                        <div className="flex flex-col gap-3 font-mono text-xs">
                            <div className="flex items-center justify-between p-2 bg-black/40 rounded border border-white/5">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-coins text-cinematic-gold"></i>
                                    <span className="text-zinc-300">Data Credit</span>
                                </div>
                                <div className="flex flex-col items-end">
                                   <span className={`font-black ${currency >= cost.dc ? 'text-cinematic-gold' : 'text-red-500'}`}>
                                       {isMax ? '---' : cost.dc.toLocaleString()}
                                   </span>
                                   <span className="text-[9px] text-zinc-600">Đang có: {currency.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-black/40 rounded border border-white/5">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-atom text-cinematic-cyan"></i>
                                    <span className="text-zinc-300">Quantum Dust</span>
                                </div>
                                 <div className="flex flex-col items-end">
                                   <span className={`font-black ${(inventory.quantumDust || 0) >= cost.dust ? 'text-cinematic-cyan' : 'text-red-500'}`}>
                                        {isMax ? '---' : cost.dust.toLocaleString()}
                                   </span>
                                   <span className="text-[9px] text-zinc-600">Đang có: {(inventory.quantumDust || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                         onClick={executeOverclock}
                         disabled={!canOverclock || isMax}
                         className={`mt-4 w-full py-4 rounded-xl font-black tracking-[0.3em] uppercase text-sm border-2 transition-all flex items-center justify-center gap-2 relative overflow-hidden ${!canOverclock || isMax ? 'bg-zinc-900 border-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-purple-900/60 border-purple-500 text-white hover:bg-purple-800 hover:shadow-[0_0_20px_#a855f7]'}`}
                     >
                         {isGlobalProcessing ? (
                             <><i className="fa-solid fa-circle-notch fa-spin text-purple-400"></i> OVERCLOCKING...</>
                         ) : isMax ? (
                             <><i className="fa-solid fa-lock text-cinematic-gold"></i> MAX LEVEL</>
                         ) : (
                             <><i className="fa-solid fa-bolt text-purple-400"></i> KHỞI ĐỘNG OVERCLOCK</>
                         )}
                         {!canOverclock && !isMax && !isGlobalProcessing && <div className="absolute inset-0 bg-black/50"></div>}
                     </button>
                </div>
            </div>

             {selectorTarget && (
                <div className="fixed inset-0 z-[200] bg-zinc-950/90 backdrop-blur-3xl flex flex-col p-4 sm:p-8 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6 max-w-5xl mx-auto w-full">
                        <h2 className="text-white font-bold text-lg uppercase tracking-widest">
                             {selectorTarget.type === 'target' ? 'Chọn Thẻ UR (MỤC TIÊU)' : `Chọn Thẻ Tế (${selectorTarget.index !== undefined ? requiredSacrifices[selectorTarget.index].rank : 'SSR/SR'})`}
                        </h2>
                        <button onClick={() => setSelectorTarget(null)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto w-full pb-20">
                        {cards.filter(c => selectorTarget.type === 'target' ? c.cardClass === 'UR' : (selectorTarget.index !== undefined ? c.cardClass === requiredSacrifices[selectorTarget.index].rank : false)).map(c => (
                            <div key={c.id} onClick={() => handleSelectCard(c.id)} className={`cursor-pointer transform hover:scale-105 transition-transform ${targetSlot?.id === c.id || sacrificeSlots.some(s => s?.id === c.id) ? 'opacity-50 pointer-events-none' : ''}`}>
                                <MiniCard card={c} />
                            </div>
                        ))}
                        {cards.filter(c => selectorTarget.type === 'target' ? c.cardClass === 'UR' : (selectorTarget.index !== undefined ? c.cardClass === requiredSacrifices[selectorTarget.index].rank : false)).length === 0 && (
                            <div className="col-span-full py-12 text-center text-zinc-500 font-mono">
                                Không tìm thấy thẻ {selectorTarget.type === 'target' ? 'UR' : (selectorTarget.index !== undefined ? requiredSacrifices[selectorTarget.index].rank : '')} nào phù hợp.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
