---
id: 272
slug: us-272
title: Update leaves retired skill ids in ws-shared/autoload.md + installed-skills.json; global-hybrid install has no local ws-shared/AGENTS.md for rules.harness
source: github
specDate: 2026-09-03
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/272"
step: 0
workflowId: us-272-20260903T165000Z
status: active
startedAt: "2026-09-03T16:50:00Z"
endedAt: "2026-09-03T17:02:06.588Z"
acRefs: []
---
# Specification — Update leaves retired skill ids in ws-shared/autoload.md + installed-skills.json; global-hybrid install has no local ws-shared/AGENTS.md for rules.harness

## Description

After the `ws-*` skill rename wave (for example `ws-write-spec` to `ws-spec-write`, `ws-sync-spec` to `ws-spec-update`, `ws-multi-spec` to `ws-spec-multi`, `ws-local-spec-provider` to `ws-spec-provider-local`, `ws-verify-plan` to `ws-plan-verify`, `ws-github-provider` to `ws-spec-provider-github`, `ws-azure-devops-provider` to `ws-spec-provider-azure-devops`, `ws-write-plan` to `ws-plan-write`, `ws-update-plan-implementation` to `ws-plan-update`, `ws-interview` to `ws-plan-interview`), a consumer tree installed before the renames keeps stale references in installer-managed files. The installer `update` refreshes skill bodies but does not migrate references embedded in hub templates and tracking files, so `ws-check-harness` keeps flagging retired ids. A related gap: a global (`--global`) hybrid install leaves no project-local `ws-shared/AGENTS.md`, while `config.json` `rules.harness` defaults to that local path, forcing agents into a manual fallback.

Scope is the installer update path (`bin/cli.js`, `bin/skill-dependencies.json`, hub templates under `.agents/skills/ws-shared/`, and the `installed-skills.json` tracking file) plus the `rules.harness` default/pointer for global-hybrid layouts. The fix must make `update` idempotent: refreshing managed hub templates to canonical ids, pruning or mapping retired ids in `installed-skills.json`, and ensuring the harness entrypoint resolves locally or via a documented global fallback. Consumer-owned data (`config.json` values, `STACK.md`, `MEMORY.md`, `memory/*`, `CHANGELOG.md`) must be preserved. No new skills and no host-specific coupling; portable `{skillsRoot}` / `{sharedDir}` / `{globalSkillsRoot}` vocabulary only.

## Acceptance Criteria

- AC1: After running installer `update` on a pre-rename consumer tree, project-local `ws-shared/autoload.md` contains zero retired skill ids (`ws-write-spec`, `ws-sync-spec`, `ws-multi-spec`, `ws-local-spec-provider`, `ws-verify-plan`, `ws-github-provider`, `ws-azure-devops-provider`, `ws-interview`, `ws-write-plan`, `ws-update-plan-implementation`) and all `../ws-*/SKILL.md` link targets resolve under project `{skillsRoot}` or `{globalSkillsRoot}` hybrid resolution.
- AC2: After running installer `update`, consumer `installed-skills.json` contains zero retired ids (the ten `ws-*` retired ids plus legacy bare ids `azure-devops`, `caveman`, `code-review`, `fix-pr`, `plan-us`, `us-delivery-workflow` are pruned or mapped to canonical ids) and a subsequent `update`/`uninstall` operates only on installed canonical skills.
- AC3: On a global-hybrid install (skills under `{globalSkillsRoot}`, project-local `ws-shared/` with consumer data only), the configured `rules.harness` path resolves: either the installer seeds a thin local `ws-shared/AGENTS.md` pointer to the global hub, or the `rules.harness` default plus comment documents the `{globalSkillsRoot}` fallback, so an agent reading the configured path succeeds without manual fallback.
- AC4: `ws-check-harness` Phases 0-5c on the updated consumer hybrid fixture reports no retired-id findings for `autoload.md` / `installed-skills.json` / harness resolution, and the four mechanical gates (`check_duplicates`, `measure_harness`, `check_shell_quoting`, `check_pipeline_handoff`) plus `configure_autoload.py --check` still exit 0.
- AC5: `update` preserves consumer-owned data: project `config.json` user values, `STACK.md`, `MEMORY.md`, `memory/*`, and `CHANGELOG.md` remain byte-identical except for explicitly migrated keys documented in the plan.
- AC6: Re-running installer `update` a second time on the migrated tree is idempotent: no additional file diffs, exit code 0, and no re-introduction of retired ids.
- AC7: Any other shipped template embedding skill ids or links (hub templates beside `autoload.md` refreshed by `update`) uses canonical ids after migration; a repo-wide search for the retired ids across managed template sources returns zero hits.

## Original Issue Context

Source: github, id: 272, url: https://github.com/jpolvora/workflow-skills/issues/272, state: open.

Human-authored summary: after the `ws-*` renames, a consumer tree installed before the renames keeps stale references in managed files. Running installer `update` refreshes skill bodies but does not migrate these references, so `ws-check-harness` keeps flagging retired ids. Related gap: global (`--global`) hybrid install leaves no local `ws-shared/AGENTS.md` while `config.json` `rules.harness` defaults to that local path. Found via `ws-check-harness` Phases 0-5c (Install mode: consumer, hybrid global+local); all four mechanical gates exit 0 and `configure_autoload.py --check` reports ok.

