---
slug: us-272
step: 6
workflowId: us-272-20260903T165000Z
status: active
startedAt: "2026-09-03T16:50:00Z"
endedAt: "2026-09-03T17:22:28.088Z"
acRefs: []
---
# Step 06 Code Review: us-272 (draft round 1)

## Starting Step 6 (verboseMode preview)

- Review ONLY the G2 commit 346b2adf, path-scoped to the 9 Step 4 files_touched.
- Verify product tree clean (plans/ untracked is ok) via git status --porcelain on the 9 paths.
- Triage hypotheses, prove each with Evidence/Failure/Protection/Discards, generalize defect class to siblings.
- Sweep MEMORY traps, check config invariants, run fable autoAudit (enabled+autoAudit true).
- Write canonical review via write_review_round.cjs; autofix max 3 rounds if Critical/Warning (autoMode, no prompts).

## Executive Summary

- **Target spec:** `.agents/plans/us-272/step-00-us-272.spec.md`
- **Branch:** `develop` (stay)
- **Base branch:** `main`
- **Product commit:** `346b2adf` feat(us-272): prune retired skill ids on update + hybrid harness fallback
- **Review verdict:** APPROVED (0 critical, 0 warning, 0 suggestions blocking)

## Scope reviewed

Committed G2 product diff (`346b2adf`) — 9 files, exactly the Step 4 files_touched:

- `.agents/skills/ws-shared/config.json.example` (canonical provider script paths)
- `.agents/skills/ws-shared/scripts/retired_artifacts.cjs` (RETIRED_BARE_IDS + RETIRED_TO_CANONICAL + listRetiredManifestIds)
- `bin/consumer-migration.js` (re-exports)
- `bin/cli.js` (thin local AGENTS.md pointer on missing-file edge + post-sync fail-closed assertion)
- `.agents/skills/ws-shared/config-resolution.md` (harness entrypoint fallback)
- `.agents/skills/ws-check-harness/PHASES.md` (hybrid harness resolution row)
- `test/test-consumer-migration.js` (bare-id + map + false-positive coverage)
- `test/test-install.js` (Phase 9c hybrid fixture + prune-behavior updates + rename updates)
- `bin/skill-integrity.json` (regenerated digests, verify-integrity green)

Product-tree check: `git status --porcelain` on the 9 paths returns empty (only `.agents/plans/**` workflow artifacts dirty/untracked). `git show --stat HEAD` confirms the commit touches only these 9 files.

## Triage and investigation (all hypotheses discarded, no proven findings)

- H1 pointer overwrite: Evidence `bin/cli.js` guards seed with `!existsSync(AGENTS.md)` (missing-file edge only); normal updates refresh via HUB_WHITELIST. Failure scenario (clobber custom hub) cannot fire; protection present. Discarded.
- H2 bare ids deleted as folders: Evidence `retired_artifacts.cjs` adds bare ids only to the manifest filter set, never to folder removal; test asserts `skillDirs` excludes all six bare ids. Discarded.
- H3 STALE false-positive on prose "fix-pr": Evidence test asserts no STALE pattern matches `unrelated prose mentioning <bare>` for every bare id. Discarded.
- H4 retired paths in example: Evidence `config.json.example` now cites `ws-spec-provider-github` / `ws-spec-provider-azure-devops`; sweep over managed sources shows zero live hits outside the audit catalog/map itself. Discarded.
- H5 process.exit(1) in runUpdate: CLI fail-closed convention, consistent with installer error paths; only fires when retired ids survive prune+sync. Discarded.
- H6 test-install Phase 11 prune-behavior change (was fail, now prune+succeed): intended per MEMORY trap `2026-09-03 Install/update must prune retired managed skill files`; protection `pruneManagedSkillExtras` skips consumer-owned `config.json`/`MEMORY.md`/`memory/` and the new test asserts skill-local `config.json` preservation. Strengthening, not weakening. Discarded as a finding.

## Sibling generalization

- `rg` for the ten retired `ws-*` ids over managed sources: hits confined to the audit mechanism itself (`PHASES.md` forbidden-to-canonical catalog, `retired_artifacts.cjs` map/patterns) — AC7 ImplementedDifferently, must name ids to forbid them. Zero live references in `bin/cli.js`, `bin/consumer-migration.js`, `config.json.example`, `config-resolution.md`, `skill-dependencies.json` manifests.
- Bare-id sweep: `azure-devops` prose hits are provider-matrix/SCM wording, not retired-id references; `caveman`/`plan-us`/`us-delivery-workflow` appear only in the prune list, map tests, and exempt history. No unfixed sibling defect.

## MEMORY sweep

Consulted compiled `{sharedDir}/MEMORY.md` (Medium+). No violations: G2-code staging trap honored (commit = 9 planned files only); prune-managed-extras trap implemented; secondary-target symmetry untouched; no bare-word STALE rows added (false-positive rule honored, G8); no dual-runtime scripts; no benchmark load; no MEMORY/CHANGELOG history rewrites.

## Invariants and checks

- `config.json` stack `node-skills-package`; invariants `commitPlanFilesOnlyAtStep8: true` honored (no commit in this step); no tenancy/migrations/i18n surface (frontend none).
- Fable autoAudit (`fable.enabled` + `autoAudit` true): Weakened Checks — none (tests only add assertions; rename updates are legitimate canonical-id changes). False Completion — none (Step 5 honestly deferred full `npm run test` with `skipReason: baseline-dirty`; core gates re-run green here). Scope Creep — none (9/9 files in plan). Unauthorized Action — none (no push; HEAD is the local G2 commit).
- Commands re-run: `node test/test-consumer-migration.js` exit 0; `npm run verify-integrity` exit 0; `check_duplicates` / `measure_harness` / `check_shell_quoting` / `check_pipeline_handoff` exit 0; `configure_autoload.py --check` ok=True findings=0.

## Non-blocking note (Suggestion-grade, not filed)

- Full `test/test-install.js` end to end and full `npm run test` were not re-run in Step 6 (runtime); Step 5's Phase 9c replica asserts were verified verbatim in isolation and the committed Phase 9c should run in CI before ship. Recorded here only; does not block Advance.

No feedback.
