# Calendar protected Hexa host preparation

Prepared locally on October 15, 2026 (America/New_York). **BLOCKED: preparation only; not a completed migration and not deploy-ready.** No deployments, Cloudflare operations, secrets, provider generations, paid requests, application-page loads, microphone sessions, deliveries, commits or pushes were performed. Do not deploy this fail-closed candidate: Hexa would be unavailable in Calendar. Calendar editing and storage code remain unchanged.

## Source and authority

Actual root: `C:\Users\prabh\GitHub-primary\infflow-calendar`. HEAD: `c924ce422bdc1e4c59ed554621ee5768dea4c72a`. Entry dirty-file identities: **none**. Only this repository was edited. Hexa and Chesky were read-only references; JA and its nested copies/configuration were untouched.

Read the supplied global AGENTS instructions, checked for host/nested AGENTS files (none), read Hexa's applicable AGENTS, `x_prompts/README.md`, `00-shared-hexa-prerequisite.txt`, the current shared contract, `VOICE_RUNTIME_CONTRACTS.md`, shared/server migration, live-test, cutover and post-cutover reports. Historical reports are dated evidence only. They neither authorize operations nor establish current live parity.

Contract: **`shared-protected-voice/1`**, locally prepared, not deployed. The 19-file seal was independently recomputed and matched:

`3c7077656c008bee8777bb95dea19190562d85f9396aaa5ce61c9e307326bd5e`

Approved public destination: `https://hexa-worker-v2.prabhatravib.workers.dev/enhancedMode`. Registered host origin: `https://infflow-calendar.prabhatravib.workers.dev`; profile `calendar`, mode `normal`. Private binding candidate: `HEXA_PROTECTED_CONTROL` → existing `hexa-worker-v2`, entrypoint `ProtectedVoiceControl`. No test/spike Worker, new Worker, public legacy fallback or redirect is selected.

Evidence is in the **new ignored** `.wrangler/protected-hexa-host-2026-10-15-local/` directory. Existing evidence was preserved. `entry-source.json` records initial tracked-file hashes. `final-source.json`, `artifact-manifest.json` and `identity.json` record final identities. Hash aggregation uses ordinal-sorted `path:sha256` lines joined by LF with no trailing LF. The source aggregate excludes this report to avoid self-reference. Hashes and final command results are recorded below after validation.

## Blocking requests to shared coordinator 00

1. **Atomic application ownership check on context updates.** The sealed `setContext(id, capability, context)` authenticates the bearer pair, but accepts any session profile/mode/parent. The public status projection does not supply these ownership fields. A Calendar caller holding a valid Chesky/narrator pair could otherwise cause the Calendar server's private binding to install calendar framing into that other session. Exact Origin checks and CORS do not prove Calendar issuance. Require a resealed private contract that atomically validates the existing ownership record's **profile=`calendar`, mode=`normal`, parentOrigin=the exact Calendar origin**, together with the ID and capability, **before writing**. An equivalent verified server issuance contract is acceptable; a browser assertion is not. Do not add a secret, persistent browser grant, isolate-local registry or database schema to guess around this gap.
2. **Preserve the offered tools/refusals.** Contract section 5 explicitly marks the reduction from Calendar's legacy default tools to core(5) as an owner-review behavior change. Eleven formerly offered tools (`describeEmailImage` and ten Infflow actions) are omitted. Calendar has no handler for those actions, so they previously timed out; nevertheless removal conflicts with this task's no-drop requirement. Coordinator must preserve the existing offer/refusal/deadline behavior or obtain the owner's explicit resolution and reseal. Do not copy Chesky's tools/persona or invent Calendar CRUD.
3. **Applied receipts need revision identity.** Sealed `HEXA_CONTEXT_INJECTED` has only local iframe session ID and SHA. Rotating the keyed iframe prevents old-grant receipt confusion, but A→B→A facts in one installed session can produce an indistinguishable queued first-A receipt. Require `contextRevision` (and reviewed grant/generation identity) in the applied receipt, matched to the stored response. The candidate refuses repeated-hash acknowledgement rather than claiming it applied or creating an extra provider session. Test same-hash/different-revision stale receipt refusal against the resealed producer before enabling the seam.

