# Post-workflow cleanup

Two phases. **Phase A (git runtime)** is mandatory when **shipping is terminal** (`shipStatus`: `skipped` \| `merged` \| `stopped`, or equivalent skip-ship after close with no Step 9). **Phase B (plan-dir temps)** runs only when the user chooses delete temps. Never run auto-cleanup while `status: active`, on **Pause workflow**, or for `failed` / `cancelled` / `paused` (those skip Phase A unless the script is invoked explicitly).

Gate options for Phase B (folded into close implementation gate "delete temps" in [`gates.md`](../../ws-shared/gates.md)):

- **Delete temporary artifacts** — plan-dir exec/dag/issue/report/testing files, baseline, archive only
- **Keep all artifacts** (audit) — still runs **Phase A**; skips Phase B only

## Phase A — Mandatory git runtime cleanup

**When:** Once, when shipping reaches a **terminal** state: after Step 9 merge/convergence or stop; after Step 8 ship phase when user skips ship/PR (no Step 9); lite: after Step 5 fix-pr convergence or Step 4 when skip ship/fix-pr. Run **before** claiming the run fully ended. **`status: completed` alone is not the trigger** — close may set `completed` while `shipStatus` is still `pending`/`pr-open`/`pushed`. Do **not** invoke Phase A at close and again at Step 9.

**Skip auto-invoke:** `status: active` / Pause · `failed` · `cancelled` · `paused` (manual re-run allowed).

**dryRun:** Pass `--dry-run` — log intended removals only; zero git mutations.

```bash
python {skillsRoot}/ws-spec-to-pr/scripts/cleanup_workflow_git.py --workflow-id {workflow-id}
# optional:
#   --dry-run
#   --repo {repo-root}
#   --dirty-policy force|stop   # default force: log dirty paths then worktree remove --force
```

Script behavior (namespace `uswf/{workflow-id}` only):

1. Remove matching worktrees (`git worktree remove --force`, prune if needed).
2. Delete local tags (`git tag -d`) — never push or delete remote tags.
3. Delete local branches (`git branch -D`) when not checked out elsewhere. **Never** delete protected branches: `main`, `master`, `develop` (when present), plus `config.json` → `project.baseBranch` / `project.workingBranch`. Never remove the primary repository worktree.
4. Verify re-list; print `CLEAN` or `WARN: leftover: …` with exact names.

**Exit-code contract (orch):**

| Exit | Meaning | Orch behavior |
|------|---------|---------------|
| 0 | CLEAN (or dry-run logged) | Proceed; claim ended OK |
| 2 | WARN leftovers | Surface leftover names; may still claim ended |
| 1 | Hard failure or `--dirty-policy stop` | Do **not** claim ended; STOP / escalate |

## Phase B — Optional plan-dir temp delete

**Only when** user chose **Delete temporary artifacts**. Independent of Phase A (Keep all still runs Phase A).

1. Delete temp files:
   ```bash
   rm {us-dir}/step-03-{slug}.plan.exec.md
   rm {us-dir}/step-03-{slug}.exec.dag.json
   rm {us-dir}/step-00-{slug}.issue.json
   rm {us-dir}/step-05-{slug}.plan.report.md
   rm {us-dir}/step-06-{slug}.review.md
   rm {us-dir}/step-06-{slug}.fix.report.md
   rm {us-dir}/step-07-{slug}.testing.plan.md
   rm {us-dir}/step-07-{slug}.testing.report.md
   ```
2. Remove baseline: `rm -rf {us-dir}/{workflow-id}.baseline/`
3. Remove archive: `rm -rf {us-dir}/{workflow-id}.archive/`

**Preserved:** `step-01-{slug}.plan.md`, `step-02-{slug}.plan.refined.md`, `step-08-{slug}.result.md`, `step-00-{slug}.spec.md`, `{workflow-id}.state.md` (while `status: active`).

## Shared contract

Standard (`ws-spec-to-pr`), lite (`ws-spec-to-pr-lite`), and per-child `ws-multi-spec` workers use this protocol and the same script path. Batch `runId` is not a `uswf/` cleanup target — child orchs clean their own `{workflow-id}` when child shipping is terminal.
