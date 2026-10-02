import { saveCoordinator } from './saveCoordinator';
import type { GameRepository } from '../../application/ports/gameRepository';
import type { Card, Implant, Gear } from '../../types';

const DB_NAME = 'CineTechVault';
const STORE_NAME = 'cards';
const IMPLANTS_STORE = 'implants';
const GEARS_STORE = 'gears';

export class DatabaseService implements GameRepository {
    private db: IDBDatabase | null = null;
    private dbStatus: 'online' | 'offline' | 'error' = 'offline';

    async initDB(): Promise<boolean> {
        if (this.db) return true;
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                this.dbStatus = 'error';
                return resolve(false);
            }
            const req = indexedDB.open(DB_NAME, 4); // Bump version to 4

            req.onsuccess = (e) => {
                this.db = (e.target as IDBOpenDBRequest).result;
                this.dbStatus = 'online';
                resolve(true);
            };

            req.onerror = () => {
                this.dbStatus = 'error';
                resolve(false);
            };

            req.onupgradeneeded = (e) => {
                const db = (e.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(IMPLANTS_STORE)) {
                    db.createObjectStore(IMPLANTS_STORE, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(GEARS_STORE)) {
                    db.createObjectStore(GEARS_STORE, { keyPath: 'id' });
                }
            };
        });
    }

    getStatus() {
        return this.dbStatus;
    }

    private action(storeName: string, mode: IDBTransactionMode, action: 'put' | 'delete' | 'getAll', data?: any): Promise<any> {
        if (mode === 'readwrite') saveCoordinator.assertRepositoryWrite();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Database offline");
            try {
                const tx = this.db.transaction([storeName], mode);
                const req = tx.objectStore(storeName)[action](data);
                tx.oncomplete = () => { if (mode === 'readwrite') saveCoordinator.changed(); resolve(action === 'getAll' ? req.result : true); };
                tx.onabort = () => reject(tx.error || new Error('Database transaction aborted'));
                tx.onerror = () => reject(tx.error || req.error);
            } catch (e) {
                reject(e);
            }
        });
    }

    async saveCard(card: Card): Promise<void> {
        await this.action(STORE_NAME, 'readwrite', 'put', card);
    }

    async deleteCard(id: string): Promise<void> {
        await this.action(STORE_NAME, 'readwrite', 'delete', id);
    }

    async replaceCards(card: Card, consumedIds: string[]): Promise<void> {
        saveCoordinator.assertRepositoryWrite();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Database offline'));
            const tx = this.db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            let failure: Error | undefined;
            tx.oncomplete = () => { saveCoordinator.changed(); resolve(); };
            tx.onabort = () => reject(failure || tx.error || new Error('Card transaction aborted'));
            tx.onerror = () => reject(tx.error);
            try {
                for (const id of new Set(consumedIds)) {
                    const req = store.get(id);
                    req.onsuccess = () => {
                        if (!req.result) {
                            failure = new Error('A consumed card is no longer available');
                            tx.abort();
                        }
                    };
                    if (id !== card.id) store.delete(id);
                }
                store.put(card);
            } catch (error) {
                failure = error instanceof Error ? error : new Error(String(error));
                tx.abort();
            }
        });
    }

    async changeEquipment(cardId: string, kind: 'implants' | 'gears', slot: number, itemId?: string): Promise<{ card: Card; items: (Implant | Gear)[] }> {
        saveCoordinator.assertRepositoryWrite();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Database offline'));
            const tx = this.db.transaction([STORE_NAME, kind], 'readwrite');
            const cards = tx.objectStore(STORE_NAME);
            const inventory = tx.objectStore(kind);
            let result: { card: Card; items: (Implant | Gear)[] };
            let failure: Error | undefined;
            tx.oncomplete = () => { saveCoordinator.changed(); resolve(result); };
            tx.onabort = () => reject(failure || tx.error || new Error('Equipment transaction aborted'));
            tx.onerror = () => reject(tx.error);
            const abort = (message: string) => {
                failure = new Error(message);
                tx.abort();
            };
            const cardReq = cards.get(cardId);
            cardReq.onsuccess = () => {
                const card: Card = cardReq.result;
                if (!card) return abort('Card is no longer available');
                const move = (incoming?: Implant | Gear) => {
                    try {
                        const equipped = { ...(card[kind] || {}) };
                        const previous = equipped[slot];
                        if (itemId && (!incoming || incoming.slot !== slot || incoming.equippedTo)) {
                            return abort('Equipment is no longer available');
                        }
                        if (!itemId && !previous) return abort('Equipment slot is empty');
                        if (incoming) {
                            equipped[slot] = { ...incoming, equippedTo: cardId };
                            inventory.delete(incoming.id);
                        } else {
                            delete equipped[slot];
                        }
                        if (previous) inventory.put({ ...previous, equippedTo: undefined });
                        const updatedCard = { ...card, [kind]: equipped };
                        cards.put(updatedCard);
                        const itemsReq = inventory.getAll();
                        itemsReq.onsuccess = () => { result = { card: updatedCard, items: itemsReq.result }; };
                    } catch (error) {
                        failure = error instanceof Error ? error : new Error(String(error));
                        tx.abort();
                    }
                };
                if (itemId) {
                    const itemReq = inventory.get(itemId);
                    itemReq.onsuccess = () => move(itemReq.result);
                } else {
                    move();
                }
            };
        });
    }

    async getAllCards(): Promise<Card[]> {
        const result = await this.action(STORE_NAME, 'readonly', 'getAll');
        return result.sort((a: any, b: any) => b.timestamp - a.timestamp);
    }

    async saveImplant(implant: Implant): Promise<void> {
        await this.action(IMPLANTS_STORE, 'readwrite', 'put', implant);
    }

    async deleteImplant(id: string): Promise<void> {
        await this.action(IMPLANTS_STORE, 'readwrite', 'delete', id);
    }

    async getAllImplants(): Promise<Implant[]> {
        return await this.action(IMPLANTS_STORE, 'readonly', 'getAll');
    }

    async saveGear(gear: Gear): Promise<void> {
        await this.action(GEARS_STORE, 'readwrite', 'put', gear);
    }

    async deleteGear(id: string): Promise<void> {
        await this.action(GEARS_STORE, 'readwrite', 'delete', id);
    }

    async getAllGears(): Promise<Gear[]> {
        return await this.action(GEARS_STORE, 'readonly', 'getAll');
    }

    async clearAll(): Promise<void> {
        saveCoordinator.assertRepositoryWrite();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Database offline");
            try {
                const tx = this.db.transaction([STORE_NAME, IMPLANTS_STORE, GEARS_STORE], 'readwrite');
                tx.objectStore(STORE_NAME).clear();
                tx.objectStore(IMPLANTS_STORE).clear();
                tx.objectStore(GEARS_STORE).clear();
                tx.oncomplete = () => { saveCoordinator.changed(); resolve(); };
                tx.onerror = (e) => reject(e);
                tx.onabort = () => reject(tx.error || new Error('Database transaction aborted'));
            } catch (e) {
                reject(e);
            }
        });
    }
}

export const dbService = new DatabaseService();
