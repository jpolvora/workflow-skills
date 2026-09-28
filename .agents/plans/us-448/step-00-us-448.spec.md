---
id: 448
slug: us-448
title: ws-spec-multi stores run state in a skill-named shared directory instead of a per-run directory
source: github
specDate: 2026-09-27
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/448"
labels:
  - enhancement
step: 0
workflowId: us-448
status: completed
startedAt: "2026-09-27T21:38:47.089Z"
endedAt: "2026-09-27T21:38:47.089Z"
acRefs: []
---
# Specification — ws-spec-multi stores run state in a skill-named shared directory instead of a per-run directory

**State:** open
**Labels:** enhancement

## Description

`ws-spec-multi` is a batch orchestrator that runs several specs sequentially and records its queue state in one Markdown file. It currently persists that state to a flat, skill-named directory:

- Today: `{plansDir}/ws-spec-multi/{runId}.state.md` (`{plansDir}` ← `config.plans.dir`, default `.agents/plans`; `{runId}` = `ms-{YYYYMMDDTHHMMSSZ}`).
- Convention everywhere else: each run owns its own plan directory — `{plansDir}/{slug}/` for a single-workflow orchestrator, and `{plansDir}/{slug}/{child-workflow-id}.state.json` for a batch child worker.

This divergence produces four concrete consequences:

1. **Namespace collision.** `ws-spec-multi` is simultaneously a skill/batch name and a legal plan-directory slug. A queued spec slugged `ws-spec-multi` would resolve its child artifacts into the batch's own state directory.
2. **Defensive guards.** Because of (1), three scripts carry `RESERVED_PLAN_DIRS = new Set(['ws-spec-multi'])`: `.agents/skills/ws-spec-multi/scripts/record_child_outcome.cjs`, `.agents/skills/ws-spec-multi/scripts/verify_child_artifacts.cjs`, and `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`.
3. **Shared-directory concurrency.** Concurrent batch runs share one directory and are separated only by `{runId}`, so a consumer that treats the directory as a single run can misread sibling runs (the corrupt-multi-state class tracked by completed spec `0121-us-395`).
4. **Untracked churn.** Completed runs leave `ws-spec-multi/*.state.md` files in the tree; cleanup has had to batch-delete them (commit `ede8620d` removed 15 accumulated files).

**Fix direction:** move batch run state into a per-run directory so no batch run occupies a slug-named plan directory, then drop the now-unnecessary reserved-dir guards and update docs and monitor discovery.

**Resolved design decision (see Assumptions):** adopt the fully-uniform layout `{plansDir}/{runId}/{runId}.state.md`. The skill-named-parent variant `{plansDir}/ws-spec-multi/{runId}/` is rejected: it leaves the collision at the parent level, so the reserved guards would still be required.

**Architecture touchpoints:**

- `.agents/skills/ws-spec-multi/STATE.md` (schema + resume), `PROTOCOL.md` (Phases 1/2/4/4b/5/6), `SKILL.md`, `EXAMPLES.md`.
- `.agents/skills/ws-spec-multi/scripts/record_child_outcome.cjs`, `verify_child_artifacts.cjs`, `retire_superseded_run.cjs`, `list_pending_specs.cjs`.
- `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` (run discovery + `missing-child-state`).
- Staging/`.gitignore` rules referencing `.agents/plans/ws-spec-multi/` (keep exclusions anchored per the repo MEMORY trap forbidding unanchored `ws-spec-multi/` substring regexes).

## Acceptance Criteria

- AC1: A new batch run writes its state to `{plansDir}/{runId}/{runId}.state.md` (per-run directory) and never to the flat `{plansDir}/ws-spec-multi/{runId}.state.md`.
- AC2: Two runs with distinct `{runId}` values never share a state directory; each `{plansDir}/{runId}/` holds exactly one batch state file.
- AC3: Entry/resume detection accepts both the new per-run path and the legacy flat path `{plansDir}/ws-spec-multi/*.state.md`; resuming a legacy file continues the same run without creating a duplicate run.
- AC4: The three `RESERVED_PLAN_DIRS` guards are removed, and a queue item slugged `ws-spec-multi` resolves its child artifacts under `{plansDir}/ws-spec-multi/` (a normal plan dir) with no special-casing.
- AC5: `STATE.md`, `PROTOCOL.md`, `SKILL.md`, and `EXAMPLES.md` document the new path; `retire_superseded_run.cjs` resolves the new path; `ws-monitor` discovery finds the state under `{plansDir}/{runId}/` and still reports `missing-child-state` correctly.
- AC6: Path resolution honors a non-default `plans.dir`; no hardcoded `.agents/plans/ws-spec-multi` literal remains in the batch scripts.
- AC7: New coverage asserts the per-run layout, the legacy resume fallback, and the removal of reserved-dir special-casing; `npm run test` passes.

