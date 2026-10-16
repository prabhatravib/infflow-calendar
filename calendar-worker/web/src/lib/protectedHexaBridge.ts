import type { ProtectedCalendarContext } from './protectedCalendarContext';

interface SessionGrant {
  id: string;
  capability: string;
  mode: 'normal';
  expiresAt: number;
  parentOrigin: string;
}

interface FrameTarget { postMessage(message: unknown, targetOrigin: string): void }
export interface PresentationSnapshot { visualHidden: boolean; transcriptHidden: boolean }
export type CalendarSyncState = 'pending' | 'stored' | 'applied' | 'error';

export function seedHexaPresentation(frame: FrameTarget, workerOrigin: string, snapshot: PresentationSnapshot): void {
  frame.postMessage({
    type: 'SET_LAYOUT_SPLIT', hexagonHeight: 40, chatHeight: 60,
    hideHexagon: false, compactHexagon: true,
  }, workerOrigin);
  frame.postMessage({ type: 'SET_ASPECT_COUNT', aspectCount: 0 }, workerOrigin);
  frame.postMessage({ type: 'SET_NARRATOR_PRESENTATION', ...snapshot }, workerOrigin);
}

interface BridgeOptions {
  workerOrigin: string;
  parentOrigin: string;
  sessionId: string;
  getFrame: () => FrameTarget | null;
  fetch: typeof fetch;
  onSyncState: (state: CalendarSyncState) => void;
  onFrameReady: () => void;
  onReplacement: () => void;
  onPresentation: (snapshot: PresentationSnapshot) => void;
  onConsoleEntry: (payload: unknown) => void;
  now?: () => number;
}

const protectedId = /^[a-f0-9]{64}$/;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** The real iframe handler and same-origin context queue, with injectable I/O. */
export class ProtectedHexaBridge {
  private grant: SessionGrant | null = null;
  private latest: { value: ProtectedCalendarContext; key: string } | null = null;
  private storedKey: string | null = null;
  private expectedReceipt: string | null = null;
  private readonly storedHashes = new Set<string>();
  private epoch = 0;
  private disposed = false;
  private loaded = false;
  private installed = false;
  private bootReady = false;
  private pending: Promise<void> | null = null;
  private abort: AbortController | null = null;

  constructor(private readonly options: BridgeOptions) {}

  setCalendar(value: ProtectedCalendarContext): void {
    const key = JSON.stringify(value);
    if (this.latest?.key === key) return;
    this.latest = { value, key };
    this.expectedReceipt = null;
    this.options.onSyncState('pending');
    this.synchronize();
  }

  frameLoaded(): void {
    if (this.disposed) return;
    // The shared receipt carries the URL's local session ID, not a grant ID.
    // Rotate the keyed iframe on reload so queued old receipts cannot match.
    if (this.loaded) { this.replace(); return; }
    this.loaded = true;
    this.options.onFrameReady();
    this.synchronize();
  }

  handleMessage(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>): void {
    if (this.disposed || event.origin !== this.options.workerOrigin || event.source !== this.options.getFrame() || !record(event.data)) return;
    const data = event.data;
    if (data.type === 'HEXA_PROTECTED_BOOT_READY') {
      if (data.mode !== undefined && data.mode !== 'normal') return;
      // Mount/expiry requests a new grant; duplicate startup messages share one.
      if (this.installed) { this.replace(); return; }
      this.bootReady = true;
      this.options.onFrameReady();
      this.synchronize();
      return;
    }
    if (data.type === 'HEXA_CONSOLE_LOG') {
      if (record(data.payload) && data.payload.sessionId === this.options.sessionId) this.options.onConsoleEntry(data.payload);
      return;
    }
    if (data.sessionId !== this.options.sessionId) return;
    if (data.type === 'IFRAME_READY') {
      this.options.onFrameReady();
    } else if (
      data.type === 'HEXA_PRESENTATION_STATE' && data.source === 'hexa-presentation-state' &&
      typeof data.visualHidden === 'boolean' && typeof data.transcriptHidden === 'boolean'
    ) {
      this.options.onPresentation({ visualHidden: data.visualHidden, transcriptHidden: data.transcriptHidden });
    } else if (
      data.type === 'HEXA_CONTEXT_INJECTED' && data.source === 'hexa-voice' &&
      this.grant && this.grant.expiresAt > this.now() && this.latest?.key === this.storedKey &&
      typeof data.sha256 === 'string' && data.sha256 === this.expectedReceipt
    ) {
      this.options.onSyncState('applied');
    }
    // Calendar has no host action bridge. Its tools and Text/Voice transcript
    // routing remain owned by Hexa, rather than granting calendar CRUD here.
  }

