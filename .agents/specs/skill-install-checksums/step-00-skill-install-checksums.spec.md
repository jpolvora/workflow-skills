---
id: null
slug: skill-install-checksums
title: "Skill install checksum integrity (dependency graph + full package)"
source: local
specDate: 2026-07-20
---

# Specification — Skill install checksum integrity (dependency graph + full package)

## Description

Consumers install managed skills via `npx github:jpolvora/workflow-skills` (CLI in `bin/cli.js`). Today integrity is limited to a **semver** compare (`--check` / `--version` against remote `package.json`). There is **no** cryptographic digest of skill file contents, so a consumer cannot detect:

- Tampering of skill trees after download (man-in-the-middle or cache poison on the install path)
- Local edits or prompt-injection style rewrites of managed skill files between install and later use
- Drift between what the dependency graph says should be present and what is on disk
- Whether an `update` actually restored byte-identical upstream content for the selected closure

This feature adds a **checksum integrity mechanism** keyed to the install dependency graph (`bin/skill-dependencies.json`) plus a **general full-package checksum** for whole-tree / version checks.

### Goals

1. **Per-skill digests** — For every installable skill id in the dependency map (and the `shared/` hub templates that ship with install), compute stable content digests of managed files.
2. **Before install / update** — Verify the **source package** (npx cache / local package root being copied from) matches the published integrity manifest for that package version. Fail closed on mismatch unless the user explicitly opts into an unsafe override.
3. **After install / update** — Recompute digests on the consumer disk under `.agents/skills/` and compare to the expected digests for the installed closure. Fail closed on mismatch.
4. **Ongoing audit** — A CLI command (and optional check-harness hook) compares on-disk managed skills to the last recorded expected digests (and/or re-fetches the published manifest for the recorded package version).
5. **Full-package aggregate** — One root checksum over the ordered set of all managed file digests for the Full package (or “all installable skills + hub templates”), used by `--check` / update flows so version equality is not the only signal.

### Threat model (in scope)

| Threat | Mitigated by |
|--------|----------------|
| Post-download or post-install byte change of managed skill files | After-install verify + audit compare |
| Silent local edit of managed skills (incl. agent “hygiene” rewrites) | Audit / pre-update baseline vs published digests |
| Incomplete install vs dependency closure | Closure from `skill-dependencies.json` must all verify |
| “Version matches but tree differs” | Full-package aggregate checksum alongside semver |

### Out of scope (explicit)

