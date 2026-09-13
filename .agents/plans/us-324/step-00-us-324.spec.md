---
id: 324
slug: us-324
title: "ws-wiki: verbosity/prose-style option + richer conditional page template"
source: github
specDate: 2026-09-13
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/324"
status: completed
step: 0
workflowId: us-324
startedAt: "2026-09-13T01:45:44.779Z"
endedAt: "2026-09-13T01:45:44.779Z"
acRefs: []
---
# Specification — ws-wiki: verbosity/prose-style option + richer conditional page template

## Description

`ws-wiki` currently writes every feature page in a rigid 3-section format (`Feature Overview`, `Business Rules & Logic`, `Technical Architecture`) with terse one-fact-per-line prose. Real usage shows operators manually overriding toward richer prose and disabling terse-style rewriting to get usable domain docs.

This spec adds a first-class `verbosity` (prose-style) gate (`condensed` default, `detailed` rich) plus a richer conditional page template (`Feature`, `How it works`, `Backend`, `Frontend`, `Third-party services`) across the page-writing flows (`from-code`, `sweep`, `sync`, `update`, optionally `init`). `condensed` preserves current behavior and token cost. `detailed` writes full-sentence paragraph prose with feature-by-feature walkthroughs and explicitly disables terse rewriting for wiki bodies.

Template migration folds old content: `Business Rules & Logic` into `How it works` + `Backend`; `Technical Architecture` splits into `Backend` / `Frontend` / `Third-party services`. Each new section is written only when it makes sense for the domain (omit with no placeholder). `validate_wiki.cjs` accepts both old and new styles during migration and skips legitimately absent conditional sections.

No product-code change. Wiki skill + docs + validator + tests only. `condensed` stays default so existing consumers, token budgets, and `validate --check` in CI keep passing.

### Design Intent

Modification of an existing shipped skill (`ws-wiki` + 4 companions + validator). Prior from-code/sweep work established merge-by-default, deterministic helpers, and strict 3-section validation. This change keeps those invariants and adds a style dimension plus a superset template with a warn-only migration path. Greenfield genesis is out of scope; this is a surgical template + gate evolution.

### Prior Work Sweep

- Local sweep `ws-wiki verbosity detailed condensed prose template`: no existing `verbosity`, `condensed`, or `Third-party services` strings under `.agents/skills/ws-wiki/`; validator enforces exactly the 3 old headings; no `plans.wiki.verbosity` key in `config.json`, schema, example, or GUI editor.
- `git log --oneline -15 -- .agents/skills/ws-wiki/`: from-code genesis, sweep, verify/apply phases shipped; `SKILL.md` router + companions (`INIT`, `FROM-CODE`, `PHASE-1-SWEEP`, `PHASE-2-VERIFY`, `PHASE-3-APPLY`, `SYNC`, `UPDATE`) stable.
- `git log --oneline -10 -- test/test-wiki.js`: strict heading assertions (`missing required section`, `Business Rules & Logic`); any validator change must update tests in the same change.
- GitHub: issue 324 open, no linked PR; related closed PR #323 touched `ws-wiki` companions (unreachable-gate, portability traps apply).
- Keyword `from-code.state.json verbosity`: no existing persistence; new key must not break resume or product-commit exclusion.

## Acceptance Criteria

- AC1: `SKILL.md` documents the new page template and the `verbosity` option with condensed vs detailed meaning plus a before/after example or pointer.
- AC2: `FROM-CODE.md` Start gate asks `verbosity` (condensed Recommended default), persists choice in `{wikiDir}/from-code.state.json` (`verbosity: condensed|detailed`), honors it for all written pages, and takes `condensed` without prompting in `autoMode`.
- AC3: `PHASE-1-SWEEP.md` asks/persists/honors `verbosity` for the sweep run (checkpoint or state memory) with `condensed` default and `autoMode` takes `condensed` without prompting.
- AC4: `SYNC.md` single-page flow asks/honors `verbosity` (persisted default from `from-code.state.json` or `plans.wiki.verbosity` when present, else `condensed`) with `autoMode` taking the persisted/default without prompting.
- AC5: `UPDATE.md` honors the persisted `verbosity` for the target page unless explicitly overridden, preserving untouched sections.
- AC6: `validate_wiki.cjs` passes new-style pages with `## Feature` + `## How it works` required and `## Backend` / `## Frontend` / `## Third-party services` conditional (absent when not applicable is not an error); old 3-section pages still pass with a deprecation warning (no fail) during migration; malformed pages missing all required headings still fail with exit 1.
- AC7: `condensed` is the default everywhere (gates, `autoMode`, missing persisted value, missing config). `detailed` explicitly disables terse (`caveman`/`ws-tdah`-style) rewriting for wiki bodies.
- AC8: Verbosity choice is persisted in `{wikiDir}/from-code.state.json` and/or `plans.wiki.verbosity` in `ws-shared/config.json` so later `sync`/`update` stay consistent unless overridden; state file stays excluded from product commits.
- AC9: `sync_wiki_index.cjs` and list helpers need no heading-aware change; index/link behavior unchanged.
- AC10: Before/after example for condensed vs detailed ships in skill docs or `docs/` and is linked from `SKILL.md`.
- AC11: `test/test-wiki.js` covers new template acceptance, old-style warn-compat, conditional-section omit, and verbosity gate strings; full `npm run test` stays green.
- AC12: No host product names in skill bodies, companions, gates, or scripts; gates use portable `user-gate`; paths use `{wikiDir}` / `{sharedDir}` / `{skillsRoot}` tokens, never hardcoded consumer paths.
- AC13: `plans.wikiDir` default (`.agents/specs/wiki`) unchanged; `plans.wiki.verbosity` when introduced defaults to `condensed` in schema, example, and GUI editor.
- AC14: Existing wiki pages and `validate --check` in CI keep passing without rewrite (backward compatible migration).

