---
step: 2
slug: harness-efficiency-and-verifiability
title: "Harness efficiency, verifiability, and observability upgrade"
status: "plan refined ok"
workflowId: harness-efficiency-and-verifiability-20260821T195820Z
planningBaseline: 8dfac87ba1e2e6f5c9cea6932e8cf51a812924ff
supersedes: step-01-harness-efficiency-and-verifiability.plan.md
sharedUnderstanding: confirmed
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC15, AC16, AC17, AC18, AC19, AC20, AC21, AC22, AC23, AC24, AC25, AC26, AC27, AC28, AC29, AC30, AC31, AC32, AC33, AC34, AC35, AC36, AC37, AC38, AC39, AC40, AC41, AC42, AC43, AC44, AC45, AC46, AC47, AC48, AC49, AC50, AC51, AC52, AC53, AC54, AC55, AC56, AC57, AC58, AC59, AC60, AC61, AC62, AC63, AC64, AC65, AC66, AC67, AC68, AC69, AC70, AC71, AC72, AC73, AC74, AC75, AC76]
---

## 0. Summary & binding decisions

Implement W1-W10 and AC1-AC76 in one dependency-ordered standard-pipeline change. Build the shared Node runtime and machine contracts first, then plan/AC traceability, then context and latency changes, then historical intelligence, and finally package/CI/docs/integrity synchronization.

Maintainer decisions are closed:

1. W1-W10 are all in scope.
2. `defaults.gateGranularity` accepts `"step"` or `"phase"` and defaults to `"step"`.
3. Ledger-derived scores have no override.
4. Packaged `config.json.example` defaults `fable.auditVerdictsBlockShip` to `"refuted"`. This repository's gitignored consumer config must be normalized from legacy boolean `true` to `"refuted"` so its existing REFUTED-only behavior does not change; it must never be packaged or staged.
5. Existing Python helpers remain supported and frozen except the explicitly required resolver/sabotage fixes. Node ports are the invocation surface for both orchestrators.
6. A known `REFUTED` verdict and every existing HS/G2/safety hard stop remain fail-closed under every config mode, including `false`, `dryRun`, and `skipQualityGates`.
7. This workflow may implement and run safe local verification later, but may never checkout, stage, commit, push, reset, clean, create a PR, or mutate an external service. With `parallelVerifyReview: false`, the run must pause at the existing post-Step-5 G2-code boundary before Step 6 when the product stage set is non-empty.

No runtime npm dependency, daemon, external service, host-specific adapter, compatibility alias, new skill id, extra dogfood `SKILL.md`, or `.agents/dev-harness/` is introduced.

## 1. Definition of Ready, scope, and dirty-tree isolation

### 1.1 Primary evidence inspected

- Current standard/lite Python state writers and validators.
- Standard `PROTOCOLS.md`, `STEP-DISPATCH.md`, `ARTIFACTS.md`, gates, setup, progress, delivery, and cleanup companions.
- Shared Python/Node consumer-root resolvers and every current Python `resolve_repo_root` definition.
- Current config, example, schema, configure interview, package scripts, CI, site builder, integrity generator/manifest, telemetry aggregate generator, and test inventory.
- Current run state and the `hermes-spec-to-pr-enhancements` artifacts used by the spec baseline.
- Current working tree and hashes of protected consumer-owned files.

### 1.2 Current protected dirty state

The implementation must snapshot `git status --short --untracked-files=all` at the start of every batch and compare only planned paths after the batch. It must not write a scratch snapshot into the repository.

Protected paths are immutable unless an explicit exception below names the exact write:

- `.agents/plans/telemetry/aggregate.json`
- `.agents/skills/ws-shared/MEMORY.md`
- `.agents/skills/ws-shared/CHANGELOG.md`
- `.agents/skills/ws-shared/memory/2026-08-21-sabotage-restore-paths.md`
- `.agents/codereviews/**`
- `.agents/plans/hermes-spec-to-pr-enhancements/**`
- `.agents/plans/us-217/**`
- `.agents/specs/harness-efficiency-and-verifiability.spec.md`
- Existing artifacts under `.agents/plans/harness-efficiency-and-verifiability/**`, except artifacts legitimately created by later workflow transitions. Step 2 itself writes only this refined plan.
- Every other pre-existing plan, review, audit, telemetry, and spec artifact reported by the current status.

Current hash guardrails:

| Path | Current state | Git object hash | Rule |
|---|---|---|---|
| `FEATURES.md` | untracked, 25,700 bytes | `c4529ee8d1158758e0853e44764a2fd351f186fc` | Approved merge target only. Re-read and re-hash immediately before editing; preserve unrelated headings/rows/text. |
| `.gitignore` | tracked and currently clean | `f48f82f62956f3d66e54454ab99ca7258a462d9d` | Keep byte-identical. It already excludes `__pycache__`, `**/__pycache__`, `*.py[cod]`, and `*.pyo`. |
| `ws-shared/MEMORY.md` | modified consumer data | `da61add94fcd93f97db434af72ff2534095ca020` | Never edit or compile in this run. |
| `ws-shared/CHANGELOG.md` | modified consumer data | `9d4231f6b241d88d877790543a7c84b15596c28c` | Never edit in this run. |
| sabotage memory entry | untracked consumer data | `fe981e25d282df3e97600bf568add8f63cbf356c` | Never edit in this run. |

Explicit dirty-file exceptions:

1. `FEATURES.md`: section-level merge only, after adopting the then-current bytes and hash as the merge base.
2. `.agents/skills/ws-shared/config.json`: change only `fable.auditVerdictsBlockShip` from current legacy `true` to `"refuted"`; it is gitignored consumer data, excluded from manifests/staging, and not a package source.
3. Current workflow artifacts: only normal orchestrator-owned writes after this Step 2. No product test may use the real plans directory.

After each batch:

1. Compare `git status --short -- <planned paths>` with the batch allowlist.
2. Compare `git diff -- <planned tracked paths>` and inspect newly created planned files.
3. Re-hash every protected file above and fail immediately on unexplained drift.
4. For `FEATURES.md`, compare changed sections against the adopted pre-edit bytes.
5. For sabotage, compare only byte snapshots of explicit `--paths`; never compare the whole tree with HEAD.

