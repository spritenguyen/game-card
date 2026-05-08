import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { Icon } from '../ui/Icon';
import { ELEMENTS, FACTIONS } from '../../lib/constants';

interface SynergyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SynergyGuideModal: React.FC<SynergyGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-black border border-cinematic-cyan/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-[0_0_50px_rgba(0,243,255,0.1)] relative"
        >
          <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center">
            <h2 className="text-sm sm:text-base font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-cinematic-cyan tracking-widest uppercase flex items-center gap-2">
              <Icon name="fa-book-atlas text-cinematic-cyan" /> Sách Lược Tương Khắc & Đội Hình
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Icon name="fa-xmark" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-8">
            {/* Element Advantage */}
            <section>
              <h3 className="text-xs sm:text-sm font-bold text-cinematic-gold border-b border-cinematic-gold/20 pb-2 mb-4 uppercase tracking-widest flex items-center gap-2">
                <Icon name="fa-bolt" /> Tương Khắc Nguyên Tố (Elemental Advantage)
              </h3>
              <p className="text-[10px] sm:text-xs text-zinc-400 mb-4 leading-relaxed font-serif italic">
                Sát thương thay đổi đáng kể (+50% sát thương hoặc -50% sát thương) dựa trên vòng tròn tương khắc nguyên tố. Khắc hệ luôn luôn mang lại lợi thế chiến thắng tuyệt đối.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="bg-red-950/20 border border-red-900/40 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-500 font-bold text-sm"><Icon name="fa-fire" /> Hỏa (Fire)</div>
                    <Icon name="fa-arrow-right text-zinc-600 text-xs" />
                    <div className="flex items-center gap-2 text-teal-400 font-bold text-sm"><Icon name="fa-wind" /> Phong (Wind)</div>
                 </div>
                 <div className="bg-teal-950/20 border border-teal-900/40 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-teal-400 font-bold text-sm"><Icon name="fa-wind" /> Phong (Wind)</div>
                    <Icon name="fa-arrow-right text-zinc-600 text-xs" />
                    <div className="flex items-center gap-2 text-green-500 font-bold text-sm"><Icon name="fa-mountain" /> Thổ (Earth)</div>
                 </div>
                 <div className="bg-green-950/20 border border-green-900/40 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-500 font-bold text-sm"><Icon name="fa-mountain" /> Thổ (Earth)</div>
                    <Icon name="fa-arrow-right text-zinc-600 text-xs" />
                    <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm"><Icon name="fa-zap" /> Lôi (Lightning)</div>
                 </div>
                 <div className="bg-yellow-950/20 border border-yellow-900/40 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm"><Icon name="fa-zap" /> Lôi (Lightning)</div>
                    <Icon name="fa-arrow-right text-zinc-600 text-xs" />
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm"><Icon name="fa-droplet" /> Thủy (Water)</div>
                 </div>
                 <div className="bg-blue-950/20 border border-blue-900/40 p-3 rounded-lg flex items-center justify-between sm:col-span-2 max-w-sm mx-auto w-full">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm"><Icon name="fa-droplet" /> Thủy (Water)</div>
                    <Icon name="fa-arrow-right text-zinc-600 text-xs" />
                    <div className="flex items-center gap-2 text-red-500 font-bold text-sm"><Icon name="fa-fire" /> Hỏa (Fire)</div>
                 </div>
              </div>
            </section>

            {/* Faction Advantage */}
            <section>
              <h3 className="text-xs sm:text-sm font-bold text-cinematic-cyan border-b border-cinematic-cyan/20 pb-2 mb-4 uppercase tracking-widest flex items-center gap-2">
                <Icon name="fa-chess-knight" /> Tương Khắc Thế Lực (Faction Advantage)
              </h3>
              <p className="text-[10px] sm:text-xs text-zinc-400 mb-4 leading-relaxed font-serif italic">
                Tấn công phe bị khắc chế tăng <strong className="text-white">+30% Sát thương</strong>, tấn công phe khắc chế bản thân giảm <strong className="text-white">-30% Sát thương</strong>.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                 {Object.values(FACTIONS).map((f) => (
                    <div key={f.id} className="bg-zinc-900/50 border border-white/5 p-3 rounded-lg flex items-center justify-between gap-2">
                       <span className={`px-2 py-1 ${f.color} ${f.bg} border ${f.border} rounded text-center w-[120px] truncate`}>{f.name}</span>
                       <Icon name="fa-arrow-right text-green-500/50 flex-shrink-0" />
                       <span className={`px-2 py-1 ${FACTIONS[f.strongAgainst].color} ${FACTIONS[f.strongAgainst].bg} border ${FACTIONS[f.strongAgainst].border} rounded text-center w-[120px] truncate opacity-60`}>{FACTIONS[f.strongAgainst].name}</span>
                    </div>
                 ))}
              </div>
            </section>

            {/* Synergy */}
            <section>
              <h3 className="text-xs sm:text-sm font-bold text-purple-400 border-b border-purple-400/20 pb-2 mb-4 uppercase tracking-widest flex items-center gap-2">
                <Icon name="fa-link" /> Hiệu Ứng Đội Hình (Squad Synergy)
              </h3>
              <p className="text-[10px] sm:text-xs text-zinc-400 mb-4 leading-relaxed font-serif italic">
                Triển khai các binh chủng cùng hệ phái hoặc nguyên tố sẽ kích hoạt các cộng hưởng mạnh mẽ giúp gia tăng đáng kể uy lực chiến đấu.
              </p>
              <div className="flex flex-col gap-3 font-mono text-[10px] sm:text-xs">
                 <div className="flex items-center gap-3 bg-purple-950/20 border border-purple-900/40 p-3 rounded-lg">
                    <span className="min-w-16 font-bold text-purple-400">4+ thẻ</span>
                    <span>Cùng Nguyên Tố: <strong className="text-white">+40% ATK, +40% Kháng MDEF</strong></span>
                 </div>
                 <div className="flex items-center gap-3 bg-purple-950/20 border border-purple-900/40 p-3 rounded-lg">
                    <span className="min-w-16 font-bold text-purple-400">3 thẻ</span>
                    <span>Cùng Nguyên Tố: <strong className="text-white">+30% ATK, +30% Kháng MDEF</strong></span>
                 </div>
                 <div className="flex items-center gap-3 bg-blue-950/20 border border-blue-900/40 p-3 rounded-lg">
                    <span className="min-w-16 font-bold text-blue-400">4+ thẻ</span>
                    <span>Cùng Thế Lực: <strong className="text-white">+40% HP/ATK, +30% DEF/MDEF</strong></span>
                 </div>
                 <div className="flex items-center gap-3 bg-blue-950/20 border border-blue-900/40 p-3 rounded-lg">
                    <span className="min-w-16 font-bold text-blue-400">3 thẻ</span>
                    <span>Cùng Thế Lực: <strong className="text-white">+30% HP/ATK, +20% DEF/MDEF</strong></span>
                 </div>
                 <div className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 p-3 rounded-lg text-zinc-300">
                    <span className="min-w-16 font-bold text-zinc-500">4 thẻ</span>
                    <span>Khác Nguyên Tố (Đa hệ): <strong className="text-white">+20% HP/ATK</strong></span>
                 </div>
                 <div className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 p-3 rounded-lg text-zinc-300">
                    <span className="min-w-16 font-bold text-zinc-500">4 thẻ</span>
                    <span>Khác Thế Lực (Đa dạng): <strong className="text-white">+15% HP/ATK, +20% Kháng</strong></span>
                 </div>
              </div>
            </section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
