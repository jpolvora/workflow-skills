---
slug: us-272
title: Migrate retired skill ids on installer update + global-hybrid harness fallback
status: active
step: 2
workflowId: us-272-20260903T165000Z
acRefs: []
startedAt: "2026-09-03T16:50:00Z"
endedAt: "2026-09-03T17:06:41.491Z"
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
- AC3: global-hybrid tree resolves configured `rules.harness` — thin local `ws-shared/AGENTS.md` pointer seeded when missing, and default + comment documents the `{globalSkillsRoot}` fallback.
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

Design (refined — interview decisions applied):

- Extend `retired_artifacts.cjs`: add `RETIRED_BARE_IDS` (six bare ids) pruned from `installed-skills.json` `skills`/`selected` lists (never treated as skill folders — no `fs.rmSync` for bare ids); export the retired→canonical map (`RETIRED_TO_CANONICAL`) for reuse by audit scripts; keep `STALE_LIVE_REFERENCE_PATTERNS` as the harness forbidden-id source. Do NOT add generic bare-word `STALE` patterns for `caveman`/`code-review`/`fix-pr`/`plan-us` (false-positive per memory trap — bare `\b` regex); bare ids are manifest-prune only. Re-export new symbols via `bin/consumer-migration.js`. Centralize literals (no scattered copies).
- `bin/cli.js`: prune-then-sync ordering is already correct (`ensureSharedHubInstalled` → prune inside at line ~661 runs before `syncInstalledSkillsManifest` at line ~1771 on update, same order on install). No logic change to `syncInstalledSkillsManifest` itself (minimal diff). Add post-sync fail-closed assertion: after sync, re-read manifest and fail/warn when any retired `ws-*` or bare id remains (never silently re-add). Seed thin local `ws-shared/AGENTS.md` pointer when the project-local hub exists without `AGENTS.md` (global-hybrid edge): pointer content references the global hub portably via `{globalSkillsRoot}` token wording — no absolute author-machine paths, no consumer repo-root writes outside `.agents/skills/`. Keep `rules.harness` default local-first. Note: `AGENTS.md` is already on `HUB_WHITELIST` and NOT consumer-owned, so a normal `update` overwrites it to canonical content; the pointer seed covers only the residual missing-file edge (hybrid tree where the local hub was hand-stripped).
- Shipped templates: fix `config.json.example` provider script paths to `ws-spec-provider-github` / `ws-spec-provider-azure-devops`; repo-wide `rg` sweep over `HUB_WHITELIST` sources + `bin/skill-dependencies.json` for the ten retired ids; fix hits in managed sources only (history files `CHANGELOG.md`/`MEMORY.md`/`memory/*` exempt as retrospective records, same exemption as Phase 4 `rg` recipe).
- `config-resolution.md` (and/or `ws-shared/AGENTS.md` consumer-hub contract): document the `{globalSkillsRoot}` harness fallback resolution order (project-local `ws-shared/AGENTS.md` first, then global hub) so agents succeed without manual fallback. Uses existing `resolveSkillMdPath` / `resolveConsumerContext` vocabulary — no hardcoded local `.agents/skills` paths in new prose.
- `ws-check-harness` `PHASES.md`: retired-id scan already driven by `STALE_LIVE_REFERENCE_PATTERNS`; add/confirm hybrid harness-resolution check (local `ws-shared/AGENTS.md` absent + global present + `rules.harness` local-default ⇒ pointer-or-fallback expectation) so AC3 is audited, not advisory. Keep `MEMORY.md`/`memory/**`/`CHANGELOG.md` exemptions in any new `rg` recipe.

Defect-class sibling sweep: any other `bin/*.js` or `ws-shared/scripts/*.cjs` embedding the retired ids or bare ids (search `ws-write-spec|ws-sync-spec|ws-multi-spec|ws-local-spec-provider|ws-verify-plan|ws-github-provider|ws-azure-devops-provider|ws-interview|ws-write-plan|ws-update-plan-implementation` plus bare ids outside CHANGELOG/MEMORY) gets the same prune/map treatment. New scripts use Node `.cjs` only (no dual `.py` mirror).

## 3. Step-by-Step Plan

