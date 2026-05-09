import React, { useState } from 'react';
import { Card, AppConfig, PhantasmProgress, Boss } from '../types';
import { Icon } from '../components/ui/Icon';
import { calculateCombatStats } from '../lib/gameLogic';

interface Props {
  cards: Card[];
  squad: (Card | null)[];
  phantasmProgress: PhantasmProgress;
  setPhantasmProgress: React.Dispatch<React.SetStateAction<PhantasmProgress>>;
  onStartCombat: () => void;
  setBattlefieldEnemySquad: (squad: (Boss | null)[]) => void;
  config: AppConfig;
  inventory: Record<string, number>;
  onAlert: (t: string, m: string) => void;
}

export const PhantasmView: React.FC<Props> = ({
  cards,
  squad,
  phantasmProgress,
  setPhantasmProgress,
  onStartCombat,
  setBattlefieldEnemySquad,
  config,
  inventory,
  onAlert
}) => {
  const isEn = config.language === 'en';
  const { floor, cardsHp } = phantasmProgress;

  const handleStartFloor = () => {
    // Check if squad is empty
    if (!squad.some(c => c !== null)) {
      onAlert('Lỗi', isEn ? 'Squad is empty.' : 'Đội hình trống.');
      return;
    }

    // Check if any squad member is dead (HP = 0)
    const hasAlive = squad.some(c => {
      if (!c) return false;
      const hp = cardsHp[c.id];
      if (hp === 0) return false;
      return true;
    });

    if (!hasAlive) {
      onAlert('Lỗi', isEn ? 'All squad members are incapacitated. Reset tower or change squad.' : 'Tất cả thành viên trong đội đều đã gục ngã. Hãy đổi đội hình hoặc reset tháp.');
      return;
    }

    // Generate enemies scaled by floor
    // Higher floor -> higher stats
    const enemySquad: (Boss | null)[] = [null, null, null, null, null, null];
    const numEnemies = Math.min(6, 1 + Math.floor(floor / 5) + Math.floor(Math.random() * 3));
    
    for (let i = 0; i < numEnemies; i++) {
        // Distribute them in slots
        const availableSlots = enemySquad.map((e, idx) => e === null ? idx : null).filter(idx => idx !== null) as number[];
        if (availableSlots.length === 0) break;
        const slot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
        
        const baseHp = 1000 + floor * 200;
        const baseAtk = 100 + floor * 20;

        enemySquad[slot] = {
            id: `phantasm_e_${floor}_${i}`,
            name: `Phantasm Automaton Mk.${floor}`,
            hp: baseHp + Math.floor(Math.random() * baseHp * 0.2),
            maxHp: baseHp + Math.floor(Math.random() * baseHp * 0.2),
            attack: baseAtk,
            speed: 100 + floor * 5,
            faction: 'CyberCore',
            universe: 'Phantasm',
            element: 'Neutral',
            threatLevel: 'Minion',
            reward: 0,
            lore: `A test unit encountered on floor ${floor} of the Phantasm.`,
            visualDescription: `A mechanized minion programmed for combat testing.`,
            imageUrl: 'https://placehold.co/300x300/111/444.png?text=Phantasm'
        };
    }

    setBattlefieldEnemySquad(enemySquad);
    // HACK: combat view reads opTab from active tab logic, normally it's set via some state.
    // Phantasm uses normal 'battlefield' but we need to track it as 'phantasm'.
    // We will pass an event or window setting
    window.localStorage.setItem('cineCurrentCombatMode', 'phantasm');
    window.localStorage.setItem('cineCombatReturnTo', 'phantasm');
    onStartCombat();
  };

  const handleReset = () => {
    setPhantasmProgress({ floor: 1, cardsHp: {} });
    onAlert('Reset', isEn ? 'Tower progress has been reset.' : 'Đã tiến hành thiết lập lại Tháp.');
  };

  return (
    <div className="w-full flex justify-center pb-12 animate-fade-in relative h-full">
      <div className="w-full max-w-5xl flex flex-col gap-6 mt-8 px-4 relative z-10 h-full">
         <div className="flex flex-col mb-4 text-center relative">
             <div className="absolute right-0 top-0 bg-black/60 border border-purple-500/50 px-4 py-2 rounded-xl flex items-center gap-2">
                 <Icon name="fa-gem text-purple-400 animate-pulse" />
                 <div className="flex flex-col text-left">
                     <span className="text-[8px] text-zinc-400 uppercase tracking-widest leading-none">Phantom Core</span>
                     <span className="text-sm text-purple-300 font-bold leading-none mt-1">{inventory['Phantom Core'] || 0}</span>
                 </div>
             </div>
             <Icon name="fa-mountain text-5xl text-purple-500/80 mb-4" />
             <h3 className="text-white text-3xl font-black uppercase tracking-[0.3em] drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">PHANTASM TOWER</h3>
             <p className="text-[10px] sm:text-xs text-purple-400 mt-2 uppercase tracking-widest">{isEn ? 'Endless Rogue-lite Climb' : 'Chế độ Sinh Tồn Bất Tận'}</p>
         </div>

         <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-black/60 border border-purple-900 p-6 rounded-2xl flex flex-col items-center">
                <div className="text-purple-300 font-bold tracking-widest mb-2 uppercase">Current Floor</div>
                <div className="text-6xl text-white font-black drop-shadow-[0_0_20px_purple]">{floor}</div>
                
                <div className="mt-8 mb-4 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                
                <div className="text-xs text-zinc-400 text-center uppercase leading-relaxed max-w-sm mb-6">
                    {isEn ? 'HP is carried over between floors. Dead agents cannot participate until the tower is reset.' : 'Sinh lực được giữ nguyên khi qua màn. Đặc vụ bị hạ gục không thể tham chiến tiếp cho đến khi reset tháp.'}
                </div>

                <div className="flex gap-4 w-full">
                    <button 
                        onClick={handleStartFloor}
                        className="flex-1 bg-purple-900/50 border border-purple-500 text-white font-bold py-4 rounded hover:bg-purple-600 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.3)] tracking-widest uppercase"
                    >
                        {isEn ? 'Ascend' : 'Tiến Lên'}
                    </button>
                    <button 
                        onClick={handleReset}
                        className="w-16 bg-red-900/30 border border-red-500/50 text-red-400 flex items-center justify-center rounded hover:bg-red-600 hover:text-white transition-colors"
                        title="Reset Tower"
                    >
                        <Icon name="fa-rotate-right" />
                    </button>
                </div>
            </div>

            <div className="w-full md:w-80 bg-black/80 border border-purple-900/50 p-6 rounded-2xl">
                <div className="text-purple-400 font-bold text-sm tracking-widest uppercase border-b border-purple-900/50 pb-2 mb-4">Vanguard Squad</div>
                <div className="grid grid-cols-2 gap-2">
                    {squad.map((card, idx) => {
                        if (!card) {
                            return (
                                <div key={idx} className="aspect-[3/4] bg-zinc-900/50 border border-zinc-800 rounded flex items-center justify-center pointer-events-none opacity-50">
                                    <Icon name="fa-user text-zinc-700 text-2xl" />
                                </div>
                            );
                        }

                        const maxHp = calculateCombatStats(card).hp;
                        const currentHp = cardsHp[card.id] !== undefined ? cardsHp[card.id] : maxHp;
                        const hpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
                        const isDead = currentHp <= 0;

                        return (
                            <div key={idx} className="relative aspect-[3/4] rounded overflow-hidden border border-zinc-700 bg-black">
                                <img src={card.imageUrl} className={`w-full h-full object-cover transition-opacity ${isDead ? 'opacity-20 grayscale' : 'opacity-80'}`} alt="" />
                                {isDead && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Icon name="fa-skull text-red-500 text-3xl drop-shadow-[0_0_10px_red]" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/80 flex flex-col gap-1">
                                    <div className="text-[10px] text-white truncate font-bold">{card.name}</div>
                                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${isDead ? 'bg-red-600' : hpPct > 30 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${hpPct}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};
