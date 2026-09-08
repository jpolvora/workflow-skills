---
id: null
slug: ws-shared-hybrid-config-layout
title: "Separate ws-shared Runtime, Templates, and Consumer Configuration for Hybrid Installs"
source: local
specDate: 2026-09-08
---

# Specification — Separate ws-shared Runtime, Templates, and Consumer Configuration for Hybrid Installs

## Description

`ws-shared/` currently mixes four different concerns in one directory:

1. Files required by `ws-*` workflow execution and agent routing.
2. Setup-only templates such as `config.json.example` and `STACK.md.example`.
3. Consumer-owned project configuration and human-maintained state.
4. Installer bookkeeping and machine-local integrity/cache data.

The installer and integrity code already maintain parallel lists (`HUB_WHITELIST`, consumer-owned exclusions, package exclusions, and template seed logic), but the classification is implicit. This makes it difficult to tell which files a consumer must keep, which files a global install owns, and which files should be source-controlled.

Hybrid execution has a second gap. A skill body may be loaded from a canonical or secondary global skills root while the workflow must read project-specific configuration from `$PWD/.agents/skills/ws-shared/config.json`. `ws-configure-project` must therefore distinguish the skill execution source from the consumer project target. When its skill is global, it should materialize only the consumer configuration needed by the target project. When its skill is project-local, it should use the already-installed local hub and update the local configuration without copying global files.

### Proposed layout

Keep `{sharedDir}` as the stable consumer configuration root so existing workflow state and path-token contracts remain recognizable. Organize managed package content below it:

```text
{sharedDir}/
├── runtime/                 # managed files required by ws-* and hub resolution
│   ├── docs and contracts
│   ├── schemas/
│   ├── scripts/
│   └── stacks/
├── templates/               # managed setup-only seed files
│   ├── config.json.example
│   ├── STACK.md.example
│   ├── MEMORY.md.template
│   ├── CHANGELOG.md.template
│   └── hub.gitignore
├── config.json              # consumer-owned project configuration
├── STACK.md                 # consumer-owned stack companion
├── MEMORY.md                # generated local memory index
├── memory/                  # generated local memory entries
├── CHANGELOG.md             # generated local task history
└── installer state/cache    # scope-specific, non-project configuration
```

The implementation must provide a machine-readable layout manifest as the single classification source. It must identify runtime-managed files, setup templates, consumer-owned files, generated local state, and installer metadata. All installer copy rules, integrity enumeration, migration logic, and configure-project source-control reporting must consume or validate that manifest rather than maintain unrelated hardcoded file lists.

### Installation and configuration modes

| Mode | Skill/runtime source | Consumer config source | Required write behavior |
|------|----------------------|------------------------|--------------------------|
| Project-local | `$PWD/.agents/skills` | `$PWD/{sharedDir}` | Update only consumer configuration; do not copy managed global/runtime files |
| Global-hybrid | A configured global skills root or secondary global target | `$PWD/{sharedDir}` | Create/update only the minimal consumer configuration bundle; keep runtime/templates global |
| Global-root cwd | A global skills root is also the current directory | Explicit `--repo-root` | Refuse to infer the global directory as a consumer project; require an explicit target or stop |

Local project configuration always wins over global defaults. A global skill source must never cause a global hub's `config.json`, `STACK.md`, `MEMORY.md`, `memory/`, or `CHANGELOG.md` to be used as another project's consumer data.

## Acceptance Criteria

