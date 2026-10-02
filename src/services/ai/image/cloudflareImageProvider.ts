import { AI_CONFIG } from '../config/aiConfig';
import { AiError, fetchFromProvider, httpError, readProviderResponse } from '../errors';
import { ImageProvider, ImageRequest } from './provider';

/** Contract from the supplied Worker: POST JSON -> PNG binary; errors -> JSON. */
export class CloudflareImageProvider implements ImageProvider {
    readonly name = 'Cloudflare Image';
    constructor(private readonly endpoint: string = AI_CONFIG.image.endpoint) {}
    async generateImage(request: ImageRequest, signal: AbortSignal): Promise<Blob> {
        const response = await fetchFromProvider(this.name, this.endpoint, {
            method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: request.prompt, width: request.width, height: request.height, ...(request.seed !== undefined && { seed: request.seed }) }),
        });
        if (!response.ok) {
            // Consume the Worker's {error, detail?, result?} response without leaking internal details to UI.
            try { await response.json(); } catch { /* Proxies may return non-JSON errors. */ }
            throw httpError(this.name, response.status);
        }
        if (response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'image/png') throw new AiError('RESPONSE', 'Image Worker returned an unexpected response type.', this.name);
        const blob = await readProviderResponse(this.name, signal, () => response.blob());
        const signature = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
        if (signature.length !== 8 || ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => signature[i] === byte)) throw new AiError('RESPONSE', 'Image Worker returned invalid PNG data.', this.name);
        return blob;
    }
}
