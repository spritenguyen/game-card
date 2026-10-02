import type { Card, FactionType, ElementType, CardRole } from '../types';
import { FACTIONS } from './gameConstants';

export const getFactionInfo = (factionId: FactionType | string) => {
  return FACTIONS[factionId as FactionType] || FACTIONS["CyberCore"];
};

export const getGeneInfo = (key: string) => {
    const type = key.split('_')[1];
    switch (type) {
        case 'fire': return { name: 'Hỏa Tinh Gene', desc: 'Kháng hệ Hỏa, +Sát thương Hỏa', color: 'text-red-400', icon: 'fa-fire' };
        case 'water': return { name: 'Thủy Thể Gene', desc: 'Kháng hệ Thủy, +Lá chắn Thủy', color: 'text-blue-400', icon: 'fa-tint' };
        case 'earth': return { name: 'Thổ Mạch Gene', desc: 'Kháng hệ Thổ, +Phòng thủ cứng', color: 'text-yellow-600', icon: 'fa-mountain' };
        case 'wind': return { name: 'Phong Tiễn Gene', desc: 'Kháng hệ Phong, +Né tránh', color: 'text-emerald-400', icon: 'fa-wind' };
        case 'light': return { name: 'Quang Dực Gene', desc: 'Kháng hệ Quang, +Hồi phục', color: 'text-yellow-300', icon: 'fa-sun' };
        case 'dark': return { name: 'Ám Vực Gene', desc: 'Kháng hệ Ám, +Hút máu', color: 'text-purple-400', icon: 'fa-moon' };
        case 'hp': return { name: 'Sinh Lực Gen', desc: 'Tăng cường giới hạn Máu', color: 'text-green-400', icon: 'fa-heart' };
        case 'atk': return { name: 'Cuồng Nộ Gen', desc: 'Tăng cường lực Công', color: 'text-red-500', icon: 'fa-sword' };
        case 'armor_pierce': return { name: 'Phá Giáp Gen', desc: 'Xuyên 20% Giáp', color: 'text-zinc-300', icon: 'fa-shield-slash' };
        default: return { name: 'Gen Lỗi', desc: 'Chưa xác định', color: 'text-zinc-400', icon: 'fa-question' };
    }
};

export const getRankIndex = (classStr?: string): number => {
  if (!classStr) return 0;
  const up = classStr.toUpperCase().trim();
  if (/\b(?:UR|ULTRA(?:\s*RARE)?)\b/.test(up)) return 4;
  if (/\bSSR\b/.test(up)) return 3;
  if (/\b(?:SR|SUPER(?:\s*RARE)?)\b/.test(up)) return 2;
  if (/\b(?:R|RARE)\b/.test(up)) return 1;
  return 0;
};

export const rollExtractRank = (
  playerLevel: number,
  pityCounter: number,
  extractType: "standard" | "quick" | "deep",
): { rank: string; newPity: number } => {
  const effLevel = Math.min(playerLevel, 20);
  const levelBonus = (effLevel - 1) * 0.5;

  if (extractType === "standard") {
    const rChance = 30;
    const roll = Math.random() * 100;
    return {
      rank: roll < rChance ? "R" : "N",
      newPity: pityCounter, // do not increase pity for standard
    };
  }

  // For quick or deep
  let urChance =
    extractType === "deep"
      ? 2 + levelBonus * 0.1
      : effLevel >= 5
        ? 0.1 + Math.max(0, levelBonus * 0.05)
        : 0;
  let ssrChance =
    extractType === "deep" ? 15 + levelBonus * 0.3 : 1.5 + levelBonus * 0.2;
  let srChance =
    extractType === "deep" ? 100 - urChance - ssrChance : 8 + levelBonus * 0.5;
  let rChance = extractType === "deep" ? 0 : 30;

  if (pityCounter >= 50 && pityCounter < 89) {
    const pityBonus = (pityCounter - 50) * 1.5;
    urChance += Math.max(0, pityBonus * 0.1);
    ssrChance += Math.max(0, pityBonus * 0.5);
  }

  if (pityCounter >= 89) {
    urChance = extractType === "deep" ? 20 : 10;
    ssrChance = 100; // Anything below urChance rolls UR, else SSR
  }

  const roll = Math.random() * 100;

  if (roll < urChance) {
    return { rank: "UR", newPity: 0 };
  } else if (roll < urChance + ssrChance) {
    return { rank: "SSR", newPity: 0 };
  } else if (roll < urChance + ssrChance + srChance) {
    return { rank: "SR", newPity: pityCounter + 1 };
  } else if (roll < urChance + ssrChance + srChance + rChance) {
    return { rank: "R", newPity: pityCounter + 1 };
  } else {
    return { rank: "N", newPity: pityCounter + 1 };
  }
};

