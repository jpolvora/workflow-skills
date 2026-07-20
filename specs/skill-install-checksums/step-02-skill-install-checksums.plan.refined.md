---
slug: skill-install-checksums
title: "Skill install checksum integrity (dependency graph + full package)"
status: "plan refined ok"
refinedFrom: step-01-skill-install-checksums.plan.md
refinedAt: "2026-07-20T18:20:00Z"
---

## 0. Summary & Business Rules

**Objective:** Add SHA-256 content integrity for managed skill trees and hub templates so install/update/audit can detect tampering, incomplete closures, and “version matches but tree differs” cases. Semver `--check` stays; full-package digest becomes a second signal.

**Locked decisions (do not reopen):**

| Item | Value |
|------|--------|
| Upstream manifest | `bin/skill-integrity.json` |
| Consumer local record | `.agents/skills/shared/skill-integrity-local.json` |
| Algorithm | `sha256`, lowercase hex |
| Unsafe override | `--force-integrity` |
| Audit CLI | Prefer `integrity` subcommand; also extend `--check` for `fullPackageDigest` |

**Business / security rules:**

1. Fail closed on source or consumer digest mismatch unless `--force-integrity`.
2. Same include/skip rules as installer copy (`HUB_WHITELIST`, `SKIP_INSTALL_FILES`, `shouldSkipInstallEntry`, consumer-owned exclusions), with hub vs skill-tree asymmetry locked in §2.
3. Hash **file bytes as stored** (no line-ending rewrite during hash). Upstream keeps managed text LF (harness / MEMORY CRLF traps).
4. Consumer-owned hub paths never enter digests and never fail integrity when edited.
5. Closure from `bin/skill-dependencies.json` (transitive deps + hub ensure) must match install.
6. Unsigned manifest shares today’s trust boundary (raw GitHub `package.json` / same channel for integrity JSON). Document that limit; no Sigstore/GPG in this US.
7. Detection of agent “hygiene” rewrites = audit fail, not prevention of first write (pairs with managed-skills policy).

**MEMORY applied:** Node for integrity logic (launchers); no bash CRLF path; do not silently refactor managed skills; regenerate integrity when skill tree / deps change; keep `packageVersion` aligned with `package.json` (site footer must not drift); after CLI edits run `npm run tests -- --local`; sync `test/package.json` tarball path on version bump.

## 1. Definition of Ready & Scope

**Assumptions (resolved):**

- Stack = Node 22 ESM CLI (`bin/cli.js`) + Markdown skills hub. No DB, no frontend app, no RBAC/tenancy/i18n product layers.
- `{plansDir}` = `specs` for this repo; plan/spec stay under `specs/skill-install-checksums/` (not committed at Step 8 per invariant).
- Installable skills = folders under `.agents/skills/` with `SKILL.md`, excluding `shared/` as a skill id (`listInstallableSkills`).
- Hub hashed set = files the installer would copy from `HUB_WHITELIST` (templates/docs only), not consumer-owned names.
- Remote fetch for `--check` uses same host pattern as today: `raw.githubusercontent.com/jpolvora/workflow-skills/main/...`.
- Consumer `STACK.md` may be absent locally (gitignored); integrity never hashes it. Companion template `STACK.md.example` is whitelist-hashed.
- Soft probes (soft-delete, concurrency, list sizing, rate limits): N/A beyond single HTTPS fetch for remote integrity (mirror existing `--check` timeout).

**In scope:**

- Generator + committed `bin/skill-integrity.json`
- Shared hash/verify module used by generator and CLI
- Pre-copy source verify + post-copy consumer verify on `install` / `update` / interactive
- Local record write on success (and rewrite on uninstall for remaining closure)
- `integrity` audit command
- `--check` reports `fullPackageDigest` equality when remote manifest available
- Tests under `test/`; stale-manifest gate in tests and/or check-harness
- README Safety / install docs

**Out of scope:**

- Publisher signing / pinning lockfile
- Hashing consumer-owned hub files
- FSM / skill runtime behavior changes
- Migrating older checksum formats (none exist)
- `integrity --against-published` in v1 (use `--check` for remote digest)
- Automatic rollback of partial post-copy trees on post-verify failure

