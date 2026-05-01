import { Card, AppConfig, FactionType, ElementType } from '../types';
import { FACTIONS } from './constants';

export const getFactionInfo = (factionId: FactionType | string) => {
    return FACTIONS[factionId as FactionType] || FACTIONS['Tech'];
};

export const getRankIndex = (classStr?: string): number => {
    if (!classStr) return 0;
    const up = classStr.toUpperCase();
    if (up.includes('UR') || up.includes('ULTRA')) return 4;
    if (up.includes('SSR')) return 3;
    if (up.includes('SR')) return 2;
    if (up.includes('R')) return 1;
    return 0;
};

export const rollExtractRank = (playerLevel: number, pityCounter: number, isEliteTicket: boolean): { rank: string, newPity: number } => {
    const effLevel = Math.min(playerLevel, 20);
    const levelBonus = (effLevel - 1) * 0.5;
    
    let urChance = isEliteTicket ? (5 + levelBonus * 0.2) : (effLevel >= 5 ? (0.5 + Math.max(0, levelBonus * 0.1)) : 0);
    let ssrChance = isEliteTicket ? (25 + levelBonus * 0.5) : (3 + levelBonus * 0.3);
    let srChance = isEliteTicket ? (100 - urChance - ssrChance) : (12 + levelBonus);
    let rChance = isEliteTicket ? 0 : 30;
    
    if (pityCounter >= 50 && pityCounter < 89) {
        const pityBonus = (pityCounter - 50) * 1.5;
        urChance += Math.max(0, pityBonus * 0.2);
        ssrChance += Math.max(0, pityBonus * 0.8);
    }
    
    if (pityCounter >= 89) {
        urChance = isEliteTicket ? 40 : 20;
        ssrChance = 100; // Actually, anything below urChance rolls UR, else SSR
    }
    
    const roll = Math.random() * 100;
    
    if (roll < urChance) {
        return { rank: 'UR', newPity: 0 };
    } else if (roll < urChance + ssrChance) {
        return { rank: 'SSR', newPity: 0 };
    } else if (roll < urChance + ssrChance + srChance) {
        return { rank: 'SR', newPity: pityCounter + 1 };
    } else if (roll < urChance + ssrChance + srChance + rChance) {
        return { rank: 'R', newPity: pityCounter + 1 };
    } else {
        return { rank: 'N', newPity: pityCounter + 1 };
    }
};

export const getElementAdvantage = (atkElement?: string, defElement?: string): number => {
    if (!atkElement || !defElement || atkElement === 'Neutral' || defElement === 'Neutral') return 1.0;
    
    // Rock-Paper-Scissors: Fire > Wind > Earth > Lightning > Water > Fire
    const advantageMap: Record<string, string> = {
        'Fire': 'Wind',
        'Wind': 'Earth',
        'Earth': 'Lightning',
        'Lightning': 'Water',
        'Water': 'Fire'
    };
    
    const weaknessMap: Record<string, string> = {
        'Fire': 'Water',
        'Water': 'Lightning',
        'Lightning': 'Earth',
        'Earth': 'Wind',
        'Wind': 'Fire'
    };

    if (advantageMap[atkElement] === defElement) return 1.5; // Strong against
    if (weaknessMap[atkElement] === defElement) return 0.5;  // Weak against
    return 1.0;
};

export const calculateCombatStats = (card: Card | null) => {
    if (!card) return { hp: 0, atk: 0 };
    const multi = [1, 1.5, 2.5, 5, 10][getRankIndex(card.cardClass)];
    const baseHp = (card.weight || 50) * 10 + (card.height || 160) * 2;
    let avgMeas = 80;
    if (card.measurements) {
        const extracted = card.measurements.match(/\d{2,3}[-\./]\d{2,3}[-\./]\d{2,3}/);
        if (extracted) {
            const parts = extracted[0].split(/[-\./]/).map(n => parseInt(n.trim()));
            if (parts.length >= 3 && !isNaN(parts[0])) avgMeas = (parts[0] + parts[1] + parts[2]) / 3;
        }
    }
    return {
        hp: Math.floor(baseHp * multi),
        atk: Math.floor((avgMeas * 2.5) * multi)
    };
};

