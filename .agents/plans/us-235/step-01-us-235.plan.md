---
slug: us-235
title: "Step 5 to 6 deadlock: comment aliases, missing-alias hard stop, state hash, .runtime allowlist"
status: active
step: 1
workflowId: us-235-20260823T151631Z
startedAt: "2026-08-23T15:16:31Z"
endedAt: "2026-08-23T15:22:46.516Z"
acRefs: []
---
## 0. Summary & Business Rules

Unblock `ws-spec-to-pr` **scoreAndRefine** pre-advance from Step 5 to Step 6 in messy-but-valid consumer repos. Four defects combine into a deadlock after a legitimate score of 9 with `knownDefect: false` and a G2-code commit.

**Business rules (locked by spec + context; fail-closed stays):**

1. Verification keys matching `/^_/` are documentation, never required aliases.
2. `aliasResult.skipReason` of `not-applicable` | `baseline-dirty` | `comment-key` counts as **observed**. It does not set `knownDefect` and does not cap score at 8.
3. A required alias with **no** `aliasResult` (hence no `skipReason`) still fails `validateSnapshot` `--pre-advance 6`. Do not ignore missing-alias `errors[]` just because score is 9.
4. `.runtime` may contain `*.cjs`, `*.patch`, and `*.md`. Unknown extensions stay fail-closed.
5. `run.json.stateSha256` pins YAML frontmatter identity, not markdown body (`## Gate history`).
6. `update_state finish --commit <sha>` records G2-code SHAs in `state.commits` and is repeatable (same SHA does not duplicate).

**Security:** local Node CLIs only; no network, tenancy, or secrets. Do not invent nested-quote `python -c` / `node -e` for frontmatter. Use `node` tests and existing `parseFrontmatter`.

**Design intent (git history, spec § Design Intent):** `76c9795` shipped ledger scoring, `RUNTIME_NAMES`, and fail-closed gates **without** relaxing missing-alias policy. Comment-key-as-alias, full-file hash, missing helper extensions, and missing `finish --commit` are accidental gaps, not rejected features.

## 1. Definition of Ready & Scope

**Ready:** spec of record `.agents/plans/us-235/step-00-us-235.spec.md`; policy in `.agents/specs/us-235.context.md`; stack `node-skills-package` (Node 22, no frontend/DB).

**Resolved assumptions (treat as confirmed for implementation):**

| Topic | Decision |
|-------|----------|
| Missing-alias vs pre-advance 6 | `skipReason` = observed; truly missing aliases still fail pre-advance 6 |
| `skipReason` enum | `not-applicable` \| `baseline-dirty` \| `comment-key` |
| `.runtime` extras | `*.cjs`, `*.patch`, `*.md` only |
| State hash | YAML frontmatter payload only (LF-normalized via existing `parseFrontmatter`) |
| Baseline-dirty path check | Agents pass `skipReason` explicitly. Do **not** auto-diff format paths vs `files_touched` (deferred) |
| `aliasResult` shape | Keep required `alias`, `command`, `exitCode`; `skipReason` optional. Failed format records the real non-zero exit **and** `skipReason` |
| `finish --commit` shape | `{ sha, step }` (optional `message` omitted unless caller passes it). Dedupe by `sha` |
| Python `update_state.py` | Legacy v7 path. Change Node `workflow_state.cjs` / `update_state.cjs` only |

**Acceptance Criteria:** AC1–AC15 as in the spec of record. Each maps to ≥1 §3 step and ≥1 §5 test.

**Out of scope:** auto-fixing consumer format debt; changing Step 5 scoring weights or `completeTen`; allowing arbitrary `.runtime` filenames; hashing a full JSON snapshot; Azure DevOps tracker import; growing `CATALOG.md`; version bump / `FEATURES.md` changelog (before-ship / Step 8 unless this PR later bumps).

## 2. Technical Design & Architecture

**Layers (config.json):** `skills-sot` (`.agents/skills`) and `tests` (`test/`). No frontend, DB, or installer-CLI behavior except regenerating `bin/skill-integrity.json` after hashed skill edits.

### skills-sot

