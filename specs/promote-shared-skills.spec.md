---
id: null
slug: promote-shared-skills
title: "Promote shared skills to first-class installable packages"
source: local
specDate: 2026-07-16
---

# Specification — Promote shared skills to first-class installable packages

## Description

Today, several workflow-agnostic skills live only under `.agents/skills/shared/` (`caveman`, `gabarito`, `karpathy-guidelines`, `spec-format`, `goal-loop`, `self-learning`, `changelog`). They are shipped as nested content inside the `shared/` folder. The interactive installer (`bin/cli.js`) lists top-level directories only, so those nested skills are not first-class installable units. When a consumer installs `spec-to-pr` or `spec-to-pr-lite`, the CLI bulk-copies all of `shared/` (skills plus config/docs) via `ensureSharedInstalled`. Consumers cannot install a single promoted utility (for example `caveman` alone) without taking the whole shared tree.

This feature promotes those seven skill folders out of `shared/` into sibling top-level skill directories under `.agents/skills/` (same level as `spec-to-pr`, `00-write-spec`, `secrets-leak-review`, etc.). After promotion they appear in the install menu and can be selected individually or via install packages.

**What moves (skill folders):**

| Skill | Current path | Target path |
|-------|--------------|-------------|
| `caveman` | `.agents/skills/shared/caveman/` | `.agents/skills/caveman/` |
| `gabarito` | `.agents/skills/shared/gabarito/` | `.agents/skills/gabarito/` |
| `karpathy-guidelines` | `.agents/skills/shared/karpathy-guidelines/` | `.agents/skills/karpathy-guidelines/` |
| `spec-format` | `.agents/skills/shared/spec-format/` | `.agents/skills/spec-format/` |
| `goal-loop` | `.agents/skills/shared/goal-loop/` | `.agents/skills/goal-loop/` |
| `self-learning` | `.agents/skills/shared/self-learning/` | `.agents/skills/self-learning/` |
| `changelog` | `.agents/skills/shared/changelog/` | `.agents/skills/changelog/` |

**What stays under `.agents/skills/shared/` (not skills; shared config/docs hub):**

- `config.json` / `config.json.example` / `config.schema.json`
- `tools.md`, `stack.md`, `setup.md`
- `gates.md`, `config-resolution.md`
- `AGENTS.md` (shared hub docs), `.gitignore`

`shared/` remains the dual-mode config and gate documentation home. It is no longer a container for installable skill packages. Install/update must still ensure `shared/` config/docs are present when any workflow (or workflow package) is installed, without treating `shared/` itself as a skill in the selectable skill list.

**Install packages (installer menu):**

1. **Full package** — select/install every available top-level skill (plus ensure `shared/` config/docs hub).
2. **Workflows package** — workflow orchestrators (`spec-to-pr`, `spec-to-pr-lite`) plus their pipeline/provider dependency skills and the promoted shared skills those workflows require.
3. **Extra package** — standalone-useful skills that do not require the workflows package (review/audit, design, harness utilities, and other non-workflow extras). Selecting Extra must not force install of workflow orchestrators.
4. **Individual selection** — existing per-skill toggle UX, enhanced so selecting a skill also marks its declared dependencies (smart dependency selection).

**Dependency map:**

Introduce a maintained dependency map (machine-readable, used by the installer) that declares which skills depend on which other skills. Whenever the installer or skill graph is revised, the map must be updated in the same change. The interactive menu uses the map so that toggling a skill on also toggles on its transitive dependencies. Toggling a skill off must not silently leave dependents selected without a clear rule (document the rule in Notes / plan): recommended behavior is to keep already-selected dependents selected and only auto-add deps on select-on.

**Static site:**

Update `bin/build-site.js` / `docs/index.html` so the catalog includes a dedicated **Installation packages** section describing Full, Workflows, Extra, and Individual selection (membership summary + how deps work).

**Harness / indexes:**

Update root `AGENTS.md`, packaged `.agents/AGENTS.md`, and any routing tables so promoted skills are indexed at their new top-level paths. Remove or rewrite obsolete guidance that forbids top-level `.agents/skills/karpathy-guidelines/` (that note contradicts this promotion). Update relative links inside skills that currently point at `../shared/<skill>/`.

**Preservations (must not regress):**

- Consumer `shared/config.json` remains preserved on update/reinstall.
- Consumer `self-learning/memory/` (and compiled `MEMORY.md` when present) remains preserved on update/reinstall after the folder moves to `.agents/skills/self-learning/`.
- Dual-mode config resolution continues to use `.agents/skills/shared/config.json` only.

**Out of scope for this feature:**

- Changing workflow FSM step semantics.
- Renaming skill `name:` frontmatter values.
- Moving config/docs out of `shared/`.
- Committing consumer `config.json`.

## Acceptance Criteria

