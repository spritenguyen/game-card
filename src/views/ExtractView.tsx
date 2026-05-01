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
  modifyInventory: (baseDiff: number, eliteDiff: number) => void;
  level: number;
  pityCounter: number;
  updatePity: (p: number) => void;
  onSaveCard: (card: Card) => Promise<void>;
  onError: (msg: string) => void;
  onAlert: (title: string, msg: string) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (state: boolean) => void;
}

export const ExtractView: React.FC<Props> = ({ config, currency, modifyCurrency, inventory, modifyInventory, level, pityCounter, updatePity, onSaveCard, onError, onAlert, isGlobalProcessing, setGlobalProcessing }) => {
  const [query, setQuery] = useState('');
  const [card, setCard] = useState<Card | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const handleExtract = async (type: 'dc' | 'baseTicket' | 'eliteTicket') => {
      if (isGlobalProcessing) return;
      if (!query.trim()) return onError("Vui lòng nhập định danh nguyên mẫu.");
      
      let cost = 0;
      if (type === 'dc') {
          if (currency < 200) return onError("Không đủ Data Credits (Yêu cầu 200 DC).");
          cost = 200;
      } else if (type === 'baseTicket') {
          if (inventory.baseTickets < 1) return onError("Không đủ Vé Trích Xuất (Base Ticket).");
      } else if (type === 'eliteTicket') {
          if (inventory.eliteTickets < 1) return onError("Không đủ Vé Đặc Quyền (Elite Ticket).");
      }

      setGlobalProcessing(true);
      if (type === 'dc' && !modifyCurrency(-cost)) { setGlobalProcessing(false); return; }
      if (type === 'baseTicket') modifyInventory(-1, 0);
      if (type === 'eliteTicket') modifyInventory(0, -1);

      try {
          // If eliteTicket, minimum rank is SR
          const rollOut = rollExtractRank(level, pityCounter, type === 'eliteTicket');
          const assignedRank = rollOut.rank;
          const newPity = rollOut.newPity;

          const cardData = await generateCardFromAI(query, assignedRank, config);
          cardData.id = 'CINE-E-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
          cardData.cardClass = assignedRank;
          
          updatePity(newPity);
          setCard(cardData);
          setIsLoadingImage(true);

          try {
              const imgUrl = await generateImageFromAi(cardData, config);
              setCard(prev => ({ ...prev!, imageUrl: imgUrl }));
          } catch(e) {
              onError("Cảnh báo: Hệ thống Vision bận. Thẻ vẫn được tạo (Không ảnh).");
          } finally {
              setIsLoadingImage(false);
          }

      } catch (e: any) {
          if (type === 'dc') modifyCurrency(cost);
          if (type === 'baseTicket') modifyInventory(1, 0);
          if (type === 'eliteTicket') modifyInventory(0, 1);
          
          if (e.message === "API_KEY_INVALID") {
              onAlert("Hệ Thống Cine-Tech", "API Key của bạn không hợp lệ. Vui lòng kiểm tra lại trong System Override.");
          } else {
              onError("Lỗi kết nối AI. Đã hoàn tiền.");
          }
      } finally {
          setGlobalProcessing(false);
      }
  };

  const handleSave = async (cardToSave: Card) => {
      await onSaveCard(cardToSave);
      setCard(null); // hide after saving
      onAlert("Hệ Thống Cine-Tech", "Thẻ đã được lưu vào Vault!");
  };

  return (
    <div className="w-full flex flex-col items-center animate-fade-in pb-12">
      <div className="w-full max-w-2xl mb-8 glass-panel rounded-2xl p-4 flex flex-col gap-4 shadow-2xl relative mt-4">
        {/* Pity Display */}
        <div className="absolute -top-3 right-4 bg-cinematic-cyan/20 border border-cinematic-cyan/50 text-cinematic-cyan px-3 py-1 rounded-full text-[10px] font-mono tracking-widest flex items-center gap-1 shadow-lg backdrop-blur-md">
            <i className="fa-solid fa-chart-pie"></i>
            <span>PITY: {pityCounter} / 90</span>
            {pityCounter >= 50 && <span className="ml-1 text-green-400 font-bold">(RISING)</span>}
            {pityCounter >= 89 && <span className="ml-1 text-purple-400 font-bold animate-pulse">(GUARANTEED)</span>}
        </div>

        <div className="relative flex-1 flex flex-col">
            <i className="fa-solid fa-fingerprint absolute left-4 top-1/2 transform -translate-y-1/2 text-cinematic-muted"></i>
            <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleExtract('dc')}
                disabled={isGlobalProcessing}
                className="w-full bg-cinematic-900/80 text-white rounded-xl py-3 sm:py-4 pl-12 pr-4 outline-none border border-white/10 focus:border-cinematic-gold/70 transition-colors placeholder-cinematic-muted/50 disabled:opacity-50" 
                placeholder="Nguyên mẫu (VD: Jinx Arcane, Guts, Tifa...)" 
            />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button 
                onClick={() => handleExtract('dc')} 
                disabled={isGlobalProcessing}
                className="bg-zinc-800 border border-cinematic-gold/30 hover:border-cinematic-gold/80 text-cinematic-gold px-4 py-3 rounded-xl transition-all hover:bg-zinc-700 flex flex-col items-center justify-center disabled:opacity-50 relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-cinematic-gold/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="text-[10px] uppercase font-mono tracking-widest mb-1 text-white/50">Tiêu chuẩn</div>
                <div className="font-bold flex items-center gap-2">200 DC {isGlobalProcessing && <i className="fa-solid fa-circle-notch animate-spin"></i>}</div>
            </button>
            <button 
                onClick={() => handleExtract('baseTicket')} 
                disabled={isGlobalProcessing || inventory.baseTickets < 1}
                className="bg-black/50 border border-cinematic-cyan/30 hover:border-cinematic-cyan text-cinematic-cyan px-4 py-3 rounded-xl transition-all hover:bg-cinematic-cyan/10 flex flex-col items-center justify-center disabled:opacity-50 disabled:hover:bg-black/50"
            >
                <div className="text-[10px] uppercase font-mono tracking-widest mb-1 text-white/50">Trích xuất nhanh</div>
                <div className="font-bold flex items-center gap-2"><i className="fa-solid fa-ticket"></i> {inventory.baseTickets} / 1</div>
            </button>
            <button 
                onClick={() => handleExtract('eliteTicket')} 
                disabled={isGlobalProcessing || inventory.eliteTickets < 1}
                className="bg-black/50 border border-purple-500/30 hover:border-purple-500 text-purple-400 px-4 py-3 rounded-xl transition-all hover:bg-purple-500/10 flex flex-col items-center justify-center disabled:opacity-50"
            >
                <div className="text-[10px] uppercase font-mono tracking-widest mb-1 text-[#d8b4fe]/50 flex items-center gap-1"><i className="fa-solid fa-star text-[8px]"></i> Chuyên Sâu (SR+)</div>
                <div className="font-bold flex items-center gap-2"><i className="fa-solid fa-ticket"></i> {inventory.eliteTickets} / 1</div>
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
