---
slug: us-429
title: Seed the consumer hub with the minimal required files
status: completed
step: 2
workflowId: us-429-20260926T044300Z
startedAt: "2026-09-26T04:52:00.000Z"
endedAt: "2026-09-26T04:52:00.000Z"
acRefs: []
---
## 0. Summary & Business Rules

`ws-configure-project` and installer hub bootstrap must leave a fresh consumer hub usable without a hand-copy from `{globalSkillsRoot}/ws-shared`.

Seed only missing files, and only the categories the current layout allows:

- Consumer-owned `STACK.md` from `{skillsRoot}/ws-shared/templates/STACK.md.example` (global fallback `{globalSkillsRoot}/ws-shared/templates/`).
- Generated-local hub `AGENTS.md` and `autoload.md`, with links rewritten for the effective hub root (`pathTokens.sharedDir`, default `.ws`).
- Hub `.gitignore` from `templates/hub.gitignore` (manifest alias `templates/hub.gitignore` → `.gitignore`).
- `MEMORY.md`, `memory/`, and `CHANGELOG.md` stay at `rules.memoryDir` / `rules.changelogFile` and appear on first use of those features. Repository-root defaults are not copied under the hub.
- Installer metadata (`installed-skills.json`, `skill-integrity-local.json`) stays installer-written. Configure-project does not invent those files when no install has run.

Existing `config.json` and a maintained `STACK.md` are byte-preserved. A second run adds only missing seeds. Managed `runtime/` and `templates/` stay under the skills install. Bootstrap discovery stays `.ws/config.json`.

Security: hub path joins stay contained under the resolved hub root. A `pathTokens.sharedDir` that escapes the repository (absolute path, `..`, or symlink escape) fails closed and writes nothing outside the repo.

Interview resolutions (G1–G4) are in `step-02-us-429.plan-interview.md`.

## 1. Definition of Ready & Scope

Resolved in `.agents/specs/0132-us-429.context.md`: implement the current hub contract. The issue's older file list (hub-local `runtime/`, `templates/`, hub-local memory/changelog, installer metadata) stays human context only.

| AC | Observable result |
|----|-------------------|
| AC1 | Fresh consumer repo: configure-project and install bootstrap create the hub root and leave bootstrap `.ws/config.json`, hub `AGENTS.md`, hub `autoload.md`, hub `STACK.md`, and hub `.gitignore` present. |
| AC2 | `rules.harness` and `rules.stackFile` in the written `config.json` resolve to files that exist. |
| AC3 | `MEMORY.md`, `memory/`, and `CHANGELOG.md` exist at the configured rule paths after first use. Repo-root defaults are not required under the hub. |
| AC4 | Hub root has no `runtime/` or `templates/` copies. |
| AC5 | Non-empty `config.json` and maintained `STACK.md` bytes survive the seed run. |
| AC6 | Second run does not change existing seeded files and does not create duplicate paths. |
| AC7 | Destinations follow `hub-layout.json` categories and the `hub.gitignore` alias. |
| AC8 | `ws-check-harness` on the fixture does not report the hub incomplete solely because `AGENTS.md`, `autoload.md`, `STACK.md`, or `.gitignore` were unseeded. |

Out of scope: copying managed trees into the hub; rewriting installer metadata; moving bootstrap `config.json`; filling wizard answers; forcing memory/changelog under the hub when rules point at the repo root.

Auth, tenancy, i18n, and UI: none. This writes local hub files only.

## 2. Technical Design & Architecture

Stack: `node-skills-package` (Node 22, JavaScript). Layers from `.ws/config.json`:

| Layer | Path | This change |
|-------|------|-------------|
| skills-sot | `.agents/skills` | Seed behavior in `ws-configure-project` scripts and skill text |
| installer-cli | `bin` | Same seed from `ensureSharedHubInstalled` in `bin/cli.js` |
| tests | `test` | Fixture coverage for AC1–AC8 and negative scenarios |

No database, frontend, or API surface. Invariants: `commitPlanFilesOnlyAtStep8` (this step writes only the plan); path containment; awaited seed I/O.

**Current gap (design intent: new seed, not a restore).** `bin/cli.js` `ensureSharedHubInstalled` already seeds missing `config.json` and `STACK.md` and preserves legacy hub memory/changelog. It does not seed hub `.gitignore` from `templates/hub.gitignore` as a missing-only hub file. The alias loop copies that template onto the hub `.gitignore` on every install, including when the file already exists (G1). Hub `AGENTS.md` is only a residual pointer for a stripped local hub (`localHubPointerMd`), and a generated pointer is refreshed when its bytes differ. `ws-configure-project` (`auto_configure.cjs`, `configure_autoload.cjs`) fills config gaps and can write autoload when that section runs; a fresh `--auto` or interview run does not guarantee hub `AGENTS.md`, `autoload.md`, `STACK.md`, and `.gitignore` together. `MEMORY.md` / `CHANGELOG.md` are created on first use at `rules.*` (repo root by default), which already matches AC3.