## Original Issue Context

# `ws-spec-multi` stores run state in a skill-named shared directory, diverging from the `{plansDir}/{workflowId}/` convention

## Summary

`ws-spec-multi` persists batch run state in one hardcoded directory named after the skill: `{plansDir}/ws-spec-multi/{runId}.state.md`. Every other workflow persists per-run state under `{plansDir}/{slug}/{workflow-id}.state.*`. The skill-named shared directory is a reserved namespace that now requires defensive guards in three scripts and can collide with a spec whose slug is literally `ws-spec-multi`.

## Observed

- `STATE.md:3,8`, `SKILL.md:37,45,62`, `PROTOCOL.md:35,37,47,48,110`, and `EXAMPLES.md:10,23` all document `{plansDir}/ws-spec-multi/{runId}.state.md`.
- `.agents/skills/ws-spec-multi/scripts/record_child_outcome.cjs:35-37` and `.agents/skills/ws-spec-multi/scripts/verify_child_artifacts.cjs:30-32` define `RESERVED_PLAN_DIRS = new Set(['ws-spec-multi'])` so a queue item whose slug equals `ws-spec-multi` is refused.
- `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs:591` carries the same `RESERVED_PLAN_DIRS` guard.
- `PROTOCOL.md:75` documents the child contract as `{plansDir}/{slug}/{child-workflow-id}.state.json`, so parent and child runs use different directory shapes.

## Why it matters

1. Namespace collision: `ws-spec-multi` is both a batch process name and a valid plan-directory name. A spec with that slug would otherwise resolve its child artifacts into the parent batch directory, which is exactly why the three `RESERVED_PLAN_DIRS` guards exist.
2. Convention divergence: generic tooling that walks `{plansDir}/{slug}/` for per-run state must special-case the flat batch directory.
3. Concurrent batch runs share one directory and are distinguished only by `{runId}`, so any consumer that treats the directory as a single run can misread sibling runs (the corrupt-multi-state class tracked by the completed multi-state spec `0121-us-395`).
4. Every completed run leaves a file that a later cleanup commit batch-deletes from the repo (see commit `ede8620d`, which removed 15 accumulated `ws-spec-multi/*.state.md` files).

## Proposed fix

Move batch run state into a per-run directory consistent with the other orchestrators, one of:

- `{plansDir}/ws-spec-multi/{runId}/{runId}.state.md` (keep a skill-named parent, per-run child directory), or
- `{plansDir}/{runId}/{runId}.state.md` (fully uniform with `{plansDir}/{slug}/`).

Update `STATE.md` / `PROTOCOL.md` / `SKILL.md` / `EXAMPLES.md`, the three scripts (drop `RESERVED_PLAN_DIRS` if the collision is structurally removed), and `ws-monitor` snapshot discovery. Add a resume fallback that still reads the legacy flat path.

## Acceptance criteria (original, mapped to top-level AC1–AC5)

- (original) AC1: New batch runs write state under a per-run directory rather than the flat skill-named directory. → AC1, AC2
- (original) AC2: Resume accepts both the new per-run path and the legacy flat path. → AC3
- (original) AC3: A queue item slugged `ws-spec-multi` can no longer resolve child artifacts into the batch state directory (guard removed or proven unreachable). → AC4
- (original) AC4: Docs and `ws-monitor` discovery match the new path. → AC5

## Out of scope

- Changing the run-id format or the queue table schema.
- Migrating historical run files.

## Evidence

Repo-relative paths above, all in the `workflow-skills` package.

### Prior Work Sweep

- Provider `sweep-prior-work --issue 448 --keywords "ws-spec-multi" "state directory" "RESERVED_PLAN_DIRS"`: no open PR targets issue #448.
- Related merged PR: #400 `feat(#388): persist + observe ws-spec-multi child state` — introduced the child-state guard and the monitor `missing-child-state` finding, and the `RESERVED_PLAN_DIRS` refusal.
- Related completed spec: `0121-us-395` (`.agents/specs/completed/0121-us-395.spec.md`) — terminal-state / stale batch-row class.
- No exact open PR for this tracker id → proceed.

