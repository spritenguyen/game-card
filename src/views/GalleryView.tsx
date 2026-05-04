import React, { useState, useMemo } from 'react';
import { Card, FactionType, ElementType, CardRank } from '../types';
import { MiniCard } from '../components/MiniCard';

interface Props {
  cards: Card[];
  onOpenCard: (cardId: string) => void;
}

export const GalleryView: React.FC<Props> = ({ cards, onOpenCard }) => {
    const [sortBy, setSortBy] = useState<'recent' | 'rank' | 'name' | 'level'>('recent');
    const [filterFaction, setFilterFaction] = useState<'All' | FactionType>('All');
    const [filterElement, setFilterElement] = useState<'All' | ElementType>('All');
    const [filterClass, setFilterClass] = useState<'All' | CardRank>('All');

    const rankValues = { UR: 5, SSR: 4, SR: 3, R: 2, N: 1 };

    const filteredAndSortedCards = useMemo(() => {
        let result = [...cards];

        // Filtering
        if (filterFaction !== 'All') {
            result = result.filter(c => c.faction === filterFaction);
        }
        if (filterElement !== 'All') {
            result = result.filter(c => (c.element || 'Neutral') === filterElement);
        }
        if (filterClass !== 'All') {
            result = result.filter(c => c.cardClass === filterClass);
        }

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'recent') {
                return (b.timestamp || 0) - (a.timestamp || 0);
            } else if (sortBy === 'rank') {
                const rankA = rankValues[a.cardClass] || 0;
                const rankB = rankValues[b.cardClass] || 0;
                if (rankA !== rankB) return rankB - rankA;
                return (b.ultimateLevel || 1) - (a.ultimateLevel || 1);
            } else if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else if (sortBy === 'level') {
                return (b.ultimateLevel || 1) - (a.ultimateLevel || 1);
            }
            return 0;
        });

        return result;
    }, [cards, sortBy, filterFaction, filterElement, filterClass]);

    if (cards.length === 0) return null;

    return (
        <div className="w-full max-w-7xl mx-auto animate-fade-in pb-24 px-4 sm:px-6">
            <div className="flex flex-col gap-6 bg-zinc-950/80 rounded-3xl border border-cinematic-gold/20 ring-1 ring-cinematic-gold/10 p-6 sm:p-8 mb-8 backdrop-blur-xl shadow-[inset_0_0_100px_rgba(0,0,0,0.8),0_0_40px_rgba(255,184,0,0.05)] relative mt-8 overflow-hidden">
                {/* Minimal Grid Background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 19px, #FFB800 19px, #FFB800 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #FFB800 19px, #FFB800 20px)", backgroundSize: "20px 20px" }}></div>
                <div className="absolute top-0 right-0 w-1/3 h-[2px] bg-gradient-to-r from-transparent to-cinematic-gold opacity-50 shadow-[0_0_15px_#FFB800]"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-cinematic-gold/10 pb-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cinematic-gold/10 flex items-center justify-center border border-cinematic-gold/30 shadow-[0_0_20px_rgba(255,184,0,0.2)]">
                            <i className="fa-solid fa-vault text-cinematic-gold text-2xl animate-pulse"></i>
                        </div>
                        <div>
                            <h3 className="text-xl sm:text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-cinematic-gold tracking-[0.3em] uppercase leading-none">Local Vault</h3>
                            <p className="text-[10px] sm:text-xs text-cinematic-gold/60 font-mono tracking-widest mt-1.5 uppercase drop-shadow-[0_0_5px_rgba(255,184,0,0.3)]">Archive & Retrieval System</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-black/60 px-6 py-3 rounded-xl border border-cinematic-gold/20 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] self-start md:self-auto">
                        <span className="text-lg font-bold text-cinematic-gold tabular-nums font-mono drop-shadow-[0_0_8px_rgba(255,184,0,0.5)]">{filteredAndSortedCards.length}</span>
                        <div className="w-[1px] h-6 bg-white/10"></div>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.2em]">Stored Entities</span>
                    </div>
                </div>

                {/* Filters & Sorting Controls */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-[10px] sm:text-xs font-mono tracking-widest uppercase relative z-10">
                    <div className="flex flex-col gap-2 relative">
                        <div className="absolute left-0 top-6 bottom-0 w-[2px] bg-cinematic-gold/20"></div>
                        <label className="text-zinc-500 pl-3 flex items-center gap-2 drop-shadow-md"><i className="fa-solid fa-arrow-down-wide-short text-zinc-600"></i> Sort By</label>
                        <div className="relative pl-3">
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="w-full bg-zinc-900/80 border border-white/10 text-white rounded-xl px-4 py-3 outline-none hover:border-cinematic-gold/40 transition-colors cursor-pointer appearance-none shadow-inner focus:border-cinematic-gold/50"
                            >
                                <option value="recent" className="bg-zinc-900 text-white">Recent Acquired</option>
                                <option value="rank" className="bg-zinc-900 text-white">Rarity Rank</option>
                                <option value="level" className="bg-zinc-900 text-white">Evolution Level</option>
                                <option value="name" className="bg-zinc-900 text-white">Alphabetical</option>
                            </select>
                            <i className="fa-solid fa-caret-down absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-600 pointer-events-none"></i>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 relative">
                        <div className="absolute left-0 top-6 bottom-0 w-[2px] bg-cinematic-gold/20"></div>
                        <label className="text-zinc-500 pl-3 flex items-center gap-2 drop-shadow-md"><i className="fa-solid fa-star text-zinc-600"></i> Rank Filter</label>
                        <div className="relative pl-3">
                            <select 
                                value={filterClass} 
                                onChange={(e) => setFilterClass(e.target.value as any)}
                                className="w-full bg-zinc-900/80 border border-white/10 text-white rounded-xl px-4 py-3 outline-none hover:border-cinematic-gold/40 transition-colors cursor-pointer appearance-none shadow-inner focus:border-cinematic-gold/50"
                            >
                                <option value="All" className="bg-zinc-900 text-white">All Ranks</option>
                                <option value="UR" className="bg-zinc-900 text-white">UR Protocol</option>
                                <option value="SSR" className="bg-zinc-900 text-white">SSR High-Tier</option>
                                <option value="SR" className="bg-zinc-900 text-white">SR Mid-Tier</option>
                                <option value="R" className="bg-zinc-900 text-white">R Base-Tier</option>
                                <option value="N" className="bg-zinc-900 text-white">N Trash</option>
                            </select>
                            <i className="fa-solid fa-caret-down absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-600 pointer-events-none"></i>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 relative">
                        <div className="absolute left-0 top-6 bottom-0 w-[2px] bg-cinematic-gold/20"></div>
                        <label className="text-zinc-500 pl-3 flex items-center gap-2 drop-shadow-md"><i className="fa-solid fa-dna text-zinc-600"></i> Faction Filter</label>
                        <div className="relative pl-3">
                            <select 
                                value={filterFaction} 
                                onChange={(e) => setFilterFaction(e.target.value as any)}
                                className="w-full bg-zinc-900/80 border border-white/10 text-white rounded-xl px-4 py-3 outline-none hover:border-cinematic-gold/40 transition-colors cursor-pointer appearance-none shadow-inner focus:border-cinematic-gold/50"
                            >
                                <option value="All" className="bg-zinc-900 text-white">All Factions</option>
                                <option value="Tech" className="bg-zinc-900 text-white">Tech</option>
                                <option value="Magic" className="bg-zinc-900 text-white">Magic</option>
                                <option value="Mutant" className="bg-zinc-900 text-white">Mutant</option>
                                <option value="Light" className="bg-zinc-900 text-white">Light</option>
                                <option value="Dark" className="bg-zinc-900 text-white">Dark</option>
                            </select>
                            <i className="fa-solid fa-caret-down absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-600 pointer-events-none"></i>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 relative">
                         <div className="absolute left-0 top-6 bottom-0 w-[2px] bg-cinematic-gold/20"></div>
                        <label className="text-zinc-500 pl-3 flex items-center gap-2 drop-shadow-md"><i className="fa-solid fa-fire text-zinc-600"></i> Element Filter</label>
                        <div className="relative pl-3">
                            <select 
                                value={filterElement} 
                                onChange={(e) => setFilterElement(e.target.value as any)}
                                className="w-full bg-zinc-900/80 border border-white/10 text-white rounded-xl px-4 py-3 outline-none hover:border-cinematic-gold/40 transition-colors cursor-pointer appearance-none shadow-inner focus:border-cinematic-gold/50"
                            >
                                <option value="All" className="bg-zinc-900 text-white">All Elements</option>
                                <option value="Fire" className="bg-zinc-900 text-white">Fire</option>
                                <option value="Water" className="bg-zinc-900 text-white">Water</option>
                                <option value="Wind" className="bg-zinc-900 text-white">Wind</option>
                                <option value="Earth" className="bg-zinc-900 text-white">Earth</option>
                                <option value="Lightning" className="bg-zinc-900 text-white">Lightning</option>
                                <option value="Neutral" className="bg-zinc-900 text-white">Neutral</option>
                            </select>
                            <i className="fa-solid fa-caret-down absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-600 pointer-events-none"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            {filteredAndSortedCards.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-zinc-600 border border-white/5 bg-zinc-950/50 rounded-3xl border-dashed">
                    <i className="fa-solid fa-box-open text-5xl mb-6 opacity-30"></i>
                    <p className="text-xs sm:text-sm uppercase tracking-[0.2em] font-mono">No Records Found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                    {filteredAndSortedCards.map(card => (
                        <MiniCard key={card.id} card={card} onClickAction={() => onOpenCard(card.id)} context="gallery" />
                    ))}
                </div>
            )}
        </div>
    );
};