  dispose(): void {
    this.disposed = true;
    this.invalidate();
  }

  private now(): number { return this.options.now?.() ?? Date.now(); }

  private replace(): void {
    this.dispose();
    this.options.onReplacement();
  }

  private invalidate(): void {
    this.epoch += 1;
    this.abort?.abort();
    this.abort = null;
    this.pending = null;
    this.grant = null;
    this.storedKey = null;
    this.expectedReceipt = null;
    this.storedHashes.clear();
    if (!this.disposed) this.options.onSyncState('pending');
  }

  private readGrant(value: unknown): SessionGrant | null {
    if (!record(value) || Object.keys(value).length !== 1 || !record(value.grant)) return null;
    const grant = value.grant;
    if (Object.keys(grant).sort().join(',') !== 'capability,expiresAt,id,mode,parentOrigin') return null;
    if (
      typeof grant.id !== 'string' || !protectedId.test(grant.id) ||
      typeof grant.capability !== 'string' || !protectedId.test(grant.capability) ||
      grant.mode !== 'normal' || grant.parentOrigin !== this.options.parentOrigin ||
      typeof grant.expiresAt !== 'number' || !Number.isSafeInteger(grant.expiresAt) ||
      grant.expiresAt <= this.now() || grant.expiresAt > this.now() + 7_200_000
    ) return null;
    return grant as unknown as SessionGrant;
  }

  private synchronize(): void {
    if (this.disposed || !this.loaded || !this.bootReady || !this.latest || this.pending) return;
    if (this.grant && this.grant.expiresAt <= this.now()) {
      if (this.installed) { this.replace(); return; }
      this.invalidate();
    }
    if (this.grant && this.latest.key === this.storedKey) return;
    const epoch = this.epoch;
    const abort = this.abort = new AbortController();
    const current = () => !this.disposed && this.epoch === epoch;
    const run = async () => {
      if (!this.grant) {
        const response = await this.options.fetch('/api/hexa/session', {
          method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
          body: '{}', signal: abort.signal,
        });
        if (!current()) return;
        if (!response.ok) throw new Error('bootstrap_failed');
        const grant = this.readGrant(await response.json());
        if (!current()) return;
        if (!grant) throw new Error('bootstrap_invalid');
        this.grant = grant;
      }
      // Serialize updates so an older server write cannot win over the latest
      // visible view. A fresh grant gets its context before prewarm starts.
      while (current() && this.latest && this.latest.key !== this.storedKey) {
        const calendar = this.latest;
        const grant = this.grant!;
        const response = await this.options.fetch('/api/hexa/context', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${grant.capability}` },
          body: JSON.stringify({ sessionId: grant.id, calendar: calendar.value }), signal: abort.signal,
        });
        if (!current()) return;
        if (!response.ok) {
          if ((response.status === 401 || response.status === 403) && this.installed) { this.replace(); return; }
          throw new Error('context_failed');
        }
        const receipt: unknown = await response.json();
        if (!current()) return;
        if (
          !record(receipt) || Object.keys(receipt).sort().join(',') !== 'contextRevision,contextSha256,ready' ||
          receipt.ready !== true || typeof receipt.contextRevision !== 'number' ||
          !Number.isSafeInteger(receipt.contextRevision) || receipt.contextRevision <= 0 ||
          typeof receipt.contextSha256 !== 'string' || !protectedId.test(receipt.contextSha256)
        ) throw new Error('context_receipt_invalid');
        this.storedKey = calendar.key;
        // The sealed iframe receipt has no revision field. A repeated hash
        // after another context cannot prove which revision was applied, so
        // leave that acknowledgement pending rather than accept a queued one.
        this.expectedReceipt = this.storedHashes.has(receipt.contextSha256) ? null : receipt.contextSha256;
        this.storedHashes.add(receipt.contextSha256);
      }
      if (!current()) return;
      this.options.onSyncState('stored');
      const installGrant = !this.installed;
      if (installGrant) this.installed = true;
      this.options.getFrame()?.postMessage(installGrant
        ? { type: 'HEXA_PROTECTED_SESSION', grant: this.grant, start: true }
        : { type: 'HEXA_PROTECTED_CONTEXT_UPDATED' }, this.options.workerOrigin);
    };
    const pending = run().catch(() => {
      if (current()) { this.expectedReceipt = null; this.options.onSyncState('error'); }
    }).finally(() => {
      if (this.pending === pending) { this.pending = null; this.abort = null; }
    });
    this.pending = pending;
  }
}