### 1.3 Scope boundaries

In scope:

- Root/shared progressive disclosure, canonical normative homes, dispatch context budgets, and repeatable byte measurements.
- Standard and lite orchestration state surfaces and shared runtime contracts.
- Plan index, AC ledger, deterministic scoring, review-round retention, and sabotage hardening.
- Adaptive convergence, phase gates, test-surface probing, classifier execution profiles, and historical estimates.
- Telemetry events/aggregate/reporting, diagnostics persistence, run/index artifacts, and deterministic progress rendering.
- Shared resolver adoption, Node ports, package/CI/eval/site/docs/integrity synchronization.

Out of scope:

- Changing FSM step numbers, deleting Python helpers, weakening a gate, live SCM/provider operations, adding dependencies, or retroactively rewriting historical telemetry.
- Mutating consumer MEMORY/CHANGELOG/history, reviews, source specs, or unrelated plan artifacts.

## 2. Technical design and ownership contracts

### 2.1 Dependency order

```text
B0 dirty baseline
  -> B1 shared resolver + Node parity ports
  -> B2 schemas + state/run/index/telemetry core
     -> B3 refined plan/index/artifact economy
        -> B4 spec validator + AC ledger + scoring/reviews/sabotage
        -> B5 progressive disclosure + context budget
     -> B6 latency/gates/convergence
     -> B7 aggregate telemetry + diagnostics
        -> B8 classifier/history/remaining-time intelligence
  -> B9 package test chain + CI + eval/tarball enforcement
  -> B10 docs/catalog/site/integrity synchronization
```

B4 depends on B3's AC-to-section mapping. B5 depends on B2/B3's state and plan slices. B6 may use AC48 only after B2 supplies honest dispatch/finish timestamps. B8 cannot land before B7 supplies medians. B9 and B10 run only after all behavior is stable.

### 2.2 Shared resolver and Node runtime ownership

`ws-shared/scripts/resolve_consumer_root.cjs` and `.py` remain the sole consumer-root/config resolution implementations. They own:

- explicit `--repo-root` / override;
- project-local hub precedence;
- global skills-root detection;
- project config winner;
- POSIX repo-relative persistence helpers;
- resolved `{skillsRoot}`, `{sharedDir}`, and `{globalSkillsRoot}` reporting.

No caller may derive consumer data from `__file__`, `__dirname`, `parents[N]`, or a globally installed sibling hub.

There are eight current Python consumers with local `resolve_repo_root` implementations that the no-reimplementation test must eliminate:

1. `ws-local-spec-provider/scripts/register_local_spec.py`
2. `ws-github-provider/scripts/comment_issue.py`
3. `ws-azure-devops-provider/scripts/comment_issue.py`
4. `ws-github-provider/scripts/sweep_prior_work.py`
5. `ws-azure-devops-provider/scripts/sweep_prior_work.py`
6. `ws-testing/scripts/run_sabotage.py`
7. `ws-github-provider/scripts/github-issue-to-spec.py`
8. `ws-azure-devops-provider/scripts/ado-workitem-to-spec.py`

The first six are the direct AC69 basename set; the two converter siblings are included because AC69's regression check cannot truthfully forbid local reimplementations while leaving known instances.

Add `ws-shared/scripts/workflow_state.cjs` as the pure shared engine. It owns parsing, serialization, schema constants, path normalization, atomic per-file replacement, state transitions, artifact validation, and deterministic renderers. It does not own standard/lite step labels or step ranges.

Thin entrypoints:

- `ws-spec-to-pr/scripts/update_state.cjs`
- `ws-spec-to-pr/scripts/validate_state.cjs`
- `ws-spec-to-pr-lite/scripts/update_state.cjs`
- `ws-spec-to-pr-lite/scripts/validate_state.cjs`

Each wrapper only selects `pipeline`, step range/labels, and calls the shared CLI runner. No parser, serializer, scoring, resolver, telemetry, or renderer logic is duplicated in wrappers.

The current `.py` state helpers remain supported frozen references. Standard/lite recipes, orchestrator docs, tests, and runtime calls invoke only the `.cjs` entrypoints after the port lands.

Required Node helper ports:

- `ws-local-spec-provider/scripts/register_local_spec.cjs`
- `ws-local-spec-provider/scripts/detect_specs_dir.cjs`
- `ws-self-learning/scripts/self_learning.cjs`

Their Python equivalents remain. Both orchestrators and all shipped recipes use the Node ports. Node ports import the shared `.cjs` resolver.

### 2.3 State writer event/transition contract

The Node update surface has explicit operations:

```text
update_state.cjs dispatch <state> --step N --label ... --model ... --jsonl-out ...
update_state.cjs finish   <state> --step N --status ... --step-output ... --jsonl-out ...
update_state.cjs bypass   <state> --step N --gate ... --reason ...
```

- `dispatch` runs synchronously before the subagent call and records `dispatchedAt`.
- `finish` runs after the result and records `finishedAt`; `elapsedSec` is computed from timestamps, never accepted as an authored source.
- `estimated: true` is allowed only when one timestamp is absent during resume/recovery.
- `finish` validates structured step output, links files/artifacts, updates compact outputs, state, per-workflow index/run artifacts, and telemetry.
- A failed write/validation exits non-zero and blocks the boundary.

All output files are computed from one in-memory snapshot and share an incremented integer `revision`. Each target is replaced via write-temp/fsync/rename in this fixed order:

1. per-step telemetry JSONL event;
2. workflow state markdown;
3. `{us-dir}/run.json`;
4. `{us-dir}/RUN.md`;
5. `{plansDir}/index.json`.

This is atomic per file, not falsely described as a cross-file transaction. Success is returned only after all writes complete and the validator confirms equal revision/state hashes across state, run, and index. Any partial-write failure exits non-zero and forces repair before advance.

### 2.4 Published schemas

