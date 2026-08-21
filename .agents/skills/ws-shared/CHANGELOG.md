# Changelog

Append-only history written by the [`ws-changelog`](../ws-changelog/SKILL.md) skill. Do not use this file for anti-regression context (use `MEMORY.md`).

### [2026-08-21 18:35] Agent: Composer
- **Prompt**: Expand ws-cleanup patterns for leftovers found after shipped/partially tracked plan triage
- **Done**: Listed `audit-*.log.md`, `post-bootstrap-commits.md`, root `.tmp-*` files; shipped-orphan walk when plan root is tracked-partial; PATTERNS + tests + root `.gitignore`
- **Result**: `/ws-cleanup` finds hermes-style untracked leftovers under completed plans that still have a tracked refined plan

### [2026-08-21 18:15] Agent: Cursor Grok 4.6
- **Prompt**: /ws-write-a-skill create ws-spec-archive — harvest plansDir into index.PRD, then propose cleanup commit
- **Done**: Added user-invoked `ws-spec-archive` (scan/apply Node scripts, tests); registered in Workflows package, hubs, CATALOG, FEATURES, README, autoload; Archive section on spec-index template
- **Result**: Skill reachable via /ws-spec-archive; plansDir history can land in index.PRD before shipped folders are removed

### [2026-08-21 17:55] Agent: Composer
- **Prompt**: /ws-write-a-skill create ws-spec-explain and ws-cleanup; register in website, deps, installer, checksums, AGENTS routers
- **Done**: Added user-invoked `ws-spec-explain` + `ws-cleanup` (list/apply Node scripts, tests); registered in Workflows package, hubs, CATALOG, FEATURES, README, autoload; bumped to 0.3.29; regenerated integrity and site catalog
- **Result**: Skills discoverable via /ws-spec-explain, /explain, /ws-cleanup; package 0.3.29

### [2026-08-21 15:40] Agent: Claude Opus 5
- **Prompt**: Read FEATURES.md, find improvements per feature (speed, tokens, subagent context, orchestrator intelligence, quality gates, communication, auditing, 10/10 scoring, portability, hybrid), produce a detailed spec for later execution.
- **Done**: Audited the suite with four parallel explorations (context/token inventory, telemetry+installer, quality machinery, FSM latency) and wrote `.agents/specs/harness-efficiency-and-verifiability.spec.md` — 76 atomic ACs across 10 selectable workstreams, with a measured baseline table and design intent. No skill or config files changed.
- **Result**: Spec of record written; awaiting maintainer selection of workstreams before implementation.

### [2026-08-21 12:30] Agent: Cursor Grok 4.6
- **Prompt**: set mode to full auto ws-ship-pr and ws-goal-fix-pr
- **Done**: Merged PR 222 after goal-fix-pr convergence (activeThreads 0, CI green). Workflow hermes-spec-to-pr-enhancements completed.
- **Result**: https://github.com/jpolvora/workflow-skills/pull/222 MERGED (`e0f0249`)

### [2026-08-21 12:24] Agent: Cursor Grok 4.6
- **Prompt**: Step 9 ws-goal-fix-pr PR 222 (hermes-spec-to-pr-enhancements)
- **Done**: Two live fix rounds; FAQ 9 SCM intents; audit standalone us-dir comment; ADO sweep --dry-run docs. Pushed 538055e and 8dfac87. Did not merge.
- **Result**: activeThreads 0; review and both CI tests completed pass

### [2026-08-21 11:36] Agent: Cursor Grok 4.6
- **Prompt**: Step 8 ws-ship-pr hermes-spec-to-pr-enhancements create-pr stopBeforeFixPr
- **Done**: Bumped package 0.3.27 → 0.3.28; regenerated catalog + integrity; delivery commit of refined plan; push develop and reuse PR 222
- **Result**: Prepare board green; PR develop → main; stop before goal-fix-pr

### [2026-08-21 10:55] Agent: Cursor Grok 4.6
- **Prompt**: update improving website info, syncing skills features and simplifying and enhancing the marketing ideas describing better, commit again
- **Done**: Site hero, Features grid, workflow/package/FAQ copy. SKILL.md descriptions for orch + verify + SCM providers; catalog rebuild. README Features table in "you get" language.
- **Result**: Marketing matches verify ≥ 9 and GitHub/Azure parity. Ready to commit.

### [2026-08-21 10:50] Agent: Cursor Grok 4.6
- **Prompt**: update AGENTS.md progressive disclosure, update README.md features, update docs/faqs
- **Done**: Progressive disclosure rows for verify score ≥ 9 and SCM contract (root AGENTS.md + ws-shared + autoload hub contracts). README Features table. Site FAQ Q2c/Q7b; spec-to-pr FAQ § 8.
- **Result**: Agents route to one hub file or skill; humans see Features + FAQs for both contracts.

### [2026-08-21 10:40] Agent: Cursor Grok 4.6
- **Prompt**: add it to change log and feature list, then commit
- **Done**: Root `CHANGELOG.md`; README dual-mode highlights (verify ≥ 9 + SCM parity); site Step 5, verifier/SCM cards, workflow list, FAQ
- **Result**: Human changelog and feature list cover min-score 9 and GitHub/Azure intent contract

### [2026-08-21 10:35] Agent: Cursor Grok 4.6
- **Prompt**: Add a parity check for features between ws-azure-devops-provider and ws-github-provider; mirror when possible; add a feature contract
- **Done**: Added `scm-provider-contract.md` (required intents + allowlist). Wired `test/test-provider-parity.js` into npm test. Hub whitelist + install copy. GitHub `resolve_thread.cjs` gained `--dry-run` to match Azure. Azure create-pr documents Windows quoting parity.
- **Result**: Both SCM providers declare the same seven intents. Extra intent on one side fails CI unless allowlisted.

