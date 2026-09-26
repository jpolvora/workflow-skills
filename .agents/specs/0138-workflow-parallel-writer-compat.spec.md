---
id: null
slug: workflow-parallel-writer-compat
title: "Workflow parallel-writer compatibility audit and enforcement"
source: local
specDate: 2026-09-26
---

# Specification — Workflow parallel-writer compatibility audit and enforcement

## Description

The ownership-scoped git contract (`us-401`, [`.agents/skills/ws-shared/runtime/git-ownership.md`](../.agents/skills/ws-shared/runtime/git-ownership.md)) defines the safety floor for two writers sharing one worktree: stage only own paths, never undo foreign work, advance the baseline forward instead of resetting, and tolerate a dirty tree from another writer. That contract is correct but its **adoption and enforcement are uneven**, so a parallel agent can still lose or overwrite another agent's work in paths the original fix did not cover.

Observed gaps against the current tree:

1. **Narrow enforcement.** `test/test-git-ownership-contract.js` scans a hard-coded list of 9 docs plus 3 scripts. Many skills that emit git recipes or write shared artifacts are outside that list (`ws-ship-pr`, `ws-goal-fix-pr`, `ws-plan-update`, `ws-cleanup`, `ws-spec-index`, `ws-wiki`, `ws-self-learning`, `ws-patterns-generator`, `ws-megabrain`, and their `scripts/`). A regression reintroduced anywhere else is invisible.
2. **No harness detector.** The check lives only in `npm run test`; `ws-check-harness` Phase 5a has no ownership/forbidden-verb pass, so consumers auditing an install do not surface a broad-staging or destructive-verb call site.
3. **Partial baseline wiring.** Forward advancement exists in `ws-spec-to-pr/scripts/refresh_baseline.cjs` and is referenced by standard, lite, multi, and fix-pr prose, but there is no uniform, tested call site across every orchestrator that integrates against a moving base, nor a machine-check that none of them resets to the old baseline.
4. **Shared-artifact races.** Workflows auto-update shared baselines (`ws-spec-index` `index.PRD`, `ws-wiki` sync watermark, `ws-self-learning` compiled `MEMORY.md`, `ws-changelog`) with whole-file writes. A second writer editing the same shared file concurrently can be silently overwritten, and a wholesale path stage can ride into an unrelated commit.
5. **No concurrency preflight or end-to-end proof.** Nothing warns when two active workflows share a worktree/branch, and no test drives a real second writer committing to the base mid-run.

This spec **reinforces and completes** `us-401` — a modification, not a new mechanism. It (a) publishes a compatibility matrix over the full workflow skill surface, (b) widens enforcement from a fixed list to a tree-wide executable-recipe detector wired into `ws-check-harness` Phase 5a, (c) makes baseline advancement uniform and checked, (d) gives shared-artifact writers ownership-scoped, idempotent updates, (e) adds a non-destructive concurrency preflight, and (f) proves the whole behavior with a concurrent-writer end-to-end test. It changes documentation, tests, and at most detector/helper scripts — no schema redesign, no new provider intent, no worktree-isolation redesign.

## Acceptance Criteria