**Fail-closed implementation:** both valid `/api/hexa/session` and `/api/hexa/context` requests return `503 {"error":"calendar_context_contract_unavailable"}`. No grant is issued and **no service RPC is called**. Validation, private calendar formatting, binding configuration, browser lifecycle candidate and mocked projected-response fixtures are prepared independently. No environment flag can enable this seam. Enabling it requires reviewed source changes against a new seal and new tests; passing the present tests does not authorize enabling it.

Required future coordinator fixtures: valid Calendar/normal/exact-parent succeeds; valid foreign Chesky and narrator bearer pairs, wrong parent, wrong/expired/revoked capability and ID from a different session refuse before storage/provider effects. Return only stored revision/hash readiness and an applied receipt after the live revision actually matches. Retain 7200-second grants and 840-second call caps.

## Actual path and side-effect inventory

| Producer/consumer | Existing behavior and candidate |
|---|---|
| `App.tsx` → `HexaWorker` | One actual caller. Supplies `safeEvents`, weather, location and committed displayed date/view. Calendar uses filtered events separately. No app/event-navigation code changed. |
| `HexaWorker` iframe | One keyed `/enhancedMode` entry; `showChat=true`, local session ID, `iframe=true`, native curtains, `curtainsStart=both`, `voice=off`, `prewarm=true`, microphone/autoplay permission unchanged. CSS-hidden mobile sheet stays mounted. |
| `sessionManager.ts` | In-memory across view changes, not reloads. Unchanged. Reset/replacement makes a fresh local ID and keyed iframe; grants remain memory-only. |
| `calendarWeatherContext.ts` | Existing selected-day/list, Monday–Sunday week and actual-month weather helper unchanged. Month event loading still includes rendered adjacent dates; migration does not change either range. |
| Legacy context path | Browser formerly built summary/policy-like `prompt` in a generic diagram payload (`type: calendar`, `mermaidCode`) and POSTed to Hexa `/api/external-data`. This code is removed from the candidate; no legacy fallback. |
| Candidate context path | `createProtectedCalendarContext` projects facts → actual `ProtectedHexaBridge` same-origin request → existing host Hono routes → strict private `buildCalendarContext`. Final private RPC deliberately blocked pending ownership contract. Browser cannot supply framing, profile, role, tools or instructions as control fields. |
| Receipts | Candidate host response projects only stored readiness/revision/hash. Bridge waits for `HEXA_CONTEXT_INJECTED`, exact local session and expected SHA, from the iframe's exact window and origin. Generic ready/diagram notifications are not calendar receipts. Current public seam never returns success. |
| Native presentation | Layout 40/60, aspect count 0, initial visual/transcript curtains and subsequent native controls remain. Snapshot restores on reset. Hexa's actual native presentation state machine prevents delayed host seeding from overriding a native click. |
| Actions | No Calendar `HEXA_APP_ACTION_REQUEST` handler or editing tools exist. Core aspect/voice/visual actions execute inside Hexa. Email/notification tools are server-owned; tests install inert transport/RPC boundaries and perform no delivery. Unexpected host actions remain inert. Tool reduction is blocker 2. |
| Diagnostics | `main.tsx` capture/export remains, with source/session attribution, compaction, 5000-entry cap, directory handles, picker/download and snapshot behavior preserved. Raw iframe message/error logging removed; private diagnostic keys/values are redacted before ordinary console and export capture. |
| Existing backend | Event CRUD/D1, Echo AI, weather, ICS, seed and static routes remain. Their original public access policy/CORS is preserved. New protected routes terminate before inherited broad CORS/error logging. No login, schema, provider key, model, locale, layout or dependency change. |

## Before/after acceptance matrix