| File | Change |
|------|--------|
| `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` | Required-alias filter `!/^_/.test(key)`. Persist optional `skipReason`. Treat valid skip as observed; ignore non-zero `exitCode` for `knownDefect` when skipped. Reject invalid `skipReason` at `link`. |
| `.agents/skills/ws-shared/config.json.example` | Delete `_comment_mutationTest`. Schema `mutationTest.description` already documents the field. Leave `_comment_mutationThreshold` (does not match `Test$`). |
| `.agents/skills/ws-shared/scripts/workflow_state.cjs` | `RUNTIME_NAMES` add `/\.(cjs\|patch\|md)$/`. Hash helper used by `performUpdate`, `validateSnapshot`, and `rebuildIndex`. `finish --commit <sha>` appends to `state.commits` without duplicates. Pre-advance 6 keeps copying `derived.errors` (fail-closed for missing aliases). |
| `.agents/skills/ws-spec-to-pr/scripts/update_state.cjs` | No logic; already delegates to `runUpdateCli`. Lite `update_state.cjs` inherits the same shared module. |
| `.agents/skills/ws-spec-to-pr/protocols/state-hygiene.md` | Add optional `--commit {sha}` on the finish recipe (orch call site for AC12). |
| `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` | One surgical line on Step 5: when a configured format/build alias fails only on paths outside workflow `files_touched`, record `aliasResult.skipReason: baseline-dirty` instead of omitting the row. |

### tests

| File | Change |
|------|--------|
| `test/test-ac-ledger.js` | AC1, AC3–AC6, AC14 (comment key never required; skip does not cap 8; invalid skip rejected). |
| `test/test-workflow-state-contract.js` | AC7–AC13, AC15 (pre-advance 6, runtime allowlist, frontmatter hash, finish `--commit`). Imported by `test/test-state-observability.js`. |

### Hash design

`parseFrontmatter` already returns `{ data, body, frontmatter }`. Add `function stateIdentityHash(text)` → `sha256(parseFrontmatter(text).frontmatter)`.

- **Write path:** after building `stateContent`, `stateHash = stateIdentityHash(stateContent)`.
- **Validate / rebuildIndex:** hash the same payload, not `fs.readFileSync(stateFile)` full bytes.

Body appends (`## Gate history`) must not change `run.json.stateSha256`. Do not re-serialize then hash a different string than what was written.

`atomicWrite` already opens `'w'` and ignores `EPERM`/`EINVAL` on fsync. Do not regress that.

`performUpdate` already sets `state.stateVersion = STATE_VERSION` (not `max(current, schema)`). Do not regress that.

### skipReason vs knownDefect (sibling class)

Today two sites set `knownDefect` from non-zero alias exits:

```javascript
else if (observed.exitCode !== 0) knownDefect = true;
// ...
if (ledger.aliasResults.some((result) => result.exitCode !== 0)) knownDefect = true;
```

Both must honor valid `skipReason`. Fixing only the per-alias loop still caps score at 8.

### Pre-advance 6

No new error-copy policy. After skip observation, `derived.errors` no longer contains the skipped alias, so the existing `for (const error of derived?.errors || [])` loop stays fail-closed for truly missing aliases and green when every required alias is observed or skipped.

### Patterns

- `backend.md`: empty log; no Domain/Application DTO or EF rules apply. Node harness scripts stay in `skills-sot`.
- `frontend.md`: exists; stack frontend is `none`. No UI edits.

### Invariants

`commitPlanFilesOnlyAtStep8: true` — this plan file stays unstaged until Step 8. Product commits later stage only workflow `files_touched` under `.agents/skills/**` and `test/**` (plus integrity manifest).

## 3. Step-by-Step Plan

Write failing tests in the same batch as runtime changes (MEMORY: Node port tests migrate with recipes). Do not edit `{globalSkillsRoot}`.

### Step A — Failing tests first (AC14, AC15, and siblings)

**Action:** Extend `test/test-ac-ledger.js` and `test/test-workflow-state-contract.js` so they fail on current `main`/HEAD behavior.

**Files:** `test/test-ac-ledger.js`, `test/test-workflow-state-contract.js`

**Checks:**

