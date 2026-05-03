import React, { useState } from 'react';
import { Card, AppConfig } from '../types';
import { generateAltTextFromAI } from '../services/ai';

interface Props {
  currency: number;
  inventory: any;
  cards: Card[];
  modifyCurrency: (amount: number) => boolean;
  modifyInventory: (baseDiff: number, eliteDiff: number, mats?: Record<string, number>, dustDiff?: number) => void;
  updateCard: (card: Card) => Promise<void>;
  onAlert: (t: string, m: string) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (v: boolean) => void;
  config: AppConfig;
}

export const BlackMarketView: React.FC<Props> = ({ currency, inventory, cards, modifyCurrency, modifyInventory, updateCard, onAlert, isGlobalProcessing, setGlobalProcessing, config }) => {
    const [subTab, setSubTab] = useState<'shop' | 'reroll'>('shop');
    const [selectedCardId, setSelectedCardId] = useState<string>('');
    const [selectedAttribute, setSelectedAttribute] = useState<'faction' | 'element'>('faction');

    const handleExchange = (type: 'buyBase' | 'buyElite' | 'sellCore' | 'sellShard', item?: string) => {
        if (isGlobalProcessing) return;

        if (type === 'buyBase') {
            if (inventory.quantumDust >= 100) {
                modifyInventory(1, 0, undefined, -100);
                onAlert('Thành công', 'Đã mua 1 Vé Trích Xuất Cơ Bản');
            } else if (currency >= 1000) {
                 modifyCurrency(-1000);
                 modifyInventory(1, 0);
                 onAlert('Thành công', 'Đã mua 1 Vé Trích Xuất Cơ Bản');
            } else {
                onAlert('Thất bại', 'Không đủ tài nguyên!');
            }
        }

        if (type === 'buyElite') {
            if (inventory.quantumDust >= 500) {
                modifyInventory(0, 1, undefined, -500);
                onAlert('Thành công', 'Đã mua 1 Vé Trích Xuất Chuyên Sâu');
            } else {
                 onAlert('Thất bại', 'Không đủ Quantum Dust!');
            }
        }

        if (type === 'sellCore' && item) {
            if (inventory.materials && inventory.materials[item] >= 1) {
                modifyInventory(0, 0, { [item]: -1 }, 50);
                onAlert('Thành công', 'Đã bán 1 Core đổi lấy 50 Quantum Dust');
            } else {
                onAlert('Thất bại', 'Không đủ vật phẩm!');
            }
        }

        if (type === 'sellShard' && item) {
            if (inventory.materials && inventory.materials[item] >= 1) {
                modifyInventory(0, 0, { [item]: -1 }, 15);
                onAlert('Thành công', 'Đã bán 1 Shard đổi lấy 15 Quantum Dust');
            } else {
                onAlert('Thất bại', 'Không đủ vật phẩm!');
            }
        }
    };

    const handleReroll = async () => {
        if (!selectedCardId) return onAlert('Lỗi', 'Vui lòng chọn thẻ!');
        const card = cards.find(c => c.id === selectedCardId);
        if (!card) return;

        if (inventory.quantumDust < 100) return onAlert('Lỗi', 'Cần 100 Quantum Dust để thực hiện!');

        let requiredMat = '';
        if (selectedAttribute === 'faction') {
            requiredMat = `${card.faction} Core`;
        } else {
            requiredMat = `${card.element} Shard`;
        }

        if (!inventory.materials || (inventory.materials[requiredMat] || 0) < 1) {
            return onAlert('Lỗi', `Cần 1 ${requiredMat} để tái tạo hệ này!`);
        }

        setGlobalProcessing(true);
        try {
            modifyInventory(0, 0, { [requiredMat]: -1 }, -100);

            let newFaction = card.faction;
            let newElement = card.element;

            const factionOptions = ['Human', 'Machine', 'Mutant', 'Spirit', 'Alien', 'Demon', 'Celestial', 'Undead', 'Unknown'];
            const elementOptions = ['Neutral', 'Fire', 'Water', 'Earth', 'Wind', 'Light', 'Dark', 'Electro', 'Cosmic'];

            if (selectedAttribute === 'faction') {
                const available = factionOptions.filter(f => f !== card.faction);
                newFaction = available[Math.floor(Math.random() * available.length)] as any;
            } else {
                const available = elementOptions.filter(e => e !== card.element);
                newElement = available[Math.floor(Math.random() * available.length)] as any;
            }

            const updatedCard = { ...card, faction: newFaction, element: newElement };
            await updateCard(updatedCard);
            onAlert('Thành công', `Cấu trúc gen đã thay đổi: Tộc ${newFaction} - Hệ ${newElement}!`);

        } catch(e) {
            onAlert('Lỗi', 'Có lỗi khi tái tạo: ' + e);
        } finally {
            setGlobalProcessing(false);
        }
    };

    return (
        <div className="w-full flex justify-center pb-12 animate-fade-in">
            <div className="w-full max-w-5xl flex flex-col gap-6 mt-6 px-4">
                
                {/* Header Tabs */}
                <div className="flex gap-2 sm:gap-6 border-b border-white/5 pb-0 mb-4 px-2">
                    <button onClick={() => setSubTab('shop')} className={`text-[10px] sm:text-xs tracking-[0.2em] font-mono uppercase px-4 py-3 sm:py-4 transition-all relative ${subTab==='shop'?'text-cinematic-cyan':'text-zinc-500 hover:text-zinc-300'}`}>
                        <i className="fa-solid fa-store mr-2"></i> Black Market
                        {subTab === 'shop' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cinematic-cyan shadow-[0_0_10px_rgba(0,243,255,0.5)]"></div>}
                    </button>
                    <button onClick={() => setSubTab('reroll')} className={`text-[10px] sm:text-xs tracking-[0.2em] font-mono uppercase px-4 py-3 sm:py-4 transition-all relative ${subTab==='reroll'?'text-purple-400':'text-zinc-500 hover:text-zinc-300'}`}>
                        <i className="fa-solid fa-dna mr-2"></i> Gene Restructure
                        {subTab === 'reroll' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]"></div>}
                    </button>
                </div>

                {subTab === 'shop' && (
                    <div className="bg-cinematic-900/40 border border-white/5 rounded-3xl p-6 sm:p-10 shadow-[inset_0_0_80px_rgba(0,0,0,0.5),0_0_40px_rgba(0,243,255,0.05)] relative backdrop-blur-md ring-1 ring-white/5">
                        <div className="flex flex-col items-center mb-8 pb-6 border-b border-white/5 relative">
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-[1px] bg-cinematic-cyan/20"></div>
                             <h3 className="text-white text-lg sm:text-xl font-serif uppercase tracking-[0.3em] bg-black px-6 relative z-10 border border-white/10 rounded-full py-2 shadow-lg w-max mx-auto">Black Market Exchange</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                            <div className="space-y-4">
                                <h4 className="text-cinematic-gold text-[10px] sm:text-xs font-mono uppercase border-b border-cinematic-gold/20 pb-2 tracking-[0.2em] flex items-center gap-2"><i className="fa-solid fa-cart-shopping"></i> Purchase Order</h4>
                                
                                <div className="flex justify-between items-center bg-black/60 p-4 rounded-xl border border-white/5 ring-1 ring-white/5 hover:bg-cinematic-900/60 transition-all shadow-inner">
                                    <div>
                                        <div className="font-bold text-sm sm:text-base text-white tracking-widest uppercase font-serif">Base Ticket</div>
                                        <div className="text-[9px] sm:text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">100 Dust / 1000 DC</div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button onClick={() => handleExchange('buyBase')} className="px-4 py-2 bg-amber-600/10 text-amber-500 border border-amber-600/30 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-widest uppercase hover:bg-amber-600 hover:text-black transition-all">100 Dust</button>
                                        <button onClick={() => handleExchange('buyBase')} className="px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-600/30 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-widest uppercase hover:bg-blue-600 hover:text-black transition-all">1000 DC</button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center bg-black/60 p-4 rounded-xl border border-white/5 ring-1 ring-white/5 hover:bg-cinematic-900/60 transition-all shadow-inner">
                                    <div>
                                        <div className="font-bold text-sm sm:text-base text-purple-400 tracking-widest uppercase font-serif">Elite Ticket</div>
                                        <div className="text-[9px] sm:text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">500 Dust</div>
                                    </div>
                                    <button onClick={() => handleExchange('buyElite')} className="px-4 py-2 bg-amber-600/10 text-amber-500 border border-amber-600/30 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-widest uppercase hover:bg-amber-600 hover:text-black transition-all">500 Dust</button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-purple-400 text-[10px] sm:text-xs font-mono uppercase border-b border-purple-500/20 pb-2 tracking-[0.2em] flex items-center gap-2"><i className="fa-solid fa-atom"></i> Quantum Release (Sell)</h4>
                                <div className="max-h-[300px] overflow-y-auto no-scrollbar pr-2 space-y-3">
                                    {Object.entries(inventory.materials || {}).filter(([k,v]) => Number(v) > 0).map(([item, amount]) => {
                                        const isCore = item.includes('Core');
                                        return (
                                            <div key={item} className="flex justify-between items-center bg-black/60 p-4 rounded-xl border border-white/5 ring-1 ring-white/5 hover:bg-cinematic-900/60 transition-all shadow-inner">
                                                <div>
                                                    <div className="font-bold text-sm text-white font-mono uppercase tracking-widest">{item} <span className="text-zinc-600 text-[10px] ml-1">x{String(amount)}</span></div>
                                                    <div className="text-[9px] sm:text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">Yield: {isCore ? '50 Dust' : '15 Dust'}</div>
                                                </div>
                                                <button onClick={() => handleExchange(isCore ? 'sellCore' : 'sellShard', item)} className="px-4 py-2 bg-zinc-900 text-amber-400 border border-amber-500/30 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-widest uppercase hover:bg-amber-500 hover:text-black transition-all">Sell 1</button>
                                            </div>
                                        )
                                    })}
                                    {Object.keys(inventory.materials || {}).length === 0 && (
                                        <div className="text-[10px] sm:text-xs text-zinc-600 font-mono text-center py-8 uppercase tracking-[0.2em] border border-white/5 border-dashed rounded-xl">Vault is empty.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {subTab === 'reroll' && (
                    <div className="bg-cinematic-900/40 border border-purple-500/10 rounded-3xl p-6 sm:p-10 shadow-[inset_0_0_80px_rgba(0,0,0,0.5),0_0_40px_rgba(192,132,252,0.05)] relative backdrop-blur-md ring-1 ring-purple-500/20">
                         <div className="flex flex-col items-center mb-8 pb-6 border-b border-white/5 relative">
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-[1px] bg-purple-500/30"></div>
                              <h3 className="text-purple-400 text-lg sm:text-xl font-serif uppercase tracking-[0.3em] bg-black px-6 relative z-10 border border-white/10 rounded-full py-2 shadow-lg w-max mx-auto">Gene Restructure</h3>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                             <div className="space-y-5">
                                 <div>
                                     <label className="block text-[9px] sm:text-[10px] font-mono uppercase text-zinc-500 mb-2 tracking-[0.2em]">Select Operative</label>
                                     <div className="relative">
                                         <i className="fa-solid fa-users absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500"></i>
                                         <select 
                                            className="w-full bg-black/80 border border-white/10 text-white rounded-xl py-3 pl-10 pr-4 text-xs font-mono tracking-widest uppercase focus:border-purple-500/50 outline-none appearance-none"
                                            value={selectedCardId}
                                            onChange={(e) => setSelectedCardId(e.target.value)}
                                            disabled={isGlobalProcessing}
                                         >
                                             <option value="">-- Select Target --</option>
                                             {cards.map(c => (
                                                 <option key={c.id} value={c.id}>{c.name} ({c.faction} - {c.element})</option>
                                             ))}
                                         </select>
                                         <i className="fa-solid fa-caret-down absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500"></i>
                                     </div>
                                 </div>

                                 <div>
                                     <label className="block text-[9px] sm:text-[10px] font-mono uppercase text-zinc-500 mb-2 tracking-[0.2em]">Mutation Protocol</label>
                                     <div className="relative">
                                         <i className="fa-solid fa-code-merge absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500"></i>
                                         <select 
                                            className="w-full bg-black/80 border border-white/10 text-white rounded-xl py-3 pl-10 pr-4 text-xs font-mono tracking-widest uppercase focus:border-purple-500/50 outline-none appearance-none"
                                            value={selectedAttribute}
                                            onChange={(e) => setSelectedAttribute(e.target.value as any)}
                                            disabled={isGlobalProcessing}
                                         >
                                             <option value="faction">Reroll Faction (Tộc/Hệ)</option>
                                             <option value="element">Reroll Element (Nguyên Tố)</option>
                                         </select>
                                         <i className="fa-solid fa-caret-down absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500"></i>
                                     </div>
                                 </div>

                                 {selectedCardId && (
                                     <div className="bg-black/60 p-4 rounded-xl border border-purple-500/20 mt-4 shadow-inner ring-1 ring-white/5">
                                         <h4 className="text-[10px] font-mono text-purple-400 mb-3 tracking-[0.2em] uppercase">Resource Cost</h4>
                                         <ul className="text-xs font-mono uppercase tracking-widest space-y-3">
                                            <li className="flex justify-between items-center border-b border-white/5 pb-2">
                                                <span className="text-zinc-500">Quantum Dust</span>
                                                <span className={inventory.quantumDust >= 100 ? 'text-amber-400' : 'text-red-400'}>100 / {inventory.quantumDust}</span>
                                            </li>
                                            <li className="flex justify-between items-center pt-1">
                                                <span className="text-zinc-500">Base Catalyst</span>
                                                {(() => {
                                                    const card = cards.find(c => c.id === selectedCardId);
                                                    if (!card) return null;
                                                    const reqMat = selectedAttribute === 'faction' ? `${card.faction} Core` : `${card.element} Shard`;
                                                    const owned = (inventory.materials || {})[reqMat] || 0;
                                                    return <span className={owned >= 1 ? 'text-green-400' : 'text-red-400'}>1x {reqMat} (Qty: {(inventory.materials || {})[reqMat] || 0})</span>
                                                })()}
                                            </li>
                                         </ul>
                                     </div>
                                 )}

                                 <button 
                                     onClick={handleReroll}
                                     disabled={isGlobalProcessing || !selectedCardId}
                                     className="w-full mt-4 bg-purple-600/10 hover:bg-purple-500 border border-purple-500/50 hover:border-purple-400 text-purple-400 hover:text-black font-bold tracking-[0.3em] font-mono text-[10px] sm:text-xs py-4 rounded-xl disabled:opacity-40 disabled:hover:bg-purple-600/10 disabled:hover:text-purple-400 transition-all uppercase relative overflow-hidden shadow-[inset_0_0_20px_rgba(192,132,252,0.2)]"
                                 >
                                     {isGlobalProcessing ? <i className="fa-solid fa-compact-disc animate-spin text-xl"></i> : 'Initialize Mutation'}
                                 </button>
                             </div>

                             <div className="flex items-center justify-center sm:border-l border-white/5 sm:pl-10 mt-6 sm:mt-0 pt-6 sm:pt-0 border-t sm:border-t-0">
                                 {selectedCardId ? (
                                    <div className="text-center w-full bg-black/40 p-8 rounded-2xl border border-white/5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5"><i className="fa-solid fa-microscope text-6xl"></i></div>
                                        <div className="text-[9px] sm:text-[10px] text-zinc-500 font-mono mb-2 uppercase tracking-[0.3em]">Target Anomaly</div>
                                        <div className="text-xl sm:text-3xl text-white font-serif tracking-widest uppercase mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500">{cards.find(c => c.id === selectedCardId)?.name}</div>
                                        <div className="flex flex-col gap-2 justify-center items-center font-mono text-[10px] uppercase tracking-widest">
                                            <div className="w-full flex justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                                               <span className="text-zinc-500">Faction</span>
                                               <span className="text-zinc-300 font-bold">{cards.find(c => c.id === selectedCardId)?.faction}</span>
                                            </div>
                                            <div className="w-full flex justify-between bg-cinematic-cyan/5 p-2 rounded-lg border border-cinematic-cyan/10">
                                               <span className="text-zinc-500">Element</span>
                                               <span className="text-cinematic-cyan font-bold">{cards.find(c => c.id === selectedCardId)?.element}</span>
                                            </div>
                                        </div>
                                    </div>
                                 ) : (
                                     <div className="text-zinc-800 font-mono text-center flex flex-col items-center justify-center gap-4 w-full h-[300px] border border-white/5 border-dashed rounded-2xl bg-black/30">
                                         <i className="fa-solid fa-dna text-5xl opacity-50 mb-2"></i>
                                         <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em]">Awaiting Selection</p>
                                     </div>
                                 )}
                             </div>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};
