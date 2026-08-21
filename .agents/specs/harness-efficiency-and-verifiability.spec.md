---
id: null
slug: harness-efficiency-and-verifiability
title: "Harness efficiency, verifiability, and observability upgrade"
source: local
specDate: 2026-08-21
---

# Specification — Harness efficiency, verifiability, and observability upgrade

## Description

A cross-cutting upgrade of the `ws-*` skill suite described in `FEATURES.md` (package 0.3.28, 45 skills). The suite already ships every capability listed there; this spec targets **how expensively and how honestly** those capabilities execute.

Scope covers ten workstreams (W1–W10) derived from a measured audit of the current tree and of one real completed run (`.agents/plans/hermes-spec-to-pr-enhancements/`). Each workstream is independently selectable — see `## Child Tasks`.

### Measured baseline (evidence for every claim in this spec)

| Dimension | Current measurement | Source |
|---|---|---|
| Harness text loaded per standard run | 962,298 B (~240k tokens), excluding product code | Sum of orchestrator session docs + 11 subagent dispatches |
| Fixed preamble re-paid per subagent | 53,243 B × 11 dispatches = 585,673 B (61% of the total) | `ws-spec-to-pr/PROTOCOLS.md` L306-326 Base Prompt Prefix |
| Always-applied text per prompt | 84,438 B (root `AGENTS.md` 62,261 + `ws-shared/AGENTS.md` 22,099) | `.cursorrules` + workspace rules |
| Artifact re-reads per run | 368,038 B (~92k tokens) | `step-02` read by Steps 3/5/6/7 = 150,720 B; `state.md` read 9× = 107,802 B |
| Wall clock, hermes run (`autoMode: true`, zero human wait) | 8,968 s (2h29m); accounted `totalElapsedSec` 6,790 s | `hermes-…state.md` + `telemetry/step-*.jsonl` |
| Post-code cost | Steps 8+9 = 2,820 s = 42% of accounted time; Step 9 alone 2,280 s = 34% | same |
| Mandatory sleep on a zero-comment PR | 330 s (30 s + one 300 s heartbeat that cannot be skipped) | `ws-goal-fix-pr/SKILL.md` L77, `ws-ship-pr/GOAL-OVERRIDES.md` L7-14 |
| Blocking `user-gate` prompts, default non-auto run | ≥ 18 (22–27 in a repo with pending workflows) | `gates.md` L35, `setup.md`, `PROTOCOLS.md` |
| Step 3 cost when `enableDag: false` (repo default) | 90–180 s per run to emit `{"tasks":[],"levels":[]}` | `step-03-…exec.dag.json`, `ws-plan-to-tasks/SKILL.md` L38-40 |
| Bootstrap discovery I/O | Frontmatter read of every `*.state.md` (25 files today) on every start | `setup.md` L166-169 |
| Score gate integrity | Verify score is an LLM-authored integer; no script derives or cross-checks it | `ws-verify-plan/SKILL.md` L48, `update_state.py` L485-486 |
| AC traceability | Zero machine artifacts in any step carry an AC identifier | `ws-plan-to-tasks` DAG `acceptance` is free text; `step-output` has no AC field |
| Telemetry fidelity | `dispatchedAt == finishedAt` on all 10 steps; `elapsedSec` self-reported; token counts 0 on 9 of 10 steps | `hermes-…state.md` L128-138 |
| Cross-run metric store | `aggregate.json` has 7 flat fields, no run key, and **no reader** | `bin/generate-telemetry-aggregate.cjs`; no skill or test consumes it |
| Script runtime split | 26 Python vs 8 Node under `.agents/skills/`; both orchestrators' state machine is Python-only | file inventory |
| Resolver drift | 4 scripts reimplement `resolve_repo_root` without the global-root guard | `register_local_spec.py` L56-67, `comment_issue.py` L41-47, `sweep_prior_work.py` L47-53, `run_sabotage.py` L39-46 |
| Automation gaps | `check_workflows.py` (0.7 s) not in CI; `test-cleanup-workflow-git.js` orphaned; `evals/evals.json` never executed or schema-validated | `package.json` L19-22, `.github/workflows/ci.yml` |
| Packaged waste | 112,049 B of `__pycache__` inside the hashed skill tree | `ws-spec-to-pr/scripts/__pycache__/` |

