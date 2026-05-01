import React, { useState } from 'react';
import { Card } from '../types';
import { getRankIndex, getFactionInfo, calculateCombatStats, getDismantleValue } from '../lib/gameLogic';
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
  config: AppConfig;
}> = ({ card, isModal = false, isLoadingImage = false, isSaved = false, context = 'extract', isReshooting = false, onSave, onReshoot, onDismantle, onTranslate, config }) => {
  const isUR = getRankIndex(card.cardClass) === 4;
  const facInfo = getFactionInfo(card.faction);
  
  const [expandedLore, setExpandedLore] = useState(!isModal);

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

          <img src={card.imageUrl || undefined} alt={card.name} className={`absolute inset-0 w-full h-full object-cover z-[5] ${isLoadingImage || isReshooting ? 'opacity-30' : 'opacity-100'} transition-opacity duration-500`} crossOrigin="anonymous" />

          {/* Badges */}
          <div className="absolute top-4 left-4 z-20 flex gap-2">
             <div className={`text-sm font-bold tracking-widest uppercase ${isUR ? 'bg-cinematic-cyan text-black' : 'bg-cinematic-gold text-black'} px-3 py-1 rounded-sm shadow-xl`}>{card.cardClass}</div>
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
                    {displayCard.occupation}
                </div>
                <h2 className={`font-serif text-3xl md:text-4xl font-bold leading-tight drop-shadow-md ${isUR ? 'text-transparent bg-clip-text bg-gradient-to-r from-cinematic-cyan to-blue-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400'}`}>{displayCard.name}</h2>
            </div>
            
            {/* Compact Stats Grid */}
            <div className="mt-4 pb-4 border-b border-zinc-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                <div className="shrink-0 flex items-center gap-2">
                    <div className="bg-green-950/20 border border-green-900/30 px-2.5 py-1.5 rounded-lg flex items-center gap-2 shadow-inner" title="Sức bền (Health Points)">
                        <i className="fa-solid fa-heart text-green-500/70 text-base drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"></i>
                        <div>
                            <span className="block text-[7px] text-green-500/50 font-mono uppercase leading-none mb-0.5">HP</span>
                            <span className="font-mono text-lg text-green-400 leading-none font-bold">{calculateCombatStats(displayCard).hp}</span>
                        </div>
                    </div>
                    <div className="bg-orange-950/20 border border-orange-900/30 px-2.5 py-1.5 rounded-lg flex items-center gap-2 shadow-inner" title="Hỏa lực (Attack Points)">
                        <i className="fa-solid fa-burst text-orange-500/70 text-base drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"></i>
                        <div>
                            <span className="block text-[7px] text-orange-500/50 font-mono uppercase leading-none mb-0.5">ATK</span>
                            <span className="font-mono text-lg text-orange-400 leading-none font-bold">{calculateCombatStats(displayCard).atk}</span>
                        </div>
                    </div>
                </div>
                <div className="w-full sm:text-right border-t border-zinc-800/50 pt-2 sm:border-t-0 sm:pt-0 min-w-0 flex flex-col justify-center">
                    <span className="block text-[9px] text-cinematic-cyan/70 font-mono uppercase mb-0.5 tracking-wider"><i className="fa-solid fa-sparkles mr-1"></i> Ultimate</span>
                    <span className={`font-serif text-xs text-zinc-300 truncate block opacity-80`} title={displayCard.ultimateMove}>{displayCard.ultimateMove || 'N/A'}</span>
                </div>
            </div>

            {/* Toggleable Details Area */}
            <div className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-in-out ${expandedLore ? 'grid-rows-[1fr] mt-5 opacity-100' : 'grid-rows-[0fr] mt-0 opacity-0'}`}>
                <div className="overflow-hidden flex flex-col gap-5">
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
                            <span className={`font-serif text-sm text-zinc-300 block leading-relaxed relative z-10`}>{displayCard.ultimateMove || 'Unknown'}</span>
                        </div>
                    </div>

                    <div className="mb-2">
                        <p className={`text-[13px] text-zinc-400 mb-4 italic border-l-2 ${isUR ? 'border-cinematic-cyan' : 'border-zinc-600'} pl-4 py-1 font-serif leading-relaxed opacity-90`}>"{displayCard.personality}"</p>
                        <div 
                            className={`text-sm text-zinc-400/90 leading-relaxed font-sans`} 
                            dangerouslySetInnerHTML={{ __html: displayCard.lore?.replace(/\n/g, '<br>') || '' }}
                        />
                    </div>
                </div>
            </div>

            <button 
               onClick={() => setExpandedLore(!expandedLore)}
               className="w-full mt-4 mb-5 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-mono tracking-widest uppercase rounded-lg flex items-center justify-center gap-2 transition-all border border-white/5 shrink-0"
            >
               {expandedLore ? <><i className="fa-solid fa-chevron-up"></i> Tắt Hồ Sơ</> : <><i className="fa-solid fa-chevron-down"></i> Bộ Hồ Sơ Chi Tiết</>}
            </button>

            {/* Actions */}
            <div className="mt-auto pt-5 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
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
                        <button onClick={() => onSave(card)} className="bg-white text-black font-bold px-6 py-2.5 rounded-lg text-xs tracking-widest uppercase hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10 hover:shadow-white/20 active:scale-95 duration-200">Save Data</button>
                    )}
                    
                    {isModal && isSaved && !isLoadingImage && (
                        <>
                            {needsTranslation && onTranslate && (
                               <button onClick={() => onTranslate(card.id)} className="bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-900/60 px-4 py-2.5 rounded-lg flex items-center justify-center transition-colors shadow-inner" title="Translate"><i className="fa-solid fa-language text-lg"></i></button>
                            )}
                            {onReshoot && (
                                <button onClick={() => onReshoot(card.id)} disabled={isReshooting} className="bg-zinc-800/80 text-white border border-zinc-700 hover:bg-zinc-700 px-5 py-2.5 rounded-lg text-[10px] tracking-widest uppercase disabled:opacity-50 flex items-center gap-2 font-bold transition-colors active:scale-95 duration-200 shadow-inner"><i className={`fa-solid fa-camera ${isReshooting ? 'animate-pulse text-cinematic-cyan' : ''}`}></i> {isReshooting ? 'Wait...' : 'Reshoot'}</button>
                            )}
                            {onDismantle && (
                                <button onClick={() => onDismantle(card.id)} disabled={isReshooting} className="bg-red-950/20 text-red-400 border border-red-900/30 hover:bg-red-900/40 px-4 py-2.5 rounded-lg text-[10px] tracking-widest uppercase disabled:opacity-50 transition-colors shadow-inner flex items-center gap-2" title="Dismantle">
                                    <i className="fa-solid fa-recycle"></i> +{getDismantleValue(card.cardClass)}
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
