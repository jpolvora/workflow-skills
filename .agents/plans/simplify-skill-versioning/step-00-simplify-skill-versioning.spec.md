---
id: null
slug: simplify-skill-versioning
title: Centralize skill package versioning and bind versions to integrity checksums
source: local
specDate: 2026-09-26
step: 0
workflowId: simplify-skill-versioning-20260927T015020Z
status: completed
startedAt: "2026-09-27T01:50:20.399Z"
endedAt: "2026-09-27T01:50:20.399Z"
acRefs: []
---
# Specification — Centralize skill package versioning and bind versions to integrity checksums

## Description

The package currently repeats the release version in every packaged `SKILL.md`, `package.json`, both dependency manifests, generated site output, and integrity metadata. `build-site --bump` rewrites every skill body only to keep frontmatter versions aligned. This creates a large mechanical diff and makes version drift easier to introduce.

Introduce one authored version file at `.agents/skills/ws-shared/version.json`. Its `version` property is the package semantic version. The build and integrity pipeline reads that value as the canonical skill/package version, synchronizes required generated compatibility surfaces such as `package.json`, dependency manifests, telemetry provenance, and the website footer, and never adds or rewrites a per-skill `version` frontmatter field.

The integrity manifest must bind the canonical version into every packaged skill checksum. A version bump therefore changes each skill integrity digest and the aggregate package digest even when no skill body bytes changed. Installed consumers must receive and validate the managed `version.json` through the existing local/global and relocatable-hub installation rules.

Architecture touchpoints are the version/site builder, `bin/skill-integrity-lib.js`, `bin/generate-skill-integrity.js`, installer and hub-layout rules, package/dependency metadata, runtime package-version resolution, all version/frontmatter tests, harness documentation, and generated website/catalog surfaces.

## Acceptance Criteria

- AC1: `.agents/skills/ws-shared/version.json` exists as the single authored semantic-version source, contains a valid `version` property with exactly one `major.minor.patch` value, and is classified as managed hub content rather than consumer-owned data.
- AC2: A normal build reads the canonical value from `version.json`; a release bump changes that file once and synchronizes npm-required `package.json.version`, `bin/skill-dependencies.json.packageVersion`, `.agents/skills/ws-shared/runtime/skill-dependencies.json.packageVersion`, generated site footer/version surfaces, and any package-version provenance that currently derives from the release version.
- AC3: Release/build logic never inserts, rewrites, or requires `version:` in a packaged `.agents/skills/ws-*/SKILL.md`. Every packaged primary skill frontmatter remains valid without that field, and a new skill can be added without editing existing skill bodies for a release bump.
- AC4: The integrity generator reads the canonical version and includes it in the deterministic input used to calculate every `skills[skillId].skillDigest` and the aggregate `fullPackageDigest`. The manifest records the effective version needed to explain or verify that binding.
- AC5: With identical managed file bytes and identical `version.json`, repeated integrity generation is byte-stable across supported platforms and EOL styles. Changing only `version.json` changes every packaged skill digest and the aggregate digest; changing one managed skill file changes that skill digest and the appropriate aggregate digest.
- AC6: `npm run verify-integrity` and the equivalent direct generator check fail closed with an actionable diagnostic when `version.json` is missing, malformed, contains multiple version values, disagrees with generated package/dependency metadata, or leaves `bin/skill-integrity.json` stale.
- AC7: The installer and integrity enumerator copy and hash `version.json` for project-local and global installs, including configured hub resolution and hybrid local-config/global-skill execution. A consumer missing the new managed version file receives an explicit outdated-install/update diagnostic and is never silently versioned from an arbitrary skill frontmatter field.
- AC8: Consumer-local integrity records and package-version resolution continue to expose the canonical release version for update checks, telemetry, monitor output, and closure verification. Installed closure digests include the version-bound skill digests without treating consumer-owned config, memory, changelog, or local integrity files as upstream content.
- AC9: The hub layout, installer include/exclude rules, package tarball checks, dependency manifests, harness checks, and runtime documentation agree on the `version.json` location and ownership. No duplicate version source or legacy direct-hub alias is introduced.
- AC10: Version-frontmatter helpers and tests are removed or repurposed so no supported build path can stamp per-skill versions. Tests that currently assert `SKILL.md` version fields are replaced with central-version and no-frontmatter-field assertions, including skill-frontmatter, pre-daily, wiki, spec-manager, patterns-generator, install, and harness-clean coverage.
- AC11: Documentation and generated artifacts are synchronized: root `AGENTS.md`, consumer hub guidance, `CATALOG.md`, `README.md`, `FEATURES.md` when enabled, skill-authoring guidance, integrity/build instructions, and `docs/index.html` describe central versioning and version-bound checksums without instructing authors to edit every skill file.
- AC12: Existing package and harness behavior unrelated to version sourcing remains unchanged: skill ids and dependency closure, consumer-owned data preservation, SHA-256/EOL canonicalization, package installation scopes, telemetry schema field names, and the `node`-only runtime contract remain compatible.
- AC13: `npm run test`, `npm run generate-integrity`, `npm run verify-integrity`, `node test/test-harness-clean.js`, the relevant `ws-check-harness` phases, and the package tarball/install fixture pass with the regenerated manifest and no stale per-skill version assertions.

## Original Issue Context

The local request was: “Improve versioning in skills by removing need of increment version in each skill file. Add a file VERSION.md in ws-shared folder, and attach the version to the checksum of all skills during build/PR. So when bumping version doesn't need to write to all skill files. Remove version field from the skill files. Simplify versioning.” The requested filename was refined during authoring to `version.json`.

### Prior Work Sweep