### [2026-08-21 10:20] Agent: Cursor Grok 4.6
- **Prompt**: Change min score when verifying plan; accept and advance only at >= 9; if less than 9, scoreAndRefine until >= 9
- **Done**: Raised Step 5 check-implementation bar from 7 to 9. Score < 9 now runs scoreAndRefine (flagged tasks + re-verify) until >= 9 (max 3 rounds, then Pause). Removed approve-below-threshold. Aligned ws-verify-plan, gates, orch dispatch/docs, classify low-score cluster (<9).
- **Result**: Contract updated in skills/hubs. Advance requires score >= 9; no auto-approve below 9.

### [2026-08-21 10:16] Agent: Cursor Grok 4.6
- **Prompt**: ws-spec-to-pr Step 1 write-plan for hermes-spec-to-pr-enhancements (AC1–AC6)
- **Done**: Canonical `step-01-hermes-spec-to-pr-enhancements.plan.md` sections 0–8; folded user-supplied plan; MEMORY Medium+ traps applied
- **Result**: Plan of record ready for interview; no skill/product code

### [2026-08-20 14:26] Agent: Antigravity / Gemini 3.7 Flash
- **Prompt**: Implement enhancements to self-learning (items 2, 3, 4) & /ws-ship-pr
- **Done**: Added failure reflection hook in ws-self-learning & ws-senior-developer (forbidden Learning: N/A when session friction >= 2); added PathPattern parsing, compilation, and --match-paths querying in self_learning.py + tests in test-memory-formatting.js; added adversarial self-learning trigger to ws-fable-judge; bumped version to 0.3.26, rebuilt site, and updated integrity manifests.
- **Result**: Tests 100% green; integrity verified; ready for PR.

### [2026-08-19 11:10] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr (inferred PR 219)
- **Done**: Round 1 sibling-fixes for 5 threads: us-220 state body, `--tz` label on collect_window, missing MEMORY.md exit 0. Commit 1dcbf7c pushed.
- **Result**: activeThreads []. Review + tests pass. PR 219 MERGEABLE. This skill does not merge.

### [2026-08-17 03:21] Agent: Cursor Grok 4.6
- **Prompt**: /ws-ship-pr (standalone, merge when clean)
- **Done**: Bumped 0.3.22; reused PR 216; sibling-fixed inline-dict SHA scan (af351ae) and AC9 fetch-before-count (774c1d3); wait/converge until checks green and activeThreads 0; merged without deleting develop.
- **Result**: https://github.com/jpolvora/workflow-skills/pull/216 merged (`de8ddd0` on main). `develop` intact.

### [2026-08-17 05:12] Agent: Cursor Grok 4.6
- **Prompt**: CONTINUE /ws-goal-fix-pr PR 216
- **Done**: Round 5 initAudit repo-root us-dir (5662862); round 6 evals generator + resolveConfigPath (dd3544a); waited until review pass.
- **Result**: activeThreads []. Checks green. PR 216 MERGEABLE. This skill does not merge.

### [2026-08-17 03:50] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr (PR 216 round 4)
- **Done**: stay-on-integration skip-check; audit paths vs repo root; goal-loop runtime `{us-dir}/.runtime` only.
- **Result**: Commit e3fbe57 pushed. Threads resolved. npm run test exit 0.

### [2026-08-17 03:40] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr (PR 216 round 3)
- **Done**: Fixed 3 review threads: audit session paths repo-relative; resumeGate(null) proceeds; classify pass-1 stats aligned.
- **Result**: Commit 0d47c4c pushed to origin/develop. npm run test exit 0. Threads resolved.

### [2026-08-17 02:40] Agent: Composer
- **Prompt**: Verify/fix stamp_state_version keeping unknown highs (e.g. 7) so post-write validation deadlocks
- **Done**: Confirmed max(current, _STATE_VERSION) preserves 7; both std/lite stamp now always emit _STATE_VERSION; validate still reject-loud on unread files; test clamps 7 then retry.
- **Result**: node test/test-update-state-yaml.js exit 0 (unknown 7 clamped, retry stays 1).

### [2026-08-17 02:35] Agent: Composer
- **Prompt**: Verify/fix resume pre-check comparing origin/{baseBranch} instead of integration branch (AC9 / stale-orch-resume)
- **Done**: Confirmed bug (origin/main..HEAD=6 vs origin/develop..HEAD=0 on develop); retargeted setup.md 4c + ws-spec-to-pr SKILL.md AC9 to `{integrationBranch}` = workingBranch else baseBranch; extended test-resume-gate.js with merged-into-develop-while-base-is-main case.
- **Result**: node test/test-resume-gate.js exit 0; gate now matches stale-orch-resume trap.

### [2026-08-16 20:33] Agent: deepseek-v4-flash
- **Prompt**: /ws-code-review over the last 20 commits + fix round
- **Done**: Reviewed fa703c1..HEAD (312 files); cross-checked index.PRD/plans; found 2 Warnings (index.PRD drift; resolve_phase_model dead config path), 2 Suggestions (ws-preview branch hardcode; self_learning hardcoded recipe); applied surgical fixes for all four.
- **Result**: W1: index.PRD now lists us-209/210/211 + commit-before-code-review (feature map, next specs, done log). W2: update_state.py std+lite resolve models via resolve_consumer_root (probe: step4/7 → composer-2.5; CLI round-trip exit 0, loc mapping + completedSteps union [0,1,2] verified). S1: run_dry_run.sh errors when target branch unset instead of hardcoding refs/heads/main. S2: MEMORY.md header uses {skillsRoot}/... token. Review: .agents/plans/last-20-commits/step-06-last-20-commits.review.md (+fix.report.md). Fixes left uncommitted in working tree.

### [2026-08-15 16:09] Agent: GPT-5.6 Sol
- **Prompt**: /ws-ship-pr
- **Done**: Prepared, committed hero assets, pushed `develop`, created PR 215, waited for review/CI, merged with `develop` intact.
- **Result**: https://github.com/jpolvora/workflow-skills/pull/215 merged. Tests, integrity, and Agentic Code Review passed. `activeThreads == 0`.

