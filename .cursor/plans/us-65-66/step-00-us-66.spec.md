---
id: 66
slug: us-66
title: "check-harness: dispatch skill id, misleading links, phantom skill-dependencies path"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/66"
specDate: 2026-07-17
---

# Specification — check-harness: dispatch skill id, misleading links, phantom skill-dependencies path

**State:** open

## Description

## Summary

A full **`check-harness`** audit on consumer repo [ERP.Fiscal.sync](https://github.com/jpolvora/ERP.Fiscal) (`develop`, 2026-07-17) found **three portable harness issues** that still exist on upstream **`develop`** and were patched locally in the consumer copy. This issue tracks upstream fixes so the next `workflow-skills` install/update does not reintroduce them.

**Audit skill:** `.agents/skills/check-harness/SKILL.md` (Phases 2 + 5: link resolution from file directory, strict prefixed task-folder references in orchestrator dispatch).

---

## Upstream fixes needed (confirmed on `develop`)

### 1. Unprefixed skill id in orchestrator dispatch (**warning → dispatch ambiguity**)

**File:** `.agents/skills/spec-to-pr/STEP-DISPATCH.md`

**Problem:** Step 11 action column uses bare `integration-validation` instead of the canonical folder/skill id `07-integration-validation`. `check-harness` forbids unprefixed task references in orchestrator dispatch tables.

**Upstream (`develop`):**
```markdown
| 11 | ...; else integration-validation | reports |
```

**Proposed:**
```markdown
| 11 | ...; else `Task` `07-integration-validation` | reports |
```

---

### 2. Misleading markdown link labels in `spec-to-pr` hub line (**suggestion**)

**File:** `.agents/skills/spec-to-pr/SKILL.md`

**Problem:** Post-12 PR line labels links `code-review` and `fix-pr` but targets `06-code-review` and `08-fix-pr`. Agents searching for the local `code-review` skill or unprefixed `08-fix-pr` folder can mis-route.

**Upstream (`develop`):**
```markdown
Post-12 PR: [`code-review`](../06-code-review/SKILL.md) / [`fix-pr`](../08-fix-pr/SKILL.md).
```

**Proposed:**
```markdown
Post-12 PR: [`06-code-review`](../06-code-review/SKILL.md) / [`08-fix-pr`](../08-fix-pr/SKILL.md).
```

---

### 3. Broken internal link in packaged shared hub (**warning**)

**File:** `.agents/skills/shared/AGENTS.md`

**Problem:** Link to `../../../bin/skill-dependencies.json` does **not** exist in consumer clones (installer does not vendor `bin/`). Resolving the link from `.agents/skills/shared/AGENTS.md` fails Phase 2 existence check.

**Upstream (`develop`):**
```markdown
Install packages and dependency map: [`../../../bin/skill-dependencies.json`](../../../bin/skill-dependencies.json).
```

**Proposed (consumer-safe):**
```markdown
Install packages and dependency map: upstream `bin/skill-dependencies.json` in [workflow-skills](https://github.com/jpolvora/workflow-skills) (not vendored in consumer clones).
```

---

## Consumer-only fixes (no upstream change required)

These were fixed in **ERP.Fiscal.sync** only; documenting for audit traceability:

| Area | Fix |
|------|-----|
| `.cursor/rules/*.mdc` | Repo-root-style paths (`.agents/...`) failed when resolved from `.cursor/rules/`; updated to `../../...` |
| Root `AGENTS.md` | Routed Layer 0 rule `ask-question-gates.mdc` |
| Product skills | `security-check` `.gitignore` relative link; `sync-plugnotas-docs` self-link in template line |
| `.agents/AGENTS.md` | Documented dual-hub **product-only** skills (pt-BR bodies) not duplicated in packaged index |
| `specs/domains/` | Consumer lacked catalog starter; upstream already ships `specs/domains/index.md.example` on `develop` — consumer should copy from package or sync |

---

## Suggested verification

After merge to `develop`:

1. Run **`/check-harness`** on a clean consumer install (or dry-run in upstream repo).
2. Confirm Phase 2: no missing target for `shared/AGENTS.md` dependency map line.
3. Confirm `STEP-DISPATCH.md` Step 11 uses prefixed `07-integration-validation` only.

## Labels

`harness`, `spec-to-pr`, `documentation` (if applicable)

## Acceptance Criteria

_No explicit acceptance criteria in the issue — extract/validate during refinement._

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
