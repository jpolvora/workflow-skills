---
id: null
slug: unique-skill-script-runtime
title: "Unique Node runtime for all workflow-skills helper scripts"
source: local
specDate: 2026-08-22
---

# Specification — Unique Node runtime for all workflow-skills helper scripts

## Description

Make **Node 22** the only language a shipped `workflow-skills` skill may depend on. Rewrite or delete every packaged Python helper (including dual `.py`/`.cjs` copies), retarget every recipe, and encode the rule in root `AGENTS.md` plus `SKILL_AUTHORING.md` so new skills cannot reintroduce a second runtime.

### Decision (locked)

**Canonical runtime: Node.** Not Python. Not a dual stack.

| Candidate | Verdict | Why |
|-----------|---------|-----|
| **Node 22** | **Chosen** | Installer/CLI (`bin/cli.js`), site builder, integrity, package tests, and live orchestrator surfaces are already Node. `config.json` stack id is `node-skills-package`. New managed scripts are already `.cjs`. Zero runtime npm dependencies. |
| Python | Rejected | Would require rewriting `bin/`, `test/`, integrity, and the npx/curl install path. Larger blast radius than finishing the existing Node ports. |
| Dual Node+Python | Rejected | Consumers still need both interpreters. Dual files drift (MEMORY: launcher fixtures and resolver parent-count bugs). `SKILL_AUTHORING.md` forbids dual-path ambiguity. |

Bash is **not** a skill language. Keep `*.sh` only as a thin host adapter that immediately `exec`s `node` (git hook file, `install-skills.sh` curl shim). Scanner/verify/preview/detect-base logic moves to `.cjs`.

### Problem

