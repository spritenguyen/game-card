export type CardRank = 'N' | 'R' | 'SR' | 'SSR' | 'UR';
export type FactionType = 'CyberCore' | 'Ethereal' | 'VoidBringer' | 'MechaMutant' | 'AstroNomad' | 'ArcaneWeaver';
export type ElementType = 'Fire' | 'Water' | 'Earth' | 'Lightning' | 'Wind' | 'Neutral';
export type CardRole = 'Vanguard' | 'Striker' | 'Sniper' | 'Weaver' | 'Support' | 'Phantom';

export type ImplantSlot = 1 | 2 | 3 | 4 | 5 | 6;
export type ImplantSet = 'Arasaka' | 'Militech' | 'Biotechnica' | 'KangTao' | 'Kiroshi' | 'Tetratronic';
export type ImplantStatType = 'HP' | 'ATK' | 'DEF' | 'RES' | 'CRIT_RATE' | 'CRIT_DMG' | 'SPEED' | 'LIFESTEAL' | 'ACCURACY' | 'MANA_REGEN' | 'PHYSICAL_DMG' | 'THORNS' | 'HP_REGEN';

export interface ImplantStat {
    type: ImplantStatType;
    value: number;
    isPercentage: boolean;
}

export interface Implant {
    id: string;
    name: string;
    slot: ImplantSlot;
    set: ImplantSet;
    rarity: 1 | 2 | 3 | 4 | 5; // Stars
    level: number;
    mainStat: ImplantStat;
    subStats: ImplantStat[];
    equippedTo?: string; // Card ID
}

export type GearSlot = 1 | 2 | 3 | 4; // 1: Neural Link, 2: Core Drive, 3: Kinetic Actuators, 4: Utility Module
export type GearType = 'Neural Link' | 'Core Drive' | 'Kinetic Actuator' | 'Utility Module';

export interface Gear {
    id: string;
    name: string;
    slot: GearSlot;
    type: GearType;
    brand: string;
    rarity: 1 | 2 | 3 | 4 | 5;
    level: number;
    mainStat: ImplantStat;
    subStats: ImplantStat[];
    equippedTo?: string;
}

export interface CombatStats {
    hp: number;
    atk: number;

    patk: number;
    matk: number;
    def: number;
    mdef: number;
    res: number;
    speed: number;
    elementalDmg: Record<string, number>;
    elementalRes: Record<string, number>;
}

export interface Card {
  id: string;
  name: string;
  gender: string;
  universe: string;
  faction: FactionType;
  element?: ElementType;
  role?: CardRole;
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
  resonance?: number;
  chatHistory?: { role: 'user' | 'assistant', content: string }[];
  ultimateStats?: {

    power: number; // e.g. 100-1000
    cooldown: number; // e.g. 2-5 turns
    scaling: string; // e.g. '150% ATK'
    energyCost: number; // e.g. 50-100
  };
  origin?: 'Extracted' | 'Forged';
  parents?: string[];
  overclockLevel?: number;
  level?: number;
  exp?: number;
  trainingSession?: {
    type: string;
    startTime: number;
    endTime: number;
    expGain: number;
  };
  imageUrl?: string;
  imageBlob?: Blob;
  timestamp?: number;
  language?: string;
  translations?: Record<string, Partial<Card>>;
  altText?: string;
  affection?: number;
  variants?: string[];
  activeSkinIndex?: number;
  studioConcept?: string;
  equippedLens?: string;
  genes?: string[];
  implants?: Record<number, Implant>; // Maps slot (1-6) to Implant object
  gears?: Record<number, Gear>; // Maps slot (1-4) to Gear object
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
  maxHp?: number;
  attack: number;
  speed?: number;
  reward: number; // DC
  drops?: { item: string, amount: number }[]; // Additional item drops
  lore: string;
  visualDescription: string;
  imageUrl?: string;
  campaignStageId?: string;
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

export interface PhantasmProgress {
    floor: number;
    cardsHp: Record<string, number>;
}

export interface GameState {
  unlockedSkills?: string[];
  currency: number;
  level: number;
  experience: number;
  inventory: Inventory;
  cards: Card[];
  squad: (Card | null)[];
  leaderId: string | null;
  enemySquad: (Boss | null)[];
  fusionSlot1: Card | null;
  fusionSlot2: Card | null;
}