### [2026-08-15 15:32] Agent: GPT-5.6 Sol
- **Prompt**: Add the supplied animation above the top hero title with responsive phone and desktop embedding.
- **Done**: Added a cinematic responsive video hero with muted autoplay, WebM/MP4 sources, a WebP poster, and mobile styling.
- **Result**: The optimized 1280x500 animation plays above “Workflow Skills” without horizontal overflow and keeps the title visible on desktop and phone viewports.

### [2026-08-15 12:55] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr https://github.com/jpolvora/workflow-skills/issues/211
- **Done**: Entry resume of leftover `testing-executor-model` (user chose resume, then mark-complete). Confirmed feature commits already in develop (0 unique; 51 behind). Restored HEAD to `develop`; Phase A cleanup CLEAN; state `status: completed`.
- **Result**: Leftover workflow closed. Issue 211 was not started.


### [2026-08-15 12:29] Agent: Cursor Grok 4.6
- **Prompt**: /ws-write-plan update again for commit-before-code-review
- **Done**: Rewrote `.agents/plans/commit-before-code-review/step-01-commit-before-code-review.plan.md` — Steps 1–5 and hub docs marked landed; remaining = leftover grep, harness, optional STACK.md `{base}`, ship
- **Result**: Plan matches current tree. Next: `ws-interview` or skip to verify/ship.

### [2026-08-15 12:28] Agent: Cursor Grok 4.6
- **Prompt**: implement commit-before-code-review (G2-code after verify and after review-fix)
- **Done**: Path-scoped `commit-code`; required G2-code save points in gates/PROTOCOLS/STEP-DISPATCH/lite; `ws-code-review` committed `{base}...HEAD` fail-closed; `check_workflows.py` contract scan; regenerated `bin/skill-integrity.json`
- **Result**: `check_workflows.py` 0 issues; `npm run test` pass. Next: interview leftovers or ship-pr.

### [2026-08-15 12:20] Agent: Cursor Grok 4.6
- **Prompt**: Move dev-harness skill into a compact inlined contract in root AGENTS.md; refresh from latest ws-tdah / senior / karpathy / etc.
- **Done**: Inlined `AGENTS.md` § Upstream session contract (snapshot 0.3.18); deleted `.agents/dev-harness/SKILL.md`; retargeted routers; synced `ws-shared/AGENTS.md` + README; regenerated hub integrity
- **Result**: Session autoload is this file only. Live `ws-*` SKILL.md still load only when authoring or testing that skill.

### [2026-08-15 12:12] Agent: Cursor Grok 4.6
- **Prompt**: Update faqs/readme/docs/agents for commit-before-code-review step order
- **Done**: Documented verify → product commit → review → review-fix commit in README, root/ws-shared AGENTS, orch FAQ/README/DIAGRAM/run-test, and docs/index.html stepper + FAQ
- **Result**: Human and agent docs match the new product-commit order. Skill gate implementation (PROTOCOLS/gates/tools) still pending.

### [2026-08-15 12:08] Agent: Cursor Grok 4.6
- **Prompt**: /ws-write-plan for `.agents/specs/commit-before-code-review.spec.md`
- **Done**: Wrote `.agents/plans/commit-before-code-review/step-01-commit-before-code-review.plan.md` (sections 0–8; path-scoped G2-code after verify and after review-fix)
- **Result**: Plan path ready for `ws-interview` (or `ws-plan-to-tasks` if interview skipped).

### [2026-08-15 12:05] Agent: Cursor Grok 4.6
- **Prompt**: Mirror global vs local ws-* note in README.md
- **Done**: README Safety bullet + Contribute § This clone vs a global install; site Contribute box + FAQ Q8 one-liners (no version bump)
- **Result**: Human docs point at AGENTS.md § Global vs local `ws-*`. Consumer hybrid unchanged.

### [2026-08-15 11:53] Agent: Cursor Grok 4.6
- **Prompt**: /ws-write-spec — first product commit too late; commit after verify before code-review, then commit review fixes
- **Done**: Wrote `.agents/specs/commit-before-code-review.spec.md` (no plan register)
- **Result**: Spec of record ready. Next: register or `ws-spec-to-pr` / lite.

### [2026-08-15 11:50] Agent: Cursor Grok 4.6
- **Prompt**: Verify global vs local ws-* handling in this upstream repo; add an AGENTS.md note; prefer stable global load
- **Done**: Added root `AGENTS.md` § Global vs local `ws-*` (default invoke `{globalSkillsRoot}`, edit local SoT only, no IDE switch); pointer in `.agents/dev-harness/SKILL.md`
- **Result**: Tie-break documented. Consumer hybrid unchanged. Author/test still uses `$PWD/.agents/skills/ws-*`.

### [2026-08-14 08:06] Agent: Cursor Grok 4.6
- **Prompt**: Sync all *.spec.md into index.PRD
- **Done**: Indexed three unmapped specs (`add-enable-dag-config`, `us-202`, `ws-doctor-204-205`) as Phase 4 done rows 30–32 + Done log; catalog cleanup stays the open todo
- **Result**: `{specsDir}` specs of record now all have index rows. Open Next-spec remains `skill-catalog-cleanup`.

### [2026-08-14 08:04] Agent: Cursor Grok 4.6
- **Prompt**: Register skill-catalog-cleanup.spec.md and add it to index.PRD
- **Done**: register_local_spec wrote spec of record + step-00; index Phase 4 `[ ]` bullet and Next-specs row 29
- **Result**: Ready for `ws-spec-to-pr` / lite on slug `skill-catalog-cleanup`

### [2026-08-14 07:56] Agent: Cursor Grok 4.6
- **Prompt**: Draft a spec for the recommended skill catalog cleanup (Extra demotion + patterns merge)
- **Done**: Wrote `.agents/specs/skill-catalog-cleanup.spec.md` (no plan register)
- **Result**: Spec of record ready. Next: register or `ws-spec-to-pr` / lite.

### [2026-08-14 07:23] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr on ws-doctor-204-205.spec.md; set full auto + ship + ws-goal-fix-pr
- **Done**: Standard orch 0–9; PR 206 merged (`a36dc76`); issues #204 and #205 closed; MEMORY trap for doctor skill-folder docs/ vs hybrid skillsRoot
- **Result**: https://github.com/jpolvora/workflow-skills/pull/206 MERGED into `main`; `develop` kept

