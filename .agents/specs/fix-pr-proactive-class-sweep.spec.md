---
id: null
slug: fix-pr-proactive-class-sweep
title: "ws-fix-pr: proactive same-category discovery before resolve"
source: local
specDate: 2026-08-21
---

# Specification — ws-fix-pr: proactive same-category discovery before resolve

## Description

Enhance the `ws-fix-pr` / Auto-Fix **cooperative fix** loop so that, after a review or CI thread is **validated** as a real defect (score 6–10 or equivalent), the agent does not stop at the anchored `file:line` or a shallow code grep of paths already named in the thread. It must **proactively** discover and surgically fix other occurrences of the **same defect category/pattern** across every available evidence source, so the next reviewer or CI round does not re-open siblings as new threads.

### Problem

`COOPERATIVE_FIX.md` already mandates a sibling occurrence sweep (added for PR #223). In practice, agents still often:

1. Fix only the anchored instance or thread-listed paths.
2. Skip `{sharedDir}/MEMORY.md`, prior round reports, failed-check logs, and other open threads that share the same class.
3. Close the thread, then the next agentic review / CI pass files **new** threads for the same pattern elsewhere.

That wastes rounds and contradicts the MEMORY trap *Cooperative fix must sweep the defect class*.

### Goal

After validate → name defect class → **multi-source proactive discovery** → apply **surgical** same-class fixes when the blast radius is small → report proactive hits and explicit skips → then resolve/push. Large or architectural same-class work stays reported and exempted (path + reason), not silently half-done.

### Scope (touch)

| Artifact | Change |
|----------|--------|
| `.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md` | Normative proactive discovery + size gate + report fields |
| `.agents/skills/ws-fix-pr/SKILL.md` Step 5 (+ plan-gate fields) | Bind the enhanced contract; require multi-source consult before resolve |
| `.agents/skills/ws-fix-pr/scripts/AUTO_FIX.md` | Same class-wide / proactive obligations for Auto-Fix CI |
| `.agents/skills/ws-goal-fix-pr/SKILL.md` | Round must not resolve until proactive sweep ran or exemptions recorded |
| `ws-fix-pr` evals | Assert multi-source consult + size-gate skip language |

Out of scope: merging `ws-fix-pr` into another skill; changing SCM provider APIs; inventing a fourth provider; rewriting archived PR round reports.

### Proactive discovery sources (mandatory after validate)

For each validated blocking thread, after naming the defect class in one line, search **all** of the following that exist for this PR / repo before applying edits:

| Source | What to look for |
|--------|------------------|
| **Code** | Repo-wide grep / structural search for the same pattern (identifiers, schema shapes, copied helpers, false-green claims, etc.) — keep existing COOPERATIVE_FIX keyword table and extend when the class is new |
| **MEMORY** | `{sharedDir}/MEMORY.md` and matching `memory/*` via `ws-self-learning` pre-work / path match for the defect class and touched paths; reuse known `INSTEAD DO` solutions |
| **Context** | Other **open** threads on the same PR that share the class; prior `{reviewsDir}/PR-<id>-round-*.md` findings; `check-pr-status` failed-log snippets for the same pattern; thread body "similar occurrence" notes |
| **Patterns (when enabled)** | `{sharedDir}/backend.md` / `frontend.md` when `defaults.patternsBackend` / `patternsFrontend` are true and the layer matches |

Discovery findings that are the **same class** become candidate fixes in this round (not deferred to "hope CI finds them").

### Size / surgical gate

| Outcome | When |
|---------|------|
| **Fix now** | Same-class hit is a local, surgical edit (same correction shape as the validated thread; typically ≤ few files / small LOC; no new abstraction or cross-layer redesign) |
| **Skip with reason** | Hit requires a large refactor, unrelated feature work, ambiguous ownership, or would expand the PR beyond the review scope — record `path + reason` on plan-gate and resolution comment; do **not** mark the class "fully cleared" |

Do not invent drive-by cleanups. Prefer fixing many small siblings over one speculative redesign.

### Reporting

Plan-gate and each resolution comment (and Auto-Fix `explanation`) MUST list:

- `defectClass` (one line)
- `sourcesConsulted` (code / memory / context / patterns — which were actually searched)
- `proactiveFixed` (paths fixed beyond the anchor)
- `proactiveSkipped` (path + reason)
- Statement that resolve is allowed only after the proactive pass (or explicit full skip of discovery with reason, e.g. dry-run analysis-only)

### Relationship to existing contract

This **extends** the current sibling sweep; it does not replace validate → score → user/goal gate. Align wording with `ws-implement-tasks` "Fix the Entire Defect Class" and MEMORY consult on fix mode, adapted to PR-thread runtime.

## Acceptance Criteria

- AC1: `COOPERATIVE_FIX.md` defines a mandatory **proactive discovery** step after naming the defect class and before resolve, requiring consult of code grep **and** MEMORY (when present) **and** same-PR context sources listed in Description (other open threads, prior round reports when present, failed-check logs when triage ran).
- AC2: `ws-fix-pr/SKILL.md` Step 5 (or successor step) requires that multi-source proactive discovery run for every score 6–10 thread before `resolve-thread`, and forbids closing a thread after fixing only the anchored instance when same-class surgical hits remain unfixed without a recorded skip.
- AC3: Surgical size gate is written in `COOPERATIVE_FIX.md`: same-class hits that are small/local MUST be fixed in the same round; large/architectural hits MUST be listed under `proactiveSkipped` with path + reason (not silently ignored).
- AC4: Plan-gate (`plan-gate.md`) and resolution bodies include `defectClass`, `sourcesConsulted`, `proactiveFixed`, and `proactiveSkipped` (or equivalent field names) for each resolved blocking thread.
- AC5: `AUTO_FIX.md` / Auto-Fix order of operations requires the same proactive discovery + size gate; Auto-Fix explanations include proactive fixed/skipped lists so CI and IDE stay aligned.
- AC6: `ws-goal-fix-pr` Act-round prose requires the proactive class sweep (not only the old "sibling sweep" one-liner) before resolve/push each round.
- AC7: `ws-fix-pr` evals (or equivalent) include at least one case where a second same-class path outside the thread anchor must be fixed or explicitly skipped with reason before resolve is considered complete.
- AC8: Missing `MEMORY.md` does not abort fix-pr (consult-skipped is allowed and recorded in `sourcesConsulted`); absence of prior round reports is not a failure.
- AC9: No dual folders or compatibility shims; single updated contract under `ws-fix-pr/scripts/COOPERATIVE_FIX.md`. Language remains en-us.
- AC10: After hashed skill content changes, `npm run generate-integrity` / `verify-integrity` and relevant tests pass in the ship commit; `ws-check-harness` reports 0 critical findings for these skill docs.

## Original Issue Context

Maintainer free-text (todo):

> enhance the ws-fix-pr cooperative fix process: the fix-pr should be pro-active in finding related issues of each issue found same category/pattern, avoiding next round the reviewer of ci create new issue. So after validate the issue, also should check in code/memory/context/any source available for same issues and fixes it surgically if was not a big change.

### Prior Work Sweep

- Keywords: cooperative fix, defect class, sibling sweep, fix-pr proactive, same pattern.
- Shipped baseline: `COOPERATIVE_FIX.md` sibling occurrence sweep + `ws-fix-pr` Step 5 (commits `bf2351b`, `76931bb` on PR #223). MEMORY trap *Cooperative fix must sweep the defect class* (2026-08-21).
- Related: `ws-implement-tasks` Fix the Entire Defect Class + MEMORY consult on fix mode — pattern to mirror for fix-pr.
- Open PRs: none specifically for "proactive multi-source" enhancement beyond the existing sibling sweep. Continue on a new change; do not reopen #223 for this.
- Gap this spec closes: sources beyond code/thread-listed paths; explicit size gate; structured proactive reporting; goal-loop / Auto-Fix alignment so the next CI/review round is less likely to invent duplicate class threads.

### Design Intent

Not restoring a removed behavior. Sibling sweep was an intentional post-#223 addition; it is incomplete relative to the maintainer ask (MEMORY/context/proactive + surgical-only-if-small). Enhance in place; do not weaken the existing "fix the class, not the line" rule.

## Child Tasks

### Task A — Contract

- **Status:** Open
- **Description:** Extend `COOPERATIVE_FIX.md` with proactive sources, size gate, and report fields; sync Auto-Fix order of operations.

### Task B — Skill bindings

- **Status:** Open
- **Description:** Update `ws-fix-pr/SKILL.md` Step 5 + plan-gate expectations; update `ws-goal-fix-pr` Act round; keep SCM intents unchanged.

### Task C — Evals / proof

- **Status:** Open
- **Description:** Add or extend evals for proactive second-path fix or explicit skip; regenerate integrity at ship.

## Notes

- Config-dependent: `providers.scm` still required for thread I/O; MEMORY/patterns consult uses project `{sharedDir}`.
- Dry-run: discovery and plan-gate still run; no commit/push/resolve mutations.
- Prefer linking to `ws-self-learning` consult rather than duplicating MEMORY format in fix-pr.
- Do not require rewriting historical `{reviewsDir}` artifacts.
