---
step: 6
slug: code-review-round-2-fixes
workflowId: code-review-round-2-fixes
status: completed
startedAt: "2026-09-21T02:20:00.000Z"
endedAt: "2026-09-21T02:40:00.000Z"
acRefs: []
---
# Code Review — code-review-round-2-fixes

## Scope Reviewed

Committed snapshot `git diff main...HEAD` restricted to this workflow's product
change (G2 commits `ae3806d6` + `b6ca3eba`, i.e. range `c32348cc...HEAD`,
excluding prior-workflow plan artifacts and this run's own `.agents/plans/`
reports). In-scope product files (48 + 19):

- State/gate correctness (AC1–AC4): `ws-spec-to-pr/scripts/observer.cjs`,
  `step_coordinator.cjs`, `ws-ship-pr/scripts/verify.cjs`
- Harness consumer awareness (AC5): `check_unique_runtime.cjs`,
  `check_hub_separation.cjs`, `check_duplicates.cjs`, `check_pipeline_handoff.cjs`
- Home expansion + drain (AC6/AC13): `check_memory_conflict.cjs`,
  `cleanup_workflow_git.cjs`, `ws-testing/scripts/run_sabotage.cjs`,
  `ws-monitor/scripts/monitor_snapshot.cjs`
- Provider parity (AC7): `fix_pr_azure_context.cjs`, GitHub + ADO
  `sweep_prior_work.cjs`, `github-issue-to-spec.cjs`, `ado-workitem-to-spec.cjs`,
  `ws-spec-organizer/scripts/resolve_spec_path.cjs`
- GUI sync (AC8): `ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1`
- Secrets scanner (AC14): `ws-secrets-leak-review/scripts/secrets_scanner.cjs`
- Site/integrity/CI (AC15): `bin/build-site.js`, `bin/build-wiki-site.js`,
  `bin/skill-integrity-lib.js`, `.github/workflows/ci.yml`, `.gitignore`,
  `ws-shared/templates/hub.gitignore`
- Installer (AC12): `bin/cli.js` (quarantine retire, global pointer scope, strict flags)
- Benchmark Node-only (AC11): `scripts/harness-benchmark/lib/paths.cjs`, `sensor.cjs`
- Adjacent one-liner: `ws-shared/runtime/scripts/workflow_state.cjs`
  (`verification-manifest.json` runtime name)
- Tests: `test/test-code-review-round-2.js` (new, 338 lines),
  `test/test-powershell-config-editor.js`, `test/test-provider-parity.js`,
  `test/test-observer-us365.js`, `test/test-bootstrap-runtime.js`,
  `test/test-unique-runtime.js`, `package.json` chain wiring

Stack rule pack: `typescript-node.md` (stack `node-skills-package` maps to the
Node/TypeScript pack; no auth surface, no network listeners, CLI-only).
`localReviewCommand` is unconfigured → dry-run gate not applicable (noted, not skipped).
`fable.enabled/autoAudit: true` — adversarial audit already ran at Step 5
(`step-05-judge-audit.md`: VERIFIED, 0 frauds); no new fraud surface in review scope.

## Phase 1 — Triage hypotheses (all dispositioned in Phase 2)

H1 observer double `readJson` under lock; H2 gate `GATE_CANCEL_RE` includes
`no`; H3 gate re-prompt tail; H4 `check_memory_conflict`/`run_sabotage`
exitCode-drain returns; H5 secrets-scanner non-staged `checkRgResult` throw
path; H6 staged `+++` filter strictness; H7 `verify.cjs` remaining base uses;
H8 `fix_pr_azure_context` `--api-base` parse + call-site threading; H9 ADO vs
GitHub `nativeStatus` asymmetry; H10 `cli.js` quarantine collision/EXDEV;
H11 `update` unknown-flag gate coverage; H12 `build-site` tarball-sync guard;
H13 `check_unique_runtime` `skillsRootRel` for outside-root display;
H14 GUI `ConvertTo(true)` → `'true'`; H15 `cleanup_workflow_git.cjs`
pre-existing `void os;`.

