import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { after, test } from 'node:test';
import { sourceLoader, hexaRoot } from './protected-hexa-source.mjs';

const previousStorage = globalThis.localStorage;
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
after(() => {
  if (previousStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousStorage;
});
const names = [
  'profile plans: Chesky is byte-for-byte the reference plan; Codegen gets its six tools and its own block; core hosts get only Hexa tools',
  'Calendar tool parity: actual legacy factories and actual protected adapter emit identical arguments, walls and no-handler refusals',
  'Calendar real controller: timeout wording wins either timer order, contacts are inert, and continuations retain their initiating source',
];
const registered = [];
// Re-run the sealed profile-plan and Calendar parity regressions through their real source.
// Other shared-target tests are not registered (their deployment/config scope
// belongs to Hexa). Contact callbacks in these tests are inert false results.
sourceLoader({
  'node:test': (name, run) => { if (names.includes(name)) { registered.push(name); test(name, run); } },
  'cloudflare:email': { EmailMessage: class { constructor() { throw new Error('Delivery forbidden'); } } },
  mimetext: { createMimeMessage() { throw new Error('Delivery forbidden'); } },
})(resolve(hexaRoot, 'tests/unit/shared-protected-target.test.ts'));
assert.deepEqual(registered, names);