- AC1: The seven skills listed above exist as top-level folders under `.agents/skills/<skill>/SKILL.md` and no longer exist as `.agents/skills/shared/<skill>/SKILL.md`.
- AC2: `.agents/skills/shared/` still contains the config/docs hub files (`config.json.example`, `config.schema.json`, `tools.md`, `stack.md`, `setup.md`, `gates.md`, `config-resolution.md`, and related non-skill docs) and does not contain the seven promoted skill folders.
- AC3: The interactive installer (`bin/cli.js`) lists each promoted skill as its own selectable entry (same level as other top-level skills). `shared/` is not presented as a selectable skill package.
- AC4: The installer exposes package actions for **Full**, **Workflows**, **Extra**, and continues to support **Individual** per-skill toggles. Selecting a package marks the correct membership set before install.
- AC5: **Full** selects all installable top-level skills and ensures the `shared/` config/docs hub is installed/updated.
- AC6: **Workflows** selects workflow orchestrators plus their required pipeline/provider/promoted-dependency skills, and ensures the `shared/` config/docs hub is installed/updated. It does not require Extra-only skills that are not workflow dependencies.
- AC7: **Extra** selects standalone non-workflow skills that can be installed without installing `spec-to-pr` / `spec-to-pr-lite`. Extra may include promoted utilities that are useful alone (for example `caveman`) without forcing workflow orchestrators.
- AC8: A machine-readable **dependency map** exists in-repo (path decided in plan; e.g. under `bin/` or `.agents/skills/`). The installer loads this map for smart selection.
- AC9: In Individual (and when applying packages), selecting a skill automatically selects its declared transitive dependencies. The map is kept in sync whenever installer skill membership or dependency edges change (same PR / same change set).
- AC10: Installing or updating any workflow skill (or the Workflows/Full package) still installs/updates the `shared/` config/docs hub. Consumer `shared/config.json` is never overwritten.
- AC11: After promotion, update/reinstall preserves consumer `self-learning/memory/` (and existing consumer `MEMORY.md` when present) under the new `.agents/skills/self-learning/` path. Upstream does not clobber consumer memory files.
- AC12: All in-repo references to promoted skills (skill bodies, root `AGENTS.md`, packaged `.agents/AGENTS.md`, `config.json.example` / schema defaults for `rules.karpathyGuidelines`, `check-harness` diagrams, site generator path resolution) resolve to the new top-level paths. Obsolete “do not use top-level karpathy” guidance is removed or inverted to match the new layout.
- AC13: `bin/build-site.js` regenerates `docs/index.html` with a dedicated **Installation packages** section documenting Full, Workflows, Extra, and Individual selection (and dependency auto-select behavior at a high level).
- AC14: `npm run tests -- --local` (or equivalent install verification in `test/`) covers: promoted skills installable as top-level folders; package membership or dependency auto-select behavior as practical; `config.json` preserve; `self-learning/memory/` preserve after the path move. Existing preserve regressions remain green.
- AC15: `check-harness`-relevant indexes/routing stay consistent with disk inventory after the move (no phantom `shared/<skill>` routes; no broken relative links to promoted skills).

## Notes

### Current installer behavior (baseline)

- `listSkillDirs` returns every first-level directory under `.agents/skills/`, including `shared` today as one opaque folder.
- Nested skills under `shared/` are not individually listed.
- `ensureSharedInstalled` copies the entire `shared/` tree when `spec-to-pr` or `spec-to-pr-lite` is installed/updated, preserving `config.json` and `self-learning/memory/` / `MEMORY.md`.
- After promotion, `ensureSharedInstalled` (or successor) must copy only the config/docs hub, while promoted skills install via normal top-level skill copy + dependency map.

### Suggested package membership (plan may refine)

| Package | Includes (illustrative) |
|---------|-------------------------|
| Full | All top-level skills + `shared/` hub |
| Workflows | `spec-to-pr`, `spec-to-pr-lite`, `00`–`11`, providers, `goal-loop`, `spec-format`, `caveman`, `gabarito`, `karpathy-guidelines`, `self-learning`, `changelog`, harness helpers required by workflows, + `shared/` hub |
| Extra | Review/audit skills, design skills, `write-a-skill`, and other non-orchestrator utilities; may overlap with promoted utilities without pulling orchestrators |

Exact membership lists belong in the dependency/package map implemented with the installer.

### Dependency edges (illustrative; finalize in map)

- `spec-to-pr` / `spec-to-pr-lite` → pipeline skills they dispatch + promoted utilities they auto-load + `shared/` hub (hub is not a skill entry).
- `goal-fix-pr` → `goal-loop`, `09-fix-pr`.
- `00-write-spec` / providers → `spec-format`.
- Review skills referencing `karpathy-guidelines` → `karpathy-guidelines` when those edges are declared.
- Prefer declaring **required install deps** (must be on disk) separately from **autoload behavioral refs** if that keeps Extra lean; document the distinction in the map format.

### Migration / consumer impact

- Existing consumers with nested `shared/caveman` etc. need an update path: either migrate nested skill folders to top-level on `update` / `update --include-new`, or document a one-time reinstall. Prefer automatic migration that preserves `config.json` and `self-learning/memory/`.
- Relative links of the form `../shared/caveman/SKILL.md` become `../caveman/SKILL.md` (from sibling skills).
- `rules.karpathyGuidelines` default in example config should point at `.agents/skills/karpathy-guidelines/SKILL.md`.
- `self-learning` scripts/docs that hardcode `.agents/skills/shared/self-learning/...` must be updated.

### Verification

- Build/site: `node bin/build-site.js`
- Tests: `npm run tests -- --local`
- Harness: run `check-harness` after implementation (Phases 0–5c) before merge to `main`.

### Language / ownership

- Spec, skills, installer UX strings, and site copy: **en-us** only.
- Canonical upstream remains this repository; consumer in-place edits remain overwrite-on-update except preserved config and self-learning memory.
