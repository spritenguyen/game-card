import React, { useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { Card, AppConfig } from '../types';
import { MiniCard } from '../components/MiniCard';
import { getRankIndex } from '../lib/gameLogic';

interface Props {
  config: AppConfig;
  currency: number;
  modifyCurrency: (amount: number) => void;
  inventory: any;
  cards: Card[];
  modifyInventory: (bd: number, ed: number, m?: Record<string, number>, dd?: number) => void;
  onCompleteFusion: (newCard: Card, oldIdsToDelete: string[]) => Promise<void>;
  removeCard: (id: string) => void;
  updateCard: (c: Card) => void;
  onError: (msg: string) => void;
  onAlert: (t: string, m: string) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (v: boolean) => void;
}

export const SplicingView: React.FC<Props> = ({ config, currency, modifyCurrency, inventory, cards, modifyInventory, removeCard, updateCard, onError, onAlert, isGlobalProcessing, setGlobalProcessing }) => {
    const [mode, setMode] = useState<'extract' | 'splice'>('extract');
    
    // For Extract
    const [extractTargetId, setExtractTargetId] = useState<string | null>(null);
    const extractTarget = cards.find(c => c.id === extractTargetId) || null;
    
    // For Splice
    const [spliceTargetId, setSpliceTargetId] = useState<string | null>(null);
    const spliceTarget = cards.find(c => c.id === spliceTargetId) || null;
    const [selectedGene, setSelectedGene] = useState<string | null>(null);

    // List of extracted genes 
    const availableGenes = Object.entries(inventory)
                            .filter(([key, val]) => key.startsWith('gene_') && (val as number) > 0)
                            .map(([key, val]) => ({ key, amount: val as number }));

    const getGeneInfo = (key: string) => {
        const type = key.split('_')[1];
        switch (type) {
            case 'fire': return { name: 'Hỏa Tinh Gene', desc: 'Kháng hệ Hỏa, +Sát thương Hỏa', color: 'text-red-400', icon: 'fa-fire' };
            case 'water': return { name: 'Thủy Thể Gene', desc: 'Kháng hệ Thủy, +Lá chắn Thủy', color: 'text-blue-400', icon: 'fa-tint' };
            case 'earth': return { name: 'Thổ Mạch Gene', desc: 'Kháng hệ Thổ, +Phòng thủ cứng', color: 'text-yellow-600', icon: 'fa-mountain' };
            case 'wind': return { name: 'Phong Tiễn Gene', desc: 'Kháng hệ Phong, +Né tránh', color: 'text-emerald-400', icon: 'fa-wind' };
            case 'light': return { name: 'Quang Dực Gene', desc: 'Kháng hệ Quang, +Hồi phục', color: 'text-yellow-300', icon: 'fa-sun' };
            case 'dark': return { name: 'Ám Vực Gene', desc: 'Kháng hệ Ám, +Hút máu', color: 'text-purple-400', icon: 'fa-moon' };
            case 'hp': return { name: 'Sinh Lực Gen', desc: 'Tăng cường giới hạn Máu', color: 'text-green-400', icon: 'fa-heart' };
            case 'atk': return { name: 'Cuồng Nộ Gen', desc: 'Tăng cường lực Công', color: 'text-red-500', icon: 'fa-sword' };
            default: return { name: 'Gen Lỗi', desc: 'Chưa xác định', color: 'text-zinc-400', icon: 'fa-question' };
        }
    };

    const getExtractCost = (rankIdx: number) => {
        switch(rankIdx) {
            case 0: return 50; // N
            case 1: return 150; // R
            case 2: return 400; // SR
            case 3: return 1000; // SSR
            case 4: return 2500; // UR
            default: return 50;
        }
    };

    const getSpliceRequirements = (currentGenes: number) => {
        if (currentGenes === 0) return { genes: 100, dc: 2000, lvl: 10, oc: 0 };
        if (currentGenes === 1) return { genes: 250, dc: 5000, lvl: 30, oc: 1 };
        if (currentGenes === 2) return { genes: 500, dc: 10000, lvl: 50, oc: 3 };
        return { genes: 0, dc: 0, lvl: 0, oc: 0 };
    };

    const handleExtract = () => {
        if (!extractTarget) return;
        const rankIdx = getRankIndex(extractTarget.cardClass);
        const cost = getExtractCost(rankIdx);
        
        if (currency < cost) return onError(`Cần ${cost} DC để thực hiện trích xuất thẻ ${extractTarget.cardClass}.`);
        
        onAlert("Xác nhận Trích Xuất", `Đặc vụ ${extractTarget.name} sẽ bị phá hủy hoàn toàn để lấy Mã Thông Tin Di Truyền (Gene). Tiếp tục?`);
        // we need to use a real confirm modal from parent eventually or just do it. Let's do it directly.
        setGlobalProcessing(true);
        setTimeout(() => {
            const rand = Math.random();
            let geneType = 'hp';
            if (rand < 0.7 && extractTarget.element) {
                geneType = extractTarget.element.toLowerCase();
            } else {
                geneType = ['Vanguard', 'Striker', 'Sniper'].includes(extractTarget.role || '') ? 'atk' : 'hp';
            }
            const geneKey = `gene_${geneType}`;
            
            // Generate fragments based on rank
            let fragments = 1;
            if (rankIdx === 0) fragments = Math.floor(Math.random() * 3) + 1; // 1-3
            else if (rankIdx === 1) fragments = Math.floor(Math.random() * 4) + 5; // 5-8
            else if (rankIdx === 2) fragments = Math.floor(Math.random() * 6) + 15; // 15-20
            else if (rankIdx === 3) fragments = Math.floor(Math.random() * 11) + 40; // 40-50
            else if (rankIdx === 4) fragments = Math.floor(Math.random() * 51) + 100; // 100-150

            modifyCurrency(-cost);
            modifyInventory(0, 0, { [geneKey]: fragments });
            removeCard(extractTarget.id);
            setExtractTargetId(null);
            setGlobalProcessing(false);
            onAlert("Trích Xuất Thành Công", `Đã phá hủy thẻ và nhận được ${fragments} x [${getGeneInfo(geneKey).name}]`);
        }, 1000);
    };

    const handleSplice = () => {
        if (!spliceTarget || !selectedGene) return;
        const currentGenes = spliceTarget.genes?.length || 0;
        
        if (getRankIndex(spliceTarget.cardClass) < 3) return onError("Chỉ có thể cấy ghép Gene vào thẻ SSR trở lên.");
        if (currentGenes >= 3) return onError("Thẻ này đã cấy tối đa 3 Gene Đột Biến.");
        if (spliceTarget.genes?.includes(selectedGene)) return onError("Thẻ này đã có Gene này rồi, không thể cấy ghép trùng lặp.");
        
        const reqs = getSpliceRequirements(currentGenes);
        const requiredGenes = reqs.genes;
        const requiredDC = reqs.dc;
        
        const targetLevel = spliceTarget.level || 1;
        const targetOC = spliceTarget.overclockLevel || 0;
        
        if (targetLevel < reqs.lvl) return onError(`Khe cấy ghép ${currentGenes + 1} yêu cầu thẻ đạt Cấp độ ${reqs.lvl}+.`);
        if (targetOC < reqs.oc) return onError(`Khe cấy ghép ${currentGenes + 1} yêu cầu thẻ đã Cường hoá (Overclock) +${reqs.oc} trở lên.`);

        const ownedGenes = inventory[selectedGene] || 0;
        if (ownedGenes < requiredGenes) return onError(`Cần ${requiredGenes} ${getGeneInfo(selectedGene).name} để cấy ghép khe này (Hiện có: ${ownedGenes}).`);
        if (currency < requiredDC) return onError(`Cần ${requiredDC} DC để cấy ghép Gene này.`);
        
        setGlobalProcessing(true);
        setTimeout(() => {
            modifyCurrency(-requiredDC);
            modifyInventory(0, 0, { [selectedGene]: -requiredGenes });
            
            const newlySplicedCard = { ...spliceTarget };
            if (!newlySplicedCard.genes) newlySplicedCard.genes = [];
            newlySplicedCard.genes.push(selectedGene);
            
            updateCard(newlySplicedCard);
            setSpliceTargetId(null);
            setSelectedGene(null);
            setGlobalProcessing(false);
            
            const info = getGeneInfo(selectedGene);
            onAlert("Đột Biến Thành Công", `Đặc vụ ${spliceTarget.name} đã thăng hoa và nhận được ${info.name}!`);
        }, 1500);
    };

    // Filters for Extract
    const extractCandidates = cards.filter(c => getRankIndex(c.cardClass) < 3);

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
            
            {/* Mode Switcher */}
            <div className="flex bg-black/50 rounded-lg p-1 border border-emerald-900/50 mb-8">
                <button 
                    onClick={() => setMode('extract')}
                    className={`px-6 py-2 rounded-md font-mono text-xs uppercase tracking-widest transition-all ${mode === 'extract' ? 'bg-emerald-900/80 text-emerald-300' : 'text-zinc-500 hover:text-white'}`}
                >
                    <Icon name="fa-syringe" /> TRÍCH XUẤT DNA
                </button>
                <button 
                    onClick={() => setMode('splice')}
                    className={`px-6 py-2 rounded-md font-mono text-xs uppercase tracking-widest transition-all ${mode === 'splice' ? 'bg-emerald-900/80 text-emerald-300' : 'text-zinc-500 hover:text-white'}`}
                >
                    <Icon name="fa-dna" /> ĐỘT BIẾN GEN
                </button>
            </div>

            {mode === 'extract' && (
                <div className="w-full flex flex-col md:flex-row gap-6">
                   {/* Left: Extract Target Selector */}
                   <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl p-6">
                        <h3 className="text-emerald-400 font-mono text-sm uppercase mb-4 tracking-widest"><Icon name="fa-flask" /> Nguồn DNA (Thẻ phụ)</h3>
                        <div className="h-64 border-2 border-dashed border-emerald-900/30 rounded-xl flex items-center justify-center p-4 bg-black/30">
                            {extractTarget ? (
                                <div className="relative">
                                    <MiniCard card={extractTarget} width={120} height={180} />
                                    <button onClick={() => setExtractTargetId(null)} className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-black z-10"><Icon name="fa-times" /></button>
                                </div>
                            ) : (
                                <div className="text-center text-zinc-600">
                                    <Icon name="fa-plus text-3xl mb-2 opacity-50" />
                                    <p className="text-xs uppercase tracking-widest font-mono">Chọn Thẻ N/R/SR</p>
                                </div>
                            )}
                        </div>
                   </div>

                   {/* Right: Candidates & Action */}
                   <div className="w-full md:w-[400px] bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 flex flex-col">
                        <div className="flex-1 overflow-y-auto mb-4 border border-zinc-800 bg-black/50 p-2 rounded-lg grid grid-cols-3 gap-2 h-64 content-start">
                            {extractCandidates.map(c => (
                                <div key={c.id} className={`cursor-pointer hover:scale-105 transition-transform ${extractTargetId === c.id ? 'ring-2 ring-emerald-500' : 'opacity-70'}`} onClick={() => setExtractTargetId(c.id)}>
                                    <MiniCard card={c} />
                                </div>
                            ))}
                            {extractCandidates.length === 0 && <div className="col-span-3 text-center text-zinc-500 p-4 font-mono text-xs">Không có thẻ N/R/SR nào</div>}
                        </div>
                        
                        <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-lg text-center mb-4">
                            <p className="text-xs text-red-400 font-mono italic">Thẻ sẽ bị phá hủy hoàn toàn. Tỉ lệ nhận Gene Kháng Hệ 40%.</p>
                        </div>

                        <button 
                            onClick={handleExtract}
                            disabled={!extractTarget || isGlobalProcessing}
                            className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase tracking-widest py-4 rounded-lg transition-all disabled:opacity-50 disabled:bg-zinc-700 disabled:text-zinc-500 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                            <span className="text-lg"><Icon name="fa-cog" className={isGlobalProcessing ? "animate-spin mr-2" : "mr-2"} /> TRÍCH XUẤT</span>
                            <span className="text-xs opacity-80 mt-1 font-mono">Phí: {extractTarget ? getExtractCost(getRankIndex(extractTarget.cardClass)) : 0} DC</span>
                        </button>
                   </div>
                </div>
            )}

            {mode === 'splice' && (
                <div className="w-full flex flex-col lg:flex-row gap-6">
                    {/* Left: SSR/UR Target */}
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 relative">
                            <h3 className="text-emerald-400 font-mono text-sm uppercase mb-4 tracking-widest"><Icon name="fa-user-astronaut" /> Chủ thể Đột Biến (SSR/UR)</h3>
                            
                            <div className="flex gap-6 items-center">
                                <div className="h-64 w-44 border-2 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] rounded-xl flex items-center justify-center p-2 bg-black/50 relative shrink-0">
                                    {spliceTarget ? (
                                        <>
                                            <MiniCard card={spliceTarget} width={140} height={220} />
                                            <button onClick={() => setSpliceTargetId(null)} className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-black z-10 text-xs"><Icon name="fa-times" /></button>
                                        </>
                                    ) : (
                                        <div className="text-center text-zinc-600">
                                            <Icon name="fa-plus text-3xl mb-2 opacity-50" />
                                            <p className="text-[10px] uppercase tracking-widest font-mono">Chọn Thẻ</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col gap-2 bg-black/40 p-4 rounded-lg border border-white/5 h-64 overflow-y-auto">
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 border-b border-white/10 pb-2">Danh sách thẻ SSR/UR</p>
                                    {cards.filter(c => getRankIndex(c.cardClass) >= 3).map(c => (
                                        <div key={c.id} onClick={() => setSpliceTargetId(c.id)} className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all ${spliceTargetId === c.id ? 'bg-emerald-900/40 border-l-2 border-emerald-500' : 'bg-white/5 hover:bg-white/10'}`}>
                                            <div className={`w-8 h-8 rounded shrink-0 bg-cover bg-center ${getRankIndex(c.cardClass) === 4 ? 'ring-2 ring-cinematic-cyan' : 'ring-2 ring-cinematic-gold'}`} style={{backgroundImage: `url(${c.imageUrl})`}}></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{c.name}</p>
                                                <p className="text-[9px] text-zinc-400 font-mono uppercase">{c.cardClass}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Gene Slots preview */}
                        {spliceTarget && (
                            <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-4 flex justify-between gap-4">
                                {[0,1,2].map(idx => {
                                    const hasGene = spliceTarget.genes?.[idx];
                                    const gInfo = hasGene ? getGeneInfo(hasGene) : null;
                                    return (
                                        <div key={idx} className="flex-1 bg-black/50 border border-white/10 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                                            {gInfo ? (
                                                <>
                                                    <Icon name={`${gInfo.icon} text-lg ${gInfo.color} mb-1`} />
                                                    <p className={`text-[10px] font-bold uppercase ${gInfo.color}`}>{gInfo.name}</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Icon name="fa-dna text-zinc-700 text-lg mb-1" />
                                                    <p className="text-[10px] text-zinc-600 font-mono uppercase">Slot Trống</p>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right: Gene Inventory & Action */}
                    <div className="w-full lg:w-[350px] bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 flex flex-col">
                        <h3 className="text-emerald-400 font-mono text-sm uppercase mb-4 tracking-widest"><Icon name="fa-vials" /> Sinh Tồn Thể (Gene)</h3>
                        
                        <div className="flex-1 overflow-y-auto mb-6 flex flex-col gap-2">
                            {availableGenes.length === 0 && <p className="text-zinc-500 font-mono text-xs p-4 bg-black/30 rounded text-center">Không có Gene nào. Trích xuất thêm từ thẻ phụ.</p>}
                            {availableGenes.map(g => {
                                const info = getGeneInfo(g.key);
                                return (
                                    <div 
                                        key={g.key} 
                                        onClick={() => setSelectedGene(g.key)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedGene === g.key ? 'bg-emerald-900/30 border-emerald-500' : 'bg-black/50 border-white/10 hover:border-emerald-500/50'}`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`font-bold text-xs uppercase flex items-center gap-1.5 ${info.color}`}><Icon name={info.icon} /> {info.name}</span>
                                            <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded font-mono">Kho: {g.amount}</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-400">{info.desc}</p>
                                    </div>
                                )
                            })}
                        </div>
                        
                        {spliceTarget && selectedGene && (
                            <div className="bg-emerald-950/20 border border-emerald-900/30 p-4 rounded-lg mb-4 text-xs font-mono text-emerald-100 flex flex-col gap-1">
                                <div className="flex justify-between"><span>Yêu cầu cấp:</span> <span className={((spliceTarget.level || 1) >= getSpliceRequirements(spliceTarget.genes?.length || 0).lvl) ? "text-emerald-400" : "text-red-400"}>{getSpliceRequirements(spliceTarget.genes?.length || 0).lvl}</span></div>
                                <div className="flex justify-between"><span>Yêu cầu OC:</span> <span className={((spliceTarget.overclockLevel || 0) >= getSpliceRequirements(spliceTarget.genes?.length || 0).oc) ? "text-emerald-400" : "text-red-400"}>+{getSpliceRequirements(spliceTarget.genes?.length || 0).oc}</span></div>
                                <div className="flex justify-between"><span>Số Gene cần:</span> <span className={((inventory[selectedGene] || 0) >= getSpliceRequirements(spliceTarget.genes?.length || 0).genes) ? "text-emerald-400" : "text-red-400"}>{getSpliceRequirements(spliceTarget.genes?.length || 0).genes}</span></div>
                            </div>
                        )}
                        <button 
                            onClick={handleSplice}
                            disabled={!spliceTarget || !selectedGene || isGlobalProcessing || (spliceTarget?.genes?.length || 0) >= 3 || spliceTarget?.genes?.includes(selectedGene)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase tracking-widest py-4 rounded-lg transition-all disabled:opacity-50 disabled:bg-zinc-700 disabled:text-zinc-500 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                            <span className="text-lg"><Icon name="fa-bolt" className={isGlobalProcessing ? "animate-spin mr-2" : "mr-2"} /> CẤY GHÉP</span>
                            <span className="text-xs opacity-80 mt-1 font-mono">Phí: {spliceTarget ? getSpliceRequirements(spliceTarget.genes?.length || 0).dc : 0} DC</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
