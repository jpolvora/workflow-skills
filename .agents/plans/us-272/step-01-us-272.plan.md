---
superseded: true
supersededBy: step-02-us-272.plan.refined.md
slug: us-272
title: Migrate retired skill ids on installer update + global-hybrid harness fallback
status: active
step: 1
workflowId: us-272-20260903T165000Z
startedAt: "2026-09-03T16:50:00Z"
endedAt: "2026-09-03T17:05:01.045Z"
acRefs: []
---
## 0. Summary & Business Rules

After the 0.3.56 rename wave (`ws-write-spec` → `ws-spec-write`, `ws-sync-spec` → `ws-spec-update`, `ws-multi-spec` → `ws-spec-multi`, `ws-local-spec-provider` → `ws-spec-provider-local`, `ws-verify-plan` → `ws-plan-verify`, `ws-github-provider` → `ws-spec-provider-github`, `ws-azure-devops-provider` → `ws-spec-provider-azure-devops`, `ws-write-plan` → `ws-plan-write`, `ws-update-plan-implementation` → `ws-plan-update`, `ws-interview` → `ws-plan-interview`), a pre-rename consumer tree keeps stale references in installer-managed files. Installer `update` refreshes skill bodies but does not fully migrate hub templates and the `installed-skills.json` tracking file, so `ws-check-harness` keeps flagging retired ids. A global (`--global`) hybrid install additionally leaves no project-local `ws-shared/AGENTS.md` while `config.json` `rules.harness` defaults to that local path.

Fix shape (installer update path, not consumer hand-edits):
1. Treat hub templates embedding skill ids/links as managed content refreshed or id-mapped on `update` (like skill folders).
2. Treat `installed-skills.json` as derived tracking state: prune/map retired ids (ten `ws-*` ids plus six legacy bare ids with no canonical target) per the dependency manifest.
3. Guarantee harness resolvability for hybrid layouts via a seeded thin local `ws-shared/AGENTS.md` pointer (local-first default kept) plus documented `{globalSkillsRoot}` fallback.
4. Cover with `ws-check-harness` retired-id + hybrid checks and a pre/post `update` hybrid fixture in tests.

Business rules: consumer-owned data (`config.json` user values, `STACK.md`, `MEMORY.md`, `memory/*`, `CHANGELOG.md`) is byte-preserved; no new skills; no host/IDE coupling — portable `{skillsRoot}` / `{sharedDir}` / `{globalSkillsRoot}` / `{plansDir}` tokens and `config.json` `rules.harness` only; SoT is `.agents/skills` only; regenerate `bin/skill-integrity.json` in the same commit when hashed content changes.

Retired → canonical map (migration source of truth):
`ws-write-spec` → `ws-spec-write`, `ws-sync-spec` → `ws-spec-update`, `ws-multi-spec` → `ws-spec-multi`, `ws-local-spec-provider` → `ws-spec-provider-local`, `ws-verify-plan` → `ws-plan-verify`, `ws-github-provider` → `ws-spec-provider-github`, `ws-azure-devops-provider` → `ws-spec-provider-azure-devops`, `ws-write-plan` → `ws-plan-write`, `ws-update-plan-implementation` → `ws-plan-update`, `ws-interview` → `ws-plan-interview`. Legacy bare ids with no target (prune): `azure-devops`, `caveman`, `code-review`, `fix-pr`, `plan-us`, `us-delivery-workflow`.

## 1. Definition of Ready & Scope

Resolved assumptions (from spec): canonical id source = `bin/skill-dependencies.json` + live `.agents/skills/ws-*` folders; bare ids pruned; harness fix = thin local pointer, `rules.harness` stays local-first; fixture = pre-rename hybrid consumer tree; integrity regenerated same-commit.

