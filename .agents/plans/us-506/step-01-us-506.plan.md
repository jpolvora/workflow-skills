---
step: 1
slug: us-506
workflowId: uswf-us-506-20261012T212609Z
status: completed
startedAt: "2026-10-12T21:26:51.353Z"
endedAt: "2026-10-12T21:26:51.353Z"
acRefs: []
---
# Implementation Plan — us-506

## State bootstrap for `ws-spec-to-pr` (HS-5 pre-advance gate satisfiable)

Slug: `us-506` · Pipeline: standard · Complexity: complex · Workflow: `{workflow-id}`

## 1. Problem

The packaged state runtime exposes only operations that mutate an **existing**
state file (`dispatch|finish|finish-batch|bypass|checkpoint|pause-turn`). The
first state write has no supported command, so an unattended `autoMode` run can
complete every step while no `.state.json`, `.state.md`, `telemetry.jsonl`, or
plans-index row ever exists. The fail-closed pre-advance gate can never pass, so
the run either skips state writes entirely or ignores the gate. This is a state
lifecycle integrity defect.

## 2. Approach

Extend the single sanctioned state writer; do not add a parallel state writer.

1. Add a create-only `init` operation to `workflow_state.cjs`
   (`performInit`), reached through the shared `runUpdateCli`, so both the
   standard and lite wrappers get it without wrapper changes (AC13).
2. Derive state identity from the run arguments (`--slug`, `--workflow-id`) plus
   the registered `step-00-{slug}.spec.md`; fold `ac-ledger.json` when present
   (order-tolerant with `ac_ledger.cjs init`) (AC2, AC3).
3. Write via `syncStateDualWrite` (target the canonical `.state.md` so the dual
   write renders both files from one state) and refresh the plans index row via
   `refreshPlansIndexForState` (AC1, AC5). Validate the result with
   `validateSnapshot` before returning (AC4).
4. Fail closed, before any write, when the state already exists (AC6) or a
   required input is unresolvable (AC7).
5. Name the bootstrap command in the absent-state error from `performUpdate`
   (AC9).
6. Generalize the `; HS-5` label in `runValidateCli` to any standard pre-advance
   failure caused by an absent state file, and name the resolved missing state
   path (AC8).
7. Document the bootstrap once in `setup.md` / `gates.md` golden path /
   `STEP-DISPATCH.md` Step 0 ordering and remove the hand-write instruction
   (AC12, AC18). Tests registered in `test/test-suites.json` (AC17).

## 3. Files touched

| Path | Change |
|------|--------|
| `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` | `performInit` + `init` CLI op + help text; absent-state remediation (AC9); absent-state `; HS-5` label (AC8); export `performInit` |
| `.agents/skills/ws-shared/runtime/setup.md` | Identity step 5: bootstrap contract; drop hand-write instruction (AC18) |
| `.agents/skills/ws-shared/runtime/gates.md` | Golden-path Step 0 boundary row: `init` then `--pre-advance 1` (AC12) |
| `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` | Step 0 ordering incl. `init`; autoMode HS-5 stop rule |
| `test/test-state-bootstrap.js` | New suite: creation path, index refresh, both fail-closed cases, AC9/AC8/AC13/AC16 |
| `test/test-suites.json` | Register the new suite (AC17) |
| `README.md`, `FEATURES.md` | Feature docs for the bootstrap |
| `package.json`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/version.json`, `docs/index.html` | Patch version bump (once) |

## 4. AC coverage

- AC1-AC7: `performInit` creation, identity derivation, fields, validator exit 0,
  index refresh, create-only guard, missing-input fail-closed. Tested in
  `test-state-bootstrap.js`.
- AC8: `runValidateCli` absent-state `; HS-5` + resolved path.
- AC9: `performUpdate` absent-state remediation naming `update_state.cjs init`.
- AC10/AC11: contract text in `STEP-DISPATCH.md` (autoMode HS-5 stop; bypass log
  line without omitting bootstrap).
- AC12: `gates.md` golden-path Step 0 row.
- AC13: shared `runUpdateCli` reachable from both wrappers (lite asserted).
- AC14: Node 22 CommonJS `.cjs`, no new dependency.
- AC15: no new `.runtime` residue name (state files live in the run dir).
- AC16: ordinary Step 0 `finish` yields numeric `elapsedSec` telemetry.
- AC17: suite registered in `test/test-suites.json`.
- AC18: single bootstrap contract in setup/golden-path docs; no hand-write.

## 5. Verification plan

- `node test/test-state-bootstrap.js`
- `node test/test-workflow-state-contract.js`, `test-update-state-yaml.js`,
  `test-run-state-integrity.js`, `test-resume-gate.js`,
  `test-script-ux-golden-path.js`, `test-quality-gates.js`
- `npm run generate-integrity` + `npm run verify-integrity`
- `node test/test-harness-clean.js` (0 findings)
- `npm run test`

## 6. Stack & Security Invariants Verification Plan

| Boundary | Invariant | Check |
|----------|-----------|-------|
| Runtime | Node 22 CommonJS only; no Python | `node --check` on changed scripts; `.py` scan under `.agents/skills/**`/`bin/` |
| Dependencies | No new third-party dependency | `git diff package.json` shows version only |
| Portability | No host-product coupling | grep changed files for host ids |
| Config | No new `config.json` key | `config.schema.json` unchanged |
| State | One sanctioned writer; index coherence | `validate_state.cjs` exits 0 right after `init` |
| Runtime residue | `.runtime` allowlist unchanged | `validateRuntime` rejects unknown names |

## 7. Out of scope

Per spec: `ws-monitor`/index visibility for a state-less directory, retroactive
state reconstruction, non-orchestrator bootstrap (#510), forced re-bootstrap,
create-on-demand inside `dispatch`/`finish`, new telemetry event type,
pre-advance rules for steps 4/6/7/8/9.