### Goal → workstream mapping

| Stated goal | Workstreams |
|---|---|
| Increase delivery speed (spec → ship/PR) | W2, W3, W7 |
| Reduce token consumption | W1, W2 |
| Optimize subagent context | W1, W2, W8 |
| Increase orchestrator intelligence | W6, W7 |
| Quality gates | W4, W5 |
| Communication, output, states, files | W8 |
| Auditing for diagnostics | W6 |
| Agents scoring 10/10 over ingested specs | W4, W10 |
| Portable, maintainable, standardized, agent-agnostic | W1, W9, W10 |
| Hybrid mode enhancements | W9 |

## Acceptance Criteria

- AC1: Root `AGENTS.md` § Skill catalog (layers) moves to a companion `CATALOG.md` loaded on demand, and root `AGENTS.md` measures ≤ 40,000 B.
- AC2: `ws-shared/AGENTS.md` measures ≤ 14,000 B after its promoted-skill tables and cross-platform shell/encoding block move to on-demand companions.
- AC3: Each of the six mandatory enhancing skills (`ws-karpathy-guidelines`, `ws-senior-developer`, `ws-tdah`, `ws-self-learning`, `ws-patterns-frontend`, `ws-patterns-backend`) exposes a `## Subagent contract` section of ≤ 40 lines that is the only part a dispatched subagent must read.
- AC4: `ws-spec-to-pr/PROTOCOLS.md` Base Prompt Prefix contains no `read full` instruction and instead names the skill body plus an explicit list of required sections.
- AC5: The Base Prompt Prefix no longer instructs reading the `MEMORY.md` index; the orchestrator runs the path-scoped memory query and injects a slice of ≤ 4,000 B into the dispatch prompt.
- AC6: A test asserts the fixed per-subagent preamble byte sum is ≤ 18,000 B, measured from the files the prefix names.
- AC7: The score-gate table, the delivery+ship five-option list, the fix→re-review case table, and the phase-model paragraph each exist verbatim in exactly one file, with all other locations linking to it.
- AC8: `ws-check-harness` gains a duplication detector that fails when a normative block of ≥ 6 lines appears verbatim in more than one tracked file outside a declared allowlist.
- AC9: The `read-artifacts-registry` tool alias resolves an artifact path from a single `## Artifact map` table, and no skill instructs reading `ARTIFACTS.md` in full.
- AC10: The `**Entry check:**` sentence exists in exactly one file, with every other skill pointing to it by link.
- AC11: `config.json` gains `defaults.contextBudget` (bytes per dispatch) and `ws-check-harness` reports per-skill and per-dispatch budget usage, failing above the configured value.
- AC12: A repeatable measurement script reports total harness bytes for a simulated standard run, and that total is ≥ 45% below the 962,298 B baseline.
- AC13: When `defaults.enableDag` is `false`, Step 3 is not dispatched to a subagent; the orchestrator writes the sequential `exec.dag.json` stub itself and records Step 3 as skipped with reason code `dag-disabled`.
- AC14: When `step-02-{slug}.plan.refined.md` exists it is the single plan of record, `step-01` is stamped `superseded: true` in frontmatter, and no downstream step reads `step-01`.
- AC15: The planning phase emits `{us-dir}/plan.index.json` mapping each AC id to plan sections, task ids, expected files, and expected test names.
- AC16: Steps 3–7 resolve plan content through `plan.index.json` section offsets rather than reading the whole plan, and `ARTIFACTS.md` documents that read contract.
- AC17: The state writer emits a `## Step outputs (compact)` block, and subagent prompts read that block plus at most the two most recent full step outputs.
- AC18: A repeatable measurement reports artifact re-read bytes for a simulated run at ≥ 40% below the 368,038 B baseline.
- AC19: `{plansDir}/index.json` is maintained on every state write, and bootstrap workflow discovery performs one read of it instead of one read per `*.state.md`, proven by a test fixture with ≥ 20 state files.
- AC20: `config.json` gains `defaults.convergence` with `initialDelaySec`, `minPollSec`, `maxPollSec`, `backoff`, and `maxIterations`, and every fix-PR timer reads from it instead of a hardcoded constant.
- AC21: `ws-goal-fix-pr` exits without arming the heartbeat when a fresh provider read shows zero active threads and every required check has concluded successfully.
- AC22: Poll intervals adapt to CI state (running checks poll at `minPollSec`, queued or absent runs poll at `maxPollSec`), and each round log records the observed state and the chosen interval.
- AC23: `defaults.parallelVerifyReview` (default `false`) allows Steps 5 and 6 to run as two concurrent read-only subagents that are forbidden from writing product files, with deterministic merge of their findings.
- AC24: `defaults.gateGranularity` accepts `step` or `phase`; in `phase` mode a default non-auto standard run presents at most 5 blocking gates (entry, plan approval, implementation approval, delivery, fix-PR).
- AC25: Stack auto-detection stores a fingerprint in `STACK.md` frontmatter and bootstrap skips re-detection when the fingerprint still matches.
- AC26: A pipeline simulation reports total mandatory sleep seconds and the count of blocking gates for standard and lite, and both values are asserted in tests.
- AC27: A new `validate_spec` script validates required frontmatter keys, contiguous `AC{N}` numbering, one line per AC, `### Prior Work Sweep` presence when `source` is a tracker, and `### Design Intent` presence for modification specs, exiting non-zero on any failure.
- AC28: The spec validator flags composite ACs using a published heuristic (more than one bolded component, more than one conjunction-joined imperative, or more than 60 words) and names each offending AC id.
- AC29: Step 0 runs `validate_spec` fail-closed, and `ws-write-spec` runs it before finishing and iterates until it exits zero.
- AC30: `npm run test` includes a spec-lint test that runs `validate_spec` over pass and fail fixtures.
- AC31: `{us-dir}/ac-ledger.json` is created at Step 0 with one row per AC carrying `id`, `text`, `status`, `evidence`, `tasks`, `files`, `tests`.
- AC32: An `ac_ledger` script exposes `init`, `link`, `verify`, `score`, and `report` subcommands and is the only writer of the ledger.
- AC33: Step 4 links touched files and commit SHAs per AC, Step 7 links test names per AC, and Steps 5 and 6 link verdicts with `file:line` evidence, all through `ac_ledger link`.
- AC34: `validate_state --pre-advance` exits non-zero when an AC lacks the linkage required at that step boundary.
- AC35: The verification score is computed by `ac_ledger score` from the ledger contents, and `ws-verify-plan` no longer authors a free integer.
- AC36: A published rubric defines 10/10 as requiring, simultaneously, every AC `Implemented` with at least one `file:line` evidence entry, at least one mapped test per AC, exit code 0 from every non-empty `verification.*` alias, and zero open Critical or Warning review findings.
- AC37: `ac_ledger score` returns below 9 when the report declares an unfixed gap or when any Warning-or-higher finding is open, making "score 9 with known defects" unreachable.
- AC38: `update_state --verification-score` rejects a value that disagrees with the ledger-computed score.
- AC39: Each code-review round persists as `step-06-{slug}.review.r{N}.md`, and the canonical `step-06-{slug}.review.md` mirrors the latest round without destroying prior rounds.
- AC40: `ws-code-review` severity rules state that a finding proving an assertion, test, or gate is ineffective is at minimum Warning, never Suggestion.
- AC41: `run_sabotage` rejects an invert patch that changes no bytes of a tracked file listed in `--paths`, and rejects a `--test` command that is not one of the configured `verification.*` aliases.
- AC42: The sabotage outcome recorded in the ledger comes from the script exit code, and any `Status:` line in a step report is rendered from that value rather than authored.
- AC43: Every entry in `skippedSteps` carries a reason code from a closed enum, and `validate_state` rejects entries without one.
- AC44: Skip reason codes appear in the step telemetry record and in the `step-08` delivery result.
- AC45: Step 7 auto-skip requires a machine probe (no non-empty test alias and no file matching the configured test globs); agent judgment alone cannot trigger it.
- AC46: `fable.auditVerdictsBlockShip` accepts `false`, `"refuted"`, or `"caveats"`, and a `VERIFIED WITH CAVEATS` verdict blocks ship when set to `"caveats"`.
- AC47: Every `dryRun` soft-pass emits a `gate-bypass` telemetry record naming the check it relaxed.
- AC48: The orchestrator records `dispatchedAt` before dispatch and `finishedAt` after completion, the script computes `elapsedSec` from that pair, and `estimated: true` appears only when a timestamp is missing.
- AC49: The telemetry record gains `workflowId`, `pipeline`, `packageVersion`, `retries`, `reviewRounds`, `refineRounds`, `skipReason`, `acTotal`, and `acImplemented`, with the schema asserted in tests.
- AC50: `ws-audit` `finalize` writes its error, unusual, and suggestion counts into the run telemetry summary keyed by `workflowId`.
- AC51: `aggregate.json` gains a `runs[]` array keyed by `workflowId` plus per-pipeline medians, and `workflow-skills telemetry report` renders a markdown summary from it.
- AC52: At least one skill consumes the aggregate at runtime, and the orchestrator progress board shows per-step estimated remaining time sourced from the stored medians.
- AC53: `npm run test` and CI run `check_workflows.py`, and `test-cleanup-workflow-git.js` is added to the test chain.
- AC54: A published JSON Schema for `evals/evals.json` exists, and CI validates every skill's eval file against it.
- AC55: `ws-doctor --json` output and harness audit results persist as dated artifacts under a configured directory so two runs can be compared.
- AC56: `ws-classify-complexity` emits an execution profile containing `pipeline`, `execMode`, `runInterview`, `runTesting`, and `estimatedElapsedSec`, each with a reason string.
- AC57: The orchestrator classifier gate presents the whole execution profile for confirmation rather than only lite-versus-standard.
- AC58: The prior-work sweep also searches completed local plan history for a matching slug or keywords and surfaces those artifacts in Step 0.
- AC59: A High or Critical MEMORY trap matching the plan's touched paths forces Step 2 interview on, overriding the conditional-skip rule.
- AC60: `gateDecision` is emitted as a structured object with `gate`, `choice`, `reason`, and `round`, and a schema test rejects free-form strings.
- AC61: The progress board renders the remaining-time estimate for every not-yet-run step from the metric store.
- AC62: Every step artifact carries frontmatter with `step`, `slug`, `workflowId`, `status`, `startedAt`, `endedAt`, and `acRefs`, including the Step 7 and Step 8 artifacts that have none today.
- AC63: `validate_state` verifies required frontmatter keys in each step artifact instead of only verifying file existence.
- AC64: `{us-dir}/run.json` is written on every transition with current step, pending gate, per-AC status, and next action, and `RUN.md` is rendered from it.
- AC65: The progress board is rendered deterministically from `run.json` so two runs at the same state produce identical board text.
- AC66: `ARTIFACTS.md` documents a fixed, closed file list for `{us-dir}/.runtime/`.
- AC67: `update_state` and `validate_state` ship as `.cjs` and are the versions both orchestrators invoke, with a test running a full state lifecycle with Python absent from `PATH`.
- AC68: `register_local_spec`, `detect_specs_dir`, and `self_learning` have Node equivalents so Step 0 and memory compile complete without Python.
- AC69: `register_local_spec`, `comment_issue`, `sweep_prior_work`, and `run_sabotage` import the shared consumer-root resolver, and a test fails when a local `resolve_repo_root` reimplementation reappears.
- AC70: No skill references a consumer-owned runtime data file through a relative `../ws-shared/` path, enforced by a `ws-doctor` or `ws-check-harness` check.
- AC71: The bootstrap banner prints the resolved `{skillsRoot}`, `{sharedDir}`, `{globalSkillsRoot}`, and which config file won.
- AC72: `ws-doctor` reports, per skill, whether it resolved from the project tree or the global tree.
- AC73: `tools.md` describes subagent model parameterization without naming any host or IDE product.
- AC74: `__pycache__` is excluded from the packaged tree and the integrity manifest, asserted by a test over the built tarball.
- AC75: Root `AGENTS.md` § Harness change protocol and the upstream ship checklist list `FEATURES.md` as a mandatory sync target.
- AC76: CI verifies that `FEATURES.md` and `docs/index.html` contain no merge-conflict markers and that the catalog rebuild produces no diff.

