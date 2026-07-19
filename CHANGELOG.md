# Changelog

### [2026-07-19 04:25] Agent: Cursor Grok
- **Prompt**: Fix contract drift after FSM redesign
- **Done**: Aligned agent-facing contracts to steps 0–9: `04-implement-tasks` (Step 4 build / 6–7 fix; `step-06`/`step-07` findings), `11-update-plan-implementation` plan-delta (`step-08` result), `spec-to-pr-run-test.md`, `validate_state.py` comment, `stack.md.example` + `config.json.example` invariant key, root `STACK.md`; MEMORY entry compiled
- **Result**: Pipeline skill step/artifact refs match orch FSM. FAQ body still LEGACY-bannered (intentional). Ask before check-harness / site.

### [2026-07-19 04:15] Agent: Cursor Grok
- **Prompt**: Update check-harness skill to notice the new structure of skills and paths
- **Done**: Added § 3b canonical pipeline map (`00`–`11`, `ws-*`, FSM steps); retired-id table (`07-integration-validation`→`07-testing`, ship/fix renumbers); Phase 2 spot-check + Step↔folder / dual-hub checks; Phase 5 FSM map + folder matching; Phase 4b `skill-dependencies.json`; version `3.2-generic`
- **Result**: check-harness aligned with post-rename pipeline layout

### [2026-07-19 04:05] Agent: Cursor Grok
- **Prompt**: Rename integration-validation to testing; check FSM redesign plan for missed items
- **Done**: Renamed `07-integration-validation` → `07-testing` (`ws-testing`, deprecated aliases kept); fixed hubs/deps/site; rewrote stale `DIAGRAM.md` + `spec-to-pr/README.md` for FSM 0–9; FAQ legacy banner; gates Testing wording; orch frontmatter flag-combine notes; package `0.0.44`
- **Result**: `check-workflows` and `npm run tests -- --local` passed. FAQ body still legacy-numbered (bannered).

### [2026-07-19 03:55] Agent: Cursor Grok
- **Prompt**: Rename skill folders according to step order and skill names
- **Done**: Renumbered pipeline folders to match FSM steps: `11-ship-pr`→`08-ship-pr`, `08-fix-pr`→`09-fix-pr`, `09-goal-fix-pr`→`10-goal-fix-pr`, `10-update-plan-implementation`→`11-update-plan-implementation`; updated hubs, deps JSON, live refs, `test/` fixture, site catalog (`0.0.43`)
- **Result**: `check-workflows` and `npm run tests -- --local` passed

### [2026-07-19 03:50] Agent: Composer
- **Prompt**: Implement Spec-to-PR reduced FSM redesign (standard 0–9, lite 0–5): plan→interview, check score gate, review fix substep, Testing step, combined ship, first-class fix-pr, shared entry, universal step controls
- **Done**: Rewrote `spec-to-pr` and `spec-to-pr-lite` orchestrators, `STEP-DISPATCH.md`, `ARTIFACTS.md`, protocols, `shared/gates.md`, `shared/setup.md`, pipeline skills `05`–`07`/`09`/`11`, `check_workflows.py`, dual `AGENTS.md`, README, site catalog tagline
- **Result**: `check-workflows` and `npm run tests -- --local` passed

### [2026-07-19 00:36] Agent: Antigravity
- **Prompt**: ensure ship-pr skill will run check commit status, pull, push, create pr for current scm config, monitor pr with goal-fix-pr and merge at the end; ensure spec-to-pr (subagents) and spec-to-pr-lite (inline) run independently sharing the same steps
- **Done**: Updated `ws-ship-pr` in `.agents/skills/11-ship-pr/SKILL.md` to explicitly specify checking commit status, pulling remote updates, pushing local changes, creating a PR using the SCM configuration, monitoring PR review threads using `goal-fix-pr`, and merging. Documented independent execution and state isolation between `spec-to-pr` (standard) and `spec-to-pr-lite` (lite) using `workflowType`. Updated `spec-to-pr-lite/SKILL.md` to explicitly instruct inline execution for all step tasks within the main session, in contrast to the standard orchestrator's subagent task dispatching. Updated root `AGENTS.md` and packaged `.agents/AGENTS.md`.
- **Result**: Re-compiled site (bumped package to `0.0.40`). Validated E2E installation test suites and workflow FSM step continuity checks successfully.

