# Refined Spec — Improve agentic code reviewers prompt

**Parent spec**: `.agents/plans/improve-agentic-reviewers-prompt/step-00-improve-agentic-reviewers-prompt.spec.md`
**Date**: 2026-09-27

## Gaps Identified

1. **Path discrepancy**: AC7 and Notes reference `.agents/specs/0139-improve-agentic-reviewers-prompt.spec.md` but the canonical spec path is `.agents/plans/improve-agentic-reviewers-prompt/step-00-improve-agentic-reviewers-prompt.spec.md` (per `plans.dir` + `enforceSpecPrefixOrdering: true`).
2. **Section-level keep/merge/drop not explicit**: AC2 says "removing low-value repetition" but doesn't name which sections merge. Add a concrete table.
3. **Upstream-vs-local decision framework underspecified**: AC4 asks for analysis but doesn't define the decision rule. Add: "Keep-local default — move upstream only when the rule is stack-agnostic AND appears in generic `agentic-code-reviewers` templates."
4. **Custom-stack coupling enforcement mechanism unspecified**: AC3 says "CI check or workflow comment" but doesn't pick one. Decision: workflow comment (self-documenting, zero new infra).

## Refinements

### R1: Path corrections (AC6, AC7, Notes)

All references to the spec path use the canonical form:
```
.agents/plans/improve-agentic-reviewers-prompt/step-00-improve-agentic-reviewers-prompt.spec.md
```
Not `.agents/specs/0139-…`.

### R2: Section-level keep/merge/drop table (AC2)

| Current section | Action | Rationale |
|----------------|--------|-----------|
| Header + intro | Keep, tighten | One sentence of stack context is enough |
| §1 Skill structure | Merge with Skill folder naming + Invocation names | All three govern folder-id = frontmatter-name |
| §1 Progressive disclosure | Merge into Routing & paths | Both about hub references |
| §1 Portability | Keep | Core invariant |
| §1 Language | Keep | Core invariant |
| §1 Shared vs promoted skills | **Drop** | Covered by inventory drift + harness gates |
| §1 No silent managed-skill refactors | Keep | Critical for update-overwrites-local contract |
| §1 STEP-DISPATCH dual-mode | Keep | Repo-specific FSM invariant |
| §1 Root seeds | Keep | Installer create-if-missing contract |
| §1 Inventory drift | Merge with check-harness awareness | Both about updating hub/site lists |
| §1 Dependency graph | Keep | Critical: missing edges = broken dispatch |
| §1 Harness gates | Keep | Core invariant |
| §1 check-harness awareness | **Merge into Inventory drift** | Redundant |
| §1 Skill folder naming | **Merge into Skill structure** | Same rule |
| §1 Invocation names | **Merge into Skill structure** | Same rule |
| §2 Installed forms | Keep | `@latest` ban is real |
| §2 Update contract | Keep | config.json preservation |
| §2 Non-interactive install | Keep | CI/agent safety |
| §2 Installer tests | Keep | Test coverage gate |
| §2 ESM / Node | **Drop** | Generic JS advice, low signal |
| §3 Workflows | Keep | Includes Custom-prompt coupling |
| §3 Shell / PowerShell | Keep | Add "no Python runtime" note |
| §3 JSON schemas | Keep | Config alignment |
| §4 High signal list | **Merge into §1** as compact preamble | Duplicates §1 bullets |
| §4 Low signal list | Keep, trim to 2 items | Remove Python ordering item |
| §5 Score threshold | Keep verbatim | Enforceable contract |

**Result**: 5 sections → 4 sections, 57 lines → ~50 lines (denser, less redundant).

### R3: Upstream-vs-local decision framework (AC4)

**Decision rule**: Keep-local by default. Move upstream only when:
1. The rule is stack-agnostic (applies to any repo using `agentic-code-reviewers`).
2. The rule does not reference `ws-*` skill IDs, `bin/skill-dependencies.json`, or other repo-specific artifacts.
3. The rule would benefit a generic reviewer, not just this harness.

**Analysis result**: All current prompt content fails criterion 2 (references `ws-*`, `skill-dependencies.json`, `bin/build-site.js`, etc.). **Decision: keep everything repo-local.** No upstream PR needed.

### R4: Custom-stack coupling enforcement (AC3)

**Decision**: Add a YAML comment in the workflow making the coupling explicit. No new CI check or script.

**Rationale**: The workflow is the single invocation point. A comment is self-documenting, has zero maintenance cost, and is visible to anyone editing the workflow. A CI check would require a new script + workflow step — overkill for a two-line coupling.

### R5: Validation command clarification (AC7)

- Primary: `npm run test` (harness integrity).
- Secondary: `node .agents/skills/ws-check-harness/scripts/check_harness_links.cjs` (path references).
- Tertiary: `npm run review:dry` (live proof, credentials permitting).
- Fallback: Manual `grep` for path references + `wc -l` for line count.

## Impact on Plan

The plan at `step-01-improve-agentic-reviewers-prompt.plan.md` already reflects R1–R5. No plan changes needed.

## Interview Fixes Applied (2026-09-27)

### Fix 1: §3 bullet count (plan accuracy)

Plan claimed §3 has "4 bullets" — actual count is **3 bullets** (Workflows, Shell/PowerShell, JSON schemas). Fixed in plan.

### Fix 2: Proposed content line count (plan accuracy)

Plan claimed "65 lines (down from 57)" — actual proposed content is **~50 lines** (down from 57). Fixed in plan.

### Fix 3: AC4 upstream-vs-local analysis (plan completeness)

Plan body now explicitly includes the upstream-vs-local coverage delta analysis (previously only in refined spec R3). See AC4 section above.
