---
slug: ws-doctor-json-esm
title: ws-doctor --json stdout contract and self-describing ESM entrypoint
status: active
step: 2
workflowId: ws-doctor-json-esm-20260902T120042Z
startedAt: "2026-09-02T12:00:42Z"
endedAt: "2026-09-02T12:08:07.716Z"
acRefs: []
shared_understanding: confirmed
---
> Refined by ws-interview (force_interview: High MEMORY path-token match). `step-01-ws-doctor-json-esm.plan.md` is untouched. ESM marker stays skill-local `package.json`. Do not reopen `.mjs` or expand #259/#262.

## 0. Summary & Business Rules

Make `ws-doctor --json` a machine contract for GitHub #260 and amended #261: one JSON object on stdout, and a self-describing ESM marker so copied `doctor.js` loads under CommonJS or typeless ancestors without depending on this repo's root `"type": "module"`.

**Business rules**

- `--json` stdout is parseable by `JSON.parse` / `json.loads` of the **entire** stdout string (Python Extra data must not occur).
- Persist and usage text stay off stdout on the `--json` success path; persist path stays on stderr.
- Consumer and global copies of the skill tree must load as ESM because of a marker **next to** `doctor.js`, not because the consumer root is ESM.
- Root `package.json` `"type": "module"` is already intentional (initial commit `6899a644`). Do not add, remove, or rewrite that key.
- Keep `doctor.js` as ESM (`import` / `import.meta.url` / `createRequire`). Do not rewrite to CJS.
- Do not reopen #259 or #262. Do not vendor `ws-memo`. Do not switch `--json` to JSONL unless stdout isolation fails (it should not).

**Security / safety**

- Doctor remains read-only. No new network, auth, or filesystem-write behavior except existing `--persist`.
- Skill-local `package.json` is a private stub (`private: true`). It is not a publishable npm package.

## 1. Definition of Ready & Scope

**Resolved assumptions (companion + spec; interview closed, not skipped)**

| Item | Decision | Status |
|------|---------|--------|
| ESM marker | Skill-local `.agents/skills/ws-doctor/package.json` with `"type": "module"` | Resolved (interview confirmed) |
| Rename `doctor.js` → `doctor.mjs` | Rejected (churns SKILL.md, evals, tests, every citation) | Resolved (do not reopen) |
| JSONL `--json` | Rejected unless stdout isolation fails | Resolved |
| Root `"type": "module"` | Keep as-is; do not treat #261 as a missing root key | Resolved |
| SKILL.md edits | Body and launcher frozen in Steps A–F; Step G `build-site:bump` may stamp `version:` frontmatter only | Resolved (interview G2) |
| CATALOG.md / README.md doctor row | Leave as-is (diagnose sentence already accurate); FEATURES.md 0.3.54 row is required | Resolved (interview G4) |

**In scope (AC1–AC8)**

- Ship the skill-local ESM marker.
- Isolate `--json` stdout (`process.stdout.write` plus optional single newline).
- Replace the test fixture workaround that writes `"type": "module"` at the *consumer repo root*.
- Prove CJS-ancestor and typeless-ancestor copies with the shipped marker.
- Keep persist on stderr.
- `node test/test-ws-doctor.js` exit 0.

**Out of scope**

