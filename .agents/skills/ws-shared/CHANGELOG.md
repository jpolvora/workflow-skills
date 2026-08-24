# Changelog

### [2026-08-23 23:20] Agent: Composer
- **Prompt**: Remove ws-audit skill completely
- **Done**: Deleted ws-audit skill tree and tests; stripped orch/ship/fix invoke sites, catalogs, doctor switch, config flag (already absent from schema/config); regenerated integrity/site
- **Result**: Package no longer ships runtime audit observer or defaults.enableAuditing

### [2026-08-23 23:00] Agent: Composer
- **Prompt**: Which skill requires FEATURES.md; make optional via config.json
- **Done**: Documented hard fail was `test-doc-sync.js` (not a runtime skill); added `tracking.featuresMdEnabled`; wired ws-task-lifecycle + hubs + doc-sync
- **Result**: Consumers can set `featuresMdEnabled: false` to disable FEATURES.md walk/require

### [2026-08-23 22:35] Agent: Composer
- **Prompt**: Audit unfinished workflows vs PRs/commits/code; close stale leftovers
- **Done**: Marked us-217 (#219), deepseek-harness-improvements (#216), us-209 (#213), us-211 (#212) completed; cancelled superseded us-211 pause run; rebuilt plans index
- **Result**: 0 unfinished workflows remain; ready for new `/ws-spec-to-pr` start

### [2026-08-23 22:26] Agent: Cursor Grok 4.6
- **Prompt**: /ws-cleanup → Delete listed candidates
- **Done**: Removed 96 disposable paths (scratch, shipped orphans under us-236, `.tmp-*`, review rounds)
- **Result**: Plan/runtime leftovers cleared; tracked plan state files remain dirty locally

### [2026-08-23 22:16] Agent: Cursor Grok 4.6
- **Prompt**: track 236
- **Done**: Added `us-236` to Feature map + Next-specs; marked `[x]` with Done-log row for PR #238
- **Result**: `.agents/specs/index.PRD` tracks shipped `ws-task-lifecycle` / autoload opt-in

### [2026-08-23 17:59] Agent: Cursor Grok 4.6
- **Prompt**: Merge PR 238 after fix-pr convergence
- **Done**: Merged develop → main; commented issue #236; Step 9 completed; lease released
- **Result**: https://github.com/jpolvora/workflow-skills/pull/238 merged (`7203c86`)

### [2026-08-23 17:54] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr 238 round 6
- **Done**: Tighten hasMergedDelivery: reject `not merged PR`; require whole-line `status: completed`
- **Result**: Blocked/open step-08 notes stay pending on blank scan

### [2026-08-23 17:47] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr 238 round 5
- **Done**: canonicalFiles docs + Completion walk resolve bare `index.PRD` to `{specsDir}` when repo-root is missing
- **Result**: Explicit default arrays no longer skip the real spec index

### [2026-08-23 17:42] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr 238 round 4
- **Done**: Bare `PR #` no longer marks already-implemented; index lookup uses file slug; `status: completed` still omits
- **Result**: Open PRs stay selectable on blank scan; `[x]` filename rows match diverging frontmatter slugs

### [2026-08-23 17:36] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr 238 round 3
- **Done**: No-path autoload interview always runs `--write-autoload`; `hasMergedDelivery` accepts real step-08 PR cites
- **Result**: Wizard opt-out strips Always-applied row; pending-spec probe matches shipped artifacts

### [2026-08-23 17:32] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr 238 round 2 (index track after write-spec)
- **Done**: Intake now invokes `ws-spec-index track {slug}` before `[~]` so new specs get an index row
- **Result**: AC8 can run for net-new slugs; eval + unit assertion added

### [2026-08-23 17:28] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr 238 (review threads)
- **Done**: Un-nest configure-project wizard steps 2–3; drop `ws-task-lifecycle` from Always-applied on opt-out `--write-autoload`
- **Result**: Round-trip test added; threads pending resolve after push

### [2026-08-23 17:22] Agent: Cursor Grok 4.6
- **Prompt**: Continue /ws-spec-to-pr us-236 through ship
- **Done**: Delivery commit `18b14d8`; pushed `develop`; opened PR #238; commented issue #236
- **Result**: https://github.com/jpolvora/workflow-skills/pull/238 (Step 9 in progress)

### [2026-08-23 16:20] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr us-236.spec.md plus configure-project autoload opt-in for ws-task-lifecycle
- **Done**: Shipped `ws-task-lifecycle` (Intake, Implementation, Completion); `defaults.autoloadTaskLifecycle` + configure `--section autoload` question; tests; catalogs; integrity
- **Result**: Prompt-driven work stays spec-driven when consumers opt in; shipped Always-applied table stays lean

### [2026-08-23 12:30] Agent: Cursor Grok 4.6
- **Prompt**: /ws-ship-pr + /ws-goal-fix-pr (us-235 / PR 237)
- **Done**: Confirmed empty threads + green CI; merged PR 237; close-loop on issue 235
- **Result**: https://github.com/jpolvora/workflow-skills/pull/237 merged to main

### [2026-08-23 12:25] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr 237 (us-235 review threads)
- **Done**: Accept legacy full-file `stateSha256` in `validateSnapshot`; add optional `skipReason` to `ac-ledger.schema.json`; tests + integrity
- **Result**: Threads 1–4 fixed on `feature/us-235`; PR 237 not merged

### [2026-08-23 12:16] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr full auto for us-235 (Step 5→6 deadlock)
- **Done**: skipReason + underscore comment aliases, .runtime allowlist, frontmatter-only state hash, finish --commit; PR 237
- **Result**: Shipped https://github.com/jpolvora/workflow-skills/pull/237 (not merged; parent owns fix-pr)

### [2026-08-23 16:05] Agent: Cursor Grok 4.6
- **Prompt**: Analyze if this repo is spec-driven; update website copy, marketing, and bot indexing
- **Done**: Positioned Workflow Skills as spec-driven delivery (spec = contract of record). Site hero/FAQ/JSON-LD/OG; `docs/robots.txt`, `sitemap.xml`, `llms.txt`; README/FEATURES/package.json/AGENTS aligned
- **Result**: Marketing and crawler surfaces now state spec-driven model without claiming Extra/fable replace the spec

### [2026-08-23 15:40] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-from-provider 236
- **Done**: Imported GitHub #236 to `.agents/specs/us-236.spec.md` (agentic ACs + context) and registered `.agents/plans/us-236/step-00-us-236.spec.md`
- **Result**: 1 imported / 0 skipped / 0 failed; authoring validate PASS (39 ACs)

### [2026-08-23 15:20] Agent: Cursor Grok 4.6
- **Prompt**: ws-multi-spec should list only pending/unfinished specs to list
- **Done**: Blank scan filters via `list_pending_specs.cjs` (index `[ ]`/`[~]` + untracked; omit `[x]` / Done-log / merged / step-00 copies)
- **Result**: `/ws-multi-spec` user-gate no longer offers shipped specs

### [2026-08-22 19:55] Agent: Cursor Grok 4.6
- **Prompt**: /ws-ship-pr collect now #234 review threads
- **Done**: Mutating-path parity spawn (CLI org/project, empty PAT) asserts Missing PAT
- **Result**: Dry-run-only override test cannot hide a broken apply_cli_overrides merge

### [2026-08-22 19:50] Agent: Cursor Grok 4.6
- **Prompt**: /ws-ship-pr + ws-goal-fix-pr (ADO comment_issue CLI)
- **Done**: Merged main into develop; stamp 0.3.36; FEATURES + test-doc-sync pin
- **Result**: Ready to PR develop→main as 0.3.36

### [2026-08-22 19:45] Agent: Cursor Grok 4.6
- **Prompt**: ADO `comment_issue.py` unrecognized `--org`/`--project`/`--api-base`/`--pat-env`
- **Done**: Optional CLI overrides (config still default); INTENTS + parity dry-run spawn
- **Result**: Fetch-style close-loop invocation parses; `--dry-run` still skips POST

### [2026-08-22 19:25] Agent: Cursor Grok 4.6
- **Prompt**: /ws-ship-pr goal-fix-pr #233 usage omits --help
- **Done**: usage() lists `[--help|-h]`; test asserts that token; integrity restamp
- **Result**: Review thread PRRT_kwDOTFajc86bb8in addressed

### [2026-08-22 19:05] Agent: Cursor Grok 4.6
- **Prompt**: `validate_spec.cjs --help` ENOENT; `/ws-ship-pr` to develop→main
- **Done**: `--help`/`-h` usage exit 0; unknown dash flags rejected; stamp 0.3.35; `npm run test` + integrity green
- **Result**: Ready to PR develop→main as 0.3.35

### [2026-08-22 19:00] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr https://github.com/jpolvora/workflow-skills/pull/232
- **Done**: Attached PR 232 at Step 9; goal-fix-pr already-converged (0 threads, review+test green); merged via `gh pr merge --merge`
- **Result**: PR 232 MERGED at 9d131d22; no Act round

### [2026-08-22 18:40] Agent: Composer
- **Prompt**: Upstream check-harness false ENOENT on hybrid consumers; FEATURES.md hub link
- **Done**: `resolveSkillMdPath` (local then global); `measure_harness.cjs` uses it; PHASES hybrid/FEATURES omission; hub maintainer checklist drops consumer-broken link
- **Result**: Phase 5a measure passes when only the hub lives under consumer `.agents/skills`

### [2026-08-22 17:20] Agent: Cursor Grok 4.6
- **Prompt**: goal-fix-pr #231 round 2 (empty Assumptions table)
- **Done**: authoring fails when Assumptions has zero data rows; compat warns; FORMAT + test
- **Result**: Specify-time closure cannot skip defaults via a header-only Assumptions table

### [2026-08-22 17:15] Agent: Cursor Grok 4.6
- **Prompt**: goal-fix-pr #231 review threads (MEMORY compile + patterns headers)
- **Done**: self_learning.cjs heading separators and scenario backticks; dogfood backend.md/frontend.md consult `ws-patterns`; tests + compile
- **Result**: Defect classes cleared for MEMORY compile formatting and retired pattern skill ids

### [2026-08-22 16:45] Agent: Cursor Grok 4.6
- **Prompt**: Stamp 0.3.34 for combined next PR
- **Done**: `npm run build-site:bump` + FEATURES evolution + integrity regenerate; index Done log SHA `89e7c96`
- **Result**: Single extra version stamp on develop for catalog Extra, ws-patterns, and specify-time closure

### [2026-08-22 16:40] Agent: Cursor Grok 4.6
- **Prompt**: Execute combined_next_pr plan (catalog Extra + ws-patterns + specify-time closure; close fix-pr index)
- **Done**: Demoted 3 skills to Extra; merged patterns; FORMAT/validate --mode authoring; write-spec lookup + context.md; Step 0 skip-register; lite >5-step valve; MEMORY trap for orch closure
- **Result**: 48 skills (42 W + 6 E); catalog + closure implemented on develop; index Feature map `[x]` for three slugs

### [2026-08-22 16:26] Agent: Cursor Grok 4.6
- **Prompt**: Check model presets per step, then write defaults into config.json.example so new installs prefill preset templates
- **Done**: Confirmed schema/resolver/interview already support modelsPreset + stepModels; filled per-step `steps` templates on shipped presets; aligned configure-project detection; copied templates into dogfood config.json
- **Result**: Fresh consumer installs seed named presets with 0-9 + dag/scoreAndRefine/reviewFix slots

### [2026-08-22 16:20] Agent: Cursor Grok 4.6
- **Prompt**: Add post fix-pr learning each goal-fix-pr loop so reviewer/CI mistakes go into memory/patterns
- **Done**: ws-self-learning § Post fix-pr round; goal-fix-pr step 5 + fix-pr verify; deps, evals, tests, hubs
- **Result**: Each fix-pr round records accepted reviewer/CI defects so the next round does not repeat them

### [2026-08-22 16:15] Agent: Cursor Grok 4.6
- **Prompt**: Add test, bump version, commit
- **Done**: Added `test/test-score-and-refine-second-pass.js`; stamped 0.3.33 (`build-site:bump` + integrity + FEATURES/README)
- **Result**: Second-pass simplify contract is versioned and committed

### [2026-08-22 16:10] Agent: Cursor Grok 4.6
- **Prompt**: Add scoreAndRefine second-pass instruction to simplify overengineered ACs/tasks and remove unused workflow-introduced artifacts
- **Done**: Canonical second-pass protocol in gates.md; STEP-DISPATCH / ws-implement-tasks / docs/FAQ/FEATURES aligned; contract test in test-quality-gates.js
- **Result**: Optional polish now wide-context: simplify if possible, delete unused files/tests/methods/classes this workflow introduced

### [2026-08-22 15:10] Agent: Composer
- **Prompt**: goal-fix PR #230 remaining review threads (skip-existing / plan step-00)
- **Done**: Skip filter also treats `{plansDir}/us-{id}/step-00-us-{id}.spec.md` as existing; evals aligned
- **Result**: Ready to resolve threads and merge #230

Append-only history written by the [`ws-changelog`](../ws-changelog/SKILL.md) skill. Do not use this file for anti-regression context (use `MEMORY.md`).

### [2026-08-22 19:02] Agent: Composer
- **Prompt**: /ws-write-a-skill create ws-spec-from-provider; commit into current PR if possible
- **Done**: Added `ws-spec-from-provider` (bulk GH issues / ADO US → write-spec + register), list scripts, deps/autoload/catalog/FEATURES wiring
- **Result**: Delivered on develop into open PR #230

### [2026-08-22 14:38] Agent: Composer
- **Prompt**: implement audit-performance-correctness-and-reusable-scripts & workflow-session-leases in same PR on develop, then ws-ship-pr + ws-goal
- **Done**: Confirmed audit suggestion categories/CLI already green; added session leases (schema, session_lease.cjs, config default-on, setup/orch/tools wiring, tests, FEATURES/index)
- **Result**: Ready for ship on develop

### [2026-08-22 18:11] Agent: Composer
- **Prompt**: update website, readme, agents, bump version, etc /ws-ship-pr /ws-goal-fix-pr
- **Done**: Stamped release 0.3.31 (FEATURES/README/site/integrity + test-doc-sync pin); prepare board green; goal-fix converged (0 threads); merged
- **Result**: https://github.com/jpolvora/workflow-skills/pull/229 MERGED

### [2026-08-22 18:04] Agent: Composer
- **Prompt**: commit pending → checkout develop → merge feat/nested-quote-python-c-audit → push → /ws-ship-pr
- **Done**: Merged feature into develop; shipped PR #228 to main (tests+review green; review threads driven to zero)
- **Result**: https://github.com/jpolvora/workflow-skills/pull/228 MERGED

### [2026-08-22 13:10] Agent: Composer
- **Prompt**: continue on same branch + commit for fix-pr-proactive-class-sweep
- **Done**: Adopted `feat/nested-quote-python-c-audit`; restored/committed proactive sweep (`96afe3f`) + `tests:remote` fix (`262bdea`); Steps 6–8 done; ship skipped
- **Result**: Workflow completed on feature branch (ahead 2); Phase A CLEAN

### [2026-08-22 12:56] Agent: Cursor Grok 4.6
- **Prompt**: Add to index.PRD (Recommended) for workflow-session-leases
- **Done**: `ws-spec-index track workflow-session-leases` (Phase 4 Feature map + Next-specs row 38)
- **Result**: Spec board lists the slug; no `{plansDir}` workflow created

### [2026-08-22 12:55] Agent: Cursor Grok 4.6
- **Prompt**: ws-write-spec should always ask after a manual invoke whether to register the spec into local index.PRD
- **Done**: Standalone `index.PRD` user-gate on `ws-write-spec`; `ws-spec-index track`; hubs/FEATURES/README/dogfood §6; doc-sync asserts
- **Result**: Orch Step 0 still skips the gate; Add is not workflow `--register`

### [2026-08-22 12:33] Agent: Composer
- **Prompt**: Audit must catch nested-quote python -c SyntaxErrors; create issue/PR/todo via user-gate (1B + 2Gate)
- **Done**: Added classify-shell-failure + draft-remediation to ws-audit; extract_frontmatter_field.cjs; check_shell_quoting.cjs Phase 5a gate; orch + CROSS-PLATFORM wiring; tests
- **Result**: Runtime + static capture path; remediation stays user-gate only

### [2026-08-22 12:26] Agent: Composer
- **Prompt**: add existing specs/plans to index.PRD with actual status (shipped vs open)
- **Done**: Reconciled `.agents/specs/index.PRD` Feature map, Next-specs, and Done log for 10 previously unmapped specs + DeepSeek P1 plan; marked shipped vs partial vs todo from PR evidence
- **Result**: All on-disk `*.spec.md` now have Feature map + Next-specs rows; open set listed in Open Next-spec line

### [2026-08-22 12:17] Agent: Composer
- **Prompt**: /ws-spec-to-pr score-and-refine on models-preset-and-per-step → Accept Pass 1
- **Done**: Pass 1 score-analysis 10/10, 0 flagged; accepted as-is; no Second Pass; workflow re-completed
- **Result**: PR 226 already merged; score-refine closed without code changes

### [2026-08-22 12:11] Agent: Composer
- **Prompt**: /ws-spec-to-pr resume HEV Step 5 → option 3 abandon
- **Done**: Marked harness-efficiency-and-verifiability completed at Step 5; Phase A CLEAN; artifacts kept
- **Result**: No unfinished standard workflows remaining; local skills root still in force

### [2026-08-22 12:10] Agent: Composer
- **Prompt**: use .agents/skills/* for next sessions (not installed globally anymore)
- **Done**: Recorded High MEMORY trap; will invoke/author all `ws-*` from `$PWD/.agents/skills` only
- **Result**: Compiled into MEMORY.md; resumed HEV Step 5 continues under local skills root

### [2026-08-22 12:10] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr (resume unfinished standard workflow)
- **Done**: Resumed us-217 at Step 9; stay-on-integration skip-check on develop; skipped Fix-PR (no PR; user chose complete-without-fix-pr); Phase A CLEAN
- **Result**: Workflow us-217-20260819T121800Z status completed; Step 9 skipped as fix-pr-not-applicable

### [2026-08-22 11:35] Agent: Cursor Grok 4.6
- **Prompt**: /ws-write-spec harness benchmark for fictitious spec dry-runs + TLC scoring + snapshot compare
- **Done**: Wrote `.agents/specs/harness-spec-benchmark.spec.md` (not registered); validate_spec PASS (27 ACs)
- **Result**: Upstream-only CLI spec: static/live prepare-collect, evidence-or-zero + discrimination sensor, baselines vs gitignored runs

### [2026-08-22 11:23] Agent: Cursor Grok 4.6
- **Prompt**: /ws-write-spec unique Node-or-Python stack for all helper scripts + AGENTS.md/SKILL_AUTHORING rule
- **Done**: Wrote `.agents/specs/unique-skill-script-runtime.spec.md` (not registered); locked Node 22; 26 ACs covering ports, dual deletion, docs/rules, harness gate
- **Result**: Spec of record under `{specsDir}`; Python unique-stack and dual freeze rejected; ready to register / start workflow

### [2026-08-22 11:16] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr 225
- **Done**: Round 1 fixed WIT `commentId` key + whitespace audit test; resolved 2 threads; pushed `2e39202`; re-check `activeThreads: []` and CI green
- **Result**: Converged; PR https://github.com/jpolvora/workflow-skills/pull/225 ready for caller merge (skill does not merge)

### [2026-08-22 11:41] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr auto full models-preset + goal-fix-pr
- **Done**: Shipped PR 226; fixed finish/--substep persist; merged to main; Phase A CLEAN
- **Result**: https://github.com/jpolvora/workflow-skills/pull/226 MERGED

### [2026-08-22 11:30] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr auto full from models-preset-and-per-step.spec.md after GH issues empty
- **Done**: Implemented presets + per-step resolve; score 10; review clean; tests + sabotage pass; product commit 79db57b
- **Result**: Ready to push develop and open PR to main (stay-on-integration)

### [2026-08-22 11:00] Agent: Cursor Grok 4.6
- **Prompt**: Write a spec for later implementation with the best TLC spec-driven ideas (delivery quality, performance, score near 10)
- **Done**: Wrote `.agents/specs/specify-closure-pack.spec.md` (not registered); `validate_spec.cjs` PASS (19 ACs)
- **Result**: Specify-time closure pack scoped; Out of Scope / Assumptions / dimensions / authoring validator / lazy context.md / lite safety valve; TLC layout and SHALL left out

### [2026-08-22 10:22] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr check gh issues to be fixed
- **Done**: Confirmed 0 open GH issues and 0 open PRs; resumed deepseek-harness-improvements Step 9; PR #216 already merged with threads resolved; marked workflow completed; Phase A CLEAN
- **Result**: No GitHub work remaining on that run; local specs still available for a new workflow

### [2026-08-21 23:54] Agent: Auto
- **Prompt**: /ws-write-spec model presets + per-step/substep models in config.json
- **Done**: Wrote `.agents/specs/models-preset-and-per-step.spec.md` (not registered)
- **Result**: Spec covers modelsPreset selector, modelPresets map, stepModels, refine/dag/reviewFix roles

### [2026-08-21 23:31] Agent: Auto
- **Prompt**: /ws-write-spec enhance ws-fix-pr cooperative fix with proactive same-category discovery
- **Done**: Wrote `.agents/specs/fix-pr-proactive-class-sweep.spec.md` (not registered)
- **Result**: Spec of record ready; extends COOPERATIVE_FIX beyond code-only sibling sweep

### [2026-08-21 23:28] Agent: Auto
- **Prompt**: update skill-family-naming.spec.md — group github/azure/local providers as ws-spec-provider-*
- **Done**: In-scope rename table + ACs now require ws-spec-provider-github|azure-devops|local; config enums unchanged
- **Result**: Spec of record updated; not committed

### [2026-08-21 22:55] Agent: Cursor Grok 4.6
- **Prompt**: /ws-write-spec skill family naming (ws-spec-write, ws-spec-update, regroup ws-{family}-{skill})
- **Done**: Wrote local spec `.agents/specs/skill-family-naming.spec.md` (not registered)
- **Result**: Spec of record ready for classify / spec-to-pr; no plan folder created

### [2026-08-22 02:09] Agent: Cursor Grok 4.6
- **Prompt**: update website, bump version, ws-ship-pr + ws-goal-fix-pr
- **Done**: Shipped 0.3.30, created PR 224, fixed CI dry-run and ADO sweep alias threads, merged
- **Result**: https://github.com/jpolvora/workflow-skills/pull/224 MERGED; develop kept


### [2026-08-21 21:55] Agent: Cursor Grok 4.6
- **Prompt**: update website, bump version, ws-ship-pr + ws-goal-fix-pr
- **Done**: Bumped package to 0.3.30; rebuilt docs catalog; trimmed CATALOG.md under the 24 KB budget; regenerated integrity
- **Result**: Site/footer/skill frontmatter aligned at 0.3.30; `npm run test` exit 0


### [2026-08-21 21:48] Agent: Cursor Grok 4.6
- **Prompt**: add implementation provider parity to test-provider-parity.js (dev-only, not check-workflows)
- **Done**: Sweep JSON aliases, local-spec SCM delegates, optional Azure --model; extended node test/test-provider-parity.js
- **Result**: Development CI gate covers implementation, not the shipped workflow checker

### [2026-08-21 21:40] Agent: Cursor Grok 4.6
- **Prompt**: /ws-check-harness
- **Done**: Full Phases 0–5c audit; applied critical integrity EOL pin (`.gitattributes` + LF regenerate)
- **Result**: `npm run verify-integrity` exit 0; remaining work is commit if desired

### [2026-08-21 21:15] Agent: Cursor Grok 4.6
- **Prompt**: Enable only cursor-code-review.yml for now; commit and push
- **Done**: OpenCode workflow is workflow_dispatch only; Cursor remains on pull_request to main
- **Result**: PRs run Agentic Code Review (Cursor) only

### [2026-08-21 21:13] Agent: Cursor Grok 4.6
- **Prompt**: Backup code-review.yml as opencode-code-review.yml and create cursor-code-review.yml
- **Done**: Split into OpenCode backup + Cursor workflow; removed shared code-review.yml to avoid duplicate jobs
- **Result**: Both PRs-to-main workflows remain; distinct Action names for Cursor vs OpenCode

### [2026-08-21 21:12] Agent: Cursor Grok 4.6
- **Prompt**: Configure agentic-code-reviewers CI to cursor engine + composer 2.5; set CURSOR_API_KEY GitHub secret from env
- **Done**: code-review.yml uses --engine cursor-sdk --model composer-2.5 and secrets.CURSOR_API_KEY; dropped OpenCode CLI install; CATALOG dry-run aligned
- **Result**: Canonical IDs from agentic-code-reviewers release README; secret set via gh if env present

### [2026-08-21 20:08] Agent: Cursor Grok 4.6
- **Prompt**: commit, push, /ws-goal-fix-pr
- **Done**: Pushed enclosure/classify/fsync fixes; stamp step-artifact metadata on register, review persist, and finish
- **Result**: Pre-advance no longer HS-5s on spec/review files that only had domain frontmatter

### [2026-08-21 19:56] Agent: Cursor Grok 4.6
- **Prompt**: fix ERROR: EPERM: operation not permitted, fsync
- **Done**: `atomicWrite` now opens the temp file for write and treats Windows `EPERM`/`EINVAL` from `fsync` as non-fatal
- **Result**: `convergence.cjs --round-log` completes; same guard on `workflow_state.cjs`

### [2026-08-21 19:40] Agent: Cursor Grok 4.6
- **Prompt**: Configure agentic-code-reviewer CI to ignore {plansDir} and {specsDir}; check ignore support
- **Done**: Set AGENTIC_CODE_REVIEWERS_EXTRA_EXCLUDE_PATTERNS for .agents/plans/** and .agents/specs/** in code-review.yml; mirrored in CATALOG local dry-run; closed include-patterns quote so cjs/py/prd stay in the glob list
- **Result**: Reviewer has no --exclude-patterns CLI; extra exclude is env-only and now drops workflow plan/spec trees from the PR diff

### [2026-08-21 19:34] Agent: Cursor Grok 4.6
- **Prompt**: fix website layout
- **Done**: Kept top-nav labels on one line (nowrap, no flex-shrink) and hid the link row below 1100px
- **Result**: "How It Works" no longer wraps taller than the other nav items


### [2026-08-21 19:32] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr (PR 223)
- **Done**: Untracked mid-run harness plan artifacts and gitignored telemetry from the PR; wired check_duplicates.cjs and measure_harness.cjs into ws-check-harness Phase 5a
- **Result**: Review threads on plansDir-before-Step-8 and dead mechanical gates addressed in this round

### [2026-08-21 19:25] Agent: Cursor Grok 4.6
- **Prompt**: Improve cooperative fix; find more of the same issue in code
- **Done**: Shared schema walker + AC-count helper; run.json validates against run.schema.json; typed ac-ledger commits/tests/verdicts/findings; default class-grep table in COOPERATIVE_FIX
- **Result**: Same-class copies of the evals/schema and acTotal defects share one implementation

### [2026-08-21 19:20] Agent: Cursor Grok 4.6
- **Prompt**: Improve cooperative fix; find more of the same issue in code
- **Done**: Sibling-sweep contract in COOPERATIVE_FIX/AUTO_FIX/ws-fix-pr/ws-goal-fix-pr; eval #3; untyped `commits` array in workflow-state.schema.json; schema-array `items` gate in test-evals-schema.js
- **Result**: Cooperative fix now requires class-wide grep before resolve; remaining untyped schema array closed

### [2026-08-21 19:10] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr (PR 223)
- **Done**: Made `bin/validate-evals.cjs` load and apply `evals.schema.json`; added missing-schema test
- **Result**: Thread PRRT_kwDOTFajc86bUNDl fixed in cdecc11; waiting on next review heartbeat

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