- Cryptographic **publisher signing** (Sigstore, GPG, npm package signatures). Checksums assume a trusted channel for the published integrity manifest (same trust as fetching `package.json` from `main` today). Signing may be a follow-on.
- Hashing **consumer-owned** hub files (`config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, consumer `CHANGELOG.md`).
- Guaranteeing integrity of the **first** fetch of the integrity manifest itself against a determined MITM that also replaces the manifest (requires signing or pin). Spec still requires fail-closed compare once a trusted baseline exists.
- Changing skill runtime semantics or FSM behavior.

### Scope of hashed files

For each skill folder id under `.agents/skills/<id>/` (and hub templates under `.agents/skills/shared/` excluding consumer-owned names):

- Include: all files the installer would copy (same skip rules as `bin/cli.js`: no `__pycache__`, `.pyc`, `.pyo`, `.npmignore` / `.gitignore` as skipped today, no consumer-owned entries).
- Exclude: consumer-owned names listed in installer preservation rules; anything under `shared/memory/`; generated or local-only artifacts not shipped upstream.
- Normalization: hash **file bytes as stored in the package** (no line-ending rewrite during hash). Upstream must keep managed text files LF where already required by harness rules so Windows clones do not create false mismatches after a clean install from the package tarball/npx extract.

### Integrity artifacts

1. **Upstream publish artifact** (shipped in the package, generated at release / CI): e.g. `bin/skill-integrity.json` (exact path fixed in implementation plan) containing:
   - `packageVersion` (aligned with `package.json` version)
   - `algorithm` (must be `sha256`)
   - `skills`: map of skill-id → `{ files: { "<relative-path>": "<hex digest>" }, skillDigest: "<hex>" }`
   - `hub`: same shape for managed `shared/` template files (not consumer-owned)
   - `fullPackageDigest`: single hex digest over a **canonical ordered** concatenation of all per-file digests in the Full-package file set (document order: sorted skill ids, then sorted relative paths; hub after or before skills — pick one and lock it)
2. **Consumer record** (written/updated on successful install/update): extend `shared/installed-skills.json` **or** sibling `shared/skill-integrity-local.json` (prefer sibling so consumer edits to selected skills do not conflate with digests) with:
   - `packageVersion`
   - `fullPackageDigest` (of what was installed, or of full upstream if Full install)
   - expected digests for the **installed closure** only
   - `verifiedAt` ISO timestamp

### CLI / UX

| Action | Behavior |
|--------|----------|
| `install` / interactive install / `update` | Before copy: verify source package vs published integrity for that version. After copy: verify consumer tree vs expected digests for installed closure. On failure: non-zero exit, no silent continue (unless documented `--force-integrity` / equivalent unsafe flag). |
| New: `integrity` or `check --integrity` (name locked in plan) | Recompute on-disk digests for installed skills; compare to local record and optionally to published manifest for `packageVersion`. Print mismatched paths. |
| Existing `--check` | Keep semver compare; **also** report full-package digest equality when remote integrity manifest is available (or document phased: digests in v1 of feature, wire into `--check` in same change). |
| `update` | After refresh, rewrite local integrity record to match new upstream digests for the updated closure. |

### Dependency graph coupling

- Skill ids and closures come from `bin/skill-dependencies.json` (`packages.*`, `dependencies`, hub `ensureWhen`). Integrity generation and verify must use the **same** closure rules as install (transitive deps, hub ensure).
- Adding/removing/renaming a skill or changing shipped files requires regenerating the integrity artifact in the same PR/release as the content change.
- check-harness (or install tests) must fail if `skill-integrity.json` is missing, stale vs current tree, or disagrees with `package.json` version field.

## Acceptance Criteria

- AC1: Upstream ships a machine-readable integrity manifest (SHA-256) covering every installable skill folder and managed `shared/` hub template files, excluding consumer-owned names, using the same include/skip rules as the installer copy path.
- AC2: Each skill entry in the manifest includes per-file digests (paths relative to the skill root) and a deterministic `skillDigest` derived from those file digests; the manifest also includes a deterministic `fullPackageDigest` over the Full-package file set with a documented canonical sort order.
- AC3: A maintained generator (script under `bin/` or CI step) rebuilds the integrity manifest from the repo tree; running it on a clean tree produces bit-identical output (stable ordering, stable hex encoding).
- AC4: `install` and `update` verify the **source** package against the integrity manifest **before** copying skill trees into the consumer; on mismatch the command exits non-zero and does not overwrite consumer skill dirs (unless an explicit unsafe override flag is used).
- AC5: After a successful `install` or `update`, the CLI verifies the **consumer** on-disk managed files for the installed dependency closure against expected digests and writes/updates a local integrity record under `shared/` (not overwriting consumer-owned config/MEMORY/stack).
- AC6: An audit command recomputes digests for currently installed managed skills and reports each mismatched or missing path; exit code is non-zero when any mismatch exists.
- AC7: Verifying a selective install (e.g. one skill + transitive deps) only requires digests for that closure; skills not installed are not required to be present, and their absence is not reported as failure.
- AC8: Consumer-owned paths (`config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, and configured consumer changelog when under `shared/`) are never included in digests and never fail integrity checks when edited.
- AC9: `--check` (or the documented integrity-aware check) compares local vs remote **fullPackageDigest** (when remote manifest fetch succeeds) in addition to semver, and surfaces digest mismatch distinctly from version mismatch.
- AC10: Automated tests under `test/` cover: clean install passes integrity; mutating one managed file after install causes audit failure; unsafe override is required to proceed past a deliberate source mismatch in a controlled test fixture; Full-package digest changes when any included file changes.
- AC11: Release/CI (or `check-harness` / `npm run tests`) fails if the committed integrity manifest does not match a freshly generated manifest for the current tree and `package.json` version.
- AC12: Human docs (`README.md` Safety / install section) document the integrity commands, fail-closed behavior, consumer-owned exclusions, and the limit that unsigned manifests share the same trust boundary as today’s remote `package.json` fetch.

## Notes

- **Canonical workflow path for this US:** `specs/skill-install-checksums/step-00-skill-install-checksums.spec.md` (`plans.dir` = `specs` for this repo).
- Related existing pieces: `bin/skill-dependencies.json`, `bin/cli.js` copy/skip/preserve rules, `shared/installed-skills.json`, `--check` / `--version`.
- Prefer SHA-256 hex lowercase; avoid MD5/SHA-1.
- Prompt-injection / agent rewrite defense is **detection + fail audit**, not prevention of the first malicious write; pair with existing “no silent managed-skill refactors” policy in `shared/AGENTS.md`.
- If implementation splits files: keep one published manifest path; do not invent parallel checksum formats.
- Optional later: signed manifest, pinning digests in consumer lockfile committed to git — not required for this US.
)
