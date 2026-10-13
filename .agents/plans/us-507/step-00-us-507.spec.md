---
id: 507
slug: us-507
title: "ws-monitor: a plan directory with fresh step artifacts and no state file is invisible (reports 0 workflows)"
source: github
specDate: 2026-10-12
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/507"
labels:
  - bug
step: 0
workflowId: uswf-us-507-20261012T235108Z
status: completed
startedAt: "2026-10-12T23:51:20.715Z"
endedAt: "2026-10-12T23:51:20.715Z"
acRefs: []
---
# Specification — ws-monitor: a plan directory with fresh step artifacts and no state file is invisible (reports 0 workflows)

**State:** open
**Labels:** bug

## Description

`ws-monitor` enumerates runs from state files, so a run directory that never wrote machine state is invisible to the observer, to the run summary, and to the watch loop. The plan directory holds unambiguous evidence of activity (step artifacts on disk), but discovery keys on state files only: `listStateFiles()` collects `*.state.json` / `*.state.md` entries per immediate subdirectory of `{plansDir}` and a directory with zero matches contributes nothing (`monitor_snapshot.cjs:438-474`), so the directory never reaches finding classification.

Verified behavior of the current contract (repo-relative references):

- Discovery: `listStateFiles(plansDir)` returns state-file paths only; a directory holding step artifacts and no state file yields no entry.
- Enumeration: `snapshot()` builds `workflows` from that list (`monitor_snapshot.cjs:1764`, `:1774-1885`), so `workflowCount` and `activeCount` are both `0` (`:2091-2092`).
- Presentation: the Markdown report prints `Workflows: 0 (0 active)` (`:2122`) and `No workflow state files found under the configured plans directory.` (`:2144`).
- Watch loop: `--watch --until-terminal` stops on the first snapshot because `terminalReached` is `report.activeCount === 0` (`:2295-2300`).
- The blind spot is specific to on-disk discovery: memory-vault reconciliation runs independently of `stateFiles` and can still emit `vault-unreconciled-workflow` info findings (`:1900-1914`) while no run is listed.

Failure class: an in-flight run that lost (or never wrote) machine state keeps advancing on disk while the designated live observer reports that nothing is running. The defect is the silence, not the absent state file.

Required contract pinned by this spec:

- Detect a **state-less run**: `{plansDir}/{name}/` holds no `*.state.json` and no `*.state.md`, and does hold at least one top-level step artifact of the canonical step-artifact naming contract (`step-NN-{slug}.*`).
- Emit a `run-without-state` finding for it and name the newest step artifact that proves activity in the finding evidence — `warning` while that artifact is inside the effective stall window, `info` when older.
- Include state-less runs in the run summary so a fresh one is not reported as finished, while a stale one stays visible without holding an unattended watch open forever.
- Derive activity evidence from the existing step-artifact model (`expectedArtifacts()`, `:527-569`) instead of adding a parallel detector, mirroring the us-388 precedent that replaced an empty expectation list with a derived one (`:607-638`).
- Keep the multi-spec queue signal `missing-child-state` (`:825-838`) unchanged: it covers an advanced queue row whose child left no state, while `run-without-state` covers a top-level run directory.
- Keep the observer strictly read-only: detection adds no state write, no telemetry event, no configuration key, and no mutation under `{plansDir}`.

Reproduction: create `{plansDir}/demo/` containing `step-00-demo.spec.md` and `step-01-demo.plan.md` with no state files, then run `node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --slug demo`; the current script reports `Workflows: 0`.

Boundaries and touchpoints:

- Detection and record construction: `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` (`listStateFiles`, `snapshot`, `markdownReport`, `addFinding`, `DEFECT_CONTRACTS`).
- Documentation surfaces: `.agents/skills/ws-monitor/SKILL.md` § Signal map and § Detecting workflow defects (actionable signals).
- Test surface: one new `test/test-ws-monitor-*.js` suite registered in `test/test-suites.json` beside the existing monitor suites.
- Stack: `node-skills-package` — Node 22 CommonJS `.cjs` helper edited in place; no Python, no new dependency, en-us output.

