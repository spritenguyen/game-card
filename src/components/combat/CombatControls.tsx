import React from 'react';
import { Icon } from '../ui/Icon';

interface CombatControlsProps {
  inBattle: boolean;
  boss: any;
  isGlobalProcessing: boolean;
  squad: any[];
  opTab: string;
  worldBossState: any;
  combatSpeed: number;
  timeUntilReset: string;
  handleAutoSetup: () => void;
  setCombatSpeed: (val: number | ((prev: number) => number)) => void;
  executeBattle: () => void;
  onAlert: (t: string, m: string) => void;
  updateQuestProgress: (c: string, a: number) => void;
}

export const CombatControls: React.FC<CombatControlsProps> = ({
  inBattle,
  boss,
  isGlobalProcessing,
  squad,
  opTab,
  worldBossState,
  combatSpeed,
  timeUntilReset,
  handleAutoSetup,
  setCombatSpeed,
  executeBattle,
  onAlert,
  updateQuestProgress
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-center items-center py-6 gap-6 relative">
      <button
        onClick={handleAutoSetup}
        disabled={!boss || inBattle || isGlobalProcessing}
        className="group relative px-6 py-4 rounded-xl font-bold tracking-[0.2em] uppercase transition-all bg-zinc-950/80 border border-cinematic-cyan/50 text-white hover:bg-cinematic-cyan/20 ring-1 ring-cinematic-cyan/20 shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] disabled:opacity-50 flex items-center gap-3 text-[10px] overflow-hidden"
      >
         <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(0,243,255,0.2),transparent)] -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000"></div>
        <Icon name="fa-microchip text-xl text-cinematic-cyan group-hover:animate-pulse" className="fa-microchip text-xl text-cinematic-cyan group-hover:animate-pulse" />
        <div className="flex flex-col items-start gap-1">
           <span>AI DEPLOY</span>
           <span className="text-[7px] text-zinc-400 font-mono tracking-widest">Auto Formation</span>
        </div>
      </button>
      
      {/* SPEED TOGGLE */}
      <button
        onClick={() => setCombatSpeed(prev => prev === 1 ? 2 : prev === 2 ? 4 : 1)}
        className="group relative px-4 sm:px-6 py-4 rounded-xl font-bold tracking-[0.2em] uppercase transition-all bg-zinc-950/80 border border-cinematic-gold/50 text-white hover:bg-cinematic-gold/20 ring-1 ring-cinematic-gold/20 shadow-[0_0_15px_rgba(255,215,0,0.2)] hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] flex items-center gap-2 sm:gap-3 text-[10px] overflow-hidden"
      >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,215,0,0.2),transparent)] -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000"></div>
        <Icon className={`fa-forward-fast text-xl ${combatSpeed > 1 ? 'text-yellow-400' : 'text-zinc-500'}`} />
        <div className="flex flex-col items-start gap-1">
           <span className={combatSpeed > 1 ? 'text-yellow-400' : 'text-zinc-400'}>SPEED x{combatSpeed}</span>
           <span className="text-[7px] text-zinc-400 font-mono tracking-widest hidden sm:inline">Toggle Pace</span>
        </div>
      </button>

      <button
        onClick={() => {
          if (opTab === "world_boss" && worldBossState.attemptsToday >= 3) {
             onAlert("Giới hạn", "Đã hết lượt đánh cường địch hôm nay. Hãy trở lại vào ngày mai.");
             return;
          }
          updateQuestProgress('combat', 1);
          executeBattle();
        }}
        disabled={
          !boss ||
          squad.filter((c) => c !== null).length === 0 ||
          inBattle ||
          isGlobalProcessing ||
          (opTab === "world_boss" && worldBossState.attemptsToday >= 3)
        }
        className={`group relative overflow-hidden px-10 sm:px-16 py-4 sm:py-5 rounded-2xl font-bold tracking-[0.3em] uppercase transition-all duration-500 shadow-2xl flex items-center justify-center gap-4 ${
          inBattle 
             ? "bg-zinc-950 border border-red-500/50 text-red-500 ring-1 ring-red-500/30 scale-95" 
             : (opTab === "world_boss" && worldBossState.attemptsToday >= 3) 
                ? "bg-zinc-900 text-zinc-600 border border-zinc-700 cursor-not-allowed" 
                : "bg-red-600/90 border border-red-400 text-white hover:bg-red-500 hover:text-white hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-[0_0_60px_rgba(220,38,38,0.6)]"
        }`}
      >
        {!inBattle && opTab !== "world_boss" && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>}
        
        <Icon  className={`${inBattle ? "fa-spinner fa-spin text-xl sm:text-2xl" : "fa-bolt text-2xl sm:text-3xl drop-shadow-[0_0_10px_currentColor] group-hover:animate-pulse"}`} />
        
        <div className="flex flex-col items-start text-left relative z-10">
           <span className="text-sm sm:text-lg drop-shadow-md">
             {inBattle ? "ENGAGED" : (opTab === "world_boss" && worldBossState.attemptsToday >= 3 ? "SYSTEM LOCKED" : "INITIATE OPs")}
           </span>
           {opTab === "world_boss" && !inBattle && (
               <div className="flex flex-col gap-1 mt-1">
                 <span className="text-[9px] font-mono text-red-200 uppercase tracking-widest font-normal">
                   Remaining: {Math.max(0, 3 - worldBossState.attemptsToday)}/3
                 </span>
                 <span className="text-[9px] font-mono text-cyan-400/80 uppercase tracking-widest font-bold flex items-center gap-1.5">
                   <Icon name="fa-clock-rotate-left text-[8px]" className="fa-clock-rotate-left text-[8px]" />
                   Reset In: {timeUntilReset}
                 </span>
               </div>
           )}
           {(!inBattle && opTab !== "world_boss") && (
               <span className="text-[8px] sm:text-[9px] font-mono mt-0.5 text-zinc-100/70 uppercase tracking-widest font-normal">
                 Authorize Combat Protocol
               </span>
           )}
        </div>
      </button>
    </div>
  );
};
