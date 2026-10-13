---
id: 510
slug: us-510
title: No sanctioned single-agent state bootstrap for ws-spec-to-pr
source: github
specDate: 2026-10-12
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/510"
labels:
  - enhancement
step: 0
workflowId: us-510-20261013T033129Z
status: completed
startedAt: "2026-10-13T03:31:29.519Z"
endedAt: "2026-10-13T03:31:29.519Z"
acRefs: []
---
# Specification — No sanctioned single-agent state bootstrap for ws-spec-to-pr

**State:** open
**Labels:** enhancement

## Description

Add the missing sanctioned bootstrap contract: one documented command that creates the workflow state pair for a run before any step is dispatched, so a single agent driving steps directly reaches the same observable state a dispatched orchestration run has from its first step.

### Failure class

The state runtime is the sole sanctioned writer of workflow state, and it can only update a state that already exists. `loadPersistedState` (`workflow_state.cjs:143-154`) throws `state file not found` when neither `{workflow-id}.state.md` nor `{workflow-id}.state.json` is present, and the CLI operation allowlist (`workflow_state.cjs:2506-2508`) accepts only `dispatch`, `finish`, `finish-batch`, `bypass`, `checkpoint`, and `pause-turn`. No other packaged script creates the pair: every other consumer is a reader (`register_local_spec.cjs:197`, `ws-cleanup/scripts/list_disposable.cjs:133`, `ws-monitor/scripts/monitor_snapshot.cjs:460`, `ws-kanvas/scripts/collect.cjs:279`) or a mutator that first asserts existence (`observer.cjs:159`, `commit_g2_code.cjs:125`, `refresh_baseline.cjs:172`). The bootstrap contract nonetheless assigns the write to the orchestrator: setup step 5 injects `workflowType` into "the initialized frontmatter" of `{us-dir}/{workflow-id}.state.md` (`ws-shared/runtime/setup.md:106-108`) and the `write-state` alias is a plain host write (`tools.md:60`). The only reachable path for a single agent is therefore hand-authoring the state files, which the sanctioned writer explicitly declares unsupported (`workflow_state.cjs:2468`); a hand-authored pair that misses a required field is rejected by `validateSnapshot` (`:2324-2339`), and `validate_state.cjs --pre-advance N` then fails closed with HS-5 (`ws-spec-to-pr/SKILL.md:58`).

Consequence, restated mechanically: without the pair there is no `{plansDir}/index.json` workflow row (`updatePlansIndex` is reachable only from `performUpdate`, `workflow_state.cjs:2055`), no append-only `telemetry.jsonl` stream (`:2070`), no checkpoint tag sequence (`setup.md:171`), and no `.runtime/verification-manifest.json` from the verify-reuse writer, so the run is invisible to the observer and to Active Resume while still producing step artifacts and product commits.

### Required behavior (contract this spec pins)

One documented entrypoint creates the initial pair from explicit branch and baseline inputs, writes it through the existing canonical dual-write plus plans-index pair used by the sibling mutators (`commit_g2_code.cjs:125-129`, `refresh_baseline.cjs:172-177`, `observer.cjs:165-168`), produces state that the existing validator accepts with no extra recovery command, is idempotent on replay, and refuses to touch a run that has already progressed. A state-less run mode is a separate decision and is not this contract (see the companion context file).

### Boundaries and touched artifacts

- State runtime (managed): `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` — operation allowlist, help text, `loadPersistedState`, `syncStateDualWrite` (`:583-600`), `refreshPlansIndexForState` (`:1181-1194`), `validateSnapshot` (`:2312-2451`), schema `.agents/skills/ws-shared/runtime/workflow-state.schema.json`.
- Orchestrator contract: `.agents/skills/ws-spec-to-pr/SKILL.md` bootstrap row, `protocols/state-hygiene.md` § Automated update, `STEP-DISPATCH.md` § state helpers, and `ws-shared/runtime/setup.md` step 5 (bootstrap writes the pair through the command instead of the host write alias).
- Consumer shims are pass-throughs and inherit the behavior: `ws-spec-to-pr/scripts/update_state.cjs` and `validate_state.cjs` forward `process.argv` into the runtime CLI.
- Regression surface for this spec: one new test module under `test/`, registered in `test/test-suites.json` under `harnessEfficiency` (as `test/test-run-state-integrity.js` and `test/test-script-ux-golden-path.js` are, `:367`, `:370`).

