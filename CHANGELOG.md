# Changelog

### [2026-07-24 01:23] Agent: Antigravity (Gemini 3.6 Flash)
- **Prompt**: update AGENTS.md with new skills, verify if fable methods should be autoload (is it recommended?), check progressive disclosure index routing skills in root agents.md, and ship-pr.
- **Done**: Replaced shorthand `.agents/skills/.../SKILL.md` in root `AGENTS.md` Layer 5 table with explicit paths for `spec-to-pr` and `spec-to-pr-lite`; updated Workflows package count reference from 28 to 31 ids in `.agents/AGENTS.md`; verified `fable-method` is not autoloaded and documented why autoloading it is not recommended; bumped version to `0.0.78`, regenerated site catalog and skill integrity manifest (`bin/skill-integrity.json`), ran full test suite (`npm run test` passed 100%), opened PR #116, resolved merge conflict with `main`, and merged PR #116 to `main`.
- **Result**: PR #116 merged to `main`; `AGENTS.md` and `.agents/AGENTS.md` fully audited and aligned; test suite 100% green.

### [2026-07-23 21:26] Agent: Antigravity (Gemini 3.6 Flash)
- **Prompt**: `/spec-to-pr gh 113` — [bug] cli: update fails post-verification when consumer workspace has repo-local custom skills
- **Done**: Modified `bin/cli.js` `runUpdate()` to filter `afterManifest.skills` by `upstreamSet.has(n)` so that post-verification evaluates only upstream skills against `bin/skill-integrity.json`. Added Phase 2b test assertion in `test/test-install.js` verifying update with repo-local custom skills. Created delivery commit `4e3cde5`, created PR #114, waited for CI checks, and merged PR #114 to `main`.
- **Result**: Issue #113 fixed; PR #114 merged; `npm run tests -- --local` passed 100%.

