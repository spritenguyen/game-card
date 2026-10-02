export type AiErrorCode = 'INVALID_INPUT' | 'INVALID_REQUEST' | 'UNAVAILABLE' | 'NETWORK' | 'TIMEOUT' | 'HTTP' | 'RESPONSE' | 'BLOCKED' | 'CANCELLED' | 'ALL_PROVIDERS_FAILED';

export class AiError extends Error {
    constructor(
        public readonly code: AiErrorCode,
        message: string,
        public readonly provider?: string,
        public readonly fallbackAllowed = false,
        public readonly status?: number,
        public readonly failures?: readonly AiError[],
    ) {
        super(message);
        this.name = 'AiError';
    }
}

export function httpError(provider: string, status: number, invalidKey = false): AiError {
    const canFallback = invalidKey || [401, 403, 404, 408, 429].includes(status) || status >= 500;
    return new AiError(status === 400 && !invalidKey ? 'INVALID_REQUEST' : 'HTTP', `${provider} request failed (HTTP ${status}).`, provider, canFallback, status);
}

export async function fetchFromProvider(provider: string, url: string, init: RequestInit): Promise<Response> {
    try {
        return await fetch(url, init);
    } catch {
        if (init.signal?.aborted) throw new AiError('CANCELLED', 'AI request cancelled.', provider);
        throw new AiError('NETWORK', `${provider} network request failed.`, provider, true);
    }
}

export async function readProviderResponse<T>(provider: string, signal: AbortSignal, read: () => Promise<T>): Promise<T> {
    try { return await read(); }
    catch (error) {
        if (error instanceof AiError) throw error;
        if (signal.aborted) throw new AiError('CANCELLED', 'AI request cancelled.', provider);
        throw new AiError('RESPONSE', `${provider} response could not be read.`, provider, true);
    }
}
