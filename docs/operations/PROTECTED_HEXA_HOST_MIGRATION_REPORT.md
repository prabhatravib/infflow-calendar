# Calendar protected Hexa — coordinated live migration preflight

**PREFLIGHT COMPLETE. OWNER DECISION: HOLD. NOTHING DEPLOYED.** The owner was asked one approval question covering the plan in §9. They chose the recommended option: hold, and prepare the other host migrations first. No deployment, live session or browser application load followed. Both Workers stay as read in §3: `hexa-worker-v2` legacy `478b8d8e`, `infflow-calendar` legacy `054aee41`. Calendar keeps today's working legacy Hexa, and the eight other hosts keep theirs. The next step is to prepare their migrations (host prompts 01 and 03–09) and resolve Email's origin (§7). Then repeat this preflight against fresh live state. The §9 commands and budget are not approved and must not be run from this report.

October 16, 2026, 12:51–13:55 America/New_York. This run made zero deployments, provider calls or generations, application-page loads, microphone/media sessions, deliveries, secret reads or changes, commits and pushes. Its only Cloudflare operations were read-only (`whoami`, `deployments list`, `versions list`, `versions view`) and two local `--dry-run` builds that upload nothing. Historical prompt04/05 budgets give no authority.

New ignored evidence: `.wrangler/protected-hexa-live-migration-2026-10-16/` (written `E` below). Its `commands.json` ledger lists every command, exit code and log. Earlier evidence folders and seals are untouched. The version-2 wiring report and the version-1 history below are byte-for-byte unchanged.

## 1. Fresh identities

| Checkout | Root | HEAD | Working tree |
|---|---|---|---|
| Hexa | `C:/Users/prabh/GitHub-primary/hexa-v2` | `f37cd7c3ca133b6774e52b5fc2e9b406dbffb663` | clean |
| Calendar | `C:/Users/prabh/GitHub-primary/infflow-calendar` | `ba5ca610536fa356c549cc64c7433d2f15cce65d` | the prepared candidate: 9 modified, 5 untracked (hashes in `E/entry-identities.json`) |
| Chesky (read-only) | `C:/Users/prabh/GitHub-primary/infflow-BrianChesky` | `5eac095669b4ee752aed0f07aae216a47b1370d2` | clean |

- **Hexa source drift since the seal: none.** The owner's commit `f37cd7c` holds exactly the sealed version-2 candidate. All 556 tracked and non-ignored files are byte-identical to the sealed final manifest (`calendar-shared-blockers-2026-10-15-local/final-hexa.json`).
- **Calendar drift since its version-2 completion: none.** All 257 files, the report included, equal `protected-hexa-v2-2026-10-16-local/final-identities.json`. The source aggregate (report excluded) is still `71d670c8b82d95e7ac8a3e440de335bc3b937fef52035a2282337b5b10848db2`.
- **Tools.** Node 22.14.0, npm 10.9.2, Yarn 1.22.22, Git 2.50.0. Hexa: Wrangler 4.111.0, TypeScript 5.7.3, Vite 6.2.0, esbuild 0.28.1, ESLint 9.21.0. Calendar Worker: Wrangler 4.111.0, Hono 3.12.12. Calendar web: TypeScript 5.9.2, Vite 5.4.19, ESLint 8.57.1. Nothing was installed or updated; Wrangler reports 4.151.1 is available and it was not used.
- **Locks and configs** are unchanged from the earlier evidence:

| File | SHA-256 |
|---|---|
| Hexa `yarn.lock` | `2d829e8e99c39f722f340c5bb69cc2d58d0c2fcd2fc0a1aed99709506a39eea1` |
| Hexa `wrangler.jsonc` | `e43faa328cd065df9e512cf45a494f9bdb0a7836cc139fb20efaf103edb374c7` |
| Calendar `calendar-worker/package-lock.json` | `7255a5bf75f688203a6978782dc0f86d50bdee3c1557e470db8ca0f708100e01` |
| Calendar `calendar-worker/web/package-lock.json` | `6ec843001c199d13e433d489a675c269b24ab1b0bdd9c008d4ca705ac716b491` |
| Calendar `calendar-worker/wrangler.jsonc` | `6c69562def6e08302bc61b7080b0c8b9a844c121ea7581b1addb1553428dea25` |

The other 31 config hashes are in `E/entry-identities.json`.

## 2. Contract seal: recomputed twice, matches

All **38/38** inputs in contract section 3.8 match their listed hashes. The recomputed seal is **`9f5d626fcdce335e516e98bb552f54c9db4944c012b2f407f2e4ef1bf8281e6d`** (`shared-protected-voice/2`). The recipe is ordinal-sorted `path:sha256` lines, LF-joined with no trailing LF.

Two independent tools agree:

- Node `crypto` (`E/identities.mjs`);
- GNU `sha256sum` with `LC_ALL=C sort` (`E/seal-*.txt`).

The contract table also equals the expected list preserved in the earlier Calendar evidence.

## 3. Deployed state, read fresh today

