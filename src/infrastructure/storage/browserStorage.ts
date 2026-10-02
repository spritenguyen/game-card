import { saveCoordinator, SAVE_VERSION_KEY } from './saveCoordinator';
/** Central names preserve compatibility with existing browser saves. */
export const SAVE_KEYS = {
    unlockedSkills: 'cineUnlockedSkills', currency: 'cineCurrency',
    eliteEnemySquad: 'cineEliteEnemySquad', battlefieldEnemySquad: 'cineBattlefieldEnemySquad',
    config: 'cineApiConfig', level: 'cineLevel', experience: 'cineExp',
    campaignProgress: 'cineCampaignProgress', phantasmProgress: 'cinePhantasmProgress',
    inventory: 'cineInventory', leaderId: 'cineLeaderId', pity: 'cinePity',
    quests: 'cineQuests', questReset: 'cineLastResetQuest',
    expeditions: 'cineExpeditions', expeditionReset: 'cineLastResetExp', squadIds: 'cineSquadIds',
} as const;

/** Resolve browser storage at call time, retaining existing exception semantics. */
export const browserStorage = {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => {
        if (!saveCoordinator.canWrite() || localStorage.getItem(key) === value) return;
        localStorage.setItem(key, value);
        saveCoordinator.changed();
    },
    removeItem: (key: string) => {
        if (!saveCoordinator.canWrite() || localStorage.getItem(key) === null) return;
        localStorage.removeItem(key);
        saveCoordinator.changed();
    },
    clear: () => {
        if (!saveCoordinator.canWrite()) return;
        // Keep the monotonic revision across reset; remove all other legacy keys.
        for (const key of Object.keys(localStorage)) if (key !== SAVE_VERSION_KEY) localStorage.removeItem(key);
        saveCoordinator.changed();
    },
};

export const readUnlockedSkills = (): string[] => {
    try {
        const stored = browserStorage.getItem(SAVE_KEYS.unlockedSkills);
        // The previous combat helpers accepted any iterable; preserve that behavior.
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};