The inspected tool/action inventory below is a **coordinator parity requirement**, not new Calendar permissions. Tool schemas remain in Hexa's private tool definitions and `protectedVoice/toolPolicy.ts`; public action schemas are in the sealed protocol. Every browser round trip uses `requestId` plus local `sessionId` and returns `{success,message}`; protected transport additionally correlates bounded action handles and rejects settled/other-generation results. The existing Calendar host implements none of the external host actions.

| Existing tool | Protected action / arguments | Existing handling to preserve |
|---|---|---|
| `sendEmailToCreator` | Server contact; `message` ≤2000, optional `contactInfo` ≤120 | Existing server delivery/refusal policy; inert offline, no delivery |
| `sendNotificationToCreator` | Server contact; `message` ≤1000, optional `contactInfo` ≤120 | Existing server delivery/refusal policy; inert offline, no notification |
| `switchToAspect` | `switch_aspect {aspect,userRequest}` from tool `aspectNumber` | Hexa-local, 8 s action bound |
| `setVoicePower` | `voice_power {state:on/off}` | Hexa-local, 8 s; preserve native microphone/lifecycle ownership |
| `setVisualVisibility` | `visual_visibility {state:visible/hidden}` | Hexa-local, 8 s; visual cover does not mean power off |
| `searchInfflow` | `search {query,diagramType?}` | No Calendar handler; prior 8 s timeout/refusal, now omitted (blocker) |
| `setInfflowView` | `set_view {view:visual/text}` | Same prior 8 s timeout/refusal; omitted |
| `setInfflowTheme` | `set_theme {theme:light/dark/toggle}` | Same prior 8 s timeout/refusal; omitted |
| `openInfflowNode` | `open_node {target:web_links/deep_dive,nodeText?}` | Same prior 8 s timeout/refusal; omitted |
| `closeInfflowNode` | `close_node {target:web_links/deep_dive}` | Same prior 8 s timeout/refusal; omitted |
| `hoverInfflowNode` | `hover_node {nodeText}` | Same prior 8 s timeout/refusal; omitted |
| `selectInfflowText` | `select_text {nodeText}` | Same prior 8 s timeout/refusal; omitted |
| `openInfflowVisualExploration` | `open_visual_exploration {nodeText?,nodeNumber?}` (existing browser bridge projects name only) | Same prior 8 s timeout/refusal; omitted; do not silently change argument handling |
| `expandInfflowVisualConcept` | `expand_visual_concept {conceptText?}` | Same prior 8 s timeout/refusal; omitted |
| `controlInfflowDemo` | `control_demo {command:start/pause/resume/stop}` | Same prior 8 s timeout/refusal; omitted |
| `describeEmailImage` | `describe_email_image {imageHint?,question?}` | No Calendar handler; prior 30 s timeout/refusal; omitted |

The legacy browser bridge's timeout wording is `Infflow did not confirm the action in time.` The coordinator must resolve preservation of the offering, argument/result/correlation/deadline/refusal behavior before the profile can be called equivalent. No successful Calendar CRUD or generic Infflow action is substituted.

“Candidate” below describes prepared code with inert successful host-response fixtures; the deployed feature is **UNVERIFIED**, and real bootstrap is intentionally blocked.