### [2026-08-13 22:15] Agent: cursor-grok-4.6-high
- **Prompt**: ws-ship-pr Step 8 create-pr (ws-doctor-204-205, stopBeforeFixPr)
- **Done**: Product commit `f1f77a9` (doctor docs/ resolution + python launchers, v0.3.17 bump/integrity); delivery commit `337cc57` (step-01 plan); pushed `develop`; opened PR
- **Result**: https://github.com/jpolvora/workflow-skills/pull/206 (develop→main). Stopped before merge / goal-fix-pr.

### [2026-08-13 21:23] Agent: Cursor Grok 4.6
- **Prompt**: Get existing 2 GitHub issues and create a local spec /ws-write-spec to fix them
- **Done**: Drafted `.agents/specs/ws-doctor-204-205.spec.md` covering #204 (python launcher on register_local_spec.py) and #205 (skill-folder docs/ false positive)
- **Result**: Spec of record written; not registered into a plan folder. Next: `ws-local-spec-provider` register or `ws-spec-to-pr` / lite.

### [2026-08-13 16:19] Agent: Cursor Grok 4.6
- **Prompt**: /ws-ship-pr
- **Done**: Reused PR 203; settle re-collect `activeThreads: []`; merged `--merge` (`e415dc1`); `develop` kept
- **Result**: https://github.com/jpolvora/workflow-skills/pull/203 MERGED into `main`

### [2026-08-13 18:50] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr issue 202 then ws-ship-pr ws-goal-fix-pr
- **Done**: Nested telemetry.loc YAML round-trip + duplicate completedSteps union in both update_state.py copies; test/test-update-state-yaml.js
- **Result**: https://github.com/jpolvora/workflow-skills/pull/203 MERGEABLE; `activeThreads: []`; CI review+test SUCCESS. This skill does not merge.

### [2026-08-13 13:10] Agent: Cursor Grok 4.6
- **Prompt**: Fix extra blank lines in every SKILL.md, then ship commit / push / PR / goal-fix-pr
- **Done**: Replaced `slice(4)` bump parser with LF-safe `rewriteSkillMarkdown`; trimmed 43 SKILL.md frontmatters; bumped 0.3.15; `.gitattributes` SKILL.md eol=lf; regression test
- **Result**: https://github.com/jpolvora/workflow-skills/pull/201 MERGED (`7eaf38f`); `activeThreads: []`; CI review+test SUCCESS

### [2026-08-13 12:54] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr (PR 199)
- **Done**: Fixed stale sequential DAG skip wording in `ws-spec-to-pr-run-test.md`; regenerated integrity; resolved `PRRT_kwDOTFajc86ZAoqC`; pushed `610e821`
- **Result**: `activeThreads: []`; CI review+test SUCCESS. PR 199 ready to merge (this skill does not merge).

### [2026-08-13 08:18] Agent: Cursor Grok 4.6
- **Prompt**: Clean up unused worktrees / temp files merged / delivered
- **Done**: Deleted leftover `uswf/` tag; removed merged local branches (`feat/refine-ws-activity-report-human-timing`, `feature/testing-executor-model`, `feat/check-harness-upstream-sot`); ff `main` to `origin/main`; removed stale `/tmp` copies
- **Result**: Primary worktree only; `develop` clean. Kept unmerged `feat/ws-configure-project-autoconfig-gate` and `keep/testing-model-on-develop`

### [2026-08-13 08:15] Agent: Cursor Grok 4.6
- **Prompt**: Remove leftover files, clean working directory, prepare for next spec
- **Done**: Deleted untracked fable-judge/release-0.3.12 audit scratch; restored `telemetry/aggregate.json` to HEAD
- **Result**: `develop` clean vs `origin/develop`; ready for next spec

### [2026-08-12 17:25] Agent: Cursor Grok 4.6
- **Prompt**: commit, then ship-pr
- **Done**: Committed harness + AGENTS.md routing (`2028ccb`); pushed `develop`; opened PR 197; CI review+test green; `activeThreads=0`
- **Result**: Merging PR 197 into main (merge commit; `develop` kept)

### [2026-08-12 17:05] Agent: Cursor Grok 4.6
- **Prompt**: /ws-ship-pr /ws-goal-fix-pr
- **Done**: Committed a118deb, pushed develop, opened PR 196, reran failed OpenCode review install, converged 0 threads, merged, fast-forwarded develop to main
- **Result**: https://github.com/jpolvora/workflow-skills/pull/196 MERGED (`0529660`)

### [2026-08-12 17:05] Agent: Cursor Grok 4.6
- **Prompt**: Refactor AGENTS.md so upstream development does not depend on live ws-* skill bodies; create a non-packaged concatenated harness
- **Done**: Added `.agents/dev-harness/SKILL.md` (frozen operating contract outside `.agents/skills/`); pointed root AGENTS.md session autoload, DX dogfood, write-spec/senior/fable/learning/changelog routes at that file
- **Result**: This repo autoloads the harness; packaged `ws-*` SoT unchanged; consumers still load installed skills

### [2026-08-12 16:57] Agent: Cursor Grok 4.6
- **Prompt**: Update website and README with new skills/features, launch 0.3.12, run harness/workflow checks with auditing, fix, test, prepare to ship-pr
- **Done**: Documented ws-doctor, ws-audit, enableAuditing, testingModel, feature-branch gate; bumped package to 0.3.12; regenerated integrity; enabled local defaults.enableAuditing
- **Result**: Checks green (harness 0 critical, workflows PASS, npm test exit 0); prepare-to-PR board ready; uncommitted release diff on develop

### [2026-08-12 16:50] Agent: Cursor Grok 4.6
- **Prompt**: Sync index.PRD with all spec files and merged/delivered evidence
- **Done**: Marked continuous-ai done (PR 164); added 8 missing disk specs (Phase 4 + historical nested); set `status: completed` on delivered spec frontmatter
- **Result**: index.PRD has 0 open Next-specs; all `{specsDir}` spec-of-record files indexed