### [2026-07-23 17:19] Agent: Antigravity (Gemini 3.6 Flash)
- **Prompt**: Consolidate all open GitHub issues in repo (#106, #109, #110), create consolidated spec, implement fixes, ship PR #111, and merge to main.
- **Done**: Created consolidated spec `step-00-consolidated-gh-issues.spec.md`; fixed residual `AGENTS.md` wording in `check-harness/SKILL.md` and `REPORT-FORMAT.md` (#106); cleared missing optional domain default paths in `config.json.example`, cleaned template layer rows in `STACK.md`, updated consumer-mode check-harness policy (#109); updated `check_workflows.py` with dynamic root detection, explicit UTF-8 encoding across subprocess/IO operations, non-interactive execution handling, and custom `pathTokens` resolution (#110). Bumped version to `0.0.75`, updated site catalog and integrity digests, created and merged PR #111 to `main`.
- **Result**: PR #111 merged to `main`; issues #106, #109, #110 resolved; all 11 test suite phases passed cleanly.

### [2026-07-22 04:33] Agent: Antigravity (Gemini 3.6 Flash)
- **Prompt**: Standardize `ensure_utf8_stdio()` top-level import across all Python scripts; default `plans.dir` to `.agents/plans` and `plans.specsDir` to `.agents/specs`. Bump version to `0.0.70`.
- **Done**: Added `os.environ["PYTHONIOENCODING"] = "utf-8"` and top-level `ensure_utf8_stdio()` to all 12 Python scripts across `.agents/skills/`; updated `config.json`, `config.json.example`, `config.schema.json`, `detect_specs_dir.py`, `local-spec-provider/SKILL.md`, `configure-project`, `AGENTS.md`, and `README.md` to default `plans.dir` to `.agents/plans` and `plans.specsDir` to `.agents/specs`; bumped version to `0.0.70`; regenerated site catalog and skill integrity manifest (`bin/skill-integrity.json`).
- **Result**: Universal UTF-8 stdio stability across Windows cp1252 terminals; canonical defaults set to `.agents/plans` and `.agents/specs`; all 11 test suite phases passed 100%.

### [2026-07-22 04:24] Agent: Antigravity (Gemini 3.6 Flash)
- **Prompt**: `/spec-to-pr-lite` — fix(check-workflows): immediate UTF-8 stdio reconfiguration
- **Done**: Set `os.environ["PYTHONIOENCODING"] = "utf-8"` in `ensure_utf8_stdio()` and invoked `ensure_utf8_stdio()` immediately at module top-level import in `check_workflows.py`; regenerated skill integrity manifest (`bin/skill-integrity.json`).
- **Result**: Prevents UnicodeEncodeError on cp1252 Windows terminals; `check_workflows.py` passes 100%; test suite green.

### [2026-07-22 04:18] Agent: Antigravity (Gemini 3.6 Flash)
- **Prompt**: `/spec-to-pr 95` — fix(check-workflows): dependency closure audit fails in consumer repos (missing bin/skill-dependencies.json)
- **Done**: Added `skill-dependencies.json` under `.agents/skills/shared/skill-dependencies.json` and added it to `HUB_WHITELIST` in `bin/install-rules.js` so consumer repos receive the manifest on install/update; updated `bin/cli.js` `skillGraphPath` fallback; updated `check_workflows.py` to check `shared/skill-dependencies.json` first, fall back to `bin/`, and guard closure audit when no manifest is loaded (`if self.deps_loaded:`); regenerated skill integrity manifest (`bin/skill-integrity.json`).
- **Result**: `check_workflows.py` passes cleanly in consumer repos and upstream; all 11 test suite phases passed.

### [2026-07-21 21:29] Agent: Antigravity (Gemini 3.6 Flash)
- **Prompt**: update check-workflows skill to deeply validate and simulate full and lite workflows, detect broken steps, generate report, and offer user confirmation prompt. Bump version to 0.0.68 and ship.
- **Done**: Enhanced `check_workflows.py` with full (`spec-to-pr`, steps 0–9) and lite (`spec-to-pr-lite`, steps 0–5) workflow step simulation, script compilation/syntax checks, dependency closure verification, broken step detection, actionable fix suggestions, markdown report generation (`--report`), auto-fix mode (`--fix`), and interactive user confirmation gate. Updated `check-workflows/SKILL.md`, `AGENTS.md`, and `README.md`. Bumped version to `0.0.68`, regenerated site catalog and skill integrity manifest, synced `test/package.json`, and ran test suite.
- **Result**: `check-workflows` passes 100%, test suite green, ready to ship.

### [2026-07-20 20:56] Agent: Antigravity (Gemini 3.5 Flash)
- **Prompt**: design idea: in website skill cards, add badges into each skill card showing <full> or <lite> flaging that skill is dependency of one or both workflows. Update website and ship.
- **Done**: Added recursive standard/lite dependency resolution to `build-site.js`; stored skill slug; generated dynamic HTML badge tags (`full` and `lite`) on skill cards; styled badges in `style.css` using theme Sky Blue and Emerald Green; bumped package version (0.0.66 -> 0.0.67); ran integrity checks and full test suite; committed and pushed to `develop`.
- **Result**: Website updated and changes pushed to origin/develop.

### [2026-07-20 19:40] Agent: Cursor Grok 4.5
- **Prompt**: `/spec-to-pr gh 90 full auto` — fix skill integrity digest-mismatch on consumer install
- **Done**: LF-canonical hashing in `skill-integrity-lib.js`; regen manifest v0.0.65; EOL parity test; PR #91 merged; issue #90 closed; MEMORY trap recorded
- **Result**: MERGED `c85b0ed`; https://github.com/jpolvora/workflow-skills/pull/91 ; Learning: hash LF-canonical (CRLF WT vs GitHub LF)

### [2026-07-20 19:26] Agent: Cursor Grok 4.5
- **Prompt**: Step 8 ship create-pr for us-90 (LF-canonical integrity)
- **Done**: Prepare board green; pushed develop (58479c1 + 12a776c); opened PR #91 develop→main with Closes #90
- **Result**: https://github.com/jpolvora/workflow-skills/pull/91 ; stopBeforeFixPr STOP (no merge / no goal-fix)

### [2026-07-20 15:00] Agent: Cursor Grok 4.5
- **Prompt**: Prepare to PR (site bump, checksums), commit, ship-pr
- **Done**: Bumped 0.0.63→0.0.64; rebuilt site; regenerated integrity; synced test pack path; harness FAQ/gabarito fixes included
- **Result**: verify.sh VERIFY_OK; ready to push develop→main

### [2026-07-20 14:55] Agent: Cursor Grok 4.5
- **Prompt**: Fix check-harness findings; add learnings to MEMORY
- **Done**: Replaced `file://` FAQ links with relatives; gabarito opt-out phrases; seeded local STACK.md; 4 memory entries + compile; regenerated `bin/skill-integrity.json`
- **Result**: faq links resolve; integrity `--check` OK; Learning: packaged `skills/` link resolve + no `file://` skill links

### [2026-07-20 14:55] Agent: Cursor Grok
- **Prompt**: Require checksum regenerate on skill commit/PR; tests for testing-step approve
- **Done**: AGENTS.md § Upstream skill integrity regenerate + Verification item; `verify-integrity` script; verify.sh + PREPARE-CHECKLIST; check-harness correction; Phase 0b asserts; README; regenerated `bin/skill-integrity.json`
- **Result**: `npm run verify-integrity` + Phase 0b/11 PASS; Learning: N/A

### [2026-07-20 18:55] Agent: Cursor Grok 4.5
- **Prompt**: Step 7 testing for skill-install-checksums (AUTO, no browser)
- **Done**: Wrote `step-07-*.testing.plan.md` + `testing.report.md`; ran `node --check` on touched bin files, `generate-skill-integrity.js --check`, `npm run tests -- --local`
- **Result**: PASS (0 fix loops); Phase 0b + Phase 11 green; all ACs 1–12 mapped PASS; Learning: N/A (standard testing)

### [2026-07-20 18:50] Agent: Cursor Grok 4.5
- **Prompt**: Step 6 code review for skill-install-checksums (AUTO fix Critical/Warning)
- **Done**: Reviewed integrity scope; fixed W1 (no bless local record on post-verify fail), W2 (abs-path `memory` skip), S1 (mismatch printer); added Phase 11 regression; wrote `step-06-*.review.md` + `fix.report.md`
- **Result**: 2 Warning + 1 Suggestion fixed; `npm run tests -- --local` PASS; Learning: Integrity — never bless failed post-verify with actual digests

### [2026-07-20 14:30] Agent: Cursor Grok 4.5
- **Prompt**: Set agentic-code-reviewers publish min score to 4 (default is 6)
- **Done**: Added `--score-min 4` to `.github/workflows/code-review.yml` and AGENTS.md dry-run curl
- **Result**: CI + local dry-run publish findings with score ≥ 4

### [2026-07-20 18:45] Agent: Cursor Grok 4.5
- **Prompt**: Step 4 implement skill-install-checksums DAG T1–T8 (integrity digests for install/update/audit)
- **Done**: Added `bin/install-rules.js`, `skill-integrity-lib.js`, `generate-skill-integrity.js`, committed `skill-integrity.json`; wired pre/post verify + `integrity` + `--check` digest into `cli.js`; hub ships `hub.gitignore` (npm cannot pack `.gitignore`); skip `runs/`; Phase 0b/11 tests; README + check-harness docs
- **Result**: `npm run tests -- --local` green; `generate-skill-integrity.js --check` OK; version unchanged (0.0.63); Learning: Integrity — npm never packs .gitignore; skip runs/

### [2026-07-20 14:25] Agent: Cursor Grok
- **Prompt**: Policy-only decision — migrate Python→Node? Chose option 1 (no big-bang)
- **Done**: Documented runtime policy: Node required; new skill scripts = `.cjs`; existing `.py` frozen except bugfixes (`tools.md`, README, `write-a-skill`); MEMORY trap compiled
- **Result**: Policy locked; no script rewrites

### [2026-07-20 14:05] Agent: Cursor Grok
- **Prompt**: `/00-write-spec` skill install checksums; set `plans.dir` to `specs/`
- **Done**: `config.json` `plans.dir` → `specs`; wrote `specs/skill-install-checksums/step-00-skill-install-checksums.spec.md`
- **Result**: Canonical spec ready for `01-write-plan`; Learning: N/A (spec only)

### [2026-07-20 13:35] Agent: Composer
- **Prompt**: Update docs/README/site/installers for path tokens, then ship-pr
- **Done**: README + setup + build-site blurb; CLI help/post-install tips; `ensurePathTokensInConfig` on hub seed/preserve; install-skills.sh banner; self-learning site description de-braced
- **Result**: Humans and installers surface pathTokens; ready to ship

### [2026-07-20 13:30] Agent: Composer
- **Prompt**: Update check-harness to know hint/path tokens before fixing relative paths
- **Done**: Added § Path token map; Phase 0 load; Phase 1/2 expand-before-existence; forbid token→`../` false fixes; report + checklist token-aware
- **Result**: check-harness expands `{skillsRoot}`/`{sharedDir}`/`{plansDir}`/`{reviewsDir}` before broken-link or relative rewrites

### [2026-07-20 13:25] Agent: Composer
- **Prompt**: Reliable path-token tip for agents (`{skillsRoot}` / `{sharedDir}`) like config placeholders
- **Done**: Added `tools.md` § Path tokens + agent expand contract; `pathTokens` in config example/schema/local config; config-resolution + hub/autoload/self-learning/implement-tasks wired to braces; MEMORY traps updated
- **Result**: Agents load `config.json` + `tools.md` first, expand braces before Read/Grep/Shell; no undeclared `shared/` shorthands

### [2026-07-20 13:15] Agent: Composer
- **Prompt**: `/08-ship-pr` with create-PR + check-harness (1A)
- **Done**: Prepare board green; check-harness PASS_WITH_WARNINGS; pushed develop; opened/merged PR #86; fixed gabarito MEMORY path from review thread; synced site catalog after main merge
- **Result**: https://github.com/jpolvora/workflow-skills/pull/86 MERGED (`4cf92fb`); `develop` intact

### [2026-07-20 09:43] Agent: Cursor Grok
- **Prompt**: bump
- **Done**: Patch-bumped `0.0.61` → `0.0.62`; regenerated site footer; synced `test/package.json` tarball ref
- **Result**: Install/`--version`/`--check` align with site v0.0.62

### [2026-07-20 09:35] Agent: Cursor Grok
- **Prompt**: Rename shared stack companion to STACK.md and update references
- **Done**: `stack.md.example` → `STACK.md.example`; default seed/path `shared/STACK.md`; installer renames legacy `shared/stack.md` once; refs across hubs/skills/CLI/tests/docs updated
- **Result**: Canonical consumer stack companion is `.agents/skills/shared/STACK.md`

### [2026-07-20 09:30] Agent: Cursor Grok
- **Prompt**: Fresh consumer install check-harness noise; ship-ready skills without touching consumer root files
- **Done**: Fixed stale `00`–`11` prose; installer seeds only under `shared/` (`config.json`, `CHANGELOG.md`, `stack.md`, `MEMORY.md`); expanded consumer `shared/AGENTS.md`; check-harness consumer hub = shared (root AGENTS optional suggestion only); never write consumer root/host files; README/tests updated
- **Result**: Install scope limited to `.agents/skills/`; near-zero findings from shipped hub/skills

### [2026-07-20 09:06] Agent: Cursor Composer
- **Prompt**: Fix Node.js 20 deprecation annotation on Deploy site Actions
- **Done**: Bumped `checkout@v5`, `setup-node@v6` (Node 22), `upload-pages-artifact@v5`, `deploy-pages@v5`; merged #82
- **Result**: Deploy run annotations empty (no Node 20 warning)

### [2026-07-20 09:05] Agent: Cursor Composer
- **Prompt**: Fix typical main-push race between Deploy site and legacy pages-build-deployment
- **Done**: Deploy site uploads `docs/` + `deploy-pages`; repo Pages `build_type` → `workflow`; kept docs sync commit with `[skip ci]`; removed invalid `include-hidden-files` input; merged #80/#81
- **Result**: Push to main runs only Deploy site (build+deploy); no cancelled legacy Pages race; site built at jpolvora.github.io/workflow-skills

### [2026-07-20 08:45] Agent: Cursor Composer
- **Prompt**: Stop installing `.agents/AGENTS.md` into consumer projects
- **Done**: Removed `installPackagedAgentsIndex` from CLI (install/update/uninstall); dropped `.agents/AGENTS.md` from npm package `files`; expanded `shared/AGENTS.md` with External dependencies + skill discovery; retargeted spec-to-pr/spec-format/setup links; updated README/hubs/site copy; install tests assert no `.agents/AGENTS.md` copy
- **Result**: Consumer agent contract is `skills/shared/AGENTS.md` only; upstream packaged hub remains for authoring/check-harness drift

### [2026-07-20 08:38] Agent: Cursor Composer
- **Prompt**: Stop workflows from requiring/creating consumer files outside shared (changelog + specsDir)
- **Done**: `rules.changelogFile` default → `.agents/skills/shared/CHANGELOG.md`; `plans.specsDir` default → `.agents/plans/specs` (prefer existing root `specs/`); updated changelog skill, local-spec detect script, schema/example, hubs, README, tools
- **Result**: Fresh consumers get no forced root `CHANGELOG.md` / `specs/`; root paths only when explicitly configured or already present

### [2026-07-20 08:34] Agent: Cursor Composer
- **Prompt**: configure-project warns shared/stack.md exists but root STACK.md missing; avoid forcing files outside shared/
- **Done**: Default `rules.stackFile` → `.agents/skills/shared/stack.md`; configure-project/setup retarget to shared companion instead of creating root `STACK.md`; updated example, AGENTS, tools, PREPARE-CHECKLIST
- **Result**: Stack companion stays under consumer-owned `shared/`; root STACK.md optional legacy only

### [2026-07-20 08:12] Agent: Cursor Composer
- **Prompt**: Fix version bump so package version matches website footer; sync GH Actions/local build; explain install vs site drift
- **Done**: Made `package.json` canonical — `build-site.js` stamps footer without bumping by default (`--bump` / `npm run build-site:bump` for releases); deploy-site CI asserts footer==package.json and never bumps; aligned repo to **0.0.61** (package + footer + test tarball ref); documented contract in README/AGENTS
- **Result**: `--version`/`--check`/install and site footer share one version; CI can no longer leave footer one patch ahead

### [2026-07-20 12:00] Agent: OpenCode kimi-k3
- **Prompt**: Decouple gabarito/caveman/karpathy-guidelines into independent skills; apply write-a-skill filter to reduce lines
- **Done**: Removed all cross-skill and hub (AGENTS.md) references from the three autoload skills — composition now owned solely by hubs/consumers; caveman 71→63 lines (dropped Persistence section + duplicate example), gabarito 46→43 (dropped Opt-out section + karpathy/senior-developer pointers + PT-BR filler example), karpathy 66 lines (deduped intro); link scan 0 broken / 344
- **Result**: Skills self-contained; hub § Skill loading / Precedence / Opt-out remains the single composition point

### [2026-07-20 11:00] Agent: OpenCode kimi-k3
- **Prompt**: Run check-harness audit; fix references, links, semantics, workflow usage; improve portability/multi-agent
- **Done**: Full audit (Phases 0–5c, 348 links clean) + 9 approved corrections: fixed critical `spec-to-pr-lite` dependency closure in `bin/skill-dependencies.json`; packaged hub 27→28 ids; untracked consumer-owned `shared/stack.md` (+ de-sedimented retired 13-step refs); retitled `stack.md.example`; fixed run-test.md `stackFile` path + linked from spec-to-pr README (also fixed stale `00–11`); cleaned local config.json (glossaryFile, Step12→Step8 invariant key); added orchestrator dependency-closure check to check-harness Phase 3 + check-workflows; extracted check-harness report template to `REPORT-FORMAT.md` (586→~530 lines)
- **Result**: Harness OK post-correction; `npm run tests -- --local` green

### [2026-07-19 18:35] Agent: Cursor Grok
- **Prompt**: Update README/AGENTS/site for install/update/uninstall; check-harness; ship-pr full auto
- **Done**: Documented uninstall + `installed-skills.json` in README, root/packaged AGENTS, site `#install`; CLI uninstall+manifest already in tree; harness link scan clean; package **0.0.59**
- **Result**: Ready to ship develop → main

### [2026-07-19 18:30] Agent: Cursor Grok
- **Prompt**: Add uninstall to installer/updater; track installed skills in shared/
- **Done**: `uninstall --skills` with reverse+orphan cascade; consumer-owned `shared/installed-skills.json` (`skills` + `selected` roots); install/update write/bootstrap manifest; help/README/shared docs + Phase 10 tests
- **Result**: `npm run tests -- --local` green

### [2026-07-19 17:45] Agent: Cursor Grok
- **Prompt**: `/check-harness` clear `docs/superpowers` refs; remove missing-file / old-skill / dead-dir references
- **Done**: Removed dead `docs/superpowers` tree + stale `.cursor/plans` artifacts; scrubbed `docs/superpowers/specs/` from check-harness scan patterns; aligned `configure-project` INTERVIEW gate labels; restored CLI `--help` `.agents/plans` note (tests); site/package **0.0.58**
- **Result**: Harness OK post-correction; `npm run tests -- --local` green; ready to ship

### [2026-07-19 17:35] Agent: Cursor Grok
- **Prompt**: `/write-a-skill` create skill to interview/detect/suggest filling `config.json` anytime; callable during install; work with setup
- **Done**: Added `configure-project` (SKILL + INTERVIEW); wired `setup.md`, Workflows deps (28), hubs/task router, CLI post-install hints, README; site `0.0.56`
- **Result**: Ready for user review (write-a-skill Step 5); optional check-harness pending

### [2026-07-19 17:30] Agent: {agent/runtime}
- **Prompt**: Audit skill placeholders/config tokens; fix invalid vars
- **Done**: Canonicalized `{plan-dir}`/`{output-dir}`→`{us-dir}`, `{reviews-dir}`→`{reviewsDir}`, `{specsDir}`→`{specs-dir}`, `{plans.dir}`→`{plansDir}`, `{workflowId}`→`{workflow-id}`; added `{reviewsDir}` to ARTIFACTS; fixed FAQ obsolete step-10/11/12 paths
- **Result**: Path/config token vocabulary consistent; no remaining invalid path tokens

### [2026-07-19 17:10] Agent: {agent/runtime}
- **Prompt**: Replace `.agents/plans/{slug}` with `{plansDir}/{slug}` (config check)
- **Done**: Confirmed no `plansDir` config key — token `{plansDir}` ← `plans.dir`; scrubbed skill prose/examples; schema/example keep literal defaults; hubs document the mapping
- **Result**: Skills use `{plansDir}/{slug}/`; config still `plans.dir`

### [2026-07-19 16:52] Agent: {agent/runtime}
- **Prompt**: check-harness apply all (#1–#4)
- **Done**: Restored+rewrote `.agents/AGENTS.md` (harness-neutral parity); cleared phantom `seniorDeveloper` paths in config example + local config; deleted `workflow-skills-0.0.55.tgz`
- **Result**: Harness OK post-correction for critical packaged-hub gap

### [2026-07-19 15:55] Agent: {agent/runtime}
- **Prompt**: Portability rule in AGENTS.md; no compat; consumers choose asset paths; keep `.cursor` for upstream dogfood only
- **Done**: Added root § Portability & harness neutrality; neutralized shipped defaults (`.agents/plans` / `.agents/codereviews`); `user-gate` / `dispatch-agent`; scrubbed host brands from skills + hubs + README; `shared/config.json` stays `.cursor/plans` for this repo only
- **Result**: Portable skill contract; no legacy path shims; host pointer files optional and out of skill contract

### [2026-07-19 14:23] Agent: Cursor Grok
- **Prompt**: `/08-ship-pr` create-pr (option 1)
- **Done**: Prepare board green; merged `main` into `develop` (regen `docs/index.html`); pushed; reused/updated PR #72; 300s settle; threads 0 + review check pass; merged with merge commit; `develop` kept
- **Result**: https://github.com/jpolvora/workflow-skills/pull/72 merged (`0423b62`); package **0.0.54** on `main`

### [2026-07-19 14:11] Agent: Cursor Grok
- **Prompt**: Apply check-harness plan #1–#3 with #2A (promote secrets-leak-review into workflows)
- **Done**: Fixed MEMORY prepare-checklist path; moved secrets into workflows (27) / Extra=2; `08-ship-pr`→secrets dep; hubs/CLI/site v0.0.51; trimmed PREPARE-CHECKLIST
- **Result**: Harness OK post-correction; Workflows installs include leak scan for ship prepare gate

### [2026-07-19 14:02] Agent: Cursor Grok
- **Prompt**: Add prepare-to-PR checklist to ship-pr (coverage, build, tests, security, consumer ship steps, visible board); gate push/PR; monitor reviews → goal-fix-pr
- **Done**: Added `08-ship-pr/PREPARE-CHECKLIST.md`; rewrote `SKILL.md` v1.9 (Steps 1–7 with prepare goal gate); aligned GOAL-OVERRIDES/examples + STEP-DISPATCH settle step ref
- **Result**: ship-pr drives prepare board before commit/push/PR; green + SCM → create-pr; then monitor/`goal-fix-pr`

### [2026-07-19 17:56] Agent: Cursor Grok
- **Prompt**: check-harness, fix needed items, prepare PR, ship-pr for consumer testing
- **Done**: Full harness audit (Phases 0–5c); synced site Extra catalog + package `0.0.50`; aligned `test/package.json` tarball; removed orphan `skills-lock.json`; retargeted promote-shared spec example; install tests `--local` green (29 skills)
- **Result**: Harness OK post-correction; ready to ship develop→main PR (`no-merge` for consumer test)

### [2026-07-19 13:55] Agent: Cursor Grok
- **Prompt**: No migration steps or older-version compatibility — always latest (package not in production)
- **Done**: Removed CLI `SKILL_RENAMES` / migrate* paths and install-test Phases 2b/2c/5; docs/help say latest layout only; dropped `skipIntegration`/`us-workflow`/deprecated `invocation_names` + related orch/gates/setup/schema aliases
- **Result**: Install/update copies current tree only; no older-folder rename path

### [2026-07-19 13:50] Agent: Cursor Grok
- **Prompt**: Update README, AGENTS, website, installer/bash, dependencies graph
- **Done**: Trimmed Extra package to on-disk skills; retargeted hubs/README/CLI help/bash shim; `skill-dependencies.json` graph (goal-fix-pr deps + write-a-skill→writing-great-skills); site v0.0.48 + FSM 0–9 workflow cards
- **Result**: Disk ↔ hubs ↔ installer map aligned (26 workflows + 3 extra); no phantom Extra routes

### [2026-07-19 13:45] Agent: Cursor Grok
- **Prompt**: Scan workflow/skill scripts for SyntaxError like `replace('\\', '/')` unterminated string
- **Done**: Compiled all skill/bin/test `.py` (0 errors); `bash -n` on skill `.sh` (clean); no fragile pattern in repo. Documented trap in check-harness Phase 0 + MEMORY
- **Result**: Repo scripts healthy; error was agent heredoc-only. Prefer `Path.as_posix()` / temp `.py` / `py_compile` in scans

### [2026-07-19 13:42] Agent: Cursor Grok
- **Prompt**: Fix secrets-leak-review hang/crash; graceful finish; reduce scripts; LLM-led findings
- **Done**: Rewrote `SKILL.md` to Grep/Glob-only flow with hard tool budget + Done-when stop; demoted `secrets_scanner.sh` to optional pre-commit; removed `--no-ignore`/`-t all`/process-substitution hang path; capped hits; updated REFERENCE + pre-commit env
- **Result**: Interactive skill no longer runs scanner; optional script exits ~2s on this repo (was unbounded hang)

### [2026-07-19 13:40] Agent: Cursor Grok
- **Prompt**: check-harness Phase 7 — adapt to unprefixed `goal-fix-pr` / `update-plan-implementation` (do not restore `10`/`11` folders)
- **Done**: Retargeted hubs, deps, CLI renames, check-harness §3b, orch/providers/ship/fix links, tests/fixtures, README; rebuilt site (0.0.46); synced `test/package.json`
- **Result**: Canonical folders are unprefixed; legacy `09`/`10`/`11` ids migrate via CLI; deprecated aliases only in `invocation_names`

### [2026-07-19 13:25] Agent: Cursor Grok
- **Prompt**: Rewrite/compose pipeline skills 01–11 with writing-great-skills + write-a-skill (same behavior)
- **Done**: Pruned all eleven `SKILL.md` files to lead/invocation/steps+Done-when pattern; disclosed long templates to existing siblings (`TEMPLATE.md`, `GOAL-OVERRIDES.md`, `examples.md`, `README.md`, `plan-delta-template.md`, `config-resolution.md`); dropped autoload Prerequisites; patch-bumped versions; restored 300s settle + goal-loop auto-yes clarity on ship/fix
- **Result**: ~895 lines removed net across 01–11; all ≤100 lines; contracts/artifacts/FSM steps preserved

### [2026-07-19 13:20] Agent: Cursor Grok
- **Prompt**: Rewrite `00-write-spec` using write-a-skill + writing-great-skills
- **Done**: Pruned duplication; disclosed format to `spec-format`; sharpened step Done-when criteria; dropped autoload prerequisites; bumped version to 3.4
- **Result**: Leaner `ws-write-spec` contract (~65 lines); behavior preserved (canonical path, optional mirror, handoff)

### [2026-07-19 17:16] Agent: Cursor Grok
- **Prompt**: Fix measuring time in full auto workflows (state/logs/final board)
- **Done**: Required `--elapsed` in `update_state.py` (standard+lite); null-safe totals; nested `telemetry.steps` round-trip; upsert `## Telemetry log`; contracts for auto/full Benchmark + Step 8 final-board Total time (state-hygiene, delivery-result, progress-board, STEP-DISPATCH, SKILL)
- **Result**: Smoke test: omit `--elapsed` → exit 1; multi-step sum 95+0+40 → `totalElapsedSec: 135` + Telemetry log rows

### [2026-07-19 17:00] Agent: Cursor Grok
- **Prompt**: ship-pr should wait for code-review and merge after no open issues (goal-fix-pr)
- **Done**: Clarified `08-ship-pr` Phase 5–6 + GOAL-OVERRIDES; Step 9 / lite Step 5 wait→goal-fix→merge; goal-fix-pr merge handoff note; merged main into develop for PR #71
- **Result**: Contract: never merge with open threads or red required checks

### [2026-07-19 04:35] Agent: Cursor Grok
- **Prompt**: Update website, AGENTS.md, README.md, npx installer, bash installer
- **Done**: `bin/cli.js` pipeline `SKILL_RENAMES` (temp-stage cycle) + skip `__pycache__`/`*.pyc` on copy + help notes; README/AGENTS/packaged hub/install-skills.sh synced; site rebuilt; package `0.0.45`; Phase 2c install test for pipeline renames
- **Result**: `npm run tests -- --local` PASSED (incl. us-workflow + pipeline migration). Site footer v0.0.45.

### [2026-07-19 04:30] Agent: Cursor Grok
- **Prompt**: Fix UnicodeEncodeError cp1252 / U+2192 (→) on Windows
- **Done**: Hardened `ensure_utf8_stdio()` in 12 skill scripts (`encoding=utf-8`, `errors=replace` + fallback); documented Windows stdio rule in check-harness Phase 0
- **Result**: Reproduced crash without reconfigure; scripts + UTF-8 reconfigure print `→` cleanly; `check_workflows` PASSED

### [2026-07-19 04:28] Agent: Cursor Grok
- **Prompt**: Remove missing/junk files from packages
- **Done**: Excluded `**/__pycache__/` and `*.py[cod]` from npm pack (`.npmignore` + `package.json` `files` negations); tightened root `.gitignore`; deleted on-disk `__pycache__` under `.agents/skills`
- **Result**: `npm pack --dry-run` no longer includes Python bytecode (`.npmignore` was overriding `.gitignore`)

### [2026-07-19 04:25] Agent: Cursor Grok
- **Prompt**: Fix contract drift after FSM redesign
- **Done**: Aligned agent-facing contracts to steps 0–9: `04-implement-tasks` (Step 4 build / 6–7 fix; `step-06`/`step-07` findings), `update-plan-implementation` plan-delta (`step-08` result), `spec-to-pr-run-test.md`, `validate_state.py` comment, `stack.md.example` + `config.json.example` invariant key, root `STACK.md`; MEMORY entry compiled
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
- **Done**: Renumbered pipeline folders to match FSM steps: `11-ship-pr`→`08-ship-pr`, `08-fix-pr`→`09-fix-pr`, `09-goal-fix-pr`→`goal-fix-pr`, `10-update-plan-implementation`→`update-plan-implementation`; updated hubs, deps JSON, live refs, `test/` fixture, site catalog (`0.0.43`)
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
