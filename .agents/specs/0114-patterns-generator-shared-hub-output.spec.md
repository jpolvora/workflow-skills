---
id: null
slug: patterns-generator-shared-hub-output
title: "Store the generated ws-project-patterns body under the shared project hub"
source: local
specDate: 2026-09-21
---

# Specification — Store the generated ws-project-patterns body under the shared project hub

## Description

`ws-patterns-generator` currently seeds and refreshes its generated skill at `{skillsRoot}/ws-project-patterns/SKILL.md`, which places a consumer-owned artifact inside the published skills tree. Three problems follow: (a) `bin/skill-integrity-lib.js` `listInstallableSkills` enumerates every top-level directory with a `SKILL.md` and has no `externalSkills` exclusion, so the manifest (`bin/skill-integrity.json`) drifts as soon as the body exists; (b) the `ws-*` prefix makes the generated folder a scanned package dir for the Phase 5a harness gates; (c) a repo that dogfoods the harness (this upstream package) cannot generate the body without polluting its own source tree.

Change the generated artifact location to the shared project hub: `{sharedDir}/ws-project-patterns/SKILL.md` (default `.ws/ws-project-patterns/SKILL.md`), tracked in source control as consumer-owned content. The autoload row in `{sharedDir}/autoload.md` moves to the hub path, `configure_autoload.cjs` validates existence there, and the installer keeps excluding the id from install/update/uninstall. The body stays autoload-only: it is loaded through the Always-applied row, not by skills-root discovery.

Architecture touchpoints: `ws-patterns-generator` skill body plus `seed_generated_skill.cjs`; `configure_autoload.cjs` generator-managed row resolution; `hub-layout.json` plus the hub `.gitignore` template; `bin/skill-dependencies.json` `externalSkills` metadata; the affected test batteries; hubs and docs that name the generated path.

## Acceptance Criteria

