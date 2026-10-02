import { AI_CONFIG } from '../config/aiConfig';
import { AiError, fetchFromProvider, httpError } from '../errors';
import { JsonSchema, TextOptions, TextProvider, TextRequest } from './provider';

function toGeminiSchema(schema: JsonSchema): object {
    return {
        ...schema, type: schema.type.toUpperCase(),
        ...(schema.properties && { properties: Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, toGeminiSchema(value)])) }),
        ...(schema.items && { items: toGeminiSchema(schema.items) }),
    };
}
export class GeminiProvider implements TextProvider {
    readonly name = 'Gemini';
    constructor(private readonly endpoint: string = AI_CONFIG.text.geminiEndpoint) {}
    async generateText(request: TextRequest, options: TextOptions, signal: AbortSignal): Promise<string> {
        if (!options.apiKey) throw new AiError('UNAVAILABLE', 'Gemini API key is not configured.', this.name, true);
        const model = options.model || AI_CONFIG.text.geminiModel;
        const response = await fetchFromProvider(this.name, `${this.endpoint}/${encodeURIComponent(model)}:generateContent`, {
            method: 'POST', signal,
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': options.apiKey },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [
                    { text: request.prompt }, ...(request.image ? [{ inlineData: request.image }] : []),
                ] }],
                ...(request.systemPrompt && { systemInstruction: { parts: [{ text: request.systemPrompt }] } }),
                generationConfig: {
                    ...(request.schema && { responseMimeType: 'application/json', responseSchema: toGeminiSchema(request.schema) }),
                    ...(request.temperature !== undefined && { temperature: request.temperature }),
                },
            }),
        });
        let body: any;
        try { body = await response.json(); }
        catch {
            if (!response.ok) throw httpError(this.name, response.status);
            throw new AiError('RESPONSE', 'Gemini returned invalid JSON.', this.name, true);
        }
        if (!response.ok) {
            const invalidKey = response.status === 400 && /api.?key.*(not valid|invalid)|invalid.*api.?key/i.test(body?.error?.message || '');
            throw httpError(this.name, response.status, invalidKey);
        }
        if (!body || typeof body !== 'object') throw new AiError('RESPONSE', 'Gemini returned an invalid response.', this.name, true);
        if (body.error) throw new AiError('RESPONSE', 'Gemini returned an API error.', this.name, true);
        const candidate = body.candidates?.[0];
        if (body.promptFeedback?.blockReason || ['SAFETY', 'RECITATION', 'PROHIBITED_CONTENT'].includes(candidate?.finishReason)) {
            throw new AiError('BLOCKED', 'Gemini could not process this content.', this.name);
        }
        const parts = candidate?.content?.parts;
        if (!Array.isArray(parts)) throw new AiError('RESPONSE', 'Gemini returned no text parts.', this.name, true);
        const text = parts.filter((part: any) => part && typeof part === 'object' && !part.thought && typeof part.text === 'string').map((part: any) => part.text).join('');
        if (!text?.trim()) throw new AiError('RESPONSE', 'Gemini returned no text.', this.name, true);
        return text;
    }
}
