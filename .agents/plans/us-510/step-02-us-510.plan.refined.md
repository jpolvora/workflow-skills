---
step: 2
slug: us-510
workflowId: us-510-20261013T033129Z
status: completed
startedAt: "2026-10-13T03:34:33.404Z"
endedAt: "2026-10-13T03:34:33.404Z"
acRefs: []
---
# Refined Plan — us-510 (plan of record)

Supersedes `.agents/plans/us-510/step-01-us-510.plan.md`. Changes from the draft:
the strict-flag decision and the branch/baseline ordering are now explicit, and the
verification hooks cite the concrete commands.

**Slug:** us-510 · **Workflow id:** us-510-20261013T033129Z · **Baseline:** `66175d9c51cd93c2c13599eca1fa080b50e05ab3` · **Branch:** develop

## 1. Deliverable

One documented bootstrap entrypoint on the packaged state runtime that creates the
initial `{workflow-id}.state.json` + `.state.md` pair for a run that is being driven
by a single agent, so the run is visible to the plans index, telemetry, resume, and
the observer from its first step. It reuses the us-506 `init` operation and the
canonical `syncStateDualWrite` + `refreshPlansIndexForState` pair; no second writer.

## 2. Implementation steps

### T1 — Contract on the runtime (`workflow_state.cjs`)
- `performInit` requires `--slug`, `--workflow-id`, `--branch`, `--baseline`; empty →
  usage error; `branch == HEAD` refused; baseline must match `^[0-9a-fA-F]{7,40}$`.
- Slug must equal the plan directory basename; workflow id must match
  `{slug}-{YYYYMMDDTHHMMSSZ}[-suffix]`.
- Partial pair → fail closed naming the missing member.
- Existing pair: replay iff `revision === 0` and `completedSteps` empty and status is
  non-terminal; otherwise refuse naming the reason. Replay touches only the index.
- Fresh write: seed record (stateVersion 3, revision 0, workflowType, active,
  currentStep 0, empty step lists, `branch`, `baselineCommit`, repo-relative
  `statePath`), fold an existing `ac-ledger.json`, dual-write, refresh index, then
  `validateSnapshot`. A failure rolls back this invocation's artifacts.
- `atomicWrite`: unlink the temp file when the write/rename fails.
- Result JSON: `ok`, `operation`, `idempotentReplay`, workflow id, slug, branch,
  baseline, revision, `stateSha256`, `state`, `runPath`, `index`.

### T2 — Help text (AC17)
`update_state.cjs init --help` and the generic `--help` list the bootstrap usage line
with a sample invocation and state the replay + refusal rules.

### T3 — Schema (AC4)
`workflow-state.schema.json` documents the `branch` property (`minLength 1`).

### T4 — Contract docs (AC18)
`setup.md` carries the single canonical bootstrap section; `gates.md` Step 0 row,
`state-hygiene.md` § Automated update, `STEP-DISPATCH.md` Step 0 row, `FEATURES.md`,
and `README.md` point at it and carry the resolved `--branch` / `--baseline`.

### T5 — Tests (AC20)
- `test/test-state-bootstrap-init.js` (new, registered under `harnessEfficiency`):
  required flags, HEAD/baseline/slug-mismatch/workflow-id-shape refusals, partial
  pair, revision/completedSteps/terminal refusals, replay byte-identity, rollback
  with no temp residue, help lines, Node-only scan, repo-relative invariants.
- `test/test-state-bootstrap.js`: the us-506 anchor updated to the required flags and
  the replay window.

## 3. Verification map

| AC | Evidence |
|----|----------|
| AC1 | `init` creation path in `test-state-bootstrap-init.js`; live bootstrap of this run |
| AC2 | usage/HEAD cases in `test-state-bootstrap-init.js` |
| AC3 | pair presence + md render assertions |
| AC4 | record seed assertions (branch, baseline, workflowType, revision, currentStep) |
| AC5 | `validate_state.cjs` exit 0 right after `init` (test + live) |
| AC6 | index-created-from-absent assertion + live `.agents/plans/index.json` row |
| AC7 | parsed result JSON assertions |
| AC8 | replay exit 0 + byte-identity assertion |
| AC9 | `bump()` refusal when `revision > 0` |
| AC10 | `bump()` refusal when `completedSteps` is non-empty |
| AC11 | `bump()` refusal when `status` is terminal |
| AC12 | lone `.state.md` → fail closed naming `.state.json` |
| AC13 | empty-flag + non-hex baseline cases |
| AC14 | slug/directory mismatch refusal |
| AC15 | workflow-id shape refusal quoting `{slug}-{ISO8601}` |
| AC16 | index-path-occupied rollback + residue scan |
| AC17 | `--help` assertions on both wrappers |
| AC18 | `setup.md` canonical section; doc pointers |
| AC19 | `.cjs` assertion + `.py` scan under `.agents/skills` and `bin` |
| AC20 | new module registered in `test/test-suites.json` |
| AC21 | repo-relative `statePath` + no drive-letter in stdout |

## 4. Verification plan (ordered)

1. `node --check .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`
2. `node test/test-state-bootstrap.js` && `node test/test-state-bootstrap-init.js`
3. Regression anchors: `test-workflow-state-contract.js`, `test-update-state-yaml.js`,
   `test-run-state-integrity.js`, `test-script-ux-golden-path.js`, `test-resume-gate.js`
4. `node test/test-context-budget.js`
5. `npm run tests` (full local suite) — `test/test-subagent-dispatch.js` carries a
   documented child-startup timing flake (400 ms boot budget); re-run in isolation
6. `node test/test-harness-clean.js` → 0 findings
7. `npm run build-site:bump` (0.5.44 → 0.5.45), `npm run generate-integrity`,
   `npm run verify-integrity`

## 5. Out of scope (carried from the spec)

Stateless run mode; #506 recovery; inferred identity values; backfilling
pre-existing plan directories; step-artifact creation; changes to existing
`dispatch`/`finish`/`checkpoint`/`pause-turn` semantics; lite/multi run identity.

## 6. Risk register

| Risk | Mitigation | Status |
|------|-----------|--------|
| us-506 anchor pins superseded semantics | Updated in-change with explicit replay assertions | Done |
| `STEP-DISPATCH.md` byte budget | Net-negative edit; `test-context-budget.js` green | Done |
| Ledger score gate at Step 6 | Link AC→files/tests/commit, score before the gate | Pending |
| Shared-worktree sibling writers | Own-path staging only; no reset/stash; baseline advances forward | Acknowledged |
