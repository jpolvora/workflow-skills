---
id: null
slug: agents-skills-as-sot
title: "Refactor skill SoT from src/skills to .agents/skills"
source: local
specDate: 2026-08-08
---

# Specification — Refactor skill SoT from src/skills to .agents/skills

## Description

### Problem

Upstream skill authoring currently treats `src/skills/ws-*` as the only skill-content Source of Truth (SoT), with `.agents/skills/ws-*` as a dogfood mirror kept in sync via `scripts/sync-skills.js` (`npm run sync-skills`). That dual-tree layout creates lag, false harness confidence when dogfood diverges, extra gitignore rules, and repeated path special-casing in the installer, integrity hashing, site builder, tests, hubs, and `ws-check-*` skills.

### Goal

Make **`.agents/skills/ws-*` the sole upstream skill-content SoT**. Author, package, hash, audit, and install from that tree. Remove the `src/skills` authoring layout and the sync bridge.

### Required behavior

1. **Move** all skill packages and hub templates from `src/skills/` into `.agents/skills/` (preserving folder ids `ws-*`, scripts, refs). Delete the emptied `src/skills/` tree (and `src/` if nothing else remains under it).
2. **Preserve consumer-owned hub data** under `.agents/skills/ws-shared/` (`config.json`, `config.local.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, `skill-integrity-local.json`, optional `CHANGELOG.md`, `.gitignore`) — never treat those as publishable SoT templates; keep them gitignored / excluded from the npm package the same way `src/skills/ws-shared` exclusions work today.
3. **Retarget packaging & tooling** so install/update/uninstall, integrity generate/verify, site catalog, and tests read skill bodies from `.agents/skills` (package root), not `src/skills`.
4. **Update hubs and docs** (`AGENTS.md`, `.agents/AGENTS.md`, `ws-shared/AGENTS.md`, `SKILL_AUTHORING.md`, `README.md`, site copy as needed) so every “edit SoT under `src/`” / “promote into `src/`” / “dogfood sync” contract becomes “edit under `.agents/skills`”.
5. **Update `ws-check-harness` (and `ws-check-workflows` if it hardcodes `src/skills`)** so upstream Install mode SoT evidence and Skills scan root are `.agents/skills` (aligned with `{skillsRoot}`). Remove dogfood-lag / SoT-id-equivalence exceptions that existed only because dogfood lagged `src/skills`.
6. **Remove** `scripts/sync-skills.js`, the `package.json` `sync-skills` script, and all docs/tests that instruct maintainers to run it.
7. **Invert gitignore** so tracked skill bodies under `.agents/skills/ws-*/` are versioned; keep ignoring consumer-owned hub files only.

Hybrid global/local install scopes, project-config override, and consumer install targets (`.agents/skills` project-local or `$HOME/.agents/skills` global) stay unchanged — only the **upstream package source tree** moves.

## Acceptance Criteria

- AC1: After the move, every former `src/skills/ws-*/` package (including `ws-shared` templates/examples/AGENTS/tools/gates/config schema) lives under `.agents/skills/ws-*/`; `src/skills/` no longer exists as the skill SoT, and no installer/integrity/site path still requires `src/skills` for skill content.
- AC2: Consumer-owned files under `.agents/skills/ws-shared/` remain non-published (gitignored and excluded from `package.json` `files` / integrity hub hashing the same class of paths as today); fresh install still seeds from templates/examples only and never overwrites consumer config/MEMORY/STACK/CHANGELOG/memory on update.
- AC3: `bin/cli.js`, `bin/skill-integrity-lib.js`, `bin/generate-skill-integrity.js`, and `bin/build-site.js` resolve the package skills directory to `.agents/skills` (not `src/skills`); `npm run generate-integrity` / `npm run verify-integrity` and install pre-verify succeed against that tree.
- AC4: `package.json` `files` ships `.agents/skills/` (with consumer-owned exclusions) instead of `src/skills/`; `npm run test` / install dry-runs pass with updated `test/` path expectations (no `src/skills` fallbacks required for SoT).
- AC5: Root `AGENTS.md`, `.agents/AGENTS.md`, packaged `ws-shared/AGENTS.md`, `SKILL_AUTHORING.md`, and human `README.md` (and catalog/site text when it documents SoT) state that **`.agents/skills` is the upstream skill-content SoT**; remove “promote dogfood into `src/`”, “author only in `src/`”, and “run `sync-skills`” obligations.
- AC6: `ws-check-harness` Phase 0 upstream detection uses package markers **and** SoT evidence under `.agents/skills` (≥1 `.agents/skills/ws-*/SKILL.md`); Skills scan root for Install mode `upstream` is `.agents/skills`; Install mode `consumer` still scans project `{skillsRoot}` / `{globalSkillsRoot}` without inventing inventory from a removed `src/skills` path.
- AC7: `ws-check-harness` docs (`SKILL.md`, `PHASES.md`, `REPORT-FORMAT.md`) drop dogfood-lag / install-path↔`src/skills` SoT-id equivalence rules; hub literals under `.agents/skills/...` are filesystem-true for both upstream and consumer when that tree is the scan root. Integrity Phase 3 item 7 remains upstream-only against hashed `.agents/skills` content.
- AC8: `ws-check-workflows` (skill body, scripts, docs) has no remaining hard dependency on `src/skills` as SoT; any skill-path discovery uses `.agents/skills` / `{skillsRoot}` consistently with the new contract.
- AC9: `scripts/sync-skills.js` is deleted; `package.json` has no `sync-skills` script; grep across hubs/docs/skills/tests finds no remaining required `npm run sync-skills` / `scripts/sync-skills.js` maintainer step.
- AC10: `.gitignore` no longer ignores all `.agents/skills/ws-*/` skill bodies as “generated from src”; only consumer-owned hub paths remain ignored as appropriate; skill packages are commit-able from `.agents/skills`.
- AC11: Language stays en-us; no IDE/host product coupling; no absolute author-machine paths in the portable skill/installer contract.
- AC12: Definition of done includes: `npm run generate-integrity && npm run verify-integrity` exit 0; `npm run test` exit 0; `ws-check-harness` at package root reports Install mode `upstream` with Skills scan root `.agents/skills` and 0 critical findings attributable to the SoT move.

## Notes

- **In scope:** move of skill trees; installer/integrity/site/tests; hubs + README + SKILL_AUTHORING; `ws-check-harness` + `ws-check-workflows`; remove sync script; gitignore/`package.json` files list; regenerate `bin/skill-integrity.json`.
- **Out of scope:** changing consumer install destinations; changing hybrid config precedence; renaming skill ids; new pipeline features; migrating historical plan artifacts that merely *mention* `src/skills` (update live contracts only; archived specs may stay as history).
- **Supersedes (contract direction):** prior SoT specs/plans that mandate `src/skills` as the only upstream skill-content SoT (e.g. `src-sot-and-hybrid-global-install`, `check-harness-upstream-sot` scan-root = `src/skills`). Hybrid install/config behavior from those efforts remains; only the authoring SoT path flips back to `.agents/skills`.
- **Risk note:** `assertNotSelfOverwrite` / “refuse install into source repo” must still recognize the upstream package root after SoT lives under `.agents/skills` (detection must not confuse upstream SoT with a consumer install tree solely because paths share the `.agents/skills` name).
- **Suggested follow-up:** `ws-write-plan` → implement in a single coordinated PR (move + retarget + harness + delete sync); ship via upstream `ws-ship-pr` gate (tests, integrity, harness, hub drift, site bump if catalog/SoT narrative changed).
