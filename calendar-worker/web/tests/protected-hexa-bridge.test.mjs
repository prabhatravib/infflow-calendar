import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { after, test } from 'node:test';
import ts from 'typescript';

// All imports execute locally. Network/provider/media boundaries are inert.
const previousFetch = globalThis.fetch;
const previousStorage = globalThis.localStorage;
const previousTimezone = process.env.TZ;
globalThis.fetch = () => { throw new Error('Unmocked network is forbidden'); };
globalThis.localStorage = { getItem: () => null };
process.env.TZ = 'America/New_York';
after(() => {
  globalThis.fetch = previousFetch;
  if (previousStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousStorage;
  if (previousTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = previousTimezone;
});

function loadTs(source, overrides = {}, cache = new Map()) {
  const url = source instanceof URL ? source : pathToFileURL(source);
  if (cache.has(url.href)) return cache.get(url.href);
  const exports = {};
  cache.set(url.href, exports);
  const require = createRequire(url);
  const localRequire = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (!name.startsWith('.')) return require(name);
    const base = path.resolve(path.dirname(fileURLToPath(url)), name);
    const target = [base, `${base}.ts`, path.join(base, 'index.ts')].find(candidate => existsSync(candidate) && statSync(candidate).isFile());
    if (target?.endsWith('.ts')) return loadTs(target, overrides, cache);
    return require(name);
  };
  const input = fileURLToPath(url).endsWith(`${path.sep}worker${path.sep}protectedHexa${path.sep}routes.ts`) && process.env.CALENDAR_TEST_ROUTE_CANDIDATE
    ? path.resolve(process.env.CALENDAR_TEST_ROUTE_CANDIDATE) : url;
  const { outputText } = ts.transpileModule(readFileSync(input, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  new Function('require', 'exports', outputText)(localRequire, exports);
  return exports;
}

const { ProtectedHexaBridge, seedHexaPresentation } = loadTs(new URL('../src/lib/protectedHexaBridge.ts', import.meta.url));
const { createProtectedCalendarContext } = loadTs(new URL('../src/lib/protectedCalendarContext.ts', import.meta.url));
const { getCalendarWeatherContext } = loadTs(new URL('../src/lib/calendarWeatherContext.ts', import.meta.url));
const { protectedHexaRouter, CALENDAR_PARENT_ORIGIN } = loadTs(new URL('../../worker/protectedHexa/routes.ts', import.meta.url));
const hexaRoot = new URL('../../../../hexa-v2/', import.meta.url);
const presentation = loadTs(new URL('src/frontend/lib/narratorPresentation.ts', hexaRoot));
const origin = 'https://hexa-worker-v2.prabhatravib.workers.dev';
const hash = text => createHash('sha256').update(text).digest('hex');
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
const deferred = () => {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
};
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

function calendarFixture(view = 'week', selected = '2026-09-13T21:45:00') {
  const data = {
    events: [{ id: 'e1', title: 'Appointment', start: '2026-09-07T09:00:00-04:00', end: '2026-09-07T10:00:00-04:00', tz: 'America/New_York', description: null, eventType: 'work' }],
    currentView: view, currentDate: new Date(selected), location: 'New York',
    weatherData: {
      current_weather: { temperature: 68 }, current_weather_units: { temperature: '°F' },
      daily: { time: ['2026-09-07'], temperature_2m_min: [55], temperature_2m_max: [72], precipitation_probability_max: [null], windspeed_10m_max: [9], weathercode: [0] },
      daily_units: { temperature_2m_min: '°F', temperature_2m_max: '°F', windspeed_10m_max: 'km/h', precipitation_probability_max: '%' },
    },
  };
  return createProtectedCalendarContext(data, getCalendarWeatherContext(data.weatherData, view, data.currentDate), 'America/New_York', 'en-US');
}

function bridgeHarness(fetcher) {
  const frame = { postMessage: (data, target) => messages.push({ data, target }) };
  const messages = [];
  const states = [];
  const requests = [];
  const snapshots = [];
  const logs = [];
  let replacements = 0;
  let now = Date.now();
  let grants = 0;
  const grant = () => ({ id: String(++grants).padStart(64, '0'), capability: 'b'.repeat(64), mode: 'normal', expiresAt: now + 7_200_000, parentOrigin: CALENDAR_PARENT_ORIGIN });
  const fixtureFetch = async (url, init) => {
    requests.push({ url, init, body: JSON.parse(init.body) });
    if (fetcher) return fetcher(url, init, grant);
    if (url === '/api/hexa/session') return json({ grant: grant() }, 201);
    return json({ ready: true, contextRevision: requests.filter(request => request.url === '/api/hexa/context').length, contextSha256: hash(init.body) });
  };
  const bridge = new ProtectedHexaBridge({
    workerOrigin: origin, parentOrigin: CALENDAR_PARENT_ORIGIN, sessionId: 'local-session',
    getFrame: () => frame, fetch: fixtureFetch, onSyncState: state => states.push(state),
    onFrameReady: () => {}, onReplacement: () => { replacements++; },
    onPresentation: snapshot => snapshots.push(snapshot), onConsoleEntry: value => logs.push(value), now: () => now,
  });
  const send = (data, from = origin, source = frame) => bridge.handleMessage({ data, origin: from, source });
  const boot = () => send({ type: 'HEXA_PROTECTED_BOOT_READY', mode: 'normal' });
  const callState = (state = 'ready', generation = 1, protectedSessionId = messages[0]?.data.grant.id) => send({
    type: 'HEXA_PROTECTED_CALL_STATE', sessionId: 'local-session', source: 'hexa-voice', protectedSessionId, generation, state,
  });
  const applied = (sha256, contextRevision = requests.filter(request => request.url === '/api/hexa/context').length, generation = 1) => {
    callState('ready', generation);
    send({ type: 'HEXA_CONTEXT_INJECTED', sessionId: 'local-session', source: 'hexa-voice', sha256,
      contextSha256: sha256, contextRevision, generation, protectedSessionId: messages[0]?.data.grant.id });
  };
  return { bridge, frame, messages, states, requests, snapshots, logs, send, boot, applied, callState, replacements: () => replacements, advance: milliseconds => { now += milliseconds; } };
}

test('calendar construction keeps local dates, timezone, units and explicit unavailable weather without browser policy', () => {
  const context = calendarFixture();
  assert.equal(context.currentDate, '2026-09-13');
  assert.equal(context.timeZone, 'America/New_York');
  assert.deepEqual([context.weather.startDate, context.weather.endDate], ['2026-09-07', '2026-09-13']);
  assert.equal(context.weather.unavailableDates.length, 6);
  assert.equal(context.weather.forecast[0].precipitationProbability, null);
  assert.equal(context.weather.units.windSpeed, 'km/h');
  assert.equal(context.currentWeather.unit, '°F');
  assert.equal(Object.hasOwn(context.events[0], 'description'), false);
  assert.equal(Object.hasOwn(context, 'prompt'), false);
  assert.equal(Object.hasOwn(context, 'mermaidCode'), false);
  const day = calendarFixture('day', '2026-11-01T21:45:00');
  assert.deepEqual([day.weather.startDate, day.weather.endDate, day.weather.unavailableDates], ['2026-11-01', '2026-11-01', ['2026-11-01']]);
});

test('candidate queue holds early context, coalesces readiness and sends start only after latest stored context', async () => {
  const gate = deferred();
  let contextWrites = 0;
  const h = bridgeHarness(async (url, init, grant) => {
    if (url === '/api/hexa/session') return json({ grant: grant() }, 201);
    contextWrites++;
    if (contextWrites === 1) await gate.promise;
    return json({ ready: true, contextRevision: contextWrites, contextSha256: hash(init.body) });
  });
  const first = calendarFixture();
  h.bridge.setCalendar(first);
  h.boot(); h.boot();
  assert.equal(h.requests.length, 0);
  h.bridge.frameLoaded();
  await settle();
  assert.equal(h.requests.length, 2);
  assert.equal(h.messages.length, 0);
  const latest = { ...first, location: 'Boston' };
  h.bridge.setCalendar(latest);
  gate.resolve(); await settle();
  assert.equal(h.requests.filter(({ url }) => url === '/api/hexa/session').length, 1);
  assert.equal(h.requests.at(-1).body.calendar.location, 'Boston');
  assert.equal(h.messages.length, 1);
  assert.equal(h.messages[0].data.type, 'HEXA_PROTECTED_SESSION');
  assert.equal(h.messages[0].data.start, true);
  assert.equal(h.messages[0].target, origin);
  assert.equal(h.states.at(-1), 'stored');
  h.applied(hash(h.requests[1].init.body));
  assert.equal(h.states.at(-1), 'stored');
  h.applied(hash(h.requests.at(-1).init.body));
  assert.equal(h.states.at(-1), 'applied');
  h.bridge.setCalendar(latest); await settle();
  assert.equal(h.requests.length, 3);
  h.bridge.dispose();
});

test('actual blocked host routes return503 without RPC and never grant or prewarm the iframe', async () => {
  let calls = 0;
  const binding = { createSession: () => { calls++; throw new Error('forbidden'); }, setContext: () => { calls++; throw new Error('forbidden'); } };
  const h = bridgeHarness((url, init) => protectedHexaRouter.fetch(new Request(`${CALENDAR_PARENT_ORIGIN}${url}`, {
    ...init, headers: { ...init.headers, Origin: CALENDAR_PARENT_ORIGIN },
  }), { HEXA_PROTECTED_CONTROL: binding }));
  h.bridge.setCalendar(calendarFixture()); h.bridge.frameLoaded(); h.boot(); await settle();
  assert.equal(h.states.at(-1), 'error');
  assert.equal(h.messages.length, 0);
  assert.equal(calls, 0);
  const response = await protectedHexaRouter.fetch(new Request(`${CALENDAR_PARENT_ORIGIN}/api/hexa/context`, {
    method: 'POST', headers: { Origin: CALENDAR_PARENT_ORIGIN, 'Content-Type': 'application/json', Authorization: `Bearer ${'b'.repeat(64)}` },
    body: JSON.stringify({ sessionId: 'a'.repeat(64), calendar: calendarFixture() }),
  }), { HEXA_PROTECTED_CONTROL: binding });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'calendar_context_contract_unavailable' });
  assert.equal(calls, 0);
  h.bridge.dispose();
});

test('origin, source, mode and session refusals leave actions, transcripts and diagnostics inert', async () => {
  const h = bridgeHarness();
  h.bridge.setCalendar(calendarFixture()); h.bridge.frameLoaded();
  h.send({ type: 'HEXA_PROTECTED_BOOT_READY' }, 'https://wrong.example');
  h.send({ type: 'HEXA_PROTECTED_BOOT_READY' }, origin, {});
  h.send({ type: 'HEXA_PROTECTED_BOOT_READY', mode: 'narrator' });
  assert.equal(h.requests.length, 0);
  h.boot(); await settle();
  const receipt = hash(h.requests.at(-1).init.body);
  h.send({ type: 'HEXA_CONTEXT_INJECTED', sessionId: 'old-session', source: 'hexa-voice', sha256: receipt });
  h.send({ type: 'HEXA_DIAGRAM_INJECTED', sessionId: 'local-session', source: 'hexa-voice' });
  assert.equal(h.states.at(-1), 'stored');
  for (const action of ['create_calendar_event', 'send_email', 'send_notification', 'codegen_create_flow']) {
    h.send({ type: 'HEXA_APP_ACTION_REQUEST', sessionId: 'local-session', requestId: action, action: { name: action } });
  }
  h.send({ type: 'HEXA_RESPONSE_TEXT', sessionId: 'local-session', text: 'completed' });
  h.send({ type: 'HEXA_CONSOLE_LOG', payload: { sessionId: 'old-session', method: 'info', message: 'old' } });
  assert.equal(h.messages.length, 1);
  assert.equal(h.logs.length, 0);
  h.applied(receipt); assert.equal(h.states.at(-1), 'applied');
  h.send({ type: 'HEXA_CONSOLE_LOG', payload: { sessionId: 'local-session', method: 'info', message: 'bounded' } });
  assert.equal(h.logs.length, 1);
  h.bridge.dispose();
});

test('candidate live context changes notify readiness without another session or provider start', async () => {
  const h = bridgeHarness(); const context = calendarFixture();
  h.bridge.setCalendar(context); h.bridge.frameLoaded(); h.boot(); await settle();
  const oldReceipt = hash(h.requests.at(-1).init.body);
  h.bridge.setCalendar({ ...context, events: [] }); await settle();
  assert.deepEqual(h.messages.map(({ data }) => data.type), ['HEXA_PROTECTED_SESSION', 'HEXA_PROTECTED_CONTEXT_UPDATED']);
  assert.equal(h.requests.filter(({ url }) => url === '/api/hexa/session').length, 1);
  h.applied(oldReceipt); assert.equal(h.states.at(-1), 'stored');
  h.applied(hash(h.requests.at(-1).init.body)); assert.equal(h.states.at(-1), 'applied');
  h.bridge.dispose();
});

test('candidate ambiguous context failure gets a fresh grant on new facts and installs once after success', async () => {
  let writes = 0;
  const h = bridgeHarness(async (url, init, grant) => {
    if (url === '/api/hexa/session') return json({ grant: grant() }, 201);
    if (++writes === 1) return json({ error: 'unavailable' }, 503);
    return json({ ready: true, contextRevision: 1, contextSha256: hash(init.body) });
  });
  const context = calendarFixture();
  h.bridge.setCalendar(context); h.bridge.frameLoaded(); h.boot(); await settle();
  assert.equal(h.states.at(-1), 'error');
  assert.equal(h.messages.length, 0);
  h.bridge.setCalendar({ ...context, location: 'Boston' }); await settle();
  assert.equal(h.requests.filter(({ url }) => url === '/api/hexa/session').length, 2);
  assert.deepEqual(h.messages.map(({ data }) => [data.type, data.start]), [['HEXA_PROTECTED_SESSION', true]]);
  h.bridge.dispose();
});

test('candidate repeated context hash after another revision cannot accept a queued former acknowledgement', async () => {
  const h = bridgeHarness();
  const first = calendarFixture();
  h.bridge.setCalendar(first); h.bridge.frameLoaded(); h.boot(); await settle();
  const firstHash = hash(h.requests.at(-1).init.body);
  h.applied(firstHash); assert.equal(h.states.at(-1), 'applied');
  h.bridge.setCalendar({ ...first, location: 'Boston' }); await settle();
  h.bridge.setCalendar(first); await settle();
  h.applied(firstHash, 1);
  assert.equal(h.states.at(-1), 'stored');
  h.applied(firstHash, 3);
  assert.equal(h.states.at(-1), 'applied');
  assert.equal(h.messages.length, 3);
  assert.equal(h.requests.filter(({ url }) => url === '/api/hexa/session').length, 1);
  h.bridge.dispose();
});

test('candidate expiry, fresh grant request and iframe reload rotate local association before accepting another receipt', async () => {
  for (const trigger of ['expiry', 'boot', 'reload']) {
    const h = bridgeHarness();
    h.bridge.setCalendar(calendarFixture()); h.bridge.frameLoaded(); h.boot(); await settle();
    const receipt = hash(h.requests.at(-1).init.body);
    if (trigger === 'expiry') {
      h.advance(7_200_001); h.bridge.setCalendar({ ...calendarFixture(), location: 'Boston' });
    } else if (trigger === 'boot') { h.advance(7_200_001); h.boot(); }
    else h.bridge.frameLoaded();
    await settle();
    assert.equal(h.replacements(), 1, trigger);
    assert.equal(h.messages.length, 1, trigger);
    assert.equal(h.requests.filter(({ url }) => url === '/api/hexa/session').length, 1, trigger);
    h.applied(receipt);
    assert.notEqual(h.states.at(-1), 'applied', trigger);
  }
});

test('reset/stop dispose stale async bootstrap; new page rebuilds current context rather than persisting capabilities', async () => {
  const gate = deferred();
  const old = bridgeHarness(async (_url, _init, grant) => { await gate.promise; return json({ grant: grant() }, 201); });
  old.bridge.setCalendar(calendarFixture()); old.bridge.frameLoaded(); old.boot();
  old.bridge.dispose(); gate.resolve(); await settle();
  assert.equal(old.messages.length, 0);
  assert.equal(old.requests.length, 1);
  const fresh = bridgeHarness();
  fresh.bridge.setCalendar({ ...calendarFixture(), location: 'Restored view' }); fresh.bridge.frameLoaded(); fresh.boot(); await settle();
  assert.equal(fresh.requests.at(-1).body.calendar.location, 'Restored view');
  assert.equal(fresh.requests[0].init.headers.Authorization, undefined);
  assert.equal(fresh.messages[0].data.start, true);
  fresh.bridge.dispose();
});

test('invalid candidate grants/receipts are bounded errors with no start', async () => {
  for (const bad of ['mode', 'origin', 'expired', 'extra', 'receipt']) {
    const h = bridgeHarness(async (url, init, grant) => {
      if (url !== '/api/hexa/session') return json({ ready: true, contextRevision: 1, contextSha256: 'invalid' });
      const value = grant();
      if (bad === 'mode') value.mode = 'narrator';
      if (bad === 'origin') value.parentOrigin = 'https://wrong.example';
      if (bad === 'expired') value.expiresAt = 1;
      if (bad === 'extra') value.instructions = 'forbidden';
      return json({ grant: value });
    });
    h.bridge.setCalendar(calendarFixture()); h.bridge.frameLoaded(); h.boot(); await settle();
    assert.equal(h.states.at(-1), 'error', bad);
    assert.equal(h.messages.length, 0, bad);
    h.bridge.dispose();
  }
});

test('version-2 receipts require exact schema, source, current grant, ready generation and revision/hash tuple', async () => {
  const h = bridgeHarness();
  h.bridge.setCalendar(calendarFixture()); h.bridge.frameLoaded(); h.boot(); await settle();
  const receipt = { type: 'HEXA_CONTEXT_INJECTED', source: 'hexa-voice', sessionId: 'local-session',
    protectedSessionId: h.messages[0].data.grant.id, generation: 1, contextRevision: 1,
    contextSha256: hash(h.requests.at(-1).init.body), sha256: hash(h.requests.at(-1).init.body) };
  h.send(receipt); assert.equal(h.states.at(-1), 'stored', 'storage/hash alone is not applied');
  h.send({ type: 'HEXA_VOICE_READY', sessionId: 'local-session' });
  h.send({ type: 'HEXA_DIAGRAM_INJECTED', sessionId: 'local-session', source: 'hexa-voice' });
  assert.equal(h.states.at(-1), 'stored');
  h.callState();
  for (const bad of [{ ...receipt, source: 'wrong' }, { ...receipt, protectedSessionId: 'f'.repeat(64) },
    { ...receipt, generation: 0 }, { ...receipt, generation: 2 }, { ...receipt, contextRevision: 2 },
    { ...receipt, contextSha256: 'f'.repeat(64) }, { ...receipt, sha256: 'f'.repeat(64) }, { ...receipt, extra: true },
    Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== 'contextRevision'))]) {
    h.send(bad); assert.equal(h.states.at(-1), 'stored');
  }
  h.send(receipt, 'https://wrong.example'); h.send(receipt, origin, {}); assert.equal(h.states.at(-1), 'stored');
  h.send(receipt); assert.equal(h.states.at(-1), 'applied');
  h.callState(); h.boot(); h.boot(); assert.equal(h.states.at(-1), 'applied');
  assert.equal(h.requests.length, 2); assert.equal(h.replacements(), 0);
  h.callState('connecting', 2); h.send(receipt); assert.equal(h.states.at(-1), 'pending');
  h.callState('ready', 2); h.send({ ...receipt, generation: 2 }); assert.equal(h.states.at(-1), 'applied');
  h.callState('closed', 1); h.callState('connecting', 0); assert.equal(h.states.at(-1), 'applied');
  h.callState('closed', 2); h.callState('ready', 2); h.send({ ...receipt, generation: 2 }); assert.equal(h.states.at(-1), 'pending');
  h.bridge.dispose();
});

