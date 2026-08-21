---
slug: harness-efficiency-and-verifiability
title: "Harness efficiency, verifiability, and observability upgrade"
status: "plan to be refined"
workflowId: harness-efficiency-and-verifiability-20260821T195820Z
planningBaseline: 8dfac87ba1e2e6f5c9cea6932e8cf51a812924ff
---

## 0. Summary & Business Rules

Implement all W1-W10 as one dependency-ordered standard-pipeline change. The delivery first establishes a shared Node state/runtime foundation, then adds compact artifact contracts and AC traceability, then reduces context and latency, and only after trustworthy telemetry exists feeds historical data back into classifier and progress decisions.

Binding decisions:

1. All W1-W10 and AC1-AC76 are in scope.
2. `defaults.gateGranularity` defaults to `"step"`; `"phase"` is supported and is capped at five blocking gates for a normal standard run.
3. Verification score is derived only by `ac_ledger.cjs`; it has no override path. `update_state --verification-score` is an assertion against the ledger-derived value, never a source.
4. Packaged `config.json.example` defaults `fable.auditVerdictsBlockShip` to `"refuted"`. This repository's consumer-only `.agents/skills/ws-shared/config.json` is normalized from legacy `true` to `"refuted"`, preserving its existing REFUTED-only behavior; it is never packaged or staged.
5. A known `REFUTED` verdict always hard-stops delivery, including when the configured value is `false` or quality gates are bypassed. `"caveats"` additionally blocks `VERIFIED WITH CAVEATS`.
6. Existing Python helpers remain present and supported. The required `.cjs` ports become the only standard/lite orchestrator call surface. Existing `.py` files are frozen except the resolver/sabotage safety fixes explicitly required by AC41/AC69.
7. `update_state.cjs` always stamps the single supported `stateVersion`; `validate_state.cjs` rejects missing, old, or unknown versions. Nested telemetry maps must round-trip as maps.
8. Runtime JSON paths are POSIX repo-relative. Absolute drive paths may exist only transiently for filesystem I/O and never on disk.
9. Shared consumer-root resolvers are mandatory. Hybrid scripts must not derive consumer `ws-shared` from `__file__`, `__dirname`, or `parents[N]`.
10. Missing `MEMORY.md` produces an empty injected slice and advisory `consult-skipped`, never HS-5.
11. Build-site rewrites preserve LF frontmatter and do not accumulate CRLF blank lines.
12. Sabotage restore proof compares only the byte snapshots named by `--paths`; no whole-tree HEAD cleanliness assertion is allowed.
13. No new runtime npm dependency, daemon, external service, host-specific adapter, compatibility alias, extra dogfood `SKILL.md`, or `.agents/dev-harness/`.
14. Skill/harness prose remains en-us and uses portable capability vocabulary.

Current-run delivery constraint:

- This workflow may modify only this Step 1 artifact now. Later Step 4 may implement product files and run safe local tests, but this run must never checkout, stage, commit, push, reset, clean, create a PR, or mutate an external service.
- `defaults.parallelVerifyReview` remains `false` for this run. Therefore the existing standard G2-code gate remains after Step 5 and before Step 6. Once implementation and read-only verification have completed, the non-empty product stage set makes G2-code a mandatory hard stop because commits are prohibited. No `dryRun`, `skipQualityGates`, or score path may bypass it.

## 1. Definition of Ready & Scope

### Ready evidence

- Canonical spec: `.agents/plans/harness-efficiency-and-verifiability/step-00-harness-efficiency-and-verifiability.spec.md`
- Classification: standard, all W1-W10 selected.
- Stack: Node 22 / zero-runtime-dependency skill package; layers are `.agents/skills`, `bin`, and `test`.
- Baseline workflow: `hermes-spec-to-pr-enhancements`; prior contracts reused from `continuous-ai-verification-quality-gates`, `enable-auditing`, `us-202`, `check-harness-upstream-sot`, `autoload-skills-overlap-audit`, and `deepseek-harness-improvements`.
- Design-intent history inspected for Base Prompt Prefix, score, DAG disablement, audit verdict blocking, resolver drift, skipped steps, and aggregate telemetry. Preserve the reasons for full fresh-agent context, state-driven PR convergence, strict score gating, and REFUTED hard stops while changing their implementation.

### Scope boundaries

In scope:

- Root/hub progressive disclosure, shared normative homes, context budgeting, deterministic measurements.
- Standard and lite orchestration contracts, state/runtime artifacts, Step 0-9 skill integration.
- Spec validation, plan index, AC ledger, machine-derived scoring, review rounds, sabotage hardening.
- Adaptive convergence, phase gates, test-surface probing, classifier execution profiles.
- Telemetry schema, aggregate medians, diagnostics persistence, progress estimates.
- Node orchestrator/helper ports, shared resolver adoption, hybrid observability.
- Package/CI/eval/site/docs/integrity synchronization.

Out of scope:

- Changing the FSM step count, removing Python files, adding dependencies, external runtimes, migration shims, host integrations, live SCM calls, or weakening any HS/G2/REFUTED hard stop.
- Replacing consumer-owned `.agents/plans/telemetry/aggregate.json`, MEMORY, CHANGELOG, source specs, reviews, or historical workflow artifacts.

### Pre-existing dirty isolation

The workflow state records `baselineCommit: 8dfac87ba1e2e6f5c9cea6932e8cf51a812924ff` and the authoritative `preExistingDirty` set. Treat every listed path as immutable unless explicitly named below.

Protected paths that implementation must not rewrite:

- `.agents/plans/telemetry/aggregate.json`
- `.agents/skills/ws-shared/MEMORY.md`
- `.agents/skills/ws-shared/CHANGELOG.md`
- `.agents/skills/ws-shared/memory/2026-08-21-sabotage-restore-paths.md`
- `.agents/codereviews/**`
- `.agents/plans/hermes-spec-to-pr-enhancements/**`
- `.agents/plans/us-217/.runtime/**`
- `.agents/specs/harness-efficiency-and-verifiability.spec.md`
- `.agents/plans/harness-efficiency-and-verifiability/step-00-harness-efficiency-and-verifiability.spec.md`
- `.gitignore` except a surgical `__pycache__` rule merge if still required after re-reading its current bytes.

`FEATURES.md` is the only approved pre-existing dirty merge target. Its planning-baseline blob is `b4db8c696a6ac96647197c0dfb023ec242c1d80e`. Before editing, re-read it and compare that hash. If it changed, adopt the newer bytes as the merge base. Apply section-level edits only; preserve all current headings, catalog rows, and narrative not contradicted by AC1-AC76. Never replace the file wholesale.

Other protected planning hashes:

- MEMORY: `c29742c713d926d9326f42fa8a29a85d442f501f`
- CHANGELOG: `e116729dec33be3fa938066a99cc5985383064d9`
- spec of record: `97ebdd61cfcb8687c2b0f993c4ca56db0fde99dc`
- workflow Step 0 spec: `beb8f12fdea91ad7af5f5f2c322afe8847e82faa`

At implementation start and after each batch:

1. Capture `git status --short --untracked-files=all` and path hashes without writing a scratch artifact.
2. Record only newly changed planned paths in `workflowManifest`; never infer this run's files from the whole dirty tree.
3. Compare each batch with path-scoped `git diff -- <batch-paths>` and `git status --short -- <batch-paths>`.
4. For `FEATURES.md`, compare against the adopted pre-edit hash and prove untouched sections remain.
5. For sabotage, compare only `--paths` byte snapshots. Never use a whole-tree HEAD comparison.
6. Never run broad staging. This run performs no staging or commits at all.

## 2. Technical Design & Architecture

### Shared Node runtime core

Add `.agents/skills/ws-shared/scripts/workflow_state.cjs` as the one parser/serializer/schema utility used by four thin entrypoints:

- `.agents/skills/ws-spec-to-pr/scripts/update_state.cjs`
- `.agents/skills/ws-spec-to-pr/scripts/validate_state.cjs`
- `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs`
- `.agents/skills/ws-spec-to-pr-lite/scripts/validate_state.cjs`

The core receives `pipeline: standard|lite`, owns the supported state version, preserves nested mappings, emits LF UTF-8, normalizes repo-relative POSIX paths, and writes state/run/index atomically. Standard and lite wrappers contain only argument parsing/default step rules. The existing `.py` files remain on disk and retain their current supported behavior, but orchestration docs and recipes invoke only `node .../*.cjs`.

Published machine contracts live in the shared hub:

- `.agents/skills/ws-shared/workflow-state.schema.json`
- `.agents/skills/ws-shared/telemetry.schema.json`
- `.agents/skills/ws-shared/run.schema.json`
- `.agents/skills/ws-shared/evals.schema.json`

No schema library is added; scripts perform deterministic validation and tests validate the JSON Schema documents and fixtures.

### Artifact and context economy

Add:

- `.agents/skills/ws-spec-to-pr/scripts/build_dispatch_context.cjs`: extracts named skill sections, state compact output, at most two recent full outputs, stack context, plan-index slices, and a path-scoped MEMORY slice capped at 4,000 bytes. It fails before dispatch when `defaults.contextBudget` is exceeded.
- `.agents/skills/ws-spec-to-pr/scripts/plan_index.cjs`: creates/updates `{us-dir}/plan.index.json`, stamps `step-01` as `superseded: true` when Step 2 exists, and records UTF-8 byte offsets, line ranges, content hash, AC-to-section/task/file/test links.
- `.agents/skills/ws-spec-to-pr/scripts/write_sequential_dag.cjs`: writes the closed sequential DAG stub when DAG is disabled without a Step 3 subagent.
- `.agents/skills/ws-check-harness/scripts/measure_harness.cjs`: repeatable standard/lite context, artifact-read, sleep, and gate simulation.
- `.agents/skills/ws-check-harness/scripts/check_duplicates.cjs` plus `references/duplicate-allowlist.json`: tracked-file normative duplicate detector.

`ARTIFACTS.md` gains one `## Artifact map` table containing filename, producer, reader, frontmatter/schema, committability, and section-read contract. Callers link to a row/anchor; no caller reads the whole file.

### AC ledger and derived score

Add `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` with `init`, `link`, `verify`, `score`, and `report`. It is the only writer of `{us-dir}/ac-ledger.json`.

- `init`: reads validated contiguous ACs from Step 0.
- `link`: adds plan/task/file/test/commit/verdict/sabotage evidence with step ownership.
- `verify`: enforces boundary-specific linkage.
- `score`: derives `floor(10 * fullySatisfiedACs / acTotal)` and caps at 8 whenever any AC is not Implemented, file:line evidence is absent, mapped tests are absent, a non-empty verification alias failed, sabotage failed, or an open Warning/Critical exists. Thus a known gap can never yield 9.
- `report`: renders score/status text from ledger data; reports do not author status lines.

The 10/10 rubric is published once in `.agents/skills/ws-verify-plan/RUBRIC.md`. Semantic AC verdicts remain agent judgments, but numeric aggregation and threshold decisions are deterministic and non-overridable.

