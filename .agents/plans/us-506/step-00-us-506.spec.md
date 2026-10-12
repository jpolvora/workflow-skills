---
id: 506
slug: us-506
title: "ws-spec-to-pr: full-auto run reaches ship with no workflow state (no state bootstrap; HS-5 pre-advance gate unsatisfiable)"
source: github
specDate: 2026-10-12
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/506"
labels:
  - bug
step: 0
workflowId: uswf-us-506-20261012T212609Z
status: completed
startedAt: "2026-10-12T21:26:09.575Z"
endedAt: "2026-10-12T21:26:09.575Z"
acRefs: []
---
# Specification — ws-spec-to-pr: full-auto run reaches ship with no workflow state (no state bootstrap; HS-5 pre-advance gate unsatisfiable)

**State:** open
**Labels:** bug

## Description

### Failure class

A fresh `ws-spec-to-pr` run under `autoMode` can complete every step while no run state ever exists: no `{workflow-id}.state.json`, no `{workflow-id}.state.md`, no `{us-dir}/telemetry.jsonl`, and no `{plansDir}/index.json` row. The packaged state runtime exposes only operations that mutate an **existing** state file, so the very first state write has no supported command and is silently skippable. The run then edits product paths and ships, and the pre-advance gate that should stop it either fires too late or fires and is ignored.

This is a state-lifecycle integrity defect, not a formatting or reporting defect: `{workflow-id}.state.json` is the machine source of truth for resume, replay, audit, dispatch provenance, and the ship-phase timing rollup.

### Verified technical scope and touchpoints

All line references below were read in this repository at the time of authoring (repo-relative paths).

- **No create operation exists.** `.agents/skills/ws-spec-to-pr/scripts/update_state.cjs:42-46` runs `runUpdateCli` from the shared module; the operation allowlist is `dispatch|finish|finish-batch|bypass|checkpoint|pause-turn` (`.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs:2506`) and `performUpdate` accepts only `dispatch|finish|bypass|checkpoint|pause-turn` (`:1593`). `updateHelpText` documents the same set (`:2453-2495`). Every operation reaches `loadPersistedState`, which throws `state file not found: <path>` when neither `.state.json` nor `.state.md` exists (`:143-154`, called at `:1598`).
- **The bootstrap obligation is prose only.** `.agents/skills/ws-shared/runtime/setup.md:107` instructs the orchestrator to inject `workflowType` into "the initialized frontmatter of `{us-dir}/{workflow-id}.state.md`", and `:162` makes the state write mandatory before the next bootstrap step, but no packaged script creates that file. `.agents/skills/ws-shared/runtime/gates.md:219-222` states the operating rule the gap violates: state files are machine state, hand edits are unsupported, and gates "fail closed on inconsistencies with the remediating command named in the error".
- **The gate that would catch it is state-dependent and late.** `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs:2636` throws `state file not found` for any pre-advance value; `:2654-2655` appends `; HS-5` only when the pre-advance target is 4 in the `standard` pipeline. `gates.md:228-232` lists golden-path pre-advance commands for 4, 6, 7/8, and 9 only, so no documented gate covers the Step 0 boundary. `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md:19` and `:37` make pre-advance 4 fail-closed and require `finish --step 0` at Step 0 — but `finish` itself requires an existing state file, so a run that never bootstraps state can only continue by skipping state writes entirely.
- **Observability is a derived consequence, not an independent path.** `{us-dir}/telemetry.jsonl` is appended by state update operations (`workflow_state.cjs:2056-2070`, default path `path.join(paths.usDir, 'telemetry.jsonl')`) and `elapsedSec` is derived from dispatch/finish timestamps (`:1777`, `0` when no dispatch exists). `updatePlansIndex` runs on every update operation (`:2055`) and `rebuildIndex` scans only `*.state.md` files (`:2593`), so a directory with step artifacts and no state file can never appear in `{plansDir}/index.json` or in the observer's workflow count. There is no separate telemetry writer to fix.
- **A bootstrapped state must be index-coherent.** `validateSnapshot` requires the mandatory keys, `stateVersion === 3` (`:2324-2327`, `STATE_VERSION = 3` at `:31`), schema conformance against `.agents/skills/ws-shared/runtime/workflow-state.schema.json` (required: `stateVersion`, `revision`, `workflowId`, `slug`, `workflowType`, `status`, `currentStep`, `completedSteps`, `skippedSteps`), and a `{plansDir}/index.json` row for that `workflowId` whose `stateSha256` matches (`:2341-2348`). A direct state write that does not refresh the index row fails every later gate.
- **Dual-write mechanics.** `syncStateDualWrite` (`:583-600`) writes `.state.json` and then renders `.state.md` when `mdPath === stateFile` or the markdown file already exists; `atomicWrite` (`:566-581`) creates parent directories, writes a random temp file, and renames. The canonical `<state>` argument used by the gates is the `.state.md` path (`gates.md:224`).
- **Residue names fail closed.** `RUNTIME_NAMES` (`:50-66`) allowlists run-runtime residue names and `validateRuntime` rejects anything else (`:2350-2351`), so an unlisted name written by a bootstrap would make the next `dispatch`/`finish` fail with `unknown .runtime residue` and apply nothing.
- **Existing precedent for a create-style subcommand.** `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs:163` and `:819` implement `init` as the creating subcommand of a state-adjacent artifact writer, and `STEP-DISPATCH.md:37` already orders `ac_ledger.cjs init` before the Step 0 finish.
- **Naming hazard.** `.agents/skills/ws-shared/runtime/scripts/bootstrap_runtime.cjs` is 55 lines that resolve the `ws-shared/runtime/scripts` directory (candidate order: explicit override, cwd, packaged, global). It is not a state bootstrap and must not be mistaken for one.
- **Parity surface.** Both orchestrators share the module through thin wrappers: `.agents/skills/ws-spec-to-pr/scripts/update_state.cjs:42-46` (`pipeline: 'standard'`) and `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs` (`pipeline: 'lite'`).
- **Downstream consumers of the missing state.** `.agents/skills/ws-spec-to-pr/protocols/delivery-result.md:43` and `:78` treat a completed step without a numeric `elapsedSec`, or missing telemetry at all, as HS-5 before the ship gate; `.agents/skills/ws-monitor/SKILL.md:18` reads state JSON/Markdown plus `telemetry.jsonl`.