### Design Intent

- `git log -S "RESERVED_PLAN_DIRS"` → commits `3721a1e1` and `3fe300a3` (both `fix(#388): ...`) introduced the reserved-slug refusal deliberately, because the batch occupies `{plansDir}/ws-spec-multi/`. The guard is an intentional mitigation of the shared-directory design, not an accident this spec treats as a bug. The fix removes the root cause (the flat shared directory), so the mitigation becomes unnecessary.

## Visual References

None — the source issue carries no images or attachments.

## Notes

- `{runId}` stays `ms-{YYYYMMDDTHHMMSSZ}`: unique and timestamp-ordered, so `{plansDir}/{runId}/` is a stable, collision-resistant plan directory.
- The batch state file stays Markdown-canonical (`{runId}.state.md`) with the existing frontmatter schema; only its directory changes.
- Staging/`.gitignore` exclusions that referenced `.agents/plans/ws-spec-multi/` must be re-anchored; keep them anchored to the plans path (never an unanchored `ws-spec-multi/` substring regex).
- `ws-monitor` run discovery currently enumerates plan directories; a per-run batch directory is discovered the same way as a single-workflow run.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing the `{runId}` format or the queue table schema | Not required to fix the directory layout; avoids churn |
| Migrating historical `ws-spec-multi/*.state.md` files | Legacy files stay readable via the resume fallback; no data move |
| Reworking the child plan-directory layout (`{plansDir}/{slug}/`) | Child layout is already correct and is not the defect |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Target per-run layout | `{plansDir}/{runId}/{runId}.state.md` | Fully uniform with other runs and structurally removes the slug-named batch dir, so the reserved guards can be deleted; the `ws-spec-multi/{runId}/` variant keeps the collision | n |
| Concurrency model | Distinct `{runId}` per run; no two runs share a directory | `{runId}` embeds a UTC timestamp and is unique per run | y |
| Legacy compatibility window | Resume reads the legacy flat path indefinitely (no forced migration) | Cheap fallback; avoids a migration step | n |
| Input validation / auth boundaries / data lifecycle | N/A because this is an internal Node harness change with no external input boundary, no auth surface, and no persisted user-data lifecycle in scope | Dimension absent for this change | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only the batch state directory and its references change | `git diff` touches the listed touchpoints only |
| Atomic criteria | AC1–AC7 are each independently testable | Trace each AC to a named test |
| Failure modes | Legacy resume, empty/unknown plans dir, duplicate run dir, traversal input | Negative scenarios below |
| Node path containment | New paths are built with `path.resolve` + containment check, never string concatenation (typescript-node invariant 4) | `node {skillsRoot}/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` |
| Observation telemetry | `ws-monitor` resolves the new path and keeps `missing-child-state` | Run `monitor_snapshot.cjs` against a per-run state |
| Zero open blockers | The layout decision is resolved (see Assumptions) | Decision recorded; no open question blocks implementation |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `npm run test` exits 0 (new + existing coverage).
- `node {skillsRoot}/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` reports no critical violations.
- `node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` resolves a per-run state file at `{plansDir}/{runId}/{runId}.state.md`.
- Repo search shows no remaining hardcoded `{plansDir}/ws-spec-multi/{runId}.state.md` literal and no `RESERVED_PLAN_DIRS`.
- `npm run generate-integrity` + `npm run verify-integrity` stay green (hashed skill content changed).

### Negative & Failing Test Scenarios

- **Legacy resume:** a state file left at the flat `{plansDir}/ws-spec-multi/{runId}.state.md` still loads as its run and does not spawn a second run. (Red before the fallback lands.)
- **No shared directory:** creating two runs yields two distinct `{plansDir}/{runId}/` directories; a test asserting a single shared dir fails.
- **Slug alias no longer special-cased:** a queue item slugged `ws-spec-multi` resolves child artifacts to `{plansDir}/ws-spec-multi/`; the previous refusal path is gone (a test asserting the refusal now fails).
- **Missing child state:** an advanced queue item without child state is still reported `missing-child-state` by `ws-monitor` from the new layout (fail-closed observation, no silent blind spot).
- **Path containment:** a crafted `{runId}` or `--plans-dir` attempting traversal (`..`) is refused (typescript-node invariant 4).
