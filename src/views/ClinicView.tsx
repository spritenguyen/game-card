import React, { useState, useMemo } from 'react';
import { Card, Implant, AppConfig, ImplantSlot, Inventory } from '../types';
import { Icon } from '../components/ui/Icon';
import { rollImplant } from '../lib/gameLogic';

interface Props {
  implants: Implant[];
  cards: Card[];
  addImplant: (imp: Implant) => void;
  removeImplant: (id: string) => void;
  updateImplant: (imp: Implant) => void;
  updateCard: (card: Card) => void;
  onAlert: (t: string, m: string) => void;
  modifyCurrency: (amt: number) => void;
  currency: number;
  config: AppConfig;
  inventory: Inventory;
  modifyInventory: (bd: number, ed: number, m?: Record<string, number>, dd?: number) => void;
}

export const ClinicView: React.FC<Props> = ({ 
    implants, cards, addImplant, removeImplant, updateImplant, updateCard, onAlert, modifyCurrency, currency, config, inventory, modifyInventory
}) => {
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [selectedImplant, setSelectedImplant] = useState<Implant | null>(null);
    const [showCrafting, setShowCrafting] = useState<boolean>(false);

    const selectedCard = cards.find(c => c.id === selectedCardId);
    
    // Sort unequipped
    const unequippedImplants = [...implants].filter(i => !i.equippedTo).sort((a, b) => b.rarity - a.rarity);
    
    const totalCores = Object.entries(inventory.materials || {}).filter(([k]) => k.includes('Core')).reduce((sum, [_, v]) => sum + Number(v), 0);
    const totalShards = Object.entries(inventory.materials || {}).filter(([k]) => k.includes('Shard')).reduce((sum, [_, v]) => sum + Number(v), 0);

    const handleEquip = (implant: Implant) => {
        if (!selectedCard) {
            onAlert("Lỗi", "Hãy chọn một Đặc Vụ trước khi gắn Cấy Ghép.");
            return;
        }
        
        // Find existing implant in that slot
        const existingImp = selectedCard.implants ? selectedCard.implants[implant.slot] : null;
        
        // Remove the incoming implant from inventory (if it was there)
        removeImplant(implant.id);

        const newImplantsMap = { ...(selectedCard.implants || {}) };
        newImplantsMap[implant.slot] = { ...implant, equippedTo: selectedCard.id };
        
        updateCard({ ...selectedCard, implants: newImplantsMap });
        
        if (existingImp) {
            addImplant({ ...existingImp, equippedTo: undefined });
        }
        
        setSelectedImplant(null);
    };

    const handleUnequip = (slot: number) => {
        if (!selectedCard || !selectedCard.implants || !selectedCard.implants[slot]) return;
        
        const imp = selectedCard.implants[slot];
        addImplant({ ...imp, equippedTo: undefined });
        
        const newImplantsMap = { ...selectedCard.implants };
        delete newImplantsMap[slot];
        updateCard({ ...selectedCard, implants: newImplantsMap });
        
        setSelectedImplant(null);
    };

    const sellImplant = (implant: Implant) => {
        const val = implant.rarity * 100;
        modifyCurrency(val);
        removeImplant(implant.id);
        setSelectedImplant(null);
        onAlert('Phân tách', `Nhận +${val} DC từ phân tách Cấy Ghép.`);
    };

    const doCraftImplant = () => {
        const implant = rollImplant(50, true);
        if (implant) {
            addImplant(implant);
            onAlert("Chế Tạo Thành Công", `Nhận được: ${implant.name} (Mk.${implant.rarity})!`);
        } else {
            onAlert("Lỗi", "Chế tạo thất bại.");
        }
    };

    const handleCraftImplantByCore = () => {
        if (totalCores < 2) return onAlert("Thất bại", `Cần 2 Core để ghép! (Hiện có: ${totalCores})`);
        let toDeduct = 2;
        const updates: Record<string, number> = {};
        for (const [k, v] of Object.entries(inventory.materials || {})) {
            if (k.includes('Core') && Number(v) > 0) {
                const deduct = Math.min(Number(v), toDeduct);
                updates[k] = -deduct;
                toDeduct -= deduct;
                if (toDeduct <= 0) break;
            }
        }
        modifyInventory(0, 0, updates);
        doCraftImplant();
    };

    const handleCraftImplantByShard = () => {
        if (totalShards < 5) return onAlert("Thất bại", `Cần 5 Shard để ghép! (Hiện có: ${totalShards})`);
        let toDeduct = 5;
        const updates: Record<string, number> = {};
        for (const [k, v] of Object.entries(inventory.materials || {})) {
            if (k.includes('Shard') && Number(v) > 0) {
                const deduct = Math.min(Number(v), toDeduct);
                updates[k] = -deduct;
                toDeduct -= deduct;
                if (toDeduct <= 0) break;
            }
        }
        modifyInventory(0, 0, updates);
        doCraftImplant();
    };

    const renderImplantCard = (imp: Implant, isEquipped: boolean) => {
        const rarityColors = ['text-zinc-400', 'text-green-400', 'text-blue-400', 'text-purple-400', 'text-amber-400'];
        const rColor = rarityColors[imp.rarity - 1] || 'text-white';
        
        return (
           <div 
               onClick={() => setSelectedImplant(imp)}
               className={`relative p-3 rounded-lg border cursor-pointer hover:scale-105 transition-all ${selectedImplant?.id === imp.id ? 'border-cinematic-cyan bg-cinematic-cyan/10' : 'border-zinc-700 bg-black/60'} group`}    
           >
               <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-1">
                      <Icon name="fa-microchip" className={`${rColor}`} />
                      <span className={`text-[10px] font-bold ${rColor}`}>Mk.{imp.rarity}</span>
                   </div>
                   <div className="text-[10px] bg-white/10 px-1 rounded">SLOT {imp.slot}</div>
               </div>
               <div className="text-sm font-bold text-white mb-1 line-clamp-1">{imp.name}</div>
               <div className="text-xs font-bold text-cinematic-cyan drop-shadow-[0_0_5px_rgba(0,243,255,0.4)]">
                   {imp.mainStat.type} +{imp.mainStat.value}{imp.mainStat.isPercentage ? '%' : ''}
               </div>
           </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col md:flex-row pb-20 md:pb-0 font-mono text-zinc-300">
            {/* LEFT: Agent List */}
            <div className="w-full md:w-64 border-r border-zinc-800 bg-black/80 flex flex-col shrink-0">
               <div className="p-4 border-b border-zinc-800 font-bold uppercase tracking-widest text-sm text-white">
                   <Icon name="fa-users mr-2 text-cinematic-cyan" /> Agents
               </div>
               <div className="flex-1 overflow-y-auto no-scrollbar p-2 flex flex-col gap-2">
                   {cards.length === 0 ? <div className="text-xs text-zinc-600 text-center p-4">Không có đặc vụ</div> : cards.map(c => (
                       <button 
                         key={c.id} 
                         onClick={() => setSelectedCardId(c.id)}
                         className={`p-2 rounded flex items-center gap-3 transition-colors ${selectedCardId === c.id ? 'bg-cinematic-cyan/20 border-l-4 border-cinematic-cyan' : 'hover:bg-white/5 border-l-4 border-transparent'}`}
                       >
                           <div className="w-10 h-10 bg-zinc-900 rounded overflow-hidden flex shrink-0">
                               <img src={c.imageUrl || 'https://placehold.co/100x100/111/444.png'} alt={c.name} className="w-full h-full object-cover" />
                           </div>
                           <div className="flex flex-col items-start overflow-hidden text-left">
                               <div className="text-xs font-bold text-white truncate w-full">{c.name}</div>
                               <div className="text-[10px] text-zinc-500">
                                   {c.implants ? Object.keys(c.implants).length : 0} / 6 Slots
                               </div>
                           </div>
                       </button>
                   ))}
               </div>
            </div>

            {/* MIDDLE: Equipping Layout */}
            <div className="flex-1 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-zinc-900/50 relative">
               <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none"></div>
               
               {selectedCard ? (
                  <div className="p-6 relative z-10 flex-1 flex flex-col items-center overflow-y-auto">
                      <div className="text-2xl font-black text-white uppercase tracking-widest mb-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                          {selectedCard.name} <span className="text-cinematic-cyan text-sm ml-2">CYBERNETICS</span>
                      </div>
                      
                      {(() => {
                          const isFullImplant = selectedCard.implants && Object.keys(selectedCard.implants).length === 6;
                          return (
                              <div className="relative w-full max-w-[300px] aspect-[1/1.5] mb-8">
                                  {isFullImplant && (
                                      <div className="absolute inset-0 bg-cinematic-cyan/30 blur-2xl rounded-full scale-110 animate-pulse pointer-events-none"></div>
                                  )}
                                  {/* Central Portrait */}
                                  <div className={`absolute inset-4 rounded-lg overflow-hidden border-2 transition-all duration-500 ${isFullImplant ? 'border-cinematic-cyan shadow-[0_0_50px_rgba(0,243,255,0.6)] scale-105' : 'border-zinc-800 shadow-[0_0_30px_rgba(0,243,255,0.1)]'}`}>
                                      <img src={selectedCard.imageUrl} alt="" className="w-full h-full object-cover opacity-70" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                          </div>
                          
                          {/* The 6 Slots Array */}
                          {[1,2,3,4,5,6].map(slot => {
                              const imp = selectedCard.implants?.[slot];
                              
                              // positioning logic based on slot
                              // 1,2 on left, 3,4 on right, 5,6 on bottom
                              let classes = "absolute w-16 h-16 rounded-full border-2 bg-black/80 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ";
                              if (slot === 1) classes += "-left-4 top-[10%] ";
                              if (slot === 2) classes += "-left-4 top-[40%] ";
                              if (slot === 3) classes += "-right-4 top-[10%] ";
                              if (slot === 4) classes += "-right-4 top-[40%] ";
                              if (slot === 5) classes += "left-[20%] -bottom-4 ";
                              if (slot === 6) classes += "right-[20%] -bottom-4 ";
                              
                              if (imp) {
                                  let rColor = 'border-white text-white drop-shadow-[0_0_5px_white]';
                                  if(imp.rarity===2) rColor = 'border-green-400 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]';
                                  if(imp.rarity===3) rColor = 'border-blue-400 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]';
                                  if(imp.rarity===4) rColor = 'border-purple-400 text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]';
                                  if(imp.rarity===5) rColor = 'border-amber-400 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]';
                                  classes += rColor;
                                  
                                  return (
                                      <div key={slot} className={classes} onClick={() => setSelectedImplant(imp)}>
                                         <Icon name="fa-microchip text-2xl" />
                                      </div>
                                  );
                              } else {
                                  classes += "border-dashed border-zinc-600 text-zinc-600 opacity-50";
                                  return (
                                      <div key={slot} className={classes}>
                                         <Icon name="fa-plus text-xl" />
                                      </div>
                                  );
                              }
                          })}
                              </div>
                          );
                      })()}

                      {/* Detail View of Selected Implant inside middle section */}
                      {selectedImplant && (
                          <div className="w-full max-w-sm bg-black/90 border border-cinematic-cyan/30 rounded-xl p-4 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                               {/* Hologram Effects */}
                               <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,243,255,0.05)_2px,rgba(0,243,255,0.05)_4px)] pointer-events-none z-0"></div>
                               <div className="absolute inset-0 bg-cinematic-cyan/5 opacity-0 group-hover:opacity-100 animate-pulse pointer-events-none z-0 transition-opacity"></div>
                               <div className="w-full h-1 bg-cinematic-cyan/50 absolute top-0 left-0 animate-[slide-down_3s_linear_infinite] shadow-[0_0_10px_rgba(0,243,255,0.8)] z-0"></div>

                              <div className="flex justify-between items-start mb-4 relative z-10">
                                  <div>
                                      <h3 className="text-white font-bold text-lg">{selectedImplant.name}</h3>
                                      <div className="text-xs text-cinematic-cyan uppercase tracking-widest">{selectedImplant.set} SET / SLOT {selectedImplant.slot}</div>
                                  </div>
                                  <div className="text-xl">
                                     {[...Array(selectedImplant.rarity)].map((_,i) => <Icon key={i} name="fa-star text-amber-500 text-[10px]" />)}
                                  </div>
                              </div>
                              
                              <div className="bg-white/5 border border-white/5 rounded p-3 mb-4 relative z-10">
                                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Main Stat</div>
                                  <div className="text-2xl font-black text-cinematic-cyan drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]">
                                      {selectedImplant.mainStat.type} +{selectedImplant.mainStat.value}{selectedImplant.mainStat.isPercentage?'%':''}
                                  </div>
                              </div>

                              {selectedImplant.subStats.length > 0 && (
                                  <div className="mb-4 relative z-10">
                                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Sub Stats</div>
                                      <div className="grid grid-cols-2 gap-2">
                                          {selectedImplant.subStats.map((s,i) => (
                                              <div key={i} className="text-xs text-zinc-300 bg-white/5 px-2 py-1.5 rounded">
                                                 <span className="text-zinc-500 shrink-0 inline-block w-4 mr-1">•</span>
                                                 {s.type} +{s.value}{s.isPercentage?'%':''}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                              
                              {/* ACTION BUTTONS */}
                              <div className="flex gap-2 mt-auto relative z-10">
                                  {selectedImplant.equippedTo === selectedCard.id ? (
                                      <button onClick={() => handleUnequip(selectedImplant.slot)} className="flex-1 bg-red-500/20 text-red-400 border border-red-500/50 py-2 rounded font-bold hover:bg-red-500 hover:text-black transition-colors uppercase tracking-widest text-xs">
                                          Tháo ra
                                      </button>
                                  ) : (
                                      <>
                                        <button onClick={() => handleEquip(selectedImplant)} className="flex-1 bg-cinematic-cyan/20 text-cinematic-cyan border border-cinematic-cyan/50 py-2 rounded font-bold hover:bg-cinematic-cyan hover:text-black transition-colors shadow-[0_0_15px_rgba(0,243,255,0.2)] uppercase tracking-widest text-xs">
                                            Gắn Cấy Ghép
                                        </button>
                                        {!selectedImplant.equippedTo && (
                                            <button onClick={() => sellImplant(selectedImplant)} className="w-[80px] bg-zinc-800 text-zinc-400 py-2 rounded font-bold hover:bg-red-500 hover:text-white transition-colors text-xs">
                                                <Icon name="fa-recycle" /> Tách
                                            </button>
                                        )}
                                      </>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
               ) : (
                  <div className="p-6 relative z-10 flex-1 flex flex-col items-center justify-center">
                     <Icon name="fa-microchip text-6xl text-zinc-800 mb-4" />
                     <div className="text-zinc-600 uppercase tracking-widest">Select an Agent</div>
                  </div>
               )}
            </div>

            {/* RIGHT: Inventory Pool */}
            <div className="w-full md:w-72 border-l border-zinc-800 bg-black/90 flex flex-col shrink-0 relative">
               <div className="p-4 border-b border-zinc-800 font-bold uppercase tracking-widest text-sm text-white flex justify-between items-center bg-black/50">
                   <span>Inventory</span>
                   <div className="flex gap-2 items-center">
                       <span className="text-cinematic-cyan">{unequippedImplants.length}</span>
                       <button onClick={() => setShowCrafting(!showCrafting)} className="bg-cinematic-cyan/20 text-cinematic-cyan px-2 py-1 rounded text-[10px] hover:bg-cinematic-cyan hover:text-black transition-colors">CHẾ TẠO</button>
                   </div>
               </div>

               {showCrafting && (
                  <div className="absolute top-16 left-2 right-2 bg-zinc-900 border border-cinematic-cyan/30 p-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50">
                      <div className="flex justify-between items-start mb-3">
                          <h4 className="text-white font-bold text-sm tracking-widest uppercase">Forge Cấy Ghép</h4>
                          <button onClick={() => setShowCrafting(false)} className="text-zinc-500 hover:text-white"><Icon name="fa-xmark"/></button>
                      </div>
                      <p className="text-xs text-zinc-400 mb-4">Sử dụng Core và Shard thừa để đúc Cấy Ghép ngẫu nhiên.</p>
                      <div className="flex flex-col gap-2 mb-4 bg-black/50 p-2 rounded">
                          <div className="flex justify-between items-center">
                              <span className="text-zinc-400 text-[10px] uppercase">Tổng Cores</span>
                              <span className={`${totalCores >= 2 ? 'text-purple-400' : 'text-red-400'} font-bold text-sm`}>{totalCores}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-zinc-400 text-[10px] uppercase">Tổng Shards</span>
                              <span className={`${totalShards >= 5 ? 'text-cinematic-cyan' : 'text-red-400'} font-bold text-sm`}>{totalShards}</span>
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <button 
                             onClick={handleCraftImplantByCore}
                             className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${totalCores >= 2 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500 hover:text-white' : 'bg-zinc-800/50 text-zinc-600 border border-transparent cursor-not-allowed'}`}
                          >
                             Đúc (2 Core)
                          </button>
                          <button 
                             onClick={handleCraftImplantByShard}
                             className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${totalShards >= 5 ? 'bg-cinematic-cyan/20 text-cinematic-cyan border border-cinematic-cyan/50 hover:bg-cinematic-cyan hover:text-black' : 'bg-zinc-800/50 text-zinc-600 border border-transparent cursor-not-allowed'}`}
                          >
                             Đúc (5 Shard)
                          </button>
                      </div>
                  </div>
               )}

               <div className="flex-1 overflow-y-auto no-scrollbar p-3">
                   <div className="grid grid-cols-2 gap-2">
                       {unequippedImplants.map(imp => renderImplantCard(imp, false))}
                   </div>
               </div>
            </div>
        </div>
    );
};
