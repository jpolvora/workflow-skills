---
slug: skill-install-checksums
title: "Skill install checksum integrity (dependency graph + full package)"
status: "plan to be refined"
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
2. Same include/skip rules as installer copy (`HUB_WHITELIST`, `SKIP_INSTALL_FILES`, `shouldSkipInstallEntry`, consumer-owned exclusions).
3. Hash **file bytes as stored** (no line-ending rewrite during hash). Upstream keeps managed text LF (harness / MEMORY CRLF traps).
4. Consumer-owned hub paths never enter digests and never fail integrity when edited.
5. Closure from `bin/skill-dependencies.json` (transitive deps + hub `ensureWhen`) must match install.
6. Unsigned manifest shares today’s trust boundary (raw GitHub `package.json` / same channel for integrity JSON). Document that limit; no Sigstore/GPG in this US.
7. Detection of agent “hygiene” rewrites = audit fail, not prevention of first write (pairs with managed-skills policy).

**MEMORY applied:** Node for integrity logic (launchers); no bash CRLF path; do not silently refactor managed skills; regenerate integrity when skill tree / deps change; keep `packageVersion` aligned with `package.json` (site footer must not drift); after CLI edits run `npm run tests -- --local`; sync `test/package.json` tarball path on version bump.

## 1. Definition of Ready & Scope

**Assumptions (resolved):**

- Stack = Node 22 ESM CLI (`bin/cli.js`) + Markdown skills hub. No DB, no frontend app, no RBAC/tenancy/i18n product layers.
- `{plansDir}` = `specs` for this repo; plan/spec stay under `specs/skill-install-checksums/` (not committed at Step 8 per invariant).
- Installable skills = folders under `.agents/skills/` with `SKILL.md`, excluding `shared/` as a skill id.
- Hub hashed set = files the installer would copy from `HUB_WHITELIST` (templates/docs only), not consumer-owned names.
- Remote fetch for `--check` uses same host pattern as today: `raw.githubusercontent.com/jpolvora/workflow-skills/main/...`.

**In scope:**

- Generator + committed `bin/skill-integrity.json`
- Shared hash/verify module used by generator and CLI
- Pre-copy source verify + post-copy consumer verify on `install` / `update`
- Local record write on success
- `integrity` audit command
- `--check` reports `fullPackageDigest` equality when remote manifest available
- Tests under `test/`; stale-manifest gate in tests and/or check-harness
- README Safety / install docs

**Out of scope:**

- Publisher signing / pinning lockfile
- Hashing consumer-owned hub files
- FSM / skill runtime behavior changes
- Migrating older checksum formats (none exist)

**Acceptance Criteria (measurable):** AC1–AC12 as in `step-00-skill-install-checksums.spec.md` (mapped in §3 and §5).

## 2. Technical Design & Architecture

### Layers (from `config.json.stack.backend.layers`)

| Layer | Path | Changes |
|-------|------|---------|
| **cli** | `bin/` | New integrity module + generator; wire verify into `cli.js`; `integrity` + `--check` |
| **skills** | `.agents/skills/` | Optional: check-harness note for stale manifest; hub `.gitignore` for local record; no skill body semantics change |
| **tests** | `test/` | New integrity phases in `test-install.js` |
| **docs** | `README.md` | Safety / install / commands |
| **packaging** | `package.json` | `files` already includes `bin/`; add npm script for generator; ensure `skill-integrity.json` ships |

**Frontend / DB:** N/A (`frontend.framework: none`, `database.type: none`).

### Module split (surgical)

Prefer one shared library so generator and CLI cannot drift:

