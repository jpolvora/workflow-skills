---
slug: per-step-context-budgets
title: Per-step context budgets in dispatch contracts
status: completed
step: 2
workflowId: per-step-context-budgets-20260930T125526Z
startedAt: "2026-09-30T13:12:00Z"
endedAt: "2026-09-30T13:20:00Z"
acRefs: []
refines: step-01-per-step-context-budgets.plan.md
interview: step-02-per-step-context-budgets.plan-interview.md
---
## 0. Summary & Business Rules

Add `defaults.stepContextBudgets` (step-number to byte-budget map, mirroring `stepModels`) so each dispatch resolves its own effective cap: step override when present, else global `defaults.contextBudget`. Same 18000-byte floor on every value; the dispatch manifest records effective bytes plus source (`step` or `global`); mandatory-over-budget still fails closed before any prompt is emitted; the harness measurement report audits each step against its own cap; schema, example, and desktop GUI editor expose the map with matching validation.

Business rules: default 32000 and floor 18000 unchanged; no overrides means byte-identical prompt output to today; lite reuses the same keys by step number; no per-role keys, no runtime tuning.

## 1. Definition of Ready & Scope

Resolved assumptions (from spec): override shape `defaults.stepContextBudgets` keyed by step number; resolution order step-override-else-global; 18000 floor on every value; manifest provenance bytes-plus-source; GUI parity with floor validation.

Measurable ACs: AC1 schema map; AC2 per-dispatch resolution; AC3 floor + rejection naming the key; AC4 manifest bytes + source; AC5 mandatory-over-budget fail-closed; AC6 per-step measurement audit; AC7 schema + example + GUI parity; AC8 byte-identical default behavior.

Out of scope: per-role/per-model scaling; dynamic mid-run adjustment; changing the global default or floor; lite-specific semantics; `ws-configure-project` interview/auto-configure seeding (follows the `stepModels` precedent: documented in INTERVIEW.md, never auto-seeded — and this change does not touch INTERVIEW.md or auto_configure.cjs at all).

## 2. Technical Design & Architecture

Stack: Node 22 skill package (`node-skills-package`); layers touched: `skills-sot` (`.agents/skills`) and `tests` (`test/`). No DB, no frontend, no migrations.

Edits:

1. `.agents/skills/ws-shared/runtime/config.schema.json` — add `defaults.stepContextBudgets`: `type object`, `additionalProperties { type integer, minimum 18000 }`, description mirroring the `stepModels` convention (keys `"0"`–`"9"`; lite reuses `0`–`5`).
2. `.agents/skills/ws-shared/templates/config.json.example` — add `"stepContextBudgets": {}` plus `_comment_stepContextBudgets` (empty map preserves byte-identical global behavior for fresh installs).
3. `.agents/skills/ws-spec-to-pr/scripts/build_dispatch_context.cjs` — resolve the effective budget: validate every map entry (integer, >= 18000, key in `0`–`9`; reject naming `defaults.stepContextBudgets["<key>"]`); effective = override for `--step` when present else global (`options.step` stays a raw string, so a non-numeric step can never match a `0`–`9` key and falls back to global); fail closed when mandatory bytes exceed the effective cap; manifest gains `budgetSource: 'step' | 'global'` alongside `budgetBytes`. Prompt output unchanged when no override applies.
4. `.agents/skills/ws-spec-to-pr/scripts/write_dispatch_prompt_audit.cjs` — require `budgetSource` in builder manifests (missing field fails validation); pass it through to the audit manifest; skip-marker manifest carries `budgetSource: null` for shape parity.
5. `.agents/skills/ws-check-harness/scripts/measure_harness.cjs` — per-step audit: resolve global + overrides from config; map each standard target skill to its step (ws-spec-write 0, ws-plan-write 1, ws-plan-interview 2, ws-implement-tasks 4, ws-plan-verify 5, ws-code-review 6, ws-testing 7, ws-ship-pr 8, ws-goal-fix-pr 9); per-step dispatch estimate = fixed preamble + that skill's target bytes + even indexed-bytes share; report `stepBudgets` block (global, overrides, per-step effective/source/pass) and fold per-step pass into overall `pass` unconditionally (G1: worst live step estimate is 3778 B vs the 32000 cap — 8.4x headroom, cannot flip the gate). Existing fields and the lite scenario unchanged.
6. `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` — one dispatch-contract line under `### Step Dispatch & Isolation` naming the resolution order and manifest fields. Hard constraint: file is at 20896/20992 B (96 B headroom) and the four-file combined cap is 64735/67072 B — the addition must fit by compressing adjacent prose in the same edit; verify with `test-context-budget.js`.
7. `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` — add `-Type 'json'` row for `defaults.stepContextBudgets` beside the `contextBudget` row (object schema nodes must use `json` per Test 9); pure ASCII; floor validation stays in schema + builder.
8. `test/test-step-context-budgets.js` (new) + register in `test/test-suites.json` — override/fallback/floor-rejection/manifest-source/fail-closed/byte-identical/measure-audit/schema-example-GUI assertions.
9. `test/test-dispatch-prompt-audit.js` — extend the `builderManifest()` helper with `budgetSource: 'global'` (writer now requires the key) and add `budgetSource` to the AC2 field list.
10. `test/test-powershell-config-editor.js` — assert the `stepContextBudgets` row exists with `-Type 'json'` (mirrors the stepRunners/runners asserts).
11. `bin/skill-integrity.json` (+ packaged mirror) — regenerate after hashed content changes; regenerate only when the tree holds this run's hashed files alone (shared-worktree rule).

Invariant checks (`config.json.invariants`): `commitPlanFilesOnlyAtStep8` respected (no `{plansDir}` staging before Step 8); no Python (Node `.cjs` only); no legacy path aliases.

## 3. Step-by-Step Plan

- T00 — Config surface: schema entry, example entry + comment, GUI `json` row. Files: `config.schema.json`, `config.json.example`, `Edit-WorkflowSkillsConfig.ps1`. Check: `test-powershell-config-editor.js` green; example parses and validates against the schema shape.
- T01 — Builder resolution + manifest: override map validation (integer, floor, `0`–`9` keys, offending key named), effective resolution by `--step`, `budgetSource` manifest field, fail-closed message names the effective cap. File: `build_dispatch_context.cjs`. Check: unit assertions via the new test; prompt bytes unchanged without overrides.
- T02 — Audit writer contract: require + pass through `budgetSource`, skip-marker parity. File: `write_dispatch_prompt_audit.cjs`. Check: existing audit test updated and green.
- T03 — Measurement audit: per-step effective caps, per-step dispatch estimates, `stepBudgets` report block, overall pass folds per-step results. File: `measure_harness.cjs`. Check: report JSON carries per-step rows; `measure_harness` still exits 0 on this repo.
- T04 — Contract prose: PROTOCOLS.md line within byte caps. File: `PROTOCOLS.md`. Check: `test-context-budget.js` green (single-file and combined caps).
- T05 — Regression tests + suite registration. Files: `test/test-step-context-budgets.js`, `test/test-suites.json`, `test/test-dispatch-prompt-audit.js`, `test/test-powershell-config-editor.js`. Check: full `npm run test` green.
- T06 — Integrity + release hygiene: `npm run generate-integrity` + `verify-integrity` from a clean skill tree, version bump + FEATURES/README/site sync at ship per the upstream checklist.
- T07 — Sibling sweep: repo-wide search for `budgetBytes`/`contextBudget` consumers missed above (e.g. docs, PHASES.md prose); record byte-locked or out-of-scope hits with path + reason.

Dependency order: T00 → T01 → T02 → T05; T03 and T04 parallel-safe after T01; T06 after all edits; T07 before verify.

