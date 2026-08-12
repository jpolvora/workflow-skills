---
id: null
slug: ws-doctor
title: "ws-doctor — Workflow skills diagnostic inspector"
source: local
specDate: 2026-08-11
status: completed
---

# Specification — ws-doctor — Workflow skills diagnostic inspector

## Description

### Problem

Agents and maintainers lack a single, read-only diagnostic that answers “what is broken in this skills install right now?” Existing harness skills cover adjacent but different jobs:

- `ws-check-harness` audits meta-harness integrity (routing tables, portability, digests, topology) and produces a correction plan.
- `ws-show-harness` snapshots what is active in the current session.

Neither focuses on **runtime diagnosability** of installed `ws-*` skill packages: broken paths after token expansion, invalid tool-alias / script-launcher recipes, unparsable scripts, live `config.json` values and boolean switches, and missing companion / reference files that `SKILL.md` points at.

### Solution

Add a new Workflows-package harness skill **`ws-doctor`** that inspects and diagnoses the workflow-skills installation (project-local and/or hybrid global `{skillsRoot}` with project `{sharedDir}` config). Default mode is **read-only diagnose → report**; it does not apply fixes.

The skill MUST cover these diagnostic surfaces:

1. **Path errors** — after expanding `{skillsRoot}`, `{sharedDir}`, `{plansDir}`, `{specsDir}`, `{reviewsDir}`, and related tokens from `config.json` + `tools.md`, report missing or non-resolvable paths cited by skill bodies, hubs, and script recipes.
2. **Invalid tool calling / script parsing** — flag skill prose that invokes managed scripts without an explicit `python` / `node` / `bash` launcher; flag cited script paths that do not exist; run lightweight parse checks (`python -m py_compile`, Node syntax check, `bash -n` where available) on discovered skill scripts and report failures with file + error.
3. **Configuration values and switches** — load project `{sharedDir}/config.json` (schema-aware when `config.schema.json` is present); emit a structured summary of resolved identity, providers, verification commands, `defaults.*` boolean switches, `invariants.*`, `fable.*`, path tokens, and `rules.*` paths; mark empty / missing / schema-invalid fields.
4. **Missing reference files** — for each scanned `ws-*/SKILL.md`, resolve Markdown and brace-token links to companion docs (`PHASES.md`, `FORMAT.md`, `STEP-DISPATCH.md`, scripts, etc.) and report targets that do not exist on disk.

**Scope boundary:** `ws-doctor` diagnoses install/runtime health. It MUST NOT replace `ws-check-harness` Phases 0–5c (routing topology, portability policy, integrity digests, instruction-duplication audits) or `ws-show-harness` session snapshots. Hub routers may cross-link the three skills with clear “use when” wording.

**Package membership:** Workflows package (harness & review layer), registered in `bin/skill-dependencies.json`, root `AGENTS.md`, and `ws-shared/AGENTS.md` task routers. Author under `.agents/skills/ws-doctor/` per upstream SoT rules. Portability: en-us; no host product names in the skill body; use portable tool aliases from `tools.md`.

## Acceptance Criteria

- AC1: Skill package `.agents/skills/ws-doctor/` exists with `SKILL.md` (required frontmatter: `name`, `description`, `version`, `invocation_names` including `doctor` / `ws-doctor`) and loads with the banner `ws-doctor loaded.`
- AC2: Invocation `/ws-doctor` (and `@ws-doctor` / “diagnose skills” / “doctor the harness”) runs a read-only diagnose pass and emits a single structured report; default mode performs no file edits.
- AC3: Report section **Path errors** lists each broken or unresolvable path after path-token expansion, with skill id (or hub file), cited path, and expand result; healthy installs may emit `none`.
- AC4: Report section **Tool / script diagnostics** flags (a) managed-script invocations missing an explicit `python` / `node` / `bash` launcher per `tools.md` § Script launchers, (b) cited script paths that do not exist, and (c) skill scripts under `ws-*/scripts/` that fail lightweight parse checks, each with file path and error summary.
- AC5: Report section **Configuration** summarizes resolved `config.json` values relevant to skills execution: path tokens, `providers`, `verification.*`, `defaults` switches (`autoMode`, `dryRun`, `skipTesting`, `skipMutationTesting`, `skipTests`, `fullMode`, `scoreAndRefine`, `autoload`, `deliveryCommitArtifacts.*`), `invariants.*`, `fable.*`, and `rules.*` paths; marks missing file, schema-invalid fields, and empty required identity fields when detectable.
- AC6: Report section **Missing references** lists `SKILL.md` (and hub) links to companion/reference files that are absent on disk after token expansion; healthy installs may emit `none`.
- AC7: When `$PWD/.agents/skills/ws-shared/config.json` is missing, `ws-doctor` still runs path/script/reference checks against the resolved skills root but reports config as unavailable and recommends `ws-configure-project` via `user-gate` (or markdown fallback); it does not invent config values.
- AC8: Skill body is harness-neutral (no host product names; portable aliases only), en-us, and documents the boundary vs `ws-check-harness` (integrity/routing audit) and `ws-show-harness` (session snapshot).
- AC9: `ws-doctor` is registered in `bin/skill-dependencies.json` (Workflows package), root `AGENTS.md` skill catalog + task router, and `ws-shared/AGENTS.md` promoted harness list + consumer task router, with trigger text for diagnose/doctor intents.
- AC10: Optional flags are documented: `--skill <id>` (limit scan to one skill), `--json` (machine-readable report), and dry-run is the default (no separate fix-apply mode in v1).
- AC11: After content land, integrity digests are regenerated (`npm run generate-integrity` && `npm run verify-integrity` exit 0) and `ws-check-harness` reports 0 critical for the new skill id and dependency graph membership.

## Notes

- Out of scope for v1: auto-fixing broken links, rewriting skill bodies, running full `ws-check-harness` phases, session autoload snapshotting, secrets scanning (`ws-secrets-leak-review`), and adversarial claim audit (`ws-fable-judge`).
- Prefer a small Node or Python diagnostic script under `ws-doctor/scripts/` invoked with an explicit launcher; keep `SKILL.md` as the protocol + report contract.
- Hybrid installs: expand `{skillsRoot}` independently from `{sharedDir}`; never read project config from the global hub when a project hub exists.
- Related skills: `ws-check-harness`, `ws-show-harness`, `ws-configure-project`, `ws-write-a-skill`.
- Upstream authoring follows `SKILL_AUTHORING.md` and `ws-write-a-skill`.