### [2026-07-18 19:59] Agent: Antigravity
- **Prompt**: update README.md and AGENTS.md, website for self-Contained and Non-Intrusive Installation Process
- **Done**: Updated `README.md` and `AGENTS.md` to document the optional consumer-configured root files (`.cursorrules` pointer and `CHANGELOG.md` history) instead of describing them as automatic installer seeds, matching the new clean and non-intrusive installer behavior. Re-compiled the website catalog to version `0.0.39`.
- **Result**: Validated E2E installation test suite and checked documentation alignment.

### [2026-07-18 19:57] Agent: Antigravity
- **Prompt**: inspect deeply the installation process (npx, bash) and remove changes to consumers when installing/consuming workflow skills. Make workflows compatible, generic, portalble, self-contained, focused on its tasks and do not force/require that the consumer should make modifications in his harness.
- **Done**: Removed consumer root-level side effects (seeding `.cursorrules` and `CHANGELOG.md`) from `bin/cli.js` to ensure the installation is completely self-contained under `.agents/` and does not write files outside `.agents/` in the consumer's repository. Updated E2E test assertions in `test/test-install.js` to reflect the clean installer behavior and bumped package version to `0.0.38`.
- **Result**: Checked and confirmed E2E install tree verification tests PASSED successfully.

### [2026-07-18 19:55] Agent: Antigravity
- **Prompt**: scan contents of worfklow skills and remove / replace Cursor text in skills or any other references to specific ides/harnesses. Use IDE/generic keywords.. Make skills contents compact, generic, portable.
- **Done**: Removed specific IDE references to "Cursor" (such as "switch in Cursor" and "Cursor model picker") from the instructional texts in `spec-to-pr-lite/SKILL.md`, `spec-to-pr/SKILL.md`, `spec-to-pr/README.md`, `shared/gates.md`, and `shared/setup.md`, replacing them with generic terminology (`IDE`, `IDE/agent host`, `IDE/agent host model picker`). Replaced MCP tool name `cursor-ide-browser` with `ide-browser` in `shared/tools.md`. Bumped package version to `0.0.37`.
- **Result**: Re-verified E2E integration test suites and check-workflows continuity scans successfully.

### [2026-07-18 19:48] Agent: Antigravity
- **Prompt**: add invocation names (keep prefixed folders untouched), prefix skill internal names to ws-{skill-name} for each 00-nn skills. The skill internal names is ws-write-spec, ws-write-plan, etc). the skills can be invoked with write-spec or ws-write-spec, 00-write-spec.
- **Done**: Prefixed the internal `name:` field in frontmatter of the 12 step skills (`00-write-spec` to `11-ship-pr`) to `ws-{skill-name}`, and added an `invocation_names` list to each containing the three invocation variations. Updated skill loading triggers, FSM tables, task routers, and step dispatch references in `AGENTS.md`, `.agents/AGENTS.md`, `spec-to-pr/SKILL.md`, `spec-to-pr-lite/SKILL.md`, `spec-to-pr/STEP-DISPATCH.md`, and `spec-to-pr/ARTIFACTS.md`. Updated E2E tests in `test-install.js` and regenerated the site catalog to version `0.0.36`.
- **Result**: All E2E install tests and check-workflows continuity validation tests PASSED successfully.

### [2026-07-18 19:38] Agent: Antigravity
- **Prompt**: Add personas for each step skill (00-nn) according to the skill goal (as a senior developer, as a code reviewer, as a product manager, as a senior qa tester, etc).
- **Done**: Added role-specific persona sections to each of the 12 step skills (`00-write-spec` to `11-ship-pr`) defining their respective roles (Product Manager, Technical Architect, Tech Lead, Scrum Master, Developer, QA, Code Reviewer, Release Manager, DevOps, etc.) directly under the introductory paragraph of their `SKILL.md` files.
- **Result**: Checked file structure consistency, ran meta-harness validation and E2E install tree verification tests successfully.

### [2026-07-18 14:03] Agent: Antigravity
- **Prompt**: fix it all, check install npx and bash, update readme.md and agents.md, update website (put a theme more light, not so dark)
- **Done**: Fixed broken link in `REFERENCE.md`, corrected plan link targets in `2026-07-17-session-model-gates.md`, sorted `CHANGELOG.md` in reverse-chronological order and updated the `changelog` skill template rules to insert at the top. Patched shell options syntax in `install-skills.sh` and created `.gitattributes` to enforce LF endings on script checkouts. Redesigned the website catalog style to a modern Light Slate theme, verified with local server + browser subagent screenshots, and bumped the package version to `0.0.34`.
- **Result**: Link verification PASSED (0 broken links), FSM workflow validator PASSED, installer dry-run tests PASSED, and the light theme catalog site successfully built.

