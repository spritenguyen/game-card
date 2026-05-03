import React, { useState } from 'react';
import { Card } from '../types';
import { getRankIndex, getFactionInfo, calculateCombatStats, getDismantleValue, getCardRole, calculateUltimateStats, getDismantleDustValue } from '../lib/gameLogic';
import { AppConfig, ElementType } from '../types';
import { ELEMENTS } from '../lib/constants';

export const FullCard: React.FC<{
  card: Card;
  isModal?: boolean;
  isLoadingImage?: boolean;
  isSaved?: boolean;
  context?: 'extract' | 'fusion' | 'gallery';
  isReshooting?: boolean;
  onSave?: (card: Card) => void;
  onReshoot?: (cardId: string, overrideModel?: string) => void;
  onDismantle?: (cardId: string) => void;
  onTranslate?: (cardId: string) => void;
  onGenerateAltText?: (cardId: string) => void;
  config: AppConfig;
}> = ({ card, isModal = false, isLoadingImage = false, isSaved = false, context = 'extract', isReshooting = false, onSave, onReshoot, onDismantle, onTranslate, onGenerateAltText, config }) => {
  const isUR = getRankIndex(card.cardClass) === 4;
  const facInfo = getFactionInfo(card.faction);
  
  const [activeTab, setActiveTab] = useState<'combat' | 'element' | 'lore'>('combat');

  const displayCard = card.translations?.[config.language || 'vi'] 
      ? { ...card, ...card.translations[config.language || 'vi'] } 
      : card;
  
  const needsTranslation = (card.language || 'en') !== (config.language || 'vi') && !card.translations?.[config.language || 'vi'];

  const getGenderIcon = (g?: string) => {
    if (!g) return <i className="fa-solid fa-user"></i>;
    const lower = g.toLowerCase();
    if (lower.includes('nam') || lower === 'male') return <i className="fa-solid fa-mars text-blue-400"></i>;
    if (lower.includes('nữ') || lower === 'female') return <i className="fa-solid fa-venus text-pink-400"></i>;
    return <i className="fa-solid fa-venus-mars text-purple-400"></i>;
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

  return (
    <div className={`w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col md:flex-row relative group shadow-2xl mx-auto bg-black ${isUR ? 'border-2 border-cinematic-cyan/50 shadow-[0_0_30px_rgba(0,243,255,0.2)]' : 'border border-white/10'}`}>
      {/* Image Panel */}
      <div className="relative w-full md:w-1/2 aspect-[4/5] md:aspect-auto md:min-h-[500px] lg:min-h-[600px] bg-[#111] overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>

          
          {isLoadingImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
              <i className="fa-solid fa-camera-viewfinder animate-spin-slow text-cinematic-gold/50 text-5xl mb-4"></i>
              <p className="text-xs text-cinematic-gold mt-2 uppercase tracking-widest text-center px-4 font-mono">RENDERING DATA...</p>
            </div>
          )}
          
          {isReshooting && (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
                <i className="fa-solid fa-camera animate-pulse text-white text-5xl mb-4"></i>
                <p className="text-xs text-white mt-2 uppercase tracking-widest text-center px-4 font-mono">RE-RENDERING...</p>
             </div>
          )}

          <img src={card.imageUrl || undefined} alt={card.altText || card.name} title={card.altText} className={`absolute inset-0 w-full h-full object-cover z-[5] ${isLoadingImage || isReshooting ? 'opacity-30' : 'opacity-100'} transition-opacity duration-500`} crossOrigin="anonymous" />

          {/* Badges */}
          <div className="absolute top-4 left-4 z-20 flex gap-2">
             <div className={`text-sm font-bold tracking-widest uppercase ${isUR ? 'bg-cinematic-cyan text-black' : 'bg-cinematic-gold text-black'} px-3 py-1 rounded-sm shadow-xl`}>{card.cardClass}</div>
             <div className={`text-xs font-mono font-bold px-2 py-1 rounded-sm border border-white/20 uppercase shadow-xl flex items-center justify-center
                  ${getCardRole(card) === 'DPS' ? 'text-orange-400 bg-orange-950/80' : 
                    getCardRole(card) === 'Tanker' ? 'text-blue-400 bg-blue-950/80' : 
                    'text-green-400 bg-green-950/80'}`}
             >
                {getCardRole(card)}
             </div>
          </div>
          <div className="absolute top-4 right-4 z-20">
             <div className={`text-sm font-bold text-white bg-black/50 border ${facInfo.border} w-8 h-8 rounded-full flex items-center justify-center`}><i className={`fa-solid ${facInfo.icon} ${facInfo.color}`}></i></div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end mb-4 sm:mb-0">
             <div className="text-[10px] text-white/60 font-mono bg-black/50 px-2 py-1 rounded backdrop-blur-sm"><i className="fa-solid fa-fingerprint"></i> {card.id.split('-')[0]}</div>
             {isModal && <div className="text-xl font-black text-white/20 uppercase tracking-widest">{card.faction}</div>}
          </div>
      </div>

      {/* Info Panel */}
      <div className="w-full md:w-1/2 p-5 md:p-8 flex flex-col relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
         {/* Decorative Noise & Hexagons */}
         <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
         
         {/* Decorative Icon */}
         <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none transform rotate-12 scale-150 transition-transform duration-1000 group-hover:scale-[1.6]">
            <i className={`fa-solid ${facInfo.icon} text-9xl`}></i>
         </div>

         <div className="relative z-10 flex-1 flex flex-col min-h-[300px]">
            {/* Header */}
            <div>
                <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px] uppercase font-mono text-zinc-400 shrink-0">
                    <span className="bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center gap-1">{getGenderIcon(displayCard.gender)} {displayCard.gender || '???'}</span>
                    <span className="bg-white/5 px-2 py-1 rounded border border-white/5"><i className="fa-solid fa-earth-americas mr-1 text-zinc-500"></i> {displayCard.nationality || 'Cine-Earth'}</span>
                    <span className={`bg-white/5 px-2 py-1 rounded border border-white/5 ${isUR ? 'text-cinematic-cyan/80' : 'text-cinematic-gold/80'}`}><i className="fa-solid fa-galaxy mr-1"></i> {displayCard.universe || 'Cine-Tech'}</span>
                    {displayCard.element && (
                        <span className={`bg-white/5 px-2 py-1 rounded border border-white/5 ${elementVisual.color} font-bold`}><i className={`fa-solid ${elementVisual.icon} mr-1`}></i> {elementVisual.name}</span>
                    )}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1.5 flex items-center gap-2">
                    <div className="w-4 h-[1px] bg-zinc-700"></div>
                    <span className="text-zinc-300 font-bold">{getCardRole(displayCard)}</span>
                    <span className="opacity-50">|</span>
                    {displayCard.occupation}
                </div>
                <h2 className={`font-serif text-3xl md:text-4xl font-bold leading-tight drop-shadow-md ${isUR ? 'text-transparent bg-clip-text bg-gradient-to-r from-cinematic-cyan to-blue-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400'}`}>{displayCard.name}</h2>
            </div>
            
            {/* Navigation Tabs */}
            <div className="mt-5 flex gap-4 border-b border-zinc-800/80 mb-4 shrink-0 overflow-x-auto no-scrollbar scroll-smooth">
                <button 
                  onClick={() => setActiveTab('combat')}
                  className={`pb-2 text-[10px] sm:text-xs font-mono tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === 'combat' ? 'text-white border-b-2 border-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'}`}
                >
                  <i className="fa-solid fa-khanda mr-1.5"></i> Thực Chiến
                </button>
                <button 
                  onClick={() => setActiveTab('element')}
                  className={`pb-2 text-[10px] sm:text-xs font-mono tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === 'element' ? 'text-white border-b-2 border-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'}`}
                >
                  <i className="fa-solid fa-bolt mr-1.5"></i> Nguyên Tố
                </button>
                <button 
                  onClick={() => setActiveTab('lore')}
                  className={`pb-2 text-[10px] sm:text-xs font-mono tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === 'lore' ? 'text-white border-b-2 border-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'}`}
                >
                  <i className="fa-solid fa-id-card mr-1.5"></i> Hồ Sơ
                </button>
            </div>

            {/* Tab Contents */}
            <div className="relative flex-1 overflow-y-auto pr-2 no-scrollbar min-h-0">
               {activeTab === 'combat' && (
                  <div className="flex flex-col gap-4 animate-fade-in">
                     <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="bg-green-950/20 border border-green-900/40 p-3 rounded-xl shadow-inner flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 text-green-500/10 text-4xl"><i className="fa-solid fa-heart"></i></div>
                            <span className="text-[9px] text-green-500/70 font-mono uppercase mb-1 z-10">Sức Bền (HP)</span>
                            <span className="font-mono text-2xl text-green-400 font-bold z-10">{calculateCombatStats(displayCard).hp}</span>
                        </div>
                        <div className="bg-orange-950/20 border border-orange-900/40 p-3 rounded-xl shadow-inner flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 text-orange-500/10 text-4xl"><i className="fa-solid fa-hand-fist"></i></div>
                            <span className="text-[9px] text-orange-500/70 font-mono uppercase mb-1 z-10">ST Vật Lý (PATK)</span>
                            <span className="font-mono text-2xl text-orange-400 font-bold z-10">{calculateCombatStats(displayCard).patk}</span>
                        </div>
                        <div className="bg-purple-950/20 border border-purple-900/40 p-3 rounded-xl shadow-inner flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 text-purple-500/10 text-4xl"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
                            <span className="text-[9px] text-purple-500/70 font-mono uppercase mb-1 z-10">ST Phép (MATK)</span>
                            <span className="font-mono text-2xl text-purple-400 font-bold z-10">{calculateCombatStats(displayCard).matk}</span>
                        </div>
                        <div className="bg-slate-950/20 border border-slate-800/60 p-3 rounded-xl shadow-inner flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 text-slate-500/10 text-4xl"><i className="fa-solid fa-shield"></i></div>
                            <span className="text-[9px] text-slate-500/70 font-mono uppercase mb-1 z-10">Chiến Giáp (DEF)</span>
                            <span className="font-mono text-2xl text-slate-300 font-bold z-10">{calculateCombatStats(displayCard).def}</span>
                        </div>
                        <div className="bg-indigo-950/20 border border-indigo-900/40 p-3 rounded-xl shadow-inner flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 text-indigo-500/10 text-4xl"><i className="fa-solid fa-shield-virus"></i></div>
                            <span className="text-[9px] text-indigo-400/70 font-mono uppercase mb-1 z-10">Kháng Phép (MDEF)</span>
                            <span className="font-mono text-2xl text-indigo-300 font-bold z-10">{calculateCombatStats(displayCard).mdef}</span>
                        </div>
                        <div className="bg-zinc-900/20 border border-zinc-800 p-3 rounded-xl shadow-inner flex flex-col justify-center relative overflow-hidden">
                            <i className="fa-solid fa-sparkles text-zinc-500/20 text-4xl absolute right-2 top-2"></i>
                            <span className="text-[9px] text-cinematic-cyan/70 font-mono uppercase mb-1 z-10">Tuyệt Kỹ (Ultimate)</span>
                            <span className="font-serif text-xs text-zinc-300 z-10 line-clamp-2" title={displayCard.ultimateMove}>{displayCard.ultimateMove || 'N/A'}</span>
                            {calculateUltimateStats(displayCard) && (
                                <div className="mt-2 flex items-center justify-between z-10 border-t border-zinc-800 pt-1.5">
                                    <span className="text-[9px] text-red-400 font-mono"><i className="fa-solid fa-fire mr-1"></i>{calculateUltimateStats(displayCard).power} PWR</span>
                                    <span className="text-[9px] text-yellow-500 font-mono"><i className="fa-solid fa-bolt mr-1"></i>{calculateUltimateStats(displayCard).energyCost} COST</span>
                                </div>
                            )}
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'element' && (
                  <div className="flex flex-col gap-4 animate-fade-in">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
                         <h3 className="text-[10px] text-zinc-400 font-mono uppercase mb-3 flex items-center justify-between">
                            <span><i className="fa-solid fa-fire mr-1.5"></i> Sát Thương Nguyên Tố</span>
                         </h3>
                         {displayCard.element && displayCard.element !== 'Neutral' ? (
                            <div className="flex items-center gap-3">
                               <div className={`w-12 h-12 rounded-full border bg-black/50 flex items-center justify-center text-2xl ${elementVisual.color} border-${elementVisual.color.split('-')[1]}-500/50 shadow-[0_0_15px_currentColor]`}>
                                  <i className={`fa-solid ${elementVisual.icon}`}></i>
                               </div>
                               <div>
                                  <span className="text-xs text-zinc-400 block mb-1">Cộng Thêm</span>
                                  <span className={`font-mono text-xl font-bold ${elementVisual.color}`}>+{calculateCombatStats(displayCard).elementalDmg[displayCard.element]}</span>
                                  <span className="text-xs text-zinc-500 ml-1">DMG</span>
                               </div>
                            </div>
                         ) : (
                            <div className="text-xs text-zinc-500 italic">Thẻ bài không có sát thương hệ tự nhiên.</div>
                         )}
                      </div>

                      <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                         <h3 className="text-[10px] text-zinc-400 font-mono uppercase mb-3"><i className="fa-solid fa-shield-cat mr-1.5"></i> Kháng Nguyên Tố</h3>
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                             {['Fire', 'Water', 'Earth', 'Lightning', 'Wind', 'Neutral'].map(el => {
                                 const ev = (ELEMENTS as any)[el];
                                 const resVal = calculateCombatStats(displayCard).elementalRes[el] || 0;
                                 return (
                                     <div key={el} className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-2 rounded-lg">
                                         <span className={`text-[10px] font-mono flex items-center gap-1.5 ${ev.color}`}><i className={`fa-solid ${ev.icon}`}></i> {ev.name}</span>
                                         <span className="font-mono text-xs text-white font-bold">{resVal}</span>
                                     </div>
                                 );
                             })}
                         </div>
                      </div>
                  </div>
               )}

               {activeTab === 'lore' && (
                  <div className="flex flex-col gap-4 animate-fade-in pb-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/40 p-3 rounded-xl border border-zinc-800/40 shadow-inner">
                            <span className="block text-[9px] text-zinc-500 font-mono uppercase mb-1 flex items-center justify-between">H/W <i className="fa-solid fa-ruler-vertical opacity-30"></i></span>
                            <span className="font-mono text-sm text-zinc-200 whitespace-nowrap">{displayCard.height}cm <span className="text-zinc-600 mx-1">|</span> {displayCard.weight}kg</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl border border-zinc-800/40 min-w-0 flex flex-col justify-center shadow-inner">
                            <span className="block text-[9px] text-cinematic-gold/70 font-mono uppercase mb-1 flex items-center justify-between">B-W-H <i className="fa-solid fa-tape opacity-30"></i></span>
                            <span className={`font-mono text-sm text-pink-300 block truncate`} title={displayCard.measurements}>
                                {getMeasurementsDisplay(displayCard.measurements)}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {displayCard.passiveSkill && (
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10 relative overflow-hidden">
                                <span className={`block text-[10px] ${elementVisual.color || 'text-zinc-400'} font-mono uppercase mb-1.5 flex items-center gap-1.5`}><i className={`fa-solid ${elementVisual.icon}`}></i> Passive Skill</span>
                                <span className={`font-serif text-[13px] text-zinc-300 block leading-relaxed relative z-10`}>{displayCard.passiveSkill}</span>
                            </div>
                        )}
                        <div className="bg-cinematic-cyan/5 p-4 rounded-xl border border-cinematic-cyan/20 relative overflow-hidden group/ult">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cinematic-cyan/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                            <span className="block text-[10px] text-cinematic-cyan font-mono uppercase mb-2 flex items-center justify-between gap-1.5">
                                <span className="flex items-center gap-1.5"><i className="fa-solid fa-bolt scale-125"></i> Ultimate Details</span>
                                {displayCard.ultimateLevel && <span className="text-cinematic-cyan/70">Lv.{displayCard.ultimateLevel}</span>}
                            </span>
                            <span className={`font-serif text-sm text-zinc-300 block leading-relaxed relative z-10 ${calculateUltimateStats(displayCard) ? 'mb-4' : ''}`}>{displayCard.ultimateMove || 'Unknown'}</span>
                            {calculateUltimateStats(displayCard) && (
                                <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-cinematic-cyan/10 relative z-10">
                                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                        <span className="text-[8px] text-zinc-500 uppercase font-mono block mb-0.5">Sức mạnh cơ bản (Power)</span>
                                        <span className="text-xs text-white font-mono font-bold">{calculateUltimateStats(displayCard).power}</span>
                                    </div>
                                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                        <span className="text-[8px] text-zinc-500 uppercase font-mono block mb-0.5">Tỉ lệ chuyển đổi (Scaling)</span>
                                        <span className="text-xs text-cinematic-cyan font-mono font-bold">{calculateUltimateStats(displayCard).scaling}</span>
                                    </div>
                                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                        <span className="text-[8px] text-zinc-500 uppercase font-mono block mb-0.5">Thời gian hồi (Cooldown)</span>
                                        <span className="text-xs text-white font-mono font-bold">{calculateUltimateStats(displayCard).cooldown} lượt</span>
                                    </div>
                                    <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                                        <span className="text-[8px] text-zinc-500 uppercase font-mono block mb-0.5">Tiêu hao năng lượng (Cost)</span>
                                        <span className="text-xs text-yellow-400 font-mono font-bold">{calculateUltimateStats(displayCard).energyCost} MN</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-2">
                        <p className={`text-[13px] text-zinc-400 mb-4 italic border-l-2 ${isUR ? 'border-cinematic-cyan' : 'border-zinc-600'} pl-4 py-1 font-serif leading-relaxed opacity-90`}>"{displayCard.personality}"</p>
                        <div 
                            className={`text-sm text-zinc-400/90 leading-relaxed font-sans`} 
                            dangerouslySetInnerHTML={{ __html: displayCard.lore?.replace(/\n/g, '<br>') || '' }}
                        />
                        {displayCard.altText && (
                            <div className="mt-4 bg-white/5 p-3 rounded-xl border border-white/10 text-xs text-zinc-500 font-mono italic">
                                <i className="fa-solid fa-universal-access mr-1"></i> [Image Alt Text]: {displayCard.altText}
                            </div>
                        )}
                    </div>
                  </div>
               )}
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 transition-all">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono text-center sm:text-left flex items-center gap-3">
                    <i className="fa-solid fa-dna text-xl opacity-20"></i>
                    <div>
                        <span className="opacity-60 text-[8px] block leading-tight">ORIGIN: {displayCard.origin?.toUpperCase() || 'EXTRACTED'}</span>
                        <span className="opacity-60 block mt-0.5">Blueprint DNA:</span>
                        <span className="text-zinc-300 font-bold block">{displayCard.inspiredBy}</span>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center sm:justify-end w-full sm:w-auto">
                    {!isSaved && !isLoadingImage && context === 'extract' && onSave && (
                        <button onClick={() => onSave(card)} className="bg-white text-black font-bold px-6 py-2.5 rounded-lg text-[10px] tracking-widest uppercase hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10 hover:shadow-white/20 active:scale-95 duration-200"><i className="fa-solid fa-check"></i> Tiếp Tục</button>
                    )}
                    
                    {isModal && isSaved && !isLoadingImage && (
                        <>
                            {needsTranslation && onTranslate && (
                               <button onClick={() => onTranslate(card.id)} className="bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-900/60 px-4 py-2.5 rounded-lg flex items-center justify-center transition-colors shadow-inner" title="Translate"><i className="fa-solid fa-language text-lg"></i></button>
                            )}
                            {onGenerateAltText && !displayCard.altText && (
                                <button onClick={() => onGenerateAltText(card.id)} disabled={isReshooting || isLoadingImage} className="bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 hover:bg-emerald-900/40 px-3 py-2.5 rounded-lg text-[10px] tracking-widest uppercase disabled:opacity-50 transition-colors shadow-inner flex items-center gap-1.5" title="Generate Alt Text">
                                    <i className="fa-solid fa-universal-access"></i> Alt
                                </button>
                            )}
                            {onReshoot && (
                                <button onClick={() => onReshoot(card.id)} disabled={isReshooting} className="bg-zinc-800/80 text-white border border-zinc-700 hover:bg-zinc-700 px-5 py-2.5 rounded-lg text-[10px] tracking-widest uppercase disabled:opacity-50 flex items-center gap-2 font-bold transition-colors active:scale-95 duration-200 shadow-inner"><i className={`fa-solid fa-camera ${isReshooting ? 'animate-pulse text-cinematic-cyan' : ''}`}></i> {isReshooting ? 'Wait...' : 'Reshoot'}</button>
                            )}
                            {onDismantle && (
                                <button onClick={() => onDismantle(card.id)} disabled={isReshooting} className="bg-red-950/20 text-red-400 border border-red-900/30 hover:bg-red-900/40 px-3 py-2.5 rounded-lg text-[10px] tracking-widest uppercase disabled:opacity-50 transition-colors shadow-inner flex flex-col items-center justify-center gap-0.5" title="Dismantle">
                                    <div className="flex items-center gap-1"><i className="fa-solid fa-recycle"></i> +{getDismantleValue(card.cardClass)}</div>
                                    {getDismantleDustValue(card.cardClass) > 0 && <div className="text-[8px] text-purple-400/80 font-mono tracking-tighter">+{getDismantleDustValue(card.cardClass)} Dust</div>}
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