All schemas use JSON Schema 2020-12, `additionalProperties: false` at normative objects, a numeric `schemaVersion`, sorted deterministic arrays where order is not semantic, and repo-relative POSIX paths.

| Schema | Validates |
|---|---|
| `ws-shared/workflow-state.schema.json` | Parsed state frontmatter/sections, `stateVersion: 2`, structured skips/gates, telemetry summary, compact outputs, manifests, commits. |
| `ws-shared/plans-index.schema.json` | `{plansDir}/index.json` workflow rows. |
| `ws-shared/run.schema.json` | `{us-dir}/run.json`, current step/gate/AC summary/next action/estimates/revision. |
| `ws-shared/telemetry.schema.json` | JSONL `dispatch`, `finish`, `gate-bypass`, and `audit-finalize` events plus run summaries. |
| `ws-shared/step-artifact.schema.json` | Shared metadata for markdown frontmatter or JSON `_meta`. |
| `ws-shared/plan-index.schema.json` | `{us-dir}/plan.index.json`, source hash, byte/line slices, AC/task/file/test links. |
| `ws-shared/ac-ledger.schema.json` | `{us-dir}/ac-ledger.json` rows, evidence, findings, alias results, and score state. |
| `ws-shared/evals.schema.json` | Every current `evals/evals.json` file. |

The Node writer may read the immediately preceding state format only to rewrite this active run once and then stamps `stateVersion: 2`; validators support only version 2 and reject missing, older, or unknown versions. This preserves the existing writer-recovery rule without creating a maintained compatibility surface.

### 2.5 Exact state, index, run, telemetry, and artifact shapes

`skippedSteps` becomes:

```json
[{"step": 3, "reason": "dag-disabled", "evidence": "defaults.enableDag=false"}]
```

Closed step-skip reasons:

- `interview-not-required`
- `dag-disabled`
- `testing-disabled`
- `no-test-surface`
- `fix-pr-not-applicable`

Mutation substep telemetry additionally permits `mutation-disabled` and `mutation-command-missing`; these do not become FSM `skippedSteps`. A generic `manual` or free-text reason is forbidden.

`gateDecision` is exactly:

```json
{"gate": "plan-approval", "choice": "advance", "reason": "auto-first-choice", "round": 1}
```

Free-form gate strings are invalid.

`{plansDir}/index.json`:

```json
{
  "schemaVersion": 1,
  "revision": 12,
  "generatedAt": "ISO",
  "workflows": [{
    "workflowId": "...",
    "slug": "...",
    "pipeline": "standard",
    "statePath": "POSIX-relative",
    "stateSha256": "...",
    "status": "active",
    "currentStep": 4,
    "updatedAt": "ISO",
    "runPath": "POSIX-relative"
  }]
}
```

Rows sort by `workflowId`. Normal bootstrap reads this file once. Missing/corrupt index uses an explicit one-time `rebuild-index` recovery command, emits `index-rebuilt`, then resumes the one-read path; it is not a per-start N-state scan.

`run.json` contains `schemaVersion`, `revision`, workflow identity/pipeline/status/current step, structured `pendingGate`, `nextAction`, per-step status/skip reason/remaining estimate, AC totals, current score, and source state hash. `RUN.md` and the chat progress board are pure renders of this JSON. No renderer reads the clock; identical JSON yields byte-identical text.

Telemetry common fields are `schemaVersion`, `type`, `timestamp`, `workflowId`, `pipeline`, `packageVersion`, `step`, `model`, `retries`, `reviewRounds`, `refineRounds`, `skipReason`, `acTotal`, and `acImplemented`. `finish` additionally requires `dispatchedAt`, `finishedAt`, computed `elapsedSec`, token fields, files touched, structured `gateDecision`, score/verdict, and errors.

Every markdown step artifact has frontmatter:

```yaml
step: 5
slug: ...
workflowId: ...
status: completed
startedAt: ISO
endedAt: ISO
acRefs: [AC1, AC2]
```

JSON step artifacts carry the same keys under top-level `_meta`. `startedAt`/`endedAt` must be ISO timestamps; `endedAt` may be null only while status is active. `acRefs` are sorted, unique, and validated against the Step 0 spec. `validate_state --pre-advance` validates metadata and content hash, not only existence.

The artifact registry is refactored to one `## Artifact map` table with path, producer, reader, schema/frontmatter, section-read contract, lifecycle, and committability. `read-artifacts-registry` resolves one row/anchor. No skill reads the whole registry.

Closed `{us-dir}/.runtime/` names/patterns:

- `started-at.txt`
- `workflow-id.txt`
- `baseline.txt`
- `sentinel.pid`
- `revision`
- `blocked-reason`
- `round-{N}.md`
- `final.md`
- `plan-gate.md`
- `resolve-{token}.txt`

No temp/state transaction file may be left there. Atomic writer temp files live adjacent to their target, are removed before return, and any residue fails validation with a clear recovery action.

### 2.6 Plan index and section slicing

`plan_index.cjs` owns `{us-dir}/plan.index.json`.

- The refined plan is the sole plan of record when present.
- After Step 2, it stamps Step 1 `superseded: true` and `supersededBy`, then builds the index. This Step 2 run cannot modify Step 1; the new behavior applies when implemented and is backfilled before current Step 3.
- Each indexed section stores zero-based half-open UTF-8 byte offsets over the exact on-disk bytes, one-based inclusive line ranges, section SHA-256, source file SHA-256, AC ids, tasks, expected files, and expected test names.
- Consumers verify the source hash before slicing. Hash mismatch fails closed and requires index rebuild; no stale offset read.
- Steps 3-7 request only named sections/AC slices through the index.

When DAG is disabled, the orchestrator calls `write_sequential_dag.cjs`, writes the normal exec-plan and DAG stub, records Step 3 as skipped with `dag-disabled`, and does not dispatch a Step 3 subagent.

### 2.7 AC ledger, evidence, and deterministic scoring

`ws-spec-to-pr/scripts/ac_ledger.cjs` is the only writer of `{us-dir}/ac-ledger.json` and exposes `init`, `link`, `verify`, `score`, and `report`.