### [2026-07-17 23:26] Agent: Cursor Grok 4.5
- **Prompt**: Step 13 ship-pr — create PR develop→main for US #65+#66 harness fixes, goal-fix-pr, merge.
- **Done**: Pushed develop (incl. remote merge), opened PR #68, waited Agentic Code Review (pass), zero review threads, merged without deleting develop; closed #65 and #66.
- **Result**: MERGED — https://github.com/jpolvora/workflow-skills/pull/68 — merge `e98a298`.

### [2026-07-17 16:05] Agent: Cursor Grok
- **Prompt**: Sync website, FAQ, README, AGENTS, installer, package deps after session-model gates
- **Done**: Root/packaged hubs + README + FAQ TOC/arch note; site workflows copy; CLI/`install-skills.sh` notes; `0.0.31`→`0.0.32`; `build-site` now updates layers badge; `test/package.json` synced; install tests pass
- **Result**: Docs/site/installer aligned; package `0.0.32`

### [2026-07-17 15:57] Agent: Cursor Grok
- **Prompt**: Align residual phase soft-tip wording; commit
- **Done**: `DIAGRAM.md` + `SKILL.md` phase soft tip / `model-hint` log rename
- **Result**: Wording aligned; commit pending

### [2026-07-17 15:55] Agent: Cursor Grok
- **Prompt**: Apply check-harness corrections #1–#3 (phase soft-tip wording)
- **Done**: FAQ †4/8, STEP-DISPATCH, validate/update_state comments+`PHASE_SOFT_TIP_STEPS` rename
- **Result**: Revalidate clean on touched files

### [2026-07-17 15:50] Agent: Cursor Grok
- **Prompt**: Simplify model selection at step transitions (session model; Pause → Cursor → Resume)
- **Done**: Updated `gates.md` / `setup.md` / state hygiene / progress board / both orchs / FAQ / README — drop in-gate Switch model and `--model`/`--model-chain`; soft tips at F1→F2 and F3→F4 only
- **Result**: Session-derived `currentModel`; switch path clarified every gate; design+plan under `docs/superpowers/`

### [2026-07-17 15:05] Agent: Cursor Composer
- **Prompt**: Apply check-harness follow-ups; review README/AGENTS/site/package; prepare ship-pr
- **Done**: Linked `STEP-DISPATCH`/`ARTIFACTS`/`README`/`DIAGRAM` to `protocols/*`; updated hub dual-mode gate wording; removed empty `cursor-rules/`; bumped package to 0.0.31; rebuilt site
- **Result**: Tests + check-workflows pass; ready for PR

- **Prompt**: Simplify AskQuestion + slim dual-mode workflows (spec-to-pr / lite)
- **Done**: Made AskQuestion preferred-with-markdown-fallback in `gates.md`, `tools.md`, both orchs; removed `ask-question-gates.mdc`, setup step 1a, packaged Active rules section; extracted `spec-to-pr/protocols/*`; cut `spec-to-pr/SKILL.md` to 483 lines; updated FAQ
- **Result**: No session probe / FORCE ceremony; gates still require explicit user choice in normal mode

### [2026-07-17 14:20] Agent: Cursor Grok
- **Prompt**: Sync README/AGENTS/site/installers/packs/UI after US 60; test and ship-pr
- **Done**: Documented STEP-DISPATCH dual-mode + root seeds across hubs/README/FAQ/site/bash shim/package files/agentic prompt; enhanced install-packages site copy; nav Packages link
- **Result**: Pending build-site + local tests + ship

