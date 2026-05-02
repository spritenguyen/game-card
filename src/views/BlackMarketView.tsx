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
            <div className="w-full max-w-4xl flex flex-col gap-6">
                
                <div className="flex gap-4 border-b border-white/10 pb-2">
                    <button onClick={() => setSubTab('shop')} className={`text-xs tracking-widest font-mono uppercase px-4 py-2 ${subTab==='shop'?'text-cinematic-cyan border-b-2 border-cinematic-cyan':'text-zinc-500'}`}>Quy Đổi Chợ Đen</button>
                    <button onClick={() => setSubTab('reroll')} className={`text-xs tracking-widest font-mono uppercase px-4 py-2 ${subTab==='reroll'?'text-purple-500 border-b-2 border-purple-500':'text-zinc-500'}`}>Tái Lập Cấu Trúc Gen</button>
                </div>

                {subTab === 'shop' && (
                    <div className="glass-panel p-6 rounded-xl border border-cinematic-cyan/20">
                        <h3 className="text-white font-serif mb-6 uppercase tracking-widest text-center border-b border-white/10 pb-4">Black Market Exchange</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-cinematic-gold text-xs font-mono uppercase border-b border-cinematic-gold/20 pb-2">Mua Hàng (Buy)</h4>
                                
                                <div className="flex justify-between items-center bg-black/40 p-3 rounded border border-white/5">
                                    <div>
                                        <div className="font-bold text-sm text-white">Vé Cơ Bản</div>
                                        <div className="text-[10px] text-zinc-500 mt-1">100 Dust hoặc 1000 DC</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleExchange('buyBase')} className="px-3 py-1 bg-amber-600/20 text-amber-500 border border-amber-600/30 rounded text-xs hover:bg-amber-600/40">100 Dust</button>
                                        <button onClick={() => handleExchange('buyBase')} className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded text-xs hover:bg-blue-600/40">1000 DC</button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center bg-black/40 p-3 rounded border border-white/5">
                                    <div>
                                        <div className="font-bold text-sm text-purple-400">Vé Chuyên Sâu</div>
                                        <div className="text-[10px] text-zinc-500 mt-1">500 Dust</div>
                                    </div>
                                    <button onClick={() => handleExchange('buyElite')} className="px-3 py-1 bg-amber-600/20 text-amber-500 border border-amber-600/30 rounded text-xs hover:bg-amber-600/40">500 Dust</button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-purple-400 text-xs font-mono uppercase border-b border-purple-500/20 pb-2">Giải Phóng Lượng Tử (Sell)</h4>
                                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                                    {Object.entries(inventory.materials || {}).filter(([k,v]) => Number(v) > 0).map(([item, amount]) => {
                                        const isCore = item.includes('Core');
                                        return (
                                            <div key={item} className="flex justify-between items-center bg-black/40 p-3 rounded border border-white/5">
                                                <div>
                                                    <div className="font-bold text-sm text-white">{item} <span className="text-zinc-500 text-xs">(x{String(amount)})</span></div>
                                                    <div className="text-[10px] text-zinc-500 mt-1">Giá: {isCore ? '50 Dust' : '15 Dust'}</div>
                                                </div>
                                                <button onClick={() => handleExchange(isCore ? 'sellCore' : 'sellShard', item)} className="px-3 py-1 bg-zinc-800 text-amber-400 border border-amber-500/30 rounded text-xs hover:bg-zinc-700">Sell 1x</button>
                                            </div>
                                        )
                                    })}
                                    {Object.keys(inventory.materials || {}).length === 0 && (
                                        <div className="text-xs text-zinc-500 font-mono text-center py-4">Kho vật phẩm trống.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {subTab === 'reroll' && (
                    <div className="glass-panel p-6 rounded-xl border border-purple-500/20">
                         <h3 className="text-purple-400 font-serif mb-6 uppercase tracking-widest text-center border-b border-white/10 pb-4">Tái Lập Cấu Trúc Thẻ Thay Thế Hệ</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-4">
                                 <div>
                                     <label className="block text-[10px] uppercase text-zinc-500 mb-1">Chọn Đơn Vị Thẻ</label>
                                     <select 
                                        className="w-full bg-black/50 border border-white/10 text-white rounded p-3 text-sm focus:border-purple-500 outline-none"
                                        value={selectedCardId}
                                        onChange={(e) => setSelectedCardId(e.target.value)}
                                        disabled={isGlobalProcessing}
                                     >
                                         <option value="">-- Chọn Thẻ --</option>
                                         {cards.map(c => (
                                             <option key={c.id} value={c.id}>{c.name} ({c.faction} - {c.element})</option>
                                         ))}
                                     </select>
                                 </div>

                                 <div>
                                     <label className="block text-[10px] uppercase text-zinc-500 mb-1">Cấu hình Tái lập</label>
                                     <select 
                                        className="w-full bg-black/50 border border-white/10 text-white rounded p-3 text-sm focus:border-purple-500 outline-none"
                                        value={selectedAttribute}
                                        onChange={(e) => setSelectedAttribute(e.target.value as any)}
                                        disabled={isGlobalProcessing}
                                     >
                                         <option value="faction">Tái lập Tộc/Hệ (Faction)</option>
                                         <option value="element">Tái lập Nguyên Tố (Element)</option>
                                     </select>
                                 </div>

                                 {selectedCardId && (
                                     <div className="bg-black/40 p-4 rounded-lg border border-purple-500/20 mt-4">
                                         <h4 className="text-xs font-mono text-purple-400 mb-2">Chi phí yêu cầu:</h4>
                                         <ul className="text-sm space-y-2">
                                            <li className="flex justify-between items-center">
                                                <span className="text-zinc-400">Quantum Dust:</span>
                                                <span className={inventory.quantumDust >= 100 ? 'text-amber-400' : 'text-red-400'}>100 / {inventory.quantumDust}</span>
                                            </li>
                                            <li className="flex justify-between items-center">
                                                <span className="text-zinc-400">Nguyên liệu gốc:</span>
                                                {(() => {
                                                    const card = cards.find(c => c.id === selectedCardId);
                                                    if (!card) return null;
                                                    const reqMat = selectedAttribute === 'faction' ? `${card.faction} Core` : `${card.element} Shard`;
                                                    const owned = (inventory.materials || {})[reqMat] || 0;
                                                    return <span className={owned >= 1 ? 'text-green-400' : 'text-red-400'}>1x {reqMat} ({(inventory.materials || {})[reqMat] || 0})</span>
                                                })()}
                                            </li>
                                         </ul>
                                     </div>
                                 )}

                                 <button 
                                     onClick={handleReroll}
                                     disabled={isGlobalProcessing || !selectedCardId}
                                     className="w-full mt-4 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500 text-purple-300 font-bold tracking-widest text-sm py-3 rounded-lg disabled:opacity-50 transition-colors uppercase relative overflow-hidden"
                                 >
                                     {isGlobalProcessing ? <i className="fa-solid fa-compact-disc animate-spin"></i> : 'Khởi Động Tái Lập (Random)'}
                                 </button>
                             </div>

                             <div className="flex items-center justify-center border-l border-white/5 pl-8">
                                 {selectedCardId ? (
                                    <div className="text-center">
                                        <div className="text-xs text-zinc-500 font-mono mb-2 uppercase tracking-widest">Mục tiêu</div>
                                        <div className="text-xl text-white font-serif tracking-widest">{cards.find(c => c.id === selectedCardId)?.name}</div>
                                        <div className="flex gap-2 justify-center mt-2">
                                            <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-700">{cards.find(c => c.id === selectedCardId)?.faction}</span>
                                            <span className="px-2 py-0.5 bg-blue-900/20 text-blue-300 text-xs rounded border border-blue-900/50">{cards.find(c => c.id === selectedCardId)?.element}</span>
                                        </div>
                                    </div>
                                 ) : (
                                     <div className="text-zinc-800 font-mono text-center flex flex-col items-center gap-4">
                                         <i className="fa-solid fa-dna text-4xl"></i>
                                         <p className="text-sm">Vui lòng chọn thẻ</p>
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
