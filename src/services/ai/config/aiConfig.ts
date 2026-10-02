/** Public configuration only. API keys are supplied at runtime, never bundled. */
export const AI_CONFIG = {
    text: {
        primary: 'gemini',
        fallback: 'pollinations',
        geminiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        geminiModel: 'gemini-3-flash-preview',
        pollinationsEndpoint: 'https://text.pollinations.ai/openai',
        pollinationsModel: 'openai',
        primaryTimeoutMs: 15000,
        fallbackTimeoutMs: 25000,
        fallbackEnabled: true,
    },
    image: {
        provider: 'cloudflare',
        endpoint: 'https://flat-bush-389f.spritenguyen.workers.dev/',
        // The deployed Worker selects this model; the client cannot override it.
        model: '@cf/black-forest-labs/flux-2-klein-4b',
        timeoutMs: 60000,
        cacheEntries: 32,
        sizes: {
            '1:1': { width: 1024, height: 1024 },
            '9:16': { width: 768, height: 1344 },
            '16:9': { width: 1920, height: 1080 },
        },
    },
} as const;

export const GEMINI_MODELS = [
    { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite (Fastest)' },
    { id: AI_CONFIG.text.geminiModel, name: 'Gemini 3 Flash (Recommended)' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Legacy)' },
];
export const IMAGE_MODELS = [
    { id: AI_CONFIG.image.model, name: 'Cloudflare Flux 2 Klein 4B', desc: 'Model cố định của Image Worker' },
];

export function getTextOptions(config: { geminiKey?: string; geminiModel?: string }) {
    return { apiKey: config.geminiKey?.trim(), model: config.geminiModel || AI_CONFIG.text.geminiModel };
}