## Phase 2 — Adversarial Investigation (4-part proof; all dropped, none retained)

- **H1 DROPPED** — `noteObserverDispatch` re-reads state inside the held
  `withBatonLock` (same lock the coordinator uses for CAS,
  `.agents/skills/ws-spec-to-pr/scripts/observer.cjs:L230-L248`); no
  cross-reader window remains between check and append. `persistObserverMutation`
  (L145-L161) bumps `revision` through `syncStateDualWrite` and refreshes the
  plans index. No missing protection.
- **H2/H3 DROPPED** — cancel vocabulary resolves to `EXIT_BLOCKED` (index -1,
  never 0); unmatched TTY input re-prompts once, then any residual non-Next
  stops with HS-1 (`step_coordinator.cjs:L590-L593`). `autoMode`/non-TTY
  defaults unchanged (L574-L577). `More options...` removed (L572).
- **H4 DROPPED** — every `process.exitCode = N; return null` path in both
  parsers is consumed by `main` (`if (!args) return` /
  `return process.exitCode || 0`), so the code reaches the event loop end and
  stdout drains. Observed: round-2 AC13 asserts pass.
- **H5 DROPPED** — non-staged `checkRgResult` throw (L95-L103) propagates via
  `collectHits` → `scanPat` (L130) into the `try` at L143-L151, which prints
  `Error: secrets scan failed` and exits 1. Fail-closed with a clean message,
  never a silent clean. Observed: NS9 rg-failure assert passes.
- **H6 DROPPED** — `l.startsWith('+') && !l.startsWith('+++')`
  (`secrets_scanner.cjs:L87`) admits exactly added lines; `---` removals and
  `+++ b/<path>` headers excluded. Old regex also excluded `+++`; parity kept.
  Observed: NS9 header-only assert passes.
- **H7 DROPPED** — all `baseBranch` uses enumerated: `detectBase` returns
  `null` (never guessed `main`), `main` refuses non-zero (L81-L84), and the
  only diff use is guarded (`if (baseBranch)`, L48). `SHIP_PR_BASE` honored
  (L28). Observed: NS3 develop-only-fixture assert passes.
- **H8 DROPPED** — `--api-base` parsed at top level (L625/L631) and both
  subcommand tails (L668/L670), threaded into `getPrContext` (L791) and
  `resolveThread` (L805), and every URL builder takes `apiBase` with
  `normalizeApiBase` default `https://dev.azure.com` (L140-L142). No call site
  omits it. Observed: apiBase URL test passes.
- **H9 DROPPED** — GitHub has no separate native status (single `state`
  source), so `nativeStatus: row.state` is exact, not lossy; ADO preserves its
  distinct native value alongside the normalized pair. Consumers reading
  `state`/`status`/`searchQuery`/`searchText` see identical semantics.
- **H10 DROPPED** — quarantine renames within the same hub dir (no EXDEV);
  timestamp collisions only reuse the dir, basenames differ (`runtime/` vs
  `templates/` vs legacy names); `.quarantine-*` excluded from the unknown
  scan and gitignored (root + hub template + test fixture). Observed: NS8
  retire-quarantine assert passes.
- **H11 DROPPED** — the `update` arg loop accepts only known flags;
  `a.startsWith('-')` otherwise errors naming the flag and exits 1
  (`bin/cli.js:L2182-L2186`). Known `--include-new`/`--force-integrity`/
  scope flags are allow-listed, not swallowed. Observed: NS8 assert passes.
- **H12 DROPPED** — tarball sync fires only when the current dep starts with
  `file:../workflow-skills-` and differs; missing `dependencies` key safely
  skips (`bin/build-site.js:L77-L89`). Observed: AC15 bump assert passes.
- **H13 DROPPED** — `skillsRootRel` feeds only the report's display field
  (L104/L123); scanning uses the absolute `skillsAbs`. Outside-root relatives
  cannot redirect the scan. Observed: NS4 temp-global assert passes.