Problem 1 — managed `ws-shared/autoload.md` still cites retired ids throughout: Specs vocabulary table (`ws-local-spec-provider`, `ws-write-spec`, `ws-sync-spec`, `ws-multi-spec`), Specs skill router links (`../ws-write-spec/SKILL.md`, `../ws-local-spec-provider/SKILL.md`, `../ws-sync-spec/SKILL.md`, `../ws-multi-spec/SKILL.md`), keyword map, Hub contracts (`../ws-verify-plan/SKILL.md`, `ws-verify-plan`), flow diagram (`ws-github-provider` / `ws-azure-devops-provider` fetch), and complement rules, while the canonical global hub uses the new `ws-spec-*` / `ws-plan-verify` ids. The `../ws-<retired-id>/SKILL.md` targets are phantom under both project and global roots, failing Phase 2 existence checks. Expected: `update` refreshes managed hub templates to canonical ids or ships an id-migration step alongside folder renames.

Problem 2 — `installed-skills.json` retains retired ids (`ws-interview`, `ws-verify-plan`, `ws-write-plan`, `ws-update-plan-implementation`, `ws-sync-spec`, `ws-multi-spec`, `ws-local-spec-provider`, `ws-github-provider`, `ws-azure-devops-provider`, plus legacy bare ids). Expected: `update` prunes or maps them so future updates/uninstalls operate on real skills.

Problem 3 — global-hybrid `rules.harness` target missing locally: default `.agents/skills/ws-shared/AGENTS.md` has no local file (only `config.json`, `autoload.md`, `STACK.md`, `MEMORY.md`, `CHANGELOG.md`); the global hub has it. Expected: seed a thin local hub pointer or document the `{globalSkillsRoot}` fallback.

Generic repro: pre-rename consumer tree with global skills plus local `ws-shared/` consumer data; run `ws-check-harness` or search retired ids across `autoload.md`, `installed-skills.json`, `config.json`; observe retired-id hits plus missing local `AGENTS.md`.

### Prior Work Sweep

Sweep ran 2026-09-03: `sweep_prior_work.py --issue 272 --keywords autoload retired installed-skills harness --files .agents/skills/ws-shared/autoload.md` plus plan-history search `--slug us-272 --keyword autoload retired harness`.