**Acceptance Criteria (measurable):** AC1–AC12 as in `step-00-skill-install-checksums.spec.md` (mapped in §3 and §5).

## 2. Technical Design & Architecture

### Layers (from `config.json.stack.backend.layers`)

| Layer | Path | Changes |
|-------|------|---------|
| **cli** | `bin/` | New integrity module + generator; wire verify into `cli.js`; `integrity` + `--check` |
| **skills** | `.agents/skills/` | Optional: check-harness note for stale manifest; hub `.gitignore` for local record; no skill body semantics change |
| **tests** | `test/` | New integrity phase in `test-install.js` (Phase 11) + generator `--check` in Phase 0b |
| **docs** | `README.md` | Safety / install / commands |
| **packaging** | `package.json` | `files` already includes `bin/`; add npm script for generator; ensure `skill-integrity.json` ships |

**Frontend / DB:** N/A (`frontend.framework: none`, `database.type: none`).

### Module split (surgical)

Prefer one shared library so generator and CLI cannot drift:

| File | Role |
|------|------|
| `bin/install-rules.js` | Extracted shared constants/helpers: `HUB_WHITELIST`, `CONSUMER_OWNED_*`, `SKIP_INSTALL_FILES`, `shouldSkipInstallEntry`, `isConsumerOwnedEntry` (minimal move from `cli.js`; no behavior change) |
| `bin/skill-integrity-lib.js` | Enumerate files (using install-rules), hash, build skillDigest / fullPackageDigest / installedClosureDigest, compare, load/write manifests |
| `bin/generate-skill-integrity.js` | CLI entry: walk package root → write `bin/skill-integrity.json` (stable JSON); `--check` drift gate |
| `bin/cli.js` | Import install-rules; call lib before/after copy; `integrity` command; extend `--check`; parse `--force-integrity` |
| `bin/skill-integrity.json` | Committed publish artifact |
| `.agents/skills/shared/skill-integrity-local.json` | Consumer-only; gitignore; never overwrite from upstream |

### Manifest schemas

**Upstream `bin/skill-integrity.json`:**

```json
{
  "packageVersion": "<from package.json>",
  "algorithm": "sha256",
  "skills": {
    "<skillId>": {
      "files": { "<relPath>": "<hex>" },
      "skillDigest": "<hex>"
    }
  },
  "hub": {
    "files": { "<relPath under shared/>": "<hex>" },
    "skillDigest": "<hex>"
  },
  "fullPackageDigest": "<hex>",
  "canonicalOrder": {
    "skills": "sorted skill ids ascending",
    "paths": "sorted relative paths ascending (posix `/`)",
    "hubPlacement": "after-skills"
  }
}
```

**Consumer `.agents/skills/shared/skill-integrity-local.json`:**

```json
{
  "packageVersion": "<installed package version>",
  "algorithm": "sha256",
  "fullPackageDigest": "<from upstream manifest when Full install; else omit or null>",
  "installedClosureDigest": "<sha256 over ordered digests for installed skills + hub if hub verified>",
  "skills": { "<id>": { "files": {...}, "skillDigest": "..." } },
  "hub": { "files": {...}, "skillDigest": "..." },
  "verifiedAt": "<ISO-8601>"
}
```

When hub was not ensured and `shared/` did not exist (no `ensureSharedHubInstalled` run): set `"hub": null` and exclude hub from `installedClosureDigest`.

**Canonical digest rules (lock):**

1. Per-file: `sha256(fileBytes).hex` lowercase.
2. `skillDigest`: `sha256` over UTF-8 concatenation of lines `relPath + '\0' + fileDigest + '\n'` for each file in **sorted** `relPath` order (posix separators). (`\0` = NUL byte.)
3. `fullPackageDigest`: over Full-package set = **all installable skill ids** (sorted via `listInstallableSkills`) then for each skill its sorted file digest lines (same format), then **hub** entries after skills (`hubPlacement: after-skills`). Hub = all existing `HUB_WHITELIST` paths under package `shared/`.
4. Selective `installedClosureDigest`: same algorithm restricted to installed skill ids (sorted) + hub when hub was verified for that install.

