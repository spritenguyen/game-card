import { Card, AppConfig, FactionType, ElementType, CardRole, Implant, CombatStats, Gear } from "../types";
import { FACTIONS } from "./constants";
import { getSkillEffects } from "./skills";

export const applyImplantStats = (baseStats: CombatStats, implants: Implant[]): CombatStats => {
    const stats = { ...baseStats };
    let hpPct = 0, atkPct = 0, defPct = 0, spdPct = 0, critRate = 0, critDmg = 0, lifeSteal = 0;
    let resPct = 0, accuracy = 0, manaRegen = 0, physicalDmgPct = 0, thorns = 0, hpRegen = 0;
    
    // Sum stats
    const addStat = (type: string, val: number, isPct: boolean) => {
        if (isPct) {
            if (type === 'HP') hpPct += val;
            else if (type === 'ATK') atkPct += val;
            else if (type === 'DEF') defPct += val;
            else if (type === 'RES') resPct += val;
            else if (type === 'SPEED') spdPct += val;
            else if (type === 'CRIT_RATE') critRate += val;
            else if (type === 'CRIT_DMG') critDmg += val;
            else if (type === 'LIFESTEAL') lifeSteal += val;
            else if (type === 'ACCURACY') accuracy += val;
            else if (type === 'PHYSICAL_DMG') physicalDmgPct += val;
            else if (type === 'THORNS') thorns += val;
        } else {
            if (type === 'HP') stats.hp += val;
            else if (type === 'ATK') { stats.patk += val; stats.matk += val; stats.atk += val; }
            else if (type === 'DEF') { stats.def += val; stats.mdef += val; }
            else if (type === 'RES') stats.res += val;
            else if (type === 'SPEED') stats.speed += val;
            else if (type === 'MANA_REGEN') manaRegen += val;
            else if (type === 'HP_REGEN') hpRegen += val;
        }
    };

    implants.forEach(imp => {
        addStat(imp.mainStat.type, imp.mainStat.value, imp.mainStat.isPercentage);
        imp.subStats.forEach(sub => addStat(sub.type, sub.value, sub.isPercentage));
    });

    // Apply set bonuses
    const setCounts: Record<string, number> = {};
    implants.forEach(imp => {
        setCounts[imp.set] = (setCounts[imp.set] || 0) + 1;
    });

    if (setCounts['Arasaka'] >= 2) atkPct += 15;
    if (setCounts['Arasaka'] >= 4) critDmg += 30;

    if (setCounts['Militech'] >= 2) hpPct += 15;
    if (setCounts['Militech'] >= 4) defPct += 30;

    if (setCounts['Biotechnica'] >= 2) lifeSteal += 10;
    if (setCounts['Biotechnica'] >= 4) hpPct += 20;

    if (setCounts['KangTao'] >= 2) defPct += 15;
    if (setCounts['KangTao'] >= 4) atkPct += 30;

    if (setCounts['Kiroshi'] >= 2) critRate += 10;
    if (setCounts['Kiroshi'] >= 4) { critRate += 20; spdPct += 10; }

    if (setCounts['Tetratronic'] >= 2) spdPct += 15;
    if (setCounts['Tetratronic'] >= 4) spdPct += 30;

    // Apply Pct
    stats.hp = Math.floor(stats.hp * (1 + hpPct / 100));
    stats.patk = Math.floor(stats.patk * (1 + (atkPct + physicalDmgPct) / 100));
    stats.matk = Math.floor(stats.matk * (1 + atkPct / 100));
    stats.atk = Math.max(stats.patk, stats.matk);
    stats.def = Math.floor(stats.def * (1 + defPct / 100));
    stats.mdef = Math.floor(stats.mdef * (1 + defPct / 100));
    stats.res = Math.floor(stats.res * (1 + resPct / 100));
    stats.speed = Math.floor(stats.speed * (1 + spdPct / 100));

    // Store custom stats temporarily in elementalDmg or a new field, but let's just add to elementalDmg to be compatible
    stats.elementalDmg = { 
        ...stats.elementalDmg, 
        CRIT_RATE: critRate, 
        CRIT_DMG: critDmg, 
        LIFESTEAL: lifeSteal, 
        ACCURACY: accuracy, 
        MANA_REGEN: manaRegen, 
        THORNS: thorns, 
        HP_REGEN: hpRegen 
    };

    return stats;
};

