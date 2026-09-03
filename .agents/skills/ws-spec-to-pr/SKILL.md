---
name: ws-spec-to-pr
description: End-to-end Spec-to-PR (steps 0–9). Verify score ≥ `defaults.minVerifyScore` (default 9) before review. Trigger for full/standard delivery.
version: 0.3.56
disable-model-invocation: true
invocation_names:
  - spec-to-pr
  - ws-spec-to-pr
---

# ws-spec-to-pr

> When this skill is loaded, output "ws-spec-to-pr loaded."

**Specs family:** Role = single-feature **standard** Spec→PR. Free-text Step 0 → `ws-spec-write` (`{specsDir}`) then `ws-spec-provider-local` register; tracker id (GitHub/ADO) → provider fetch + `ws-spec-write` agentic reformulation (`{specsDir}`) then `ws-spec-provider-local` register; existing `*.spec.md` → spec-provider-local. Downstream steps always read the enhanced local spec copy. Batch → [`ws-spec-multi`](../ws-spec-multi/SKILL.md). Fast path → [`ws-spec-to-pr-lite`](../ws-spec-to-pr-lite/SKILL.md). Router: [`../ws-shared/autoload.md`](../ws-shared/autoload.md).


- **Dual-mode:** Shared pipeline skills stay interchangeable with [`ws-spec-to-pr-lite`](../ws-spec-to-pr-lite/SKILL.md).

Before Step 0, on-demand load [`setup.md`](../ws-shared/setup.md) for bootstrap (Feature branch gate: §5b).

## Native Tool Contract

