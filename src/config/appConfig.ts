import { AI_CONFIG } from '../services/ai/config/aiConfig';

export const DEFAULT_APP_CONFIG = {
    artStyle: 'cinematic',
    language: 'vi' as 'vi' | 'en',
    useCustomGemini: true,
    geminiKey: '',
    geminiModel: AI_CONFIG.text.geminiModel,
    pollinationsKey: '',
    defaultImageModel: AI_CONFIG.image.model,
};

