import { useState, useCallback, useEffect } from 'react';
import { Card, Boss, AppConfig, GameState } from '../types';
import { dbService } from '../lib/db';
import { DEFAULT_APP_CONFIG } from '../lib/constants';
import { rollFaction, rollElement } from '../services/ai';

export const useGameState = () => {
    const [currency, setCurrency] = useState<number>(1500);
    const [cards, setCards] = useState<Card[]>([]);
    const [squad, setSquad] = useState<(Card | null)[]>([null, null, null]);
    const [boss, setBoss] = useState<Boss | null>(null);
    const [fusionSlot1, setFusionSlot1] = useState<Card | null>(null);
    const [fusionSlot2, setFusionSlot2] = useState<Card | null>(null);
    const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
    const [isProcessing, setIsProcessing] = useState(false);
    const [level, setLevel] = useState<number>(1);
    const [experience, setExperience] = useState<number>(0);
    const [inventory, setInventory] = useState({ baseTickets: 0, eliteTickets: 0, materials: {} as Record<string, number>, quantumDust: 0 });
    const [leaderId, setLeaderId] = useState<string | null>(null);
    const [pityCounter, setPityCounter] = useState<number>(0);
    const [quests, setQuests] = useState<any[]>([]);
    const [expeditions, setExpeditions] = useState<any[]>([]);

    const updatePity = useCallback((newPity: number) => {
        setPityCounter(newPity);
        localStorage.setItem('cinePity', newPity.toString());
    }, []);

    useEffect(() => {
        const storedCurrency = localStorage.getItem('cineCurrency');
        if (storedCurrency) {
            setCurrency(parseInt(storedCurrency, 10) || 1500);
        }
        const storedLevel = localStorage.getItem('cineLevel');
        if (storedLevel) setLevel(parseInt(storedLevel, 10) || 1);
        const storedExp = localStorage.getItem('cineExp');
        if (storedExp) setExperience(parseInt(storedExp, 10) || 0);
        const storedPity = localStorage.getItem('cinePity');
        if (storedPity) setPityCounter(parseInt(storedPity, 10) || 0);

        const storedInventory = localStorage.getItem('cineInventory');
        if (storedInventory) {
            try { 
                const parsed = JSON.parse(storedInventory);
                setInventory({
                    baseTickets: parsed.baseTickets || 0,
                    eliteTickets: parsed.eliteTickets || 0,
                    materials: parsed.materials || {},
                    quantumDust: parsed.quantumDust || 0
                }); 
            } catch(e){}
        }
        
        const storedQuests = localStorage.getItem('cineQuests');
        if (storedQuests) {
            try { setQuests(JSON.parse(storedQuests)); } catch(e){}
        } else {
             setQuests([
                 { id: 'q1', type: 'extract', title: 'Triệu hồi 1 lần', description: 'Thực hiện 1 lần Extract', targetCount: 1, currentCount: 0, rewardDC: 50, rewardTickets: [], isCompleted: false, isClaimed: false },
                 { id: 'q2', type: 'boss', title: 'Tiêu diệt 1 Boss', description: 'Đánh bại 1 Boss bất kỳ', targetCount: 1, currentCount: 0, rewardDC: 100, rewardTickets: [{type: 'base', amount: 1}], isCompleted: false, isClaimed: false },
                 { id: 'q3', type: 'fusion', title: 'Lai tạo thẻ', description: 'Tiến hành Fusion 1 lần', targetCount: 1, currentCount: 0, rewardDC: 150, rewardTickets: [], isCompleted: false, isClaimed: false }
             ]);
        }
        
        const storedExpeditions = localStorage.getItem('cineExpeditions');
        if (storedExpeditions) {
             try { setExpeditions(JSON.parse(storedExpeditions)); } catch(e){}
        } else {
             setExpeditions([
                 { id: 'e1', name: 'Thăm dò tàn tích Lửa', description: 'Khám phá tàn tích nguyên tố hệ Fire', durationMinutes: 30, requiredElement: 'Fire', rewardDC: 200, rewardMaterials: [{item: 'Fire Shard', amount: 3}], status: 'idle' },
                 { id: 'e2', name: 'Nghiên cứu công nghệ Mutant', description: 'Tìm hiểu tại khu vực Mutant', durationMinutes: 60, requiredFaction: 'Mutant', rewardDC: 400, rewardMaterials: [{item: 'Mutant Core', amount: 1}], status: 'idle' }
             ]);
        }

        const storedLeaderId = localStorage.getItem('cineLeaderId');
        if (storedLeaderId) setLeaderId(storedLeaderId);

        const loadCards = async () => {
            const isDbReady = await dbService.initDB();
            if (isDbReady) {
                const savedCards = await dbService.getAllCards();
                const processedCards = savedCards.map(c => {
                    let modified = false;
                    const validFactions = ['Tech', 'Magic', 'Mutant', 'Light', 'Dark'];
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
                        dbService.saveCard(c).catch(() => {});
                    }
                    
                    if (c.imageBlob) {
                        c.imageUrl = URL.createObjectURL(c.imageBlob);
                    }
                    return c;
                });
                setCards(processedCards);
            }
        };
        const savedConfig = localStorage.getItem('cineApiConfig');
        if (savedConfig) {
            try {
                setConfig({ ...DEFAULT_APP_CONFIG, ...JSON.parse(savedConfig) });
            } catch (e) {}
        }
        loadCards();
    }, []);

    const modifyInventory = useCallback((baseDiff: number, eliteDiff: number, materialsDiff?: Record<string, number>, quantumDustDiff: number = 0) => {
        setInventory(prev => {
            const nextMats = { ...(prev.materials || {}) };
            if (materialsDiff) {
                for (const [mat, amount] of Object.entries(materialsDiff)) {
                    nextMats[mat] = Math.max(0, (nextMats[mat] || 0) + amount);
                }
            }
            const next = { 
                baseTickets: Math.max(0, prev.baseTickets + baseDiff), 
                eliteTickets: Math.max(0, prev.eliteTickets + eliteDiff),
                materials: nextMats,
                quantumDust: Math.max(0, (prev.quantumDust || 0) + quantumDustDiff)
            };
            localStorage.setItem('cineInventory', JSON.stringify(next));
            return next;
        });
    }, []);

    const modifyCurrency = useCallback((amount: number) => {
        setCurrency(prev => {
            const next = prev + amount;
            if (next < 0) return prev; // Not enough currency
            localStorage.setItem('cineCurrency', next.toString());
            return next;
        });
        return true; // Simple true/false mechanism can be improved, but this is React state.
    }, []);

    const hasEnoughCurrency = (amount: number) => {
        return currency >= amount;
    };

    const addCard = async (card: Card) => {
        await dbService.saveCard(card);
        setCards(prev => [card, ...prev]);
    };

    const removeCard = async (id: string) => {
        await dbService.deleteCard(id);
        const cardToRemove = cards.find(c => c.id === id);
        if (cardToRemove?.imageUrl && cardToRemove.imageBlob) {
             URL.revokeObjectURL(cardToRemove.imageUrl);
        }
        setCards(prev => prev.filter(c => c.id !== id));
        setSquad(prev => prev.map(c => c?.id === id ? null : c));
        if (leaderId === id) setLeaderId(null);
        if (fusionSlot1?.id === id) setFusionSlot1(null);
        if (fusionSlot2?.id === id) setFusionSlot2(null);
    };
    
    const updateCard = async (updatedCard: Card) => {
        await dbService.saveCard(updatedCard);
        setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    };

    const saveConfig = (newConfig: AppConfig) => {
        setConfig(newConfig);
        localStorage.setItem('cineApiConfig', JSON.stringify(newConfig));
    };

    const gainExperience = useCallback((amount: number) => {
        setExperience(prev => {
            const newExp = prev + amount;
            const newLevel = Math.floor(newExp / 1000) + 1;
            if (newLevel > level) {
                setLevel(newLevel);
                localStorage.setItem('cineLevel', newLevel.toString());
            }
            localStorage.setItem('cineExp', newExp.toString());
            return newExp;
        });
    }, [level]);

    const resetGame = async () => {
        setIsProcessing(true);
        await dbService.clearAll();
        localStorage.removeItem('cineCurrency');
        localStorage.removeItem('cineLevel');
        localStorage.removeItem('cineExp');
        localStorage.removeItem('cinePity');
        localStorage.removeItem('cineInventory');
        localStorage.removeItem('cineLeaderId');
        localStorage.removeItem('cineApiConfig');
        localStorage.removeItem('cineQuests');
        localStorage.removeItem('cineExpeditions');
        setCurrency(1500);
        setLevel(1);
        setExperience(0);
        setPityCounter(0);
        setInventory({ baseTickets: 0, eliteTickets: 0, materials: {}, quantumDust: 0 });
        setCards([]);
        setSquad([null, null, null]);
        setLeaderId(null);
        setBoss(null);
        setFusionSlot1(null);
        setFusionSlot2(null);
        setConfig(DEFAULT_APP_CONFIG);
        setQuests([]);
        setExpeditions([]);
        setIsProcessing(false);
    };

    const updateQuestProgress = useCallback((type: string, amount: number = 1) => {
        setQuests(prev => {
            const next = prev.map(q => {
                if (q.type === type && !q.isCompleted && !q.isClaimed) {
                    const newCount = Math.min(q.targetCount, q.currentCount + amount);
                    return { ...q, currentCount: newCount, isCompleted: newCount >= q.targetCount };
                }
                return q;
            });
            localStorage.setItem('cineQuests', JSON.stringify(next));
            return next;
        });
    }, []);

    const completeExpedition = useCallback((expId: string) => {
        setExpeditions(prev => {
            const next = prev.map(e => {
                if (e.id === expId) {
                    return { ...e, status: 'completed' as const };
                }
                return e;
            });
            localStorage.setItem('cineExpeditions', JSON.stringify(next));
            return next;
        });
    }, []);

    const claimExpedition = useCallback((expId: string) => {
        setExpeditions(prev => {
            const next = prev.map(e => {
                if (e.id === expId) {
                    return { ...e, status: 'idle' as const, startTime: undefined, assignedCardId: undefined };
                }
                return e;
            });
            localStorage.setItem('cineExpeditions', JSON.stringify(next));
            return next;
        });
    }, []);

    const startExpedition = useCallback((expId: string, cardId: string) => {
        setExpeditions(prev => {
            const next = prev.map(e => {
                if (e.id === expId) {
                    return { ...e, status: 'ongoing' as const, startTime: Date.now(), assignedCardId: cardId };
                }
                return e;
            });
            localStorage.setItem('cineExpeditions', JSON.stringify(next));
            return next;
        });
    }, []);

    return {
        currency, modifyCurrency, hasEnoughCurrency,
        level, setLevel, experience, setExperience, gainExperience,
        pityCounter, updatePity,
        inventory, modifyInventory,
        quests, setQuests, updateQuestProgress,
        expeditions, setExpeditions, startExpedition, completeExpedition, claimExpedition,
        cards, addCard, removeCard, updateCard,
        squad, setSquad, leaderId, setLeaderId: (id: string | null) => { setLeaderId(id); if (id) localStorage.setItem('cineLeaderId', id); else localStorage.removeItem('cineLeaderId'); },
        boss, setBoss,
        fusionSlot1, setFusionSlot1,
        fusionSlot2, setFusionSlot2,
        config, saveConfig,
        isProcessing, setIsProcessing,
        resetGame
    };
};
