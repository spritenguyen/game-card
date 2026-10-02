import { AI_CONFIG } from '../config/aiConfig';
import { AiError } from '../errors';
import { beginAiRequest, finishAiRequest, updateAiRequest } from '../status';
import { withTimeout } from '../timeout';
import { GeminiProvider } from './geminiProvider';
import { PollinationsProvider } from './pollinationsProvider';
import { JsonSchema, TextOptions, TextProvider, TextRequest } from './provider';

function validateSchema(schema: JsonSchema) {
    if (!schema || !['object', 'array', 'string', 'integer', 'number', 'boolean'].includes(schema.type)) throw new AiError('INVALID_INPUT', 'Invalid AI response schema.');
    if (schema.type === 'object') {
        if (!schema.properties || (schema.required && (!Array.isArray(schema.required) || schema.required.some(key => !Object.hasOwn(schema.properties!, key))))) throw new AiError('INVALID_INPUT', 'Invalid AI object schema.');
        Object.values(schema.properties).forEach(validateSchema);
    }
    if (schema.type === 'array') {
        if (!schema.items) throw new AiError('INVALID_INPUT', 'AI array schema requires items.');
        validateSchema(schema.items);
    }
}
function matchesSchema(value: unknown, schema: JsonSchema): boolean {
    if (value === null) return schema.nullable === true;
    switch (schema.type) {
        case 'string': return typeof value === 'string';
        case 'boolean': return typeof value === 'boolean';
        case 'number': return typeof value === 'number' && Number.isFinite(value);
        case 'integer': return typeof value === 'number' && Number.isInteger(value);
        case 'array': return Array.isArray(value) && value.every(item => matchesSchema(item, schema.items!));
        case 'object': {
            if (typeof value !== 'object' || !value || Array.isArray(value)) return false;
            const object = value as Record<string, unknown>;
            return (schema.required || []).every(key => Object.hasOwn(object, key)) && Object.entries(schema.properties || {}).every(([key, spec]) => !Object.hasOwn(object, key) || matchesSchema(object[key], spec));
        }
    }
}
function normalizeJson(raw: string, schema: JsonSchema, provider: string): unknown {
    let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    // Preserve the legacy tolerance for prose surrounding a JSON object.
    if (schema.type === 'object') {
        const start = text.indexOf('{'); const end = text.lastIndexOf('}');
        if (start >= 0 && end > start) text = text.slice(start, end + 1);
    }
    let value: unknown;
    try { value = JSON.parse(text); }
    catch { throw new AiError('RESPONSE', `${provider} returned invalid structured text.`, provider, true); }
    if (!matchesSchema(value, schema)) throw new AiError('RESPONSE', `${provider} response does not match the requested schema.`, provider, true);
    return value;
}
function validateRequest(request: TextRequest, options: TextOptions) {
    if (!request || typeof request.prompt !== 'string' || !request.prompt.trim() || (request.systemPrompt !== undefined && typeof request.systemPrompt !== 'string')) throw new AiError('INVALID_INPUT', 'AI prompt must be non-empty text.');
    if ((options.apiKey !== undefined && typeof options.apiKey !== 'string') || (options.model !== undefined && (typeof options.model !== 'string' || !options.model.trim()))) throw new AiError('INVALID_INPUT', 'Invalid AI provider options.');
    if (request.temperature !== undefined && (!Number.isFinite(request.temperature) || request.temperature < 0 || request.temperature > 2)) throw new AiError('INVALID_INPUT', 'Invalid AI temperature.');
    if (request.schema) validateSchema(request.schema);
    if (request.image && (!['image/png', 'image/jpeg', 'image/webp'].includes(request.image.mimeType) || typeof request.image.data !== 'string' || !request.image.data || !/^[A-Za-z0-9+/]+={0,2}$/.test(request.image.data))) throw new AiError('INVALID_INPUT', 'Invalid inline image data.');
}
export interface TextPolicy {
    primaryTimeoutMs: number;
    fallbackTimeoutMs: number;
    fallbackEnabled: boolean;
}
const providerFactories = {
    gemini: () => new GeminiProvider(),
    pollinations: () => new PollinationsProvider(),
};

export class TextService {
    constructor(
        private readonly primary: TextProvider = providerFactories[AI_CONFIG.text.primary](),
        private readonly fallback: TextProvider = providerFactories[AI_CONFIG.text.fallback](),
        private readonly policy: TextPolicy = AI_CONFIG.text,
    ) {
        if (![policy.primaryTimeoutMs, policy.fallbackTimeoutMs].every(ms => Number.isFinite(ms) && ms > 0)) throw new AiError('INVALID_INPUT', 'Invalid AI timeout policy.');
    }
    generateText(request: TextRequest, options: TextOptions = {}): Promise<string> {
        return this.execute(request, options, (text, provider) => {
            if (typeof text !== 'string' || !text.trim()) throw new AiError('RESPONSE', `${provider} returned empty text.`, provider, true);
            return text.trim();
        });
    }
    generateJson<T = Record<string, unknown>>(request: TextRequest, options: TextOptions = {}): Promise<T> {
        if (!request?.schema) return Promise.reject(new AiError('INVALID_INPUT', 'Structured AI generation requires a schema.'));
        return this.execute(request, options, (text, provider) => normalizeJson(text, request.schema!, provider) as T);
    }
    private async execute<T>(request: TextRequest, options: TextOptions, normalize: (text: string, provider: string) => T): Promise<T> {
        validateRequest(request, options);
        const id = beginAiRequest(this.primary.name);
        const attempt = (provider: TextProvider, timeout: number, providerOptions: TextOptions) => withTimeout(provider.name, timeout, async signal => normalize(await provider.generateText(request, providerOptions, signal), provider.name), options.signal);
        try {
            try { return await attempt(this.primary, this.policy.primaryTimeoutMs, options); }
            catch (primaryError) {
                // Application errors, invalid requests, safety refusals and cancellation do not trigger fallback.
                if (!(primaryError instanceof AiError) || !primaryError.fallbackAllowed || !this.policy.fallbackEnabled) throw primaryError;
                updateAiRequest(id, this.fallback.name, 'Gemini không khả dụng; đang dùng fallback miễn phí.');
                try {
                    // Credentials and Gemini model are never forwarded to the free provider.
                    return await attempt(this.fallback, this.policy.fallbackTimeoutMs, {});
                } catch (fallbackError) {
                    if (!(fallbackError instanceof AiError) || fallbackError.code === 'CANCELLED') throw fallbackError;
                    throw new AiError('ALL_PROVIDERS_FAILED', 'Text AI is unavailable. Please try again later.', undefined, false, undefined, [primaryError, fallbackError]);
                }
            }
        } finally { finishAiRequest(id); }
    }
}
export const textService = new TextService();