## Original Issue Context

Free-text request from the maintainer (2026-08-21):

> read FEATURES.md file and for each feature enumerated, check for possible improvements goaling to:
> - increase overall delivery execution speed - start spec to ship/pr
> - reducing token consumption
> - optimize context for subagents
> - intelligence increasing for orchestrator
> - quality gates
> - communication and output information / states / files
> - collecting auditing for diagnostic
> - make agents working to score 10/10 over specs ingested
> - keep portable, maintainable, standardized, agent agnostic
> - hybrid mode enhancements
>
> produce a full detailed spec to implement later. I will review it and decide what will be executed.

### Design Intent

Modification spec over an existing, working harness. The design intent behind the current behavior, and what this spec changes:

**Why the preamble is large today.** `PROTOCOLS.md` L306-326 was written to guarantee that a fresh subagent never skips scope discipline, memory consult, or pattern consult — a real defect class that 0.3.24 hardened by requiring *proof* of consult. The intent stays; only the delivery mechanism changes. Replacing "read six full skills" with "read six `## Subagent contract` sections" preserves one source of truth per skill and does not create a second SoT — a constraint recorded in MEMORY (`2026-08-12 Upstream dogfood harness must live outside .agents/skills/`), which forbids verbatim concatenation of live skill bodies into a new file.

