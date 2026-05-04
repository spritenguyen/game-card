import React from 'react';

export interface DialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onClose: () => void;
    onConfirm?: () => void;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, title, message, type, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative z-10 w-full max-w-sm bg-cinematic-900 border border-white/10 rounded-2xl p-6 shadow-2xl animate-pop-in text-center">
                {type === 'alert' ? (
                     <i className="fa-solid fa-circle-exclamation text-4xl text-cinematic-gold mb-4"></i>
                ) : (
                     <i className="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-4"></i>
                )}
                
                <h3 className="text-lg font-serif text-white mb-2">{title}</h3>
                <p className="text-sm text-cinematic-muted mb-6 leading-relaxed" dangerouslySetInnerHTML={{ __html: message }}></p>
                
                <div className="flex gap-3 justify-center">
                    {type === 'alert' ? (
                         <button onClick={onClose} className="w-full bg-cinematic-gold hover:bg-yellow-500 text-black px-6 py-2 rounded-lg font-bold transition-colors">Đã Rõ</button>
                    ) : (
                         <>
                            <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-colors">Hủy Bỏ</button>
                            <button onClick={() => { if(onConfirm) onConfirm(); onClose(); }} className="flex-1 bg-red-900/60 hover:bg-red-600 border border-red-500/50 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-colors">Đồng Ý</button>
                         </>
                    )}
                </div>
            </div>
        </div>
    );
};