**Shared seed.** One Node helper under `.agents/skills/ws-configure-project/scripts/` (required by both the configure skill and `bin/cli.js`) that:

1. Resolves the hub with the existing contained-hub resolver (`pathTokens.sharedDir`; fail closed on escape).
2. Creates the hub directory when missing.
3. Copies `STACK.md` from `templates/STACK.md.example` only when `STACK.md` is absent.
4. Writes hub `AGENTS.md` and `autoload.md` from the packaged pointer/autoload seeds only when each file is absent, rewriting links for the hub root (reuse `configure_autoload.cjs` `ensureAutoloadMd` / pointer rendering; do not overwrite an existing file).
5. Copies `templates/hub.gitignore` to `{hub}/.gitignore` only when `.gitignore` is absent.
6. Never copies `runtime/` or `templates/` into the hub.
7. Never creates `installed-skills.json` or `skill-integrity-local.json`.
8. Returns the list of paths created and the list skipped because they already existed.

**Installer alias guard (G1).** In `ensureSharedHubInstalled`, the `HUB_DEST_ALIASES` copy into the consumer hub must skip `{hub}/.gitignore` when that file exists. The helper and the alias loop must not both write it. A second install of an unchanged seed must leave the file bytes unchanged.

**Refresh vs no-op (G2).** Keep the retired-skill `autoload.md` refresh. When on-disk `AGENTS.md` or `autoload.md` already equals the renderer output, do not write. AC6 is hash equality on a just-seeded tree, not removal of the stale-marker branch.

Call sites:

- `ws-configure-project` after config ensure (interactive and `auto_configure.cjs`), before stack-companion checks.
- `bin/cli.js` inside `ensureSharedHubInstalled` (install and update), after config/STACK handling, so install bootstrap matches configure. The alias-loop guard lands in the same function.

Fable domain adapters: `fable.enabled` and `autoDetectDomain` are true, but this change is hub file seeding in Node scripts. No IaC, Kubernetes, Docker, migration, or data-script boundary is touched. Domain adapter skipped.

## 3. Step-by-Step Plan

1. **Shared seed helper (AC1, AC4, AC6, AC7).** Add the helper described in §2. Missing destinations only. Containment check runs before any write (Negative 4). Affected: new script under `.agents/skills/ws-configure-project/scripts/`, plus a thin require from `configure_autoload.cjs` or `auto_configure.cjs` if that avoids a second writer. Check: dry-run or fixture call reports created vs skipped; hub has no `runtime/` or `templates/`.

2. **Configure-project call site (AC1, AC2, AC5).** Invoke the helper from `auto_configure.cjs` and from the interactive skill path that ensures the hub (SKILL.md steps that already ensure `config.json` and `STACK.md`). Do not rewrite a non-empty `config.json` or an existing `STACK.md`. After the run, `rules.harness` and `rules.stackFile` point at files on disk (scope defaults with the existing hub-path normalizer when those keys are still the `.ws` defaults). Affected: `auto_configure.cjs`, `ws-configure-project/SKILL.md` (seed step only). Check: fixture with a filled config and a custom `STACK.md` shows identical bytes after the run.

3. **Installer bootstrap call site (AC1, AC6).** Call the same helper from `ensureSharedHubInstalled` so a fresh install that creates the hub seeds `AGENTS.md`, `autoload.md`, and `.gitignore` when missing, and still preserves `STACK.md` / `config.json`. Guard the hub `.gitignore` alias copy so an existing file is not replaced. Skip pointer and autoload writes when bytes already match. Second install/update of that tree must not rewrite those files. Affected: `bin/cli.js`. Check: two installs on a fixture produce identical hashes for the seeded set.

4. **First-use memory and changelog (AC3).** Confirm existing first-use writers (`ws-self-learning` memory compile / changelog append, and configure framework-trap seed) create `MEMORY.md`, `memory/`, and `CHANGELOG.md` at `rules.memoryDir` / `rules.changelogFile`. The fixture must invoke those writers (compile and changelog append), not treat configure as the creator. Do not add hub-root copies when those keys are the repository-root defaults. Affected: only if a call site still forces hub-local memory; otherwise no product change beyond a regression test. Check: fixture with default rules has the files at the repo root after that first use, and not as a configure seed under the hub.

5. **Harness observation (AC8).** Run `ws-check-harness` (or the hub-separation / install-mode scripts it already uses) against the seeded fixture. If a finding fires only because `AGENTS.md`, `autoload.md`, `STACK.md`, or `.gitignore` were absent, adjust that check so a seeded minimal hub is complete and a hub that still lacks them can still be reported. Do not weaken the ban on hub `runtime/` copies. If the suite is already silent on a seeded hub, record that observation and do not edit the harness. Affected: `ws-check-harness` scripts only if a fixture shows that finding. Check: seeded fixture has zero incomplete-hub findings for that set.