- Related merged PRs referencing #272: #86 (MEMORY consult + verify.sh hardening), #207 (ws-audit runtime 0.3.18), #182 (autoload hub overlap audit + configure-project root AGENTS.md 0.0.120), #270 (develop-to-main release: multi-host global targets, site revamp, host binding v2), #231 (0.3.34 Extra catalog + specify-time closure), #184 (0.3.0 release + delivery backlog). None migrates retired ids in managed consumer templates; #182 and #270 are the closest autoload/hybrid priors.
- Commits touching `.agents/skills/ws-shared/autoload.md` (recent): 3479171b (0.3.56 family rename to `ws-{family}-{verb}`), dd9e63df (0.3.55 spec-memo bridge wording), 3122f064 (spec-memo docs), e8b03ca0 / 1be7feb9 (ws-doctor-json-esm), a83a6d26 (spec prefix ordering), c0fa0de8 / 1f560cdf (#255 review-thread fixes), f59970af (ws-spec-memo), 2cade805 (minVerifyScore), d81a2079 (drop ws-patterns), 380695a5 (us-236 task-lifecycle + autoload opt-in). The rename commit 3479171b renamed bodies without a consumer-template migration step, which is the regression window for this issue.
- Plan history matches: `autoload-skills-overlap-audit` (score 3, step-00 spec + plan + verify report + result), `us-209` (score 3), `ws-doctor` (score 3), plus weaker hits (`check-harness-upstream-sot`, `configurable-consumer-autoload`, `deepseek-harness-improvements`, `provider-fetch-visual-attachments`). No prior plan covers retired-id migration in `installed-skills.json` or the global-hybrid `AGENTS.md` pointer, so duplicate risk is low.
- Implication for this spec: implement the migration inside the installer `update` path (templates + tracking file + harness pointer), not as consumer hand-edits, and cover it with a hybrid consumer fixture in tests.

### Design Intent

Modification of the installer update path, not greenfield. Current behavior: `update` (in `bin/cli.js`, driven by `bin/skill-dependencies.json` and `bin/skill-integrity.json`) refreshes skill-body folders under `{skillsRoot}` but leaves project-local managed hub copies (`ws-shared/autoload.md` and sibling templates) and the `installed-skills.json` id list untouched, preserving pre-rename ids. `rules.harness` in `config.json`/`config.json.example` points at the project-local `ws-shared/AGENTS.md`, which a `--global` hybrid install never seeds locally. The intended design after this change: `update` treats hub templates embedding skill ids/links as managed content (refresh or id-map them like skill folders), treats `installed-skills.json` as derived tracking state (prune/map retired ids to canonical ids per the dependency manifest), and guarantees harness resolvability for hybrid layouts via a seeded thin local pointer or an explicit documented global fallback. Verified against `bin/cli.js`, `bin/skill-dependencies.json`, and `.agents/skills/ws-shared/autoload.md` / `AGENTS.md` / `config.json.example` on `develop` at bootstrap commit c823de932037ab58d4949551dd257eae8fd6c8e3.

## Notes

- Retired-to-canonical map for migration: `ws-write-spec` to `ws-spec-write`, `ws-sync-spec` to `ws-spec-update`, `ws-multi-spec` to `ws-spec-multi`, `ws-local-spec-provider` to `ws-spec-provider-local`, `ws-verify-plan` to `ws-plan-verify`, `ws-github-provider` to `ws-spec-provider-github`, `ws-azure-devops-provider` to `ws-spec-provider-azure-devops`, `ws-write-plan` to `ws-plan-write`, `ws-update-plan-implementation` to `ws-plan-update`, `ws-interview` to `ws-plan-interview`; legacy bare ids have no canonical target and are pruned.
- Verification commands available without new tooling: `rg` for retired ids across managed files, `ws-check-harness` Phases 0-5c, the four mechanical gate scripts, `configure_autoload.py --check`, and `npm run generate-integrity` / `verify-integrity` when hashed content changes.
- Portable-path constraint: solution must use `{skillsRoot}` / `{sharedDir}` / `{globalSkillsRoot}` / `{plansDir}` tokens and `config.json` `rules.harness`; no hardcoded consumer paths and no host product coupling.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New skills or skill renames beyond the ten mapped retired ids | Issue is migration of existing references, not a rename wave |
| Consumer hand-editing guidance as the fix | Managed templates must be fixed by the installer, per issue |
| Migrating consumer-owned content (MEMORY entries, STACK choices, CHANGELOG history) | Explicitly preserved, not rewritten |
| Host-specific install layouts or IDE pointer files | Portable contract only; host adapters stay out of skills |
| Site rebuild or catalog copy changes unless CLI behavior text changed | Docs follow only if user-facing flags change |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Canonical id source | `bin/skill-dependencies.json` plus live `.agents/skills/ws-*` folders | Manifest and SoT tree already define canonical ids | y |
| Retired bare ids have no mapping | Prune `azure-devops`, `caveman`, `code-review`, `fix-pr`, `plan-us`, `us-delivery-workflow` from tracking | No canonical target exists for these legacy ids | y |
| Harness fix shape | Seed thin local `ws-shared/AGENTS.md` pointer when missing; keep `rules.harness` default local-first | Preserves existing config default while fixing hybrid resolution | y |
| Fixture coverage | Add or extend an installer test with a pre-rename hybrid fixture | Regression needs a reproducible pre/post `update` pair | y |
| Integrity regeneration | Regenerate `skill-integrity.json` in the same commit if hashed content changes | Harness change protocol requires it | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Migration limited to managed templates, tracking file, and harness pointer | Review plan diff touches only installer + hub template + tests |
| Atomic criteria | Each AC has one deterministic pass/fail check | Run AC ledger against step-00 spec before Step 1 |
| Failure modes named | Partial migration, second-run drift, and consumer-data loss each have a check | Inspect Negative scenarios and test plan |
| Observable signals | Harness audit and retired-id search commands identified | Run Validation section commands on fixture |
| Zero open blockers | No waiting input; issue body and prior-work sweep on file | Confirm issue JSON and sweep output exist in us-dir |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `rg -N "ws-write-spec|ws-sync-spec|ws-multi-spec|ws-local-spec-provider|ws-verify-plan|ws-github-provider|ws-azure-devops-provider|ws-interview|ws-write-plan|ws-update-plan-implementation" .agents/skills/ws-shared/autoload.md .agents/skills/ws-shared/installed-skills.json` returns zero hits after migration.
- `ws-check-harness` Phases 0-5c on the migrated hybrid fixture reports zero retired-id findings; `check_duplicates`, `measure_harness`, `check_shell_quoting`, `check_pipeline_handoff`, and `configure_autoload.py --check` each exit 0.
- `node bin/cli.js update` (fixture) exits 0; second run produces an empty diff; consumer `config.json`, `STACK.md`, `MEMORY.md`, `CHANGELOG.md` checksums unchanged.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0061-us-272.spec.md` exits 0.

### Negative & Failing Test Scenarios

- Pre-fix fixture run: retired-id search returns hits in `autoload.md` and `installed-skills.json`, and local `ws-shared/AGENTS.md` is absent while `rules.harness` points locally, reproducing all three issue sections before the fix.
- Partial-migration run (templates refreshed but tracking file untouched): `update`/`uninstall` still references phantom skill folders and fails or warns, proving both files must migrate together.
- Missing-pointer run (no local `AGENTS.md` seed and no fallback doc): agent harness resolution against the configured local path fails on a global-hybrid tree, proving the AC3 pointer/fallback is required.
- Destructive run (consumer `MEMORY.md` or `config.json` values altered by `update`): checksum comparison fails the run, proving preservation logic is required.