- Fixture config with `_comment_mutationTest: "Optional mutation runner..."` and `backendTest: "npm run test"`. `score` must **not** emit `configured verification alias lacks observed result: _comment_mutationTest`. Must still emit it for `backendTest` when unobserved (fail-closed).
- Read shipped `config.json.example` and assert no `verification._comment_mutationTest` key (AC2).
- `link --aliasResult` with `skipReason: "nope"` exits non-zero.
- `link` with `skipReason: "baseline-dirty"` and `exitCode: 2` for `backendFormat`; `score` → `knownDefect === false` and score not capped at 8 solely by that skip.
- Pre-advance 6 fixture (see §5): score 9, `knownDefect` false, `backendFormat` skipped, `validate_state --pre-advance 6` exit 0; same fixture without skip exits non-zero.
- `.runtime/score.cjs`, `invert.patch`, `notes.md` do not fail `update_state`; `.runtime/helper.exe` (or `.txt`) does.
- After `finish`, append `## Gate history` to the state body; `validate_state` still matches `run.json.stateSha256`.
- `finish --commit abcdef1` writes `state.commits`; second finish with the same SHA (next step) exits 0 and does not duplicate.

**Engineering:** temp repos via existing `harness-test-utils.cjs`. No nested-quote `python -c`. Mutation is unset in this package (`skipMutationTesting` default true): Step 7 later runs `run_sabotage.py` on the new assertions (invert `/^_/` filter or skip short-circuit and expect non-zero).

### Step B — Alias filter + skipReason (`ac_ledger.cjs`) — AC1, AC3–AC6, AC14

**Action:**

1. `configuredAliases` filter: keep `/(?:Build|Test|Format)$/` and non-empty non-placeholder strings; **add** `!/^_/.test(key)`.
2. Constant `ALIAS_SKIP_REASONS = new Set(['not-applicable', 'baseline-dirty', 'comment-key'])`.
3. In `link`, if `result.skipReason` is present: require it is in the set or throw. Persist `skipReason` on the normalized row; omit the field when absent.
4. Helper `isSkipped(result)` = `ALIAS_SKIP_REASONS.has(result.skipReason)`.
5. Missing observed → same error string as today. Observed + skipped → no error, do not set `knownDefect` from that row's `exitCode`. Observed + not skipped + `exitCode !== 0` → `knownDefect`.
6. Replace the blanket `aliasResults.some(exitCode !== 0)` with the same skip exception.

**Files:** `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`

**Defect-class sibling sweep:** grep `Build|Test|Format` and `aliasResults.some` repo-wide. Only this file collects required aliases today. Do not change `completeTen` formula.

**Checks:** Step A ledger tests pass. Empty `mutationTest: ""` still skipped (existing empty-string policy).

### Step C — Example config — AC2

**Action:** Remove `_comment_mutationTest` from `.agents/skills/ws-shared/config.json.example`. Do not add a replacement `_comment` unless a test requires documentation in-file; schema description is enough.

**Files:** `.agents/skills/ws-shared/config.json.example`

**Checks:** AC2 assertion in `test-ac-ledger.js`. Do not edit consumer `config.json`.

### Step D — Runtime allowlist — AC9

**Action:** Append `/\.(cjs|patch|md)$/` to `RUNTIME_NAMES` in `workflow_state.cjs`. Keep existing exact names (`started-at.txt`, `round-\d+.md`, etc.). `validateRuntime` remains non-recursive `readdirSync`.

**Files:** `.agents/skills/ws-shared/scripts/workflow_state.cjs`

**Defect-class sibling sweep:** `RUNTIME_NAMES` exists only here. Lite and standard share this module.

**Checks:** AC9 tests. Unknown extension still errors `unknown .runtime residue:`.

### Step E — Frontmatter-only state hash — AC10, AC11

**Action:** Introduce `stateIdentityHash`. Use it in:

1. `performUpdate` (replace `sha256(stateContent)`).
2. `validateSnapshot` (replace `sha256(fs.readFileSync(stateFile, 'utf8'))`).
3. `rebuildIndex` (replace full-file hash). All three are the same defect class.

**Files:** `.agents/skills/ws-shared/scripts/workflow_state.cjs`

**Checks:** AC10–AC11 tests. Do not hash a JSON snapshot. `stamp_state_version` stays `STATE_VERSION` literal.

### Step F — `finish --commit` — AC12, AC13

**Action:** In `performUpdate` `finish` branch, if `options.commit` is set:

- Validate `/^[a-f0-9]{7,40}$/i`.
- `state.commits = Array.isArray(state.commits) ? state.commits : []`.
- If no element with the same `sha`, push `{ sha, step: Number(step) }`.
- Same SHA → no-op on the array (still a normal finish otherwise).

