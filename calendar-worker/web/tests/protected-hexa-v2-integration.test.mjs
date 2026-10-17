import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { after, test } from 'node:test';
import { sourceLoader, hexaRoot, calendarRoot } from './protected-hexa-source.mjs';

const origin = 'https://infflow-calendar.prabhatravib.workers.dev';
const hexaOrigin = 'https://hexa-worker-v2.prabhatravib.workers.dev';
const chesky = 'https://infflow-brianchesky.prabhatravib.workers.dev';
const descriptors = Object.fromEntries(['fetch', 'window', 'location', 'document', 'localStorage', 'AudioContext'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const originalNow = Date.now;
let clock = 1_800_000_000_000;
Date.now = () => clock;
globalThis.fetch = () => { throw new Error('Network forbidden'); };
globalThis.localStorage = { getItem: () => null };
globalThis.AudioContext = class { constructor() { throw new Error('Media forbidden'); } };
after(() => {
  Date.now = originalNow;
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
});
const settle = async () => { for (let i = 0; i < 15; i++) await new Promise(resolve => setImmediate(resolve)); };
const until = async predicate => { for (let i = 0; i < 150; i++) { if (predicate()) return; await settle(); } assert.fail('Offline transition did not settle'); };
const hash = value => createHash('sha256').update(value).digest('hex');
const load = sourceLoader({
  'cloudflare:email': { EmailMessage: class { constructor() { throw new Error('Delivery forbidden'); } } },
  mimetext: { createMimeMessage() { throw new Error('Delivery forbidden'); } },
});
const app = load(resolve(calendarRoot, 'calendar-worker/worker/index.ts')).default;
const { buildCalendarContext } = load(resolve(calendarRoot, 'calendar-worker/worker/protectedHexa/calendarContext.ts'));
const { ProtectedHexaBridge } = load(resolve(calendarRoot, 'calendar-worker/web/src/lib/protectedHexaBridge.ts'));
const { ProtectedVoiceControl, ProtectedVoiceSession, default: worker } = load(resolve(hexaRoot, 'src/worker/voice/protectedVoice/worker.ts'));
const { FakeScheduler, MockUpstream, FakeSocket, CHROME_AUDIO_OFFER } = load(resolve(hexaRoot, 'tests/unit/voice-control-plane/harness.ts'));

function facts(location = 'New York') {
  return { view: 'day', currentDate: '2026-10-16', timeZone: 'America/New_York', locale: 'en-US', location, events: [],
    weather: { view: 'day', startDate: '2026-10-16', endDate: '2026-10-16', totalDays: 1, forecast: [], badWeatherEvents: [],
      unavailableDates: ['2026-10-16'], units: { temperatureMin: '°F', temperatureMax: '°F', precipitationProbability: '%', windSpeed: 'km/h' } }, currentWeather: null };
}
class Storage {
  values = new Map(); alarm = null;
  async get(key) { return structuredClone(this.values.get(key)); }
  async put(key, value) { this.values.set(key, structuredClone(value)); }
  async delete(key) { return this.values.delete(key); }
  async list() { return new Map(this.values); }
  async setAlarm(time) { this.alarm = time; }
  async deleteAlarm() { this.alarm = null; }
}
function environment() {
  let serial = 0;
  let deliveryAttempts = 0;
  const instances = new Map();
  const providers = new Map();
  const scheduler = new FakeScheduler();
  const env = { OPENAI_API_KEY: '', PROTECTED_VOICE_CALLS: '1',
    PROTECTED_APP_ORIGINS: `calendar=${origin},chesky=${chesky}`,
    VOICE_SESSION: new Proxy({}, { get() { throw new Error('Legacy namespace forbidden'); } }),
    SEB: { send() { deliveryAttempts++; throw new Error('Delivery forbidden'); } },
  };
  const id = value => ({ toString: () => value });
  env.PROTECTED_VOICE = {
    newUniqueId: () => id((++serial).toString(16).padStart(64, '0')), idFromString: id,
    get: objectId => ({ fetch: async request => {
      const value = objectId.toString();
      if (!instances.has(value)) {
        let initialized;
        const state = { id: objectId, storage: new Storage(), waitUntil() {}, blockConcurrencyWhile(callback) { initialized = callback(); } };
        const instance = new ProtectedVoiceSession(state, env);
        instance.scheduler = scheduler;
        const upstream = new MockUpstream(); providers.set(value, upstream);
        const makeHost = instance.makeHost.bind(instance);
        instance.makeHost = (...args) => {
          const host = makeHost(...args);
          host.deps.upstream = upstream; host.deps.scheduler = scheduler; host.deps.log = () => {};
          return host;
        };
        instances.set(value, instance); await initialized;
      }
      return instances.get(value).fetch(request);
    } }),
  };
  const control = new ProtectedVoiceControl({}, env);
  const hostEnv = { HEXA_PROTECTED_CONTROL: control };
  const hostFetch = (path, init) => app.fetch(new Request(`${origin}${path}`, {
    ...init, headers: { ...init.headers, Origin: origin },
  }), hostEnv);
  const protectedFetch = (path, init = {}) => worker.fetch(new Request(`${hexaOrigin}${path}`, init), env);
  const write = (grant, calendar = facts(), extra = {}) => hostFetch('/api/hexa/context', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${grant.capability}` },
    body: JSON.stringify({ sessionId: grant.id, calendar, ...extra }),
  });
  const status = async grant => (await protectedFetch(`/protected/sessions/${grant.id}/status`, { headers: { Authorization: `Bearer ${grant.capability}` } })).json();
  return { env, control, instances, providers, scheduler, hostEnv, hostFetch, protectedFetch, write, status, deliveryAttempts: () => deliveryAttempts };
}

function association(h, localId = 'calendar-local') {
  const states = [], outgoing = [], incoming = [], queued = [], sockets = [];
  let adapter, grant, replacements = 0, holdReceipts = false, connectError;
  const frame = { postMessage(message, target) {
    assert.equal(target, hexaOrigin); outgoing.push(message);
    if (message.type === 'HEXA_PROTECTED_SESSION') {
      grant = message.grant;
      assert.equal(message.start, true);
      assert.equal(h.instances.get(grant.id).state.storage.values.get('ownership').contextRevision > 0, true, 'context before prewarm');
      adapter = new ProtectedBrowserSession(grant, { muted: true });
      context.setActiveSession(adapter);
      void adapter.connect().then(() => context.injectExternalContext(null)).catch(error => { connectError = error; });
    } else if (message.type === 'HEXA_PROTECTED_CONTEXT_UPDATED') {
      void context.injectExternalContext(null).catch(error => { connectError = error; });
    }
  } };
  const parent = { postMessage(message, target) {
    assert.equal(target, origin); incoming.push(message);
    if (holdReceipts && message.type === 'HEXA_CONTEXT_INJECTED') queued.push(message);
    else bridge.handleMessage({ source: frame, origin: hexaOrigin, data: message });
  } };
  globalThis.window = { parent, location: { search: `?sessionId=${localId}` } };
  globalThis.location = { origin: hexaOrigin, search: `?sessionId=${localId}` };
  globalThis.document = { referrer: `${origin}/` };
  globalThis.fetch = h.protectedFetch;
  // The real adapter controls lifecycle/receipt identity. The native media/WS
  // transport is inert and forwards only to real local Worker/DO entrypoints.
  class InertTransport {
    status = 'new'; microphoneTrack = null; peerConnection = null;
    constructor(_audio, options) { this.options = options; }
    on() {}
    async connect() {
      const result = await this.options.fetch('/inert', { method: 'POST', body: JSON.stringify({ sdp: CHROME_AUDIO_OFFER }) });
      assert.equal(result.status, 201); const body = await result.json();
      const instance = h.instances.get(grant.id), session = instance.host.session;
      const socket = new FakeSocket(); socket.handlers = session.attachSubscriber(socket); sockets.push(socket);
      socket.say({ type: 'subscribe', ownerToken: body.session.ownerToken });
      this.status = 'connecting';
      await new Promise(resolve => { this.finish = resolve; }); this.status = 'ready';
    }
    async application(command) {
      sockets.at(-1).say({ type: 'application_command', commandId: `command-${outgoing.length}`, generation: adapter.wireGeneration, ...command });
      return { ok: true };
    }
    close() { this.status = 'closed'; }
  }
  const browserLoad = sourceLoader({ '../controlPlaneSpike/transport': { ControlPlaneSpikeTransport: InertTransport },
    '../controlPlaneSpike/playbackOnset': { startLevelMeter() { throw new Error('Media forbidden'); } },
    '@/frontend/lib/voiceCommandControl': { applyVoiceSoftMute() { throw new Error('Native controls forbidden in receipt test'); } },
    '@/frontend/lib/visualCommandControl': { applyVisualCurtain() { throw new Error('Native controls forbidden in receipt test'); } },
    '@/frontend/store/hexaStore': { useHexaStore: { getState: () => ({ isVoiceDisabled: true }) } },
  });
  const { ProtectedBrowserSession } = browserLoad(resolve(hexaRoot, 'src/frontend/hooks/protectedVoice/session.ts'));
  const context = browserLoad(resolve(hexaRoot, 'src/frontend/hooks/protectedVoice/externalContext.ts'));
  const bridge = new ProtectedHexaBridge({ workerOrigin: hexaOrigin, parentOrigin: origin, sessionId: localId,
    getFrame: () => frame, fetch: h.hostFetch, now: () => clock, onSyncState: state => states.push(state),
    onReplacement: () => { replacements++; }, onFrameReady() {}, onPresentation() {}, onConsoleEntry() {},
  });
  const boot = () => bridge.handleMessage({ source: frame, origin: hexaOrigin, data: { type: 'HEXA_PROTECTED_BOOT_READY', mode: 'normal' } });
  const ready = async () => {
    const receiptsBefore = incoming.filter(value => value.type === 'HEXA_CONTEXT_INJECTED').length;
    await until(() => adapter?.native.finish);
    const instance = h.instances.get(grant.id), upstream = h.providers.get(grant.id);
    upstream.confirmInputClears(); upstream.acknowledgeConfig(instance.host.deps.plan); await settle();
    assert.equal((await h.status(grant)).contextApplied, true, 'real controller acknowledged configuration');
    adapter.native.finish(); await until(() => adapter.contextReceiptGeneration() !== null);
    assert.equal(connectError, undefined);
    assert.equal(adapter.contextReceiptGeneration(), adapter.wireGeneration);
    await context.injectExternalContext(null);
    await until(() => incoming.filter(value => value.type === 'HEXA_CONTEXT_INJECTED').length > receiptsBefore);
  };
  const update = async calendar => {
    const receiptsBefore = incoming.filter(value => value.type === 'HEXA_CONTEXT_INJECTED').length;
    const upstream = h.providers.get(grant.id), previous = upstream.sent.filter(value => value.type === 'session.update').length;
    bridge.setCalendar(calendar);
    await until(() => upstream.sent.filter(value => value.type === 'session.update').length > previous);
    assert.equal(h.instances.get(grant.id).appliedRevision, 0);
    const latest = upstream.lastSent('session.update').session;
    upstream.acknowledgeConfig(h.instances.get(grant.id).host.deps.plan, { instructions: latest.instructions });
    await until(() => incoming.filter(value => value.type === 'HEXA_CONTEXT_INJECTED').length > receiptsBefore);
  };
  const close = async () => { bridge.dispose(); context.clearActiveSession(); adapter?.close(); if (grant) await h.instances.get(grant.id).host.close(); };
  const reconnect = () => {
    adapter.close();
    adapter = new ProtectedBrowserSession(grant, { muted: true });
    context.setActiveSession(adapter);
    return adapter.connect();
  };
  return { bridge, states, outgoing, incoming, queued, sockets, boot, ready, update, close, reconnect, context,
    adapter: () => adapter, grant: () => grant, frame, replacements: () => replacements,
    hold: value => { holdReceipts = value; },
    send: data => bridge.handleMessage({ source: frame, origin: hexaOrigin, data }),
  };
}

test('real Calendar Hono -> fixed-owner RPC -> serialized DO refuses foreign/invalid ownership before every effect', async () => {
  const h = environment();
  const result = await h.hostFetch('/api/hexa/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(result.status, 201); const { grant } = await result.json();
  const foreign = [await h.control.createSession('normal', chesky, 'chesky'), await h.control.createSession('narrator', chesky, 'chesky')];
  const other = await h.control.createSession('normal', origin, 'calendar');
  const snapshot = () => [...h.instances].map(([id, instance]) => [id, structuredClone(instance.state.storage.values), instance.state.storage.alarm,
    instance.activeGeneration, instance.appliedRevision, instance.host.snapshot(), h.providers.get(id).created.length, h.providers.get(id).sent.length]);
  const refuse = async pair => {
    const before = snapshot(), result = await h.write(pair);
    assert.equal(result.status, 503); assert.equal(await result.text(), '{"error":"calendar_context_contract_unavailable"}');
    assert.equal(result.headers.get('Access-Control-Allow-Origin'), null);
    assert.deepEqual(snapshot(), before); assert.equal(h.deliveryAttempts(), 0);
  };
  for (const pair of [...foreign, { ...grant, capability: other.capability }, { ...other, capability: grant.capability }, { ...grant, capability: 'f'.repeat(64) }]) await refuse(pair);
  const storage = h.instances.get(grant.id).state.storage, original = await storage.get('ownership');
  for (const mutation of [{ profile: 'chesky' }, { mode: 'narrator' }, { parentOrigin: chesky }, { expiresAt: clock - 1 }, { revoked: true }]) {
    await storage.put('ownership', { ...original, ...mutation }); await refuse(grant);
  }
  await storage.put('ownership', original);
  const stored = await h.write(grant); assert.equal(stored.status, 200);
  assert.deepEqual(await stored.json(), { ready: true, contextRevision: 1, contextSha256: hash(buildCalendarContext(facts())) });
  assert.equal((await h.status(grant)).contextApplied, false);
  assert.equal(h.providers.get(grant.id).created.length, 0);
  for (const extra of [{ profile: 'calendar' }, { mode: 'normal' }, { parentOrigin: origin }, { role: 'system' }, { policy: 'x' }, { tools: [] }, { instructions: 'x' }]) {
    const before = snapshot(); assert.equal((await h.write(grant, facts(), extra)).status, 400); assert.deepEqual(snapshot(), before);
  }
});

test('real bridge/adapter/controller/DO: stored is not applied; A -> B -> A requires newest revision and current generation', async () => {
  const h = environment(), a = association(h);
  try {
    a.bridge.setCalendar(facts()); a.boot(); a.boot(); assert.equal(h.instances.size, 0);
    a.bridge.frameLoaded(); await until(() => a.adapter()?.native.finish);
    assert.equal(a.states.at(-1), 'pending'); assert.equal((await h.status(a.grant())).contextApplied, false);
    assert.equal(a.incoming.some(value => value.type === 'HEXA_CONTEXT_INJECTED'), false);
    await a.ready(); assert.equal(a.states.at(-1), 'applied');
    const first = a.incoming.find(value => value.type === 'HEXA_CONTEXT_INJECTED');
    assert.equal(first.contextRevision, 1);
    a.boot(); a.boot(); a.bridge.setCalendar(facts()); await settle();
    assert.equal(h.instances.size, 1); assert.equal(h.providers.get(a.grant().id).created.length, 1, 'duplicate/hidden panel is inert');
    await a.update(facts('Boston')); assert.equal(a.states.at(-1), 'applied');
    a.hold(true); await a.update(facts()); assert.equal(a.states.at(-1), 'stored');
    a.send(first); assert.equal(a.states.at(-1), 'stored', 'queued revision 1 cannot apply revision 3');
    const newest = a.queued.at(-1); assert.equal(newest.contextRevision, 3); assert.equal(newest.contextSha256, first.contextSha256);
    a.send({ ...newest, sha256: 'f'.repeat(64) }); assert.equal(a.states.at(-1), 'stored');
    a.send(newest); assert.equal(a.states.at(-1), 'applied');
    a.send({ type: 'HEXA_PROTECTED_CALL_STATE', source: 'hexa-voice', sessionId: 'calendar-local', protectedSessionId: a.grant().id, generation: 1, state: 'closed' });
    assert.equal(a.states.at(-1), 'pending'); a.send(first); a.send(newest); assert.equal(a.states.at(-1), 'pending');
    a.send({ type: 'HEXA_PROTECTED_CALL_STATE', source: 'hexa-voice', sessionId: 'calendar-local', protectedSessionId: a.grant().id, generation: 1, state: 'ready' });
    a.send(newest); assert.equal(a.states.at(-1), 'pending', 'closed generation cannot be revived by old ready');
    const staleHost = h.instances.get(a.grant().id).host, staleSession = staleHost.session;
    await h.protectedFetch(`/protected/sessions/${a.grant().id}/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${a.grant().capability}` }, body: '{"retainContext":true}' });
    staleHost.deps.application.ready(staleSession); assert.equal((await h.status(a.grant())).contextApplied, false);
    // Reconnect the real adapter to the same protected grant; /calls advances to 3.
    a.hold(false); const reconnect = a.reconnect(); await a.ready(); await reconnect;
    await a.context.injectExternalContext(null); assert.equal(a.states.at(-1), 'applied');
    assert.equal(a.adapter().wireGeneration, 3);
    a.send({ ...newest, generation: 1 });
    a.send({ type: 'HEXA_PROTECTED_CALL_STATE', source: 'hexa-voice', sessionId: 'calendar-local', protectedSessionId: a.grant().id, generation: 1, state: 'closed' });
    a.send({ type: 'HEXA_PROTECTED_CALL_STATE', source: 'hexa-voice', sessionId: 'calendar-local', protectedSessionId: a.grant().id, generation: 0, state: 'connecting' });
    assert.equal(a.states.at(-1), 'applied', 'older receipts and lifecycle cannot change generation 3');
  } finally { await a.close(); }
});

test('same hash under a replacement grant and local association rejects old queued receipts; disposed write cannot start', async () => {
  const h = environment(), old = association(h);
  old.bridge.setCalendar(facts()); old.bridge.frameLoaded(); old.boot(); await old.ready();
  const stale = old.incoming.find(value => value.type === 'HEXA_CONTEXT_INJECTED');
  await old.close();
  const fresh = association(h); // Deliberately use the same local ID to prove grant matching too.
  try {
    fresh.hold(true); fresh.bridge.setCalendar(facts()); fresh.bridge.frameLoaded(); fresh.boot(); await fresh.ready();
    assert.notEqual(fresh.grant().id, stale.protectedSessionId);
    assert.equal(fresh.queued[0].contextSha256, stale.contextSha256);
    fresh.send(stale); assert.equal(fresh.states.at(-1), 'stored');
    fresh.send(fresh.queued[0]); assert.equal(fresh.states.at(-1), 'applied');
    fresh.bridge.frameLoaded(); assert.equal(fresh.replacements(), 1); assert.equal(fresh.states.at(-1), 'pending');
    fresh.send(fresh.queued[0]); assert.equal(fresh.states.at(-1), 'pending');
  } finally { await fresh.close(); }
});

test('an ambiguous failed initial write really stored revision 1; recovery obtains a fresh grant and current facts before starting', async () => {
  const h = environment(); let fail = true;
  h.hostEnv.HEXA_PROTECTED_CONTROL = {
    createSession: h.control.createSession.bind(h.control),
    async setContextForOwner(...args) {
      const result = await h.control.setContextForOwner(...args);
      if (fail) { fail = false; throw new Error('PRIVATE_ERROR_AFTER_STORAGE'); }
      return result;
    },
  };
  const a = association(h);
  try {
    a.bridge.setCalendar(facts()); a.bridge.frameLoaded(); a.boot(); await settle();
    assert.equal(a.states.at(-1), 'error'); assert.equal(a.outgoing.length, 0);
    const abandoned = [...h.instances.values()][0];
    assert.equal(abandoned.state.storage.values.get('ownership').contextRevision, 1);
    assert.equal([...h.providers.values()][0].created.length, 0);
    a.boot(); await settle(); assert.equal(h.instances.size, 1, 'no blind retry');
    a.bridge.setCalendar(facts('Boston')); await a.ready();
    assert.equal(h.instances.size, 2); assert.equal(a.states.at(-1), 'applied');
    assert.equal(a.incoming.find(value => value.type === 'HEXA_CONTEXT_INJECTED').contextSha256, hash(buildCalendarContext(facts('Boston'))));
    assert.equal(a.outgoing.filter(value => value.start === true).length, 1);
  } finally { await a.close(); }
});

test('context while connecting ends that call; stale ready/status cannot acknowledge the later revision', async () => {
  const h = environment(), a = association(h);
  try {
    a.bridge.setCalendar(facts()); a.bridge.frameLoaded(); a.boot(); await until(() => a.adapter()?.native.finish);
    const staleHost = h.instances.get(a.grant().id).host, staleSession = staleHost.session;
    a.bridge.setCalendar(facts('Boston')); await settle();
    assert.equal((await h.status(a.grant())).contextRevision, 2);
    assert.equal((await h.status(a.grant())).contextApplied, false);
    staleHost.deps.application.ready(staleSession);
    assert.equal((await h.status(a.grant())).contextApplied, false);
    assert.equal(a.incoming.some(value => value.type === 'HEXA_CONTEXT_INJECTED'), false);
    const reconnect = a.reconnect(); await a.ready(); await reconnect;
    assert.equal(a.states.at(-1), 'applied');
    assert.equal(a.incoming.at(-1).contextRevision, 2);
    let release, fetched = false;
    globalThis.fetch = async (path, init) => {
      const result = await h.protectedFetch(path, init); fetched = true;
      return new Promise(resolve => { release = () => resolve(result); });
    };
    const delayed = a.context.injectExternalContext(null); await until(() => fetched);
    const receiptsBefore = a.incoming.filter(value => value.type === 'HEXA_CONTEXT_INJECTED').length;
    a.adapter().close(); release(); await delayed;
    assert.equal(a.incoming.filter(value => value.type === 'HEXA_CONTEXT_INJECTED').length, receiptsBefore);
    assert.equal(a.states.at(-1), 'pending');
  } finally { await a.close(); }
});
