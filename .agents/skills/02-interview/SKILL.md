---
name: interview
description: Audits and interrogates an implementation plan until shared understanding — acceptance criteria, code, MEMORY.md, and project rules; closes gaps with evidence, escalating one question at a time. Stack-agnostic.
version: 1.5
disable-model-invocation: true
---

# interview (plan interrogation)

Audits and **interrogates** gaps in an implementation plan **before** it becomes execution tasks — "grill-me" philosophy: interview the plan branch by branch until **shared understanding** and exact, testable success criteria are reached.

This skill is **standalone** (can be called directly by the user on any `*.plan.md`) and is also invoked by `us-workflow` (Step 2) via subagent. The two invocation modes are marked below.

## Grilling Conduct Protocol (mandatory)

Canonical refinement conduct — adapted from [grilling (Matt Pocock)](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md):

1. **Interview without stopping** until shared understanding — every ambiguity, contradiction, and edge case in the plan must be resolved or explicitly assumed (`assumed-default`).
2. **Walk the design tree** — order gaps by dependency (foundational decisions first: scope → entities → permissions → flows → edge cases). Resolve one branch before opening the next.
3. **One question per round** — never stack multiple questions in a single escalation; wait for the answer before the next.
4. **Recommendation in every question** — the recommended option comes **first** in `AskQuestion` / `needs_user`.
5. **Codebase before escalating** — if the answer exists in code, `docs/`, `MEMORY.md`, or `*.spec.md`, **explore and close the gap** in 2b Resolve; do not ask the user.
6. **Do not execute the plan** — this skill **does not implement code** nor authorize Step 3+; it only edits `*.plan.md`. The output requires explicit confirmation of shared understanding (state **2e**, below).

**Prohibited:** advancing to DAG/implementation with `blocking`+`open` gaps without escalation or `assumed-default`; batching questions; inventing criteria outside the plan/AC/code.

## Invocation modes

| Mode | How it is called | Behavior on Escalation (2c) |
|---|---|---|
| **Standalone** | `@[refine] path/to/plan.md` | Asks the user directly via `AskQuestion` |
| **Inside workflow** | Subagent dispatch by `us-workflow` Step 2, prompt containing explicit instruction to return `needs_user` | Returns `needs_user` in `step-output`; it is the orchestrator who asks the user |

Detect the mode from the received prompt: if it contains an instruction like "do not use AskQuestion, return needs_user", it is in workflow mode.

## Input

- **Mandatory:** path to a `*.plan.md` (output format of `write-plan`).
- **Recommended:** path to a corresponding `*.spec.md` (same `{slug}` or `{us-dir}` folder) — canonical source of ACs and description. If not provided, derive from `state.md` → `## Artifacts.specSnapshot` (workflow mode) or search for `{slug}.spec.md` in the same folder as the plan.
- If the plan is not provided, ask.

## State machine (FSM)

**States:** Audit → Resolve → Escalate → 2e: Shared Understanding.

### 2a. Audit (exhaustive scan + design tree)

Walk **all** sections of the plan (0–8) and **all** paths of each AC — happy path, validation, auth/tenant denial, empty/null, duplicates, soft-delete, concurrency, rollback.

**Scenario probes** (for each AC): invent 1–2 concrete edge-case scenarios and stress-test the plan against them. Example probes:
- *"What happens if the user submits the form twice in rapid succession?"*
- *"What if the referenced entity was soft-deleted between page load and form submit?"*
- *"What does the list display when there are 5000 items — pagination, search, filter behavior?"*

Build a `gap_registry` (`id | class | section | gap | recommendation | status | dependsOn`).

**Design tree order** (use `dependsOn` to prioritize escalation):

| Branch | Example gaps |
|------|------------------|
| Scope / AC | out of scope, contradictory AC, closed/removed issue |
| Domain / entities | aggregates, states, invariants |
| Authorization / tenant | non-existent permissions, isolation |
| Behavior / API / UI | HTTP, errors, i18n, screen states |
| Edge cases | limits, null, duplicate, concurrency (probed via scenarios above) |