test('serialized A -> B -> A during an in-flight write needs a new revision; disposal inerts old context responses', async () => {
  for (const dispose of [false, true]) {
    const gate = deferred(); let revision = 0;
    const h = bridgeHarness(async (url, init, grant) => {
      if (url === '/api/hexa/session') return json({ grant: grant() });
      const current = ++revision; if (current === 1) await gate.promise;
      return json({ ready: true, contextRevision: current, contextSha256: hash(init.body) });
    });
    const a = calendarFixture(); h.bridge.setCalendar(a); h.bridge.frameLoaded(); h.boot(); await settle();
    h.bridge.setCalendar({ ...a, location: 'B' }); h.bridge.setCalendar(a);
    if (dispose) h.bridge.dispose(); gate.resolve(); await settle();
    if (dispose) { assert.equal(h.messages.length, 0); assert.equal(revision, 1); }
    else {
      assert.equal(revision, 2); assert.equal(h.messages.length, 1);
      const sha = hash(h.requests.at(-1).init.body);
      h.applied(sha, 1); assert.equal(h.states.at(-1), 'stored');
      h.applied(sha, 2); assert.equal(h.states.at(-1), 'applied');
    }
    h.bridge.dispose();
  }
});

test('a failed live write clears old expectations and waits for new facts/reset before grant replacement', async () => {
  let writes = 0;
  const h = bridgeHarness(async (url, init, grant) => url === '/api/hexa/session'
    ? json({ grant: grant() }) : ++writes === 1
      ? json({ ready: true, contextRevision: 1, contextSha256: hash(init.body) }) : json({ error: 'bounded' }, 503));
  const a = calendarFixture(); h.bridge.setCalendar(a); h.bridge.frameLoaded(); h.boot(); await settle();
  const oldHash = hash(h.requests.at(-1).init.body); h.applied(oldHash); assert.equal(h.states.at(-1), 'applied');
  h.bridge.setCalendar({ ...a, location: 'B' }); await settle(); assert.equal(h.states.at(-1), 'error');
  h.applied(oldHash); h.boot(); await settle(); assert.equal(h.states.at(-1), 'error');
  assert.equal(h.replacements(), 0); assert.equal(h.requests.length, 3);
  h.bridge.setCalendar(a); assert.equal(h.replacements(), 1); assert.equal(h.states.at(-1), 'pending');
});