**Why the score is agent-authored today.** `ws-verify-plan` was designed as an LLM judgment because spec compliance is semantic. The hermes run shows the failure mode: score 9 was published alongside a self-declared list of "gaps that keep the score at 9", and the very next step reclassified two of those gaps as blocking Warnings. Separately, the Step 5 report recorded sabotage `Status: pass` in the same document whose Reason field says the invert aborted. The judgment stays with the LLM at the level of *per-AC verdict plus evidence*; the *aggregation into a number and the threshold decision* move to a script reading a ledger, so a known defect cannot coexist with a passing score.

**Why the fix-PR loop sleeps unconditionally.** `GOAL-OVERRIDES.md` L28-35 explicitly blacklists "no comments yet — skip the wait" as an invalid rationalization, because agents were exiting before CI had reported. That protection must survive. The change is not "skip the wait" but "make the wait state-driven": poll fast while checks are running, exit only on a *fresh* read showing zero threads and all required checks concluded. The forbidden shortcut (assuming, not reading) remains forbidden.

**Why Step 3 exists even when disabled.** `enableDag: false` became the default to force sequential execution, but the step was left dispatched so the artifact registry stayed uniform. The artifact can be written by the orchestrator directly; uniformity is preserved and one full subagent dispatch is removed.

**Why telemetry is self-reported.** `elapsedSec` was added as a cheap first pass. It is now demonstrably wrong (`dispatchedAt == finishedAt` on all 10 hermes steps; Step 6 declares 1,500 s inside a 200 s wall-clock window). Any speed work is unmeasurable until the orchestrator stamps both ends.