### Reproduction

1. Start a fresh `ws-spec-to-pr` standard run with `autoMode` on (no prior state in `{plansDir}/{slug}/`).
2. Inspect `{plansDir}/{slug}/` after Step 0 and again after Step 5: no `*.state.json`, no `*.state.md`, no `telemetry.jsonl`.
3. Run `node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs "{us-dir}/{workflow-id}.state.md" --pre-advance 4` → non-zero exit with `state file not found …; HS-5`.
4. Observe the run continue to edit product paths, commit, push, and ship.

### Required behavior

- A packaged, deterministic state bootstrap creates the initial `{workflow-id}.state.json` plus the rendered `{workflow-id}.state.md` from the run arguments and the registered spec, so no agent hand-writes machine state.
- Bootstrap is a verifiable precondition of Step 0 completion: advancing past Step 0 without state fails closed, and the failure names the remediating command.
- Under `autoMode`, a non-zero pre-advance exit is a hard stop: no product-file edits, no step dispatch, no ship. A gate the orchestrator can observe and then ignore is not fail-closed.
- The bootstrap leaves the run visible to the plan index and to the state/telemetry consumers, in the same way a state-ful run is.

### Boundaries

- The change belongs to the shared state runtime plus the two orchestrator wrappers and their contracts; it adds no new product feature and no user-facing command surface beyond the bootstrap operation.
- Concurrency is bounded by the create-only guard plus atomic rename, not by a new lock (see Assumptions).
- No new `config.json` key is required. If the implementation adds one, the schema/example/desktop-editor trio becomes mandatory (root hub § Config schema & GUI synchronization).

## Acceptance Criteria