export const applyGearStats = (baseStats: CombatStats, gears: Gear[]): CombatStats => {
    const stats = { ...baseStats };
    let hpPct = 0, atkPct = 0, defPct = 0, spdPct = 0, critRate = 0, critDmg = 0, lifeSteal = 0;
    let resPct = 0, accuracy = 0, manaRegen = 0, physicalDmgPct = 0, thorns = 0, hpRegen = 0;
    
    // Sum stats
    const addStat = (type: string, val: number, isPct: boolean) => {
        if (isPct) {
            if (type === 'HP') hpPct += val;
            else if (type === 'ATK') atkPct += val;
            else if (type === 'DEF') defPct += val;
            else if (type === 'RES') resPct += val;
            else if (type === 'SPEED') spdPct += val;
            else if (type === 'CRIT_RATE') critRate += val;
            else if (type === 'CRIT_DMG') critDmg += val;
            else if (type === 'LIFESTEAL') lifeSteal += val;
            else if (type === 'ACCURACY') accuracy += val;
            else if (type === 'PHYSICAL_DMG') physicalDmgPct += val;
            else if (type === 'THORNS') thorns += val;
        } else {
            if (type === 'HP') stats.hp += val;
            else if (type === 'ATK') { stats.patk += val; stats.matk += val; stats.atk += val; }
            else if (type === 'DEF') { stats.def += val; stats.mdef += val; }
            else if (type === 'RES') stats.res += val;
            else if (type === 'SPEED') stats.speed += val;
            else if (type === 'MANA_REGEN') manaRegen += val;
            else if (type === 'HP_REGEN') hpRegen += val;
        }
    };

    gears.forEach(gear => {
        addStat(gear.mainStat.type, gear.mainStat.value, gear.mainStat.isPercentage);
        gear.subStats.forEach(sub => addStat(sub.type, sub.value, sub.isPercentage));
    });

    stats.hp = Math.floor(stats.hp * (1 + hpPct / 100));
    stats.patk = Math.floor(stats.patk * (1 + (atkPct + physicalDmgPct) / 100));
    stats.matk = Math.floor(stats.matk * (1 + atkPct / 100));
    stats.atk = Math.max(stats.patk, stats.matk);
    stats.def = Math.floor(stats.def * (1 + defPct / 100));
    stats.mdef = Math.floor(stats.mdef * (1 + defPct / 100));
    stats.res = Math.floor(stats.res * (1 + resPct / 100));
    stats.speed = Math.floor(stats.speed * (1 + spdPct / 100));

    stats.elementalDmg = { 
        ...stats.elementalDmg, 
        CRIT_RATE: (stats.elementalDmg.CRIT_RATE || 0) + critRate, 
        CRIT_DMG: (stats.elementalDmg.CRIT_DMG || 0) + critDmg, 
        LIFESTEAL: (stats.elementalDmg.LIFESTEAL || 0) + lifeSteal, 
        ACCURACY: (stats.elementalDmg.ACCURACY || 0) + accuracy, 
        MANA_REGEN: (stats.elementalDmg.MANA_REGEN || 0) + manaRegen, 
        THORNS: (stats.elementalDmg.THORNS || 0) + thorns, 
        HP_REGEN: (stats.elementalDmg.HP_REGEN || 0) + hpRegen 
    };

    return stats;
};

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
      speed: 0,
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
      if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2]))
        avgMeas = (parts[0] + parts[1] + parts[2]) / 3;
    }
  }

  let defBase = 50;
  let mdefBase = 50;
  let patkBase = avgMeas * 2.5;
  let matkBase = avgMeas * 2.5;

  if (role === "Vanguard") {
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
  } else if (role === "Weaver") {
    defBase = 40;
    mdefBase = 70;
    patkBase *= 0.6;
    matkBase *= 1.5;
  } else if (role === "Sniper") {
    baseHp *= 0.8;
    defBase = 30;
    mdefBase = 30;
    patkBase *= 1.4;
    matkBase *= 1.4;
  } else if (role === "Phantom") {
    baseHp *= 0.9;
    defBase = 40;
    mdefBase = 40;
    patkBase *= 1.5;
    matkBase *= 1.1;
  } else { // Striker
    defBase = 50;
    mdefBase = 50;
    patkBase *= 1.2;
    matkBase *= 1.2;
  }

  if (card.faction === "CyberCore" || card.faction === "MechaMutant") {
    patkBase *= 1.3;
    defBase += 20;
  } else if (
    card.faction === "Ethereal" ||
    card.faction === "ArcaneWeaver" ||
    card.faction === "VoidBringer"
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
  let speedBase = 100;

  if (role === "Sniper" || role === "Phantom") {
    speedBase += 30;
  } else if (role === "Vanguard") {
    speedBase -= 10;
  }
  
  // Lighter -> Faster
  speedBase += Math.max(-20, Math.min(20, (60 - (card.weight || 50))));

  if (card.element && card.element !== "Neutral") {
    elementalDmg[card.element] = 50 * multi;
    elementalRes[card.element] = 20 * multi;
  }
  if (card.element === "Fire" || card.element === "Water") resBase = 40;
  if (card.element === "Earth") {
    defBase += 20;
    mdefBase += 20;
    resBase += 20;
    speedBase -= 15;
  }
  if (card.element === "Lightning" || card.element === "Wind") {
    resBase -= 10;
    speedBase += 25;
  }
  if (card.element === "Neutral") {
    resBase = 30;
    defBase += 10;
    mdefBase += 10;
  }

  let overMulti = 1;
  if (card.cardClass === 'UR' && card.overclockLevel) {
      overMulti += card.overclockLevel * 0.1; // +10% per level
  }
  
  let levelMulti = 1;
  if (card.level && card.level > 1) {
      levelMulti += (card.level - 1) * 0.05; // +5% per level
  }
  
  const totalMulti = multi * overMulti * levelMulti;
  
  let skillEffects = { hp_pct: 0, atk_pct: 0, def_pct: 0, speed_flat: 0 };
  try {
     const stored = localStorage.getItem('cineUnlockedSkills');
     if (stored) {
         skillEffects = getSkillEffects(JSON.parse(stored));
     }
  } catch(e) {}

  let finalHp = Math.floor(baseHp * totalMulti * (1 + skillEffects.hp_pct));
  let finalPatk = Math.floor(patkBase * totalMulti * (1 + skillEffects.atk_pct));
  let finalMatk = Math.floor(matkBase * totalMulti * (1 + skillEffects.atk_pct));
  let finalDef = Math.floor(defBase * totalMulti * (1 + skillEffects.def_pct));
  let finalMdef = Math.floor(mdefBase * totalMulti * (1 + skillEffects.def_pct));
  let finalRes = Math.floor(resBase * totalMulti * (1 + skillEffects.def_pct));
  let finalSpeed = Math.floor(speedBase * (1 + (totalMulti - 1) * 0.1) + skillEffects.speed_flat);

  if (card.genes && card.genes.length > 0) {
      card.genes.forEach(g => {
          if (g === 'gene_hp') finalHp = Math.floor(finalHp * 1.3); // +30% HP
          if (g === 'gene_atk') {
              finalPatk = Math.floor(finalPatk * 1.3); // +30% ATK
              finalMatk = Math.floor(finalMatk * 1.3);
          }
          if (g === 'gene_fire') {
              elementalRes['Fire'] = (elementalRes['Fire'] || 0) + 50 * totalMulti;
              elementalDmg['Fire'] = (elementalDmg['Fire'] || 0) + 30 * totalMulti;
          }
          if (g === 'gene_water') {
              elementalRes['Water'] = (elementalRes['Water'] || 0) + 50 * totalMulti; // +Water Shield equivalent via Resist
              finalHp = Math.floor(finalHp * 1.1);
          }
          if (g === 'gene_earth') {
              elementalRes['Earth'] = (elementalRes['Earth'] || 0) + 50 * totalMulti;
              finalDef = Math.floor(finalDef * 1.3);
              finalMdef = Math.floor(finalMdef * 1.3);
          }
          if (g === 'gene_wind') {
              elementalRes['Wind'] = (elementalRes['Wind'] || 0) + 50 * totalMulti;
              finalSpeed += 30;
          }
          if (g === 'gene_light') {
              elementalRes['Light'] = (elementalRes['Light'] || 0) + 50 * totalMulti;
              finalHp = Math.floor(finalHp * 1.15); // Heal equivalent flat stat proxy
          }
          if (g === 'gene_dark') {
              elementalRes['Dark'] = (elementalRes['Dark'] || 0) + 50 * totalMulti;
              finalMatk = Math.floor(finalMatk * 1.15); // Lifesteal proxy
              finalPatk = Math.floor(finalPatk * 1.15);
          }
      });
  }

  const baseStats = {
    hp: finalHp,
    atk: Math.max(finalPatk, finalMatk), // Fallback for UI
    patk: finalPatk,
    matk: finalMatk,
    def: finalDef,
    mdef: finalMdef,
    res: finalRes,
    speed: finalSpeed,
    elementalDmg,
    elementalRes,
  };

  let finalStats = baseStats;

  if (card.implants) {
      const implList = Object.values(card.implants);
      if (implList.length > 0) {
          finalStats = applyImplantStats(finalStats, implList);
      }
  }

  if (card.gears) {
      const gearList = Object.values(card.gears);
      if (gearList.length > 0) {
          finalStats = applyGearStats(finalStats, gearList);
      }
  }

  if (card.resonance && card.resonance > 0) {
      const resVal = card.resonance;
      // Bonus per point: 0.2% HP, 0.1% ATK, 0.1% DEF, flat speed
      finalStats.hp = Math.floor(finalStats.hp * (1 + (resVal * 0.002)));
      finalStats.atk = Math.floor(finalStats.atk * (1 + (resVal * 0.001)));
      finalStats.patk = Math.floor(finalStats.patk * (1 + (resVal * 0.001)));
      finalStats.matk = Math.floor(finalStats.matk * (1 + (resVal * 0.001)));
      finalStats.def = Math.floor(finalStats.def * (1 + (resVal * 0.001)));
      finalStats.mdef = Math.floor(finalStats.mdef * (1 + (resVal * 0.001)));
      finalStats.speed += Math.floor(resVal * 0.1);
  }

  return finalStats;
};

