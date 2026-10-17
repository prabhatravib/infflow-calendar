import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

// Union of the sealed Hexa scanner and both current Chesky scanners, with the
// intended shared public origin allowed. No private policy is imported here.
export const PRIVATE_MARKERS = [
  'created and developed solely by Prabhat',
  'Classify the committed microphone audio while Hexa is speaking',
  'Classify whether the visitor intended to take the conversational turn',
  'Send an email message to the creator/developer Prabhat',
  'VOICE CLICKING CONTRACT (must be followed verbatim)',
  'GUIDED TOUR PLAYBOOK:',
  'Use this only as background for answering questions about the topic or content represented by the diagram.',
  'HEXA-CP-CANARY-', 'PRIVATE-MIGRATION-CANARY-',
  'You are the voice pane of the Infflow Codegen page',
  'Write into the request box on the Infflow Codegen page',
  'there is no persistent user-facing language mode',
  'PROTECTED_APP_ORIGINS', '/voice/transcription-secret', '/voice/sse', '/api/external-data', 'client_secret',
  'hexa-worker-v2-protected-voice-test', 'hexa-worker-v2-protected-voice-baseline-test',
  'hexa-worker-v2-control-plane-spike', 'infflow-brianchesky-protected-voice-test',
  '/api/voice/narrator-context', 'LIVE_TEST_',
  'INFFLOW CODEGEN PAGE:', 'DIAGRAM NODE TOOLS (only when a visual diagram is currently on screen)',
  'INFFLOW THEME CONTROL:', 'VOICE ON/OFF CONTROL:', 'SNEEZE DETECTION:',
  'say it like matthew mcchanoughey', 'hexa_product_classifier', 'X-Hexa-Internal',
  'OPENAI_API_KEY', 'sourceMappingURL', '/voice/message', '/voice/live-session', 'external-data.md', 'api.openai.com',
  'You are the narrator',
  'Full-stack TypeScript application with edge-first deployment on Cloudflare Workers',
  'CHESKY_NARRATOR_KNOWLEDGE_PACK',
  'CALENDAR_CONTEXT_POLICY', 'Calendar host context (shared-protected-voice/1).', 'CALENDAR_DATA_JSON:',
  'Calendar host context (shared-protected-voice/2).',
  'src/worker/voice/', 'calendar-worker/worker/', 'cf-worker/worker/',
  'src/shared/agentInstructions', 'wrangler.jsonc', 'wrangler.chesky.toml',
];

export function scanProtectedHost(directory) {
  const root = resolve(directory);
  const failures = [];
  let files = 0;
  function walk(folder) {
    for (const name of readdirSync(folder)) {
      const path = join(folder, name);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      files++;
      const file = relative(root, path).replaceAll('\\', '/');
      if (/\.(?:map|[cm]?tsx?)$/i.test(file) || /(?:^|\/)(?:worker|src|shared)(?:\/|$)/i.test(file)
        || /(?:^|\/)(?:wrangler[^/]*|\.dev\.vars|\.env[^/]*|package(?:-lock)?\.json|tsconfig[^/]*\.json|vite\.config\.[^/]+)$/i.test(file)) failures.push({ file, kind: 'source_asset' });
      const value = readFileSync(path).toString('utf8');
      for (const marker of PRIVATE_MARKERS) if (value.includes(marker)) failures.push({ file, kind: 'private_marker', marker });
      if (/\bsk-[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9_-]{32,}|["']capability["']\s*:\s*["'][a-f0-9]{64}/i.test(value)) {
        failures.push({ file, kind: 'credential' });
      }
    }
  }
  walk(root);
  return { ok: files > 0 && failures.length === 0, files, markers: PRIVATE_MARKERS.length, failures };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = scanProtectedHost(process.argv[2] ?? 'dist');
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
