import { FactionType } from '../types';

export const FACTIONS: Record<FactionType, { id: string; name: string; icon: string; color: string; bg: string; border: string; strongAgainst: FactionType; weakAgainst: FactionType }> = {
    'CyberCore': { id: 'CyberCore', name: 'CyberCore', icon: 'Cpu', color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-500/50', strongAgainst: 'Ethereal', weakAgainst: 'ArcaneWeaver' },
    'Ethereal': { id: 'Ethereal', name: 'Ethereal', icon: 'Sparkles', color: 'text-yellow-200', bg: 'bg-yellow-900/30', border: 'border-yellow-200/50', strongAgainst: 'VoidBringer', weakAgainst: 'CyberCore' },
    'VoidBringer': { id: 'VoidBringer', name: 'VoidBringer', icon: 'MoonStar', color: 'text-purple-500', bg: 'bg-purple-900/30', border: 'border-purple-500/50', strongAgainst: 'MechaMutant', weakAgainst: 'Ethereal' },
    'MechaMutant': { id: 'MechaMutant', name: 'MechaMutant', icon: 'Dna', color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-500/50', strongAgainst: 'AstroNomad', weakAgainst: 'VoidBringer' },
    'AstroNomad': { id: 'AstroNomad', name: 'AstroNomad', icon: 'Rocket', color: 'text-amber-500', bg: 'bg-amber-900/30', border: 'border-amber-500/50', strongAgainst: 'ArcaneWeaver', weakAgainst: 'MechaMutant' },
    'ArcaneWeaver': { id: 'ArcaneWeaver', name: 'ArcaneWeaver', icon: 'Hexagon', color: 'text-rose-400', bg: 'bg-rose-900/30', border: 'border-rose-500/50', strongAgainst: 'CyberCore', weakAgainst: 'AstroNomad' }
};

export const CARD_ROLE_ICONS: Record<string, string> = {
    'Vanguard': 'Shield',
    'Striker': 'Swords',
    'Sniper': 'Crosshair',
    'Weaver': 'Wand2',
    'Aura': 'Heart',
    'Phantom': 'Ghost'
};

export const CARD_RANKS = ['N', 'R', 'SR', 'SSR', 'UR'];

export const DEFAULT_APP_CONFIG = {
    artStyle: 'cinematic',
    language: 'vi' as 'vi' | 'en',
    useCustomGemini: false,
    geminiKey: '',
    geminiModel: 'gemini-3-flash-preview',
    pollinationsKey: '',
    defaultImageModel: 'flux',
};

export const IMAGE_MODELS = [
    { id: 'qwen-image', name: 'Qwen Image Plus', desc: 'Mô hình mạnh mẽ, chi tiết nội suy tốt nhất' },
    { id: 'flux', name: 'Flux Schnell', desc: 'Cân bằng hoàn hảo giữa tốc độ và sắc nét' },
    { id: 'zimage', name: 'Z-Image Turbo', desc: 'Tốc độ chớp nhoáng' },
    { id: 'gpt-image-2', name: 'GPT Image 2', desc: 'Khả năng bám sát prompt tuyệt đối' },
    { id: 'wan-image', name: 'Wan Image', desc: 'Phong cách nghệ thuật đa dạng' }
];

export const ELEMENTS = {
    'Fire': { id: 'Fire', name: 'FIRE', icon: 'Flame', color: 'text-red-500', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
    'Water': { id: 'Water', name: 'WATER', icon: 'Droplet', color: 'text-blue-400', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.4)]' },
    'Wind': { id: 'Wind', name: 'WIND', icon: 'Wind', color: 'text-teal-400', glow: 'shadow-[0_0_15px_rgba(45,212,191,0.4)]' },
    'Earth': { id: 'Earth', name: 'EARTH', icon: 'Mountain', color: 'text-green-500', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.4)]' },
    'Lightning': { id: 'Lightning', name: 'LIGHTNING', icon: 'Zap', color: 'text-yellow-400', glow: 'shadow-[0_0_15_rgba(250,204,21,0.4)]' },
    'Neutral': { id: 'Neutral', name: 'NEUTRAL', icon: 'Atom', color: 'text-zinc-400', glow: 'shadow-[0_0_15px_rgba(161,161,170,0.4)]' }
};

export const APP_VERSION = '0.1.0.16';

export const STATUS_ICONS: Record<string, { icon: string, color: string, label: string }> = {
  burn: { icon: "fa-fire", color: "text-orange-500", label: "Burn" },
  chill: { icon: "fa-snowflake", color: "text-blue-400", label: "Chill" },
  stun: { icon: "fa-cloud-bolt", color: "text-yellow-500", label: "Stun" },
  paralyze: { icon: "fa-bolt", color: "text-yellow-300", label: "Paralyze" },
  armor_break: { icon: "fa-shield-halved", color: "text-zinc-400", label: "Armor Break" },
  pierce: { icon: "fa-arrow-right-to-bracket", color: "text-red-400", label: "Pierce" }
};