Each AC row contains:

- `id`, exact `text`, and semantic `status` (`Pending`, `Implemented`, `ImplementedDifferently`, `NotImplemented`);
- linked plan sections/tasks;
- files with repo-relative path, current SHA-256, and validated line range;
- commits with SHA and owning step;
- tests with name, source file, planned/observed phase, configured alias, exit code, and timestamp;
- semantic verdict evidence;
- review findings with id, severity, state, round, and `path:Lx-Ly`;
- sabotage requirement/status/exit code;
- append-only link event ids.

Evidence rules:

1. File evidence is `repo/relative/path:Lstart-Lend`, must resolve inside the repo, and the line range must exist in the current file hash.
2. A mapped test names a test case that occurs in a linked test file. `planned` mappings originate in `plan.index.json`; `observed` mappings come from Step 7 or an approved machine skip.
3. Non-empty configured `verification.*` aliases are captured unchanged with command hash, start/end timestamps, and exit code. Empty aliases are N/A, not pass.
4. Review findings are open until a later round explicitly closes the same finding id. An ineffective assertion/test/gate is minimum Warning.
5. Sabotage status is derived from the helper exit code. Reports render it; agents do not author it.
6. Link events are applied idempotently and sorted deterministically.

Score algorithm:

- Per-AC evidence units: semantic status 4, valid file-line evidence 3, mapped test 2, plan/task linkage 1.
- Raw score is `floor(10 * earnedUnits / totalUnits)`.
- Any `NotImplemented`, declared unfixed gap, failed required sabotage, failed non-empty verification alias, or open Warning/Critical caps the score at 8.
- Missing file-line or mapped-test evidence without a known defect caps the score at 9.
- Score 10 requires every AC `Implemented` or justified `ImplementedDifferently`, valid file-line evidence, a mapped test, all non-empty aliases exit 0, required sabotage pass, and zero open Warning/Critical.
- No override or authored numeric source exists.

Scoring is boundary-aware to avoid a Step 5 deadlock:

- `score --boundary step5`: requires planned test mappings plus observed configured alias results; review status may be `not-run` and is not treated as an open finding.
- `score --boundary pre-step6`: additionally requires the post-Step-5 G2 commit SHA linked to every changed AC and a clean workflow-owned product stage set.
- `score --boundary ship`: requires code review complete/clean and Step 7 observed tests or a machine-proven `no-test-surface`/`testing-disabled` skip.

`update_state --verification-score` recomputes for the requested boundary and rejects disagreement. `validate_state --pre-advance` calls ledger verification:

| Advance to | Required ledger/state evidence |
|---|---|
| 1 | Validated spec and one ledger row per AC. |
| 2 | Plan/index mapping covers every AC. |
| 3 | Refined plan metadata/index valid and interview registry closed. |
| 4 | DAG artifact or `dag-disabled` machine skip. |
| 5 | Step 4 task/file links exist. |
| 6 | Step 5 score ≥9, report evidence valid, post-Step-5 commit links complete, product stage set clean. |
| 7 | Latest review round retained and no open Warning/Critical. |
| 8 | Observed tests linked, or machine test-surface skip evidence; aliases green. |
| 9 | Delivery artifact and ship evidence valid. |

Step 4 links tasks/files immediately. The orchestrator links its commit SHA after G2-code while retaining Step 4 ownership in the ledger. In this no-commit run, implementation and local verification can complete, but pre-Step-6 verification must remain blocked when commit linkage is absent.

### 2.8 Context construction and budgets

Do not conflate AC6's fixed-preamble limit with the whole dynamic dispatch budget:

- fixed named contract sections: hard cap 18,000 bytes;
- default `defaults.contextBudget`: 32,000 bytes per complete dispatch;
- injected MEMORY slice: hard cap 4,000 bytes inside the total;
- each `## Subagent contract`: at most 40 lines.

`build_dispatch_context.cjs` assembles in deterministic priority:

1. portable dispatch header and required hard-stop/gate sections;
2. target skill sections and six mandatory enhancing-skill subagent contracts;
3. exact indexed spec/plan/AC slices required by the step;
4. compact state output and at most two most recent full step outputs;
5. path-scoped MEMORY slice;
6. stack/pattern slices;
7. optional historical context.

Mandatory content exceeding the budget fails before dispatch. Optional content is omitted only by the published priority order and records byte counts/omissions in telemetry. AC/spec text and hard stops are never silently truncated.

`measure_harness.cjs` reports exact UTF-8 bytes by source and scenario for fixed preamble, complete dispatches, repeated artifact reads, mandatory sleep, and blocking gates. It asserts standard-run harness bytes at least 45% below 962,298 and artifact re-reads at least 40% below 368,038.

### 2.9 Progressive-disclosure and documentation size budgets

Hard budgets enforced by `test-context-budget`/`test-doc-sync`:

| File/surface | Budget |
|---|---:|
| root `AGENTS.md` | 40,000 bytes |
| `ws-shared/AGENTS.md` | 14,000 bytes |
| root `CATALOG.md` | 24,000 bytes |
| `ws-shared/CATALOG.md` | 14,000 bytes |
| `ws-shared/CROSS-PLATFORM.md` | 8,000 bytes |
| generated `docs/index.html` | 180,000 bytes (current baseline 147,882) |
| fixed dispatch preamble | 18,000 bytes |

Companions are on-demand and are not re-added to always-applied or dispatch inputs. Root catalog moves to root `CATALOG.md`; shared promoted tables move to `ws-shared/CATALOG.md`; shell/encoding guidance moves to `ws-shared/CROSS-PLATFORM.md`. `package.json.files` explicitly includes root `CATALOG.md`.

`bin/build-site.js` reads `CATALOG.md`, generates in memory, supports `--check` without writing, rejects conflict markers in inputs/output, and preserves LF. CI runs `--check`; normal local generation writes only when content differs.

### 2.10 Portable wording

Replace product-branded model-switching recipes in both:

- `ws-shared/tools.md`
- `ws-configure-project/INTERVIEW.md`

Use only capability vocabulary: `dispatch-agent`, optional subagent model parameter, active session model fallback, and host-provided structured choice. Do not probe branded private folders or list branded host products in shipped skill/tool/gate/banner/template wording.

The portability test scans all new/modified shipped runtime-contract prose and scripts while excluding consumer-owned CHANGELOG/MEMORY data and upstream-only historical artifacts. No new shipped wording may contain a host product name or require a host-private path.

### 2.11 Fable tri-state semantics

Add a strict `fable` object to `config.schema.json`:

```json
{"auditVerdictsBlockShip": {"enum": [false, "refuted", "caveats"], "default": "refuted"}}
```

Semantics:

- `false`: caveated outcomes do not block, but a known `REFUTED` still blocks as the unconditional safety floor.
- `"refuted"`: `REFUTED` blocks.
- `"caveats"`: `REFUTED` and `VERIFIED WITH CAVEATS` block.

Normalize this once in config resolution. Gates, verify, PREPARE, ship, standard/lite, and tests consume the normalized enum. Legacy boolean handling is confined to the one active-run writer rewrite/test and is not documented as a continuing public alias.

### 2.12 Parallel verify/review seam

Default remains sequential. When `parallelVerifyReview: true`:

1. Run G2-code after Step 4.
2. Pin immutable commit SHA.
3. Dispatch Step 5 and Step 6 concurrently as read-only product-tree reviewers; each may write only its own workflow report.
4. Neither subagent writes state or ledger.
5. Orchestrator waits for both, persists review round, then links results serially.
6. Merge findings deterministically by severity, path, line, finding id.
7. Any score gap or Warning/Critical enters one fix, re-verify, and re-review loop.

This preserves committed-diff review and prevents concurrent ledger/state writers.

## 3. Step-by-step implementation batches

### B0 - Freeze baseline and allowlist

- Re-read every target before editing.
- Capture current status/hashes without a repository scratch file.
- Build exact B1-B10 path allowlists.
- Confirm local `.agents/skills/ws-*` SoT only; never read/write a global copy.
- Confirm `.gitignore` already has Python cache exclusions and remains unchanged.

Check: protected hashes and path-scoped status only.

### B1 - Shared resolver and Node parity ports

ACs: AC67-AC73 foundation.

- Add shared `workflow_state.cjs` and four thin standard/lite wrappers.
- Add three required Node helper ports; retain Python helpers.
- Replace standard/lite/provider/self-learning/write-spec recipes with Node invocation surfaces.
- Migrate all eight local Python resolver definitions listed in §2.2 to shared resolver imports.
- Remove `check_memory_conflict.py` global-sibling runtime-data fallback.
- Update doctor/setup/bootstrap root/config-winner reporting.

Checks: `node --check`, parity fixtures, full standard/lite state lifecycle with Python absent from PATH, frozen Python smoke tests.

### B2 - Schemas, state, run, index, telemetry, skips, and artifact metadata

ACs: AC17, AC19, AC43-AC50, AC60, AC62-AC66.

- Add all schemas from §2.4.
- Implement dispatch/finish/bypass events, revisions, compact outputs, plans index, run JSON/Markdown, deterministic board, structured skips/gates, and artifact metadata validation.
- Update all standard/lite state call sites to Node.
- Add `probe_test_surface.cjs`.
- Normalize tri-state fable behavior without weakening unconditional REFUTED.
- Write audit finalize counts into telemetry summary keyed by workflow id.

Checks: `test-state-observability`, existing update-state/resume/quality/audit/testing tests.

### B3 - Refined plan of record and artifact economy

ACs: AC13-AC19.

- Add `plan_index.cjs`, `write_sequential_dag.cjs`, and indexed read APIs.
- Make refined plan sole record; stamp Step 1 superseded after Step 2.
- Update Steps 3-7 to request indexed sections only.
- Refactor `ARTIFACTS.md` to the single map and closed runtime list.
- Skip Step 3 dispatch when DAG is disabled, while still producing deterministic artifacts/reason.
- Extend context builder/measurement with compact outputs and artifact-read accounting.

Checks: `test-artifact-economy`, enable-DAG and resume tests.

### B4 - Spec validation, ledger, score, review rounds, and sabotage

ACs: AC27-AC42.

- Add `validate_spec.cjs` and published composite heuristic.
- Add ledger/schema/rubric and wire Step 0-7 links/boundary verification.
- Replace authored numeric scores/status lines with ledger renderers.
- Add round-preserving review writer and minimum-Warning ineffective-gate rule.
- Harden sabotage: exact configured alias, every named tracked target changes bytes, machine JSON/exit, path-only restore.
- Remove the existing forbidden `git add .` suggested-command block from `ws-verify-plan/TEMPLATE.md`; reports contain evidence and gate outcome, not staging instructions.

Checks: `test-spec-lint`, `test-ac-ledger`, hermes/quality/provider regression tests.

### B5 - Progressive disclosure and context budget

ACs: AC1-AC12.

- Move catalogs/cross-platform guidance to budgeted companions.
- Add six subagent contracts and named-section context construction.
- Move Entry check sentence to one anchor; replace all 28 current copies with links.
- Consolidate the four AC7 normative blocks in their declared homes.
- Add duplicate detector/allowlist and budget reporting to harness phases.
- Update package files/site parser for root catalog.

Checks: `test-context-budget`, measurement script, duplicate and portability fixtures.

### B6 - Convergence latency, phase gates, and stack fingerprint

ACs: AC20-AC26.

- Add convergence, parallel verify/review, gate granularity, and test-glob config/schema/interview defaults.
- Replace hardcoded fix-PR timers with state-driven config.
- Fresh provider read exits only on zero active threads plus concluded successful required checks.
- Poll running checks at min, queued/absent at max, bounded backoff, and log observed state/interval.
- Implement the serialized merge seam for optional parallel verify/review.
- Implement at-most-five phase gates and stack fingerprint.

Checks: `test-convergence-gates`, `test-stack-fingerprint`, workflow simulation.

