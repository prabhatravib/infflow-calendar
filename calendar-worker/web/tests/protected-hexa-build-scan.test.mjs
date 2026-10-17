import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { test } from 'node:test';
import { PRIVATE_MARKERS, scanProtectedHost } from '../scripts/protected-hexa-build-scan.mjs';

const evidence = fileURLToPath(new URL('../../../.wrangler/protected-hexa-v2-2026-10-16-local/scan-fixtures/', import.meta.url));
mkdirSync(evidence, { recursive: true });
test('public artifact scan rejects each sealed private marker, source and credential fixture', () => {
  const directory = mkdtempSync(join(evidence, 'scan-'));
  const file = join(directory, 'index.js');
  writeFileSync(file, 'console.log("safe lifecycle")');
  assert.equal(scanProtectedHost(directory).ok, true);
  for (const marker of PRIVATE_MARKERS) {
    writeFileSync(file, marker);
    const result = scanProtectedHost(directory);
    assert.equal(result.ok, false, marker);
    assert.ok(result.failures.some(failure => failure.kind === 'private_marker' && failure.marker === marker));
  }
  for (const value of ['Bearer ' + 'inert-fixture-token-'.repeat(4), 'sk-' + 'Q'.repeat(24), JSON.stringify({ capability: 'a'.repeat(64) })]) {
    writeFileSync(file, value);
    assert.ok(scanProtectedHost(directory).failures.some(failure => failure.kind === 'credential'));
  }
  writeFileSync(file, 'safe');
  for (const name of ['index.js.map', 'worker.ts', '.env', '.dev.vars', 'wrangler.jsonc', 'package.json', 'tsconfig.json', 'vite.config.js', 'src/private.js', 'worker/private.js', 'shared/private.js']) {
    const path = join(directory, name); mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, '{}');
    assert.ok(scanProtectedHost(directory).failures.some(failure => failure.file === name && failure.kind === 'source_asset'), name);
    unlinkSync(path);
  }
});