### File enumeration (must mirror installer)

**Skill trees** (recursive walk matching `copyDirSync`):

- Skip: `__pycache__`, `*.pyc`, `*.pyo`, `.npmignore`, `.gitignore` (`SKIP_INSTALL_FILES` / `shouldSkipInstallEntry`).
- Skip consumer-owned names: `config.json`, `MEMORY.md`, `memory/` (`CONSUMER_OWNED_FILES` / `CONSUMER_OWNED_DIRS`).
- Also skip any file whose path segments include `memory` (same as `copyDirSync` `pathParts.includes('memory')` guard).
- Paths relative to skill root; always store with `/`.

**Hub** (whitelist only, matching `ensureSharedHubInstalled`):

- Include only names in `HUB_WHITELIST` that exist under package `shared/` (today: `config.json.example`, `config.schema.json`, `tools.md`, `STACK.md.example`, `setup.md`, `gates.md`, `config-resolution.md`, `AGENTS.md`, `.gitignore`, `MEMORY.md.template`, `CHANGELOG.md.template`).
- **Asymmetry (locked):** skill-tree walk skips `.gitignore`; hub **includes** `shared/.gitignore` because it is on `HUB_WHITELIST` and copied via the whitelist loop (`copyFileSync`), not via `copyDirSync`.
- Never hash: `config.json`, `STACK.md`, `MEMORY.md`, `CHANGELOG.md`, `installed-skills.json`, `memory/**`, **`skill-integrity-local.json`**.

**Export shared skip/whitelist constants** via `bin/install-rules.js` so copy path and hash path cannot diverge.

### Dependency graph coupling

- Skill id list for Full package = `listInstallableSkills` (same as `packages.full.select: all-skills`).
- Selective install closure = existing resolution (roots + transitive `dependencies` via `resolveTransitiveDeps` / `applyTransitiveDeps`).
- Hub ensure = mirror `shouldEnsureHub(selectedNames)` **and** the existing “if `shared/` already exists, refresh hub” branch in `installSelectedSkills` (lines ~775–777). If either path calls `ensureSharedHubInstalled`, include hub in source verify (when source has hub templates), post-copy verify, and local record.
- Regenerating integrity is required in the same PR as any skill file / deps / hub template change (AC11).

### CLI / UX flows

| Command | Behavior |
|---------|----------|
| `install` / interactive / `update` | **Before any skill copy:** load source `bin/skill-integrity.json`; verify source tree vs manifest for the full closure about to be copied (Full → all + hub; selective → selected+transitive + hub if will be ensured/refreshed). Mismatch → exit ≠0, **no** skill dirs overwritten (unless `--force-integrity`). **After copy + hub ensure/refresh:** recompute consumer digests for installed closure; compare to expected; write `skill-integrity-local.json`; mismatch → exit ≠0 (tree may already be overwritten: document fail-closed, **no automatic rollback**). |
| `uninstall` | After successful remove: rewrite `skill-integrity-local.json` for remaining installed skills (+ hub if still present / was in prior record). |
| `integrity` | Require local record. Installed set = `installed-skills.json` `skills` (or disk scan bootstrap). For each installed skill: if missing from record → fail; if present → recompute and compare; print each mismatched/missing/extra **managed** path. Skills in record but not installed → skip (AC7). Hub: compare only if record has non-null `hub`. Exit ≠0 on any failure. **v1:** local-record compare only (no `--against-published`). |
| `--check` / `check` | Keep semver compare (`getLocalVersion` from CLI `packageRoot`). Additionally fetch `https://raw.githubusercontent.com/jpolvora/workflow-skills/main/bin/skill-integrity.json`. **Local digest source (lock):** `packageRoot/bin/skill-integrity.json` `fullPackageDigest` (same package the CLI was loaded from; mirrors semver source). Do **not** compare selective `installedClosureDigest` to remote `fullPackageDigest`. If fetch OK: print digest match/mismatch distinctly from version lines. If remote integrity unreachable but version OK → warn, do not fail solely on missing digest (semver unreachable still fails as today). Digest mismatch with equal version → **exit 1** with labeled line `fullPackageDigest: mismatch`. |
| `--force-integrity` | Global flag on install/update/interactive. Skips pre/post integrity gates; still writes local record from **actual** on-disk digests after copy. |