- Local history identified the original SHA-256 skill-install integrity implementation (`0cb32bd8`) and the skill-family release work that introduced synchronized per-skill frontmatter versions (`3479171b`).
- Current code confirms `build-site --bump` rewrites every `SKILL.md` through `bin/skill-frontmatter.js`, while `bin/generate-skill-integrity.js` and `bin/skill-integrity-lib.js` use package metadata and file digests.
- The configured GitHub prior-PR sweep returned no matching pull requests. Its recent file history includes release synchronization and hub-layout changes, so the implementation must preserve the existing managed-hub and integrity contracts.

### Design Intent

The repeated `SKILL.md` version is a release-synchronization mechanism, not skill behavior or identity. Centralizing it removes a mechanical source of drift while retaining package-version metadata where npm, installers, telemetry, and the website require it. Version input is deliberately added to checksum material so a release remains observable to integrity verification even when a release changes no skill body.

## Notes

- Recommended `version.json` shape:

  ```json
  {
    "version": "0.4.78"
  }
  ```

Parsing must require one valid `version` property and reject malformed JSON, extra version values, or non-semver values. The implementation must fail closed rather than guess when the value is absent or ambiguous.
- The requested path is the direct managed hub path `.agents/skills/ws-shared/version.json`. Because current hub copying and hashing are root-based, the implementation must extend the hub-layout-driven managed-entry enumeration to cover this file instead of adding an unrelated hardcoded installer exception.
- `package.json.version` remains present because npm metadata requires it, but it becomes a generated compatibility projection of `version.json`, not an independent source. The release command may update generated projections atomically; authors should bump the canonical file only.
- Preserve package-level `packageVersion` fields in manifests and telemetry as derived provenance. The change removes per-skill frontmatter `version`, not package-release provenance.
- Do not rewrite historical specifications, benchmark fixtures, changelog entries, or external consumer skills solely to remove their historical version examples. Update active packaged contracts, tests, and generated surfaces that enforce the old behavior.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing semantic-version rules or release cadence | The request removes duplicated storage, not the package release policy. |
| Removing `package.json.version` or package-level `packageVersion` telemetry | npm, installers, update checks, and observability still need package provenance. |
| Redesigning SHA-256, consumer data ownership, or skill dependency resolution | These are existing contracts and only need version integration. |
| Migrating unrelated historical artifacts or external `ws-*` packages | They are not active packaged skill sources for this change. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Canonical file location | `.agents/skills/ws-shared/version.json` | Matches the requested hub location and keeps the version beside managed shared package assets. | n |
| Version file format | JSON object with one string `version` property containing semver | Machine-readable and deterministic to parse and validate. | n |
| Generated compatibility metadata | Keep and synchronize `package.json.version`, both `packageVersion` fields, and site/provenance outputs | Existing consumers and npm require these fields even though authors should edit only `version.json`. | n |
| Legacy installed trees without `version.json` | Fail with an actionable update diagnostic; do not infer from a skill body | Silent fallback would preserve the duplicated contract this change removes. | n |
| Product UI, auth, rate limits, data expiry, and external service retries | N/A because this is a local build, packaging, and integrity change with no user/data service boundary. | These dimensions do not apply; deterministic build failure and installer diagnostics are covered by the ACs. | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Central version source, version-aware integrity, installer/hub classification, generated metadata, tests, and synchronized docs are identified; no release-policy redesign is included. | Review touched-file plan against AC1–AC13 and the out-of-scope table. |
| Atomic criteria | Each required behavior has a deterministic pass/fail AC, including no-frontmatter, version-only digest changes, and malformed-source failures. | Review ACs and add focused unit/fixture cases before implementation. |
| Stack invariants | Node 22/CommonJS helper and ESM package conventions remain; no Python helper or host-specific contract is added. | `node --check` on changed CommonJS helpers, stack invariant scan, and harness checks. |
| Packaging boundary | `version.json` is managed upstream content, not consumer-owned config or local integrity state. | Hub-layout validation, tarball inspection, and project/global install fixture. |
| Determinism | Version parsing, checksum serialization, EOL normalization, and generated JSON ordering are specified and stable. | Repeat generation and compare bytes on the supported test fixture; run `verify-integrity`. |
| Failure modes | Missing, malformed, ambiguous, stale, and metadata-drift cases have explicit diagnostics and non-zero checks. | Negative unit tests and generator `--check` fixtures. |
| Observability | Build output identifies the canonical version and integrity manifest version/digest; telemetry keeps package provenance. | Inspect generator output, manifest fields, and telemetry/monitor tests. |
| Zero open blockers | Existing integrity, hub-layout, installer, package, and documentation contracts have been located; no matching PR duplicates the work. | Prior-work sweep above plus implementation plan review. |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/pending/0140-simplify-skill-versioning.spec.md` must exit 0.
- `npm run generate-integrity` must regenerate the manifest from `version.json`; a second generation with no source changes must be byte-identical.
- `npm run verify-integrity` must report the manifest, canonical version, and version-bound digests as current.
- `npm run test`, `node test/test-harness-clean.js`, and relevant `ws-check-harness` phases must report no version-source, hub-layout, or stale-frontmatter findings.

### Negative & Failing Test Scenarios

- Generation fails non-zero with a path-specific diagnostic when `version.json` is absent, malformed, missing `version`, or contains a non-semver value.
- Integrity verification fails when the manifest version is changed without regenerating, when package/dependency projections disagree with `version.json`, or when a version-bound digest is computed with a different version.
- A version-only change causes every packaged skill digest and `fullPackageDigest` to differ; a file-only change affects the changed skill and aggregate digest without rewriting any `SKILL.md`.
- An installed consumer tree without `ws-shared/version.json` is rejected with an update/migration diagnostic instead of falling back to per-skill frontmatter.
- A consumer-owned config, memory, changelog, or local integrity file remains byte-identical after update and closure verification.
