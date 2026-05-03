import { Card, AppConfig, FactionType, ElementType } from "../types";
import { FACTIONS } from "./constants";

export const getFactionInfo = (factionId: FactionType | string) => {
  return FACTIONS[factionId as FactionType] || FACTIONS["Tech"];
};

export const getRankIndex = (classStr?: string): number => {
  if (!classStr) return 0;
  const up = classStr.toUpperCase();
  if (up.includes("UR") || up.includes("ULTRA")) return 4;
  if (up.includes("SSR")) return 3;
  if (up.includes("SR")) return 2;
  if (up.includes("R")) return 1;
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

export const getCardRole = (card: Card): "Tanker" | "DPS" | "Support" => {
  if (card.role) return card.role;
  if (card.weight && card.weight >= 65) return "Tanker";
  if (["Magic", "Light", "Nature", "Dark"].includes(card.faction)) return "Support";
  return "DPS";
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

  if (role === "DPS") {
    powBase = 300;
    cd = 3;
    cost = 100;
    scalingType = "150% ATK";
  }
  if (role === "Tanker") {
    powBase = 150;
    cd = 5;
    cost = 80;
    scalingType = "200% DEF";
  }
  if (role === "Support") {
    powBase = 100;
    cd = 4;
    cost = 60;
    scalingType = "150% MATK";
  }

  const isMagic =
    card.faction === "Magic" ||
    card.faction === "Light" ||
    card.faction === "Dark";
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

export const calculateCombatStats = (card: Card | null) => {
  if (!card)
    return {
      hp: 0,
      atk: 0,
      patk: 0,
      matk: 0,
      def: 0,
      mdef: 0,
      res: 0,
      elementalDmg: {},
      elementalRes: {},
    };
  const multi = [1, 1.5, 2.5, 5, 10][getRankIndex(card.cardClass)];

  const role = getCardRole(card);
  let baseHp = (card.weight || 50) * 10 + (card.height || 160) * 2;
  let avgMeas = 80;
  if (card.measurements) {
    const extracted = card.measurements.match(
      /\d{2,3}[-\./]\d{2,3}[-\./]\d{2,3}/,
    );
    if (extracted) {
      const parts = extracted[0].split(/[-\./]/).map((n) => parseInt(n.trim()));
      if (parts.length >= 3 && !isNaN(parts[0]))
        avgMeas = (parts[0] + parts[1] + parts[2]) / 3;
    }
  }

  let defBase = 50;
  let mdefBase = 50;
  let patkBase = avgMeas * 2.5;
  let matkBase = avgMeas * 2.5;

  if (role === "Tanker") {
    baseHp *= 1.5;
    defBase = 100;
    mdefBase = 100;
    patkBase *= 0.5;
    matkBase *= 0.5;
  } else if (role === "Support") {
    defBase = 60;
    mdefBase = 80;
    patkBase *= 0.8;
    matkBase *= 1.2;
  } else {
    defBase = 40;
    mdefBase = 40;
    patkBase *= 1.3;
    matkBase *= 1.3;
  }

  if (card.faction === "Tech" || card.faction === "Mutant") {
    patkBase *= 1.3;
    defBase += 20;
  } else if (
    card.faction === "Magic" ||
    card.faction === "Light" ||
    card.faction === "Dark"
  ) {
    matkBase *= 1.3;
    mdefBase += 20;
  }

  const elementalDmg: Record<string, number> = {};
  const elementalRes: Record<string, number> = {};

  ["Fire", "Water", "Earth", "Lightning", "Wind", "Neutral"].forEach(
    (el) => (elementalRes[el] = 0),
  );

  let resBase = 20;
  if (card.element && card.element !== "Neutral") {
    elementalDmg[card.element] = 50 * multi;
    elementalRes[card.element] = 20 * multi;
  }
  if (card.element === "Fire" || card.element === "Water") resBase = 40;
  if (card.element === "Earth") {
    defBase += 20;
    mdefBase += 20;
    resBase += 20;
  }
  if (card.element === "Lightning" || card.element === "Wind") resBase -= 10;
  if (card.element === "Neutral") {
    resBase = 30;
    defBase += 10;
    mdefBase += 10;
  }

  let overMulti = 1;
  if (card.cardClass === 'UR' && card.overclockLevel) {
      overMulti += card.overclockLevel * 0.1; // +10% per level
  }

  return {
    hp: Math.floor(baseHp * multi * overMulti),
    atk: Math.floor(Math.max(patkBase, matkBase) * multi * overMulti), // Fallback for UI
    patk: Math.floor(patkBase * multi * overMulti),
    matk: Math.floor(matkBase * multi * overMulti),
    def: Math.floor(defBase * multi * overMulti),
    mdef: Math.floor(mdefBase * multi * overMulti),
    res: Math.floor(resBase * multi * overMulti),
    elementalDmg,
    elementalRes,
  };
};

export const getComboStats = (squad: (Card | null)[]) => {
  let totalHp = 0;
  let totalAtk = 0;
  let totalPatk = 0;
  let totalMatk = 0;
  let totalDef = 0;
  let totalMdef = 0;
  let totalRes = 0;
  const elementalDmg: Record<string, number> = {};
  const elementalRes: Record<string, number> = {};
  let cardMaxHp = [0, 0, 0, 0, 0, 0];

  // Frontline: idx 0, 1, 2
  // Backline: idx 3, 4, 5
  squad.forEach((c, idx) => {
    if (!c) return;
    const stats = calculateCombatStats(c);

    // Frontline buff: +20% HP, +20% DEF/RES
    // Backline buff: +20% ATK, -20% DEF
    let hpMod = idx < 3 ? 1.2 : 1.0;
    let atkMod = idx >= 3 ? 1.2 : 1.0;
    let defMod = idx < 3 ? 1.2 : 0.8;

    let chp = Math.floor(stats.hp * hpMod);
    cardMaxHp[idx] = chp;

    totalHp += chp;
    totalAtk += Math.floor(stats.atk * atkMod);
    totalPatk += Math.floor(stats.patk * atkMod);
    totalMatk += Math.floor(stats.matk * atkMod);
    totalDef += Math.floor(stats.def * defMod);
    totalMdef += Math.floor(stats.mdef * defMod);
    totalRes += Math.floor(stats.res * defMod);
    Object.entries(stats.elementalDmg).forEach(
      ([k, v]) =>
        (elementalDmg[k] = (elementalDmg[k] || 0) + Math.floor(v * atkMod)),
    );
    Object.entries(stats.elementalRes).forEach(
      ([k, v]) =>
        (elementalRes[k] = (elementalRes[k] || 0) + Math.floor(v * defMod)),
    );
  });

  let synergyBonusAtk = 0;
  let synergyBonusHp = 0;
  let synergyBonusDef = 0;
  let synergyBonusRes = 0;
  let activeSynergies: string[] = [];

  const activeCards = squad.filter((c) => c !== null) as Card[];
  if (activeCards.length >= 3) {
    const factions = activeCards.map((c) => c.faction);
    const elements = activeCards.map((c) => c.element);

    const factionCounts = factions.reduce(
      (acc, f) => {
        acc[f] = (acc[f] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const elementCounts = elements.reduce(
      (acc, e) => {
        acc[e] = (acc[e] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const maxFactionCount = Math.max(...Object.values(factionCounts));

    if (maxFactionCount >= 4) {
      synergyBonusAtk += 0.4;
      synergyBonusHp += 0.4;
      synergyBonusDef += 0.3;
      activeSynergies.push("Đế Chế Đồng Lòng (+40% HP/ATK, +30% DEF/MDEF)");
    } else if (maxFactionCount === 3) {
      synergyBonusAtk += 0.3;
      synergyBonusHp += 0.3;
      synergyBonusDef += 0.2;
      activeSynergies.push("Đồng Lòng Thế Lực (+30% HP/ATK, +20% DEF/MDEF)");
    } else if (Object.keys(factionCounts).length >= 4) {
      synergyBonusAtk += 0.15;
      synergyBonusHp += 0.15;
      synergyBonusRes += 0.2;
      activeSynergies.push("Đa Dạng Chiến Thuật (+15% HP/ATK, +20% Kháng)");
    } else {
      synergyBonusAtk += 0.1;
      activeSynergies.push("Hiệp Đồng Tác Chiến (+10% ATK)");
    }

    const maxElementCount = Math.max(...Object.values(elementCounts));
    if (maxElementCount >= 4 && !elements.includes("Neutral")) {
      synergyBonusAtk += 0.4;
      synergyBonusRes += 0.4;
      activeSynergies.push("Đại Cộng Hưởng Nguyên Tố (+40% ATK, +40% Kháng)");
    } else if (maxElementCount === 3 && !elements.includes("Neutral")) {
      synergyBonusAtk += 0.3;
      synergyBonusRes += 0.3;
      activeSynergies.push("Cộng Hưởng Nguyên Tố (+30% ATK, +30% Kháng)");
    } else if (Object.keys(elementCounts).length >= 4) {
      synergyBonusAtk += 0.2;
      synergyBonusHp += 0.2;
      activeSynergies.push("Đa Hệ Nguyên Tố (+20% HP/ATK)");
    } else if (maxElementCount >= 2) {
      synergyBonusAtk += 0.1;
      activeSynergies.push("Cộng Hưởng Nhẹ (+10% ATK)");
    }
  } else if (activeCards.length === 2) {
    if (activeCards[0].faction === activeCards[1].faction) {
      synergyBonusAtk += 0.1;
      activeSynergies.push("Hỗ Trợ Thế Lực (+10% ATK)");
    }
    if (
      activeCards[0].element === activeCards[1].element &&
      activeCards[0].element !== "Neutral"
    ) {
      synergyBonusAtk += 0.1;
      activeSynergies.push("Cộng Hưởng Nhẹ (+10% ATK)");
    }
  }

  if (synergyBonusHp > 0) {
    totalHp = Math.floor(totalHp * (1 + synergyBonusHp));
    cardMaxHp = cardMaxHp.map(hp => Math.floor(hp * (1 + synergyBonusHp)));
  }
  if (synergyBonusAtk > 0) {
    totalAtk = Math.floor(totalAtk * (1 + synergyBonusAtk));
    totalPatk = Math.floor(totalPatk * (1 + synergyBonusAtk));
    totalMatk = Math.floor(totalMatk * (1 + synergyBonusAtk));
  }
  if (synergyBonusDef > 0) {
    totalDef = Math.floor(totalDef * (1 + synergyBonusDef));
    totalMdef = Math.floor(totalMdef * (1 + synergyBonusDef));
  }
  if (synergyBonusRes > 0) {
    totalRes = Math.floor(totalRes * (1 + synergyBonusRes));
    Object.keys(elementalRes).forEach(
      (k) =>
        (elementalRes[k] = Math.floor(elementalRes[k] * (1 + synergyBonusRes))),
    );
  }

  return {
    hp: totalHp,
    cardMaxHp,
    atk: totalAtk,
    patk: totalPatk,
    matk: totalMatk,
    def: totalDef,
    mdef: totalMdef,
    res: totalRes,
    elementalDmg,
    elementalRes,
    activeSynergies,
    synergyBonusAtk,
    synergyBonusHp,
    synergyBonusDef,
    synergyBonusRes,
  };
};

export const getSquadDodgeRate = (squad: (Card | null)[]): number => {
  const DODGE_RATES = [10, 15, 20, 25, 35];
  let maxRank = -1;
  squad.forEach((card) => {
    if (card) {
      const rank = getRankIndex(card.cardClass);
      if (rank > maxRank) maxRank = rank;
    }
  });
  return maxRank >= 0 ? DODGE_RATES[maxRank] : 0;
};

export const getFusionCost = (c1: Card | null, c2: Card | null): number => {
  if (!c1 || !c2) return 50;
  const costMap = [10, 20, 40, 80, 0];
  return (
    50 +
    costMap[getRankIndex(c1.cardClass)] +
    costMap[getRankIndex(c2.cardClass)]
  );
};

export const getDismantleValue = (cardClass: string): number => {
  return [50, 100, 200, 400, 800][getRankIndex(cardClass)];
};

export const base64ToBlob = (base64Data: string): Blob | null => {
  if (!base64Data || !base64Data.startsWith("data:image")) return null;
  const parts = base64Data.split(",");
  const contentType = parts[0].match(/:(.*?);/)![1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: contentType });
};