## Acceptance Criteria

- AC1: When a plan directory holds at least one top-level step artifact and no `*.state.json` and no `*.state.md` file, the observer shall report that directory as a state-less run.
- AC2: If a plan directory holds neither a state file nor a step artifact, then the observer shall not report that directory as a run.
- AC3: The observer shall emit one `run-without-state` finding per state-less run, naming the newest step artifact in the finding evidence as a repo-relative path.
- AC4: While the newest step artifact of a state-less run is at most one effective stall window old, the observer shall report the `run-without-state` finding at `warning` severity.
- AC5: When the newest step artifact of a state-less run is older than the effective stall window, the observer shall report the `run-without-state` finding at `info` severity.
- AC6: The observer shall resolve the state-less freshness window from the same effective stall window as the liveness stopwatch, defaulting to 600 seconds when `--stall-window` is not supplied.
- AC7: The observer shall include every detected state-less run in `workflowCount` and shall suppress the line `No workflow state files found under the configured plans directory.` while at least one state-less run is reported.
- AC8: The observer shall count a state-less run whose newest step artifact is inside the effective stall window toward `activeCount`, so `--watch --until-terminal` does not stop while that run is fresh.
- AC9: While a state-less run is older than the effective stall window, the observer shall keep its finding visible and shall not count the run toward `activeCount`, so an unattended `--until-terminal` watch can still terminate.
- AC10: When a plan directory holds a state file, the observer shall classify it through the existing state path and shall not emit a `run-without-state` finding for it.
- AC11: When `--slug <slug>` scopes a snapshot and `{plansDir}/<slug>/` holds no state file, the observer shall resolve the state-less run by plan directory name and report it for that slug.
- AC12: The observer shall expose a state-less run record with `statePath` null, unknown step and verification fields, and the newest step artifact as repo-relative evidence.
- AC13: The observer shall derive state-less activity evidence from the canonical top-level `step-NN-{slug}.*` step-artifact naming already used by `expectedArtifacts()`, and shall treat no other file class as activity.
- AC14: The observer shall bound the state-less scan to the top-level entries of each plan directory and shall not descend into nested directories such as plan worktrees.
- AC15: If a plans-root entry is not a readable directory, then the observer shall skip it without failing the snapshot or suppressing findings for other runs.
- AC16: The observer shall keep the multi-spec `missing-child-state` signal unchanged in trigger, severity, and evidence, and shall not replace it with `run-without-state`.
- AC17: The observer shall add `run-without-state` to the `DEFECT_CONTRACTS` map so an `--open-issue` proposal names the discovery contract for that code, while dedupe and severity classification stay with the existing finding helper.
- AC18: The observer shall leave the configured plans directory unchanged, creating, modifying, and deleting no file during state-less detection.
- AC19: The ws-monitor skill documentation shall list `run-without-state` with its freshness-to-severity rule in the signal map and in the actionable-signals list.

## Original Issue Context

## Failure class

`ws-monitor` discovers workflows exclusively from `*.state.json` / `*.state.md` files. A plan directory that contains live step artifacts but no state file is not reported at all — no finding, no warning, no mention. The snapshot prints `Workflows: 0 (0 active)` and `No workflow state files found under the configured plans directory.`

## Evidence

- `ws-monitor/scripts/monitor_snapshot.cjs` → `listStateFiles()` collects only entries matching `.state.json` / `.state.md` per plan directory; a directory with zero matches is skipped silently, so it never reaches finding classification.
- Live observation: a `ws-spec-to-pr` run in progress (spec, plan, exec-DAG, AC ledger and check report on disk, newest artifact well inside the stall window) → `node monitor_snapshot.cjs --slug <slug>` printed `Workflows: 0 (0 active)`.
- The vault reconciliation in the same snapshot still ran and emitted `vault-unreconciled-workflow` info findings, so the blind spot is specific to on-disk run directories, not to the report pipeline.
- `--watch --until-terminal` therefore exits immediately for such a run, because the scoped report contains no active workflow.

