import React, { useState } from 'react';
import { Card, AppConfig } from '../types';
import { FusionView } from './FusionView';
import { AscensionView } from './AscensionView';
import { OverclockView } from './OverclockView';

interface Props {
  config: AppConfig;
  currency: number;
  modifyCurrency: (amount: number) => boolean;
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
        <div className="w-full flex flex-col items-center">
            {/* Toggle Menu */}
            <div className="flex bg-black/40 border border-white/10 rounded-full p-1 mb-6 relative shadow-2xl backdrop-blur-md text-[10px] sm:text-xs">
                <button
                    onClick={() => !props.isProcessing && setSubTab('chimera')}
                    className={`relative z-10 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-bold tracking-widest uppercase transition-all duration-300 ${
                        subTab === 'chimera' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <i className="fa-solid fa-dna sm:mr-2"></i> <span className="hidden sm:inline">CHIMERA</span>
                </button>
                <button
                    onClick={() => !props.isProcessing && setSubTab('ur_forge')}
                    className={`relative z-10 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-bold tracking-widest uppercase transition-all duration-300 ${
                        subTab === 'ur_forge' ? 'text-cinematic-gold' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <i className="fa-solid fa-hammer sm:mr-2"></i> <span className="hidden sm:inline">UR FORGE</span>
                </button>
                <button
                    onClick={() => !props.isProcessing && setSubTab('overclock')}
                    className={`relative z-10 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-bold tracking-widest uppercase transition-all duration-300 ${
                        subTab === 'overclock' ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <i className="fa-solid fa-bolt sm:mr-2"></i> <span className="hidden sm:inline">OVERCLOCK</span>
                </button>

                {/* Active Indicator Slide */}
                <div 
                    className="absolute top-1 bottom-1 w-[calc(33.33%-4px)] rounded-full bg-white/10 border border-white/20 transition-transform duration-300 ease-out z-0"
                    style={{ transform: subTab === 'chimera' ? 'translateX(0)' : subTab === 'ur_forge' ? 'translateX(calc(100% + 4px))' : 'translateX(calc(200% + 8px))' }}
                ></div>
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
                            props.onCompleteFusion(c, consumedIds.length > 0 ? consumedIds : [c.id]);
                        }}
                        isGlobalProcessing={props.isProcessing}
                        setGlobalProcessing={props.setIsProcessing}
                    />
                )}
            </div>
        </div>
    );
};
