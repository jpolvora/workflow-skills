---
slug: skill-loaded-banner-instruction
title: "Skill Loading Banner Instruction in Primary SKILL.md Files"
status: "plan to be refined"
---

## 0. Summary & Business Rules
This feature adds an explicit directive to every primary skill file (`.agents/skills/{ws-skillName}/SKILL.md`) requiring the executing agent to output `"{ws-skillName} loaded."` as soon as the skill is loaded/read. This directive is added exclusively to primary `SKILL.md` files, leaving auxiliary files (such as `FORMAT.md`, `INTERVIEW.md`, `PROTOCOLS.md`, `PREPARE-CHECKLIST.md`, `docs/*.md`) clean.

## 1. Definition of Ready & Scope
- **AC1**: All 37 primary skill files (`.agents/skills/{ws-skillName}/SKILL.md`) updated with the activation banner instruction.
- **AC2**: No auxiliary markdown files contain the activation banner directive.
- **AC3**: `ws-write-a-skill` (authoring guide) and validation tools updated to require/verify `"{ws-skillName} loaded."` for primary `SKILL.md` files.
- **AC4**: All integrity checks, workflow simulations, and test suites pass.

## 2. Technical Design & Architecture

### Directives Structure in `SKILL.md`:
Right below the primary `# {ws-skillName}` heading:
`> When this skill is loaded, output "{ws-skillName} loaded."`

### Affected Components:
1. **Primary SKILL.md Files**: 37 files in `.agents/skills/*/SKILL.md`.
2. **Authoring & Harness Guidelines**: `.agents/skills/ws-write-a-skill/SKILL.md`, `.agents/skills/ws-check-harness/SKILL.md`.

## 3. Step-by-Step Plan

### Step 1 — Update Primary SKILL.md Files (AC1 & AC2)
- Edit all 37 `.agents/skills/*/SKILL.md` files to insert `> When this skill is loaded, output "{ws-skillName} loaded."` directly after the main `# {ws-skillName}` title heading.
- Verify no auxiliary files (`FORMAT.md`, `INTERVIEW.md`, `PROTOCOLS.md`, `PREPARE-CHECKLIST.md`, `docs/*.md`) receive the directive.

### Step 2 — Update Skill Authoring & Harness Documentation (AC3)
- Update `.agents/skills/ws-write-a-skill/SKILL.md` to mandate `> When this skill is loaded, output "{ws-skillName} loaded."` in newly created skills.
- Update `.agents/skills/ws-check-harness/SKILL.md` to include verification for the loaded banner directive in primary `SKILL.md` files.

### Step 3 — Site Catalog & Integrity Regeneration (AC4)
- Run `npm run build-site:bump` to sync versioning.
- Run `npm run generate-integrity` and `npm run verify-integrity`.
- Run `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`.
- Run `npm run test`.

## 4. Permissions, Tenancy & i18n
- N/A (Documentation & skill formatting only).

## 5. Test Coverage
- AC1: Inspect primary `SKILL.md` files to ensure each contains its respective `"{ws-skillName} loaded."` instruction.
- AC2: Inspect auxiliary `.md` files to verify absence of banner directive.
- AC3: Verify `ws-write-a-skill` includes the banner directive standard.
- AC4: Run `npm run verify-integrity`, `check_workflows.py`, and `npm run test`.

## 6. Invariants (Do Not Violate)
- Enforce exact string syntax `"{ws-skillName} loaded."`.
- Keep language en-us only.
- Preserve all existing frontmatter, YAML properties, and markdown structure in `SKILL.md`.

## 7. Pre-PR Checklist
- [x] Layer boundaries respected.
- [x] Primary SKILL.md files identified and scoped.
- [x] All ACs mapped to implementation and verification steps.

## 8. Open Questions
None. Scope is completely unambiguous.