| File | Role |
|------|------|
| `bin/skill-integrity-lib.js` | Enumerate files, hash, build skillDigest / fullPackageDigest, compare, load/write manifests |
| `bin/generate-skill-integrity.js` | CLI entry: walk package root → write `bin/skill-integrity.json` (stable JSON) |
| `bin/cli.js` | Call lib before/after copy; `integrity` command; extend `--check` |
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
  "fullPackageDigest": "<digest of what was verified for this install; Full install = fullPackageDigest; selective = closure aggregate documented as installedClosureDigest>",
  "installedClosureDigest": "<optional; sha256 over ordered digests for installed skills + hub if ensured>",
  "skills": { "<id>": { "files": {...}, "skillDigest": "..." } },
  "hub": { "files": {...}, "skillDigest": "..." } | null,
  "verifiedAt": "<ISO-8601>"
}
```

**Canonical digest rules (lock):**

1. Per-file: `sha256(fileBytes).hex` lowercase.
2. `skillDigest`: `sha256` over UTF-8 lines `relPath + "\\0" + fileDigest + "\\n"` for each file in **sorted** `relPath` order (posix separators).
3. `fullPackageDigest`: over Full-package set = **all installable skill ids** (sorted) then for each skill its sorted file digests (same line format), then **hub** entries after skills (`hubPlacement: after-skills`). Include hub only if hub templates exist (always in this repo).
4. Selective `installedClosureDigest`: same algorithm restricted to installed skill ids (sorted) + hub when hub was ensured for that install.

### File enumeration (must mirror installer)

Reuse / extract predicates already in `cli.js`:

- Skip: `__pycache__`, `*.pyc`, `*.pyo`, `.npmignore`, `.gitignore` (as `SKIP_INSTALL_FILES` / `shouldSkipInstallEntry`).
- Skill trees: never include consumer-owned names (`config.json`, `MEMORY.md`, `memory/`).
- Hub: only `HUB_WHITELIST` names that exist; never `config.json`, `STACK.md`, `MEMORY.md`, `CHANGELOG.md`, `installed-skills.json`, `memory/`, **or** `skill-integrity-local.json`.
- Paths relative to skill root / `shared/` root; always store with `/`.

**Export shared skip/whitelist constants** from lib or import from a tiny `bin/install-rules.js` split out of `cli.js` so copy path and hash path cannot diverge (prefer extract shared constants once; avoid large `cli.js` rewrite).

### Dependency graph coupling

- Skill id list for Full package = same as `packages.full.select: all-skills` / `listInstallableSkills`.
- Selective install closure = existing install resolution (roots + transitive `dependencies` + hub when `ensureWhen` matches).
- Regenerating integrity is required in the same PR as any skill file / deps / hub template change (AC11).

### CLI / UX flows

| Command | Behavior |
|---------|----------|
| `install` / interactive / `update` | **Before copy:** load source `bin/skill-integrity.json`; verify source tree vs manifest for skills about to be copied (Full → all + hub; selective → closure + hub if ensured). Mismatch → exit ≠0, no overwrite (unless `--force-integrity`). **After copy:** recompute consumer digests for installed closure; compare to expected; write `skill-integrity-local.json`; mismatch → exit ≠0 (after copy already happened: report hard fail; document that `--force-integrity` skips both gates). |
| `integrity` | Read local record (required). Recompute on-disk digests for **installed** skills (+ hub if present in record). Print each mismatched/missing/extra path. Exit ≠0 on any failure. Optional flag `--against-published` (if cheap): fetch remote `bin/skill-integrity.json` for `packageVersion` and compare; default v1 = local record only + print note. Prefer keeping first ship to local-record compare to limit scope; remote compare may reuse `--check` path. |
| `--check` / `check` | Keep semver compare. Additionally fetch `https://raw.githubusercontent.com/jpolvora/workflow-skills/main/bin/skill-integrity.json`. If fetch OK and local record or local package manifest has `fullPackageDigest`, print digest equality / mismatch distinctly from version lines. If remote unreachable for integrity but version OK → warn, do not fail solely on missing digest (semver unreachable still fails as today). Digest mismatch with equal version → non-zero exit or clear “digest mismatch” status (prefer non-zero for AC9 “surfaces distinctly”; implement as exit 2 or exit 1 with labeled line — lock: **exit 1** with message `fullPackageDigest: mismatch`). |
| `--force-integrity` | Global flag parsed on install/update (and documented as unsafe). Skips pre/post integrity gates; still writes local record from **actual** on-disk digests after copy (so audit baseline reflects what landed). |

### Packaging / CI

