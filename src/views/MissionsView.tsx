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
        <div className="w-full flex justify-center pb-12 animate-fade-in">
            <div className="w-full max-w-4xl flex flex-col gap-6">
                
                <div className="flex gap-4 border-b border-white/10 pb-2">
                    <button onClick={() => setSubTab('quests')} className={`text-xs tracking-widest font-mono uppercase px-4 py-2 ${subTab==='quests'?'text-cinematic-cyan border-b-2 border-cinematic-cyan':'text-zinc-500'}`}>Bounties</button>
                    <button onClick={() => setSubTab('expeditions')} className={`text-xs tracking-widest font-mono uppercase px-4 py-2 ${subTab==='expeditions'?'text-cinematic-gold border-b-2 border-cinematic-gold':'text-zinc-500'}`}>Expeditions</button>
                    <button onClick={() => setSubTab('storage')} className={`text-xs tracking-widest font-mono uppercase px-4 py-2 ${subTab==='storage'?'text-purple-400 border-b-2 border-purple-400':'text-zinc-500'}`}>Storage</button>
                </div>

                {subTab === 'quests' && (
                    <div className="space-y-3">
                        {quests.map(q => (
                            <div key={q.id} className="glass-panel p-4 rounded-xl flex items-center justify-between border-l-4 border-l-cinematic-cyan/50">
                                <div>
                                    <h4 className="text-white font-serif uppercase tracking-widest">{q.title}</h4>
                                    <p className="text-[10px] text-zinc-400 font-mono tracking-wide">{q.description}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-[10px] bg-cinematic-gold/20 text-cinematic-gold px-2 py-0.5 rounded border border-cinematic-gold/30">+{q.rewardDC} DC</span>
                                        {q.rewardTickets?.map((t: any, idx: number) => (
                                            <span key={idx} className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">+{t.amount} {t.type} ticket</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-xs font-mono text-zinc-500">{q.currentCount} / {q.targetCount}</span>
                                    {q.isClaimed ? (
                                        <button disabled className="text-[10px] px-3 py-1 bg-zinc-800 text-zinc-600 rounded">CLAIMED</button>
                                    ) : q.isCompleted ? (
                                        <button onClick={() => handleClaimQuest(q)} className="text-[10px] font-bold px-3 py-1 bg-cinematic-cyan text-black rounded hover:bg-white transition-colors cursor-pointer">CLAIM REWARD</button>
                                    ) : (
                                        <button disabled className="text-[10px] px-3 py-1 bg-zinc-800/50 text-zinc-500 rounded border border-zinc-700">IN PROGRESS</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {subTab === 'expeditions' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {expeditions.map(exp => (
                            <div key={exp.id} className="glass-panel p-4 rounded-xl border border-cinematic-gold/20 relative">
                                {selectedExp === exp.id ? (
                                    <div className="flex flex-col h-full justify-between">
                                        <div>
                                            <h4 className="text-cinematic-gold font-serif text-sm">Assign Operative</h4>
                                            <p className="text-[10px] text-zinc-400 mb-2">Yêu cầu: {exp.requiredElement ? `Nguyên tố ${exp.requiredElement}` : exp.requiredFaction ? `Hệ ${exp.requiredFaction}` : 'Không'}</p>
                                            <select 
                                                className="w-full bg-black/50 border border-white/10 text-white rounded p-2 text-xs"
                                                value={selectedCardId}
                                                onChange={(e) => setSelectedCardId(e.target.value)}
                                            >
                                                <option value="">-- Select Operative --</option>
                                                {cards.filter(c => !expeditions.some(e => e.assignedCardId === c.id)).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} ({c.faction} - {c.element})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <button onClick={() => setSelectedExp(null)} className="flex-1 px-2 py-1 text-xs border border-white/10 rounded text-zinc-400 hover:bg-white/5">Cancel</button>
                                            <button onClick={() => handleStartExpedition(exp)} className="flex-1 px-2 py-1 text-xs bg-cinematic-gold text-black font-bold rounded hover:bg-white">Dispatch</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full justify-between gap-4">
                                        <div>
                                            <h4 className="text-white font-serif tracking-widest">{exp.name}</h4>
                                            <p className="text-[10px] text-zinc-400 font-mono tracking-wide mt-1">{exp.description}</p>
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <span className="text-[10px] bg-cinematic-gold/20 text-cinematic-gold px-2 py-0.5 rounded border border-cinematic-gold/30">+{exp.rewardDC} DC</span>
                                                {exp.rewardMaterials?.map((m: any, idx: number) => (
                                                    <span key={idx} className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">+{m.amount} {m.item}</span>
                                                ))}
                                                <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">⏱ {exp.durationMinutes}m</span>
                                            </div>
                                            {exp.status === 'idle' && (
                                                <button onClick={() => setSelectedExp(exp.id)} className="w-full py-1.5 text-xs font-bold tracking-widest uppercase bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded transition-colors">Start Dispatch</button>
                                            )}
                                            {exp.status === 'ongoing' && (
                                                <button onClick={() => handleCheckExpedition(exp)} className="w-full py-1.5 text-xs font-bold tracking-widest uppercase bg-cinematic-cyan/20 hover:bg-cinematic-cyan/30 text-cinematic-cyan border border-cinematic-cyan/30 rounded transition-colors">Check Status</button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {subTab === 'storage' && (
                    <div className="glass-panel p-6 rounded-xl border border-white/10">
                        <h3 className="text-white font-serif mb-4 uppercase tracking-widest text-center border-b border-white/10 pb-4">Elemental Storage & Vault</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {Object.entries(inventory.materials || {}).filter(([_, amount]) => Number(amount) > 0).map(([item, amount]) => (
                                <div key={item} className="bg-black/40 border border-white/10 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-cinematic-cyan/10 flex items-center justify-center border border-cinematic-cyan/30 text-cinematic-cyan shadow-[0_0_15px_rgba(0,243,255,0.2)] mb-3">
                                        <i className="fa-solid fa-cube text-xl"></i>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">{item}</div>
                                    <div className="text-lg font-bold text-white mt-1 tabular-nums">{String(amount)}</div>
                                </div>
                            ))}
                            {Object.keys(inventory.materials || {}).length === 0 && (
                                <div className="col-span-full py-12 text-center text-zinc-600 font-mono text-[10px] uppercase tracking-widest">Kho lưu trữ trống. Hãy chiến đấu với Boss hoặc Tham gia Expedition để thu thập vật phẩm.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
