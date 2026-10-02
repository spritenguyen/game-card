import { AI_CONFIG } from '../config/aiConfig';
import { AiError } from '../errors';
import { beginAiRequest, finishAiRequest } from '../status';
import { withTimeout } from '../timeout';
import { CloudflareImageProvider } from './cloudflareImageProvider';
import { ImageProvider, ImageRequest } from './provider';

export interface ImageOptions { ignoreCache?: boolean; signal?: AbortSignal; }
export interface ImagePolicy { timeoutMs: number; cacheEntries: number; }
function validateRequest(request: ImageRequest) {
    if (!request || typeof request.prompt !== 'string' || !request.prompt.trim()) throw new AiError('INVALID_INPUT', 'Image prompt must be non-empty text.');
    if (![request.width, request.height].every(n => Number.isSafeInteger(n) && n > 0) || (request.seed !== undefined && (!Number.isSafeInteger(request.seed) || request.seed < 0))) throw new AiError('INVALID_INPUT', 'Invalid image dimensions or seed.');
}
async function toDataUrl(blob: Blob): Promise<string> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return `data:${blob.type};base64,${btoa(binary)}`;
}
const providerFactories = { cloudflare: () => new CloudflareImageProvider() };

export class ImageService {
    private readonly cache = new Map<string, string>();
    private readonly inFlight = new Map<string, Promise<string>>();
    constructor(private readonly provider: ImageProvider = providerFactories[AI_CONFIG.image.provider](), private readonly policy: ImagePolicy = AI_CONFIG.image) {
        if (!Number.isFinite(policy.timeoutMs) || policy.timeoutMs <= 0 || !Number.isInteger(policy.cacheEntries) || policy.cacheEntries < 0) throw new AiError('INVALID_INPUT', 'Invalid image policy.');
    }
    async generateImage(request: ImageRequest, options: ImageOptions = {}): Promise<string> {
        validateRequest(request);
        if (options.signal?.aborted) throw new AiError('CANCELLED', 'AI request cancelled.', this.provider.name);
        const normalized = { ...request, prompt: request.prompt.trim() };
        const key = JSON.stringify(normalized);
        if (!options.ignoreCache && this.cache.has(key)) return this.cache.get(key)!;
        // Caller-owned cancellation must not abort another caller's shared request.
        const shared = !options.ignoreCache && !options.signal;
        if (shared && this.inFlight.has(key)) return this.inFlight.get(key)!;
        const id = beginAiRequest(this.provider.name);
        const task = withTimeout(this.provider.name, this.policy.timeoutMs, async signal => toDataUrl(await this.provider.generateImage(normalized, signal)), options.signal);
        if (shared) this.inFlight.set(key, task);
        try {
            const result = await task;
            if (this.policy.cacheEntries > 0) {
                this.cache.delete(key);
                this.cache.set(key, result);
                while (this.cache.size > this.policy.cacheEntries) this.cache.delete(this.cache.keys().next().value!);
            }
            return result;
        } finally {
            if (shared) this.inFlight.delete(key);
            finishAiRequest(id);
        }
    }
}
export const imageService = new ImageService();
