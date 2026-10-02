import { AiError } from './errors';

/** Covers fetch, response body and normalization; also bounds providers ignoring abort. */
export async function withTimeout<T>(provider: string, ms: number, operation: (signal: AbortSignal) => Promise<T>, externalSignal?: AbortSignal): Promise<T> {
    if (externalSignal?.aborted) throw new AiError('CANCELLED', 'AI request cancelled.', provider);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let cancel: () => void;
    const boundary = new Promise<never>((_, reject) => {
        cancel = () => {
            reject(new AiError('CANCELLED', 'AI request cancelled.', provider));
            controller.abort();
        };
        externalSignal?.addEventListener('abort', cancel, { once: true });
        timer = setTimeout(() => {
            reject(new AiError('TIMEOUT', `${provider} timed out.`, provider, true));
            controller.abort();
        }, ms);
    });
    try {
        return await Promise.race([boundary, Promise.resolve().then(() => operation(controller.signal))]);
    } finally {
        clearTimeout(timer!);
        externalSignal?.removeEventListener('abort', cancel!);
    }
}
