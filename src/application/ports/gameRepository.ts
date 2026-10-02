import type { Card, Implant, Gear } from '../../types';

/** Persistence contract; transaction guarantees belong to the implementation. */
export interface GameRepository {
    initDB(): Promise<boolean>;
    getStatus(): 'online' | 'offline' | 'error';
    saveCard(card: Card): Promise<void>;
    deleteCard(id: string): Promise<void>;
    replaceCards(card: Card, consumedIds: string[]): Promise<void>;
    changeEquipment(cardId: string, kind: 'implants' | 'gears', slot: number, itemId?: string): Promise<{ card: Card; items: (Implant | Gear)[] }>;
    getAllCards(): Promise<Card[]>;
    saveImplant(implant: Implant): Promise<void>;
    deleteImplant(id: string): Promise<void>;
    getAllImplants(): Promise<Implant[]>;
    saveGear(gear: Gear): Promise<void>;
    deleteGear(id: string): Promise<void>;
    getAllGears(): Promise<Gear[]>;
    clearAll(): Promise<void>;
}