| Worker | Live version | Applied migration tag | What matters |
|---|---|---|---|
| `hexa-worker-v2` | `478b8d8e-981c-4bf2-b84d-de6e89e7b93c` (#342, deployed 2026-10-06) | `v1` | **Still the legacy runtime.** Handlers: `fetch` plus class `VoiceSession`. Durable Object `VOICE_SESSION` → namespace `cbff5b34543b4420913d4c187cfcc22c`. `OPENAI_API_KEY` is present (secret, name only). Also `SEB`, runtime `current`, model `gpt-realtime-2.1`. Legacy `dist` is served directly (no `run_worker_first`). The cutover has **not** happened, so it is still needed. |
| `hexa-worker-v2-protected` (reference, read-only) | `d9eb8e38-a746-4376-b69c-4aa2fd858664` (#10, 2026-10-14) | `v1-protected-voice` | `ProtectedVoiceControl` exposes only `createSession`, `setContext` and `setVisibleContext`. It has **no `setContextForOwner`**, so it is version 1 and not a compatible Calendar target. `PROTECTED_VOICE` → namespace `0928934824c3473aab18f5b1e1904380`. Registered origin: Chesky only. |
| `infflow-calendar` | `054aee41-26c5-4af8-afff-4f8a528fac8e` (#22, 2026-09-21) | none (no Durable Objects) | **Legacy host.** Bindings: `ASSETS`, D1 `DB` → `01905f11-7133-4de4-b22d-36657d1f1a3e`, `OPENAI_API_KEY` (secret, name only). No service binding. The candidate keeps the D1 binding, adds `HEXA_PROTECTED_CONTROL`, and does not touch secrets (they carry across deploys). |
| `infflow-brianchesky` | `5e553037-e13e-4be9-a288-94b2b5f165b5` | `v1-api-rate-limiter` | `HEXA_PROTECTED_CONTROL` → `hexa-worker-v2-protected#ProtectedVoiceControl`, with `PROTECTED_VOICE=1`. **Not affected by the shared switch.** |

The full bindings and the versions of the hosts below are in `E/deployed-state.json`. The raw reads are the `E/preflight-*.json` and `E/inventory-*.json` files. `hexa-worker-v2-control-plane-spike` (`f217c1ef`) is still deployed, with the owner's key and legacy assets. It is outside this plan, and removing it remains the owner's own decision.

## 4. Cloudflare rules, checked against the docs today

Source: `durable-objects` and `workers` `llms-full.txt`, fetched 2026-10-16T17:02Z. Verbatim excerpts are in `E/cloudflare-rules-excerpts.txt`. Relevant pages: legacy migrations (updated Sep 28, 2026) and Rollbacks (updated Jul 15, 2026).

- The legacy `migrations` array "remains fully supported for existing Workers", and one Worker may use only one of `migrations` or `exports`. The reviewed design keeps `migrations`; it is not converted to `exports`.
- Class lifecycle changes deploy only through `wrangler deploy`. They are atomic and cannot go through `versions upload` or a gradual deployment. This matches the single explicit command below.
- **Rollbacks cannot cross a class lifecycle change.** Once `v2-protected-voice` applies, Cloudflare refuses a rollback to `478b8d8e` or any earlier version. A rollback restores code and configuration, not Durable Object storage.
- Workers that implement Durable Objects get no Version URLs, so the new version cannot be previewed before it goes live.
- The docs forbid enabling SQLite on an *existing* class. They do not say whether a *new* SQLite class may sit beside an existing key-value class through `migrations`. That stays **UNVERIFIED until the deploy runs**. A refusal is atomic and leaves the legacy Worker live, so it is a stop condition below.

Wrangler 4.111.0 computes the migrations to send from the script's current tag. That tag is `v1`, so only `v2-protected-voice` is sent. The Wrangler message "Read 6 files" for a 5-file directory (49 for Calendar's 48) counts the `assets/` directory entry. Its asset manifest skips directories (`buildAssetManifest` in `wrangler-dist/cli.js`), so 5 and 48 files are uploaded.

## 5. Local gates, repeated

Every script was read before it ran. Tests, builds and the audit ran under `E/offline-guard.cjs`, which refuses fetch, WebSocket and HTTP/HTTPS/TCP/TLS/UDP and is byte-identical to both earlier guards.

| Gate | Result | Recorded baseline |
|---|---|---|
| Hexa `yarn.cmd test:unit` | **1049/1049 PASS**, 0 skipped, no `UNIT RUN INCOMPLETE` | 1049 |
| Hexa `yarn.cmd test:worker` | **3/3 PASS** | 3 |
| Hexa `tsc --noEmit`: app, worker, node | **PASS** ×3 | PASS |
| Hexa ESLint, whole repo (same ignores) | 471 errors / 7 warnings, **identical per file and per finding** | 471 / 7 |
| Hexa ESLint, the 13 version-2 changed files | **0 / 0** | 0 / 0 |
| Hexa `yarn.cmd build:protected` (release OFF) | **PASS**, 5 files, scanner ok | 5 files |
| Calendar `npm.cmd test` | **57/57 PASS**, 0 skipped | 57 |
| Calendar `npm.cmd run lint` | 19 errors / 6 warnings, **identical after normalizing** (the earlier logs are UTF-16) | 19 / 6 |
| Calendar web `tsc --noEmit` | **PASS** | PASS |
| Calendar whole Worker `tsc` | the 3 existing errors, identical | 3 |
| Calendar strict seam `tsc`; changed-file TS and JS lint | **PASS** | PASS |
| Calendar `npm.cmd run build` (release OFF) | **PASS**, 48 files, 50 markers, 0 failures | 48 |

The Calendar suite gives fresh integration proof. It runs the actual host routes, formatter and bridge against the actual sealed Hexa `ProtectedVoiceControl`, serialized Durable Object, ownership storage, controller and adapter. Only storage, clocks, provider, media, transport and delivery are inert. Ownership refusals, A→B→A revisions, replacement-grant receipts, generations, prewarm/readiness, the 16 tools with their 8 s/30 s walls, and Text/Voice/`completed` all pass. These remain offline checks, not live proof.

## 6. Exact artifacts and dry-runs

`E/artifact-audit.mjs` passes. It scans with 56 markers: every marker AST-extracted from the current Hexa, Calendar and both Chesky scanners, plus six private additions (two lines of Calendar framing, `setContextForOwner`, `ProtectedVoiceControl`, `HEXA_PROTECTED_CONTROL`, `calendarLegacyTools`). It also checks credential shapes, `sourceMappingURL`, and source/config/map paths.

- 75 positive fixtures were caught, and the Calendar scanner contains every current reference marker.
- Every byte of every emitted public file was scanned. **0 findings.**
- Both legacy builds still show 22 findings each, which confirms the scan finds what it looks for.

| Candidate | Files | Manifest aggregate | Equal to the recorded manifest |
|---|---|---|---|
| Hexa `dist-protected` | 5 (917,151 bytes) | `fb822f49efdb163a4d581c03372f5ba0e5ee0a182b2cd857befd4cacabaf9c52` | yes (contract) |
| Calendar `web/dist` | 48 (3,718,131 bytes) | `48d8c1df07058e099f2dab0259245c162eb7d3bb1e0ff2aec7f139bafbb74903` | yes (version-2 report) |

Hexa artifact hashes:

| File | SHA-256 |
|---|---|
| `index.html` | `660eeecc398e5c29baf90fa4e665c25c3a5c3fd8a6d351c69ed7af0ea6772971` |
| `assets/index-rkzeTUj0.js` | `aac1dd1073c75aa76c36049cd7285c6d7dbf755e28d3d038c003ad5317089b7e` |
| `assets/index-DYsDBEU5.css` | `0f619667617736ac6b2229b536edebc201acb3c0c3c936b5afb54b98478b09de` |
| `assets/audioTimingCaptureWorklet-uVpn8OOl.js` | `6b24ddf1a2725a201f31e44626244d175746ae5c7843e537cce103f8a16b20f0` |
| `favicon.ico` | `2ee08085a168602d7ec3aaf8f0ab722d01eda618d241f0215036f7f160141287` |

Calendar: `index.html` `17039e64c9344771624483499e9308d2e6164640209a7ed9d073574c32de50af`; entry `assets/index-DgFUB4Jj.js` `6b11d2271a472b966372f68cd50419ada533fe75737d08f1ab4dc162dcc3ec76`. All 48 hashes are in `E/artifact-audit.json`. Neither manifest differs from the earlier ones, so there is nothing to explain.

The real public Hexa Worker was bundled from the sealed `sharedWorker.ts` and run against a file-backed `ASSETS`:

- 59 paths were requested.
- 8 returned 200, and every one of those bodies is an exact protected artifact.
- Everything else returned 404: every legacy route, source path, `.map`, and every legacy `dist` file.
- A foreign `Origin` got 403 on all 4 probes.
- Durable Object namespaces were touched 0 times.

**Dry-runs: PASS, nothing uploaded.**

- **Shared.** Wrangler's own custom build reproduced exactly the audited `dist-protected`. Bindings: `VOICE_SESSION` (VoiceSession), `PROTECTED_VOICE` (ProtectedVoiceSession), `SEB`, `ASSETS`, and the vars `OPENAI_VOICE_RUNTIME=current`, `OPENAI_VOICE_MODEL=gpt-realtime-2.1`, `PROTECTED_VOICE_CALLS=1`, `PROTECTED_APP_ORIGINS` (calendar included), `PROTECTED_VOICE_OBSERVATION=1`. The Worker bundle `sharedWorker.js` is `0741f84e3f96981c614ccb0697bae0c1cd66c97667609e3f3e2a9513c4f7e1a3`. It exports `ProtectedVoiceControl` (including `setContextForOwner`), `ProtectedVoiceSession`, the inert dormant `VoiceSession` and the allowlist `fetch`. Its live-test hooks run only when `LIVE_TEST_TARGET=hexa-worker-v2-protected-voice-test`, which is absent.
- **Calendar.** There is no build step, so the deploy uploads `web/dist` exactly as audited. Bindings: `DB` (calendar), `HEXA_PROTECTED_CONTROL` (`hexa-worker-v2#ProtectedVoiceControl`), `ASSETS`. Bundle `index.js` is `4aee74926255b5e475940578136be9d125c3eda9c4854012541da318f0e8dfcc`. It calls `createSession('normal', …, 'calendar')` and `setContextForOwner`, with no bearer-only `setContext`.
- Neither bundle contains a credential. Neither config enables source-map upload.

## 7. Affected hosts

Replacing the shared legacy interface affects every page that embeds `hexa-worker-v2`. The source inventory below covers each host's frontend (all clean checkouts, with no `HEXA_PROTECTED_*`, `ProtectedVoiceControl` or `setContextForOwner` anywhere in tracked source) and its deployed version, read fresh. No production users or sessions were enumerated.

| Host | Worker, live version | Embeds legacy Hexa at | Compatible candidate | After the shared switch |
|---|---|---|---|---|
| Calendar | `infflow-calendar` `054aee41` | `HexaWorker.tsx` | **yes (this candidate)** | Down only until the Calendar deploy finishes |
| Codegen | `infflow-codegen` `766d95d0` (2026-10-03) | `constants/urls.ts`, `VoiceAgent.tsx` | **none** | Hexa unavailable until migrated |
| Map | `infflow-map` `738ee346` (2026-09-12) | `utils/voiceWorker.ts` (`/?sessionId=`) | **none** | same |
| Newsbloom | `newsbloom` `49ff34d1` (2026-09-06) | `components/workerUtils.ts` | **none** | same |
| Root | `infflow` `b0d106fc` (2026-06-10) | `constants/urls.ts` | **none** | same |
| VC | `infflow-oana` `c89b1f3d` (2026-06-07) | `urls.ts`, narrator `NarratorCurtain.tsx` | **none** | same |
| Sudarshan | `infflow-sudarshan-ravi` `240f3d02` (2026-05-18) | `urls.ts`, `NarratorCurtain.tsx` | **none** | same |
| Sidin | `infflow-sidin` `a515daef` (2025-11-06) | `urls.ts`, `NarratorCurtain.tsx` | **none** | same |
| Email | `infflow-email` `f1c983e4` (2026-09-22) | `lib/hexa-worker-url.ts`, framed by `components/ui/hexa-panel.tsx` | **none**; its origin is also unregistered in Hexa (see the Email note below) | same |
| JA / `Infflow-job_apply` | `infflow-ja` `7ceefea7` | nested Root copy | excluded | Loss accepted by the owner; untouched; no exception, fallback or redirect |
| Chesky | `infflow-brianchesky` | binds the reference | n/a | **Unaffected** |

What breaks on a host without a candidate:

- The embedded pane loads the protected UI, posts `HEXA_PROTECTED_BOOT_READY`, gets no grant and stays disconnected: no voice, no typed replies, no narrator voice, no AutoDemo voice.
- The page's own `/api/external-data` posts get 403/404.
- Already-open legacy tabs lose SSE and credential minting at once. A call already running stays up browser-to-provider until the tab closes.
- Non-Hexa features of every host are unaffected, and so are unknown consumers' non-Hexa features. Hexa itself also stops for unknown consumers (GitHub Pages, local harnesses).

**Why Email is on this list.** The mail app frames the same shared Worker. Its default Hexa URL in `apps/mail/lib/hexa-worker-url.ts` is `https://hexa-worker-v2.prabhatravib.workers.dev`, and `hexa-panel.tsx` embeds it. The protected switch therefore cuts off its voice pane just like the others.

Email also needs one extra step that the other apps don't. Protected Hexa admits only exact registered host origins (`PROTECTED_APP_ORIGINS`), and Email's origin was never registered. `apps/mail/wrangler.jsonc` names both `infflow-email` and `env.production` `infflow-production`. A fresh read-only check today found:

- `infflow-production` was last deployed 2025-08-04;
- `infflow-email` was deployed regularly through 2026-09-22 (`E/inventory-infflow-*-deployments.json`).

So the live mail origin is most likely `https://infflow-email.prabhatravib.workers.dev`. **The owner confirmed this on 2026-10-16:** the mail app is at `https://infflow-email.prabhatravib.workers.dev`, and no other domain was named.

Registering it is still a shared change, and no file was edited for it here. It means:

- adding `email=https://infflow-email.prabhatravib.workers.dev` to `PROTECTED_APP_ORIGINS` in Hexa's `wrangler.jsonc`, `wrangler.release.jsonc` and `wrangler.protected-voice.recovery.jsonc` (the recovery file must stay identical, as a test enforces);
- updating `tests/unit/shared-protected-target.test.ts`, which currently asserts 9 registrations and that email is unregistered;
- updating Hexa's contract table, which still says the origin is unresolved.

All of those files except the contract are sealed inputs. The change therefore needs a new contract seal, revalidation of each host (Calendar's included), and Hexa's eventual deploy carrying the registration. It is best done while the other hosts are prepared, before the coordinated switch.

## 8. Order options

- **Shared-first.** This is the only order executable with the two targets authorized here. Deploy Hexa, then Calendar right after it. Calendar's Hexa is down for the minutes between the two deploys. **All eight hosts above lose Hexa from the switch until each has its own prepared, reviewed and deployed migration. No such candidate exists today, so the outage is open-ended. It is not accepted by default.**
- **Host-first.** Calendar against legacy Hexa fails closed with `503 calendar_context_contract_unavailable`. It would add a Calendar gap and still requires the same shared switch, so it is not proposed.
- **Reference two-hop.** Calendar would be moved to `hexa-worker-v2-protected` first, so the eight keep legacy for now. That requires:
  - redeploying the running reference with the version-2 recovery configuration, which changes Chesky's Hexa build and can drop live Chesky calls;
  - a separately written and tested Calendar variant pointing at the reference, which is not the final destination;
  - a second Calendar move later.

  It is outside this two-target authority and would need its own prepared scope and approval.

No order is disruption-free.

## 9. Prepared plan: shared-first (not approved; the owner chose to hold)

**0. Re-check before anything runs.** Re-run `E/identities.mjs`: the HEADs, Calendar dirty hashes, 38-input seal, configs and both artifact manifests must be unchanged. Re-read live versions: shared `478b8d8e`, reference `d9eb8e38`, Calendar `054aee41`, same account. Any drift means stop and reconcile.

**1. Shared switch.** From `C:\Users\prabh\GitHub-primary\hexa-v2`:

```powershell
.\node_modules\.bin\wrangler.cmd deploy --config .\wrangler.jsonc --name hexa-worker-v2
```

This runs `yarn build:protected` and applies `v2-protected-voice`. Afterwards check, all unpaid:

- `deployments list`/`versions view` show:
  - the new version at 100% with migration tag `v2-protected-voice`;
  - handlers `ProtectedVoiceControl` (with `setContextForOwner`), `ProtectedVoiceSession` and `VoiceSession`;
  - `VOICE_SESSION` still namespace `cbff5b34543b4420913d4c187cfcc22c`, plus a new `PROTECTED_VOICE` namespace (record its ID);
  - `ASSETS` with `run_worker_first`, `OPENAI_API_KEY` present by name, the vars as in the dry-run.
- `dist-protected` still hashes to `fb822f49…`.
- Plain HTTP GETs:
  - `/`, `/enhancedMode` and the 4 assets return exactly the audited bytes;
  - `/voice/sse`, `/voice/transcription-secret`, `/api/external-data`, `/api/external-data/status`, `/external-data.md`, `/shared/agentInstructions.js`, `/enhancedMode/x` and a source path return 404;
  - a foreign `Origin` gets 403.

Stop conditions for step 1:

- **The deploy is refused, for example the SQLite class beside the key-value class:** nothing changed and legacy stays live. Stop; do not deploy Calendar.
- **Any check fails:** stop before Calendar. Recovery is a reviewed roll-forward only.

**2. Calendar host.** Run this immediately after step 1 passes. Re-hash `web/dist` first; it must still be `48d8c1df…`. From `C:\Users\prabh\GitHub-primary\infflow-calendar\calendar-worker`:

```powershell
.\node_modules\.bin\wrangler.cmd deploy --config .\wrangler.jsonc --name infflow-calendar
```

Afterwards check:

- `versions view` shows `HEXA_PROTECTED_CONTROL` → `hexa-worker-v2#ProtectedVoiceControl`, D1 still `01905f11-…`, the secret name still present.
- GETs of `/`, `index.html` and the entry chunk return the audited bytes.
- `GET /api/events?from=…&to=…` returns 200, which proves the D1 read.
- `/api/hexa/session` returns 403 with no or a foreign `Origin` and 405 for a GET. These requests never reach the RPC.

If the deploy fails, inspect the resulting state before doing anything else. The actual unavailable interval is recorded from deploy timestamps. The Calendar Hexa gap is expected to be about 2–5 minutes. Calendar events, weather and navigation are not interrupted.

**3. Live verification.** Only within the approved budget (below).

**4. Final report.** Record the new version IDs, bindings, namespace history, published asset hashes, the interval, the budget used and the cleanup evidence. Evidence categories are reported separately.

**Recovery (version 2 only):**

- Hexa:
  - roll forward with a reviewed fix and the same command;
  - `478b8d8e` cannot be restored (Cloudflare rule), and the owner had already rejected restoring it;
  - once a second protected version exists, a rollback to the first protected version becomes possible.
- Calendar:
  - roll forward with a reviewed fix and the same command;
  - there is no earlier protected-compatible Calendar version, and `054aee41` is a legacy host that would only call retired routes.
- The reference recovery pair needs separate approval.
- Never:
  - legacy redeploys, routes or assets;
  - bearer-only fallbacks or redirects;
  - namespace deletes or transfers, or `wrangler delete`;
  - removing a key, or any D1 change.
- Both namespaces, the dormant legacy records and all cleanup keys and alarms stay.

**Proposed live budget** (Calendar only; headless Chrome 155 is confirmed available on `about:blank`; Edge 155 is Chromium, so not independent non-Chrome evidence):

| Item | Cap |
|---|---|
| Calendar page loads (each is a prewarm call) | ≤ 3 (initial, one reload, one spare) |
| Provider call starts of any kind (prewarm, reset button, reload, reconnect, replacement) | ≤ 5 |
| Response generations | ≤ 4: typed "ready", typed literal `completed`, one spoken, one spare |
| Microphone | 1 synthetic trial (fake device with SAPI speech); the owner's own microphone 0 times |
| Connected call time | each call closed within 4 min; ≤ 12 min total |
| Unpaid HTTP checks | ≤ 80 GET/HEAD and refused-origin requests |
| Email, notifications, diagrams, Calendar CRUD, other paid services | 0; no persistent fixture |
| Estimated provider cost | about US$0.25–0.50 (rates as fetched 2026-10-13), envelope US$1; an estimate, not a bill. The caps are on counts. |

What the browser run covers:

- the exact iframe origin and binding;
- network order (session, then context, then `/calls`);
- `HEXA_PROTECTED_CALL_STATE`/`HEXA_CONTEXT_INJECTED` matched against the loaded status, including A→B→A by changing view and back;
- no new call on duplicate readiness or when the sheet is hidden at phone width;
- zero `getUserMedia` while voice is OFF;
- the native Voice ON/OFF control and curtains;
- Text vs Voice placement and a single `completed`;
- reset and reload with native restore;
- Calendar navigation, weather and diagnostics.

Capture rules: only method, a redacted path, status, timing and non-secret message fields are kept. No grants, `Authorization`, bodies, HAR or raw logs are stored. Every call is closed through the product's paths. Provider hangup is confirmed from the administrative `wrangler tail hexa-worker-v2` observer records (`lastHangupCode` 1 or 2, `cleanupRecordPresent=false`, matching generation), filtered as they are read so nothing raw is persisted.

The live run stops on any of:

- reaching a cap;
- an unexplained extra `/calls`;
- `getUserMedia` while voice is OFF;
- any contact-tool attempt;
- a private marker or credential in page-visible data;
- "loaded" without a matching receipt;
- a call whose cleanup is not confirmed within 120 s. Then no new calls start, and the cleanup credentials and alarms are kept.

Ownership, expiry and revocation adversarial cases stay mocked.

## 10. Evidence status at preflight

| Category | Status |
|---|---|
| Offline checks (seal, tests, types, lint debt, builds, exact artifact scans, dry-runs) | **PASS** |
| Deployment | **UNVERIFIED**: not run; the owner chose to hold |
| Browser/UI | **UNVERIFIED** (about:blank only) |
| Provider | **UNVERIFIED** |
| Microphone/audio/playback | **UNVERIFIED** |
| Confidentiality | Offline scans of the exact artifacts **PASS**; live HTTP/assets/messages **UNVERIFIED**. Delivered UI/JS stays inspectable, and copies already downloaded cannot be recalled |
| Non-Chrome | **UNVERIFIED** |
| Human listening | **UNVERIFIED** |
| Owner acceptance | **UNVERIFIED** |

---

# Calendar protected Hexa host wiring — version 2

**LOCAL WIRING / OFFLINE PASS. DO NOT DEPLOY THIS CANDIDATE.** October 16, 2026 (America/New_York). The local deliberate 503 was replaced only after the staged route/bridge passed ownership and applied-receipt integration proof against the verified version-2 source. Missing/incompatible bindings, failed RPCs and invalid RPC results still return `503 {"error":"calendar_context_contract_unavailable"}`. There is no bearer-only fallback, alternate target or public redirect.

This task performed zero deployments, Cloudflare operations, secret access/changes, real provider generations, paid requests, application-page loads, microphone/media sessions, deliveries, commits or pushes. Historical prompt04/05 budgets were not used. Mock providers, sockets, clocks, media objects and an inert jsdom React mount do not establish browser/provider evidence.

## Authority, identities and seal

Only `C:\Users\prabh\GitHub-primary\infflow-calendar` was edited. The supplied AGENTS instructions apply; no repository/nested Calendar AGENTS file exists. Hexa and Chesky AGENTS, this report at entry, and the current shared migration contract/report and `VOICE_RUNTIME_CONTRACTS.md` were read. Hexa and Chesky remained read-only; JA and nested copies were untouched.

| Checkout | Actual root | HEAD at entry and completion | Owner dirty / nonignored untracked at entry |
|---|---|---|---|
| Calendar | `C:\Users\prabh\GitHub-primary\infflow-calendar` | `ba5ca610536fa356c549cc64c7433d2f15cce65d` | none / none |
| Hexa | `C:\Users\prabh\GitHub-primary\hexa-v2` | `f37cd7c3ca133b6774e52b5fc2e9b406dbffb663` | none / none |
| Chesky | `C:\Users\prabh\GitHub-primary\infflow-BrianChesky` | `5eac095669b4ee752aed0f07aae216a47b1370d2` | none / none |

Required contract: **`shared-protected-voice/2`**. Independently recomputed **all 38 individual input hashes**, then ordinal-sorted the `path:sha256` lines and SHA-256 hashed their LF join with **no trailing LF**. Every input matched its listed hash. The seal matched at entry, before route promotion and after final build:

`9f5d626fcdce335e516e98bb552f54c9db4944c012b2f407f2e4ef1bf8281e6d`

New ignored evidence: **`.wrangler/protected-hexa-v2-2026-10-16-local/`**. `entry-seal.json` preserves all 38 expected/actual hashes; `entry-identities.json` records all three actual roots/HEADs, owner dirty/untracked lists and lock/build/config hashes before editing; `entry-calendar-files.json` records entry file hashes. Earlier logs/seals remain intact. `report-entry.md` preserves the original report bytes; the full historical version-1 report follows below.

Destination remains exactly `https://hexa-worker-v2.prabhatravib.workers.dev/enhancedMode`; private service remains `hexa-worker-v2`, entrypoint `ProtectedVoiceControl`. `wrangler.jsonc`, Worker name, D1 database/schema/data and existing bindings are unchanged.

## Scoped implementation and proof

`/api/hexa/session` calls only `createSession('normal', CALENDAR_PARENT_ORIGIN, 'calendar')`. `/api/hexa/context` builds the existing strict Calendar framing from bounded visible facts and calls only `setContextForOwner(id, capability, context, {profile:'calendar',mode:'normal',parentOrigin:CALENDAR_PARENT_ORIGIN})`. The expected ownership fields are server constants. Request schemas still refuse browser profile/mode/parent/role/policy/tool/instruction controls; URL and Origin must both equal the Calendar origin. No login, secret, grant registry, persistent capability or new assistant permission was added. CORS is not used as ownership proof.

The server validates the exact grant shape, origin, mode, identity and expiry. It projects only that grant or strict `{ready:true,contextRevision,contextSha256}` after verifying the hash of the exact server-formatted UTF-8 context. Missing owner RPC support and all private RPC/result errors produce the same bounded 503 without logging or echoing private exceptions/context/capabilities. A stored write can precede a later failure; errors do not claim rollback or success.

The actual `ProtectedHexaBridge`, consumed by the unchanged `HexaWorker`, now checks a non-null exact iframe window, exact Hexa origin, local session ID, `source:'hexa-voice'` and the active grant ID. It accepts strict version-2 call-state and context-receipt schemas. It tracks the current ready positive generation, highest seen generation and retired generations; older lifecycle/receipt messages are inert, and a closed generation cannot be revived by queued ready messages. Connecting/current close clears applied status. New facts, reset, replacement, disposal, expiry or write error invalidate applied expectations. `sha256` is accepted only as an equal alias of `contextSha256`.

Every visible-fact change gets a local version, including A→B→A while a write is pending. Writes serialize; only a successful response for the latest fact version installs its exact revision/hash before any start/context-updated notification. There is no `storedHashes` applied cache. Queued first-A revision-1 receipts cannot acknowledge revision 3; old-grant receipts cannot acknowledge an identical replacement-grant hash. Storage, generic ready, diagram receipts and hash matches alone cannot display loaded. A fact arriving during a start notification stays queued. Disposed/old association responses cannot publish status or start. A grant expiring during initial storage cannot start.

Initial current context precedes `start:true`. Duplicate BOOT_READY and hidden-sheet rerenders create no new grants/calls. The single mounted `voice=off&prewarm=true` iframe, silent placeholder, microphone permission policy, curtains, layout and native power/presentation ownership remain unchanged. Reload/reset makes a fresh memory-only association and restores the native presentation snapshot. Failed initial writes abandon the uncertain grant and obtain a fresh one only on new facts/reset; failed installed writes clear expectations and wait for new facts/reset before replacement. No immediate retry/provider-call campaign or old expectation reinstatement occurs. Abandoned grants retain the shared ordinary expiry/cleanup semantics.

Before promoting the route, `routes-v2.ts` was staged under new ignored evidence and loaded as the route source at its original module identity, through the actual Hono entry/formatter/bridge and real read-only Hexa `ProtectedVoiceControl`, serialized DO, ownership/storage, call host/controller and browser adapter/receipt producer. Only namespace storage, clocks, provider, transport/media and delivery boundaries were inert. **54/54 staged checks passed**, then the 38 inputs were rechecked and the tested route was copied byte-identically over the deliberate block. `promotion.json`, `routes-fail-closed-entry.ts`, `routes-v2.ts` and `staged-tests-2.log` preserve that evidence. Final tests run the actual promoted source with no candidate override. Further expiry/queue regressions brought the final total to **57/57**.

| Required offline case | Fresh evidence |
|---|---|
| Valid Calendar ownership; valid Chesky and narrator bearers under Calendar expectation; wrong stored parent/profile/mode, mismatched pairs, expired/revoked grants | Actual host request → fixed-owner RPC → real serialized DO; refusal snapshots include all durable keys, alarm, generation/applied state, host state and inert provider activity; zero refusal mutation/revision/provider effects |
| Stored before readiness; current provider configuration acknowledgement; context written while connecting | Real DO `/calls`, controller acknowledgement and authenticated status; no applied receipt before ready; connecting-call supersession and old ready callback remain inert |
| A→B→A, queued revision 1, newest revision, replacement grant with same hash | Actual bridge and actual adapter producer/DO status; strict tuple acceptance and equal hash alias; only newest eligible receipt applies |
| Reconnect/reset, delayed status, older generation/ready/closed/connecting, error/disposal | Real reset/new call generation and adapter replacement; old status/receipt/lifecycle cannot restore applied state; no provider call reuse |
| Initial/prewarm, duplicate readiness, reload/reset, hidden panel and native restore | Actual `HexaWorker` mounted in inert jsdom; same iframe on hide/show; native state-machine restore; reset replaces association; zero grant storage; actual adapter callback produces mocked zero-gain placeholder without requesting microphone |
| All 16 legacy offerings, arguments/results/correlation, 8s/30s walls and exact no-handler timeout | Fresh sealed profile-plan comparison against all actual legacy schemas/descriptions/order; invoked legacy factories versus real protected adapter; real controller with mocked timers; wrong source/origin/session/request and late replies refused; exact `Infflow did not confirm the action in time.` reaches model once |
| Text/Voice and literal `completed` | Fresh sealed adapter → real transcript subscription/coordinator → chat channel/reducer tests; typed/tool continuations stay Text; spoken input/reply stays Voice; genuine final text once; completion status lifecycle-only |

Calendar still implements no Infflow action handler or Calendar CRUD tool. Email/notification contact callbacks and MIME/send-email boundaries were inert throughout testing. No successful action/assistant permissions were introduced.

## Commands, results and artifacts

All scripts were inspected before execution. Installed Node/npm/TypeScript/ESLint/Vite/jsdom tools only; no install/update. In this section `E` abbreviates `.wrangler/protected-hexa-v2-2026-10-16-local` relative to the Calendar root. Tests/final builds used `NODE_OPTIONS=--require=../../E/offline-guard.cjs` from `calendar-worker/web`, with `E` expanded to its actual path. The preload refuses real fetch, WebSocket and HTTP/HTTPS/TCP/TLS/UDP connections. Test fixtures replace only their inert I/O boundaries.

| Command from `calendar-worker/web` unless stated | Result / retained evidence |
|---|---|
| Entry `npm.cmd test` | **34/34 PASS**, `baseline-tests.log` |
| Final `npm.cmd test` | **57/57 PASS**, zero skips; `final-tests-4.log` |
| `npm.cmd run lint` before/after | **Existing FAIL: 19 errors, 6 warnings**, byte-identical findings in `baseline-lint.log` / `final-lint-1.log`; no unrelated repair |
| `.\node_modules\.bin\tsc.cmd --noEmit` | **PASS**, `final-frontend-types-3.log`; also repeated by final build |
| `.\node_modules\.bin\tsc.cmd --noEmit --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM --skipLibCheck ..\worker\index.ts` | **Existing FAIL: same 3 errors**, baseline/final logs byte-identical |
| Same installed `tsc.cmd`, adding `--strict`, with `..\worker\protectedHexa\routes.ts ..\worker\protectedHexa\calendarContext.ts` as inputs | **PASS**, `final-seam-types.log` |
| Installed `eslint.cmd --config .eslintrc.cjs`, bridge/component and both private seam TS files, `--no-ignore --max-warnings 0` | **PASS**, `final-changed-ts-lint-4.log` |
| Installed `eslint.cmd` on all changed/new `.mjs` tests/helper/scanner, `--env node --no-ignore --max-warnings 0` | **PASS**, `final-changed-js-lint-3.log` |
| `npm.cmd run build` | **PASS, release OFF**, frontend TypeScript + Vite + `scan:protected`; `final-build-4.log`; 48 public files, 50 markers, zero findings |
| From Calendar root: `node E/artifact-audit.mjs` with root-relative offline preload | **PASS**, `final-artifact-audit-2.log`, `artifact-audit.json`; recomputed 38-input seal and AST-extracted CURRENT Hexa/Calendar/both-Chesky marker union; complete exact output manifest |
| From Calendar root: `node E/identity-final.mjs`, `git diff --check`, final diff review | **PASS**; `final-identities.json` has every source/file hash, allowed-edit preservation, roots/HEADs/dirty lists and unchanged locks/configs/reference status |
| Cloudflare/Wrangler, deployment, server/provider/browser/audio work | **UNRUN**, unauthorized; no dry-run, login, dev/preview server or application load |

Whole Worker debt remains `routes/echo.ts(32,65)` and `routes/seed.ts(14,34)` unknown-to-string, plus `services/weather-service.ts(135,23)` missing `current_weather`. Those files are unchanged. First changed-TS lint invocation lacked the web config for Worker paths; the explicit-config invocation passed. Initial Vite/esbuild build was denied ancestor/config reads by the filesystem sandbox; the same authorized offline build passed through the normal filesystem approval path. Existing Browserslist/Mermaid/large-chunk warnings remain. An integration fixture initially used fixed event-loop settling and raced an asynchronous status receipt; it now awaits that receipt transition. Earlier unsuccessful logs remain preserved.

The scanner reads **every exact emitted file**, including dependency chunks and non-text assets, checks 50 current/private markers plus credentials, and refuses maps/source/Worker/config/environment asset paths. Marker equality is derived afresh from the four current scanner sources, allowing only Calendar's intended shared public origin from Chesky's host-specific exclusion. Positive tests catch all 50 markers, all three credential patterns and 11 map/source/config/environment paths. No source map is emitted. The existing `index.html` external Mermaid CDN script remains unchanged and was not fetched; its remote bytes and live asset routing are outside this emitted-artifact proof.

Final source manifest aggregate (all tracked/nonignored task files, excluding this report to avoid circularity):
`71d670c8b82d95e7ac8a3e440de335bc3b937fef52035a2282337b5b10848db2`

Final **48-file artifact manifest aggregate** (ordinal `path:sha256`, LF join, no trailing LF):
`48d8c1df07058e099f2dab0259245c162eb7d3bb1e0ff2aec7f139bafbb74903`

Entry artifact `assets/index-DgFUB4Jj.js`: `6b11d2271a472b966372f68cd50419ada533fe75737d08f1ab4dc162dcc3ec76`.
`index.html`: `17039e64c9344771624483499e9308d2e6164640209a7ed9d073574c32de50af`.
Every artifact hash and current reference scanner hash is in `artifact-audit.json`; every changed/new source hash and separate report hash is in `final-identities.json`.

| Preserved input | SHA-256 at entry and completion |
|---|---|
| `calendar-worker/package-lock.json` | `7255a5bf75f688203a6978782dc0f86d50bdee3c1557e470db8ca0f708100e01` |
| `calendar-worker/web/package-lock.json` | `6ec843001c199d13e433d489a675c269b24ab1b0bdd9c008d4ca705ac716b491` |
| `calendar-worker/wrangler.jsonc` | `6c69562def6e08302bc61b7080b0c8b9a844c121ea7581b1addb1553428dea25` |
| `calendar-worker/web/vite.config.ts` | `7e868e8894bd8dee4d40c4ad608ae96c9a3cce895b7b698e9ec182decaa25afc` |
| Hexa `yarn.lock` | `2d829e8e99c39f722f340c5bb69cc2d58d0c2fcd2fc0a1aed99709506a39eea1` |

All other enumerated lock/build/Worker/type/lint configs remain unchanged except Calendar web `package.json`'s local test registration. Runtime/model/limits/release settings and both reference checkouts are unchanged. `HexaWorker.tsx`, all other UI/CSS, weather/storage/calendar/date/navigation, diagnostics/export, Worker entry/types/config and schema/data files match entry hashes. Of 252 entry tracked files, 243 remain byte-identical; only the nine scoped tracked paths below changed. Five new test/helper files were added.

Changed files: `calendar-worker/worker/protectedHexa/routes.ts`, `calendarContext.ts`; `calendar-worker/web/src/lib/protectedHexaBridge.ts`; `calendar-worker/web/scripts/protected-hexa-build-scan.mjs`; web `package.json`; existing web tests `protected-hexa-server.test.mjs`, `protected-hexa-bridge.test.mjs`, `protected-hexa-build-scan.test.mjs`; this report. New web tests/helpers: `protected-hexa-source.mjs`, `protected-hexa-v2-integration.test.mjs`, `protected-hexa-component.test.mjs`, `protected-hexa-tool-parity.test.mjs`, `protected-hexa-transcript.test.mjs`.

## Coordinated deployment and recovery proposal — DO NOT EXECUTE

This is a local candidate, **not rollout approval**. A later approved rollout must first reconcile fresh shared `hexa-worker-v2`, reference `hexa-worker-v2-protected` and host deployed versions; exact source/artifact identities; origin registration, both private bindings, asset manifests and each target's applied DO namespace/migration history. Reconcile current Cloudflare migration/rollback constraints and scoped cleanup dependencies. Historical IDs in the preserved report or shared documents are not current deployment authority. No deployment is proposed as disruption-free.

- **Shared-first:** replacing legacy shared Hexa removes its old routes/assets immediately. Unmigrated hosts lose Hexa until compatible host deployments complete; existing legacy tabs need reload. Calendar becomes available only after its compatible host deployment. Explicitly approve the duration/impact of that unavailable interval across the affected hosts.
- **Host-first:** this host cannot complete version-2 RPC/receipt bootstrapping against legacy or version-1 Hexa. Calendar protected voice is unavailable between host rollout and compatible shared rollout. Do not bypass that interval with bearer-only writes or legacy fallback.
- **Reference-target two-hop:** first prepare/review a version-2-compatible reference target with Calendar registration and a matched host origin/private-binding pair. Updating the running reference may interrupt Chesky/current calls; the two host moves require fresh grants/context and can each have an unavailable interval. Review those dependencies/cleanup duties separately. The present candidate keeps the exact final shared destination and contains no alternate pair/redirect.

After fresh reconciliation, explicit approval and repeat local gates, the host-only proposed command is `npx.cmd wrangler deploy --config .\wrangler.jsonc --name infflow-calendar` from `C:\Users\prabh\GitHub-primary\infflow-calendar\calendar-worker`. The coordinator owns separately reviewed shared/reference commands and migrations; no wrapper, shared command or database migration is authorized by this proposal. Reconcile deployed versions/bindings again after the coordinated move, then separately authorize bounded browser/provider/microphone and owner checks.

Recovery must roll forward or select a freshly verified protected version/host-target pair retaining **version-2 owner RPC and revision/grant/generation lifecycle receipts**. A previous protected version with only version-1 interfaces is incompatible. The first Calendar protected rollout has no established protected-compatible previous host version. A later host rollback can use only a freshly verified compatible version and the explicit Calendar config/name. A shared class addition can constrain rollback across namespace history; reconcile it before choosing a command. Keep D1 data/schema, dormant legacy records, both protected namespaces/data/alarms and cleanup credentials. Calls belong to their creating namespace; closed sockets/tabs or 204 alone do not prove provider termination. Never reopen legacy routes/assets, add fallback/redirect for Calendar or JA, delete/transfer namespaces or revoke cleanup keys to recover.

## Remaining evidence and manual acceptance

| Evidence class | Status |
|---|---|
| Version-2 source seal, actual mocked ownership/revision/receipt integration, typed/spoken/tool parity, types/scoped lint/build/artifact scan | **OFFLINE PASS**; whole-repository lint/Worker type debt unchanged as above |
| Deployment/current live versions/bindings/namespace migration | **UNVERIFIED**, zero Cloudflare operations |
| Browser/UI, native microphone behavior and non-Chrome | **UNVERIFIED**; jsdom is not browser/visual evidence |
| Real provider, audio/playback/lipsync/latency/termination | **UNVERIFIED**, zero live generations or media sessions |
| Confidentiality/live HTTP/assets/logs and prompt-injection resistance | **UNVERIFIED beyond bounded offline projections and exact emitted-artifact scans**; delivered UI/JS remains inspectable |
| Owner acceptance/human listening | **UNVERIFIED** |

After a separately approved rollout, manually verify day/week/month/list navigation and CRUD persistence/reload; date/timezone/weather unavailable ranges/units; initial native curtains, silent prewarm, Voice ON/OFF and permission prompt; hide/show continuity and reset/reload snapshots; truthful latest-context loaded state; Text/Voice/tool continuations and genuine final text; bounded failures/expiry; combined redacted diagnostic export/directory behavior. First confirm an available browser runtime under that later scope. No application page or browser verification was attempted here.

---

## Historical version-1 report (preserved; superseded by version 2 above)

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
