---
slug: per-step-context-budgets
step: 2
status: completed
shared_understanding: confirmed
blocking_open: 0
workflowId: per-step-context-budgets-20260930T125526Z
startedAt: "2026-09-30T13:12:00Z"
endedAt: "2026-09-30T13:20:00Z"
acRefs: []
---
# Plan interview — per-step-context-budgets

Audit of `step-01-per-step-context-budgets.plan.md` (§0–8) against the spec
(`step-00`), DoR, Section 6 mandate, memory traps, and project evidence. Mode: auto
(best-judgment defaults, no user escalation). `check_memory_conflict.cjs` exited 0
(proceed; no `force_interview`).

Scenario probes applied: override below floor (builder rejects naming the key),
non-integer override (rejected), out-of-range key (rejected), non-numeric `--step`
(falls back to global), mandatory bytes over a step cap (fail-closed, no prompt
bytes), empty override map (byte-identical prompts), lite inline dispatch (same
builder, same keys), tampered builder manifest (writer refuses), missing
`budgetSource` (writer refuses). Soft-deletion/concurrency/list-sizing/rate-limit
probes: N/A — synchronous local config arithmetic with no shared mutable state.

## Interview registry

| id | class | section | gap | recommendation | status | resolution | resolutionSource | evidence |
|----|-------|---------|-----|----------------|--------|------------|------------------|----------|
| G1 | blocking | §2/§8 | §8 leaves the measure overall-pass fold-in conditional on live numbers ("revisited at implementation") — an open design decision at plan-freeze time | Compute per-skill estimates now and pin the decision | closed | Fold per-step pass into overall `pass` unconditionally: live estimates are fixed-preamble 1868 B + max skill 1910 B = 3778 B worst step vs the 32000 global cap (8.4x headroom); per-step rows cannot flip the gate on this repo | project | `measure_harness.cjs --scenario standard --json` on this tree: complete 2656 B, max stepEst 3778 B (ws-goal-fix-pr) |
| G2 | non-blocking | §2 | Plan §2/T07 flags a sibling sweep; `ws-check-harness/PHASES.md:491` prose ("Record `defaults.contextBudget` ... against ... `completeDispatchBytes`") stays true after this change but does not mention the new per-step block | Leave PHASES.md unchanged (spec does not list it; sentence stays accurate) | closed | No PHASES.md edit; the global sentence remains correct and the per-step block is additive report detail | assumed-default | `.agents/skills/ws-check-harness/PHASES.md:491` |
| G3 | non-blocking | §6 | §6 asserts non-numeric `--step` never matches an override key — needs grounding in the parse path | Confirm string-key compare and pin a fallback test | closed | `options.step` stays a raw string; lookup is `overrides[String(step)]` against `0`–`9` keys, so anything else falls back to global; AC2 fallback test covers an unmatched step | project | `build_dispatch_context.cjs:67-73` (generic string options), plan §5 AC2 |
| G4 | non-blocking | §2 | AC7 "matching floor validation" in the GUI: `json`-typed rows take no MinVal/MaxVal, so where does the floor live for GUI-saved maps? | Confirm the json branch shape and place the floor in schema + builder | closed | `Add-ConfigFieldRow` json branch is a free-text JSON box with no floor params; Test 9 mandates `json` for object nodes; floor enforced by schema `minimum: 18000` + builder fail-closed validation | project | `Edit-WorkflowSkillsConfig.ps1:844-856` (json branch), `test-powershell-config-editor.js:479-542` (Test 9) |
| G5 | non-blocking | §2 | `budgetSource` vocabulary unstated beyond "step override or global default" | Pin the literal values | closed | `budgetSource: 'step' \| 'global'` in builder + audit manifests; `null` in skip-marker manifests | model-inferred | Spec AC4 wording ("step override or the global default") |
| G6 | non-blocking | §1 | §1 claims lite needs no code — verify lite dispatches flow through the same builder with numeric steps | Confirm shared builder path | closed | Lite builds every inline prompt via `build_dispatch_context.cjs` + `--manifest` with its numeric step, so per-step keys apply with zero lite-specific code | project | `.agents/skills/ws-spec-to-pr-lite/SKILL.md:36` (prompt audit rule) |
| G7 | non-blocking | §3 | T06 integrity regen on a shared worktree risks hashing sibling-batch residue (memory trap: regenerate only when the tree holds this run's hashed files alone) | Sequence integrity last with a cleanliness gate | closed | T06 runs after all edits with `git status` review of `.agents/skills/**` + `bin/**`; prior-item residue is plan-dir only (no skill-tree residue observed at baseline: 101 dirty entries, all under `.agents/plans/` or `.ws/`) | project | `pre-existing-dirty.txt` baseline (101 entries); memory `2026-09-06-integrity-clean-tree.md` |

No AC sentence overrides; no spec sync required. Every AC mapping preserved.
