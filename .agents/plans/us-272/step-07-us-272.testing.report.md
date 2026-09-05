---
slug: us-272
step: 7
workflowId: us-272-20260903T165000Z
status: active
autoMode: true
verdict: fail-closed
probe:
  hasTestSurface: true
  backendTest: npm run test
startedAt: "2026-09-03T16:50:00Z"
endedAt: "2026-09-03T17:35:38.564Z"
acRefs: []
---
# Step 7 Testing Report — us-272

Commit under test: `346b2adf` (9 files). No code fixes in this step (report-only).

## Verdict: FAIL-CLOSED — STOP, no advance

All us-272-scoped gates pass, sabotage passes, mutation skipped per policy — but the
configured `backendTest` alias (`npm run test`, full suite) exits **1** at
`test/test-package-runtime-exclusions.js`, a failure isolated as **environmental and
out of scope** (npm 12.0.2 `--json` envelope shape vs old-array test assumption; crashes
before any file-list assertion). Per fail-closed rule (runner non-zero → STOP), Step 7
does **not** recommend Advance. Orch decision required: either accept scoped evidence or
route the environmental test fix through its owning scope (not this US — no silent
managed-test refactors per hub contract).

## 1. Base build

| Check | Result |
|-------|--------|
| `verification.backendBuild` | N/A (empty, not configured) |
| `npm run verify-integrity` | **0** — `bin\skill-integrity.json matches tree (v0.3.58)` |

## 2. Unit / gate suite (all exit 0)

| Command | Exit | Notes |
|---------|------|-------|
| `node test/test-consumer-migration.js` | **0** (`test-consumer-migration: ok`) | AC2/AC7: bare-id prune, canonical map, no generic bare-word STALE patterns |
| `node test/test-install.js --local` | **0** (`Success! ... all passed.`, 394-line log) | Includes `[Phase 9c] update migrates pre-rename hybrid fixture` (AC1–AC3/AC5–AC6). Note: needs `npm pack` first (pretests step); one re-run failed with `No .tgz package found` because a prior run consumed the tarball — repacked, re-ran green |
| `check_duplicates.cjs` | **0** (`No duplicated normative blocks.`) | AC4 |
| `measure_harness.cjs` | **0** | AC4 |
| `check_shell_quoting.cjs` | **0** (`OK, 225 files`) | AC4 |
| `check_pipeline_handoff.cjs` | **0** (`OK, 11 skills`) | AC4 |
| `python configure_autoload.py --check` | **0** (`check ok=True findings=0`) | AC4 |
| `npm run test` (full `backendTest` alias) | **1** — see §6 | Blocks verdict |

Full-suite progress before stop: every subtest through `test-runtime-portability: ok`
passed (install, consumer-migration, quality-gates, provider-parity, visual-attachment,
hermes, update-state, resume-gate, memory-formatting, autoload-configure,
ws-task-lifecycle, delivery-commit-artifacts, ws-doctor, shell-quoting,
infer-human-timing, feature-branch-gate, testing-executor-model, models-preset,
fix-pr-proactive, score-and-refine, enable-dag, verbose-mode, min-verify-score,
skill-frontmatter, hybrid-consumer-root, ws-pre-daily, spec-lint, validate-spec,
spec-dor-tdd, ac-ledger, workflow-state-contract, artifact-economy, context-budget,
convergence-gates, telemetry-observability, classifier-history, node-helper-ports,
evals-schema, stack-fingerprint, runtime-portability). First failure:
`test-package-runtime-exclusions.js`.

## 3. DB seeds — N/A (`database.type: none`; AC5 checksum preservation asserted by Phase 9c)

## 4. API / integration — N/A (no endpoints); installer E2E covered by Phase 9c fixture
(`update` x2, manifest prune, pointer seed, consumer-data preservation, idempotence)

## 5. UI / E2E — skipped (no UI surface; docs site untouched, no CLI flag change)

## 6. Full-suite failure analysis (blocking, out-of-scope)

- Failing file: `test/test-package-runtime-exclusions.js:11` —
  `JSON.parse(packed.stdout)[0].files` → `TypeError: Cannot read properties of
  undefined (reading 'files')`. Reproduced in isolation (exit 1).
- Cause: `npm pack --dry-run --json` under installed **npm 12.0.2** prints an object
  envelope (`{"workflow-skills": {id, name, version, ...}}`); the test assumes the legacy
  array envelope (`[0].files`). Crash occurs before any tarball-content assertion, so no
  us-272 file (skill-integrity, templates, cli) influences the outcome.
- Scope check: us-272 touches none of `package.json` `files`, pack behavior, or this
  test. Failure is pre-existing/environmental on this machine (full `npm run test` was
  deferred with `baseline-dirty` in Steps 5–6, so it was never observed in this workflow).
- Not fixed here: managed-test rewrite would be scope creep for us-272 (installer
  migration US) and violates the no-silent-local-refactor hub rule.

## 7. Mutation

- `status: skipped`
- Reason: `verification.mutationTest` empty AND `defaults.skipMutationTesting: true`.
  Threshold N/A.

## 8. Regression sabotage

- `status: passed` — helper exit **0**
- Helper payload: `{"status":"passed","reason":"test-failed-as-expected","testAlias":"backendTest","testExitCode":1,"paths":[".agents/skills/ws-shared/scripts/retired_artifacts.cjs"],"restored":true}`
- Invert patch (caller-authored, temp-only): prune-set reverted to
  `new Set(RETIRED_SKILL_DIRS)` (bare ids survive prune) → full `backendTest` alias
  failed as expected (exit 1) → bytes restored identical (`git diff` on path: empty).
- Patch file: outside repo temp dir (no tree pollution).

## 9. Accessibility / contrast — N/A (no forms/alerts in this change)

## 10. AC ledger linkage

AC1–AC6: Implemented, observed-test evidence (Phase 9c exit 0 + consumer-migration exit 0
+ gates exit 0). AC7: ImplementedDifferently per Step 5 (residual `rg` hits confined to
audit catalog/migration map + exempt history). NS1–NS4: covered (Step 5).

## 11. files_touched (this step — artifacts only, no product edits, no commit/push)

- `.agents/plans/us-272/step-07-us-272.testing.plan.md` (new)
- `.agents/plans/us-272/step-07-us-272.testing.report.md` (new, this file)

Product tree untouched: `git status --porcelain -- .agents/skills bin test package.json`
shows only pre-existing untracked `.agents/skills/ws-shared/host-capabilities.json`
(owned by another workflow); all 9 us-272 product files clean at `346b2adf`.

## 12. Next

Orch `user-gate`: (a) accept scoped green + environmental-failure waiver and Advance, or
(b) spin the npm-envelope test fix as separate scope, then re-run Step 7 full alias.

## 13. Addendum — Step 7 fix round (orch, autoMode)

- Fix: `test/test-package-runtime-exclusions.js` npm-12 envelope compat
  (`envelope[Object.keys(envelope)[0]]` fallback; array legacy preserved),
  commit `93a2f3fc`, linked to AC1–AC7 (`fix-step7-93a2f3fc`).
- Re-run: `node test/test-package-runtime-exclusions.js` → ok;
  full `npm run test` → EXIT 0.
- Verdict revised: **PASS** — scoped + full-suite green. Fail-closed lifted.