Classify each gap:

| Class | Criterion | Action |
|---|---|---|
| **blocking** | Prevents objective testing OR changes scope/AC | Escalate (2c) OR explicit `assumed-default` |
| **non-blocking** | Style, naming, optimization | `assumed-default` + log, no escalation |

### 2b. Resolve

Close gaps **first** with evidence from code, `docs/`, `CONTEXT.md`, `ADRs/`, `MEMORY.md` (repo root), or the feature's `*.spec.md`.

**Grilling rule:** if the question can be answered by exploring the repository, **explore** (grep, read, search) and log evidence in `resolution` — **do not** escalate. Only escalate what has no local evidence after diligent exploration.

Update `*.plan.md` **in-place** (sections §2–§5 as impacted).

### 2c. Escalate

- **Exactly one** question per round — highest priority in design tree.
- Via `AskQuestion` (standalone) or `needs_user` (workflow): **recommended option first**, always including **"End interview and advance"**.
- **Max 3 rounds** of escalation — on the 4th, only "respond" or "end" remain.
- When ending early: apply recommended default to all remaining `blocking` gaps, log each as `assumed-default`.

### 2d. Exit (technical criterion)

- No `blocking`+`open` gaps in `gap_registry`.
- §8 of plan empty; no `TBD` in §0–7.
- AC matrix complete.
- Early termination: every remaining `open` gap logged as `assumed-default`.

When 2d satisfied, return `status: success` with `shared_understanding: pending`.

### 2e. Shared Understanding Gate

> *"Do not enact the plan until shared understanding is confirmed."*

| Mode | Behavior |
|------|---------------|
| **Standalone** | `AskQuestion`: **(1) I confirm shared understanding** (recommended) · **(2) Continue — still have doubts** |
| **Workflow** | Return `status: success` + `shared_understanding: pending`; orchestrator presents gate |

**Prohibited** marking Step 2 complete without `shared_understanding: confirmed` (except `autoMode`).

## Output

- Plan updated in-place (`*.plan.md`).
- Section `## Interview registry` (table `id | class | section | gap | status | resolution`) appended to the end of the plan.
- When standalone: chat summary of what was closed + what was left as `assumed-default`.

## `step-output` format (only when dispatched as a workflow subagent)

```yaml
status: success | needs_user
refine:
  registry: [{id, class, section, gap, status, resolution, dependsOn?}]
  round: number
  blocking_open: number
  shared_understanding: pending | confirmed   # confirmed only after gate 2e
needs_user:
  question: string              # ONE question — never an array
  options: [{id, label}]        # recommended first; include "End refinement and advance"
  context: string
  design_branch: string         # design tree branch (e.g.: "Authorization / tenant")
```

## Conduct rules

- Follow the **Grilling Conduct Protocol** above — it is mandatory, not optional.
- **Do not implement code.** This skill only reads, questions, and edits `*.plan.md`.
- **Do not invent new criteria** outside what the plan/AC/code/`MEMORY.md` already support — when in doubt, it is a gap to escalate, not an assumption.
- **Mandatory context references:** `AGENTS.md` (root), `config.json.rules` + `config.json.domain.architectureSpec`, `spec-format` skill, `MEMORY.md` (root).

## Examples of blocking gaps (retrospective)

- GitHub issue in `closed` state while the branch remains active.
- Rule described one way in the issue but divergent in the plan (e.g.: value secrecy as a field vs. column).
- RBAC permission cited in the plan that does not exist in the repository (e.g.: legacy role/level not surfaced in `auth/me`).

## Triggers

- `@[refine] path/to/plan.md`
- Subagent dispatch from `us-workflow` (Step 2) — see [`../us-workflow/SKILL.md`](../us-workflow/SKILL.md), section **Step Instructions → Step 2**.