**What must not change.** The REFUTED ship block is the only bypass-proof gate in the harness (`gates.md` L250-255) and stays exactly as is. Fail-closed behavior of every existing gate is preserved or tightened, never loosened. Portability rules from root `AGENTS.md` § Portability & harness neutrality apply to every new file, script, and config key introduced here.

## Child Tasks

Selection surface. Each workstream is independently shippable; the dependency column names the only hard ordering constraints.

### Task W1 — Context budget and progressive disclosure

- **Status:** proposed
- **ACs:** AC1–AC12
- **Goals:** token reduction, subagent context, portability
- **Impact:** targets the 585,673 B of repeated preamble (61% of run text) and the 84,438 B always-applied block
- **Effort:** medium — mostly doc surgery plus one measurement script and one harness check
- **Depends on:** none
- **Risk:** moving normative text can orphan links; AC8 duplication detector and `ws-check-harness` Phase 2 mitigate

### Task W2 — Artifact economy

- **Status:** proposed
- **ACs:** AC13–AC18
- **Goals:** speed, token reduction, subagent context
- **Impact:** removes one full dispatch (90–180 s), retires a 26,343 B orphan artifact, and cuts the 150,720 B of repeated `step-02` reads
- **Effort:** medium — `plan.index.json` is a new contract touching Steps 1–7
- **Depends on:** none; AC15 is the input to W4's ledger and should land first if both are selected

