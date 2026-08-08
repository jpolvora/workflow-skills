---
us: "post-workflow-worktree-tag-cleanup"
reportDate: 2026-08-01
score: 9
sourcePlans: ["step-02-post-workflow-worktree-tag-cleanup.plan.refined.md"]
evalSource: step-02-post-workflow-worktree-tag-cleanup.plan.refined.md
githubSource: none
mode: quick
fableVerdict: VERIFIED WITH CAVEATS
---

# Implementation Report - post-workflow-worktree-tag-cleanup

**Generated on:** 2026-08-01
**Score:** 9/10
**Evaluation source:** step-02-post-workflow-worktree-tag-cleanup.plan.refined.md
**Reference Plan:** step-02-post-workflow-worktree-tag-cleanup.plan.refined.md
**Spec:** step-00-post-workflow-worktree-tag-cleanup.spec.md
**Anchor:** `uswf/post-workflow-worktree-tag-cleanup-20260801T180142Z/before-step-5`
**Verifier:** Cursor Grok 4.5 · readonly · ws-verify-plan (quick; ≥7 — no deepen required)

ws-verify-plan loaded. ws-fable-judge loaded.

## Executive Summary

Phase A git cleanup is implemented: shared Python script, protocol Phase A/B split, standard/lite/multi-spec orch docs, FAQ, runbook, and automated tests. Fresh re-run: `node test/test-cleanup-workflow-git.js` → **0 failures**; `python -m py_compile` OK. One ship-prep gap: `bin/skill-integrity.json` is stale vs current tree solely for `ws-spec-to-pr-run-test.md` (re-run `npm run generate-integrity` before ship). Score **9/10** → AUTO prepare advance (fail-closed not triggered).

## Quick Score

| Criterion | Score (0-10) | Weight | Notes |
| :--- | :---: | :---: | :--- |
| **Completeness** | 9 | 40% | Plan Steps 1–6 done; Step 7 integrity one-file drift after run-test edit |
| **Correctness & Style** | 9 | 35% | Namespace guards, WT→tags→branches, exit 0/1/2, portable `python` launcher; path match slightly broad (`/{id}/`) |
| **Testing** | 10 | 25% | All planned cases green on fresh re-run (AC2–AC10 + doc contracts) |
| **Weighted** | **9** | | `0.4×9 + 0.35×9 + 0.25×10 = 9.15` → **9** |

## Result by Feature (Plan & ACs)

| Feature | Situation | Detail / Evidence |
|---------|-----------|-------------------|
| AC1 Terminal Phase A hook | **Implemented** | Protocol + `PROTOCOLS.md` / `STEP-DISPATCH.md` / lite SKILL / multi-spec `PROTOCOL.md`: single `status→completed` invoke before claim-ended; not dual Step 8+9 |
| AC2 Local tags only | **Implemented** | `cleanup_workflow_git.py` `remove_tags` → `git tag -d`; tests `testCleanupDeletesLocalTagsOnly` (no push language); exit CLEAN |
| AC3 Worktrees + branches | **Implemented** | Order WT → tags → branches; `worktree remove --force` + prune; `branch -D` when safe; `testCleanupRemovesWorktreesAndBranches` PASS |
| AC4 Verify / WARN leftovers | **Implemented** | `verify()` + `WARN: leftover: …` exit 2; `testCleanupWarnsOnLeftovers` PASS (HEAD-stuck branch named) |
| AC5 Skip active / dryRun | **Implemented** | Protocol skip active/Pause/failed/cancelled; `--dry-run` logs `[DRY-RUN]` exit 0; `testCleanupDryRunNoMutate` PASS |
| AC6 Namespace isolation | **Implemented** | Prefix `uswf/{id}/` only; refuses empty/`*`/`..`; `testCleanupNamespaceIsolation` PASS |
| AC7 Shared contract | **Implemented** | One script under `ws-spec-to-pr/scripts/`; lite + multi-spec link same path; `testDocsReferenceSharedCleanupContract` PASS |
| AC8 Keep-all still Phase A | **Implemented** | Protocol + FAQ: Keep all skips Phase B only; `testProtocolMandatoryVsOptionalSplit` PASS |
| AC9 Dirty WT force/stop | **Implemented** | Default `--dirty-policy force`; `stop` exit 1 no half-remove; both dirty tests PASS |
| AC10 Docs en-us portable | **Implemented** | `artifact-cleanup.md`, FAQ, orch docs; no host product names in protocol; FAQ covers WARN / dirty / manual re-run |
| Plan Step 1 Script | **Implemented** | `src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py` (new) |
| Plan Step 2 Protocol rewrite | **Implemented** | Phase A mandatory / Phase B optional; no `xargs -r` |
| Plan Step 3 Standard orch | **Implemented** | `PROTOCOLS.md`, `STEP-DISPATCH.md`, `SKILL.md`, `ARTIFACTS.md` |
| Plan Step 4 Lite + multi-spec | **Implemented** | `ws-spec-to-pr-lite/SKILL.md`, `ws-multi-spec/PROTOCOL.md` (child owns Phase A; `runId` not a target) |
| Plan Step 5 FAQ | **Implemented** | `docs/faq.md` § Stale `uswf/`… |
| Plan Step 6 Tests | **Implemented** | `test/test-cleanup-workflow-git.js` — failures=0 |
| Plan Step 7 Integrity | **Implemented differently** | Manifest includes `scripts/cleanup_workflow_git.py` + updated digests, but `--check` fails: drift on `ws-spec-to-pr-run-test.md` only — regenerate once before ship |

