import { useState, useCallback, useEffect } from 'react';
import { Card, Boss, AppConfig, GameState } from '../types';
import { dbService } from '../lib/db';
import { DEFAULT_APP_CONFIG } from '../lib/constants';

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
    const [inventory, setInventory] = useState({ baseTickets: 0, eliteTickets: 0 });
    const [leaderId, setLeaderId] = useState<string | null>(null);
    const [pityCounter, setPityCounter] = useState<number>(0);

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
            try { setInventory(JSON.parse(storedInventory)); } catch(e){}
        }
        const storedLeaderId = localStorage.getItem('cineLeaderId');
        if (storedLeaderId) setLeaderId(storedLeaderId);

        const loadCards = async () => {
            const isDbReady = await dbService.initDB();
            if (isDbReady) {
                const savedCards = await dbService.getAllCards();
                setCards(savedCards.map(c => {
                    if (c.imageBlob) {
                        c.imageUrl = URL.createObjectURL(c.imageBlob);
                    }
                    return c;
                }));
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

    const modifyInventory = useCallback((baseDiff: number, eliteDiff: number) => {
        setInventory(prev => {
            const next = { baseTickets: Math.max(0, prev.baseTickets + baseDiff), eliteTickets: Math.max(0, prev.eliteTickets + eliteDiff) };
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
        setCurrency(1500);
        setLevel(1);
        setExperience(0);
        setPityCounter(0);
        setInventory({ baseTickets: 0, eliteTickets: 0 });
        setCards([]);
        setSquad([null, null, null]);
        setLeaderId(null);
        setBoss(null);
        setFusionSlot1(null);
        setFusionSlot2(null);
        setConfig(DEFAULT_APP_CONFIG);
        setIsProcessing(false);
    };

    return {
        currency, modifyCurrency, hasEnoughCurrency,
        level, setLevel, experience, setExperience, gainExperience,
        pityCounter, updatePity,
        inventory, modifyInventory,
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