## Original Issue Context

Source: github issue 324 (`ws-wiki: add verbosity/prose-style option + richer page template (feature/how-it-works/backend/frontend/third-party)`).

Human proposal summary:

- Proposal 1: `verbosity` gate (`condensed` default, `detailed` rich) via `user-gate` in `from-code`, `sweep`, `sync`, `update` (optionally `init`); `autoMode` takes `condensed`; persist in `from-code.state.json` and/or `plans.wiki.verbosity`; validator accepts both styles; docs describe each level with before/after.
- Proposal 2: richer conditional template (`Feature`, `How it works`, `Backend`, `Frontend`, `Third-party services`); fold `Business Rules & Logic` into `How it works` + `Backend` and `Technical Architecture` into `Backend`/`Frontend`/`Third-party services`; write each section only when it makes sense; depth follows `verbosity`.
- Acceptance sketch: `SKILL.md` + companions document template + verbosity; validator requires new headings with old-page migration path and skips absent conditional sections; index/list scripts unchanged unless headings affect them; before/after example.
- Out of scope: no product-code change; keep `condensed` default; consider `ws-configure-project` seeding `plans.wiki.verbosity`; later reuse for `ws-spec-write` out of scope.

## Notes

- Stack: Node 22 skill package; wiki validator is `validate_wiki.cjs` (Node, no network); companions are markdown contracts; tests are `test/test-wiki.js`.
- Memory traps folded: CATALOG 24000 B budget (keep prose terse); portable prose must not cite internal spec numbers; documented gates must be reachable; no host product names; integrity regen after final skill edits; G2 staging anchored to plans dir; no `2>nul` in bash recipes.
- Token cost: `detailed` is opt-in per run; default runs stay at current cost.
- Migration: old pages warn, not fail; no bulk rewrite in this change.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Product-code behavior change | Wiki-only change; code inspection is read-only evidence |
| Bulk rewrite of existing wiki pages to the new template | Migration is warn-compat; rewrites happen on next touch |
| Applying verbosity gate to `ws-spec-write` | Explicitly deferred by the issue to a later change |
| New packaged skill or rename of `ws-wiki` | Same skill id, same invocation names |
| Remote fetch in helpers or validator | Helpers stay local-only, no network |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Required new headings are `Feature` + `How it works`; `Backend`/`Frontend`/`Third-party services` conditional | Require Feature + How it works, conditionals optional | Matches issue rule "each section only if it makes sense"; pure backend job omits Frontend | y |
| Old 3-section pages warn but pass | Warn-only migration | Keeps `validate --check` green for existing consumers | y |
| `condensed` default everywhere including `autoMode` | `condensed` | Back-compat and token cost per issue | y |
| Persist in both `from-code.state.json` and `plans.wiki.verbosity` | State file wins per-run, config is fallback default | Survives fresh wiki dir and cross-run consistency | y |
| `INIT.md` flow unchanged except optional verbosity mention | No gate change in init | Issue marks init as optional; sweep/from-code gates own the choice | y |
| `sync_wiki_index.cjs` heading-agnostic | No change | Index tracks links/titles, not section bodies | y |
| N/A because no auth, concurrency, TTL, or external-dependency dimensions apply to markdown template + gate prose | N/A because wiki-only docs change with local validator | No runtime service surface | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only `ws-wiki` SKILL + 4 companions + validator + schema/example/GUI + docs example + tests | `git status --porcelain` shows only those paths |
| Atomic ACs | Each AC maps to one file/behavior and is testable | AC-to-file trace in plan |
| Stack invariants | Node 22, no network in helpers, portable prose, `{wikiDir}` tokens | `grep` for host names + helper network scan + `validate --check` |
| Failure modes | Malformed pages still fail; old pages warn; unknown verbosity fails closed | Validator unit runs in plan verification |
| Telemetry | Named commands for spec validate, wiki validate, sweep/from-code list, full test | Run and cite exit codes |
| Zero open blockers | Issue 324 open with full body; no missing companion | `gh issue view 324` succeeds |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring ".agents/specs/0080-us-324.spec.md"` exits 0
- `node .agents/skills/ws-wiki/scripts/validate_wiki.cjs --check` exits 0 on existing wiki
- `node .agents/skills/ws-wiki/scripts/validate_wiki.cjs --wiki-dir <tmp> --json` for new/old/omit fixtures
- `node .agents/skills/ws-wiki/scripts/list_wiki_sweep_specs.cjs --json` and `list_wiki_from_code_areas.cjs --json` exit 0
- `npm run test` (at least `test/test-wiki.js` + context-budget + integrity) exits 0
- `npm run generate-integrity && npm run verify-integrity` exits 0 after final skill edits

### Negative & Failing Test Scenarios

- New-style page missing `## How it works` fails validation (exit 1) even when `## Backend` is present.
- Old-style page missing `## Business Rules & Logic` still fails (exit 1) — warn-compat does not excuse malformed old pages.
- Unknown `verbosity` value (e.g. `verbose`) in state/config fails closed to `condensed` with a warning, never crashes the run.
- `validate_wiki.cjs` on wiki without `index.wiki.md` fails with exit 1.
- Authoring validation of this spec fails when `### Negative & Failing Test Scenarios` is empty or placeholder-only.
