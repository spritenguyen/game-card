const active = new Map<symbol, { provider: string; message: string }>();
const emit = (event: string, detail: string) => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(event, { detail }));
};

export const GlobalApiState = {
    // Legacy monitor compatibility; no cross-key provider cooldown is used anymore.
    geminiBannedUntil: 0,
    currentStatusMsg: '',
    notify(message: string) {
        this.currentStatusMsg = message;
        emit('api_status_message', message);
    },
    setCurrentApi(provider: string) { emit('api_active_name', provider); },
    setIdle() { if (!active.size) { this.setCurrentApi('Idle'); this.notify(''); } },
};
function refresh() {
    const current = Array.from(active.values()).at(-1);
    GlobalApiState.setCurrentApi(current?.provider || 'Idle');
    GlobalApiState.notify(current?.message || '');
}
export function beginAiRequest(provider: string): symbol {
    const id = Symbol('ai-request');
    active.set(id, { provider, message: '' });
    refresh();
    return id;
}
export function updateAiRequest(id: symbol, provider: string, message = '') {
    if (active.has(id)) { active.set(id, { provider, message }); refresh(); }
}
export function finishAiRequest(id: symbol) { active.delete(id); refresh(); }