export const getEnemySpeed = (e: any) => {
    let base = 100;
    if (e.threatLevel === "Nightmare") base += 40;
    else if (e.threatLevel === "Elite") base += 20;
    else if (e.threatLevel === "Minion") base -= 15;
    
    if (e.faction === "Tech") base += 15;
    else if (e.faction === "Magic") base -= 5;
    else if (e.faction === "Mutant") base += 20;

    if (e.element === "Wind" || e.element === "Lightning") {
       base += 25;
    } else if (e.element === "Earth") {
       base -= 15;
    }

    if (e.hp > 100000) base -= 20;
    else if (e.hp < 10000) base += 25;

    return Math.max(50, base);
}

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

    const elementCountsNoNeutral = { ...elementCounts };
    delete elementCountsNoNeutral["Neutral"];
    const maxElementCount = Object.keys(elementCountsNoNeutral).length > 0 
      ? Math.max(...Object.values(elementCountsNoNeutral)) : 0;

    if (maxElementCount >= 4) {
      synergyBonusAtk += 0.4;
      synergyBonusRes += 0.4;
      activeSynergies.push("Đại Cộng Hưởng Nguyên Tố (+40% ATK, +40% Kháng)");
    } else if (maxElementCount === 3) {
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
  
  let dodge_bonus = 0;
  try {
     const stored = localStorage.getItem('cineUnlockedSkills');
     if (stored) {
         dodge_bonus = getSkillEffects(JSON.parse(stored)).dodge_flat;
     }
  } catch(e) {}
  
  return (maxRank >= 0 ? DODGE_RATES[maxRank] : 0) + dodge_bonus;
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

export const rollImplant = (level: number, elite: boolean = false): any => {
    const baseChance = elite ? 100 : 30 + (level * 0.5);
    if (Math.random() * 100 > baseChance) return null;

    const slots = [1, 2, 3, 4, 5, 6];
    const slot = slots[Math.floor(Math.random() * slots.length)];

    const sets = ['Arasaka', 'Militech', 'Biotechnica', 'KangTao', 'Kiroshi', 'Tetratronic'];
    const set = sets[Math.floor(Math.random() * sets.length)];

    let rarity: 1|2|3|4|5 = 1;
    const roll = Math.random() * 100;
    if (level < 10) {
        if (roll < 5) rarity = 3; else if (roll < 20) rarity = 2; else rarity = 1;
    } else if (level < 30) {
        if (roll < 5) rarity = 4; else if (roll < 40) rarity = 3; else if (roll < 80) rarity = 2; else rarity = 1;
    } else {
        if (roll < 10) rarity = 5; else if (roll < 50) rarity = 4; else if (roll < 90) rarity = 3; else rarity = 2;
    }

    const mainStatTypes = ['HP', 'ATK', 'DEF', 'CRIT_RATE', 'CRIT_DMG', 'SPEED', 'LIFESTEAL'];
    const mainType = mainStatTypes[Math.floor(Math.random() * mainStatTypes.length)];
    const mainIsPct = ['CRIT_RATE', 'CRIT_DMG', 'LIFESTEAL'].includes(mainType) || Math.random() > 0.5;
    
    const multiplier = rarity * (1 + level * 0.05);
    let mainVal = 0;
    if (mainIsPct) {
        mainVal = Math.floor(Math.random() * 5 * rarity) + rarity;
    } else {
        mainVal = Math.floor(Math.random() * 50 * multiplier) + (10 * multiplier);
    }
    const mainStat = { type: mainType, value: mainVal, isPercentage: mainIsPct };

    const allStatTypes = ['HP', 'ATK', 'DEF', 'RES', 'CRIT_RATE', 'CRIT_DMG', 'SPEED', 'LIFESTEAL', 'ACCURACY', 'MANA_REGEN', 'PHYSICAL_DMG', 'THORNS', 'HP_REGEN'];
    const subCount = Math.min(4, Math.floor(Math.random() * rarity) + (elite ? 1 : 0));
    const subStats = [];
    for (let i = 0; i < subCount; i++) {
        const subType = allStatTypes[Math.floor(Math.random() * allStatTypes.length)];
        const subIsPct = ['CRIT_RATE', 'CRIT_DMG', 'LIFESTEAL', 'THORNS', 'PHYSICAL_DMG', 'ACCURACY'].includes(subType) || Math.random() > 0.5;
        let subVal = 0;
        if (subIsPct) {
            subVal = parseFloat(((Math.random() * 2 * rarity) + (rarity * 0.5)).toFixed(1));
        } else {
            subVal = Math.floor(Math.random() * 20 * multiplier) + 5;
        }
        subStats.push({ type: subType, value: subVal, isPercentage: subIsPct });
    }

    return {
        id: `imp_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        name: `${set} Mk.${rarity} [SLOT-${slot}]`,
        slot,
        set,
        rarity,
        level: 0,
        mainStat,
        subStats
    };
};

export const rollGear = (level: number, elite: boolean = false): any => {
    const baseChance = elite ? 100 : 30 + (level * 0.5);
    if (Math.random() * 100 > baseChance) return null;

    const slots = [1, 2, 3, 4] as const;
    const slot = slots[Math.floor(Math.random() * slots.length)];

    let rarity: 1|2|3|4|5 = 1;
    const roll = Math.random() * 100;
    if (level < 10) {
        if (roll < 5) rarity = 3; else if (roll < 20) rarity = 2; else rarity = 1;
    } else if (level < 30) {
        if (roll < 5) rarity = 4; else if (roll < 40) rarity = 3; else if (roll < 80) rarity = 2; else rarity = 1;
    } else {
        if (roll < 10) rarity = 5; else if (roll < 50) rarity = 4; else if (roll < 90) rarity = 3; else rarity = 2;
    }

    const brands = ["Aetheris", "Titan", "Kinetics", "OmniTech", "Cipher", "Vanguard"];
    const brand = brands[Math.floor(Math.random() * brands.length)];

    let mainStatTypes: string[] = [];
    let typeName: any = "";

    switch (slot) {
        case 1:
            typeName = "Neural Link";
            mainStatTypes = ['ACCURACY', 'CRIT_RATE', 'CRIT_DMG', 'MANA_REGEN'];
            break;
        case 2:
            typeName = "Core Drive";
            mainStatTypes = ['HP', 'DEF', 'RES'];
            break;
        case 3:
            typeName = "Kinetic Actuator";
            mainStatTypes = ['ATK', 'PHYSICAL_DMG', 'SPEED'];
            break;
        case 4:
            typeName = "Utility Module";
            mainStatTypes = ['LIFESTEAL', 'THORNS', 'HP_REGEN'];
            break;
    }

    const mainType = mainStatTypes[Math.floor(Math.random() * mainStatTypes.length)];
    const mainIsPct = ['CRIT_RATE', 'CRIT_DMG', 'LIFESTEAL', 'THORNS', 'PHYSICAL_DMG', 'ACCURACY'].includes(mainType) || Math.random() > 0.5;
    
    const multiplier = rarity * (1 + level * 0.05);
    let mainVal = 0;
    if (mainIsPct) {
        mainVal = Math.floor(Math.random() * 5 * rarity) + rarity;
    } else {
        mainVal = Math.floor(Math.random() * 50 * multiplier) + (10 * multiplier);
    }
    const mainStat = { type: mainType, value: mainVal, isPercentage: mainIsPct };

    let brandStatsPool: string[] = [];
    if (brand === "Aetheris") brandStatsPool = ['CRIT_DMG', 'CRIT_RATE', 'ATK', 'ACCURACY'];
    else if (brand === "Titan") brandStatsPool = ['HP', 'DEF', 'RES', 'THORNS'];
    else if (brand === "Kinetics") brandStatsPool = ['SPEED', 'PHYSICAL_DMG', 'ATK', 'ACCURACY'];
    else if (brand === "OmniTech") brandStatsPool = ['MANA_REGEN', 'LIFESTEAL', 'HP_REGEN', 'SPEED'];
    else if (brand === "Cipher") brandStatsPool = ['ACCURACY', 'RES', 'MANA_REGEN', 'DEF'];
    else if (brand === "Vanguard") brandStatsPool = ['ATK', 'HP', 'SPEED', 'PHYSICAL_DMG'];

    const allStatTypes = ['HP', 'ATK', 'DEF', 'RES', 'CRIT_RATE', 'CRIT_DMG', 'SPEED', 'LIFESTEAL', 'ACCURACY', 'MANA_REGEN', 'PHYSICAL_DMG', 'THORNS', 'HP_REGEN'];
    const subCount = Math.min(4, Math.floor(Math.random() * rarity) + (elite ? 1 : 0));
    const subStats = [];
    for (let i = 0; i < subCount; i++) {
        // 70% chance to roll from brand pool, 30% from any
        const useBrandPool = Math.random() < 0.7;
        const subType = useBrandPool ? brandStatsPool[Math.floor(Math.random() * brandStatsPool.length)] : allStatTypes[Math.floor(Math.random() * allStatTypes.length)];
        const subIsPct = ['CRIT_RATE', 'CRIT_DMG', 'LIFESTEAL', 'THORNS', 'PHYSICAL_DMG', 'ACCURACY'].includes(subType) || Math.random() > 0.5;
        let subVal = 0;
        if (subIsPct) {
            subVal = parseFloat(((Math.random() * 2 * rarity) + (rarity * 0.5)).toFixed(1));
        } else {
            subVal = Math.floor(Math.random() * 20 * multiplier) + 5;
        }
        subStats.push({ type: subType, value: subVal, isPercentage: subIsPct });
    }

    let rarityText = "";
    if (rarity === 1) rarityText = "Standard";
    else if (rarity === 2) rarityText = "Industrial";
    else if (rarity === 3) rarityText = "Advanced";
    else if (rarity === 4) rarityText = "Elite";
    else if (rarity === 5) rarityText = "Masterpiece";

    return {
        id: `gear_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        name: `[${brand}] ${typeName} - ${rarityText}`,
        slot,
        type: typeName,
        brand,
        rarity,
        level: 0,
        mainStat,
        subStats
    };
};