Step 4 links files/tasks immediately. Because the standard commit occurs only after Step 5, the orchestrator completes the Step 4-owned commit linkage immediately after G2-code. In this no-commit run that linkage remains pending and causes the expected G2 hard stop before Step 6.

### State, telemetry, and deterministic board

Each dispatch is two events: `dispatch` records `dispatchedAt` before the subagent call; `finish` records `finishedAt` after return and computes `elapsedSec`. `estimated: true` is emitted only when one timestamp is missing.

Every state transition atomically updates:

- `{workflow-id}.state.md`
- `{plansDir}/index.json`
- `{us-dir}/run.json`
- `{us-dir}/RUN.md`
- per-step telemetry JSONL

`RUN.md` and the chat progress board use the same pure renderer over `run.json`; timestamps are data fields, not render-time values, so equal state yields byte-identical board text.

Markdown step artifacts carry `step`, `slug`, `workflowId`, `status`, `startedAt`, `endedAt`, and `acRefs`. JSON step artifacts carry the same values in a top-level `_meta` object because JSON cannot contain YAML frontmatter.

Closed `{us-dir}/.runtime/` files:

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

Any additional runtime filename fails validation until added to the closed map.

### Configuration additions

Ship all new keys in `config.json.example`, `config.schema.json`, `config-resolution.md`, and `ws-configure-project/INTERVIEW.md`:

- `defaults.contextBudget: 18000`
- `defaults.convergence: { initialDelaySec: 30, minPollSec: 30, maxPollSec: 300, backoff: 2, maxIterations: 10 }`
- `defaults.parallelVerifyReview: false`
- `defaults.gateGranularity: "step"`
- `verification.testGlobs: ["test/**", "tests/**", "**/*.test.*", "**/*.spec.*"]`
- `diagnostics.dir: ".agents/diagnostics"`
- `fable.auditVerdictsBlockShip: "refuted"`

The repository-local consumer config is normalized to `"refuted"` as non-packaged dogfood data, preserving its legacy `true` behavior, and is excluded from product staging.

### Diagnostics, classifier, and historical estimates

`bin/generate-telemetry-aggregate.cjs` writes `runs[]` keyed by `workflowId`, per-pipeline/per-step medians, audit counts, and existing summary fields. It never rewrites the pre-existing dirty aggregate during tests; tests use temporary plans directories.

`workflow-skills telemetry report` renders markdown from the aggregate. `ws-classify-complexity/scripts/classify.cjs` emits an execution profile with value and reason for `pipeline`, `execMode`, `runInterview`, `runTesting`, and `estimatedElapsedSec`. The progress renderer uses stored per-step medians for every pending step.

`ws-doctor --json --output <path>` and `ws-check-harness` report persistence are opt-in writes under `diagnostics.dir`; default doctor invocation remains read-only.

### DevOps evidence

CI changes are limited to `.github/workflows/ci.yml`. Verification is observed through local script/test exits; no deployment, secret, permission, or live-service operation is part of this work. Never suppress a failing exit with `|| true`.

## 3. Step-by-Step Plan

### Batch B0 — Freeze scope and dirty baseline

ACs: supporting all.

- Re-read current target files and preserve the `preExistingDirty` registry and hashes from §1.
- Confirm only local `.agents/skills/ws-*` is edited; do not read or write any global copy.
- Establish the planned-path allowlist from B1-B10. Refuse an unplanned path rather than broadening scope silently.
- Do not modify product files during Step 1.

Check: `git status --short --untracked-files=all`; no staging/commit command.

### Batch B1 — Shared resolver and Node orchestrator surface

ACs: AC67-AC73 foundation.

Files:

- Add `.agents/skills/ws-shared/scripts/workflow_state.cjs`.
- Add four standard/lite `.cjs` update/validate entrypoints.
- Add `.agents/skills/ws-local-spec-provider/scripts/register_local_spec.cjs`.
- Add `.agents/skills/ws-local-spec-provider/scripts/detect_specs_dir.cjs`.
- Add `.agents/skills/ws-self-learning/scripts/self_learning.cjs`.
- Keep the corresponding Python files.
- Replace orchestrator/provider/memory recipes in `ws-spec-to-pr/{SKILL.md,PROTOCOLS.md,STEP-DISPATCH.md}`, `ws-spec-to-pr-lite/SKILL.md`, `ws-local-spec-provider/{SKILL.md,INTENTS.md}`, `ws-self-learning/SKILL.md`, `ws-write-spec/SKILL.md`, and `ws-shared/tools.md`.
- Make `register_local_spec.py`, both provider `comment_issue.py` files, both provider `sweep_prior_work.py` files, and `run_sabotage.py` import `ws-shared/scripts/resolve_consumer_root.py`; remove local `resolve_repo_root`.
- Remove the runtime-data sibling fallback from `ws-spec-to-pr/scripts/check_memory_conflict.py`.
- Add per-skill project/global resolution to `ws-doctor/scripts/doctor.js`; add resolved roots/config winner to `ws-shared/setup.md` and standard/lite bootstrap banners.

Checks:

- `node --check` all new `.cjs`.
- `node test/test-node-helper-ports.js`.
- Full state lifecycle with `PATH` containing Node/Git but no Python.
- Existing Python helper smoke tests remain green.

### Batch B2 — State, run, telemetry, skip, and artifact schemas

ACs: AC17, AC19, AC43-AC50, AC60, AC62-AC66.

Files:

- Add the four shared JSON schemas from §2.
- Extend `workflow_state.cjs` with structured skip enum, dispatch/finish timestamps, telemetry fields, nested-map preservation, compact step outputs, plans index, `run.json`, and deterministic `RUN.md`.
- Update standard/lite wrappers and every call site in orchestration docs.
- Update `ARTIFACTS.md`, `protocols/{state-hygiene.md,progress-board.md,delivery-result.md,artifact-cleanup.md}`, `ws-goal-loop/{SKILL.md,TEMPLATES.md}`, and `ws-goal-fix-pr/SKILL.md`.
- Require metadata at producers: `ws-write-spec`, `ws-classify-complexity`, `ws-write-plan` template, `ws-interview`, `ws-plan-to-tasks`, `ws-verify-plan` template, `ws-code-review`, `ws-testing`, and `ws-ship-pr` delivery template.
- Add `ws-testing/scripts/probe_test_surface.cjs`; wire configured `verification.testGlobs`.
- Normalize fable block semantics in config/schema/resolution/gates/verify/ship/PREPARE while preserving unconditional known-REFUTED stop.
- Update `ws-audit/scripts/audit_log.js` finalize to emit error/unusual/suggestion counts into the workflow telemetry summary by `workflowId`.

Checks:

- `node test/test-state-observability.js`.
- Extend `test/test-update-state-yaml.js`, `test/test-quality-gates.js`, `test/test-ws-audit.js`, and `test/test-testing-executor-model.js`.

### Batch B3 — Plan of record and artifact economy

ACs: AC13-AC19.

Files:

- Add `plan_index.cjs` and `write_sequential_dag.cjs`.
- Update `ws-write-plan/SKILL.md` and template to provide AC/section/task/file/test data for the index.
- Update `ws-interview/SKILL.md` to mark Step 1 `superseded: true` and rebuild the index after Step 2.
- Update `ws-plan-to-tasks`, `ws-implement-tasks`, `ws-verify-plan`, `ws-code-review`, `ws-testing`, `STEP-DISPATCH.md`, and `PROTOCOLS.md` to resolve only indexed sections.
- Update `ARTIFACTS.md` artifact-map rows and downstream read contract.
- When DAG is disabled, let the orchestrator write the sequential stub, record Step 3 skipped with `dag-disabled`, and avoid dispatch.
- Add compact-output prompt selection to `build_dispatch_context.cjs`.
- Extend `measure_harness.cjs` with artifact-read accounting.

Checks:

- `node test/test-artifact-economy.js`.
- Extend `test/test-enable-dag.js` and `test/test-resume-gate.js`.

### Batch B4 — Spec validation, AC ledger, score, reviews, and sabotage

ACs: AC27-AC42.

Files:

- Add `.agents/skills/ws-spec-format/scripts/validate_spec.cjs`.
- Publish composite-AC heuristic and validation contract in `ws-spec-format/FORMAT.md` and `SKILL.md`.
- Add `ac_ledger.cjs` and register `ac-ledger.json` in `ARTIFACTS.md`.
- Add `.agents/skills/ws-verify-plan/RUBRIC.md`; make `ws-verify-plan` emit semantic verdict/evidence and obtain the number from the ledger.
- Wire Step 0 init and Steps 4/5/6/7 links through `STEP-DISPATCH.md`, `PROTOCOLS.md`, `ws-write-spec`, `ws-implement-tasks`, `ws-verify-plan`, `ws-code-review`, and `ws-testing`.
- Make pre-advance state validation call ledger `verify`.
- Add `.agents/skills/ws-code-review/scripts/persist_review_round.cjs`; preserve `.review.r{N}.md` and mirror latest to canonical.
- Raise ineffective assertion/test/gate findings to at least Warning in `ws-code-review/SKILL.md`.
- Fix `run_sabotage.py`: require a byte-changing patch on every tracked `--paths` target, allow only exact configured `verification.*` command values, emit machine JSON/exit status, restore path snapshots only.
- Render sabotage and report status from script/ledger data.

Checks:

- `node test/test-spec-lint.js`.
- `node test/test-ac-ledger.js`.
- Extend `test/test-hermes-spec-to-pr-enhancements.js`, `test/test-quality-gates.js`, and `test/test-provider-parity.js` only where existing contracts are affected.

### Batch B5 — Progressive disclosure and context budget

ACs: AC1-AC12.

Files:

- Move root skill catalog to new `CATALOG.md`; reduce root `AGENTS.md`; point task routing to the companion.
- Move shared promoted tables to `.agents/skills/ws-shared/CATALOG.md` and shell/encoding guidance to `.agents/skills/ws-shared/CROSS-PLATFORM.md`; reduce shared `AGENTS.md`.
- Add `## Subagent contract` sections to the six named enhancing skills, each at most 40 lines.
- Add `build_dispatch_context.cjs`, `measure_harness.cjs`, `check_duplicates.cjs`, and duplicate allowlist.
- Rewrite PROTOCOLS Base Prompt Prefix to request named sections, never full skill bodies or MEMORY index.
- Make `.agents/skills/ws-shared/config-resolution.md` the only file containing the canonical Entry check sentence. Replace the sentence in the exact 28 current SKILL files found by the planning scan with links to that anchor.
- Consolidate the score table/delivery list in `gates.md`, fix/re-review table in `ws-code-review/SKILL.md`, phase-model contract in `tools.md`; replace all other copies with links.
- Convert `tools.md` `read-artifacts-registry` to an Artifact-map row/section lookup.
- Update `ws-check-harness/{SKILL.md,PHASES.md}` to execute duplicate/budget checks.
- Update `package.json` to include root `CATALOG.md`; update `bin/build-site.js` to parse it.

Exact Entry-check replacement set:

