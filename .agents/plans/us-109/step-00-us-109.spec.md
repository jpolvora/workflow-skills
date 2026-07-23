---
id: 109
slug: us-109
title: "Fresh consumer install leaves check-harness suggestions that should be near-zero"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/109"
specDate: 2026-07-23
---

# Specification — Fresh consumer install leaves check-harness suggestions that should be near-zero

**State:** open

## Description

## Summary

A **fresh consumer install** of workflow-skills into [cursor-profile-manager](https://github.com/jpolvora/cursor-profile-manager) (2026-07-23) was audited with `check-harness` in **consumer mode**.

**Integrity was healthy:** 0 critical, 0 warning, **0 broken links**, pipeline § 3b alignment OK, no unrouted skills.

But check-harness still produced **5 suggestion-severity items** that required local “fixes” before the harness felt bootstrap-complete. Expectation for consumer mode: **fresh install → near-zero check-harness findings** (especially no config/stack seed debt that the consumer must immediately correct).

## Environment

| Field | Value |
|-------|--------|
| Consumer repo | `jpolvora/cursor-profile-manager` |
| Install mode | Consumer (primary hub `.agents/skills/shared/AGENTS.md`) |
| Install time | `2026-07-23T17:18:39.777Z` (`installed-skills.json`) |
| Selected roots | `show-harness`, `spec-to-pr`, `spec-to-pr-lite`, `write-a-skill` (Full-style closure; 30 skill folders) |
| check-harness | v3.2-generic (installed copy) |
| Path tokens | defaults from seeded `config.json` |

## What check-harness reported (consumer problems)

| # | Severity | Finding | Why it felt like an install defect |
|---|----------|---------|-------------------------------------|
| 1 | suggestion | Seeded `shared/config.json` still full of `<PROJECT_NAME>`, `<GITHUB_ORG>`, `<STACK_ID>`, example verification commands, .NET-oriented `invariants` defaults | Fresh install seeds from `config.json.example` but does not complete configure-project; check-harness then flags placeholders |
| 2 | suggestion | Repo-root `AGENTS.md` (product guide) does not point at `shared/AGENTS.md` | Installer correctly never writes root files; check-harness still suggests a thin pointer — noisy for consumers that already have a product `AGENTS.md` |
| 3 | suggestion | `domain.glossaryFile: CONTEXT.md` and `domain.designTokens: DESIGN.md` in seed, but files **do not exist** | Example config invents optional files that are missing on disk → harness suggests create stubs or clear keys |
| 4 | suggestion | Seeded `STACK.md` still template (`{layer.name}` table rows, generic stack prose) | Same seed debt as #1; looks unfinished after “successful” install |
| 5 | suggestion | `rules.seniorDeveloper` empty / unresolved | Documented as optional, but still appears in the correction plan noise |

**Not counted as consumer defects (OK):** orch-only skills omitted from promoted tables; Extra skills present and routed; retired path ids only inside `check-harness` catalogs; absolute-path *examples* in skill prose.

## Desired outcome

After a fresh consumer install (with or without interactive configure):

1. **`check-harness` → near-zero findings** in consumer mode (ideally 0 suggestions that require immediate edits).
2. Seeded `config.json` / `STACK.md` should not reference **missing optional files** (`CONTEXT.md`, `DESIGN.md`) by default.
3. Placeholder / configure-project debt should either:
   - be resolved during install (prompt `/configure-project` or non-interactive detect+write), **or**
   - be **explicitly excluded** from check-harness “Problems found” in consumer mode until the user opts into workflows (e.g. treat “placeholders after seed” as informational / Upstream-debt style, not a correction-plan item).
4. Dual-hub / root `AGENTS.md` pointer: in consumer mode, if root `AGENTS.md` exists and is **product-owned** (does not claim to be the workflow router), do **not** emit a correction item — at most a one-line informational note.
5. Empty `rules.seniorDeveloper` should not appear in the numbered correction plan when the hub already documents it as optional.

## Proposed directions (upstream)

Pick one or combine:

### A. Better seeds (`config.json.example` / `STACK.md.example`)

- Set `domain.glossaryFile` and `domain.designTokens` to `""` (or omit) in the example.
- Soften or remove stack-specific `invariants` defaults that imply .NET EF (or gate them behind stack id).
- Keep STACK example clearly marked as “replace via configure-project” without fake layer rows that look like broken inventory.

### B. Installer UX

- After `install` / first `update`, print a single mandatory next step: run configure-project **or** offer `--configure` / detect-and-write for `project` + `providers` + `verification` when signals exist.
- Optionally write a tiny `shared/INSTALL.md` or stamp in `installed-skills.json` that check-harness can read: `bootstrapComplete: false` until configure-project succeeds.

### C. check-harness consumer-mode policy

- Reclassify “placeholders after seed”, “missing optional domain files pointed by empty-or-example keys”, “seniorDeveloper empty”, and “root AGENTS has no thin pointer” as **informational / bootstrap** — not numbered correction-plan suggestions — unless `config.json` claims a non-empty path that is missing, or the user passed `--strict-bootstrap`.
- Goal metric: **fresh Full/Workflows install + no configure-project → 0 correction-plan rows** (or only a single “run configure-project” informational banner).

## Reproduction

```bash
# in any clean consumer repo
npx --yes github:jpolvora/workflow-skills install --full --yes   # or interactive Full

# then ask agent / load skill:
# .agents/skills/check-harness/SKILL.md  (normal mode, full scope)
```

Observe Phase 6: suggestions for placeholders, STACK template, CONTEXT/DESIGN, root pointer, seniorDeveloper.

## Related consumer session notes

- Audit date: 2026-07-23
- Consumer applied local fixes (filled config/STACK, cleared domain paths, documented install/update in product `AGENTS.md`/`README`) — those should not be required for every fresh install.

## Acceptance Criteria

- AC1: Fresh consumer Full (or Workflows) install → `check-harness` reports **0 critical / 0 warning** and **0 suggestion items that require file edits** (or at most one informational “configure-project recommended” banner).
- AC2: `config.json.example` does not reference non-existent default paths (`CONTEXT.md`, `DESIGN.md`) unless those files are also seeded.
- AC3: Documented in consumer hub / README: what install guarantees vs what configure-project owns.

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
