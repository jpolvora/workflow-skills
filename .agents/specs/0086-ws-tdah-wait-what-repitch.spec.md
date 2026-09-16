---
id: null
slug: ws-tdah-wait-what-repitch
title: "ws-tdah wait-what grounded re-pitch"
source: local
specDate: 2026-09-16
status: completed
---

# Specification — ws-tdah wait-what grounded re-pitch

## Description

`ws-tdah` enforces action-first reply shape with aggressive compression. Operators report two failure modes: explanations dense with invented abstractions and stacked acronyms that skip the premise, followed by over-correction into cryptic telegram fragments that drop causality. A bare length complaint does not repair comprehension.

This spec adds a `wait-what` re-pitch flow to `ws-tdah`. The trigger covers explicit invoke forms and natural comprehension-failure signals. The flow scopes the missing premise, rewrites in ASD-STE100 Simplified Technical English with project ubiquitous language, and keeps action-first shape with one concrete next step. Companion directives for grounded nouns, premise-first ordering, and anti-caveman clipping are added to the every-turn list. `EXAMPLES.md` documents the reject triple for calibration.

## Acceptance Criteria

- AC1: Invocation names include re-pitch aliases alongside existing `ws-tdah` aliases.
- AC2: Re-pitch section defines trigger phrases for comprehension failure signals.
- AC3: Re-pitch procedure requires scoping the unstated premise before rewriting.
- AC4: Re-pitch procedure requires ASD-STE100 short direct sentences in active voice.
- AC5: Re-pitch procedure requires project nouns from stack docs or codebase symbols.
- AC6: Every-turn directives forbid invented abstractions and stacked acronyms.
- AC7: Every-turn directives forbid caveman clipping that drops required causality.
- AC8: Companion examples document the reject triple for re-pitch calibration.
- AC9: Opt-out table documents re-pitch triggers while keeping the skill active.

## Notes

### Design Intent

Compression without grounding produces slop in both directions: pompous abstraction or blunt fragments. The observed harm is lost causality after a confused reply. Product intent: treat wait as a comprehension signal, not a length signal; add the missing premise in plain technical English; cut noise while preserving action-first shape, state line, numbered steps, and next step.

- Re-pitch keeps the skill active; it never disables verbosity control.
- Auto-Clarity and Re-pitch share full-sentence allowance; normal turns stay terse.
- Language of skill bodies remains en-us.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing action-first shape or numbered-step contract | Re-pitch reuses the shape; it does not replace it |
| New host UI or structured-choice widget | Trigger phrases work through existing user-gate and text |
| Automatic comprehension detection | Explicit user signal only; no sentiment inference |
| Rewriting consumer prompts or transcripts | Session-local repair only |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Trigger vocabulary | Cover slash form, hyphen form, spaced form, re-pitch variants, and lost-me phrasing | Operators phrase the signal differently across hosts | y |
| Plain-language standard | ASD-STE100 short direct sentences with one idea per sentence | Shared testable style without inventing a new dialect | y |
| Input validation / rate limits / data lifecycle / concurrency | N/A because this is a static reply-shape contract, not a networked runtime | Only prose and example outcomes are observable | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only `ws-tdah` SKILL body and EXAMPLES companion | Diff vs this spec ACs |
| Atomic criteria | AC1–AC9 each map to a named heading or alias row | Reviewer checklist |
| Failure modes | Trigger missing; premise step skipped; caveman fragment accepted as valid | AC2, AC3, AC7 |
| Observation telemetry | Alias grep; heading presence; example triple content | Validation & Observation Notes |
| Open blockers | None | N/A |
| Stack invariants | Markdown-only edits; no new runtime code; no shell recipe changes; no path-token violation | Code review plus harness checks |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Grep for `wait-what` returns SKILL invocation names, re-pitch section, and opt-out row.
- Grep for `ASD-STE100` returns the re-pitch procedure step.
- `EXAMPLES.md` contains before reject, caveman reject, and after grounded re-pitch for the same context.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` passes on this spec.

### Negative & Failing Test Scenarios

- NS1: Re-pitch deletes words into telegram fragments without stating the missing premise → **fail** AC3 and AC7.
- NS2: Re-pitch introduces a new invented abstraction instead of a codebase symbol → **fail** AC5 and AC6.
- NS3: Trigger phrase `you lost me` does not enter the re-pitch flow → **fail** AC2.
- NS4: Example companion shows only before and after without the caveman reject → **fail** AC8.
- NS5: Re-pitch deactivates the skill or requires re-enable → **fail** AC9.
