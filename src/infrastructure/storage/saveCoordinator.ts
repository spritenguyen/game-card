export const SAVE_VERSION_KEY = 'cineSaveVersion';
export const SAVE_LOCK_NAME = 'cinetech-save-writer-v1';
export interface SaveVersion {
  schemaVersion: 1;
  revision: number;
  writerId: string;
  updatedAt: number;
}
export interface SaveSyncState {
  mode: 'starting' | 'readonly' | 'syncing' | 'writer' | 'blocked';
  revision: number;
  reason?: string;
}
export class SaveConflictError extends Error {
  constructor() {
    super('Save đang được chỉnh ở tab khác hoặc chưa đồng bộ. Vui lòng dùng tab đang giữ quyền ghi.');
    this.name = 'SaveConflictError';
  }
}
export function parseSaveVersion(raw: string | null): SaveVersion | null {
  if (raw === null) return null; // Existing saves start at revision 0.
  const value = JSON.parse(raw);
  if (value?.schemaVersion !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 1 ||
      typeof value.writerId !== 'string' || !value.writerId || !Number.isFinite(value.updatedAt)) {
    throw new Error('Save version không hợp lệ hoặc thuộc phiên bản ứng dụng khác.');
  }
  return value;
}

class SaveCoordinator {
  private listeners = new Set<() => void>();
  private state: SaveSyncState = { mode: 'starting', revision: 0 };
  private users = 0;
  private started = false;
  private generation = 0;
  private acquired = false;
  private abort?: AbortController;
  private release?: () => void;
  private timer?: ReturnType<typeof setTimeout>;
  private writerId = '';
  getState = (): SaveSyncState => this.state;
  subscribe = (callback: () => void) => { this.listeners.add(callback); return () => { this.listeners.delete(callback); }; };
  private emit(next: SaveSyncState) { this.state = next; this.listeners.forEach(listener => listener()); }
  isActive() { return this.users > 0; }
  canWrite() { return !this.started || (this.acquired && this.state.mode === 'writer'); }
  // Repository migration is allowed only while holding the exclusive lock.
  assertRepositoryWrite() { if (this.started && !this.acquired) throw new SaveConflictError(); }
  private read() { return parseSaveVersion(localStorage.getItem(SAVE_VERSION_KEY)); }
  private observe = () => {
    try {
      const version = this.read();
      const revision = version?.revision || 0;
      if (this.acquired && this.state.mode === 'writer' && revision > this.state.revision && version?.writerId !== this.writerId) throw new Error('Xung đột save: version đã bị ghi bởi writer khác ngoài khóa.');
      if (revision < this.state.revision) throw new Error('Save version đã bị giảm hoặc xóa ngoài giao thức đồng bộ.');
      if (revision !== this.state.revision) this.emit({ ...this.state, revision });
    } catch (error) { this.block(error); }
  };
  private onStorage = (event: StorageEvent) => {
    if (event.storageArea === localStorage && (event.key === SAVE_VERSION_KEY || event.key === null)) this.observe();
  };
  private block(error: unknown) {
    this.acquired = false;
    this.emit({ mode: 'blocked', revision: this.state.revision, reason: error instanceof Error ? error.message : String(error) });
    this.release?.();
    this.abort?.abort();
  }
  start(): () => void {
    this.started = true;
    if (++this.users === 1) {
      const generation = ++this.generation;
      this.writerId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      this.emit({ mode: 'starting', revision: 0 });
      this.observe();
      window.addEventListener('storage', this.onStorage);
      window.addEventListener('focus', this.observe);
      window.addEventListener('pagehide', this.onPageHide);
      document.addEventListener('visibilitychange', this.observe);
      if (this.state.mode !== 'blocked') {
        if (!navigator.locks) this.block(new Error('Trình duyệt không hỗ trợ Web Locks; mở ứng dụng qua HTTPS trên trình duyệt hỗ trợ để ghi save an toàn.'));
        else {
          this.abort = new AbortController();
          this.emit({ ...this.state, mode: 'readonly' });
          void navigator.locks.request(SAVE_LOCK_NAME, { signal: this.abort.signal }, async () => {
            if (generation !== this.generation || !this.isActive()) return;
            this.observe();
            if (this.state.mode === 'blocked') return;
            this.acquired = true;
            const held = new Promise<void>(resolve => { this.release = resolve; });
            this.emit({ ...this.state, mode: 'syncing' });
            await held;
            if (generation === this.generation) this.acquired = false;
          }).catch(error => {
            if (generation === this.generation && this.isActive() && error.name !== 'AbortError') this.block(error);
          });
        }
      }
    }
    return () => {
      if (--this.users !== 0) return;
      this.flush();
      ++this.generation;
      this.acquired = false;
      this.abort?.abort(); this.release?.(); this.release = undefined;
      window.removeEventListener('storage', this.onStorage);
      window.removeEventListener('focus', this.observe);
      window.removeEventListener('pagehide', this.onPageHide);
      document.removeEventListener('visibilitychange', this.observe);
    };
  }
  activate() {
    if (this.acquired && this.state.mode === 'syncing') this.emit({ ...this.state, mode: 'writer' });
  }
  fail(error: unknown) { this.block(error); }
  changed() {
    if (!this.isActive() || !this.acquired || this.timer !== undefined) return;
    this.timer = setTimeout(() => { this.timer = undefined; this.publish(); }, 0);
  }
  private publish() {
    if (!this.acquired) return;
    try {
      const revision = this.read()?.revision || 0;
      if (revision !== this.state.revision || revision >= Number.MAX_SAFE_INTEGER) throw new Error('Save version không thể tiếp tục an toàn.');
      const next: SaveVersion = { schemaVersion: 1, revision: revision + 1, writerId: this.writerId, updatedAt: Date.now() };
      localStorage.setItem(SAVE_VERSION_KEY, JSON.stringify(next));
      this.emit({ ...this.state, revision: next.revision });
    } catch (error) { this.block(error); }
  }
  private onPageHide = () => this.flush();
  flush() { if (this.timer !== undefined) { clearTimeout(this.timer); this.timer = undefined; this.publish(); } }
}
export const saveCoordinator = new SaveCoordinator();