- AC1: The packaged state runtime shall expose a bootstrap operation that creates the initial `{workflow-id}.state.json` and its rendered `{workflow-id}.state.md` for a new run.
- AC2: When the bootstrap runs, the bootstrapper shall derive the state identity from the run arguments and the registered spec, and shall require no agent-authored state content.
- AC3: When the bootstrap completes, the written state shall carry `stateVersion: 3`, an integer `revision`, `workflowId`, `slug`, `workflowType`, `status: active`, `currentStep: 0`, and empty `completedSteps` and `skippedSteps`.
- AC4: When the bootstrap completes, the state validator shall exit zero for the bootstrapped state (`validate_state.cjs`).
- AC5: When the bootstrap writes the state files, the bootstrapper shall refresh the plans index row so its recorded state hash matches the written state and lists that `workflowId` at `currentStep: 0`.
- AC6: If the state file already exists, then the bootstrapper shall exit non-zero without modifying the existing state or index files.
- AC7: If a required input is missing or unresolvable, then the bootstrapper shall exit non-zero naming that input and shall leave no partial state file behind.
- AC8: When a standard-pipeline pre-advance check runs while the state file is absent, the state validator shall exit non-zero with a message naming the missing state path and the HS-5 hard stop (`validate_state.cjs`).
- AC9: If the state file is absent when a state-mutating operation runs, then the state updater shall exit non-zero and name the bootstrap command as the remediation (`update_state.cjs`).
- AC10: While `autoMode` is active, the orchestrator shall treat a non-zero pre-advance exit as a hard stop, with no product-file edits, no step dispatch, and no ship phase.
- AC11: Where `skipQualityGates` is active, the orchestrator shall omit the pre-advance check only with the recorded `gate-bypass | pre-advance` log line, and shall never omit the state bootstrap.
- AC12: The Step 0 to Step 1 transition shall be documented in the golden-path state command list with the bootstrap command preceding the pre-advance 1 check.
- AC13: The bootstrap operation shall be available through both the standard and lite orchestrator wrappers, resolving the pipeline value from the calling orchestrator.
- AC14: The bootstrapper shall be a Node 22 CommonJS `.cjs` helper inside the packaged skill runtime, with no Python interpreter and no new third-party dependency.
- AC15: Where the bootstrapper writes a file under the run runtime directory, the file name shall match the tolerated `RUNTIME_NAMES` allowlist.
- AC16: When a fresh run bootstraps state and then finishes Step 0, the run's `telemetry.jsonl` shall carry a Step 0 record with a numeric `elapsedSec`.
- AC17: The repository test suite registered in `test/test-suites.json` shall assert the bootstrap creation path, the index-row refresh, and both fail-closed cases.
- AC18: The canonical setup and golden-path documents shall state the bootstrap contract once and shall no longer instruct an agent to hand-write the initial state files.

## Original Issue Context

