# Session-model gates — design

**Date:** 2026-07-17  
**Status:** approved design (pending implementation plan)  
**Approach:** A — Session-model contract  
**Scope:** `spec-to-pr` + `spec-to-pr-lite` dual-mode gate UX; shared `gates.md` / `setup.md` / state hygiene / light FAQ+README

## Problem

Transition gates offer in-menu model switching (`More… → Switch model`) plus `--model` / `--model-chain`. That duplicates Cursor’s own model picker, invents model-name menus agents cannot reliably execute, and confuses pause/resume.

## Goals

1. **Auto-read** the model actually running the session; record it as `currentModel`.
2. **Switch path:** Pause → change model in Cursor UI → Resume workflow.
3. **Clarify** that path on every transition (and on resume).
4. **Per-step models** allowed: each resume re-reads the session model for the next step.
5. **Drop** `--model`, `--model-chain`, and all in-gate Switch model options.

## Non-goals

- AskQuestion FORCE/probe cleanup (separate plan).
- New companion skill file for model policy.
- Changing Task/subagent isolation or FSM step numbers.
- Programmatic Cursor API to force-switch models (not available; user switches in UI).

## Runtime contract

On **bootstrap**, **every transition gate**, and **every resume**:

1. Resolve `currentModel` from the **executing session model** (agent identity / runtime context). Do not AskQuestion for a model name list.
2. Write `currentModel` into workflow state.
3. Log:
   - `model | step {N} | {name} | ISO` when recording the model for a step
   - `model-change | step {N} | {old} → {new} | ISO` when resume/transition detects a change vs prior `currentModel`
4. Append per-step model history (Progress Board / Step model log) from these recorded values.
5. **Remove** `modelChain` from active contract (omit from new state; ignore if present in old state files).

Auto mode: same session-model read; Advance uses current session model; no CLI model map.

## Gate UX

### Banner (every transition, before options)

```text
Current model: {currentModel}
To use a different model for the next step: Pause → switch model in Cursor → resume workflow.
```

### Primary options

1. **Advance to Step N+1** (Recommended)
2. **More options…**

### More options… (no Switch model)

- Repeat current step
- Go back to earlier step (full FSM only; lite: omit / Pause instead)
- **Pause workflow** — keeps artifacts; after pause, user switches model in Cursor, then re-invokes orch to resume; orch re-reads session model
- Cancel without revert / Cancel and revert

### Phase soft tips (informational only)

When Advance crosses **F1→F2** (after Step 3, before Step 5) or **F3→F4** (after Step 7, before Step 9), add one line under the banner:

- F1→F2: `Hint: implementation ahead — consider a Coder-class model (Pause → switch → Resume).`
- F3→F4: `Hint: review ahead — consider a Reviewer/Thinking-class model (Pause → switch → Resume).`

Log: `model-hint | F1→F2|F3→F4 | current={currentModel} | ISO`.  
No picker; no separate 4†/8† menus; tags `before-step-5` / `before-step-9` may remain for telemetry only.

### Delivery / ship gates

Same banner line is optional but recommended when those gates pause the flow; Pause copy must still mention model switch path if Pause is an option.

## State & flags

| Before | After |
|--------|-------|
| `--model {name}` | Removed |
| `--model-chain step:model,...` | Removed |
| `state.modelChain` | Deprecated / omit; ignore if leftover |
| `state.currentModel` | Always session-derived |
| Per-step model log | Unchanged purpose; values from session at dispatch/hygiene |

Init banner in `setup.md`: drop `modelChain` row; `currentModel` = session model at bootstrap (and refreshed on resume).

`update_state.py --model` remains the hygiene **recorder** of the session model name (not a user override flag).

## File touch list

| File | Change |
|------|--------|
| `.agents/skills/shared/gates.md` | Banner + Pause→switch→resume; remove Switch model; soft-tip note |
| `.agents/skills/shared/setup.md` | Remove model flag parse; session `currentModel`; drop `modelChain` from init table |
| `.agents/skills/spec-to-pr/SKILL.md` | Strip flags, Switch triggers, model-chain rules; soft tips; point to `gates.md` |
| `.agents/skills/spec-to-pr-lite/SKILL.md` | Same UX alignment |
| `.agents/skills/spec-to-pr/protocols/state-hygiene.md` | Drop modelChain apply; refresh `currentModel` from session + change log |
| `.agents/skills/spec-to-pr/protocols/progress-board.md` | Keep Current model + step models from session recordings |
| `.agents/skills/spec-to-pr/README.md` | Light: model switch FAQ path; remove flag examples |
| `.agents/skills/spec-to-pr/docs/faq.md` | “How do I switch models?” → Pause → Cursor → Resume |
| `.agents/skills/spec-to-pr/DIAGRAM.md` | Only if it still documents Switch model / model-chain as primary UX |
| Root / packaged `AGENTS.md` | Only if they document `--model-chain` as required |

## Success criteria

- Grep clean (skill/docs bodies) for user-facing: `Switch model and advance`, `--model-chain`, `--model {`, `modelChain:` as active instructions (allow historical CHANGELOG).
- Every normal-mode transition documents Pause → Cursor → Resume for model change.
- Resume after model switch updates `currentModel` and logs `model-change` when different.
- Auto mode advances without requiring any model CLI flags.
- Soft tips appear only at F1→F2 and F3→F4 (full orch); lite has no phase soft tips unless an equivalent phase boundary exists (default: banner only).

## Risks

| Risk | Mitigation |
|------|------------|
| Agent cannot read a formal “model id” API | Use session identity string already available to the agent; if unknown, record `unknown` and still show Pause path |
| Users expect in-chat model picker | Banner + Pause copy every gate; FAQ update |
| Old invocations with `--model-chain` | Document as removed; optional one-line “ignored” only if we later need compat (explicitly out of scope for Approach A) |

## Approval record

- Approach: **A** (session-model contract)
- Flags: **drop both** `--model` and `--model-chain`
- Phase hints: **soft tip only**
- Gate UX + file list: user approved 2026-07-17
