# Changelog

### [2026-07-17 13:55] Agent: Cursor Grok
- **Prompt**: US 60 AC6 — CLI create-if-missing seeds for root `.cursorrules` and `CHANGELOG.md` plus install tests
- **Done**: Added `ensureRootConsumerSeeds()` in `bin/cli.js` (hooked after hub consumer artifacts); documented in CLI help and README; Phase 10 in `test/test-install.js` asserts create-once and no-clobber
- **Result**: `npm run tests -- --local` pass; existing root files never overwritten

### [2026-07-17] Agent: Cursor Grok
- **Prompt**: Enforce AGENTS.md = agent README, README.md = human README; rewrite both as needed.
- **Done**: Rewrote root `AGENTS.md` (audience banner, doc-roles table, agent contracts) and `README.md` (human install/overview/contribute); aligned `.agents/AGENTS.md`, `shared/AGENTS.md`, `check-harness` hub table, and site footer with the same split.
- **Result**: Clear audience separation; facts (install commands, preserved `shared/` files) stay aligned across both docs.

### [2026-07-13 16:55] Agent: Cursor Composer
- **Prompt**: Fix remaining UTF-8 encoding problems in Python scripts across the project; record as important learning.
- **Done**: Hardened all skill Python entrypoints with `ensure_utf8_stdio()`; fixed `11-ship-pr/scripts/verify.sh` `python -c` config reads to `Path.read_text(encoding='utf-8')`; set `subprocess.run(..., text=True, encoding='utf-8')` in both `update_state.py` variants; appended MEMORY trap for Windows cp1252 vs UTF-8.
- **Result**: 14 Python scripts compile clean; no remaining bare text opens in skill scripts (security-review examples excluded).

### 2026-07-13 — Consumer audit follow-ups (portability + rename residue)
- **Prompt**: Promote generic harness fixes from FiscalWR check-harness audit into workflow-skills.
- **Done**: Fixed `spec-to-pr` Step 6 dispatch (`05-verify-plan`); corrected relative links (`plan-delta-template`, config.json links inside skill); pointed karpathy/senior-developer refs at shipped extra-skills + `AGENTS.md` § External Dependencies; fixed UTF-8 `§`/`·`; updated `config.json.example` karpathy path; documented dual-hub consumers; soft-warn ADO legacy fallback; added `specs/domains/index.md.example`; check-harness detects retired skill ids.
- **Result**: Pending local validation / commit by maintainer.

### 2026-07-12 — Force AskQuestion + fix validate_state REPO_ROOT
- **Prompt**: Promote FiscalWR consumer fixes for `spec-to-pr` gates and state validation into upstream workflow-skills.
- **Done**: Added § AskQuestion requirement (FORCE invoke / probe / fallback-only-after-failure) in `spec-to-pr/SKILL.md` and `tools.md`; fixed `validate_state.py` `REPO_ROOT` to `parents[4]` (was resolving to `.agents`); shipped `cursor-rules/ask-question-gates.mdc` (+ hub `.cursor/rules/` copy); setup bootstrap copies the rule when missing; FAQ + MEMORY traps updated.
- **Result**: Consumer gate UX and state-path resolution match the corrected FiscalWR harness.

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

### [2026-07-15 21:45] Agent: Cursor Grok
- **Prompt**: Apply full spec-to-pr optimization plan; keep dual-mode compatible with lite; optimize lite too.
- **Done**: Added shared/gates.md + config-resolution.md; slimmed transitions (Advance/More); collapsed delivery+ship gates; formalized complexity/stub plan; conditional interview; quick-score verify; fixed --full/docs contradictions; deduped config/SCM to shared/config.json across 08/09/11/providers; rewrote lite orch for gate parity; updated FAQ/DIAGRAM/README/AGENTS.
- **Result**: check-workflows PASSED; orch 957→865 lines; dual-mode contracts documented. Optional: check-harness + build-site.

### [2026-07-15 22:10] Agent: Cursor Grok
- **Prompt**: Apply all check-harness Phase 7 corrections (H1–H7 + S1–S5).
- **Done**: Fixed shared-config primary paths in hubs; en-us DIAGRAM/TEMPLATE/tdd-reviewer; check-workflows prose + relative script link; domain-review REPORT link; shared AGENTS hyperlinks; FAQ/DIAGRAM dual-mode pointers; Task router check-workflows row; rebuilt site catalog.
- **Result**: H1–H7 + S1–S5 applied; check-workflows PASSED; docs/index.html regenerated (package 0.0.24).

### [2026-07-16 06:05] Agent: Cursor Grok
- **Prompt**: Promote shared skills to top-level installables; packages Full/Workflows/Extra; dep map + site section; ship via full auto spec-to-pr.
- **Done**: Moved 7 skills to `.agents/skills/<name>/`; `skill-dependencies.json` + CLI packages/migration; harness/site/README/tests; PR #55 develop→main.
- **Result**: Merged https://github.com/jpolvora/workflow-skills/pull/55 (merge `4ed6d3a`); Agentic Code Review passed; workflow complete.

### [2026-07-17 11:15] Agent: Cursor Composer
- **Prompt**: Update obsolete bash curl install; pair with npx install.
- **Done**: Replaced flat-copy `install-skills.sh` with thin shim → local `bin/cli.js` or `npx --yes github:jpolvora/workflow-skills`; updated README, `docs/index.html` curl section, and CLI help note.
- **Result**: `bash install-skills.sh --help` delegates to Node CLI; curl path shares same argv (`bash -s -- install --full --yes`).

### [2026-07-17 11:25] Agent: Cursor Composer
- **Prompt**: Never leak upstream MEMORY.md / project-specific artifacts to consumer installs; seed fresh or preserve existing.
- **Done**: Installer never copies `MEMORY.md`/`memory/`/`config.json` from upstream; seeds empty `MEMORY.md` from template; npm pack excludes compiled memory + `shared/config.json`; fixed `check_memory_conflict.py` MEMORY path; Phase 9 install tests.
- **Result**: `npm run tests -- --local` passed including MEMORY isolation; pack dry-run has no leaked memory/config.json.

### [2026-07-17 11:35] Agent: Cursor Composer
- **Prompt**: check-harness apply all — shared hub owns consumer data (MEMORY, stack, config).
- **Done**: Moved MEMORY to `shared/`; `stack.md.example` + preserve/seed `stack.md`; installer migration from legacy self-learning paths; docs/task routers/`self_learning.py`/tests updated.
- **Result**: Harness OK post-correction; `npm run tests -- --local` passed (Phases 5+9 cover shared memory/stack).

### [2026-07-17 11:40] Agent: Cursor Composer
- **Prompt**: Update README/AGENTS, website install cards (wide, one cmd/row, copy), npx + bash installers.
- **Done**: Synced consumer-owned `shared/` docs; `#install` full-width cards with per-command Copy; CLI help + curl shim banners; `verify.sh` PYTHONUTF8 for python -c.
- **Result**: Docs/installers/site aligned on `npx --yes` and shared consumer data contract.