### [2026-08-12 16:47] Agent: Cursor Grok 4.6
- **Prompt**: /ws-multi-spec continue (new batch)
- **Done**: Queued 4 specs; already-implemented probe skipped all (spec-list on main, PRs 164/186/190)
- **Result**: Run ms-20260812T204614Z completed with 0 workers dispatched

### [2026-08-12 16:43] Agent: Cursor Grok 4.6
- **Prompt**: /ws-multi-spec continue (item 2 PR 194)
- **Done**: Resolved last 2 PR 194 threads (stale checkout-only quote; fetch-then-checkout already on develop); merged PR 194 into main; synced develop
- **Result**: Batch ms-20260812T191636Z completed: 2 shipped (195, 194), 2 skipped (already on main)

### [2026-08-12 16:48] Agent: Cursor Grok 4.6
- **Prompt**: ws-goal-fix-pr PR 194 (ws-multi-spec; do not merge)
- **Done**: Drove threads to 0 across 6 fix rounds (ls-remote existence, --no-track rationale, autoMode local-check-only, fetch-then-checkout). Master merged PR during the last wait.
- **Result**: Converged; activeThreads=0; checks green on merged SHA; this skill did not merge


- **Prompt**: ws-goal-fix-pr PR 194 round 6 (fetch before checkout-existing)
- **Done**: Remote-only feat/{slug} now git fetch then checkout; autoMode uses same recipe
- **Result**: Tests green; resolving 2 threads and pushing develop


- **Prompt**: ws-goal-fix-pr PR 194 round 5 (autoMode ls-remote fallback)
- **Done**: autoMode local-check-only on ls-remote auth/network; gates.md row; resolved index.PRD thread with no code
- **Result**: Tests green; resolving 3 threads and pushing develop


- **Prompt**: ws-goal-fix-pr PR 194 round 4 (score-3 @{u} rationale + ls-remote failure)
- **Done**: Aligned ship-pr/spec @{u} rationale with --no-track; added 5b ls-remote auth/network STOP
- **Result**: Tests green; resolving 4 threads and pushing develop


- **Prompt**: ws-goal-fix-pr PR 194 round 3 (ls-remote existence check)
- **Done**: setup.md 5b uses git branch --list + ls-remote for feat/{slug}; re-check alternate names; autoMode detached same check; AC6 test + integrity
- **Result**: Tests green; resolving 3 threads and pushing develop

### [2026-08-12 15:50] Agent: Cursor Grok 4.6
- **Prompt**: ws-goal-fix-pr PR 194 (ws-multi-spec; converge threads; do not merge)
- **Done**: Round 1 threads already resolved; new review check failed on parser (no posted threads). Tightened vacuous AC2/AC7 asserts in test-feature-branch-gate.js; skipped version bump (score 5).
- **Result**: Tests green locally; pushing develop; waiting for next review/CI


### [2026-08-12 15:40] Agent: Cursor Grok 4.6
- **Prompt**: ws-goal-fix-pr PR 195 (ws-multi-spec; wait for review; converge threads; do not merge)
- **Done**: Waited for Agentic Code Review to finish; list-threads stayed empty; test+review both pass; no code fixes; stayed on feature/testing-executor-model
- **Result**: Converged; activeThreads=0; checks green; merged=false (caller merges)

### [2026-08-12 15:25] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr full auto .agents/specs/testing-executor-model.spec.md (ws-multi-spec worker; ship PR to main)
- **Done**: Added optional defaults.testingModel (test executor); narrowed reviewerModel to Steps 5-6; documented Step 7 resolve; interview + lite non-use + ws-testing note; tests + integrity
- **Result**: Implementation complete on feature/testing-executor-model; shipping PR to main (stopBeforeFixPr)

### [2026-08-12 15:13] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr (resume unfinished enable-auditing)
- **Done**: Resumed stale Step 2 run; user marked completed because `2cec03f` already on develop; skipped Step 9 (no PR from this run); Phase A git cleanup deleted `uswf/enable-auditing-20260812T020840Z/before-step-0`
- **Result**: Workflow `enable-auditing-20260812T020840Z` status completed; plan artifacts kept

### [2026-08-12 15:06] Agent: Cursor Grok 4.6
- **Prompt**: /ws-sync-spec (no target)
- **Done**: Synced `.agents/specs/workflow-bootstrap-feature-branch.spec.md` to shipped 5b/4b gate (checkout-existing, fetch-fail, resume autoMode checkout, skip-pull); left step-00 copy unchanged per gate
- **Result**: Spec of record updated with Revision History 2026-08-12; no other specs matched working-tree code

### [2026-08-12 15:12] Agent: Cursor Grok 4.6
- **Prompt**: /ws-write-spec add config.json testingModel (test executor) beside other LLM models; default equals executionModel; use it in the testing step
- **Done**: Drafted local spec `.agents/specs/testing-executor-model.spec.md` (source: local, id: null); no plan register
- **Result**: Spec of record ready; next is register + classify, or start orch

### [2026-08-12 15:10] Agent: Cursor Grok 4.6
- **Prompt**: Return to develop; commit/push/ship PR for workflow-bootstrap-feature-branch only
- **Done**: Isolated 5b/4b feature-branch gate from mixed AutoConfig commit; staged setup/gates/ship-pr/lite/PROTOCOLS/spec/tests/integrity; left AutoConfig files on feat/ws-configure-project-autoconfig-gate
- **Result**: Shipping develop → main after prepare board

### [2026-08-12 14:55] Agent: Cursor Grok 4.6
- **Prompt**: implement workflow-bootstrap-feature-branch via ws-spec-to-pr (autoMode)
- **Done**: Shared setup.md 5b feature-branch gate + resume 4b; gates.md auto-gates; PROTOCOLS branchStrategy/baseBranch; ship-pr shipHead from state.branch with skip-pull when no upstream; lite setup.md pointer; contract tests; W1 autofix
- **Result**: Implementation complete on develop (auto stay); ship skipped (fullMode false); score 9/10; review clean after 1 fix. Ask to ship/PR if wanted.

