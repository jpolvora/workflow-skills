---
slug: simplify-skill-versioning
title: Centralize skill package versioning and bind versions to integrity checksums
status: completed
step: 1
workflowId: simplify-skill-versioning-20260927T015020Z
startedAt: "2026-09-27T01:50:20.000Z"
endedAt: "2026-09-27T01:54:12.760Z"
acRefs: []
---
## 0. Summary & Business Rules

**Objective:** Replace per-skill `version:` frontmatter synchronization with a single authored source at `.agents/skills/ws-shared/version.json`. Build, integrity, installer, and site pipelines read that semver; release bumps touch one canonical file plus generated compatibility projections (`package.json`, dependency manifests, site footer). Integrity digests bind the canonical version so a version-only release changes every skill digest and `fullPackageDigest` without rewriting `SKILL.md` bodies.

**Business rules:**

- One semver source of truth; fail closed on missing, malformed, or ambiguous `version.json`.
- Never stamp or require `version:` in packaged `ws-*/SKILL.md`.
- `package.json.version` and `packageVersion` fields remain as **derived** metadata, not independent sources.
- Consumer-owned hub data (`.ws/config.json`, memory, changelog, local integrity) unchanged by upstream version mechanics.
- Node 22 / ESM package + CommonJS skill scripts only; no Python helpers.

## 1. Definition of Ready & Scope

**In scope (AC1–AC13):** `version.json`, integrity generator/verifier, `build-site` / bump path, hub-layout + installer enumeration, package-version resolution in CLI/monitor, test and harness updates, docs/site/catalog sync.

**Out of scope:** Semver policy changes, removing npm `package.json.version`, redesigning SHA-256 ownership, migrating external consumer skills.

| AC | Summary |
|----|---------|
| AC1 | Add managed `version.json` under `ws-shared` |
| AC2 | Build/bump reads canonical version; sync projections |
| AC3 | Remove per-skill frontmatter version stamping |
| AC4 | Version in deterministic digest input + manifest field |
| AC5 | Byte-stable regen; version-only vs file-only digest behavior |
| AC6 | verify-integrity fail-closed on drift/stale/malformed |
| AC7 | Installer copies/hashes `version.json`; outdated-install diagnostic |
| AC8 | Consumer closure + telemetry still expose package version |
| AC9 | hub-layout, tarball, harness agree on location/ownership |
| AC10 | Repurpose/remove `skill-frontmatter` version paths; update tests |
| AC11 | AGENTS, README, CATALOG, FEATURES, site, authoring docs |
| AC12 | No unrelated behavior regression |
| AC13 | Full test + harness + install fixture green |

## 2. Technical Design & Architecture

### 2.1 Canonical version module

- Add `.agents/skills/ws-shared/version.json` shape `{ "version": "x.y.z" }`.
- New shared helper (prefer `bin/` ESM or `ws-shared/runtime/scripts/*.cjs` per existing patterns): `readCanonicalVersion(packageRoot)` — parse JSON, require exactly one valid semver `version`, reject extra keys that look like alternate version fields.
- `getLocalVersion()` / `getPackageVersion()` call sites migrate to canonical reader (grep: `package.json`, `skill-dependencies`, `build-site`, `generate-skill-integrity`, `cli.js` install/update).

### 2.2 Generated projections (AC2)

On `npm run build-site:bump` (or dedicated sync step invoked by bump):

1. Bump **only** `version.json` (or accept bumped version as input).
2. Write `package.json.version`, both `packageVersion` in `bin/skill-dependencies.json` and `.agents/skills/ws-shared/runtime/skill-dependencies.json`, site footer via `build-site.js`.
3. Remove `rewriteSkillMarkdown` / `--bump` loop over all `SKILL.md` for version (AC3, AC10).

### 2.3 Integrity binding (AC4–AC6)

In `bin/skill-integrity-lib.js`:

- Extend `digestFromFilesMap` or skill/hub digest construction to include canonical `packageVersion` in serialized input (document exact string: e.g. `version\n` + semver + sorted file hashes) so version-only bumps change `skillDigest` and `fullPackageDigest`.
- `buildUpstreamManifest` reads version from `version.json`, not `package.json` alone.
- `generate-skill-integrity.js` `--check`: fail when `version.json` missing/malformed, when projections disagree with canonical, or manifest stale.
- Manifest records `packageVersion` (existing field) as the bound version for explainability.

### 2.4 Hub layout & installer (AC7, AC9)

- Extend `hub-layout.json` managed entries (or `buildHubEntry` roots) so `version.json` at `ws-shared` hub root is enumerated, copied on install/update, and hashed like other managed hub files.
- Installer / `cli.js` integrity closure: include `version.json` in expected upstream files; if missing on consumer install tree → actionable “run update” diagnostic (NS4).
- No duplicate `VERSION.md` or hardcoded installer exception outside hub-layout.

### 2.5 Skill frontmatter (AC3, AC10)

- Stop writing `version:` in `SKILL.md` during bump; optionally strip existing `version:` keys in a one-time codegen pass as part of the same PR (bodies only, no behavior text).
- Repurpose `bin/skill-frontmatter.js`: remove version rewrite API or limit to non-version frontmatter if still needed; delete/adjust tests in `test/test-skill-frontmatter.js`, `test-harness-clean` pins.

### 2.6 Documentation & site (AC11)

- `SKILL_AUTHORING.md` / `ws-write-a-skill`: authors never bump per-skill version.
- `CATALOG.md` Before ship / version bump rows reference `version.json`.
- Regenerate `docs/index.html` via build-site; sync `FEATURES.md`, root `AGENTS.md`, consumer hub mirrors per harness change protocol.

### 2.7 Touch map (estimated ~19 files)

| Area | Files |
|------|--------|
| Canonical | `.agents/skills/ws-shared/version.json` (new) |
| Lib | `bin/skill-integrity-lib.js`, `bin/generate-skill-integrity.js`, `bin/build-site.js`, `bin/cli.js` |
| Frontmatter | `bin/skill-frontmatter.js` |
| Layout | `.agents/skills/ws-shared/runtime/hub-layout.json`, install copy paths in `bin/cli.js` |
| Manifest | `bin/skill-integrity.json` (regenerated), `package.json`, `bin/skill-dependencies.json`, runtime `skill-dependencies.json` |
| Tests | `test/test-skill-integrity*.js`, `test/test-skill-frontmatter.js`, `test/test-install*.js`, `test/test-harness-clean.js`, `test/test-powershell-config-editor.js` if needed |
| Docs | `README.md`, `CATALOG.md`, `FEATURES.md`, `AGENTS.md`, `.ws/AGENTS.md`, `SKILL_AUTHORING.md`, `docs/index.html` |

## 3. Step-by-Step Plan

1. **Introduce canonical file + reader** — Add `version.json` seeded from current `package.json.version`; implement `readCanonicalVersion` with NS1 negative cases; unit tests for parse failures.
2. **Retarget version consumers** — Replace direct `package.json` version reads in integrity generator, build-site, CLI packageVersion reporting; add projection sync function called from bump.
3. **Version-bound digests** — Change digest serialization; regenerate `skill-integrity.json`; add tests for NS3 (version-only vs file-only).
4. **Remove SKILL.md stamping** — Delete bump rewrite loop; adjust `build-site --bump`; strip `version:` from packaged skills in SoT (mechanical); validate SKILL frontmatter still parses without `version`.
5. **Hub layout + installer** — Register `version.json` in hub-layout; verify `buildHubEntry` includes it; install fixture asserts copy + hash; NS4 diagnostic path.
6. **Verification hardening** — Extend `verify-integrity` / `--check` for projection drift and stale manifest (NS2); wire `npm run verify-integrity` in CI docs.
7. **Test sweep (AC10, AC13)** — Update skill-frontmatter, pre-daily, wiki, patterns-generator, install, harness-clean tests; run `npm run test`, `test-harness-clean.js`, targeted harness phases.
8. **Docs & site** — Bump `version.json` once for ship PR; `build-site:bump`; sync hubs and FEATURES; confirm AC11 wording.

