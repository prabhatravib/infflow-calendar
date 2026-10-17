import { resolve } from 'node:path';
import { after } from 'node:test';
import { sourceLoader, hexaRoot } from './protected-hexa-source.mjs';

const previousStorage = globalThis.localStorage;
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
after(() => {
  if (previousStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousStorage;
});
// Freshly run the sealed real adapter -> transcript subscription/coordinator ->
// chat channel/reducer regressions, with their own inert media/network fixtures.
sourceLoader()(resolve(hexaRoot, 'tests/unit/protected-voice-session-integration.test.ts'));