| Concern | Before | Candidate / observable acceptance |
|---|---|---|
| Events/view/date/location | Browser summary and calendar data sent directly to shared legacy route | Same visible facts projected into bounded server-only framing. Preserve start/end timestamps, event timezone, event title/description/type/location and current view/date. No calendar data CRUD. |
| Weather/date semantics | Local date strings; explicit missing forecast; original units | Same helper/ranges; null measurements and unavailable dates remain unavailable. No “clear weather” fabrication. Supplied current-weather units retained. DST/local dates tested. |
| Early context | Effect could run before iframe ready | Latest data retained before load/BOOT_READY; no grant/start until initial current context has been stored. |
| Deduplication/order | JSON-based dedupe by session and facts | Fact-key dedupe plus serialized latest-write loop; no stale response can overwrite latest association. New local association resends even identical facts. |
| Truthful readiness | HTTP success could display “loaded” | Stored receipt is insufficient. Display loaded only after expected applied SHA from current iframe/local session. Bad/old hash, generic readiness and cross-window/origin/session frames ignored. |
| Page reload/reset | New in-memory local ID on reload; explicit reset remount | Current facts rebuilt; no capability persistence or provider-call reuse. Dispose aborts pending work before reset. Current context/presentation are restored to new association. |
| Grant expiry/replacement | Legacy session replacement | Installed grant replacement rotates the local ID **and iframe**, because shared receipts lack grant/generation fields. Old same-hash receipts then cannot match. Context precedes replacement prewarm. |
| Stop/recovery | Native voice controls, reset; hidden pane stays alive | Native controls remain in Hexa. Hiding the sheet does not stop/clear. Dispose makes late completions inert. Errors surface bounded “Calendar sync unavailable”; retry requires changed facts/frame/reset (no invented automatic retry campaign). |
| Prewarm/microphone | Mounted voice-off iframe prewarms a paid call | Candidate uses `start:true` only after initial context; no extra bootstrap while duplicate readiness is pending. Silent placeholder behavior stays Hexa-owned; microphone permission remains user-controlled. Actual server503 yields **zero starts**. |
| Native curtains | URL seed; 400/1200 ms layout restore; native choice ownership | Same URL/default presentation and delayed seeds. Actual shared state machine tested to keep native changes authoritative; reset restores snapshot. |
| Text/Voice | Typed input/reply belongs Text; spoken input/reply Voice | No host transcript reclassification. Actual protected adapter tests use inert transport; source ownership and tool continuation contracts retained. Genuine literal `completed` is text; completion status is metadata. |
| Tools/deadlines/refusals | Legacy default tools; unhandled host actions timed out | Core visible tools remain shared-owned. No new Calendar actions. Full parity blocked until coordinator resolves omitted tools. Delivery-capable boundaries remain inert in all offline tests. |
| Logs/exports/storage | Combined host/Hexa capture and directory download | Safe diagnostic lifecycle data retained. Grants, hidden context, provider frames/IDs and credentials not forwarded into ordinary console/export. Original export/directory implementation unchanged except source redaction. |
| Other application behavior | Public event routes, UI, persistence, navigation, weather cache, exports | Source hashes prove these files unchanged; date suite plus actual mocked Hono ordinary-route check run. Browser interaction remains owner verification. |

## Confidentiality and public build boundary

Private calendar policy/framing is only in `calendar-worker/worker/protectedHexa/calendarContext.ts`. Vite's graph guard rejects host Worker modules and Hexa Worker/shared modules in the frontend bundle. Existing TypeScript/Vite settings, output `web/dist`, CSS splitting, source-map default (off), build mode and dependency versions are retained. Both existing build commands append `scan:protected`; no deployment script is run.

The scanner inspects every emitted file, refuses source maps/source/Worker/config/environment assets, checks 43 markers comprising current Hexa's 17 markers, both Chesky scanner sets (except Chesky's host-specific ban on this intended shared origin), historical shared audit additions and calendar-private markers, plus credential patterns. Marker equality was checked against current reference source. Positive inert leak fixtures verify every marker and credential/source-map refusal. A diagnostic redaction regex recognizes `client_secret` via a character class so the forbidden literal itself is not emitted; no private payload is concealed by that syntax.

HTTP refusal bodies contain only bounded error identifiers. They have no context, capability, private RPC exception or false receipt. No new bootstrap/status/readiness/debug path returns private context. Candidate browser response validation is strict; context acknowledgements require the exact server-set SHA. Ordinary existing host routes retain their behavior. Visible calendar content and delivered JavaScript/UI remain inspectable. Scanning and mocked checks are limited offline evidence, not a universal confidentiality or prompt-injection claim.

## Commands and evidence

Scripts were inspected before execution. All tests run source with inert network/provider/media boundaries. No install/update was performed. The evidence directory contains separate baseline/final logs, strict server seam checks and current-vs-HEAD server debt comparison.

