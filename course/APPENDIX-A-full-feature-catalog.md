# Appendix A — Every Feature and Every Skill (Reference)

Read this appendix, do not record it. It is the enumerated inventory behind the course, scanned from `FEATURES.md`, `CATALOG.md`, `bin/skill-dependencies.json`, and `.agents/skills/ws-*/SKILL.md` at package **0.5.48**: **62 skills** (54 Workflows + 8 Extra) plus the managed `ws-shared` hub. Use it to write YouTube description checklists, lesson notes, and search keywords.

## A.1 Feature inventory by area

### Delivery pipelines

1. Standard pipeline `ws-spec-to-pr` (Steps 0–9 + 6b): spec → plan → interview → tasks → implement → verify (advance ≥ `minVerifyScore`, default 9) → product commit → review → fresh verify → testing → close → ship → fix-PR.
2. Lite pipeline `ws-spec-to-pr-lite` (Steps 0–5): spec → plan → implement → commit → review → close+ship → fix-PR; isolated `workflowType`, no cross-resume.
3. Batch pipeline `ws-spec-multi`: sequential queue, per-spec classification (lite vs standard), per-run state dirs, verified child outcomes, foreign-commit guard.
4. Distributed pipeline `ws-spec-to-pr-distributed` (explicit opt-in): same 0–9 steps across CLI processes via the state-file baton and deterministic `step_coordinator.cjs`.
5. Direct loop `ws-fable-method` (7 steps) for non-pipeline problem solving; `ws-task-lifecycle` for prompt-driven work without a plan tree.
6. Optional post-completion proof of work (UI evidence screenshots + report) gated by `enableOptionalProofOfWork` (+ automatic start switch); evidence is never committed.

### Quality gates (all fail closed)

1. Derived verify score from `ac-ledger.json` (0–10, authored by no one); bar `defaults.minVerifyScore` (1–10, default 9).
2. Score caps: uncovered negative scenarios → 8; critical stack-invariant violations → below the bar.
3. `scoreAndRefine` rounds (max 3, then Pause), optional Reach-10 offer, over-engineering second pass above the bar.
4. Per-task test-adequacy review at plan time; Definition of Ready + TDD (red-then-green); negative-scenario coverage tracked from authoring.
5. Commit-before-review (G2-code), review diff `{base}...HEAD`, fix → re-review (max 3), fresh-verify fix → re-verify (max 3).
6. Testing gates: configured suites + coverage; mutation threshold (default 80) or regression sabotage when mutation is unset.
7. Pre-advance state validation; dual-write state sync (`syncStateDualWrite`); dispatch prompt-audit pairs verified at the next gate.
8. Secrets/PII scan; adversarial fable audit (`auditVerdictsBlockShip`: false / "refuted" default / "caveats"); preview dry-run before Create PR (non-blocking); pre-ship doc-sync trio (wiki + index + changelog, `requirePreShipDocSync` default true).
9. Worker liveness watchdog (marker + `alive`/`pending`/`wedged` verdict; only `wedged` authorizes takeover); stack-invariant static scan (`scan_stack_invariants.cjs`).

### State, context, and runtime artifacts

1. Single state SoT `{workflow-id}.state.json` + rendered `.state.md`, `telemetry.jsonl` stream, plans index, per-dispatch audit pair (`.prompt.md` + `.prompt.json` with budget/refs/sha).
2. Fail-closed bootstrap (`update_state.cjs init` with explicit slug/workflow-id/branch/baseline; idempotent replay only on identical identity; progressed runs refused).
3. Mid-step `checkpoint` and turn-boundary `pause-turn` resume; `gitTrackedSet` subprocess caching; context budgets (`contextBudget` 32 KB + per-step `stepContextBudgets`, 18,000 floor).
4. Git ownership contract for parallel writers (own-path staging only; forward-only baseline refresh; `file_lock.cjs` on shared artifacts).
5. `autoMode` unattended chaining (Steps 0–9 → ship → fix-PR) with an explicit stop list; per-run `preset=<name>` model override persisted in state.

### Spec lifecycle