### Task W3 — Latency and human-blocking reduction

- **Status:** proposed
- **ACs:** AC19–AC26
- **Goals:** speed
- **Impact:** attacks the 42% of accounted time spent after code is written, the 330 s floor on clean PRs, the ≥ 18 blocking gates, and the N-file bootstrap scan
- **Effort:** medium-high — AC23 (parallel verify+review) is the riskiest item and can be deselected on its own
- **Depends on:** W6 AC48 for honest before/after measurement

### Task W4 — AC traceability and a real 10/10

- **Status:** proposed
- **ACs:** AC27–AC42
- **Goals:** quality gates, 10/10 over ingested specs
- **Impact:** the largest correctness change in this spec; converts the score from an assertion into a derivation
- **Effort:** high — two new scripts (`validate_spec`, `ac_ledger`), changes in Steps 0/1/3/4/5/6/7, and `validate_state` integration
- **Depends on:** W2 AC15 (`plan.index.json`) if selected; otherwise the ledger carries the mapping alone
- **Risk:** over-strict AC linting could reject legitimate specs; AC28 heuristics must be published and tunable

### Task W5 — Escape-hatch accounting

- **Status:** proposed
- **ACs:** AC43–AC47
- **Goals:** quality gates, auditing
- **Impact:** closes the self-written `skippedSteps` hole and the silent `dryRun` soft-pass
- **Effort:** low
- **Depends on:** none

### Task W6 — Telemetry, auditing, and diagnostics

- **Status:** proposed
- **ACs:** AC48–AC55
- **Goals:** auditing, orchestrator intelligence
- **Impact:** makes every other workstream measurable; today no speed claim can be verified
- **Effort:** medium
- **Depends on:** none — recommended first if any speed work is selected

### Task W7 — Orchestrator intelligence

- **Status:** proposed
- **ACs:** AC56–AC61
- **Goals:** orchestrator intelligence, speed
- **Impact:** turns the classifier into a planner and feeds historical medians back into routing and estimates
- **Effort:** medium
- **Depends on:** W6 (needs a metric store worth reading)

### Task W8 — Communication, output, and state files

- **Status:** proposed
- **ACs:** AC62–AC66
- **Goals:** communication and output information
- **Impact:** uniform frontmatter, one live `run.json`, deterministic board, closed `.runtime/` contract
- **Effort:** low-medium
- **Depends on:** none

### Task W9 — Portability, hybrid mode, standardization

- **Status:** proposed
- **ACs:** AC67–AC74
- **Goals:** portable/maintainable/standardized/agent-agnostic, hybrid mode
- **Impact:** removes the Python hard dependency from the orchestrator state machine, ends resolver drift, and makes hybrid resolution visible
- **Effort:** high — AC67 and AC68 are ports of `update_state.py` (27,047 B) and `validate_state.py` (25,913 B)
- **Depends on:** none; AC69, AC70, AC71, AC72, AC73, AC74 are cheap and can ship without the ports

### Task W10 — Documentation and inventory sync

- **Status:** proposed
- **ACs:** AC75–AC76
- **Goals:** maintainability, standardization
- **Impact:** `FEATURES.md` is currently outside the mandatory sync rule and will drift after any of W1–W9
- **Effort:** low
- **Depends on:** should ship with whatever else is selected