Initial `npm.cmd test`: **11/11 PASS**. Initial full lint: **20 errors, 6 warnings**. Initial `npm.cmd run build`: TypeScript passed, Vite failed because the sandbox denied esbuild access to ancestor/config paths. An authorized local build retry outside that sandbox succeeded; no application was loaded. Existing Mermaid/Vite large-chunk warnings were not “fixed.”

Final results:

| Command / scope | Result |
|---|---|
| `npm.cmd test` from `calendar-worker/web` | **34/34 PASS**, no skips: 11 existing date tests, 12 bridge/adapter/native-control checks, 8 actual Hono/formatter checks, 2 diagnostic checks, 1 marker/source/credential fixture check |
| `npm.cmd run lint` | **FAIL: existing 19 errors, 6 warnings**; entry had 20 errors, 6 warnings. The affected component's previous `any` is replaced by the necessary structured calendar type; no unrelated debt repaired |
| `node_modules/.bin/tsc.cmd --noEmit` from web | **PASS** |
| Installed ESLint on `HexaWorker`, new fact/bridge modules, capture/redactor and `vite.config.ts`, `--max-warnings 0` | **PASS** |
| `npm.cmd run build` with authorized sandbox access retry | **PASS**, TypeScript + Vite + appended artifact scan, release OFF; 48 output files, 43 markers, zero failures |
| `npm.cmd run scan:protected` | Included in successful build; **PASS** |
| New server seam strict type/lint checks | **PASS** |
| Whole existing Worker direct type check | **FAIL: same 3 errors as reconstructed HEAD**, normalized identities equal |
| Final shared seal + current reference scanner marker equality | **PASS**, 19 source hashes; no missing reference markers |
| `git diff --check` and final source diff review | **PASS**, no accidental/unrelated source edits; Git reports ordinary LF/CRLF conversion notices |
| `build:prod`, Wrangler dry-run, Cloudflare, live/server-provider/browser/audio checks | **UNRUN**; no invented success |

The actual installed server commands, from `calendar-worker`, were:

```powershell
.\web\node_modules\.bin\tsc.cmd --noEmit --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM --skipLibCheck worker/index.ts
.\web\node_modules\.bin\tsc.cmd --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM --skipLibCheck worker/protectedHexa/routes.ts worker/protectedHexa/calendarContext.ts
```

There was no preexisting server tsconfig or type-check script; none is claimed. HEAD Worker files were reconstructed under ignored evidence, with an evidence-only tsconfig resolving installed Hono declarations, and compared to the current entry. Same errors: `routes/echo.ts(32,65)` and `routes/seed.ts(14,34)` unknown-to-string; `services/weather-service.ts(135,23)` missing `WeatherData.current_weather`.

The shared-function tests read sibling `hexa-v2` source without editing it; therefore the present local `npm test` requires that sibling checkout. They exercise the real native presentation state machine and browser adapter with inert transport/media/action stubs. The adapter test proves source retention, bounded inert action results, genuine final text and lifecycle-only completion events; it does **not** execute the full server continuation controller, transcript coordinator or ChatPanel interaction. Those paths were source-reviewed; historical Hexa test results are not a fresh host parity result. All delivery actions are inert fixtures.

Final source aggregate, excluding this report:
`24ed246ead55ea2f4543e94eacaf3593e25eb259ee9ce0e3c46d507367e7ee89`.

Final 48-file artifact manifest aggregate:
`386ff1f56ef75506c8e26c05baa937c30f7a632336663c0ab90849f7c77c0724`.
Entry chunk: `assets/index-DwKQnc1F.js`. Every public file is listed and individually hashed in `artifact-manifest.json`; no `.map`/source/Worker asset was emitted. The successful final build and scan are in `final-build.log`; tests/lint/type/focused-lint results are in the corresponding `final-*.log` files. `reference-verification.json` contains all 19 seal input hashes plus the three current reference-scanner source hashes and marker comparison.