1. Authoring (`ws-spec-write`) with DoR, Validation & Observation Notes, Negative Scenarios, EARS criteria, closure finder, gray-area `.context.md`.
2. Format/validation (`ws-spec-format`), path resolution/numbering (`ws-spec-organizer`), index (`ws-spec-index`) with filing to `completed/` and close verification.
3. Unified routing (`ws-spec-manager`), dual board (`ws-spec-list`), Kanvas board (`ws-kanvas`), panorama (`ws-spec-explain`), human runbook (`ws-spec-translate-to-human`).
4. Import (`ws-spec-from-provider`), export (`ws-spec-to-issue`), drift update (`ws-spec-update`), harvest/archive (`ws-spec-archive`), leftover cleanup (`ws-cleanup`).

### Memory, wiki, and reporting

1. Memory consult/write with DO NOT / INSTEAD DO traps; failure/adversarial reflection rules; local files and/or spec-memo vault (dual routing).
2. Append-only changelog with a duplicate-safe helper; living wiki (`ws-wiki`) with Sync Baseline, verify, and reconcile phases.
3. Delivery reporting: `ws-activity-report` (civil-day timesheet, human vs agent split), `ws-pre-daily` (36-hour standup), `ws-retro` (propose-only improvements), `ws-patterns-generator` (consumer patterns skill).

### Providers, config, and distribution

1. Provider parity (GitHub / Azure DevOps / local) under one intent contract, enforced by tests; tracker reformulation preserves original context.
2. Single consumer-owned `.ws/config.json` (wizard + Windows desktop GUI kept schema-synced); hybrid global/project installs; relocatable hub root.
3. Zero-dependency Node 22 CLI; SHA-256 integrity (source + consumer); dependency-closure install/uninstall; global host targets (`canonical`/`claude`/`codex`/`gemini`); published site + wiki.

### Harness and meta

1. Diagnostics (`ws-doctor`, `ws-version`, `ws-show-harness`, `ws-monitor`) and audits (`ws-check-harness` Phases 0–5c, `ws-check-workflows`).
2. Benchmarks (`ws-benchmarks`, `ws-run-benchmark`) with fixed-model comparison publishing; telemetry aggregate/report CLI.
3. Authoring (`ws-write-a-skill`), convergence primitive (`ws-goal-loop`), response style (`ws-tdah`), delivery gate (`ws-senior-developer`), vibe implementation (`ws-megabrain`), domain adapters (`ws-fable-domain`), local dry-run (`ws-preview`).

## A.2 Every skill (one line each)

### Harness

| Skill | One line |
|---|---|
| `ws-check-harness` | Integrity audit: install mode, routing, links, portability, digests, duplication, topology |
| `ws-check-workflows` | FSM simulation of standard/lite/multi pipelines |
| `ws-doctor` | Read-only diagnosis of paths, recipes, switches, missing references |
| `ws-monitor` | Read-only live observer: state, telemetry, artifacts, transcripts, stall detection |
| `ws-version` | Install scope, skill directory, package version, hub tokens snapshot |
| `ws-show-harness` (Extra) | Session snapshot: loaded skills, rules, precedence |
| `ws-preview` (Extra) | Consumer local review dry-run (`preview.dryRunCommand`) |
| `ws-run-benchmark` (Extra) | Single-fixture live benchmark run |
| `ws-benchmarks` (Extra) | Benchmark suite: inspect evolution, run static/live, publish comparisons |
| `ws-write-a-skill` (Extra) | Author/edit/optimize skills with progressive disclosure |

### Pipeline (steps) and orchestrators

| Skill | Step / role |
|---|---|
| `ws-spec-write` | Step 0: draft/reformulate `*.spec.md` from free text or tracker items |
| `ws-plan-write` | Step 1: structured implementation plan incl. invariant verification |
| `ws-plan-interview` | Step 2: interrogate plan, resolve ambiguity, emit refined plan |
| `ws-plan-to-tasks` | Step 3: atomic dependency-mapped task DAG |
| `ws-implement-tasks` | Steps 4/6-fix: build tasks or apply surgical review fixes |
| `ws-plan-verify` | Step 5: derived 0–10 spec-compliance score; advance ≥ bar |
| `ws-code-review` | Step 6: two-phase adversarial review of `{base}...HEAD`, fix loop |
| `ws-fresh-verify` | Step 6b: fresh-worker AC re-derivation + per-AC fault injection |
| `ws-testing` | Step 7: unit/integration/E2E, coverage, mutation or sabotage |
| `ws-ship-pr` | Step 8: close done; quiet preflight, push, PR, CI triage |
| `ws-fix-pr` | Step 9 (single pass): plan-before-edit thread fixes |
| `ws-goal-fix-pr` | Step 9 (loop): converge threads to zero, then merge |
| `ws-plan-update` (Extra) | Post-ship QA delta: capture findings, plan and apply fixes |
| `ws-spec-to-pr` | Orchestrator: standard FSM Steps 0–9 (+6b) |
| `ws-spec-to-pr-lite` | Orchestrator: fast FSM Steps 0–5 |
| `ws-spec-to-pr-distributed` | Orchestrator (opt-in): multi-CLI baton over Steps 0–9 |
| `ws-spec-multi` | Batch queue: classify per spec, run one pipeline at a time |