### Packaging / CI

- Commit generated `bin/skill-integrity.json` in-repo (shipped via `files: ["bin/"]`).
- `package.json` script: `"generate-integrity": "node bin/generate-skill-integrity.js"`.
- Stale gate: `node bin/generate-skill-integrity.js --check` (compare to committed file + assert `packageVersion === package.json.version`) exits ≠0 on drift; call from `test/test-install.js` Phase 0b and document for check-harness upstream Phase 3.
- Add `skill-integrity-local.json` to `CONSUMER_OWNED_HUB_FILES` and `shared/.gitignore`. Optional `package.json` files negation for safety.
- On intentional release: bump `package.json` → regenerate integrity → sync `test/package.json` tarball path (MEMORY).

### Invariants (`config.json.invariants`)

- `commitPlanFilesOnlyAtStep8: true` — do not commit `specs/` in implementation commits until ship policy says so.
- No EF/tenancy invariants apply.

## 3. Step-by-Step Plan

Ordered by dependency. Each step: action, files, checks.

### Step A — Shared install-rules + integrity library

- **Action:** Extract shared constants/helpers into `bin/install-rules.js`. Implement hash helpers, skillDigest, fullPackageDigest, installedClosureDigest, load/save JSON with **stable key ordering** (sorted keys) for bit-identical generator output. Hub enumeration = whitelist only; skill enumeration = recursive copy-equivalent skips.
- **Files:** `bin/install-rules.js`, `bin/skill-integrity-lib.js`; update `bin/cli.js` imports.
- **Checks:** `node --check` on new modules; smoke via generator dry run.
- **ACs:** AC1, AC2, AC8 (exclusions).

### Step B — Generator + committed manifest

- **Action:** Implement `bin/generate-skill-integrity.js` reading package root, writing `bin/skill-integrity.json`. Support `--check` (no write; exit ≠0 if drift or version mismatch). Add npm script. Run once and commit the artifact in the implementation PR.
- **Files:** `bin/generate-skill-integrity.js`, `bin/skill-integrity.json`, `package.json` scripts.
- **Checks:** Two consecutive generate runs produce identical file bytes; `--check` green on clean tree.
- **ACs:** AC1–AC3, AC11.

### Step C — Wire install/update/interactive verify + local record

- **Action:** Parse `--force-integrity`. Hook **once** in shared install path (`installSelectedSkills` / update equivalent) so install, update, and interactive all get pre+post verify. Pre-verify **entire closure before first copy**. After successful copy + hub ensure/refresh: verify consumer closure; write `skill-integrity-local.json`. Add `skill-integrity-local.json` to `CONSUMER_OWNED_HUB_FILES` and `shared/.gitignore`. On uninstall success: rewrite local record for remaining set.
- **Files:** `bin/cli.js`, `.agents/skills/shared/.gitignore` (+ optional `package.json` negation).
- **Checks:** Manual local: install into `test/` temp; mutate managed file → post-verify fail; `--force-integrity` allows proceed.
- **ACs:** AC4, AC5, AC7, AC8.

### Step D — `integrity` audit + `--check` digest

- **Action:** Add `integrity` command (help text). Extend `--check` to fetch remote integrity and compare packageRoot `fullPackageDigest`. Distinct messaging for version vs digest. Exit 1 + `fullPackageDigest: mismatch` on digest fail when versions equal.
- **Files:** `bin/cli.js` (`printHelp`, `main`).
- **Checks:** Help lists `integrity` and `--force-integrity`; `--check` prints digest line when remote available.
- **ACs:** AC6, AC9.

### Step E — Automated tests

- **Action:** Extend `test/test-install.js`: add generator `--check` to Phase 0b; add **Phase 11** covering AC10 scenarios (AC4–AC8 + digest change).
- **Files:** `test/test-install.js`.
- **Checks:** `npm run tests -- --local` green (repack after CLI edits — MEMORY).
- **ACs:** AC10, AC11.

### Step F — Docs + harness note