- Commit generated `bin/skill-integrity.json` in-repo (shipped via `files: ["bin/"]`).
- `package.json` script e.g. `"generate-integrity": "node bin/generate-skill-integrity.js"`.
- Stale gate: `node bin/generate-skill-integrity.js --check` (compare to committed file + assert `packageVersion === package.json.version`) exits ≠0 on drift; call from `test/test-install.js` Phase 0b (or new Phase) and document for check-harness upstream Phase 3.
- On intentional release: bump `package.json` → regenerate integrity → sync `test/package.json` tarball path (MEMORY).

### Invariants (`config.json.invariants`)

- `commitPlanFilesOnlyAtStep8: true` — do not commit `specs/` in implementation commits until ship policy says so.
- No EF/tenancy invariants apply.

## 3. Step-by-Step Plan

Ordered by dependency. Each step: action, files, checks.

### Step A — Shared install-rules + integrity library

- **Action:** Extract or duplicate carefully shared constants/helpers (`HUB_WHITELIST`, skip sets, consumer-owned sets, path walk matching `copyDirSync` / hub whitelist copy). Implement hash helpers, skillDigest, fullPackageDigest, load/save JSON with **stable key ordering** (sorted keys) for bit-identical generator output.
- **Files:** `bin/skill-integrity-lib.js` (+ optional `bin/install-rules.js` if extract from `cli.js`).
- **Checks:** `node --check bin/skill-integrity-lib.js`; unit-style smoke via temporary fixture dir in generator `--check` dry run.
- **ACs:** AC1, AC2, AC8 (exclusions).

### Step B — Generator + committed manifest

- **Action:** Implement `bin/generate-skill-integrity.js` reading package root, writing `bin/skill-integrity.json`. Support `--check` (no write; exit ≠0 if drift or version mismatch). Add npm script. Run once and commit the artifact in the implementation PR (not this plan step).
- **Files:** `bin/generate-skill-integrity.js`, `bin/skill-integrity.json`, `package.json` scripts.
- **Checks:** Two consecutive generate runs produce identical file bytes; `--check` green on clean tree.
- **ACs:** AC1–AC3, AC11.

### Step C — Wire install/update verify + local record

- **Action:** Parse `--force-integrity`. Before skill copy in install/update/interactive paths: verify source. After successful copy + hub ensure: verify consumer closure; write `skill-integrity-local.json`. Add `skill-integrity-local.json` to `CONSUMER_OWNED_HUB_FILES` and `shared/.gitignore` so update never overwrites / pack never ships it.
- **Files:** `bin/cli.js`, `.agents/skills/shared/.gitignore`.
- **Checks:** Manual local: install into `test/` temp; mutate managed file → post-verify fail; `--force-integrity` allows proceed.
- **ACs:** AC4, AC5, AC7, AC8.

### Step D — `integrity` audit + `--check` digest

- **Action:** Add `integrity` command (help text). Extend `--check` to fetch remote integrity and compare `fullPackageDigest`. Distinct messaging for version vs digest.
- **Files:** `bin/cli.js` (`printHelp`, `main`).
- **Checks:** Help lists `integrity` and `--force-integrity`; `--check` prints digest line when remote available.
- **ACs:** AC6, AC9.

### Step E — Automated tests

- **Action:** Extend `test/test-install.js` (prefer new Phase, e.g. Phase 0d / Phase 11) covering AC10 scenarios; invoke generator `--check` for AC11.
- **Files:** `test/test-install.js`.
- **Checks:** `npm run tests -- --local` green (repack after CLI edits — MEMORY).
- **ACs:** AC10, AC11.

### Step F — Docs + harness note

- **Action:** Document integrity commands, fail-closed behavior, consumer exclusions, unsigned-manifest trust limit in `README.md` Safety / install. Optionally add one check-harness Phase bullet: integrity manifest present and `--check` clean (upstream only).
- **Files:** `README.md`; optionally `.agents/skills/check-harness/SKILL.md` (minimal).
- **Checks:** Help + README command strings aligned; no host product names in skill prose.
- **ACs:** AC12, AC11.

### Step G — Release hygiene (when version bumps)

- **Action:** If PR bumps version: regenerate integrity, sync `test/package.json` `file:../workflow-skills-<ver>.tgz`, stamp site without accidental dual bump (MEMORY: package.json canonical).
- **Files:** `package.json`, `test/package.json`, `docs/` only if site regen required for catalog (not required for integrity-only unless version bump policy triggers).
- **Checks:** footer version == `package.json` if site touched.

