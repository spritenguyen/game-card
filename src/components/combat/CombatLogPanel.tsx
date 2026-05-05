import React, { useEffect, useRef } from "react";

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
    <div className={`w-full lg:w-80 shrink-0 flex flex-col gap-4 ${inBattle ? "opacity-100 translate-y-0" : "opacity-60 lg:opacity-100"}`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
          <i className="fa-solid fa-file-invoice mr-2"></i>Mission_Log (Max 15 Rounds)
        </div>
        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="text-[8px] text-zinc-600 hover:text-red-400"
          >
            CLEAR
          </button>
        )}
      </div>
      <div
        id="battleLog"
        ref={logContainerRef}
        className="bg-zinc-950/80 border border-white/5 rounded-xl p-4 font-mono text-[10px] leading-relaxed text-zinc-500 shadow-inner h-[200px] lg:h-[450px] overflow-y-auto no-scrollbar scroll-smooth"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center opacity-20 italic">
            Waiting for connection...
          </div>
        ) : (
          logs
        )}
      </div>
    </div>
  );
});