## 4. Permissions, Tenancy & i18n

N/A. Local config arithmetic with no caller identity, no tenant data, no user-facing strings, no locale handling. No secrets or tokens touched (budget values are plain integers).

## 5. Test Coverage

New `test/test-step-context-budgets.js` maps:

- AC1: schema `defaults.stepContextBudgets` is object with integer/minimum-18000 additionalProperties; example carries the key with an object value. Method names: `AC1: schema ...`, `AC1: example ...`.
- AC2: builder with `{"4": 20000}` + `--step 4` yields `budgetBytes 20000`; `--step 5` yields global. `AC2: step override wins`, `AC2: fallback to global`.
- AC3: `{"4": 17999}` and `{"4": "big"}` fail naming `defaults.stepContextBudgets["4"]`; `{"10": 20000}` fails naming the key. `AC3: below-floor rejected`, `AC3: non-integer rejected`, `AC3: out-of-range key rejected`.
- AC4: manifest carries `budgetBytes` + `budgetSource step|global` in both cases. `AC4: manifest records ...`.
- AC5: mandatory content (oversized `--state` compact section) over a 20000 step cap fails with no `--output` file written. `AC5: over-budget fails closed`.
- AC6: `measure_harness --scenario standard --json` carries a per-step block with effective caps and sources; per-step rows pass on this repo. `AC6: per-step audit ...`.
- AC7: GUI row for `stepContextBudgets` with `-Type 'json'`; existing `test-powershell-config-editor.js` extended + green. `AC7: ...`.
- AC8: prompt bytes with `{}` map equal bytes with the key absent (and equal pre-change output shape: same stdout for identical inputs). `AC8: byte-identical ...`.
- Negative scenarios: manifest without `budgetSource` fails the audit writer (`NS: writer rejects ...`); below-floor override names the key; byte-identical check above.

Existing suites: `test-context-budget.js` (caps), `test-dispatch-prompt-audit.js` (updated helper), `test-powershell-config-editor.js` (extended), full `npm run test`.

## 6. Stack & Security Invariants Verification Plan

Stack rule packs under `{skillsRoot}/ws-shared/runtime/stacks/` do not apply to this Node 22 skill-package stack (per spec Notes). Touched framework boundaries:

- Config validation boundary: schema `minimum` + builder fail-closed validation both enforce the floor; defense in depth (schema for editors, builder for runners). Verify: AC3 tests hit the builder directly; schema shape test pins `minimum: 18000`.
- CLI parsing boundary: `--step` flows from orch dispatch into budget resolution; non-numeric `--step` must not match an override key (string-key compare only). Verify: AC2 fallback test with absent/unmatched step.
- Audit integrity boundary: writer refuses manifests missing `budgetSource` so provenance can never silently drop. Verify: negative-scenario test.
- No auth/async/DTO/subscription boundaries touched: pure synchronous local file + arithmetic code paths; no new I/O beyond existing `--output`/`--manifest` writes.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot + tests only).
- [ ] Config schema, example, and GUI editor in sync (Test 8/9/9b green).
- [ ] Byte caps respected (PROTOCOLS single-file + combined four-file).
- [ ] Stack & security invariants verified (floor in schema + builder, audit provenance).
- [ ] i18n keys declared (N/A — no user strings).
- [ ] Test cases cover all ACs (AC1–AC8 + negatives in the new suite).
- [ ] Integrity regenerated from a clean tree and verified.

## 8. Open Questions

- None. G1 closed at interview with live numbers: per-step pass folds into overall `pass` unconditionally (worst step estimate 3778 B vs 32000 cap). G2–G7 closed (see `step-02-per-step-context-budgets.plan-interview.md`): PHASES.md untouched, `--step` fallback grounded, GUI floor in schema + builder, `budgetSource 'step'|'global'` pinned, lite needs no code, integrity sequenced after a skill-tree cleanliness gate.
