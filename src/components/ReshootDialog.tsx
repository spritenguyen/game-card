import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IMAGE_MODELS } from '../lib/constants';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (modelId: string) => void;
    cardName: string;
}

export const ReshootDialog: React.FC<Props> = ({ isOpen, onClose, onConfirm, cardName }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        onClick={onClose}
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative z-10 w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-white/5 bg-gradient-to-r from-zinc-900 to-black">
                            <h3 className="text-lg font-serif text-white mb-1 tracking-tight flex items-center gap-2">
                                <i className="fa-solid fa-camera-retro text-cinematic-cyan"></i> Giao Thức Reshoot
                            </h3>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Đối tượng: <span className="text-zinc-300">{cardName}</span></p>
                        </div>
                        
                        {/* Model List */}
                        <div className="p-4 flex-1 max-h-[60vh] overflow-y-auto no-scrollbar grid grid-cols-1 gap-2">
                            {IMAGE_MODELS.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => onConfirm(model.id)}
                                    className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cinematic-cyan/30 transition-all text-left"
                                >
                                    <div>
                                        <div className="text-xs font-bold text-zinc-200 group-hover:text-cinematic-cyan transition-colors">{model.name}</div>
                                        <div className="text-[9px] text-zinc-500 font-mono italic">{(model as any).desc}</div>
                                    </div>
                                    <i className="fa-solid fa-chevron-right text-[10px] text-zinc-700 group-hover:text-cinematic-cyan transition-colors"></i>
                                </button>
                            ))}
                        </div>
                        
                        {/* Footer */}
                        <div className="p-4 bg-black/50 border-t border-white/5">
                            <button 
                                onClick={onClose}
                                className="w-full py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[10px] font-mono tracking-widest uppercase transition-colors border border-white/5"
                            >
                                Hủy Bỏ
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