## Impact

The monitor is the designated live observer for `ws-spec-to-pr` runs, and the state an operator most needs to see — an active run that has lost its machine state (no resume, no telemetry, unsatisfiable HS-5 pre-advance gates) — is exactly the state it cannot see. Silence reads as "nothing is running".

## Expected contract

Add state-less run detection derived from the existing artifact model rather than a parallel detector:

- For each `{plansDir}/{slug}/`: when no `*.state.json` / `*.state.md` exists **and** step artifacts are present, emit a finding (for example `run-without-state`) — `warning` while the newest artifact is inside the stall window, `info` when older — naming the artifact that proves activity.
- Count those directories in the run summary so `activeCount` and `--until-terminal` do not treat an active state-less run as finished.
- Keep the existing `missing-child-state` signal for the multi-spec queue; this signal covers a top-level run.

## Repro sketch

1. Create `{plansDir}/demo/` containing `step-00-demo.spec.md` and `step-01-demo.plan.md`, with no state files.
2. `node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --slug demo` → `Workflows: 0`.

### Prior Work Sweep

- Provider sweep (`.agents/plans/us-507/prior-work-sweep.json`, `status: ok`, keywords `ws-monitor`, `state file`, `0 workflows`) returned **no open PR for tracker id 507** and no in-flight branch work; the hits below are merged history, not a fix attempt.
- `#417` — mid-step checkpoints, turn-boundary pause state, and monitor stall detection (0.4.66) — merged; source of the liveness/stall model and the stall window this spec reuses for freshness.
- `#373` — opt-in execution observer for `ws-spec-to-pr` — merged; the observer contract behind the live-watch profile.
- `#364` — host adapters for transcript discovery in `ws-monitor` — merged; the bounded read-only scan pattern the state-less scan must not violate.
- `#300` — "fix: resolve workflow runtime issues and add monitor" — merged; introduced `monitor_snapshot.cjs`, `listStateFiles()` state-file discovery, and the empty-discovery line (confirmed by `git log -S "listStateFiles"` and `git log -S "No workflow state files found"`, both resolving to `5db6f9f7`).
- `#350` — step-level baton handoffs for multi-CLI runs — merged; adjacent run-identity work with no discovery change.
- Commits touching `monitor_snapshot.cjs` since (`da5dfc49` us-478 proposal sanitization, `a601775e`/`e39f76b5` us-476 stale-parent-row grace, `952178ba` us-412-418 monitor accuracy, `6ebf2014` us-448 multi-spec state-dir isolation) all narrow selection or classification; **none adds a discovery source for a directory without state.**
- Duplicate-risk note: existing assertions already pin the counts this change must not disturb — `test/test-ws-monitor-us464.js:188-193` (unmatched slug → `workflowCount` 0, unfiltered scan sees every state-backed run), `test/test-ws-monitor-us395.js:256` (`activeCount` 0), `test/test-ws-monitor-us388.js` (`missing-child-state`), and the liveness / watch-profile suites. The added contract must extend these anchors, not re-phrase them.

### Design Intent

- **Intentional constraint:** the observer is read-only — it must not fix product code, patch skills, or edit workflow state (`ws-monitor/SKILL.md:14`, `:29`). Recovery of a state-less run is therefore out of scope; the fix reports activity from artifacts that already exist and never writes the state a run did not write.
- **Intentional constraint (why discovery is state-file based):** `listStateFiles()` shipped with the observer itself (`5db6f9f7`) as a state enumerator, and every later discovery change narrowed *selection* rather than widening *sources*: `6ebf2014` (us-448) isolated multi-spec run state directories, and us-464 made slug selection state-derived so the selected run and the printed slug can never disagree (`monitor_snapshot.cjs:413-436`). A state-less directory has no state to derive from, so the new path must state its own selection rule explicitly (see Assumptions & Open Questions) instead of silently reintroducing folder-name-first matching for state-backed runs.
- **Intentional precedent:** us-388 closed a structurally identical blind spot by deriving an expectation from the existing model rather than adding a second detector — "derive ws-spec-multi child-state expectations from the batch queue rows instead of the empty list" (`6aa19c83`), with `missing-child-state` complementing `stale-parent-row` (`monitor_snapshot.cjs:825-838`). This spec applies that precedent to top-level run discovery.
- **Intentional constraint:** `--until-terminal` terminates on `report.activeCount === 0` (`:2295-2300`, added in `ad134fce`, us-412-413). Any change that inflates `activeCount` without a bound would make an unattended watch hang forever, so counting must stay window-bounded (see Assumptions).
- **Accidental gap:** `listStateFiles()` treats "no state file in this directory" as "not a run". That is correct for the state-backed enumeration it was written for, but wrong as a discovery rule for an observer whose purpose is reporting activity; nothing in code, tests, or docs declares state-less run directories out of scope.

