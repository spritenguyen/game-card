import { FactionType } from '../types';

export const FACTIONS: Record<FactionType, { id: string; name: string; icon: string; color: string; bg: string; border: string; strongAgainst: FactionType; weakAgainst: FactionType }> = {
    'Tech': { id: 'Tech', name: 'Công Nghệ', icon: 'fa-microchip', color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-500/50', strongAgainst: 'Magic', weakAgainst: 'Mutant' },
    'Magic': { id: 'Magic', name: 'Phép Thuật', icon: 'fa-wand-magic-sparkles', color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-500/50', strongAgainst: 'Mutant', weakAgainst: 'Tech' },
    'Mutant': { id: 'Mutant', name: 'Đột Biến', icon: 'fa-dna', color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500/50', strongAgainst: 'Tech', weakAgainst: 'Magic' }
};

export const CARD_RANKS = ['N', 'R', 'SR', 'SSR', 'UR'];

export const DEFAULT_APP_CONFIG = {
    artStyle: 'cinematic',
    language: 'vi' as 'vi' | 'en',
    useCustomGemini: false,
    geminiKey: '',
    geminiModel: 'gemini-2.5-flash',
    pollinationsKey: '',
    defaultImageModel: 'flux',
};

export const IMAGE_MODELS = [
    { id: 'qwen-image', name: 'Qwen Image Plus', desc: 'Mô hình mạnh mẽ, chi tiết nội suy tốt nhất' },
    { id: 'flux', name: 'Flux Schnell', desc: 'Cân bằng hoàn hảo giữa tốc độ và sắc nét' },
    { id: 'zimage', name: 'Z-Image Turbo', desc: 'Tốc độ chớp nhoáng' },
    { id: 'gptimage', name: 'GPT Image', desc: 'Khả năng bám sát prompt tuyệt đối' },
    { id: 'wan-image', name: 'Wan Image', desc: 'Phong cách nghệ thuật đa dạng' }
];

export const ELEMENTS = {
    'Fire': { id: 'Fire', name: 'FIRE', icon: 'fa-fire', color: 'text-red-500', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
    'Water': { id: 'Water', name: 'WATER', icon: 'fa-droplet', color: 'text-blue-400', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.4)]' },
    'Wind': { id: 'Wind', name: 'WIND', icon: 'fa-wind', color: 'text-teal-400', glow: 'shadow-[0_0_15px_rgba(45,212,191,0.4)]' },
    'Earth': { id: 'Earth', name: 'EARTH', icon: 'fa-mountain', color: 'text-green-500', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.4)]' },
    'Lightning': { id: 'Lightning', name: 'LIGHTNING', icon: 'fa-bolt', color: 'text-yellow-400', glow: 'shadow-[0_0_15_rgba(250,204,21,0.4)]' },
    'Neutral': { id: 'Neutral', name: 'NEUTRAL', icon: 'fa-atom', color: 'text-zinc-400', glow: 'shadow-[0_0_15px_rgba(161,161,170,0.4)]' }
};

export const APP_VERSION = 'v1.1.9-Extract.Ops';