test('a grant expiring during the initial write is never started', async () => {
  const gate = deferred();
  const h = bridgeHarness(async (url, init, grant) => {
    if (url === '/api/hexa/session') return json({ grant: grant() });
    await gate.promise; return json({ ready: true, contextRevision: 1, contextSha256: hash(init.body) });
  });
  h.bridge.setCalendar(calendarFixture()); h.bridge.frameLoaded(); h.boot(); await settle();
  h.advance(7_200_001); gate.resolve(); await settle();
  assert.equal(h.states.at(-1), 'error'); assert.equal(h.messages.length, 0);
  h.bridge.dispose();
});

test('facts arriving during the start notification stay queued and the expected tuple is installed before notifications', async () => {
  const h = bridgeHarness(); const initial = calendarFixture(), latest = { ...initial, location: 'Boston' };
  const post = h.frame.postMessage;
  h.frame.postMessage = (message, target) => {
    post(message, target);
    if (message.type === 'HEXA_PROTECTED_SESSION') {
      h.applied(hash(h.requests.at(-1).init.body), 1);
      assert.equal(h.states.at(-1), 'applied');
      h.bridge.setCalendar(latest);
    } else if (message.type === 'HEXA_PROTECTED_CONTEXT_UPDATED') {
      h.applied(hash(h.requests.at(-1).init.body), 2);
    }
  };
  h.bridge.setCalendar(initial); h.bridge.frameLoaded(); h.boot(); await settle();
  assert.equal(h.requests.length, 3); assert.equal(h.requests.at(-1).body.calendar.location, 'Boston');
  assert.equal(h.states.at(-1), 'applied'); assert.equal(h.messages.length, 2);
  h.bridge.dispose();
});