`ws-patterns-frontend`, `ws-plan-to-tasks`, `ws-ship-pr`, `ws-update-plan-implementation`, `ws-github-provider`, `ws-verify-plan`, `ws-classify-complexity`, `ws-check-workflows`, `ws-multi-spec`, `ws-spec-index`, `ws-patterns-backend`, `ws-code-review`, `ws-self-learning`, `ws-interview`, `ws-changelog`, `ws-goal-fix-pr`, `ws-implement-tasks`, `ws-testing`, `ws-write-spec`, `ws-activity-report`, `ws-fix-pr`, `ws-preview`, `ws-spec-to-pr`, `ws-sync-spec`, `ws-spec-list`, `ws-azure-devops-provider`, `ws-local-spec-provider`, and `ws-write-plan`.

Checks:

- `node test/test-context-budget.js`.
- `node .agents/skills/ws-check-harness/scripts/measure_harness.cjs --scenario standard --json`.

### Batch B6 — Latency and gate reduction

ACs: AC20-AC26.

Files:

- Add config/schema/interview defaults for convergence, parallel verify/review, gate granularity, and test globs.
- Replace hardcoded waits in `ws-goal-fix-pr/SKILL.md`, `ws-ship-pr/{SKILL.md,GOAL-OVERRIDES.md,examples.md}`, `ws-spec-to-pr/{PROTOCOLS.md,STEP-DISPATCH.md}`, and goal examples with config links.
- Fresh provider read exits immediately only when zero threads and all required checks are concluded; otherwise choose `minPollSec` for running and `maxPollSec` for queued/absent, applying bounded backoff and logging observed state/interval.
- Implement opt-in `parallelVerifyReview`: run G2-code immediately after Step 4 for this mode, dispatch committed-diff Step 5 and Step 6 read-only in parallel, merge findings deterministically, then run fix/re-verify/re-review loops. Default false keeps current Step 5 then G2 then Step 6 order.
- Implement step/phase gate menus in `gates.md`, `setup.md`, standard/lite orchestration.
- Add `.agents/skills/ws-configure-project/scripts/stack_fingerprint.cjs`; stamp `STACK.md` frontmatter and skip detection on unchanged inputs.
- Extend measurement/simulation with blocking gate count and mandatory sleep.

Checks:

- `node test/test-convergence-gates.js`.
- `node test/test-stack-fingerprint.js`.
- `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`.

### Batch B7 — Aggregate telemetry, diagnostics, and runtime estimates

ACs: AC48-AC55 completion.

Files:

- Refactor `bin/generate-telemetry-aggregate.cjs` to use shared root/config resolution, `runs[]`, pipeline medians, audit counts, and POSIX relative paths.
- Add `telemetry report` in `bin/cli.js`; keep `telemetry aggregate`.
- Add `diagnostics.dir` config/schema/tools token and opt-in output handling in `ws-doctor/{SKILL.md,scripts/doctor.js}`.
- Add `.agents/skills/ws-check-harness/scripts/persist_report.cjs`; document dated harness reports.
- Update progress renderer to consume medians without mutating the pre-existing aggregate fixture.

Checks:

- `node test/test-telemetry-observability.js`.
- Extend `test/test-ws-doctor.js` and `test/test-ws-audit.js`.

### Batch B8 — Orchestrator execution profile and historical intelligence

ACs: AC56-AC61.

Files:

- Extend `ws-classify-complexity/{SKILL.md,scripts/classify.cjs,references/THRESHOLDS.md}` with execution profile values/reasons and aggregate-based estimate.
- Add `.agents/skills/ws-spec-to-pr/scripts/search_local_plan_history.cjs`; merge local completed-plan matches into Step 0 prior-work evidence without adding features to frozen provider Python.
- Extend `check_memory_conflict.py` output so High/Critical touched-path matches force `runInterview: true`.
- Update `STEP-DISPATCH.md`, `PROTOCOLS.md`, `gates.md`, `ws-write-spec/SKILL.md`, and progress board to confirm/render the full profile and remaining times.
- Emit structured `gateDecision` in state/telemetry; reject free-form strings.

Checks:

- `node test/test-orchestrator-intelligence.js`.
- Extend `test/test-quality-gates.js`, `test/test-pattern-consult.js`, and classifier evals.

### Batch B9 — Eval schema, package tree, CI, and test chain

ACs: AC30, AC53-AC54, AC67-AC76 test enforcement.

Files:

- Add `evals.schema.json` and `test/test-evals-schema.js`; validate all 44 current `evals/evals.json`.
- Add package scripts:
  - `test:context-budget`
  - `test:artifact-economy`
  - `test:convergence-gates`
  - `test:spec-lint`
  - `test:ac-ledger`
  - `test:state-observability`
  - `test:telemetry-observability`
  - `test:orchestrator-intelligence`
  - `test:node-helper-ports`
  - `test:stack-fingerprint`
  - `test:evals-schema`
  - `test:doc-sync`
  - `test:workflows`
  - `test:cleanup-workflow-git`
- Add every named command to `scripts.tests`; mirror source-compatible tests in `tests:remote`.
- Add `test/test-cleanup-workflow-git.js` to both applicable chains.
- Make `.github/workflows/ci.yml` run the package chain and explicit catalog `--check`.
- Remove tracked `__pycache__`/`*.py[cod]`; preserve/merge package exclusions and `.gitignore`; make integrity generation ignore them.
- Add built-tarball assertion to `test/test-install.js`.

Checks:

- Each named `npm run test:*`.
- `npm run tests -- --local`.

### Batch B10 — Docs, catalog, site, and integrity synchronization

ACs: AC1-AC2 docs, AC11/20/46/55/73/75/76 human and agent documentation.

Files:

- Update `README.md`, current `FEATURES.md` by merge, root `AGENTS.md`, root `CATALOG.md`, `ws-shared/{AGENTS.md,CATALOG.md,CROSS-PLATFORM.md,autoload.md,tools.md,config-resolution.md}`, and relevant workflow README/FAQ/DIAGRAM.
- Root Harness change protocol and upstream ship checklist explicitly name `FEATURES.md`.
- Update `bin/build-site.js` with `--check`, CATALOG input, LF-safe writes, and no conflict-marker tolerance; keep `bin/skill-frontmatter.js` LF-safe.
- Regenerate `docs/index.html` from the final docs.
- No new skill id is introduced, so dependency edges/package membership remain unchanged. At eventual release, `build-site:bump` updates `package.json`, all skill versions, `bin/skill-dependencies.json.packageVersion`, and the packaged shared copy.
- Regenerate `bin/skill-integrity.json` after all hashed content changes and verify it.

Checks:

- `node test/test-doc-sync.js`.
- `node bin/build-site.js`; then `node bin/build-site.js --check`.
- `npm run generate-integrity && npm run verify-integrity`.
- `npm run test`.
- `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`.
- `ws-check-harness` Phases 0-5c with zero critical findings.

Release-only deferred chain:

- `npm run build-site:bump` is mandatory once the maintainer lifts the no-commit constraint for a release PR. It is not run as a way around this workflow's no-commit hard stop.
- No `ws-ship-pr`, push, PR, or external review convergence runs in this workflow.

## 4. Permissions, Tenancy & i18n

- RBAC/tenancy/database: not applicable.
- SCM credentials/external services: no calls in implementation or tests; provider behavior is fixture/contract tested only.
- CI: repository workflow YAML only; no permission expansion.
- Diagnostics: repo-local configured directory; no secrets, PII, absolute machine paths, or full prompts.
- i18n: no application locales. Shipped skill/harness prose stays en-us.

## 5. Test Coverage

Command registry:

- `V1`: `node test/test-context-budget.js`
- `V2`: `node test/test-artifact-economy.js`
- `V3`: `node test/test-convergence-gates.js`
- `V4`: `node test/test-spec-lint.js && node test/test-ac-ledger.js`
- `V5`: `node test/test-state-observability.js`
- `V6`: `node test/test-telemetry-observability.js`
- `V7`: `node test/test-orchestrator-intelligence.js`
- `V8`: `node test/test-node-helper-ports.js`
- `V9`: `node test/test-evals-schema.js`
- `V10`: `node test/test-doc-sync.js`
- `V11`: `node test/test-stack-fingerprint.js`
- `V12`: `node test/test-hermes-spec-to-pr-enhancements.js`
- `V13`: `node test/test-quality-gates.js`
- `V14`: `node test/test-ws-doctor.js`
- `V15`: `node test/test-ws-audit.js`
- `V16`: `node test/test-install.js --local`
- `V17`: `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`
- `V18`: `node .agents/skills/ws-check-harness/scripts/measure_harness.cjs --scenario standard --json`