1. **Sweep managed sources** — `rg` the ten retired ids + six bare ids across `bin/`, `.agents/skills/ws-shared/` hub templates (`HUB_WHITELIST` set), `.agents/skills/ws-check-harness/`, `bin/skill-dependencies.json`. Record hits as the fix list (exclude `CHANGELOG.md`, `MEMORY.md`, `memory/*` history). Files: none modified (read-only). Check: hit list saved in working notes.
2. **Fix shipped templates (AC1, AC7)** — update `config.json.example` provider script paths to canonical ids; fix any other managed-template hits from step 1 (hub templates beside `autoload.md` refreshed by `update`). `autoload.md` upstream SoT is already canonical — confirm zero hits, no edit. Files: `.agents/skills/ws-shared/config.json.example` + other hit templates. Check: retired-id `rg` over managed sources returns zero.
3. **Extend retired-id migration (AC2)** — add `RETIRED_BARE_IDS` + `RETIRED_TO_CANONICAL` map export to `retired_artifacts.cjs`; prune bare ids from `installed-skills.json` `skills`/`selected` (folders never touched for bare ids); re-export via `bin/consumer-migration.js`. Do not add `STALE` patterns for generic bare words. Files: `.agents/skills/ws-shared/scripts/retired_artifacts.cjs`, `bin/consumer-migration.js`. Check: unit probe — manifest with all 16 stale ids prunes to canonical-only.
4. **Harden update ordering + hybrid pointer (AC2, AC3, AC6)** — in `bin/cli.js`: keep prune-then-sync order, add post-sync zero-retired assertion (fail-closed log); seed thin local `ws-shared/AGENTS.md` pointer when project hub lacks it (global-hybrid edge only); no writes outside `.agents/skills/`; respect secondary-target symmetry (persist/reuse recorded global targets, fail closed on `--targets` without `--global`). Files: `bin/cli.js`. Check: pre-rename hybrid fixture `node bin/cli.js update` exits 0; second run empty diff.
5. **Document fallback (AC3)** — `config-resolution.md` (+ `rules.harness` comment in `config.json.example` if touched in step 2): local-first resolution with `{globalSkillsRoot}` fallback, referencing `resolveSkillMdPath` vocabulary. Files: `.agents/skills/ws-shared/config-resolution.md` (and example comment). Check: agent reading configured path succeeds per doc order.
6. **Harness coverage (AC4)** — `ws-check-harness/PHASES.md`: confirm retired-id phase + add hybrid harness-resolution check (missing local `AGENTS.md` + global present ⇒ expect pointer/fallback). Files: `.agents/skills/ws-check-harness/PHASES.md` (+ scripts only if needed, Node `.cjs` only). Check: Phases 0–5c + four mechanical gates + `configure_autoload.py --check` exit 0 on migrated fixture.
7. **Tests + integrity (AC1–AC7)** — extend `test/test-consumer-migration.js` (bare ids, canonical map, hybrid autoload/manifest prune cases; assert required stale ids without generic bare-word patterns); extend `test/test-install.js` update phase with pre-rename hybrid fixture (stale `autoload.md` + manifest with 16 ids + consumer-owned checksums + no local `AGENTS.md`) asserting AC1–AC6 + idempotent second run; run `npm run generate-integrity` + `npm run verify-integrity`. Files: `test/test-consumer-migration.js`, `test/test-install.js`, `bin/skill-integrity.json`. Check: `npm run test` green.

## 4. Permissions, Tenancy & i18n

N/A (installer/harness package — no RBAC, tenancy, or user-facing strings). Constraints observed instead: never write outside `.agents/skills/` (no consumer repo-root files); never overwrite consumer-owned `config.json`/`STACK.md`/`MEMORY.md`/`memory/*`/`CHANGELOG.md`/`installed-skills.json` values beyond retired-id pruning (AC5 checksums); no secrets in logs.

## 5. Test Coverage