### Spec family and providers

| Skill | One line |
|---|---|
| `ws-spec-format` | Canonical spec schema, section hierarchy, AC rules |
| `ws-classify-complexity` | Recommend lite vs standard from `dagThresholds` |
| `ws-spec-index` | Init/sync/promote `index.PRD`; file shipped specs to `completed/` |
| `ws-spec-list` | Dual board (specs vs plans) + manage menu |
| `ws-kanvas` | Local six-column kanban (`npm run kanvas`), drag-and-drop phases |
| `ws-spec-manager` | Single front door routing all spec operations |
| `ws-spec-organizer` | Spec path resolution + `NNNN-` chronological organization |
| `ws-spec-explain` | Read-only status/delivery panorama for a spec or issue |
| `ws-spec-translate-to-human` | Human runbook beside the agent spec |
| `ws-spec-archive` | Harvest plan history into `index.PRD` Archive |
| `ws-spec-update` | Sync specs after code changes (optional memory record) |
| `ws-spec-from-provider` | Bulk-import tracker backlog into validated local specs |
| `ws-spec-to-issue` | Free text → anonymized tracker item, no spec, no git change |
| `ws-spec-provider-github` | GitHub issue→spec + PR/thread intents |
| `ws-spec-provider-azure-devops` | Azure DevOps work-item→spec + PR/thread intents |
| `ws-spec-provider-local` | Detect/normalize/register local `*.spec.md` |

### Quality, memory, and utility

| Skill | One line |
|---|---|
| `ws-secrets-leak-review` | Secrets & PII scan with optional pre-commit hook |
| `ws-fable-judge` | Adversarial audit of claimed work against diffs and re-runs |
| `ws-fable-method` | 7-step evidence-first problem-solving loop |
| `ws-fable-domain` (Extra) | Domain adapters: authority, evidence sets, fraud definitions |
| `ws-senior-developer` | Delivery gate: scope control, surgical diffs, pre-ship proof |
| `ws-tdah` | Action-first reply shape, clarity, operational judgment |
| `ws-self-learning` | Memory engine: consult before work, record traps after |
| `ws-changelog` | Append-only structured task history |
| `ws-spec-memo` | Spec-memo setup/bridge (runtime ops use external `ws-memo`) |
| `ws-wiki` | Living feature wiki: init/genesis/sync/verify/reconcile |
| `ws-configure-project` | Interactive `config.json` wizard (sections incl. preview, specMemo) |
| `ws-goal-loop` | Convergence primitive: sentinels, heartbeats, settle timers |
| `ws-task-lifecycle` | Prompt-driven work: Intake → Implementation → Completion |
| `ws-megabrain` | Vibe-coding implementer + specialists (no spec required) |
| `ws-pre-daily` | Last-36-hours standup: delivered, made, ongoing, next |
| `ws-activity-report` (Extra) | Civil-day timesheet for a plan folder (human vs agent) |
| `ws-retro` | Propose-only retrospective with evidence-linked improvements |
| `ws-cleanup` | Gate-confirmed workflow leftover cleanup + ignore suggestions |
| `ws-patterns-generator` | Harvest project knowledge into an autoloaded patterns skill |

Counts check: 62 skills above including Extra; `ws-shared` is the managed hub (runtime contracts, templates, schemas), not a counted skill. External companions `ws-memo` and `ws-session-tracking` ship with spec-memo and are never installed by this installer.
