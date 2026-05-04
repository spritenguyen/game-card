import React, { useState, useEffect } from 'react';
import { GlobalApiState } from '../services/ai';

interface ApiMonitorProps {
    isProcessing?: boolean;
}

export const ApiMonitor: React.FC<ApiMonitorProps> = ({ isProcessing }) => {
    const [activeApi, setActiveApi] = useState<string>('Idle');
    const [statusMsg, setStatusMsg] = useState<string>('');
    const [geminiCooldown, setGeminiCooldown] = useState<number>(0);
    const [internalThinking, setInternalThinking] = useState(false);

    useEffect(() => {
        const handleApiName = (e: any) => {
            const name = e.detail;
            setActiveApi(name);
            if (name === 'Idle') {
                setInternalThinking(false);
                setTimeout(() => setStatusMsg(''), 1000);
            } else {
                setInternalThinking(true);
            }
        };
        const handleStatusMsg = (e: any) => {
            if (e.detail) {
                setStatusMsg(e.detail);
            }
        };

        window.addEventListener('api_active_name', handleApiName);
        window.addEventListener('api_status_message', handleStatusMsg);

        const cdInterval = setInterval(() => {
            const now = Date.now();
            if (GlobalApiState.geminiBannedUntil > now) {
                setGeminiCooldown(Math.ceil((GlobalApiState.geminiBannedUntil - now) / 1000));
            } else {
                setGeminiCooldown(0);
            }
        }, 1000);

        return () => {
            window.removeEventListener('api_active_name', handleApiName);
            window.removeEventListener('api_status_message', handleStatusMsg);
            clearInterval(cdInterval);
        };
    }, []);

    const isThinking = isProcessing || internalThinking;

    useEffect(() => {
        if (!isProcessing && activeApi !== 'Idle' && internalThinking) {
            // Safe fallback to clear after 15s if it gets stuck
            const timeout = setTimeout(() => {
                GlobalApiState.setIdle();
            }, 15000);
            return () => clearTimeout(timeout);
        }
    }, [isProcessing, activeApi, internalThinking]);

    return (
        <div className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 px-2 py-0.5 rounded shadow-lg">
            <div className="flex flex-col justify-center items-end min-w-[100px] sm:min-w-[140px]">
                <div className="flex items-center gap-1.5 w-full justify-between">
                    <span className="text-[8px] uppercase tracking-widest text-zinc-500">API</span>
                    <span className={`text-[9px] font-mono leading-none flex items-center ${activeApi === 'Idle' ? 'text-zinc-500' : 'text-cinematic-cyan'}`}>
                        {isThinking && activeApi !== 'Idle' && (
                            <i className="fa-solid fa-circle-notch fa-spin mr-1.5 text-[8px]"></i>
                        )}
                        {activeApi}
                    </span>
                </div>
                {geminiCooldown > 0 ? (
                    <div className="text-[8px] text-red-400 mt-0.5 leading-none w-full text-right flex items-center justify-end font-mono">
                        <i className="fa-solid fa-ban text-[7px] mr-1"></i> Gemini: {geminiCooldown}s
                    </div>
                ) : (
                    statusMsg && (
                        <div className="text-[8px] text-cinematic-gold opacity-80 mt-0.5 leading-none w-full text-right truncate max-w-[100px] sm:max-w-[140px]" title={statusMsg}>
                            {statusMsg}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
