import { Card } from '../types';

const DB_NAME = 'CineTechVault';
const STORE_NAME = 'cards';

export class DatabaseService {
    private db: IDBDatabase | null = null;
    private dbStatus: 'online' | 'offline' | 'error' = 'offline';

    async initDB(): Promise<boolean> {
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                this.dbStatus = 'error';
                return resolve(false);
            }
            const req = indexedDB.open(DB_NAME, 2);

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
            };
        });
    }

    getStatus() {
        return this.dbStatus;
    }

    private action(mode: IDBTransactionMode, action: 'put' | 'delete' | 'getAll', data?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Database offline");
            try {
                const req = this.db.transaction([STORE_NAME], mode).objectStore(STORE_NAME)[action](data);
                req.onsuccess = (e: any) => resolve(action === 'getAll' ? e.target.result.sort((a: any, b: any) => b.timestamp - a.timestamp) : true);
                req.onerror = (e) => reject(e);
            } catch (e) {
                reject(e);
            }
        });
    }

    async saveCard(card: Card): Promise<void> {
        await this.action('readwrite', 'put', card);
    }

    async deleteCard(id: string): Promise<void> {
        await this.action('readwrite', 'delete', id);
    }

    async getAllCards(): Promise<Card[]> {
        return await this.action('readonly', 'getAll');
    }

    async clearAll(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Database offline");
            try {
                const req = this.db.transaction([STORE_NAME], 'readwrite').objectStore(STORE_NAME).clear();
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e);
            } catch (e) {
                reject(e);
            }
        });
    }
}

export const dbService = new DatabaseService();
