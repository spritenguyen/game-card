export type CardRank = 'N' | 'R' | 'SR' | 'SSR' | 'UR';
export type FactionType = 'Tech' | 'Magic' | 'Mutant';
export type ElementType = 'Fire' | 'Water' | 'Earth' | 'Lightning' | 'Wind' | 'Neutral';

export interface Card {
  id: string;
  name: string;
  gender: string;
  universe: string;
  faction: FactionType;
  element?: ElementType;
  passiveSkill?: string;
  occupation: string;
  nationality: string;
  cardClass: CardRank;
  height: number;
  weight: number;
  measurements: string;
  personality: string;
  lore: string;
  inspiredBy: string;
  visualDescription: string;
  ultimateMove: string;
  ultimateLevel?: number;
  origin?: 'Extracted' | 'Forged';
  parents?: string[];
  imageUrl?: string;
  imageBlob?: Blob;
  timestamp?: number;
  language?: string;
  translations?: Record<string, Partial<Card>>;
}

export interface Boss {
  id: string;
  name: string;
  universe: string;
  faction: FactionType;
  element?: ElementType;
  passiveSkill?: string;
  threatLevel: string;
  hp: number;
  attack: number;
  reward: number;
  lore: string;
  visualDescription: string;
  imageUrl?: string;
}

export interface AppConfig {
  artStyle: string;
  language: 'vi' | 'en';
  
  useCustomGemini: boolean;
  geminiKey: string;
  geminiModel: string;
  
  pollinationsKey: string;
  defaultImageModel: string;
}

export interface Inventory {
  baseTickets: number;
  eliteTickets: number;
}

export interface GameState {
  currency: number;
  level: number;
  experience: number;
  inventory: Inventory;
  cards: Card[];
  squad: (Card | null)[];
  leaderId: string | null;
  boss: Boss | null;
  fusionSlot1: Card | null;
  fusionSlot2: Card | null;
}
