import React, { useState } from 'react';

export const Toast: React.FC<{ message: string, type: 'error' | 'success', onClose: () => void }> = ({ message, type, onClose }) => {
    React.useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[120] w-[90%] max-w-2xl p-4 rounded-xl text-center text-sm transition-all duration-300 shadow-lg animate-slide-up
            ${type === 'error' ? 'bg-red-900/90 text-red-100 border border-red-500/50' : 'bg-cinematic-gold/90 text-black border border-cinematic-gold'}`}>
            {message}
        </div>
    );
};
