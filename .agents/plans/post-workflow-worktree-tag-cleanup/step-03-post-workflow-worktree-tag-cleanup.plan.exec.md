# Execution Plan — post-workflow-worktree-tag-cleanup

**Source plan:** `.agents/plans/post-workflow-worktree-tag-cleanup/step-02-post-workflow-worktree-tag-cleanup.plan.refined.md`  
**Execution mode:** `parallel`

## Sizing decision

| Metric | Measured | Sequential limit | Result |
|--------|--------:|-----------------:|--------|
| Refined implementation steps | 7 | 3 | exceeded |
| Expected unique changed files | 12 | 6 | exceeded |
| Project layers touched | 3 (skills-sot, tests, installer-cli) | 2 | exceeded |
| Safe DAG levels | 4 | n/a | parallel |
| Atomic tasks | 8 | n/a | parallel DAG required |

**Reason:** 7 plan steps, 12 expected files, and 3 layers all exceed `config.json.dagThresholds` (`maxImplementationSteps=3`, `maxExpectedFiles=6`, `maxLayers=2`). Tasks follow refined plan Steps 1–7; no same-level file overlap; max 3 concurrent per level.

**SoT path note:** Lasting edits land under `src/skills/` (upstream SoT). Dogfood `.agents/skills/` syncs later via packaging/`sync-skills` (not a Step 4 task).

## Levels and tasks

### Level 1 — foundations (script + protocol + FAQ)

#### T1: Shared cleanup script (Phase A)
- **Depends on:** none
- **Plan step:** 1
- **Files:** `src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py`
- **Work:** New Python script implementing Phase A: argparse `--workflow-id`, optional `--dry-run`, `--repo`, `--dirty-policy force|stop` (default `force`). Enumerate tags `uswf/{id}/*`, worktrees (porcelain branch `uswf/{id}/*` or path under worktreesDir for id), branches `uswf/{id}/*`. Remove order: worktrees (`remove --force` + prune) → tags (`tag -d`) → branches (`branch -D` when safe). Dirty WT: log porcelain, then force-remove (or exit 1 on `stop` with no half-register). Verify re-list; print `CLEAN` (exit 0) or `WARN: leftover: …` (exit 2); hard failure exit 1. dryRun: `[DRY-RUN]` log only, exit 0. Guard empty/`*`/traversal-like ids. Follow existing script patterns (`ensure_utf8_stdio`, subprocess list-args git, no shell interpolation).
- **Acceptance:** AC2, AC3, AC4, AC5, AC6, AC9. `python -m py_compile` clean. No remote tag ops. No mutation outside namespace.

#### T2: Protocol Phase A / Phase B split
- **Depends on:** none
- **Plan step:** 2
- **Files:** `src/skills/ws-spec-to-pr/protocols/artifact-cleanup.md`
- **Work:** Rewrite as **Post-workflow cleanup**: Phase A mandatory on `status→completed`; Phase B optional plan-dir temps. Replace GNU `xargs -r` git snippets with `python {skillsRoot}/ws-spec-to-pr/scripts/cleanup_workflow_git.py --workflow-id …`. Keep Phase B `rm` list + preserved files. Document skip active/Pause/failed/cancelled; dryRun; Keep-all still runs Phase A; single completed hook; exit-code contract (0/2/1).
- **Acceptance:** AC5, AC8, AC10. en-us; no host product names.

#### T3: FAQ troubleshooting entry
- **Depends on:** none
- **Plan step:** 5
- **Files:** `src/skills/ws-spec-to-pr/docs/faq.md`
- **Work:** Add FAQ: stale `uswf/` tags/worktrees; mandatory git vs Keep all artifacts; manual re-run (including failed/cancelled leftovers); WARN leftovers; dirty-policy force default. No README/site bump.
- **Acceptance:** AC10. Portable wording; en-us; no host product names.

### Level 2 — orch wiring (standard / lite / multi-spec)

