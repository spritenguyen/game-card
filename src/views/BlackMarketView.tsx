import React, { useState, useMemo } from 'react';
import { Icon } from '../components/ui/Icon';
import { Card, AppConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  currency: number;
  inventory: any;
  cards: Card[];
  modifyCurrency: (amount: number) => void;
  modifyInventory: (baseDiff: number, eliteDiff: number, mats?: Record<string, number>, dustDiff?: number) => void;
  updateCard: (card: Card) => Promise<void>;
  onAlert: (t: string, m: string) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (v: boolean) => void;
  config: AppConfig;
}

export const BlackMarketView: React.FC<Props> = ({ currency, inventory, cards, modifyCurrency, modifyInventory, updateCard, onAlert, isGlobalProcessing, setGlobalProcessing, config }) => {
    const [subTab, setSubTab] = useState<'shop' | 'exchange' | 'reroll'>('shop');
    const [selectedCardId, setSelectedCardId] = useState<string>('');
    const [selectedAttribute, setSelectedAttribute] = useState<'faction' | 'element' | 'role'>('faction');

    const handleExchange = (type: 'buyBase' | 'buyElite' | 'sellCore' | 'sellShard' | 'sellAllCore' | 'sellAllShard', item?: string) => {
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
                onAlert('Thành công', `Đã chuyển hóa 1 ${item} thành 50 Quantum Dust`);
            } else {
                onAlert('Thất bại', 'Không đủ vật phẩm!');
            }
        }

        if (type === 'sellShard' && item) {
            if (inventory.materials && inventory.materials[item] >= 1) {
                modifyInventory(0, 0, { [item]: -1 }, 15);
                onAlert('Thành công', `Đã chuyển hóa 1 ${item} thành 15 Quantum Dust`);
            } else {
                onAlert('Thất bại', 'Không đủ vật phẩm!');
            }
        }

        if (type === 'sellAllCore') {
            let totalSell = 0;
            const updates: Record<string, number> = {};
            Object.entries(inventory.materials || {}).forEach(([k, v]) => {
                const count = Number(v);
                if (k.includes('Core') && count > 0) {
                    updates[k] = -count;
                    totalSell += count;
                }
            });
            if (totalSell > 0) {
                modifyInventory(0, 0, updates, totalSell * 50);
                onAlert('Thành công', `Đã chuyển hóa ${totalSell} Core thành ${totalSell * 50} Quantum Dust`);
            } else {
                onAlert('Thất bại', 'Không có Core nào để bán!');
            }
        }

        if (type === 'sellAllShard') {
            let totalSell = 0;
            const updates: Record<string, number> = {};
            Object.entries(inventory.materials || {}).forEach(([k, v]) => {
                const count = Number(v);
                if (k.includes('Shard') && count > 0) {
                    updates[k] = -count;
                    totalSell += count;
                }
            });
            if (totalSell > 0) {
                modifyInventory(0, 0, updates, totalSell * 15);
                onAlert('Thành công', `Đã chuyển hóa ${totalSell} Shard thành ${totalSell * 15} Quantum Dust`);
            } else {
                onAlert('Thất bại', 'Không có Shard nào để bán!');
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
        } else if (selectedAttribute === 'element') {
            requiredMat = `${card.element} Shard`;
        } // role requires no extra mat, just dust

        if (selectedAttribute !== 'role' && (!inventory.materials || (inventory.materials[requiredMat] || 0) < 1)) {
            return onAlert('Lỗi', `Cần 1 ${requiredMat} để tái tạo cấu trúc này!`);
        }

        setGlobalProcessing(true);
        try {
            if (selectedAttribute !== 'role') {
                modifyInventory(0, 0, { [requiredMat]: -1 }, -100);
            } else {
                modifyInventory(0, 0, undefined, -150); // Need 150 dust for role
            }

            let newFaction = card.faction;
            let newElement = card.element;
            let newRole = card.role || 'Striker';

            if (selectedAttribute === 'faction') {
                const available = ["CyberCore", "Ethereal", "VoidBringer", "MechaMutant", "AstroNomad", "ArcaneWeaver"].filter(f => f !== card.faction);
                // "CyberCore", "Ethereal", "VoidBringer", "MechaMutant", "AstroNomad", "ArcaneWeaver"
                newFaction = available[Math.floor(Math.random() * available.length)] as any;
            } else if (selectedAttribute === 'element') {
                const available = ["Neutral", "Fire", "Water", "Wind", "Earth", "Lightning"].filter(e => e !== card.element);
                newElement = available[Math.floor(Math.random() * available.length)] as any;
            } else if (selectedAttribute === 'role') {
                const available = ["Vanguard", "Striker", "Support"].filter(r => r !== card.role);
                newRole = available[Math.floor(Math.random() * available.length)] as any;
            }

            const updatedCard = { ...card, faction: newFaction, element: newElement, role: newRole as any };
            await updateCard(updatedCard);
            onAlert('Thành công', `Cấu trúc gen đã thay đổi: Thuộc tính ${selectedAttribute.toUpperCase()} mới thiết lập thành công!`);

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
                <div className="flex overflow-x-auto no-scrollbar gap-2 sm:gap-6 border-b border-white/5 pb-0 mb-4 px-2">
                    <button onClick={() => setSubTab('shop')} className={`whitespace-nowrap text-[10px] sm:text-xs tracking-[0.2em] font-mono uppercase px-4 py-3 sm:py-4 transition-all relative ${subTab==='shop'?'text-cinematic-cyan':'text-zinc-500 hover:text-zinc-300'}`}>
                        <Icon name="fa-store mr-2" className="fa-store mr-2" /> Black Market
                        {subTab === 'shop' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cinematic-cyan shadow-[0_0_10px_rgba(0,243,255,0.5)]"></div>}
                    </button>
                    <button onClick={() => setSubTab('exchange')} className={`whitespace-nowrap text-[10px] sm:text-xs tracking-[0.2em] font-mono uppercase px-4 py-3 sm:py-4 transition-all relative ${subTab==='exchange'?'text-amber-400':'text-zinc-500 hover:text-zinc-300'}`}>
                        <Icon name="fa-exchange-alt mr-2" className="fa-exchange-alt mr-2" /> Material Exchange
                        {subTab === 'exchange' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>}
                    </button>
                    <button onClick={() => setSubTab('reroll')} className={`whitespace-nowrap text-[10px] sm:text-xs tracking-[0.2em] font-mono uppercase px-4 py-3 sm:py-4 transition-all relative ${subTab==='reroll'?'text-purple-400':'text-zinc-500 hover:text-zinc-300'}`}>
                        <Icon name="fa-dna mr-2" className="fa-dna mr-2" /> Gene Restructure
                        {subTab === 'reroll' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]"></div>}
                    </button>
                </div>

                <AnimatePresence mode="wait">
                {subTab === 'shop' && (
                    <motion.div 
                        key="shop" 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                        className="bg-cinematic-900/40 border border-white/5 rounded-3xl p-6 sm:p-10 shadow-[inset_0_0_80px_rgba(0,0,0,0.5),0_0_40px_rgba(0,243,255,0.05)] relative backdrop-blur-md ring-1 ring-white/5"
                    >
                        <div className="flex flex-col items-center mb-8 pb-6 border-b border-white/5 relative">
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-[1px] bg-cinematic-cyan/20"></div>
                             <h3 className="text-white text-lg sm:text-xl font-serif uppercase tracking-[0.3em] bg-black px-6 relative z-10 border border-white/10 rounded-full py-2 shadow-lg w-max mx-auto">Black Market Supply</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                            <div className="space-y-4">
                                <h4 className="text-cinematic-gold text-[10px] sm:text-xs font-mono uppercase border-b border-cinematic-gold/20 pb-2 tracking-[0.2em] flex items-center gap-2"><Icon name="fa-ticket" className="fa-ticket" /> Reconnaissance</h4>
                                
                                <div className="flex justify-between items-center bg-black/60 p-4 rounded-xl border border-white/5 ring-1 ring-white/5 hover:bg-cinematic-900/60 transition-all shadow-inner group">
                                    <div>
                                        <div className="font-bold text-sm sm:text-base text-white tracking-widest uppercase font-serif group-hover:text-cinematic-cyan transition-colors">Base Ticket</div>
                                        <div className="text-[9px] sm:text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">100 Dust / 1000 DC</div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => handleExchange('buyBase')} className="px-4 py-2 bg-amber-600/10 text-amber-500 border border-amber-600/30 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-widest uppercase hover:bg-amber-600 hover:text-black transition-all shadow-[0_0_10px_rgba(245,158,11,0.1)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]">Buy: 100 Dust</button>
                                        <button onClick={() => handleExchange('buyBase')} className="px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-600/30 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-widest uppercase hover:bg-blue-600 hover:text-black transition-all shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">Buy: 1000 DC</button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-purple-400 text-[10px] sm:text-xs font-mono uppercase border-b border-purple-500/20 pb-2 tracking-[0.2em] flex items-center gap-2"><Icon name="fa-star" className="fa-star" /> Premium Assets</h4>

                                <div className="flex justify-between items-center bg-black/60 p-4 rounded-xl border border-purple-500/10 ring-1 ring-purple-500/20 hover:bg-purple-900/20 transition-all shadow-inner group">
                                    <div>
                                        <div className="font-bold text-sm sm:text-base text-purple-400 tracking-widest uppercase font-serif group-hover:text-purple-300 transition-colors">Elite Ticket</div>
                                        <div className="text-[9px] sm:text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">500 Dust</div>
                                    </div>
                                    <button onClick={() => handleExchange('buyElite')} className="px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/50 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-widest uppercase hover:bg-purple-500 hover:text-black transition-all shadow-[inset_0_0_10px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]">Buy: 500 Dust</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {subTab === 'exchange' && (
                    <motion.div 
                        key="exchange" 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                        className="bg-cinematic-900/40 border border-amber-500/10 rounded-3xl p-6 sm:p-10 shadow-[inset_0_0_80px_rgba(0,0,0,0.5),0_0_40px_rgba(245,158,11,0.05)] relative backdrop-blur-md ring-1 ring-amber-500/20"
                    >
                        <div className="flex flex-col items-center mb-8 pb-6 border-b border-white/5 relative">
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-[1px] bg-amber-500/30"></div>
                             <h3 className="text-amber-500 text-lg sm:text-xl font-serif uppercase tracking-[0.3em] bg-black px-6 relative z-10 border border-amber-500/20 rounded-full py-2 shadow-lg w-max mx-auto">Material Recycling</h3>
                        </div>
                        
                        <div className="flex gap-4 mb-4 justify-end">
                            <button onClick={() => handleExchange('sellAllCore')} className="px-4 py-2 bg-amber-600/10 text-amber-500 border border-amber-600/30 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-widest uppercase hover:bg-amber-600 hover:text-black transition-all">Sell All Cores</button>
                            <button onClick={() => handleExchange('sellAllShard')} className="px-4 py-2 bg-amber-600/10 text-amber-500 border border-amber-600/30 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-widest uppercase hover:bg-amber-600 hover:text-black transition-all">Sell All Shards</button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 auto-rows-max">
                            <AnimatePresence>
                                {Object.entries(inventory.materials || {}).filter(([k,v]) => Number(v) > 0).map(([item, amount]) => {
                                    const isCore = item.includes('Core');
                                    return (
                                        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={item} className="flex flex-col justify-between bg-black/60 p-4 rounded-xl border border-white/5 ring-1 ring-white/5 hover:border-amber-500/50 transition-all shadow-inner group relative overflow-hidden">
                                            <div className="absolute -right-4 -bottom-4 text-6xl opacity-5 group-hover:scale-125 transition-transform"><Icon name={isCore ? "fa-cube" : "fa-gem"} /></div>
                                            <div className="mb-4 relative z-10">
                                                <div className="font-bold text-sm text-white font-mono uppercase tracking-widest truncate">{item}</div>
                                                <div className="text-[10px] font-mono text-zinc-400 mt-1 uppercase tracking-widest">Quantity: <span className="text-white font-bold">{String(amount)}</span></div>
                                                <div className="text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">Yield per item: <span className="text-amber-500">{isCore ? '50 Dust' : '15 Dust'}</span></div>
                                            </div>
                                            <button onClick={() => handleExchange(isCore ? 'sellCore' : 'sellShard', item)} className="w-full relative z-10 px-4 py-2 bg-zinc-900 text-amber-400 border border-amber-500/30 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-widest uppercase hover:bg-amber-500 hover:text-black transition-all">Sell 1</button>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                            {Object.keys(inventory.materials || {}).length === 0 && (
                                <div className="col-span-full text-[10px] sm:text-xs text-zinc-600 font-mono text-center py-12 uppercase tracking-[0.2em] border border-white/5 border-dashed rounded-xl bg-black/20">Vault is empty. Farm materials in missions.</div>
                            )}
                        </div>
                    </motion.div>
                )}

                {subTab === 'reroll' && (
                    <motion.div 
                        key="reroll" 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                        className="bg-cinematic-900/40 border border-purple-500/10 rounded-3xl p-6 sm:p-10 shadow-[inset_0_0_80px_rgba(0,0,0,0.5),0_0_40px_rgba(192,132,252,0.05)] relative backdrop-blur-md ring-1 ring-purple-500/20"
                    >
                         <div className="flex flex-col items-center mb-8 pb-6 border-b border-white/5 relative">
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-[1px] bg-purple-500/30"></div>
                              <h3 className="text-purple-400 text-lg sm:text-xl font-serif uppercase tracking-[0.3em] bg-black px-6 relative z-10 border border-purple-500/30 rounded-full py-2 shadow-[0_0_30px_rgba(168,85,247,0.2)] w-max mx-auto">Gene Restructure</h3>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                             <div className="space-y-6">
                                 <div>
                                     <label className="block text-[9px] sm:text-[10px] font-mono uppercase text-zinc-500 mb-2 tracking-[0.2em]">Select Operative</label>
                                     <div className="relative">
                                         <Icon name="fa-users absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" className="fa-users absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" />
                                         <select 
                                            className="w-full bg-black/80 border border-white/10 text-white rounded-xl py-3 pl-10 pr-4 text-xs font-mono tracking-widest uppercase focus:border-purple-500/50 outline-none appearance-none cursor-pointer hover:border-purple-500/30 transition-colors"
                                            value={selectedCardId}
                                            onChange={(e) => setSelectedCardId(e.target.value)}
                                            disabled={isGlobalProcessing}
                                         >
                                             <option value="">-- Select Target --</option>
                                             {cards.map(c => (
                                                 <option key={c.id} value={c.id}>{c.name} ({c.faction} - {c.element} - {c.role || 'Striker'})</option>
                                             ))}
                                         </select>
                                         <Icon name="fa-caret-down absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-400/50" className="fa-caret-down absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-400/50" />
                                     </div>
                                 </div>

                                 <div>
                                     <label className="block text-[9px] sm:text-[10px] font-mono uppercase text-zinc-500 mb-2 tracking-[0.2em]">Mutation Protocol</label>
                                     <div className="relative">
                                         <Icon name="fa-code-merge absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" className="fa-code-merge absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" />
                                         <select 
                                            className="w-full bg-black/80 border border-white/10 text-white rounded-xl py-3 pl-10 pr-4 text-xs font-mono tracking-widest uppercase focus:border-purple-500/50 outline-none appearance-none cursor-pointer hover:border-purple-500/30 transition-colors"
                                            value={selectedAttribute}
                                            onChange={(e) => setSelectedAttribute(e.target.value as any)}
                                            disabled={isGlobalProcessing}
                                         >
                                             <option value="faction">Reroll Faction (Tộc/Hệ)</option>
                                             <option value="element">Reroll Element (Nguyên Tố)</option>
                                             <option value="role">Reroll Role (Vai Trò)</option>
                                         </select>
                                         <Icon name="fa-caret-down absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-400/50" className="fa-caret-down absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-400/50" />
                                     </div>
                                 </div>

                                 <AnimatePresence>
                                     {selectedCardId && (
                                         <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-black/60 p-5 rounded-2xl border border-purple-500/20 mt-4 shadow-inner ring-1 ring-white/5">
                                             <h4 className="text-[10px] font-mono text-purple-400 mb-3 tracking-[0.2em] uppercase flex items-center gap-2"><Icon name="fa-microchip"/> Requirement Spec</h4>
                                             <ul className="text-xs font-mono uppercase tracking-widest space-y-3">
                                                <li className="flex justify-between items-center border-b border-white/5 pb-3">
                                                    <span className="text-zinc-500">Quantum Dust</span>
                                                    <span className={inventory.quantumDust >= (selectedAttribute === 'role' ? 150 : 100) ? 'text-amber-400 font-bold' : 'text-red-400 font-bold'}>{selectedAttribute === 'role' ? 150 : 100} / {inventory.quantumDust}</span>
                                                </li>
                                                {selectedAttribute !== 'role' && (
                                                    <li className="flex justify-between items-center pt-1">
                                                        <span className="text-zinc-500">Base Catalyst</span>
                                                        {(() => {
                                                            const card = cards.find(c => c.id === selectedCardId);
                                                            if (!card) return null;
                                                            const reqMat = selectedAttribute === 'faction' ? `${card.faction} Core` : `${card.element} Shard`;
                                                            const owned = (inventory.materials || {})[reqMat] || 0;
                                                            return <span className={owned >= 1 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>1x {reqMat} (Qty: {owned})</span>
                                                        })()}
                                                    </li>
                                                )}
                                             </ul>
                                         </motion.div>
                                     )}
                                 </AnimatePresence>

                                 <button 
                                     onClick={handleReroll}
                                     disabled={isGlobalProcessing || !selectedCardId}
                                     className="w-full mt-4 bg-purple-600/10 hover:bg-purple-500 border border-purple-500/50 hover:border-purple-400 text-purple-400 hover:text-black font-bold tracking-[0.3em] font-mono text-[10px] sm:text-xs py-4 rounded-xl disabled:opacity-40 disabled:hover:bg-purple-600/10 disabled:hover:text-purple-400 transition-all uppercase relative overflow-hidden shadow-[inset_0_0_20px_rgba(192,132,252,0.2)]"
                                 >
                                     {isGlobalProcessing ? <Icon name="fa-compact-disc animate-spin text-xl" className="fa-compact-disc animate-spin text-xl" /> : 'Initialize Mutation'}
                                 </button>
                             </div>

                             <div className="flex items-center justify-center sm:border-l border-white/5 sm:pl-10 mt-6 sm:mt-0 pt-6 sm:pt-0 border-t sm:border-t-0">
                                 <AnimatePresence mode="wait">
                                     {selectedCardId ? (
                                        <motion.div key="card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center w-full bg-gradient-to-b from-purple-900/10 to-black/60 p-8 rounded-3xl border border-purple-500/20 relative overflow-hidden ring-1 ring-white/5">
                                            <div className="absolute -top-10 -right-10 opacity-10 text-9xl text-purple-500 select-none pointer-events-none"><Icon name="fa-microscope" /></div>
                                            <div className="text-[9px] sm:text-[10px] text-zinc-500 font-mono mb-2 uppercase tracking-[0.3em]">Target Anomaly</div>
                                            <div className="text-xl sm:text-2xl text-white font-serif tracking-widest uppercase mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white to-purple-300">{cards.find(c => c.id === selectedCardId)?.name}</div>
                                            <div className="flex flex-col gap-3 justify-center items-center font-mono text-[10px] uppercase tracking-widest">
                                                <div className="w-full flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10 shadow-inner">
                                                   <span className="text-zinc-500">Faction</span>
                                                   <span className={`font-bold ${selectedAttribute === 'faction' ? 'text-purple-400 animate-pulse' : 'text-zinc-300'}`}>{cards.find(c => c.id === selectedCardId)?.faction}</span>
                                                </div>
                                                <div className="w-full flex justify-between items-center bg-cinematic-cyan/5 p-3 rounded-lg border border-cinematic-cyan/10 shadow-inner">
                                                   <span className="text-zinc-500">Element</span>
                                                   <span className={`font-bold ${selectedAttribute === 'element' ? 'text-purple-400 animate-pulse' : 'text-cinematic-cyan'}`}>{cards.find(c => c.id === selectedCardId)?.element}</span>
                                                </div>
                                                <div className="w-full flex justify-between items-center bg-amber-500/5 p-3 rounded-lg border border-amber-500/10 shadow-inner">
                                                   <span className="text-zinc-500">Role</span>
                                                   <span className={`font-bold ${selectedAttribute === 'role' ? 'text-purple-400 animate-pulse' : 'text-amber-500'}`}>{cards.find(c => c.id === selectedCardId)?.role || 'Striker'}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                     ) : (
                                         <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-zinc-800 font-mono text-center flex flex-col items-center justify-center gap-4 w-full h-[300px] border border-white/5 border-dashed rounded-3xl bg-black/30">
                                             <Icon name="fa-dna text-6xl opacity-30 mb-2" className="fa-dna text-6xl opacity-30 mb-2" />
                                             <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em]">Awaiting Selection</p>
                                         </motion.div>
                                     )}
                                 </AnimatePresence>
                             </div>
                         </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
        </div>
    );
};
