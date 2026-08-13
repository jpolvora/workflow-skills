---
name: ws-spec-to-pr
description: End-to-end Spec-to-PR orchestrator (Steps 0–9).
version: 0.3.12
disable-model-invocation: true
invocation_names:
  - spec-to-pr
  - ws-spec-to-pr
---

# ws-spec-to-pr

> When this skill is loaded, output "ws-spec-to-pr loaded."

**Specs family:** Role = single-feature **standard** Spec→PR. Free-text Step 0 → `ws-write-spec` (`{specsDir}`) then `ws-local-spec-provider` register; existing `*.spec.md` → local-spec-provider; tracker id → SCM provider. Batch → [`ws-multi-spec`](../ws-multi-spec/SKILL.md). Fast path → [`ws-spec-to-pr-lite`](../ws-spec-to-pr-lite/SKILL.md). Router: [`../ws-shared/autoload.md`](../ws-shared/autoload.md).

- **Dual-mode:** Shared pipeline skills stay interchangeable with [`ws-spec-to-pr-lite`](../ws-spec-to-pr-lite/SKILL.md).

Before Step 0, on-demand load [`setup.md`](../ws-shared/setup.md) for bootstrap (Feature branch gate: §5b).

## Native Tool Contract

Aliases: [`tools.md`](../ws-shared/tools.md). Params: `{sharedDir}/config.json`. **Entry check:** verify local project `$PWD/.agents/skills/ws-shared/config.json`; if missing/unconfigured, prompt `user-gate` to run [`ws-configure-project`](../ws-configure-project/SKILL.md). Never narrate undone work. Orch never edits code — `dispatch-agent` only.

| Intent | Alias | Rule |
|--------|-------|------|
| Step work | `dispatch-agent` | `generalPurpose`\|`shell`; `description: "STP step {N} — {Label}"`; readonly step 5; step 4 DAG ≤3 parallel |
| User gate | `user-gate` / `user-gate-auto` | **Every step boundary:** use `user-gate` per [`gates.md`](../ws-shared/gates.md) (host structured-choice when available; markdown fallback); ≥2 options; cancel → HS-1; auto → index 0 |
| Verification / SCM | `Shell` | `config.json.verification`; cite real `gh`/`git` output |
| State | `read-state` / `write-state` | Hygiene before Progress Board |
| Browser (7) | `browser-mcp` | Normal, non-dry-run, non-skip, gated |

Subagents return parseable `step-output`. Gate contexts: transitions, entry/resume/config, G2-code, Step 8 ship, Step 9 fix-pr.

## Goals & Invariants

1. **Scope:** Steps 0–7 local; Step 8 delivery+ship; Step 9 fix-pr. No push before Step 8 ship action.
2. **Auth:** Gate required for G1+. Cancel → HS-1. Commit → G2 + menu (HS-2).
3. **Isolation:** Subagent per step. Checkpoint tag `uswf/{id}/before-step-{N}`. Branch-direct default; worktree when `plans.useWorktrees=true`.
4. **State / Memory:** Hygiene → asserts → board (fail → HS-5). `state.md` short-term; `{sharedDir}/MEMORY.md` generalizable.
5. **Mode Flags:** `dryRun` (no code/push/browser writes); `autoMode` (auto-gate 0, phase model switch via `plannerModel`/`executionModel`/`reviewerModel`/`testingModel` — Step 7 uses non-empty `testingModel`, else `executionModel`, else the active session model; `reviewerModel` is Steps 5–6 only); `enableDag` (when `false` [default], forces sequential task execution; when `true`, enables parallel DAG tasks per `dagThresholds`); `skipQualityGates` (`[GATES BYPASSED]` banner, bypass telemetry); `fullMode` (commit plan+result then create PR).
6. **Artifacts:** Never commit `{plansDir}/` in Steps 0–7. Delivery commit Step 8: plan + `step-08-{slug}.result.md` only.
7. **Pause / Revert:** Pause retains state (`status: active`). Revert uses manifest + checkpoint tag — no global hard reset.

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

## Runtime audit (`defaults.enableAuditing`)

When `config.json` → `defaults.enableAuditing` resolves to `true` (see [`config-resolution.md`](../ws-shared/config-resolution.md)), load [`ws-audit`](../ws-audit/SKILL.md) at bootstrap:
- Wrap each step's `update_state` with audit log appends.
- Run the upstream GitHub issue gate at workflow end when `has-errors` is true.

## Invocation

```
@[ws-spec-to-pr] [auto|dry-run|skip-testing|skip-tests|skip-gates|full|strict] [US {issue_id} | {name}.spec.md | "description"]
/ws-spec-to-pr [flags] [US {issue_id} | {name}.spec.md | "description"]
```

## Exit & Handoff

Complete when Step 8 (or Step 9 PR merge) outputs `status: completed`.