ACs (measurable, from `step-00-us-272.spec.md`):
- AC1: post-`update` project-local `ws-shared/autoload.md` has zero of the ten retired ids; all `../ws-*/SKILL.md` targets resolve under project `{skillsRoot}` or `{globalSkillsRoot}`.
- AC2: post-`update` `installed-skills.json` has zero retired ids (ten `ws-*` + six bare, pruned or mapped); follow-up `update`/`uninstall` touches only canonical skills.
- AC3: global-hybrid tree resolves configured `rules.harness` — thin local `ws-shared/AGENTS.md` pointer seeded when missing, and/or default + comment documents the `{globalSkillsRoot}` fallback.
- AC4: `ws-check-harness` Phases 0–5c on migrated hybrid fixture reports zero retired-id findings; `check_duplicates`, `measure_harness`, `check_shell_quoting`, `check_pipeline_handoff`, `configure_autoload.py --check` exit 0.
- AC5: `update` preserves consumer-owned data (checksums identical except explicitly migrated keys).
- AC6: second `update` is idempotent (empty diff, exit 0, no retired-id return).
- AC7: all other shipped templates refreshed by `update` use canonical ids; repo-wide retired-id search over managed template sources returns zero hits.

Out of scope: new skills or further renames; hand-edit guidance as the fix; rewriting consumer-owned content; host-specific layouts/pointers; site/catalog copy unless CLI flags change.

## 2. Technical Design & Architecture

Layers (per `config.json` `node-skills-package` stack): `skills-sot` (`.agents/skills`), `installer-cli` (`bin`), `tests` (`test/`).

Current behavior (verified on `develop` at bootstrap `c823de93`):
- `bin/cli.js` `ensureSharedHubInstalled('update')` copies `HUB_WHITELIST` (includes `autoload.md`, `AGENTS.md`, `config.json.example`) over consumer copies unless in `CONSUMER_OWNED_HUB_FILES`, then calls `pruneRetiredConsumerArtifacts` (via `bin/consumer-migration.js` → `.agents/skills/ws-shared/scripts/retired_artifacts.cjs`), which prunes `RETIRED_SKILL_DIRS` folders + `installed-skills.json` entries + retired `defaults.*` keys. Update flow (`runUpdate`) refreshes hub when `shouldEnsureHub` or hub present, then `syncInstalledSkillsManifest`.
- Gaps: (i) `RETIRED_SKILL_DIRS` lacks the six bare legacy ids, so they survive in `installed-skills.json`; (ii) shipped `ws-shared/config.json.example` still cites retired provider script paths (`.agents/skills/ws-github-provider/...`, `.agents/skills/ws-azure-devops-provider/...`); (iii) no thin local `ws-shared/AGENTS.md` seeding or documented `{globalSkillsRoot}` fallback exists for global-hybrid trees where the local hub holds consumer data only; (iv) risk that `syncInstalledSkillsManifest` re-merges pre-prune ids must be closed by ordering/assertion.

Design:
- Extend `retired_artifacts.cjs`: add `RETIRED_BARE_IDS` (six bare ids) pruned from `installed-skills.json` `skills`/`selected` lists (never treated as skill folders); export the retired→canonical map for reuse by audit scripts; keep `STALE_LIVE_REFERENCE_PATTERNS` as the harness forbidden-id source. Re-export new symbols via `bin/consumer-migration.js`.
- `bin/cli.js`: after hub refresh + prune, assert `syncInstalledSkillsManifest` output contains zero retired/bare ids (fail-closed log, never silently re-add); seed thin local `ws-shared/AGENTS.md` pointer file when the project-local hub exists without `AGENTS.md` (pointer content references the global hub path portably, e.g. resolve via `{globalSkillsRoot}` token wording — no absolute author-machine paths, no consumer repo-root writes outside `.agents/skills/`); keep `rules.harness` default local-first.
- Shipped templates: fix `config.json.example` provider script paths to `ws-spec-provider-github` / `ws-spec-provider-azure-devops`; repo-wide `rg` sweep over `HUB_WHITELIST` sources + `bin/skill-dependencies.json` for the ten retired ids; fix hits in managed sources only (history files `CHANGELOG.md`/`MEMORY.md` exempt as retrospective records).
- `config-resolution.md` (and/or `ws-shared/AGENTS.md` consumer-hub contract): document the `{globalSkillsRoot}` harness fallback resolution order (project-local `ws-shared/AGENTS.md` first, then global hub) so agents succeed without manual fallback.
- `ws-check-harness` `PHASES.md`: retired-id scan already driven by `STALE_LIVE_REFERENCE_PATTERNS`; add/confirm hybrid harness-resolution check (local `ws-shared/AGENTS.md` absent + global present + `rules.harness` local-default ⇒ pointer-or-fallback expectation) so AC3 is audited, not advisory.

