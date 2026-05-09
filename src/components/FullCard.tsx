import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './ui/Icon';


import { Card } from '../types';
import { getRankIndex, getFactionInfo, calculateCombatStats, getDismantleValue, getCardRole, calculateUltimateStats, getDismantleDustValue, getRoleIcon, getGeneInfo } from '../lib/gameLogic';
import { AppConfig, ElementType } from '../types';
import { ELEMENTS } from '../lib/constants';
import { generateDialogueFromAI, translateCardWithAI, chatWithAgentFromAI } from '../services/ai';
import { t } from '../lib/i18n';





export const FullCard: React.FC<{
  card: Card;
  isModal?: boolean;
  isLoadingImage?: boolean;
  isSaved?: boolean;
  context?: 'extract' | 'fusion' | 'gallery';
  onSave?: (card: Card) => void;
  onDismantle?: (cardId: string) => void;
  onGenerateAltText?: (cardId: string) => void;
  updateCard?: (card: Card) => void;
  onConfirm?: (msg: string, cb: () => void) => void;
  onAlert?: (title: string, msg: string) => void;
  onError?: (msg: string) => void;
  currency?: number;
  modifyCurrency?: (amt: number) => void;
  config: AppConfig;
}> = ({ card, isModal = false, isLoadingImage = false, isSaved = false, context = 'extract', onSave, onDismantle, onGenerateAltText, updateCard, onConfirm, onAlert, onError, currency, modifyCurrency, config }) => {
  const isUR = getRankIndex(card.cardClass) === 4;
  const facInfo = getFactionInfo(card.faction);
  
  const [activeTab, setActiveTab] = useState<'combat' | 'stats' | 'element' | 'lore' | 'holocomm' | 'wardrobe' | 'mutation'>('combat');
  const [chatInput, setChatInput] = useState('');
  const [isGeneratingHolocomm, setIsGeneratingHolocomm] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
     setActiveTab('combat');
     setIsGeneratingHolocomm(false);
     setChatInput('');
  }, [card.id]);

  const displayCard = card.translations?.[config.language || 'vi'] 
      ? { ...card, ...card.translations[config.language || 'vi'] } 
      : card;

  const resonance = displayCard.resonance || displayCard.affection || 0;
  const resonanceLevel = resonance >= 100 ? 3 : resonance >= 60 ? 2 : resonance >= 30 ? 1 : 0;
  const resonanceProgress = resonance >= 100 ? 100 : resonance >= 60 ? ((resonance - 60) / 40) * 100 : resonance >= 30 ? ((resonance - 30) / 30) * 100 : (resonance / 30) * 100;
  const resonanceNext = resonance >= 100 ? 'MAX' : resonance >= 60 ? 100 : resonance >= 30 ? 60 : 30;

  const getGenderIcon = (g?: string) => {
    if (!g) return <Icon name="fa-user" className="fa-user" />;
    const lower = g.toLowerCase();
    if (lower.includes('nam') || lower === 'male') return <Icon name="fa-mars text-blue-400" className="fa-mars text-blue-400" />;
    if (lower.includes('nữ') || lower === 'female') return <Icon name="fa-venus text-pink-400" className="fa-venus text-pink-400" />;
    return <Icon name="fa-venus-mars text-purple-400" className="fa-venus-mars text-purple-400" />;
  };

    const getMeasurementsDisplay = (measurements: string | undefined) => {
        if (!measurements) return '???';
        const match = measurements.match(/\d{2,3}[-\./]\d{2,3}[-\./]\d{2,3}/);
        if (match) return match[0];
        return '???';
    };

    const getElementVisuals = (element?: string) => {
        if (!element) return ELEMENTS['Neutral'];
        return (ELEMENTS as any)[element] || ELEMENTS['Neutral'];
    };
    const elementVisual = getElementVisuals(displayCard.element);

    const handleTranslate = async () => {
        if (!updateCard || !onConfirm || currency === undefined || !modifyCurrency || !onAlert || !onError) return;
        
        const langTarget = config.language === 'en' ? 'en' : 'vi';
        if (card.translations && card.translations[langTarget]) {
             onError("Hồ sơ ngôn ngữ này đã được tải xuống.");
             return;
        }

        const cost = 50;
        if (currency < cost) {
            onError(`Cần ${cost} DC để tải xuống gói Giải Mã Ngôn Ngữ.`);
            return;
        }

        onConfirm(`Sử dụng ${cost} DC để kích hoạt AI Giải Mã Ngôn Ngữ cho Đặc vụ này? (Mở khóa vĩnh viễn)`, async () => {
             setIsTranslating(true);
             try {
                 const res = await translateCardWithAI(card, langTarget, config);
                 modifyCurrency(-cost);
                 
                 const currentTranslations = card.translations || {};
                 const update = {
                     ...card,
                     translations: {
                         ...currentTranslations,
                         [langTarget]: {
                              lore: res.lore,
                              ultimateMove: res.ultimateMove,
                              passiveSkill: res.passiveSkill,
                              personality: res.personality,
                              occupation: res.occupation,
                              name: res.name,
                              nationality: res.nationality
                         }
                     }
                 };
                 updateCard(update);
                 onAlert("GIẢI MÃ HOÀN TẤT", "Gói ngôn ngữ đã được tải xuống bộ nhớ nhân của Đặc vụ. Nội dung đã được AI dịch thuật thành công.");
             } catch(e: any) {
                 onError(e.message || "Quá trình dịch bị lỗi hoặc bị gián đoạn.");
             } finally {
                 setIsTranslating(false);
             }
        });
    };

  return (
    <div className={`w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col md:flex-row relative group shadow-2xl mx-auto bg-black ${isUR ? 'border-[3px] border-cinematic-cyan/60 shadow-[0_0_40px_rgba(0,243,255,0.3)]' : 'border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.8)]'}`}>
      {/* Decorative inner noise overlay for premium feel */}
      <div className="absolute inset-0 z-50 pointer-events-none opacity-[0.015] mix-blend-overlay noise-overlay"></div>
      
      {/* Image Panel */}
      <div className="relative w-full md:w-1/2 aspect-[4/5] md:aspect-auto md:min-h-[500px] lg:min-h-[600px] bg-[#050505] overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>

          
          {isLoadingImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
              <Icon name="fa-camera-viewfinder animate-spin-slow text-cinematic-gold/50 text-5xl mb-4" className="fa-camera-viewfinder animate-spin-slow text-cinematic-gold/50 text-5xl mb-4" />
              <p className="text-xs text-cinematic-gold mt-2 uppercase tracking-widest text-center px-4 font-mono">{t(config.language || 'vi', 'fullCard.rendering')}</p>
            </div>
          )}

          <img src={card.variants && card.activeSkinIndex !== undefined && card.variants[card.activeSkinIndex] ? card.variants[card.activeSkinIndex] : (card.imageUrl || undefined)} alt={card.altText || card.name} title={card.altText} className={`absolute inset-0 w-full h-full object-cover z-[5] ${isLoadingImage ? 'opacity-30' : 'opacity-100'} transition-opacity duration-500`} crossOrigin="anonymous" />
          
          {/* Rank Core Visuals for High Rank Cards */}
          {getRankIndex(card.cardClass) >= 3 && (
              <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none z-[6]"></div>
          )}
          {getRankIndex(card.cardClass) >= 4 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none animate-pulse-slow">
                  <div className="w-10 h-10 border-2 border-cinematic-cyan/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.8)] backdrop-blur-sm bg-black/30">
                      <Icon name="fa-atom text-cinematic-cyan text-xl" />
                  </div>
                  <span className="text-[8px] font-mono font-bold text-cinematic-cyan mt-1 tracking-widest uppercase shadow-black drop-shadow-md">{t(config.language || 'vi', 'fullCard.originBadge')}</span>
              </div>
          )}
          {getRankIndex(card.cardClass) >= 5 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[6] opacity-30 pointer-events-none">
                  <Icon name="fa-sun text-yellow-500 text-9xl animate-[spin_20s_linear_infinite] blur-md" />
              </div>
          )}

          {/* Badges */}
             <div className="absolute top-4 left-4 z-20 flex gap-2 flex-col sm:flex-row">
             <div className={`text-sm font-bold tracking-widest uppercase ${isUR ? 'bg-gradient-to-r from-cinematic-cyan to-blue-500 text-black border border-cinematic-cyan/50' : 'bg-cinematic-gold text-black'} px-3 py-1 rounded-sm shadow-xl flex items-center justify-center`}><Icon name="fa-crown mr-1.5 hidden sm:block" /> {card.cardClass}</div>
             <div className={`text-xs font-mono font-bold px-2 py-1 rounded-sm border border-white/20 uppercase shadow-xl flex items-center justify-center gap-1.5
                  ${getCardRole(card) === 'Vanguard' ? 'text-blue-200 bg-blue-950/80 border-blue-500/30' : getCardRole(card) === 'Striker' ? 'text-orange-200 bg-orange-950/80 border-orange-500/30' : getCardRole(card) === 'Sniper' ? 'text-yellow-200 bg-yellow-950/80 border-yellow-500/30' : getCardRole(card) === 'Weaver' ? 'text-purple-200 bg-purple-950/80 border-purple-500/30' : getCardRole(card) === 'Support' ? 'text-emerald-200 bg-emerald-950/80 border-emerald-500/30' : 'text-zinc-200 bg-zinc-950/80 border-zinc-500/30'}`}
             >
                <Icon name={getRoleIcon(getCardRole(card))} className={getRoleIcon(getCardRole(card))} /> {getCardRole(card)}
             </div>
          </div>
          <div className="absolute top-4 right-4 z-20">
             <div className={`text-sm font-bold text-white bg-black/50 border ${facInfo.border} w-8 h-8 rounded-full flex items-center justify-center`}><Icon name={facInfo.icon} className={facInfo.color} /></div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end mb-4 sm:mb-0">
             <div className="text-[10px] text-white/60 font-mono bg-black/50 px-2 py-1 rounded "><Icon name="fa-fingerprint" className="fa-fingerprint" /> {card.id.split('-')[0]}</div>
             {isModal && <div className="text-xl font-black text-white/20 uppercase tracking-widest">{card.faction}</div>}
          </div>
      </div>

      {/* Info Panel */}
      <div className="w-full md:w-1/2 p-5 md:p-8 flex flex-col relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
         {/* Decorative Noise & Hexagons */}
         <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
         
         {/* Decorative Icon */}
         <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none transform rotate-12 scale-150 transition-transform duration-1000 group-hover:scale-[1.6]">
            <Icon name={facInfo.icon} className="text-9xl" />
         </div>

         <div className="relative z-10 flex-1 flex flex-col min-h-[300px]">
            {/* Header */}
            <div>
                <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px] uppercase font-mono text-zinc-400 shrink-0">
                    <span className="bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center gap-1">{getGenderIcon(displayCard.gender)} {displayCard.gender || '???'}</span>
                    <span className="bg-white/5 px-2 py-1 rounded border border-white/5"><Icon name="fa-earth-americas mr-1 text-zinc-500" className="fa-earth-americas mr-1 text-zinc-500" /> {displayCard.nationality || 'Cine-Earth'}</span>
                    <span className={`bg-white/5 px-2 py-1 rounded border border-white/5 ${isUR ? 'text-cinematic-cyan/80' : 'text-cinematic-gold/80'}`}><Icon name="fa-galaxy mr-1" className="fa-galaxy mr-1" /> {displayCard.universe || 'Cine-Tech'}</span>
                    {displayCard.element && (
                        <span className={`bg-white/5 px-2 py-1 rounded border border-white/5 ${elementVisual.color} font-bold`}><Icon name={elementVisual.icon} className="mr-1" /> {elementVisual.name}</span>
                    )}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1.5 flex items-center gap-2">
                    <div className="w-6 h-[2px] bg-gradient-to-r from-cinematic-gold to-transparent"></div>
                    <span className="text-zinc-300 font-bold flex items-center gap-1"><Icon name={getRoleIcon(getCardRole(displayCard))} className={getRoleIcon(getCardRole(displayCard))} /> {getCardRole(displayCard)}</span>
                    <span className="opacity-50">|</span>
                    {displayCard.occupation}
                </div>
                <h2 className={`font-serif text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight ${isUR ? 'text-transparent bg-clip-text bg-gradient-to-br from-cinematic-cyan via-white to-blue-500' : 'text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-500'}`}>{displayCard.name}</h2>
                
                {/* Resonance Bar */}
                {isSaved && (
                   <div className="mt-3 bg-zinc-900/50 border border-cinematic-cyan/20 rounded-lg p-2 max-w-sm relative overflow-hidden group">
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,243,255,0.05)_2px,rgba(0,243,255,0.05)_4px)] pointer-events-none z-0"></div>
                      <div className="flex items-center justify-between text-[10px] uppercase font-mono mb-1.5 relative z-10">
                         <span className="text-cinematic-cyan flex items-center gap-1.5 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]"><Icon name="fa-wifi" /> CỘNG HƯỞNG (LV.{resonanceLevel})</span>
                         <span className="text-zinc-500">{Math.floor(resonance)} / {resonanceNext}</span>
                      </div>
                      <div className="h-1.5 bg-black rounded-full overflow-hidden relative z-10">
                         <div className="h-full bg-gradient-to-r from-cinematic-cyan to-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(0,243,255,0.8)]" style={{ width: `${resonanceProgress}%` }}></div>
                      </div>
                   </div>
                )}
            </div>
            
             {/* Navigation Tabs */}
            <div className="mt-5 flex gap-5 border-b border-zinc-800/80 mb-4 shrink-0 overflow-x-auto no-scrollbar scroll-smooth relative">
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
                <button 
                  onClick={() => setActiveTab('combat')}
                  className={`pb-2 text-[10px] sm:text-xs font-mono tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === 'combat' ? 'text-white border-b-2 border-white shadow-[0_8px_rgba(255,255,255,0.8)]' : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'}`}
                >
                  <Icon name="fa-khanda mr-1.5" /> {t(config.language || 'vi', 'fullCard.combat')}
                </button>
                <button 
                  onClick={() => setActiveTab('element')}
                  className={`pb-2 text-[10px] sm:text-xs font-mono tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === 'element' ? 'text-white border-b-2 border-white shadow-[0_8px_rgba(255,255,255,0.8)]' : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'}`}
                >
                  <Icon name="fa-bolt mr-1.5" /> {t(config.language || 'vi', 'fullCard.element')}
                </button>
                <button 
                  onClick={() => setActiveTab('lore')}
                  className={`pb-2 text-[10px] sm:text-xs font-mono tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === 'lore' ? 'text-white border-b-2 border-white shadow-[0_8px_rgba(255,255,255,0.8)]' : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'}`}
                >
                  <Icon name="fa-id-card mr-1.5" /> {t(config.language || 'vi', 'fullCard.lore')}
                </button>
                <button 
                  onClick={() => setActiveTab('holocomm')}
                  className={`pb-2 text-[10px] sm:text-xs font-mono tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === 'holocomm' ? 'text-cinematic-cyan border-b-2 border-cinematic-cyan shadow-[0_8px_rgba(0,243,255,0.8)]' : 'text-zinc-500 hover:text-cinematic-cyan border-b-2 border-transparent'}`}
                >
                  <Icon name="fa-tower-cell mr-1.5" /> Holo-Comm
                </button>
                {displayCard.variants && displayCard.variants.length > 0 && (
                    <button 
                      onClick={() => setActiveTab('wardrobe')}
                      className={`pb-2 text-[10px] sm:text-xs font-mono tracking-[0.2em] uppercase transition-all whitespace-nowrap ${activeTab === 'wardrobe' ? 'text-white border-b-2 border-white shadow-[0_8px_rgba(255,255,255,0.8)]' : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'}`}
                    >
                      <Icon name="fa-shirt mr-1.5" /> {config.language === 'en' ? 'Wardrobe' : 'Tủ Đồ'}
                    </button>
                )}
                {displayCard.genes && displayCard.genes.length > 0 && (
                    <button 
                      onClick={() => setActiveTab('mutation')}
                      className={`pb-2 text-[10px] sm:text-xs font-mono tracking-[0.2em] uppercase transition-all whitespace-nowrap ${activeTab === 'mutation' ? 'text-emerald-400 border-b-2 border-emerald-400 shadow-[0_8px_rgba(52,211,153,0.8)]' : 'text-zinc-500 hover:text-emerald-300/50 border-b-2 border-transparent'}`}
                    >
                      <Icon name="fa-dna mr-1.5" /> {config.language === 'en' ? 'Mutation' : 'Đột Biến'}
                    </button>
                )}
            </div>

            {/* Tab Contents */}
            <div className="relative flex-1 overflow-y-auto pr-2 no-scrollbar min-h-0">
               <AnimatePresence mode="wait">
               {activeTab === 'combat' && (
                  <motion.div 
                      key="combat"
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-4"
                  >
                     <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }} className="bg-green-950/20 border border-green-900/40 p-3 rounded-xl shadow-inner flex flex-col justify-center relative overflow-hidden group/stat">
                            <div className="absolute top-0 right-0 p-2 text-green-500/10 text-4xl group-hover/stat:scale-110 group-hover/stat:text-green-500/20 transition-all"><Icon name="fa-heart" /></div>
                            <span className="text-[9px] text-green-500/70 font-mono uppercase mb-1 z-10 block">{t(config.language || 'vi', 'fullCard.hp')}</span>
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="font-mono text-2xl text-green-400 font-bold z-10 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)] block">{calculateCombatStats(displayCard).hp}</motion.span>
                        </motion.div>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-orange-950/20 border border-orange-900/40 p-3 rounded-xl shadow-inner flex flex-col justify-center relative overflow-hidden group/stat">
                            <div className="absolute top-0 right-0 p-2 text-orange-500/10 text-4xl group-hover/stat:scale-110 group-hover/stat:text-orange-500/20 transition-all"><Icon name="fa-hand-fist" /></div>
                            <span className="text-[9px] text-orange-500/70 font-mono uppercase mb-1 z-10 block">{t(config.language || 'vi', 'fullCard.atk')}</span>
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="font-mono text-2xl text-orange-400 font-bold z-10 drop-shadow-[0_0_5px_rgba(251,146,60,0.5)] block">{calculateCombatStats(displayCard).atk}</motion.span>
                        </motion.div>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }} className="bg-yellow-950/20 border border-yellow-900/40 p-3 rounded-xl shadow-inner flex flex-col justify-center relative overflow-hidden group/stat">
                            <div className="absolute top-0 right-0 p-2 text-yellow-500/10 text-4xl group-hover/stat:scale-110 group-hover/stat:text-yellow-500/20 transition-all"><Icon name="fa-bolt" /></div>
                            <span className="text-[9px] text-yellow-500/70 font-mono uppercase mb-1 z-10 block">{t(config.language || 'vi', 'fullCard.spd')}</span>
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="font-mono text-2xl text-yellow-400 font-bold z-10 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)] block">{calculateCombatStats(displayCard).speed}</motion.span>
                        </motion.div>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-slate-950/20 border border-slate-800/60 p-3 rounded-xl shadow-inner flex flex-col justify-center relative overflow-hidden group/stat">
                            <div className="absolute top-0 right-0 p-2 text-slate-500/10 text-4xl group-hover/stat:scale-110 group-hover/stat:text-slate-500/20 transition-all"><Icon name="fa-shield" /></div>
                            <span className="text-[9px] text-slate-500/70 font-mono uppercase mb-1 z-10 block">{t(config.language || 'vi', 'fullCard.def')}</span>
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="font-mono text-2xl text-slate-300 font-bold z-10 drop-shadow-[0_0_5px_rgba(203,213,225,0.5)] block">{calculateCombatStats(displayCard).def}</motion.span>
                        </motion.div>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25 }} className="bg-indigo-950/20 border border-indigo-900/40 p-3 rounded-xl shadow-inner flex flex-col justify-center relative overflow-hidden group/stat">
                            <div className="absolute top-0 right-0 p-2 text-indigo-500/10 text-4xl group-hover/stat:scale-110 group-hover/stat:text-indigo-500/20 transition-all"><Icon name="fa-shield-halved" /></div>
                            <span className="text-[9px] text-indigo-400/70 font-mono uppercase mb-1 z-10 block">{t(config.language || 'vi', 'fullCard.res')}</span>
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="font-mono text-2xl text-indigo-300 font-bold z-10 drop-shadow-[0_0_5px_rgba(165,180,252,0.5)] block">{calculateCombatStats(displayCard).res}</motion.span>
                        </motion.div>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-zinc-900/20 border border-zinc-800 p-3 rounded-xl shadow-inner flex flex-col justify-center relative overflow-hidden group/stat">
                            <Icon name="fa-sparkles text-zinc-500/20 text-4xl absolute right-2 top-2 group-hover/stat:rotate-12 transition-transform" />
                            <span className="text-[9px] text-cinematic-cyan/70 font-mono uppercase mb-1 z-10 block">{t(config.language || 'vi', 'fullCard.ultimate')}</span>
                            <span className="font-serif text-xs text-zinc-300 z-10 line-clamp-2" title={displayCard.ultimateMove}>{displayCard.ultimateMove || 'N/A'}</span>
                            {calculateUltimateStats(displayCard) && (
                                <div className="mt-2 flex items-center justify-between z-10 border-t border-zinc-800 pt-1.5">
                                    <span className="text-[9px] text-red-400 font-mono flex items-center"><Icon name="fa-fire mr-1" />{calculateUltimateStats(displayCard).power} PWR</span>
                                    <span className="text-[9px] text-yellow-500 font-mono flex items-center"><Icon name="fa-bolt mr-1" />{calculateUltimateStats(displayCard).energyCost} COST</span>
                                </div>
                            )}
                        </motion.div>
                     </div>
                  </motion.div>
               )}

               {activeTab === 'element' && (
                  <motion.div 
                      key="element"
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-4"
                  >
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
                         <h3 className="text-[10px] text-zinc-400 font-mono uppercase mb-3 flex items-center justify-between">
                            <span><Icon name="fa-fire mr-1.5" className="fa-fire mr-1.5" /> {t(config.language || 'vi', 'fullCard.elementalDmg')}</span>
                         </h3>
                         {displayCard.element && displayCard.element !== 'Neutral' ? (
                            <div className="flex items-center gap-3">
                               <div className={`w-12 h-12 rounded-full border bg-black/50 flex items-center justify-center text-2xl ${elementVisual.color} border-${elementVisual.color.split('-')[1]}-500/50 shadow-[0_0_15px_currentColor]`}>
                                  <Icon name={elementVisual.icon} />
                               </div>
                               <div>
                                  <span className="text-xs text-zinc-400 block mb-1">{t(config.language || 'vi', 'fullCard.bonus')}</span>
                                  <span className={`font-mono text-xl font-bold ${elementVisual.color}`}>+{calculateCombatStats(displayCard).elementalDmg[displayCard.element]}</span>
                                  <span className="text-xs text-zinc-500 ml-1">DMG</span>
                               </div>
                            </div>
                         ) : (
                            <div className="text-xs text-zinc-500 italic">{t(config.language || 'vi', 'fullCard.noElementalDmg')}</div>
                         )}
                      </div>

                      <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                         <h3 className="text-[10px] text-zinc-400 font-mono uppercase mb-3"><Icon name="fa-shield-cat mr-1.5" className="fa-shield-cat mr-1.5" /> {t(config.language || 'vi', 'fullCard.elementalRes')}</h3>
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                             {['Fire', 'Water', 'Earth', 'Lightning', 'Wind', 'Neutral'].map(el => {
                                 const ev = (ELEMENTS as any)[el];
                                 const resVal = calculateCombatStats(displayCard).elementalRes[el] || 0;
                                 return (
                                     <div key={el} className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-2 rounded-lg">
                                         <span className={`text-[10px] font-mono flex items-center gap-1.5 ${ev.color}`}><Icon name={ev.icon} /> {ev.name}</span>
                                         <span className="font-mono text-xs text-white font-bold">{resVal}</span>
                                     </div>
                                 );
                             })}
                         </div>
                      </div>
                  </motion.div>
               )}
               {activeTab === 'lore' && (
                  <motion.div 
                      key="lore"
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-4 pb-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-black/40 p-3 rounded-xl border border-zinc-800/40 shadow-inner group/lore relative overflow-hidden">
                            <span className="block text-[9px] text-zinc-500 font-mono uppercase mb-1 flex items-center justify-between">H/W <Icon name="fa-ruler-vertical opacity-30 group-hover/lore:opacity-100 transition-opacity" /></span>
                            {resonanceLevel >= 1 ? (
                                <span className="font-mono text-sm text-zinc-200 whitespace-nowrap">{displayCard.height}cm <span className="text-zinc-600 mx-1">|</span> {displayCard.weight}kg</span>
                            ) : (
                                <div className="absolute inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center text-[10px] text-zinc-500 font-mono uppercase border border-zinc-800">
                                    <Icon name="fa-lock mr-1.5" /> Lv.1 Req
                                </div>
                            )}
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-black/40 p-3 rounded-xl border border-zinc-800/40 min-w-0 flex flex-col justify-center shadow-inner group/lore relative overflow-hidden">
                            <span className="block text-[9px] text-cinematic-gold/70 font-mono uppercase mb-1 flex items-center justify-between">B-W-H <Icon name="fa-tape opacity-30 group-hover/lore:opacity-100 transition-opacity" /></span>
                            {resonanceLevel >= 2 ? (
                                <span className={`font-mono text-sm text-pink-300 block truncate`} title={displayCard.measurements}>
                                    {getMeasurementsDisplay(displayCard.measurements)}
                                </span>
                            ) : (
                                <div className="absolute inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center text-[10px] text-zinc-500 font-mono uppercase border border-zinc-800">
                                    <Icon name="fa-lock mr-1.5" /> Lv.2 Req
                                </div>
                            )}
                        </motion.div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {displayCard.passiveSkill && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-white/5 p-3 rounded-xl border border-white/10 relative overflow-hidden group/passive">
                                <span className={`block text-[10px] ${elementVisual.color || 'text-zinc-400'} font-mono uppercase mb-1.5 flex items-center gap-1.5`}><Icon name={elementVisual.icon} className="group-hover/passive:scale-125 transition-transform" /> Passive Skill</span>
                                <span className={`font-serif text-[13px] text-zinc-300 block leading-relaxed relative z-10`}>{displayCard.passiveSkill}</span>
                            </motion.div>
                        )}
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }} className="bg-cinematic-cyan/5 p-4 rounded-xl border border-cinematic-cyan/20 relative overflow-hidden group/ult">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cinematic-cyan/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover/ult:scale-150 transition-transform duration-500"></div>
                            <span className="block text-[10px] text-cinematic-cyan font-mono uppercase mb-2 flex items-center justify-between gap-1.5">
                                <span className="flex items-center gap-1.5"><Icon name="fa-bolt scale-125 group-hover/ult:animate-pulse" className="fa-bolt scale-125 group-hover/ult:animate-pulse" /> Ultimate Details</span>
                                {displayCard.ultimateLevel && <span className="text-cinematic-cyan/70">Lv.{displayCard.ultimateLevel}</span>}
                            </span>
                            <span className={`font-serif text-sm text-zinc-300 block leading-relaxed relative z-10 ${calculateUltimateStats(displayCard) ? 'mb-4' : ''}`}>{displayCard.ultimateMove || 'Unknown'}</span>
                            {calculateUltimateStats(displayCard) && (
                                <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-cinematic-cyan/10 relative z-10">
                                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                        <span className="text-[8px] text-zinc-500 uppercase font-mono block mb-0.5">Sức mạnh (Power)</span>
                                        <span className="text-xs text-white font-mono font-bold">{calculateUltimateStats(displayCard).power}</span>
                                    </div>
                                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                        <span className="text-[8px] text-zinc-500 uppercase font-mono block mb-0.5">Tiêu hao (Cost)</span>
                                        <span className="text-xs text-yellow-400 font-mono font-bold">{calculateUltimateStats(displayCard).energyCost} MN</span>
                                    </div>
                                    <div className="bg-black/40 p-2 rounded-lg border border-white/5 col-span-2">
                                        <span className="text-[8px] text-zinc-500 uppercase font-mono block mb-0.5">Mô tả (Effect)</span>
                                        <span className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                                            Thi triển tuyệt kỹ {displayCard.element !== 'Neutral' ? `hệ ${displayCard.element} ` : ''}gây sát thương tỷ lệ với <span className="text-cinematic-cyan font-bold">{calculateUltimateStats(displayCard).scaling}</span> cho toàn bộ mục tiêu.
                                        </span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-2 relative">
                        <p className={`text-[13px] text-zinc-400 mb-4 italic border-l-2 ${isUR ? 'border-cinematic-cyan' : 'border-zinc-600'} pl-4 py-1 font-serif leading-relaxed opacity-90`}>"{displayCard.personality}"</p>
                        
                        {resonanceLevel >= 1 ? (
                            <div 
                                className={`text-sm text-zinc-400/90 leading-relaxed font-sans`} 
                                dangerouslySetInnerHTML={{ __html: displayCard.lore?.replace(/\n/g, '<br>') || '' }}
                            />
                        ) : (
                            <div className="h-32 backdrop-blur-sm bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center justify-center flex-col">
                                <Icon name="fa-lock text-2xl text-zinc-600 mb-2" />
                                <span className="text-xs text-zinc-500 font-mono uppercase">Hồ sơ kỹ thuật bị khóa (Yêu cầu Resonance Lv.1)</span>
                            </div>
                        )}
                        
                        {displayCard.altText && resonanceLevel >= 1 && (
                            <div className="mt-4 bg-white/5 p-3 rounded-xl border border-white/10 text-xs text-zinc-500 font-mono italic">
                                <Icon name="fa-universal-access mr-1" /> [Image Alt Text]: {displayCard.altText}
                            </div>
                        )}
                        
                        {/* Translation Button */}
                        {config.language !== undefined && (!card.translations || !card.translations[config.language]) && updateCard && (
                            <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
                                <div className="text-[10px] text-zinc-500 font-mono">
                                    <Icon name="fa-language mr-1" /> Ngôn ngữ bản gốc không khớp.
                                </div>
                                <button
                                    onClick={handleTranslate}
                                    disabled={isTranslating}
                                    className="bg-cinematic-cyan/10 hover:bg-cinematic-cyan/20 border border-cinematic-cyan/30 text-cinematic-cyan px-4 py-2 rounded font-mono text-[10px] uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(0,243,255,0.1)] flex items-center gap-2 group disabled:opacity-50"
                                >
                                    <Icon name="fa-microchip" className={isTranslating ? "animate-spin" : "group-hover:scale-110 transition-transform"} />
                                    {isTranslating ? "Đang giải mã..." : "Giải mã AI (50 DC)"}
                                </button>
                            </div>
                        )}
                    </motion.div>
                  </motion.div>
               )}

               {activeTab === 'holocomm' && (
                  <motion.div 
                      key="holocomm"
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-4 pb-4 h-full"
                  >
                     <div className="bg-black/80 p-4 rounded-xl border border-cinematic-cyan/30 flex flex-col relative overflow-hidden group shadow-[0_0_30px_rgba(0,243,255,0.1)] flex-1 min-h-[350px] max-h-[500px]">
                         {/* Holographic effects */}
                         <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,243,255,0.05)_2px,rgba(0,243,255,0.05)_4px)] pointer-events-none z-0"></div>
                         <div className="w-full h-1 bg-cinematic-cyan/30 absolute top-0 left-0 animate-[slide-down_5s_linear_infinite] shadow-[0_0_15px_rgba(0,243,255,1)] z-0"></div>
                         
                         {/* Header */}
                         <div className="flex items-center justify-between border-b border-cinematic-cyan/20 pb-2 mb-4 relative z-10">
                            <div className="flex items-center gap-2 text-cinematic-cyan font-mono text-[10px] tracking-widest uppercase font-bold">
                               <Icon name="fa-satellite-dish animate-pulse" /> 
                               SECURE COMMS CHANNEL: {displayCard.name.substring(0, 15)}...
                            </div>
                            <div className="text-[9px] text-zinc-500 font-mono">SIGNAL: <span className="text-green-400">STRONG</span></div>
                         </div>
                         
                         {/* Chat History */}
                         <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar pr-2 flex flex-col gap-3 relative z-10">
                             {(displayCard.chatHistory || []).map((msg, idx) => (
                                 <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                     <div className={`max-w-[85%] p-3 rounded-lg text-xs font-mono leading-relaxed relative ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-br-none border border-zinc-700' : 'bg-cinematic-cyan/10 text-cinematic-cyan rounded-bl-none border border-cinematic-cyan/30 shadow-[0_0_10px_rgba(0,243,255,0.1)]'}`}>
                                        {msg.role === 'user' ? (
                                            <div className="flex items-center gap-2 mb-1 justify-end opacity-50 text-[9px]"><Icon name="fa-user-tie" /> COMMANDER</div>
                                        ) : (
                                            <div className="flex items-center gap-2 mb-1 opacity-50 text-[9px]"><Icon name="fa-robot" /> {displayCard.name}</div>
                                        )}
                                        {msg.content}
                                     </div>
                                 </div>
                             ))}
                             {!(displayCard.chatHistory && displayCard.chatHistory.length > 0) && (
                                 <div className="text-center text-zinc-600 text-[10px] font-mono italic my-auto mt-10 uppercase tracking-widest">
                                    <Icon name="fa-comment-slash text-2xl mb-2 opacity-50" /><br/>
                                    Lịch sử trống. Hãy bắt đầu giao tiếp!
                                 </div>
                             )}
                             {isGeneratingHolocomm && (
                                 <div className="flex justify-start">
                                    <div className="max-w-[85%] p-3 rounded-lg text-xs font-mono bg-cinematic-cyan/5 text-cinematic-cyan border border-cinematic-cyan/30 flex items-center gap-2">
                                       <Icon name="fa-circle-notch animate-spin" /> Đang mã hóa tín hiệu...
                                    </div>
                                 </div>
                             )}
                         </div>

                         {/* Input Area */}
                         <div className="relative z-10 flex gap-2 shrink-0">
                             <input 
                                type="text"
                                placeholder={isSaved ? "Nhập chỉ thị hoặc câu hỏi..." : "Cần Thu thập đặc vụ để mở khóa Comms."}
                                disabled={!isSaved || isGeneratingHolocomm}
                                className="flex-1 bg-black/80 border border-cinematic-cyan/30 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cinematic-cyan focus:shadow-[0_0_10px_rgba(0,243,255,0.3)] disabled:opacity-50"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && chatInput.trim() && !isGeneratingHolocomm && isSaved) {
                                        setIsGeneratingHolocomm(true);
                                        const userMsg = chatInput.trim();
                                        setChatInput('');
                                        
                                        const currentHistory = displayCard.chatHistory || [];
                                        const newHistory = [...currentHistory, { role: 'user', content: userMsg }] as Array<{ role: 'user' | 'assistant', content: string }>;
                                        
                                        if (updateCard) {
                                           updateCard({ ...displayCard, chatHistory: newHistory });
                                        }

                                        try {
                                           const { reply, isBounty, bountyData } = await chatWithAgentFromAI(displayCard, newHistory, config);
                                           let finalReply = reply;
                                           if (isBounty && bountyData) {
                                               finalReply += `\n\n[FILE ĐÍNH KÈM: NHIỆM VỤ ĐỘNG]\nMục tiêu: ${bountyData.name}\nĐộ nguy hiểm: ${bountyData.threatLevel}\nHP dự kiến: ${bountyData.hp}\nATK dự kiến: ${bountyData.attack}\n(Cảnh báo: Tính năng nhận Bounties dạng tin nhắn đang được triển khai trên Global Map)`;
                                           }
                                           const updatedHistory2 = [...newHistory, { role: 'assistant', content: finalReply }] as Array<{ role: 'user' | 'assistant', content: string }>;
                                           
                                           // Increase Resonance
                                           let currentRes = displayCard.resonance || displayCard.affection || 0;
                                           currentRes = Math.min(999, currentRes + 2); // +2 Resonance per chat
                                           
                                           if (updateCard) {
                                              updateCard({ ...displayCard, chatHistory: updatedHistory2, resonance: currentRes });
                                           }
                                        } catch(err) {
                                           const updatedHistory2 = [...newHistory, { role: 'assistant', content: "Lỗi đường truyền! Tín hiệu gián đoạn..." }] as Array<{ role: 'user' | 'assistant', content: string }>;
                                           if (updateCard) {
                                              updateCard({ ...displayCard, chatHistory: updatedHistory2 });
                                           }
                                        } finally {
                                           setIsGeneratingHolocomm(false);
                                        }
                                    }
                                }}
                             />
                             <button
                               disabled={!chatInput.trim() || !isSaved || isGeneratingHolocomm}
                               onClick={async () => {
                                  // Same exact logic as enter key
                                  if (chatInput.trim() && !isGeneratingHolocomm && isSaved) {
                                      setIsGeneratingHolocomm(true);
                                      const userMsg = chatInput.trim();
                                      setChatInput('');
                                      
                                      const currentHistory = displayCard.chatHistory || [];
                                      const newHistory = [...currentHistory, { role: 'user', content: userMsg }] as Array<{ role: 'user' | 'assistant', content: string }>;
                                      
                                      if (updateCard) {
                                         updateCard({ ...displayCard, chatHistory: newHistory });
                                      }

                                      try {
                                         const { reply, isBounty, bountyData } = await chatWithAgentFromAI(displayCard, newHistory, config);
                                         let finalReply = reply;
                                         if (isBounty && bountyData) {
                                               finalReply += `\n\n[FILE ĐÍNH KÈM: NHIỆM VỤ ĐỘNG]\nMục tiêu: ${bountyData.name}\nĐộ nguy hiểm: ${bountyData.threatLevel}\nHP dự kiến: ${bountyData.hp}\nATK dự kiến: ${bountyData.attack}\n(Cảnh báo: Tính năng nhận Bounties dạng tin nhắn đang được triển khai trên Global Map)`;
                                         }
                                         const updatedHistory2 = [...newHistory, { role: 'assistant', content: finalReply }] as Array<{ role: 'user' | 'assistant', content: string }>;
                                         
                                         // Increase Resonance
                                         let currentRes = displayCard.resonance || displayCard.affection || 0;
                                         currentRes = Math.min(999, currentRes + 2); // +2 Resonance per chat
                                         
                                         if (updateCard) {
                                            updateCard({ ...displayCard, chatHistory: updatedHistory2, resonance: currentRes });
                                         }
                                      } catch(err) {
                                         const updatedHistory2 = [...newHistory, { role: 'assistant', content: "Lỗi đường truyền! Tín hiệu gián đoạn..." }] as Array<{ role: 'user' | 'assistant', content: string }>;
                                         if (updateCard) {
                                            updateCard({ ...displayCard, chatHistory: updatedHistory2 });
                                         }
                                      } finally {
                                         setIsGeneratingHolocomm(false);
                                      }
                                  }
                               }}
                               className="bg-cinematic-cyan/20 text-cinematic-cyan border border-cinematic-cyan/50 hover:bg-cinematic-cyan hover:text-black transition-colors rounded-lg px-4 flex items-center justify-center shadow-[0_0_10px_rgba(0,243,255,0.2)] disabled:opacity-50 disabled:hover:bg-cinematic-cyan/20 disabled:hover:text-cinematic-cyan"
                             >
                                <Icon name="fa-paper-plane" />
                             </button>
                         </div>
                     </div>
                  </motion.div>
               )}

               {activeTab === 'wardrobe' && displayCard.variants && (
                  <motion.div 
                      key="wardrobe"
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-4 pb-4 h-full"
                  >
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto no-scrollbar pt-2">
                         {displayCard.variants.map((v, i) => (
                             <div 
                                key={i}
                                className={`relative rounded-xl border overflow-hidden aspect-[2/3] cursor-pointer group ${displayCard.activeSkinIndex === i || (i === 0 && displayCard.activeSkinIndex === undefined) ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'border-white/10 hover:border-pink-400/50'}`}
                             >
                                 <img src={v} className="absolute inset-0 w-full h-full object-cover" />
                                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col sm:flex-row items-center justify-center gap-2">
                                     <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (updateCard) {
                                                updateCard({ ...card, activeSkinIndex: i });
                                            }
                                        }}
                                        className="bg-pink-500 hover:bg-pink-400 text-white font-mono text-[10px] px-3 py-1.5 rounded-lg shadow-lg pointer-events-auto"
                                     >
                                         Equip
                                     </button>
                                     {displayCard.variants.length > 1 && onConfirm && (
                                     <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (updateCard && displayCard.variants) {
                                                onConfirm(config.language === 'en' ? 'Delete this skin? This action cannot be undone.' : 'Xóa giao diện (Skin) này? Không thể hoàn tác.', () => {
                                                    const newVariants = [...displayCard.variants!];
                                                    newVariants.splice(i, 1);
                                                    const newIndex = displayCard.activeSkinIndex === i ? 0 : (displayCard.activeSkinIndex && displayCard.activeSkinIndex > i ? displayCard.activeSkinIndex - 1 : displayCard.activeSkinIndex);
                                                    updateCard({ ...card, variants: newVariants, activeSkinIndex: newIndex });
                                                });
                                            }
                                        }}
                                        className="bg-red-500 hover:bg-red-400 text-white font-mono text-[10px] px-3 py-1.5 rounded-lg shadow-lg pointer-events-auto"
                                     >
                                         <Icon name="fa-trash text-xs" />
                                     </button>
                                     )}
                                 </div>
                                 {(displayCard.activeSkinIndex === i || (i === 0 && displayCard.activeSkinIndex === undefined)) && (
                                     <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                                         <Icon name="fa-check text-xs" />
                                     </div>
                                 )}
                             </div>
                         ))}
                      </div>
                  </motion.div>
               )}

               {activeTab === 'mutation' && displayCard.genes && (
                  <motion.div 
                      key="mutation"
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-4 pb-4"
                  >
                      <h4 className="text-emerald-400 font-mono text-sm uppercase tracking-widest border-b border-emerald-900/50 pb-2 flex items-center gap-2">
                         <Icon name="fa-dna" /> THÔNG TIN ĐỘT BIẾN
                      </h4>
                      <div className="flex flex-col gap-3">
                          {displayCard.genes.map((g, i) => {
                              const info = getGeneInfo(g);
                              return (
                                  <div key={i} className="bg-gradient-to-r from-emerald-950/30 to-black/50 border border-emerald-900/40 rounded-lg p-3 flex gap-4 items-center ring-1 ring-white/5">
                                      <div className={`w-10 h-10 rounded-lg bg-black/60 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)] ${info.color}`}>
                                          <Icon name={`${info.icon} text-xl`} />
                                      </div>
                                      <div className="flex-1">
                                          <h5 className={`font-bold uppercase tracking-widest text-xs mb-1 ${info.color}`}>{info.name}</h5>
                                          <p className="text-[10px] text-zinc-400 leading-relaxed font-serif">{info.desc}</p>
                                      </div>
                                      <div className="shrink-0 text-center">
                                          <span className="bg-emerald-900/40 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider">SLOT {i+1}</span>
                                      </div>
                                  </div>
                              );
                          })}
                          {displayCard.genes.length === 0 && (
                              <p className="text-zinc-500 text-xs italic font-mono text-center py-8">Chưa ghi nhận đột biến.</p>
                          )}
                      </div>
                  </motion.div>
               )}
               </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 transition-all bg-black/20 rounded-xl px-4 py-3 -mx-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono text-center sm:text-left flex items-center gap-3">
                    <Icon name="fa-dna text-2xl opacity-20 text-cinematic-cyan" className="fa-dna text-2xl opacity-20 text-cinematic-cyan" />
                    <div>
                        <span className="opacity-60 text-[8px] block leading-tight">ORIGIN: {displayCard.origin?.toUpperCase() || 'EXTRACTED'}</span>
                        <span className="opacity-60 block mt-0.5">Blueprint DNA:</span>
                        <span className="text-zinc-300 font-bold block truncate max-w-[150px]" title={displayCard.inspiredBy}>{displayCard.inspiredBy}</span>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center sm:justify-end w-full sm:w-auto">
                    {!isSaved && !isLoadingImage && context === 'extract' && onSave && (
                        <button onClick={() => onSave(card)} className="bg-white text-black font-bold px-6 py-2.5 rounded-lg text-[10px] tracking-widest uppercase hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10 hover:shadow-white/20 active:scale-95 duration-200"><Icon name="fa-check" className="fa-check" /> Tiếp Tục</button>
                    )}
                    
                    {isModal && isSaved && !isLoadingImage && (
                        <>
                            {onGenerateAltText && !displayCard.altText && (
                                <button onClick={() => onGenerateAltText(card.id)} disabled={isLoadingImage} className="bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 hover:bg-emerald-900/40 hover:border-emerald-500/50 px-3 py-2.5 rounded-lg text-[10px] tracking-widest uppercase disabled:opacity-50 transition-colors shadow-inner flex items-center gap-1.5" title="Generate Alt Text">
                                    <Icon name="fa-universal-access" className="fa-universal-access" /> Alt
                                </button>
                            )}
                            {onDismantle && (
                                <button onClick={() => onDismantle(card.id)} className="bg-red-950/20 text-red-400 border border-red-900/30 hover:bg-red-900/60 hover:border-red-500/50 px-4 py-2.5 rounded-lg text-[10px] tracking-widest uppercase transition-all shadow-inner flex flex-col items-center justify-center gap-0.5" title="Dismantle">
                                    <div className="flex items-center gap-1 font-bold text-[11px]"><Icon name="fa-recycle" className="fa-recycle" /> +{getDismantleValue(card.cardClass)} DC</div>
                                    {getRankIndex(card.cardClass) >= 2 ? (
                                        <div className="text-[8px] text-cinematic-gold/80 font-mono tracking-tighter animate-pulse"><Icon name="fa-sparkles text-[6px]" className="fa-sparkles text-[6px]" /> RNG Bonus</div>
                                    ) : (
                                        getDismantleDustValue(card.cardClass) > 0 && <div className="text-[8px] text-purple-400/80 font-mono tracking-tighter">+{getDismantleDustValue(card.cardClass)} Dust</div>
                                    )}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};