test('actual seed commands restore native curtains while subsequent native clicks own state', () => {
  const commands = [];
  seedHexaPresentation({ postMessage: (data, target) => commands.push({ data, target }) }, origin, { visualHidden: false, transcriptHidden: true });
  assert.equal(commands.length, 3);
  assert.ok(commands.every(command => command.target === origin));
  assert.deepEqual(commands[0].data, { type: 'SET_LAYOUT_SPLIT', hexagonHeight: 40, chatHeight: 60, hideHexagon: false, compactHexagon: true });
  assert.deepEqual(commands[1].data, { type: 'SET_ASPECT_COUNT', aspectCount: 0 });
  const initial = presentation.createNarratorPresentation('native', { visualHidden: true, transcriptHidden: true });
  const restored = presentation.applyHostPresentationCommand(initial, 'native', commands[2].data, CALENDAR_PARENT_ORIGIN);
  assert.equal(restored.visualHidden, false);
  const chosen = presentation.setNarratorPresentationRegion(restored, 'transcript', false);
  assert.equal(presentation.applyHostPresentationCommand(chosen, 'native', commands[2].data, CALENDAR_PARENT_ORIGIN), null);
  const h = bridgeHarness();
  h.send(presentation.buildNarratorPresentationStateReport(chosen, 'old-session'));
  assert.equal(h.snapshots.length, 0);
  h.send(presentation.buildNarratorPresentationStateReport(chosen, 'local-session'));
  assert.deepEqual(h.snapshots, [{ visualHidden: false, transcriptHidden: false }]);
  h.bridge.dispose();
});