Defect-class sibling sweep: any other `bin/*.js` or `ws-shared/scripts/*.cjs` embedding the retired ids or bare ids (search `ws-write-spec|ws-sync-spec|ws-multi-spec|ws-local-spec-provider|ws-verify-plan|ws-github-provider|ws-azure-devops-provider|ws-interview|ws-write-plan|ws-update-plan-implementation` plus bare ids outside CHANGELOG/MEMORY) gets the same prune/map treatment.

## 3. Step-by-Step Plan

1. **Sweep managed sources** — `rg` the ten retired ids + six bare ids across `bin/`, `.agents/skills/ws-shared/` hub templates (`HUB_WHITELIST` set), `.agents/skills/ws-check-harness/`, `bin/skill-dependencies.json`. Record hits as the fix list (exclude `CHANGELOG.md`, `MEMORY.md`, `memory/*` history). Files: none modified (read-only). Check: hit list saved in working notes.
2. **Fix shipped templates (AC1, AC7)** — update `config.json.example` provider script paths to canonical ids; fix any other managed-template hits from step 1 (hub templates beside `autoload.md` refreshed by `update`). `autoload.md` upstream SoT is already canonical — confirm zero hits, no edit. Files: `.agents/skills/ws-shared/config.json.example` + other hit templates. Check: retired-id `rg` over managed sources returns zero.
3. **Extend retired-id migration (AC2)** — add `RETIRED_BARE_IDS` + canonical map export to `retired_artifacts.cjs`; prune bare ids from `installed-skills.json` `skills`/`selected`; re-export via `bin/consumer-migration.js`. Files: `.agents/skills/ws-shared/scripts/retired_artifacts.cjs`, `bin/consumer-migration.js`. Check: unit probe — manifest with all 16 stale ids prunes to canonical-only.
4. **Harden update ordering + hybrid pointer (AC2, AC3, AC6)** — in `bin/cli.js`: prune-then-sync ordering with post-sync zero-retired assertion; seed thin local `ws-shared/AGENTS.md` pointer when project hub lacks it (global-hybrid); no writes outside `.agents/skills/`. Files: `bin/cli.js`. Check: pre-rename hybrid fixture `node bin/cli.js update` exits 0; second run empty diff.
5. **Document fallback (AC3)** — `config-resolution.md` (+ `rules.harness` comment in `config.json.example` if touched in step 2): local-first resolution with `{globalSkillsRoot}` fallback. Files: `.agents/skills/ws-shared/config-resolution.md` (and example comment). Check: agent reading configured path succeeds per doc order.
6. **Harness coverage (AC4)** — `ws-check-harness/PHASES.md`: confirm retired-id phase + add hybrid harness-resolution check (missing local `AGENTS.md` + global present ⇒ expect pointer/fallback). Files: `.agents/skills/ws-check-harness/PHASES.md` (+ scripts only if needed). Check: Phases 0–5c + four mechanical gates + `configure_autoload.py --check` exit 0 on migrated fixture.
7. **Tests + integrity (AC1–AC7)** — extend `test/test-consumer-migration.js` (bare ids, canonical map, hybrid autoload/manifest prune cases); extend `test/test-install.js` update phase with pre-rename hybrid fixture (stale `autoload.md` + manifest with 16 ids + consumer-owned checksums + no local `AGENTS.md`) asserting AC1–AC6 + idempotent second run; run `npm run generate-integrity` + `npm run verify-integrity`. Files: `test/test-consumer-migration.js`, `test/test-install.js`, `bin/skill-integrity.json`. Check: `npm run test` green.

