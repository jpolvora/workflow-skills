---
name: ws-fix-pr
description: Single-pass PR thread fixer — resolves active GitHub or ADO PR review threads, applying targeted code fixes and posting progress reports.
version: 0.3.53
disable-model-invocation: true
invocation_names:
  - fix-pr
  - ws-fix-pr
---

# ws-fix-pr

> When this skill is loaded, output "ws-fix-pr loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check.

Fetch, score, and systematically resolve active PR review threads on GitHub or Azure DevOps: local fixes, test validation, thread resolution, and push back to the remote branch.

Platform I/O (`list-threads`, `resolve-thread`) is **delegated** to the skill selected by `providers.scm`: never hardcode a single-host happy path here. See [README.md](README.md) for platform support, flow summary, and fix checklist.

## Invocation

Standalone:

```
/fix-pr <PR-ID> [dry-run]
```

Workflow (called by [ws-goal-fix-pr](../ws-goal-fix-pr/SKILL.md)): all interactive gates are auto-approved by the goal loop; receives `PR-ID` and `dry-run` from the goal.

A **batch** is all active threads fetched and scored in one standalone invocation, or in one `ws-goal-fix-pr` Act round. Run one `fixPrPlan` → `fixPrExec` pair for the batch, never one pair per thread.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `<PR-ID>` | required | Target Pull Request number |
| `dry-run` | false | Simulate fixes/resolutions; no commits, pushes, or remote thread mutations |

## Prerequisites

- Local branch checked out matches the PR source branch.
- `{sharedDir}/config.json` with resolvable `providers.scm` (`github` \| `azure-devops`, never `local`): see [config-resolution.md](../ws-shared/config-resolution.md).
- Provider skill's `validate-auth` passes before mutating remote threads.

## SCM provider resolution

Resolve per [config-resolution.md](../ws-shared/config-resolution.md): read `providers.active` / `providers.scm`; if absent, prefer an enabled GitHub tracker, else Azure DevOps; reject `scm: "local"`.

| `providers.scm` | Skill | Intents used here |
|-----------------|-------|-------------------|
| `github` | [ws-github-provider](../ws-github-provider/SKILL.md) | `list-threads`, `resolve-thread`, `check-pr-status` |
| `azure-devops` | [ws-azure-devops-provider](../ws-azure-devops-provider/SKILL.md) | `list-threads`, `resolve-thread`, `check-pr-status` |

## Internal model roles

Capture the active session model once before either role dispatch and resolve both role models from that stable fallback:

| Role | Resolve order | Phase fallback |
|------|---------------|----------------|
| `fixPrPlan` | `stepModels.fixPrPlan` → active preset `steps.fixPrPlan` → top-level phase key → preset phase key → captured session | `reviewerModel` |
| `fixPrExec` | `stepModels.fixPrExec` → active preset `steps.fixPrExec` → top-level phase key → preset phase key → captured session | `executionModel` |

Numeric `stepModels["9"]` and preset `steps["9"]` select only the outer Step 9 skill and are never consulted by these internal roles. `"current"` resolves immediately to the captured session model; empty values fall through. If `dispatch-agent` rejects or cannot use a configured model, run that role inline under the captured session model and record the actual fallback model without aborting the batch.

When an orchestrator owns the run and `dispatch-agent` is available, append ordered JSONL dispatch events with `--step 9 --substep fixPrPlan --model <actual-plan-model>` and then `--step 9 --substep fixPrExec --model <actual-exec-model>`. Internal roles never call `finish --step 9`; only the outer orchestrator finishes Step 9 after convergence or terminal stop. A standalone host without `dispatch-agent`, and lite Step 5, run the same two phases sequentially inline under `currentModel`; lite ignores both role keys and does not add internal role telemetry.

## Steps

1. **Outer preflight**: before `fixPrPlan`, run `git pull origin <sourceRefName>`, refuse dirty worktrees, resolve the SCM provider, and require its `validate-auth` to pass. Repository synchronization is not part of the plan role.
   - Done when: the worktree is clean and current with the source branch before role dispatch.