- **Action:** Document integrity commands, fail-closed behavior, consumer exclusions, unsigned-manifest trust limit, post-copy-no-rollback note in `README.md` Safety / install. Add one check-harness Phase 3 bullet: integrity manifest present and `generate-skill-integrity.js --check` clean (upstream only).
- **Files:** `README.md`; `.agents/skills/check-harness/SKILL.md` (minimal bullet).
- **Checks:** Help + README command strings aligned; no host product names in skill prose.
- **ACs:** AC12, AC11.

### Step G — Release hygiene (when version bumps)

- **Action:** If PR bumps version: regenerate integrity, sync `test/package.json` `file:../workflow-skills-<ver>.tgz`, stamp site without accidental dual bump (MEMORY: package.json canonical).
- **Files:** `package.json`, `test/package.json`, `docs/` only if site regen required.
- **Checks:** footer version == `package.json` if site touched.

## 4. Permissions, Tenancy & i18n

N/A for this stack (`tenancyField` empty; `frontend.i18n.framework: none`; no RBAC). CLI is local-process trust; integrity is consumer-facing detection only.

## 5. Test Coverage

Map each AC → concrete cases in `test/test-install.js` (and generator `--check`).

| AC | Test / method name (proposed) | Assertion |
|----|-------------------------------|-----------|
| AC1 | `testIntegrityManifestCoversInstallableSkills` | Manifest `skills` keys == `listInstallableSkills`; hub files ⊆ whitelist; no consumer-owned names; hub includes `.gitignore` when present |
| AC2 | `testSkillAndFullPackageDigestDeterminism` | Each skill has `files` + `skillDigest`; `fullPackageDigest` present; regenerating matches |
| AC3 | `testGeneratorIdempotent` | Run generate twice → identical `skill-integrity.json` bytes; hex lowercase |
| AC4 | `testInstallAbortsOnSourceMismatch` | Fixture with corrupted source skill file vs manifest → install exit ≠0 and dest skill dir unchanged; with `--force-integrity` proceeds |
| AC5 | `testPostInstallWritesLocalRecord` | After clean `--package workflows --yes`, `skill-integrity-local.json` exists with closure digests + `verifiedAt`; consumer `config.json`/`MEMORY.md` untouched |
| AC6 | `testIntegrityAuditFailsOnMutation` | Install clean → mutate one managed `SKILL.md` → `integrity` exit ≠0 and prints path |
| AC7 | `testSelectiveClosureOnly` | `install --skills goal-fix-pr --yes` → audit OK without Extra-only skills present; missing `write-a-skill` not reported |
| AC8 | `testConsumerOwnedIgnored` | Edit `shared/MEMORY.md` / `config.json` after install → `integrity` still exit 0 |
| AC9 | `testCheckReportsFullPackageDigest` | Fixture: packageRoot manifest digest vs remote/fixture mismatch with equal semver → exit 1 and `fullPackageDigest: mismatch` labeled; match prints distinct from version lines |
| AC10 | umbrella | Cases AC4–AC6 + `testFullPackageDigestChangesOnFileEdit` (change one included file → regenerate → `fullPackageDigest` changes) |
| AC11 | `testCommittedManifestNotStale` | `node bin/generate-skill-integrity.js --check` in Phase 0b; `packageVersion` == `package.json.version` |
| AC12 | `testHelpAndReadmeMentionIntegrity` | `--help` mentions `integrity` / `--force-integrity`; README Safety section contains integrity + trust-boundary language |

## 6. Invariants (Do Not Violate)

From `config.json.invariants` + project rules:

