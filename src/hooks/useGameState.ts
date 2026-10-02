import { prepareSavedCards } from '../application/prepareSavedCards';
import { migrateInventory } from '../domain/inventory';
import { generateQuests, generateExpeditions } from '../domain/dailyActivities';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Boss, AppConfig, Implant, Gear } from '../types';
import { gameRepository } from '../config/gameDependencies';
import { browserStorage, SAVE_KEYS } from '../infrastructure/storage/browserStorage';
import { DEFAULT_APP_CONFIG } from '../config/appConfig';
import { saveCoordinator, SaveConflictError, type SaveSyncState } from '../infrastructure/storage/saveCoordinator';
import { setI18nLanguage } from '../lib/i18n';

export const useGameState = () => {
    const mounted = useRef(false);
    const canEdit = useCallback(() => mounted.current && saveCoordinator.canWrite(), []);
    const [saveSync, setSaveSync] = useState<SaveSyncState>(saveCoordinator.getState);
    useEffect(() => {
        mounted.current = true;
        const unsubscribe = saveCoordinator.subscribe(() => setSaveSync(saveCoordinator.getState()));
        const stop = saveCoordinator.start();
        setSaveSync(saveCoordinator.getState());
        return () => { mounted.current = false; unsubscribe(); stop(); };
    }, []);
    const [databaseStatus, setDatabaseStatus] = useState(gameRepository.getStatus());
    useEffect(() => {
        const interval = setInterval(() => {
            const status = gameRepository.getStatus();
            setDatabaseStatus(prev => prev === status ? prev : status);
        }, 1000);
        return () => clearInterval(interval);
    }, []);
    const [implants, setImplants] = useState<Implant[]>([]);
    const [gears, setGears] = useState<Gear[]>([]);
    const [unlockedSkills, setUnlockedSkills] = useState<string[]>(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.unlockedSkills);
        if (stored) {
            try { return JSON.parse(stored); } catch(e) {}
        }
        return [];
    });
    const [currency, setCurrency] = useState<number>(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.currency);
        const value = stored === null ? NaN : Number(stored);
        return Number.isFinite(value) && value >= 0 ? value : 1500;
    });
    const [cards, setCards] = useState<Card[]>([]);
    const [squad, setSquad] = useState<(Card | null)[]>([null, null, null, null, null, null]);
    const [isHydrated, setIsHydrated] = useState(false);
    const [eliteEnemySquad, setEliteEnemySquad] = useState<(Boss | null)[]>(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.eliteEnemySquad);
        if (stored) {
            try { 
                const p = JSON.parse(stored);
                if (Array.isArray(p)) return p;
            } catch(e) {}
        }
        return [null, null, null, null, null, null];
    });
    const [battlefieldEnemySquad, setBattlefieldEnemySquad] = useState<(Boss | null)[]>(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.battlefieldEnemySquad);
        if (stored) {
            try { 
                const p = JSON.parse(stored);
                if (Array.isArray(p)) return p;
            } catch(e) {}
        }
        return [null, null, null, null, null, null];
    });
    const [fusionSlot1, setFusionSlot1] = useState<Card | null>(null);
    const [fusionSlot2, setFusionSlot2] = useState<Card | null>(null);
    const [config, setConfig] = useState<AppConfig>(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.config);
        if (stored) {
            try { return { ...DEFAULT_APP_CONFIG, ...JSON.parse(stored) }; } catch(e) {}
        }
        return DEFAULT_APP_CONFIG;
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [level, setLevel] = useState<number>(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.level);
        return stored ? (parseInt(stored, 10) || 1) : 1;
    });
    const [experience, setExperience] = useState<number>(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.experience);
        return stored ? (parseInt(stored, 10) || 0) : 0;
    });
    const [campaignProgress, setCampaignProgress] = useState<{chapter: number, stage: number}>(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.campaignProgress);
        try {
            const progress = stored ? JSON.parse(stored) : null;
            if (Number.isInteger(progress?.chapter) && progress.chapter > 0 && Number.isInteger(progress?.stage) && progress.stage > 0) return progress;
        } catch {}
        return { chapter: 1, stage: 1 };
    });
    const [phantasmProgress, setPhantasmProgress] = useState<{floor: number, cardsHp: Record<string, number>}>(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.phantasmProgress);
        try {
            const progress = stored ? JSON.parse(stored) : null;
            if (Number.isInteger(progress?.floor) && progress.floor > 0 && progress.cardsHp && typeof progress.cardsHp === 'object' && !Array.isArray(progress.cardsHp)) return progress;
        } catch {}
        return { floor: 1, cardsHp: {} };
    });
    const [inventory, setInventory] = useState(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.inventory);
        if (stored) {
            try { 
                const parsed = JSON.parse(stored);
                return migrateInventory(parsed);
            } catch(e) {}
        }
        return { baseTickets: 0, eliteTickets: 0, materials: {} as Record<string, number>, quantumDust: 0 };
    });
    const [leaderId, setLeaderId] = useState<string | null>(() => browserStorage.getItem(SAVE_KEYS.leaderId));
    const [pityCounter, setPityCounter] = useState<number>(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.pity);
        return stored ? (parseInt(stored, 10) || 0) : 0;
    });
    const [quests, setQuests] = useState<any[]>(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.quests);
        const today = new Date().toISOString().split('T')[0];
        const lastReset = browserStorage.getItem(SAVE_KEYS.questReset);
        
        if (stored && lastReset === today) {
            try { 
                const parsed = JSON.parse(stored); 
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch(e) {}
        }
        
        return generateQuests();
    });

    const [expeditions, setExpeditions] = useState<any[]>(() => {
        const stored = browserStorage.getItem(SAVE_KEYS.expeditions);
        const today = new Date().toISOString().split('T')[0];
        const lastReset = browserStorage.getItem(SAVE_KEYS.expeditionReset);
        
        if (stored && lastReset === today) {
            try { 
                const parsed = JSON.parse(stored); 
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch(e) {}
        }
        
        return generateExpeditions();
    });

    const refreshQuests = useCallback(() => {
        if (!canEdit()) return;
        setQuests(generateQuests());
        browserStorage.setItem(SAVE_KEYS.questReset, new Date().toISOString().split('T')[0]);
    }, []);

    const refreshExpeditions = useCallback(() => {
        if (!canEdit()) return;
        // Keep ongoing expeditions
        setExpeditions(prev => {
            const ongoing = prev.filter(e => e.status === 'ongoing');
            const newExps = generateExpeditions().slice(0, Math.max(1, 3 - ongoing.length));
            return [...ongoing, ...newExps];
        });
        browserStorage.setItem(SAVE_KEYS.expeditionReset, new Date().toISOString().split('T')[0]);
    }, []);

    // Persistence Effects
    useEffect(() => {
        browserStorage.setItem(SAVE_KEYS.campaignProgress, JSON.stringify(campaignProgress));
    }, [campaignProgress, saveSync.mode]);

    useEffect(() => {
        browserStorage.setItem(SAVE_KEYS.phantasmProgress, JSON.stringify(phantasmProgress));
    }, [phantasmProgress, saveSync.mode]);

    useEffect(() => {
        browserStorage.setItem(SAVE_KEYS.unlockedSkills, JSON.stringify(unlockedSkills));
    }, [unlockedSkills, saveSync.mode]);

    useEffect(() => {
        browserStorage.setItem(SAVE_KEYS.currency, currency.toString());
    }, [currency, saveSync.mode]);

    useEffect(() => {
        browserStorage.setItem(SAVE_KEYS.level, level.toString());
    }, [level, saveSync.mode]);

    useEffect(() => {
        browserStorage.setItem(SAVE_KEYS.experience, experience.toString());
    }, [experience, saveSync.mode]);

    useEffect(() => {
        browserStorage.setItem(SAVE_KEYS.inventory, JSON.stringify(inventory));
    }, [inventory, saveSync.mode]);

    useEffect(() => {
        browserStorage.setItem(SAVE_KEYS.quests, JSON.stringify(quests));
    }, [quests, saveSync.mode]);

    useEffect(() => {
        browserStorage.setItem(SAVE_KEYS.expeditions, JSON.stringify(expeditions));
    }, [expeditions, saveSync.mode]);

    useEffect(() => {
        if (leaderId) browserStorage.setItem(SAVE_KEYS.leaderId, leaderId);
        else browserStorage.removeItem(SAVE_KEYS.leaderId);
    }, [leaderId, saveSync.mode]);

    useEffect(() => {
        if (!isHydrated) return;
        const squadIds = squad.map(c => c?.id || null);
        browserStorage.setItem(SAVE_KEYS.squadIds, JSON.stringify(squadIds));
    }, [squad, isHydrated, saveSync.mode]);

    useEffect(() => {
        browserStorage.setItem(SAVE_KEYS.eliteEnemySquad, JSON.stringify(eliteEnemySquad));
    }, [eliteEnemySquad, saveSync.mode]);

    useEffect(() => {
        browserStorage.setItem(SAVE_KEYS.battlefieldEnemySquad, JSON.stringify(battlefieldEnemySquad));
    }, [battlefieldEnemySquad, saveSync.mode]);

    useEffect(() => {
        browserStorage.setItem(SAVE_KEYS.config, JSON.stringify(config));
    }, [config, saveSync.mode]);

    const updatePity = useCallback((newPity: number) => {
        if (!canEdit()) return;
        setPityCounter(newPity);
        browserStorage.setItem(SAVE_KEYS.pity, newPity.toString());
    }, []);

    const hydratedImageUrls = useRef<string[]>([]);
    useEffect(() => () => { hydratedImageUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
    useEffect(() => {
        if (saveSync.mode === 'starting' || saveSync.mode === 'writer' || saveSync.mode === 'blocked') return;
        let cancelled = false;
        const createdUrls: string[] = [];
        const load = async () => {
            try {
                if (!await gameRepository.initDB()) throw new Error('Không thể mở save database.');
                const revision = saveCoordinator.getState().revision;
                const stored = Object.fromEntries(Object.entries(SAVE_KEYS).map(([name, key]) => [name, browserStorage.getItem(key)]));
                const [savedCards, savedImplants, savedGears] = await Promise.all([
                    gameRepository.getAllCards(), gameRepository.getAllImplants(), gameRepository.getAllGears(),
                ]);
                if (cancelled || revision !== saveCoordinator.getState().revision) return;
                const parse = (name: string, fallback: any) => { try { return stored[name] === null ? fallback : JSON.parse(stored[name]); } catch { return fallback; } };
                const processed = prepareSavedCards(savedCards,
                    saveSync.mode === 'syncing' ? gameRepository : { saveCard: async () => {} },
                    blob => { const url = URL.createObjectURL(blob); createdUrls.push(url); return url; });
                hydratedImageUrls.current.forEach(url => URL.revokeObjectURL(url));
                hydratedImageUrls.current = createdUrls;
                setCards(processed); setImplants(savedImplants); setGears(savedGears);
                const ids = parse('squadIds', []);
                setSquad(Array.from({ length: 6 }, (_, i) => Array.isArray(ids) && ids[i] ? processed.find(card => card.id === ids[i]) || null : null));
                setFusionSlot1(prev => prev ? processed.find(card => card.id === prev.id) || null : null);
                setFusionSlot2(prev => prev ? processed.find(card => card.id === prev.id) || null : null);
                const balance = stored.currency === null ? NaN : Number(stored.currency);
                setCurrency(Number.isFinite(balance) && balance >= 0 ? balance : 1500);
                setLevel(parseInt(stored.level || '', 10) || 1);
                setExperience(parseInt(stored.experience || '', 10) || 0);
                setPityCounter(parseInt(stored.pity || '', 10) || 0);
                setLeaderId(stored.leaderId || null);
                setUnlockedSkills(parse('unlockedSkills', []));
                setInventory(migrateInventory(parse('inventory', { baseTickets: 0, eliteTickets: 0, materials: {}, quantumDust: 0 })));
                const nextConfig = { ...DEFAULT_APP_CONFIG, ...parse('config', {}) };
                setConfig(nextConfig); setI18nLanguage(nextConfig.language);
                const campaign = parse('campaignProgress', null);
                setCampaignProgress(Number.isInteger(campaign?.chapter) && campaign.chapter > 0 && Number.isInteger(campaign?.stage) && campaign.stage > 0 ? campaign : { chapter: 1, stage: 1 });
                const phantasm = parse('phantasmProgress', null);
                setPhantasmProgress(Number.isInteger(phantasm?.floor) && phantasm.floor > 0 && phantasm.cardsHp && typeof phantasm.cardsHp === 'object' && !Array.isArray(phantasm.cardsHp) ? phantasm : { floor: 1, cardsHp: {} });
                for (const [key, setter] of [['eliteEnemySquad', setEliteEnemySquad], ['battlefieldEnemySquad', setBattlefieldEnemySquad]] as const) {
                    const enemy = parse(key, []);
                    setter(Array.isArray(enemy) && enemy.length ? enemy : [null, null, null, null, null, null]);
                }
                const today = new Date().toISOString().split('T')[0];
                const savedQuests = parse('quests', []), savedExpeditions = parse('expeditions', []);
                setQuests(Array.isArray(savedQuests) && ((saveSync.mode === 'readonly' && stored.quests !== null) || (stored.questReset === today && savedQuests.length)) ? savedQuests : generateQuests());
                setExpeditions(Array.isArray(savedExpeditions) && ((saveSync.mode === 'readonly' && stored.expeditions !== null) || (stored.expeditionReset === today && savedExpeditions.length)) ? savedExpeditions : generateExpeditions());
                setIsHydrated(true);
                if (saveSync.mode === 'syncing') {
                    saveCoordinator.activate();
                    browserStorage.setItem(SAVE_KEYS.questReset, today);
                    browserStorage.setItem(SAVE_KEYS.expeditionReset, today);
                }
            } catch (error) {
                if (!cancelled) { console.error('Failed to load saved game', error); saveCoordinator.fail(error); }
            }
        };
        void load();
        return () => { cancelled = true; };
    }, [saveSync.mode, saveSync.revision]);

    const modifyInventory = useCallback((baseDiff: number, eliteDiff: number, materialsDiff?: Record<string, number>, quantumDustDiff: number = 0) => {
        if (!canEdit()) return;
        setInventory(prev => {
            const nextMats = { ...(prev.materials || {}) };
            if (materialsDiff) {
                for (const [mat, amount] of Object.entries(materialsDiff)) {
                    nextMats[mat] = Math.max(0, (nextMats[mat] || 0) + amount);
                }
            }
            return { 
                baseTickets: Math.max(0, prev.baseTickets + baseDiff), 
                eliteTickets: Math.max(0, prev.eliteTickets + eliteDiff),
                materials: nextMats,
                quantumDust: Math.max(0, (prev.quantumDust || 0) + quantumDustDiff)
            };
        });
    }, []);

    const modifyCurrency = useCallback((amount: number) => {
        if (!canEdit()) return;
        setCurrency(prev => {
            const next = prev + amount;
            if (next < 0) return prev;
            return next;
        });
    }, []);

    const hasEnoughCurrency = useCallback((amount: number) => {
        return currency >= amount;
    }, [currency]);

    const addImplant = useCallback(async (implant: Implant) => {
        if (!canEdit()) throw new SaveConflictError();
        await gameRepository.saveImplant(implant);
        setImplants(prev => [...prev, implant]);
    }, []);

    const removeImplant = useCallback(async (id: string) => {
        if (!canEdit()) throw new SaveConflictError();
        await gameRepository.deleteImplant(id);
        setImplants(prev => prev.filter(i => i.id !== id));
    }, []);

    const updateImplant = useCallback(async (implant: Implant) => {
        if (!canEdit()) throw new SaveConflictError();
        await gameRepository.saveImplant(implant);
        setImplants(prev => prev.map(i => i.id === implant.id ? implant : i));
    }, []);

    const addGear = useCallback(async (gear: Gear) => {
        if (!canEdit()) throw new SaveConflictError();
        await gameRepository.saveGear(gear);
        setGears(prev => [...prev, gear]);
    }, []);

    const removeGear = useCallback(async (id: string) => {
        if (!canEdit()) throw new SaveConflictError();
        await gameRepository.deleteGear(id);
        setGears(prev => prev.filter(g => g.id !== id));
    }, []);

    const updateGear = useCallback(async (gear: Gear) => {
        if (!canEdit()) throw new SaveConflictError();
        await gameRepository.saveGear(gear);
        setGears(prev => prev.map(g => g.id === gear.id ? gear : g));
    }, []);

    const addCard = useCallback(async (card: Card) => {
        if (!canEdit()) throw new SaveConflictError();
        await gameRepository.saveCard(card);
        setCards(prev => [card, ...prev]);
    }, []);

    const removeCard = useCallback(async (id: string) => {
        if (!canEdit()) throw new SaveConflictError();
        await gameRepository.deleteCard(id);
        setCards(prev => {
            const cardToRemove = prev.find(c => c.id === id);
            if (cardToRemove?.imageUrl && cardToRemove.imageBlob) {
                 URL.revokeObjectURL(cardToRemove.imageUrl);
            }
            return prev.filter(c => c.id !== id);
        });
        setSquad(prev => prev.map(c => c?.id === id ? null : c));
        setLeaderId(prev => prev === id ? null : prev);
        setFusionSlot1(prev => prev?.id === id ? null : prev);
        setFusionSlot2(prev => prev?.id === id ? null : prev);
    }, []);
    
    const syncCard = useCallback((updatedCard: Card, preserveImageUrl = false) => {
        const currentVersion = (c: Card) => preserveImageUrl && c.imageBlob ? { ...updatedCard, imageUrl: c.imageUrl } : updatedCard;
        setCards(prev => prev.map(c => c.id === updatedCard.id ? currentVersion(c) : c));
        setSquad(prev => prev.map(c => c?.id === updatedCard.id ? currentVersion(c) : c));
        setFusionSlot1(prev => prev?.id === updatedCard.id ? currentVersion(prev) : prev);
        setFusionSlot2(prev => prev?.id === updatedCard.id ? currentVersion(prev) : prev);
    }, []);

    const updateCard = useCallback(async (updatedCard: Card) => {
        if (!canEdit()) throw new SaveConflictError();
        await gameRepository.saveCard(updatedCard);
        syncCard(updatedCard);
    }, [syncCard]);

    const replaceCards = useCallback(async (card: Card, consumedIds: string[]) => {
        if (!canEdit()) throw new SaveConflictError();
        await gameRepository.replaceCards(card, consumedIds);
        const consumed = new Set(consumedIds);
        setCards(prev => [card, ...prev.filter(c => c.id !== card.id && !consumed.has(c.id))]);
        setSquad(prev => prev.map(c => c?.id === card.id ? card : c && consumed.has(c.id) ? null : c));
        setLeaderId(prev => prev && prev !== card.id && consumed.has(prev) ? null : prev);
        setFusionSlot1(prev => prev && consumed.has(prev.id) ? null : prev);
        setFusionSlot2(prev => prev && consumed.has(prev.id) ? null : prev);
    }, []);

    const changeImplant = useCallback(async (cardId: string, slot: number, itemId?: string) => {
        if (!canEdit()) throw new SaveConflictError();
        const result = await gameRepository.changeEquipment(cardId, 'implants', slot, itemId);
        syncCard(result.card, true);
        setImplants(result.items as Implant[]);
    }, [syncCard]);

    const changeGear = useCallback(async (cardId: string, slot: number, itemId?: string) => {
        if (!canEdit()) throw new SaveConflictError();
        const result = await gameRepository.changeEquipment(cardId, 'gears', slot, itemId);
        syncCard(result.card, true);
        setGears(result.items as Gear[]);
    }, [syncCard]);

    const saveConfig = useCallback((newConfig: AppConfig) => {
        if (!canEdit()) return;
        if (newConfig.language) {
             setI18nLanguage(newConfig.language as any);
        }
        setConfig(newConfig);
    }, []);

    const gainExperience = useCallback((amount: number) => {
        if (!canEdit()) return;
        setExperience(prev => {
            const newExp = prev + amount;
            return newExp;
        });
    }, []);

    // Separated level up logic to prevent gainExperience closure issue
    useEffect(() => {
        const newLevel = Math.floor(experience / 1000) + 1;
        if (newLevel > level) {
            setLevel(newLevel);
        }
    }, [experience, level]);

    const resetGame = useCallback(async () => {
        if (!canEdit()) throw new SaveConflictError();
        saveCoordinator.assertRepositoryWrite();
        setIsProcessing(true);
        try {
        await gameRepository.clearAll();
        browserStorage.clear();
        setCurrency(1500);
        setLevel(1);
        setExperience(0);
        setUnlockedSkills([]);
        setPityCounter(0);
        setInventory({ baseTickets: 0, eliteTickets: 0, materials: {}, quantumDust: 0 });
        setCards([]);
        setSquad([null, null, null, null, null, null]);
        setEliteEnemySquad([null, null, null, null, null, null]);
        setBattlefieldEnemySquad([null, null, null, null, null, null]);
        setLeaderId(null);
        setFusionSlot1(null);
        setFusionSlot2(null);
        setConfig(DEFAULT_APP_CONFIG);
        setI18nLanguage(DEFAULT_APP_CONFIG.language);
        setImplants([]);
        setGears([]);
        setCampaignProgress({ chapter: 1, stage: 1 });
        setPhantasmProgress({ floor: 1, cardsHp: {} });
        setQuests([]);
        setExpeditions([]);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const updateQuestProgress = useCallback((type: string, amount: number = 1) => {
        if (!canEdit()) return;
        setQuests(prev => {
            return prev.map(q => {
                if (q.type === type && !q.isCompleted && !q.isClaimed) {
                    const newCount = Math.min(q.targetCount, q.currentCount + amount);
                    return { ...q, currentCount: newCount, isCompleted: newCount >= q.targetCount };
                }
                return q;
            });
        });
    }, []);

    const completeExpedition = useCallback((expId: string) => {
        if (!canEdit()) return;
        setExpeditions(prev => {
            return prev.map(e => {
                if (e.id === expId) {
                    return { ...e, status: 'completed' as const };
                }
                return e;
            });
        });
    }, []);

    const claimExpedition = useCallback((expId: string) => {
        if (!canEdit()) return;
        setExpeditions(prev => {
            return prev.map(e => {
                if (e.id === expId) {
                    return { ...e, status: 'idle' as const, startTime: undefined, assignedCardId: undefined };
                }
                return e;
            });
        });
    }, []);

    const startExpedition = useCallback((expId: string, cardId: string) => {
        if (!canEdit()) return;
        setExpeditions(prev => {
            return prev.map(e => {
                if (e.id === expId) {
                    return { ...e, status: 'ongoing' as const, startTime: Date.now(), assignedCardId: cardId };
                }
                return e;
            });
        });
    }, []);

    const guardedUnlockedSkills = useCallback((value: Parameters<typeof setUnlockedSkills>[0]) => { if (canEdit()) setUnlockedSkills(value); }, []);
    const guardedLevel = useCallback((value: Parameters<typeof setLevel>[0]) => { if (canEdit()) setLevel(value); }, []);
    const guardedExperience = useCallback((value: Parameters<typeof setExperience>[0]) => { if (canEdit()) setExperience(value); }, []);
    const guardedQuests = useCallback((value: Parameters<typeof setQuests>[0]) => { if (canEdit()) setQuests(value); }, []);
    const guardedExpeditions = useCallback((value: Parameters<typeof setExpeditions>[0]) => { if (canEdit()) setExpeditions(value); }, []);
    const guardedCampaignProgress = useCallback((value: Parameters<typeof setCampaignProgress>[0]) => { if (canEdit()) setCampaignProgress(value); }, []);
    const guardedPhantasmProgress = useCallback((value: Parameters<typeof setPhantasmProgress>[0]) => { if (canEdit()) setPhantasmProgress(value); }, []);
    const guardedSquad = useCallback((value: Parameters<typeof setSquad>[0]) => { if (canEdit()) setSquad(value); }, []);
    const guardedLeaderId = useCallback((value: Parameters<typeof setLeaderId>[0]) => { if (canEdit()) setLeaderId(value); }, []);
    const guardedEliteEnemySquad = useCallback((value: Parameters<typeof setEliteEnemySquad>[0]) => { if (canEdit()) setEliteEnemySquad(value); }, []);
    const guardedBattlefieldEnemySquad = useCallback((value: Parameters<typeof setBattlefieldEnemySquad>[0]) => { if (canEdit()) setBattlefieldEnemySquad(value); }, []);
    const guardedFusionSlot1 = useCallback((value: Parameters<typeof setFusionSlot1>[0]) => { if (canEdit()) setFusionSlot1(value); }, []);
    const guardedFusionSlot2 = useCallback((value: Parameters<typeof setFusionSlot2>[0]) => { if (canEdit()) setFusionSlot2(value); }, []);

    return {
        databaseStatus, saveSync, isHydrated,
        unlockedSkills, setUnlockedSkills: guardedUnlockedSkills,
        currency, modifyCurrency, hasEnoughCurrency,
        level, setLevel: guardedLevel, experience, setExperience: guardedExperience, gainExperience,
        pityCounter, updatePity,
        inventory, modifyInventory,
        quests, setQuests: guardedQuests, updateQuestProgress, refreshQuests,
        expeditions, setExpeditions: guardedExpeditions, startExpedition, completeExpedition, claimExpedition, refreshExpeditions,
        implants, addImplant, removeImplant, updateImplant, changeImplant,
        gears, addGear, removeGear, updateGear, changeGear,
        cards, addCard, removeCard, updateCard, replaceCards,
        campaignProgress, setCampaignProgress: guardedCampaignProgress,
        phantasmProgress, setPhantasmProgress: guardedPhantasmProgress,
        squad, setSquad: guardedSquad, leaderId, setLeaderId: guardedLeaderId,
        eliteEnemySquad, setEliteEnemySquad: guardedEliteEnemySquad,
        battlefieldEnemySquad, setBattlefieldEnemySquad: guardedBattlefieldEnemySquad,
        fusionSlot1, setFusionSlot1: guardedFusionSlot1,
        fusionSlot2, setFusionSlot2: guardedFusionSlot2,
        config, saveConfig,
        isProcessing, setIsProcessing,
        resetGame
    };
};
