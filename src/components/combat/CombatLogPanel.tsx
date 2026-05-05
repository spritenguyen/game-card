import React, { useEffect, useRef } from "react";
import { Icon } from '../ui/Icon';

interface CombatLogPanelProps {
  logs: React.ReactNode[];
  onClear: () => void;
  inBattle: boolean;
}

export const CombatLogPanel: React.FC<CombatLogPanelProps> = React.memo(({ logs, onClear, inBattle }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={`w-full lg:w-80 shrink-0 flex flex-col gap-4 ${inBattle ? "opacity-100 translate-y-0" : "opacity-60 lg:opacity-100 transition-all duration-500"}`}>
      <div className="flex items-center justify-between border-b border-cinematic-cyan/20 pb-2 relative">
        <div className="absolute -bottom-[1px] left-0 w-1/3 h-[2px] bg-gradient-to-r from-cinematic-cyan to-transparent"></div>
        <div className="text-[10px] font-mono text-cinematic-cyan uppercase tracking-[0.2em] flex items-center">
          <Icon name="fa-satellite-dish mr-2 animate-pulse" className="fa-satellite-dish mr-2" />
          <span className="font-bold">Mission_Log</span> 
          <span className="text-zinc-500 ml-2">(Max 15)</span>
        </div>
        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="text-[9px] font-bold text-zinc-500 hover:text-red-400 font-mono tracking-widest transition-colors flex items-center"
          >
            <Icon name="fa-trash-can mr-1" /> PURGE
          </button>
        )}
      </div>
      <div
        id="battleLog"
        ref={logContainerRef}
        className="relative bg-zinc-950/90 border border-white/5 ring-1 ring-cinematic-cyan/5 rounded-xl p-4 font-mono text-[11px] leading-[1.6] text-zinc-400 shadow-[inset_0_0_40px_rgba(0,243,255,0.02)] h-[200px] lg:h-[450px] overflow-y-auto no-scrollbar scroll-smooth"
      >
        <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-zinc-950/80 to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-zinc-950/80 to-transparent pointer-events-none"></div>
        
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 italic gap-2 text-cinematic-cyan">
            <Icon name="fa-circle-notch animate-spin text-xl" />
            <span>Awaiting telemetry data...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 py-4">
            {logs}
          </div>
        )}
      </div>
    </div>
  );
});

