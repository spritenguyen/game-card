import { Card, Implant, Gear } from '../types';

const DB_NAME = 'CineTechVault';
const STORE_NAME = 'cards';
const IMPLANTS_STORE = 'implants';
const GEARS_STORE = 'gears';

export class DatabaseService {
    private db: IDBDatabase | null = null;
    private dbStatus: 'online' | 'offline' | 'error' = 'offline';

    async initDB(): Promise<boolean> {
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
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Database offline");
            try {
                const req = this.db.transaction([storeName], mode).objectStore(storeName)[action](data);
                req.onsuccess = (e: any) => resolve(action === 'getAll' ? e.target.result : true);
                req.onerror = (e) => reject(e);
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
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Database offline");
            try {
                const tx = this.db.transaction([STORE_NAME, IMPLANTS_STORE, GEARS_STORE], 'readwrite');
                tx.objectStore(STORE_NAME).clear();
                tx.objectStore(IMPLANTS_STORE).clear();
                tx.objectStore(GEARS_STORE).clear();
                tx.oncomplete = () => resolve();
                tx.onerror = (e) => reject(e);
            } catch (e) {
                reject(e);
            }
        });
    }
}

export const dbService = new DatabaseService();