| Identity | Entry SHA-256 | Final SHA-256 |
|---|---|---|
| `calendar-worker/package-lock.json` | `7255a5bf75f688203a6978782dc0f86d50bdee3c1557e470db8ca0f708100e01` | unchanged |
| `calendar-worker/web/package-lock.json` | `6ec843001c199d13e433d489a675c269b24ab1b0bdd9c008d4ca705ac716b491` | unchanged |
| `calendar-worker/wrangler.jsonc` | `bc8cc24e82347ca3f012c397f0089375209a9c17c2e4448de01c68c28a9ba7bf` | `6c69562def6e08302bc61b7080b0c8b9a844c121ea7581b1addb1553428dea25` |
| `web/vite.config.ts` | `2c1e5728633768e0d15bdf768c012f2bbe24b05204045a0c9fdc9082ffe9bf89` | `7e868e8894bd8dee4d40c4ad608ae96c9a3cce895b7b698e9ec182decaa25afc` |
| `web/package.json` | `3979f82773d8238f61bf76d8c4d5f5335f9cb181f30d79eb9bcbbb6941d58686` | `974ac7797fdf38b6be98c04dfc1d681d907e092daa2d54a1ab2d386d84751047` |
| `web/tsconfig.json` | `980d6cbe977ddfb52d3ab1bdd3fba30f8c1db9371b3b14aa4557d32bb00ce54b` | unchanged |
| `web/tsconfig.node.json` | `9e2abb169ea87b7190613a1d4da57ca608463a453bd4231fa3aeee5e308370dd` | unchanged |
| `web/.eslintrc.cjs` | `5d99f1da743f339151e19dff7274b50f201442205b792e5e11b181fe93f4afdd` | unchanged |

`web/` rows are relative to `calendar-worker/`. Existing host config remains `name=infflow-calendar`, `main=worker/index.ts`, `compatibility_date=2025-08-01`, assets `web/dist` bound as `ASSETS`, D1 `calendar` with its original database identity. Only the explicit existing-Hexa service binding was added. Runtime/model/release/observation settings stay on the sealed shared side: current runtime, `gpt-realtime-2.1`, release OFF, ordinary 7200/840 limits. No TTL/cap overrides, production gates, quota, failure or restart hooks were added.

Files changed (all within this host; per-file final hashes in `identity.json`):

- `calendar-worker/web/src/components/HexaWorker.tsx`; new `src/lib/protectedCalendarContext.ts`, `src/lib/protectedHexaBridge.ts`.
- `calendar-worker/web/src/utils/console-log-capture.ts`; new `src/utils/console-log-redaction.ts`.
- `calendar-worker/web/package.json`, `vite.config.ts`; new `scripts/protected-hexa-build-scan.mjs`.
- Four new test files: `console-log-redaction.test.mjs`, `protected-hexa-bridge.test.mjs`, `protected-hexa-build-scan.test.mjs`, `protected-hexa-server.test.mjs`.
- `calendar-worker/worker/index.ts`, `worker/types/index.ts`; new `worker/protectedHexa/calendarContext.ts` and `routes.ts`; `calendar-worker/wrangler.jsonc`.
- This report. Ignored automation/evidence is kept separately and is not shipped.

## Evidence boundaries

| Evidence class | Status |
|---|---|
| Local source/contract seal | Inspected, seal recomputed; scoped diff and hashes recorded |
| Offline tests/types/lint/build/scans | Results below; debt separated from changed-file checks |
| Actual protected host RPC integration | **BLOCKED**, public seam deliberately503; successful-response lifecycle fixtures are not end-to-end parity |
| Deployment/live versions/origin registration | **UNVERIFIED** in this task; historical IDs not rollout authority |
| Browser/UI/microphone | **UNVERIFIED**, no application page or browser run |
| Provider/audio/playback/termination | **UNVERIFIED**, no generation or audio session |
| Live HTTP/asset/privacy exposure | **UNVERIFIED**, no live bootstrap/status/assets requests; offline scans only |
| Owner product acceptance | Pending separately approved coordinated rollout |