test('actual protected Hexa session keeps Text/Voice tool continuations and final literal completed text', async () => {
  const commands = [];
  const actions = [];
  class InertTransport {
    constructor() {}
    on() {}
    async application(command) { commands.push(command); return { ok: true }; }
    close() {}
  }
  const protocol = loadTs(new URL('src/shared/protectedVoiceProtocol.ts', hexaRoot));
  const { ProtectedBrowserSession } = loadTs(new URL('src/frontend/hooks/protectedVoice/session.ts', hexaRoot), {
    '@/shared/protectedVoiceProtocol': protocol,
    '../controlPlaneSpike/transport': { ControlPlaneSpikeTransport: InertTransport },
    '../controlPlaneSpike/playbackOnset': { startLevelMeter: () => { throw new Error('Media is forbidden'); } },
    '@/frontend/lib/infflowActionBridge': { requestInfflowAction: async action => { actions.push(action); return { success: false, message: 'Inert action fixture' }; } },
    '@/frontend/lib/voiceCommandControl': { applyVoiceSoftMute: async () => {} },
    '@/frontend/lib/visualCommandControl': { applyVisualCurtain: () => false },
    '@/frontend/store/hexaStore': { useHexaStore: { getState: () => ({ isVoiceDisabled: true }) } },
  });
  const session = new ProtectedBrowserSession({ id: 'a'.repeat(64), capability: 'b'.repeat(64), mode: 'normal', expiresAt: Date.now() + 1000, parentOrigin: CALENDAR_PARENT_ORIGIN }, {});
  const completions = [];
  const finals = [];
  session.on('response.completed', value => completions.push(value));
  session.on('response.output_text.done', value => finals.push(value.text));
  session.on('response.output_audio_transcript.done', value => finals.push(value.transcript));
  for (const [source, responseId] of [['text', 'r1'], ['voice', 'r2']]) {
    session.application({ event: { type: 'response_origin', responseId, source } });
    session.event({ type: 'response_started', responseId });
    assert.equal(session.__hexaResponseSourceOverride, source);
    session.application({ event: { type: 'ui_action', actionId: source === 'text' ? 'a1' : 'a2', action: { name: 'unsupported_fixture' } } });
    await settle();
    // Continuation has the same response owner; no text is inferred from status.
    session.event({ type: 'response_started', responseId });
    assert.equal(session.__hexaResponseSourceOverride, source);
    assert.equal(session.__hexaTextTurnActive, source === 'text');
    if (source === 'text') session.application({ event: { type: 'output_text_done', responseId, itemId: 'i1', text: 'completed' } });
    else session.event({ type: 'assistant_transcript_done', responseId, itemId: 'i2', transcript: 'Spoken answer' });
    session.event({ type: 'response_done', responseId, status: 'completed' });
  }
  assert.deepEqual(finals, ['completed', 'Spoken answer']);
  assert.equal(completions.length, 2);
  assert.ok(completions.every(value => Object.keys(value.response).sort().join(',') === 'id,status'));
  assert.equal(session.__hexaCompletionEventsCarryText, false);
  assert.equal(actions.length, 2);
  assert.deepEqual(commands.map(command => command.name), ['ui_result', 'ui_result']);
  assert.ok(commands.every(command => command.success === false && command.message === 'Inert action fixture'));
  session.close();
});