- AC1 → `test-install.js` update phase: fixture `autoload.md` with retired ids/links → `update` → `rg` zero retired ids + link targets resolve (project or global root via `resolveSkillMdPath`). Unit: hub-refresh overwrite assertion.
- AC2 → `test-consumer-migration.js`: manifest with ten `ws-*` + six bare ids → `pruneRetiredConsumerArtifacts` → canonical-only `skills`/`selected`; `test-install.js`: post-`update` manifest zero stale + follow-up `update`/`uninstall` canonical-only. Post-sync assertion covered.
- AC3 → `test-install.js` hybrid case: global skills + local `ws-shared/` without `AGENTS.md` → `update` seeds pointer or fallback doc → configured `rules.harness` path resolves. Negative NS3: without fix, resolution fails.
- AC4 → manual/CI: `ws-check-harness` Phases 0–5c zero retired-id findings on migrated fixture; `check_duplicates.cjs`, `measure_harness.cjs`, `check_shell_quoting.cjs`, `check_pipeline_handoff.cjs`, `configure_autoload.py --check` exit 0.
- AC5 → `test-install.js`: checksum `config.json`/`STACK.md`/`MEMORY.md`/`CHANGELOG.md` before/after `update` identical. Negative NS4: tamper probe fails.
- AC6 → `test-install.js`: second `update` → empty `git diff`-equivalent + exit 0 + zero retired ids.
- AC7 → `test-consumer-migration.js` existing live-reference scan (extended patterns incl. ten `ws-*` only; bare ids excluded from `STALE` by false-positive rule) + `rg` over managed sources zero hits (MEMORY/CHANGELOG exempt).
- Sabotage verification: pre-fix fixture run reproduces hits (NS1); partial-migration run (templates only, manifest untouched) fails `update`/`uninstall` (NS2) — covered by running fixture with step-4 prune disabled once during development (not a committed test).

## 6. Invariants (Do Not Violate)

- SoT: edit skill bodies only under `.agents/skills/`; installer inputs `bin/skill-dependencies.json` + `bin/cli.js`; never invent parallel roots.
- Portability: `{skillsRoot}`/`{sharedDir}`/`{globalSkillsRoot}`/`{plansDir}` tokens + `config.json` keys only; no hardcoded consumer paths; no host/IDE product coupling.
- Preservation: `config.json` user values, `STACK.md`, `MEMORY.md`, `memory/*`, `CHANGELOG.md` byte-identical (AC5); `installed-skills.json` changes limited to retired-id prune/map.
- Integrity: `npm run generate-integrity` + `npm run verify-integrity` same commit when hashed content changes; `ws-check-harness` clean before ship.
- Overwrite hygiene: `syncManagedSkillDir` → `pruneManagedSkillExtras` after every skill-dir copy (no dest-only leftovers); single-runtime Node `.cjs` for new helpers.
- Step-1 scope: write plan/index artifacts only; no product edits, no commit.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot / installer-cli / tests).
- [ ] Retired→canonical map + bare-id prune list centralized (no scattered literals).
- [ ] Consumer-owned preservation verified by checksums.
- [ ] Idempotent second `update` verified.
- [ ] Integrity manifest regenerated + verified.
- [ ] Test cases cover all ACs (AC1–AC7) + NS1–NS4 probes.

## 8. Open Questions — resolved (autoMode, Step 2 interview)

- ~~Pointer vs doc for AC3~~ → RESOLVED: both. Seed thin local `ws-shared/AGENTS.md` pointer when the project hub lacks it (inside `.agents/skills/`, allowed — `AGENTS.md` is whitelisted and not consumer-owned; normal `update` already refreshes it) AND document `{globalSkillsRoot}` fallback order in `config-resolution.md`. Keeps `rules.harness` local-first. Evidence: `bin/install-rules.js` `HUB_WHITELIST` includes `AGENTS.md`; `CONSUMER_OWNED_HUB_FILES` excludes it; `bin/cli.js` `ensureSharedHubInstalled` header forbids only writes outside `.agents/skills/`.
- ~~Whether `syncInstalledSkillsManifest` needs a code change or just an ordering assertion~~ → RESOLVED: ordering assertion only. Prune-then-sync order already holds on both install and update paths (`ensureSharedHubInstalled` prune precedes `syncInstalledSkillsManifest`; sync base reads the pruned manifest). Add post-sync zero-retired fail-closed assertion; no change to sync merge logic. Minimal diff wins.

## Interview registry

