---
id: 60
slug: us-60
title: "Portable harness improvements from consumer check-harness (External Dependencies, spec-to-pr disclosure, en-us)"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/60"
specDate: 2026-07-17
---

# Specification — Portable harness improvements from consumer check-harness (External Dependencies, spec-to-pr disclosure, en-us)

**State:** open

## Description

## Summary

After a consumer `check-harness` run, several **portable** fixes were applied locally so the next `npx github:jpolvora/workflow-skills update` (and fresh installs) do not regress. Please port these into **workflow-skills** (prefer `develop` → `main`).

**Out of scope for this issue:** consumer product routers, stack-specific `.mdc` rules, ERP/lib aliases, ADO helper skills local to a consumer, inventory counts in product `index.mdc`. Those stay in the consumer repo.

## Motivation

Packaged skills already **assume** contracts that many consumer hubs omit (notably `AGENTS.md#external-dependencies`). Orchestrator sprawl and one retired skill-id string also hurt install quality. Fixing upstream once improves every consumer.

## Proposed portable changes

### 1. Document / seed `AGENTS.md` § External Dependencies (critical)

**Problem:** Multiple packaged skills link to root `AGENTS.md#external-dependencies` and tell agents to resolve `config.json.rules.seniorDeveloper` (examples: `gabarito`, `check-harness`, `domain-review`, `tdd-sdd-ddd-reviewer`, packaged `.agents/AGENTS.md` consumer notes). Consumers without that section hit a **dead end**.

**Proposal:**
- Add a **portable** `## External Dependencies` section (with stable anchor `external-dependencies`) to:
  - Upstream agent hub template used by installers / `AGENTS.md` examples for consumers
  - And/or `skills/shared/setup.md` + `config.schema.json` / `config.json.example` docs describing the `rules.*` keys
- Content should be **project-agnostic**: resolution order only — `config.json.rules.seniorDeveloper` → local/global `senior-developer` skill → consumer `.cursor/rules/senior-developer.mdc` (or equivalent path from config). Same for `karpathyGuidelines`, `stackFile`, etc.
- Define what auto-load skills mean by **“Code review proof”** as a pointer to the resolved guardrails checklist (not a pasted checklist).

**Do not** hardcode a consumer’s stack paths in the packaged skill bodies.

### 2. Packaged `.agents/AGENTS.md` — Active `.cursor/rules/` section (warning)

**Problem:** Section currently lists only `ask-question-gates.mdc`, while consumers often have additional always-apply product rules. Agents may think the packaged list is exhaustive.

**Proposal (progressive disclosure):**
- Keep `ask-question-gates` as the **only packaged** rule shipped by workflow-skills.
- Add an explicit note: full always-apply / glob inventory lives in the **consumer** product router (e.g. `.cursor/rules/index.mdc` when present); do **not** duplicate product rule catalogs in the packaged index.
- Avoid embedding stack-specific rule filenames (ABP template paths, etc.) in the packaged file.

### 3. `spec-to-pr` — extract step dispatch (suggestion / sprawl)

**Problem:** `skills/spec-to-pr/SKILL.md` is very large; step 0–13 dispatch + Step 12/13 protocols inflate every load.

**Proposal:**
- Add sibling `skills/spec-to-pr/STEP-DISPATCH.md` with the dispatch table + Step 12/13 gate protocols.
- In `SKILL.md` Audience & load: context pointer — load `STEP-DISPATCH.md` only when advancing/dispatching.
- Replace the inlined Step instructions block with a short pointer to `STEP-DISPATCH.md`.

Reference shape (consumer-applied): see progressive disclosure via `ARTIFACTS.md` + new `STEP-DISPATCH.md`.

### 4. `spec-to-pr` — fix retired / unprefixed skill folder id (critical if still in upstream)

**Problem:** Post-workflow section referenced a retired-style id `step-10-update-plan-implementation` / `/step-10`.

**Proposal:** Use exact prefixed folder id only:
- Skill: `10-update-plan-implementation`
- Invoke: `/10-update-plan-implementation`
- Path: `skills/10-update-plan-implementation/SKILL.md`

### 5. `domain-review` — en-us compliance for leftover PT tokens (warning)

**Problem:** Skill body still used Portuguese catalog headings / tokens (`Índice`, `Ordem sugerida`, `Dependências`, `Pai / Sub`, `SIM`) while packaged skills must be **en-us**.

**Proposal:**
- Prefer English headings in skill instructions: Index, Suggested order, Dependencies, Parent / Sub, YES.
- Optionally note that **consumer domain maps** may keep Portuguese heading aliases and should still be accepted when present.

Apply similarly in `domain-review/REPORT.md` placement instructions.

### 6. Installer / bootstrap seeds (suggestion)

Optional portable seeds for `npx … install|update` (do not overwrite if present):
- Root `.cursorrules` → single pointer to `AGENTS.md`
- Root `CHANGELOG.md` stub if missing (supports `changelog` skill at task end)

## Explicitly NOT requested (consumer-only)

Leave these out of workflow-skills PRs:
- Product `index.mdc` skill inventory counts / FiscalWR dual-hub tables
- Demoting stack `.mdc` `alwaysApply` (e.g. ABP template / abp-core)
- ERP / lib skill `name:` collision renames and redirect aliases
- Consumer-local ADO REST helper skill PT→EN edits
- Any hardcoding of org/repo/solution/API host/build commands

## Acceptance Criteria

- AC1: Fresh consumer install documents or seeds `AGENTS.md` § External Dependencies (or equivalent shared doc linked from packaged `AGENTS.md` consumer notes) so `#external-dependencies` is not a dead end
- AC2: Packaged `.agents/AGENTS.md` Active rules section uses progressive disclosure (ask-question-gates + pointer), no stack-specific rule dump
- AC3: `spec-to-pr` ships `STEP-DISPATCH.md` and `SKILL.md` loads it on demand
- AC4: No retired/unprefixed references to `10-update-plan-implementation`
- AC5: `domain-review` skill content is en-us (aliases for consumer PT headings allowed as notes only)
- AC6: Optional installer seeds for `.cursorrules` / `CHANGELOG.md` documented or implemented without clobbering consumer files
- AC7: `check-harness` on workflow-skills passes for the touched paths

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
