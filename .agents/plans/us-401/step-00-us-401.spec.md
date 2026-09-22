---
id: 401
slug: us-401
title: "Allow parallel work by other agents - commit only own work in session, do not undo/stash/unstash files"
source: github
specDate: 2026-09-22
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/401"
step: 0
workflowId: us-401
status: completed
startedAt: "2026-09-22T17:28:34.256Z"
endedAt: "2026-09-22T17:28:34.256Z"
acRefs: []
---
# Specification — Allow parallel work by other agents - commit only own work in session, do not undo/stash/unstash files

## Description

The delivery workflows assume a single writer on the repository for the whole run. During a long session, an operator (or a second agent session) may edit the same worktree, advance the integration branch, or commit unrelated work. Several existing recipes are hostile to that: they stage broad path sets, and the git-safety contracts still permit whole-tree stashes and hard resets in some paths. A foreign writer's uncommitted work can therefore be overwritten, staged into this session's commit, or silently discarded, and a run that started against an old base can hard-reset back to it instead of moving forward.

The target behavior is a **soft, ownership-scoped git contract** shared by `ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-spec-multi`, `ws-fix-pr` / `ws-goal-fix-pr`, `ws-ship-pr`, and the Phase A cleanup/revert helpers:

1. **Commit only own work.** A session stages exactly the repository-relative paths it edited (`files_touched` / surgical path sets). `git add -A`, `git add .`, bare `git add -u`, and directory-wide adds are forbidden in every workflow commit recipe.
2. **Never undo foreign work.** `git reset --hard`, `git checkout -- .`, `git restore .`, `git clean -fd`, whole-tree `git stash`/`stash pop`, and force-push of a shared branch are forbidden. A path the session did not edit is never stashed, reverted, or committed.
3. **Advance the baseline instead of resetting.** When the integration/base branch moves ahead during a run (another agent's commits), the run refreshes its recorded `baselineCommit` to the new tip and re-integrates its own commits forward (fetch, then rebase/merge-forward). It must not reset back to the original baseline. A conflict that would touch a foreign path → **STOP** and report the overlapping paths.
4. **Tolerate a dirty tree from other writers.** `preExistingDirty` (including another session's uncommitted edits) stays on disk and loadable; a run must not refuse to proceed merely because the worktree is dirty, and must not "clean" it.

Architecture touchpoints: the feature-branch bootstrap gate ([`ws-shared/runtime/setup.md`](../.agents/skills/ws-shared/runtime/setup.md) § Dirty tree on create-from-base), the Safe Revert / baseline contract ([`ws-spec-to-pr/PROTOCOLS.md`](../.agents/skills/ws-spec-to-pr/PROTOCOLS.md) § Safe Revert & Backward Navigation), the fix-pr outer preflight (`preExistingDirty` + forbidden stash-all, [`ws-fix-pr/SKILL.md`](../.agents/skills/ws-fix-pr/SKILL.md)), the Phase A cleanup helper (`cleanup_workflow_git.cjs`), the state schema baseline fields (`workflow-state.schema.json` / `workflow_state.cjs`), and the commit recipes in [`gates.md`](../.agents/skills/ws-shared/runtime/gates.md) (`commit-code` / G2-delivery).

## Acceptance Criteria

- AC1: Every workflow commit stages only the paths the session edited, via explicit path-scoped staging (`git add -- <paths>` and `git add -u -- <deleted-paths>`); `git add -A`, `git add .`, bare `git add -u`, bare `git add -u --`, and directory-wide adds never appear in a shipped commit recipe.
- AC2: No shipped workflow recipe or protocol authorizes a destructive whole-tree verb — `git reset --hard`, `git checkout -- .`, `git restore .`, `git clean -fd`, whole-tree `git stash`/`stash pop`, or force-push of a shared branch; each is listed as forbidden and has no call site.
- AC3: When the integration/base branch advances during a run, the run refreshes its recorded `baselineCommit` to the new remote tip and re-integrates its own commits forward (fetch + rebase/merge-forward) rather than resetting to the original baseline; if re-integration would conflict on a path this session did not edit, the run **STOPs** and reports the overlapping paths without mutating them.
- AC4: A run proceeds with a worktree made dirty by another writer; `preExistingDirty` paths (including foreign uncommitted edits) remain byte-identical on disk after the run's commit/push, and are never staged, stashed, reverted, or cleaned by this session.
- AC5: State records the baseline commit actually used and refreshes it when the base advances (`baselineCommit` plus its source ref); refreshing with no new upstream commits is idempotent (no state churn, no commit).
- AC6: The ownership-scoped contract and the forbidden-verb list are documented in the shared git protocol and referenced by `ws-spec-to-pr`, `ws-spec-to-pr-lite`, and `ws-spec-multi` (and remain consistent with `ws-fix-pr` / `ws-ship-pr`).
- AC7: A regression test (or harness Phase 5a check) asserts the contract: path-scoped commit recipes, no forbidden destructive verb call site, and a dirty-tree run that leaves foreign paths untouched.
- AC8: `npm run test`, `ws-check-harness` (Phases 0–5c), and `node test/test-harness-clean.js` exit clean after the change.

## Original Issue Context

Allow parallel work by other agents - commit only own work in session, do not undo/stash/unstash files

While running a long session, sometimes I need to make unrelated work in same repo/other session by other agents.
Currently I have issues that make other works by other agents affect/overwrte/reset branch/undo commits etc

Make spec-to-pr-* and other workflows to support and update baseline when other agents make changes/commits while running. INstead of reset/commit, udpate baseline commit hash and continue working. Un-harden/make workflows smoothly soft compatible with this feature.

Source: https://github.com/jpolvora/workflow-skills/issues/401 (state open, labels none, assignees none, comments none).

### Prior Work Sweep

Provider sweep on 2026-09-22 (`sweep_prior_work.cjs --issue 401 --keywords "parallel work" stash baseline "surgical commit" reset`): status ok, zero PR hits and zero commit hits for this issue, so there is no exact open PR or duplicate-risk work to reconcile. Related prior art already in-tree: `0082-ws-fix-pr-surgical-commit.spec.md` (fix-pr path-scoped staging + forbidden stash-all), the Safe Revert section in `ws-spec-to-pr/PROTOCOLS.md` (scoped `reset --mixed`; global `reset --hard` / `checkout -- .` / `restore .` / `clean -fd` / stash already forbidden for *revert*), and `ws-shared/runtime/setup.md` § Dirty tree on create-from-base (never `git reset --hard`). The gap is that these protections are local to fix-pr/revert and are not generalized to baseline advancement or to every commit recipe.

### Design Intent

Modification, not greenfield. The repository already encodes most of the safety floor but unevenly:

- `ws-fix-pr` outer preflight records `preExistingDirty`, forbids whole-tree stash, and stages only surgical paths.
- `ws-spec-to-pr/PROTOCOLS.md` Safe Revert forbids the destructive verbs — but only in the *revert* path, and `baselineCommit` exists mainly as revert data.
- `setup.md` forbids `git reset --hard` in the dirty-tree bootstrap gate.

So the intentional constraint is already "do not clobber foreign work"; the accidental gaps are (a) commit recipes outside fix-pr that still allow broad staging, (b) no defined behavior for a base branch that advances mid-run, and (c) no uniform forbidden-verb statement across orchestrators. The fix generalizes the existing floor and adds forward baseline advancement, rather than inventing a new mechanism.

## Notes

- "Baseline" here is the commit the run integrates against (`baselineCommit`), not the merge target policy; advancing it is a state update plus a forward re-integration of the session's own commits.
- The safest forward-integration primitive is `git fetch` + `git rebase <newTip>` for the session's own commits; a merge-forward commit is an acceptable alternative when the host forbids rebase. Either way the session must not touch foreign paths.
- Foreign-path detection reuses the existing `preExistingDirty` snapshot plus a `git diff --name-only HEAD..FETCH_HEAD` intersection (the pattern already proven in `ws-fix-pr` preflight); an empty intersection permits a clean pull/rebase.
- The forbidden-verb guard must not false-positive on the prose that *documents* the forbidden list — scope the check to executable recipes (fenced command blocks / script files), not narrative text.
- Phase A cleanup (`cleanup_workflow_git.cjs`) and the revert path already forbid the destructive verbs; AC2 and AC6 keep them consistent rather than adding a parallel rule set.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-machine or multi-repository orchestration | The feature is same-worktree / same-repo concurrent writers, not distributed runs |
| Automatic three-way conflict resolution or merge tooling | The contract STOPs and reports overlapping paths; automated resolution risks foreign work |
| Changing branch protection, merge strategy, or provider merge policy | SCM policy is consumer-owned; this spec covers local git ownership only |
| Retroactively repairing repos already damaged by a prior reset/stash | The fix is forward-only; run artifacts and history are consumer-owned |
| New provider/SCM intents | No provider surface participates in local git ownership |
| Worktrees-based isolation as the primary answer | Already available; this spec covers the in-worktree ownership contract, not an isolation redesign |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Forward-integration strategy when the base advances | `git fetch` + rebase the session's own commits onto the new tip | Keeps history linear and leaves foreign commits intact; merge-forward is the fallback where rebase is disallowed | n |
| Baseline authority | State field `baselineCommit` (plus source ref) refreshed on each fetch when the tip moves | Matches the existing revert-data field and gives one authoritative value | y |
| Foreign-change detection | `preExistingDirty` snapshot + `HEAD..FETCH_HEAD` path intersection | Reuses the proven `ws-fix-pr` preflight pattern instead of a new detector | y |
| Conflict on a foreign path | STOP and report overlapping paths; never mutate them | A conflict touching a path this session did not edit means another writer is mid-flight | y |
| Enforcement mechanism | Regression test plus a Phase 5a harness check scoped to executable recipes | Contract-only prose drifts; a scoped check catches reintroduction without false positives | n |
| Dirty-tree tolerance | Runs proceed with foreign dirty paths; never stash/clean | Directly answers "do not undo/stash/unstash files" | y |
| Input validation / auth / rate-limit dimensions | N/A because the feature is a local git-ownership contract with no external input surface, auth boundary, or throttle | The touched surface is git state, not an API | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Generalize the existing safety floor and add baseline advancement; no schema redesign, no new provider intent | Diff touches the shared git protocol, orchestrator commit recipes, and the state baseline field only |
| Atomic criteria | AC1–AC8 each pass or fail | Authoring validate plus the commands in AC8 |
| Failure modes | Foreign path never staged/stashed/reverted; conflict on a foreign path STOPs; forbidden verbs absent | AC1, AC2, AC3, AC4 plus negative scenarios |
| Observation telemetry | `baselineCommit` recorded and refreshed; commit path set enumerable from state/telemetry | AC5 with a scripted base-advance run |
| Stack invariants | No `.py` additions; Node-subset respected in any touched helper; forbidden-verb guard scoped to executable recipes | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` |
| Open blockers | Forward-integration strategy (rebase vs merge-forward) and enforcement mechanism choices | Resolve before planning if a host forbids rebase |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Commands: `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0122-us-401.spec.md` exits 0; `npm run test` exits 0; `ws-check-harness` exits 0; `node test/test-harness-clean.js` reports 0 findings.
- Git-state signals: `git stash list` stays empty across a run; `git reflog` shows no `reset --hard` entry; a foreign dirty path is byte-identical (`git diff --stat -- <foreign>`) before and after a run.
- State/telemetry signals: `baselineCommit` in `{workflow-id}.state.json` advances to the new remote tip when the base moves, with the source ref recorded; no state churn when the tip is unchanged.

### Negative & Failing Test Scenarios

- A workflow stages `git add -A` and captures a foreign writer's files (must fail AC1).
- A workflow runs `git reset --hard` / `git checkout -- .` / `git clean -fd` and discards foreign uncommitted edits (must fail AC2).
- The base branch advances and the run resets to the original baseline instead of rebasing its own commits forward (must fail AC3).
- A run refuses to proceed, or stashes/cleans, solely because the worktree is dirty from another writer (must fail AC4).
- `baselineCommit` is not recorded, or is not refreshed after the base advances (must fail AC5).
- Orchestrator docs still permit a whole-tree stash or broad staging (must fail AC6).
- No regression test/harness check covers the forbidden verbs or path-scoped staging (must fail AC7).
- `npm run test`, `ws-check-harness`, or `test-harness-clean.js` fails after the change (must fail AC8).