export const getElementAdvantage = (
  atkElement?: string,
  defElement?: string,
): number => {
  if (
    !atkElement ||
    !defElement ||
    atkElement === "Neutral" ||
    defElement === "Neutral"
  )
    return 1.0;

  // Rock-Paper-Scissors: Fire > Wind > Earth > Lightning > Water > Fire
  const advantageMap: Record<string, string> = {
    Fire: "Wind",
    Wind: "Earth",
    Earth: "Lightning",
    Lightning: "Water",
    Water: "Fire",
  };

  const weaknessMap: Record<string, string> = {
    Fire: "Water",
    Water: "Lightning",
    Lightning: "Earth",
    Earth: "Wind",
    Wind: "Fire",
  };

  if (advantageMap[atkElement] === defElement) return 1.5; // Strong against
  if (weaknessMap[atkElement] === defElement) return 0.5; // Weak against
  return 1.0;
};

export const getRoleIcon = (role: string): string => {
  switch (role) {
    case "Vanguard": return "fa-shield-halved";
    case "Striker": return "fa-khanda";
    case "Sniper": return "fa-crosshairs";
    case "Weaver": return "fa-wand-magic-sparkles";
    case "Support": return "fa-hand-holding-heart";
    case "Phantom": return "fa-ghost";
    default: return "fa-star";
  }
};

export const getCardRole = (card: Card): CardRole => {
  if (card.role) {
      if (card.role === 'Aura' as any) return 'Support';
      return card.role;
  }
  
  const textFeatures = [card.passiveSkill, card.ultimateMove, card.occupation, card.lore, card.visualDescription]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Support: Healing, shield, buff, aura, support, protect, mend, restore
  if (/(heal|buff|aura|support|mend|restore|bless|barrier|protect team)/i.test(textFeatures)) {
      return "Support";
  }
  
  // Sniper: Range, bow, gun, shoot, snipe, rifle, far, distance, arrow, precise
  if (/(sniper|bow|gun|shoot|rifle|pistol|arrow|range|distant|distance|precise|firearm)/i.test(textFeatures)) {
      return "Sniper";
  }

  // Weaver: Magic, spell, arcane, fire, ice, lightning, summon, ethereal, mage, sorcer
  if (/(magic|spell|arcane|ethereal|mage|sorcer|wizard|summon|element|weaver|incantation)/i.test(textFeatures) || ["Ethereal", "ArcaneWeaver"].includes(card.faction)) {
      return "Weaver";
  }
  
  // Vanguard: Tank, heavy, large weight, guard, knight, frontline, defend
  if (/(tank|heavy|guard|knight|frontline|defend|shield|armor|vanguard|stalwart)/i.test(textFeatures) || (card.weight && card.weight >= 80) || (card.height && card.height >= 180)) {
       return "Vanguard";
  }

  return "Striker"; // Default fallback
};

export const calculateUltimateStats = (card: Card) => {
  if (card.ultimateStats) return card.ultimateStats;

  // Auto-calculate for retro-compatibility
  const rank = getRankIndex(card.cardClass);
  const role = getCardRole(card);
  const multi = [1, 1.5, 2.5, 5, 10][rank];

  let powBase = 200;
  let cd = 4;
  let cost = 80;
  let scalingType = "120% ATK";

  if (role === "Striker" || role === "Sniper" || role === "Phantom") {
    powBase = 300;
    cd = 3;
    cost = 100;
    scalingType = "150% ATK";
  }
  if (role === "Vanguard") {
    powBase = 150;
    cd = 5;
    cost = 80;
    scalingType = "200% DEF";
  }
  if (role === "Weaver" || role === "Support") {
    powBase = 100;
    cd = 4;
    cost = 60;
    scalingType = "150% MATK";
  }

  const isMagic =
    card.faction === "Ethereal" ||
    card.faction === "ArcaneWeaver" ||
    card.faction === "VoidBringer";
  if (isMagic && scalingType.includes("ATK") && !scalingType.includes("MATK")) {
    scalingType = scalingType.replace("ATK", "MATK");
  }

  return {
    power: Math.floor(powBase * multi),
    cooldown: Math.max(2, cd - Math.floor(rank / 2)),
    scaling: scalingType,
    energyCost: cost,
  };
};

export const getFusionCost = (c1: Card | null, c2: Card | null): number => {
  if (!c1 || !c2) return 50;
  const costMap = [10, 20, 40, 80, 160];
  return (
    50 +
    costMap[getRankIndex(c1.cardClass)] +
    costMap[getRankIndex(c2.cardClass)]
  );
};

export const getDismantleValue = (cardClass: string): number => {
  return [50, 100, 200, 400, 800][getRankIndex(cardClass)] || 50;
};

export const getDismantleDustValue = (cardClass: string): number => {
  return [0, 5, 20, 50, 200][getRankIndex(cardClass)] || 0;
};

export const rollFaction = (): string => {
    const r = Math.random() * 100;
    if (r < 25) return 'CyberCore';
    if (r < 45) return 'Ethereal';
    if (r < 65) return 'VoidBringer';
    if (r < 80) return 'MechaMutant';
    if (r < 90) return 'AstroNomad';
    return 'ArcaneWeaver';
};

export const rollElement = (): string => {
    const r = Math.random() * 100;
    if (r < 18) return 'Fire';
    if (r < 36) return 'Water';
    if (r < 54) return 'Earth';
    if (r < 72) return 'Wind';
    if (r < 90) return 'Lightning';
    return 'Neutral';
};
