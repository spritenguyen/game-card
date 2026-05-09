import React, { useState } from 'react';
import { Card, Gear, AppConfig, Inventory } from '../types';
import { Icon } from '../components/ui/Icon';
import { rollGear } from '../lib/gameLogic';

interface Props {
  gears: Gear[];
  cards: Card[];
  addGear: (gear: Gear) => void;
  removeGear: (id: string) => void;
  updateGear: (gear: Gear) => void;
  updateCard: (card: Card) => void;
  onAlert: (t: string, m: string) => void;
  modifyCurrency: (amt: number) => void;
  currency: number;
  config: AppConfig;
  inventory: Inventory;
  modifyInventory: (bd: number, ed: number, m?: Record<string, number>, dd?: number) => void;
}

export const ArmoryView: React.FC<Props> = ({ 
    gears, cards, addGear, removeGear, updateGear, updateCard, onAlert, modifyCurrency, currency, config, inventory, modifyInventory
}) => {
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [selectedGear, setSelectedGear] = useState<Gear | null>(null);
    const [showCrafting, setShowCrafting] = useState<boolean>(false);

    const selectedCard = cards.find(c => c.id === selectedCardId);
    
    // Sort unequipped
    const unequippedGears = [...gears].filter(i => !i.equippedTo).sort((a, b) => b.rarity - a.rarity);
    
    const totalCores = Object.entries(inventory.materials || {}).filter(([k]) => k.includes('Core')).reduce((sum, [_, v]) => sum + Number(v), 0);
    const totalShards = Object.entries(inventory.materials || {}).filter(([k]) => k.includes('Shard')).reduce((sum, [_, v]) => sum + Number(v), 0);
    const gearFragments = Object.entries(inventory.materials || {}).filter(([k]) => k.includes('Gear Fragment') || k.toLowerCase().includes('gearfragment') || k === 'Mảnh Trang Bị' || k.includes('Equipment Shard')).reduce((sum, [_, v]) => sum + Number(v), 0) || inventory.materials?.['GearFragment'] || inventory.materials?.['Gear Fragments'] || 0;

    const handleCraftGear = () => {
        if (gearFragments < 10) {
            onAlert("Thất bại", `Cần 10 Mảnh Trang Bị để ghép! (Hiện có: ${gearFragments})`);
            return;
        }
        
        let toDeduct = 10;
        const updates: Record<string, number> = {};
        for (const [k, v] of Object.entries(inventory.materials || {})) {
            if ((k.includes('Gear Fragment') || k.toLowerCase().includes('gearfragment') || k === 'Mảnh Trang Bị' || k.includes('Equipment Shard')) && Number(v) > 0) {
                const deduct = Math.min(Number(v), toDeduct);
                updates[k] = -deduct;
                toDeduct -= deduct;
                if (toDeduct <= 0) break;
            }
        }
        modifyInventory(0, 0, updates);
        
        const gear = rollGear(50, true);
        if (gear) {
            addGear(gear);
            onAlert("Chế Tạo Thành Công", `Nhận được: ${gear.name} (Mk.${gear.rarity})!`);
        } else {
            onAlert("Lỗi", "Chế tạo thất bại.");
        }
    };

    const handleEquip = (gear: Gear) => {
        if (!selectedCard) {
            onAlert("Lỗi", "Hãy chọn một Đặc Vụ trước khi gắn Trang Bị.");
            return;
        }
        
        const existingGear = selectedCard.gears ? selectedCard.gears[gear.slot] : null;
        removeGear(gear.id);

        const newGearsMap = { ...(selectedCard.gears || {}) };
        newGearsMap[gear.slot] = { ...gear, equippedTo: selectedCard.id };
        
        updateCard({ ...selectedCard, gears: newGearsMap });
        
        if (existingGear) {
            addGear({ ...existingGear, equippedTo: undefined });
        }
        
        setSelectedGear(null);
    };

    const handleUnequip = (slot: number) => {
        if (!selectedCard || !selectedCard.gears || !selectedCard.gears[slot]) return;
        
        const gear = selectedCard.gears[slot];
        addGear({ ...gear, equippedTo: undefined });
        
        const newGearsMap = { ...selectedCard.gears };
        delete newGearsMap[slot];
        updateCard({ ...selectedCard, gears: newGearsMap });
        
        setSelectedGear(null);
    };

    const sellGear = (gear: Gear) => {
        const val = gear.rarity * 100;
        modifyCurrency(val);
        removeGear(gear.id);
        setSelectedGear(null);
        onAlert('Phân tách', `Nhận +${val} DC từ phân tách Trang Bị.`);
    };

    const doCraftGear = () => {
        const gear = rollGear(50, true);
        if (gear) {
            addGear(gear);
            onAlert("Chế Tạo Thành Công", `Nhận được: ${gear.name} (Mk.${gear.rarity})!`);
        } else {
            onAlert("Lỗi", "Chế tạo thất bại.");
        }
    };

    const handleCraftGearByCore = () => {
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
        doCraftGear();
    };

    const handleCraftGearByShard = () => {
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
        doCraftGear();
    };

   const renderGearCard = (gear: Gear, isEquipped: boolean) => {
        const rarityColors = ['text-zinc-400', 'text-green-400', 'text-blue-400', 'text-purple-400', 'text-amber-400'];
        const rColor = rarityColors[gear.rarity - 1] || 'text-white';
        
        return (
           <div 
               key={gear.id}
               onClick={() => setSelectedGear(gear)}
               className={`relative p-3 rounded-lg border cursor-pointer hover:scale-105 transition-all ${selectedGear?.id === gear.id ? 'border-cinematic-gold bg-cinematic-gold/10' : 'border-zinc-700 bg-black/60'} group`}    
           >
               <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-1">
                      <Icon name="fa-shield-halved" className={`${rColor}`} />
                      <span className={`text-[10px] font-bold ${rColor}`}>Mk.{gear.rarity}</span>
                   </div>
                   <div className="text-[10px] bg-white/10 px-1 rounded">SLOT {gear.slot}</div>
               </div>
               <div className="text-sm font-bold text-white mb-1 line-clamp-1">{gear.name}</div>
               <div className="text-xs font-bold text-cinematic-gold drop-shadow-[0_0_5px_rgba(255,215,0,0.4)]">
                   {gear.mainStat.type} +{gear.mainStat.value}{gear.mainStat.isPercentage ? '%' : ''}
               </div>
           </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col md:flex-row pb-20 md:pb-0 font-sans text-zinc-300 overflow-hidden">
            {/* LEFT: Agent List */}
            <div className="w-full md:w-64 border-r border-zinc-800 bg-black/80 flex flex-col shrink-0">
               <div className="p-4 border-b border-zinc-800 font-bold uppercase tracking-widest text-sm text-white">
                   <Icon name="fa-users mr-2 text-cinematic-gold" /> Đặc Vụ
               </div>
               <div className="flex-1 overflow-y-auto no-scrollbar p-2 flex flex-col gap-2">
                   {cards.length === 0 ? <div className="text-xs text-zinc-600 text-center p-4">Không có đặc vụ</div> : cards.map(c => (
                       <button 
                         key={c.id} 
                         onClick={() => setSelectedCardId(c.id)}
                         className={`p-2 rounded flex items-center gap-3 transition-colors ${selectedCardId === c.id ? 'bg-cinematic-gold/20 border-l-4 border-cinematic-gold' : 'hover:bg-white/5 border-l-4 border-transparent'}`}
                       >
                           <div className="w-10 h-10 bg-zinc-900 rounded overflow-hidden flex shrink-0">
                               <img src={c.imageUrl || 'https://placehold.co/100x100/111/444.png'} alt={c.name} className="w-full h-full object-cover" />
                           </div>
                           <div className="flex flex-col items-start overflow-hidden text-left w-full">
                               <div className="text-xs font-bold text-white truncate w-full">{c.name}</div>
                               <div className="text-[10px] text-zinc-500">
                                   {c.gears ? Object.keys(c.gears).filter(k => parseInt(k) <= 4).length : 0} / 4 Trang Bị
                               </div>
                           </div>
                       </button>
                   ))}
               </div>
            </div>

            {/* MIDDLE: Equipping Layout */}
            <div className="flex-1 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-zinc-900/50 relative min-h-0 h-full overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none"></div>
               
               {selectedCard ? (
                  <div className="p-6 relative z-10 flex-1 flex flex-col items-center overflow-y-auto w-full">
                      <div className="text-2xl font-black text-white uppercase tracking-widest mb-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                          {selectedCard.name} <span className="text-cinematic-gold text-sm ml-2">ARMORY</span>
                      </div>
                      
                      {(() => {
                          const isFullGear = selectedCard.gears && Object.keys(selectedCard.gears).filter(k => parseInt(k) <= 4).length === 4;
                          return (
                              <div className="relative w-full max-w-[300px] aspect-[1/1.5] mb-8">
                                  {isFullGear && (
                                      <div className="absolute inset-0 bg-cinematic-gold/30 blur-2xl rounded-full scale-110 animate-pulse pointer-events-none"></div>
                                  )}
                                  {/* Central Portrait */}
                                  <div className={`absolute inset-4 rounded-lg overflow-hidden border-2 transition-all duration-500 ${isFullGear ? 'border-cinematic-gold shadow-[0_0_50px_rgba(255,215,0,0.6)] scale-105' : 'border-zinc-800 shadow-[0_0_30px_rgba(255,215,0,0.1)]'}`}>
                                      <img src={selectedCard.imageUrl} alt="" className="w-full h-full object-cover opacity-70" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                  </div>
                                  
                                  {/* The 4 Slots Array */}
                                  {([1,2,3,4] as const).map(slot => {
                                      const gear = selectedCard.gears?.[slot];
                              
                              // positioning logic based on slot
                              // 1 on top, 2 on left, 3 on right, 4 on bottom
                              let classes = "absolute w-16 h-16 rounded-full border-2 bg-black/80 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ";
                              if (slot === 1) classes += "left-1/2 -translate-x-1/2 -top-6 ";   // Head
                              if (slot === 2) classes += "-left-6 top-[35%] ";                  // Chest
                              if (slot === 3) classes += "-right-6 top-[35%] ";                 // Limbs
                              if (slot === 4) classes += "left-1/2 -translate-x-1/2 -bottom-6 "; // Accessory
                              
                              let iconName = "fa-shield-halved";
                              if (slot === 1) iconName = "fa-brain";
                              if (slot === 2) iconName = "fa-cube";
                              if (slot === 3) iconName = "fa-bolt";
                              if (slot === 4) iconName = "fa-gem";
                              
                              let slotLabel = "";
                              if (slot === 1) slotLabel = "NEURAL LINK";
                              if (slot === 2) slotLabel = "CORE DRIVE";
                              if (slot === 3) slotLabel = "KINETIC";
                              if (slot === 4) slotLabel = "UTILITY";

                              if (gear) {
                                  let rColor = 'border-white text-white drop-shadow-[0_0_5px_white]';
                                  if(gear.rarity===2) rColor = 'border-green-400 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]';
                                  if(gear.rarity===3) rColor = 'border-blue-400 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]';
                                  if(gear.rarity===4) rColor = 'border-purple-400 text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]';
                                  if(gear.rarity===5) rColor = 'border-amber-400 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]';
                                  classes += rColor;
                                  
                                  return (
                                      <div key={slot} className={classes} onClick={() => setSelectedGear(gear)}>
                                         <Icon name={`${iconName} text-2xl`} />
                                         <div className="absolute top-1 right-1 w-4 h-4 bg-black/80 rounded-full flex items-center justify-center text-[8px] font-bold border border-zinc-600 text-white shadow shadow-black">{slot}</div>
                                         <div className="absolute -bottom-4 text-[8px] font-bold tracking-widest text-white/50 bg-black/80 px-1 rounded whitespace-nowrap">{slotLabel}</div>
                                      </div>
                                  );
                              } else {
                                  classes += "border-dashed border-zinc-600 text-zinc-600 opacity-50";
                                  return (
                                      <div key={slot} className={classes}>
                                         <Icon name="fa-plus text-xl" />
                                         <div className="absolute top-1 right-1 w-4 h-4 bg-black/80 rounded-full flex items-center justify-center text-[8px] font-bold border border-zinc-700 text-zinc-400 shadow shadow-black">{slot}</div>
                                         <div className="absolute -bottom-4 text-[8px] font-bold tracking-widest text-zinc-500 bg-black/80 px-1 rounded whitespace-nowrap">{slotLabel}</div>
                                      </div>
                                  );
                              }
                          })}
                              </div>
                          );
                      })()}

                      {/* Detail View of Selected Gear inside middle section */}
                      {selectedGear && (
                          <div className="w-full max-w-sm bg-black/90 border border-cinematic-cyan/30 rounded-xl p-4 flex flex-col shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                               {/* Hologram Effects */}
                               <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,243,255,0.05)_2px,rgba(0,243,255,0.05)_4px)] pointer-events-none z-0"></div>
                               <div className="absolute inset-0 bg-cinematic-cyan/5 opacity-0 group-hover:opacity-100 animate-pulse pointer-events-none z-0 transition-opacity"></div>
                               <div className="w-full h-1 bg-cinematic-cyan/50 absolute top-0 left-0 animate-[slide-down_3s_linear_infinite] shadow-[0_0_10px_rgba(0,243,255,0.8)] z-0"></div>
                               
                              <div className="flex justify-between items-start mb-4 relative z-10">
                                  <div>
                                      <h3 className="text-white font-bold text-lg">{selectedGear.name}</h3>
                                      <div className="text-xs text-cinematic-gold uppercase tracking-widest">{selectedGear.brand} / SLOT {selectedGear.slot}</div>
                                  </div>
                                  <div className="text-xl">
                                     {[...Array(selectedGear.rarity)].map((_,i) => <Icon key={i} name="fa-star text-amber-500 text-[10px]" />)}
                                  </div>
                              </div>
                              
                              <div className="bg-white/5 border border-white/5 rounded p-3 mb-4 relative z-10">
                                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Chỉ Số Gốc</div>
                                  <div className="text-2xl font-black text-cinematic-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]">
                                      {selectedGear.mainStat.type} +{selectedGear.mainStat.value}{selectedGear.mainStat.isPercentage?'%':''}
                                  </div>
                              </div>

                              {selectedGear.subStats.length > 0 && (
                                  <div className="mb-4 relative z-10">
                                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Chỉ Số Phụ</div>
                                      <div className="grid grid-cols-2 gap-2">
                                          {selectedGear.subStats.map((s,i) => (
                                              <div key={i} className="text-xs text-zinc-300 bg-white/5 px-2 py-1.5 rounded">
                                                 <span className="text-zinc-500 shrink-0 inline-block w-4 mr-1">•</span>
                                                 {s.type} +{s.value}{s.isPercentage?'%':''}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                              
                              <div className="flex gap-2 mt-auto relative z-10">
                                  {selectedGear.equippedTo === selectedCard.id ? (
                                      <button onClick={() => handleUnequip(selectedGear.slot)} className="flex-1 bg-red-500/20 text-red-400 border border-red-500/50 py-2 rounded font-bold hover:bg-red-500 hover:text-black transition-colors uppercase tracking-widest text-xs">
                                          Tháo ra
                                      </button>
                                  ) : (
                                      <>
                                        <button onClick={() => handleEquip(selectedGear)} className="flex-1 bg-cinematic-gold/20 text-cinematic-gold border border-cinematic-gold/50 py-2 rounded font-bold hover:bg-cinematic-gold hover:text-black transition-colors shadow-[0_0_15px_rgba(255,215,0,0.2)] uppercase tracking-widest text-xs">
                                            Gắn Trang Bị
                                        </button>
                                        {!selectedGear.equippedTo && (
                                            <button onClick={() => sellGear(selectedGear)} className="w-[80px] bg-zinc-800 text-zinc-400 py-2 rounded font-bold hover:bg-red-500 hover:text-white transition-colors text-xs">
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
                     <Icon name="fa-shield-halved text-6xl text-zinc-800 mb-4" />
                     <div className="text-zinc-600 uppercase tracking-widest">Chọn một Đặc Vụ</div>
                  </div>
               )}
            </div>

            {/* RIGHT: Inventory Pool */}
            <div className="w-full md:w-72 border-l border-zinc-800 bg-black/90 flex flex-col shrink-0 relative">
               <div className="p-4 border-b border-zinc-800 font-bold uppercase tracking-widest text-sm text-white flex justify-between items-center bg-black/50">
                   <span>Kho Trang Bị</span>
                   <div className="flex gap-2 items-center">
                       <span className="text-cinematic-gold">{unequippedGears.length}</span>
                       <button onClick={() => setShowCrafting(!showCrafting)} className="bg-cinematic-gold/20 text-cinematic-gold px-2 py-1 rounded text-[10px] hover:bg-cinematic-gold hover:text-black transition-colors">CHẾ TẠO</button>
                   </div>
               </div>

               {showCrafting && (
                  <div className="absolute top-16 left-2 right-2 bg-zinc-900 border border-cinematic-gold/30 p-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50">
                      <div className="flex justify-between items-start mb-3">
                          <h4 className="text-white font-bold text-sm tracking-widest uppercase">Ghép Trang Bị</h4>
                          <button onClick={() => setShowCrafting(false)} className="text-zinc-500 hover:text-white"><Icon name="fa-xmark"/></button>
                      </div>
                      <p className="text-xs text-zinc-400 mb-4">Sử dụng Mảnh Trang Bị (Drop từ Boss) để ghép ngẫu nhiên trang bị.</p>
                      <div className="flex justify-between items-center mb-4 bg-black/50 p-2 rounded">
                          <span className="text-zinc-400 text-xs">Mảnh Trang Bị</span>
                          <span className={`${gearFragments >= 10 ? 'text-cinematic-gold' : 'text-red-400'} font-bold text-sm`}>{gearFragments} / 10</span>
                      </div>
                      <button 
                         onClick={handleCraftGear}
                         className={`w-full py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors ${gearFragments >= 10 ? 'bg-cinematic-gold text-black hover:bg-amber-400' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                      >
                         Ghép Mảnh (10)
                      </button>
                  </div>
               )}

               <div className="flex-1 overflow-y-auto no-scrollbar p-3">
                   <div className="grid grid-cols-2 gap-2">
                       {unequippedGears.map(gear => renderGearCard(gear, false))}
                   </div>
               </div>
            </div>
        </div>
    );
};
