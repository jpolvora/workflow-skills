# Changelog

### 2026-07-12 — Spec entry: GitHub, Azure DevOps, hand-written
- **Prompt**: Ensure compatibility with gh, ADO, and hand-written specs.
- **Done**: Added `ado-workitem-to-spec.py`; expanded Specification Protocol with concrete fetch/register steps for GitHub (`gh` + `github-issue-to-spec.py`), Azure DevOps (`ADO {id}` / `{org}/{project}#{id}`), and local `*.spec.md` copy/normalize; updated ARTIFACTS, FAQ, README, spec-format, config.example.
- **Result**: Install tests pass; offline ADO/GitHub converters smoke-tested.

### 2026-07-12 — Rename orchestrator `us-workflow` → `spec-to-pr`
- **Prompt**: Rename us-workflow to spec-to-pr across the multi-workflow hub; migrate consumers.
- **Done**: Renamed skill folder and all references; legacy invoke aliases kept; CLI `update` migrates `us-workflow` → `spec-to-pr` preserving `config.json`; AGENTS/README frame repo as multi-workflow hub; runtime tokens `uswf/` and `us-{id}` unchanged.
- **Result**: Catalog rebuilt; install tests cover rename migration.

### 2026-07-12 02:47 Agent: opencode
- **Prompt**: Add .yml/.yaml scanning to secrets-leak-review skill and ship PR
- **Done**: Added general yml/yaml tracked-file detection to secrets_scanner.sh, added yml/yaml patterns to .gitignore audit in both script and SKILL.md, added dedicated YAML content scan command for common secret key names, added sensitive file patterns (.env, *.pem, *.key, etc.) to .gitignore
- **Result**: PR #16 merged to main

### 2026-07-12 03:01 Agent: opencode
- **Prompt**: ship-pr (11-ship-pr pipeline)
- **Done**: Fixed merge instruction in SKILL.md — removed `--delete-branch` to never delete branch after merge
- **Result**: PR #18 merged to main

### 2026-07-12 14:31 Agent: Antigravity
- **Prompt**: Create an install test for workflow-skills consumed by a test project and update AGENTS.md to allow install from remote only for the test/ folder.
- **Done**: Modified AGENTS.md to allow remote installation only within the test/ directory. Created a test/ folder, initialized an empty package.json inside it, packed workflow-skills as a tarball, ran a clean npm installation of the packaged dependency inside test/ using the interactive installer, added a .gitignore to ignore .agents/ and node_modules/, added an automated test script (test/test-install.js), registered "npm run tests" in the root package.json, updated README.md and AGENTS.md with safety, reliability, and verification documentation, and documented the website catalog build process.
- **Result**: Successfully verified installation by populating L:\source\workflow-skills\test\.agents\skills\ with all 29 skills, all of which are correctly ignored from version control. Both remote installation (npx github:jpolvora/workflow-skills) and local installer tests pass fully, documentation has been updated, and Pull Request #19 to main has been created.

### 2026-07-12 14:53 Agent: Antigravity
- **Prompt**: Review the spec-to-pr edge-to-edge process, execute it in dry-run mode, find opportunities to enhance/compact/stabilize it, and implement improvements.
- **Done**: Simulated the end-to-end dry-run execution of `spec-to-pr` for `specs/test-workflow.spec.md` by generating all expected plans and state files under `.cursor/plans/test-workflow/`. Created `update_state.py` to automate state hygiene updates and step transitions, avoiding manual markdown/yaml editing errors. Fixed list parsing type-conversion bugs in `update_state.py` to prevent sorting errors. Updated `SKILL.md` to reference `update_state.py` while keeping a manual fallback. Cleaned up simulated folders, ran local skill package tests, and rebuilt the catalog website.
- **Result**: The dry-run state validator passes fully, local installation tests pass cleanly, and the catalog website is updated.

### 2026-07-12 15:10 Agent: Antigravity
- **Prompt**: Improve/enhance artifacts naming for each step of spec-to-pr with step prefixes, translate legacy Portuguese to English, and improve project portability.
- **Done**: Renamed all step-generated artifact filenames to step-prefixed format (e.g., `step-01-{slug}.plan.md`, `step-12-{slug}.result.md`) across orchestrator logic, downstream skills, README, and test suites. Translated legacy Portuguese text to English (en-us) in `validate_state.py`, `check_memory_conflict.py`, `github-issue-to-spec.py`, `domain-review`, `multi-domain-review`, and `09-goal-fix-pr`. Generalized hardcoded `Matrix` solutions, namespaces, and build/test commands to make skills portable. Added language compliance and portability scan phases to `check-harness.md`.
- **Result**: Successfully ran packaging tests (`npm run tests -- --local`) and rebuilt site catalog. All 29 skills packaged and verified.

### 2026-07-12 15:20 Agent: Antigravity
- **Prompt**: Separate Step 2 refinement output to step-02-{slug}.plan.refined.md, add refinement status metadata, and implement fallback logic in Step 3.
- **Done**: Configured `01-write-plan` to output plan files with `status: "plan to be refined"`. Configured `02-interview` to output refined plans to `step-02-{slug}.plan.refined.md` with updated status `"plan refined ok"`. Modified `03-plan-to-tasks` to check for `step-02` refined plan and fall back to `step-01` if Step 2 was bypassed. Updated orchestrator definitions, artifact lists, Delivery Result, and Cleanup protocols in `spec-to-pr` to integrate and preserve the step-02 refined plan.
- **Result**: Installation and package tests pass cleanly, catalog site successfully updated.


### [2026-07-13 10:35] Agent: Composer
- **Prompt**: Step 5 L2 / T8 — Wire 00-write-spec optional mirror to local-spec-provider
- **Done**: Updated `.agents/skills/00-write-spec/SKILL.md` (v3.2) with optional `--mirror` flag, post-draft pipeline step delegating to `register_local_spec.py --mirror`, and dual-mode notes. Canonical remains `{us-dir}/step-00-{slug}.spec.md`.
- **Result**: T8 acceptance met; no commit.

### [2026-07-13 10:40] Agent: Composer
- **Prompt**: Step 5 L3 / T9 — Wire 11-ship-pr to providers.scm
- **Done**: Updated `.agents/skills/11-ship-pr/SKILL.md` (v1.3) Phases 4–6 to resolve `providers.scm`, load github/azure-devops provider, and dispatch `create-pr` / checks / `merge-pr`. Removed GitHub-only `gh pr` happy path; kept dual-mode and never-delete workingBranch rule.
- **Result**: T9 acceptance met; no commit.

### [2026-07-13 10:45] Agent: Composer
- **Prompt**: Step 5 L4 / T13 — Update install tests for providers + shims
- **Done**: Extended `test/test-install.js` Phase 0b/2: assert three provider SKILL.md + dual-mode smoke, canonical converter scripts, AC9 shim paths under `spec-to-pr/scripts/`, `providers.active`/`scm` in config example; prefer removing a provider when testing `--include-new`; document consumer `--include-new` in test comments.
- **Result**: `npm run tests -- --local` exit 0.

### [2026-07-13 10:50] Agent: Composer
- **Prompt**: Step 5 L5 / T14 — Docs polish + build-site
- **Done**: Strengthened root README `update --include-new` for the three provider skills; updated `spec-to-pr/tools.md` SCM tools to resolve via providers; added FAQ section for provider paths + `--include-new`. Regenerated `docs/index.html` via `node bin/build-site.js` (33 skills, providers listed).
- **Result**: T14 acceptance met; Step 5 DAG T1–T14 complete; no commit of `.cursor/plans/`.
