import type { Card } from '../types';
import * as rules from '../domain/gameRules';
import { getSkillEffects } from '../domain/skills';
import { readUnlockedSkills } from '../infrastructure/storage/browserStorage';

/** Supply the existing persisted skill context to pure domain calculations. */
export const calculateCombatStats = (card: Card | null) => rules.calculateCombatStats(card, validSkills());
export const getComboStats = (squad: (Card | null)[]) => {
    // Each old card calculation handled invalid persisted skill data independently.
    return rules.getComboStats(squad, validSkills());
};
export const getSquadDodgeRate = (squad: (Card | null)[]) => rules.getSquadDodgeRate(squad, validSkills());

function validSkills(): string[] {
    const skills = readUnlockedSkills();
    try { getSkillEffects(skills); return skills; }
    catch { return []; }
}
