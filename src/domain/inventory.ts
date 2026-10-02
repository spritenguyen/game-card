import type { Inventory } from '../types';

/** Normalize legacy material names without changing counts or default rules. */
export const migrateInventory = (parsed: any): Inventory => {
    const materials = parsed.materials || {};
    
    // DATA MIGRATION: Merge inconsistent keys
    const merge = (oldKey: string, newKey: string) => {
        if (materials[oldKey] !== undefined) {
            materials[newKey] = (materials[newKey] || 0) + materials[oldKey];
            delete materials[oldKey];
        }
    };
    
    merge('Lightcore', 'Light Core');
    merge('Darkcore', 'Dark Core');
    merge('Darkessence', 'Dark Core');
    merge('DarkEssence', 'Dark Core');
    merge('Magiccore', 'Magic Core');
    merge('ManaCrystal', 'Magic Core');
    merge('Techcore', 'Tech Core');
    merge('TechNode', 'Tech Core');
    merge('Mutantcore', 'Mutant Core');
    merge('MutantCell', 'Mutant Core');
    merge('LightCore', 'Light Core');

    return {
        baseTickets: parsed.baseTickets || 0,
        eliteTickets: parsed.eliteTickets || 0,
        materials: materials,
        quantumDust: parsed.quantumDust || 0
    };
};