- AC1: `git-ownership.md` adds a **Workflow compatibility matrix** classifying each installed `ws-*` skill as `git-mutating`, `shared-artifact-writer`, or `read-only`, with the ownership rule each class must obey.
- AC2: The matrix covers the full skill set (orchestrators, providers, pipeline step skills, shared-artifact writers, utilities, installer/integrity helpers); none may be silently omitted.
- AC3: A test cross-checks the matrix against the tree-wide scan and fails when a scanned git-mutating or shared-artifact-writing skill is absent from the matrix.
- AC4: Enforcement widens from the fixed `DOCS`/`SCRIPTS` list to a tree-wide executable-recipe detector `ws-check-harness/scripts/check_git_ownership.cjs` wired into Phase 5a.
- AC5: The detector scans every fenced command block in `.agents/skills/**/*.md` and every `.cjs`/`.js` under skill `scripts/` for broad staging and the forbidden destructive verbs; narrative prose is exempt.
- AC6: A real broad-staging or destructive call site exits non-zero with a critical finding naming file, line, and verb.
- AC7: Every orchestrator integrating against a moving base (`ws-spec-to-pr`, lite, multi child, `ws-fix-pr`/`ws-goal-fix-pr`, `ws-ship-pr`) documents and invokes `refresh_baseline.cjs` + fetch + rebase/merge-forward before re-integration.
- AC8: No orchestrator recipe resets to `baselineCommit`, performs a whole-tree `git stash`, or hard-resets.
- AC9: Shared-artifact writers (`ws-spec-index`, `ws-wiki`, `ws-self-learning`, `ws-changelog`) update only owned rows/sections; a concurrent foreign edit is preserved, never whole-file overwritten or staged wholesale.
- AC10: Shared-artifact re-runs over unchanged content are idempotent (no duplicate rows, no spurious diff).
- AC11: A bootstrap concurrency preflight warns non-blockingly when another active workflow state or foreign dirty path shares the branch/worktree, records the foreign id/branch, and recommends `plans.useWorktrees=true`.
- AC12: The concurrency preflight never resets, cleans, stashes, or blocks because of the warning.
- AC13: `test/test-parallel-writer-e2e.js` drives a temp-repo session while a second writer commits to the base mid-run, asserting baseline advances forward, the session commit survives, and foreign paths stay byte-identical.
- AC14: A foreign-path conflict STOPs naming the overlapping paths, leaving state and foreign files unmutated.
- AC15: Docs stay in sync: `git-ownership.md` is the single canonical forbidden-verb source (others link, never restate), `ws-check-harness` PHASES documents the detector and severity, and README/AGENTS note compatibility; en-us portable, no host names.
- AC16: `npm run test`, `ws-check-harness` (Phases 0–5c), and `node test/test-harness-clean.js` (0 findings) exit clean; `npm run generate-integrity` and `npm run verify-integrity` pass.

## Original Issue Context

### Design Intent

`us-401` intentionally established a **soft, ownership-scoped contract** rather than a lock or an isolation redesign, because true parallel isolation already exists as git worktrees (`plans.useWorktrees`, default `false`) and a mutex approach was explicitly retired (`0043-workflow-session-leases`, retired 0.3.38). The earlier failure mode recorded in MEMORY was a worker editing after another process checked out `develop` — i.e. a shared-worktree race, not a missing lock. So the intended constraint is "coexist safely on one worktree, and prefer worktrees when you need independence."

