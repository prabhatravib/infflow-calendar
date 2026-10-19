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
  private latest: { value: ProtectedCalendarContext; key: string; version: number } | null = null;
  private storedVersion = 0;
  private expectedReceipt: { revision: number; sha256: string } | null = null;
  private readyGeneration: number | null = null;
  private highestGeneration = 0;
  private retiredGeneration = 0;
  private failed = false;
  private epoch = 0;
  private disposed = false;
  private loaded = false;
  private installed = false;
  private bootReady = false;
  private pending: Promise<void> | null = null;
  private abort: AbortController | null = null;

  constructor(private readonly options: BridgeOptions) {}

  setCalendar(value: ProtectedCalendarContext): void {
    if (this.disposed) return;
    const key = JSON.stringify(value);
    if (this.latest?.key === key) return;
    this.latest = { value, key, version: (this.latest?.version ?? 0) + 1 };
    this.expectedReceipt = null;
    this.options.onSyncState('pending');
    // A failed write may already have stored a revision. Only a fresh grant
    // may recover; never restore an earlier expectation or retry old facts.
    if (this.failed) {
      if (this.installed) { this.replace(); return; }
      this.invalidate();
    }
    this.synchronize();
  }

  frameLoaded(): void {
    if (this.disposed) return;
    // A real reload starts a fresh memory-only association and presentation restore.
    if (this.loaded) { this.replace(); return; }
    this.loaded = true;
    this.options.onFrameReady();
    this.synchronize();
  }

  handleMessage(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>): void {
    const frame = this.options.getFrame();
    if (this.disposed || !frame || event.origin !== this.options.workerOrigin || event.source !== frame || !record(event.data)) return;
    const data = event.data;
    if (data.type === 'HEXA_PROTECTED_BOOT_READY') {
      if (data.mode !== undefined && data.mode !== 'normal') return;
      // Duplicate readiness must not create another grant/call. An expired
      // installed grant needs a new association; native call recovery is Hexa's.
      if (this.installed) {
        if (this.grant && this.grant.expiresAt <= this.now()) this.replace();
        return;
      }
      if (this.failed) return;
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
    } else if (data.type === 'HEXA_PROTECTED_CALL_STATE') {
      if (!this.activeMessage(data) || Object.keys(data).sort().join(',') !==
        'generation,protectedSessionId,sessionId,source,state,type' ||
        !this.generation(data.generation, true) || typeof data.state !== 'string' || !['connecting', 'ready', 'closed'].includes(data.state)) return;
      const generation = data.generation as number;
      if (generation < this.highestGeneration) return;
      if (generation === 0) {
        if (data.state === 'ready') return;
        this.retiredGeneration = this.highestGeneration;
      } else {
        this.highestGeneration = generation;
        if (data.state === 'ready') {
          if (generation <= this.retiredGeneration) return;
          // A duplicate ready is inert, including after an applied receipt.
          if (this.readyGeneration === generation) return;
          this.readyGeneration = generation;
          this.options.onSyncState(this.expectedReceipt && this.latest?.version === this.storedVersion ? 'stored' : 'pending');
          return;
        }
        if (data.state === 'closed' || this.readyGeneration === generation) this.retiredGeneration = generation;
      }
      this.readyGeneration = null;
      this.options.onSyncState('pending');
    } else if (
      data.type === 'HEXA_CONTEXT_INJECTED' && this.activeMessage(data) &&
      Object.keys(data).sort().join(',') === 'contextRevision,contextSha256,generation,protectedSessionId,sessionId,sha256,source,type' &&
      this.generation(data.generation) && data.generation === this.readyGeneration &&
      this.latest?.version === this.storedVersion && this.expectedReceipt &&
      data.contextRevision === this.expectedReceipt.revision &&
      data.contextSha256 === this.expectedReceipt.sha256 && data.sha256 === data.contextSha256
    ) {
      this.options.onSyncState('applied');
    }
    // Calendar has no host action bridge. Its tools and Text/Voice transcript
    // routing remain owned by Hexa, rather than granting calendar CRUD here.
  }

  dispose(): void {
    if (this.disposed) return;
    this.options.onSyncState('pending');
    this.disposed = true;
    this.invalidate();
  }

  private now(): number { return this.options.now?.() ?? Date.now(); }

  private activeMessage(data: Record<string, unknown>): boolean {
    return data.source === 'hexa-voice' && !!this.grant && !this.failed && this.installed &&
      this.grant.expiresAt > this.now() && data.protectedSessionId === this.grant.id;
  }

  private generation(value: unknown, zero = false): boolean {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= (zero ? 0 : 1) && value <= 1_000_000;
  }

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
    this.storedVersion = 0;
    this.expectedReceipt = null;
    this.readyGeneration = null;
    this.highestGeneration = 0;
    this.retiredGeneration = 0;
    this.failed = false;
    if (!this.disposed) this.options.onSyncState('pending');
  }

  private readGrant(value: unknown): SessionGrant | null {
    if (!record(value) || Object.keys(value).sort().join(',') !== 'grant,serverNow' || !record(value.grant)) return null;
    const serverNow = value.serverNow;
    if (typeof serverNow !== 'number' || !Number.isSafeInteger(serverNow) || serverNow <= 0) return null;
    const grant = value.grant;
    if (Object.keys(grant).sort().join(',') !== 'capability,expiresAt,id,mode,parentOrigin') return null;
    if (
      typeof grant.id !== 'string' || !protectedId.test(grant.id) ||
      typeof grant.capability !== 'string' || !protectedId.test(grant.capability) ||
      grant.mode !== 'normal' || grant.parentOrigin !== this.options.parentOrigin ||
      typeof grant.expiresAt !== 'number' || !Number.isSafeInteger(grant.expiresAt) ||
      // The Worker clock bounds lifetime; browser time only checks expiry.
      grant.expiresAt <= this.now() || grant.expiresAt <= serverNow || grant.expiresAt > serverNow + 7_200_000
    ) return null;
    return grant as unknown as SessionGrant;
  }

  private synchronize(): void {
    if (this.disposed || this.failed || !this.loaded || !this.bootReady || !this.latest || this.pending) return;
    if (this.grant && this.grant.expiresAt <= this.now()) {
      if (this.installed) { this.replace(); return; }
      this.invalidate();
    }
    if (this.grant && this.latest.version === this.storedVersion) return;
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
      while (current() && this.latest && this.latest.version !== this.storedVersion) {
        const calendar = this.latest;
        const grant = this.grant!;
        const response = await this.options.fetch('/api/hexa/context', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${grant.capability}` },
          body: JSON.stringify({ sessionId: grant.id, calendar: calendar.value }), signal: abort.signal,
        });
        if (!current()) return;
        if (!response.ok) {
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
        this.storedVersion = calendar.version;
        this.expectedReceipt = this.latest?.version === calendar.version
          ? { revision: receipt.contextRevision, sha256: receipt.contextSha256 } : null;
      }
      if (!current()) return;
      if (!this.grant || this.grant.expiresAt <= this.now()) throw new Error('grant_expired');
      this.options.onSyncState('stored');
      const installGrant = !this.installed;
      if (installGrant) this.installed = true;
      this.options.getFrame()?.postMessage(installGrant
        ? { type: 'HEXA_PROTECTED_SESSION', grant: this.grant, start: true }
        : { type: 'HEXA_PROTECTED_CONTEXT_UPDATED' }, this.options.workerOrigin);
    };
    const pending = run().catch(() => {
      if (current()) {
        this.expectedReceipt = null;
        this.readyGeneration = null;
        this.failed = true;
        this.options.onSyncState('error');
      }
    }).finally(() => {
      if (this.pending === pending) {
        this.pending = null;
        this.abort = null;
        this.synchronize();
      }
    });
    this.pending = pending;
  }
}