#### T4: Standard orch invoke + artifacts pointer
- **Depends on:** T1, T2
- **Plan step:** 3
- **Files:** `src/skills/ws-spec-to-pr/PROTOCOLS.md`, `src/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `src/skills/ws-spec-to-pr/SKILL.md`, `src/skills/ws-spec-to-pr/ARTIFACTS.md`
- **Work:** Wire Phase A **once** when setting `status→completed` (after Step 9 **or** Step 8 when no Step 9), before claiming ended. Phase B only on delete-temps. Update Ship order, Checkpoints “Delete on completion”, Step 8/9 notes. Brief SKILL cleanup row/pointer. ARTIFACTS one-line: mandatory git + optional plan-dir. No double invoke at Step 8 and 9. Document exit-code orch behavior.
- **Acceptance:** AC1, AC7, AC8. Surgical edits only; en-us; no host names.

#### T5: Lite orch parity
- **Depends on:** T1, T2
- **Plan step:** 4 (lite)
- **Files:** `src/skills/ws-spec-to-pr-lite/SKILL.md`
- **Work:** Document + invoke same Phase A at lite terminal `completed` (after Step 5 fix-pr convergence or Step 4 when skip ship/fix-pr). Link shared protocol / script path. Same skip rules for failed/cancelled/paused.
- **Acceptance:** AC1, AC7. en-us; no host names.

#### T6: Multi-spec child cleanup note
- **Depends on:** T1, T2
- **Plan step:** 4 (multi-spec)
- **Files:** `src/skills/ws-multi-spec/PROTOCOL.md`
- **Work:** Phase 5 / post-child: successful child orch owns Phase A on child `completed`; skipped/failed/aborted children do **not** auto-clean. Batch `runId` is not a `uswf/` cleanup target.
- **Acceptance:** AC1, AC7. en-us; no host names.

### Level 3 — automated tests

#### T7: Cleanup script + contract tests
- **Depends on:** T1, T2, T3, T4, T5, T6
- **Plan step:** 6
- **Files:** `test/test-cleanup-workflow-git.js`
- **Work:** Node test spawning `python` against temp git fixtures. Cases from refined plan §5: deletes local tags only; removes WTs/branches; WARN leftovers exit 2; dry-run no mutate; namespace isolation; dirty force/stop; doc asserts for shared script path, Phase A vs B, FAQ split (AC1/AC7/AC8/AC10 markdown contracts as practical).
- **Acceptance:** AC2–AC10 covered by automated and/or doc-assert cases. Matches existing `test/*.js` style. `node --check` / suite runnable under `npm run test`.

### Level 4 — integrity / ship prep

#### T8: Integrity regenerate + runbook alignment
- **Depends on:** T1, T2, T3, T4, T5, T6, T7
- **Plan step:** 7
- **Files:** `bin/skill-integrity.json`, `src/skills/ws-spec-to-pr/ws-spec-to-pr-run-test.md`
- **Work:** After SoT edits: `npm run generate-integrity` && `npm run verify-integrity`. Update run-test cleanup section only if it still describes optional-only git delete → expect mandatory Phase A. No dependency-graph membership change. Harness Phases 0–5c at ship (not blocking this task’s artifact write, but required before claim ship).
- **Acceptance:** verify-integrity exit 0; runbook matches mandatory Phase A if previously optional-only.

## Dependency graph (summary)

```
L1: T1  T2  T3
     │   │
L2:  └─┬─┘──→ T4
       ├────→ T5
       └────→ T6
              │
L3:           └──→ T7
                    │
L4:                 └──→ T8
```

## AC coverage map

| AC | Tasks |
|----|-------|
| AC1 | T4, T5, T6, T7 |
| AC2 | T1, T7 |
| AC3 | T1, T7 |
| AC4 | T1, T7 |
| AC5 | T1, T2, T7 |
| AC6 | T1, T7 |
| AC7 | T2, T4, T5, T6, T7 |
| AC8 | T2, T4, T7 |
| AC9 | T1, T7 |
| AC10 | T2, T3, T4, T7 |

## Handoff

- Exec plan: `.agents/plans/post-workflow-worktree-tag-cleanup/step-03-post-workflow-worktree-tag-cleanup.plan.exec.md`
- DAG JSON: `.agents/plans/post-workflow-worktree-tag-cleanup/step-03-post-workflow-worktree-tag-cleanup.exec.dag.json`
- Next: `ws-implement-tasks` (Step 4) with `execMode: parallel`