- AC1: `node {skillsRoot}/ws-patterns-generator/scripts/seed_generated_skill.cjs --repo-root <dir>` writes `{sharedDir}/ws-project-patterns/SKILL.md` (hub root resolved from `pathTokens.sharedDir`, default `.ws`), exits 0, is byte-stable on rerun, never overwrites an existing body, and writes nothing under `--dry-run`.
- AC2: Symlink containment holds at the new location: a linked hub root, a linked `ws-project-patterns` directory, and a dangling leaf `SKILL.md` are each refused with no file created outside the repository, and in-repo links still seed (positive control).
- AC3: Seeding leaves the skills tree untouched: no `{skillsRoot}/ws-project-patterns` is created and `node bin/generate-skill-integrity.js --check` still exits 0 with the manifest unchanged (skill count unchanged) while the generated body exists.
- AC4: The `ws-project-patterns` Always-applied row is added to `{sharedDir}/autoload.md` at most once on the first seed and points at the hub path; `node {skillsRoot}/ws-configure-project/scripts/configure_autoload.cjs --write-autoload` keeps the row only while `{sharedDir}/ws-project-patterns/SKILL.md` exists and drops it when the tree is absent.
- AC5: The generated id remains outside installer management: `bin/cli.js` still excludes it via `excludeExternalSkillIds(...)`, `bin/skill-dependencies.json` keeps `externalSkills` `{ id: ws-project-patterns, sourcePackage: consumer, generatorManaged: true }`, and no `ws-project-patterns` entry appears in `.ws/installed-skills.json`.
- AC6: `{skillsRoot}/ws-shared/runtime/hub-layout.json` classifies the new hub path as consumer-owned/tracked content, the hub `.gitignore` template does not ignore it, and every doc that names the old generated path is updated (root `AGENTS.md`, `.ws/AGENTS.md`, `README.md`, `CATALOG.md`, `FEATURES.md`, generated site).
- AC7: Harness and batteries are green: `node test/test-ws-patterns-generator.js`, `node test/test-autoload-configure.js`, `node test/test-ws-shared-layout.js`, `node test/test-external-companion-skills.js`, `npm run test`, `ws-check-harness`, and `npm run generate-integrity` plus `npm run verify-integrity` all exit 0.
- AC8: Version bump and integrity: the release PR carries exactly one `package.json` version bump strictly above the merge-base, aligned `packageVersion` in `bin/skill-dependencies.json` plus site footer, and regenerated integrity in the same commit.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Migrating or deleting an existing `{skillsRoot}/ws-project-patterns` body | Latest-layout-only policy: no legacy migration shims. The installer already ignores that folder; removal is a manual consumer action. |
| Changing harvest sources, bullet format, or rewrite-vs-append rules | Generator behavior is unchanged; only the output location and its contracts move. |
| Renaming the generated skill id (`ws-project-patterns`) | Autoload row, installer exclusion, and opt-out phrase stay as shipped. |
| Making the generated body discoverable through skills-root scanning | It is autoload-only by design; the Always-applied row is the loader. |
| Host-specific projections (`compile_host_subagents.cjs`) for the generated skill | The body is a patterns document, not a step persona. |
| spec-memo/vault integration for harvested patterns | `ws-self-learning` already owns memory; the generator writes no MEMORY. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Hub root | `{sharedDir}` from `pathTokens.sharedDir` (default `.ws`) | Consumer-owned hub standard; project config wins | y |
| Generated path | `{sharedDir}/ws-project-patterns/SKILL.md` | Mirrors the skills-root layout under the hub; single row to autoload | y |
| Source control | Tracked in git | Harvested patterns are shared project knowledge reviewed in PRs | y |
| Legacy copies | Not migrated; documented as ignored | Portability rule: latest layout only, no dual defaults | y |
| Loading model | Autoload row only, no skills-root discovery | Body lives outside any skills root | y |
| Baseline dependency | `ws-patterns-generator` ships in the base branch (PR #383, develop → main) before this change lands | This spec modifies that skill | y |
| Auth, rate limits, concurrency, TTL, external-dependency failure | N/A: local single-writer file generation with no network calls | Dimensions absent | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Changes limited to the generator script plus skill body, autoload resolver, hub layout/gitignore template, external-skills metadata, tests, docs, version/integrity | Diff lists only those paths |
| Atomic criteria | AC1–AC8 each pass or fail | Authoring validate plus listed commands |
| Failure modes | Escape attempts refused (AC2); overwrite prevented (AC1); row dropped when tree absent (AC4); installer never manages the id (AC5) | Negative scenarios below |
| Observation telemetry | Seed stdout (`written` / `unchanged` / `planned`), autoload row diff, integrity check output, test exit codes | Validation notes commands |
| Stack invariants | typescript-node Node-subset enforced on the script and tests (validated inputs, contained paths, closed handles); en-us bodies with path tokens; no `.py` | `scan_stack_invariants.cjs`, `node --check`, `ws-check-harness` |
| Open blockers | None for implementation on `develop`; landing on `main` waits for PR #383 | Recorded in Notes |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Commands: `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0114-patterns-generator-shared-hub-output.spec.md` exits 0; the AC7 command list exits 0.
- Files: `.ws/ws-project-patterns/SKILL.md` exists after seed; `.ws/autoload.md` carries the hub-path row once; `bin/skill-integrity.json` unchanged by seeding.
- Cross-checks: `node bin/generate-skill-integrity.js --check` with the generated body present; `git status --porcelain` shows no `{skillsRoot}/ws-project-patterns` path after a generator run.

### Negative & Failing Test Scenarios

- Seeding still writes under `{skillsRoot}/` or ignores `pathTokens.sharedDir` (must fail AC1).
- A hub-root link, generated-dir link, or dangling leaf link escapes the repo (must fail AC2).
- The generated body appears in the integrity manifest or changes the skill count (must fail AC3).
- The autoload row keeps pointing at `.agents/skills/ws-project-patterns/SKILL.md`, is duplicated, or survives with the tree removed (must fail AC4).
- `ws-project-patterns` lands in `installed-skills.json`, or an update/uninstall removes the hub body (must fail AC5).
- Hub layout still classifies the body as a managed skill root, the ignore template drops it from git, or a doc still names the old path (must fail AC6).
- Any AC7 command exits non-zero (must fail AC7).
- Version unbumped or integrity stale in the release commit (must fail AC8).

## Notes

- Sequencing: implement on `develop` after PR #383 (`feat: add ws-patterns-generator skill (us-378)`) is merged or rebased, since this spec edits that skill.
- Tests to update: `test/test-ws-patterns-generator.js` (seed target, containment fixtures, autoload row, installer exclusion), `test/test-autoload-configure.js` (generator-managed row fixtures), `test/test-ws-shared-layout.js` (new hub-layout category or path), plus any CLI fixture asserting `listInstallableSkills` counts.
- `generatorManagedTreeExists` becomes hub-relative; keep the global-skills fallback check removed for generated ids (the body is project-local by definition).
- The generated body stays a plain patterns document: no host product names, secrets, personal data, or consumer-private paths; anonymize harvested traces to the failure class.