export const getComboStats = (squad: (Card | null)[]) => {
    let totalHp = 0;
    let totalAtk = 0;
    const activeCards = squad.filter(c => c !== null) as Card[];
    
    activeCards.forEach(c => {
        const { hp, atk } = calculateCombatStats(c);
        totalHp += hp;
        totalAtk += atk;
    });

    let synergyBonusAtk = 0;
    let synergyBonusHp = 0;
    let activeSynergies: string[] = [];

    // Calculate Synergy
    if (activeCards.length === 3) {
        const factions = activeCards.map(c => c.faction);
        const elements = activeCards.map(c => c.element);

        const uniqueFactions = new Set(factions);
        const uniqueElements = new Set(elements);

        if (uniqueFactions.size === 1) {
            synergyBonusAtk += 0.3;
            synergyBonusHp += 0.3;
            activeSynergies.push("Đồng Lòng Thế Lực (+30% HP/ATK)");
        } else if (uniqueFactions.size === 3) {
            synergyBonusAtk += 0.15;
            synergyBonusHp += 0.15;
            activeSynergies.push("Đa Dạng Chiến Thuật (+15% HP/ATK)");
        } else {
             synergyBonusAtk += 0.1;
             activeSynergies.push("Hỗ Trợ Thế Lực (+10% ATK)");
        }

        if (uniqueElements.size === 1 && !elements.includes('Neutral')) {
            synergyBonusAtk += 0.3;
            activeSynergies.push("Cộng Hưởng Nguyên Tố (+30% ATK)");
        } else if (uniqueElements.size === 3) {
            synergyBonusAtk += 0.15;
            synergyBonusHp += 0.15;
            activeSynergies.push("Nguyên Tố Hỗn Hợp (+15% HP/ATK)");
        } else {
             const counts = elements.reduce((acc, el) => { acc[el] = (acc[el] || 0) + 1; return acc; }, {} as Record<string, number>);
             if (Object.values(counts).some(c => c === 2)) {
                 synergyBonusAtk += 0.1;
                 activeSynergies.push("Cộng Hưởng Nhẹ (+10% ATK)");
             }
        }
    } else if (activeCards.length === 2) {
        if (activeCards[0].faction === activeCards[1].faction) {
           synergyBonusAtk += 0.1;
           activeSynergies.push("Hỗ Trợ Thế Lực (+10% ATK)");
        }
        if (activeCards[0].element === activeCards[1].element && activeCards[0].element !== 'Neutral') {
           synergyBonusAtk += 0.1;
           activeSynergies.push("Cộng Hưởng Nhẹ (+10% ATK)");
        }
    }

    if (synergyBonusHp > 0) totalHp = Math.floor(totalHp * (1 + synergyBonusHp));
    if (synergyBonusAtk > 0) totalAtk = Math.floor(totalAtk * (1 + synergyBonusAtk));

    return { hp: totalHp, atk: totalAtk, activeSynergies, synergyBonusAtk, synergyBonusHp };
};

export const getSquadDodgeRate = (squad: (Card | null)[]): number => {
    const DODGE_RATES = [10, 15, 20, 25, 35];
    let maxRank = -1;
    squad.forEach(card => {
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
    return 50 + costMap[getRankIndex(c1.cardClass)] + costMap[getRankIndex(c2.cardClass)];
};

export const getDismantleValue = (cardClass: string): number => {
    return [50, 100, 200, 400, 800][getRankIndex(cardClass)];
};

export const base64ToBlob = (base64Data: string): Blob | null => {
    if (!base64Data || !base64Data.startsWith('data:image')) return null;
    const parts = base64Data.split(',');
    const contentType = parts[0].match(/:(.*?);/)![1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], { type: contentType });
};