- AC1: `.agents/skills/ws-shared/` has a committed machine-readable layout manifest that classifies every managed entry as `runtime`, `template`, `consumer-owned`, `generated-local`, or `installer-metadata`, with no unclassified or multiply classified entries.
- AC2: Managed runtime content is organized under `ws-shared/runtime/`, setup-only seed assets are organized under `ws-shared/templates/`, and consumer-owned project data remains under the stable `{sharedDir}` root required by the config contract.
- AC3: The layout manifest is the source of truth for `HUB_WHITELIST`, consumer-owned exclusions, package inclusion/exclusion, integrity hashing, template seeding, and migration checks; tests fail when any of those surfaces drift from the manifest.
- AC4: Runtime path resolution exposes the selected consumer project root, execution scope (`project-local` or `global`), runtime source, and template source, while preserving project-local `{sharedDir}/config.json` precedence over any global hub configuration.
- AC5: A project-local `ws-configure-project` invocation reads the local runtime/templates, creates or updates only the project-local consumer configuration, and leaves global skill roots and managed local runtime/template files unchanged.
- AC6: A global `ws-configure-project` invocation launched from the canonical global root, a configured secondary global target, or another configured global skills root accepts an explicit `--repo-root` and resolves the target project's `{sharedDir}` independently of the skill source location.
- AC7: Global configure writes only project `config.json`, accepted/generated `STACK.md`, and required portable pointer/autoload files; it never copies `runtime/`, `templates/`, package manifests, integrity records, or global memory/history.
- AC8: When a global configure invocation runs with a consumer repository as the current directory and no `--repo-root`, it targets that repository; when the current directory is itself a global skills root, it stops with an actionable target-project gate and never writes consumer files into the global root.
- AC9: A project-local execution never falls back to copying files from a global hub, and a global-hybrid execution never resolves consumer `config.json`, `STACK.md`, memory, history, plans, or reviews relative to the global skill file path.
- AC10: Install, update, and uninstall are scope-symmetric: project-local installs manage the project-local runtime/templates and project manifest, global installs manage the global runtime/templates and global manifest, and global-hybrid configuration does not create a second project installer manifest.
- AC11: Updating an existing installation migrates known flat managed hub files into the new runtime/templates layout, preserves all consumer-owned files byte-for-byte, fails closed on destination collisions or unknown managed entries, and is idempotent on a second run.
- AC12: `ws-configure-project` reports a source-control matrix in human-readable and JSON output that identifies project configuration, managed install content, generated local state, and installer/cache metadata, including which files are required to run workflows and which files are safe to omit from a consumer commit.
- AC13: The consumer source-control policy recommends tracking non-secret project configuration (`{sharedDir}/config.json` and a maintained `STACK.md` when present), keeps credentials as environment-variable references only, and ignores generated memory/history, installer manifests, integrity/cache files, and managed package copies by default.
- AC14: `ws-check-harness`, runtime path audits, package tarball checks, and integrity checks understand the new runtime/templates layout and do not report missing hubs when a valid global-hybrid project contains only the minimal local configuration bundle.
- AC15: Regression tests cover project-local configuration, canonical global configuration, secondary/custom global roots, explicit `--repo-root`, local-over-global precedence, no global-root writes, consumer-file preservation, template/runtime non-copying, migration idempotence, source-control reporting, and install/update/uninstall symmetry.
- AC16: README, root `AGENTS.md`, consumer `ws-shared/AGENTS.md`, `ws-configure-project` documentation, installer help, catalog/site content, and the generated integrity manifest describe the same layout and local/global behavior; no host-specific product name is required in portable skill contracts.
- AC17: `npm run test`, `npm run verify-integrity`, the configured workflow verification alias, and the relevant `ws-check-harness` phases exit 0 after the migration, with no secrets or absolute author-machine paths introduced.

## Notes

### Prior Work Sweep

- Spec `0007-src-sot-and-hybrid-global-install` established the hybrid principle: skill bodies may be global while project configuration resolves from the consumer repository.
- Spec `0061-us-272` added global-hybrid harness fallback and a thin local `ws-shared/AGENTS.md` pointer, but it still treats the hub as a mostly flat managed tree.
- Spec `0066-ws-shared-hub-agents-separation` is still pending and separates upstream root guidance from the consumer hub; this spec must preserve that consumer/upstream distinction.
- Spec `0058-installer-multi-host-global-targets` added canonical, secondary, and custom global target handling; this spec must reuse that scope registry rather than add host-specific skill logic.
- Current implementation points include `bin/install-rules.js`, `bin/cli.js`, `bin/skill-integrity-lib.js`, `ws-shared/scripts/resolve_consumer_root.cjs`, `ws-configure-project/scripts/auto_configure.cjs`, and `ws-configure-project/scripts/configure_autoload.py`.
- Memory consulted before drafting identified two high-risk regressions: global scripts resolving consumer data from `__file__`, and installer copy/hash lists drifting after hub additions. The implementation must keep consumer-root resolution and copy/integrity enumeration aligned.

### Design Intent

This is a layout and resolution enhancement, not a request to collapse local and global installations. Existing consumer-owned data preservation and local-over-global precedence are intentional constraints. The change should make the boundary explicit, move setup templates away from runtime content, and add a narrow global-to-local materialization path without making global skill packages project-specific.

### Source-control boundary

The source-control recommendation is:

| Category | Consumer default | Reason |
|----------|------------------|--------|
| `config.json` | Track when it contains only project settings and environment-variable references | Reproducible workflow behavior and onboarding |
| `STACK.md` | Track when maintained by the project | Human-readable stack and invariant companion |
| `runtime/` and `templates/` | Managed by the installer; do not hand-edit or require consumer commits | Recreated by local install or supplied by the global install |
| `MEMORY.md`, `memory/`, `CHANGELOG.md` | Ignore by default | Generated local knowledge/history; teams may opt in separately |
| `installed-skills.json`, `skill-integrity-local.json`, `host-capabilities.json` | Ignore | Installer bookkeeping, integrity, and machine-specific cache |