Sibling issue #506 owns the adjacent angle (a full-auto run reaching ship with no state at all, HS-5 unsatisfiable downstream) and is not absorbed here; see `## Notes`.

## Acceptance Criteria

- AC1: The state runtime shall expose exactly one documented bootstrap entrypoint that creates the initial `{workflow-id}.state.md` and `{workflow-id}.state.json` pair for a new run.
- AC2: When the bootstrap entrypoint runs, the state runtime shall require a workflow id, a slug, a branch, and a baseline commit, and shall reject a branch value of `HEAD`.
- AC3: The bootstrap entrypoint shall write the JSON member of the pair as machine source of truth and the Markdown member as its render, both inside `{us-dir}` under the configured plans directory.
- AC4: The bootstrap entrypoint shall write `stateVersion` 3, `revision` 0, `workflowType` for the invoked pipeline, `status` `active`, and `currentStep` 0, with the workflow id, slug, branch, and baseline recorded in the same record.
- AC5: When the bootstrap entrypoint completes, the written record shall satisfy `validateSnapshot` without any further write or recovery command.
- AC6: When the bootstrap gives the entrypoint an empty or absent plans index, the entrypoint shall create the index and its workflow row so the row `stateSha256` matches the written pair.
- AC7: The bootstrap entrypoint shall record a machine-readable result naming the workflow id, both written paths, and the resolved plans index.
- AC8: While a bootstrapped state pair at revision 0 has no dispatch, the bootstrap entrypoint shall leave both files byte-identical on a repeated run and report the replay as idempotent with a zero exit code.
- AC9: If the target state path already holds a record at revision greater than 0, then the bootstrap entrypoint shall refuse with a non-zero exit code and leave every file unchanged.
- AC10: If the target state path already holds a record whose `completedSteps` is non-empty, then the bootstrap entrypoint shall refuse with a non-zero exit code and leave every file unchanged.
- AC11: If the target state path already holds a record whose `status` is terminal, then the bootstrap entrypoint shall refuse with a non-zero exit code and leave every file unchanged.
- AC12: If exactly one member of the state pair is present at the target path, then the bootstrap entrypoint shall fail closed with a non-zero exit code and name the missing member.
- AC13: If a required flag value is empty, or the baseline is not a commit-shaped hexadecimal string, then the bootstrap entrypoint shall reject the invocation with a usage error.
- AC14: If the slug fails to match the plan directory name, then the bootstrap entrypoint shall refuse the write and name the mismatch.
- AC15: If the workflow id departs from the documented `{slug}-{ISO8601}` shape, then the bootstrap entrypoint shall refuse the write and quote the expected shape.
- AC16: The bootstrap entrypoint shall leave no partial pair and no index row behind when it fails, so a failed invocation leaves any pre-existing state byte-identical.
- AC17: When the state runtime is invoked with `--help`, the help output shall list the bootstrap usage line with a sample invocation.
- AC18: Where the bootstrap path is documented, the contract text shall state the bootstrap command, the pair invariant, the idempotent replay rule, and the refusal rules in one canonical section.
- AC19: The bootstrap path shall execute on Node 22 with CommonJS `.cjs` modules, and the repository shall require no Python interpreter for it.
- AC20: The verification command set shall include the bootstrap path and its refusal behaviors as an automated test module registered in `test/test-suites.json`.
- AC21: The bootstrap entrypoint shall write only repo-relative paths into the state record and shall emit no absolute machine path.

## Original Issue Context

Verbatim issue #510 body (`https://github.com/jpolvora/workflow-skills/issues/510`, state `OPEN`, labels `enhancement`), preserved for human traceability:

### Failure class (verbatim)

`ws-spec-to-pr` has no sanctioned single-agent state-bootstrap path: both
`update_state.cjs` (dispatch/finish) and `validate_state.cjs --pre-advance`
require a pre-existing `.state.md`, and no `init` command exists. An
orchestrator driving steps directly (no subagents) cannot initialize
workflow state at all.

### Consequence (verbatim)

