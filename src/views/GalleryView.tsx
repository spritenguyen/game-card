import React, { useState, useMemo } from 'react';
import { Icon } from '../components/ui/Icon';
import { Card, FactionType, ElementType, CardRank } from '../types';

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
        <div className="w-full max-w-[1600px] mx-auto animate-fade-in pb-24 px-4 sm:px-8 mt-12">
            
            {/* Magazine Header */}
            <header className="mb-16 border-b-2 border-white/20 pb-8 text-center flex flex-col items-center">
                 <h1 className="text-5xl sm:text-7xl font-light tracking-[0.2em] font-serif text-white uppercase mb-2">Lookbook</h1>
                 <p className="text-[10px] sm:text-xs tracking-[0.4em] font-mono text-zinc-500 uppercase">Vol 1. The Archives — {filteredAndSortedCards.length} Entities</p>
            </header>

            {/* Editorial Filters */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-12 text-[10px] font-mono uppercase tracking-[0.2em]">
                <div className="flex items-center gap-2 border-b border-white/20 pb-2 focus-within:border-white transition-colors cursor-pointer">
                    <span className="text-zinc-500">Sort</span>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-transparent text-white outline-none cursor-pointer appearance-none pr-4">
                        <option value="recent">Arrivals</option>
                        <option value="rank">Prestige</option>
                        <option value="name">Index</option>
                        <option value="level">Evolution</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 border-b border-white/20 pb-2 focus-within:border-white transition-colors cursor-pointer">
                    <span className="text-zinc-500">Rank</span>
                    <select value={filterClass} onChange={e => setFilterClass(e.target.value as any)} className="bg-transparent text-white outline-none cursor-pointer appearance-none pr-4">
                        <option value="All">All Tiers</option>
                        <option value="UR">UR</option>
                        <option value="SSR">SSR</option>
                        <option value="SR">SR</option>
                        <option value="R">R</option>
                        <option value="N">N</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 border-b border-white/20 pb-2 focus-within:border-white transition-colors cursor-pointer">
                    <span className="text-zinc-500">Faction</span>
                    <select value={filterFaction} onChange={e => setFilterFaction(e.target.value as any)} className="bg-transparent text-white outline-none cursor-pointer appearance-none pr-4">
                        <option value="All">All Origins</option>
                        <option value="CyberCore">CyberCore</option>
                        <option value="Ethereal">Ethereal</option>
                        <option value="VoidBringer">VoidBringer</option>
                        <option value="MechaMutant">MechaMutant</option>
                        <option value="AstroNomad">AstroNomad</option>
                        <option value="ArcaneWeaver">ArcaneWeaver</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 border-b border-white/20 pb-2 focus-within:border-white transition-colors cursor-pointer">
                    <span className="text-zinc-500">Element</span>
                    <select value={filterElement} onChange={e => setFilterElement(e.target.value as any)} className="bg-transparent text-white outline-none cursor-pointer appearance-none pr-4">
                        <option value="All">All Elements</option>
                        <option value="Fire">Fire</option>
                        <option value="Water">Water</option>
                        <option value="Wind">Wind</option>
                        <option value="Earth">Earth</option>
                        <option value="Lightning">Lightning</option>
                        <option value="Neutral">Neutral</option>
                    </select>
                </div>
            </div>
            
            {filteredAndSortedCards.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-zinc-600 border border-white/5 bg-zinc-950/50 rounded-lg">
                    <p className="text-sm uppercase tracking-[0.3em] font-mono">No matching editorials</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[300px] sm:auto-rows-[450px] gap-2 lg:gap-4 grid-flow-dense">
                    {filteredAndSortedCards.map((card, index) => {
                        const isUR = card.cardClass === 'UR';
                        const imgSrc = (card.variants && card.activeSkinIndex !== undefined && card.variants[card.activeSkinIndex]) 
                            ? card.variants[card.activeSkinIndex] 
                            : card.imageUrl || '';

                        return (
                            <div 
                                key={card.id + index}
                                onClick={() => onOpenCard(card.id)}
                                className={`cursor-pointer overflow-hidden relative group bg-zinc-950 ${isUR ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}`}
                            >
                                {imgSrc ? (
                                    <img 
                                        src={imgSrc} 
                                        alt={card.name} 
                                        className="w-full h-full object-cover transition-all duration-1000 grayscale-[0.8] group-hover:grayscale-0 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-800">
                                        <Icon name="fa-user-secret text-4xl" />
                                    </div>
                                )}
                                
                                {/* Editorial Typography Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                
                                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end pointer-events-none">
                                    <h2 className={`font-serif uppercase tracking-[0.1em] text-white leading-none ${isUR ? 'text-4xl sm:text-6xl mb-4' : 'text-xl sm:text-2xl mb-2'}`}>
                                        {card.name}
                                    </h2>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] sm:text-[10px] font-mono tracking-widest uppercase text-zinc-300">
                                            {card.faction} // {card.element || 'Neutral'}
                                        </p>
                                        <p className="text-[9px] sm:text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-500">
                                            No. {card.id.slice(0, 4)}
                                        </p>
                                    </div>
                                </div>

                                {/* Rank Tag placed as a fashion label */}
                                <div className="absolute top-6 right-6 font-mono text-[9px] tracking-[0.3em] uppercase bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 mix-blend-overlay">
                                    {card.cardClass}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