No credentials may be written to `config.json`; provider tokens remain environment-variable references.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing the fixed consumer config path `{sharedDir}/config.json` | Existing workflow skills and consumer projects depend on this contract |
| Adding a second config overlay such as `config.local.json` | Not required to separate runtime, templates, and consumer data |
| Installing or synchronizing third-party skill packages | The installer manages workflow-skills content and configured global projections only |
| Requiring a consumer repo-root `AGENTS.md` | The shared hub and global fallback remain sufficient; root autoload is optional |
| Moving workflow specs, plans, reviews, or changelog policy outside their configured paths | This feature only reorganizes the shared hub |
| Preserving legacy flat managed aliases indefinitely | Updates must migrate known managed files and fail closed on ambiguous collisions |
| Replacing the portable capability vocabulary with host-specific tool or IDE names | Global target paths are installer concerns, not shipped skill contracts |
| Changing upstream source-of-truth policy for `.agents/skills/ws-*` | This spec affects packaged hub layout and consumer resolution, not authoring SoT |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Consumer configuration source control | Track non-secret `config.json` and maintained `STACK.md` by default | These files describe project behavior; secrets remain environment-only | n |
| Runtime/template source in hybrid mode | Use the global installation as the runtime/template source | Avoid copying managed package content into every consumer repository | y |
| Minimal global-to-local bundle | `config.json`, optional generated `STACK.md`, and only required pointer/autoload files | Keeps project-local files limited to consumer-specific configuration | n |
| Local install behavior | Use local runtime/templates and update local config without global copying | Local installation already owns the needed managed hub | y |
| Secondary global roots | Reuse installer target resolution and detect the executing source from the selected root | Avoid host-specific logic inside skills and support custom roots | y |
| Local memory/history | Generated and ignored by default | They are not required to bootstrap workflow configuration | n |
| Authentication, rate limits, server lifecycle, and data expiry | N/A because this feature performs local filesystem/configuration operations only | No network service or persistent server is introduced | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Layout manifest, installer/integrity resolution, configure-project local/global behavior, source-control guidance, tests, and synchronized docs | Review touched-file plan against AC1–AC17 |
| Atomic criteria | Each runtime, template, consumer-owned, and generated category has an unambiguous path and behavior | Validate the manifest and run layout contract tests |
| Failure modes | Global-root ambiguity, missing runtime/template source, collisions, partial migration, stale managed files, and consumer-data overwrite are covered | Run negative fixtures and inspect fail-closed exit codes |
| Precedence | Project-local config and project-local skill bodies win over global sources when present | Hybrid resolver tests with conflicting local/global markers |
| Observability | Scope, source roots, copied paths, skipped paths, migration actions, and source-control matrix are emitted without absolute author-machine paths | Human and JSON configure output assertions |
| Source-control safety | No credentials are generated; managed/generated files are categorized and ignore rules match the report | Secret scan, hub ignore test, and source-control matrix test |
| Integrity and packaging | Copy enumeration, package files, and digest manifest agree with the new subfolders | `npm pack`, `npm run verify-integrity`, and install fixture |
| Zero open implementation blockers | Existing hybrid, installer, hub-separation, and integrity contracts are identified and test fixtures can be extended | Prior-work sweep plus fixture inventory |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0070-ws-shared-hybrid-config-layout.spec.md` exits 0.
- Layout contract tests report every managed path's category and report no duplicate or unclassified entries.
- Local configure fixture reports `executionScope=project-local`, writes only the local configuration delta, and leaves global markers unchanged.
- Global canonical, secondary, and custom-root fixtures report `executionScope=global`, use project `{sharedDir}` for consumer data, and list only minimal local files in `copiedPaths`.
- Global-root cwd fixture exits non-zero or pauses before mutation and leaves the global root byte-identical.
- `node test/test-install.js --local`, `node test/test-hybrid-consumer-root.js`, `node test/test-configure-auto.js`, and the new layout/configure fixture exit 0.
- `ws-check-harness` reports no missing hub/runtime findings for a project-local install or a global-hybrid project with only consumer configuration.
- `npm run test`, `npm run generate-integrity`, and `npm run verify-integrity` exit 0; the final integrity digest matches the on-disk managed tree.
- `git diff --check` and the configured secrets check report no whitespace or secret leakage.

### Negative & Failing Test Scenarios

- A global configure command launched with its cwd equal to a global skills root and no `--repo-root` must fail or pause before writing any file.
- A global configure command with a missing or malformed runtime/template manifest must fail closed without creating a partial local hub.
- A project-local configure command must not copy a global template or runtime file even when a global installation is available.
- A global-hybrid configure command must not copy `runtime/`, `templates/`, `skill-dependencies.json`, `installed-skills.json`, integrity files, or global memory/history into the consumer project.
- A consumer project with an existing custom `config.json`, `STACK.md`, `MEMORY.md`, memory entry, or `CHANGELOG.md` must retain byte-identical content after install, update, configure, and migration.
- A destination collision during flat-to-subfolder migration must stop with a named collision and leave the conflicting files unchanged.
- An unknown file under a managed legacy flat hub must not be silently classified as runtime or deleted by update.
- A second update after successful migration must produce no additional managed or consumer diff and must not reintroduce flat files.
- A project containing local and global copies of the same `ws-*` skill must resolve the local skill body and local config without merging or editing the global copy.
- A global secondary target with a different hub path must resolve its own runtime source while still writing consumer config under the explicitly selected project root.
- A config containing a credential-like value must be rejected or redacted by the existing secrets policy rather than recommended for source control.