## Notes

- Evidence chain for the gap, in execution order: `listStateFiles` (`monitor_snapshot.cjs:438-474`) → `snapshot()` enumeration (`:1764`, `:1774-1885`) → summary counts (`:2091-2092`) → Markdown `Workflows:` header and empty-discovery line (`:2122`, `:2144`) → `--until-terminal` exit (`:2295-2300`).
- The empty-discovery line is the only place the report acknowledges a plans root with no state files; it is therefore part of the repro's observable acceptance signal, not cosmetic text.
- Regression anchors that constrain the design: existing monitor fixtures write state files without step artifacts, and `test/test-ws-monitor-us464.js:188-189` plus `test/test-ws-monitor-us395.js:256` assert zero counts for them. Requiring step artifacts (AC2) and excluding state-backed directories (AC10) is what keeps those suites green.
- Companion signal, kept deliberately: `missing-child-state` is derived from multi-spec queue rows via `expectedChildArtifacts()` (`:623-638`) and stays the signal for an advanced queue row; `run-without-state` is the top-level run signal the issue asks for.
- Finding plumbing: `addFinding()` dedupes on `severity:code:message` (`:640-644`), so one finding per directory (message naming the directory) keeps distinct runs distinct; `actionableFindings()` promotes `warning`/`critical` into the `--open-issue` proposal (`:1648-1650`), and `defectContractFor()` falls back to a generic contract text when a code is missing from `DEFECT_CONTRACTS` (`:1618-1646`) — hence AC17.
- Freshness source: `stallWindowMs` resolves from `--stall-window <seconds>` with a 600-second default and also drives `workflow.stopwatch.thresholdMs` (`:1887-1892`), so a state-less run and a state-backed hung run report comparable ages; the same window bounds `stale-parent-row` propagation grace.
- Read-only boundary: detection must not create the state file, touch `.runtime`, or write `workflow-monitor.*` artifacts; the observer only writes a report when the caller passes `--report` or `--open-issue` (`:2269-2292`), which stays unchanged.
- Reproducible baseline before the change: `node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --slug demo` on the repro fixture prints `Workflows: 0 (0 active)` with the empty-discovery line; that output is the red signal this spec turns green.
- Anonymization: the issue text carries no consumer repository names, hostnames, machine paths, session ids, or customer data, and this spec adds none; the failure class is described generically and all cited paths are repo-relative.
- Open product choice (scoping and counting boundaries) is recorded in the companion `.agents/specs/pending/0177-us-507.context.md`.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Writing, repairing, or back-filling a state file for a state-less run | The observer is read-only by contract; synthesizing state would fabricate a run history the workflow never wrote and would collide with resume semantics. |
| Reconstructing step, score, or telemetry data for a state-less run from its artifacts | Detection reports activity and freshness only; a derived state machine would be the parallel model the issue explicitly rules out. |
| Changing the multi-spec `missing-child-state` signal or its severity | That signal covers an advanced queue row whose child left no state; the issue requires it kept as-is while `run-without-state` covers a top-level run. |
| A new configuration key, telemetry event type, or CLI flag for state-less detection | Detection reads artifacts that already exist; AC6 reuses the existing stall window and no new surface is required. |
| Recursive scanning of nested plan subdirectories (`worktrees/`, `.runtime/`) | A bounded top-level scan keeps the observer cheap and read-only and avoids matching runtime markers or product-tree files as run activity (AC14). |
| Back-filling state-less runs into `{plansDir}/index.json` | The plans index is itself state-derived (`workflow_state.cjs:2578-2592` walks the plans tree for `*.state.md`), so it inherits the same blind spot; extending it is a separate decision, not needed for observer visibility. |
| Auto-remediation, alerting, or issue filing without `--open-issue` | The observer proposes; the skill and the configured SCM provider decide. Making detection alone file a tracker item would exceed the observer contract. |
| Other observers (harness checks, offline audits, resume) | This spec pins `ws-monitor` discovery only; resume and audit behavior for state-less directories is a separate concern. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Step-artifact evidence definition | A top-level file whose name begins with the canonical `step-NN-` step-artifact prefix (for example `step-00-demo.spec.md`) | Reuses the naming the artifact model already emits and leaves state-only fixtures, which carry no step artifacts, at their asserted zero counts | n |
| Slug scoping for a state-less directory | Match the plan directory name when no state exists, leaving state-derived selection unchanged for state-backed runs | The repro sketch scopes `--slug demo` at a directory with no state, so the directory name is the only available selection key; us-464's state-derived rule still governs runs that have state | n |
| `--workflow-id` selection for a state-less directory | Never selects a state-less directory | A state-less run records no `workflowId`, and inventing one would make machine selection report an identity the run never had | n |
| Counting of stale state-less runs | Only runs inside the effective stall window count toward `activeCount`; older runs stay visible as `info` | An unbounded `--until-terminal` would hang forever on an abandoned directory, which is a worse defect than the reported one | n |
| Directory whose step artifacts carry a different slug than the directory name | Report the run under the directory name and name the mismatching artifact in evidence | The directory is the run's plan folder; the mismatch is itself diagnostic and must not hide the run | n |
| Freshness boundary at exactly one window | Age equal to the window counts as fresh (`warning`) | Matches the stopwatch boundary rule, where only `idleMs > thresholdMs` is stalled, so equal-age boundaries read consistently across signals | n |
| Auth boundaries, rate limits, TTL/expiry, external-dependency failure, concurrency | N/A because this is a local read-only scan of one plans root with no network call, no authentication surface, no retention semantics, and no new writer | FORMAT.md implicit-dimension collapse for dimensions this change does not touch | n |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | The change is limited to state-less detection in `monitor_snapshot.cjs`, the `ws-monitor/SKILL.md` signal documentation, one new test suite, and its `test/test-suites.json` registration | `git diff --stat` lists only those paths |
| Atomic criteria | Each of AC1–AC19 has one observable assertion and no AC depends on another AC's internal state | AC-to-test map reviewed against this spec before implementation |
| Reproduction available before coding | The repro fixture (two step artifacts, no state file) raises `Workflows: 0` on the pre-change script | Run the repro sketch on current HEAD and record the output |
| Failure modes enumerated | Unreadable entry, state-only directory, artifact-only directory, stale state-less run, window boundary, nested artifact, and `--workflow-id` scoping are covered by AC2, AC6, AC9, AC10, AC14, AC15, AC16, and the Assumptions table | Negative scenarios below executed as red tests first |
| Observation telemetry | `--json` exposes the state-less record (`statePath` null, run status, repo-relative newest-artifact evidence) and the Markdown report names the finding with severity | `node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --slug demo --json` and the Markdown run on the same fixture |
| Existing anchors preserved | us-464 slug counts, us-395 `activeCount`, us-388 `missing-child-state`, liveness, and watch-profile suites still pass unchanged | `node test/test-ws-monitor-us464.js`, `node test/test-ws-monitor-us395.js`, `node test/test-ws-monitor-us388.js`, `node test/test-ws-monitor-liveness.js`, `node test/test-ws-monitor-watch-profile.js` |
| Test registered | The new suite is listed in `test/test-suites.json` beside the other `test-ws-monitor-*.js` entries, so the configured test run executes it | Diff of `test/test-suites.json` plus a suite-list run |
| Stack invariant — Node-only CommonJS helper | Detection stays inside the existing Node 22 CommonJS `monitor_snapshot.cjs`: no Python file, no ESM conversion, no new dependency, no new shell-out | `node --check .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` plus a diff free of `.py`, dependency, and launcher changes |
| Stack invariant — read-only observer safety | Detection opens no writable handle and creates no file under `{plansDir}`; two consecutive snapshots leave the fixture byte-identical | Recursive path/mtime/size listing of the fixture plans root compared before and after a snapshot |
| Zero open blockers | Prior-work sweep reports no open PR or in-flight commit for tracker id 507, and no unresolved dependency on another spec | Sweep result recorded under Original Issue Context → Prior Work Sweep |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Pre-change repro baseline: `node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --slug demo` on a fixture with only `step-00-demo.spec.md` and `step-01-demo.plan.md` prints `Workflows: 0 (0 active)` followed by `No workflow state files found under the configured plans directory.`
- Post-change observation: the same command reports the run and a `WARNING \`run-without-state\`` line naming the newest artifact; `--json` shows `workflowCount: 1`, `activeCount: 1`, and a state-less record with `statePath: null`.
- Freshness sweep: re-run with `--stall-window 1` against a just-touched artifact (expect `warning`, `activeCount: 1`) and against an artifact older than the window (expect `info`, `activeCount: 0`).
- Watch behavior: `node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --slug demo --watch --interval 1 --until-terminal` must not exit on the first tick while the artifact is fresh, and must exit 0 once the run is terminal or the only state-less run is stale.
- Regression anchors: `node test/test-ws-monitor-us464.js`, `node test/test-ws-monitor-us395.js`, `node test/test-ws-monitor-us388.js`, `node test/test-ws-monitor-liveness.js`, `node test/test-ws-monitor-watch-profile.js`, plus the new monitor suite registered in `test/test-suites.json`.
- Static check: `node --check .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`.
- Read-only proof: dump the fixture plans root recursively (relative path, size, mtime) before and after a snapshot and compare the listings for equality.