- **H14 DROPPED** — schema enum is `[false, "refuted", "caveats"]`
  (`config.schema.json`); boolean `true` fails load before the GUI ever sees
  it, so `ConvertTo(true)` is unreachable from a valid config. No executable
  failure path.
- **H15 DROPPED** — `void os;` is unchanged context (pre-existing, outside
  this workflow's diff); per engagement rules untouched pre-existing code is
  not flagged. Module loads and the suite is green, so no defect to prove.

## Sibling / defect-class sweep

- `shell: process.platform === 'win32'` spawns: both occurrences in range
  (`step_coordinator.cjs` mirror, `monitor_snapshot.cjs` probe) converted to
  `shell: false` with intact argv. Repo-wide grep shows no remaining
  `shell: process.platform` in touched scope.
- `process.exit(` before drain: converted in `check_memory_conflict.cjs`,
  `run_sabotage.cjs`, `cleanup_workflow_git.cjs` (via `CleanupExit`);
  remaining `process.exit` calls in range are fail-fast arg-guard/error paths
  in `cli.js` and `verify.cjs` refusal, which write to stderr and exit
  non-zero by design.
- `process.env.HOME || ''` home expansion: no remaining occurrence in
  `check_memory_conflict.cjs`; `os.homedir()` with fail-closed used.
- Hardcoded `path.join(repoRoot, '.agents', 'skills')` scan roots: converted
  in all four harness checks to resolved-skills-root with local fallback.
- `localeCompare` ordering: all six sites in `skill-integrity-lib.js` use
  `compareCodepoint`. Hardcoded `develop` wiki branch links parameterized
  (default `main`).

## Workflow memory sweep

`self_learning.cjs --match-paths` over observer/coordinator/cli/scanner
returned 4 entries (autoload migration, managed-runtime relocation,
global-only links, CRLF/export checks). No violations: quarantine + hubignore
changes follow the relocation trap's sweep list; global pointer skip follows
the global-only scope rule; legacy-link migration untouched.

## Check invariants & dry-run

- `scan_stack_invariants.cjs --files <23 touched .cjs>`: 0 issues
  (0 Critical, 0 Warning).
- `test/test-code-review-round-2.js`: all 9 asserts pass (NS2/NS3/NS4/NS5/
  NS8/NS9, AC3/AC13/AC15).
- `test/test-powershell-config-editor.js`: ALL 10 PASS (129 bound keys,
  AC8 round-trip + parity).
- `test/test-harness-clean.js`: 0 findings; `verify-integrity`: manifest
  matches tree (v0.4.46).
- `localReviewCommand`: unconfigured → gate not applicable.
- Ineffective-assertion check: `test-provider-parity.js` fails on empty
  envelopes (`requirePullRequests` throws); `test-global-config-missing.js`
  asserts the refusal phrase directly — no min-Warning cases.

## Stack Invariant Compliance

- [x] Zero unchecked `any` / `ts-ignore` (N/A — CommonJS, no TS annotations added)
- [x] Zero floating promises (sync `spawnSync`/`readFileSync`/`writeFileSync`
  only in touched code; async ADO functions awaited)
- [x] Boundary validation: CLI flags (`--specs-dir`, `--api-base`, `--memory`,
  `--shared-dir`, unknown `update` flags), `~` expansion, `SHIP_PR_BASE`,
  GUI tri-state enum — all fail closed with actionable messages
- [x] No path traversal / shell interpolation: `shell: false` argv arrays,
  `resolve_spec_path` absolute-or-repo-root join, observer `--us-dir`
  containment guard
- [x] Resource lifecycle: temp fixtures via exit-hook cleanup; stdout drained
  via `exitCode`; child stderr captured and bounded (500 chars)
- [x] Node 22 CommonJS only, zero new deps (`package.json` unchanged apart
  from test-chain wiring), no Python (`test-unique-runtime.js` now covers
  `scripts/`)

No feedback.

## Verdict

APPROVE. Score 10/10. No Critical/Warning/Suggestion findings; no fix loop
required (round 0 of 3 used). No product files modified by this review.
Recommended next: Advance to Step 7 (`finish --step 6 --status completed`).
