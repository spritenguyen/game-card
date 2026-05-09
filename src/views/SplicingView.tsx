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
            case 'fire': return { name: 'Pyro-Sequence', desc: 'Grants Fire Resistance & Enhanced Pyrokinesis', color: 'text-red-400', icon: 'fa-fire' };
            case 'water': return { name: 'Hydro-Mesh', desc: 'Grants Water Resistance & Aquatic Shielding', color: 'text-blue-400', icon: 'fa-tint' };
            case 'earth': return { name: 'Terra-Alloy', desc: 'Grants Earth Resistance & Fortified Plating', color: 'text-yellow-600', icon: 'fa-mountain' };
            case 'wind': return { name: 'Aero-Dynamics', desc: 'Grants Wind Resistance & Evasion Boost', color: 'text-emerald-400', icon: 'fa-wind' };
            case 'light': return { name: 'Solar-Fiber', desc: 'Grants Light Resistance & Auto-Regeneration', color: 'text-yellow-300', icon: 'fa-sun' };
            case 'dark': return { name: 'Void-Matter', desc: 'Grants Dark Resistance & Lifesteal Protocol', color: 'text-purple-400', icon: 'fa-moon' };
            case 'hp': return { name: 'Vitality-Gen', desc: 'Significantly Enhances Base Health Limits', color: 'text-green-400', icon: 'fa-heart' };
            case 'atk': return { name: 'Wrath-Gen', desc: 'Significantly Enhances Attack Capabilities', color: 'text-red-500', icon: 'fa-sword' };
            default: return { name: 'Unknown Anomaly', desc: 'Unidentified String of DNA', color: 'text-zinc-400', icon: 'fa-question' };
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
        
        if (currency < cost) return onError(`[TÀI KHOẢN KHÔNG ĐỦ] Yêu cầu ${cost} DC để trích xuất thẻ ${extractTarget.cardClass}.`);
        
        onAlert("XÁC NHẬN TRÍCH XUẤT", `CẢNH BÁO: Đặc vụ ${extractTarget.name} sẽ bị tiêu hủy vĩnh viễn để tinh xuất Mã Di Truyền (Gene). Bạn có chắc chắn muốn tiếp tục?`);
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
            onAlert("TRÍCH XUẤT HOÀN TẤT", `Quá trình phân rã thành công. Thu nhận ${fragments} x [${getGeneInfo(geneKey).name}]`);
        }, 1000);
    };

    const handleSplice = () => {
        if (!spliceTarget || !selectedGene) return;
        const currentGenes = spliceTarget.genes?.length || 0;
        
        if (getRankIndex(spliceTarget.cardClass) < 3) return onError("[LỖI TƯƠNG THÍCH] Chỉ vật chủ cấp SSR trở lên mới chịu đựng được Đột Biến.");
        if (currentGenes >= 3) return onError("[GIỚI HẠN CHỊU ĐỰNG] Vật chủ đã đạt ngưỡng đột biến tối đa (3 Genes).");
        if (spliceTarget.genes?.includes(selectedGene)) return onError("[TRÙNG LẶP] Chuỗi Gene này đã tồn tại trong vật chủ.");
        
        const reqs = getSpliceRequirements(currentGenes);
        const requiredGenes = reqs.genes;
        const requiredDC = reqs.dc;
        
        const targetLevel = spliceTarget.level || 1;
        const targetOC = spliceTarget.overclockLevel || 0;
        
        if (targetLevel < reqs.lvl) return onError(`[SINH LỰC THẤP] Lần cấy ghép ${currentGenes + 1} yêu cầu vật chủ đạt Cấp Thể Chất ${reqs.lvl}+.`);
        if (targetOC < reqs.oc) return onError(`[NĂNG LƯỢNG THẤP] Lần cấy ghép ${currentGenes + 1} yêu cầu Cường Hoá (Overclock) +${reqs.oc}.`);

        const ownedGenes = inventory[selectedGene] || 0;
        if (ownedGenes < requiredGenes) return onError(`[THIẾU TÀI NGUYÊN] Cần ${requiredGenes} ${getGeneInfo(selectedGene).name} (Hiện có: ${ownedGenes}).`);
        if (currency < requiredDC) return onError(`[TÀI KHOẢN KHÔNG ĐỦ] Yêu cầu ${requiredDC} DC để thực hiện Đột Biến.`);
        
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
            onAlert("ĐỘT BIẾN THÀNH CÔNG", `Vật chủ ${spliceTarget.name} đã thăng hoa sinh học, dung hợp thành công ${info.name}!`);
        }, 1500);
    };

    // Filters for Extract
    const extractCandidates = cards.filter(c => getRankIndex(c.cardClass) < 3);

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
            
            {/* Magazine Header */}
            <header className="mb-12 border-b-2 border-white/20 pb-8 text-center flex flex-col items-center w-full">
                 <h1 className="text-4xl sm:text-6xl font-light tracking-[0.2em] font-serif text-white uppercase mb-2">Haute<br/>Biotech</h1>
                 <p className="text-[10px] sm:text-xs tracking-[0.4em] font-mono text-zinc-500 uppercase">Mutation & Genetic Splicing</p>
            </header>

            {/* Mode Switcher */}
            <div className="flex border-b border-white/10 mb-12 w-full max-w-md justify-center">
                <button 
                    onClick={() => setMode('extract')}
                    className={`flex-1 py-4 font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] transition-all relative ${mode === 'extract' ? 'text-white' : 'text-zinc-600 hover:text-white/80'}`}
                >
                    <Icon name="fa-syringe mb-2 block text-lg" /> Extraction
                    {mode === 'extract' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white"></div>}
                </button>
                <div className="w-[1px] bg-white/10"></div>
                <button 
                    onClick={() => setMode('splice')}
                    className={`flex-1 py-4 font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] transition-all relative ${mode === 'splice' ? 'text-white' : 'text-zinc-600 hover:text-white/80'}`}
                >
                    <Icon name="fa-dna mb-2 block text-lg" /> Splicing
                    {mode === 'splice' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white"></div>}
                </button>
            </div>

            {mode === 'extract' && (
                <div className="w-full flex flex-col md:flex-row gap-8">
                   {/* Left: Extract Target Selector */}
                   <div className="flex-1 bg-zinc-950 border border-white/10 p-8 flex flex-col relative group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-full blur-3xl"></div>
                        <h3 className="font-serif text-white/50 text-xs sm:text-sm uppercase mb-6 tracking-[0.3em] flex items-center gap-3"><Icon name="fa-flask" /> Subject [N/R/SR]</h3>
                        
                        <div className="flex-1 min-h-[300px] border border-white/10 flex items-center justify-center p-6 bg-black relative">
                            {/* Cinematic grid lines */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
                            
                            {extractTarget ? (
                                <div className="relative z-10 animate-fade-in group/card">
                                    <div className="absolute -inset-4 bg-white/5 blur-xl group-hover/card:bg-white/10 transition-all pointer-events-none"></div>
                                    <MiniCard card={extractTarget} width={160} height={240} />
                                    <button 
                                        onClick={() => setExtractTargetId(null)} 
                                        className="absolute -top-3 -right-3 bg-black text-white hover:bg-white hover:text-black hover:scale-110 transition-all rounded-full w-8 h-8 flex items-center justify-center border border-white/20 shadow-xl z-20 cursor-pointer"
                                    >
                                        <Icon name="fa-times" />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center text-zinc-600 z-10">
                                    <Icon name="fa-user-astronaut text-4xl mb-4 opacity-50 font-light" />
                                    <p className="text-[10px] uppercase tracking-[0.3em] font-mono mix-blend-screen">Select Subject</p>
                                </div>
                            )}
                        </div>
                   </div>

                   {/* Right: Candidates & Action */}
                   <div className="w-full md:w-[400px] flex flex-col gap-6 shrink-0">
                        <div className="flex-1 overflow-y-auto mb-2 border border-white/10 bg-zinc-950 p-4 grid grid-cols-3 gap-2 sm:gap-3 h-80 content-start relative shadow-inner">
                            <div className="absolute top-0 right-0 p-2 text-[8px] font-mono text-zinc-700 tracking-widest uppercase pointer-events-none">Candidates</div>
                            {extractCandidates.map(c => (
                                <div key={c.id} className={`cursor-pointer transition-all duration-500 rounded overflow-hidden ${extractTargetId === c.id ? 'ring-2 ring-white scale-[1.02] z-10 shadow-lg' : 'opacity-60 saturate-50 hover:opacity-100 hover:saturate-100'}`} onClick={() => setExtractTargetId(c.id)}>
                                    <MiniCard card={c} />
                                </div>
                            ))}
                            {extractCandidates.length === 0 && <div className="col-span-3 text-center text-zinc-600 font-mono text-[10px] mt-10 tracking-widest uppercase">No Subjects Found</div>}
                        </div>
                        
                        <div className="border border-red-500/30 p-4 bg-red-500/5">
                            <p className="text-[10px] text-red-500 font-mono uppercase tracking-widest flex items-start gap-2">
                                <Icon name="fa-triangle-exclamation mt-0.5" /> 
                                <span>Subject will be permanently destroyed. 40% chance of yielding Element-specific DNA.</span>
                            </p>
                        </div>

                        <button 
                            onClick={handleExtract}
                            disabled={!extractTarget || isGlobalProcessing}
                            className="bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-[0.3em] py-6 transition-all disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed group"
                        >
                            <span className="text-sm font-serif"><Icon name="fa-cog" className={isGlobalProcessing ? "animate-spin mr-2" : "mr-2 group-hover:rotate-90 transition-transform duration-500"} /> Extract</span>
                            <span className="text-[9px] opacity-60 mt-2 font-mono tracking-widest">Fee: {extractTarget ? getExtractCost(getRankIndex(extractTarget.cardClass)) : 0} DC</span>
                        </button>
                   </div>
                </div>
            )}

            {mode === 'splice' && (
                <div className="w-full flex flex-col lg:flex-row gap-8">
                    {/* Left: SSR/UR Target */}
                    <div className="flex-1 flex flex-col gap-6">
                        <div className="bg-zinc-950 border border-white/10 p-8 relative flex flex-col">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none rounded-full blur-3xl"></div>
                            
                            <h3 className="font-serif text-white/50 text-xs sm:text-sm uppercase mb-6 tracking-[0.3em] flex items-center gap-3"><Icon name="fa-dna" /> Host Entity [SSR/UR]</h3>
                            
                            <div className="flex flex-col sm:flex-row gap-8 items-start">
                                <div className="h-[300px] w-[200px] border border-white/10 flex items-center justify-center p-4 bg-black relative shrink-0 overflow-hidden mx-auto sm:mx-0">
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                                    {spliceTarget ? (
                                        <div className="relative z-10 animate-fade-in group">
                                            <MiniCard card={spliceTarget} width={160} height={240} />
                                            <button 
                                                onClick={() => setSpliceTargetId(null)} 
                                                className="absolute -top-3 -right-3 bg-black text-white hover:bg-white hover:text-black hover:scale-110 transition-all rounded-full w-8 h-8 flex items-center justify-center border border-white/20 shadow-xl z-20 cursor-pointer"
                                            >
                                                <Icon name="fa-times" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center text-zinc-600 z-10">
                                            <Icon name="fa-user text-4xl mb-4 opacity-50 font-light" />
                                            <p className="text-[10px] uppercase tracking-[0.3em] font-mono mix-blend-screen">Select Host</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col w-full h-[300px] relative">
                                    <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Available Hosts Directory</h4>
                                    <div className="flex-1 overflow-y-auto flex flex-col gap-2 pe-2 custom-scrollbar">
                                        {cards.filter(c => getRankIndex(c.cardClass) >= 3).map(c => (
                                            <div key={c.id} onClick={() => setSpliceTargetId(c.id)} className={`flex items-center gap-4 p-3 border cursor-pointer transition-all ${spliceTargetId === c.id ? 'bg-white/10 border-white' : 'bg-transparent border-transparent hover:border-white/20'}`}>
                                                <div className={`w-10 h-10 shrink-0 bg-cover bg-center grayscale brightness-75 ${getRankIndex(c.cardClass) === 4 ? 'ring-1 ring-cinematic-cyan' : 'ring-1 ring-cinematic-gold'}`} style={{backgroundImage: `url(${c.imageUrl})`}}></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-serif tracking-widest text-white truncate uppercase">{c.name}</p>
                                                    <p className="text-[9px] text-zinc-500 font-mono tracking-widest mt-1">CLASS: {c.cardClass}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {cards.filter(c => getRankIndex(c.cardClass) >= 3).length === 0 && (
                                            <p className="text-center text-[10px] text-zinc-600 font-mono uppercase mt-8 tracking-widest">No valid hosts</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Gene Slots preview */}
                        {spliceTarget && (
                            <div className="border border-white/10 bg-zinc-950 p-6 flex flex-col sm:flex-row gap-4">
                                {[0,1,2].map(idx => {
                                    const hasGene = spliceTarget.genes?.[idx];
                                    const gInfo = hasGene ? getGeneInfo(hasGene) : null;
                                    return (
                                        <div key={idx} className="flex-1 bg-black border border-white/5 p-4 text-center flex flex-col items-center justify-center min-h-[100px] relative overflow-hidden group">
                                            {gInfo ? (
                                                <div className="relative z-10 animate-fade-in flex flex-col items-center">
                                                    <Icon name={`${gInfo.icon} text-2xl ${gInfo.color} mb-3 filter drop-shadow-[0_0_8px_currentColor]`} />
                                                    <p className={`text-[10px] font-mono tracking-widest uppercase ${gInfo.color}`}>{gInfo.name}</p>
                                                </div>
                                            ) : (
                                                <div className="relative z-10 flex flex-col items-center opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <Icon name="fa-dna text-zinc-600 text-xl mb-2" />
                                                    <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.3em]">Empty Seq</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right: Gene Inventory & Action */}
                    <div className="w-full lg:w-[400px] bg-zinc-950 border border-white/10 p-8 flex flex-col shrink-0">
                        <h3 className="font-serif text-white/50 text-xs sm:text-sm uppercase mb-6 tracking-[0.3em] flex items-center gap-3"><Icon name="fa-vials" /> Synthetic Genes</h3>
                        
                        <div className="flex-1 overflow-y-auto mb-8 flex flex-col gap-3 max-h-[400px] pe-2 custom-scrollbar border-b border-white/10 pb-4">
                            {availableGenes.length === 0 && <p className="text-zinc-600 font-mono text-[10px] uppercase text-center mt-10 tracking-widest">Empty Inventory.<br/><span className="mt-2 block opacity-50">Extract subjects to acquire genes.</span></p>}
                            {availableGenes.map(g => {
                                const info = getGeneInfo(g.key);
                                return (
                                    <div 
                                        key={g.key} 
                                        onClick={() => setSelectedGene(g.key)}
                                        className={`p-4 border cursor-pointer transition-all group ${selectedGene === g.key ? 'bg-white/10 border-white' : 'bg-black border-white/10 hover:border-white/30'}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`font-mono tracking-widest text-[10px] uppercase flex items-center gap-2 ${info.color}`}><Icon name={info.icon} /> {info.name}</span>
                                            <span className="text-zinc-500 text-[9px] font-mono tracking-widest">INV: <span className="text-white">{g.amount}</span></span>
                                        </div>
                                        <p className="text-[9px] text-zinc-500 font-mono tracking-widest opacity-80 leading-relaxed uppercase">{info.desc}</p>
                                    </div>
                                )
                            })}
                        </div>
                        
                        {spliceTarget && selectedGene && (
                            <div className="border border-white/20 p-5 mb-6 text-[9px] font-mono text-zinc-400 flex flex-col gap-3 tracking-[0.2em] uppercase bg-white/5">
                                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                    <span>Lvl Required:</span> 
                                    <span className={((spliceTarget.level || 1) >= getSpliceRequirements(spliceTarget.genes?.length || 0).lvl) ? "text-white" : "text-red-500"}>
                                        {spliceTarget.level || 1} / {getSpliceRequirements(spliceTarget.genes?.length || 0).lvl}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                    <span>OC Required:</span> 
                                    <span className={((spliceTarget.overclockLevel || 0) >= getSpliceRequirements(spliceTarget.genes?.length || 0).oc) ? "text-white" : "text-red-500"}>
                                        +{spliceTarget.overclockLevel || 0} / +{getSpliceRequirements(spliceTarget.genes?.length || 0).oc}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Genes Needed:</span> 
                                    <span className={((inventory[selectedGene] || 0) >= getSpliceRequirements(spliceTarget.genes?.length || 0).genes) ? "text-white" : "text-red-500"}>
                                        {getSpliceRequirements(spliceTarget.genes?.length || 0).genes}
                                    </span>
                                </div>
                            </div>
                        )}
                        <button 
                            onClick={handleSplice}
                            disabled={!spliceTarget || !selectedGene || isGlobalProcessing || (spliceTarget?.genes?.length || 0) >= 3 || spliceTarget?.genes?.includes(selectedGene)}
                            className="bg-white hover:bg-zinc-300 text-black font-bold uppercase tracking-[0.3em] py-6 transition-all disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed w-full group"
                        >
                            <span className="text-sm font-serif"><Icon name="fa-bolt" className={isGlobalProcessing ? "animate-spin mr-2" : "mr-2 group-hover:scale-110 transition-transform duration-500"} /> Splice</span>
                            <span className="text-[9px] opacity-60 mt-2 font-mono tracking-widest">Fee: {spliceTarget ? getSpliceRequirements(spliceTarget.genes?.length || 0).dc : 0} DC</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
