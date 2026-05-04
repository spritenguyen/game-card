import React from 'react';
import { Card } from '../types';
import { getRankIndex, getFactionInfo, calculateCombatStats, getCardRole } from '../lib/gameLogic';

export const MiniCard: React.FC<{
  card: Card;
  onClickAction?: () => void;
  context?: 'gallery' | 'fusion-selector' | 'squad-selector';
  locked?: boolean;
  selected?: boolean;
  reshooting?: boolean;
}> = ({ card, onClickAction, context = 'gallery', locked = false, selected = false, reshooting = false }) => {
  const isUR = getRankIndex(card.cardClass) === 4;
  const facInfo = getFactionInfo(card.faction);
  const borderGlow = isUR ? 'border-cinematic-cyan shadow-[0_0_15px_rgba(0,243,255,0.3)]' : 'border-white/10';
  const badgeColor = isUR ? 'bg-cinematic-cyan text-black' : 'bg-cinematic-gold text-black';

  const isUnavailable = locked || reshooting;
  let extraClasses = 'cursor-pointer hover:scale-105 hover:-translate-y-2 hover:border-cinematic-gold/60';
  
  if (selected) {
      extraClasses = 'border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)] pointer-events-none scale-[0.98] ring-2 ring-green-400 ring-offset-2 ring-offset-black';
  } else if (isUnavailable) {
    if (reshooting) extraClasses = 'opacity-70 pointer-events-none';
    else extraClasses = 'opacity-40 grayscale pointer-events-none';
  }

  const getGenderIcon = (g?: string) => {
    if (!g) return <i className="fa-solid fa-user"></i>;
    const lower = g.toLowerCase();
    if (lower.includes('nam') || lower === 'male') return <i className="fa-solid fa-mars text-blue-400"></i>;
    if (lower.includes('nữ') || lower === 'female') return <i className="fa-solid fa-venus text-pink-400"></i>;
    return <i className="fa-solid fa-venus-mars text-purple-400"></i>;
  };

  const getElementVisuals = (element?: string) => {
      switch(element) {
          case 'Fire': return { icon: 'fa-fire', color: 'text-red-500' };
          case 'Water': return { icon: 'fa-droplet', color: 'text-blue-400' };
          case 'Wind': return { icon: 'fa-wind', color: 'text-teal-400' };
          case 'Earth': return { icon: 'fa-mountain', color: 'text-green-500' };
          case 'Lightning': return { icon: 'fa-bolt', color: 'text-yellow-400' };
          default: return null;
      }
  };
  const elementVisual = getElementVisuals(card.element);

  return (
    <div
      className={`mini-card bg-cinematic-800 rounded-xl overflow-hidden border ${borderGlow} relative group shadow-lg transition-all ${extraClasses}`}
      onClick={isUnavailable ? undefined : onClickAction}
    >
      <div className="aspect-[2/3] bg-zinc-900 relative">
        {card.imageUrl ? (
          <img src={card.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" loading="lazy" crossOrigin="anonymous" alt={card.name} />
        ) : (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-zinc-900/80">
            <i className="fa-solid fa-image text-2xl sm:text-4xl text-zinc-700 mb-2"></i>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
        
        {/* Top Badges */}
        <div className="absolute top-0 left-0 w-full p-1 sm:p-2 flex justify-between items-start z-10">
            <div className="flex flex-col gap-1 items-start">
               <span className={`text-[8px] sm:text-[9px] font-black ${badgeColor} px-1.5 py-0.5 rounded shadow-sm border border-black/20 tracking-tighter`}>{card.cardClass}</span>
               
               <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-center bg-black/60 w-5 h-5 sm:w-6 sm:h-6 rounded border border-white/10 text-[8px] sm:text-[9px] text-zinc-400 shadow-lg">
                     {getGenderIcon(card.gender)}
                  </div>
                  <div className={`text-[6px] sm:text-[7px] font-mono font-bold px-1 py-0.5 rounded border border-white/10 uppercase shadow-lg text-center truncate tracking-tighter
                     ${getCardRole(card) === 'DPS' ? 'text-orange-400 bg-orange-950/80' : 
                       getCardRole(card) === 'Tanker' ? 'text-blue-400 bg-blue-950/80' : 
                       'text-green-400 bg-green-950/80'}`}
                  >
                     {getCardRole(card)}
                  </div>
               </div>
            </div>
            
            <div className="flex flex-col gap-1 items-end">
                <span className={`text-[8px] sm:text-[9px] bg-black/60 ${facInfo.color} border border-white/20 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full shadow-md `} title={facInfo.name}>
                  <i className={`fa-solid ${facInfo.icon}`}></i>
                </span>
                {elementVisual && (
                    <span className={`text-[7px] sm:text-[8px] bg-black/60 ${elementVisual.color} border border-white/20 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full shadow-md `} title={card.element}>
                      <i className={`fa-solid ${elementVisual.icon}`}></i>
                    </span>
                )}
            </div>
        </div>
        
        {locked && !selected && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 "><i className="fa-solid fa-lock text-3xl text-white/70 "></i></div>
        )}
        {selected && (
          <div className="absolute inset-0 bg-cinematic-cyan/5 border-2 border-cinematic-cyan z-20 pointer-events-none transition-all duration-300">
             <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(34,211,238,0.2)]"></div>
          </div>
        )}
        {reshooting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70  z-30 transition-all">
            <i className="fa-solid fa-camera animate-pulse text-2xl text-cinematic-cyan mb-2"></i>
            <span className="text-[8px] uppercase tracking-widest text-cinematic-cyan font-bold">Đang Reshoot...</span>
          </div>
        )}
        
        {/* Bottom Banner Compact */}
        <div className="absolute bottom-0 left-0 w-full p-1 sm:p-1.5 z-10 bg-gradient-to-t from-black via-black/90 to-transparent pt-4 sm:pt-6">
          <div className="flex items-center justify-between gap-1">
              <div className={`text-[9px] sm:text-[11px] font-serif ${isUR ? 'text-cinematic-cyan' : 'text-white'} font-bold leading-tight line-clamp-1  tracking-tight`}>{card.name}</div>
              {card.ultimateLevel && <div className="text-[6px] sm:text-[7px] text-cinematic-cyan/80 font-mono font-bold bg-black/60 px-1 rounded">Lv.{card.ultimateLevel}</div>}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
             {card.origin === 'Forged' && <i className="fa-solid fa-code-merge text-[6px] sm:text-[7px] text-cinematic-cyan" title="Forged"></i>}
             <div className="text-[6px] sm:text-[7px] text-zinc-500 uppercase tracking-widest truncate">{card.universe || 'CINE-TECH'}</div>
          </div>
          
          {context === 'squad-selector' && (
            <div className="flex gap-1 sm:gap-2 mt-1 pt-1 border-t border-white/5 text-[7px] sm:text-[8px] font-mono">
                <span className="text-green-400 font-bold"><i className="fa-solid fa-heart text-[6px]"></i> {calculateCombatStats(card).hp}</span>
                <span className="text-orange-400 font-bold ml-auto"><i className="fa-solid fa-burst text-[6px]"></i> {calculateCombatStats(card).atk}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