## Future deployment and protected recovery — PREPARED, DO NOT EXECUTE

**No current command may deploy this candidate.** First resolve all coordinator dependencies, verify a new seal, finish the private route wiring and mocked cross-profile tests, rebuild/scan and review every in-scope host candidate. Then obtain separate approval of the concrete diffs, exact target commands and recovery plan. Neither shared-first nor host-first is disruption-free: old hosts require removed legacy routes, while new protected hosts cannot bootstrap against legacy Hexa. Review an explicitly accepted unavailable interval or a coordinated activation plan across all nine in-scope hosts and Chesky. JA remains unchanged with its owner's accepted loss of Hexa; never reopen legacy routes for JA or rollback.

Future read-only preflight, from `C:\Users\prabh\GitHub-primary\infflow-calendar\calendar-worker` (not executed):

```powershell
npx.cmd wrangler whoami
# Stop Cloudflare work if not authenticated; do not initiate login.
npx.cmd wrangler deployments list --config .\wrangler.jsonc --name infflow-calendar --json
npx.cmd wrangler versions list --config .\wrangler.jsonc --name infflow-calendar --json
```

Reconcile fresh host and shared deployments/config bindings, exact approved parent origin/custom domains, provider-key **names only**, and the new sealed source/artifact identities. Preserve the existing settled key choice; do not print values, rotate/provision keys or remove cleanup credentials. Hexa's shared coordinator owns its deployment and namespace migration commands; this host task must never deploy Hexa.

Only after dependencies, checks and separate approval, the exact host deploy command is:

```powershell
Set-Location C:\Users\prabh\GitHub-primary\infflow-calendar\calendar-worker\web
npm.cmd test
npm.cmd run lint
npm.cmd run build
Set-Location C:\Users\prabh\GitHub-primary\infflow-calendar\calendar-worker
npx.cmd wrangler deploy --config .\wrangler.jsonc --name infflow-calendar
npx.cmd wrangler deployments list --config .\wrangler.jsonc --name infflow-calendar --json
```

Full lint currently has baseline debt; review that known result explicitly before approving the command sequence. Do not use root/package/deploy.ps1 wrappers, which contain bare deploy commands. No database migration, Worker creation/deletion or secret mutation belongs in this rollout.

Protected-compatible recovery:

1. On the first protected host rollout there is **no verified protected-compatible previous host version**. Roll forward with a reviewed fix and the same explicit host command; do not restore the old legacy host against protected-only Hexa.
2. After a known-good protected host version is recorded from fresh deployment evidence, a later rollback template is `npx.cmd wrangler rollback <freshly-verified-protected-compatible-host-version-id> --config .\wrangler.jsonc --name infflow-calendar --message "Restore reviewed protected Calendar host"`. The placeholder is intentionally not a historical version guess. Confirm that version's iframe origin, private binding and sealed protocol remain compatible.
3. If shared target recovery to existing `hexa-worker-v2-protected` is selected by coordinator00, it requires a separately reviewed **host source/config pair**: iframe origin and private service binding must both point to that protected recovery target with Calendar registered. This candidate defaults to the final shared target; no automatic alternate/fallback or ready-to-deploy recovery artifact is claimed. Until that pair exists, roll-forward is the prepared host recovery route. Preserve D1, both existing Hexa Workers/DO data and provider-hangup credentials.

Before later browser work, confirm automation availability using `about:blank` only under separate authorization. No browser run is needed for the present local task.

Owner checklist after a separately approved rollout: ordinary day/week/month/list navigation and CRUD persistence/reload; location/weather unavailable dates/units; initial hidden curtains and native controls; CSS-hidden mobile pane continuity; intentional Voice ON/OFF and microphone prompt; typed Text vs spoken Voice replies/tool continuations; reset/expiry/reload recovery and truthful loaded status; safe combined diagnostic export and directory access. Owner playback/product acceptance does not establish privacy proof; the separately scoped live exposure review must cover actual HTTP/assets/messages/logs.
