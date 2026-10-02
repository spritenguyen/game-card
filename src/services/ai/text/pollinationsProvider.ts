import { AI_CONFIG } from '../config/aiConfig';
import { AiError, fetchFromProvider, httpError, readProviderResponse } from '../errors';
import { TextOptions, TextProvider, TextRequest } from './provider';

export class PollinationsProvider implements TextProvider {
    readonly name = 'Pollinations Free';
    constructor(private readonly endpoint: string = AI_CONFIG.text.pollinationsEndpoint, private readonly model: string = AI_CONFIG.text.pollinationsModel) {}
    async generateText(request: TextRequest, _options: TextOptions, signal: AbortSignal): Promise<string> {
        // No API key or proxy is used. Never discard vision input silently.
        if (request.image) throw new AiError('UNAVAILABLE', 'The free fallback does not support inline image inference.', this.name);
        const instruction = (request.systemPrompt || '') + (request.schema ? `\nReturn raw JSON matching this schema: ${JSON.stringify(request.schema)}` : '');
        const response = await fetchFromProvider(this.name, this.endpoint, {
            method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: this.model, ...(request.temperature !== undefined && { temperature: request.temperature }), ...(request.schema && { jsonMode: true }), messages: [
                { role: 'system', content: instruction }, { role: 'user', content: request.prompt },
            ] }),
        });
        if (!response.ok) throw httpError(this.name, response.status);
        const raw = await readProviderResponse(this.name, signal, () => response.text());
        let body: any;
        try { body = JSON.parse(raw); } catch { /* Plain text is supported by the free endpoint. */ }
        if (body?.error) throw new AiError('RESPONSE', 'Pollinations returned an API error.', this.name, true);
        const content = body?.choices ? body.choices[0]?.message?.content : raw;
        if (typeof content !== 'string' || !content.trim()) throw new AiError('RESPONSE', 'Pollinations returned no text.', this.name, true);
        return content;
    }
}