### [2026-07-17 14:11] Agent: Cursor Grok
- **Prompt**: `/check-harness` apply all corrections (#1–#4)
- **Done**: Added MIT `LICENSE`; root `.cursorrules` → AGENTS.md; ARTIFACTS pointer to STEP-DISPATCH; DIAGRAM build node uses stackFile/config wording
- **Result**: Phase 2 revalidate clean on touched files

### [2026-07-17 14:07] Agent: Cursor Grok
- **Prompt**: `/spec-to-pr 60` — portable harness improvements from consumer check-harness (External Dependencies, STEP-DISPATCH, en-us, CLI seeds)
- **Done**: AC1–AC6 on disk; dual-mode STEP-DISPATCH scoping; `test/package.json` 0.0.29 sync; delivery plan+result committed; MEMORY traps for dual-mode / version sync / retired-id vs artifacts
- **Result**: develop @ `cfe256f`; AC7 full check-harness still open before main; ship gate pending

### [2026-07-17 13:55] Agent: Cursor Grok
- **Prompt**: US 60 AC6 — CLI create-if-missing seeds for root `.cursorrules` and `CHANGELOG.md` plus install tests
- **Done**: Added `ensureRootConsumerSeeds()` in `bin/cli.js` (hooked after hub consumer artifacts); documented in CLI help and README; Phase 10 in `test/test-install.js` asserts create-once and no-clobber
- **Result**: `npm run tests -- --local` pass; existing root files never overwritten

### [2026-07-17 11:40] Agent: Cursor Composer
- **Prompt**: Update README/AGENTS, website install cards (wide, one cmd/row, copy), npx + bash installers.
- **Done**: Synced consumer-owned `shared/` docs; `#install` full-width cards with per-command Copy; CLI help + curl shim banners; `verify.sh` PYTHONUTF8 for python -c.
- **Result**: Docs/installers/site aligned on `npx --yes` and shared consumer data contract.

### [2026-07-17 11:35] Agent: Cursor Composer
- **Prompt**: check-harness apply all — shared hub owns consumer data (MEMORY, stack, config).
- **Done**: Moved MEMORY to `shared/`; `stack.md.example` + preserve/seed `stack.md`; installer migration from legacy self-learning paths; docs/task routers/`self_learning.py`/tests updated.
- **Result**: Harness OK post-correction; `npm run tests -- --local` passed (Phases 5+9 cover shared memory/stack).

### [2026-07-17 11:25] Agent: Cursor Composer
- **Prompt**: Never leak upstream MEMORY.md / project-specific artifacts to consumer installs; seed fresh or preserve existing.
- **Done**: Installer never copies `MEMORY.md`/`memory/`/`config.json` from upstream; seeds empty `MEMORY.md` from template; npm pack excludes compiled memory + `shared/config.json`; fixed `check_memory_conflict.py` MEMORY path; Phase 9 install tests.
- **Result**: `npm run tests -- --local` passed including MEMORY isolation; pack dry-run has no leaked memory/config.json.

### [2026-07-17 11:15] Agent: Cursor Composer
- **Prompt**: Update obsolete bash curl install; pair with npx install.
- **Done**: Replaced flat-copy `install-skills.sh` with thin shim → local `bin/cli.js` or `npx --yes github:jpolvora/workflow-skills`; updated README, `docs/index.html` curl section, and CLI help note.
- **Result**: `bash install-skills.sh --help` delegates to Node CLI; curl path shares same argv (`bash -s -- install --full --yes`).

### [2026-07-17] Agent: Cursor Grok
- **Prompt**: Enforce AGENTS.md = agent README, README.md = human README; rewrite both as needed.
- **Done**: Rewrote root `AGENTS.md` (audience banner, doc-roles table, agent contracts) and `README.md` (human install/overview/contribute); aligned `.agents/AGENTS.md`, `shared/AGENTS.md`, `check-harness` hub table, and site footer with the same split.
- **Result**: Clear audience separation; facts (install commands, preserved `shared/` files) stay aligned across both docs.

### [2026-07-16 06:05] Agent: Cursor Grok
- **Prompt**: Promote shared skills to top-level installables; packages Full/Workflows/Extra; dep map + site section; ship via full auto spec-to-pr.
- **Done**: Moved 7 skills to `.agents/skills/<name>/`; `skill-dependencies.json` + CLI packages/migration; harness/site/README/tests; PR #55 develop→main.
- **Result**: Merged https://github.com/jpolvora/workflow-skills/pull/55 (merge `4ed6d3a`); Agentic Code Review passed; workflow complete.

### [2026-07-15 22:10] Agent: Cursor Grok
- **Prompt**: Apply all check-harness Phase 7 corrections (H1–H7 + S1–S5).
- **Done**: Fixed shared-config primary paths in hubs; en-us DIAGRAM/TEMPLATE/tdd-reviewer; check-workflows prose + relative script link; domain-review REPORT link; shared AGENTS hyperlinks; FAQ/DIAGRAM dual-mode pointers; Task router check-workflows row; rebuilt site catalog.
- **Result**: H1–H7 + S1–S5 applied; check-workflows PASSED; docs/index.html regenerated (package 0.0.24).

### [2026-07-15 21:45] Agent: Cursor Grok
- **Prompt**: Apply full spec-to-pr optimization plan; keep dual-mode compatible with lite; optimize lite too.
- **Done**: Added shared/gates.md + config-resolution.md; slimmed transitions (Advance/More); collapsed delivery+ship gates; formalized complexity/stub plan; conditional interview; quick-score verify; fixed --full/docs contradictions; deduped config/SCM to shared/config.json across 08/09/11/providers; rewrote lite orch for gate parity; updated FAQ/DIAGRAM/README/AGENTS.
- **Result**: check-workflows PASSED; orch 957→865 lines; dual-mode contracts documented. Optional: check-harness + build-site.

### [2026-07-13 16:55] Agent: Cursor Composer
- **Prompt**: Fix remaining UTF-8 encoding problems in Python scripts across the project; record as important learning.
- **Done**: Hardened all skill Python entrypoints with `ensure_utf8_stdio()`; fixed `11-ship-pr/scripts/verify.sh` `python -c` config reads to `Path.read_text(encoding='utf-8')`; set `subprocess.run(..., text=True, encoding='utf-8')` in both `update_state.py` variants; appended MEMORY trap for Windows cp1252 vs UTF-8.
- **Result**: 14 Python scripts compile clean; no remaining bare text opens in skill scripts (security-review examples excluded).

### [2026-07-13 10:50] Agent: Composer
- **Prompt**: Step 5 L5 / T14 — Docs polish + build-site
- **Done**: Strengthened root README `update --include-new` for the three provider skills; updated `spec-to-pr/tools.md` SCM tools to resolve via providers; added FAQ section for provider paths + `--include-new`. Regenerated `docs/index.html` via `node bin/build-site.js` (33 skills, providers listed).
- **Result**: T14 acceptance met; Step 5 DAG T1–T14 complete; no commit of `.cursor/plans/`.

### [2026-07-13 10:45] Agent: Composer
- **Prompt**: Step 5 L4 / T13 — Update install tests for providers + shims
- **Done**: Extended `test/test-install.js` Phase 0b/2: assert three provider SKILL.md + dual-mode smoke, canonical converter scripts, AC9 shim paths under `spec-to-pr/scripts/`, `providers.active`/`scm` in config example; prefer removing a provider when testing `--include-new`; document consumer `--include-new` in test comments.
- **Result**: `npm run tests -- --local` exit 0.

### [2026-07-13 10:40] Agent: Composer
- **Prompt**: Step 5 L3 / T9 — Wire 11-ship-pr to providers.scm
- **Done**: Updated `.agents/skills/11-ship-pr/SKILL.md` (v1.3) Phases 4–6 to resolve `providers.scm`, load github/azure-devops provider, and dispatch `create-pr` / checks / `merge-pr`. Removed GitHub-only `gh pr` happy path; kept dual-mode and never-delete workingBranch rule.
- **Result**: T9 acceptance met; no commit.

### [2026-07-13 10:35] Agent: Composer
- **Prompt**: Step 5 L2 / T8 — Wire 00-write-spec optional mirror to local-spec-provider
- **Done**: Updated `.agents/skills/00-write-spec/SKILL.md` (v3.2) with optional `--mirror` flag, post-draft pipeline step delegating to `register_local_spec.py --mirror`, and dual-mode notes. Canonical remains `{us-dir}/step-00-{slug}.spec.md`.
- **Result**: T8 acceptance met; no commit.

### 2026-07-13 — Consumer audit follow-ups (portability + rename residue)
- **Prompt**: Promote generic harness fixes from FiscalWR check-harness audit into workflow-skills.
- **Done**: Fixed `spec-to-pr` Step 6 dispatch (`05-verify-plan`); corrected relative links (`plan-delta-template`, config.json links inside skill); pointed karpathy/senior-developer refs at shipped extra-skills + `AGENTS.md` § External Dependencies; fixed UTF-8 `§`/`·`; updated `config.json.example` karpathy path; documented dual-hub consumers; soft-warn ADO legacy fallback; added `specs/domains/index.md.example`; check-harness detects retired skill ids.
- **Result**: Pending local validation / commit by maintainer.

### 2026-07-12 15:20 Agent: Antigravity
- **Prompt**: Separate Step 2 refinement output to step-02-{slug}.plan.refined.md, add refinement status metadata, and implement fallback logic in Step 3.
- **Done**: Configured `01-write-plan` to output plan files with `status: "plan to be refined"`. Configured `02-interview` to output refined plans to `step-02-{slug}.plan.refined.md` with updated status `"plan refined ok"`. Modified `03-plan-to-tasks` to check for `step-02` refined plan and fall back to `step-01` if Step 2 was bypassed. Updated orchestrator definitions, artifact lists, Delivery Result, and Cleanup protocols in `spec-to-pr` to integrate and preserve the step-02 refined plan.
- **Result**: Installation and package tests pass cleanly, catalog site successfully updated.

### 2026-07-12 15:10 Agent: Antigravity
- **Prompt**: Improve/enhance artifacts naming for each step of spec-to-pr with step prefixes, translate legacy Portuguese to English, and improve project portability.
- **Done**: Renamed all step-generated artifact filenames to step-prefixed format (e.g., `step-01-{slug}.plan.md`, `step-12-{slug}.result.md`) across orchestrator logic, downstream skills, README, and test suites. Translated legacy Portuguese text to English (en-us) in `validate_state.py`, `check_memory_conflict.py`, `github-issue-to-spec.py`, `domain-review`, `multi-domain-review`, and `09-goal-fix-pr`. Generalized hardcoded `Matrix` solutions, namespaces, and build/test commands to make skills portable. Added language compliance and portability scan phases to `check-harness.md`.
- **Result**: Successfully ran packaging tests (`npm run tests -- --local`) and rebuilt site catalog. All 29 skills packaged and verified.

### 2026-07-12 14:53 Agent: Antigravity
- **Prompt**: Review the spec-to-pr edge-to-edge process, execute it in dry-run mode, find opportunities to enhance/compact/stabilize it, and implement improvements.
- **Done**: Simulated the end-to-end dry-run execution of `spec-to-pr` for `specs/test-workflow.spec.md` by generating all expected plans and state files under `.cursor/plans/test-workflow/`. Created `update_state.py` to automate state hygiene updates and step transitions, avoiding manual markdown/yaml editing errors. Fixed list parsing type-conversion bugs in `update_state.py` to prevent sorting errors. Updated `SKILL.md` to reference `update_state.py` while keeping a manual fallback. Cleaned up simulated folders, ran local skill package tests, and rebuilt the catalog website.
- **Result**: The dry-run state validator passes fully, local installation tests pass cleanly, and the catalog website is updated.

### 2026-07-12 14:31 Agent: Antigravity
- **Prompt**: Create an install test for workflow-skills consumed by a test project and update AGENTS.md to allow install from remote only for the test/ folder.
- **Done**: Modified AGENTS.md to allow remote installation only within the test/ directory. Created a test/ folder, initialized an empty package.json inside it, packed workflow-skills as a tarball, ran a clean npm installation of the packaged dependency inside test/ using the interactive installer, added a .gitignore to ignore .agents/ and node_modules/, added an automated test script (test/test-install.js), registered "npm run tests" in the root package.json, updated README.md and AGENTS.md with safety, reliability, and verification documentation, and documented the website catalog build process.
- **Result**: Successfully verified installation by populating L:\source\workflow-skills\test\.agents\skills\ with all 29 skills, all of which are correctly ignored from version control. Both remote installation (npx github:jpolvora/workflow-skills) and local installer tests pass fully, documentation has been updated, and Pull Request #19 to main has been created.

### 2026-07-12 03:01 Agent: opencode
- **Prompt**: ship-pr (11-ship-pr pipeline)
- **Done**: Fixed merge instruction in SKILL.md — removed `--delete-branch` to never delete branch after merge
- **Result**: PR #18 merged to main

### 2026-07-12 02:47 Agent: opencode
- **Prompt**: Add .yml/.yaml scanning to secrets-leak-review skill and ship PR
- **Done**: Added general yml/yaml tracked-file detection to secrets_scanner.sh, added yml/yaml patterns to .gitignore audit in both script and SKILL.md, added dedicated YAML content scan command for common secret key names, added sensitive file patterns (.env, *.pem, *.key, etc.) to .gitignore
- **Result**: PR #16 merged to main

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
