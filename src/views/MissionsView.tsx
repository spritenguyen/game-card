import React, { useState } from 'react';
import { Card, AppConfig, Quest, Expedition } from '../types';

interface Props {
  quests: Quest[];
  expeditions: Expedition[];
  cards: Card[];
  inventory: any;
  updateQuestProgress: (id: string, amount?: number) => void;
  startExpedition: (expId: string, cardId: string) => void;
  completeExpedition: (expId: string) => void;
  claimExpedition: (expId: string) => void;
  modifyCurrency: (amount: number) => void;
  modifyInventory: (b: number, e: number, m?: Record<string, number>) => void;
  setQuests: React.Dispatch<React.SetStateAction<any[]>>;
  onAlert: (t: string, m: string) => void;
}

export const MissionsView: React.FC<Props> = ({ quests, expeditions, cards, inventory, updateQuestProgress, startExpedition, completeExpedition, claimExpedition, modifyCurrency, modifyInventory, setQuests, onAlert }) => {
    const [subTab, setSubTab] = useState<'quests' | 'expeditions' | 'storage'>('quests');
    const [selectedExp, setSelectedExp] = useState<string | null>(null);
    const [selectedCardId, setSelectedCardId] = useState<string>('');

    const handleClaimQuest = (quest: Quest) => {
        if (!quest.isCompleted || quest.isClaimed) return;
        
        modifyCurrency(quest.rewardDC);
        if (quest.rewardTickets) {
            let b = 0, e = 0;
            quest.rewardTickets.forEach(t => {
                if (t.type === 'base') b += t.amount;
                if (t.type === 'elite') e += t.amount;
            });
            modifyInventory(b, e);
        }

        setQuests(prev => {
            const next = prev.map(q => q.id === quest.id ? { ...q, isClaimed: true } : q);
            localStorage.setItem('cineQuests', JSON.stringify(next));
            return next;
        });

        onAlert("Hoàn thành nhiệm vụ", `Nhận được ${quest.rewardDC} DC!`);
    };

    const handleStartExpedition = (exp: Expedition) => {
        if (!selectedCardId) return onAlert("Lỗi", "Vui lòng chọn thẻ để tiến hành ủy thác!");
        const card = cards.find(c => c.id === selectedCardId);
        if (!card) return;
        
        if (exp.requiredElement && card.element !== exp.requiredElement) return onAlert("Lỗi", `Cần thẻ có Nguyên tố ${exp.requiredElement}`);
        if (exp.requiredFaction && card.faction !== exp.requiredFaction) return onAlert("Lỗi", `Cần thẻ thuộc hệ ${exp.requiredFaction}`);
        
        startExpedition(exp.id, card.id);
        setSelectedExp(null);
    };

    const handleCheckExpedition = (exp: Expedition) => {
        if (exp.status === 'ongoing' && exp.startTime) {
            const now = Date.now();
            const timePassed = now - exp.startTime;
            const targetTime = exp.durationMinutes * 60 * 1000;
            if (timePassed >= targetTime) {
                completeExpedition(exp.id);
                // Also claim
                claimExpedition(exp.id);
                modifyCurrency(exp.rewardDC);
                const matObj: Record<string, number> = {};
                exp.rewardMaterials.forEach(m => matObj[m.item] = m.amount);
                modifyInventory(0, 0, matObj);
                onAlert("Expedition Complete", `Thu về ${exp.rewardDC} DC và Vật phẩm!`);
            } else {
                const leftTimer = Math.ceil((targetTime - timePassed)/1000/60);
                onAlert("Expedition", `Ủy thác vẫn đang diễn ra. Còn ${leftTimer} phút.`);
            }
        }
    }

    return (
        <div className="w-full flex justify-center pb-12 animate-fade-in relative">
            <div className="w-full max-w-6xl flex flex-col gap-6 mt-8 px-4 sm:px-6 relative z-10">
                
                {/* Header Tabs */}
                <div className="flex justify-center mb-8 relative z-10 w-full max-w-2xl mx-auto">
                    <div className="flex bg-zinc-950/80 border border-white/5 rounded-full p-1.5 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-xl ring-1 ring-white/5 w-full">
                        <button onClick={() => setSubTab('quests')} className={`flex-1 relative z-10 py-3 rounded-full font-bold tracking-[0.2em] font-mono text-[10px] sm:text-xs uppercase transition-all duration-300 flex items-center justify-center gap-2 ${subTab==='quests'?'text-black':'text-zinc-500 hover:text-white'}`}>
                            <i className="fa-solid fa-list-check"></i> Bounties
                        </button>
                        <button onClick={() => setSubTab('expeditions')} className={`flex-1 relative z-10 py-3 rounded-full font-bold tracking-[0.2em] font-mono text-[10px] sm:text-xs uppercase transition-all duration-300 flex items-center justify-center gap-2 ${subTab==='expeditions'?'text-black':'text-zinc-500 hover:text-white'}`}>
                            <i className="fa-solid fa-map-location-dot"></i> Expeditions
                        </button>
                        <button onClick={() => setSubTab('storage')} className={`flex-1 relative z-10 py-3 rounded-full font-bold tracking-[0.2em] font-mono text-[10px] sm:text-xs uppercase transition-all duration-300 flex items-center justify-center gap-2 ${subTab==='storage'?'text-black':'text-zinc-500 hover:text-white'}`}>
                            <i className="fa-solid fa-boxes-stacked"></i> Vault
                        </button>

                        {/* Active Indicator Slide */}
                        <div 
                            className={`absolute top-1.5 bottom-1.5 w-[calc(33.33%-4px)] rounded-full transition-transform duration-300 ease-out z-0 ${
                                subTab === 'quests' ? 'bg-cinematic-cyan shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 
                                subTab === 'expeditions' ? 'bg-cinematic-gold shadow-[0_0_15px_rgba(255,184,0,0.4)]' : 
                                'bg-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.4)]'
                            }`}
                            style={{ transform: subTab === 'quests' ? 'translateX(0)' : subTab === 'expeditions' ? 'translateX(calc(100% + 4px))' : 'translateX(calc(200% + 8px))' }}
                        ></div>
                    </div>
                </div>

                {subTab === 'quests' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {quests.map(q => (
                            <div key={q.id} className={`bg-zinc-950/80 p-6 rounded-2xl border flex flex-col justify-between ${q.isCompleted && !q.isClaimed ? 'border-cinematic-cyan/30 ring-1 ring-cinematic-cyan/10 scale-[1.02]' : 'border-white/5 ring-1 ring-white/5 hover:border-white/20'} relative overflow-hidden backdrop-blur-xl shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] transition-all duration-300 gap-6`}>
                                {/* Grid Background */}
                                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px" }}></div>
                                
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${q.isCompleted && !q.isClaimed ? 'bg-cinematic-cyan shadow-[0_0_15px_var(--tw-colors-cinematic-cyan)]' : 'bg-white/10'}`}></div>
                                
                                <div className="flex-1 pl-3 relative z-10">
                                    <div className="flex justify-between items-start mb-3">
                                         <h4 className={`text-sm sm:text-base font-black font-mono uppercase tracking-[0.2em] ${q.isCompleted && !q.isClaimed ? 'text-cinematic-cyan drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]' : 'text-zinc-200'}`}>{q.title}</h4>
                                         <span className="text-[10px] sm:text-xs font-mono font-bold bg-black/60 px-3 py-1.5 rounded-lg border border-white/5 shadow-inner flex items-center gap-2">
                                              <span className={q.currentCount >= q.targetCount ? 'text-cinematic-cyan' : 'text-zinc-400'}>{Math.min(q.currentCount, q.targetCount)}</span> 
                                              <span className="text-zinc-600">/</span> 
                                              <span className="text-zinc-400">{q.targetCount}</span>
                                         </span>
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] text-zinc-500 font-mono tracking-widest leading-relaxed mb-4 uppercase">{q.description}</p>
                                    
                                    <div className="flex flex-wrap gap-2 mt-auto">
                                        <div className="text-[8px] text-zinc-600 w-full mb-1 font-mono uppercase tracking-[0.3em]">Reward Payload</div>
                                        <span className="text-[10px] bg-black/60 text-cinematic-gold px-3 py-1.5 rounded border border-cinematic-gold/20 font-mono uppercase flex items-center gap-2 shadow-inner"><i className="fa-solid fa-coins"></i> {q.rewardDC} DC</span>
                                        {q.rewardTickets?.map((t: any, idx: number) => (
                                            <span key={idx} className="text-[10px] bg-black/60 text-purple-400 px-3 py-1.5 rounded border border-purple-400/20 font-mono uppercase flex items-center gap-2 shadow-inner"><i className="fa-solid fa-ticket"></i> {t.amount} {t.type} ticket</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="pl-3 relative z-10 w-full">
                                    {q.isClaimed ? (
                                        <button disabled className="w-full text-[10px] sm:text-xs px-4 py-3 bg-black/50 text-zinc-600 rounded-xl border border-white/5 font-mono font-bold tracking-[0.2em] uppercase cursor-not-allowed"><i className="fa-solid fa-check mr-2"></i> Claimed</button>
                                    ) : q.isCompleted ? (
                                        <button onClick={() => handleClaimQuest(q)} className="w-full text-[10px] sm:text-xs font-bold px-4 py-3 bg-cinematic-cyan/10 hover:bg-cinematic-cyan hover:text-black text-cinematic-cyan transition-all font-mono tracking-[0.2em] uppercase rounded-xl border border-cinematic-cyan/30 shadow-[0_0_15px_rgba(0,243,255,0.2)] group relative overflow-hidden">
                                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:duration-1000 group-hover:translate-x-[100%] transition-transform"></div>
                                           <i className="fa-solid fa-download mr-2"></i> Claim Bounty
                                        </button>
                                    ) : (
                                        <div className="w-full h-1 bg-black/80 rounded-full overflow-hidden border border-white/5">
                                            <div className="h-full bg-zinc-600 transition-all duration-500 relative">
                                                 <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)] animate-[scan_2s_ease-in-out_infinite]"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {subTab === 'expeditions' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {expeditions.map(exp => (
                            <div key={exp.id} className="bg-zinc-950/80 p-6 sm:p-8 rounded-3xl border border-cinematic-gold/10 ring-1 ring-cinematic-gold/5 relative overflow-hidden backdrop-blur-xl shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
                                {/* Diagonal Lines Deco */}
                                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-cinematic-gold/5 rotate-45 transform origin-bottom-left"></div>
                                 <div className="absolute -right-8 -top-8 w-24 h-24 bg-cinematic-gold/5 rotate-45 transform origin-bottom-left"></div>

                                {selectedExp === exp.id ? (
                                    <div className="flex flex-col h-full justify-between animate-fade-in relative z-10">
                                        <div>
                                            <h4 className="text-cinematic-gold font-serif text-sm sm:text-base uppercase tracking-[0.3em] mb-4 flex items-center gap-3"><i className="fa-solid fa-street-view text-xl"></i> Assign Operative</h4>
                                            <p className="text-[10px] sm:text-xs text-zinc-400 mb-6 font-mono uppercase tracking-[0.2em] bg-black/60 px-4 py-2.5 rounded-xl border border-white/5 inline-flex items-center gap-2 shadow-inner"><i className="fa-solid fa-triangle-exclamation text-cinematic-gold"></i> Reqs: <span className="text-white font-bold">{exp.requiredElement ? `${exp.requiredElement} Class` : exp.requiredFaction ? `${exp.requiredFaction} Faction` : 'None'}</span></p>
                                            
                                            <div className="relative">
                                                <i className="fa-solid fa-users absolute left-4 top-1/2 transform -translate-y-1/2 text-cinematic-gold/50 z-10 text-lg"></i>
                                                <select 
                                                    className="w-full bg-black/80 border border-white/10 text-white rounded-xl py-4 pl-12 pr-4 text-xs font-mono tracking-widest uppercase hover:border-cinematic-gold/40 focus:border-cinematic-gold/50 outline-none appearance-none cursor-pointer transition-colors shadow-inner focus:shadow-[0_0_15px_rgba(255,184,0,0.1)]"
                                                    value={selectedCardId}
                                                    onChange={(e) => setSelectedCardId(e.target.value)}
                                                >
                                                    <option value="">-- Select Operative --</option>
                                                    {cards.filter(c => !expeditions.some(e => e.assignedCardId === c.id)).map(c => (
                                                        <option key={c.id} value={c.id}>{c.name} ({c.faction} / {c.element})</option>
                                                    ))}
                                                </select>
                                                <i className="fa-solid fa-caret-down absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500 pointer-events-none"></i>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 mt-8">
                                            <button onClick={() => setSelectedExp(null)} className="flex-1 px-4 py-3 sm:py-4 text-[10px] sm:text-xs font-mono font-bold tracking-[0.2em] uppercase border border-white/10 hover:border-white/30 rounded-xl text-zinc-400 hover:text-white bg-black/40 hover:bg-white/5 transition-all">Abort</button>
                                            <button onClick={() => handleStartExpedition(exp)} className="flex-1 px-4 py-3 sm:py-4 text-[10px] sm:text-xs font-mono font-bold tracking-[0.2em] uppercase bg-cinematic-gold/10 text-cinematic-gold border border-cinematic-gold/30 rounded-xl hover:bg-cinematic-gold hover:text-black transition-all shadow-[0_0_20px_rgba(255,186,8,0.15)] relative overflow-hidden group">
                                                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:duration-1000 group-hover:translate-x-[100%] transition-transform"></div>
                                                 Dispatch
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full justify-between gap-6 relative z-10">
                                        <div>
                                            <div className="flex justify-between items-start mb-4 gap-4">
                                                <h4 className="text-white font-black font-mono text-base sm:text-lg uppercase tracking-[0.2em]">{exp.name}</h4>
                                                <span className="text-[10px] bg-black/80 border border-white/10 text-cinematic-gold px-3 py-1.5 rounded-lg font-mono font-bold flex items-center gap-2 shadow-inner whitespace-nowrap"><i className="fa-regular fa-clock"></i> {exp.durationMinutes}M</span>
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-zinc-400 font-mono tracking-[0.1em] leading-relaxed uppercase">{exp.description}</p>
                                        </div>
                                        <div className="mt-auto">
                                            <div className="text-[9px] sm:text-[10px] text-zinc-600 font-mono uppercase tracking-[0.3em] mb-3 flex items-center gap-2"><i className="fa-solid fa-gift"></i> Payload</div>
                                            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 bg-black/40 p-3 sm:p-4 rounded-xl border border-white/5 shadow-inner">
                                                <span className="text-[10px] sm:text-xs bg-cinematic-gold/10 text-cinematic-gold px-3 py-1.5 rounded-lg border border-cinematic-gold/30 font-mono font-bold flex items-center gap-2"><i className="fa-solid fa-coins"></i> {exp.rewardDC} DC</span>
                                                {exp.rewardMaterials?.map((m: any, idx: number) => (
                                                    <span key={idx} className="text-[10px] sm:text-xs bg-cinematic-cyan/10 text-cinematic-cyan px-3 py-1.5 rounded-lg border border-cinematic-cyan/30 font-mono font-bold flex items-center gap-2"><i className="fa-solid fa-cube"></i> {m.amount} {m.item}</span>
                                                ))}
                                            </div>
                                            {exp.status === 'idle' && (
                                                <button onClick={() => setSelectedExp(exp.id)} className="w-full py-4 sm:py-5 text-[10px] sm:text-xs font-mono font-bold tracking-[0.3em] uppercase bg-black hover:bg-cinematic-gold/10 border border-white/10 hover:border-cinematic-gold/30 text-white hover:text-cinematic-gold rounded-xl transition-all flex items-center justify-center gap-3 group">
                                                    <i className="fa-solid fa-location-arrow group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i> Plan Dispatch
                                                </button>
                                            )}
                                            {exp.status === 'ongoing' && (
                                                <button onClick={() => handleCheckExpedition(exp)} className="w-full py-4 sm:py-5 text-[10px] sm:text-xs font-mono font-bold tracking-[0.3em] uppercase bg-cinematic-cyan/10 hover:bg-cinematic-cyan border border-cinematic-cyan/30 hover:border-cinematic-cyan text-cinematic-cyan hover:text-black rounded-xl shadow-[0_0_20px_rgba(0,243,255,0.15)] transition-all flex items-center justify-center gap-3 relative overflow-hidden group">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:duration-1000 group-hover:translate-x-[100%] transition-transform"></div>
                                                    <i className="fa-solid fa-satellite-dish animate-pulse"></i> Check Status
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {exp.status === 'ongoing' && (
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5 overflow-hidden">
                                        <div className="h-full bg-cinematic-cyan w-1/3 animate-[slide_2s_linear_infinite] shadow-[0_0_10px_#00f3ff]"></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {subTab === 'storage' && (
                    <div className="bg-zinc-950/80 p-8 sm:p-12 rounded-3xl border border-white/5 ring-1 ring-white/5 backdrop-blur-xl shadow-[inset_0_0_100px_rgba(0,0,0,0.8),0_0_40px_rgba(192,132,252,0.05)] relative overflow-hidden">
                        {/* Hexagon Pattern Background */}
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='100' viewBox='0 0 60 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15 0H0v15l30 17.32L60 15V0H30z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E\")" }}></div>
                        
                        <div className="flex flex-col items-center mb-10 pb-8 border-b border-white/5 relative z-10">
                             <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                                 <i className="fa-solid fa-boxes-stacked text-3xl text-purple-400"></i>
                             </div>
                             <h3 className="text-white text-xl sm:text-2xl font-black font-mono uppercase tracking-[0.3em] drop-shadow-md">Material Vault</h3>
                             <p className="text-[10px] sm:text-xs text-zinc-500 font-mono mt-2 uppercase tracking-[0.2em]">Secure Storage Facility</p>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 relative z-10">
                            {Object.entries(inventory.materials || {}).filter(([_, amount]) => Number(amount) > 0).map(([item, amount]) => (
                                <div key={item} className="bg-black/80 border border-white/5 hover:border-purple-400/30 rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all group shadow-inner relative overflow-hidden ring-1 ring-white/5 hover:ring-purple-400/20 hover:scale-105 duration-300">
                                    <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-zinc-900/80 flex items-center justify-center border border-white/10 group-hover:border-purple-400/50 text-zinc-500 group-hover:text-purple-400 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] mb-4 transition-all relative z-10">
                                        <i className="fa-solid fa-flask text-2xl sm:text-3xl drop-shadow-[0_0_10px_currentColor]"></i>
                                    </div>
                                    <div className="text-[9px] sm:text-[10px] text-zinc-400 font-mono tracking-widest uppercase truncate w-full group-hover:text-zinc-200 transition-colors relative z-10">{item}</div>
                                    <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1 tabular-nums group-hover:text-purple-300 transition-colors relative z-10">{String(amount)}</div>
                                </div>
                            ))}
                            {Object.keys(inventory.materials || {}).length === 0 && (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-black/40 rounded-3xl border border-white/5 border-dashed shadow-inner">
                                     <i className="fa-solid fa-box-open text-5xl text-zinc-700 w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5 mb-6 ring-1 ring-white/5 shadow-inner"></i>
                                     <div className="text-white font-mono font-bold text-sm sm:text-base uppercase tracking-[0.2em] mb-2">Vault Empty</div>
                                     <div className="text-zinc-500 font-mono text-[10px] sm:text-xs uppercase tracking-widest">Dispatch expeditions to acquire materials.</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
