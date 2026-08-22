# Feature list

**Audience: humans and agents** — the complete capability inventory of the `ws-*` skill suite.

Package version: **0.3.34** · 48 skills (42 Workflows + 6 Extra) + the `ws-shared` consumer hub.

| Doc | Purpose |
|-----|---------|
| **`FEATURES.md`** (this file) | What the suite can do, feature by feature, plus the full skill catalog |
| [`README.md`](README.md) | Install, update, uninstall, safety, contribute |
| [`AGENTS.md`](AGENTS.md) | Agent routing contract (upstream authoring) |
| [`CATALOG.md`](CATALOG.md) | On-demand skill inventory, task router, and upstream ship checklist |
| [`.agents/skills/ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) | Consumer hub after install |
| [`CHANGELOG.md`](CHANGELOG.md) | Dated history of every change |

---

## 1. Delivery pipelines

Four ways to get work done. All of them share one `config.json` and the same provider layer.

### 1.1 Standard pipeline — `ws-spec-to-pr` (steps 0–9)

A finite state machine that carries one feature from an idea to a merged pull request. Each step dispatches a dedicated subagent skill and writes a named artifact under `{plansDir}/{slug}/`.

| Step | What happens | Artifact |
|------|--------------|----------|
| 0 | Entry gate, tracker fetch, **prior-work sweep**, spec authoring (`ws-write-spec`), register as spec of record | `{specsDir}/{slug}.spec.md` → `step-00-{slug}.spec.md` |
| 1 | Implementation plan (`ws-write-plan`) plus a MEMORY conflict check against known traps | `step-01-{slug}.plan.md` |
| 2 | Optional plan interrogation to surface hidden assumptions (`ws-interview`) | `step-02-{slug}.plan.refined.md` |
| 3 | Task breakdown into an execution DAG (`ws-plan-to-tasks`) | `step-03-{slug}.plan.exec.md` + `.exec.dag.json` |
| 4 | Implementation (`ws-implement-tasks`) with pattern and memory consult proof | code + build/test verification |
| 5 | Spec-compliance scoring 0–10 (`ws-verify-plan`); **advances only at ≥ 9** | `step-05-{slug}.plan.report.md` |
| 6 | Local code review of `{base}...HEAD` (`ws-code-review`) with a fix → re-review loop | `step-06-{slug}.review.md` (+ `.fix.report.md`) |
| 7 | Test battery (`ws-testing`): unit, integration, E2E, coverage, optional mutation, regression sabotage | `step-07-{slug}.testing.*` |
| 8 | Delivery result, ship gate, push and PR creation (`ws-ship-pr`), tracker comment | `step-08-{slug}.result.md` |
| 9 | PR thread convergence (`ws-goal-fix-pr` / `ws-fix-pr`) then merge | resolved threads / merge |

Canonical dispatch table: [`STEP-DISPATCH.md`](.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md).

### 1.2 Lite pipeline — `ws-spec-to-pr-lite` (steps 0–5)

The same delivery guarantees with the planning ceremony removed: spec → plan → implement → commit → review → ship → fix threads. It uses identical GitHub/Azure PR operations and the same `config.json`, but keeps **isolated state** (`workflowType`), so a lite run and a standard run never cross-resume.

| Step | Stage | Skill |
|------|-------|-------|
| 0 | Spec (+ prior-work sweep) | providers / `ws-write-spec` |
| 1 | Planning (design-intent git log) | `ws-write-plan` |
| 2 | Implementation (defect-class repo sweep) | `ws-implement-tasks` |
| 3 | Review (+ fix loop, sibling modules) | `ws-code-review` |
| 4 | Ship (CI triage + tracker comment) | `ws-ship-pr` |
| 5 | Fix-PR | `ws-goal-fix-pr` / `ws-fix-pr` |

### 1.3 Batch delivery — `ws-multi-spec`

Runs a queue of specs one at a time. For each spec it calls `ws-classify-complexity` and dispatches lite or standard automatically, syncs the base branch before starting the next item, and blocks queue advancement until the current spec reaches a terminal state.

### 1.4 Direct problem solving — `ws-fable-method`

A 7-step loop for work that does not warrant a full pipeline: classify the problem, define done, gather primary-source evidence, decide, act surgically, verify adversarially, report. Triviality and Fit gates keep it from firing on trivial asks.

---

## 2. Quality gates

The suite's central claim is that nothing ships on an agent's word alone. Every gate below fails closed.

| Gate | Rule | Owner |
|------|------|-------|
| **Derived verify score ≥ 9** | Standard Step 5 derives the integer 0–10 score from `ac-ledger.json`. The score cannot be authored or overridden. Below 9 it re-implements flagged tasks and re-scores (max 3 rounds, then Pause). | `ws-verify-plan` |
| **Score & refine** | When a score is already ≥ 9 and `defaults.scoreAndRefine` is on, the user is offered a second polish pass: task-by-task score analysis plus a wide-context overengineering sweep (simplify ACs; remove unused workflow-introduced files/tests/methods/classes). | `ws-verify-plan` |
| **Fix → re-review** | Critical or Warning findings trigger fix rounds (max 3). Residual findings Pause the run instead of advancing. | `ws-code-review` |
| **Commit before review** | Product files must be committed before a review is dispatched, so the review always diffs a real `{base}...HEAD`. Uncommitted product files STOP the step. | `gates.md` (G2-code) |
| **Regression sabotage** | When mutation testing is unset, Step 7 deliberately breaks assertions to confirm the suite actually catches regressions. | `ws-testing` (`run_sabotage.py`) |
| **Mutation threshold** | Optional. When `verification.mutationTest` is set and `skipMutationTesting` is false, a score below `mutationThreshold` (default 80) fails Step 7. | `ws-testing` |
| **Pre-advance validation** | Machine validation of the workflow state file before every step transition; a bad state halts the FSM. Both orchestrators invoke the Node `validate_state.cjs` surface. | `validate_state.cjs` |
| **Secrets and PII scan** | Leak audit before ship, with an optional pre-commit hook (user-requested only). | `ws-secrets-leak-review` |
| **Adversarial audit** | Claimed work is checked against real git diffs and re-run verifications. `auditVerdictsBlockShip` supports `false`, `"refuted"` (default), or stricter `"caveats"` while preserving the REFUTED safety floor. | `ws-fable-judge` |
| **Delivery gate** | Scope control, anti-reinvention, ambiguity stops, and pre-ship proof checklist. | `ws-senior-developer` |

---

## 3. Commit and artifact discipline

- **Product code and plan files are committed separately.** Product files commit after verify (standard) or after implement (lite); plan artifacts wait for the Step 8 delivery commit.
- **Review fixes get their own commit**, so a reviewer can see what the review changed.
- **`deliveryCommitArtifacts`** selects exactly which plan artifacts enter the delivery commit (refined plan on by default; result, spec, check report, review, and testing report opt-in).
- **Checkpoint tags** (`uswf/{workflow-id}/before-step-{N}`) are written at each transition, so a run can be inspected or rolled back per step.
- **Telemetry** is emitted as JSONL per step under `{plansDir}/{slug}/telemetry/`.
- **State is transactional and indexed.** Atomic Node state updates publish `run.json`, `run.md`, and the repo-level plans index with repo-relative POSIX paths and closed skip reasons.
- **Acceptance criteria are traceable.** `plan.index.json` maps plan slices; `ac-ledger.json` links each AC to semantic evidence, files, tests, commits, findings, and sabotage outcomes.
- **Review history is immutable.** Every review round is preserved as `.review.rN.md`; the canonical review file points at the latest validated round.

---

## 4. SCM provider parity

GitHub and Azure DevOps are interchangeable backends. Orchestrators call intents **by name** and never embed `gh` or `az` directly; host CLI recipes live inside each provider's `INTENTS.md`.

Nine required intents, enforced by `node test/test-provider-parity.js` in `npm run test` (tables, INTENTS headings, and implementation: sweep/comment CLI + JSON aliases, local-spec SCM delegates, `resolve-thread --dry-run`, optional Azure `--model`):

| Intent | Guarantee |
|--------|-----------|
| `validate-auth` | STOP on failure; no silent provider fallback |
| `fetch-to-spec` | Writes the `{specsDir}` spec of record first, then the `step-00` workflow copy |
| `create-pr` | Reuses an existing open PR for the same head→base |
| `list-threads` | Structured threads with an active count |
| `sweep-prior-work` | Prior PR hits and recent commits, run before plan or code |
| `check-pr-status` | CI triage that classifies each failure as `diff-regression`, `baseline`, or `infra-flake`, with at most one flake rerun |
| `resolve-thread` | Skips remote mutation under `dry-run` |
| `comment-issue` | Posts the PR URL and summary back to the tracker; skipped for local specs |
| `merge-pr` | Waits for required checks; never deletes `project.workingBranch` |

Adding an intent to only one provider fails CI unless an allowlist row explains why the other host cannot mirror it. Contract: [`scm-provider-contract.md`](.agents/skills/ws-shared/scm-provider-contract.md).

`ws-local-spec-provider` implements `fetch-to-spec` and `validate-auth` only, and delegates all PR operations to `providers.scm`.

---

## 5. Spec lifecycle

A deliberate vocabulary separates a **spec** (human-facing feature description) from a **plan** (workflow run state). Skills never treat one as the other.

| Capability | Skill |
|------------|-------|
| Draft a spec from free text, or reformulate a tracker issue into structured acceptance criteria. Lookup codebase/MEMORY/stack before any user-gate; authoring-validate with `validate_spec.cjs --mode=authoring`. Standalone invoke always `user-gate`s **Add to index.PRD** vs skip (not workflow `--register`). | `ws-write-spec` |
| Canonical `*.spec.md` schema, section hierarchy, AC rules, and specify-time closure (`Out of Scope`, Assumptions, dimensions sweep) | `ws-spec-format` |
| Promote any spec into a workflow run (`{specsDir}` spec of record → `step-00` copy) | `ws-local-spec-provider` |
| Dual board of specs versus plan workflows, with a manage menu | `ws-spec-list` |
| Bulk-import open GitHub issues or ADO User Stories (assigned to PAT) into `{specsDir}` + full register | `ws-spec-from-provider` |
| Project feature index (`index.PRD`): init, sync against delivery evidence, promote from inbox, track an existing spec | `ws-spec-index` |
| Harvest `{plansDir}` delivery facts into `index.PRD` Archive, then propose cleanup of shipped plan folders | `ws-spec-archive` |
| Update spec bodies when code drifted after ad-hoc prompts | `ws-sync-spec` |
| Recommend lite versus standard for a ready spec against `dagThresholds` | `ws-classify-complexity` |

Every entry path — free text, local file, GitHub issue, Azure work item — produces the spec of record under `{specsDir}` **before** any plan artifact exists. Re-fetching refuses to clobber a differing spec unless `--force` is passed.

---

## 6. Memory, patterns, and history

The suite accumulates project knowledge instead of relearning it each session.

| Capability | Skill | Storage |
|------------|-------|---------|
| Anti-regression traps: consult before planning, record after discovering | `ws-self-learning` | `{sharedDir}/MEMORY.md` + `memory/*.md` |
| Failure reflection hook — forbids `Learning: N/A` when session friction is high | `ws-self-learning` | same |
| Path-pattern querying (`--match-paths`) so traps surface only for relevant files | `ws-self-learning` | same |
| Backend architectural conventions, consulted before backend tasks | `ws-patterns` | `{sharedDir}/backend.md` |
| Frontend UI/UX conventions, consulted before frontend tasks | `ws-patterns` | `{sharedDir}/frontend.md` |
| Append-only task history | `ws-changelog` | `rules.changelogFile` |
| Domain authority, minimum evidence sets, and fraud definitions per domain | `ws-fable-domain` | domain adapters |

Steps 4 and 6 of the standard pipeline require **proof** of pattern and memory consultation in the subagent's step output; a missing consult is a gate failure, not a warning.

---

## 7. Harness, diagnostics, and authoring

Meta-skills that keep the suite itself honest.

| Skill | What it checks or produces |
|-------|----------------------------|
| `ws-check-harness` | Routing, links, portability, integrity digests, instruction duplication, role clarity, skill composition topology |
| `ws-check-workflows` | FSM simulation of standard, lite, and multi-spec pipelines: step continuity, state isolation, provider dispatch, artifact transitions |
| `ws-doctor` | Read-only diagnosis of path errors, tool recipes, config switches, and missing references across installed skills |
| `ws-audit` | Runtime observer for orchestrated runs: script errors, non-zero exits, unrecognized options, tool/IO/dispatch anomalies, performance bottlenecks, disposable scratch scripts. Drafts upstream GitHub issues and reusable tooling proposals at the end of a run |
| `ws-show-harness` | Snapshot of the active session: loaded skills, rules, precedence hierarchy |
| `ws-preview` | External code-review dry-run on the current branch without publishing PR threads |
| `ws-write-a-skill` | Authoring and progressive-disclosure tuning protocol for new skills |

Harness dispatches use bounded `## Subagent contract` sections plus indexed plan slices. The fixed preamble is capped at 18 KB, matched MEMORY at 4 KB, and total dispatch context at `defaults.contextBudget` (32 KB by default). `measure_harness.cjs` reports the reduction against the measured baseline, while `check_duplicates.cjs` rejects duplicated normative blocks. Phase 5a also runs `check_shell_quoting.cjs` to block nested-quote `python -c` / `node -e` one-liners.



**Session leases (`defaults.sessionLeases`):** cooperative same-slug exclusive leases under `{plansDir}/.runtime/leases/` plus a short `{plansDir}/.runtime/git.lock` critical section around destroyable git (checkout, reset, stash, merge, rebase, commit, push). Default **on** when the key is omitted; explicit `false` disables. This is **not** a repo-root wait-PID / global idle mutex — unrelated slugs on the same worktree warn via `user-gate` (Wait / Proceed / Abort).

Diagnostics can be persisted under `plans.diagnosticsDir`. `workflow-skills telemetry report` renders per-run audit counts and median elapsed times by pipeline and step.

---

## 8. Reporting

| Skill | Output |
|-------|--------|
| `ws-activity-report` | Timesheet entries for a delivery day. Start is the earliest bootstrap file in the plan folder; end is the later of the last PR thread comment or the last delivery commit. Splits human versus agent duration |
| `ws-pre-daily` | Standup briefing covering the last 36 hours: delivered, made, ongoing, next |
| `ws-spec-explain` | Read-only panorama of a spec or US/issue: status, what it does, what it delivered, how to check in the project/UI, and how to test |
| `ws-spec-archive` | Harvests `{plansDir}` state, artifacts, git/changelog/MEMORY (and optional SCM) into `{specsDir}/index.PRD` Archive, then proposes a commit that removes eligible shipped plan folders |
| `ws-cleanup` | Lists disposable workflow leftovers (telemetry, `.runtime`, audit logs, shipped plan dirs, untracked orphans under partially tracked shipped plans), confirms via user-gate, deletes only approved untracked paths, and suggests missing `.gitignore` patterns |

---

## 9. Operating model and response style

| Skill | Effect |
|-------|--------|
| `ws-senior-developer` | Delivery gate: scope control, anti-reinvention, ambiguity stops via user gate, pre-ship proof |
| `ws-karpathy-guidelines` | Micro diff hygiene — surgical changes, minimal diff footprint, surfaced assumptions |
| `ws-tdah` | Action-first reply shape and operational judgment |
| `ws-goal-loop` | Generic convergence primitive: sentinel management, heartbeat and settle timers, re-check control. Backs `ws-goal-fix-pr` |
| `ws-update-plan-implementation` | Post-ship QA delta manager: capture manual findings, plan and execute delta fixes, update the delivery summary |

Autoload set (loaded every prompt when a project opts in via `{sharedDir}/autoload.md`): `ws-senior-developer`, `ws-self-learning`, `ws-patterns`, `ws-changelog`, `ws-fable-method`, `ws-tdah`, plus `ws-karpathy-guidelines` from the shared-hub mandatory table. Precedence among them is documented and deterministic.

---

## 10. Configuration surface

Everything project-specific lives in one consumer-owned, gitignored file: `.agents/skills/ws-shared/config.json` (seeded from `config.json.example`, validated by `config.schema.json`, filled interactively by `ws-configure-project`).

| Section | Controls |
|---------|----------|
| `project` | Name, org, repo URL, base branch, working branch, remote |
| `stack` | Backend, frontend, database, orchestration commands, i18n |
| `providers` | `active` (work-item source) and `scm` (PR host), with legacy inference |
| `issueTrackers` | GitHub and Azure DevOps credentials, CLI, converter scripts |
| `verification` | Build, test, format, migration, and mutation commands plus `mutationThreshold` |
| `dagThresholds` | Complexity limits that decide sequential versus parallel DAG |
| `defaults` | Execution mode, test globs, 32 KB context budget, optional parallel verify/review, `gateGranularity` (`step` by default or `phase`), adaptive convergence policy, delivery artifacts, `modelsPreset` / `modelPresets` bundles, optional `stepModels` map, and legacy per-phase model identifiers |
| `plans` / `reviews` / `preview` | Artifact roots, diagnostics root, and dry-run backend |
| `rules` | Guardrail paths: harness, senior developer, karpathy, stack file, changelog file |
| `invariants` | Project-level architectural assertions plus `skipQualityGates` |
| `fable` | Master toggle plus `autoAudit`, `autoDetectDomain`, `auditVerdictsBlockShip` |

**Per-phase model switching:** the orchestrator session always runs under the active model. Named presets (`modelsPreset` / `modelPresets`), optional per-step `stepModels`, and legacy phase keys resolve the subagent model for standard `dispatch-agent` dispatches only, with graceful fallback when a switch fails.

Consumer-owned files never overwritten by an update: `config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `backend.md`, `frontend.md`, `installed-skills.json`, `CHANGELOG.md`, `skill-integrity-local.json`.

---

## 11. Distribution and safety

| Feature | Detail |
|---------|--------|
| **Zero-dependency CLI** | `bin/cli.js` runs under plain Node; no runtime npm dependencies |
| **npx install** | `npx --yes github:jpolvora/workflow-skills` — interactive or `--yes` non-interactive |
| **Three packages** | `f` Full (all skills), `w` Workflows (42 skills), `e` Extra (`ws-write-a-skill`, `ws-show-harness`, `ws-preview`, `ws-activity-report`, `ws-fable-domain`, `ws-update-plan-implementation`) |
| **Global or project scope** | `--global` / `--project`; project-local skills override global copies |
| **Dependency closure** | `skill-dependencies.json` drives install; uninstall cascades dependents and unused deps |
| **SHA-256 integrity** | `bin/skill-integrity.json` covers every installable tree; install and update verify the source before copying and the consumer after, failing closed on mismatch. LF-canonical hashing keeps CRLF checkouts consistent |
| **Audit commands** | `integrity` recomputes consumer digests; `--check` compares semver and `fullPackageDigest` against the remote manifest |
| **Self-overwrite guard** | Remote install into the source repo is blocked, except under `test/` |
| **No remote shell path** | The curl shim only downloads; all work happens in Node |
| **Cross-platform** | Node `fs` APIs on Windows, macOS, and Linux; UTF-8 stdio forced for nested Python helpers |
| **Script runtime policy** | New managed scripts are Node `.cjs`; existing `.py` helpers are frozen except for bug fixes |
| **Runtime artifact exclusions** | Tarballs exclude consumer data, workflow runtime directories, audit scratch files, `__pycache__`, and compiled Python files |
| **Interactive catalog** | [jpolvora.github.io/workflow-skills](https://jpolvora.github.io/workflow-skills), generated by `bin/build-site.js` with per-skill dependency badges and full/lite workflow tags |

---

## 12. Recent evolution (0.3.22 → 0.3.34)

Derived from recent commits on `develop` (2026-08-16 → 2026-08-22).

| Version | Date | Headline change |
|---------|------|-----------------|
| **0.3.34** | Aug 22 | Extra demotion (`ws-activity-report`, `ws-fable-domain`, `ws-update-plan-implementation`); merge `ws-patterns-*` into `ws-patterns`; specify-time closure pack (`Out of Scope` / Assumptions, `validate_spec --mode=authoring`, write-spec lookup + `{slug}.context.md`, Step 0 skip-register, lite >5-step valve) |
| **0.3.33** | Aug 22 | scoreAndRefine second pass (score already ≥ 9) reviews the full Pass 1 diff: simplify overengineered ACs/tasks; remove unused workflow-introduced files/tests/methods/classes |
| **0.3.32** | Aug 22 | Runtime audit suggestion categories already shipped; cooperative session leases (`defaults.sessionLeases`, default on) with same-slug exclusive lock + short git critical section; schema/CLI/tests/docs |
| **0.3.31** | Aug 22 | Nested-quote `python -c` / `node -e` audit classify + draft-remediation user-gate; `ws-fix-pr` / `ws-goal-fix-pr` proactive same-class sweep (multi-source discovery before resolve); standalone `ws-write-spec` gates `index.PRD` track via `ws-spec-index` |
| **0.3.30** | Aug 21 | SCM provider parity tests, LF-pinned `bin/skill-integrity.json`, and a site/catalog stamp for the 48-skill inventory |
| **0.3.29** | Aug 21 | Added `ws-spec-explain` (spec/US delivery panorama), `ws-cleanup` (confirm-gated leftover cleanup + `.gitignore` suggestions), and `ws-spec-archive` (harvest `{plansDir}` into `index.PRD` Archive + propose shipped-plan cleanup) to the Workflows package |
| **0.3.22** | Aug 17 | DeepSeek harness hardening (PR #216): inline-dict commit SHA scanning in `validate_state`, the AC9 resume gate retargeted from the base branch to the integration branch, audit config resolved from the repo root, goal-loop runtime confined to `{us-dir}/.runtime` |
| **0.3.23** | Aug 19 | Remote tracker issues now enter through `ws-write-spec` agentic reformulation instead of a raw converter dump, so a GitHub issue or Azure work item becomes a structured spec with real acceptance criteria |
| **0.3.24** | Aug 19 | Subagents must prove they consulted `backend.md`, `frontend.md`, and `MEMORY.md`; fix-mode consults gate on `defaults` flags; pattern templates fall back in memory rather than mutating disk |
| **0.3.25** | Aug 19 | `ws-pre-daily` ported upstream (36-hour standup briefing), with hardened base-branch verification and PR field parsing |
| **0.3.26** | Aug 20 | Self-learning gains a failure reflection hook (no `Learning: N/A` when session friction is high), `PathPattern` compilation with `--match-paths` querying, and an adversarial trigger from `ws-fable-judge` |
| **0.3.27** | Aug 21 | `ws-audit` expanded to audit script errors across **all** workflows — non-zero exits, missing or unrecognized options, unhandled exceptions — plus an Azure DevOps CLI argument-handling fix and a declared `ws-fix-pr` → `ws-audit` dependency |
| **0.3.28** | Aug 21 | Two contracts landed together: the **verify bar raised from 7 to 9** with mandatory `scoreAndRefine` below the bar, and the **SCM parity contract** with `test-provider-parity.js` wired into `npm run test`. The Hermes enhancement set added `sweep_prior_work`, `comment_issue`, and `run_sabotage` scripts, design-intent git history in planning, repo-wide defect-class sweeps during implementation, and CI triage through an extended `check-pr-status` |

**Themes across the window.** Three directions dominate. First, *raising the evidence bar*: the score gate moved to 9, sabotage testing fills the gap when mutation testing is unavailable, and consult proof became a hard requirement. Second, *provider symmetry*: GitHub and Azure DevOps converged on a tested contract so a project can switch hosts without changing the pipeline. Third, *closing the loop outward*: tracker comments on PR creation, prior-work sweeps before planning, and CI failure classification that distinguishes a real regression from a flake.

---

## 13. Full skill catalog

48 skills. Package membership: **W** = Workflows, **E** = Extra. Everything is in Full.

### Orchestrators

| Skill | Pkg | Role |
|-------|-----|------|
| [`ws-spec-to-pr`](.agents/skills/ws-spec-to-pr/SKILL.md) | W | Standard end-to-end pipeline, FSM steps 0–9 |
| [`ws-spec-to-pr-lite`](.agents/skills/ws-spec-to-pr-lite/SKILL.md) | W | Fast pipeline, steps 0–5 |
| [`ws-multi-spec`](.agents/skills/ws-multi-spec/SKILL.md) | W | Sequential batch queue with per-spec flow auto-detection |
| [`ws-fable-method`](.agents/skills/ws-fable-method/SKILL.md) | W | 7-step structured problem-solving loop |

### Pipeline stages

| Skill | Pkg | Role |
|-------|-----|------|
| [`ws-write-spec`](.agents/skills/ws-write-spec/SKILL.md) | W | Draft and reformulate `*.spec.md` from free text or tracker issues |
| [`ws-classify-complexity`](.agents/skills/ws-classify-complexity/SKILL.md) | W | Recommend lite versus standard against `dagThresholds` |
| [`ws-write-plan`](.agents/skills/ws-write-plan/SKILL.md) | W | Turn a spec into a structured implementation plan |
| [`ws-interview`](.agents/skills/ws-interview/SKILL.md) | W | Interrogate a plan for hidden assumptions and ambiguities |
| [`ws-plan-to-tasks`](.agents/skills/ws-plan-to-tasks/SKILL.md) | W | Break a plan into an atomic, dependency-mapped task DAG |
| [`ws-implement-tasks`](.agents/skills/ws-implement-tasks/SKILL.md) | W | Build features from the DAG, or apply surgical review fixes |
| [`ws-verify-plan`](.agents/skills/ws-verify-plan/SKILL.md) | W | Score spec compliance 0–10; gate at ≥ 9 |
| [`ws-code-review`](.agents/skills/ws-code-review/SKILL.md) | W | Two-phase local review with fix → re-review loops |
| [`ws-testing`](.agents/skills/ws-testing/SKILL.md) | W | Unit, integration, E2E, coverage, mutation, sabotage |
| [`ws-ship-pr`](.agents/skills/ws-ship-pr/SKILL.md) | W | Prepare checklist, push, create PR, wait for CI |
| [`ws-fix-pr`](.agents/skills/ws-fix-pr/SKILL.md) | W | Single-pass PR thread resolution; proactive same-class sweep (code, MEMORY, PR context) before resolve; post-round MEMORY/pattern learning for accepted reviewer/CI defects |
| [`ws-goal-fix-pr`](.agents/skills/ws-goal-fix-pr/SKILL.md) | W | Iterative fix-pr rounds until threads hit zero and checks pass; each round records reviewer/CI mistakes into MEMORY (and pattern files when enabled) |
| [`ws-update-plan-implementation`](.agents/skills/ws-update-plan-implementation/SKILL.md) | E | Post-ship QA delta capture, planning, and execution |

### Providers

| Skill | Pkg | Role |
|-------|-----|------|
| [`ws-github-provider`](.agents/skills/ws-github-provider/SKILL.md) | W | GitHub issue → spec and PR operations |
| [`ws-azure-devops-provider`](.agents/skills/ws-azure-devops-provider/SKILL.md) | W | Azure DevOps work item → spec and PR operations |
| [`ws-local-spec-provider`](.agents/skills/ws-local-spec-provider/SKILL.md) | W | Detect, normalize, and register hand-written local specs |

### Spec management

| Skill | Pkg | Role |
|-------|-----|------|
| [`ws-spec-format`](.agents/skills/ws-spec-format/SKILL.md) | W | Canonical spec schema and validator |
| [`ws-spec-index`](.agents/skills/ws-spec-index/SKILL.md) | W | `index.PRD` lifecycle: init, sync, promote, track |
| [`ws-spec-archive`](.agents/skills/ws-spec-archive/SKILL.md) | W | Harvest plan history into `index.PRD` Archive; propose shipped-plan cleanup |
| [`ws-spec-list`](.agents/skills/ws-spec-list/SKILL.md) | W | Dual board of specs versus plan workflows |
| [`ws-spec-from-provider`](.agents/skills/ws-spec-from-provider/SKILL.md) | W | Bulk-import open GH issues / ADO User Stories → write-spec + register |
| [`ws-sync-spec`](.agents/skills/ws-sync-spec/SKILL.md) | W | Update spec bodies when code drifts |

### Quality and audit

| Skill | Pkg | Role |
|-------|-----|------|
| [`ws-senior-developer`](.agents/skills/ws-senior-developer/SKILL.md) | W | Engineering delivery gate and code review proof source |
| [`ws-fable-judge`](.agents/skills/ws-fable-judge/SKILL.md) | W | Adversarial audit of claimed work against git diffs |
| [`ws-fable-domain`](.agents/skills/ws-fable-domain/SKILL.md) | E | Domain adapters: authority, evidence sets, fraud definitions |
| [`ws-secrets-leak-review`](.agents/skills/ws-secrets-leak-review/SKILL.md) | W | Secrets and PII scan with optional pre-commit hook |
| [`ws-preview`](.agents/skills/ws-preview/SKILL.md) | E | External reviewer dry-run without publishing threads |

### Harness and diagnostics

| Skill | Pkg | Role |
|-------|-----|------|
| [`ws-check-harness`](.agents/skills/ws-check-harness/SKILL.md) | W | Meta-harness integrity auditor |
| [`ws-check-workflows`](.agents/skills/ws-check-workflows/SKILL.md) | W | Workflow FSM simulation runner |
| [`ws-doctor`](.agents/skills/ws-doctor/SKILL.md) | W | Read-only install and runtime diagnosis |
| [`ws-audit`](.agents/skills/ws-audit/SKILL.md) | W | Runtime observer; classify-shell-failure; draft-remediation user-gate (issue / draft PR / todo) |
| [`ws-show-harness`](.agents/skills/ws-show-harness/SKILL.md) | E | Session harness snapshot |
| [`ws-write-a-skill`](.agents/skills/ws-write-a-skill/SKILL.md) | E | Skill authoring and optimization protocol |

### Memory and conventions

| Skill | Pkg | Role |
|-------|-----|------|
| [`ws-self-learning`](.agents/skills/ws-self-learning/SKILL.md) | W | Anti-regression memory engine |
| [`ws-patterns`](.agents/skills/ws-patterns/SKILL.md) | W | Backend and frontend architectural / UI preferences engine |
| [`ws-changelog`](.agents/skills/ws-changelog/SKILL.md) | W | Append-only task history writer |
| [`ws-karpathy-guidelines`](.agents/skills/ws-karpathy-guidelines/SKILL.md) | W | Micro diff hygiene guidelines |
| [`ws-tdah`](.agents/skills/ws-tdah/SKILL.md) | W | Action-first reply shape and operational judgment |

### Utility and reporting

| Skill | Pkg | Role |
|-------|-----|------|
| [`ws-configure-project`](.agents/skills/ws-configure-project/SKILL.md) | W | Interactive `config.json` wizard |
| [`ws-goal-loop`](.agents/skills/ws-goal-loop/SKILL.md) | W | Generic convergence loop primitive |
| [`ws-activity-report`](.agents/skills/ws-activity-report/SKILL.md) | E | Timesheet entries for a delivery day |
| [`ws-pre-daily`](.agents/skills/ws-pre-daily/SKILL.md) | W | 36-hour standup briefing |
| [`ws-spec-explain`](.agents/skills/ws-spec-explain/SKILL.md) | W | Spec/US status & delivery panorama |
| [`ws-spec-archive`](.agents/skills/ws-spec-archive/SKILL.md) | W | Archive plan history into `index.PRD`; propose plan-dir cleanup |
| [`ws-cleanup`](.agents/skills/ws-cleanup/SKILL.md) | W | Workflow leftover cleanup with confirm gate |

### Hub (not a skill)

[`ws-shared`](.agents/skills/ws-shared/AGENTS.md) — consumer-owned hub holding `config.json`, `autoload.md`, `gates.md`, `tools.md`, `scm-provider-contract.md`, `config-resolution.md`, `MEMORY.md`, `backend.md`, `frontend.md`, `STACK.md`, and `CHANGELOG.md`.

---

## License

MIT — see [LICENSE](LICENSE).
