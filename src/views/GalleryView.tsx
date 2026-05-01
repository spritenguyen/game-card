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
        <div className="w-full max-w-[1000px] animate-fade-in mt-8 pb-24">
            <div className="flex flex-col gap-4 border-b border-white/5 pb-4 mb-4 px-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-box-archive text-cinematic-gold text-sm opacity-80"></i>
                        <h3 className="text-xs font-bold text-white tracking-widest uppercase">LOCAL_VAULT</h3>
                    </div>
                    <div className="flex items-center gap-1.5 bg-cinematic-gold/10 px-2 py-0.5 rounded border border-cinematic-gold/20">
                        <span className="text-[10px] font-bold text-cinematic-gold tabular-nums">{filteredAndSortedCards.length}</span>
                        <span className="text-[8px] text-cinematic-gold/50 font-mono uppercase">UNITS</span>
                    </div>
                </div>

                {/* Filters & Sorting Controls */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono">
                    <div className="flex flex-col gap-1">
                        <label className="text-zinc-500 uppercase tracking-widest">Sắp Xếp</label>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-zinc-900 border border-white/10 text-white rounded px-2 py-1 outline-none"
                        >
                            <option value="recent">Mới Nhất</option>
                            <option value="rank">Cấp Bậc (Rank)</option>
                            <option value="level">Cấp Độ (Level)</option>
                            <option value="name">Tên Bảng Chữ Cái</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-zinc-500 uppercase tracking-widest">Lọc: Hạng</label>
                        <select 
                            value={filterClass} 
                            onChange={(e) => setFilterClass(e.target.value as any)}
                            className="bg-zinc-900 border border-white/10 text-white rounded px-2 py-1 outline-none"
                        >
                            <option value="All">Tất Cả</option>
                            <option value="UR">UR</option>
                            <option value="SSR">SSR</option>
                            <option value="SR">SR</option>
                            <option value="R">R</option>
                            <option value="N">N</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-zinc-500 uppercase tracking-widest">Lọc: Tộc Hệ</label>
                        <select 
                            value={filterFaction} 
                            onChange={(e) => setFilterFaction(e.target.value as any)}
                            className="bg-zinc-900 border border-white/10 text-white rounded px-2 py-1 outline-none"
                        >
                            <option value="All">Tất Cả</option>
                            <option value="Tech">Tech (Công Nghệ)</option>
                            <option value="Magic">Magic (Phép Thuật)</option>
                            <option value="Mutant">Mutant (Đột Biến)</option>
                            <option value="Light">Light (Ánh Sáng)</option>
                            <option value="Dark">Dark (Bóng Tối)</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-zinc-500 uppercase tracking-widest">Lọc: Nguyên Tố</label>
                        <select 
                            value={filterElement} 
                            onChange={(e) => setFilterElement(e.target.value as any)}
                            className="bg-zinc-900 border border-white/10 text-white rounded px-2 py-1 outline-none"
                        >
                            <option value="All">Tất Cả</option>
                            <option value="Fire">Fire</option>
                            <option value="Water">Water</option>
                            <option value="Wind">Wind</option>
                            <option value="Earth">Earth</option>
                            <option value="Lightning">Lightning</option>
                            <option value="Neutral">Neutral</option>
                        </select>
                    </div>
                </div>
            </div>
            
            {filteredAndSortedCards.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-600 border border-white/5 rounded-xl border-dashed">
                    <i className="fa-solid fa-ghost text-2xl mb-2"></i>
                    <p className="text-xs uppercase tracking-widest font-mono">Không tìm thấy dữ liệu khớp</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {filteredAndSortedCards.map(card => (
                        <MiniCard key={card.id} card={card} onClickAction={() => onOpenCard(card.id)} context="gallery" />
                    ))}
                </div>
            )}
        </div>
    );
};
