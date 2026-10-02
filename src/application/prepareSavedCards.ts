import type { Card } from '../types';
import type { GameRepository } from './ports/gameRepository';
import { rollFaction, rollElement } from '../domain/gameRules';

/** Apply the existing legacy-card migration before publishing hydrated state. */
export const prepareSavedCards = (savedCards: Card[], repository: Pick<GameRepository, 'saveCard'>, createImageUrl: (blob: Blob) => string): Card[] => {
    return savedCards.map(c => {
        let modified = false;
        const validFactions = ['CyberCore', 'Ethereal', 'VoidBringer', 'MechaMutant', 'AstroNomad', 'ArcaneWeaver'];
        if (!validFactions.includes(c.faction)) {
            c.faction = rollFaction() as any;
            modified = true;
        }
        const validElements = ['Fire', 'Water', 'Earth', 'Lightning', 'Wind', 'Neutral'];
        if (!c.element || !validElements.includes(c.element)) {
            c.element = rollElement() as any;
            modified = true;
        }
        if (modified) {
            repository.saveCard(c).catch(() => {});
        }
        
        if (c.imageBlob) {
            c.imageUrl = createImageUrl(c.imageBlob);
        }
        return c;
    });
};
