## Summary

Fixes #510. The packaged state runtime is the only sanctioned writer of workflow state, but it could only *update* a state pair that already existed. `loadPersistedState` throws `state file not found` when neither `{workflow-id}.state.md` nor `.state.json` is present, and the CLI operation allowlist had no creation verb, so a single agent driving the steps directly (no subagent orchestration) had only the unsupported hand-edit path. The bootstrap contract nonetheless assigned the first write to the orchestrator, which meant a stateless run produced step artifacts and product commits while staying invisible to the plans index, telemetry, resume, and the observer.

us-506 (#513) added the create-only `init` operation. This PR pins the full **single-agent bootstrap contract** on that same operation; it adds no second state writer.

## Change

`update_state.cjs init` (backed by `workflow_state.cjs`) now:

- **Requires explicit identity inputs** — `--slug`, `--workflow-id`, `--branch`, `--baseline` — with no inference. A missing/empty flag is a usage error; `--branch HEAD` and a non-hex `--baseline` are refused. The slug must equal the plan directory name and the workflow id must match `{slug}-{YYYYMMDDTHHMMSSZ}[-suffix]`.
- **Writes the canonical pair** — `.state.json` (machine SoT) plus the rendered `.state.md` — through `syncStateDualWrite`, folds an existing `ac-ledger.json`, and refreshes the `{plansDir}/index.json` row in the same window so `stateSha256` matches the written pair. The record carries `stateVersion 3`, `revision 0`, `workflowType`, `status active`, `currentStep 0`, plus `branch` and `baselineCommit`, and is validated by `validateSnapshot` before success.
- **Replays idempotently** over an untouched revision-0 pair: exit 0, both files byte-identical, `idempotentReplay: true`.
- **Refuses fail-closed, with nothing touched** — revision > 0, non-empty `completedSteps`, terminal `status`, a partial pair (missing member named), slug/directory mismatch, out-of-shape workflow id, empty flag, non-hex baseline, `HEAD`, or a missing registered `step-00-{slug}.spec.md`. A failed write rolls back its own artifacts (and `atomicWrite` now removes its temp file on failure), so no partial pair, index row, or residue remains.

Discoverability: `init --help` lists the usage line with a sample invocation and states the replay + refusal rules; `setup.md` carries the single canonical contract section, mirrored by the `gates.md` Step 0 row, `STEP-DISPATCH.md`, and `state-hygiene.md`.

## Scope

Product touchpoints: `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`, `workflow-state.schema.json` (documents `branch`), and the four contract docs plus `FEATURES.md`/`README.md`. New regression module `test/test-state-bootstrap-init.js` registered under `harnessEfficiency`; the us-506 anchor `test/test-state-bootstrap.js` is updated to the required flags and the replay window (the spec pins explicit inputs, so the superseded create-only assertion becomes the replay assertion plus the progressed-refusal). No `config.json` schema change.

## Verification

- `node test/test-state-bootstrap-init.js` / `node test/test-state-bootstrap.js` — exit 0
- Regression anchors (`test-workflow-state-contract.js`, `test-update-state-yaml.js`, `test-run-state-integrity.js`, `test-script-ux-golden-path.js`, `test-resume-gate.js`) — exit 0
- `node test/test-context-budget.js` — exit 0 (`STEP-DISPATCH.md` edit is net-negative)
- Full local suite (`npm run tests`, 165 entries) — 165/165 pass, 0 failing
- `node test/test-harness-clean.js` — 0 findings
- `npm run generate-integrity` / `verify-integrity` — OK (v0.5.45)
- Fresh-verify fault injection (scratch worktree): 4 injections, all detected
- Live dogfood: this run bootstrapped its own state through the new `init` and `validate_state.cjs` exited 0

Version: `0.5.44` → `0.5.45`.

Note: `test/test-subagent-dispatch.js` carries a documented 400 ms child-startup timing flake under load; it passed in isolation, on a pristine worktree at the merge base, and in the retrying full-suite run.

### Foreign commits in range

Commits reachable from `b83f989` but not produced by this batch (`66175d9..b83f989`):

- none detected
Recorded by `ws-spec-multi` run `ms-20261012T211904Z` (shared-head stay-on-develop) before merging PR #517.