test('real protected adapter requests a silent placeholder while voice is off without requesting the microphone', async () => {
  const previous = Object.fromEntries(['AudioContext', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let options, microphones = 0, started = 0;
  const stream = { inert: true }, gain = { gain: { value: 1 }, connect: () => ({}) };
  class InertTransport { constructor(_audio, value) { options = value; } on() {} close() {} }
  const protocol = loadTs(new URL('src/shared/protectedVoiceProtocol.ts', hexaRoot));
  const { ProtectedBrowserSession } = loadTs(new URL('src/frontend/hooks/protectedVoice/session.ts', hexaRoot), {
    '@/shared/protectedVoiceProtocol': protocol,
    '../controlPlaneSpike/transport': { ControlPlaneSpikeTransport: InertTransport },
    '../controlPlaneSpike/playbackOnset': { startLevelMeter: () => { throw new Error('Media forbidden'); } },
    '@/frontend/lib/infflowActionBridge': { requestInfflowAction: () => { throw new Error('Action forbidden'); } },
    '@/frontend/lib/voiceCommandControl': { applyVoiceSoftMute: () => {} },
    '@/frontend/lib/visualCommandControl': { applyVisualCurtain: () => false },
    '@/frontend/store/hexaStore': { useHexaStore: { getState: () => ({ isVoiceDisabled: true }) } },
  });
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: () => { microphones++; throw new Error('Microphone forbidden'); } } } });
    Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: class {
      createMediaStreamDestination() { return { stream }; }
      createOscillator() { return { connect: () => gain, start: () => { started++; } }; }
      createGain() { return gain; }
      async close() {}
    } });
    const session = new ProtectedBrowserSession({ id: 'a'.repeat(64), capability: 'b'.repeat(64), mode: 'normal', parentOrigin: CALENDAR_PARENT_ORIGIN, expiresAt: Date.now() + 1000 }, {});
    assert.equal(await options.getMicrophone(), stream); assert.equal(gain.gain.value, 0);
    assert.equal(started, 1); assert.equal(microphones, 0); assert.equal(session.__hexaMicDeferred, true);
    session.close();
  } finally {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