- Do not commit `{plansDir}` / `specs/` artifacts except at Step 8 ship policy (`commitPlanFilesOnlyAtStep8`).
- Do not hash or overwrite consumer-owned hub files.
- Do not install `.agents/AGENTS.md` into consumers.
- Do not add legacy skill-folder migration maps.
- Do not invent parallel checksum formats or second manifest paths.
- Prefer Node launchers for scripts; keep managed `.sh` LF if any touched.
- Surgical edits only; no drive-by refactors of unrelated `cli.js` paths beyond install-rules extract + integrity hooks.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (cli / tests / docs only; no fake DB/UI layers).
- [ ] Domain entities and mappings encapsulated — N/A (no ORM).
- [ ] Schema migrations created — N/A.
- [ ] Authorization checks applied — N/A (local CLI; `--force-integrity` documented unsafe).
- [ ] i18n keys declared — N/A.
- [ ] Test cases cover all ACs (table §5).
- [ ] `bin/skill-integrity.json` regenerated and committed with content changes.
- [ ] `generate-skill-integrity.js --check` green; `npm run tests -- --local` green.
- [ ] `skill-integrity-local.json` gitignored + listed consumer-owned.
- [ ] README Safety documents commands, fail-closed, exclusions, unsigned trust limit, no post-copy rollback.
- [ ] If version bumped: `test/package.json` tarball path synced; site footer matches `package.json` if docs regenerated.

## 8. Open Questions

None blocking. Prior deferred items resolved by assumed defaults (AUTO):

1. **`integrity --against-published`:** deferred; v1 = local `integrity` + `--check` remote digest only.
2. **Post-copy verify failure:** fail-closed exit ≠0; no automatic rollback.
3. **Exit codes:** exit **1** with labeled messages (`fullPackageDigest: mismatch` vs version messaging).

## Interview registry

| id | class | section | gap | recommendation | status | resolution | dependsOn |
|----|-------|---------|-----|----------------|--------|------------|-----------|
| G1 | non-blocking | §2 enum | Skill walk skips `.gitignore` but hub whitelist copies `shared/.gitignore` | Document asymmetry; hash hub via whitelist only | resolved | Evidence: `HUB_WHITELIST` includes `.gitignore`; `SKIP_INSTALL_FILES` skips it in `copyDirSync`; hub uses whitelist `copyFileSync` | |
| G2 | non-blocking | §2 hub | When is hub in selective closure? | Mirror `shouldEnsureHub` + “shared/ already exists → refresh” | resolved | Evidence: `shouldEnsureHub` + `installSelectedSkills` ~775–777; Extra `ensureHub: false` still refreshes if `shared/` exists | |
| G3 | non-blocking | §8 Q2 | Post-copy fail leaves dirty tree | Document fail-closed; no rollback in v1 | resolved | assumed-default (AUTO) | |
| G4 | non-blocking | §8 Q1 | Ship `--against-published`? | Defer; `--check` covers remote digest | resolved | assumed-default (AUTO) | |
| G5 | non-blocking | §8 Q3 | Exit 1 vs 2 for digest mismatch | Lock exit 1 + labeled message | resolved | assumed-default (AUTO) | |
| G6 | non-blocking | §2 `--check` | Local digest source ambiguous (record vs package) | Use CLI `packageRoot/bin/skill-integrity.json` (mirrors `getLocalVersion`); never compare selective closure to remote full digest | resolved | Evidence: `getLocalVersion` reads `packageRoot/package.json`; AC9 = package-channel signal | |
| G7 | non-blocking | §2 AC4 | Partial copy before pre-verify fail | Pre-verify entire closure before first copy | resolved | Locked in §2 install flow + Step C | |
| G8 | non-blocking | §2 uninstall | Stale local record after uninstall | Rewrite local record for remaining installed set | resolved | assumed-default; keeps AC6 honest | |
| G9 | non-blocking | §2 integrity | Audit scope vs disk extras | Installed set from `installed-skills.json`; skip record-only absent skills (AC7); fail if installed missing from record | resolved | Locked in §2 `integrity` row | |
| G10 | non-blocking | §2 modules | Extract vs duplicate install rules | Prefer `bin/install-rules.js` minimal extract | resolved | assumed-default; prevents copy/hash drift | |
| G11 | non-blocking | §3 E | Test phase placement | Phase 0b stale gate + Phase 11 scenarios | resolved | Evidence: test-install ends at Phase 10 today | |
| G12 | non-blocking | probes | Soft-delete / concurrency / rate limits | N/A for local CLI; single HTTPS fetch | resolved | No product DB/UI; mirror existing `--check` timeout | |
| G13 | non-blocking | §1 | STACK.md missing in shared/ | Do not require STACK.md; hash `STACK.md.example` only | resolved | Evidence: gitignored; only `.example` on disk | |