### Suggested phasing if partial execution is chosen

| Phase | Tasks | Rationale |
|---|---|---|
| 1 | W6, W5, W10, plus AC69/AC70/AC71/AC72/AC73/AC74 from W9 | Cheap, low-risk, and W6 makes the rest measurable |
| 2 | W1, W2, W3 | Token and latency wins, verified against the Phase 1 instrumentation |
| 3 | W4 | Largest behavior change; benefits from the `plan.index.json` contract landed in W2 |
| 4 | W7, W9 ports (AC67, AC68) | Depend on a populated metric store and a stable script surface |

## Notes

### Out of scope

- Changing the REFUTED ship block, the HS-1..HS-5 hard stops, or the `{plansDir}`-only-at-Step-8 commit rule.
- Replacing the FSM with a different orchestration model, or introducing an external runtime, daemon, or service.
- Adding runtime npm dependencies; the zero-dependency CLI guarantee in `FEATURES.md` § 11 holds.
- Rewriting `ws-check-harness` `PHASES.md` (54,198 B) beyond adding the checks named in AC8 and AC11.
- Any host-specific integration, marketplace manifest, or IDE adapter.
- Migration shims or legacy path aliases; root `AGENTS.md` § Portability forbids compatibility maintenance.
- Retroactive backfill of `aggregate.json` from historical runs; AC51 applies to new runs onward.

### Verification for this work

Every selected workstream must, before claim complete:

1. `npm run test` exits 0 (`pretests` packs the real tarball).
2. `npm run generate-integrity && npm run verify-integrity` exit 0 when hashed content changed.
3. `ws-check-harness` Phases 0–5c report zero critical findings.
4. `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` exits 0 with zero critical findings.
5. `node bin/build-site.js` (or `npm run build-site:bump` when shipping package content) regenerates the catalog without conflict markers.
6. New scripts ship with a dedicated `test/test-*.js` added to the `tests` chain in `package.json`.

### Constraints inherited from the harness

- New managed scripts are Node `.cjs`; existing `.py` helpers are frozen except for bug fixes and the explicit ports in AC67 and AC68.
- New config keys must appear in `config.json.example`, `config.schema.json`, and the `ws-configure-project` interview, and must default to current behavior.
- Every new artifact path resolves through path tokens (`{plansDir}`, `{sharedDir}`, `{specsDir}`, `{us-dir}`); no hardcoded consumer paths.
- Skill bodies, gates, and banners stay en-us.
- Scripts pass `encoding="utf-8"` explicitly and avoid non-ASCII stdout, per the cross-platform rules.

### Known traps to honor (from `{sharedDir}/MEMORY.md`)

- A missing `MEMORY.md` must never hard-stop the pipeline; AC5 must degrade to an empty slice, not an error.
- `stamp_state_version` must always emit the schema version and clamp unknown highs; the AC67 port must preserve that behavior and the `format_inline_dict` handling of nested telemetry maps.
- Audit and state JSON must persist posix repo-relative paths; AC49, AC51, and AC64 must not write absolute or drive-lettered paths.
- Never `git add -A`; AC13 and AC64 add new files under `{us-dir}` that must stay out of product commits until the delivery commit.
- Scripts must resolve the consumer root through the shared resolver, never through a `parents[N]` chain, in hybrid and global installs.

### Open questions for the maintainer

1. Which workstreams are in scope for the first delivery? (`## Child Tasks` is the selection surface.)
2. AC24 `gateGranularity: phase` reduces human checkpoints from ~18 to 5 — acceptable, or should the plan-approval gate stay per-step?
3. AC35 removes the agent's ability to author the score directly. Should there be an explicit, telemetered override for cases where the ledger is provably wrong, or should it be strictly non-overridable?
4. AC46 defaults: keep `auditVerdictsBlockShip: "refuted"` as today, or move this repo's own config to `"caveats"` as dogfood?
5. AC67 and AC68 port the orchestrator state machine to Node. Confirm that Python remains supported for the frozen helpers rather than being removed outright.
