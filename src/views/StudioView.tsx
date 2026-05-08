import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../components/ui/Icon';
import { Card, AppConfig } from '../types';
import { generateImageFromAi } from '../services/ai';
import { IMAGE_MODELS } from '../lib/constants';

interface Props {
  config: AppConfig;
  currency: number;
  modifyCurrency: (amount: number) => void;
  cards: Card[];
  updateCard: (card: Card) => void;
  onAlert: (title: string, msg: string) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (state: boolean) => void;
}

const CONCEPTS = [
  { id: 'haute_couture', label: 'Haute Couture', description: 'High-end fashion, avant-garde, runway style', icon: 'fa-gem' },
  { id: 'cyberpunk_neon', label: 'Cyberpunk Neon', description: 'Neon lights, futuristic streetwear, rainy city', icon: 'fa-city' },
  { id: 'renaissance_sci_fi', label: 'Renaissance Sci-Fi', description: 'Royal robes mixed with advanced technology', icon: 'fa-chess-queen' },
  { id: 'tech_wear', label: 'Tech-wear Minimalist', description: 'Tactical, sleek, black, functional fashion', icon: 'fa-mask-ventilator' },
  { id: 'mecha_streetwear', label: 'Mecha Streetwear', description: 'Oversized jackets, glowing mech parts', icon: 'fa-robot' },
  { id: 'neon_noir', label: 'Neon Noir Detective', description: 'Trench coats, moody lighting, smoke', icon: 'fa-user-secret' },
];

