---
id: null
slug: config-merge
title: Config merge CLI
source: local
specDate: 2026-08-28
---
# Specification — Config merge CLI

## Description

Build a small Node CLI that deep-merges two JSON config files (base + overlay), validates required keys, and writes the result. This is the **canonical mid-to-high live fixture** for version-over-version harness scoring: freeze this spec, run standard orch in a sandbox, snapshot scores, repeat on the next package version without changing this fixture.

## Out of Scope

| Feature | Reason |
|---------|--------|
| YAML / TOML input | JSON only keeps the surface small |
| Remote URLs as inputs | Local files only |
| Interactive prompts | Flags only |
| npm publish / git push | Sandbox dryRun |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed? |
|------------|----------------|-----------|------------|
| Runtime | Node `.cjs`, zero deps | Matches package convention | y |
| Orch | standard sequential (`enableDag: false`) | Mid-high path: plan, ledger, review, tests | y |
| Object merge | Recurse into plain objects; overlay leaf wins | Predictable oracle | y |
| Arrays | Overlay array replaces base array (no concat) | Avoid ambiguous merge | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| CLI entry | `bin/merge-config.cjs` runnable with `node` | `--help` exits 0 |
| Merge library | `lib/merge.cjs` exports `merge(base, overlay)` | Unit tests named in AC8 |
| Tests | `test/merge-config.test.cjs` uses `node --test` | `npm test` in sandbox |
| Validation | Missing `name` or `version` fails closed | `merge-missing-required` test |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node bin/merge-config.cjs --help` prints `--base`, `--overlay`, `--out`.
- `node --test test/merge-config.test.cjs` exits 0 after implementation.
- Sandbox `ac-ledger.json` links AC1–AC10 with file:line evidence.

### Negative & Failing Test Scenarios

- NS1: `merge-missing-required` must fail (non-zero) when merged JSON lacks `name` or `version`.
- NS2: `merge-invalid-json` must fail when `--base` or `--overlay` is not valid JSON.
- NS3: After invert.patch (overlay-wins flipped to base-wins), `merge-overlay-wins` must fail.

## Acceptance Criteria

- AC1: The worker shall add `bin/merge-config.cjs` as the CLI entry (shebang optional; must run with `node bin/merge-config.cjs`).
- AC2: The worker shall add `lib/merge.cjs` exporting `merge(base, overlay)` that deep-merges plain objects; for a non-object overlay value, overlay replaces base (`result[key] = overlay[key]`).
- AC3: The `merge(base, overlay)` shall merge nested plain objects recursively (overlay does not wipe sibling keys that exist only on base).
- AC4: When overlay has an array at a key, the merge shall replace the base value with that array (no element-wise concat).
- AC5: The CLI shall read `--base <file>` and `--overlay <file>` as UTF-8 JSON objects and write merged JSON to `--out <file>` with 2-space indent and a trailing newline.
- AC6: The merged object shall include string keys `name` and `version`; if either is missing after merge, the CLI shall exit 1 and print `missing required key` to stderr (do not write `--out`).
- AC7: If `--base` or `--overlay` holds invalid JSON, then the CLI shall exit 1 and print `invalid json` to stderr (do not write `--out`).
- AC8: The CLI shall exit 0 on `--help` and print usage including `--base`, `--overlay`, and `--out`.
- AC9: The worker shall add `test/merge-config.test.cjs` with tests named `merge-overlay-wins`, `merge-nested-objects`, `merge-array-replace`, `merge-missing-required`, and `merge-invalid-json`.
- AC10: The worker shall add `README.md` documenting the three flags, overlay-wins leaf rule, and array-replace rule.