### [2026-08-12 14:50] Agent: Cursor Grok 4.6
- **Prompt**: ws-spec-to-pr Step 7 (ws-testing) for workflow-bootstrap-feature-branch; skip-browser; mutation skipped
- **Done**: Wrote testing.plan.md + testing.report.md; ran `node test/test-feature-branch-gate.js` (exit 0, AC1–AC11) plus sibling Node contracts except install
- **Result**: Step 7 passed; install/Phase 0b skipped (concurrent ws-configure-project tree); mutation skipped

### [2026-08-12 14:45] Agent: Cursor Grok 4.6
- **Prompt**: Implement ws-configure-project-autoconfig-gate.spec.md
- **Done**: Added mode gate (AutoConfig vs confirm-by-group), configure_autoconfig.py merge-write helper, INTERVIEW.md rules, tests, evals; integrity regenerated
- **Result**: AC1–AC8 covered; helper never writes scm=local, autoload true, secrets, or root AGENTS.md

### [2026-08-12 14:31] Agent: Cursor Grok 4.6
- **Prompt**: /ws-write-spec AutoConfig vs confirm-by-group user-gate for ws-configure-project
- **Done**: Drafted local spec `.agents/specs/ws-configure-project-autoconfig-gate.spec.md` (source: local, id: null); no plan register
- **Result**: Spec of record ready; next is register + classify, or start orch

### [2026-08-12 14:28] Agent: Cursor Grok 4.6
- **Prompt**: ws-spec-to-pr Step 3 (ws-plan-to-tasks) decompose workflow-bootstrap-feature-branch plan into a DAG
- **Done**: Wrote parallel exec plan + DAG (T1–T7, 4 levels); A+B combined on setup.md; lite setup.md pointer kept; integrity last; no version bump
- **Result**: execMode parallel; artifacts ready for ws-implement-tasks

### [2026-08-12 14:06] Agent: Cursor Grok 4.6
- **Prompt**: /ws-write-spec for a bootstrap feature-branch gate (create from current, from base, or stay)
- **Done**: Drafted local spec `.agents/specs/workflow-bootstrap-feature-branch.spec.md` (source: local, id: null); no plan register
- **Result**: Spec of record ready; next is register + classify, or start orch

### [2026-08-12 11:48] Agent: Cursor Grok 4.6
- **Prompt**: Configure planner/execution/reviewer models in ws-shared/config.json
- **Done**: Set defaults.plannerModel=cursor-grok-4.6-high, executionModel=composer-2.5, reviewerModel=kimi-k3-high (Cursor Task slug list)
- **Result**: Local gitignored config updated; autoMode phase switch will use these IDs