| AC | Exact likely implementation files | Dedicated test/method | Verification |
|---|---|---|---|
| AC1 | `AGENTS.md`, `CATALOG.md`, `bin/build-site.js`, `package.json` | `testRootAgentsBudgetAndCatalog` | V1, V10 |
| AC2 | `ws-shared/AGENTS.md`, `ws-shared/CATALOG.md`, `ws-shared/CROSS-PLATFORM.md` | `testSharedHubBudgetAndCompanions` | V1 |
| AC3 | Six named `SKILL.md` files | `testSubagentContractsOnlyAndFortyLines` | V1 |
| AC4 | `ws-spec-to-pr/PROTOCOLS.md`, `build_dispatch_context.cjs` | `testPrefixUsesNamedSections` | V1 |
| AC5 | `build_dispatch_context.cjs`, `PROTOCOLS.md`, `ws-self-learning/SKILL.md` | `testMemorySliceCappedAndMissingAdvisory` | V1, V8 |
| AC6 | `measure_harness.cjs`, config budget | `testFixedPreambleAtMost18000` | V1, V18 |
| AC7 | `gates.md`, `ws-code-review/SKILL.md`, `tools.md`, linked callers | `testNormativeHomesUnique` | V1 |
| AC8 | `check_duplicates.cjs`, allowlist, `ws-check-harness/{SKILL,PHASES}` | `testDuplicateSixLineBlockFails` | V1 |
| AC9 | `ARTIFACTS.md`, `tools.md`, artifact callers | `testArtifactMapSectionLookupOnly` | V2 |
| AC10 | `config-resolution.md`, exact 28 SKILL files in B5 | `testEntryCheckCanonicalSentenceUnique` | V1 |
| AC11 | config example/schema/interview, `measure_harness.cjs`, harness docs | `testConfiguredDispatchBudgetReportAndFail` | V1 |
| AC12 | `measure_harness.cjs` | `testStandardHarnessBytesReduction45Percent` | V18 |
| AC13 | `write_sequential_dag.cjs`, dispatch/protocol/state | `testDagDisabledNoDispatchAndReason` | V2, existing enable-DAG test |
| AC14 | `plan_index.cjs`, write-plan/interview/downstream skills | `testRefinedPlanSupersedesDraft` | V2 |
| AC15 | `plan_index.cjs`, write-plan template | `testPlanIndexMapsEveryAC` | V2 |
| AC16 | `plan_index.cjs`, `ARTIFACTS.md`, Steps 3-7 callers | `testDownstreamReadsIndexedSlices` | V2 |
| AC17 | `workflow_state.cjs`, `build_dispatch_context.cjs`, `PROTOCOLS.md` | `testCompactOutputsAndTwoFullLimit` | V2, V5 |
| AC18 | `measure_harness.cjs` | `testArtifactReadBytesReduction40Percent` | V2, V18 |
| AC19 | `workflow_state.cjs`, setup bootstrap, `{plansDir}/index.json` contract | `testSingleIndexReadWithTwentyStates` | V2 |
| AC20 | config/schema/interview, goal/ship timing docs | `testConvergenceDefaultsDriveAllTimers` | V3 |
| AC21 | `ws-goal-fix-pr/SKILL.md`, ship overrides | `testFreshCleanReadSkipsHeartbeat` | V3 |
| AC22 | goal/ship/provider status contracts | `testAdaptivePollStateAndRoundLog` | V3 |
| AC23 | config, gates, dispatch/protocol, verify/review, merge renderer | `testParallelReadonlyMergeDeterministic` | V3, V17 |
| AC24 | config, `gates.md`, setup, standard/lite | `testPhaseModeAtMostFiveBlockingGates` | V3, V18 |
| AC25 | `stack_fingerprint.cjs`, STACK template, configure/setup | `testStackFingerprintSkipsRedetection` | V11 |
| AC26 | `measure_harness.cjs`, `check_workflows.py` | `testSleepAndGateSimulationStandardLite` | V3, V17, V18 |
| AC27 | `validate_spec.cjs`, spec-format docs | `testSpecRequiredShapeAndContiguousACs` | V4 |
| AC28 | `validate_spec.cjs`, `FORMAT.md` | `testCompositeHeuristicNamesIds` | V4 |
| AC29 | write-spec, Step 0 dispatch, validator | `testStepZeroAndWriteSpecFailClosed` | V4 |
| AC30 | `test/test-spec-lint.js`, `package.json` | `testSpecPassFailFixturesInChain` | V4, full package test |
| AC31 | `ac_ledger.cjs`, `ARTIFACTS.md`, Step 0 | `testLedgerInitOneRowPerAC` | V4 |
| AC32 | `ac_ledger.cjs` | `testLedgerCommandsAndOnlyWriter` | V4 |
| AC33 | implement/verify/review/testing skills and dispatch | `testStepLinkageFilesCommitsTestsVerdicts` | V4 |
| AC34 | `validate_state.cjs`, ledger verify | `testPreAdvanceRejectsMissingLinkage` | V4, V5 |
| AC35 | ledger score, verify-plan, rubric | `testScoreDerivedNotAuthored` | V4 |
| AC36 | `ws-verify-plan/RUBRIC.md`, ledger score | `testTenOfTenRequiresAllEvidence` | V4 |
| AC37 | ledger score | `testKnownGapOrWarningCapsBelowNine` | V4 |
| AC38 | `update_state.cjs`, ledger | `testVerificationScoreMismatchRejected` | V4, V5 |
| AC39 | `persist_review_round.cjs`, code-review, artifacts | `testReviewRoundsPreservedCanonicalLatest` | V4 |
| AC40 | `ws-code-review/SKILL.md` | `testIneffectiveGateMinimumWarning` | V4 |
| AC41 | `run_sabotage.py`, config resolver | `testSabotageRequiresByteChangeAndAlias` | V12 |
| AC42 | sabotage JSON, ledger link/report renderers | `testSabotageStatusFromExitCode` | V4, V12 |
| AC43 | state schema/core/validator | `testClosedSkipReasonEnum` | V5 |
| AC44 | state telemetry and delivery-result renderer | `testSkipReasonInTelemetryAndDelivery` | V5 |
| AC45 | `probe_test_surface.cjs`, config test globs, Step 7 | `testTestingSkipRequiresMachineProbe` | V5 |
| AC46 | config/schema/resolution/gates/verify/ship | `testAuditVerdictModesAndRefutedFloor` | V13 |
| AC47 | telemetry core and every dry-run bypass caller | `testEveryDryRunSoftPassEmitsBypass` | V5, V13 |
| AC48 | dispatch/finish state calls and telemetry core | `testObservedTimestampsComputeElapsed` | V5 |
| AC49 | telemetry schema/core | `testTelemetryExtendedSchema` | V5 |
| AC50 | `audit_log.js`, aggregate writer | `testAuditCountsKeyedByWorkflowId` | V15, V6 |
| AC51 | aggregate generator, CLI | `testRunsMediansAndMarkdownReport` | V6 |
| AC52 | aggregate reader, progress renderer | `testRuntimeAggregateConsumerEstimate` | V6 |
| AC53 | `package.json`, CI, `check_workflows.py`, cleanup test | `testWorkflowAndCleanupCommandsChained` | V10, V17 |
| AC54 | `evals.schema.json`, all eval files, eval test | `testAllSkillEvalsValidate` | V9 |
| AC55 | diagnostics config, doctor/harness writers | `testDatedComparableDiagnostics` | V14, V6 |
| AC56 | classify script/skill | `testExecutionProfileValuesAndReasons` | V7 |
| AC57 | classifier gate in dispatch/gates | `testClassifierGateShowsWholeProfile` | V7 |
| AC58 | `search_local_plan_history.cjs`, write-spec/dispatch | `testPriorWorkIncludesCompletedLocalPlans` | V7 |
| AC59 | memory conflict output, classifier/interview dispatch | `testHighMemoryForcesInterview` | V7, existing pattern test |
| AC60 | state/telemetry schema and gate calls | `testGateDecisionObjectRejectsString` | V5, V7 |
| AC61 | progress renderer, aggregate medians | `testEveryPendingStepHasEstimate` | V7 |
| AC62 | artifact producers/templates, artifacts registry | `testAllStepArtifactMetadata` | V5 |
| AC63 | `validate_state.cjs` artifact validation | `testMissingArtifactMetadataRejected` | V5 |
| AC64 | state core, run schema/renderer | `testRunJsonEveryTransitionAndRunMd` | V5 |
| AC65 | run renderer/progress board | `testBoardDeterministicForSameRunJson` | V5 |
| AC66 | `ARTIFACTS.md`, goal templates, runtime validator | `testClosedRuntimeFileList` | V5 |
| AC67 | shared state core + four `.cjs` entrypoints + orch docs | `testFullLifecycleWithoutPythonPath` | V8 |
| AC68 | three Node helper ports + recipes | `testRegisterDetectMemoryWithoutPython` | V8 |
| AC69 | seven Python resolver consumers and shared resolver | `testNoLocalResolveRepoRootReimplementation` | V8 |
| AC70 | doctor/harness check, `check_memory_conflict.py` | `testNoRelativeConsumerRuntimeDataRefs` | V8, V14 |
| AC71 | setup/bootstrap banners and resolver | `testBootstrapPrintsResolvedRootsAndWinner` | V8 |
| AC72 | doctor resolver inventory | `testDoctorReportsProjectOrGlobalPerSkill` | V14 |
| AC73 | `tools.md` and linked model prose | `testModelParameterizationPortableVocabulary` | V1, V8 |
| AC74 | package exclusions, integrity generator, tarball test | `testPackedTreeExcludesPythonCaches` | V16 |
| AC75 | root `AGENTS.md`, `FEATURES.md`, shared maintainer checklist | `testFeaturesMandatorySyncTarget` | V10 |
| AC76 | CI, build-site `--check`, doc-sync test | `testConflictMarkersAndCatalogNoDiff` | V10 |