## Additional Features Beyond Original Plan

| Feature / Extra Behavior | Location in Code | Note |
|--------------------------|------------------|------|
| Path match includes `/{workflow_id}/` segment | `cleanup_workflow_git.py` `worktree_matches` | Slightly broader than “under worktreesDir”; still skips primary checkout |
| Broken WT prune-then-retry | `remove_worktrees` | Aligns with AC3 force/orphan intent |
| `ws-spec-list` entry in integrity diff | `bin/skill-integrity.json` | Unrelated tree churn captured during regen — not this feature’s scope |

## Gaps and Next Steps

1. **Ship prep:** Re-run `npm run generate-integrity` && `npm run verify-integrity` so `ws-spec-to-pr-run-test.md` digest matches (current `--check` exits non-zero).
2. **Optional harden (non-blocking):** Narrow worktree path association to configured `plans.worktreesDir` + `uswf/{id}` to reduce false-positive matches on coincidental `/{id}/` path segments.
3. **No AC blockers** for Step 6 code review advance.

## Re-run verification (this Step 5)

| Command | Result |
|---------|--------|
| `node test/test-cleanup-workflow-git.js` | **PASSED** (failures=0) |
| `python -m py_compile …/cleanup_workflow_git.py` | **PASSED** |
| `npm run verify-integrity` | **FAILED** — stale vs tree (`ws-spec-to-pr-run-test.md` digest drift) |

## Fable Judge (config `fable.enabled` + `autoAudit`)

# Adversarial Audit Report (`ws-fable-judge`)

**Verdict:** `VERIFIED WITH CAVEATS`

## Claims vs Ground Truth
- **Claimed Scope:** Shared Phase A cleanup script + protocol/orch/FAQ/tests + integrity regenerate.
- **Ground Truth Diff:** New `cleanup_workflow_git.py` + `test-cleanup-workflow-git.js`; modified protocol, PROTOCOLS, STEP-DISPATCH, SKILL, ARTIFACTS, FAQ, lite SKILL, multi-spec PROTOCOL, run-test, `bin/skill-integrity.json`. Blast radius matches refined plan (no drive-by `validate_state.py`).

## Re-Run Verification Results
- `node test/test-cleanup-workflow-git.js` → **PASSED** (Exit 0)
- `python -m py_compile src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py` → **PASSED**
- `npm run verify-integrity` → **FAILED** (Exit ≠0) — ship-prep caveat

## Fraud Audit
- **Weakened Checks:** None detected — assertions present; dirty/stop/warn/namespace cases intact.
- **False Completion:** **Caveat** — Step 4 telemetry claimed `verify-integrity PASS`; fresh check fails on one post-edit file. Core feature + tests claims hold.
- **Scope Creep:** None material for feature SoT; integrity JSON also touched unrelated `ws-spec-list`/hub digests from broader tree state.
- **Unauthorized Actions:** None (readonly verifier; no push/remote tag ops in script).

## Action Items
- Regenerate integrity before ship (does **not** block Step 5 advance; score not capped — verdict is not `REFUTED`).

## AUTO gate

- Score **9 ≥ 7** → prepare to advance to Step 6 (code review).
- Fail-closed pause **not** required.