Verbatim human-authored issue text (tracker `github`, issue #506, state `open`, labels `bug`).

## Failure class

A fresh `ws-spec-to-pr` run under `autoMode` can execute the whole pipeline — spec, plan, tasks, implement, verify, review, fresh-verify, testing, ship, fix-pr — while **no `{workflow-id}.state.json`, no `{workflow-id}.state.md` and no `telemetry.jsonl` are ever created**, because the packaged state runtime only exposes operations on an *existing* state file and offers no bootstrap/init operation.

Observed in this repository's own dogfood run of a GitHub-sourced spec (`standard` pipeline, `autoMode` + `fullMode`, `enableDag: true`): Steps 0→9 completed, product commit + delivery commits pushed, PR merged, source issue closed — with zero state artifacts on disk at every point of the run.

## Impact

- `{workflow-id}.state.json` is documented as machine SoT (`ws-spec-to-pr/SKILL.md:41`); nothing can resume, replay or audit the run.
- `{plansDir}/index.json` never lists the run (the index rebuild reads state files only).
- `ws-monitor` reports `Workflows: 0` for a run that is actively writing artifacts.
- `validate_state.cjs --pre-advance 4` fails closed (`state file not found …; HS-5`), so the mandatory pre-Step-4 gate can never pass.
- No `telemetry.jsonl` → no `elapsedSec`, no `files_touched`, no dispatch provenance; the Step 8 timing rollup and the `delivery-result` telemetry HS-5 checks have no input.
- With state absent, step provenance is unverifiable: nothing can distinguish an artifact produced by a dispatched worker from one written inline by the orchestrator.

## Evidence

1. `update_state.cjs --help` → `dispatch|finish|finish-batch|bypass|checkpoint|pause-turn <state>`; every operation requires an existing file, and `ws-shared/runtime/scripts/workflow_state.cjs:2636` throws `state file not found` when it is absent. No `init`/`create` operation exists anywhere in the packaged skills.
2. `ws-shared/runtime/setup.md` § bootstrap instructs the orchestrator to persist `{workflow-id}.state.json` and `.state.md` frontmatter at init, but no packaged script can create that file — the initial write is manual and therefore silently skippable.
3. Live run: `node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs "{us-dir}/{workflow-id}.state.md" --pre-advance 4` → `exit 1`, `ERROR: state file not found …; HS-5`. The run then **edited product paths and continued** through commit, push, PR creation and merge.
4. `ws-shared/runtime/gates.md:52`: "Hard stops still apply (HS-1, HS-5, …)" under `autoMode`. `ws-spec-to-pr/SKILL.md:58` and `STEP-DISPATCH.md:19`: pre-advance exit ≠ 0 → HS-5 STOP — "no product-file edits, no Step 4 dispatch".
5. `protocols/delivery-result.md:43,78`: a completed step without a numeric `elapsedSec` in `telemetry.steps[]`, or missing telemetry at all, is HS-5 before the ship gate. The run shipped without any telemetry.

## Expected contract

- A packaged, deterministic state bootstrap (for example `update_state.cjs init` backed by `workflow_state.cjs`) that creates the initial `{workflow-id}.state.json` plus the rendered `.state.md` from the spec/AC ledger, so no agent hand-writes machine state.
- Bootstrap is a verifiable precondition of Step 0 completion: advancing past Step 0 without state must fail closed.
- An HS-5 pre-advance failure must actually STOP under `autoMode` — no product edits, no dispatch, no ship. A fail-closed gate that the orchestrator can observe and then ignore is not fail-closed.
- A run directory with fresh step artifacts and no state file must be visible to `ws-monitor` and to the plans index (companion observability issue filed separately).

## Repro sketch

1. Start a fresh `ws-spec-to-pr` standard run with `autoMode` on.
2. Inspect `{plansDir}/{slug}/` after Step 0 and again after Step 5: no `*.state.json`, no `telemetry.jsonl`.
3. Run the documented pre-advance gate → non-zero exit with HS-5.
4. Observe the run continues to commit, push and ship.

### Prior Work Sweep

- Provider sweep already recorded at `.agents/plans/us-506/prior-work-sweep.json` (`status: ok`, provider `github`, keywords `state bootstrap`, `HS-5`, `full-auto`): **no open pull request for tracker id 506** and no same-issue branch work. Duplicate-risk for this issue is therefore low.
- Merged PR keyword hits (both weak, recorded for completeness): `#432` "feat(us-430): path-aware alias failure classification and verification contracts" (MERGED) and `#346` "docs(us-344): keep From Spec to Delivery + batch" (MERGED). Neither touches state creation; no PR attempted a state bootstrap.
- Most relevant merged commits, all changing `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` together with `.agents/skills/ws-spec-to-pr/SKILL.md`:
  1. `d164bb4d` "feat(us-490): verified implementation".
  2. `fcc2b4a7` "feat(fresh-worker-verifier-step): add fresh-worker verifier stage with fault injection".
  3. `089d44b9` "fix(dispatch-prompt-audit-trail): inherit prompt audit on internal retry substeps (CR-001)".
  4. `260c47ff` "feat(dispatch-prompt-audit-trail): durable per-step dispatch prompt audit pairs".
  5. `8b449b9d` "chore: update version to 0.5.14 and implement autoMode enhancements".
- Duplicate-risk note: these commits extend the same state runtime and the same orchestrator contract this fix must touch, so the bootstrap must extend the existing operation surface and index-refresh helper rather than introduce a parallel state writer or rename existing operation semantics.

### Design Intent

Intent recorded from code, contract text, `git log -S`, and project memory:

- **Intentional constraint — one sanctioned writer.** The state help text states "Hand-editing the state files is unsupported; this command is the sanctioned writer" (`.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs:2468`, introduced by `e198a9a4` "feat(us-415-416-script-ux-golden-path): verified implementation"), and `gates.md:219-222` requires every gate error to name the remediating command. The bootstrap must therefore be a packaged command, and the absent-state error must name it.
- **Intentional constraint — derived identity is enforced.** `validateSnapshot` rejects a state whose `stateVersion` differs from 3 or whose mandatory keys or schema fields are missing (`workflow_state.cjs:2324-2339`), and `step-00` artifact metadata must carry the full workflow id with `endedAt`/`acRefs` (`.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs:2095-2099`). Project memory records the consequence: a hand-written minimal `.state.md` failed `--pre-advance 1` with `artifact metadata identity mismatch` until `update_state.cjs dispatch` plus `finish --step 0` were run (`.ws/MEMORY.md` § `[2026-09-13] New workflow state must be stamped via update_state dispatch/finish`, DO NOT: hand-create a workflow `.state.md`). The bootstrap must produce a state the gates accept without a follow-up hand fix.
- **Intentional constraint — programmatic writers must refresh the plans index.** Project memory: all three coordinator direct writers called `syncStateDualWrite` without refreshing the index, so `row.stateSha256` went stale and every later `validateSnapshot` failed closed (`.ws/MEMORY.md` § `[2026-09-19] Every programmatic state writer must refresh the plans index row`; INSTEAD DO: call `refreshPlansIndexForState`). A bootstrap that mirrors this mistake would be dead on arrival.
- **Intentional constraint — telemetry and index are update-op side effects.** Both are produced inside the update path (`workflow_state.cjs:2055-2073`), so a state-free run cannot have them and no independent writer should be invented (AC16 relies on the ordinary Step 0 finish).
- **Intentional constraint — runtime residue fail-closed allowlist.** `RUNTIME_NAMES` plus `validateRuntime` reject unlisted names, and project memory records three separate incidents of an unlisted `.runtime` file blocking every later state write (`.ws/MEMORY.md` § `[2026-10-10] Pipeline scratch inside {us-dir}/.runtime blocks every state write`, § `[2026-10-11] Step 0-4 orchestration traps`, and the `validateRuntime` entry).
- **Accidental gap (git history).** The operation allowlist has only ever grown by adding operations that mutate an existing file: `ad134fce` "feat(us-412-413-liveness-checkpoints): verified implementation" added `checkpoint` and `pause-turn` to a list that previously read `dispatch, finish, bypass`. No create-style state operation appears at any point in the file's history: `git log -S "createState"` and `git log -S "bootstrapState"` return no change set for this file, and the single `git log -S "init"` hit (`5db6f9f7`) is a substring false positive (`Number.isFinite`), not a create operation. The bootstrap obligation stayed prose in `setup.md:107,162`, which is exactly why an unattended `autoMode` run can satisfy every step while the initial write is skipped.
- **Recorded prior occurrence of this failure class.** `.ws/MEMORY.md` § `[2026-10-12] Orchestrator coordination: subagent liveness, claim-after-evidence, no post-merge pushes` documents a full-auto delivery where "no `.state.*`, `telemetry.jsonl`, checkpoint tags, or `plans/index.json` entry were ever created, leaving the workflow invisible to `ws-monitor`/resume", with the instruction that bypassing state machinery must be an explicit recorded decision. This confirms the reported defect is a recurring class, not a one-off.
- **Intentional constraint — no compatibility shims.** The package ships latest-layout behavior only and forbids legacy path aliases, so the bootstrap is a new operation, not a dual default or migration path.

## Notes

- Failure chain in execution order: `STEP-DISPATCH.md:37` (Step 0 requires `ac_ledger.cjs init` and one `finish --step 0`) → `update_state.cjs:42-46` → `workflow_state.cjs:2506` (allowlist) → `:1598` → `loadPersistedState:151` (`state file not found`) → orchestrator falls back to skipping state writes → `:2593` (index rebuild sees no `*.state.md`) → `gates.md:228-232` (no documented gate at the Step 0 boundary) → `gates.md:52` + `STEP-DISPATCH.md:19` (HS-5 STOP that the run did not honor).
- Two halves are required and neither suffices alone: without a create operation there is nothing to bootstrap, and without the pre-advance/bootstrapping precondition the operation is optional in `autoMode`. AC1-AC9 build the first half; AC8-AC12 the second.
- Implementation-relevant detail: `syncStateDualWrite` renders the markdown file when `mdPath === stateFile` (`workflow_state.cjs:588`), so the bootstrap should target the canonical `.state.md` path used by the gates (`gates.md:224`) and let the shared dual-write produce both files with one state hash.
- Recommended Step 0 ordering (not mandated by ACs, which stay order-tolerant): `ac_ledger.cjs init` → state bootstrap → `finish --step 0` → pre-advance 1. Pre-advance 1 additionally requires `step-00-{slug}.spec.md` and `ac-ledger.json` (`workflow_state.cjs:2356-2370`).
- Why the HS-5 generalization is in scope: `:2654-2655` appends `; HS-5` only for pre-advance 4, while the issue's expected contract makes the Step 0 boundary an HS-5-class precondition. AC8 extends the labeling, not the fail-closed behavior.
- Scope discipline re sibling issues: this spec owns the orchestrator-side bootstrap and the pre-advance stop only. The run-directory visibility gap for a state-less run (the issue's fourth expected-contract bullet) is explicitly assigned by the source issue to a separately filed companion observability issue, and the sanctioned single-agent bootstrap angle is tracked by sibling issue #510 — both are listed under Out of Scope and neither is implemented here.
- `bootstrap_runtime.cjs` is a scripts-directory resolver, not a state bootstrap; a name collision here would send the implementer to the wrong file.
- Config surfaces: no new `config.json` key is required, so the schema/example/desktop-editor trio (`config.schema.json`, `config.json.example`, `Edit-WorkflowSkillsConfig.ps1`) does not move for this change. If the implementation introduces a key, all three plus `node test/test-powershell-config-editor.js` become mandatory.
- Package consequences of any edit under `.agents/skills/**`: patch version bump, `npm run generate-integrity` and `npm run verify-integrity` before commit, and the pre-ship board (root hub § Pre-ship board).
- Anonymization: the source issue is public and carries no private consumer identifiers; this spec adds none. Paths are repo-relative, run identity stays `{workflow-id}` / `{slug}` / `{us-dir}` tokens, and the failure class is described generically.

## Out of Scope

| Feature | Reason |
|---------|--------|
| `ws-monitor` and plans-index visibility for a run directory that has step artifacts but no state file | The source issue assigns that behavior to a companion observability issue filed separately ("companion observability issue filed separately"); this spec owns preventing the state-less path, and its index/telemetry ACs cover the state-ful path only. |
| Retroactive state reconstruction for a run that already advanced without state | Back-filling identity, telemetry, and dispatch provenance for a finished run would fabricate machine history that `validateSnapshot` derives rather than accepts; the fix is preventive. |
| A sanctioned state-bootstrap path for a non-orchestrator single agent | Adjacent angle tracked by sibling issue #510; this spec pins the orchestrator-owned bootstrap contract only and must not absorb that scope. |
| Forced re-bootstrap over an existing state file (a repair or `--force` overwrite) | Destructive to run progress and resume identity, and a repair path needs its own reconciliation rules; the chosen default is fail-closed (AC6, see the context companion). |
| Create-on-demand state inside `dispatch` or `finish` when the file is missing | Would silently mask a skipped bootstrap and re-open exactly the observed failure class, defeating AC9's remediation-naming error. |
| A new telemetry event type emitted by the bootstrap itself | `telemetry.jsonl` is the update-op append stream (`workflow_state.cjs:2056-2070`); AC16 covers the ordinary Step 0 finish, and a new event type is a separate telemetry-schema contract change. |
| Changing the pre-advance artifact requirements for steps 4/6/7/8/9 | Those gates and their fixture suites are working as designed; this change adds the Step 0 boundary and the missing-state labeling only. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Bootstrap operation surface | Extend the existing sanctioned writer (`update_state.cjs init` backed by `workflow_state.cjs`) | Keeps one writer for machine state, preserves the recorded sanctioned-writer invariant, and lets the absent-state error name a single remediation command; the issue offers this shape as its example. Gray area — see the context companion. | n |
| Re-bootstrap over an existing state | Fail closed with a non-zero exit and no modification | Protects run progress and resume identity; a resumed run never needs a bootstrap, so the fail-closed path costs nothing legitimate. Alternative (idempotent no-op) is documented in the context companion. | n |
| Initial `revision` seed | `0`, so the first update operation increments to `1` | Matches the schema minimum (`revision: integer, minimum 0`) and the existing increment convention that adds one to whatever revision the loaded state carries; the exact seed is an implementation detail that AC3 leaves as "an integer". | n |
| Identity source at bootstrap | Run arguments (`workflowId`, `slug`, pipeline) plus the registered `step-00-{slug}.spec.md`; the AC ledger is folded when `ac-ledger.json` already exists but is not required | Keeps bootstrap order-tolerant relative to `ac_ledger.cjs init` and avoids a second source of truth for AC counts, which the next update operation re-derives (`syncAcCountsFromLedger`, `workflow_state.cjs:1629`). | n |
| HS-5 labeling scope | Extend the `; HS-5` suffix from standard pre-advance 4 only to any standard pre-advance failure caused by an absent state file | The issue names the Step 0 boundary an HS-5-class precondition and calls the gate "HS-5 pre-advance"; the generalization is a labeling change over existing fail-closed behavior. | n |
| Enforcement mechanism for the `autoMode` stop (AC10) | Contract-and-gate discipline: canonical HS-5 STOP wording plus the recorded bypass log line | A script cannot prevent an orchestrator from ignoring a non-zero exit; the spec pins the contract text and the observable bypass record instead of inventing a machine interlock. | n |
| Behavior under `dryRun` | The bootstrap performs no writes, consistent with the documented `dryRun` flag semantics (`ws-spec-to-pr/SKILL.md:42`) | Keeps the new operation inside the existing flag contract; no new flag is introduced. | n |
| Concurrent bootstrap in the same run directory | Best-effort: the create-only guard plus `atomicWrite`'s temp-file rename bound the damage; no lock file is added | `atomicWrite` (`workflow_state.cjs:566-581`) prevents partial files, and the second caller fails closed on the existing state; a true interlock would add a lock contract this issue does not request. | n |
| Auth boundaries, rate limits, external-dependency failure, data expiry/TTL, multi-tenancy | N/A because this is a local file-and-JSON path with no network boundary, no authentication surface, no external service, and no TTL semantics | FORMAT.md implicit-dimension collapse for dimensions this change does not touch. | n |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | The change is limited to the shared state runtime, the two orchestrator wrappers, the canonical setup/golden-path contract text, and tests | `git diff --stat` lists only those paths |
| Atomic criteria | Each of AC1-AC18 has one observable assertion and no AC depends on another AC's state machine | AC-to-test map reviewed against this spec before implementation |
| Failure modes enumerated | Existing state file, missing inputs, absent state at a pre-advance gate, absent state at a mutating operation, and unlisted runtime residue are covered by AC6-AC9 and AC15 | Negative scenarios below executed as red tests first |
| Observation telemetry | The bootstrap reports the created paths and the state hash; the run's Step 0 record carries a numeric `elapsedSec` | `node .agents/skills/ws-spec-to-pr/scripts/update_state.cjs init` on a fixture, then `validate_state.cjs <state>` and a `telemetry.jsonl` read |
| Existing anchors preserved | `dispatch`/`finish`/`finish-batch`/`bypass`/`checkpoint`/`pause-turn` semantics, the pre-advance artifact rules, and the `.runtime` allowlist are unchanged | `node test/test-workflow-state-contract.js`, `node test/test-update-state-yaml.js`, `node test/test-run-state-integrity.js`, `node test/test-resume-gate.js` |
| Index coherence | The bootstrap refreshes the plans index row instead of calling the dual write alone | `validate_state.cjs <state>` exits 0 immediately after bootstrap, and the index row hash matches |
| Contract single-sourcing | The bootstrap contract is stated once in the canonical documents, and no instruction tells an agent to hand-write initial state | Contract grep for the bootstrap command in `setup.md` and `gates.md`, plus a zero-hit check for hand-write wording |
| Stack invariant — Node 22 CommonJS only | The bootstrapper is a `.cjs` helper launched with `node`; no `.py`/`.pyc`/`__pycache__` under `.agents/skills/**` or `bin/`, and no new third-party dependency in `package.json` | `node --check` on the changed script, a `.py` scan under `.agents/skills/**`, and `git diff package.json` |
| Stack invariant — no host-product coupling | The bootstrap uses only `{skillsRoot}`-relative paths and portable launchers, with no host-specific tool id or product name | Grep the changed files for host coupling; run the fixture with `node` from a temp repo root |
| Package gates | Integrity regenerated and the patch version bumped once before commit | `npm run generate-integrity` + `npm run verify-integrity`, then the pre-ship board |
| Zero open blockers | The prior-work sweep reports no open PR or in-flight commit for issue #506, and no unresolved dependency on another spec | Sweep result recorded under Prior Work Sweep and in `.agents/plans/us-506/prior-work-sweep.json` |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Bootstrap run on a fixture: `node .agents/skills/ws-spec-to-pr/scripts/update_state.cjs init <state> --slug <slug> --workflow-id <id> --repo-root <fixture>` — exit 0 and both `{workflow-id}.state.json` and `{workflow-id}.state.md` on disk with identical identity fields.
- Post-bootstrap acceptance: `node .agents/skills/ws-spec-to-pr/scripts/validate_state.cjs <state> --repo-root <fixture>` exits 0, and the `{plansDir}/index.json` row for that `workflowId` carries a `stateSha256` equal to the sha256 of the written `.state.json`.
- Step 0 boundary gate: `node .agents/skills/ws-spec-to-pr/scripts/validate_state.cjs <state> --pre-advance 1` exits 0 in a state-ful fixture and exits non-zero with both the missing state path and `HS-5` in a state-less fixture.
- Telemetry signal after Step 0: `{us-dir}/telemetry.jsonl` contains a Step 0 record whose `elapsedSec` is a JSON number (`0` when no dispatch preceded the finish), and `elapsedSec` is derived, never authored (`--elapsed` is rejected).
- Run visibility: `{plansDir}/index.json` lists the run's `workflowId` after the first state write, and `node .agents/skills/ws-spec-to-pr/scripts/validate_state.cjs rebuild-index` keeps that row.
- Suite anchors: `node test/test-workflow-state-contract.js`, `node test/test-update-state-yaml.js`, `node test/test-run-state-integrity.js`, `node test/test-resume-gate.js`, `node test/test-script-ux-golden-path.js`, plus the new bootstrap cases registered in `test/test-suites.json`.
- Package gates: `npm run verify-integrity` after `npm run generate-integrity`, and `node test/test-powershell-config-editor.js` only if a config key is added.

### Negative & Failing Test Scenarios

- Red test: run `update_state.cjs init` on a fixture before the change and assert exit 0 — today it fails with `operation must be dispatch, finish, finish-batch, bypass, checkpoint, or pause-turn`, proving no create path exists.
- Red test: run `validate_state.cjs <state> --pre-advance 1` in a fixture that has `step-00-{slug}.spec.md` and `ac-ledger.json` but no state, and assert the stderr names both the missing state path and `HS-5` — today the message carries the path but not the HS-5 label.
- Red test: bootstrap once, mutate the state by hand (or call the dual write directly without the index refresh), and assert the next `validate_state.cjs` fails with `plans index state hash mismatch` — pinning the index-refresh obligation the bootstrap must honor.
- Red test: run the bootstrap twice in the same run directory and assert the second run exits non-zero while the `.state.json` byte content and `revision` are unchanged from after the first run.
- Red test: run the bootstrap with a missing or unresolvable spec/slug/workflow id and assert a non-zero exit naming that input plus the absence of any newly created `.state.json`, `.state.md`, or index row (no partial write).
- Red test: after the bootstrap, run `update_state.cjs finish <state> --step 0 --status completed` and assert `{us-dir}/telemetry.jsonl` exists with a numeric `elapsedSec` for Step 0 — before the change the finish itself aborts with `state file not found`.
- Red test: run a non-init state operation against a directory with no state file and assert the stderr names the bootstrap command as the remediation instead of only `state file not found` — pinning AC9 against a create-on-demand escape hatch.
- Red test: delete the state file, run a documented pre-advance check, and assert a contract test fails when the canonical `autoMode` prose no longer states the HS-5 hard stop adjacent to the pre-advance command list (no product-file edits, no dispatch, no ship).
- Red test: attempt `skipQualityGates` behavior without the `gate-bypass | pre-advance` log line and assert the contract test fails; then assert the bootstrap precondition is still present with the bypass active.
- Red test: assert no Python dependency is introduced — a scan for `*.py`/`*.pyc`/`__pycache__` under `.agents/skills/**` and `bin/` stays zero-hit, and `package.json` gains no new dependency after the change.
- Red test: assert no host-product coupling — the bootstrap script's changed bytes name no host-specific tool id, product name, machine-absolute path, or consumer project name, and the fixture runs with `node` alone from a temp repo root.
- Red test: write a residue file under `{us-dir}/.runtime/` whose name is outside `RUNTIME_NAMES`, then assert the next `update_state.cjs dispatch` fails with `unknown .runtime residue` and applies nothing — pinning the naming rule any bootstrap residue must satisfy.
- Boundary case: with a state file present and a genuinely missing pre-advance artifact, `validate_state.cjs --pre-advance 4` still exits non-zero and names the artifact, proving the generalized missing-state labeling did not weaken the artifact gate.
- Regression assertion: the lite wrapper accepts the bootstrap operation with `workflowType: lite` and the standard wrapper with `workflowType: standard`, and both leave the other pipeline's fixtures untouched.
- Concurrency failure case: two bootstraps launched against the same run directory produce exactly one state pair; the loser exits non-zero and neither run leaves a `.tmp-*` file behind.