Aliases: [`tools.md`](../ws-shared/tools.md). Params: `{sharedDir}/config.json`. Entry check: [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check. Never narrate undone work. Host mode: resolve `defaults.hostAdapter.mode` + tool-palette flags (`hasStructuredChoiceTool` / `hasSubagentTool` / `hasBrowserTool`) per [`host-dispatch.md`](../ws-shared/host-dispatch.md) at bootstrap; honor Tier 1 → Tier 2 → Tier 3. Orch never edits code except Inline Isolated Execution (Tier 3) where the session model temporarily adopts the step persona to edit via native file tools; otherwise use `dispatch-agent` only.

| Intent | Alias | Rule |
|--------|-------|------|
| Step work | `dispatch-agent` | `generalPurpose`\|`shell`; `description: "STP step {N} — {Label}"`; readonly step 5; step 4 DAG ≤3 parallel only when `defaults.enableDag: true` |
| User gate | `user-gate` / `user-gate-auto` | **Every step boundary:** use `user-gate` per [`gates.md`](../ws-shared/gates.md) (host structured-choice when available; markdown fallback); ≥2 options; cancel → HS-1; auto → index 0 |
| Verification / SCM | `Shell` | `config.json.verification`; cite real `gh`/`git` output |
| State | `read-state` / `write-state` | Hygiene before Progress Board |
| Browser (7) | `browser-mcp` | Normal, non-dry-run, non-skip, gated |

Subagents return parseable `step-output`. Gate contexts: transitions, entry/resume/config, G2-code, Step 8 ship, Step 9 fix-pr.

**Forbidden during this workflow:** do not load `ws-run-benchmark`, and do not run `npm run benchmark`, `npm run benchmark:static`, or `scripts/harness-benchmark`. Those compare versions of the upstream package at that root only. Step `elapsedSec` is reporting telemetry for the Timing section.

## Goals & Invariants

1. **Scope:** Steps 0–7 local (first **required** product commit is G2-code after Step 5, not Step 8); Step 8 close implementation then ship; Step 9 fix-pr. No push before Step 8 ship phase. `status: completed` = implementation done (close), not PR merge.
2. **Auth:** Gate required for G1+. Cancel → HS-1. Commit → G2 + menu (HS-2).
3. **Isolation:** Subagent per step. Checkpoint tag `uswf/{id}/before-step-{N}`. Branch-direct default; worktree when `plans.useWorktrees=true`.
4. **State / Memory:** Hygiene → asserts → board (fail → HS-5). `{workflow-id}.state.json` is machine SoT (`.state.md` is the render); `{sharedDir}/MEMORY.md` generalizable.
5. **Mode Flags:** `dryRun` (no code/push/browser writes); `autoMode` (auto-gate 0); `skipQualityGates` (`[GATES BYPASSED]` banner, bypass telemetry); `fullMode` (commit plan+result then create PR). Subagent models resolve from `defaults.modelsPreset` / `modelPresets`, optional `stepModels` (numeric + `dag` / `scoreAndRefine` / `reviewFix` / `fixPrPlan` / `fixPrExec`), and legacy phase keys — pass the resolved id on `dispatch-agent` and `--model` / `--substep` to `update_state.cjs`. Step 7: `testingModel` → `executionModel` → session after overrides; `reviewerModel` is Steps 5–6 only. Internal Step 9 roles resolve `fixPrPlan` → `reviewerModel` and `fixPrExec` → `executionModel`, never numeric `"9"`; capture the session fallback before either dispatch, append both ordered dispatch events, and let only the outer Step 9 call `finish`. **Config switches (not invocation flags):** `defaults.enableDag` (when `false` [default], forces sequential task execution; when `true`, enables parallel DAG tasks per `dagThresholds`); `defaults.verboseMode` (explicit `true` → executing model reasons and prints a start-of-step `*` list; omitted/`false` → silent; schema/`ws-configure-project` seed writes `true`); `defaults.providerCompat` (optional host hints only); `defaults.contextHygiene` (`pruneAfterStep` default true; `backgroundVerboseSteps` falls back to blocking `dispatch-agent`); `defaults.reviewJury.size` 1–3 (size > 1 is standard Step 6 only).
6. **Artifacts:** Never commit `{plansDir}/` in Steps 0–7. Product G2-code after Step 5 and after Step 6 review-fix uses path-scoped `files_touched` only. Delivery commit Step 8: plan + `step-08-{slug}.result.md` only.
7. **Pause / Revert:** Pause retains state (`status: active`). Revert uses manifest + checkpoint tag — no global hard reset. **Resume pre-check (AC9):** on resume, before re-implementing, resolve `{integrationBranch}` = `config.project.workingBranch` when set, else `{baseBranch}`; if `{gitRemote}` exists, run `git fetch {gitRemote} {integrationBranch}` first (auth/network failure → skip-check `fetch-failed`, proceed, never mark completed); then run `git rev-list --count origin/{integrationBranch}..HEAD` (do **not** compare only to `origin/{baseBranch}` when `workingBranch` is set — stale tips merged into `develop` can still be ahead of `main`). Count `0` → mark `completed` (already merged) **only when** the workflow has product commits (`state.commits` non-empty or Step 5 in `completedSteps`) **and** `HEAD` ≠ `baselineCommit`; bare `0` on a branch that never committed is pre-first-commit resume — proceed normally. When `state.branch` equals `{integrationBranch}` (stay-on-integration), skip the count, log `resume-gate | skip-check | stay-on-integration | {branch} vs {integrationBranch} | ISO`, and proceed (do **not** mark completed). Skip-check when `origin/{integrationBranch}` is unavailable (see [`setup.md`](../ws-shared/setup.md) §4c).
8. **Reproducible-artifact invariant (AC6):** every step artifact a later step reads must be reconstructable from state + committed diff, enforced by the pre-advance `node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs <state> --pre-advance <N>` check: if a required artifact or its metadata for advancing to step N is missing, validation exits non-zero and advance is blocked (fail closed).

## Phases F0–F6 & Step Index

| Phase | Steps | Executor | `completedSteps` |
|-------|-------|----------|------------------|
| F0 Bootstrap | 0 | Orch + spec subagent | 0 |
| F1 Planning | 1–3 | Planner | 1–3 |
| F2 Implementation | 4 | Coder (sequential default; DAG ≤3 parallel when `enableDag: true`) | 4 |
| F3 Verification | 5 | Verifier (readonly) | 5 |
| F4 Review + Fix | 6 (+ fix) | Reviewer + Coder | 6 |
| F5 Testing | 7 | Verifier + optional browser | 7 |
| F6 Ship + Fix-PR | 8–9 | Orch + shell (+ fix-pr) | 8 (ship) / 9 (fix-pr complete) |

Worktree & complexity rules: [`PROTOCOLS.md`](PROTOCOLS.md). Setup: [`setup.md`](../ws-shared/setup.md). Dispatch bodies: [`STEP-DISPATCH.md`](STEP-DISPATCH.md). Filenames: [`ARTIFACTS.md`](ARTIFACTS.md).

## Step 0 — Pipeline Classifier

After `step-00-{slug}.spec.md` exists and before Step 1:
1. Invoke [`ws-classify-complexity`](../ws-classify-complexity/SKILL.md) → writes `step-00-{slug}.classify.md`.
2. **User Gate** (unless `autoMode` or `skipQualityGates`): Accept recommendation (Recommended) · Override to standard · Override to lite.
3. Apply `finalPipeline` from [`ws-classify-complexity`](../ws-classify-complexity/SKILL.md) (mid-flight stay-standard rule lives there).

## Quality Gate Bypass (`skipQualityGates`)

See [`gates.md`](../ws-shared/gates.md) § Quality gate bypass. Active via `--skip-gates` or `config.json` → `invariants.skipQualityGates`.

## Invocation

```
/ws-spec-to-pr [flags] [US {issue_id} | {name}.spec.md | "description"]
```

## Exit & Handoff

Complete when Step 8 **close** sets `status: completed` (implementation done). Shipping (push/PR) and Step 9 fix-pr may continue in the same run; `shipStatus` tracks shipping separately.