| id | class | section | gap | recommendation | status | resolution | resolutionSource | evidence / dependsOn |
|----|-------|---------|-----|----------------|--------|------------|------------------|----------------------|
| G1 | scope | §2–§3 | `RETIRED_SKILL_DIRS` + manifest prune miss six bare ids; no canonical map export | Add `RETIRED_BARE_IDS` + `RETIRED_TO_CANONICAL`; prune `skills`/`selected` only for bare ids | closed | Prune bare ids from manifest lists; never `rmSync` bare ids as folders; export map via `bin/consumer-migration.js` | project | `.agents/skills/ws-shared/scripts/retired_artifacts.cjs:24-39,169-193`; `bin/consumer-migration.js:8-15` |
| G2 | correctness | §2 | `config.json.example` cites retired provider script paths | Fix to `ws-spec-provider-github` / `ws-spec-provider-azure-devops` | closed | Edit two `issueToSpecScript`/`workItemToSpecScript` values; sweep siblings | project | `.agents/skills/ws-shared/config.json.example:89,98` |
| G3 | ordering | §2–§3 | `syncInstalledSkillsManifest` re-merge risk | Post-sync zero-retired assertion; no sync logic change | closed | Keep prune-then-sync; assert after sync, fail closed | project | `bin/cli.js:628-676` (prune inside hub refresh), `1771-1779` (sync after), `1255-1260` (install order) |
| G4 | scope | §2/AC3 | Hybrid `rules.harness` unresolvable when local `AGENTS.md` absent | Pointer + doc fallback (both) | closed | Seed thin pointer inside `.agents/skills/` on missing edge; document `{globalSkillsRoot}` order in `config-resolution.md`; keep local-first default | project | `bin/install-rules.js:11-40,55-65`; `bin/cli.js:622-627`; `.agents/skills/ws-shared/scripts/resolve_consumer_root.cjs:99-107` |
| G5 | correctness | §3 | `autoload.md` refresh mechanism | Hub-refresh overwrite (managed, not consumer-owned) suffices; confirm zero hits | closed | No id-map code for autoload body; rely on `HUB_WHITELIST` overwrite + `rg` check | project | `bin/install-rules.js:11-40`; spec Prior Work `3479171b` rename window |
| G6 | DoR | §5 | Failing-test baseline per audit rule | NS1–NS4 + sabotage probes named | closed | Already satisfied: §5 maps AC1–AC7 + NS1–NS4; sabotage runs are dev-only, not committed | project | spec `## Negative & Failing Test Scenarios`; plan §5 |
| G7 | trap-High | §6 | `pruneManagedSkillExtras` hygiene after copies | Enforce via `syncManagedSkillDir` on every skill copy | closed | Invariant added; pointer seed is a single managed file, not a skill tree | project | memory `2026-09-03-install-prune-managed-extras.md`; `bin/cli.js:617-620` |
| G8 | trap-High/Med | §2–§3 | `STALE_LIVE_REFERENCE_PATTERNS` symmetry vs false positives; Phase 4 `rg` MEMORY exemption | Ship map with precise `ws-*` patterns only; keep MEMORY/CHANGELOG exemptions | closed | No bare-word STALE rows for generic bare ids; keep exemptions in new recipes | project | memory `2026-08-27-fix-pr-stale-live-reference-parity.md`; memory `2026-08-27-phases-rg-memory-exempt.md`; `retired_artifacts.cjs:58-83` |
| G9 | trap-Med | §2–§4 | Hybrid/secondary-target + handoff resolution symmetry; single-runtime scripts | Use `resolveSkillMdPath` vocabulary; Node `.cjs` only; symmetric update/install/uninstall handling | closed | Invariants added; doc fallback references existing resolver | project | memory `2026-08-27-pipeline-handoff-hybrid-resolution.md`; memory `2026-08-27-doctor-global-hub-retired.md`; memory `2026-09-03-installer-secondary-target-symmetry.md`; memory `2026-08-26-avoid-dual-node-python-scripts.md` |

gateDecision: auto-confirmed (autoMode=true, force_interview satisfied by sweep + auto-fallback per Grilling Protocol step 3); shared_understanding: confirmed; blocking_open: 0.