2. **`fixPrPlan` — fetch, score, and write the gate**: create one `batchId`; call provider `list-threads` and read `check-pr-status` for `<PR-ID>`. Parse every active thread's `threadId`, `filePath`, `lineNumber`, and comments. Use `activeThreads` directly; do not re-filter raw statuses. Open collect output as UTF-8 explicitly. Rate each thread 0–10 and name its `proposedAction`:

   | Score | Action |
   |-------|--------|
   | 0–5 | Resolve with a comment justifying no code change |
   | 6–10 | Apply a surgical code fix |

   Write the complete uncommitted gate to `{skillsRoot}/ws-fix-pr/runs/pr-<PR-ID>/plan-gate.md` with `batchId`, `prId`, `scope` (`goal-act-round` or `standalone`), `headSha`, `plannedAt`, exact `activeThreadIds`, and `status: planned`. Each score 6–10 row requires `threadId`, `score`, `proposedAction`, reserved `defectClass`, `sourcesConsulted`, `proactiveFixed`, `proactiveSkipped`, and `amendments: []`. Ask "Proceed with fixes for threads [ID1, ID2]?"; the goal loop auto-approves after the gate exists.

   **Mutation barrier:** `fixPrPlan` may read repository/provider evidence and write only this `plan-gate.md`. It must not edit product files, commit, push, call `resolve-thread`, or call `finish --step 9`. The complete gate must exist before any product or remote mutation.
   - Done when: every active thread is scored with a proposed action, the complete batch gate is written, and the gate is confirmed or goal-auto-approved.

3. **Execute handoff validation**: before `fixPrExec`, require the gate's `batchId` and `prId` to match the handoff, its `activeThreadIds` to represent the planned batch, and its `headSha` to equal current HEAD. Re-collect thread identity. A stale or invalid gate blocks execution and returns to `fixPrPlan`; do not silently widen the batch for newly material blocking work.
   - Done when: the complete gate matches the target batch, current HEAD, and rechecked thread evidence.

4. **`fixPrExec` — follow, amend, and fix**: follow the approved gate. Re-run provider `check-pr-status`, inspect failed-check logs, and classify failures as diff-regression, baseline reproduced on `project.baseBranch`, or infra-flake (one rerun only). For changed or remotely resolved thread evidence, append a skip or structured amendment. Before the first product edit that differs from `proposedAction`, append an amendment containing `timestamp`, `threadId`, `newFact`, `previousAction`, `revisedAction`, `rationale`, and evidence source.

   For every score 6–10 thread, name the defect class and follow [`scripts/COOPERATIVE_FIX.md`](scripts/COOPERATIVE_FIX.md) **proactive discovery** (code grep, `read-memory` for every enabled backend — local `MEMORY.md` / `memory/*` and/or spec-memo vault — same-PR context, and optional pattern docs when enabled) before `resolve-thread`. Apply minimal edits for every in-scope occurrence per the size gate, not only the anchor. Record `defectClass`, `sourcesConsulted`, `proactiveFixed`, and `proactiveSkipped` (path + reason) on the gate and in each resolution comment. **Forbidden:** close a thread after fixing only the anchor while same-class surgical hits remain without a recorded skip. Per-backend memory miss is consult-skipped (`memory-files` / `spec-memo`); absent prior round reports are not a failure.
   - Done when: the execute role followed the gate, every deviation was amended before its governed edit, and every approved thread has class-wide proactive evidence or recorded skips.

5. **Verify, learn, resolve, and push**: run `config.json.verification`; write `{reviewsDir}/PR-<PR-ID>-round-<N>.md`; run post-round learning per [`ws-self-learning`](../ws-self-learning/SKILL.md) § Post fix-pr round. Only after complete plan and execute/proactive evidence, call provider `resolve-thread` with a `<!-- resolution-reply -->` marker, a `--comment` / note that names the commit (when code changed) **and** states what changed (files + behavior + why it resolves; GitHub and Azure reject hash-only or model-footer-only bodies), and `--model` set to the executing session model (`currentModel` / actual `fixPrExec` model) so the closing comment ends with `---\nLLM model: {id}`. Template: [`scripts/COOPERATIVE_FIX.md`](scripts/COOPERATIVE_FIX.md) § Thread Response. Then stage, commit, and `git push origin HEAD`. `dry-run` suppresses product/remote mutation, commit, and push while retaining plan evidence and simulation.
   - Done when: both `fixPrPlan` gate evidence and `fixPrExec` proactive evidence are complete, verification passed, the report includes `Learning:`, required traps are compiled, each resolution comment describes the correction (not hash-only), threads are resolved or simulated, and the branch is pushed unless `dry-run`. After step finish, orch persists `{us-dir}/handoff/step-{NN}.json`.
