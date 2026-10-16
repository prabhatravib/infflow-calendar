import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { test } from 'node:test';
import { PRIVATE_MARKERS, scanProtectedHost } from '../scripts/protected-hexa-build-scan.mjs';

const evidence = fileURLToPath(new URL('../../../.wrangler/protected-hexa-host-2026-10-15-local/scan-fixtures/', import.meta.url));
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
  writeFileSync(file, 'Bearer ' + 'inert-fixture-token-'.repeat(4));
  assert.ok(scanProtectedHost(directory).failures.some(failure => failure.kind === 'credential'));
  writeFileSync(file, 'safe');
  writeFileSync(join(directory, 'index.js.map'), '{}');
  assert.ok(scanProtectedHost(directory).failures.some(failure => failure.kind === 'source_asset'));
});
