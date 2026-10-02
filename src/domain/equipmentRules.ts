import type { Implant, Gear, CombatStats } from '../types';

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