- Issue #262 (`sync-db-remote-to-local`) and issue #259 (README/FEATURES missing-ref).
- Converting other skill helpers from `.cjs` to ESM.
- Touching `resolveCitedPath` / docs/ hybrid resolution (shipped in #206 / spec 0026).
- Shipping `FEATURES.md` into consumer skill trees.
- Editing root `"type": "module"`.
- SKILL.md launcher filename (stays `node {skillsRoot}/ws-doctor/scripts/doctor.js`). Do not hand-edit SKILL.md body. Bump may change `version:` only.

## 2. Technical Design & Architecture

**Stack:** `node-skills-package` (Node 22 / JavaScript). Layers from `config.json`:

| Layer | Path | This slug |
|-------|-------|-----------|
| skills-sot | `.agents/skills` | `ws-doctor/package.json` (new); `ws-doctor/scripts/doctor.js` stdout isolation only |
| tests | `test/` | `test/test-ws-doctor.js` |
| installer-cli | `bin` | **Late hygiene only** after doctor tests are green (`build-site:bump`, `generate-integrity`) |

Frontend / database / i18n: none.

**Chosen ESM marker**

Create `.agents/skills/ws-doctor/package.json`:

```json
{
  "name": "ws-doctor",
  "private": true,
  "type": "module"
}
```

Node walks from `scripts/doctor.js` to the nearest `package.json`. A skill-local file makes consumer/global copies ESM without the consumer root. Interview confirmed: installer `enumerateSkillFiles` hashes and copies all non-skipped skill files; `package.json` is not in `CONSUMER_OWNED_FILES` / `SKIP_INSTALL_FILES` (`bin/install-rules.js`); npm `files` includes `.agents/skills/`. Root has no `workspaces`, so `"name": "ws-doctor"` does not nest as an npm workspace. No `HUB_WHITELIST` change (skill file, not hub).

**Rejected:** `doctor.mjs`. Same Node behavior, larger citation churn. Recorded here so implementers do not reopen it.

**`--json` stdout isolation**

Today `main()` does `console.log(JSON.stringify(report, null, 2))` (`1f537a23` design: machine report on stdout; `doctor.js` ~L1305). Persist is already `console.error` (~L1320; AC7 already true in-repo). Persist file bytes for `--json` are already raw `JSON.stringify` (~L1318), not `asciiSafe`. Change the `--json` success path to `process.stdout.write(JSON.stringify(report, null, 2) + '\n')`. Do not wrap JSON in `asciiSafe` (vault: keep `--json` free of destructive ASCII mangling). Human markdown path stays `console.log(asciiSafe(formatMarkdown(report)))`. `--help` may keep `console.log` usage (`usage()` exits before the report).

Audit the `--json` success path for any other `console.log` (none expected besides the report). Unknown-option `usage()` is an error path (`console.error` then exit 2), not the JSON success path.

**Tests (`test/test-ws-doctor.js`)**

- Interview confirmed: `setupTmpDoctorProject` (L220) and `testMissingConfigDoesNotInventValues` (L121) both write `{"type":"module"}` at the fixture **repo root** and copy only `doctor.js`. That hides the consumer defect (spec Design Intent). Companion “next to copied `doctor.js`” is the **product** target, not the current fixture.
- After the product marker ships: copy the shipped `ws-doctor/package.json` beside copied `doctor.js`. Do **not** write `"type": "module"` at the fixture repo root as the passing proof (AC5, NS3).
- Ancestor fixtures: `"type": "commonjs"` (AC3) and omitted `type` (AC4).
- Strict parse: `JSON.parse` of the full stdout string (NS2). Optional single trailing newline only. Do not treat `.trim()` as sufficient if extra non-whitespace follows `}`.

**Design intent (`git log`)**

- `git log -S '"type": "module"' -- package.json` → `6899a644` initial commit. Keep.
- `git log -S 'console.log(JSON.stringify(report' -- doctor.js` → `1f537a23` introduce doctor. Keep single JSON object; isolate the stream, do not change schema.
- Fixture `"type":"module"` at temp root: workaround, not a shipped contract.

**Fable domain adapters:** skip. No IaC / K8s / Docker / DB-migration / Data-script signals.

**MEMORY applied (Medium+)**

- **Doctor hybrid leftovers (Medium, local):** do not retouch hybrid global-hub scanning; this slug is JSON/ESM only.
- **ws-doctor skill-folder docs (High, vault `2026-08-14-ws-doctor-skill-folder-docs`):** do not retouch `resolveCitedPath`.
- **asciiSafe (Medium, vault `2026-08-12-ws-doctor-asciisafe-punctuation`):** do not run `asciiSafe` on `--json`.
- **JSON whitelist / version bump (High):** do not add files under `ws-shared/` (skill-local `package.json` is not hub). Bump version **once** via `npm run build-site:bump`; never increment `package.json` then bump again. Integrity copy/hash stay in lockstep; skill-local `package.json` is hashed by existing skill walk (no `HUB_WHITELIST` change).
- **Verify negative scenarios (High):** NS1–NS3 must have named tests and later `ac_ledger.cjs link --negative NS{n}` or Step 5 caps at 8. Ledger already lists NS1–NS3.
- **Do not start harness benchmarks (High):** do not load `ws-run-benchmark` or run `npm run benchmark` / `benchmark:static`. `npm run test` (`verification.backendTest`) may still execute `test-harness-benchmark.js` as a package unit test; that is not a live orch benchmark.

## 3. Step-by-Step Plan

Implement sequentially (`enableDag=false`). Surgical doctor edit first; ship/release hygiene last so G2-code can include bump files after tests are green.

### Step A — Ship skill-local ESM marker (AC3, AC4, AC5, AC6)

- **Action:** Add `.agents/skills/ws-doctor/package.json` with `"name": "ws-doctor"`, `"private": true`, `"type": "module"`. Do not add `version` (avoids drift with package stamp).
- **Files:** `.agents/skills/ws-doctor/package.json` (create). Do not edit root `package.json` `"type"`. Do not edit `SKILL.md` body or launcher (filename unchanged). Step G bump may stamp `version:` later.
- **Check:** nearest package.json to `scripts/doctor.js` is the skill file.

### Step B — Isolate `--json` stdout (AC1, AC2, AC7)

- **Action:** `--json` success path writes exactly `JSON.stringify(report, null, 2)` plus one newline via `process.stdout.write`. Keep `--persist` `console.error`. Do not print persist/usage/warnings on stdout. Do not invent JSONL. Do not wrap this payload in `asciiSafe`.
- **Files:** `.agents/skills/ws-doctor/scripts/doctor.js` only (stdout write; do not retouch `resolveCitedPath` or hybrid leftover scans in the same file).
- **Check:** in-repo `node .agents/skills/ws-doctor/scripts/doctor.js --json --skill ws-doctor` still parseable; `--json --persist` persist line on stderr only.

### Step C — Defect-class sibling sweep (bugfix ACs)

- **Defect class:** ESM `import` in a skill `*.js` file that is not self-describing when copied under CJS/typeless ancestors; `--json` extra-data on stdout.
- **Sweep:** `rg '^import ' .agents/skills --glob '*.js'` (exclude `*.cjs`). Interview already ran this: **only** `.agents/skills/ws-doctor/scripts/doctor.js`. Re-run at implement time; do not convert other skills to ESM. Do not add skill-local `package.json` to `.cjs` skills.
- **Files:** none unless the sweep finds another ESM `.js` (escalate; do not expand scope silently).

### Step D — Tests: product marker + strict JSON + NS1–NS3 (AC1–AC8, NS1–NS3)

- **Action:** Update `test/test-ws-doctor.js`:
  1. Helper `copyShippedDoctor(skillDir)` copies `doctor.js` **and** shipped `ws-doctor/package.json` (not a handwritten `"type":"module"` at fixture root).
  2. Change `setupTmpDoctorProject` / missing-config fixture: stop using consumer-root `"type":"module"` as the passing ESM proof. Ancestor may be `"type":"commonjs"` or omit `type`.
  3. Add named tests listed in §5 (including NS1–NS3 so Step 5 can `link --negative NS{n}`).
  4. Strengthen existing `JSON.parse((stdout || '').trim())` so extra tokens after `}` fail (NS2). Assert stdout has no `MODULE_TYPELESS`, persist, or usage text.
- **Files:** `test/test-ws-doctor.js`.
- **Check:** `node test/test-ws-doctor.js` exit 0.

### Step E — Sabotage (mutation unset)

`verification.mutationTest` is empty; `defaults.skipMutationTesting` is true. Use sabotage instead of mutation score.

- **Action:** After Step D is green, run:

  `python .agents/skills/ws-testing/scripts/run_sabotage.py --test "node test/test-ws-doctor.js" --paths .agents/skills/ws-doctor/package.json .agents/skills/ws-doctor/scripts/doctor.js --invert-patch {plansDir}/ws-doctor-json-esm/step-07-sabotage.invert.patch`

  Invert patch (either is enough): strip skill `"type": "module"` **or** restore `console.log` plus a second stdout line after the JSON. Expect the doctor test file to fail, then restore bytes.
- **Files:** invert patch under the plan dir (testing artifact; not G2-code unless Step 7 writes it). Product files restored.
- **Check:** sabotage script exit 0 (test failed under invert, files restored).

### Step F — Local doctor proof (before bump)

- **Action:** `node test/test-ws-doctor.js` exit 0. Optional: CJS-ancestor fixture `JSON.parse(stdout)` already inside Step D.
- **Do not** mix version bump into this step.

### Step G — Ship/release hygiene AFTER doctor is green (G2-code)

Owned by **Step 4 last implement task** (preferred so the product commit after verify includes bump files). Not mixed into Steps A–B.

- **Action (order matters):**
  1. Add a **0.3.54** FEATURES.md evolution row: skill-local ESM marker + `--json` stdout isolation (#260 / amended #261). **Default: do not edit CATALOG.md / README.md** (current doctor rows already say install/runtime diagnose / read-only diagnose). Touch those files only if that one-line sentence is edited in the same PR.
  2. `npm run build-site:bump` **once** (0.3.53 → 0.3.54). This stamps `package.json` (version only; keep `"type": "module"`), site footer/`docs/index.html`, every `SKILL.md` frontmatter `version:`, and `packageVersion` in `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json`. **DO NOT** hand-increment `package.json` first (MEMORY).
  3. `npm run generate-integrity` then `npm run verify-integrity` (new `ws-doctor/package.json` plus bumped frontmatters). LF manifest; do not hand-edit hashes.
  4. **AGENTS.md:** hub-sync check only. Do **not** rewrite the inlined session-contract snapshot version (`0.3.50`) unless those inlined skill contracts actually changed (they do not). Skip installer CLI/shim rows (no install UX change).
- **Files (late set):** `package.json`, `docs/index.html`, `FEATURES.md`, `CATALOG.md` (only if row text changes; default no), `README.md` (only if row text changes; default no), `bin/skill-dependencies.json`, `.agents/skills/ws-shared/skill-dependencies.json`, all hashed `SKILL.md` frontmatters via bump, `bin/skill-integrity.json`. `AGENTS.md` / `ws-shared/AGENTS.md` only if hub drift appears (expected: no).
- **Check:** `npm run test` (`verification.backendTest`) before claiming review-proof. Integrity `--check` exit 0. Do **not** also run `npm run benchmark`.

## 4. Permissions, Tenancy & i18n

N/A. Local Node CLI; no RBAC, tenancy, or i18n. Paths stay POSIX-relative in reports (`toPosix`). Soft-deletion, concurrency, list sizing, and rate-limit probes: N/A.

## 5. Test Coverage

| AC / NS | Plan step | Test case (method name) | Files |
|---------|-----------|-------------------------|-------|
| AC1 | B, D | `testJsonStdoutIsExactlyOneObject` — `JSON.parse` full stdout; optional single trailing newline; `report.tool === 'ws-doctor'` | `doctor.js`, `test/test-ws-doctor.js` |
| AC2 | B, D | `testJsonStdoutHasNoTrailerText` — after closing `}`, no `MODULE_TYPELESS`, persist, or usage text on stdout | `doctor.js`, `test/test-ws-doctor.js` |
| AC3 | A, D | `testCopiedDoctorUnderCommonjsAncestor` — temp tree with ancestor `"type":"commonjs"`; copy `doctor.js` + shipped skill `package.json`; `node …/doctor.js --json --skill ws-doctor` exit 0 and parseable | `ws-doctor/package.json`, `test/test-ws-doctor.js` |
| AC4 | A, D | `testCopiedDoctorUnderTypelessAncestor` — ancestor `package.json` omits `type`; same product copy | same |
| AC5 | A, D | `testFixtureCopiesShippedEsmMarker` — fixture copies shipped marker; does **not** write `"type":"module"` at fixture repo root | `test/test-ws-doctor.js` |
| AC6 | A, F | `testRootPackageJsonTypeModuleUnchanged` — root `package.json` still `"type":"module"`; `git diff` does not touch that key (version bump in Step G may change `version`, not `type`) | `package.json` (assert only) |
| AC7 | B, D | `testPersistPathOnStderrOnly` — `--json --persist` persist path on stderr; stdout still one JSON object | `doctor.js`, `test/test-ws-doctor.js` |
| AC8 | D, F | `testWsDoctorSuiteExitZero` — `node test/test-ws-doctor.js` exit 0 (suite process) | `test/test-ws-doctor.js` |
| NS1 | D | `testBareDoctorJsCopyWithoutMarkerFails` — copy **only** `scripts/doctor.js` (still `.js`) under `"type":"commonjs"` with **no** skill `package.json`; Node 22 non-zero, `Cannot use import statement outside a module`, empty stdout. Product copy (marker included) is the green path (AC3). | `test/test-ws-doctor.js` |
| NS2 | D | Same assertion as AC2: `JSON.parse(entireStdout)` throws if any non-whitespace follows the root object | `test/test-ws-doctor.js` |
| NS3 | D | Passing proof is CJS/typeless **ancestor** + shipped skill marker, not consumer-root `"type":"module"` + bare `doctor.js`. Covered by AC3/AC4/AC5; do not keep the old root-only fixture as the ESM proof. | `test/test-ws-doctor.js` |
| Sibling sweep | C | Documented `rg` result: only `doctor.js` uses ESM `import` among skill `*.js` (interview pre-confirmed) | (check in implement report) |
| Sabotage | E | `run_sabotage.py` on marker and/or stdout write; doctor tests fail then restore | `run_sabotage.py` |
| Late hygiene | G | `npm run test` exit 0 after bump + integrity (verify / Step 7) | bump + `bin/skill-integrity.json` |

Existing tests (`testJsonReportShape`, missing-config, docs/ fixtures) stay; they must use the shipped marker helper after Step D.

## 6. Invariants (Do Not Violate)

- `commitPlanFilesOnlyAtStep8`: true — do not `git add` `{plansDir}` in implement/product commits except Step 8 close.
- Root `"type": "module"` remains. Do not treat #261 as a missing root key.
- `doctor.js` stays ESM with `import`. Do not CJS-rewrite.
- Launcher stays `node {skillsRoot}/ws-doctor/scripts/doctor.js`. Do not rename to `.mjs`.
- Do not convert other skill scripts to ESM.
- Do not wrap `--json` in `asciiSafe`.
- Do not retouch `resolveCitedPath`, hybrid leftover scans, or retired-artifact tables.
- Do not reopen #259 / #262.
- Do not run `npm run benchmark` / `ws-run-benchmark` from this delivery (`npm run test` is the configured backend test, not a live benchmark).
- Bump version once via `build-site:bump`; regenerate integrity after hashed content (including the new skill `package.json` and bumped frontmatters).
- Do not hand-edit SKILL.md body; bump may stamp `version:` frontmatter only.
- EF / tenancy / i18n sample invariants: N/A (`false`).

## 7. Pre-PR Checklist

- [x] Layer boundaries respected (skills-sot + tests first; installer-cli only in Step G).
- [x] Domain entities and mappings encapsulated. (N/A)
- [x] Schema migrations created. (N/A)
- [x] Authorization checks applied. (N/A)
- [x] i18n keys declared. (N/A)
- [x] Test cases cover all ACs and NS1–NS3.
- [x] Defect-class sibling sweep recorded (only `doctor.js` is ESM `.js` in skills).
- [x] Sabotage via `run_sabotage.py` (mutation unset).
- [x] `node test/test-ws-doctor.js` exit 0 before bump.
- [x] Step G: `build-site:bump` once, FEATURES 0.3.54 row, integrity generate+check, `npm run test`.
- [x] SKILL.md body/launcher untouched; bump may change `version:` frontmatter only.

## 8. Open Questions

None remaining. Draft §8 was already empty. Interview force-ran Audit + Resolve: ESM marker = skill-local `package.json` `"type": "module"`; `.mjs` stays rejected; #259/#262 stay out of scope. Registry closed (`blocking_open: 0`). `shared_understanding: confirmed`.

## Interview registry

| id | class | section | gap | recommendation | status | resolution | resolutionSource | evidence | dependsOn |
|----|-------|---------|-----|----------------|--------|------------|------------------|----------|-----------|
| G1 | blocking | §5 / DoR | Implement tasks lacking failing-test baseline | Keep named NS1–NS3 tests | closed | Plan §5 already names `testBareDoctorJsCopyWithoutMarkerFails`, NS2 parse, NS3 ancestor+marker; ledger has NS1–NS3 | project | `step-00` Negative scenarios; `ac-ledger.json` `negativeScenarios`; plan §5 | |
| G2 | non-blocking | §3 A / §7 | “SKILL.md untouched” vs bump stamping every frontmatter | Freeze body; allow bump `version:` | closed | Steps A–F do not edit SKILL.md body/launcher; Step G `build-site:bump` may stamp `version:` only; do not hand-edit | project | `package.json` script `build-site:bump`; MEMORY bump-once trap | |
| G3 | non-blocking | §2 marker | Unverified whether installer copies skill `package.json` | Confirm skip/owned sets | closed | Not in `SKIP_INSTALL_FILES` or `CONSUMER_OWNED_FILES`; hashed by `enumerateSkillFiles`; npm `files` includes `.agents/skills/` | project | `bin/install-rules.js` L55–73; `bin/skill-integrity-lib.js` `enumerateSkillFiles`; root `package.json` `files` | |
| G4 | non-blocking | §3 G | Whether CATALOG/README must mention `--json` | Skip unless sentence is false | closed | Current CATALOG/README doctor rows already describe diagnose; FEATURES 0.3.54 row required; default no CATALOG/README edit | project | `CATALOG.md` L19; `README.md` L224; `FEATURES.md` 0.3.53 last row | |
| G5 | non-blocking | §2 / tests | Companion vs plan fixture location | Plan root-workaround is the live fixture | closed | Both helpers write `"type":"module"` at fixture repo root today; product copy is skill-local marker beside `doctor.js` | project | `test/test-ws-doctor.js` L121 and L220; companion Implementation Decisions | |
| G6 | non-blocking | §3 C | Other ESM skill `*.js` files? | Sweep before adding more markers | closed | Only `ws-doctor/scripts/doctor.js` uses `^import ` among skill `*.js` | project | Grep `.agents/skills` glob `*.js` | |
| G7 | non-blocking | §2 stdout | Other `console.log` / `asciiSafe` on JSON path | Isolate report write only | closed | JSON success is raw `JSON.stringify` at ~L1305; persist JSON file ~L1318 also raw; `asciiSafe` is markdown/help only | project | `doctor.js` L1304–1320; vault asciiSafe trap | |
| G8 | non-blocking | §4 | Soft-delete / concurrency / list / rate-limit / i18n | N/A for local CLI | closed | No RBAC, tenancy, or networked API | project | `config.json` stack frontend/database none; spec Assumptions N/A row | |
| G9 | non-blocking | §8 | Reopen `.mjs` or expand #259/#262 | Keep companion choice | closed | Marker remains skill-local `package.json`; `.mjs` rejected; #259/#262 stay skipped | project | Companion Implementation Decisions; spec Out of Scope | |

**shared_understanding:** confirmed (autoMode End-refinement equivalent after registry closed)

**blocking_open:** 0

**round:** 1 (force_interview; no user-gate)