## 4. Permissions, Tenancy & i18n

N/A (installer/harness package — no RBAC, tenancy, or user-facing strings). Constraints observed instead: never write outside `.agents/skills/` (no consumer repo-root files); never overwrite consumer-owned `config.json`/`STACK.md`/`MEMORY.md`/`memory/*`/`CHANGELOG.md`/`installed-skills.json` values beyond retired-id pruning (AC5 checksums); no secrets in logs.

## 5. Test Coverage

- AC1 → `test-install.js` update phase: fixture `autoload.md` with retired ids/links → `update` → `rg` zero retired ids + link targets resolve (project or global root). Unit: hub-refresh overwrite assertion.
- AC2 → `test-consumer-migration.js`: manifest with ten `ws-*` + six bare ids → `pruneRetiredConsumerArtifacts` → canonical-only `skills`/`selected`; `test-install.js`: post-`update` manifest zero stale + follow-up `update`/`uninstall` canonical-only.
- AC3 → `test-install.js` hybrid case: global skills + local `ws-shared/` without `AGENTS.md` → `update` seeds pointer or fallback doc → configured `rules.harness` path resolves. Negative NS3: without fix, resolution fails.
- AC4 → manual/CI: `ws-check-harness` Phases 0–5c zero retired-id findings on migrated fixture; `check_duplicates.cjs`, `measure_harness.cjs`, `check_shell_quoting.cjs`, `check_pipeline_handoff.cjs`, `configure_autoload.py --check` exit 0.
- AC5 → `test-install.js`: checksum `config.json`/`STACK.md`/`MEMORY.md`/`CHANGELOG.md` before/after `update` identical. Negative NS4: tamper probe fails.
- AC6 → `test-install.js`: second `update` → empty `git diff`-equivalent + exit 0 + zero retired ids.
- AC7 → `test-consumer-migration.js` existing live-reference scan (extended patterns incl. bare ids where applicable) + `rg` over managed sources zero hits.
- Sabotage verification: pre-fix fixture run reproduces hits (NS1); partial-migration run (templates only, manifest untouched) fails `update`/`uninstall` (NS2) — covered by running fixture with step-4 prune disabled once during development (not a committed test).

## 6. Invariants (Do Not Violate)

- SoT: edit skill bodies only under `.agents/skills/`; installer inputs `bin/skill-dependencies.json` + `bin/cli.js`; never invent parallel roots.
- Portability: `{skillsRoot}`/`{sharedDir}`/`{globalSkillsRoot}`/`{plansDir}` tokens + `config.json` keys only; no hardcoded consumer paths; no host/IDE product coupling.
- Preservation: `config.json` user values, `STACK.md`, `MEMORY.md`, `memory/*`, `CHANGELOG.md` byte-identical (AC5); `installed-skills.json` changes limited to retired-id prune/map.
- Integrity: `npm run generate-integrity` + `npm run verify-integrity` same commit when hashed content changes; `ws-check-harness` clean before ship.
- Step-1 scope: write plan/index artifacts only; no product edits, no commit.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot / installer-cli / tests).
- [ ] Retired→canonical map + bare-id prune list centralized (no scattered literals).
- [ ] Consumer-owned preservation verified by checksums.
- [ ] Idempotent second `update` verified.
- [ ] Integrity manifest regenerated + verified.
- [ ] Test cases cover all ACs (AC1–AC7) + NS1–NS4 probes.

## 8. Open Questions

- Pointer vs doc for AC3: spec default is thin local `ws-shared/AGENTS.md` pointer with local-first `rules.harness`. If implementation finds global-scope installs must not seed project-local files, fall back to documented `{globalSkillsRoot}` resolution in `config-resolution.md` — interview in Step 2 will confirm the chosen shape.
- Whether `syncInstalledSkillsManifest` needs a code change or just an ordering assertion will be settled during Step 4 implementation against the fixture (plan covers both; minimal diff wins).
