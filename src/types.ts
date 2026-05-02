export type CardRank = 'N' | 'R' | 'SR' | 'SSR' | 'UR';
export type FactionType = 'Tech' | 'Magic' | 'Mutant' | 'Light' | 'Dark';
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
  altText?: string;
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
  reward: number; // DC
  drops?: { item: string, amount: number }[]; // Additional item drops
  lore: string;
  visualDescription: string;
  imageUrl?: string;
}

export type ExpeditionStatus = 'idle' | 'ongoing' | 'completed';

export interface Expedition {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  requiredElement?: ElementType;
  requiredFaction?: FactionType;
  rewardDC: number;
  rewardMaterials: { item: string, amount: number }[];
  status: ExpeditionStatus;
  startTime?: number;
  assignedCardId?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  rewardDC: number;
  rewardTickets: { type: 'base' | 'elite', amount: number }[];
  isCompleted: boolean;
  isClaimed: boolean;
  type: 'boss' | 'extract' | 'fusion' | 'expedition';
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
  materials: Record<string, number>;
  quantumDust: number;
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