Final required commands before any claim-complete handoff:

1. Every `npm run test:*` named in B9.
2. `npm run test`.
3. `npm run generate-integrity && npm run verify-integrity`.
4. `node bin/build-site.js && node bin/build-site.js --check`.
5. `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`.
6. `ws-check-harness` Phases 0-5c, zero critical.

No command above authorizes staging or committing.

## 6. Invariants (Do Not Violate)

1. Local SoT only: `$PWD/.agents/skills/ws-*`; no global reads/writes for authored skills.
2. Do not create another `SKILL.md` for dogfood or `.agents/dev-harness/`.
3. `stateVersion` is stamped from one shared constant; unknown versions reject.
4. Nested telemetry mappings remain mappings through repeated state writes.
5. JSON/session/artifact paths persisted on disk are POSIX repo-relative.
6. Consumer root/config comes from shared resolvers; never from script location in hybrid mode.
7. Missing MEMORY is advisory and injects an empty slice.
8. Score is strictly ledger-derived and non-overridable.
9. REFUTED and every existing hard stop remain fail-closed.
10. `gateGranularity` default behavior remains per-step.
11. `parallelVerifyReview` defaults false; its subagents are read-only and review a real committed diff.
12. Same-defect sibling sweeps remain repo-wide; no adjacent cleanup.
13. Sabotage mutates/restores only named paths and derives status from exit code.
14. Build-site and frontmatter output stays LF-safe.
15. No runtime npm dependencies.
16. No plan/runtime artifact enters product staging before delivery; this run never stages anything.
17. Protected dirty files remain byte-preserved except the approved merged `FEATURES.md` sections and consumer-only fable config adjustment.
18. New schemas/scripts/docs are en-us and portable.

## 7. Pre-PR Checklist

- [ ] All AC1-AC76 map to a batch and named test in §5.
- [ ] Root AGENTS ≤40,000 bytes; shared AGENTS ≤14,000 bytes.
- [ ] Fixed preamble ≤18,000 bytes; standard harness bytes reduced ≥45%; artifact re-reads reduced ≥40%.
- [ ] One normative home and duplicate detector pass.
- [ ] Standard/lite lifecycle passes without Python on PATH; frozen Python smoke tests pass.
- [ ] Ledger makes score 9 with known gaps unreachable.
- [ ] REFUTED hard stop and HS/G2 gates remain intact.
- [ ] Required state/artifact/telemetry/run schemas pass.
- [ ] Standard/lite sleep and blocking-gate simulation pass.
- [ ] Every eval validates; workflow simulation and cleanup test are in package/CI chain.
- [ ] Tarball and integrity exclude `__pycache__`.
- [ ] README, FEATURES merge, root/shared hubs, catalog, site, package version/dependency manifests, and integrity are synchronized when release is authorized.
- [ ] No merge-conflict markers; `build-site --check` is clean.
- [ ] `npm run test`, integrity verify, workflow simulation, and harness audit exit clean.
- [ ] No staging, commit, push, PR, checkout, reset, clean, or external mutation occurred in this workflow.
- [ ] Expected terminal condition recorded: after safe implementation/testing and Step 5 evidence, standard G2-code hard-stops before Step 6 because the no-commit constraint is binding.

## 8. Open Questions

None.

Resolved decisions:

- Scope: W1-W10.
- Gate granularity: packaged default `step`, optional `phase`.
- Score: ledger-derived, no override.
- Audit mode: packaged and local effective default `"refuted"`; known REFUTED always blocks; `"caveats"` remains an explicit stricter opt-in.
- Runtime split: Node orchestrator surfaces; Python helpers retained/frozen.
- Parallel verify/review: default false; opt-in commits after Step 4 before concurrent read-only verification/review.
- State version: one supported constant shared by writer/validator; no compatibility shim.
- Dirty merge: only `FEATURES.md`, section-level, against re-read current bytes.
- Current workflow: safe implementation/testing may proceed later, but G2-code is a mandatory no-commit hard stop.