`parseArgs` already maps `--commit <sha>` to `options.commit` (not a boolean flag).

**Files:** `.agents/skills/ws-shared/scripts/workflow_state.cjs`, `.agents/skills/ws-spec-to-pr/protocols/state-hygiene.md` (optional `--commit {sha}` on finish).

**Checks:** AC12–AC13. Do not author `elapsedSec`. Do not change Python `update_state.py`.

### Step G — Pre-advance 6 policy (no extra relax) — AC7, AC8, AC15

**Action:** After Steps B–F, confirm `validateSnapshot` `preAdvance === 6` still:

- Requires ledger, `scoreState` match, score ≥ 9, product commits per AC.
- Copies `derived.errors` (missing required alias remains fatal).
- Succeeds when score ≥ 9, `knownDefect` false, and every required alias has an `aliasResult` that is a real run **or** a valid `skipReason`.

**Files:** none beyond B/E unless a comment is needed on the error-copy loop.

**Checks:** AC7 fail fixture + AC8/AC15 pass fixture.

### Step H — Orch one-liner — AC6 call site

**Action:** STEP-DISPATCH Step 5 row: agents must `link` `aliasResult` with `skipReason: baseline-dirty` when format/build fails only outside `files_touched`. Do not add auto-detect. Do not retune scoring copy.

**Files:** `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`

**Checks:** prose only; behavior covered by ledger tests.

### Step I — Integrity + package tests

**Action:** After hashed skill content changes:

```bash
npm run generate-integrity
npm run verify-integrity
npm run test
```

Keep `bin/skill-integrity.json` LF (`.gitattributes` already `text eol=lf`). Do not hand-edit hashes.

**Files:** `bin/skill-integrity.json` (generated)

**Docs:** skip `AGENTS.md` / `FEATURES.md` / `README.md` / site unless a later before-ship bump lands in this PR. Do not grow `CATALOG.md`.

## 4. Permissions, Tenancy & i18n

N/A. Scripts are local file validators with no RBAC, tenant fields, or i18n keys. Frontend stack is `none`.

## 5. Test Coverage

| AC | Test | Method / assertion |
|----|------|-------------------|
| AC1 | `test-ac-ledger.js` | `scoreLedgerOmitsUnderscoreVerificationKeys`: config `_comment_mutationTest` + `backendTest`; errors mention `backendTest` only |
| AC2 | `test-ac-ledger.js` | `exampleConfigHasNoCommentMutationTest`: parse `.agents/skills/ws-shared/config.json.example`; `verification._comment_mutationTest` undefined |
| AC3 | `test-ac-ledger.js` | `aliasResultAcceptsSkipReasonEnum`: link each of `not-applicable`, `baseline-dirty`, `comment-key` exit 0; invalid value exit ≠ 0 |
| AC4 | `test-ac-ledger.js` | `skipReasonCountsAsObserved`: skipped `backendFormat` does not produce `lacks observed result: backendFormat` |
| AC5 | `test-ac-ledger.js` | `skipReasonDoesNotSetKnownDefect`: skip + `exitCode: 2` → `knownDefect === false` and `score > 8` when no other defects |
| AC6 | `test-ac-ledger.js` | `baselineDirtyBackendFormatAccepted`: `backendFormat` command non-empty, AC file evidence only `impl.js`, skip `baseline-dirty`; score path succeeds (no auto path-diff) |
| AC7 | `test-workflow-state-contract.js` | `preAdvance6FailsUnobservedAlias`: required `backendFormat`, no `aliasResult`; `validate --pre-advance 6` exit ≠ 0; stderr/stdout includes `lacks observed result: backendFormat` |
| AC8 | `test-workflow-state-contract.js` | `preAdvance6SucceedsWhenAliasesObservedOrSkipped`: score ≥ 9, `knownDefect` false, skips/results present; exit 0 |
| AC9 | `test-workflow-state-contract.js` | `runtimeAllowsCjsPatchMd`: write those three under `{us-dir}/.runtime/`; `update_state dispatch` or `validate` exit 0; `helper.txt` fails `unknown .runtime residue` |
| AC10 | `test-workflow-state-contract.js` | `stateSha256IsFrontmatterOnly`: after finish, `run.json.stateSha256` equals `sha256(parseFrontmatter(state).frontmatter)` and differs from full-file hash when body is non-empty |
| AC11 | `test-workflow-state-contract.js` | `gateHistoryAppendDoesNotBreakHash`: append `## Gate history\n- x`; `validate_state` exit 0 |
| AC12 | `test-workflow-state-contract.js` | `finishCommitWritesStateCommits`: `finish --commit` 7–40 hex; frontmatter `commits` contains `{ sha, step }` |
| AC13 | `test-workflow-state-contract.js` | `finishCommitIsRepeatable`: second `finish --commit` same SHA exit 0; unique `sha` count remains 1 |
| AC14 | `test-ac-ledger.js` | Same as AC1 plus example-config read: **fails today** if `_comment_mutationTest` is required |
| AC15 | `test-workflow-state-contract.js` | `preAdvance6Score9BaselineDirtyFormat`: fixture score **9**, `knownDefect` false, `backendFormat` `skipReason: baseline-dirty`, `scoreState.boundary === 'pre-step6'`, stamped `step-05-{slug}.plan.report.md`, every AC has a linked commit; `validate --pre-advance 6` exit 0 |

