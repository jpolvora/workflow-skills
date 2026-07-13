---
name: 09-goal-fix-pr
description: Convergence loop — runs fix-pr rounds until all PR threads are resolved or the max iteration cap is reached.
upstream: jpolvora/workflow-skills — this skill is a spec-to-pr pipeline dependency. Improvements must be submitted upstream to https://github.com/jpolvora/workflow-skills
version: 1.1
disable-model-invocation: true
---

# 09-goal-fix-pr

Responsible for driving PR review thread convergence to zero. It wraps the [08-fix-pr](../08-fix-pr/SKILL.md) skill in a goal loop, auto-approving cooperative gates and re-checking threads after every push until `activeThreads == 0`. Thread-count probes and fix rounds are **SCM-aware**: resolve `providers.scm`, then delegate platform I/O — do not hardcode GitHub-only (`gh pr view`) or ADO-only recipes in this skill’s happy path.

---

## Invocation

### Standalone Mode

```
/goal-fix-pr <PR-NUMBER> [dry-run] [max <n>]
```

Same SCM resolution and convergence loop as workflow mode; confirmation gates remain auto-approved by this skill.

### Workflow Mode (Step 12 of spec-to-pr)

Dispatched automatically by `spec-to-pr` when `ship-pr` triggers thread convergence monitoring. Receives `PR-NUMBER` and `max` from the orchestrator's parameters.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `<PR-NUMBER>` | Integer | (required) | Target Pull Request number. |
| `dry-run` | Flag | `false` | Simulate fixes and resolutions without committing, pushing, or calling platform resolve APIs. |
| `max <n>` | Integer | `20` | Maximum iteration ceiling before stopping and escalating. |

Before executing, restate the parsed parameters: **PR number**, **success criteria**, **mode**, **max iterations**, **dry-run active**, **`providers.scm`**.

---

## SCM resolution (mandatory)

1. Read `.agents/skills/spec-to-pr/config.json` (or `.agents/skills/spec-to-pr-lite/config.json` if running `spec-to-pr-lite`).
2. Resolve SCM host = `providers.scm` (fallback: enabled tracker / `project.repoUrl` inference — same rules as provider skills).
3. Load the matching provider skill and use its intents for thread count only; keep scoring/fix/verify in [08-fix-pr](../08-fix-pr/SKILL.md).

| `providers.scm` | Provider skill | Thread-count intent |
|-----------------|----------------|---------------------|
| `github` | [github-provider](../github-provider/SKILL.md) | `list-threads` |
| `azure-devops` | [azure-devops-provider](../azure-devops-provider/SKILL.md) | `list-threads` |

---

## Success Criterion

**Convergence:** `len(activeThreads) == 0` after a `list-threads` run on the resolved SCM provider.

- Call the provider’s `list-threads` intent with `<PR-NUMBER>` (see provider SKILL for script/CLI details).
- `activeThreads` = unresolved / active threads from that response (provider normalizes status).
- Do **not** embed `gh pr view … jq` or raw ADO collect commands here — those live only inside the provider skills.

---

## Automation Overrides (vs. fix-pr defaults)

When running inside `goal-fix-pr`, the following `fix-pr` interactive gates are **bypassed**:

| fix-pr Gate | goal-fix-pr Behavior |
|-------------|----------------------|
| Confirmation gate (plan-gate.md) | **Auto-yes** — save gate file and proceed. |
| Commit + resolve + push gate | **Auto** — execute unless `dry-run` is active. |
| **Escalate** threads | **Stop iteration** — block until user resolves ambiguity. |
| CI Auto-Fix `in_progress` | **Inform** user — do not auto-block. |

---

## Core Loop

Track progress across iterations:

```
Goal: fix-pr PR-<N> until convergence (scm = providers.scm)
Success: activeThreads == 0 via scm list-threads
Iteration: <n>/<max>
- [ ] branch sync (PR head)
- [ ] scm list-threads → count activeThreads
- [ ] 08-fix-pr round (if > 0 threads; scm list/resolve inside fix-pr)
- [ ] verify build/tests + code-review auto-check
- [ ] commit + resolve + push (if code changed; skip if dry-run)
- [ ] wait 5min + scm list-threads re-collect
```

### Phase 1 — Baseline (Iteration 1)
- Resolve `providers.scm` and call provider `list-threads` for `<PR-NUMBER>`.
- If `activeThreads == 0` on first collect → final report and stop (already converged).

### Phase 2 — Act (08-fix-pr Round)
- Dispatch [08-fix-pr](../08-fix-pr/SKILL.md) for the same `<PR-NUMBER>` with automation overrides (gates auto-yes). Fix-pr owns scoring FSM and SCM list/resolve via `providers.scm`; this skill does not re-implement platform APIs.
- Commit: `fix(#<PR-NUMBER>): fix issues from review threads [<threadId>, ...]`.
- Resolve threads through the SCM provider (via fix-pr).
- Push: `git push origin HEAD` (skip if `dry-run`).

### Phase 3 — Verify (Mandatory after each round)

| Check | Required Evidence |
|-------|------------------|
| Build/Tests | Output from `config.json.verification` commands |
| Auto-review | **"No feedback"** from `06-code-review` on current diff |
| Push | Commit hash + push confirmation (or dry-run log) |
| Resolved threads | SCM provider `resolve-thread` exited with code 0 (via fix-pr) |

3 consecutive failures on the same check → stop and escalate.

### Phase 4 — Post-push Heartbeat (5 minutes)
- After each push round, wait 300 seconds for new CI/reviewer feedback to register.
- Sentinel: `AGENT_GOAL_WAKE_fixpr_<PR-NUMBER>`.
- Do not stack multiple sleepers — exactly one active at a time.

### Phase 5 — Re-collect
- On wake: re-run SCM provider `list-threads` and re-count `activeThreads`.
- `== 0` → **done**.
- `> 0` and `n < max` → start iteration `n+1` (another 08-fix-pr round).
- `n >= max` → stop, report remaining threads, request larger `max`.

---

## Stop Conditions

| Condition | Action |
|-----------|--------|
| `activeThreads == 0` | Final report + kill heartbeat sleeper |
| User requests stop | Kill sleeper, summarize progress so far |
| Escalate thread hit | Stop, list blocked thread IDs |
| `n >= max` | Stop, list active threads |
| SCM `list-threads` fails | Stop — do not improvise platform API calls |

---

## Final Report (Mandatory)

At the end of every run (whether converged or stopped), output:
1. Number of iterations executed and the stop condition.
2. Threads handled per round (fixed / resolved / escalated).
3. Links to generated round reports (`.cursor/codereviews/PR-<N>-round-*.md`).
4. Commit hashes and push confirmation.
5. Final `activeThreads` count with evidence from the last SCM `list-threads` collect (`providers.scm` + provider skill).
6. PR URL.