### [2026-08-12 12:15] Agent: Cursor Grok 4.5
- **Prompt**: /ws-ship-pr 192 (promote #192 develop → main)
- **Done**: Bumped package to 0.3.10; opened #193; fixed review threads (no-telemetry idle fallback, PYTHON env, idle-gap docs/tests, past-date fixtures); converged CI + 0 threads; merged
- **Result**: https://github.com/jpolvora/workflow-skills/pull/193 MERGED (`c58cbe6`); main has activity-report human≥agent billing at v0.3.10

### [2026-08-12 04:32] Agent: Cursor Grok 4.5
- **Prompt**: /ws-ship-pr (context PR #192)
- **Done**: Prepared and shipped `feat/refine-ws-activity-report-human-timing` → `develop`; pinned test consumer to 0.3.9; fable VERIFIED; converged (0 threads); merged #192
- **Result**: https://github.com/jpolvora/workflow-skills/pull/192 MERGED (`746d157`); develop fast-forwarded; telemetry aggregate written

### [2026-08-12 04:15] Agent: Cursor Grok 4.5
- **Prompt**: https://github.com/jpolvora/workflow-skills/pull/192
- **Done**: Re-merged `develop` (5f7c5fa #191 dep-graph leaf) into feature branch; regenerated `bin/skill-integrity.json` only (no `git add -A`)
- **Result**: PR #192 conflicts cleared again; staged/pushed merge commit

### [2026-08-12 03:56] Agent: Cursor Grok 4.5
- **Prompt**: resolve conflicts
- **Done**: Merged `develop` into `feat/refine-ws-activity-report-human-timing` for PR #192; resolved 3 hunks (enable-auditing Notes `{specsDir}`, package.json tests union, regen integrity); removed accidental plan artifacts staged by `git add -A`
- **Result**: PR #192 mergeable (CLEAN); branch pushed; local plan artifacts restored as untracked

### [2026-08-12 02:40] Agent: Cursor Grok 4.5
- **Prompt**: ws-spec-to-pr Step 6 ws-code-review (autoMode) for ws-doctor
- **Done**: Reviewed land; fixed W1 asciiSafe punctuation mangling + W2 SKILL/engine py_compile vs ast.parse drift; regen integrity; wrote step-06 review + fix report
- **Result**: Advance-ready (0 Critical / 0 Warning after 1 fix round)

### [2026-08-11 22:04] Agent: Cursor Grok 4.5
- **Prompt**: Refine enable-auditing intent — log errors, propose upstream GH issue (not PR)
- **Done**: Updated spec SoT + re-registered `step-00`; end-of-run gate opens GitHub issue on original upstream repo
- **Result**: `.agents/specs/enable-auditing.spec.md` + plan copy synced

### [2026-08-11 21:58] Agent: Cursor Grok 4.5
- **Prompt**: /ws-local-spec-provider (register enable-auditing)
- **Done**: Registered spec of record → workflow copy under `{plansDir}/enable-auditing/`
- **Result**: `specsPath` + `specPath` written; `source: local`

### [2026-08-11 21:55] Agent: Cursor Grok 4.5
- **Prompt**: /ws-write-spec enableAuditing config + runtime orch audit wrapper
- **Done**: Drafted local spec `.agents/specs/enable-auditing.spec.md` (`defaults.enableAuditing` default false; runtime wrapper for script/tool/I/O/dispatch; log recovered skill defects; end-of-run fix-PR gate)
- **Result**: Spec of record written; not registered to a plan folder (standalone write-spec)

### [2026-08-11 15:31] Agent: Cursor Grok 4.5
- **Prompt**: /ws-spec-index sync, cleanup, promote — update index.PRD
- **Done**: Promoted unindexed shipped specs; synced E1 for #184/#186/#187/#188 (+ #88 checksums); cleaned Next specs (only continuous-ai remains todo)
- **Result**: `.agents/specs/index.PRD` updated

### [2026-08-10 16:09] Agent: Cursor Grok 4.5
- **Prompt**: /ws-spec-to-pr auto full ship + goal-fix-pr for configurable-consumer-autoload
- **Done**: Shipped `defaults.autoload` v0.3.4; fixed Yes-path root-before-flag (#188 threads); goal-fix-pr converged; merged
- **Result**: https://github.com/jpolvora/workflow-skills/pull/188 MERGED

### [2026-08-10 15:56] Agent: Cursor Grok 4.5
- **Prompt**: /ws-spec-to-pr auto full ship + goal-fix-pr for configurable-consumer-autoload
- **Done**: Implemented `defaults.autoload` (v0.3.4); configure `--set-autoload` + flag-gated harness `--check`; AC11 tests; integrity regenerated
- **Result**: Ready to commit/push/PR develop→main

### [2026-08-10 15:42] Agent: Cursor Grok 4.5
- **Prompt**: /ws-local-spec-provider (register configurable-consumer-autoload)
- **Done**: Registered spec of record → workflow copy under `{plansDir}/configurable-consumer-autoload/`
- **Result**: `specsPath` + `specPath` written; `source: local`

### [2026-08-10 15:38] Agent: Cursor Grok 4.5
- **Prompt**: /ws-write-spec configurable consumer autoload (config flag + root AGENTS.md + harness)
- **Done**: Drafted local spec `.agents/specs/configurable-consumer-autoload.spec.md` (`defaults.autoload` default false; configure interview; harness enforce when true)
- **Result**: Spec of record written; not registered to a plan folder (standalone write-spec)

### [2026-08-10 15:35] Agent: Cursor Grok 4.5
- **Prompt**: /ws-spec-to-pr auto full ship goal-fix-pr for configurable delivery-commit artifacts
- **Done**: Implemented `defaults.deliveryCommitArtifacts` (v0.3.3); shipped PR #187; delivery commit staged refined plan only (result excluded by default); goal-fix-pr converged (0 threads)
- **Result**: Merged to main after green CI + review; behavior change: delivery result opt-in

### [2026-08-10 15:07] Agent: Cursor Grok 4.5
- **Prompt**: /ws-write-spec for configurable delivery-commit artifacts (configure-project + config defaults)
- **Done**: Drafted local spec `.agents/specs/configurable-delivery-commit-artifacts.spec.md` (includeRefinedPlan true, includeDeliveryResult false, other artifacts opt-in)
- **Result**: Spec of record written; not registered to a plan folder (standalone write-spec)

### [2026-08-10 09:30] Agent: Cursor Grok 4.5
- **Prompt**: Implement and ship mutation testing gate for Spec-to-PR workflow
- **Done**: Opt-in Step 7 mutation substep in `ws-testing` (`verification.mutationTest` / `mutationThreshold`, `defaults.skipMutationTesting`); config schema/example; STEP-DISPATCH/gates/DIAGRAM/PROTOCOLS/lite note/hubs/README/site; package 0.3.2 + integrity
- **Result**: `npm run test` green; `check_workflows` PASS; secrets scan clean; ready for develop→main ship-pr

### [2026-08-09 03:30] Agent: Cursor Grok 4.5
- **Prompt**: Ship ws-activity-report — site, harness, deps, checksums, bump 0.3.1, ship-pr + goal-fix-pr
- **Done**: Added portable `ws-activity-report` (bootstrap start → max thread/commit end); registered in workflows graph + hubs; README/catalog; `npm run build-site:bump` → 0.3.1; integrity regenerated
- **Result**: `npm run test` green; `verify-integrity` OK; ws-check-harness 0 critical; prepare board ready for develop→main PR

### [2026-08-08 21:45] Agent: Cursor Grok 4.5
- **Prompt**: Fix then review last 5 merged PRs (#178–#182) against latest intent; implement clear gaps
- **Done**: Hardened `configure_autoload.py` (preserve custom Always-applied membership/triggers; skill↔path mismatch warning; absolute-path detection without `https://` false positives; non-DOTALL table replace); interview Fast exit now still Resolve/sweeps non-blocking gaps + eval id 4; harness evals 3–4 for upstream `.agents/skills` vs consumer scan roots; refreshed remove-consumer-agents completed spec + index.PRD; CI installs ripgrep before tests
- **Result**: `npm run test` green; `verify-integrity` exit 0; `check_workflows.py` PASS 0 issues; autoload `--check` exit 0; US-183 artifacts left untouched; no commit/push

### [2026-08-08 18:35] Agent: Cursor Opus 5
- **Prompt**: fix the secrets scanner
- **Done**: The repo's `.git/hooks/pre-commit` was a pre-`ws-*`-rename copy pointing at `secrets-leak-review/`, so every commit printed "Scanner not found, skipping". Root cause: `install-hook.sh` believed `ln -sf` succeeded while Git Bash silently wrote a copy that froze the skill path. Installer now verifies `[ -L ]` and otherwise writes an 11-line runtime-resolving shim (marker `ws-secrets-leak-review-hook`, backs up only foreign hooks); `pre-commit.sh` resolves the scanner across project-local then `WORKFLOW_SKILLS_GLOBAL_DIR`/`$HOME/.agents/skills`, and now skips loudly on missing skill, missing `rg`, or non-zero scanner exit instead of reading as a clean scan. Also fixed the scanner's `.gitignore` audit: glob entries (`*.pem`) were being matched as regex and CRLF checkouts defeated `^entry$`, so 7 present entries were reported missing — replaced with a literal whole-line compare
- **Result**: Hook reinstalled; planted AWS key blocks the commit (exit 1, correct finding), clean staged file passes silently (exit 0), genuinely missing `.gitignore` entries still warn; `bash -n` clean on all three scripts; `npm run test` green; `verify-integrity` exit 0

### [2026-08-08 17:30] Agent: Cursor Opus 5
- **Prompt**: fix ws-* scm providers and local-spec provider to always first create the spec in `{specsDir}` then workflow steps go to `{plansDir}`
- **Done**: `fetch-to-spec` is now two ordered phases for every provider. `register_local_spec.py` writes the `{specsDir}` spec of record before the `{us-dir}/step-00` workflow copy (in-place normalize when the input already lives under specsDir, so no duplicate flat twin), gained `--source` (origin no longer forced to `local`), `--repo-root`, and dropped `--mirror`; `github-issue-to-spec.py` / `ado-workitem-to-spec.py` default `--output` to `{specsDir}/us-{id}.spec.md` (config-resolved, CWD-aware for global installs) and print the register follow-up. Both SCM providers now delegate promotion to that single primitive — SKILL/INTENTS contracts, `plans.specsDir` config keys, Done-when, `setup.md`, `autoload.md`, `ARTIFACTS.md`, `PROTOCOLS.md`, `STEP-DISPATCH.md`, `FORMAT.md`, faq, lite orch, spec-index reference and the provider feature spec updated; dependency edges `ws-github-provider` / `ws-azure-devops-provider` / `ws-write-spec` → `ws-local-spec-provider` added in both graphs
- **Result**: `npm run test` green; `verify-integrity` exit 0; `check_workflows.py` 0 issues; site catalog rebuilt with new dep pills; GitHub + ADO fixtures verified end-to-end (spec of record then `step-00`, `source:` preserved as `github` / `azure-devops`)

### [2026-08-08 16:45] Agent: Cursor Opus 5
- **Prompt**: fix AGENTS.md progressive disclosure router + call autoload.md for dev skills + document install/update/local code-review commands; remove references to `.agents/AGENTS.md`
- **Done**: Root `AGENTS.md`: added § Progressive disclosure (load on demand), autoload.md session-start load contract, § Development commands + § Review & audit commands, new task-router rows; purged all live references to the deleted `.agents/AGENTS.md` across root hub, `ws-shared/AGENTS.md`, `ws-check-harness` (SKILL.md + PHASES.md — upstream marker now `bin/skill-dependencies.json` + `bin/cli.js`, dual-hub drift vs `{sharedDir}/AGENTS.md`), `README.md`, `bin/cli.js` help, `install-skills.sh`, reviewer prompt, and generalized the install test guard to "no stray docs above `.agents/skills/`"; regenerated integrity
- **Result**: `npm run test` green; `verify-integrity` exit 0; all links/anchors in edited hubs resolve; harness upstream-mode detection no longer depends on a deleted file

### [2026-08-08 12:15] Agent: Cursor Grok 4.5
- **Prompt**: finish pending (shared-autoload-md open ACs)
- **Done**: Added configure_autoload.py + `--section autoload`; harness Phase 2 autoload/dual-hub rules; tests; promoted both pending specs into index.PRD as done
- **Result**: AC2–AC9 closed; next indexed todo remains continuous-ai-verification-quality-gates

### [2026-08-08 03:30] Agent: Cursor Grok 4.5
- **Prompt**: Apply SKILL_AUTHORING.md audit fixes across all src/skills
- **Done**: Restored truncated implement-tasks Build mode + code-review steps 3–6 + senior-developer sections; added config entry gates; user-gate portability (AskQuestion out of skill bodies); tokenized {skillsRoot}/{sharedDir} script paths; hardened Done-when; moved templates to references; deduped skipQualityGates into gates.md
- **Result**: Authoring contract backlog applied in src/skills SoT

### [2026-08-08 03:45] Agent: Cursor Grok 4.5
- **Prompt**: Implement interview project-context auto-answer
- **Done**: Strengthened `ws-interview` with mandatory project-context sweep, evidence/`resolutionSource` on resolve, autoMode model-inferred vs interactive escalate; cross-linked gates + PROTOCOLS 2b; eval id 3; `npm run sync-skills`
- **Result**: SoT + dogfood aligned; plan artifacts restored under `{plansDir}/interview-project-context-auto-answer/`

### [2026-08-01 21:50] Agent: Cursor Grok 4.5
- **Prompt**: Make ws-spec-list differentiate specs vs plans
- **Done**: Rewrote ws-spec-list as dual boards (`{specsDir}` specs vs `{plansDir}` plans); step-00 under plans is plan-only; separate actions/evals; hub/README wording
- **Result**: Specs and plans no longer share one inventory table

### [2026-08-01 21:45] Agent: Cursor Grok 4.5
- **Prompt**: Add specs directory property to config (default `.agents/specs`) and wire spec skills to it
- **Done**: Confirmed/aligned `plans.specsDir` in config + example; added `{specsDir}` path token; fixed local-spec scripts (`ws-shared` config path + `.agents/specs` default); updated sync-spec/write-spec/spec-index/multi-spec/hubs/README
- **Result**: `detect_specs_dir.py --detect` resolves `.agents/specs`; skills synced via `npm run sync-skills`

### [2026-08-01 13:32] Agent: Cursor Grok 4.5
- **Prompt**: Create consumer skill `ws-spec-list` — board of project specs with state/completion/delivery + manage menu
- **Done**: Added `src/skills/ws-spec-list` (SKILL + ACTIONS + evals); Workflows package + hubs/routers; dogfood `.agents/skills/ws-spec-list`; site catalog + README
- **Result**: Accepted; integrity/`build-site:bump`/`ws-check-harness` deferred to ship

---

## 2026-08-12 — ws-doctor skill (spec-to-pr)

- **Prompt:** `/ws-spec-to-pr` on `ws-doctor.spec.md` with `full auto ship-pr`
- **Done:** Shipped `ws-doctor` read-only diagnostic skill + hubs/deps/tests; package 0.3.8; PR #191 merged
- **Result:** https://github.com/jpolvora/workflow-skills/pull/191