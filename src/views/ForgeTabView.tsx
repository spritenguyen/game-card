import React, { useState } from 'react';
import { Card, AppConfig } from '../types';
import { FusionView } from './FusionView';
import { AscensionView } from './AscensionView';
import { OverclockView } from './OverclockView';

interface Props {
  config: AppConfig;
  currency: number;
  modifyCurrency: (amount: number) => void;
  inventory: any;
  cards: Card[];
  modifyInventory: (bd: number, ed: number, m?: Record<string, number>, dd?: number) => void;
  onCompleteFusion: (newCard: Card, oldIdsToDelete: string[]) => Promise<void>;
  onError: (msg: string) => void;
  onAlert: (t: string, m: string) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  fusionSlot1: Card | null;
  fusionSlot2: Card | null;
  setFusionSlot1: (c: Card | null) => void;
  setFusionSlot2: (c: Card | null) => void;
  onOpenSelector: (s: 1 | 2) => void;
}

export const ForgeTabView: React.FC<Props> = (props) => {
    const [subTab, setSubTab] = useState<'chimera' | 'ur_forge' | 'overclock'>('chimera');

    return (
        <div className="w-full flex flex-col items-center animate-fade-in relative">
            {/* Toggle Menu */}
            <div className="flex justify-center mt-8 mb-8 relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6">
                <div className="flex bg-zinc-950/80 border border-white/5 rounded-full p-1.5 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-xl ring-1 ring-white/5 w-full">
                    <button
                        onClick={() => !props.isProcessing && setSubTab('chimera')}
                        className={`flex-1 relative z-10 py-3 rounded-full font-bold tracking-[0.2em] font-mono text-[10px] sm:text-xs uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                            subTab === 'chimera' ? 'text-black' : 'text-zinc-500 hover:text-white'
                        }`}
                    >
                        <i className="fa-solid fa-dna"></i> <span className="hidden sm:inline">CHIMERA</span>
                    </button>
                    <button
                        onClick={() => !props.isProcessing && setSubTab('ur_forge')}
                        className={`flex-1 relative z-10 py-3 rounded-full font-bold tracking-[0.2em] font-mono text-[10px] sm:text-xs uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                            subTab === 'ur_forge' ? 'text-black' : 'text-zinc-500 hover:text-white'
                        }`}
                    >
                        <i className="fa-solid fa-hammer"></i> <span className="hidden sm:inline">UR FORGE</span>
                    </button>
                    <button
                        onClick={() => !props.isProcessing && setSubTab('overclock')}
                        className={`flex-1 relative z-10 py-3 rounded-full font-bold tracking-[0.2em] font-mono text-[10px] sm:text-xs uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                            subTab === 'overclock' ? 'text-black' : 'text-zinc-500 hover:text-white'
                        }`}
                    >
                        <i className="fa-solid fa-bolt"></i> <span className="hidden sm:inline">OVERCLOCK</span>
                    </button>

                    {/* Active Indicator Slide */}
                    <div 
                        className={`absolute top-1.5 bottom-1.5 w-[calc(33.33%-4px)] rounded-full transition-transform duration-300 ease-out z-0 ${
                            subTab === 'chimera' ? 'bg-cinematic-cyan shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 
                            subTab === 'ur_forge' ? 'bg-cinematic-gold shadow-[0_0_15px_rgba(255,184,0,0.4)]' : 
                            'bg-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.4)]'
                        }`}
                        style={{ transform: subTab === 'chimera' ? 'translateX(0)' : subTab === 'ur_forge' ? 'translateX(calc(100% + 4px))' : 'translateX(calc(200% + 8px))' }}
                    ></div>
                </div>
            </div>

            {/* Sub View */}
            <div className="w-full transition-all">
                {subTab === 'chimera' && (
                    <FusionView 
                        {...props} 
                        isGlobalProcessing={props.isProcessing}
                        setGlobalProcessing={props.setIsProcessing}
                    />
                )}
                {subTab === 'ur_forge' && (
                    <AscensionView 
                        {...props} 
                        onCompleteAscension={props.onCompleteFusion}
                        isGlobalProcessing={props.isProcessing}
                        setGlobalProcessing={props.setIsProcessing}
                    />
                )}
                {subTab === 'overclock' && (
                    <OverclockView 
                        {...props} 
                        onUpdateCard={async (c, consumedIds = []) => {
                            // Combine sacrifice IDs with the main card ID to ensure the old version is removed before adding the new/updated one
                            props.onCompleteFusion(c, [...consumedIds, c.id]);
                        }}
                        isGlobalProcessing={props.isProcessing}
                        setGlobalProcessing={props.setIsProcessing}
                    />
                )}
            </div>
        </div>
    );
};