**Dependency order:** 1 → 2 → 3 → 5 → 4 → 6 → 7 → 8 (digest binding before mass manifest regen; hub layout before install tests).

## 4. Permissions, Tenancy & i18n

N/A — build/install tooling only; no auth, tenancy, or UI strings.

## 5. Test Coverage

| AC | Tests / commands |
|----|------------------|
| AC1 | Unit: `version.json` present, hub-layout classifies managed; install lists file |
| AC2 | Integration: bump/sync updates projections from single file |
| AC3 | `test-skill-frontmatter` / grep harness: no `version:` required in SKILL samples |
| AC4 | Integrity unit: manifest includes version; digest input documented |
| AC5 | Double `generate-integrity` byte identity; bump-only changes all digests |
| AC6 | Negative fixtures: missing/malformed/stale manifest exit non-zero |
| AC7 | Install test: global + project-local copy; missing file diagnostic |
| AC8 | CLI/monitor tests still read packageVersion from manifest |
| AC9 | `ws-check-harness` hub-layout phase; tarball fixture |
| AC10 | Listed test files updated per spec |
| AC11 | Manual/doc review + site footer version |
| AC12 | Regression: existing install closure tests unchanged aside from version binding |
| AC13 | `npm run test`, `verify-integrity`, `test-harness-clean.js` |

**Negative scenarios (NS1–NS5):** Dedicated cases in integrity unit tests + install fixture for NS4/NS5.

**Sabotage:** After implementation, `node .agents/skills/ws-shared/runtime/scripts/run_sabotage.cjs` on changed integrity helpers if mutation gate applies (optional; stack scan required at implement step).

## 6. Stack & Security Invariants Verification Plan

Stack: **node-skills-package** (Node 22, ESM `bin/`, CJS skill scripts).

| Boundary | Plan |
|----------|------|
| **Authorization** | N/A (no HTTP endpoints) |
| **Async safety** | Integrity walks remain sync `fs`; no new floating promises in CLI entrypoints |
| **Input validation** | Strict semver parse; reject ambiguous JSON; no shell interpolation of version strings |
| **Lifecycle / cleanup** | Temp dirs in tests only; no new persistent caches without gitignore |
| **Harness invariants** | `ws-check-harness` Phase 0: no `.py` under skills; managed hub layout matches installer |
| **Consumer data** | Confirm update path never overwrites `.ws/config.json` when adding `version.json` to managed set |

Run before PR: `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs`, `node --check` on new/changed `.cjs` helpers.

## 7. Pre-PR Checklist

- [ ] `version.json` is sole authored bump target; projections synced.
- [ ] No build path stamps per-skill `version:`.
- [ ] Integrity manifest regenerated; version-bound digests verified.
- [ ] Hub-layout + installer include `version.json`.
- [ ] Tests and harness clean (AC13).
- [ ] Docs/site/catalog synced (AC11).
- [ ] Package version bumped once per release PR (CATALOG Before ship).

## 8. Open Questions

| # | Question | Default if unanswered |
|---|----------|------------------------|
| 1 | Strip all existing `version:` lines from SoT `SKILL.md` in same PR vs gradual? | Same PR mechanical strip (AC3) |
| 2 | Exact digest serialization prefix for version binding | Document in `skill-integrity-lib.js` comment + test golden string |
| 3 | Keep `skill-frontmatter.js` for non-version fields only? | Yes if any caller remains; else delete module and tests |

**Interview focus:** Confirm digest serialization format and one-shot SKILL strip scope before Step 4 implementation.
