import React, { useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { Card, AppConfig, Inventory } from '../types';
import { FullCard } from '../components/FullCard';
import { generateCardFromAI, generateImageFromAi } from '../services/ai';
import { rollExtractRank } from '../lib/gameLogic';
import { t } from '../lib/i18n';

interface Props {
  config: AppConfig;
  currency: number;
  modifyCurrency: (amount: number) => void;
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
  const [activeExtractType, setActiveExtractType] = useState<'dc' | 'baseTicket' | 'eliteTicket' | null>(null);

  const availableCores = Object.keys(inventory.materials || {}).filter(k => k.endsWith(' Core') && inventory.materials[k] > 0);

  const handleExtract = async (type: 'dc' | 'baseTicket' | 'eliteTicket') => {
      if (isGlobalProcessing) return;
      
      const lang = config.language || 'vi';
      
      if (!query.trim()) return onError(t(lang, 'extract.warnings.noInput'));
      
      let cost = 0;
      let extractType: 'standard' | 'quick' | 'deep' = 'standard';
      
      if (type === 'dc') {
          if (currency < 200) return onError(`${t(lang, 'extract.warnings.noDC')} (200 DC).`);
          cost = 200;
          extractType = 'standard';
      } else if (type === 'baseTicket') {
          if (inventory.baseTickets < 1) return onError(t(lang, 'extract.warnings.noBaseTicket'));
          if (currency < 500) return onError(`${t(lang, 'extract.warnings.noDC')} (500 DC).`);
          cost = 500;
          extractType = 'quick';
      } else if (type === 'eliteTicket') {
          if (inventory.eliteTickets < 1) return onError(t(lang, 'extract.warnings.noEliteTicket'));
          if (currency < 1000) return onError(`${t(lang, 'extract.warnings.noDC')} (1000 DC).`);
          cost = 1000;
          extractType = 'deep';
      }

      setActiveExtractType(type);
      setGlobalProcessing(true);
      
      // Atomic-like check before proceeding
      if (cost > 0 && currency < cost) {
          onError(`${t(lang, 'extract.warnings.noDC')} (${cost} DC).`);
          setGlobalProcessing(false);
          setActiveExtractType(null);
          return;
      }

      // Execute deduction
      if (cost > 0) modifyCurrency(-cost);
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
              onError(t(lang, 'extract.warnings.visionBusy'));
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
              onAlert("Hệ Thống Cine-Tech", t(lang, 'extract.warnings.keyInvalid'));
          } else {
              onError(`${t(lang, 'extract.warnings.aiError')} ` + (e.message || e));
          }
      } finally {
          setGlobalProcessing(false);
          setActiveExtractType(null);
      }
  };

  const handleSave = async () => {
      setCard(null); // hide after viewing
  };

  return (
    <div className="w-full flex flex-col items-center animate-fade-in pb-12 mt-8 px-4 sm:px-6">

        <div className="flex flex-col sm:flex-row md:items-center justify-between gap-6 pb-6 relative z-10 w-full max-w-5xl">
            <header className="border-b-2 border-white/20 pb-4 text-left flex-1 min-w-[200px]">
                 <h1 className="text-3xl sm:text-5xl font-light tracking-[0.2em] font-serif text-white uppercase mb-2">Casting<br/>Call</h1>
                 <p className="text-[10px] sm:text-xs tracking-[0.4em] font-mono text-zinc-500 uppercase">{t(config.language || 'vi', 'extract.subtitle')}</p>
            </header>

            {/* Pity Display Editorial */}
            <div className="flex flex-col items-end shrink-0">
                <div className="text-right">
                    <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500">Pity Rate</span>
                    <h2 className="text-4xl font-serif text-white tracking-widest">{pityCounter}<span className="text-lg text-zinc-500">/90</span></h2>
                </div>
                <div className="flex gap-2 mt-2 font-mono text-[9px] uppercase tracking-[0.3em]">
                   {pityCounter >= 50 && <span className="bg-white/10 px-2 py-1 text-white border border-white/20">{t(config.language || 'vi', 'extract.highTide')}</span>}
                   {pityCounter >= 89 && <span className="bg-white text-black font-bold px-2 py-1 animate-pulse">{t(config.language || 'vi', 'extract.guaranteed')}</span>}
                </div>
            </div>
        </div>

        <div className="w-full max-w-5xl mb-8 flex flex-col lg:flex-row gap-8 relative mt-4">
            
            <div className="flex-1 bg-zinc-950 p-8 sm:p-12 relative overflow-hidden border border-white/10 group">
                {/* Background Grid & Scan Line */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 19px, #fff 19px, #fff 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #fff 19px, #fff 20px)", backgroundSize: "20px 20px" }}></div>
                
                {/* Query Input */}
                <div className="relative flex-1 flex flex-col mb-8 z-10 w-full">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2"><Icon name="fa-terminal text-zinc-600" /> Casting Concept</label>
                    <div className="relative">
                        <Icon name="fa-quote-left absolute left-4 top-4 text-white/20 text-lg" />
                        <textarea 
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleExtract('dc')}
                            disabled={isGlobalProcessing}
                            rows={3}
                            className="w-full bg-transparent text-white py-4 pl-12 pr-6 outline-none border-b border-white/20 focus:border-white transition-all placeholder-zinc-700 disabled:opacity-50 font-serif text-xl sm:text-2xl tracking-wide resize-none" 
                            placeholder={t(config.language || 'vi', 'extract.inputPlaceholder')} 
                        />
                    </div>
                </div>

                {availableCores.length > 0 && (
                    <div className="border border-white/10 rounded-none p-4 mb-8 bg-white/5 flex flex-col sm:flex-row sm:items-center gap-4 relative z-10">
                        <span className="text-[10px] text-white uppercase font-mono tracking-[0.2em] flex items-center shrink-0">
                            <Icon name="fa-flask-vial mr-2 text-lg" /> Catalyst
                        </span>
                        <div className="relative flex-1">
                            <select 
                                value={selectedCore}
                                onChange={(e) => setSelectedCore(e.target.value)}
                                disabled={isGlobalProcessing}
                                className="w-full bg-transparent text-white text-[10px] uppercase font-mono tracking-widest outline-none transition-colors appearance-none cursor-pointer border-b border-transparent focus:border-white/30 pb-1"
                            >
                                <option value="" className="bg-black text-white">{t(config.language || 'vi', 'extract.noAdditive')}</option>
                                {availableCores.map(core => (
                                    <option key={core} value={core} className="bg-black text-white">{core} ({inventory.materials[core]})</option>
                                ))}
                            </select>
                            <Icon name="fa-caret-down absolute right-0 top-1/2 transform -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        </div>
                    </div>
                )}
                
                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 z-10 relative">
                    <button 
                        onClick={() => handleExtract('dc')} 
                        disabled={isGlobalProcessing}
                        className="border border-white/20 hover:border-white text-white p-4 transition-all hover:bg-white hover:text-black flex flex-col items-center justify-center disabled:opacity-50 relative overflow-hidden group cursor-pointer disabled:cursor-not-allowed"
                    >
                        <Icon name="fa-coins text-2xl mb-3" />
                        <div className="text-[9px] uppercase font-mono tracking-[0.3em] mb-2">{t(config.language || 'vi', 'extract.standardExt')}</div>
                        <div className="font-bold flex items-center gap-2 text-xs font-mono">
                            200 DC
                            {(isGlobalProcessing && activeExtractType === 'dc') && <Icon name="fa-circle-notch animate-spin" />}
                        </div>
                    </button>
                    <button 
                        onClick={() => handleExtract('baseTicket')} 
                        disabled={isGlobalProcessing || inventory.baseTickets < 1 || currency < 500}
                        className="bg-white/10 border border-white/20 hover:border-white text-white p-4 transition-all hover:bg-white hover:text-black flex flex-col items-center justify-center disabled:opacity-40 relative overflow-hidden group cursor-pointer disabled:cursor-not-allowed"
                    >
                        <Icon name="fa-ticket text-2xl mb-3" />
                        <div className="text-[9px] uppercase font-mono tracking-[0.3em] mb-2">{t(config.language || 'vi', 'extract.quickExt')}</div>
                        <div className="font-bold flex flex-col items-center gap-1 text-[10px] font-mono">
                           <span>{inventory.baseTickets} TICKETS</span>
                           <span className="opacity-60 text-[9px]">500 DC</span>
                           {(isGlobalProcessing && activeExtractType === 'baseTicket') && <Icon name="fa-circle-notch animate-spin mt-1" />}
                        </div>
                    </button>
                    <button 
                        onClick={() => handleExtract('eliteTicket')} 
                        disabled={isGlobalProcessing || inventory.eliteTickets < 1 || currency < 1000}
                        className="bg-white text-black border border-white hover:bg-zinc-200 p-4 transition-all flex flex-col items-center justify-center disabled:opacity-40 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-800 relative overflow-hidden group cursor-pointer disabled:cursor-not-allowed"
                    >
                        <Icon name="fa-star text-2xl mb-3" />
                        <div className="text-[9px] uppercase font-mono tracking-[0.3em] mb-2 flex items-center gap-1.5"><Icon name="fa-crown text-[8px]" /> {t(config.language || 'vi', 'extract.deepExt')}</div>
                        <div className="font-bold flex flex-col items-center gap-1 text-[10px] font-mono">
                           <span>{inventory.eliteTickets} TICKETS</span>
                           <span className="opacity-60 text-[9px]">1000 DC</span>
                           {(isGlobalProcessing && activeExtractType === 'eliteTicket') && <Icon name="fa-circle-notch animate-spin mt-1" />}
                        </div>
                    </button>
                </div>
            </div>
            
            {/* Right Banner image */}
            <div className="hidden lg:block w-[300px] xl:w-[400px] border border-white/10 relative shrink-0">
                <img src="https://images.unsplash.com/photo-1542345812-d98b8cd6e7d6?w=800&q=80" alt="Editorial Fashion" className="w-full h-full object-cover grayscale opacity-50" />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
                    <Icon name="fa-camera-retro text-4xl mb-4 text-white/50" />
                    <h3 className="font-serif text-3xl uppercase tracking-widest text-white/80">Cine-Tech<br/>Studios</h3>
                    <div className="w-12 h-[1px] bg-white/30 my-4"></div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/50 leading-relaxed">Where high-fashion<br/>meets tactical<br/>supremacy.</p>
                </div>
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
