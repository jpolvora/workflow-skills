---
id: null
slug: npx-skills-installer-only
title: "Support only npx skills installer mode"
source: local
specDate: 2026-08-01
---

# Specification — Support only npx skills installer mode

## Description

Refactor this repository so the **sole supported consumer install path** is the open [skills](https://github.com/vercel-labs/skills) CLI (`npx skills`), matching the ecosystem pattern used by skill sources such as [mattpocock/skills](https://github.com/mattpocock/skills).

Today consumers install via a custom Node CLI (`npx github:jpolvora/workflow-skills` → `bin/cli.js` install/update/uninstall) with package shortcuts, dependency closure, integrity digests, and `ws-shared` hub seeding. That surface is proprietary to this repo and duplicates what `npx skills` already provides (discover, add, update, remove, project/global scope, multi-agent targets).

**Goal:** treat `jpolvora/workflow-skills` as a **skills.sh-compatible skill source**. Consumers install/update/remove only through `npx skills`. **Remove the previous / legacy consumer installer** (`npx github:jpolvora/workflow-skills` install/update/uninstall, `install-skills.sh`, and installer-only helpers). Relocate the published skill SoT to **`src/ws-*`** (flat `src/<skill-id>/` folders). **Update README.md and AGENTS.md** with the new layout structure. **Update `ws-check-harness` and `ws-check-workflows`** so path resolution works for the upstream `src/ws-*` SoT and for correct relative paths after install into the consumer skills target. **Update the website builder** so a new package/site version ships with the `npx skills` installer commands and catalog paths pointing at `src/ws-*`. **Update automated tests** (`test/`, integrity/harness/workflow checks) so they adhere to the new `src/ws-*` layout, `npx skills` install path, and post-install relative paths. Keep upstream authoring tooling (site build, integrity regenerate for release quality, harness tests, sync helpers) but **not** as a consumer installer.

### Evidence (verified)

- **Target source of truth for skill bodies is `src/ws-*`** — flat folders `src/<skill-id>/SKILL.md` where `<skill-id>` matches `ws-*` (e.g. `src/ws-write-spec/`, `src/ws-shared/`). This replaces both `.agents/skills/` and the interim `src/skills/` layout as the published SoT for `npx skills`, packaging, integrity hashing, and `bin/build-site.js` catalog scans.
- Today `bin/build-site.js` still scans `src/skills` and renders legacy install/package UX; it must be updated to scan `src/ws-*` and emit `npx skills` install copy, then regenerate `docs/index.html` with a version bump (`npm run build-site:bump`).
- `.agents/skills/` is **not** the SoT. It may exist only as an optional local dogfood sync target (e.g. sync from `src/ws-*` → `.agents/skills`) for upstream authoring sessions. It must not be the tree consumers install from.
- `npx skills add <path> --list` can discover skills under a `src/` tree via recursive discovery when that tree holds `*/SKILL.md` (verified with a minimal `src/skills/...` fixture; same mechanism applies to `src/ws-*/SKILL.md`).
- If both `.agents/skills/` and `src/ws-*` contain skill trees in a clone, skills CLI prefers known containers (`.agents/skills/`) and can hide/duplicate the SoT. Therefore the published install path must resolve to **`src/ws-*` only** (see AC2 / AC13).
- `ws-shared` has **no** `SKILL.md` today, so the hub is **not** installable via `npx skills`.
- Reference client [mattpocock/skills](https://github.com/mattpocock/skills): catalog under `skills/<category>/<name>/SKILL.md`, install via `npx skills@latest add mattpocock/skills`, post-install setup skill, no custom installer CLI. Our equivalent catalog root is **`src/` with `ws-*` skill folders** (not repo-root `skills/` and not `.agents/skills/`).
- skills CLI required frontmatter: `name` + `description` strings; optional `metadata.internal: true` to hide WIP skills.

### Recommended approach (simplest + efficient)

1. **Canonical skill tree = `src/ws-*`** (`src/<skill-id>/SKILL.md`). Move/rename from `.agents/skills/` and/or `src/skills/` into that layout. Do not treat `.agents/skills/` as SoT or as the consumer install source. Flat layout (no category nesting) in this change.
2. **Discovery for `npx skills add jpolvora/workflow-skills`:** ensure the GitHub-cloned install resolves skills from `src/ws-*` only. Preferred simplest options (pick one in implementation; verify with AC2/AC10/AC13):
   - Document / use an explicit subpath source (`…/tree/<ref>/src` or equivalent skills CLI subpath), **or**
   - Keep dogfood `.agents/skills` out of the published discovery set (gitignore / do not commit synced copies / stop shipping skill bodies there) so recursive discovery hits `src/ws-*`.
3. **Add a thin `src/ws-shared/SKILL.md`** so the hub is a first-class installable skill; ship templates/examples only for consumer-owned files; bootstrap copies if missing (same spirit as mattpocock setup + existing `ws-configure-project`).
4. **Update README.md and AGENTS.md layout docs** for the new structure:
   - `README.md`: human-facing layout (SoT `src/ws-*`, consumer install destination, `npx skills` commands, migration).
   - Root `AGENTS.md`, packaged `.agents/AGENTS.md`, and `ws-shared/AGENTS.md`: agent routing/index paths, skill loading tables, verification commands, and install notes must describe **`src/ws-*` as upstream SoT** and the post-install consumer skills layout (typically `.agents/skills/ws-*` under `{skillsRoot}`), with no stale `.agents/skills` SoT or `src/skills` SoT claims.
5. **Switch all consumer docs** (README, site, hubs) to `npx skills add jpolvora/workflow-skills` (plus curated `-s` recipes replacing workflows/extra/full shortcuts), with SoT path stated as `src/ws-*`.
6. **Update `ws-check-harness`** so inventory, link checks, integrity, portability, and routing phases resolve skill paths against **`src/ws-*`** upstream (and against the installed `{skillsRoot}/ws-*` layout when run in a consumer after install). No hardcoded assumptions that SoT is `.agents/skills` or `src/skills`.
7. **Update `ws-check-workflows`** (skill body + `scripts/check_workflows.py` and related resolvers) so after install it uses **correct relative paths** to skills, hub (`ws-shared`), dependency graph, and workflow artifacts under the consumer install layout (`{skillsRoot}` / `{sharedDir}`), and upstream runs resolve against **`src/ws-*`**. No broken relative paths that still point at legacy `.agents/skills` SoT or `src/skills` when those are no longer the published tree.
8. **Remove the previous / legacy consumer installer entirely** (no soft-deprecation shim, no dual-path support):
   - Delete consumer install/update/uninstall UX from `bin/cli.js` (and any `install-rules.js` / related helpers used only for that path).
   - Delete `install-skills.sh` (bash shim to the legacy CLI).
   - Remove or stop publishing `package.json` `bin` / `files` entries that exist solely to run `npx github:jpolvora/workflow-skills` as an installer.
   - Remove or rewrite install tests that assert the legacy CLI install/update/uninstall path; replace with `npx skills` discovery/install verification.
   - Strip README, site, hubs, and badges that present the legacy installer as current UX.
   - Keep only upstream authoring commands that are not a consumer installer (integrity generate/check, site build, local tests, optional sync-skills for dogfood).
9. **Update the website builder** (`bin/build-site.js` and related site templates/sections):
   - Skill catalog scan root = **`src/ws-*`** (not `src/skills`, not `.agents/skills`).
   - Install / packages sections generate **`npx skills`** command examples and curated `-s` recipes (not legacy `npx github:jpolvora/workflow-skills install|update|uninstall`).
   - Run **`npm run build-site:bump`** so `package.json` version and `docs/index.html` footer/version stay aligned with the new installer + path.
   - Remove or rewrite site UI that documents legacy package-shortcut install via the old CLI.
10. **Update automated tests** so they adhere to the new layout and installer:
   - Point skill/fixture/source roots at **`src/ws-*`** (not `.agents/skills` SoT, not `src/skills`).
   - Assert consumer install via **`npx skills`** (discovery/list/add as applicable); do not assert legacy `bin/cli.js` / `install-skills.sh` install/update/uninstall as the supported path.
   - After simulated/real install, assert harness/workflow scripts resolve **correct relative paths** under `{skillsRoot}` / `{sharedDir}` (and related tokens).
   - Update or remove fixtures/assertions that still expect legacy package shortcuts, `src/skills`, or `.agents/skills` as upstream SoT.
   - `npm run test` / `npm run tests` (and any integrity/harness/workflow test entrypoints kept) must pass against the new structure.
11. **Keep** `skill-dependencies.json` as an **authoring / harness** graph (docs + `ws-check-harness`), not as a runtime installer closure. Document curated skill sets in README/site instead of reimplementing dep resolution inside `npx skills`.
12. **Keep** integrity digests as an **upstream release gate** over **`src/ws-*`** content (`generate-integrity` / `verify-integrity`); do not require a custom consumer integrity CLI once install is skills-only.

## Acceptance Criteria

- AC1: Consumer-facing install documentation (README primary install section + site install section) documents **only** `npx skills` as the supported install/update/remove path for this repo (example: `npx skills add jpolvora/workflow-skills`), with no primary docs presenting `npx github:jpolvora/workflow-skills install|update|uninstall` as current supported UX.
- AC2: Running `npx skills add` against this repository (GitHub shorthand or local clone, using the documented source/subpath if required) lists every shippable pipeline/utility skill from **`src/ws-*/SKILL.md`** with valid `name` and `description` frontmatter (at least the Workflows package skill set plus Extra package skills when present on disk). Discovery must not depend on `.agents/skills` or `src/skills` as SoT.
- AC3: `src/ws-shared` is discoverable by `npx skills` via a `SKILL.md` with string `name` / `description`; installing it places the hub templates under the consumer agent skills target (universal project layout `.agents/skills/ws-shared/` when that agent is selected).
- AC4: Consumer-owned hub files (`config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, optional `CHANGELOG.md`, and any local integrity/manifest overlays) are either not shipped as overwrite-prone live files under **`src/ws-shared`**, or bootstrap docs/skill steps explicitly seed them from `*.example` / `*.template` **only when missing** (never documented as safe to clobber on update).
- AC5: README (or equivalent human install doc) provides curated `npx skills add … -s …` recipes that replace the former package shortcuts **workflows**, **extra**, and **full** (skill name lists aligned with `skill-dependencies.json` package membership at ship time).
- AC6: Post-install guidance requires (or strongly gates) running `ws-configure-project` (or an equivalent setup skill step) once per consumer repo before orchestrator use, analogous to mattpocock's setup skill.
- AC7: The previous / legacy consumer installer is **removed**, not soft-deprecated: `install` / `update` / `uninstall` consumer commands and the bash shim (`install-skills.sh`) no longer exist as a working install path; `npx github:jpolvora/workflow-skills` is no longer documented or tested as an installer. Upstream-only authoring commands (integrity generate/check, site build, local test entrypoints, optional sync for dogfood) may remain if they are not a consumer installer.
- AC8: Root `AGENTS.md`, packaged `.agents/AGENTS.md`, and `ws-shared/AGENTS.md` document the **new layout structure** (`src/ws-*` upstream SoT; consumer post-install `{skillsRoot}/ws-*`), no longer instruct agents to install/update via `npx github:jpolvora/workflow-skills` as the canonical path, and point to `npx skills` (plus migration notes for existing installs).
- AC9: A one-time migration note exists for consumers who already installed via the legacy CLI: how to adopt `npx skills` / `npx skills update` without losing `ws-shared` consumer data.
- AC10: Automated verification proves discovery from SoT: a test or CI/script step runs `npx skills add` against a tree where skills exist only under **`src/ws-*`** (no reliance on `.agents/skills` or `src/skills` content) and asserts expected skill names are present, including `ws-shared`.
- AC11: No skill body, gate, or banner hardcodes a host product as the required installer; install prose stays harness-neutral aside from documenting the portable `npx skills` CLI.
- AC12: Out-of-scope items listed in Notes are not implemented in this feature (category tree move, Claude plugin marketplace packaging, reimplementing dependency closure inside `npx skills`).
- AC13: Upstream authoring and packaging treat **`src/ws-*`** as the only skill content SoT. `.agents/skills` is dogfood-only (sync target or local mirror). Published install discovery must not silently prefer a divergent `.agents/skills` or leftover `src/skills` copy over `src/ws-*`.
- AC14: Legacy installer artifacts required only for the old consumer path are deleted or unshipped: at minimum `install-skills.sh`, consumer install/update/uninstall entrypoints and their dedicated helpers, and any README/site/badge/help text that presents that CLI as current install UX. No compatibility shim remains that still performs legacy install/update/uninstall.
- AC15: `bin/build-site.js` (website builder) reads the skill catalog from **`src/ws-*`** (not `src/skills` / not `.agents/skills`), and generated install/packages sections show **`npx skills`** installer commands / curated recipes (not the legacy GitHub CLI installer).
- AC16: Shipping this change includes a site rebuild with version bump (`npm run build-site:bump` or equivalent) so `package.json` version and `docs/index.html` catalog/install/footer reflect the new installer + `src/ws-*` structure with no merge-conflict markers and no stale legacy install copy.
- AC17: `README.md` documents the new layout structure: upstream SoT **`src/ws-*`**, how `npx skills` installs into the consumer agent skills directory, and that `.agents/skills` in this repo is not the published SoT (dogfood-only if kept).
- AC18: `ws-check-harness` is updated so Phases that inventory skills, resolve links, check routing/integrity/portability use correct paths for **`src/ws-*`** upstream and do not fail due to stale `.agents/skills` or `src/skills` SoT assumptions.
- AC19: `ws-check-workflows` (including `scripts/check_workflows.py` and path resolvers) is updated so **after install** relative paths to skills, `ws-shared`, dependency manifests, and workflow artifacts resolve correctly under the consumer install layout (`{skillsRoot}` / `{sharedDir}`), and upstream runs resolve against **`src/ws-*`** without broken legacy relative paths.
- AC20: Automated tests under `test/` (and related npm test scripts) adhere to the new layout and installer: skill/source fixtures and path assertions use **`src/ws-*`** as upstream SoT; they do not require `.agents/skills` or `src/skills` as SoT; they do not treat the legacy CLI as the supported install path.
- AC21: Tests that cover install/discovery verify **`npx skills`** behavior (list/add or equivalent) against **`src/ws-*`**, and tests that cover post-install harness/workflow behavior assert correct relative/`{skillsRoot}`/`{sharedDir}` resolution.
- AC22: `npm run test` (or `npm run tests`) exits 0 after the layout/installer changes, with no remaining assertions that encode the removed legacy installer or obsolete SoT roots as current contract.

## Notes

### In scope

- Docs + hub routing updates for skills-only consumer install.
- Relocate skill SoT to **`src/ws-*`** (`src/<skill-id>/`).
- Thin `src/ws-shared/SKILL.md` + template/bootstrap rules for consumer-owned files.
- **Update `README.md` and `AGENTS.md`** (root + packaged hubs) with new layout structure info (`src/ws-*` SoT, consumer install destination, `npx skills`).
- **Update `ws-check-harness` and `ws-check-workflows`** for correct relative/path-token resolution upstream (`src/ws-*`) and **after install** under `{skillsRoot}` / `{sharedDir}`.
- **Remove the previous / legacy consumer installer** (`bin/cli.js` install/update/uninstall path, `install-skills.sh`, installer-only helpers, legacy install tests, and consumer docs/badges for that path). No dual installer; no long-lived deprecation shim that still installs.
- **Update website builder** (`bin/build-site.js`) + regenerate site with version bump for `npx skills` install UX and `src/ws-*` catalog paths.
- **Update automated tests** (`test/`, npm test scripts, integrity/harness/workflow checks) to adhere to **`src/ws-*`**, `npx skills` install, and post-install relative paths; remove legacy SoT/installer assertions.
- Curated skill-set recipes; discovery smoke test against **`src/ws-*`**.
- Clarify dual-tree policy: **SoT = `src/ws-*`**; `.agents/skills` optional dogfood sync only; ensure `npx skills` install path resolves to SoT (subpath and/or stop publishing skill bodies under `.agents/skills`).

### Out of scope (explicit)

- Moving skills into mattpocock-style `skills/<category>/<name>/` nesting (or renaming SoT to repo-root `skills/`).
- Shipping a Claude Code marketplace plugin (`.claude-plugin/`) in this change.
- Reimplementing `skill-dependencies.json` closure / integrity verify inside the `npx skills` client.
- Changing pipeline FSM, skill runtime contracts, or `config.json` schema beyond install/bootstrap docs and path SoT moves.
- Keeping or soft-deprecating the legacy installer alongside `npx skills` (rejected: **remove** legacy installer).
- Making `.agents/skills` or `src/skills` the published SoT (explicitly rejected in favor of **`src/ws-*`**).

### Design constraints

- Prefer **remove** over deprecate/shim ("no compatibility maintenance" hub rule).
- Prefer documenting curated `-s` lists over building a new meta-installer.
- SoT path: **`src/ws-*`** (`src/<skill-id>/`). Consumer runtime install target remains the agent skills dir (often `.agents/skills/` in the *consumer* project); that is the install destination, not this repo's SoT.
- Harness skills must expand `{skillsRoot}` / `{sharedDir}` (and related path tokens) before filesystem checks; do not hardcode legacy SoT roots.
- Tests must assert the new contract only (`src/ws-*` + `npx skills` + post-install path tokens); do not keep dual expectations for removed layouts/installers.
- Website builder must stay the single generator for `docs/index.html` catalog + install sections; do not hand-edit the generated catalog out of band without regenerating.
- Reference: [vercel-labs/skills](https://github.com/vercel-labs/skills) discovery + commands; [mattpocock/skills](https://github.com/mattpocock/skills) as a custom skill-source client without a proprietary installer.

### Suggested install examples (docs target)

```bash
# Interactive pick (document exact source/subpath chosen so discovery hits src/ws-*)
npx skills add jpolvora/workflow-skills

# List without installing
npx skills add jpolvora/workflow-skills --list

# Update / remove (skills CLI)
npx skills update
npx skills remove <skill-name>
```

### Open assumption (fixed by this spec)

Assumption: **`src/ws-*`** is the skill SoT and the published discovery root for `npx skills`. `README.md` / `AGENTS.md` document that layout. `ws-check-harness` and `ws-check-workflows` resolve paths correctly upstream and after install. Website builder scans `src/ws-*` and publishes `npx skills` install UX with a version bump. Automated tests adhere to `src/ws-*` + `npx skills` + post-install path tokens. `.agents/skills/` is dogfood-only. Category nesting and repo-root `skills/` rename are deferred.
