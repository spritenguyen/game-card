import React, { useState } from 'react';
import { Card, AppConfig } from '../types';
import { FullCard } from '../components/FullCard';
import { getRankIndex } from '../lib/gameLogic';
import { MiniCard } from '../components/MiniCard';

interface Props {
  config: AppConfig;
  currency: number;
  modifyCurrency: (amount: number) => void;
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
            if (currency < cost.dc) {
                setGlobalProcessing(false);
                return onError("Giao dịch Credit bị từ chối. Không đủ Data Credits.");
            }
            modifyCurrency(-cost.dc);
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
        <div className="w-full flex flex-col items-center animate-fade-in pb-12">
            <div className="w-full max-w-5xl bg-cinematic-900/40 border border-white/5 ring-1 ring-white/5 backdrop-blur-md rounded-3xl p-6 sm:p-10 mb-8 relative overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.5),0_0_40px_rgba(192,132,252,0.05)]">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #c084fc 0%, transparent 60%)" }}></div>
                
            <div className="text-center mb-10 max-w-2xl mx-auto relative z-10">
                <h1 className="text-2xl sm:text-4xl font-serif text-transparent bg-clip-text bg-gradient-to-br from-white via-purple-300 to-purple-500 uppercase tracking-[0.3em] mb-4">
                    <i className="fa-solid fa-bolt mr-3 text-purple-400"></i>QUANTUM OVERCLOCK
                </h1>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono tracking-widest uppercase">
                    Breach rarity limits with Quantum Dust
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 lg:gap-12 w-full items-start justify-center relative z-10">
                <div className="w-full md:w-1/2 flex flex-col items-center">
                    <div className="flex flex-col gap-6 w-full items-center">
                        {/* Target Slot, made larger and more prominent */}
                        <div className="flex flex-col items-center">
                            <div 
                                onClick={() => !isGlobalProcessing && setSelectorTarget({type: 'target'})}
                                className={`w-40 h-56 sm:w-48 sm:h-72 rounded-2xl flex flex-col items-center justify-center cursor-pointer border ring-1 transition-all relative overflow-hidden 
                                    ${targetSlot 
                                        ? 'border-purple-500/50 ring-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.2)] bg-black' 
                                        : 'border-white/10 ring-white/5 border-dashed bg-black/60 hover:bg-cinematic-900/40 hover:border-purple-500/50 hover:ring-purple-500/20'}`}
                            >
                                {targetSlot ? (
                                    <>
                                        <img src={targetSlot.imageUrl} alt="Core" className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none"></div>
                                        <div className="absolute bottom-3 left-0 w-full text-center px-2">
                                            <span className="text-white font-serif tracking-widest text-sm bg-black/60 border border-white/10 px-3 py-1 rounded-sm uppercase inline-block max-w-[90%] truncate backdrop-blur-md">
                                                {targetSlot.name}
                                            </span>
                                        </div>
                                        {targetSlot.overclockLevel ? (
                                        <div className="absolute top-3 left-3 bg-gradient-to-br from-purple-500 to-purple-800 text-white font-mono tracking-widest uppercase text-[10px] px-2.5 py-1 rounded-sm border border-purple-400/50 shadow-lg">
                                            +{targetSlot.overclockLevel}
                                        </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <div className="text-center px-4 flex flex-col items-center">
                                        <i className="fa-solid fa-microchip text-4xl sm:text-5xl text-zinc-700 mb-4"></i>
                                        <p className="text-[10px] sm:text-xs text-zinc-500 uppercase font-mono tracking-[0.2em]">Select UR Node</p>
                                    </div>
                                )}
                            </div>
                            {targetSlot && (
                                <button onClick={() => !isGlobalProcessing && setTargetSlot(null)} className="mt-4 text-[9px] sm:text-[10px] bg-red-950/30 text-red-400 border border-red-900/50 px-4 py-1.5 rounded-full hover:bg-red-900 hover:text-white transition-all uppercase font-mono tracking-widest flex items-center shadow-lg">
                                    <i className="fa-solid fa-xmark mr-2"></i> Unlink
                                </button>
                            )}
                        </div>

                         {/* Arrow */}
                         <div className="flex justify-center items-center py-2 h-10 w-full relative">
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/5"></div>
                            <div className="bg-black border border-white/10 rounded-full w-8 h-8 flex items-center justify-center relative z-10 shadow-lg">
                                <i className="fa-solid fa-plus text-sm text-zinc-500"></i>
                            </div>
                         </div>

                        {/* Sacrifice Slots */}
                         <div className="w-full flex justify-center">
                            {targetSlot && !isMax ? (
                                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-[400px]">
                                    {requiredSacrifices.map((req, idx) => {
                                        const sCard = sacrificeSlots[idx];
                                        return (
                                            <div 
                                                key={idx}
                                                onClick={() => !isGlobalProcessing && setSelectorTarget({type:'sacrifice', index: idx})}
                                                className={`w-20 h-28 sm:w-24 sm:h-36 rounded-xl flex flex-col items-center justify-center cursor-pointer border ring-1 transition-all relative overflow-hidden shrink-0
                                                    ${sCard 
                                                        ? 'border-red-500/50 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] bg-black' 
                                                        : 'border-white/5 ring-white/5 border-dashed bg-black/40 hover:bg-cinematic-900/40 hover:border-red-500/30'}`}
                                            >
                                                {sCard ? (
                                                    <>
                                                        <img src={sCard.imageUrl} alt="Sacrifice" className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale-[80%] sepia-[30%] hue-rotate-[-30deg] mix-blend-luminosity" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-red-950/80 via-red-900/20 to-transparent"></div>
                                                        <div className="absolute inset-0 ring-1 ring-inset ring-red-500/20 rounded-xl pointer-events-none"></div>
                                                        <div className="absolute bottom-2 w-full text-center px-1">
                                                            <span className="text-red-200 font-mono tracking-widest text-[8px] bg-black/80 border border-red-900/50 px-1 py-0.5 rounded-sm block w-[90%] mx-auto truncate">
                                                                {sCard.name}
                                                            </span>
                                                        </div>
                                                        <div className="absolute top-1 right-1 text-red-500 font-mono tracking-widest uppercase text-[7px] px-1.5 py-0.5 bg-black/80 rounded-sm border border-red-900/50">
                                                            S-R
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
                                                            className="absolute top-1 left-1 w-5 h-5 bg-black/80 border border-white/10 hover:border-red-500 hover:text-red-500 text-zinc-400 rounded-sm flex items-center justify-center transition-colors shadow-lg"
                                                        >
                                                            <i className="fa-solid fa-xmark text-[8px]"></i>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="text-center px-1 flex flex-col items-center">
                                                        <i className="fa-solid fa-skull text-xl sm:text-2xl text-zinc-800 mb-2"></i>
                                                        <p className="text-[7px] sm:text-[8px] text-zinc-500 uppercase tracking-[0.2em] font-mono font-bold">REQ: {req.rank}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="w-full max-w-[280px] h-28 sm:h-36 rounded-xl flex flex-col items-center justify-center border border-dashed border-white/5 ring-1 ring-white/5 bg-black/30">
                                    <i className="fa-solid fa-lock text-2xl text-zinc-800 mb-3"></i>
                                    <p className="text-[9px] sm:text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-mono text-center px-4">Insert UR Node First</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-1/2 flex flex-col gap-5 sm:gap-6">
                    <div className="bg-black/60 border border-white/5 ring-1 ring-white/5 rounded-2xl p-5 sm:p-6 shadow-inner relative overflow-hidden backdrop-blur-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03]"><i className="fa-solid fa-chart-line text-8xl"></i></div>
                        <h3 className="text-white text-xs sm:text-sm font-serif tracking-[0.2em] uppercase mb-5 border-b border-white/5 pb-3 flex items-center justify-between">
                            <span><i className="fa-solid fa-microchip text-purple-400 mr-2"></i> Metrics</span>
                            {targetSlot && <span className="text-purple-400 font-mono text-[10px] bg-purple-500/10 px-2 py-0.5 rounded-sm border border-purple-500/20">Lvl {currentLvl} / {maxLvl}</span>}
                        </h3>
                        <ul className="text-[10px] sm:text-xs text-zinc-400 flex flex-col gap-3 font-mono tracking-widest relative z-10 w-full">
                            <li className="flex justify-between items-center w-full bg-white/5 p-2 rounded-lg border border-white/5">
                                <span className="text-zinc-500 uppercase">Target Node</span>
                                <span className="text-purple-400 font-bold uppercase">UR Protocol</span>
                            </li>
                            {targetSlot && !isMax && (
                                <li className="flex justify-between items-start w-full bg-white/5 p-2 rounded-lg border border-white/5">
                                    <span className="text-zinc-500 uppercase pt-0.5">Sacrifice Reqs</span>
                                    <div className="flex flex-col items-end gap-1.5 border-l border-white/5 pl-2">
                                    {Object.entries(requiredSacrifices.reduce((acc, curr) => {
                                        acc[curr.rank] = (acc[curr.rank] || 0) + 1;
                                        return acc;
                                    }, {} as Record<string, number>)).map(([rank, count]) => (
                                        <span key={rank} className={`font-bold ${rank === 'SSR' ? 'text-cinematic-gold' : 'text-purple-400'} flex items-center gap-1.5`}>
                                            <span className="text-zinc-600">x{count}</span> {rank}
                                        </span>
                                    ))}
                                    </div>
                                </li>
                            )}
                            <li className="flex justify-between items-center w-full bg-white/5 p-2 rounded-lg border border-white/5">
                                <span className="text-zinc-500 uppercase">Yield</span>
                                <span className="text-green-400 font-bold">+10% Base Stats</span>
                            </li>
                             <li className="flex justify-between items-center w-full bg-white/5 p-2 rounded-lg border border-white/5">
                                <span className="text-zinc-500 uppercase">Current Lvl</span>
                                <span className="text-white">{currentLvl > 0 ? `+${currentLvl}` : "Baseline"}</span>
                            </li>
                            {targetSlot && !isMax && (
                                <li className="flex justify-between items-center w-full bg-cinematic-cyan/5 p-2 rounded-lg border border-cinematic-cyan/10 mt-2">
                                    <span className="text-cinematic-cyan uppercase">Est. Output</span>
                                    <span className="text-cinematic-cyan font-bold">+{(currentLvl + 1) * 10}% Total</span>
                                </li>
                            )}
                            {targetSlot && !isMax && (
                                <li className="flex justify-between items-center w-full bg-red-950/20 p-2 rounded-lg border border-red-900/30">
                                    <span className="text-red-400 flex items-center gap-1.5 uppercase"><i className="fa-solid fa-biohazard"></i> Success Rate</span>
                                    <span className={`font-bold text-sm ${successRate >= 80 ? 'text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : successRate >= 50 ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]'}`}>{successRate}%</span>
                                </li>
                            )}
                            {isMax && (
                                <li className="flex justify-center items-center w-full bg-cinematic-gold/10 p-3 rounded-lg border border-cinematic-gold/20 mt-2">
                                    <span className="text-cinematic-gold font-bold uppercase tracking-[0.3em]">MAXIMUM PROTOCOL</span>
                                </li>
                            )}
                        </ul>
                    </div>

                    <div className="bg-black/60 border border-white/5 ring-1 ring-white/5 rounded-2xl p-5 sm:p-6 shadow-inner relative overflow-hidden backdrop-blur-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03]"><i className="fa-solid fa-server text-8xl"></i></div>
                       <h3 className="text-white text-xs sm:text-sm font-serif tracking-[0.2em] uppercase mb-4 border-b border-white/5 pb-3 flex items-center">
                             <i className="fa-solid fa-coins text-cinematic-gold mr-2"></i> Resource Demand
                        </h3>
                        <div className="flex flex-col gap-3 font-mono text-[10px] sm:text-xs tracking-widest relative z-10 w-full">
                            <div className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5 hover:border-cinematic-gold/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-cinematic-gold/10 flex items-center justify-center border border-cinematic-gold/20 text-cinematic-gold">
                                        <i className="fa-solid fa-coins"></i>
                                    </div>
                                    <span className="text-zinc-400 uppercase">Data Credit</span>
                                </div>
                                <div className="flex flex-col items-end">
                                   <span className={`font-bold text-sm ${currency >= cost.dc ? 'text-cinematic-gold' : 'text-red-500'}`}>
                                       {isMax ? '---' : cost.dc.toLocaleString()}
                                   </span>
                                   <span className="text-[8px] sm:text-[9px] text-zinc-600 mt-1">Avail: {currency.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5 hover:border-cinematic-cyan/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-cinematic-cyan/10 flex items-center justify-center border border-cinematic-cyan/20 text-cinematic-cyan">
                                        <i className="fa-solid fa-atom"></i>
                                    </div>
                                    <span className="text-zinc-400 uppercase">Quantum Dust</span>
                                </div>
                                 <div className="flex flex-col items-end">
                                   <span className={`font-bold text-sm ${(inventory.quantumDust || 0) >= cost.dust ? 'text-cinematic-cyan' : 'text-red-500'}`}>
                                        {isMax ? '---' : cost.dust.toLocaleString()}
                                   </span>
                                   <span className="text-[8px] sm:text-[9px] text-zinc-600 mt-1">Avail: {(inventory.quantumDust || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                         onClick={executeOverclock}
                         disabled={!canOverclock || isMax}
                         className={`mt-2 w-full py-4 sm:py-5 rounded-2xl font-bold font-mono tracking-[0.3em] uppercase text-[10px] sm:text-xs transition-all flex items-center justify-center gap-3 relative overflow-hidden group 
                             ${!canOverclock || isMax 
                                 ? 'bg-zinc-950 border border-white/5 text-zinc-600 cursor-not-allowed' 
                                 : 'bg-purple-900/20 border border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-black hover:border-purple-400 shadow-[inset_0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]'}`}
                     >
                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay"></div>
                         {isGlobalProcessing ? (
                             <><i className="fa-solid fa-circle-notch fa-spin text-xl"></i> INITIALIZING OVERCLOCK...</>
                         ) : isMax ? (
                             <><i className="fa-solid fa-lock text-xl opacity-50"></i> MAX PROTOCOL REACHED</>
                         ) : (
                             <><i className="fa-solid fa-bolt text-xl group-hover:scale-125 transition-transform"></i> INITIALIZE OVERCLOCK</>
                         )}
                     </button>
                </div>
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