**AC15 fixture sketch:** temp `config.verification.backendFormat` set to a real command string; one or two Implemented ACs with file + planned test + task ids; omit one evidence dimension so `completeTen` stays false and score caps at 9 (do **not** change `completeTen`); product `commits` on each AC; `score --boundary pre-step6` persisted; artifact frontmatter `step: 5`.

**Defect-class sibling sweep (implement + tests):** (1) both `knownDefect` alias sites; (2) three full-file `stateSha256` call sites; (3) `config.json.example` only `_comment_mutationTest` among `Test$` comment keys (`_comment_mutationThreshold` is not an alias).

**Sabotage (mutation unset):** `python .agents/skills/ws-testing/scripts/run_sabotage.py` on AC14/AC15 assertions: invert the `/^_/` filter or skip short-circuit; tests must go non-zero; restore snapshot of `--paths` only.

## 6. Invariants (Do Not Violate)

- `invariants.commitPlanFilesOnlyAtStep8`: never `git add` `{plansDir}/` before Step 8 G2-delivery.
- Fail-closed: unobserved required aliases still block pre-advance 6.
- Do not change scoring weights or `completeTen`.
- Do not relax `knownDefect` for real in-scope format failures (no `skipReason`).
- Do not allow arbitrary `.runtime` names.
- Do not hash the full markdown file or a JSON snapshot.
- Dual-install: edit `$PWD/.agents/skills/**` only.
- Never `git add -A`. Never commit `.agents/plans/`.
- `stateVersion` always emit `STATE_VERSION` (2), never `max(current, schema)`.
- `atomicWrite`: open `'w'`, best-effort fsync, ignore `EPERM`/`EINVAL`.
- Integrity manifest LF; regenerate after skill content changes.
- Do not invent nested-quote `python -c` for YAML/frontmatter.

## 7. Pre-PR Checklist

- [x] Layer boundaries respected (skills-sot + tests; no Domain/EF/UI).
- [x] Domain entities and mappings encapsulated (N/A).
- [x] Schema migrations created (N/A).
- [x] Authorization checks applied (N/A).
- [x] i18n keys declared (N/A).
- [ ] Test cases cover all ACs (AC1–AC15 in §5).
- [ ] `npm run generate-integrity` && `npm run verify-integrity` after skill edits.
- [ ] `npm run test` (includes `tests:harness-efficiency` → `test-ac-ledger.js` and `test-state-observability.js`).
- [ ] Repo-wide sibling sweep for alias filter, skip `knownDefect`, and state hash.
- [ ] Sabotage invert of AC14/AC15 when mutation unset.
- [ ] Surgical docs only (state-hygiene `--commit`, STEP-DISPATCH skip line). No CATALOG growth.

## 8. Open Questions

None that change behavior. Product choices are locked in `.agents/specs/us-235.context.md`.

Implementer notes (not user-gates):

- Hash the `frontmatter` payload from `parseFrontmatter` (between `---` fences, LF-normalized), not the fences themselves, as long as write and validate share one helper.
- AC13 tests two finish calls (e.g. step 0 then step 1) with the same SHA rather than double-finishing one step (that would also bump `currentStep`).
- Do not auto-validate format paths vs `files_touched`; that remains deferred.