### Negative & Failing Test Scenarios

- Red test: a plan directory holding only a state file and no `step-NN-` artifact must produce no `run-without-state` finding and must keep `workflowCount` unchanged, pinning the precondition that protects the us-464 and us-395 zero-count assertions.
- Red test: a directory holding neither a state file nor a step artifact (an empty scratch folder, or a folder holding only `worktrees/`) must not appear in `workflows` and must not raise the finding.
- Red test: a directory whose state file is malformed or truncated must still go down the existing state path and must never raise `run-without-state` — state presence is the discriminator, not parse success.
- Red test: a state-less run whose newest artifact is older than the effective stall window must report `info` and must not increment `activeCount`, so `--until-terminal` still terminates on an abandoned directory.
- Red test: at the window boundary (artifact age equal to the window) severity must be `warning`, not `info`.
- Red test: `--workflow-id <unknown-id>` must not match a state-less directory and must leave `workflowCount` at 0 for that selector.
- Red test: nested artifacts such as `demo/worktrees/<slug>/step-00-x.spec.md` or a `.runtime/` marker must not count as activity for the top-level run.
- Red test: a plans-root entry that is not a readable directory — including the `{plansDir}/index.json` file and a permission-denied directory — must be skipped without failing the snapshot, while a sibling state-less run in the same root is still reported.
- Regression assertion: run the monitor suites and assert `missing-child-state`, the us-464 slug-scoping counts, the us-395 `activeCount === 0` check, and the watch-profile expectations still pass unchanged.
- Contract assertion: assert `ws-monitor/SKILL.md` names `run-without-state` together with the fresh-`warning` / stale-`info` rule, so documentation cannot drift from the code.
- Stack-safety assertion: assert no file is created under the fixture plans root during a snapshot and that the diff contains no Python file, no new runtime dependency, and no ESM/launcher change (node-skills-package invariant).
