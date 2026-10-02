import test from 'node:test';
import assert from 'node:assert/strict';
import { TextService } from './src/services/ai/text/textService';
import { GeminiProvider } from './src/services/ai/text/geminiProvider';
import { PollinationsProvider } from './src/services/ai/text/pollinationsProvider';
import { ImageService } from './src/services/ai/image/imageService';
import { CloudflareImageProvider } from './src/services/ai/image/cloudflareImageProvider';
import { AiError } from './src/services/ai/errors';
import { GlobalApiState, beginAiRequest, finishAiRequest } from './src/services/ai/status';
import { AI_CONFIG } from './src/services/ai/config/aiConfig';
import type { TextProvider, TextRequest } from './src/services/ai/text/provider';
import type { ImageRequest } from './src/services/ai/image/provider';

const request: TextRequest = { prompt: 'Generate a test reply.', schema: { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'] } };
const options = { apiKey: 'test-placeholder-key', model: 'test-model' };
const policy = { primaryTimeoutMs: 20, fallbackTimeoutMs: 20, fallbackEnabled: true };
const geminiResponse = (text: string) => Response.json({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });
const fallbackResponse = () => Response.json({ choices: [{ message: { content: '{"reply":"fallback"}' } }] });
const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=', 'base64');
const pngResponse = () => new Response(pngBytes, { headers: { 'Content-Type': 'image/png' } });
const imageRequest: ImageRequest = { prompt: 'A cinematic landscape.', width: 1024, height: 1024, seed: 42 };

async function withFetch(mock: typeof fetch, run: () => Promise<void>) {
    const real = globalThis.fetch; globalThis.fetch = mock;
    try { await run(); } finally { globalThis.fetch = real; }
}
const makeText = () => new TextService(new GeminiProvider(), new PollinationsProvider(), policy);
const isAiError = (code: string) => (error: unknown) => error instanceof AiError && error.code === code;

test('Gemini success uses common interface, REST schema and runtime credential header', async () => {
    await withFetch(async (url, init) => {
        assert.equal(String(url), AI_CONFIG.text.geminiEndpoint + '/test-model:generateContent');
        assert.equal(init?.method, 'POST');
        assert.equal(new Headers(init?.headers).get('x-goog-api-key'), options.apiKey);
        assert.ok(!String(url).includes(options.apiKey));
        const body = JSON.parse(init!.body as string);
        assert.equal(body.generationConfig.responseSchema.type, 'OBJECT');
        assert.equal(body.generationConfig.responseSchema.properties.reply.type, 'STRING');
        return geminiResponse('```json\n{"reply":"primary"}\n```');
    }, async () => assert.deepEqual(await makeText().generateJson(request, options), { reply: 'primary' }));
});

for (const status of [401, 403, 404, 408, 429, 500, 503]) {
    test(`Gemini HTTP ${status} -> keyless Pollinations fallback`, async () => {
        const calls: string[] = [];
        await withFetch(async (url, init) => {
            calls.push(String(url));
            if (calls.length === 1) return Response.json({ error: { message: 'Provider failure' } }, { status });
            assert.equal(String(url), AI_CONFIG.text.pollinationsEndpoint);
            const headers = new Headers(init?.headers);
            assert.equal(headers.has('Authorization'), false); assert.equal(headers.has('x-goog-api-key'), false);
            const body = JSON.parse(init!.body as string);
            assert.equal(body.model, AI_CONFIG.text.pollinationsModel); assert.equal(body.jsonMode, true);
            assert.ok(!JSON.stringify(body).includes(options.apiKey));
            return fallbackResponse();
        }, async () => {
            assert.deepEqual(await makeText().generateJson(request, options), { reply: 'fallback' });
            assert.equal(calls.length, 2);
        });
    });
}

test('Gemini invalid key HTTP 400 is an availability failure -> fallback', async () => {
    let calls = 0;
    await withFetch(async () => ++calls === 1 ? Response.json({ error: { message: 'API key not valid. Please pass a valid API key.' } }, { status: 400 }) : fallbackResponse(), async () => {
        assert.deepEqual(await makeText().generateJson(request, options), { reply: 'fallback' }); assert.equal(calls, 2);
    });
});
test('Gemini invalid request HTTP 400 does not fallback', async () => {
    let calls = 0;
    await withFetch(async () => { calls++; return Response.json({ error: { message: 'Invalid request schema' } }, { status: 400 }); }, async () => {
        await assert.rejects(makeText().generateJson(request, options), isAiError('INVALID_REQUEST')); assert.equal(calls, 1);
    });
});
test('Gemini network failure -> fallback', async () => {
    let calls = 0;
    await withFetch(async () => { if (++calls === 1) throw new TypeError('Failed to fetch'); return fallbackResponse(); }, async () => {
        assert.deepEqual(await makeText().generateJson(request, options), { reply: 'fallback' });
    });
});
test('Gemini timeout aborts primary -> fallback, even if transport ignores abort', async () => {
    let calls = 0; let firstSignal: AbortSignal | null | undefined;
    await withFetch(async (_url, init) => {
        if (++calls === 1) { firstSignal = init?.signal; return new Promise<Response>(() => {}); }
        return fallbackResponse();
    }, async () => {
        assert.deepEqual(await makeText().generateJson(request, options), { reply: 'fallback' });
        assert.equal(firstSignal?.aborted, true); assert.equal(calls, 2);
    });
});
test('Timeout also covers a response body that never resolves', async () => {
    let calls = 0;
    await withFetch(async () => ++calls === 1 ? new Response(new ReadableStream({ start() {} }), { headers: { 'Content-Type': 'application/json' } }) : fallbackResponse(), async () => {
        assert.deepEqual(await makeText().generateJson(request, options), { reply: 'fallback' });
    });
});
test('Both providers fail -> controlled AiError with classified failures', async () => {
    await withFetch(async () => Response.json({ error: 'Unavailable' }, { status: 503 }), async () => {
        await assert.rejects(makeText().generateJson(request, options), error => {
            assert.ok(error instanceof AiError); assert.equal(error.code, 'ALL_PROVIDERS_FAILED');
            assert.equal(error.failures?.length, 2); assert.ok(!error.message.includes(options.apiKey)); return true;
        });
        assert.equal(GlobalApiState.currentStatusMsg, '');
    });
});
test('Fallback timeout is bounded and classified', async () => {
    let calls = 0;
    await withFetch(async () => ++calls === 1 ? new Response('', { status: 503 }) : new Promise<Response>(() => {}), async () => {
        await assert.rejects(makeText().generateJson(request, options), error => error instanceof AiError && error.code === 'ALL_PROVIDERS_FAILED' && error.failures?.[1].code === 'TIMEOUT');
    });
});
test('Malformed primary JSON/types trigger fallback as provider response failures', async () => {
    for (const raw of ['not json', '{"reply":3}', '{}']) {
        let calls = 0;
        await withFetch(async () => ++calls === 1 ? geminiResponse(raw) : fallbackResponse(), async () => assert.deepEqual(await makeText().generateJson(request, options), { reply: 'fallback' }));
    }
});
test('Malformed fallback is a controlled failure', async () => {
    let calls = 0;
    await withFetch(async () => ++calls === 1 ? new Response('', { status: 503 }) : new Response('not json'), async () => {
        await assert.rejects(makeText().generateJson(request, options), isAiError('ALL_PROVIDERS_FAILED'));
    });
});
test('Input/schema validation runs before any provider call', async () => {
    let calls = 0;
    await withFetch(async () => { calls++; throw Error('Should not run'); }, async () => {
        await assert.rejects(makeText().generateText({ prompt: ' ' }, options), isAiError('INVALID_INPUT'));
        await assert.rejects(makeText().generateJson({ ...request, schema: { type: 'array' } }, options), isAiError('INVALID_INPUT'));
        assert.equal(calls, 0);
    });
});
test('Application programming error is not swallowed or retried', async () => {
    let fallbackCalls = 0; const bug = new Error('Application bug');
    const primary: TextProvider = { name: 'Primary', generateText: async () => { throw bug; } };
    const fallback: TextProvider = { name: 'Fallback', generateText: async () => { fallbackCalls++; return 'wrong'; } };
    await assert.rejects(new TextService(primary, fallback, policy).generateText({ prompt: 'test' }), error => error === bug);
    assert.equal(fallbackCalls, 0);
});
test('Safety refusal does not bypass Gemini policy through fallback', async () => {
    let calls = 0;
    await withFetch(async () => { calls++; return Response.json({ promptFeedback: { blockReason: 'SAFETY' } }); }, async () => {
        await assert.rejects(makeText().generateJson(request, options), isAiError('BLOCKED')); assert.equal(calls, 1);
    });
});
test('Caller cancellation never triggers fallback', async () => {
    const abort = new AbortController(); let calls = 0;
    await withFetch(async () => { calls++; abort.abort(); return new Promise<Response>(() => {}); }, async () => {
        await assert.rejects(makeText().generateJson(request, { ...options, signal: abort.signal }), isAiError('CANCELLED')); assert.equal(calls, 1);
    });
});
test('Missing Gemini key routes to free fallback, no Gemini or proxy request', async () => {
    await withFetch(async url => { assert.equal(String(url), AI_CONFIG.text.pollinationsEndpoint); return fallbackResponse(); }, async () => assert.deepEqual(await makeText().generateJson(request), { reply: 'fallback' }));
});
test('Plain text fallback and vision primary both work through the same abstraction', async () => {
    await withFetch(async url => String(url).includes(':generateContent') ? geminiResponse('A small image.') : new Response('Free text reply.'), async () => {
        assert.equal(await makeText().generateText({ prompt: 'Describe', image: { mimeType: 'image/png', data: pngBytes.toString('base64') } }, options), 'A small image.');
        assert.equal(await makeText().generateText({ prompt: 'Hello' }), 'Free text reply.');
    });
});
test('Vision failure is controlled; fallback cannot silently drop image input', async () => {
    await withFetch(async () => new Response('', { status: 503 }), async () => {
        await assert.rejects(makeText().generateText({ prompt: 'Describe', image: { mimeType: 'image/png', data: pngBytes.toString('base64') } }, options), isAiError('ALL_PROVIDERS_FAILED'));
    });
});

test('Image Worker success uses exact POST/JSON contract with no model/key headers', async () => {
    await withFetch(async (url, init) => {
        assert.equal(String(url), AI_CONFIG.image.endpoint); assert.equal(init?.method, 'POST');
        assert.deepEqual(JSON.parse(init!.body as string), imageRequest);
        assert.deepEqual(Object.fromEntries(new Headers(init?.headers)), { 'content-type': 'application/json' });
        return pngResponse();
    }, async () => {
        const result = await new ImageService().generateImage(imageRequest);
        assert.equal(result, 'data:image/png;base64,' + pngBytes.toString('base64'));
    });
});
for (const status of [400, 405, 429, 500]) {
    test(`Image Worker HTTP ${status} produces controlled error; no text/provider fallback`, async () => {
        let calls = 0;
        await withFetch(async url => { calls++; assert.equal(String(url), AI_CONFIG.image.endpoint); return Response.json({ error: 'Image generation failed', detail: 'internal-only' }, { status }); }, async () => {
            await assert.rejects(new ImageService().generateImage(imageRequest), error => error instanceof AiError && error.status === status && !error.message.includes('internal-only'));
            assert.equal(calls, 1);
        });
    });
}
test('Image Worker timeout and invalid payload are controlled', async () => {
    const makeImage = () => new ImageService(new CloudflareImageProvider(), { timeoutMs: 10, cacheEntries: 2 });
    await withFetch(async () => new Promise<Response>(() => {}), async () => assert.rejects(makeImage().generateImage(imageRequest), isAiError('TIMEOUT')));
    for (const response of [Response.json({ error: 'No image' }), new Response('not PNG', { headers: { 'Content-Type': 'image/png' } })]) {
        await withFetch(async () => response, async () => assert.rejects(makeImage().generateImage(imageRequest), isAiError('RESPONSE')));
    }
});
test('Image cache/deduplication include prompt and dimensions, bypass supports rerender', async () => {
    let calls = 0;
    await withFetch(async () => { calls++; return pngResponse(); }, async () => {
        const images = new ImageService();
        await Promise.all([images.generateImage(imageRequest), images.generateImage(imageRequest)]); assert.equal(calls, 1);
        await images.generateImage(imageRequest); assert.equal(calls, 1);
        await images.generateImage({ ...imageRequest, prompt: 'Other concept' });
        await images.generateImage({ ...imageRequest, width: 768 });
        await images.generateImage(imageRequest, { ignoreCache: true }); assert.equal(calls, 4);
    });
});
test('Failed image is not cached; a subsequent request can recover', async () => {
    let calls = 0;
    await withFetch(async () => ++calls === 1 ? new Response('', { status: 500 }) : pngResponse(), async () => {
        const images = new ImageService(); await assert.rejects(images.generateImage(imageRequest));
        assert.ok((await images.generateImage(imageRequest)).startsWith('data:image/png')); assert.equal(calls, 2);
    });
});
test('Image input errors and cancelled requests do not reach Worker', async () => {
    let calls = 0;
    await withFetch(async () => { calls++; return pngResponse(); }, async () => {
        await assert.rejects(new ImageService().generateImage({ ...imageRequest, width: 0 }), isAiError('INVALID_INPUT'));
        const abort = new AbortController(); abort.abort();
        await assert.rejects(new ImageService().generateImage(imageRequest, { signal: abort.signal }), isAiError('CANCELLED')); assert.equal(calls, 0);
    });
});
test('Concurrent AI request status does not become Idle when only one request finishes', () => {
    const text = beginAiRequest('Gemini'); const image = beginAiRequest('Cloudflare');
    GlobalApiState.notify('Rendering'); finishAiRequest(text);
    assert.notEqual(GlobalApiState.currentStatusMsg, 'Rendering');
    // setIdle compatibility cannot clear another in-flight request's status.
    GlobalApiState.notify('Still rendering'); GlobalApiState.setIdle(); assert.equal(GlobalApiState.currentStatusMsg, 'Still rendering');
    finishAiRequest(image); assert.equal(GlobalApiState.currentStatusMsg, '');
});

test('Malformed Gemini envelope is a provider response failure, not a runtime crash', async () => {
    for (const envelope of [null, { candidates: [{ content: { parts: 'invalid' } }] }]) {
        let calls = 0;
        await withFetch(async () => ++calls === 1 ? Response.json(envelope) : fallbackResponse(), async () => {
            assert.deepEqual(await makeText().generateJson(request, options), { reply: 'fallback' });
        });
    }
});
test('Interrupted response body is normalized as a controlled provider error', async () => {
    const response = pngResponse(); response.blob = async () => { throw new TypeError('Body network failure'); };
    await withFetch(async () => response, async () => assert.rejects(new ImageService().generateImage(imageRequest), isAiError('RESPONSE')));
});

test('Null Gemini text parts are normalized as provider failure and allow fallback', async () => {
    let calls = 0;
    await withFetch(async () => ++calls === 1 ? Response.json({ candidates: [{ content: { parts: [null, 42] } }] }) : fallbackResponse(), async () => {
        assert.deepEqual(await makeText().generateJson(request, options), { reply: 'fallback' });
        assert.equal(calls, 2);
    });
});
test('Gemini ignores malformed non-text parts while preserving valid text', async () => {
    let calls = 0;
    await withFetch(async () => {
        calls++;
        return Response.json({ candidates: [{ content: { parts: [null, 42, { text: '{"reply":"primary"}' }] } }] });
    }, async () => {
        assert.deepEqual(await makeText().generateJson(request, options), { reply: 'primary' });
        assert.equal(calls, 1);
    });
});
