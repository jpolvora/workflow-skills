---
id: null
slug: configurable-hub-root
title: "Relocatable shared hub root across the harness (installer, configurator, generator, layout)"
source: local
specDate: 2026-09-21
---

# Specification — Relocatable shared hub root across the harness

## Description

The harness assumes the consumer hub is fixed at `<repo>/.ws`. `config.json` declares `pathTokens.sharedDir`, and `config-resolution.md`/`tools.md` describe it as configurable, but only some code paths read it. Attempting to honor it in a single script (the `ws-patterns-generator` / `ws-configure-project` change reviewed in PR #384) produced five consecutive review rounds of legitimate findings, because the hub root is baked into many places:

- `bin/cli.js` `consumerHubDir()` and the install/update/migration paths,
- `configure_autoload.cjs` (`SHARED_AUTOLOAD_REL`, hub pointer, generated-row validation, generated link prefixes),
- `seed_generated_skill.cjs` (generated body location),
- `hub-layout.json` classification and the hub `.gitignore` template,
- bootstrap discovery of `config.json` itself (a relocated hub cannot be discovered from `.ws`).

This spec makes the hub root a first-class, single-sourced contract so every consumer of it agrees. Until it lands, PR #384 deliberately keeps the hub fixed at `.ws` and documents that `pathTokens.sharedDir` is not a relocation mechanism for hub-hosted content.

## Acceptance Criteria

- AC1: One shared resolver (single module under `{skillsRoot}/ws-shared/runtime/scripts/`, e.g. `resolve_hub_root.cjs`) returns the hub root for a repo: bootstrap discovery from `<repo>/.ws/config.json`, then `pathTokens.sharedDir` when configured, else `.ws`; the installer, `configure_autoload.cjs`, `seed_generated_skill.cjs`, and hub-layout reads all call it (no duplicated hub-root logic).
- AC2: The installer honors the configured hub: `bin/cli.js` install/update/uninstall and migration write hub artifacts (`.gitignore`, `AGENTS.md` pointer, `autoload.md`, manifests, `STACK.md`) under the configured root, and `installed-skills.json` / local integrity records stay consistent with it.
- AC3: `configure_autoload.cjs` renders the autoload table, the generated `ws-project-patterns` row, and the root `AGENTS.md` links relative to the configured hub (correct for nested hubs such as `config/hub`), idempotently across reruns.
- AC4: Generated consumer skills seed, register, and validate under the configured hub; `externalSkills` / installer exclusion and the `hub-layout.json` classification follow the configured root.
- AC5: Security containment is enforced everywhere the hub root is derived: traversal (`../`), symlinked hubs, and unresolvable roots are refused fail-closed (no writes outside the repository), and `--check` reports them as critical findings.
- AC6: Global-hybrid resolution keeps working: an explicit `--global-skills-root` run detects generator-managed ids from the global dependency graph and renders hub-relative rows.
- AC7: Bootstrap documentation is coherent: `config-resolution.md`, `tools.md`, `hub-layout.json`, `.ws/AGENTS.md`, `README.md`, and `CATALOG.md` state where `config.json` lives for a relocated hub and what is relocatable versus fixed.
- AC8: Batteries cover the new contract: installer install/update/migration fixtures with a configured hub, configurator render/check fixtures (nested hub, escaping hub, global-hybrid), generator seeding fixtures; `npm run test`, `ws-check-harness`, `generate-integrity` + `verify-integrity` exit 0; one version bump per release PR.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multiple hubs per repository | Single-writer, single-hub model; multi-hub is a different design |
| Migrating an existing `.ws` hub to a new root | Latest-layout-only policy; a relocation is a manual consumer action |
| Changing the default hub name (`.ws`) | Defaults stay; only the override becomes coherent |
| Host-specific projections or IDE-specific hub paths | Portability rule: no host-private layouts |
| Changing `pathTokens.skillsRoot` semantics | Skills install layout stays fixed |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Bootstrap discovery | `<repo>/.ws/config.json` is always read first; a relocated hub must keep a bootstrap copy or a documented marker | Otherwise the configured root is undiscoverable | y |
| Containment rule | Reuse the realpath full-path containment proven in the generator | Consistent security contract | y |
| Installer scope | Install/update/uninstall/migration all move with the hub | Otherwise the lifecycle splits (the PR #384 finding) | y |
| Sequencing | Implement after PR #384 lands (it removes the partial honoring) | Avoids conflicting diffs | y |
| `config.json` key | Keep `pathTokens.sharedDir`; no new keys | Documented already | y |
| Auth, rate limits, concurrency, TTL, state transitions | N/A: local filesystem tooling, single writer | Dimensions absent | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Resolver plus installer/configurator/generator/layout/doc updates and their batteries | Diff lists those paths |
| Atomic criteria | AC1–AC8 each pass or fail | Authoring validate plus listed commands |
| Failure modes | Escaping/unresolvable hubs refused (AC5); installer lifecycle stays coherent (AC2); reruns idempotent (AC3) | Negative scenarios |
| Observation telemetry | Installer migration logs, `--check` findings, render diffs, test exit codes | Validation notes commands |
| Stack invariants | typescript-node Node-subset (validated inputs, contained paths, awaited promises, closed handles); no `.py`; en-us docs with path tokens | `scan_stack_invariants.cjs`, `ws-check-harness` |
| Open blockers | PR #384 must land first (it reverts the partial honoring) | Recorded in Notes |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Commands: authoring validate exits 0; `npm run test`; `ws-check-harness`; `npm run generate-integrity` + `verify-integrity`; installer fixtures asserting the configured hub tree.
- Artifacts: fixture trees showing hub artifacts under the configured root; render diffs; `--check` findings.
- Docs: the coherence updates listed in AC7.

### Negative & Failing Test Scenarios

- Any script keeps a hardcoded `.ws` hub while another honors `pathTokens.sharedDir` (must fail AC1/AC2).
- A configured hub receives generated links relative to the repository root instead of the hub (must fail AC3).
- The generated body or manifests land under a different root than the autoload row (must fail AC4).
- A traversal or symlinked hub escapes the repository (must fail AC5).
- `--global-skills-root` runs emit a `{skillsRoot}` token for a generator-managed row (must fail AC6).
- Docs still describe `.ws` as the only possible hub without naming the override (must fail AC7).
- Any AC8 command exits non-zero (must fail AC8).

## Notes

- Origin: five review rounds on PR #384 (writer/reader parity, global context, root template, containment, nested-hub link relativity) plus the installer finding that ended the loop.
- PR #384's outcome: hub fixed at `.ws`; `pathTokens.sharedDir` documented as not honored for hub-hosted content.
- Implement with a single resolver first (AC1) and migrate call sites one at a time, each with its fixture, to avoid a repeat of the round-by-round discovery.
