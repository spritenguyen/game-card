import { useState, useCallback, useEffect } from 'react';
import { Card, Boss, AppConfig, GameState } from '../types';
import { dbService } from '../lib/db';
import { DEFAULT_APP_CONFIG } from '../lib/constants';
import { rollFaction, rollElement } from '../services/ai';

export const useGameState = () => {
    const [unlockedSkills, setUnlockedSkills] = useState<string[]>(() => {
        const stored = localStorage.getItem('cineUnlockedSkills');
        if (stored) {
            try { return JSON.parse(stored); } catch(e) {}
        }
        return [];
    });
    const [currency, setCurrency] = useState<number>(() => {
        const stored = localStorage.getItem('cineCurrency');
        return stored ? (parseInt(stored, 10) || 1500) : 1500;
    });
    const [cards, setCards] = useState<Card[]>([]);
    const [squad, setSquad] = useState<(Card | null)[]>([null, null, null, null, null, null]);
    const [eliteEnemySquad, setEliteEnemySquad] = useState<(Boss | null)[]>(() => {
        const stored = localStorage.getItem('cineEliteEnemySquad');
        if (stored) {
            try { 
                const p = JSON.parse(stored);
                if (Array.isArray(p)) return p;
            } catch(e) {}
        }
        return [null, null, null, null, null, null];
    });
    const [battlefieldEnemySquad, setBattlefieldEnemySquad] = useState<(Boss | null)[]>(() => {
        const stored = localStorage.getItem('cineBattlefieldEnemySquad');
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
        const stored = localStorage.getItem('cineApiConfig');
        if (stored) {
            try { return { ...DEFAULT_APP_CONFIG, ...JSON.parse(stored) }; } catch(e) {}
        }
        return DEFAULT_APP_CONFIG;
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [level, setLevel] = useState<number>(() => {
        const stored = localStorage.getItem('cineLevel');
        return stored ? (parseInt(stored, 10) || 1) : 1;
    });
    const [experience, setExperience] = useState<number>(() => {
        const stored = localStorage.getItem('cineExp');
        return stored ? (parseInt(stored, 10) || 0) : 0;
    });
    const [inventory, setInventory] = useState(() => {
        const stored = localStorage.getItem('cineInventory');
        if (stored) {
            try { 
                const parsed = JSON.parse(stored);
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
            } catch(e) {}
        }
        return { baseTickets: 0, eliteTickets: 0, materials: {} as Record<string, number>, quantumDust: 0 };
    });
    const [leaderId, setLeaderId] = useState<string | null>(() => localStorage.getItem('cineLeaderId'));
    const [pityCounter, setPityCounter] = useState<number>(() => {
        const stored = localStorage.getItem('cinePity');
        return stored ? (parseInt(stored, 10) || 0) : 0;
    });
    const generateQuests = () => {
        const pool = [
            { type: 'extract', title: 'Triệu hồi Thẻ', description: 'Thực hiện 1 lần Extract', targetCount: 1, rewardDC: 50, rewardTickets: [] },
            { type: 'extract', title: 'Chuyên gia Triệu hồi', description: 'Thực hiện 3 lần Extract', targetCount: 3, rewardDC: 150, rewardTickets: [{type: 'base', amount: 1}] },
            { type: 'boss', title: 'Săn Tiền Thưởng', description: 'Đánh bại 3 Boss bất kỳ', targetCount: 3, rewardDC: 100, rewardTickets: [{type: 'elite', amount: 1}] },
            { type: 'fusion', title: 'Nghiên cứu Lai tạo', description: 'Tiến hành Fusion 1 lần', targetCount: 1, rewardDC: 100, rewardTickets: [] },
            { type: 'combat', title: 'Chiến Binh', description: 'Tham gia 5 trận chiến', targetCount: 5, rewardDC: 150, rewardTickets: [] },
            { type: 'upgrade', title: 'Cường hóa Thẻ', description: 'Nâng cấp 1 thẻ', targetCount: 1, rewardDC: 50, rewardTickets: [] },
            { type: 'sell', title: 'Phân tách', description: 'Bán 2 thẻ không dùng', targetCount: 2, rewardDC: 80, rewardTickets: [] }
        ];
        // Shuffle and pick 4
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 4).map((q, i) => ({
            id: `q_daily_${Date.now()}_${i}`,
            ...q,
            currentCount: 0,
            isCompleted: false,
            isClaimed: false
        }));
    };

    const generateExpeditions = () => {
        const pool = [
            { name: 'Thăm dò tàn tích Lửa', description: 'Khám phá tàn tích hệ Fire', durationMinutes: 30, requiredElement: 'Fire', rewardDC: 200, rewardMaterials: [{item: 'Tech Core', amount: 3}] },
            { name: 'Nghiên cứu công nghệ Mutant', description: 'Tìm hiểu tại khu vực Mutant', durationMinutes: 60, requiredFaction: 'Mutant', rewardDC: 400, rewardMaterials: [{item: 'Mutant Core', amount: 1}] },
            { name: 'Khám phá Không Gian', description: 'Lập bản đồ vùng Ethereal', durationMinutes: 120, requiredFaction: 'Ethereal', rewardDC: 800, rewardMaterials: [{item: 'Magic Core', amount: 2}] },
            { name: 'Rà soát bóng tối', description: 'Tiêu diệt dị biến VoidBringer', durationMinutes: 45, requiredFaction: 'VoidBringer', rewardDC: 300, rewardMaterials: [{item: 'Dark Core', amount: 1}] },
            { name: 'Thu thập Thủy Tinh', description: 'Lặn sâu vào tàn tích Water', durationMinutes: 30, requiredElement: 'Water', rewardDC: 200, rewardMaterials: [{item: 'Light Core', amount: 2}] }
        ];
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3).map((e, i) => ({
            id: `e_daily_${Date.now()}_${i}`,
            ...e,
            status: 'idle'
        }));
    };

    const [quests, setQuests] = useState<any[]>(() => {
        const stored = localStorage.getItem('cineQuests');
        const today = new Date().toISOString().split('T')[0];
        const lastReset = localStorage.getItem('cineLastResetQuest');
        
        if (stored && lastReset === today) {
            try { 
                const parsed = JSON.parse(stored); 
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch(e) {}
        }
        
        localStorage.setItem('cineLastResetQuest', today);
        return generateQuests();
    });

    const [expeditions, setExpeditions] = useState<any[]>(() => {
        const stored = localStorage.getItem('cineExpeditions');
        const today = new Date().toISOString().split('T')[0];
        const lastReset = localStorage.getItem('cineLastResetExp');
        
        if (stored && lastReset === today) {
            try { 
                const parsed = JSON.parse(stored); 
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch(e) {}
        }
        
        localStorage.setItem('cineLastResetExp', today);
        return generateExpeditions();
    });

    const refreshQuests = useCallback(() => {
        setQuests(generateQuests());
        localStorage.setItem('cineLastResetQuest', new Date().toISOString().split('T')[0]);
    }, []);

    const refreshExpeditions = useCallback(() => {
        // Keep ongoing expeditions
        setExpeditions(prev => {
            const ongoing = prev.filter(e => e.status === 'ongoing');
            const newExps = generateExpeditions().slice(0, Math.max(1, 3 - ongoing.length));
            return [...ongoing, ...newExps];
        });
        localStorage.setItem('cineLastResetExp', new Date().toISOString().split('T')[0]);
    }, []);

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem('cineUnlockedSkills', JSON.stringify(unlockedSkills));
    }, [unlockedSkills]);

    useEffect(() => {
        localStorage.setItem('cineCurrency', currency.toString());
    }, [currency]);

    useEffect(() => {
        localStorage.setItem('cineLevel', level.toString());
    }, [level]);

    useEffect(() => {
        localStorage.setItem('cineExp', experience.toString());
    }, [experience]);

    useEffect(() => {
        localStorage.setItem('cineInventory', JSON.stringify(inventory));
    }, [inventory]);

    useEffect(() => {
        localStorage.setItem('cineQuests', JSON.stringify(quests));
    }, [quests]);

    useEffect(() => {
        localStorage.setItem('cineExpeditions', JSON.stringify(expeditions));
    }, [expeditions]);

    useEffect(() => {
        if (leaderId) localStorage.setItem('cineLeaderId', leaderId);
        else localStorage.removeItem('cineLeaderId');
    }, [leaderId]);

    useEffect(() => {
        const squadIds = squad.map(c => c?.id || null);
        localStorage.setItem('cineSquadIds', JSON.stringify(squadIds));
    }, [squad]);

    useEffect(() => {
        localStorage.setItem('cineEliteEnemySquad', JSON.stringify(eliteEnemySquad));
    }, [eliteEnemySquad]);

    useEffect(() => {
        localStorage.setItem('cineBattlefieldEnemySquad', JSON.stringify(battlefieldEnemySquad));
    }, [battlefieldEnemySquad]);

    useEffect(() => {
        localStorage.setItem('cineApiConfig', JSON.stringify(config));
    }, [config]);

    const updatePity = useCallback((newPity: number) => {
        setPityCounter(newPity);
        localStorage.setItem('cinePity', newPity.toString());
    }, []);

    useEffect(() => {
        const loadCards = async () => {
            const isDbReady = await dbService.initDB();
            if (isDbReady) {
                const savedCards = await dbService.getAllCards();
                const processedCards = savedCards.map(c => {
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
                        dbService.saveCard(c).catch(() => {});
                    }
                    
                    if (c.imageBlob) {
                        c.imageUrl = URL.createObjectURL(c.imageBlob);
                    }
                    return c;
                });
                setCards(processedCards);

                // Restore Squad from IDs
                const storedSquadIds = localStorage.getItem('cineSquadIds');
                if (storedSquadIds) {
                    try {
                        const ids = JSON.parse(storedSquadIds) as (string | null)[];
                        const restoredSquad = ids.map(id => id ? (processedCards.find(c => c.id === id) || null) : null);
                        setSquad(restoredSquad);
                    } catch (e) {}
                }
            }
        };
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
            return { 
                baseTickets: Math.max(0, prev.baseTickets + baseDiff), 
                eliteTickets: Math.max(0, prev.eliteTickets + eliteDiff),
                materials: nextMats,
                quantumDust: Math.max(0, (prev.quantumDust || 0) + quantumDustDiff)
            };
        });
    }, []);

    const modifyCurrency = useCallback((amount: number) => {
        setCurrency(prev => {
            const next = prev + amount;
            if (next < 0) return prev;
            return next;
        });
    }, []);

    const hasEnoughCurrency = useCallback((amount: number) => {
        return currency >= amount;
    }, [currency]);

    const addCard = useCallback(async (card: Card) => {
        await dbService.saveCard(card);
        setCards(prev => [card, ...prev]);
    }, []);

    const removeCard = useCallback(async (id: string) => {
        await dbService.deleteCard(id);
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
    
    const updateCard = useCallback(async (updatedCard: Card) => {
        await dbService.saveCard(updatedCard);
        setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    }, []);

    const saveConfig = useCallback((newConfig: AppConfig) => {
        setConfig(newConfig);
    }, []);

    const gainExperience = useCallback((amount: number) => {
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
        setIsProcessing(true);
        await dbService.clearAll();
        localStorage.clear();
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
        setQuests([]);
        setExpeditions([]);
        setIsProcessing(false);
    }, []);

    const updateQuestProgress = useCallback((type: string, amount: number = 1) => {
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
        setExpeditions(prev => {
            return prev.map(e => {
                if (e.id === expId) {
                    return { ...e, status: 'ongoing' as const, startTime: Date.now(), assignedCardId: cardId };
                }
                return e;
            });
        });
    }, []);

    return {
        unlockedSkills, setUnlockedSkills,
        currency, modifyCurrency, hasEnoughCurrency,
        level, setLevel, experience, setExperience, gainExperience,
        pityCounter, updatePity,
        inventory, modifyInventory,
        quests, setQuests, updateQuestProgress, refreshQuests,
        expeditions, setExpeditions, startExpedition, completeExpedition, claimExpedition, refreshExpeditions,
        cards, addCard, removeCard, updateCard,
        squad, setSquad, leaderId, setLeaderId,
        eliteEnemySquad, setEliteEnemySquad,
        battlefieldEnemySquad, setBattlefieldEnemySquad,
        fusionSlot1, setFusionSlot1,
        fusionSlot2, setFusionSlot2,
        config, saveConfig,
        isProcessing, setIsProcessing,
        resetGame
    };
};