### B7 - Aggregate telemetry, diagnostics, and medians

ACs: AC48-AC55 completion.

- Refactor aggregate generator to shared resolver and `runs[]`.
- Add per-pipeline/per-step medians and audit counts.
- Add `telemetry report`.
- Add configured dated doctor/harness persistence while default doctor remains read-only.
- Use temporary plans roots in tests; never write the dirty real aggregate.

Checks: `test-telemetry-observability`, doctor/audit tests.

### B8 - Execution profile and historical intelligence

ACs: AC56-AC61.

- Extend classifier value+reason profile and aggregate estimate.
- Add local completed-plan history search.
- Make High/Critical path-matched MEMORY force interview.
- Confirm/render whole profile and pending-step estimates.
- Enforce structured gate decisions.

Checks: `test-orchestrator-intelligence`, quality/pattern/classifier eval tests.

### B9 - Eval schema, package tree, complete test chain, and CI

ACs: AC30, AC53-AC54, AC67-AC76 enforcement.

- Validate all 44 current skill eval files.
- Add all dedicated `test:*` scripts and include them in `scripts.tests`.
- Add `test-cleanup-workflow-git.js` and workflow simulation to local/CI chains.
- Keep source-compatible checks in `tests:remote`.
- Change CI's suite command from `npm run tests -- --local` to `npm run test` so `pretests: npm pack` actually runs.
- CI also runs integrity verify and `node bin/build-site.js --check`.
- Add tarball/integrity no-cache assertions. No `.gitignore` edit or cache deletion is currently needed: no tracked/current `__pycache__` was found, package exclusions already exist, and integrity currently has no cache entry.

Checks: each dedicated script, `npm run test`, package tarball inspection.

### B10 - Docs, catalog, site, version, and integrity

ACs: docs/sync portions of all workstreams, especially AC1-AC2, AC11, AC20, AC46, AC55, AC73, AC75-AC76.

- Update README, section-merge current FEATURES, root/shared hubs, companions, autoload/tools/config docs, workflow README/FAQ/DIAGRAM, and affected templates.
- Name FEATURES in root harness protocol and ship checklist.
- Rebuild site and enforce size/conflict/no-diff checks.
- No new skill id means package membership/dependency edges remain unchanged.
- Regenerate integrity after all hashed content changes.

No-release rule for this workflow:

- Run `node bin/build-site.js`, `--check`, integrity generation/verification, tests, workflow simulation, and harness audit.
- Do not run `build-site:bump`, stage, commit, ship, push, PR, or external convergence.
- Once release is authorized in a future run, perform exactly one patch bump and synchronize package version, 44 skill frontmatters, both dependency manifests, site footer, and integrity.

## 4. Permissions, tenancy, external I/O, and language

- RBAC, tenancy, database, migrations, UI, and app i18n are not applicable.
- No live provider/SCM/auth/secret/permission/deployment operation is allowed.
- CI workflow permissions remain `contents: read`.
- Diagnostics contain no secrets, PII, full prompts, or absolute machine paths.
- Shipped skill/gate/banner/template/tool prose remains en-us and portable.
- Conversational host-specific implementation details do not enter shipped files.

## 5. Verification and complete AC traceability

Verification command ids:

- V1 `node test/test-context-budget.js`
- V2 `node test/test-artifact-economy.js`
- V3 `node test/test-convergence-gates.js`
- V4 `node test/test-spec-lint.js`
- V5 `node test/test-ac-ledger.js`
- V6 `node test/test-state-observability.js`
- V7 `node test/test-telemetry-observability.js`
- V8 `node test/test-orchestrator-intelligence.js`
- V9 `node test/test-node-helper-ports.js`
- V10 `node test/test-evals-schema.js`
- V11 `node test/test-doc-sync.js`
- V12 `node test/test-stack-fingerprint.js`
- V13 `node test/test-hermes-spec-to-pr-enhancements.js`
- V14 `node test/test-quality-gates.js`
- V15 `node test/test-ws-doctor.js`
- V16 `node test/test-ws-audit.js`
- V17 `node test/test-install.js --local`
- V18 `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`
- V19 `node .agents/skills/ws-check-harness/scripts/measure_harness.cjs --scenario standard --json`
- V20 `npm run test`
- V21 `npm run generate-integrity && npm run verify-integrity`
- V22 `node bin/build-site.js && node bin/build-site.js --check`
- V23 `ws-check-harness` Phases 0-5c, zero critical findings