## 4. Permissions, Tenancy & i18n

N/A for this stack (`tenancyField` empty; `frontend.i18n.framework: none`; no RBAC). CLI is local-process trust; integrity is consumer-facing detection only.

## 5. Test Coverage

Map each AC → concrete cases in `test/test-install.js` (and generator `--check`).

| AC | Test / method name (proposed) | Assertion |
|----|-------------------------------|-----------|
| AC1 | `testIntegrityManifestCoversInstallableSkills` | Manifest `skills` keys == `listInstallableSkills`; hub files ⊆ whitelist; no consumer-owned names |
| AC2 | `testSkillAndFullPackageDigestDeterminism` | Each skill has `files` + `skillDigest`; `fullPackageDigest` present; regenerating matches |
| AC3 | `testGeneratorIdempotent` | Run generate twice → identical `skill-integrity.json` bytes; hex lowercase |
| AC4 | `testInstallAbortsOnSourceMismatch` | Fixture with corrupted source skill file vs manifest → install exit ≠0 and dest skill dir unchanged; with `--force-integrity` proceeds |
| AC5 | `testPostInstallWritesLocalRecord` | After clean `--package workflows --yes`, `skill-integrity-local.json` exists with closure digests + `verifiedAt`; consumer `config.json`/`MEMORY.md` untouched |
| AC6 | `testIntegrityAuditFailsOnMutation` | Install clean → mutate one managed `SKILL.md` → `integrity` exit ≠0 and prints path |
| AC7 | `testSelectiveClosureOnly` | `install --skills goal-fix-pr --yes` → audit OK without Extra-only skills present; missing `write-a-skill` not reported |
| AC8 | `testConsumerOwnedIgnored` | Edit `shared/MEMORY.md` / `config.json` after install → `integrity` still exit 0 |
| AC9 | `testCheckReportsFullPackageDigest` | Mock or local pack: `--check` prints digest match/mismatch distinct from version; mismatch → exit ≠0 when versions equal but digests differ (fixture) |
| AC10 | umbrella | Cases AC4–AC6 + `testFullPackageDigestChangesOnFileEdit` (change one included file → regenerate → `fullPackageDigest` changes) |
| AC11 | `testCommittedManifestNotStale` | `node bin/generate-skill-integrity.js --check` in Phase 0; `packageVersion` == `package.json.version` |
| AC12 | `testHelpAndReadmeMentionIntegrity` | `--help` mentions `integrity` / `--force-integrity`; README Safety section contains integrity + trust-boundary language (string smoke or manual checklist in Phase 0b) |

## 6. Invariants (Do Not Violate)

From `config.json.invariants` + project rules:

- Do not commit `{plansDir}` / `specs/` artifacts except at Step 8 ship policy (`commitPlanFilesOnlyAtStep8`).
- Do not hash or overwrite consumer-owned hub files.
- Do not install `.agents/AGENTS.md` into consumers.
- Do not add legacy skill-folder migration maps.
- Do not invent parallel checksum formats or second manifest paths.
- Prefer Node launchers for scripts; keep managed `.sh` LF if any touched.
- Surgical edits only; no drive-by refactors of unrelated `cli.js` paths.

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
- [ ] README Safety documents commands, fail-closed, exclusions, unsigned trust limit.
- [ ] If version bumped: `test/package.json` tarball path synced; site footer matches `package.json` if docs regenerated.

## 8. Open Questions

None blocking (decisions locked in state). Deferred / optional (do not block implementation):

1. Should `integrity --against-published` ship in v1, or is `--check` digest compare enough? **Plan default:** local `integrity` + `--check` remote digest; add `--against-published` only if trivial reuse of fetch helper.
2. Post-copy verify failure leaves partially overwritten trees: acceptable fail-closed with non-zero exit (documented); no automatic rollback required for this US unless interview demands it.
3. Exact exit code taxonomy (1 vs 2 for digest vs version) — plan locks **exit 1** with labeled messages unless interview prefers distinct codes.
