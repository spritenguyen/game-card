import React, { useState } from 'react';
import { Card, AppConfig } from '../types';
import { FullCard } from '../components/FullCard';
import { getFactionInfo, getRankIndex } from '../lib/gameLogic';
import { generateAscensionFromAI, generateImageFromAi } from '../services/ai';
import { MiniCard } from '../components/MiniCard';

interface Props {
  config: AppConfig;
  currency: number;
  modifyCurrency: (amount: number) => void;
  inventory: any;
  cards: Card[];
  modifyInventory: (bd: number, ed: number, m?: Record<string, number>, dd?: number) => void;
  onCompleteAscension: (newCard: Card, oldIdsToDelete: string[]) => Promise<void>;
  onError: (msg: string) => void;
  onAlert: (t: string, m: string) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (v: boolean) => void;
}

export const AscensionView: React.FC<Props> = ({ config, currency, modifyCurrency, inventory, cards, modifyInventory, onCompleteAscension, onError, onAlert, isGlobalProcessing, setGlobalProcessing }) => {
    const [card, setCard] = useState<Card | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    
    // Selectors
    const [coreSlot, setCoreSlot] = useState<Card | null>(null);
    const [sac1Slot, setSac1Slot] = useState<Card | null>(null);
    const [sac2Slot, setSac2Slot] = useState<Card | null>(null);
    
    // Modal state for selecting slots
    const [selectorTarget, setSelectorTarget] = useState<'core' | 'sac1' | 'sac2' | null>(null);

    const DC_COST = 5000;
    const DUST_COST = 200;

    const canAscend = coreSlot !== null && sac1Slot !== null && sac2Slot !== null && !isGlobalProcessing;

    const handleSelectCard = (id: string) => {
        const c = cards.find(x => x.id === id);
        if (!c) return;
        
        if (selectorTarget === 'core') {
            if (c.cardClass !== 'SSR') return onError("Lõi Thức Tỉnh phải là thẻ hệ SSR.");
            if (sac1Slot?.id === id || sac2Slot?.id === id) return onError("Thẻ này đang được dùng làm vật hiến tế!");
            setCoreSlot(c);
        } else if (selectorTarget === 'sac1') {
            if (c.cardClass !== 'SSR') return onError("Vật hiến tế phải là thẻ hệ SSR.");
            if (coreSlot?.id === id || sac2Slot?.id === id) return onError("Thẻ này đã được trích xuất DNA trên đài!");
            setSac1Slot(c);
        } else if (selectorTarget === 'sac2') {
            if (c.cardClass !== 'SSR') return onError("Vật hiến tế phải là thẻ hệ SSR.");
            if (coreSlot?.id === id || sac1Slot?.id === id) return onError("Thẻ này đã được trích xuất DNA trên đài!");
            setSac2Slot(c);
        }
        
        setSelectorTarget(null);
    };

    const getAvailableCardsForSlot = () => {
        return cards.filter(c => {
            if (c.id === 'demo-1' || c.id === 'demo-2') return false;
            if (c.cardClass !== 'SSR') return false; // Chỉ cho phép hiến tế hoặc làm core là thẻ SSR
            return true;
        });
    };

    const executeAscension = async () => {
        if (!canAscend) return;
        
        if (currency < DC_COST) return onError(`Không đủ Data Credits (Yêu cầu ${DC_COST} DC).`);
        if ((inventory.quantumDust || 0) < DUST_COST) return onError(`Không đủ ${DUST_COST} Quantum Dust.`);

        setGlobalProcessing(true);
        try {
            if (currency < DC_COST) {
                setGlobalProcessing(false);
                return onError("Giao dịch Credit bị từ chối. Không đủ Data Credits.");
            }
            modifyCurrency(-DC_COST);
            modifyInventory(0, 0, {}, -DUST_COST);

            const cardData = await generateAscensionFromAI(coreSlot, config);
            
            // Re-apply some strict rules to ensure uniqueness and compliance
            cardData.cardClass = 'UR';
            cardData.id = 'CINE-UR-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
            
            setCard(cardData);
            setIsLoadingImage(true);

            // Generate Image
            try {
                const imgUrl = await generateImageFromAi(cardData, config);
                cardData.imageUrl = imgUrl; 
                setCard({ ...cardData });
            } catch(e) {}
            finally {
                setIsLoadingImage(false);
            }

            const oldIds = [coreSlot.id, sac1Slot.id, sac2Slot.id];
            await onCompleteAscension(cardData, oldIds);
            
            // Clean slots
            setCoreSlot(null);
            setSac1Slot(null);
            setSac2Slot(null);

            onAlert("LÒ KHỞI NGUYÊN (UR FORGE)", `Thức tỉnh thành công siêu nhân vật hạng UR!<br>3 thẻ SSR gốc đã bị phân rã hoàn toàn.`);
            
        } catch(e: any) {
            modifyCurrency(DC_COST);
            modifyInventory(0, 0, {}, DUST_COST); // Refund dust
            if(e.message === "API_KEY_INVALID") onAlert("Hệ Thống Cine-Tech", "API Key không hợp lệ. Kiểm tra cài đặt.");
            else onError("Lỗi Thức Tỉnh. Đã hoàn tiền & tài nguyên.");
        } finally {
            setGlobalProcessing(false);
        }
    };

    const renderEmptySlot = (label: string, isCore: boolean) => (
        <div className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed ${isCore ? 'border-cinematic-gold/50' : 'border-red-500/50'} rounded-xl bg-black/40 hover:bg-white/5 transition-all text-center p-1 sm:p-2`}> 
            <i className={`fa-solid ${isCore ? 'fa-dna' : 'fa-skull'} text-xl sm:text-3xl mb-1 sm:mb-3 ${isCore ? 'text-cinematic-gold/50' : 'text-red-500/50'}`}></i>
            <span className={`text-[7px] sm:text-[9px] uppercase tracking-widest font-bold ${isCore ? 'text-cinematic-gold/70' : 'text-red-400'}`}>{label}</span>
            <span className="text-[6px] sm:text-[8px] text-white/40 mt-1 uppercase">Yêu cầu hệ SSR</span>
        </div>
    );

    const renderCardSlot = (c: Card, clearSlot: () => void, isCore: boolean) => (
        <div className={`w-full h-full relative border ${isCore ? 'border-cinematic-gold/80 shadow-[0_0_20px_rgba(255,184,0,0.3)]' : 'border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.3)]'} rounded-xl overflow-hidden group`}>
            <img src={c.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" crossOrigin="anonymous" alt={c.name} />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-1 sm:p-2 pt-6 text-center">
                <div className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest truncate ${isCore ? 'text-cinematic-gold' : 'text-red-400'}`}>{c.name}</div>
                <div className="text-[6px] sm:text-[8px] text-white/70">{c.cardClass} • {getFactionInfo(c.faction).name}</div>
            </div>
            {isCore ? (
                <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-cinematic-gold text-black px-1 sm:px-2 py-0.5 rounded text-[6px] sm:text-[8px] font-bold uppercase tracking-widest"><i className="fa-solid fa-crown sm:mr-1"></i><span className="hidden sm:inline">Vật Thể Gốc</span></div>
            ) : (
                <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-red-600 text-white px-1 sm:px-2 py-0.5 rounded text-[6px] sm:text-[8px] font-bold uppercase tracking-widest"><i className="fa-solid fa-fire sm:mr-1"></i><span className="hidden sm:inline">Tế Vật</span></div>
            )}
            <button 
                onClick={(e) => { e.stopPropagation(); clearSlot(); }}
                className="absolute top-1 right-1 sm:top-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 bg-black/60 hover:bg-red-500/80 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
            >
                <i className="fa-solid fa-xmark text-[8px] sm:text-[10px]"></i>
            </button>
        </div>
    );

    return (
        <div className="w-full flex flex-col items-center animate-fade-in pb-12">
            <div className="w-full max-w-5xl bg-cinematic-900/40 border border-white/5 ring-1 ring-white/5 backdrop-blur-md rounded-3xl p-6 sm:p-10 mb-8 relative overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.5),0_0_40px_rgba(255,184,0,0.05)]">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 50% -20%, #ffb800 0%, transparent 70%)" }}></div>
                
                <h2 className="text-center font-serif text-3xl text-cinematic-gold mb-2 tracking-widest relative z-10"><i className="fa-solid fa-hammer mr-3"></i>LÒ RÈN KHỞI NGUYÊN (UR)</h2>
                <div className="text-center mb-10 relative z-10">
                    <p className="text-[10px] text-cinematic-gold/70 tracking-widest uppercase block mt-1">Nâng cấp & Tiến hóa dạng sống lên Đẳng cấp Tối Thượng (UR)</p>
                    <p className="text-[9px] text-red-400 uppercase tracking-widest bg-red-900/20 py-1 inline-block px-4 border border-red-900/50 rounded-full mx-auto mt-2"><i className="fa-solid fa-triangle-exclamation mr-1"></i> Thẻ làm Tế Vật & Vật Thể Gốc sẽ biến mất</p>
                </div>

                <div className="flex flex-row justify-center items-end gap-3 sm:gap-8 relative z-10 w-full mb-10">
                    {/* Sac 1 */}
                    <div 
                        onClick={() => !sac1Slot && setSelectorTarget('sac1')}
                        className="w-24 h-36 sm:w-48 sm:h-72 cursor-pointer transform hover:-translate-y-2 transition-transform shrink-0"
                    >
                        {sac1Slot ? renderCardSlot(sac1Slot, () => setSac1Slot(null), false) : renderEmptySlot("Tế vật 1", false)}
                    </div>

                    {/* Core Slot */}
                    <div 
                        onClick={() => !coreSlot && setSelectorTarget('core')}
                        className="w-32 h-44 sm:w-56 sm:h-80 cursor-pointer transform hover:scale-105 transition-transform z-10 shrink-0"
                    >
                        {coreSlot ? renderCardSlot(coreSlot, () => setCoreSlot(null), true) : renderEmptySlot("Vật Thể Gốc", true)}
                    </div>

                    {/* Sac 2 */}
                    <div 
                        onClick={() => !sac2Slot && setSelectorTarget('sac2')}
                        className="w-24 h-36 sm:w-48 sm:h-72 cursor-pointer transform hover:-translate-y-2 transition-transform shrink-0"
                    >
                        {sac2Slot ? renderCardSlot(sac2Slot, () => setSac2Slot(null), false) : renderEmptySlot("Tế vật 2", false)}
                    </div>
                </div>

                {/* Info & Requirements */}
                <div className="flex flex-col items-center relative z-10 w-full mb-6 py-4 bg-black/40 rounded-2xl border border-white/5">
                    <div className="text-[10px] text-cinematic-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-flask"></i> Vật phẩm Xúc Tác Cần Thiết
                    </div>
                    <div className="flex gap-6 mb-4">
                        <div className="flex flex-col items-center">
                            <span className={`text-xl font-bold font-mono ${currency >= DC_COST ? 'text-cinematic-gold' : 'text-red-500'}`}>{DC_COST}</span>
                            <span className="text-[10px] text-white/50 uppercase tracking-widest mt-1">Data Credits</span>
                        </div>
                        <div className="w-[1px] bg-white/20"></div>
                        <div className="flex flex-col items-center">
                            <span className={`text-xl font-bold font-mono ${(inventory.quantumDust || 0) >= DUST_COST ? 'text-cinematic-cyan' : 'text-red-500'}`}>{DUST_COST}</span>
                            <span className="text-[10px] text-white/50 uppercase tracking-widest mt-1">Quantum Dust</span>
                        </div>
                    </div>
                </div>

                {/* Execute Button */}
                <div className="flex justify-center relative z-10">
                    <button 
                        onClick={executeAscension} 
                        disabled={!canAscend || currency < DC_COST || (inventory.quantumDust || 0) < DUST_COST}
                        className={`w-full max-w-sm py-4 rounded-xl font-bold tracking-widest uppercase transition-all duration-300 shadow-[0_0_30px_rgba(255,184,0,0.2)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${canAscend && !isGlobalProcessing ? 'bg-gradient-to-r from-cinematic-gold to-yellow-600 hover:from-yellow-500 hover:to-cinematic-gold text-black hover:scale-105' : 'bg-zinc-800 text-zinc-500'}`}
                    >   
                        <i className={`fa-solid ${isGlobalProcessing ? 'fa-circle-notch fa-spin' : 'fa-bolt-lightning'} text-xl`}></i>
                        <span className="text-sm">
                            {isGlobalProcessing ? 'ĐANG TIẾN HÓA...' : (canAscend ? 'TIẾN HÓA THẺ UR' : 'CHƯA ĐỦ VẬT LIỆU')}
                        </span>
                    </button>
                </div>
            </div>

            {card && (
                <div className="w-full flex justify-center animate-slide-up mb-12">
                    <FullCard card={card} isModal={false} isLoadingImage={isLoadingImage} isSaved={true} context="fusion" config={config} />
                </div>
            )}

            {/* Selector Modal */}
            {selectorTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectorTarget(null)}></div>
                    <div className="relative z-10 w-full max-w-4xl max-h-[80vh] flex flex-col bg-cinematic-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h3 className="text-xl font-serif text-white tracking-widest uppercase">
                                Chọn Thẻ <span className={selectorTarget === 'core' ? 'text-cinematic-gold' : 'text-red-400'}>{selectorTarget === 'core' ? 'Làm Vật Thể Gốc' : 'Làm Tế Vật'}</span>
                            </h3>
                            <button onClick={() => setSelectorTarget(null)} className="text-white/50 hover:text-white transition-colors">
                                <i className="fa-solid fa-xmark text-2xl"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 content-start">
                            {getAvailableCardsForSlot().map(c => (
                                <MiniCard 
                                    key={c.id} 
                                    card={c} 
                                    context="fusion-selector"
                                    locked={c.cardClass !== 'SSR'} // extra safety
                                    selected={coreSlot?.id === c.id || sac1Slot?.id === c.id || sac2Slot?.id === c.id}
                                    onClickAction={() => handleSelectCard(c.id)}
                                />
                            ))}
                            {getAvailableCardsForSlot().length === 0 && (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-white/10 rounded-xl">
                                    <p className="text-white/40 uppercase tracking-widest text-[10px]"><i className="fa-solid fa-box-open mr-2 text-lg mb-2"></i><br/>Chưa có thẻ SSR nào khả dụng trong kho chứa.</p>
                                </div>
                            )}
                        </div>
                        <div className="shrink-0 mt-4 pt-4 border-t border-white/10">
                            <button onClick={() => setSelectorTarget(null)} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold tracking-widest uppercase text-[10px]">Hủy</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
