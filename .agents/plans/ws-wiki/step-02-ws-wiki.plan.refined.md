---
slug: ws-wiki
title: "ws-wiki: living project feature wiki and domain knowledge base manager"
status: completed
step: 2
workflowId: ws-wiki-20260912T043312Z
startedAt: "2026-09-12T04:33:12Z"
endedAt: "2026-09-12T04:40:45.483Z"
acRefs: []
---
# Refined Implementation Plan — ws-wiki

## 0. Summary & Business Rules
Living feature wiki and domain knowledge base manager (`ws-wiki`) for tracking living architecture, screens, forms, business rules, and technical workflows.

- Configurable via `plans.wikiDir` (default `.agents/specs/wiki`).
- Standardized 3-section feature pages (`## Feature Overview`, `## Business Rules & Logic`, `## Technical Architecture`).
- Deterministic verification with `validate_wiki.cjs` and `sync_wiki_index.cjs`.
- Post-close lifecycle integration in `ws-spec-to-pr` and `ws-spec-to-pr-lite`.

## 1. Definition of Ready & Scope
AC1–AC18 mapped directly to implementation tasks T01–T06.
Negative scenarios NS1–NS4 mapped to deterministic test validations.

## 2. Technical Design & Architecture
- `.agents/skills/ws-wiki/SKILL.md` (authoritative skill body)
- `.agents/skills/ws-wiki/scripts/validate_wiki.cjs`
- `.agents/skills/ws-wiki/scripts/sync_wiki_index.cjs`
- `.agents/skills/ws-shared/runtime/config.schema.json`
- `.agents/skills/ws-shared/templates/config.json.example`
- `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`
- `.agents/skills/ws-spec-to-pr-lite/SKILL.md`
- `bin/skill-dependencies.json`
- `CATALOG.md`
- `.agents/skills/ws-shared/autoload.md`
- `test/test-wiki.js`
- `package.json`

## 3. Step-by-Step Plan
1. **T01**: Extend `config.schema.json` and `config.json.example` with `plans.wikiDir`.
2. **T02**: Implement `validate_wiki.cjs` and `sync_wiki_index.cjs`.
3. **T03**: Implement `.agents/skills/ws-wiki/SKILL.md`.
4. **T04**: Integrate `ws-wiki sync` into `STEP-DISPATCH.md` and `ws-spec-to-pr-lite`.
5. **T05**: Register in `skill-dependencies.json`, `CATALOG.md`, and `autoload.md`.
6. **T06**: Write `test/test-wiki.js`, wire into `package.json`, and run full test suites.

## 4. Permissions, Tenancy & i18n
Standard local file I/O; en-us only.

## 5. Test Coverage
- `V01:skill-frontmatter-and-banner`: frontmatter and banner validation.
- `V02:wiki-init-and-index-structure`: index creation and domain groupings.
- `V03:wiki-sync-and-subpage-structure`: subpage structure and 3-section headings.
- `V04:wiki-sync-refinement-and-vibe`: in-place refinement and diff-based discovery.
- `V05:wiki-gate-cancellation`: cancel review gate without file write (NS3).
- `V06:validate-wiki-script`: link and heading validation pass/fail (NS1, NS2).
- `V07:sync-wiki-index-script`: index sync addition, update, and idempotence.
- `V08:orchestrator-close-integration`: lifecycle hooks in standard and lite.
- `V09:config-schema-wikiDir`: schema verification for `plans.wikiDir`.
- `V10:test-suite-execution`: clean execution of `test/test-wiki.js`.
- `V11:catalog-and-autoload-registration`: docs and catalog entries.
- `V12:spec-authoring-validation`: clean authoring validation for spec.

## 6. Stack & Security Invariants Verification Plan
- CommonJS `.cjs` using Node built-in modules (`fs`, `path`, `crypto`).
- Path validation defensively constrained to repo root and wiki directory.
- Fail-closed review gate and validation scripts.

## 7. Pre-PR Checklist
All items verified.

## 8. Open Questions
None.