| AC | Implementation/evidence seam | Test |
|---|---|---|
| AC1 | root AGENTS/CATALOG/package/site parser | V1,V11 |
| AC2 | shared AGENTS/CATALOG/CROSS-PLATFORM | V1,V11 |
| AC3 | six named subagent contracts | V1 |
| AC4 | named-section Base Prompt Prefix/context builder | V1 |
| AC5 | path-scoped ≤4 KB MEMORY injection/missing advisory | V1,V9 |
| AC6 | fixed preamble byte measurement ≤18 KB | V1,V19 |
| AC7 | unique normative homes and linked callers | V1 |
| AC8 | duplicate detector and explicit allowlist | V1,V23 |
| AC9 | artifact-map row resolver/no full reads | V2 |
| AC10 | single Entry-check sentence and 28 links | V1 |
| AC11 | context config/schema/interview/harness report | V1 |
| AC12 | standard harness byte reduction measurement | V19 |
| AC13 | sequential DAG writer/no dispatch/reason | V2 |
| AC14 | refined plan sole record/superseded draft | V2 |
| AC15 | plan index covers every AC | V2,V5 |
| AC16 | hash-checked section slices for Steps 3-7 | V2 |
| AC17 | compact outputs plus two-full-output limit | V2,V6 |
| AC18 | artifact re-read reduction | V2,V19 |
| AC19 | plans index one-read fixture with ≥20 states | V2,V6 |
| AC20 | convergence config drives every timer | V3 |
| AC21 | fresh clean read exits before heartbeat | V3 |
| AC22 | CI-state polling and round evidence | V3 |
| AC23 | immutable commit/read-only parallel merge | V3,V18 |
| AC24 | step/phase schema and ≤5 phase gates | V3,V19 |
| AC25 | stack fingerprint frontmatter/cache | V12 |
| AC26 | standard/lite sleep and gate simulation | V3,V18,V19 |
| AC27 | required spec shape/contiguous ACs/prior-work/design intent | V4 |
| AC28 | published composite heuristic/offending ids | V4 |
| AC29 | Step 0 and write-spec fail-closed validator | V4 |
| AC30 | pass/fail spec fixtures in package chain | V4,V20 |
| AC31 | ledger initialization one row per AC | V5 |
| AC32 | five ledger commands/only-writer enforcement | V5 |
| AC33 | step-owned file/commit/test/verdict links | V5 |
| AC34 | boundary linkage in pre-advance validator | V5,V6 |
| AC35 | score derived only from ledger | V5 |
| AC36 | published 10/10 rubric and evidence validation | V5 |
| AC37 | gaps/open Warning+ cap below 9 | V5 |
| AC38 | update-state score mismatch rejection | V5,V6 |
| AC39 | immutable review rounds/canonical latest | V5 |
| AC40 | ineffective gate minimum Warning | V5 |
| AC41 | sabotage byte change/configured alias | V13 |
| AC42 | sabotage exit drives ledger/report | V5,V13 |
| AC43 | closed structured skip enum | V6 |
| AC44 | skip reason telemetry/delivery render | V6 |
| AC45 | machine test-surface skip probe | V6 |
| AC46 | tri-state audit config plus unconditional REFUTED | V14 |
| AC47 | every dry-run soft pass emits gate-bypass | V6,V14 |
| AC48 | pre-dispatch/post-finish timestamps/computed elapsed | V6 |
| AC49 | extended telemetry schema | V6 |
| AC50 | audit counts keyed by workflow id | V7,V16 |
| AC51 | runs/medians and CLI markdown report | V7 |
| AC52 | aggregate runtime consumer/progress estimate | V7 |
| AC53 | workflows and cleanup in package/CI chain | V11,V18,V20 |
| AC54 | schema-valid 44 eval files | V10,V20 |
| AC55 | dated comparable diagnostics | V7,V15 |
| AC56 | execution profile values/reasons | V8 |
| AC57 | classifier gate shows whole profile | V8 |
| AC58 | completed local plan-history evidence | V8 |
| AC59 | High/Critical path match forces interview | V8 |
| AC60 | gateDecision object; string rejected | V6,V8 |
| AC61 | estimate for every pending step | V8 |
| AC62 | metadata on every markdown/JSON step artifact | V6 |
| AC63 | state validator checks metadata/content | V6 |
| AC64 | run JSON/Markdown every transition | V6 |
| AC65 | deterministic board from run JSON | V6 |
| AC66 | closed runtime list validation | V6 |
| AC67 | shared Node state core/four wrappers/no-Python lifecycle | V9 |
| AC68 | register/detect/memory Node ports | V9 |
| AC69 | all eight resolver siblings use shared resolver/no reimplementation | V9 |
| AC70 | no relative consumer runtime-data refs | V9,V15 |
| AC71 | bootstrap resolved roots/config winner | V9 |
| AC72 | doctor project/global source per skill | V15 |
| AC73 | portable model parameterization in tools/interview | V1,V9 |
| AC74 | tarball/integrity exclude Python caches | V17,V21 |
| AC75 | FEATURES mandatory sync target | V11 |
| AC76 | CI conflict-marker/catalog no-diff checks | V11,V22 |

Final verification order:

1. Run every dedicated `test:*` command added by B9.
2. Run V20 so `pretests` packs the real tarball.
3. Run V21.
4. Run V22.
5. Run V18.
6. Run V23.
7. Re-check protected hashes and path-scoped diffs.

No verification command authorizes staging or committing.

## 6. Invariants

1. Local SoT only; no global skill read/write.
2. Shared resolver is the only consumer-root/config resolution implementation.
3. Shared Node core is the only state parser/serializer/schema engine; wrappers stay thin.
4. Node ports are the standard/lite invocation surface; Python remains supported/frozen.
5. State version stamps one supported value; validators reject missing/old/unknown values.
6. Nested telemetry maps remain maps.
7. Persisted paths are POSIX repo-relative.
8. Missing MEMORY is advisory and injects an empty slice.
9. Ledger is the only AC/score writer; no score override.
10. Stage-aware scoring cannot deadlock Step 5 and ship still requires complete final evidence.
11. REFUTED and all HS/G2/safety stops remain fail-closed.
12. Gate granularity defaults to step.
13. Parallel verify/review defaults false and never creates concurrent state/ledger writers.
14. Sabotage touches/restores only named paths and derives status from exit code.
15. Build-site/frontmatter/schema output is LF UTF-8 and deterministic.
16. No runtime npm dependency.
17. No plan/runtime artifact enters product staging before delivery; this run stages nothing.
18. Protected consumer/planning/review data remains byte-preserved except the two explicit exceptions.
19. No host product names or host-private paths enter new/modified shipped runtime-contract wording.
20. Current `.gitignore` remains unchanged.

## 7. Completion checklist and current-run terminal condition

- [ ] AC1-AC76 each have an implementation seam and named verification above.
- [ ] All schema fixtures pass for standard and lite.
- [ ] Root/shared/companions/site and dispatch budgets pass.
- [ ] Duplicate detector and canonical normative homes pass.
- [ ] Standard/lite lifecycle passes with Python absent; frozen Python smoke tests pass.
- [ ] Score 9 with a known gap/open Warning is impossible.
- [ ] REFUTED and existing hard stops pass regression tests.
- [ ] Standard/lite sleep/gate simulations pass.
- [ ] All 44 eval files validate.
- [ ] CI invokes `npm run test`, workflow simulation, cleanup test, integrity, and site check.
- [ ] Tarball/integrity contain no Python cache.
- [ ] README/FEATURES/hubs/catalog/site/manifests/integrity are synchronized without conflict markers.
- [ ] Protected hashes and dirty artifacts are preserved.
- [ ] No checkout/stage/commit/push/reset/clean/PR/external mutation occurred.
- [ ] After safe implementation and local verification, this run pauses at post-Step-5 G2-code before Step 6 when the stage set is non-empty.

