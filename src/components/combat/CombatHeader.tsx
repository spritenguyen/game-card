import React from 'react';
import { Icon } from '../ui/Icon';
import { device } from '../../lib/device';
import { t } from '../../lib/i18n';

const isMobileEnv = device.isMobile;

interface CombatHeaderProps {
  isLiteMode: boolean;
  toggleLiteMode: () => void;
  displaySquadHp: number;
  squadAtk: number;
  squadDef: number;
  squadRes: number;
  dodgeRate: number;
}

export const CombatHeader: React.FC<CombatHeaderProps> = ({
  isLiteMode,
  toggleLiteMode,
  displaySquadHp,
  squadAtk,
  squadDef,
  squadRes,
  dodgeRate,
}) => {
  return (
    <>
        {/* Tech Grid Background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 19px, #00f3ff 19px, #00f3ff 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #00f3ff 19px, #00f3ff 20px)",
            backgroundSize: "20px 20px",
          }}
        ></div>
        {/* Holographic scanner line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-cinematic-cyan/50 shadow-[0_0_10px_#00f3ff] opacity-50 animate-[scan_6s_ease-in-out_infinite]"></div>

        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 mb-6 relative z-10 border-b border-cinematic-cyan/10 pb-6">
          <div className="flex items-center gap-4 flex-shrink-0 w-full sm:w-auto relative">
            <div className="w-12 h-12 rounded-xl bg-cinematic-cyan/10 border border-cinematic-cyan/30 flex items-center justify-center text-cinematic-cyan shadow-[0_0_20px_rgba(0,243,255,0.2)]">
              <Icon name="fa-satellite-dish text-2xl animate-pulse" className="fa-satellite-dish text-2xl animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-cinematic-cyan tracking-[0.3em] uppercase leading-none">
                  {t('combat.commandCenter')}
                </h2>
                {isMobileEnv && (
                  <button 
                    onClick={toggleLiteMode}
                    className={`self-start sm:self-auto text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                      isLiteMode 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                        : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                     <Icon name={isLiteMode ? "fa-bolt" : "fa-leaf"} className={`${isLiteMode ? "fa-bolt" : "fa-leaf"} mr-1`} />
                     {t('combat.liteMode')} {isLiteMode ? t('combat.on') : t('combat.off')}
                  </button>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-cinematic-cyan/60 font-mono tracking-widest mt-1.5 uppercase drop-shadow-[0_0_5px_rgba(0,243,255,0.3)]">
                {t('combat.techGrid')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-4 bg-zinc-950/60 rounded-2xl p-4 border border-white/5 ring-1 ring-white/5 shadow-inner w-full sm:w-auto">
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1 flex items-center gap-1"><Icon name="fa-heart text-green-500/50" className="fa-heart text-green-500/50" /> HP</span>
              <span className="text-sm font-mono font-bold text-green-400 tabular-nums drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
                {displaySquadHp}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-white/10 hidden sm:block mx-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1 flex items-center gap-1"><Icon name="fa-burst text-orange-500/50" className="fa-burst text-orange-500/50" /> ATK</span>
              <span className="text-sm font-mono font-bold text-orange-400 tabular-nums drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]">
                {squadAtk}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-white/10 hidden sm:block mx-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1 flex items-center gap-1"><Icon name="fa-shield-halved text-slate-400/50" className="fa-shield-halved text-slate-400/50" /> DEF</span>
              <span className="text-sm font-mono font-bold text-slate-400 tabular-nums drop-shadow-[0_0_5px_rgba(148,163,184,0.5)]">
                {squadDef}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-white/10 hidden sm:block mx-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1 flex items-center gap-1"><Icon name="fa-bolt text-purple-400/50" className="fa-bolt text-purple-400/50" /> RES</span>
              <span className="text-sm font-mono font-bold text-purple-400 tabular-nums drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]">
                {squadRes}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-white/10 hidden sm:block mx-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1 flex items-center gap-1"><Icon name="fa-wind text-cinematic-cyan/50" className="fa-wind text-cinematic-cyan/50" /> EVA</span>
              <span className="text-sm font-mono font-bold text-cinematic-cyan tabular-nums drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">
                {dodgeRate}%
              </span>
            </div>
          </div>
        </div>
    </>
  );
};