export const StudioView: React.FC<Props> = ({ config, currency, modifyCurrency, cards, updateCard, onAlert, isGlobalProcessing, setGlobalProcessing }) => {
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [selectedConcept, setSelectedConcept] = useState<string>('');
  const [selectedRatio, setSelectedRatio] = useState<string>('9:16');
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showModelSelection, setShowModelSelection] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(config.defaultImageModel || 'flux');
  
  const isEn = config.language === 'en';
  
  const openModelSelection = () => {
    if (!selectedCardId) return onAlert(isEn ? 'Error' : 'Lỗi', isEn ? 'Select an operative first.' : 'Vui lòng chọn đặc vụ.');
    if (!selectedConcept) return onAlert(isEn ? 'Error' : 'Lỗi', isEn ? 'Select a concept.' : 'Vui lòng chọn Concept.');
    
    const cost = 200;
    if (currency < cost) return onAlert(isEn ? 'Error' : 'Lỗi', isEn ? 'Not enough DC.' : `Không đủ ${cost} DC.`);
    
    setShowModelSelection(true);
  };
  
  const handlePhotoshoot = async () => {
    setShowModelSelection(false);
    
    const cost = 200;
    const card = cards.find(c => c.id === selectedCardId);
    if (!card) return;
    
    const conceptObj = CONCEPTS.find(c => c.id === selectedConcept);
    if (!conceptObj) return;
    
    try {
      setGlobalProcessing(true);
      modifyCurrency(-cost);
      
      const payload = {
          ...card,
          studioConcept: conceptObj.label,
          studioRatio: selectedRatio
      };
      
      // Force ignore cache to get a new image
      const newImg = await generateImageFromAi(payload, config, selectedModel, true);
      
      setGeneratedImg(newImg);
      
      // Update card
      const affection = (card.affection || 0) + 10;
      const variants = card.variants ? [...card.variants, newImg] : [card.imageUrl || '', newImg].filter(Boolean);
      
      const updatedCard = {
          ...card,
          affection,
          variants,
      };
      
      updateCard(updatedCard);
      
      onAlert(isEn ? 'Success' : 'Thành công', isEn ? `Photoshoot complete! Affection +10. You can set this image as Main Avatar in the Gallery.` : `Hoàn tất chụp ảnh! Độ thân thiết +10. Bạn có thể chọn ảnh này làm Avatar hiển thị ở Kho Lưu Trữ.`);
      
    } catch (error: any) {
      onAlert(isEn ? 'Error' : 'Lỗi', error?.message || 'Có lỗi xảy ra.');
      modifyCurrency(cost); // refund
    } finally {
      setGlobalProcessing(false);
    }
  };

  const selectedCard = cards.find(c => c.id === selectedCardId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto h-full flex flex-col pt-24 sm:pt-6">
      <div className="flex flex-col mb-8 relative z-10 w-full text-center">
         <div className="w-16 h-16 mx-auto rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(236,72,153,0.2)]">
             <Icon name="fa-camera-retro text-3xl text-pink-400" className="fa-camera-retro text-3xl text-pink-400" />
         </div>
         <h3 className="text-white text-3xl sm:text-4xl font-black font-serif uppercase tracking-[0.2em] drop-shadow-md">Cinematic Studio</h3>
         <p className="text-[10px] sm:text-xs text-zinc-400 font-mono mt-3 uppercase tracking-[0.3em]">{isEn ? 'Haute Couture Photography' : 'Nhiếp Ảnh Thời Trang Chuyên Sâu'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 z-10">
        <div className="space-y-6">
            <div className="bg-black/60 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                 <h4 className="text-cinematic-cyan font-mono text-sm uppercase tracking-widest mb-4 flex items-center gap-2"><Icon name="fa-users" /> {isEn ? '1. SELECT OPERATIVE' : '1. CHỌN ĐẶC VỤ'}</h4>
                 <div className="flex flex-col gap-2 max-h-[300px] sm:max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                     {cards.map(c => (
                         <div 
                           key={c.id} 
                           onClick={() => setSelectedCardId(c.id)}
                           className={`cursor-pointer relative rounded-xl border p-3 flex items-center gap-3 transition-all ${selectedCardId === c.id ? 'border-cinematic-cyan bg-cinematic-cyan/10 shadow-[0_0_10px_rgba(6,182,212,0.15)] ring-1 ring-cinematic-cyan/50' : 'border-white/5 bg-black/40 hover:border-white/20 hover:bg-black/60'}`}
                         >
                             <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-900 border border-white/10 flex-shrink-0">
                                 {c.imageUrl ? (
                                     c.variants && c.activeSkinIndex !== undefined && c.variants[c.activeSkinIndex] ? (
                                        <img src={c.variants[c.activeSkinIndex]} alt={c.name} className="w-full h-full object-cover" />
                                     ) : (
                                        <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                                     )
                                 ) : (
                                     <Icon name="fa-user text-zinc-600 flex items-center justify-center w-full h-full" />
                                 )}
                             </div>
                             <div className="flex-1 min-w-0 flex flex-col justify-center">
                                 <div className="text-xs sm:text-sm font-bold text-white uppercase truncate mb-0.5" title={c.name}>{c.name}</div>
                                 <div className="text-[9px] sm:text-[10px] text-zinc-500 uppercase truncate" title={c.faction}>{c.faction}</div>
                             </div>
                             {(c.affection !== undefined) && (
                                 <div className="text-[10px] sm:text-xs text-pink-400 font-bold flex shrink-0 items-center gap-1.5 ml-2">
                                     <Icon name="fa-heart" /> {c.affection}
                                 </div>
                             )}
                         </div>
                     ))}
                 </div>
                 {cards.length === 0 && <div className="text-zinc-500 text-xs font-mono p-4 border border-white/5 rounded-xl text-center bg-black/40">{isEn ? 'No operatives available.' : 'Chưa có đặc vụ nào.'}</div>}
            </div>

            <div className="bg-black/60 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                 <h4 className="text-pink-400 font-mono text-sm uppercase tracking-widest mb-4 flex items-center gap-2"><Icon name="fa-mask" /> {isEn ? '2. SELECT FORMS' : '2. THIẾT LẬP THÔNG SỐ'}</h4>
                 
                 <div className="mb-6">
                     <h5 className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase mb-3">A. Aspect Ratio (Tỉ lệ khung hình)</h5>
                     <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                         {[
                             { id: '1:1', label: '1:1', icon: 'fa-square' },
                             { id: '9:16', label: '9:16', icon: 'fa-mobile-screen' },
                             { id: '16:9', label: '16:9', icon: 'fa-display' }
                         ].map(ratio => (
                             <button
                                 key={ratio.id}
                                 onClick={() => setSelectedRatio(ratio.id)}
                                 className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono tracking-widest uppercase transition-all ${
                                     selectedRatio === ratio.id 
                                     ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' 
                                     : 'text-zinc-500 hover:text-zinc-300'
                                 }`}
                             >
                                 <Icon name={ratio.icon} /> {ratio.label}
                             </button>
                         ))}
                     </div>
                 </div>

                 <h5 className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase mb-3">B. Concept Theme</h5>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {CONCEPTS.map(concept => (
                         <div 
                           key={concept.id}
                           onClick={() => setSelectedConcept(concept.id)}
                           className={`cursor-pointer rounded-xl border p-4 transition-all ${selectedConcept === concept.id ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-white/5 bg-zinc-900/50 hover:border-white/20'}`}
                         >
                             <div className="flex bg-black/40 w-8 h-8 rounded-full items-center justify-center mb-3 border border-white/5">
                                 <Icon name={`${concept.icon} ${selectedConcept === concept.id ? 'text-pink-400' : 'text-zinc-400'}`} />
                             </div>
                             <div className={`text-xs font-bold font-mono tracking-wider uppercase mb-1 ${selectedConcept === concept.id ? 'text-pink-400' : 'text-white'}`}>{concept.label}</div>
                             <div className="text-[10px] text-zinc-500 leading-relaxed font-mono">{concept.description}</div>
                         </div>
                     ))}
                 </div>
            </div>
        </div>

        <div className="bg-black/80 border border-white/10 rounded-3xl p-6 relative flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/5">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent"></div>
             
             <div className="flex-1 border border-white/5 bg-zinc-950 rounded-2xl overflow-hidden relative flex items-center justify-center group mb-6 shadow-inner">
                 {isGlobalProcessing ? (
                     <div className="text-center">
                         <Icon name="fa-camera-retro text-6xl text-pink-500/50 animate-bounce mb-4" />
                         <div className="text-xs font-mono text-pink-400 uppercase tracking-widest">{isEn ? 'Capturing Moment...' : 'Đang Xử Lý Hình Ảnh...'}</div>
                     </div>
                 ) : generatedImg ? (
                     <div className="w-full h-full relative group/img">
                         <img src={generatedImg} alt="Shoot Result" className={`w-full h-full object-contain ${selectedRatio === '9:16' ? 'max-h-[60vh] lg:max-h-full' : ''}`} />
                         <button 
                            onClick={() => setIsFullscreen(true)}
                            className="absolute top-4 right-4 bg-black/60 border border-white/20 text-white p-3 rounded-xl opacity-0 group-hover/img:opacity-100 transition-all hover:bg-pink-500/40 hover:border-pink-500/60 shadow-lg backdrop-blur-sm"
                            title={isEn ? "View Complete Image" : "Xem Toàn Cảnh"}
                         >
                            <Icon name="fa-expand" />
                         </button>
                     </div>
                 ) : (
                     <div className="text-center opacity-50 relative z-10 p-8">
                         <Icon name="fa-video text-6xl text-zinc-700 mb-6" />
                         <div className="font-mono text-sm tracking-[0.2em] uppercase text-zinc-500">{isEn ? 'STUDIO PREVIEW' : 'KHUNG HÌNH PREVIEW'}</div>
                     </div>
                 )}
             </div>

             <div className="flex items-center justify-between mb-4 bg-black/40 p-4 rounded-xl border border-white/5">
                 <div>
                     <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mb-1">{isEn ? 'Photoshoot Cost' : 'Chi phí chụp ảnh'}</div>
                     <div className="text-sm font-bold text-cinematic-gold flex items-center gap-2"><Icon name="fa-coins" /> 200 DC</div>
                 </div>
                 {selectedCard && (
                     <div className="text-right">
                         <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mb-1">{isEn ? 'Current Affection' : 'Độ thân thiết hiện tại'}</div>
                         <div className="text-sm font-bold text-pink-400 flex items-center gap-2 justify-end"><Icon name="fa-heart" /> {selectedCard.affection || 0}</div>
                     </div>
                 )}
             </div>

             <button
                 onClick={openModelSelection}
                 disabled={isGlobalProcessing || !selectedCardId || !selectedConcept}
                 className={`w-full py-4 rounded-xl font-bold font-mono text-xs tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3 ${
                    isGlobalProcessing || !selectedCardId || !selectedConcept 
                       ? 'bg-zinc-900 text-zinc-500 border border-white/5 cursor-not-allowed'
                       : 'bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] hover:-translate-y-0.5 active:translate-y-0'
                 }`}
             >
                 {isGlobalProcessing ? <Icon name="fa-spinner animate-spin" /> : <Icon name="fa-camera" />} 
                 {isGlobalProcessing ? (isEn ? 'GENERATING...' : 'ĐANG XỬ LÝ...') : (isEn ? 'START PHOTOSHOOT' : 'TIẾN HÀNH CHỤP ẢNH')}
             </button>
        </div>
      </div>

      {/* Model Selection Dialog */}
      <AnimatePresence>
        {showModelSelection && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 p-5 sm:p-6 rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col"
            >
              <h3 className="text-lg sm:text-xl font-serif text-white mb-2 uppercase tracking-widest text-center shrink-0">{isEn ? 'Select Image Model' : 'Chọn Model Render'}</h3>
              <p className="text-[10px] sm:text-xs text-zinc-400 text-center mb-4 md:mb-6 shrink-0">{isEn ? 'Each model has a different processing speed and resulting style.' : 'Mỗi model có tốc độ xử lý và phong cách xuất ảnh khác biệt.'}</p>
              
              <div className="space-y-2 sm:space-y-3 mb-4 md:mb-6 overflow-y-auto px-1 -mx-1 custom-scrollbar flex-1 min-h-[150px]">
                {IMAGE_MODELS.map(m => (
                    <div 
                       key={m.id}
                       onClick={() => setSelectedModel(m.id)}
                       className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-center min-h-[64px] sm:min-h-[76px] ${selectedModel === m.id ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_10px_rgba(236,72,153,0.15)] ring-1 ring-pink-500/50' : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-black/60'}`}
                    >
                       <div className="flex items-center justify-between mb-1">
                           <div className="font-bold text-sm text-white">{m.name}</div>
                           {selectedModel === m.id && <Icon name="fa-circle-check text-pink-500" />}
                       </div>
                       <div className="text-[10px] sm:text-xs text-zinc-500 leading-tight pr-4">{m.desc}</div>
                    </div>
                ))}
              </div>
              
              <div className="flex gap-3 shrink-0 pt-2 border-t border-white/5">
                <button 
                  onClick={() => setShowModelSelection(false)} 
                  className="flex-1 py-3 sm:py-4 text-xs font-mono uppercase tracking-widest text-zinc-400 hover:text-white bg-black/40 hover:bg-black/60 rounded-xl transition-all"
                >
                  {isEn ? 'CANCEL' : 'HỦY'}
                </button>
                <button 
                  onClick={handlePhotoshoot} 
                  className="flex-1 py-3 sm:py-4 text-xs font-mono uppercase tracking-widest text-white bg-pink-500 hover:bg-pink-400 rounded-xl shadow-[0_0_15px_rgba(236,72,153,0.4)] transition-all"
                >
                  {isEn ? 'CONFIRM' : 'XÁC NHẬN'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Overlay */}
      <AnimatePresence>
         {isFullscreen && generatedImg && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
               onClick={() => setIsFullscreen(false)}
             >
                 <button 
                    className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                    onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
                 >
                     <Icon name="fa-xmark text-2xl" />
                 </button>
                 <motion.img 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    src={generatedImg} 
                    alt="Fullscreen Result" 
                    className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl ${selectedRatio === '9:16' ? 'h-full w-auto' : 'w-full h-auto'}`}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
                 />
             </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};