## 8. Open questions

None.

Shared understanding is confirmed from the seven supplied maintainer decisions. No additional user gate is required.

## Interview registry

| ID | Class | Section | Gap found | Resolution | Source/evidence | Status | Depends on |
|---|---|---|---|---|---|---|---|
| I1 | blocking | 2.2 | Shared Node core/wrapper ownership was underspecified. | One shared engine, four thin pipeline wrappers, no duplicated parser/serializer logic. | Existing standard/lite duplicate Python implementations. | resolved | none |
| I2 | blocking | 2.4-2.5 | State/index/run/artifact schemas were incomplete. | Publish eight schemas and exact metadata/index/run shapes. | AC49, AC62-AC67; current mini-parsers. | resolved | I1 |
| I3 | blocking | 2.7 | A single final-evidence score at Step 5 would deadlock before review/testing/commit. | Boundary-aware deterministic score/verify modes; final ship remains strict. | AC33-AC38 plus G2 ordering in gates/dispatch. | resolved | I2 |
| I4 | blocking | 2.2 | Plan counted seven resolver consumers and missed converter siblings. | Migrate all eight current local implementations; test forbids reappearance. | Repository `resolve_repo_root` sweep. | resolved | none |
| I5 | blocking | 1.2 | Dirty preservation hashes and current status were stale/incomplete. | Use current hashes; protect all plan/review/consumer data; only two explicit exceptions. | Current `git status`, `git hash-object`. | resolved | none |
| I6 | blocking | 2.11 | Local config is currently legacy boolean true; schema lacks the strict fable shape. | Normalize only the gitignored local value to `"refuted"` without changing behavior; packaged default `"refuted"`; strict tri-state schema. | Current config/example/schema. | resolved | I2 |
| I7 | non-blocking | 2.8 | 18 KB fixed preamble was incorrectly also used as total dispatch budget. | Fixed cap 18 KB; total default 32 KB; deterministic omission/fail rules. | AC5, AC6, AC11. | resolved | I2,I5 |
| I8 | non-blocking | 2.9 | Companion/catalog/site budgets were not explicit. | Add companion/site byte caps and no-diff site generation. | Current sizes: 62,261; 22,099; 147,882 bytes. | resolved | I7 |
| I9 | blocking | 3 B9 | CI ran `npm run tests`, bypassing `pretests: npm pack`. | CI runs `npm run test`; package chain includes workflows/cleanup. | Current package.json and CI. | resolved | none |
| I10 | non-blocking | 3 B9 | Cache-removal work assumed tracked/current caches that no longer exist. | Preserve `.gitignore`; harden tarball/integrity tests only. | No tracked/current cache; package exclusions already present. | resolved | none |
| I11 | blocking | 2.10 | Shipped tools/config interview name host products/private folders. | Replace with portable capability vocabulary and add portability test. | Current tools lines 92-107 and INTERVIEW detection row. | resolved | I7 |
| I12 | blocking | 3 B4 | Verify template still suggests forbidden `git add .`. | Remove staging commands; reports render ledger evidence/gate only. | Current `ws-verify-plan/TEMPLATE.md`. | resolved | I3 |
| I13 | non-blocking | 2.6 | Plan index offsets lacked byte/hash semantics. | Exact raw UTF-8 half-open offsets, line ranges, and source/section hashes. | AC15-AC16. | resolved | I2 |
| I14 | non-blocking | 2.5 | Runtime list and residue handling were not deterministic. | Closed existing names/patterns; no leftover temp files. | Current plan `.runtime` inventory and goal-loop contracts. | resolved | I2 |
| I15 | non-blocking | 3 B9 | Plan referred inconsistently to 44/45 skill evals. | Validate the 44 current installable skill eval files; ws-shared is a hub, not a skill. | Current eval inventory/package graph. | resolved | none |
| I16 | blocking | 0,7 | No-commit constraint could be mistaken for permission to bypass G2. | Implement/test safely, then mandatory pause before Step 6; no bypass. | Maintainer decision 7 and current gates. | resolved | I3 |

```step-output
status: success
summary: "Plan audited and refined for AC1-AC76 with all maintainer decisions closed, exact dependency/ownership seams, deterministic evidence schemas, dirty-tree isolation, and a mandatory no-commit G2 pause."
artifact: ".agents/plans/harness-efficiency-and-verifiability/step-02-harness-efficiency-and-verifiability.plan.refined.md"
corrections:
  - "Separated the 18,000-byte fixed-preamble cap from the 32,000-byte total dispatch default."
  - "Made ledger score and linkage boundary-aware so Step 5 can complete without weakening the final ship rubric."
  - "Expanded resolver migration to all eight current local Python reimplementations."
  - "Specified eight schemas, four thin state wrappers, exact event ordering, index/run/artifact shapes, and deterministic render rules."
  - "Changed the CI plan to npm run test so pretests/npm pack executes, and preserved the already-correct .gitignore."
  - "Added host-neutral wording enforcement for tools and configure interview."
ac_coverage: "AC1-AC76 mapped with no omissions in Section 5."
open_questions: []
risks:
  - "Cross-file state writes are atomic per file, not transactional; revision/hash validation must fail closed on partial writes."
  - "Boundary-aware ledger verification must be tested to avoid Step 5/Step 7 ordering deadlocks."
  - "FEATURES.md is untracked and must be merged against its current bytes, never replaced wholesale."
  - "This run must stop before Step 6 when G2-code requires a commit."
verification:
  - "All Step 1 sections 0-8 audited."
  - "Primary repository contracts, scripts, config, package, CI, site, telemetry, runtime artifacts, and current dirty state inspected."
  - "Complete AC traceability matrix and 16-item closed interview registry included."
errors: []
next_step: 3
```