6. **Tests (all ACs, Negatives 1–4).** Extend `test/test-configurable-hub-root.js` and/or `test/test-install.js` with a temp consumer repo. Cases in §5. No sibling-sweep of product apps: the defect class is hub seed idempotence inside this package, covered by configure and install fixtures.

7. **Docs that state the seed contract.** Update `ws-configure-project/SKILL.md` and `INTERVIEW.md` auto-mode paragraph so they name the seeded set (`AGENTS.md`, `autoload.md`, `STACK.md`, `.gitignore`) and the non-copies (`runtime/`, `templates/`, installer metadata). Root `AGENTS.md` / `.ws/AGENTS.md` / `README.md` / `FEATURES.md` only where they still say configure leaves a config-only hub. Site rebuild stays with the ship step.

## 4. Permissions, Tenancy & i18n

No RBAC, tenant filter, or locale strings. The only isolation check is filesystem containment: seeds write under the resolved hub root inside the repository, or under the configured `rules.memoryDir` / `rules.changelogFile` when those paths are inside the repo. Escape attempts fail before `writeFile`.

## 5. Test Coverage

| AC | Test |
|----|------|
| AC1 | `fresh configure seeds hub pointers` — temp repo, `auto_configure.cjs --repo-root`, assert `.ws/config.json`, `.ws/AGENTS.md`, `.ws/autoload.md`, `.ws/STACK.md`, `.ws/.gitignore`. Parallel install fixture asserts the same set after hub ensure. |
| AC2 | `rules resolve after seed` — read written `config.json`; `rules.harness` and `rules.stackFile` exist on disk. |
| AC3 | `memory and changelog follow rules` — default keys: after memory compile and changelog append, files appear at repo root and are absent as configure-created hub copies. Custom `rules.memoryDir` / `rules.changelogFile` inside the repo: first use writes there. |
| AC4 | `no managed trees in the hub` — assert `runtime` and `templates` are not directories under the hub after configure and after install. |
| AC5 | `preserve consumer bytes` — pre-seed non-empty `config.json` and `STACK.md`; compare buffers after the run (Negative 1). |
| AC6 | `second run is a no-op` — second configure and second install: created list empty; hashes unchanged for `AGENTS.md`, `autoload.md`, `STACK.md`, `.gitignore`, and `config.json`; no duplicate paths (Negative 3). Includes the case where hub `.gitignore` existed before the alias loop. |
| AC7 | `layout categories` — assert `.gitignore` content matches `templates/hub.gitignore` when it was missing; `STACK.md` matches the example only when it was missing; installer metadata files are absent when configure runs without an install. |
| AC8 | `harness accepts seeded hub` — `ws-check-harness` (consumer fixture mode) emits no incomplete-hub finding for missing `AGENTS.md`, `autoload.md`, `STACK.md`, or `.gitignore`. |
| Negative 2 / 4 | `sharedDir escape fails closed` — `pathTokens.sharedDir` of `..`, an absolute path, and a symlink that leaves the repo: helper throws, and no file appears outside the repo. |

## 6. Stack & Security Invariants Verification Plan

Rule pack: `.agents/skills/ws-shared/runtime/stacks/typescript-node.md`. Project `config.json.invariants` that apply: path and promise discipline in seed scripts. EF/tenancy/migration invariants are false for this stack and are not touched.

| Boundary | Touched? | Verification |
|----------|----------|----------------|
| Authorization & endpoint protection | No HTTP or route surface | Record N/A in the verify step. |
| Concurrency & async safety | Seed helpers that return promises must be awaited by `auto_configure.cjs` and `bin/cli.js` | `scan_stack_invariants.cjs --stack typescript-node` on the touched scripts; no floating `fs.promises` calls. |
| Input validation & DTO boundary | `pathTokens.sharedDir` and rule paths are untrusted config input | Containment check (existing hub resolver) before write. Negative 2 and Negative 4 fixtures. No shell concatenation of the hub path. |
| Subscription & lifecycle cleanup | File copies only; no streams or listeners left open | Sync `fs` copies or `finally` close if a stream is used. |

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot, installer-cli, tests).
- [ ] Domain entities and mappings encapsulated. (N/A: no domain model.)
- [ ] Schema migrations created. (N/A: no database.)
- [ ] Authorization checks applied. (N/A: no endpoint.)
- [ ] Stack & security invariants verified (path containment, awaited seed I/O).
- [ ] i18n keys declared. (N/A.)
- [ ] Test cases cover AC1–AC8 and Negatives 1–4.
- [ ] Hub `.gitignore` alias copy is missing-only (G1).

## 8. Open Questions

None that block implementation. Product fork is closed in the context companion.

`ws-check-harness` has no current finding id literally named "incomplete hub" for a missing `STACK.md`. Step 5 confirms the fixture. If the suite is already silent, AC8 is satisfied by the seed plus that observation, and no harness script change is required.
