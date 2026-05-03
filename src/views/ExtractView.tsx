import React, { useState } from 'react';
import { Card, AppConfig, Inventory } from '../types';
import { FullCard } from '../components/FullCard';
import { generateCardFromAI, generateImageFromAi } from '../services/ai';
import { rollExtractRank } from '../lib/gameLogic';

interface Props {
  config: AppConfig;
  currency: number;
  modifyCurrency: (amount: number) => boolean;
  inventory: Inventory;
  modifyInventory: (baseDiff: number, eliteDiff: number, materialsDiff?: Record<string, number>) => void;
  level: number;
  pityCounter: number;
  updatePity: (p: number) => void;
  onSaveCard: (card: Card) => Promise<void>;
  onError: (msg: string) => void;
  onAlert: (title: string, msg: string) => void;
  updateQuestProgress: (type: string, amount?: number) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (state: boolean) => void;
}

export const ExtractView: React.FC<Props> = ({ config, currency, modifyCurrency, inventory, modifyInventory, level, pityCounter, updatePity, onSaveCard, onError, onAlert, updateQuestProgress, isGlobalProcessing, setGlobalProcessing }) => {
  const [query, setQuery] = useState('');
  const [selectedCore, setSelectedCore] = useState<string>('');
  const [card, setCard] = useState<Card | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const availableCores = Object.keys(inventory.materials || {}).filter(k => k.endsWith(' Core') && inventory.materials[k] > 0);

  const handleExtract = async (type: 'dc' | 'baseTicket' | 'eliteTicket') => {
      if (isGlobalProcessing) return;
      if (!query.trim()) return onError("Vui lòng nhập định danh nguyên mẫu.");
      
      let cost = 0;
      let extractType: 'standard' | 'quick' | 'deep' = 'standard';
      
      if (type === 'dc') {
          if (currency < 200) return onError("Không đủ Data Credits (Yêu cầu 200 DC).");
          cost = 200;
          extractType = 'standard';
      } else if (type === 'baseTicket') {
          if (inventory.baseTickets < 1) return onError("Không đủ Vé Trích Xuất (Base Ticket).");
          if (currency < 500) return onError("Không đủ Data Credits (Yêu cầu thêm 500 DC).");
          cost = 500;
          extractType = 'quick';
      } else if (type === 'eliteTicket') {
          if (inventory.eliteTickets < 1) return onError("Không đủ Vé Đặc Quyền (Elite Ticket).");
          if (currency < 1000) return onError("Không đủ Data Credits (Yêu cầu thêm 1000 DC).");
          cost = 1000;
          extractType = 'deep';
      }

      setGlobalProcessing(true);
      if (cost > 0 && !modifyCurrency(-cost)) { setGlobalProcessing(false); return; }
      if (type === 'baseTicket') modifyInventory(-1, 0);
      if (type === 'eliteTicket') modifyInventory(0, -1);
      if (selectedCore && inventory.materials && inventory.materials[selectedCore] > 0) {
          modifyInventory(0, 0, { [selectedCore]: -1 });
      }

      try {
          // Roll rank
          const rollOut = rollExtractRank(level, pityCounter, extractType);
          const assignedRank = rollOut.rank;
          const newPity = rollOut.newPity;

          const forcedFaction = selectedCore ? selectedCore.replace(' Core', '') : undefined;
          const cardData = await generateCardFromAI(query, assignedRank, config, forcedFaction);
          cardData.id = 'CINE-E-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
          cardData.cardClass = assignedRank;
          
          updatePity(newPity);
          setCard(cardData);
          setIsLoadingImage(true);

          try {
              const imgUrl = await generateImageFromAi(cardData, config);
              cardData.imageUrl = imgUrl;
              setCard({ ...cardData });
          } catch(e) {
              onError("Cảnh báo: Hệ thống Vision bận. Thẻ vẫn được lưu (Nhưng không có ảnh).");
          } finally {
              setIsLoadingImage(false);
              await onSaveCard(cardData);
              updateQuestProgress('extract', 1);
          }

      } catch (e: any) {
          if (cost > 0) modifyCurrency(cost);
          if (type === 'baseTicket') modifyInventory(1, 0);
          if (type === 'eliteTicket') modifyInventory(0, 1);
          if (selectedCore) modifyInventory(0, 0, { [selectedCore]: 1 });
          
          if (e.message === "API_KEY_INVALID") {
              onAlert("Hệ Thống Cine-Tech", "API Key của bạn không hợp lệ. Vui lòng kiểm tra lại trong System Override.");
          } else {
              onError("Lỗi kết nối AI: " + (e.message || e));
          }
      } finally {
          setGlobalProcessing(false);
      }
  };

  const handleSave = async () => {
      setCard(null); // hide after viewing
  };

  return (
    <div className="w-full flex flex-col items-center animate-fade-in pb-12">
      <div className="w-full max-w-3xl mb-8 bg-zinc-950/80 border border-cinematic-cyan/20 ring-1 ring-cinematic-cyan/10 rounded-3xl p-6 sm:p-10 flex flex-col gap-6 sm:gap-8 shadow-[inset_0_0_100px_rgba(0,0,0,0.8),0_0_40px_rgba(0,243,255,0.05)] relative mt-8 backdrop-blur-xl overflow-hidden">
        {/* Background Grid & Scan Line */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 19px, #00f3ff 19px, #00f3ff 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #00f3ff 19px, #00f3ff 20px)", backgroundSize: "20px 20px" }}></div>
        <div className="absolute top-0 left-0 w-full h-[2px] bg-cinematic-cyan/50 shadow-[0_0_10px_#00f3ff] opacity-50 animate-[scan_6s_ease-in-out_infinite]"></div>

        {/* Header section with Pity */}
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-6 border-b border-cinematic-cyan/10 pb-6 relative z-10">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cinematic-cyan/10 border border-cinematic-cyan/30 flex items-center justify-center text-cinematic-cyan shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                    <i className="fa-solid fa-dna text-2xl animate-pulse"></i>
                </div>
                <div>
                    <h2 className="text-xl sm:text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-cinematic-cyan tracking-[0.3em] uppercase leading-none">
                        Clone Vat
                    </h2>
                    <p className="text-[10px] sm:text-xs text-cinematic-cyan/60 font-mono tracking-widest mt-1.5 uppercase drop-shadow-[0_0_5px_rgba(0,243,255,0.3)]">
                        Biometric Extraction Platform
                    </p>
                </div>
            </div>

            {/* Pity Display */}
            <div className="bg-black/60 border border-cinematic-cyan/30 text-cinematic-cyan px-4 py-2 sm:py-3 rounded-xl text-[10px] sm:text-xs font-mono tracking-[0.2em] flex items-center gap-3 shadow-[inset_0_0_15px_rgba(0,0,0,0.5),0_0_15px_rgba(0,243,255,0.1)] uppercase w-full sm:w-auto justify-center">
                <i className="fa-solid fa-crosshairs animate-pulse"></i>
                <span>PITY: <strong className="text-white text-sm">{pityCounter}</strong> / 90</span>
                {pityCounter >= 50 && <span className="text-yellow-400 font-bold ml-1 border-l border-white/20 pl-3">HIGH TIDE</span>}
                {pityCounter >= 89 && <span className="text-purple-400 font-bold ml-1 border-l border-white/20 pl-3 animate-pulse">GUARANTEED SSR+</span>}
            </div>
        </div>

        {/* Query Input */}
        <div className="relative flex-1 flex flex-col mt-2 z-10">
            <div className="absolute top-0 left-0 w-8 h-[1px] bg-cinematic-cyan/50 -translate-y-4"></div>
            <label className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] mb-3 pl-1 flex items-center gap-2"><i className="fa-solid fa-terminal text-zinc-700"></i> Subject Blueprint</label>
            <div className="relative">
                <i className="fa-solid fa-fingerprint absolute left-4 top-1/2 transform -translate-y-1/2 text-cinematic-cyan/50 text-lg"></i>
                <input 
                    type="text" 
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleExtract('dc')}
                    disabled={isGlobalProcessing}
                    className="w-full bg-black/60 text-white rounded-2xl py-4 sm:py-5 pl-14 pr-6 outline-none border border-white/10 ring-1 ring-white/5 focus:border-cinematic-cyan/50 focus:ring-cinematic-cyan/20 focus:shadow-[0_0_30px_rgba(0,243,255,0.1)] transition-all placeholder-zinc-700 disabled:opacity-50 font-sans text-sm sm:text-base tracking-wide" 
                    placeholder="Enter character blueprint (e.g. Jinx, Tifa, 2B...)" 
                />
            </div>
        </div>

        {availableCores.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-black/40 p-4 sm:p-5 rounded-2xl border border-cinematic-gold/10 ring-1 ring-cinematic-gold/5 relative overflow-hidden z-10 shadow-inner">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cinematic-gold/30 shadow-[0_0_10px_rgba(255,184,0,0.5)]"></div>
                <span className="text-[10px] sm:text-xs text-zinc-400 uppercase font-mono tracking-widest pl-3 flex items-center shrink-0">
                    <i className="fa-solid fa-flask-vial text-cinematic-gold mr-2 text-lg"></i> Catalyst:
                </span>
                <div className="relative flex-1 w-full">
                    <select 
                        value={selectedCore}
                        onChange={(e) => setSelectedCore(e.target.value)}
                        disabled={isGlobalProcessing}
                        className="w-full bg-zinc-950/80 text-white text-[10px] sm:text-xs px-4 py-3 rounded-xl border border-white/10 outline-none font-mono transition-colors hover:border-cinematic-gold/30 appearance-none shadow-inner focus:border-cinematic-gold/50"
                    >
                        <option value="">-- No Additives --</option>
                        {availableCores.map(core => (
                            <option key={core} value={core}>{core} (Qty: {inventory.materials[core]})</option>
                        ))}
                    </select>
                    <i className="fa-solid fa-caret-down absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-600 pointer-events-none"></i>
                </div>
                {selectedCore && (
                    <span className="text-[10px] text-cinematic-gold border border-cinematic-gold/30 px-3 py-2 rounded-lg bg-cinematic-gold/5 whitespace-nowrap font-mono shrink-0 shadow-inner tracking-widest uppercase">
                        Bias: {selectedCore.replace(' Core', '')}
                    </span>
                )}
            </div>
        )}
        
        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 z-10">
            <button 
                onClick={() => handleExtract('dc')} 
                disabled={isGlobalProcessing}
                className="bg-zinc-950/60 border border-white/5 hover:border-cinematic-gold/40 text-white p-5 rounded-2xl transition-all hover:bg-cinematic-gold/5 flex flex-col items-center justify-center disabled:opacity-50 relative overflow-hidden group shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] ring-1 ring-white/5"
            >
                <div className="absolute inset-0 bg-gradient-to-t from-cinematic-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center mb-3 border border-white/5 group-hover:border-cinematic-gold/30 group-hover:text-cinematic-gold transition-colors shadow-inner">
                    <i className="fa-solid fa-coins text-xl text-zinc-400 group-hover:text-cinematic-gold transition-colors"></i>
                </div>
                <div className="text-[10px] uppercase font-mono tracking-[0.2em] mb-3 text-zinc-500 group-hover:text-cinematic-gold/80 transition-colors">Standard Extract</div>
                <div className="font-bold flex items-center gap-2 text-sm sm:text-base font-mono bg-black/40 px-4 py-2 rounded-lg border border-white/5 group-hover:border-cinematic-gold/20">
                    <span className="text-cinematic-gold">200 DC</span>
                    {isGlobalProcessing && <i className="fa-solid fa-circle-notch animate-spin text-zinc-500 ml-2"></i>}
                </div>
            </button>
            <button 
                onClick={() => handleExtract('baseTicket')} 
                disabled={isGlobalProcessing || inventory.baseTickets < 1 || currency < 500}
                className="bg-zinc-950/60 border border-white/5 hover:border-cinematic-cyan/40 text-white p-5 rounded-2xl transition-all hover:bg-cinematic-cyan/5 flex flex-col items-center justify-center disabled:opacity-40 disabled:hover:bg-zinc-950/60 disabled:hover:border-white/5 relative overflow-hidden group shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] ring-1 ring-white/5 cursor-pointer disabled:cursor-not-allowed"
            >
                <div className="absolute inset-0 bg-gradient-to-t from-cinematic-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center mb-3 border border-white/5 group-hover:border-cinematic-cyan/30 group-hover:text-cinematic-cyan transition-colors shadow-inner">
                    <i className="fa-solid fa-ticket text-xl text-cinematic-cyan/70 group-hover:text-cinematic-cyan transition-colors"></i>
                </div>
                <div className="text-[10px] uppercase font-mono tracking-[0.2em] mb-3 text-zinc-500 group-hover:text-cinematic-cyan/80 transition-colors">Quick Extract</div>
                
                <div className="font-bold flex flex-col items-center gap-1.5 text-xs sm:text-sm font-mono w-full bg-black/40 p-2 rounded-lg border border-white/5 group-hover:border-cinematic-cyan/20">
                   <div className="flex items-center justify-between w-full px-2">
                       <span className="text-zinc-500 text-[10px] tracking-widest">TICKET</span>
                       <span className="flex items-center gap-1.5 text-cinematic-cyan text-[11px]"><i className="fa-solid fa-ticket"></i> {inventory.baseTickets} <span className="text-zinc-600">/ 1</span></span>
                   </div>
                   <div className="w-full h-[1px] bg-white/5 my-0.5"></div>
                   <div className="flex items-center justify-between w-full px-2">
                       <span className="text-zinc-500 text-[10px] tracking-widest">FEE</span>
                       <span className="text-cinematic-gold text-[11px]">500 DC</span>
                   </div>
                </div>
            </button>
            <button 
                onClick={() => handleExtract('eliteTicket')} 
                disabled={isGlobalProcessing || inventory.eliteTickets < 1 || currency < 1000}
                className="bg-zinc-950/60 border border-white/5 hover:border-purple-500/40 text-white p-5 rounded-2xl transition-all hover:bg-purple-500/5 flex flex-col items-center justify-center disabled:opacity-40 disabled:hover:bg-zinc-950/60 disabled:hover:border-white/5 relative overflow-hidden group shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] ring-1 ring-white/5 cursor-pointer disabled:cursor-not-allowed"
            >
                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center mb-3 border border-white/5 group-hover:border-purple-500/30 group-hover:text-purple-400 transition-colors shadow-inner">
                    <i className="fa-solid fa-star text-xl text-purple-400/70 group-hover:text-purple-400 transition-colors"></i>
                </div>
                <div className="text-[10px] uppercase font-mono tracking-[0.2em] mb-3 text-zinc-500 group-hover:text-purple-400/80 transition-colors flex items-center gap-1.5"><i className="fa-solid fa-shield-halved text-[8px]"></i> Deep Extract</div>
                
                <div className="font-bold flex flex-col items-center gap-1.5 text-xs sm:text-sm font-mono w-full bg-black/40 p-2 rounded-lg border border-white/5 group-hover:border-purple-500/20">
                   <div className="flex items-center justify-between w-full px-2">
                       <span className="text-zinc-500 text-[10px] tracking-widest">TICKET</span>
                       <span className="flex items-center gap-1.5 text-purple-400 text-[11px]"><i className="fa-solid fa-ticket"></i> {inventory.eliteTickets} <span className="text-zinc-600">/ 1</span></span>
                   </div>
                   <div className="w-full h-[1px] bg-white/5 my-0.5"></div>
                   <div className="flex items-center justify-between w-full px-2">
                       <span className="text-zinc-500 text-[10px] tracking-widest">FEE</span>
                       <span className="text-cinematic-gold text-[11px]">1000 DC</span>
                   </div>
                </div>
            </button>
        </div>
      </div>

      {card && (
          <div className="w-full flex justify-center animate-slide-up mb-12">
             <FullCard 
                card={card} 
                isModal={false} 
                isLoadingImage={isLoadingImage} 
                isSaved={false} 
                context="extract" 
                config={config} 
                onSave={handleSave} 
             />
          </div>
      )}
    </div>
  );
};
