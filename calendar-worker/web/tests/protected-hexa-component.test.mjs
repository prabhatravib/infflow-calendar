import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test } from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { sourceLoader, hexaRoot, calendarRoot } from './protected-hexa-source.mjs';

const { JSDOM } = createRequire(resolve(hexaRoot, 'package.json'))('jsdom');
const origin = 'https://infflow-calendar.prabhatravib.workers.dev';
const hexaOrigin = 'https://hexa-worker-v2.prabhatravib.workers.dev';
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };

test('actual mounted HexaWorker retains one hidden/prewarmed iframe, validates v2 receipts and restores native snapshots after reset', async () => {
  // jsdom runs no scripts or external resources. This is an inert React mount,
  // with no browser/app load, navigation, media, provider or delivery boundary.
  const dom = new JSDOM('<div id="root"></div>', { url: `${origin}/` });
  const globals = ['window', 'document', 'navigator', 'HTMLElement', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT'];
  const previous = Object.fromEntries(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const key of globals) Object.defineProperty(globalThis, key, { configurable: true, writable: true,
    value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] });
  const requests = [], posts = [];
  let grants = 0, stored;
  dom.window.Storage.prototype.setItem = () => { assert.fail('Grant storage forbidden'); };
  const load = sourceLoader({ '../utils/console-log-capture': { captureHexaConsoleEntry() {} } });
  const { buildCalendarContext } = load(resolve(calendarRoot, 'calendar-worker/worker/protectedHexa/calendarContext.ts'));
  const { HexaWorker } = load(resolve(calendarRoot, 'calendar-worker/web/src/components/HexaWorker.tsx'));
  const presentation = load(resolve(hexaRoot, 'src/frontend/lib/narratorPresentation.ts'));
  dom.window.fetch = async (url, init) => {
    requests.push(url);
    if (url.endsWith('/session')) return Response.json({ grant: { id: (++grants).toString(16).padStart(64, '0'), capability: 'b'.repeat(64),
      mode: 'normal', parentOrigin: origin, expiresAt: Date.now() + 7_190_000 }, serverNow: Date.now() });
    stored = { ready: true, contextRevision: 1, contextSha256: createHash('sha256').update(buildCalendarContext(JSON.parse(init.body).calendar)).digest('hex') };
    return Response.json(stored);
  };
  const calendarData = { events: [], currentView: 'day', currentDate: new Date('2026-10-16T12:00:00-04:00'), location: 'New York', weatherData: null };
  const root = createRoot(dom.window.document.getElementById('root'));
  const render = open => root.render(React.createElement(HexaWorker, { calendarData, isSheetOpen: open }));
  const frame = () => dom.window.document.querySelector('iframe');
  const send = data => dom.window.dispatchEvent(new dom.window.MessageEvent('message', { origin: hexaOrigin, source: frame().contentWindow, data }));
  const loadFrame = async () => {
    frame().contentWindow.postMessage = (data, target) => { posts.push({ data, target }); };
    frame().dispatchEvent(new dom.window.Event('load'));
    send({ type: 'HEXA_PROTECTED_BOOT_READY', mode: 'normal' }); await settle();
  };
  try {
    await act(async () => { render(true); await settle(); });
    const first = frame(), localId = new URL(first.src).searchParams.get('sessionId');
    const url = new URL(first.src);
    assert.equal(`${url.origin}${url.pathname}`, `${hexaOrigin}/enhancedMode`);
    for (const [key, value] of Object.entries({ voice: 'off', prewarm: 'true', curtains: 'true', curtainsStart: 'both' })) assert.equal(url.searchParams.get(key), value);
    assert.equal(first.getAttribute('allow'), 'microphone; autoplay');
    await act(loadFrame);
    const grant = posts.find(value => value.data.type === 'HEXA_PROTECTED_SESSION').data.grant;
    assert.equal(grants, 1); assert.equal(dom.window.document.querySelector('[role="status"]').textContent, 'Syncing calendar...');
    const state = { type: 'HEXA_PROTECTED_CALL_STATE', source: 'hexa-voice', sessionId: localId, protectedSessionId: grant.id, generation: 1, state: 'ready' };
    const receipt = { type: 'HEXA_CONTEXT_INJECTED', source: 'hexa-voice', sessionId: localId, protectedSessionId: grant.id, generation: 1,
      contextRevision: stored.contextRevision, contextSha256: stored.contextSha256, sha256: stored.contextSha256 };
    await act(async () => { send(receipt); await settle(); });
    assert.equal(dom.window.document.querySelector('[role="status"]').textContent, 'Syncing calendar...');
    await act(async () => { send(state); send(receipt); await settle(); });
    assert.equal(dom.window.document.querySelector('[role="status"]').textContent, 'Details of 0 events loaded');
    await act(async () => { render(false); send({ type: 'HEXA_PROTECTED_BOOT_READY', mode: 'normal' }); await settle(); });
    assert.equal(frame(), first); assert.equal(grants, 1); assert.equal(requests.length, 2);
    await act(async () => { render(true); await settle(); }); assert.equal(frame(), first);
    const initial = presentation.createNarratorPresentation('native', { visualHidden: true, transcriptHidden: true });
    const chosen = presentation.setNarratorPresentationRegion(initial, 'visual', false);
    await act(async () => {
      send(presentation.buildNarratorPresentationStateReport(chosen, localId));
      dom.window.document.querySelector('[aria-label="Reset voice connection"]').click(); await settle();
    });
    assert.notEqual(frame(), first); assert.notEqual(new URL(frame().src).searchParams.get('sessionId'), localId);
    const before = posts.length;
    await act(loadFrame);
    assert.equal(grants, 2);
    const restore = posts.slice(before).find(value => value.data.type === 'SET_NARRATOR_PRESENTATION');
    assert.deepEqual(restore.data, { type: 'SET_NARRATOR_PRESENTATION', visualHidden: false, transcriptHidden: true });
    assert.ok(posts.every(value => value.target === hexaOrigin));
    assert.equal(dom.window.localStorage.length, 0); assert.equal(dom.window.sessionStorage.length, 0);
  } finally {
    await act(async () => { root.unmount(); }); dom.window.close();
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