The accidental gaps are adoption and enforcement, not design: the forbidden-verb scan is a fixed allowlist that drifted from the skill tree; baseline advancement is wired by prose, not uniformly checked; shared-artifact writers were never brought under the contract; and nothing proves the concurrent case end to end. This spec closes those gaps forward-only. It does **not** change the branch-protection or merge policy, and it does **not** re-introduce leases.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-machine or multi-repository orchestration | The contract covers same-worktree / same-repo concurrent writers only |
| Automatic three-way conflict resolution or merge-tool invocation | The contract STOPs and reports overlapping paths; automated resolution risks foreign work |
| OS-level file locking or a repo-wide mutex | `us-401` chose advisory ownership over locks; leases were retired |
| Changing branch protection, merge strategy, or provider merge policy | SCM policy is consumer-owned |
| Retroactively repairing repos already damaged by a prior reset/stash | Forward-only fix; history is consumer-owned |
| Replacing git worktrees with a new isolation mechanism | Worktrees remain the recommended path for full independence |
| New provider / SCM intents | Local git ownership has no provider surface |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Forward-integration strategy when the base advances | `git fetch` + `git rebase <newTip>` for the session's own commits | Linear history, foreign commits intact; merge-forward is the fallback where a host forbids rebase | y |
| Enforcement scope | Every installed `ws-*` skill, executable recipes only (fenced command blocks + `scripts/` sources) | Prose that documents the forbidden list must not false-positive | y |
| Enforcement mechanism | New `ws-check-harness` Phase 5a detector, invoked by `npm run test` and standalone harness runs | One detector serves both CI and consumer audits; the fixed test list is retired | n |
| Concurrency preflight | Warn (non-blocking), record foreign workflow id/branch, recommend worktrees | Never block or mutate on another writer's presence | y |
| Shared-artifact ownership | Section/append-scoped, idempotent updates; never whole-file overwrite of foreign edits | Shared baselines are edited by multiple runs over time | y |
| Input validation / auth / rate limits / data lifecycle / external-dependency failure | `N/A because` this is a local git-ownership contract and a dev-time static detector with no network input surface, auth boundary, TTL, or external service dependency | No request payload, credential, expiry, or third-party call participates | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Reinforce `us-401`: matrix + tree-wide detector + uniform baseline wiring + shared-artifact ownership + e2e test. No schema redesign, no new provider intent | Diff touches `git-ownership.md`, `ws-check-harness` scripts/PHASES, orchestrator prose, shared-artifact writers, and `test/` only |
| Atomic criteria | AC1–AC16 each pass or fail independently | Authoring validate plus the AC16 commands |
| Failure modes | Forbidden verb call site, omitted matrix row, baseline reset, foreign shared-file overwrite, blocking preflight | AC4–AC6, AC2–AC3, AC7–AC8, AC9, AC11–AC12 negative scenarios |
| Observation telemetry | Detector names file/line/verb; baseline fields recorded and refreshed; concurrency preflight recorded in state/telemetry | AC4–AC6, AC7, AC11 scripted runs |
| Stack invariants | Node-only runtime; no new `.py`; detectors/helpers validate path inputs and contain filesystem paths; no floating promises in async helpers; streams closed in `finally` | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` |
| Open blockers | Enforcement mechanism confirmed (harness detector vs test-only) | Resolve before planning; recorded in Assumptions | 

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0138-workflow-parallel-writer-compat.spec.md` exits 0.
- `node .agents/skills/ws-check-harness/scripts/check_git_ownership.cjs` exits 0 on a clean tree and non-zero with `file:line verb` findings when a forbidden call site is planted.
- `node test/test-parallel-writer-e2e.js` prints the advanced `baselineCommit`, the session commit sha, and byte-identical foreign-path checks.
- Git-state signals: `git stash list` stays empty across a run; `git reflog` shows no `reset --hard` entry; `git diff --stat -- <foreign>` is empty before and after.
- State/telemetry signals: `baselineCommit` in `{workflow-id}.state.json` advances to the new remote tip with `baselineSourceRef`; the concurrency preflight records the foreign workflow id and branch when present; refresh with no upstream change is a no-op.

### Negative & Failing Test Scenarios

- A skill recipe reintroduces `git add -A`, whole-tree `git stash`, or `git reset --hard` outside the old fixed list → the tree-wide detector must fail AC4–AC6.
- The compatibility matrix omits a skill the scan classifies as git-mutating / shared-artifact-writer → the matrix cross-check must fail AC2–AC3.
- The base branch advances and an orchestrator resets to the old `baselineCommit` instead of rebasing forward → the e2e test must fail AC7–AC8.
- A shared-artifact writer overwrites a concurrent foreign edit to `index.PRD` or the wiki sync baseline → the AC9 test must fail.
- The concurrency preflight blocks or cleans a foreign worktree/dirty path → the AC11–AC12 test must fail.
- The detector flags prose in `git-ownership.md` that documents the forbidden list → the detector must stay green on the canonical doc (scoped to executable recipes only).
- `npm run test`, `ws-check-harness`, or `test-harness-clean.js` fails after the change → AC16 fails.

## Notes

- "Baseline" is the commit the run integrates against (`baselineCommit` + `baselineSourceRef`), not the merge-target policy; advancing it is a state update plus a forward re-integration of the session's own commits.
- Foreign-path detection reuses the proven `preExistingDirty` snapshot plus a `git diff --name-only HEAD..FETCH_HEAD` intersection (the `ws-fix-pr` preflight pattern); a non-empty intersection STOPs and reports the overlapping paths.
- True independence remains `plans.useWorktrees=true`; this spec hardens the shared-worktree safety net and points users to worktrees when they need concurrent runs.
- The detector is additive in `ws-check-harness` Phase 5a; narrative-only mentions of forbidden verbs (this spec, `git-ownership.md`, retired-artifact registries) are exempt by scope.
- Dependency-graph touchpoints to reconcile when implementing: `bin/skill-dependencies.json` (new detector script), `ws-check-harness` PHASES/report format, `ws-spec-index` / `ws-wiki` / `ws-self-learning` / `ws-changelog` update recipes, and `test/` registration.