The freeze policy shipped with harness-efficiency (FEATURES **Script runtime policy**, README **Script runtimes**, PR #223) said: new scripts are Node `.cjs`; existing `.py` stay except bug fixes. That staging left:

- **26** Python files under `.agents/skills/` (inventory 2026-08-22).
- Dual copies for the same job (`update_state.py`+`.cjs`, `validate_state.py`+`.cjs` standard and lite, `register_local_spec`, `detect_specs_dir`, `self_learning`, `resolve_consumer_root`).
- Python-only providers and gates (`github-issue-to-spec.py`, `ado-workitem-to-spec.py`, `sweep_prior_work.py`, `comment_issue.py`, `fix_pr_azure_context.py`, `check_workflows.py`, `configure_autoload.py`, `run_sabotage.py`, `check_memory_conflict.py`, `cleanup_workflow_git.py`, activity-report and pre-daily collectors).
- Package tests that **spawn Python** (`test-hybrid-consumer-root.js`, `test-autoload-configure.js`, `test-update-state-yaml.js`, `test-quality-gates.js`, `test-ws-pre-daily.js`, `test-cleanup-workflow-git.js`, `test-infer-human-timing.js`) plus `npm run tests:harness-efficiency` calling `python …/check_workflows.py`.
- Tests that **assert frozen Python still exists** (`test-node-helper-ports.js`, `test-package-runtime-exclusions.js`).
- Recipes and dogfood still naming `.py` (root `AGENTS.md` session contract `self_learning.py` / `register_local_spec.py`, `config.json.example` tracker script keys, `bin/generate-skill-evals.js`, `bin/cli.js` help).

Consumers of a Node-only package still need Python on PATH to run leftovers. Agents hesitate between launchers. Hybrid/global resolvers exist twice and can diverge.

### Target architecture

1. **Packaged skill helpers** under `{skillsRoot}/**/scripts/` are Node **`.cjs`** (CommonJS so they `require()` shared helpers regardless of root `"type": "module"`). Existing skill-side `.js` helpers (`doctor.js`, `audit_log.js`) either stay Node-launched or are renamed `.cjs` in the same change; they are not a second language.
2. **Installer / authoring CLI** under `bin/` stays Node ESM (`.js` / `.cjs` as today). No Python in `bin/`.
3. **Shared runtime** is `{skillsRoot}/ws-shared/scripts/*.cjs` only (`resolve_consumer_root.cjs`, `workflow_state.cjs`, and siblings). Delete `resolve_consumer_root.py`.
4. **Recipes** use `node {expanded-path}` only. `bash` only for the thin adapters in AC12. Never `python`.
5. **Consumer contract:** installing or running this package requires **Node ≥ 22**. Python is not a dependency of any skill, installer, or `npm run test` path.
6. **Authoring contract:** root `AGENTS.md` and `SKILL_AUTHORING.md` state the unique-runtime rule. `ws-check-harness` fails closed if a packaged `.py` reappears.

### Behavior preservation

Each deleted `.py` helper has a Node replacement that keeps the same CLI flags, stdout contract (including `--json`), and exit codes (0 success, non-zero mapped the same as today for missing inputs vs validation failure). Dual files already ported keep the **`.cjs` as SoT** and drop the `.py`. Provider intents (`fetch-to-spec`, `sweep-prior-work`, `comment-issue`, `list-threads`, `resolve-thread`) do not change names; only the launched file does.

### Out of scope

- Consumer application languages (C#, Python apps, etc.).
- Host/IDE product coupling.
- Historical MEMORY / changelog entries that mention Python (leave as history).
- Adding npm runtime dependencies to skill scripts or `bin/cli.js`.
- Reopening harness-efficiency workstreams other than retiring the frozen-Python exception.

This spec **supersedes** harness-efficiency notes that said “Python remains supported/frozen.” That freeze was a staging policy, not the end state.

## Acceptance Criteria

- AC1: The unique packaged skill/installer/test runtime is Node 22; no shipped skill, `bin/` entry, or `package.json` script requires a Python interpreter.
- AC2: Root `AGENTS.md` contains a mandatory section titled `Skill script runtime (mandatory)` that states: packaged helpers under `.agents/skills/**/scripts/` and `bin/` are Node only; new `.py` is forbidden; recipes use `node` (plus `bash` only for AC12 adapters); Python is not a consumer dependency of this package.
- AC3: `.agents/skills/ws-write-a-skill/SKILL_AUTHORING.md` contains a matching mandatory section (new numbered section after current §9) that forbids authoring `.py` skill helpers, requires `.cjs` for new skill scripts, and replaces the `python scripts/validate_json.py` tool-anchor example with a `node …/validate_json.cjs` example.
- AC4: `.agents/skills/ws-write-a-skill/SKILL.md` Draft step and Audit Checklist require explicit `node` / `bash` launchers only (`python` removed from the required launcher list).
- AC5: `{sharedDir}/tools.md` § Script launchers drops the `*.py` / `python` row; remaining rows are `*.cjs`/`*.js` → `node` and `*.sh` → `bash` with the AC12 thin-adapter constraint; `run-script` and Rules items no longer list `python` as a managed launcher.
- AC6: `{sharedDir}/CROSS-PLATFORM.md` drops Python UTF-8 launch rules as a packaged-script contract; Node UTF-8 stdio and explicit `node`/`bash` launchers remain.
- AC7: `{sharedDir}/AGENTS.md` Managed-script-calls and Cross-platform rows, plus the `scripts/` hub table, name only Node resolvers (`resolve_consumer_root.cjs`) and do not instruct `python -m py_compile` for packaged skills (use `node --check` for Node helpers).
- AC8: `README.md` and `FEATURES.md` replace the frozen-Python script-runtime policy with: Node is required; packaged skill scripts are Node only; Python is not required to install or run skills.
- AC9: After the change, `git ls-files -- '.agents/skills/**/*.py' 'bin/**/*.py'` prints zero paths, and no hashed skill tree contains `__pycache__` as a required artifact.
- AC10: Dual `.py` copies are deleted once the sibling `.cjs` is the invoked SoT: `update_state` and `validate_state` (standard and lite), `register_local_spec`, `detect_specs_dir`, `self_learning`, `resolve_consumer_root`.
- AC11: Every remaining Python-only helper is rewritten to `.cjs` with equal CLI flags, `--json` shape when present, and exit-code mapping: `github-issue-to-spec`, `ado-workitem-to-spec`, `sweep_prior_work`, `comment_issue`, `fix_pr_azure_context` (provider + `ws-fix-pr` shim), `check_workflows`, `configure_autoload`, `run_sabotage`, `check_memory_conflict`, `cleanup_workflow_git`, `bootstrap_start`, `infer_human_timing`, `collect_window`, plus any other `git ls-files '*.py'` hit under `.agents/skills/` at start of implementation.
- AC12: `*.sh` under the package may remain only when an external host must invoke a shell file (`install-skills.sh` curl shim, git hook entry `pre-commit.sh` / `install-hook.sh`); those files contain no business logic beyond locating Node and `exec`ing a `.cjs`. `secrets_scanner.sh`, `detect-base-branch.sh`, `verify.sh`, and `run_dry_run.sh` become Node `.cjs` (optional one-line `exec` shim allowed).
- AC13: `{sharedDir}/config.json.example` (and live dogfood `config.json` keys) `issueToSpecScript` / `workItemToSpecScript` point at the Node `.cjs` paths, and no config template documents a `.py` helper.
- AC14: `package.json` `scripts.test`, `scripts.tests`, and `scripts.tests:harness-efficiency` invoke no `python` binary; `check_workflows` runs via `node …/check_workflows.cjs`.
- AC15: `npm run test` exits 0 in a environment where `python` / `python3` are absent from `PATH` (proven by a focused test that runs the packaged helper suite with `PATH` stripped of Python, or by CI documentation plus an in-repo assertion that no test file `spawnSync`s `python`/`python3`).
- AC16: `package.json` declares `"engines": { "node": ">=22" }` and README install notes state Node 22+ as the only interpreter requirement for this package.
- AC17: `ws-check-harness` (a Phase in `PHASES.md` plus a mechanical check) reports **critical** when any `.py` exists under `.agents/skills/` or `bin/` in this upstream tree, and a unit/integration test covers that failure.
- AC18: `bin/generate-skill-evals.js` expected recipes and `bin/cli.js` help/compile examples that name `*.py` are rewritten to the Node `.cjs` paths and `node` launcher.
- AC19: `{sharedDir}/STACK.md.example` and dogfood `STACK.md` script-launcher notes list `node` / `bash` only.
- AC20: Root `AGENTS.md` § Upstream session contract compile/register examples use `node .agents/skills/ws-self-learning/scripts/self_learning.cjs` and `node .agents/skills/ws-local-spec-provider/scripts/register_local_spec.cjs` (no `.py`).
- AC21: `install-skills.sh` no longer exports `PYTHONUTF8` / `PYTHONIOENCODING` as part of the install contract (UTF-8 remains via `LANG`/`LC_ALL` and Node stdio).
- AC22: Tests that currently spawn Python or assert frozen `.py` files exist (`test-node-helper-ports.js`, `test-package-runtime-exclusions.js`, `test-hybrid-consumer-root.js`, `test-autoload-configure.js`, `test-update-state-yaml.js`, `test-quality-gates.js`, `test-ws-pre-daily.js`, `test-cleanup-workflow-git.js`, `test-infer-human-timing.js`, and any sibling that imports `PYTHON`) are retargeted at the `.cjs` surfaces and fail if they spawn `python`.
- AC23: Skill and hub docs that still instruct `python {skillsRoot}/…/*.py` (orchestrators, providers, `ws-local-spec-provider`, `ws-self-learning`, `ws-configure-project`, `ws-check-workflows`, `ws-testing`, `ws-activity-report`, `ws-pre-daily`, `ws-fix-pr` README) invoke `node …/*.cjs` instead; `test-runtime-portability.js` continues to reject `.py` in those live recipes.
- AC24: After the tree change, `npm run generate-integrity` is committed with `bin/skill-integrity.json`, `npm run verify-integrity` exits 0, and `ws-check-harness` reports 0 critical findings on the unique-runtime rule.
- AC25: New skill scripts add no npm runtime dependencies; they use Node stdlib plus existing in-repo `.cjs` helpers (`resolve_consumer_root.cjs`, `workflow_state.cjs`).
- AC26: `CATALOG.md` / site copy generated from the catalog does not tell consumers they need Python to run leftover helpers.

## Original Issue Context

Free-text request (2026-08-22): create a spec for refactoring/rewriting all helper scripts for workflow-skills (including shared scripts, installer, etc.) onto a unique stack (Node vs Python), and add a rule in `AGENTS.md` and skill-authoring rules, so skills depend on only one language.

### Prior Work Sweep

Keywords: script runtime, frozen Python, Node `.cjs` ports, unique stack, launchers.

- **No open PR** for “delete Python / unique runtime.” Related merged work is the freeze-and-port, not the deletion.
- **PR #223** (merged 2026-08-21): harness efficiency 0.3.29. Ported orchestrator/live surfaces to Node `.cjs`; **explicitly kept frozen Python** (`test-node-helper-ports.js` asserts `.py` still packaged; FEATURES “existing `.py` helpers are frozen except for bug fixes”).
- **PR #219 / us-220**: ported `ws-pre-daily` into this repo; collector remains Python (`collect_window.py`).
- **PR #212 / us-211**: hybrid consumer-root resolver; dual `resolve_consumer_root.py` + `.cjs`.
- **PR #176**: `SKILL_AUTHORING.md` + global config gate; tool-anchor example is still `python scripts/validate_json.py`.
- **Issue #204** (closed): `register_local_spec.py` missing explicit launcher in provider docs (launcher hygiene, not unique-stack).
- **Local git:** `76c9795` harness-efficiency implementation; `README.md` / `FEATURES.md` still document dual runtime; `package.json` `tests:harness-efficiency` still calls `python …/check_workflows.py`.
- **Duplicate risk:** do not treat harness-efficiency “Python remains supported” as a conflicting open delivery. This spec retires that exception.

### Design Intent

Inspected current policy and history (`FEATURES.md` Script runtime policy, `README.md` Script runtimes, `test-node-helper-ports.js`, harness-efficiency spec AC notes, `git log` on helpers).

- Dual Node+Python is **intentional staging**, not an accidental gap: live recipes were moved to `.cjs` while `.py` was frozen for parity and rollback.
- Leaving `.py` forever would contradict the unique-stack request and keep a consumer Python dependency after the installer is already Node-only.
- Choosing Python as the unique stack would discard the installer/CLI/test/integrity Node investment.
- Therefore this change **completes** the Node migration and **deletes** the freeze exception. It does not restore a removed Python-only world.

## Child Tasks

### Task T1 — Delete duals (CJS already SoT)

- **Status:** pending
- **Description:** Remove the six dual `.py` files in AC10; retarget remaining tests/docs; prove standard/lite state, register, memory compile, and consumer-root resolution via `.cjs` only.

### Task T2 — Port provider and gate Python-only helpers

- **Status:** pending
- **Description:** Rewrite GitHub/Azure converters, sweep, comment, Azure fix-pr context, and `ws-fix-pr` shims to `.cjs`. Keep SCM intent names. Update `config.json.example` script keys (AC13). Prove with `test-provider-parity.js` plus focused CLI fixtures.

### Task T3 — Port remaining unique helpers

- **Status:** pending
- **Description:** `check_workflows`, `configure_autoload`, `run_sabotage`, `check_memory_conflict`, `cleanup_workflow_git`, activity-report clocks, `collect_window`. Wire `package.json` test scripts to `node` (AC14).

### Task T4 — Thin bash adapters only

- **Status:** pending
- **Description:** Move scanner / detect-base / verify / preview logic to `.cjs`. Leave only host-required shell entrypoints that `exec node` (AC12). Strip Python env exports from `install-skills.sh` (AC21).

### Task T5 — Rules and docs

- **Status:** pending
- **Description:** AC2–AC8, AC16, AC18–AC20, AC23, AC26: root `AGENTS.md`, `SKILL_AUTHORING.md`, `ws-write-a-skill/SKILL.md`, `tools.md`, `CROSS-PLATFORM.md`, hub `AGENTS.md`, STACK, README, FEATURES, evals, session-contract recipes, CATALOG/site as required by harness change protocol.

### Task T6 — Tests, harness gate, integrity

- **Status:** pending
- **Description:** AC15, AC17, AC22, AC24, AC25: retarget Python-spawning tests, add check-harness critical on `.py`, generate/verify integrity, `npm run test` without Python.

## Notes

- **Node 22 / `.cjs`:** Root `package.json` has `"type": "module"`. Skill helpers stay `.cjs` so they can `require()` `{skillsRoot}/ws-shared/scripts/*.cjs` without ESM conversion of the whole tree.
- **Zero npm deps:** Ports must not add `dependencies` / `devDependencies` needed at skill runtime. Tests may keep using Node built-ins.
- **Parity traps (MEMORY):** When changing a shipped recipe, migrate focused launcher/fixture assertions in the same change. Do not count `parents` from `__filename` without a project-local installed-layout fixture. Do not map “missing MEMORY.md” to a hard STOP (hybrid installs). Skip Azure remote detection on resolve-thread `--dry-run`.
- **Harness protocol:** This change touches skills, `AGENTS.md`, README, FEATURES, and likely `docs/` via `npm run build-site:bump` when the catalog/footer needs a version stamp. Integrity regenerates in the same delivery as hashed script edits.
- **Implementation order:** T1 (delete duals) is the cheapest proof that live surfaces already run on Node. T5 can land in the same PR as T1 so the rule exists before T2–T4 ports, or in the final PR if this ships as one change. Do not leave a merged tree that deletes `.py` while recipes still say `python`.
- **Consumer PATH:** After ship, a machine with Node 22 and without Python must install via npx and run packaged helpers used by skills.
- **Agent temp scripts:** Session advice that currently prefers `python -m py_compile` for one-off scans should prefer `node --check` on real `.cjs` paths (AC7). That does not ban a consumer repo from using Python in *its* product code.
