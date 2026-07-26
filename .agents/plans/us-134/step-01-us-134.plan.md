---
slug: us-134
title: "feat: add ws-spec-index skill (project spec index init/sync/promote)"
status: "plan refined"
---

## 0. Summary & Business Rules
This feature adds a new model-invoked skill `ws-spec-index` under `.agents/skills/ws-spec-index/`.
The skill provides project-agnostic spec index lifecycle management (`init`, `sync`, `promote`) for consumer repositories.
It includes auto-sync call sites integrated into `spec-to-pr` (Step 8), `spec-to-pr-lite` (Step 4), and `ws-ship-pr`.

Key business rules:
- **E1 Evidence Rule:** Status `[x]` / spec `status` updates only apply when ship/delivery signal (delivery commit or PR creation) exists AND mapping to index row/slug is verified.
- **Auto-Sync:** Idempotent; skips cleanly without edits if no mapping found. Never auto-writes `Verified:`.
- **Packaging:** Registered in `bin/skill-dependencies.json` (Workflows + Full) with version matching package `packageVersion` (`0.0.82`).

## 1. Definition of Ready & Scope
Acceptance Criteria (ACs):
- **AC1:** Skill folder `.agents/skills/ws-spec-index/` with `SKILL.md`, model-invoked description, version `0.0.82`, registered in `skill-dependencies.json`.
- **AC2:** `init`, `sync`, `promote` modes with checkable Done when criteria; template detail disclosed in `INDEX-TEMPLATE.md`.
- **AC3:** `init` creates `{plans.specsDir}/index.PRD` scaffold from README/PRD/SPECS/free text without inventing full AC bodies.
- **AC4:** `init` seeds links/rows without fabricating complete AC bodies.
- **AC5:** `sync` call sites wired in `spec-to-pr` Step 8, `spec-to-pr-lite` Step 4, and `ws-ship-pr`.
- **AC6:** `sync` respects E1 evidence rule; returns empty `updated` + `skipped` when unmapped.
- **AC7:** `sync` never auto-writes `Verified:`.
- **AC8:** `promote` turns inbox idea into phase bullet + next-specs row.
- **AC9:** Documents OOS v1 (no session stop hooks, no deterministic python rewrite scripts, no Kanban API coupling).
- **AC10:** `evals/evals.json` containing ≥2 prompts covering `init` and `sync` (skip vs update).
- **AC11:** Hub task routers (`AGENTS.md` and `.agents/skills/shared/AGENTS.md`) updated.
- **AC12:** Changes are skill/docs/packaging only.

## 2. Technical Design & Architecture

### Files to create:
1. `.agents/skills/ws-spec-index/SKILL.md`: Model-invoked skill instructions (init, sync, promote) ≤100 lines.
2. `.agents/skills/ws-spec-index/INDEX-TEMPLATE.md`: Standard 12-section progressive-disclosure index template.
3. `.agents/skills/ws-spec-index/REFERENCE.md`: Status legend, E1 rule, path tokens, orch call contract, maintenance notes.
4. `.agents/skills/ws-spec-index/evals/evals.json`: Test prompts and assertions for `init` and `sync`.

### Files to modify:
1. `bin/skill-dependencies.json`: Register `ws-spec-index` in `packages.workflows.skills` and `packages.full.skills`.
2. `.agents/skills/shared/AGENTS.md`: Add `ws-spec-index` to skill index and task router tables.
3. `AGENTS.md`: Add `ws-spec-index` to Layer 2 / Layer 5 skill catalog and task router tables.
4. `.agents/skills/spec-to-pr/STEP-DISPATCH.md`: Document `ws-spec-index` sync call at Step 8 exit.
5. `.agents/skills/spec-to-pr-lite/SKILL.md`: Document `ws-spec-index` sync call at Step 4 exit.
6. `.agents/skills/ws-ship-pr/SKILL.md`: Document `ws-spec-index` sync call post-ship.

## 3. Step-by-Step Plan

1. **Step 1: Create `ws-spec-index` Skill Folder & Files**
   - Write `.agents/skills/ws-spec-index/SKILL.md`
   - Write `.agents/skills/ws-spec-index/INDEX-TEMPLATE.md`
   - Write `.agents/skills/ws-spec-index/REFERENCE.md`
   - Write `.agents/skills/ws-spec-index/evals/evals.json`

2. **Step 2: Register Skill in Package Dependency Graph**
   - Update `bin/skill-dependencies.json` to include `"ws-spec-index"` in `workflows` and `full` skill lists.

3. **Step 3: Update Hub Indexes & Task Routers**
   - Update `.agents/skills/shared/AGENTS.md`
   - Update root `AGENTS.md`

4. **Step 4: Wire Orchestrator Call Sites for Auto-Sync**
   - Update `.agents/skills/spec-to-pr/STEP-DISPATCH.md`
   - Update `.agents/skills/spec-to-pr-lite/SKILL.md`
   - Update `.agents/skills/ws-ship-pr/SKILL.md`

5. **Step 5: Run Verification Checks**
   - Run `node bin/build-site.js`
   - Run `npm run verify-integrity` / `npm run generate-integrity`
   - Run `python .agents/skills/check-workflows/scripts/check_workflows.py`
   - Run `npm run tests -- --local`

## 4. Permissions, Tenancy & i18n
- No database or multi-tenant user data touched.
- Language: en-us strictly.

## 5. Test Coverage
- AC1–AC4, AC6–AC10: Covered by `evals/evals.json` test cases and `check-harness` validation.
- AC5, AC11: Verified via `python .agents/skills/check-workflows/scripts/check_workflows.py`.
- AC12: Verified via `git status` / build test battery (`npm run tests -- --local`).

## 6. Invariants (Do Not Violate)
- `version:` in `SKILL.md` frontmatter must be `0.0.82` (matching `packageVersion`).
- No per-skill `upstream:` block in `SKILL.md` (ownership in `skill-dependencies.json`).
- Script launchers / en-us rules enforced.
- Idempotent auto-sync (no forced edits, no auto-writing `Verified:`).

## 7. Pre-PR Checklist
- [x] All 12 ACs mapped to implementation steps.
- [x] All files identified with explicit paths.
- [x] Verification commands specified.

## 8. Open Questions
None (all design decisions locked in issue #134).
