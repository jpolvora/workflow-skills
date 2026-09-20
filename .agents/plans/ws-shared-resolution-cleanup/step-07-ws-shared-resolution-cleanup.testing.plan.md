---
step: 7
slug: ws-shared-resolution-cleanup
workflowId: ws-shared-resolution-cleanup-20260919T210648Z
status: planned
---

# Step 7 testing plan — ws-shared-resolution-cleanup

Scope: G2 commit 84559abbf0b7633977ab8173e7198bba2ba77f23 (7 files).
No product runtime change (Node 22 skill package, docs/scripts/tests only).

## Unit & coverage commands (from `config.json.verification`)

- `backendTest`: `npm run test` (full suite; long — Step 7 runs the
  targeted AC-covering subset below plus integrity; full suite deferred,
  recorded as a gap).
- Targeted battery (each maps to AC evidence in `ac-ledger.json`):
  - `node test/test-global-config-missing.js` (AC5, NS3)
  - `node test/test-harness-clean.js` (AC1, AC2, NS1)
  - `node .agents/skills/ws-check-harness/scripts/check_harness_links.cjs` (AC2)
  - `node test/test-hybrid-consumer-root.js` (AC3)
  - `node test/test-local-first-precedence.js` (AC3)
  - `node test/test-skills-runtime-resolution.js` (AC3)
  - `node test/test-check-harness-install-mode.js` (AC3)
  - `node test/test-check-harness-links.js` (NS2)
  - `node test/test-doc-sync.js` (AC4)
  - `node test/test-shared-hub-paths.js` (AC4)
  - `node test/test-node-helper-ports.js` (Node/Python parity of touched helpers)
  - `node bin/generate-skill-integrity.js --check` (AC4 integrity)

## Gaps vs changed files

| Changed file | Covering test |
|--------------|---------------|
| `config-resolution.md` (token lines) | harness-clean, check_harness_links |
| `resolve_consumer_root.cjs` / `.py` | global-config-missing, hybrid-consumer-root, node-helper-ports |
| `ws-show-harness/SKILL.md` | harness-clean |
| `test/test-global-config-missing.js` (new) | self (fail-closed assertions) |
| `package.json`, `bin/skill-integrity.json` | integrity --check, harness-clean Phase 3 |

## Targets / credentials / DB / API / RBAC

Not applicable: no servers (`apiHost`/`devHost` empty), no database
(`database.type: none`, no seed script), no API contracts, no RBAC/tenancy
surface. Stack companion: `node-skills-package` rule pack; static scan
`scan_stack_invariants.cjs` already clean at Step 6.

## Integration / E2E

`ws-check-harness` consumer / global / hybrid cases cover install-mode
integration (via `test-check-harness-install-mode.js` and
`test-hybrid-consumer-root.js`). No cross-service or UI routes exist.

## UI / browser

Skipped: no browser surface (frontend framework `none`, no `devHost`).
Per dispatch policy, browser runs only when a browser surface exists.

## Feature-quality AC checklist

AC1–AC5 plus NS1–NS3 mapped to observable test outcomes (see Report).
Pass threshold: every listed command exits 0; `test-harness-clean.js`
reports 0 findings; integrity manifest matches tree.

## Mutation

Skipped: `verification.mutationTest` is empty and
`defaults.skipMutationTesting` is `true` (opt-in, default). Status
`skipped`, do not fail.

## Regression sabotage

Skipped: `ac-ledger.json` marks sabotage `not-required` for all ACs
(no caller-authored invert patch for this docs/resolution cleanup).
