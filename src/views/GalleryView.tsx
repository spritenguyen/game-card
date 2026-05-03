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
        <div className="w-full max-w-7xl animate-fade-in mt-4 pb-24">
            <div className="flex flex-col gap-6 bg-black/40 p-6 rounded-2xl border border-white/5 mb-8 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cinematic-gold/10 flex items-center justify-center border border-cinematic-gold/20">
                            <i className="fa-solid fa-box-archive text-cinematic-gold text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-widest uppercase mb-0.5">LOCAL_VAULT</h3>
                            <p className="text-[10px] text-zinc-500 font-mono tracking-widest">LƯU TRỮ VÀ SẮP XẾP THẺ BÀI</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-cinematic-gold/10 px-4 py-2 rounded-lg border border-cinematic-gold/20 self-start md:self-auto">
                        <span className="text-xs font-bold text-cinematic-gold tabular-nums">{filteredAndSortedCards.length}</span>
                        <span className="text-[10px] text-cinematic-gold/60 font-mono uppercase tracking-widest">ĐƠN VỊ TÀI SẢN</span>
                    </div>
                </div>

                {/* Filters & Sorting Controls */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-mono">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-500 uppercase tracking-widest pl-1"><i className="fa-solid fa-arrow-down-wide-short mr-1"></i> Sắp Xếp</label>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-black/60 border border-white/10 text-white rounded-lg px-3 py-2 outline-none hover:border-white/20 transition-colors cursor-pointer appearance-none"
                        >
                            <option value="recent">Mới Nhất</option>
                            <option value="rank">Cấp Bậc (Rank)</option>
                            <option value="level">Cấp Độ (Level)</option>
                            <option value="name">Tên Bảng Chữ Cái</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-500 uppercase tracking-widest pl-1"><i className="fa-solid fa-star mr-1"></i> Lọc: Hạng</label>
                        <select 
                            value={filterClass} 
                            onChange={(e) => setFilterClass(e.target.value as any)}
                            className="bg-black/60 border border-white/10 text-white rounded-lg px-3 py-2 outline-none hover:border-white/20 transition-colors cursor-pointer appearance-none"
                        >
                            <option value="All">Tất Cả</option>
                            <option value="UR">UR</option>
                            <option value="SSR">SSR</option>
                            <option value="SR">SR</option>
                            <option value="R">R</option>
                            <option value="N">N</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-500 uppercase tracking-widest pl-1"><i className="fa-solid fa-dna mr-1"></i> Lọc: Tộc Hệ</label>
                        <select 
                            value={filterFaction} 
                            onChange={(e) => setFilterFaction(e.target.value as any)}
                            className="bg-black/60 border border-white/10 text-white rounded-lg px-3 py-2 outline-none hover:border-white/20 transition-colors cursor-pointer appearance-none"
                        >
                            <option value="All">Tất Cả</option>
                            <option value="Tech">Tech (Công Nghệ)</option>
                            <option value="Magic">Magic (Phép Thuật)</option>
                            <option value="Mutant">Mutant (Biến Dị)</option>
                            <option value="Light">Light (Ánh Sáng)</option>
                            <option value="Dark">Dark (Bóng Tối)</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-zinc-500 uppercase tracking-widest pl-1"><i className="fa-solid fa-fire mr-1"></i> Lọc: Nguyên Tố</label>
                        <select 
                            value={filterElement} 
                            onChange={(e) => setFilterElement(e.target.value as any)}
                            className="bg-black/60 border border-white/10 text-white rounded-lg px-3 py-2 outline-none hover:border-white/20 transition-colors cursor-pointer appearance-none"
                        >
                            <option value="All">Tất Cả</option>
                            <option value="Fire">Fire (Hỏa)</option>
                            <option value="Water">Water (Thủy)</option>
                            <option value="Wind">Wind (Phong)</option>
                            <option value="Earth">Earth (Thổ)</option>
                            <option value="Lightning">Lightning (Lôi)</option>
                            <option value="Neutral">Neutral (Không)</option>
                        </select>
                    </div>
                </div>
            </div>
            
            {filteredAndSortedCards.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-zinc-600 border border-white/5 bg-black/20 rounded-2xl border-dashed">
                    <i className="fa-solid fa-ghost text-4xl mb-4 opacity-50"></i>
                    <p className="text-sm uppercase tracking-widest font-mono">Không tìm thấy dữ liệu khớp</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                    {filteredAndSortedCards.map(card => (
                        <MiniCard key={card.id} card={card} onClickAction={() => onOpenCard(card.id)} context="gallery" />
                    ))}
                </div>
            )}
        </div>
    );
};
