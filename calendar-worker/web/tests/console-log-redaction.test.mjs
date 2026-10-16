import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const cache = new Map();
function load(url) {
  if (cache.has(url.href)) return cache.get(url.href);
  const exports = {};
  cache.set(url.href, exports);
  const { outputText } = ts.transpileModule(readFileSync(url, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const require = name => name.startsWith('.') ? load(new URL(`${name}.ts`, url)) : createRequire(url)(name);
  new Function('require', 'exports', outputText)(require, exports);
  return exports;
}
const { redactDiagnosticText, redactDiagnosticValue } = load(new URL('../src/utils/console-log-redaction.ts', import.meta.url));

test('private diagnostic fields and provider frames are redacted; lifecycle counts remain', () => {
  const privateValue = 'fixture-private-value';
  const result = redactDiagnosticValue({ contextRevision: 4, ready: true, capability: privateValue,
    nested: { instructions: privateValue, calendarData: { events: [privateValue] }, call_id: privateValue },
    frame: { type: 'response.created', event_id: privateValue, response: privateValue } });
  assert.equal(result.contextRevision, 4);
  assert.equal(result.ready, true);
  assert.ok(!JSON.stringify(result).includes(privateValue));
  assert.equal(redactDiagnosticText('context={"events":["fixture-private-value"]}'), '[private diagnostic redacted]');
  assert.equal(redactDiagnosticText('Authorization: Bearer fixture-secret'), 'Authorization: [redacted] [redacted]');
  assert.equal(redactDiagnosticText('ready revision=4'), 'ready revision=4');
  for (const type of ['conversation.item.created', 'rate_limits.updated']) {
    const frame = { type, item: { text: privateValue } };
    assert.ok(!JSON.stringify(redactDiagnosticValue(frame)).includes(privateValue));
    assert.equal(redactDiagnosticText(JSON.stringify(frame)), '[private diagnostic redacted]');
  }
});

test('actual console wrapper and downloaded snapshot both receive redacted values', async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const methods = ['log', 'info', 'warn', 'error', 'debug'];
  const originals = Object.fromEntries(methods.map(method => [method, console[method]]));
  const output = [];
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let downloaded;
  try {
    for (const method of methods) console[method] = (...args) => output.push(args);
    globalThis.window = { setTimeout: callback => { callback(); return 0; } };
    globalThis.document = { createElement: () => ({ click() {} }), body: { appendChild() {}, removeChild() {} } };
    URL.createObjectURL = blob => { downloaded = blob; return 'blob:offline-fixture'; };
    URL.revokeObjectURL = () => {};
    const capture = load(new URL('../src/utils/console-log-capture.ts', import.meta.url));
    capture.installConsoleLogCapture();
    console.info('safe lifecycle', { ready: true, capability: 'fixture-private-value', context: 'fixture-private-value' });
    capture.captureHexaConsoleEntry({ method: 'info', message: 'Bearer fixture-private-value', timestamp: '2026-10-15T12:00:00Z' });
    capture.downloadConsoleLogs();
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(downloaded instanceof Blob);
    const text = await downloaded.text();
    assert.match(text, /safe lifecycle/);
    assert.match(text, /calendar=1, hexa=1/);
    assert.ok(!text.includes('fixture-private-value'));
    assert.ok(!JSON.stringify(output).includes('fixture-private-value'));
    assert.match(JSON.stringify(output), /ready/);
  } finally {
    Object.assign(console, originals);
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});