The run goes fully state-less: no `plans/index.json` entry, no
`telemetry.jsonl`, no checkpoint tags, no `verification-manifest.json`
gating — invisible to `ws-monitor` and Active Resume. The only current
options are full subagent orchestration or silent bypass.

### Ask (verbatim)

Either a documented `update_state.cjs init <state> --slug … --workflow-id …`
that writes the initial state pair from branch/baseline inputs, or an
explicit, sanctioned state-less run mode (own status marker + compensating
evidence checklist) so the bypass is a decision, not an accident.

### Prior Work Sweep

Sweep source: `node .agents/skills/ws-spec-provider-github/scripts/sweep_prior_work.cjs --issue 510 --keywords "state bootstrap" "single-agent" "ws-spec-to-pr"`, recorded at `.agents/plans/us-510/prior-work-sweep.json` (`status: ok`, provider `github`). The sweep returned **zero** open pull requests for this tracker id and **zero** commits referencing `#510`; every hit is merged, so there is no in-flight branch and no duplicate-risk PR to stop for. The five most relevant merged hits:

| Source | Title | Relevance to this spec |
|--------|-------|------------------------|
| Commit `af29a6f6` (PR #373, merged) | `feat(0105-us-365): opt-in execution observer for ws-spec-to-pr` | Added `state.hostBinding`, `state.agentTranscripts`, and `observer.cjs`; the observer mutator asserts an existing pair (`observer.cjs:159`) and cites "invisible to the observer" as the exact consequence this bootstrap removes. |
| Commit `fcc2b4a7` (merged) | `feat(fresh-worker-verifier-step): add fresh-worker verifier stage with fault injection` | Touched `workflow_state.cjs` plus `ws-spec-to-pr/SKILL.md` and `ARTIFACTS.md`; the closest prior work on per-AC verification, all of which presumes a state pair exists. |
| Commit `50455501` (merged) | `feat(us-414-run-state-integrity): verified implementation` | Extended `workflow_state.cjs` and `workflow-state.schema.json` with new state fields; the reference implementation for adding a state field with schema, dispatch prose, and a dedicated `test-run-state-integrity.js` suite. |
| Commit `bdd72a99` (merged) | `fix(us-414-run-state-integrity): include ship fields in finish fingerprint` | Hardened finish idempotency (`finishFingerprint`), the precedent the bootstrap replay rule must stay compatible with. |
| Commit `5e65a1e8` (merged) | `refactor(state-perf): implement D2b state dual-write and D4 gitTrackedSet caching` | Introduced the canonical `.state.json` + `.state.md` dual write (`syncStateDualWrite`); the bootstrap must reuse that pair writer instead of inventing a second write path. |

Merged PRs #391 (relocatable shared hub root) and #377 (harness hardening round 2) moved hub-path resolution and dispatch/state contracts; neither adds a bootstrap. No hit fixes this failure class.

### Design Intent

- **Intentional constraint (sanctioned writer):** `update_state.cjs` declares itself the sanctioned state writer and calls hand-editing unsupported (`workflow_state.cjs:2468`, from `e198a9a4` "script UX golden path"). A bootstrap must therefore live in that same runtime as an operation, not as orchestrator prose that rewrites the files by hand.
- **Intentional constraint (fail closed on a missing pair):** `loadPersistedState` throwing `state file not found` and `validateSnapshot` throwing `state file not found` (`workflow_state.cjs:151`, `:2317`) are deliberate guards, not oversights; the bootstrap must add the creation path rather than weaken either guard.
- **Intentional constraint (one canonical pair write):** the `.state.json` source of truth plus `.state.md` render were unified deliberately (`5e65a1e8`), and `validateSnapshot` compares the pair and the plans-index hash on every write (`:2321-2323`, `:2341-2348`). The bootstrap writes both members, then refreshes the index inside the same window, exactly as `commit_g2_code.cjs:125-129` and `refresh_baseline.cjs:172-177` do.
- **Intentional constraint (revision is monotonic):** every operation bumps `revision` (`workflow_state.cjs:1631`), and post-exit guards derive their allowance from the turn's own op trace (`.ws/MEMORY.md` § post-exit tripwires). A bootstrap that re-enters must therefore be a true no-op instead of bumping `revision` a second time.
- **Accidental gap:** the operation set was written for a run that is already under way, and bootstrap step 5 assumed the orchestrator would materialize the pair through the host `write-state` alias (`setup.md:106-108`, `tools.md:60`). Nothing in the package was ever given the creation duty, so today a single agent has only the unsupported hand-edit (see `## Assumptions & Open Questions` for the command-shape choice).

## Notes

- Verified evidence chain for the gap, in execution order: `setup.md:106-108` (bootstrap injects `workflowType` into the "initialized frontmatter") → `tools.md:60` (`write-state` is a plain host write) → `workflow_state.cjs:2506-2508` (operation allowlist with no creation verb) → `:143-154` (`state file not found`) → `:2324-2339` (mandatory keys and schema) → `:2341-2348` (plans-index row and hash) → `ws-spec-to-pr/SKILL.md:58` + `protocols/state-hygiene.md:108` (HS-5 STOP on a failed pre-advance).
- Minimal valid bootstrap record, read from the schema and `validateSnapshot` rather than guesswork: required keys `stateVersion`, `revision`, `workflowId`, `slug`, `workflowType`, `status`, `currentStep`, `completedSteps`, `skippedSteps` (`workflow-state.schema.json:6`); `stateVersion` must equal 3 (`:2327`); `status` must be one of `active`, `blocked`, `completed`, `cancelled`, `failed` (`workflow-state.schema.json:13`); `currentStep` must sit in 0..9 (standard) or 0..5 (lite), which the runtime wrapper supplies (`update_state.cjs` / `validate_state.cjs` config blocks); `statePath` must be repo-relative, never a drive letter or backslash (`workflow-state.schema.json:197`).
- Why the pair cannot be written bare: `update_state.cjs dispatch` re-runs `validateSnapshot` after every mutation (`workflow_state.cjs:2083`) and the index-hash comparison is unconditional whenever the index exists, so an index row whose `stateSha256` predates the written pair turns the very first `dispatch` into an error.
- Cross-reference (out of scope here): **issue #506** covers the adjacent angle — a full-auto run that reaches ship with no state at all and an HS-5 pre-advance it can never satisfy. This spec owns only the sanctioned bootstrap of the single-agent path and must not grow into #506's recovery/stateless-mode design. When #506 lands, its chosen posture should reference this bootstrap rather than invent a second state writer.
- Precedent to reuse instead of inventing: `commit_g2_code.cjs:125-129` and `refresh_baseline.cjs:172-177` already compose `syncStateDualWrite` + `fs.mkdirSync(path.dirname(plansIndexPath(context)))` + `refreshPlansIndexForState`, which is the same order the bootstrap needs.
- Documentation surfaces that must not drift once the command exists: `ws-shared/runtime/setup.md` step 5, `ws-spec-to-pr/protocols/state-hygiene.md` § Automated update, `ws-spec-to-pr/STEP-DISPATCH.md` § state helpers, and the `usage`/`--help` text in `workflow_state.cjs` (`:2453-2496`) — the last is the discoverable surface an agent reads before acting.
- Stack invariant (`node-skills-package`, from `.ws/config.json` `stack.id`): the bootstrap ships as CommonJS `.cjs` under `.agents/skills/**/scripts/`, runs on Node 22 (verified `v22.22.2` in this environment), and adds no Python dependency; `ws-check-harness` fails closed on any `.py`/`.pyc`/`.pyo` under `.agents/skills/` or `bin/`.
- Verification obligation for the change: the new test module runs under the repo `test/` harness and is registered in `test/test-suites.json`; the authoring gate for this spec is `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring <spec>`.
- Command shape is a real product choice (new runtime operation vs orchestrator-owned inline bootstrap vs the issue's stateless mode). The chosen default is one new operation on the existing runtime; the alternatives and their tradeoffs are recorded in the sibling companion `0180-us-510.context.md` so the decision is not re-litigated inside the plan.
- Anonymization: the issue text carries no private consumer identifiers, and this spec adds none. Only repo-relative paths, public package names, and public commit/PR references appear; the failure is described by class, not by originating project.

## Out of Scope

| Feature | Reason |
|---------|--------|
| A sanctioned state-less run mode with its own status marker and compensating evidence checklist | The issue offers it as the alternative to a bootstrap command; the chosen default is one documented command, and the alternative is recorded as a deferred idea in `0180-us-510.context.md`. |
| Recovery or resume of runs that already reached ship with no state (issue #506) | Sibling issue #506 owns that angle; absorbing it would widen this contract into a second design. |
| Inferring branch, baseline, slug, or workflow id when a value is omitted | Explicit inputs keep the bootstrap deterministic and testable; guessing invites a wrong identity in the state record. |
| Backfilling state for plan directories that predate this change | Historical runs stay readable-only; `validate_state.cjs rebuild-index` remains the indexing path for them. |
| Creating any step artifact (spec copy, plan, ledger, exec plan, telemetry records) | Those belong to Steps 0-4 producers; the bootstrap owns only the state pair and its index row. |
| Changing the existing `dispatch` / `finish` / `checkpoint` / `pause-turn` semantics, exit codes, or telemetry schema | Those paths are covered by existing anchors and tests; this contract adds a creation path without altering them. |
| Applying the bootstrap to `ws-spec-to-pr-lite` or `ws-spec-multi` run identity | Lite shares the runtime but has its own step table and close step; multi-run identity is a separate run-state format. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Entrypoint shape | One new operation on the existing state runtime (`workflow_state.cjs`), reachable through the `ws-spec-to-pr/scripts/update_state.cjs` pass-through | The issue names that helper; the runtime already owns the pair writer, the index refresh, and the validator, so an orchestrator-owned inline bootstrap would duplicate all three | n |
| Flag contract | Explicit workflow id, slug, branch, and baseline commit, with the documented `{slug}-{ISO8601}` workflow-id shape and `HEAD` rejected as a branch value | Bootstrap step 5b/6 already resolves exactly these values (`setup.md:113`, `:169`), so the command takes resolved inputs instead of re-deriving them | n |
| Pair and index write order | `mkdirSync` the plans directory, dual-write both members, then refresh the index row in the same window | Copied from the two shipped sibling mutators (`commit_g2_code.cjs:125-129`, `refresh_baseline.cjs:172-177`), keeping the hash comparison in `validateSnapshot` satisfiable | n |
| Conflict detection rule | Refuse when `revision` is greater than 0, when `completedSteps` is non-empty, or when `status` is terminal; treat a revision-0 record with no dispatch as an idempotent replay | `revision` is bumped by every operation (`workflow_state.cjs:1631`), so revision 0 plus empty `completedSteps` is precisely "bootstrapped, nothing ran yet" | n |
| Partial-pair handling | Fail closed and name the missing member instead of completing the pair | A lone member means an interrupted or foreign write; silently completing it could adopt a foreign run | n |
| Telemetry on bootstrap | No `dispatch` or `finish` event is emitted for the bootstrap itself | The stream documents step execution; emitting a fake boundary would corrupt elapsed-time derivation (`protocols/state-hygiene.md:42-49`) | n |
| Rate limits, auth boundaries, data expiry, external-dependency failure, concurrency, data lifecycle | N/A because the bootstrap is a local filesystem write with no network boundary, no authentication surface, no TTL, and one active run per workflow id under the existing baton and preflight rules | FORMAT.md implicit-dimension collapse for dimensions this contract does not touch | n |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | The change is limited to the state runtime (operation, help, bootstrap write), the orchestrator contract text, and one new test module | `git diff --stat` lists only those paths |
| Atomic criteria | Each of AC1-AC21 has one observable assertion, and no AC depends on another AC's state machine | AC-to-test map reviewed against this spec before implementation |
| Failure modes enumerated | Existing record, conflicting record, partial pair, invalid flag values, slug mismatch, workflow-id shape, and failed-write residue are covered by AC9-AC16 | Negative scenarios below executed as red tests first |
| Observation telemetry | One machine-readable result per invocation naming workflow id, both written paths, and the index path; the plans index row appears with a matching `stateSha256` | `node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs init <state> --workflow-id <id> --slug <slug> --branch <branch> --baseline <sha>` then `node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs <state>` exits 0 |
| Existing anchors preserved | Existing operation semantics, telemetry schema, and state dual-write assertions still pass unchanged | `node test/test-run-state-integrity.js`, `node test/test-script-ux-golden-path.js`, `node test/test-plans-index.js` |
| Stack invariant — Node 22 CommonJS only | The bootstrap is synchronous `.cjs` in the managed runtime and requires no Python interpreter | `node --check` on the changed script, the new test module green, and `ws-check-harness` reporting no `.py`/`.pyc`/`.pyo` finding |
| Security / hygiene invariant | The state record carries only run identity and repo-relative paths; no absolute machine path, hostname, secret, or consumer identifier enters state, docs, or the test fixture | Fixture assertion that written `statePath` and `runPath` match the repo-relative pattern, plus a grep for drive-letter or backslash paths in the new artifacts |
| Zero open blockers | The sweep reports no open PR or in-flight commit for issue #510, and no unresolved dependency on another spec | Sweep output recorded under `### Prior Work Sweep`; sibling issue #506 is cross-referenced and out of scope |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Bootstrap result: a single machine-readable record per invocation naming `workflowId`, the written `.state.md` and `.state.json` paths, the resolved plans index path, and the replay flag; a refusal prints its reason on stderr with a non-zero exit code.
- Immediate validator confirmation: `node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs <state>` exits 0 right after bootstrap with no repair command in between.
- Index visibility: `{plansDir}/index.json` gains a `workflows[]` row whose `statePath` and `stateSha256` match the written pair, which is what makes the run discoverable to resume and to the observer.
- Replay probe: a second bootstrap invocation leaves both members byte-identical (compare hashes before and after) and reports the replay rather than bumping `revision`.
- Absence signal this contract removes: the state-less footprint is "no index row, no `telemetry.jsonl`, no checkpoint tags, no `.runtime/verification-manifest.json`", all of which appear as soon as the bootstrap runs and Step 0 dispatches through `update_state.cjs`.
- Suite anchors: the new test module registered in `test/test-suites.json` (`harnessEfficiency` block, alongside `test/test-run-state-integrity.js` and `test/test-script-ux-golden-path.js`), plus `test/test-run-state-integrity.js` and `test/test-script-ux-golden-path.js` unchanged.
- Documentation signal: `node {skillsRoot}/ws-shared/runtime/scripts/workflow_state.cjs init --help` prints the bootstrap usage line and one sample invocation.

### Negative & Failing Test Scenarios

- Red test: bootstrap over a state whose `revision` is 3 and assert a non-zero exit with both members byte-identical afterwards; before this contract the same invocation is impossible (the operation is rejected) and the hand-edit remains the only path.
- Red test: bootstrap over a state with a non-empty `completedSteps` and assert refusal, so an already-running or finished run is never re-initialized.
- Red test: bootstrap with only `{workflow-id}.state.md` on disk and assert a fail-closed error naming the missing JSON member, with no file created.
- Red test: bootstrap with an empty slug and assert a usage error and no write; repeat with `--branch HEAD` and with a baseline that is not a hexadecimal commit string.
- Red test: bootstrap with a slug whose value differs from the plan directory name and assert refusal naming the mismatch.
- Red test: bootstrap with a workflow id outside the `{slug}-{ISO8601}` shape and assert refusal quoting the expected shape.
- Red test: bootstrap with the plans directory absent and assert the command still creates the index row, so `validate_state.cjs` resolves the workflow instead of failing on a missing index entry.
- Red test: bootstrap, dispatch Step 0 through `update_state.cjs`, then re-run bootstrap and assert refusal (the run has progressed), proving the idempotent window is genuinely limited to the untouched revision-0 pair.
- Red test: simulate a failed write (unwritable plans directory) and assert no partial pair and no index row remain, and that a pre-existing state is byte-identical afterwards.
- Stack invariant negative test: run the bootstrap and its test module under `node` with no Python on the path and assert both pass, proving the Node 22 CommonJS-only invariant; a `.py` helper introduced anywhere under `.agents/skills/` or `bin/` must fail `ws-check-harness`.
- Regression assertion: re-run the existing state suites and assert the dispatch/finish/checkpoint semantics, the telemetry event schema, and the plans-index hash comparison behave exactly as before.
- Contract assertion: assert the canonical bootstrap section states the pair invariant, the replay rule, and the refusal rules, and that the runtime `--help` output lists the bootstrap usage line.
