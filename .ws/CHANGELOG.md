# Changelog
### [2026-09-25 10:45] Agent: Muse Code (Muse Spark)
- **Prompt**: Workflow diagram for spec-to-pr and spec-to-pr-lite from init to end with all decision paths, related skills and connections; save to docs/flow.md and link from website.
- **Done**: New docs/flow.md with 6 mermaid diagrams (shared entry/classifier, standard steps 0-4 and 5-9, lite 0-5, skill connection map, universal step boundary) plus step-to-skill and gate tables; Flow link added to 4 website nav spots (dot-nav, header, sidebar, TOC); site rebuilt without bump.
- **Result**: build-site.js exit 0 + --check clean, 4/4 Flow links survive rebuild, test-harness-clean.js 0 findings, mermaid fences balanced with all edge ids resolving.

### [2026-09-25 10:19] Agent: Muse Code (Muse Spark)
- **Prompt**: Phase 2 for kanvas board enhancements: drag'n drop columns spec with status update on move.
- **Done**: Wrote spec of record `.agents/specs/0131-kanvas-board-drag-drop.spec.md` (10 ACs, transition table over owning index/plan-state/archive writes, `POST /api/move`, atomicity + `409` matrix) plus gray-area companion `0131-kanvas-board-drag-drop.context.md`; authoring validation passes.
- **Result**: `validate_spec.cjs --mode=authoring` exit 0 (10 ACs).

### [2026-09-25 06:20] Agent: Cursor Grok 4.7
- **Prompt**: Sync the living wiki from code since the Sync Baseline and advance the baseline commit hash.
- **Done**: Folded specs 0125–0130 into delivery, diagnostics, providers, and a new kanvas page; validated the wiki; set Sync Baseline to `1f185d170839e7dafd7c7b0d4ff83ebc9d34dc13`.
- **Result**: `validate_wiki.cjs --check` exit 0 (12 pages).
### [2026-09-25 06:14] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: Fix open GitHub issues via spec-from-provider + ws-spec-multi (issues 412 and 418).
- **Done**: Verified both open `ws-monitor` issues were already fixed and merged by PR #423 (`feat/us-412-418-monitor-accuracy`, in `monitor_snapshot.cjs` on `develop`/`main`); PR body lacked closing keywords so GitHub left them open. Closed #412 and #418 as completed with PR references; no duplicate pipeline run.
- **Result**: 0 open issues remaining; no code change.
### [2026-09-25 07:24] Agent: ws-spec-multi orchestrator (ms-20260924T184514Z)
- **Prompt**: Implement the last 6 pending index entries; deferred pre-ship-doc-sync (parallel session); delivered 5/5 to merged PRs #421-425.
- **Done**: Sequential workers + per-item base syncs with union conflict resolution; review-timeout gate on #422 (user-merged); run state closed 5/5 shipped; memory trap 2026-09-25-ws-spec-multi-batch-traps compiled.
- **Result**: PRs #421, #422, #423, #424, #425 all MERGED with zero open threads; integrity green; tree clean.
### [2026-09-25 06:30] Agent: ws-spec-multi worker (kanvas-board)
- **Prompt**: Implement the kanvas-board spec (packaged local kanban visualizer): new ws-kanvas skill with collector + loopback server + board page, six first-match columns, card popup; skill-dependencies entry, integrity regen, install test, consumer path overrides, npm run kanvas dogfood.
- **Done**: `ws-kanvas` skill tree (`SKILL.md`, `scripts/collect.cjs`, `scripts/server.cjs`, `refs/board.html`); `kanvas` npm script; graph registration + runtime mirror; CATALOG/FEATURES rows; new suite `test/test-kanvas-board.js` (column fixtures, AC7 snapshot, HTTP behavior, BOM regressions) + suite entry; BOM tolerance in config reader and frontmatter (found via installed-tree proof); release 0.4.73 + integrity + site.
- **Result**: verify 10/10; `npm run tests` 134/134; `test-harness-clean` 0 findings; `verify-integrity` OK (v0.4.73, 57 skills); review approve; installed-tree serve proof green; memory trap `2026-09-25-kanvas-bom-powershell-traps` compiled.
### [2026-09-25 03:45] Agent: ws-spec-multi worker (us-419)
- **Prompt**: Implement the observer-log follow-ups spec (upstream issue 419): intra-root transcript enumeration edge, missing agentTranscripts marker, G2 plans-index hash staleness, compactOutputs no-op, plus two fix-if-cheap hygiene items.
- **Done**: `monitor_snapshot.cjs` correlate-during-enumeration (dedicated correlated bucket, 64-visit bound, honest capped); dispatch-time `agentTranscripts` default in `workflow_state.cjs` (`--transcript-paths` or explicit absent reason, never overwritten) + dispatch-contract note; `refreshPlansIndexForState` after both G2 writes; escaped `compactOutputs` heading; `test/.ws/** text eol=lf`; AC6 deferred with note (no rounding call site; writers already exact-second); new suite `test/test-ws-us419-followups.js` + 1 eval; release 0.4.72 + integrity + site.
- **Result**: verify 10/10; `npm run tests` 133/133; `test-harness-clean` pending at close; `verify-integrity` OK (v0.4.72); review clean; memory trap `2026-09-25-us419-edit-script-traps` compiled.
### [2026-09-25 02:35] Agent: ws-spec-multi worker (us-412-418-monitor-accuracy)
- **Prompt**: Implement the monitor accuracy spec (upstream issues 412+418): step-membership artifact expectations, legacy terminal tolerance, transcript correlation windows, discovery budget.
- **Done**: `monitor_snapshot.cjs` membership-first `expectedArtifacts` (`expectsStep`, watermark fallback only when step lists are absent); `completed`-status drift tolerated as `info` with refined-plan interview evidence; correlate-first global read order + recency-aware enumeration; shared `transcriptCorrelates` predicate for scan and resolve; new suite `test/test-ws-monitor-us412-418.js` + 2 evals; SKILL.md severity rows; release 0.4.71 + integrity + site.
- **Result**: `npm run tests` 131/131; `test-harness-clean` 0 findings; `verify-integrity` OK (v0.4.71); verify score 10/10; red-proof shapes A/B/C 9/7/9 criticals pre-fix, 0 post-fix with live control intact.
### [2026-09-24 17:39] Agent: ws-spec-multi worker (us-414-run-state-integrity)
- **Prompt**: Implement the run-state and telemetry integrity spec (upstream issue 414): fail-closed preset resolution, resolved model ids in telemetry, ship writeback, Step 9 round artifacts or clean-immediate reason, truthful skip semantics, dispatch provenance mapping.
- **Done**: `workflow_state.cjs` fail-closed unknown-preset dispatch + no cross-preset fallback, preset-name to id recording on dispatch/finish, `prNumber`/`prUrl` persistence + help + fingerprint coverage, bare-`dag` rejection on finish/dispatch/bypass; new `ws-goal-fix-pr/scripts/check_fixpr_rounds.cjs` + clean-immediate marker contract; `STEP-DISPATCH.md` sanctioned ship writeback commands + provenance note; `setup.md` fail-closed preset; state schema `prNumber`/`prUrl`; new suite `test/test-run-state-integrity.js`; fail-closed contract update to `test-models-preset-and-per-step.js`; integrity regenerated.
- **Result**: verify 10/10; `npm run test` 131/131; `test-harness-clean` 0 findings; `verify-integrity` OK (v0.4.70); review round 1 with 1 fix (fingerprint) + pin; memory trap `2026-09-24-ac-ledger-test-evidence-form` compiled.
### [2026-09-24 21:00] Agent: ws-spec-multi worker (us-415-416-script-ux-golden-path)
- **Prompt**: Implement the workflow script UX and golden-path state commands spec (upstream issues 415+416): discoverable per-subcommand help, score deficiency detail, boundary-label errors, unambiguous phantom-finish exit, per-gate golden-path commands, ledger tamper-evidence.
- **Done**: `ac_ledger.cjs` per-subcommand help + `deficiencies[]` in score/verify/report + `writer`/`ledgerHash` persist stamps; `workflow_state.cjs` per-operation help + phantom fail-closed finish + boundary/tamper errors naming the repair command; golden-path command table in `gates.md` with pointers in standard `STEP-DISPATCH.md` and lite `SKILL.md`; new suite `test/test-script-ux-golden-path.js`; release 0.4.70 + integrity + site/wiki.
- **Result**: `npm run test` 130/130 twice; `test-harness-clean` 0 findings; `verify-integrity` OK (v0.4.70); worker ledger 10/10; pre-advance 4/6/7/8 green; sabotage passed; memory trap `2026-09-24-ledger-hash-persist-order` compiled.
### [2026-09-24 12:30] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: Ship the pending ws-cleanup leftover-policy update: treat `pr-body.md` as disposable scratch, delete the consumed PR body after PR creation, and untrack disposable workflow artifacts.
- **Done**: `ws-cleanup` now lists per-slug and `{plansDir}`-root `pr-body.md` as disposable (PATTERNS.md, list_disposable.cjs, `.gitignore` suggestion); `ws-ship-pr` deletes the consumed `{plansDir}/pr-body.md` after PR creation (best-effort, non-blocking); root `.gitignore` expanded (telemetry.jsonl, handoff/, step-00 issue temp, step-03 exec artifacts, runs/, run.json, RUN.md, plan.index.json, pr-body.md, observer artifacts except `*-report.md`); 289 tracked disposable artifacts untracked; `test/test-ws-cleanup.js` coverage added; version 0.4.68 + site + integrity regenerated; dogfood `preview.previewBeforeShip` off (empty `localReviewCommand`).
- **Result**: `npm run test` 129/129; `test-harness-clean` 0 findings; `verify-integrity` OK (v0.4.68); `test-ws-cleanup` suite green.
### [2026-09-24 07:56] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: Make `ws-monitor` honor a default live-watch profile — full live watch, poll every minute until the workflow finishes, session id + optional agent, follow transcript, open an SCM provider issue for detected defects, detect stall/hung with a stopwatch, and show the report when finished.
- **Done**: Added the ws-monitor default prompt-parameter profile (SKILL.md + examples); new flags `--session-id` (alternative correlation key), `--agent`, `--follow-transcript` (alias), `--stall-window`, `--open-issue`, `--dry-run`; per-workflow `stopwatch` (`lastActivityAt`/`idleMs`/`thresholdMs`/`stalled`/`source`) and the new `stalled-workflow` hang signal (pause-suppressed); enriched anonymized `issueProposal` (failure class + suspected contract + evidence) written to `{plansDir}/{slug}/workflow-monitor.issue.md`; new SCM `create-issue` intent on GitHub + Azure DevOps (`create_issue.cjs`) with contract/INTENTS/SKILL/local-delegate/parity coverage; new `test/test-ws-monitor-watch-profile.js` registered in `test-suites.json`; README/FEATURES/CATALOG updated; version 0.4.67 + integrity regenerated.
- **Result**: `npm run test` 129/129; `test-provider-parity` + harness-clean + `check_workflows` + all check-harness gates pass; `verify-integrity` OK (v0.4.67); memory trap `2026-09-24-monitor-watch-profile-correlation` compiled.
### [2026-09-24 11:10] Agent: opencode (ws-spec-to-pr)
- **Prompt**: Spec-to-PR for us-412/us-413 — make an active workflow observable as alive, resumable, and not falsely stalled.
- **Done**: Added `update_state.cjs` `checkpoint`/`pause-turn` ops with schema + telemetry + validator coverage; `finish` clears the pause marker and step checkpoint; documented the turn-boundary pause/resume contract (autoMode does not chain host turns); hardened `ws-monitor` discovery (correlated-root prioritization, shared correlation window, honest `scan-capped`, `worker-session-stall`, pause suppression, `--watch --until-terminal`); new regression suites `test-liveness-checkpoints` + `test-ws-monitor-liveness`; README/FEATURES updated; bumped release to 0.4.66.
- **Result**: verify 10/10, review clean (0 Critical/Warning), `npm run test` 128/128, sabotage passed, integrity regenerated+verified, harness-clean 0 findings, ws-check-workflows PASS.

### [2026-09-23 22:53] Agent: opencode (space-bunny-free)
- **Prompt**: Align the local review preview with the CI timeout after the live preview timed out.
- **Done**: Set the local dry-run default to 1,200,000 ms with caller override support and added regression assertions for both paths.
- **Result**: Fix round 3/3 is clean; 126 tests, site build, integrity verification, and harness audit pass.

### [2026-09-23 22:25] Agent: opencode (space-bunny-free)
- **Prompt**: Clear all pre-merge review findings before shipping the website update.
- **Done**: Corrected desktop/tablet/mobile grid placement; added a variable-driven local review launcher; expanded integrity coverage to packaged `bin/` files; added regression and tamper tests.
- **Result**: Code review round 2 is clean; 126 tests, site build, integrity verification, and harness audit pass.

### [2026-09-23 21:40] Agent: opencode (space-bunny-free)
- **Prompt**: Simplify the website landing page by removing legacy sections and controls, floating the left menu, and ship the result.
- **Done**: Removed the dependency graph, roadmap, specialized-subagents announcement, redundant verification sentence, and root scroll-to-top control; made the desktop sidebar fixed with regression coverage; bumped the release to 0.4.65 and regenerated integrity.
- **Result**: Site build check, all 125 tests, integrity verification, leak scan, and harness audit passed; PR shipping is in progress.

### [2026-09-23 04:05] Agent: opencode (ws-fable-method + ws-ship-pr)
- **Prompt**: Implement issue #409 via gh client using agentic-code-reviewers docs; after fix commit + create PR, then close the issue in gh.
- **Done**: Added `.github/workflows/agentic-code-review.yml` (single active reviewer; engine/model/variant from repo Variables with defaults `opencode` / `opencode-go/mimo-v2.6-flash` / `medium`); removed `cursor-code-review.yml` + `opencode-code-review.yml`; set the three repo Variables via `gh variable set`; updated `.ws/config.json` dry-run comment + `CATALOG.md` active-CI reference.
- **Result**: `npm run test` 125/125, `verify-integrity` OK, `build-site --check` current, GUI 12/12, harness-clean 0 findings; PR feat/issue-409-unified-reviewer → develop; issue #409 closed with PR link.
### [2026-09-22 22:16] Agent: opencode (mimo-v2.6-flash)
- **Prompt**: Configure agentic-code-reviewers in GitHub to use mimo-2.6-flash for code-review in GitHub Actions (active reviewer), variant medium.
- **Done**: `opencode-code-review.yml` now active on `pull_request` with `--engine opencode --model opencode-go/mimo-v2.6-flash --variant medium`; `cursor-code-review.yml` demoted to `workflow_dispatch` backup; CATALOG dry-run + `review:dry` script + `preview.dryRunCommand` comment aligned to the new active CI; version bumped.
- **Result**: Pending commit/push/PR; OpenCode workflow already `active` on GitHub, so the new config runs from this PR's merge ref onward.
### [2026-09-22 19:05] Agent: grok-4.7
- **Prompt**: Update the website FAQ and roadmap, refresh skills and the dependency graph, and update the left and top menus.
- **Done**: Rebuilt the catalog (56 skills) and a dependency-graph list from `bin/skill-dependencies.json`. Roadmap marks the Node-only runtime and `close-issue` as done. FAQ covers non-default-base close, human runbooks, and where config versus memory live. Header, sidebar, dots, and on-this-page menus link Skills, Graph, and Wiki.
- **Result**: `node bin/build-site.js` exit 0. Not committed.
### [2026-09-22 16:54] Agent: ws-plan-verify (us-405 Step 5)
- **Prompt**: Quick-score Step 5 verify for us-405 close-issue ship path; minVerifyScore 9; report-only preferred.
- **Done**: Ran `test-close-issue.js`, `test-provider-parity.js`, and `npm run test` (all exit 0); linked AC1–AC6 + NS1–NS5 into `ac-ledger.json`; wrote `step-05-us-405.plan.report.md` with score 9/10. Added NS4/NS5 assertions to `test/test-close-issue.js` so uncovered negatives would not cap the ledger.
- **Result**: Score 9/10 (54/60); AC1 live `gh issue view` deferred to ship; no product commit.
### [2026-09-22 16:10] Agent: Muse Code (changelog/memory hub consolidation)
- **Prompt**: Merge root CHANGELOG.md into .ws/CHANGELOG.md; merge root MEMORY.md into .ws/MEMORY.md; remove the root files after merging.
- **Done**: Root changelog (150 entries) merged insert-only into .ws/CHANGELOG.md (143 root-only inserted by timestamp, 3 same-heading conflicts kept at hub version, untouched hub bytes byte-verified, 522 entries total), then root CHANGELOG.md deleted. Memory relocation (user-gated): 35 root memory/*.md moved collision-free into .ws/memory/, rules.memoryDir set to ".ws", recompiled to 195 entries in .ws/MEMORY.md, read path verified via --match-paths, then root MEMORY.md + empty root memory/ removed. FEATURES.md inventory link retargeted to .ws/CHANGELOG.md.
- **Result**: test-memory-dir-resolution ok; test-harness-clean.js 0 findings (fixed one broken FEATURES.md link the deletion exposed); recompile stable in .ws with no root recreation. Not committed.
### [2026-09-22 16:00] Agent: Muse Code (index.PRD auto-track lifecycle)
- **Prompt**: ws-spec-from-provider — update skill to automatically track imported specs from SCM (ado/gh); add AGENTS.md auto track/auto-sync of completed/pending index.PRD tasks as workflows start/end/complete.
- **Done**: `ws-spec-from-provider` Step 5 gains auto-track via `track_index.cjs --specs-dir {specsDir} --slug us-{id}` (advisory; missing/already-tracked never fails the import) + report track outcome; `ws-spec-index` added to skill Dependencies and both `skill-dependencies.json` maps; new root `AGENTS.md` §6 index.PRD workflow lifecycle (start → pending `- [ ]`, end/complete → `sync {slug}` to `[x]` + Done log); SPEC-MANAGEMENT.md flow + FEATURES.md rows synced; integrity regenerated; memory trap `2026-09-22-us405-index-lifecycle.md` compiled (35 entries).
- **Result**: `verify-integrity` OK (v0.4.61); `test-harness-clean.js` 0 findings; `test-ws-spec-index-track`, `test-ws-spec-manager`, `test-provider-listers` pass. Full `run-tests.cjs` stops at `test-install.js` global-hook case (`node not on PATH` under Git Bash) — verified pre-existing by re-running on stashed baseline. Not committed.
### [2026-09-22 18:24] Agent: ws-spec-multi child worker (us-402)
- **Prompt**: Standard pipeline worker for spec `0123-us-402.spec.md` — new packaged skill `ws-spec-translate-to-human` emitting a human runbook companion (`step-NN-{slug}.spec-translated.md`) beside the agent spec, wired non-blocking into the refinement path.
- **Done**: New skill package (SKILL.md + COMPANION-FORMAT.md + EXAMPLE.md + `validate_companion.cjs`); `ws-plan-write` owner hook + one-line pointers in both orchs; membership in both manifests; `ws-spec-translate-to-human` config section (`enabled`/`outputLanguage`, en-us default); CATALOG x2 + autoload x2 + FEATURES + README + rebuilt site; committed test `test/test-spec-translate-to-human.js`; version `0.4.60` + integrity regenerated; memory trap `2026-09-22-us-402-ship-verify-order.md` compiled.
- **Result**: `npm run test` 124/124; `test-harness-clean.js` 0 findings; verify score 10/10 (step5, 90/90); review clean round 1 (no fixes); branch `feat/us-402` with one product commit.
### [2026-09-22 14:10] Agent: ws-spec-multi child worker (us-401)
- **Prompt**: Standard pipeline worker for spec `0122-us-401.spec.md` — ownership-scoped git contract for parallel writers (commit only own work, no whole-tree undo/stash, baseline advances forward).
- **Done**: New canonical `ws-shared/runtime/git-ownership.md` (forbidden verbs, path-scoped staging, baseline advancement, dirty-tree tolerance) referenced by both orchestrators, `ws-spec-multi`, `ws-fix-pr`, and the G2 recipes; stash-all bootstrap gate replaced with ownership options; `baselineCommit`/`baselineSourceRef` in state schema + `refresh_baseline.cjs` (idempotent, foreign-path STOP); regression test `test/test-git-ownership-contract.js`; spec-driven update of two `test-feature-branch-gate.js` assertions; version `0.4.59` + integrity regenerated; README/FEATURES/site synced.
- **Result**: `npm run test` 123/123; `test-harness-clean.js` 0 findings; verify score 10/10; review clean (1 suggestion fixed); branch `feat/us-401` with product commits for verify + review-fix.
### [2026-09-22 16:43] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: Close delivered tracker issues; update workflow-skills to always close the source issue when a spec ships/delivers (chosen approach: GitHub PR-body auto-close).
- **Done**: Closed stale GitHub issue #395 (delivered by PR #399 but left open because the PR body had no `Closes #395`). Added `ws-ship-pr/scripts/ensure_pr_closer.cjs` — idempotently keeps `Closes #{id}` in the PR body (no-op for null ids / non-GitHub providers / existing closers). Wired it into `ws-ship-pr` Step 5, the shared `scm-provider-contract` `create-pr` guarantee, the GitHub provider `create-pr` procedure/table, and standard/lite Step 8/4 dispatch text; added `test/test-pr-closer.js` and registered it; version `0.4.58` + integrity regenerated; README/FEATURES/site synced.
- **Result**: `npm run test` 122/122 + hub byte-identity verified; `test-provider-parity` + `test-doc-sync` + `test-pr-closer` pass; `test-harness-clean.js` 0 findings; `verify-integrity` OK (v0.4.58). Not committed (awaiting explicit ship request).

### [2026-09-22 16:45] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: `ws-spec-multi` batch worker for spec `us-388` (standard pipeline, autoMode, branchStrategy stay on `develop`) - standard child workers can deliver without persisting `{plansDir}/{slug}` state, step artifacts, or telemetry; ship `develop` -> `main` and converge.
- **Done**: `ws-monitor` now derives multi-spec child-state expectations from the batch queue rows (was `expectedArtifacts: []`) and emits `missing-child-state` for an advanced item with no child state, complementing `stale-parent-row`; `ws-spec-multi` PROTOCOL/STATE state the required child artifact set with `{child-workflow-id}` and add the fail-closed `verify_child_artifacts.cjs` exit guard (blocks a `shipped` row without state/`step-01-{slug}.plan.md`); Phase 6 forbids claiming delivery evidence without child state; monitor + multi-spec evals and two fixtures added; AC1/AC2/AC3/AC7 verified as prior-work-satisfied; version `0.4.57` + integrity regenerated.
- **Result**: commits `6aa19c83` (product) and `d2111cd1` (review-fix, unsafe-slug guard); `npm run test` 120/120 + hub byte-identity verified; `test-harness-clean.js` 0 findings; `verify-integrity` OK; check score 10/10; live: multi-spec `expectedArtifacts` populated 4/4, `us-388` child state present, guard exit 0.

### [2026-09-22 15:25] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: `ws-spec-multi` batch worker for spec `us-395` (standard pipeline, autoMode, branchStrategy stay on `develop`) — terminal-state workflows stay active; batch queue keeps stale/superseded rows; ship `develop` -> `main` and converge.
- **Done**: state writer (`workflow_state.cjs`) now closes on terminal-step coverage (steps through the close step all terminal) unconditionally on telemetry and idempotently; `ws-monitor` gains `terminal-run-active` (derives a terminal reported status so a finished run is never counted active) and `stale-parent-row` (terminal run with phantom rows, completed child vs in_progress parent row, superseded run still claiming an item); `ws-spec-multi` STATE/SKILL/PROTOCOL add supersede retirement and parent-child handoff propagation (extends #393); monitor + multi-spec evals and two fixture tests added; version `0.4.56` + integrity regenerated.
- **Result**: product commit `59fe3e3c`, review-fix commit `3482023a`; `npm run test` 117/117 + hub byte-identity verified; `test-harness-clean.js` 0 findings; `verify-integrity` OK; check score 10/10; live specimens: `us-243` -> `terminal-run-active`, `ms-20260919T231639Z` and `ms-20260922T022801Z` -> `stale-parent-row`, no terminal-shaped run active.

### [2026-09-22 04:58] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: `ws-spec-multi` batch worker for spec `us-389` (standard pipeline, autoMode, branchStrategy stay on `develop`) — make the local test suite side-effect free for the repository's own hub config; ship `develop` -> `main` and converge.
- **Done**: every test invocation of `Edit-WorkflowSkillsConfig.ps1` now passes an explicit `-ConfigPath` to an isolated temp copy; `-CheckOnly` / `-NonInteractive` became strictly read-only via `$script:DiagnosticMode` (no rewrite, no `.bak`, even without `-ConfigPath`); `test/run-tests.cjs` snapshots `.ws/config.json` byte-identity before/after the suite and fails on mutation; the editor test adds a no-`ConfigPath` no-write probe, a hub byte-identity regression (Test 12), and backup cleanup on both paths; version `0.4.55` + integrity regenerated; README/FEATURES documented the read-only contract.
- **Result**: commits `3382da8a` (product) and `ea46c379` (delivery artifacts); PR [#397](https://github.com/jpolvora/workflow-skills/pull/397) `develop` -> `main`; `npm run test` 115/115 + hub byte-identity verified; harness clean 0 findings; `verify-integrity` OK; check score 10/10.

### [2026-09-22 04:22] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: `ws-spec-multi` batch worker for spec `us-393` (standard pipeline, autoMode, branchStrategy stay on `develop`) — fix duplicate queue-row append in the `ws-spec-multi` run-state contract; ship `develop` -> `main` and converge.
- **Done**: hardened the agent-owned queue contract so transitions update the single existing row keyed by `specPath`/`slug` in place; added a fail-closed duplicate guard (no duplicate `#`/`slug`), a frozen `totalItems` count, per-write `updatedAt` advancement, and a completed-with-pending invalidation in the Resume Policy; added eval id 3 for the duplicate-row scenario; version `0.4.54` + integrity regenerated.
- **Result**: commits `939ef310` (product) and `401e3c9f` (release); PR [#396](https://github.com/jpolvora/workflow-skills/pull/396) merged into `main` at `74aecc18` with 0 open threads and green checks; `npm run test` 115/115; harness clean 0 findings; `check_workflows` 0 issues; `verify-integrity` OK.

### [2026-09-22 01:30] Agent: Muse Code (muse-spark)
- **Prompt**: Implement us-386 optional post-completion proof-of-work step (spec 0117-us-386), full standard pipeline to merged PR.
- **Done**: Added `defaults.enableOptionalProofOfWork` / `defaults.enableAutomaticEvidenceCollectForProofOfWork` (bool, false) + `defaults.projectRootFolderToSave` (string token default) across schema, example, PS1 GUI, auto-configure, and interview; documented resolution + gate contracts (config-wire collector id `proof-of-work`, fail-closed skips, autoMode never blocks) and orch hooks (standard exit/dispatch, lite close); new `test/test-proof-of-work.js` + suite entry; README row; version 0.4.53 + integrity regen + site rebuild.
- **Result**: `test-proof-of-work.js` 32/32; config-editor 11/11; `npm run test` 115/115; `test-harness-clean.js` 0 findings; invariant scan 0 issues; verify score 10/10; review 0 Critical/Warning.

### [2026-09-21 14:12] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: `/ws-spec-to-pr-lite` for the merged spec `patterns-generator-shared-hub-output` (issue #382 integration scope + hub-hosted generated body), later switched to `autoMode` + `fullMode` to auto-ship and run `ws-goal-fix-pr`.
- **Done**: hub-hosted the generator body at `{sharedDir}/ws-project-patterns/SKILL.md` (seed script resolves `pathTokens.sharedDir`, keeps full-path realpath containment); `configure_autoload.cjs` renders/validates hub-path rows for generator-managed ids; `hub-layout.json` classifies it consumer-owned; batteries updated (hub paths, three link-refusal fixtures, custom sharedDir, hub-path row); integration analysis completed in the companion (overlap matrix, draft plan, code-reduction no-op with evidence, measured baselines); docs + site refreshed; version `0.4.50` + integrity regenerated.
- **Result**: commits `beef67be` (implementation) and `d8665b74` (review fixes); review 2 rounds → 0 Critical/0 Warning; `npm run test` 103/103; harness clean 0 findings; invariant scan 0; secrets clean; AC ledger covers 16 ACs with NS links + 5 declared gaps.

### [2026-09-21 13:34] Agent: muse (muse-spark)
- **Prompt**: track untracked specs and update state (completed vs pending) from latest PRs/commits/deliveries.
- **Done**: swept 115 spec files; tracked 4 (us-378/us-380/us-381/us-382, rows 115-118) via track_index.cjs. E1: us-378 completed (delivery 78a02811, state completed/pr-open, PR #383 MERGED verified via gh) -> [x] + Done row + status completed; us-380/381/382 pending (import-only, no runs); us-369 stays pending (no workflow evidence; PR #379 merge outside E1 signal).
- **Result**: untracked remaining 0; open todos us-369/us-380/us-381/us-382; stale closed-except note corrected.

### [2026-09-21 13:30] Agent: muse (muse-spark)
- **Prompt**: /ws-spec-index sync — sync shipped work to index status, checkboxes, and Done log.
- **Done**: E1 sweep over open todos; closed code-review-round-2-fixes (delivery commit f78199d8, state completed, step-08 result) via Feature-map [x], Next-specs row 114 [x] done, Done-log row, spec frontmatter status completed. Skipped us-369 (no step-08/delivery evidence; fixed outside workflow) and us-378/us-380/us-381/us-382 (no index mapping and/or no ship evidence) without edits.
- **Result**: updated [code-review-round-2-fixes]; only true todo left is us-369; CRLF endings preserved per recorded trap.

### [2026-09-21 13:25] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: `/ws-goal-fix-pr 378` → PR #378 does not exist; took over the abandoned fix loop for the us-378 PR **#383** (`develop` → `main`) and drove it to zero open threads.
- **Done**: Round 2 (commit `6f887119`) fixed `PRRT_kwDOTFajc86kW676` (generated-skill parent-directory symlink escape) and `PRRT_kwDOTFajc86kW361` (`hasSubagentError` had no attempt/outcome correlation). Round 3 (commit `e764967a`) fixed `PRRT_kwDOTFajc86kWkXRxG` (dangling `SKILL.md` leaf symlink escaping the parent-only resolution) by resolving the full target path with `realpathLoose(target)` and failing closed on `null`; regression fixtures added for all three link variants.
- **Result**: `activeThreads: []`; `review` + `test` ×2 green on `e764967a`; `npm run test` 103/103; integrity regenerated + verified; round reports `PR-383-round-{2,3}.md`; memory traps updated (containment full-path rule, transcript outcome correlation). Foreign WIP from the concurrent `/ws-spec-from-provider` run left unstaged.

### [2026-09-21 13:11] Agent: muse (muse-spark)
- **Prompt**: `/ws-spec-from-provider` — bulk-import open GitHub issues into local specs.
- **Done**: Tracker github (active=local fallback to enabled github tracker); auth pass; list 4 open; skip 1 registered (#378); import 3 (#382, #381, #380) via snapshot, base convert, agentic reformulation, full register; authoring validate PASS before each register.
- **Result**: Imported 3 / skipped 1 / failed 0. Paths: `.agents/specs/0111-us-382.spec.md` + `.context.md`, `.agents/specs/0112-us-381.spec.md`, `.agents/specs/0113-us-380.spec.md`; workflow copies under `.agents/plans/us-{382,381,380}/step-00-*.spec.md`.

### [2026-09-21 08:51] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: Enable generic subagent dispatch for the Muse session (`hostAdapter` + capability re-probe), without specialized subagents.
- **Done**: Added `defaults.hostAdapter.mode: "native-tool"` to `.ws/config.json` (GUI already binds `defaults.hostAdapter`; no GUI change needed). Re-probed `.ws/host-capabilities.json` for `muse::muse-spark-1.3-contributor` and `muse::muse-spark` with `--host-shape muse-spark-like --declare dispatchAgent=subagent_spawn --refresh`; both keys now bind `subagentTool: subagent_spawn` with `knownShape: true`. Corrected the declare token (`dispatchAgent`, not the `subagentTool` alias; alias names are silently ignored by `parseDeclared`).
- **Result**: Config parses and validates against `config.schema.json` (exit 0); capabilities cache gitignored; `specializedSubagents.enabled` stays false. Recorded trap `memory/2026-09-21-host-capability-declare-token.md` (compile: 19 entries).

### [2026-09-21 00:51] Agent: muse (muse-spark)
- **Prompt**: `/ws-spec-from-provider` for https://github.com/jpolvora/workflow-skills/issues/378 - bulk-import open GitHub issues into local specs.
- **Done**: Tracker resolved to github (active=local, enabled github tracker); `gh auth status` pass; list returned 1 open issue (#378, no skips). Snapshot rewritten as UTF-8 after PowerShell `>` produced UTF-16 the converter rejects; base convert, agentic reformulation to 13 ACs with closure tables, DoR, validation notes, prior-work sweep, greenfield design-intent note, plus fit-analysis companion; full register to `step-00-us-378.spec.md`.
- **Result**: Imported 1 / skipped 0 / failed 0. `validate_spec.cjs --mode=authoring` PASS (13 ACs) before and after register. Paths: `.agents/specs/0110-us-378.spec.md`, `.agents/specs/0110-us-378.context.md`, `.agents/plans/us-378/step-00-us-378.spec.md`.


### [2026-09-21 00:47] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: Set `defaults.autoload: true`, then make root `AGENTS.md` actually autoload the Always-applied live skills.
- **Done**: `.ws/config.json` `defaults.autoload` true (set via `configure_autoload.cjs`; helper's unrelated formatting normalizations reverted to a one-line diff). Root `AGENTS.md` § Skill loading: session start now loads `ws-senior-developer`, `ws-self-learning`, `ws-tdah`, `ws-spec-memo`, `ws-task-lifecycle` from `{skillsRoot}` (local-first, global fallback; documented exception to Global vs local rule 1); new table row, progressive-disclosure Session start row, dual-hub precedence text, and Precedence note updated; all other live `ws-*` bodies stay banned for autoload.
- **Result**: `configure_autoload.cjs --check` effectiveAutoload=true, 0 findings; `test-harness-clean.js` 0 findings; `test-doc-sync.js` ok; `test-autoload-configure.js` green; `test-hub-separation.js` ok. No version bump or integrity regen (root hub is not hashed; no package content changed).

### [2026-09-21 06:00] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: Test-suite runner refactor — replace the giant `&&`-chained npm test scripts with a single wrapper.
- **Done**: Added `test/run-tests.cjs` (sequential, fail-fast, Node launcher, modes `local`/`--remote`/`--harness-efficiency`, `--list`) backed by `test/test-suites.json` (ordered argv lists). `package.json` `tests` / `tests:remote` / `tests:harness-efficiency` are now one short command each. `test-spec-dor-tdd.js` and `test-repeated-file-list-flags.js` now assert suite registration against `test-suites.json`.
- **Result**: `npm run test` green (102 entries, mode=local); `test-harness-clean.js` 0 findings; `verify-integrity` OK (v0.4.47).

### [2026-09-21 05:40] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: `ws-goal-fix-pr 377` round 6 (inline fix loop) — 1 review thread on the global-install audit path.
- **Done**: `check_duplicates.cjs` no longer calls `toRepoRelative` (which throws for paths outside the repo) on audit paths; a local non-throwing `displayPath()` keeps outside-repo occurrences resolvable (`..`/cross-drive) and is used for hub-relative checks and occurrence reporting. New `test/test-check-harness-duplicates.js` covers a global-only `WORKFLOW_SKILLS_GLOBAL_DIR` install (duplicate reported, no throw) and unrelated-skill exclusion.
- **Result**: `npm run test` green; `test-harness-clean.js` 0 findings; `verify-integrity` OK (v0.4.47).

### [2026-09-21 05:15] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: `ws-goal-fix-pr 377` round 5 (inline fix loop) — 1 review thread on the config GUI editor.
- **Done**: `Edit-WorkflowSkillsConfig.ps1` gained a `number` control branch (`Add-ConfigFieldRow`, NumericUpDown with 2 decimal places, persists `[double]`) and `defaults.convergence.backoff` now binds `-Type 'number' -MinVal 1 -MaxVal 100 -DefaultVal 1.5`, matching `config.schema.json` (`number`, minimum 1). `test-powershell-config-editor.js` adds Test 9b scalar-type parity (schema `number`/`integer`/`boolean`/`string` vs row type) plus a numeric round-trip asserting `convergence.backoff` persists as a JSON number.
- **Result**: `test-powershell-config-editor.js` 10/10 PASS; `npm run test` green; `test-harness-clean.js` 0 findings; `verify-integrity` OK (v0.4.47).

### [2026-09-21 04:30] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: `ws-goal-fix-pr 377` round 4 (inline fix loop) — 2 new review threads on the autoload runtime-link renderer.
- **Done**: `renderConsumerAutoload` (`configure_autoload.cjs`) and `renderConsumerAutoloadText` (`bin/cli.js`) now resolve the local-vs-global runtime prefix per file (`runtimePrefixFor(rel)` / `managedRuntimeLinkPrefixFor(rel)`) instead of from directory existence, so a partial-hybrid local runtime keeps `{globalSkillsRoot}` tokens for files that only exist globally. Rewrite regexes capture `rel`; the bare-file loop uses the per-file prefix. Fixtures updated: partial local runtime keeps existing file project-relative and missing sibling global; new global-only + partial assertions.
- **Result**: `npm run test` green; `test-harness-clean.js` 0 findings; `verify-integrity` OK (v0.4.47).

### [2026-09-21 03:45] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: `ws-goal-fix-pr 377` round 3 (inline fix loop) — resolve 3 active review threads on PR #377, plus the outstanding release version bump.
- **Done**: Scoped `ws-check-harness` Phase 5a scans to package membership (`ws-shared` + `ws-*`) in `check_unique_runtime.cjs` / `check_duplicates.cjs` / `check_harness_links.cjs`, and fixed the same-class project-local pin in `check_shell_quoting.cjs` (`context.pathTokens` was never a real key). `check_harness_links.cjs` now resolves `context.skillsRoot` (local-first, global fallback), audits the resolved install, and maps `{skillsRoot}` token expansion to it. Regression fixtures added for both modes (unrelated `custom-skill/` stays clean; `WORKFLOW_SKILLS_GLOBAL_DIR` global-only tree is audited). Release bump 0.4.46 -> 0.4.47 via `npm run build-site:bump` (54 SKILL frontmatter, packageVersion x2, site + wiki), integrity regenerated.
- **Result**: `npm run test` green; `test-harness-clean.js` 0 findings; `verify-integrity` OK (v0.4.47).

### [2026-09-21 00:31] Agent: Muse Code (muse-spark)
- **Prompt**: Update spec 0107-us-369 for issue #369, implement surgical fixes, bump, commit, push, ship PR.
- **Done**: Tightened the three ws-monitor transcript signals to require failure-shaped evidence (`hybrid-path-resolution`: ENOENT-family within 200 chars of dispatch-context construction; `model-fallback`: dispatch + model + rejection on one dispatch record; `subagent-error`: exception marker plus stack-trace shape); updated ws-monitor SKILL.md predicate docs; refreshed spec 0107-us-369 sweep (HEAD 0.4.47, repro 3/3) and re-registered step-00; updated positive fixtures to failure-shaped evidence and added a benign-transcript negative test; version 0.4.48 + integrity regen + site rebuild.
- **Result**: Benign transcript yields 0 findings (was 3); true positives preserved; `npm run tests` 102/102 green; `test-harness-clean.js` 0 findings; `verify-integrity` OK.

### [2026-09-20 21:55] Agent: Muse Code (muse-spark)
- **Prompt**: `.agents/specs/0109-code-review-round-2-fixes.spec.md` full auto + ship (standard Spec-to-PR, autoMode, fullMode).
- **Done**: Steps 0-7 complete on `develop` (stay): classify standard/complex, plan + interview + refined plan, sequential implement, verify 8 -> scoreAndRefine round 1 (AC14/AC15/NS coverage) -> re-verify 9/10 then ledger 10/10, fable-judge VERIFIED, review APPROVE 10/10, testing green. Product commits `ae3806d6` + `b6ca3eba`; delivery result written; memory trap + compile; plan checkmarks closed.
- **Result**: AC1-AC15 implemented, `npm run test` green, harness clean, integrity regenerated; ready to close + ship PR `develop` -> `main`.

### [2026-09-20 19:32] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: Read-only code review of `dcc3aa10..origin/main` (HEAD~20 vs main), check already-fixed findings, then author a fix spec via `/ws-spec-write`.
- **Done**: Five parallel read-only review passes over `bin/`+CI, orchestrators, providers/utilities, `ws-shared` hub, and `test/`; every finding re-verified against the current tree (HEAD moved `3cbdd0b9` -> `2b9d5b89` mid-review when the prior workflow shipped step 8). Confirmed spec 0108's six topics fixed and excluded them. Spec `.agents/specs/0109-code-review-round-2-fixes.spec.md` written (15 ACs, F01-F27 traceability), `validate_spec.cjs --mode=authoring` PASS, tracked in `index.PRD` (row 114). Two memory traps recorded and compiled.
- **Result**: 27 open findings (5 high / 16 medium / 6 low) captured with evidence and suggested fixes; no source files modified.

### [2026-09-20 19:15] Agent: Antigravity
- **Prompt**: /ws-spec-to-pr .agents/specs/0108-code-review-findings-fixes.spec.md
- **Done**: Implemented centralized runtime bootstrap helper in `bootstrap_runtime.cjs` (`resolveHubScriptsDir`), refactored skill scripts (`check_unique_runtime.cjs`, `observer.cjs`, `ac_ledger.cjs`), standardized cross-platform `os.homedir()` in `check_hub_separation.cjs`, added streaming multi-byte UTF-8 decoding with `StringDecoder` in `monitor_snapshot.cjs`, and enforced automated check against forbidden `.ws/runtime` directory in `check_unique_runtime.cjs`. Added regression test suite `test/test-bootstrap-runtime.js` and regenerated integrity manifest.
- **Result**: Verification score 10/10; all ACs/NSs verified; `npm run test` green; `test-harness-clean.js` 0 findings; `verify-integrity` OK.

### [2026-09-20 12:31] Agent: opencode (deepseek-v4.1-flash)
- **Prompt**: Enforce managed-runtime location: never allow `.ws/runtime`; runtime must resolve from `{projectRoot|globalSkillsRoot}/.agents/skills/ws-shared/runtime`.
- **Done**: Installer now copies the managed `ws-shared` tree (runtime + templates) into the skills install and retires `.ws/runtime`/`.ws/templates` on install/update; `.ws` keeps consumer config, the generated `AGENTS.md` entrypoint, and `autoload.md`. Resolver, hub-separation gate, and link checker drop the `.ws` fallback; 59 skill bootstraps drop the deprecated `.ws` fallback; seed templates get refreshed. Consumer config `$schema`/`toolsFile` repoint to the managed runtime. Hub/root docs, README, FEATURES, CATALOG, SPEC-MANAGEMENT, install shim banner, and wiki pages retargeted to `{skillsRoot}|{globalSkillsRoot}/ws-shared`. Tests updated + new negative invariant (`.ws/runtime` never resolves or installs); version 0.4.46 + integrity regen + site/wiki rebuild.
- **Result**: `npm run tests` green (54 skills); `test-harness-clean` 0 findings; `verify-integrity` OK (v0.4.46).

### [2026-09-20 06:30] Agent: Muse Code (muse-spark)
- **Prompt**: Release 0.4.45: bump version, update docs, update website, update wiki, commit, push, ws-ship-pr, ws-goal-fix-pr.
- **Done**: `npm run build-site:bump` 0.4.44 -> 0.4.45 (54 SKILL frontmatter, packageVersion x2, site + docs/wiki rebuild); integrity regen + verified (54 skills); bounded ws-wiki sweep 9919e5c..HEAD (25 specs, detailed prose, 8 pages, validate 11/11 PASS, baseline -> d9db97f1); changelog entry; secrets scan clean.
- **Result**: npm run test green; test-harness-clean 0 findings; check_workflows clean; verify-integrity OK.

### [2026-09-20 05:00] Agent: Muse Code (muse-spark)
- **Prompt**: /ws-spec-index sync completed specs from latest merged PR info.
- **Done**: Synced 5 merged specs to done in `.agents/specs/index.PRD` (Feature map + Next-specs rows + Done log): 0042 PR #370, 0066 PR #371, 0076 PR #372, 0105-us-365 PR #373, 0106 PR #374; set spec frontmatter `status: completed`. Left `us-369` as todo (no merged PR, E1 unsatisfied).
- **Result**: Index now shows only `us-369` as true todo.

### [2026-09-20 03:15] Agent: Muse Code
- **Prompt**: us-365 worker (standard): opt-in execution observer for ws-spec-to-pr (transcript paths in state schema, autoStartObserver default false, at most one parallel read-only watcher sharing instruction source with ws-monitor, 6 ACs).
- **Done**: monitor.autoStartObserver schema+example+resolver (strict true) + PS1 GUI row; state agentTranscripts/observer schema fields + observer.cjs (resolve/should-dispatch/record/note-dispatch/watch, read-only outside observer/); shared runtime/observer-instructions.md referenced by both SKILL.md files; monitor snapshot surfaces stateAgentTranscripts; new test-observer-us365.js (46 checks) registered in package.json chain; integrity regen + verified (v0.4.44).
- **Result**: AC1-AC6 delivered; observer test 46/46; npm run tests + tests:harness-efficiency green; powershell-config-editor, doc-sync, harness-clean 0 findings. Learning: recorded trap 2026-09-20-crlf-edits-and-exports (CRLF exact-match edits + missing module exports).


### [2026-09-20 03:00] Agent: Muse Code (muse-spark)
- **Prompt**: ws-spec-multi worker [standard] — spec 0066 ws-shared-hub-agents-separation (consumer hub vs upstream root AGENTS.md; AC1–AC12).
- **Done**: Consumer banner + upstream relocation in ws-shared/runtime/AGENTS.md (under 14000 B cap); dropped upstream workflow/ship tables from consumer CATALOG.md + added External dependencies mirror; root AGENTS.md do-not-confuse row; new check_hub_separation.cjs Phase 5a gate (denylist + drift + local-first precedence + fail-closed); test-hub-separation.js + context-budget cap assertion; version 0.4.43 + integrity + site rebuild. Full npm run test green; harness self-audit 0 findings.
- **Result**: Merged to main as PR #371 (6 commits: 1 feat + 5 review fixes; 8 review threads fixed and resolved; CI test green).

### [2026-09-19 23:16] Agent: Muse Code (muse-spark)
- **Prompt**: Queue newest pending specs and implement them all (ws-spec-multi).
- **Done**: Blank-scan found 5 pending; probe showed no prior delivery/PR evidence. Created run state `.agents/plans/ws-spec-multi/ms-20260919T231639Z.state.md` (baseBranch main, oldest-first per user gate). Synced `feature/0042-unique-skill-script-runtime` from main and dispatched worker 1 (flowMode standard).
- **Result**: Run active; worker 1 in progress, items 2-5 pending.

### [2026-09-19 21:00] Agent: Muse Code (muse-spark)
- **Prompt**: ws-spec-multi worker — finish standard flow for 0042 unique-skill-script-runtime (Node-22 unique runtime).
- **Done**: Deleted remaining 22 `.py` + 3 `.sh` sources (zero tracked Python); fixed 4 port parity bugs (naive-time UTC, loadConfig import, resolveRepoRoot options, azure --help deferral) plus global-runtime bootstrap in 11 ports; retargeted 40+ docs, evals, bin strings, and 20 tests; added `check_unique_runtime.cjs` Phase 5a critical gate + `test-unique-runtime.js`; regenerated integrity. Full `npm run test` green.
- **Result**: Committed on `feature/0042-unique-skill-script-runtime`; PR vs `main` pending review threads.

### [2026-09-19 19:13] Agent: Muse Code
- **Prompt**: Fix config/runtime resolution to the skills installation (local `.agents/skills/ws-shared/runtime` or global `$HOME/.agents/skills/ws-shared/runtime`); keep `.ws` for local config variable files only.
- **Done**: New candidate-order bootstrap in 46 skill scripts + ws-doctor (explicit `WORKFLOW_SKILLS_SHARED_DIR` > packaged > cwd-local > global `WORKFLOW_SKILLS_GLOBAL_DIR`/`HOME` > fail-closed; dropped `.ws/runtime` fallback); `resolveHubSource` prefers repo-local skills tree, then global, then legacy `.ws` read-only fallback; precedence matrix row 3 + config-resolution.md + installer pointer text synced to `{skillsRoot}/{globalSkillsRoot}` tokens; new test-skills-runtime-resolution.js (7 checks) registered in package.json; test-local-first-precedence.js updated to the skills-tree-wins contract; integrity regenerated + verified (v0.4.41).
- **Result**: New test 7/7; precedence, hybrid-consumer-root, shared-hub-paths, doc-sync, hub-layout, monitor, monitor-us356, doctor, links, autoload-configure, powershell-config-editor, install --local all green; harness-clean 0 findings. Learning: re-confirmed trap 2026-09-19-us356-edit-tooling (CRLF files need single-line or file-aware edits; batch mechanical edits via reviewed /tmp codemod + git diff).

### [2026-09-19 12:10] Agent: Muse Code
- **Prompt**: us-356 worker (standard): host adapters for transcript/session discovery in ws-monitor (Steps 0-8, ship PR, no merge).
- **Done**: Per-OS adapter table (Cursor, OpenCode, Antigravity, Muse) behind opt-in flag, session correlation, WAL-safe bounded reads, sanitizer, transcriptSource per workflow, worker-session-stall signal; new references/host-adapters.md + test-ws-monitor-us356.js; package.json chain registration; integrity regen; G2 c0750bc0 + delivery 98076a6a; PR 364 to main.
- **Result**: AC1-AC6 delivered, verify 9/10, harness-clean 0 findings. Learning: recorded trap 2026-09-19-us356-edit-tooling (failure reflection: CRLF multi-line edit misses + patcher-template interpolation faults).

### [2026-09-19 11:30] Agent: Muse Code
- **Prompt**: us-355 worker (standard): tighten Step 3/Step 4 completion contracts plus read-only monitor detection flags (Steps 0-8, ship PR, no merge).
- **Done**: Definition-side Step 3 ruling (artifact optional in sequential; completed requires both exec files fail-closed; skips leave completedSteps); contract-side Step 4 (empty filesTouched needs explicit --noop, recorded on telemetry); monitor missing-exec-artifact + noop-aware empty-files-touched with dag-disabled compat silence; fixed plan-to-tasks stub drift; new test-step-completion-contracts.js; three stale suites updated with --noop; full npm run tests green; bump 0.4.40 to 0.4.41; G2 016f64ad + review-fix 0554fd6b; PR to main.
- **Result**: AC1-AC4 delivered, NS1-NS4 asserted, harness-clean 0 findings, integrity v0.4.41 verified. Learning: recorded trap 2026-09-19-step-completion-gate-fixtures (failure reflection: fixture seeds must satisfy the full guard chain; gate changes need full-list runs).

### [2026-09-19 09:08] Agent: Muse Code
- **Prompt**: us-348 worker (standard): host capabilities detect tools & cache (Steps 0-8, ship PR, no merge).
- **Done**: Brainstorm refine-and-implement; tokens doc + tool map + probe script + tools/host-dispatch edits + test-host-capabilities.js; verify 10/10; review clean; sabotage bit+restored; full npm run test green; bump 0.4.39 to 0.4.40; G2 6edf5be8 + delivery commit; PR to main.
- **Result**: AC1-AC5 delivered, NS1-NS4 asserted, harness-clean 0 findings, integrity v0.4.40 verified. Learning: recorded trap 2026-09-19-dashed-cli-flag-normalization (failure reflection: dashed CLI flags silently ignored until test caught it).
### [2026-09-19 00:30] Agent: Muse Code
- **Prompt**: /ws-spec-sync (spec index sync).
- **Done**: Synced 4 shipped specs to `[x]`/`done` with Done-log rows + `status: completed` frontmatter (0088→PR #339, 0090→PR #340, 0091→PR #341, 0092→PR #345); us-348 skipped (unmapped, no ship signal — needs `track`, not `sync`).
- **Result**: spec-index track, list-pending-specs, spec-lint, validate-spec all ok. Learning: N/A (routine index sync).

### [2026-09-19 00:25] Agent: Muse Code
- **Prompt**: add Desktop config GUI Editor sync to the AGENTS.md pre-ship section/board for every config.json structure/key/value/default change.
- **Done**: Sharpened the Config schema & GUI synchronization trigger (schema + example) and added a 5-row Pre-ship board under Upstream developer workflow, row 3 gating GUI sync via `node test/test-powershell-config-editor.js` (mirrors CATALOG row 7b).
- **Result**: Harness-clean 0 findings; GUI editor static tests pass. Learning: N/A (small docs edit).

### [2026-09-19 00:14] Agent: Muse Code
- **Prompt**: replay reverted docs sync, then cover newly merged PR #350 (step-baton) in README/docs/wiki/website.
- **Done**: Re-applied full 22:10 sync after PR 350 batch-3 worker revert (all anchors matched, no drift); added #350 step-baton protocol coverage — wiki delivery paragraph + provenance 0094 + index range 0001–0095, README row, FEATURES §1.6 + 0.4.38 stamp/evolution/roadmap, builder baton card, llms.txt bullet, root + hub AGENTS clauses; integrity regen; site/wiki rebuilt.
- **Result**: Wiki validate PASS; build-site --check current; doc-sync/site-wiki/wiki/harness-clean (0 findings) ok; full chain green except pre-existing bare-`python` miss (remainder under python3: PY_EXIT=0, 211 pass markers, 0 failures). Learning: N/A (replay + documented feature; pipe-exit trap already recorded).

### [2026-09-18 22:10] Agent: Muse Code
- **Prompt**: update README.md, docs/wiki, website with latest new features added in previous 10 PRs (use /ws-wiki).
- **Done**: ws-wiki bounded sync for specs 0092/0093/0095 + code-mapped updates (host-target picker, 3-option gate cap, header/nav) across 5 wiki pages + index (watermark left: 0094/0096 in-flight); README 4 feature rows + fix-PR dispatch wording; FEATURES 0.4.37 stamp, 54-skill counts, autoload fix, 0.4.31/0.4.32/0.4.35–0.4.37 evolution rows, ws-wiki catalog row; site 4 cards + 2 FAQs + preview note + 2 stale roadmap removals; llms.txt model-routing section; root + hub AGENTS one-liners; integrity regen; site/wiki rebuilt.
- **Result**: Wiki validate PASS; build-site --check current; doc-sync/site-wiki/wiki suites ok; harness-clean 0 findings; full chain green except pre-existing bare-`python` miss (reran remainder under python3, all ok). Full-suite transient stale-integrity traced to concurrent step-baton session edits, verified settled via hash compare. Learning: pipe-exit trap (below).

### [2026-09-19 00:35] Agent: Muse Code
- **Prompt**: step-baton close (Step 8: baton handoffs for multi-CLI runs, 17 ACs).
- **Done**: Verify 9/10, review clean, testing PASS; G2 40af4ad4 + 0.4.38 bump 231c5ddf; delivery commit with refined plan; status completed, ship to PR next.
- **Result**: All 17 ACs + 7/7 NS delivered, product diff 89 files (+2866/-185), v0.4.38. Learning: traps verification-manifest-root-placement, step-output-nesting-manifest-merge.

### [2026-09-18 16:45] Agent: Muse Code
- **Prompt**: us-347 close (ws-goal-fix-pr orchestrator dispatch).
- **Done**: Verify 10/10, review clean, testing PASS; delivery commit with refined plan; status completed, ship to PR next.
- **Result**: All 8 ACs delivered, product diff 61 files (+466/-178), v0.4.37. Learning: traps dag-disabled-no-dispatch-no-stub, index-rebuild-diff-before-accept, index-hash-after-manual-edit.

### [2026-09-18 15:35] Agent: Muse Code
- **Prompt**: Step 9 goal-fix-pr convergence for PR 346.
- **Done**: 3 fixPrPlan to fixPrExec batches closed 13 threads (stale AC8 diff-regression, option-cap chunking, stale Step 8 refs); commits 8c597a04, 256cd5f9, 46200d50; CI 3 SUCCESS; merged PR 346 at 51b31016; issue 344 close-looped (left open); orch audit verified merge/threads/scope/traps; outer finish, Phase A tag cleanup, index rebuild.
- **Result**: us-344 completed 0 to 9, ship merged. Learning: 5 fix-PR traps compiled (stale-test-after-default-move, token-contract-effective-resolution, gitignore-mirror-on-default-move, anchor-root-gitignore, sweep-quoters-after-restructure).

### [2026-09-18 14:40] Agent: Muse Code
- **Prompt**: Resume us-344 (issue 344 slogan workflow) at Step 6 and ship.
- **Done**: Resumed active standard workflow at Step 6; re-ran pre-advance 6 (HS-5: foreign hash drift dropped derived score to 7 + zero-diff linkage rule inapplicable); user authorized re-anchor + bypass path; verifier re-pass re-linked AC2/AC3/AC4/AC7 evidence (score 9, errors []); Step 6 review clean (No feedback, fable VERIFIED); Step 7 PASS (T1-T10 green, AC7 Implemented); Step 8 close with G2-delivery commit d61cac6d (plan only per toggles).
- **Result**: KEEP `From Spec to Delivery` verified end to end, zero product diff, status completed, ship to PR next. Learning: recorded trap 2026-09-18-subagent-turn-continuation (failure reflection: wasted Step 6 dispatch round).

### [2026-09-18 13:30] Agent: Muse Code
- **Prompt**: Change default CHANGELOG.md target to project root folder; add config key for MEMORY files target dir, default also repo root.
- **Done**: New `rules.memoryDir` (default `.`) + `rules.changelogFile` default `CHANGELOG.md`; `resolveEffectiveMemoryPaths`/`resolveChangelogPath` in Node SoT + Python mirror with legacy ws-shared fallback (configured wins with entries, else legacy with entries, else configured); `{memoryDir}` token in tools.md/config-resolution.md; retargeted self_learning, check_memory_conflict, build_dispatch_context, monitor_snapshot, check_spec_memo, auto_configure; installer stops fresh-seeding legacy MEMORY/CHANGELOG (preserves existing, never writes root); GUI + INTERVIEW + hub docs + README + AGENTS.md + FEATURES.md + wiki synced; new test/test-memory-dir-resolution.js registered; integrity regenerated; site/wiki rebuilt.
- **Result**: 45 suites green incl. install --local, harness-clean 0 findings, doc-sync, wiki, hybrid-consumer-root (legacy fallback), backends, layout, monitor, dispatch-provenance. Learning: recorded trap 2026-09-18-eval-regenerator-deletes-hand-evals. Bumped 0.4.35 → 0.4.36.

### [2026-09-18 12:46] Agent: Muse Code
- **Prompt**: Investigate `request_user_input` failure `question resume-select must have 2-3 options, got 4`, then review and apply fix.
- **Done**: Rewrote setup.md Unfinished Workflow Check as two-stage resume gate (Q1 intent 2 options, Q2 pick paged at most 3 with More workflows, N==1 shortcut); added gates.md rule 8 portable ceiling (at most 3 options per question, chunk don't truncate, Cancel via dismiss); tightened tools.md user-gate row and root AGENTS.md snapshot; added test/test-user-gate-option-cap.js (registered in tests + tests:remote); regenerated + verified integrity.
- **Result**: New test failed 8 assertions pre-fix, passes post-fix; resume-gate, feature-branch-gate, score-refine, quality-gates, reviewer-aligned, convergence, transition-continuation, research-pipeline, check-harness-links, ws-shared-layout, runtime-portability, doc-sync all green; harness-clean 0 findings. Learning: recorded trap 2026-09-18-user-gate-option-cap.

### [2026-09-18 12:00] Agent: Muse Code
- **Prompt**: Brainstorm step-level baton/handoff for multi-CLI ws-spec-to-pr runs (run config mapping steps to CLIs, coordinator, state-file signaling) and draft a spec, informed by spec-memo 0036 session-handoff-baton.
- **Done**: Wrote .agents/specs/0094-step-baton-multi-agent-runs.spec.md (17 ACs, authoring PASS) + .context.md companion (peer-polling vs coordinator decision, deferred ideas).
- **Result**: Spec of record ready at 0094; recommends coordinator-owned loop over LLM peer polling, state file as sole turn signal. Learning: N/A (standard implementation).

### [2026-09-17 12:57] Agent: muse-spark
- **Prompt**: /ship-pr (standalone): ship top-nav removal + portable python test fixes as PR #342, converge review threads, merge.
- **Done**: Committed feat(docs) nav removal + fix(test) python resolution (12 files) + 2 review-fix commits; answered and resolved 2 reviewer threads; merged #342 after all checks green.
- **Result**: PR #342 MERGED. Learning: test files hardcoding the `python` binary fail on python3-only hosts — use `process.env.PYTHON || (win32 ? python : python3)`; fixture shell commands must derive from the same constant or sabotage guards silently no-op.

### [2026-09-17 14:30] Agent: muse-spark
- **Prompt**: Implement .agents/specs/0091-website-visual-revamp.spec.md (docs-style three-region layout).
- **Done**: Restructured docs/index.html shell (skip link, grouped sidebar, main landmark, on-this-page TOC, mobile drawer + JS) and appended original docs-layout CSS; all content, anchors, and metadata unchanged; builder --check clean and rebuild deterministic.
- **Result**: AC verify 29/29 pass; inline script node --check clean; npm run test EXIT=0; integrity --check clean (no regen needed). Learning: recorded trap 2026-09-17-edit-crlf-exact-match (edit_file find must match CRLF bytes).

### [2026-09-17 13:30] Agent: muse-spark
- **Prompt**: Run ws-ship-pr for next version (bump, integrity, site/docs, commit, push, PR, wait CI, fix threads).
- **Done**: Shipped 0.4.34 (commit 95590ab8) as PR #340 develop->main; all checks pass, 0 review threads after 1 heartbeat; dry-run review clean.
- **Result**: Converged, merge pending user decision. Learning: N/A (no reviewer/CI defects to trap).

### [2026-09-17 13:00] Agent: muse-spark
- **Prompt**: Add PowerShell command rules to shared AGENTS.md (avoid runtime execution errors + on-the-fly script patching).
- **Done**: Extended `runtime/AGENTS.md` § Cross-platform runtime with 6 agent-facing PowerShell rules; regenerated integrity.
- **Result**: Integrity verify OK; harness-clean 0 findings; doc-sync and context-budget pass. Learning: N/A (doc edit distilling existing traps).

### [2026-09-17 12:30] Agent: muse-spark
- **Prompt**: Implement `.agents/specs/0090-muse-code-harness-adaptation.spec.md` via fable-method (Task).
- **Done**: tools.md (native-runner rule + posture record), CROSS-PLATFORM.md (posture/non-interactive section), ws-ship-pr preflight resolution order, `muse-spark` preset in example + project config + GUI enum, preset test extended. gates.md already satisfied AC2 (no churn).
- **Result**: Pending full suite + integrity regen. Learning: recorded (shell byte-rewrite trap).

### [2026-09-17 12:00] Agent: muse-spark
- **Prompt**: Spec that deep-analyzes ws-spec-to-pr* orchestration and adapts instructions/gates/auto modes/auxiliary .md files for the Muse Code harness on muse-spark agents (ship auto-detect, --yolo assume-yes, smooth step transitions, portable).
- **Done**: Wrote `.agents/specs/0090-muse-code-harness-adaptation.spec.md` (authoring PASS, 9 ACs); tracked on index.PRD (row 94). No workflow register (standalone).
- **Result**: Spec of record ready for planning; index.PRD updated. Learning: N/A (standard implementation).

### [2026-09-17 03:00] Agent: muse-spark
- **Prompt**: Continue full auto - resume `ws-preview-before-ship-gate` (lite) at Step 2 through ship.
- **Done**: Verified the Step 4b implementation (AC1-AC9 file evidence, NS1-NS5 linked, full 76-step suite green, integrity regen last); G2 `cea78a7c`; review round 1 clean 9/10 (fable VERIFIED); close result + delivery commit (plan only).
- **Result**: Steps 2-3 complete; Step 4 close done, ship next (push + live 4b + PR). Learning: recorded (Windows PowerShell CLI quoting trap).

### [2026-09-17 00:00] Agent: opencode-go/muse-spark
- **Prompt**: Fix the preview-before-ship change (verify Step 4b placement before SCM Create PR; write the missing spec under `.agents/specs`).
- **Done**: Verified Step 4b runs after commit/push and before provider Create PR (github/ado share the gate); wrote spec `0089-ws-preview-before-ship-gate.spec.md` (authoring PASS, 9 ACs); tightened Step 4b wording (trimmed-empty command, consumer repo root, `preview.previewBeforeShip` key), added the INTERVIEW table row, regenerated integrity.
- **Result**: `validate_spec --mode=authoring` PASS; GUI tests 8/8; `verify-integrity` OK v0.4.33; `test-harness-clean.js` 0 findings; `test-doc-sync` ok. Learning: N/A (spec backfill plus prose precision, no new project knowledge).

### [2026-09-16 21:03] Agent: opencode-go/deepseek-v4.1-flash
- **Prompt**: Add optional ws-preview run in ws-ship-pr before Create PR, gated by `previewBeforeShip` (default true) plus `dryRunCommand`; report errors and continue shipping.
- **Done**: New Step 4b in `ws-ship-pr` (runs only when Create PR will execute; non-blocking); `previewBeforeShip` boolean in schema (default true), template, project config (`true`), and GUI editor; noted in INTERVIEW § Preview, ws-preview SKILL, and FEATURES 0.4.33 row.
- **Result**: GUI tests 8/8; quality/feature-branch/delivery/hermes suites green; `verify-integrity` OK v0.4.33; harness clean 0 findings. Learning: N/A (small additive gate, no new project knowledge).

### [2026-09-16 20:56] Agent: opencode-go/deepseek-v4.1-flash
- **Prompt**: Fix the 3 findings from the `/ws-preview` dry-run (unguarded manifest parse, unguarded link decode, hub coverage gap).
- **Done**: Guarded `detect_install_mode.cjs` manifest parse (structured warning), added safe `decodeURIComponent` fallback and resolved-hub routing files in `check_harness_links.cjs`; added corrupt-manifest and link-gate regression tests, registered the new suite, regenerated integrity.
- **Result**: New tests green; `test-harness-clean.js` = 0 findings; `verify-integrity` OK v0.4.33. Learning: N/A (review fixes, no new project knowledge).

### [2026-09-16 20:49] Agent: opencode-go/deepseek-v4.1-flash
- **Prompt**: Explain `localReviewCommand`, recommend a value, and add an npm script running the agentic-code-reviewers dry-run locally.
- **Done**: Added `review:dry` to `package.json` (same OpenCode reviewer recipe as CI with `--dry-run`, no PR publishing); repointed `preview.dryRunCommand` to `npm run review:dry` (single source of truth, most portable form). Left `preview.localReviewCommand` empty (recommended default until the team wants the enforced LLM gate in ws-code-review).
- **Result**: JSON parses; `npm pkg get` resolves the script; `verify-integrity` OK v0.4.33. Learning: N/A (config-only addition, no new project knowledge).

### [2026-09-16 20:47] Agent: opencode-go/deepseek-v4.1-flash
- **Prompt**: Add `preview.dryRunCommand` to config.json based on the agentic-code-reviewers CI action.
- **Done**: Set `preview.dryRunCommand` in project `config.json` (mirrors `.github/workflows/opencode-code-review.yml` review step: same engine/model/variant/stack/prompt/threshold/patterns, `--dry-run`, no `--gh`/`--pr-id`, same exclude env). Schema/template/GUI already covered `preview`; no GUI or schema change needed.
- **Result**: JSON parses; `verify-integrity` OK v0.4.33; GUI editor tests 8/8; ws-doctor smoke passed. Learning: N/A (config-only addition, no new project knowledge).

### [2026-09-16 20:40] Agent: opencode-go/deepseek-v4.1-flash
- **Prompt**: Write a spec for the ws-check-harness install-mode/clean-audit feature as completed.
- **Done**: Authored `.agents/specs/0088-ws-check-harness-install-mode-clean-audit.spec.md` (12 ACs, `status: completed`, closure tables). `validate_spec.cjs --mode=authoring` PASS; tracked in `index.PRD` row 92; recorded traps `catalog-utf8-byte-budget` and `global-version-representative-sample`.
- **Result**: Spec of record + index row delivered. Learning: traps `catalog-utf8-byte-budget`, `global-version-representative-sample`.

### [2026-09-16 20:15] Agent: opencode-go/deepseek-v4.1-flash
- **Prompt**: Make ws-check-harness compatible with upstream/global/project install edge cases; add a release-time proof of the upstream zero-findings invariant with a non-blocking CI report.
- **Done**: Added `detect_install_mode.cjs` (install mode/scope + coexistence evidence), `check_harness_links.cjs` gate, `test/test-harness-clean.js` and `test/test-check-harness-install-mode.js`; fixed all upstream findings (runtime hub link depth, STACK/README/RESEARCH links, bare shorthand tokenized); wired non-blocking `harness-audit` job with report artifact into `deploy-site.yml`; synced SKILL/PHASES/REPORT-FORMAT/evals/AGENTS/CATALOG/FEATURES; bumped 0.4.33 and regenerated integrity.
- **Result**: `node test/test-harness-clean.js` = 0 findings; affected suites green; `verify-integrity` OK v0.4.33; commit/PR pending. Learning: traps `catalog-utf8-byte-budget`, `global-version-representative-sample`.

### [2026-09-16 19:55] Agent: opencode-go/deepseek-v4.1-flash
- **Prompt**: Installer/updater must always ask which harness/IDE host targets receive the skills; the updater silently reused recorded/detected targets.
- **Done**: Extracted the host-target picker into `promptSecondaryGlobalTargets`; `update` (now async, new `--yes`) and `install --global` always prompt on TTY with recorded + detected targets pre-selected (Enter keeps them). Piped/`--yes` runs keep reuse + auto-detect. Added `computeTargetPreselectIds` helper with tests; updated CLI help, `README.md`, site snippet, and `FEATURES.md`; bumped 0.4.32.
- **Result**: `node --check` clean; smoke install/update non-interactive exit 0; `npm run test` exit 0; `verify-integrity` OK; fable verdict VERIFIED WITH CAVEATS (TTY-only prompt branch not exercisable from a non-TTY shell). Learning: trap `fable-tty-path`.

### [2026-09-16 18:59] Agent: opencode-go/deepseek-v4.1-flash
- **Prompt**: `ws-goal-fix-pr 337` round 1 (thread `PRRT_kwDOTFajc86jHrTf`: retired karpathy skill still advertised).
- **Done**: Verified the anchor was fixed in `7b63fffe`; proactive class sweep replaced stale karpathy prose with `ws-senior-developer` in `ws-fix-pr` README + COOPERATIVE_FIX heading and `ws-show-harness`; `AUTO_FIX.md` skipped (byte-locked by `test-fix-pr-proactive-class-sweep.js`); regenerated integrity.
- **Result**: `npm run test` exit 0; `verify-integrity` OK; thread resolved with commit evidence. Learning: trap `retired-skill-reference-sweep`.

### [2026-09-16 18:50] Agent: opencode-go/deepseek-v4.1-flash
- **Prompt**: `bump` then `ws-ship-pr` + `ws-goal-fix-pr` for the develop release.
- **Done**: Bumped 0.4.30 -> 0.4.31 (package.json, 54 SKILL.md frontmatter, skill-dependencies, site footer); replaced retired `ws-karpathy-guidelines` pills with `ws-senior-developer` in site steppers and role matrix; GUI `autoloadTaskLifecycle` default true; regenerated integrity; ran prepare checks (`npm run test`, workflow simulation, secrets scan, duplicates/handoff/quoting, GUI parity).
- **Result**: `npm run test` exit 0; `verify-integrity` OK; `check_workflows.py` 0 issues; secrets scan clean; fable verdict VERIFIED WITH CAVEATS (trap `fable-ship-integrity`). Learning: integrity regen must be the last step before commit.

### [2026-09-16 18:40] Agent: opencode-go/deepseek-v4.1-flash
- **Prompt**: `ws-spec-sync` — index sync routed via user-gate to `ws-spec-index sync`.
- **Done**: Marked specs 0085 (karpathy merge, `cf6f585b` / PR #337), 0086 (ws-tdah wait-what, `cf6f585b` / PR #337), and 0087 (ws-wiki Sync Baseline, `71f90237`) done in `index.PRD` (Feature map checkboxes, Next-specs statuses, Done log) and set spec frontmatter `status: completed`.
- **Result**: `validate_spec --mode=compat` PASS 3/3; idempotent (no duplicate rows). Learning: N/A (no new project knowledge).

### [2026-09-16 18:39] Agent: opencode-go/muse-spark-1.3-contributor
- **Prompt**: update ws-shared/autoload.md for required vs optional routing (senior/tdah/spec-memo required, changelog/fable/megabrain optional, task-lifecycle required).
- **Done**: Split runtime + mirror autoload.md into required Always-applied (senior, self-learning, tdah, spec-memo, task-lifecycle) plus Optional on-demand (changelog, fable-method, megabrain); updated configure_autoload defaults, task-lifecycle default-required opt-out, schema/example/docs, skill bodies, tests, integrity.
- **Result**: test-autoload-configure, test-external-companion-skills, test-ws-task-lifecycle, test-ws-megabrain, test-doc-sync, test-hybrid-consumer-root pass; verify-integrity OK. Learning: Autoload Always-applied heading must stay exact for configure script.

### [2026-09-16 18:34] Agent: opencode-go/deepseek-v4.1-flash
- **Prompt**: Update the living wiki from latest PRs/specs/plans with a second pass from code; record the current commit hash in `index.wiki.md` and teach `ws-wiki` to sweep incrementally from that baseline.
- **Done**: Synced 8 wiki pages through specs 0077-0084 / PRs #332-#337 (0.4.26-0.4.30) and regenerated `docs/wiki` HTML; added `## Sync Baseline` (`7b63fffe`) plus `ws-wiki` § Incremental baseline across SKILL/PHASE-1-SWEEP/SYNC/INIT/UPDATE, CATALOG rows, and `test-wiki` assertions (spec 0087 AC1-AC10).
- **Result**: `npm run test` exit 0; `tests:harness-efficiency` exit 0; `validate_wiki --check` PASS; `verify-integrity` OK. Learning: recorded trap `catalog-budget-literal-test-assertions` (CATALOG 24000 B cap + literal test substrings).

### [2026-09-16 18:29] Agent: opencode-go/muse-spark-1.3-contributor
- **Prompt**: create missing plans with ws-spec-write from latest PRs after 0084 (karpathy merge, wait-what, ws-wiki hash baseline).
- **Done**: Authored and tracked `0085-merge-karpathy-into-senior-developer`, `0086-ws-tdah-wait-what-repitch`, `0087-ws-wiki-sync-baseline`; index.PRD rows 89-91.
- **Result**: `validate_spec --mode=authoring` PASS for all three (9, 9, 10 ACs); `track_index` status tracked. Learning: N/A (standard implementation).

### [2026-09-15 20:30] Agent: opencode-go/deepseek-v4.1-flash
- **Prompt**: Draft spec from plan + register via ws-spec-index + implement via ws-fable-method for `.cursor/plans/pipeline_skill_guardrails_8b7695b2.plan.md`.
- **Done**: Authored/tracked spec `0084-pipeline-skill-guardrails`; added P0/P1 blast-radius guardrails to 10 pipeline skills (files_touched, no git, Shell-required verify, `force_interview`, probe-only testing, anonymization, portable `localReviewCommand`, lite `read-memory`); deduped handoff boilerplate, memory essays, ScoreAndRefine table, branded reviewer path, and three SCM tables; added `setup.md` anonymization row.
- **Result**: `npm run test` exit 0; `verify-integrity` OK; `check_pipeline_handoff` OK. Deferred as caveats: full handoff-sentence removal (kept terse `state.handoffs` pointer for the harness checker) and the Step 8 x3 / model-chain x5 / G2-hunk x4 / PROTOCOLS minVerifyScore dedup. Learning: pipeline prose dedup must keep checker- and test-locked substrings.

### [2026-09-15 03:45] Agent: Antigravity / Gemini
- **Prompt**: /ws-spec-to-pr-lite slug=installer-antigravity-gemini-skills-json full auto ship
- **Done**: Configured Gemini CLI and Antigravity IDE global host target declaratively via `$HOME/.gemini/config/skills.json` instead of folder symlinks/copies; swept legacy `ws-*` directory junctions from `~/.gemini/config/skills/`; preserved custom user skills and entries; updated auto-detection, docs, and test suite.
- **Result**: All tests passed (exit 0); clean code review; spec 0083 verified and marked done in index.PRD.

### [2026-09-15 03:00] Agent: opencode-go/muse-spark-1.3-contributor
- **Prompt**: fix install/update ENOENT on Gemini secondary target; then bump, commit, ws-ship-pr + ws-goal-fix-pr.
- **Done**: Healed stale-junction projection via lexical existence in bin/install-rules.js, isolated test HOME, released 0.4.28, shipped PR #334 (merged), fixed 1 review thread with dangling-junction regression test.
- **Result**: update --global green; PR #334 merged to main with all checks SUCCESS and zero threads. Learning: Installer dangling-link lexists trap.

### [2026-09-14 19:05] Agent: GPT-5.6 Luna
- **Prompt**: /ws-goal-fix-pr (PR #332, round 4 staged-leftover review threads).
- **Done**: Made fix-pr hunk staging index-aware by inspecting HEAD, cached, and porcelain state; preserve staged WIP with `git restore --staged` before non-interactive hunk staging; updated shared gates, tools, spec, evals, and tests.
- **Result**: Four same-class review threads addressed in one batch. Learning: path-scoped staging is insufficient when the same path already has staged WIP.

### [2026-09-14 18:54] Agent: GPT-5.6 Luna
- **Prompt**: /ws-goal-fix-pr (resume PR #332, round 3).
- **Done**: Added deterministic `FETCH_HEAD` overlap detection before pull and fail-closed handling for inseparable dirty fix hunks across ws-fix-pr, cooperative guidance, G2 staging, spec, evals, and tests.
- **Result**: Six review threads addressed in one surgical batch. Learning: pull overlap must be computed, and score 6–10 anchors require a landed commit.

### [2026-09-14 18:32] Agent: Composer
- **Prompt**: /ws-goal-fix-pr 332 (round 2 mixed-hunk / bare git add -u Never list).
- **Done**: SKILL, gates.md, tools.md commit-code, COOPERATIVE_FIX, evals, tests: forbid bare `git add -u`; stage only fix hunks on preExistingDirty overlap.
- **Result**: Threads PRRT_kwDOTFajc86iTYbw and PRRT_kwDOTFajc86iTYcm. Learning: mixed hunks on dirty paths.

### [2026-09-14 18:20] Agent: Composer
- **Prompt**: Fix opened PR #332 review threads (bare git add -u).
- **Done**: Scoped `git add -u -- <deleted-paths>` in ws-fix-pr SKILL, COOPERATIVE_FIX, gates.md staging; test asserts pathspec.
- **Result**: Round 1 thread PRRT_kwDOTFajc86iTPwD. Learning: Bare git add -u stages all tracked dirty files.

### [2026-09-14 18:05] Agent: Composer
- **Prompt**: Implement spec 0082 ws-fix-pr surgical commit without full-tree stash.
- **Done**: `ws-fix-pr/SKILL.md` preflight snapshots `preExistingDirty` (allows dirty tree; forbids stash sandwich); step 5 path-scoped `git add --`; `COOPERATIVE_FIX.md` order-of-ops + surgical commit note; evals id 8 assertions; `test-fix-pr-proactive-class-sweep.js` guards.
- **Result**: `node test/test-fix-pr-proactive-class-sweep.js` exit 0. Learning: N/A (standard implementation).

### [2026-09-13 15:50] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-manager then Sync spec status in index.PRD.
- **Done**: E1 sync for `website-wiki-page` (commit `499b5125`) and `ws-wiki-from-code` (commit `013431e4`); Feature map + Next-specs `[x]`; Done log rows; spec frontmatter `status: completed`.
- **Result**: Left `[ ]`: unique-skill-script-runtime, ws-shared-hub-agents-separation, ws-wiki-spec-sweep (no E1). Learning: N/A (no new project knowledge).

### [2026-09-13 18:05] Agent: Composer
- **Prompt**: Verify plan execution then ship 0.4.25 (fix Step 8 contract, bump).
- **Done**: Ship phase options 1/2/4; not-fullMode auto-gate skip delivery + skip shipping; leftover close-gate wording; probe ignore-only + human --soft-exit tests; FEATURES Step 8 combined menu; bump 0.4.24 to 0.4.25.
- **Result**: Targeted tests green; integrity + harness/workflows to follow bump. Learning: N/A (standard implementation).

### [2026-09-13 17:55] Agent: Composer
- **Prompt**: Implement consolidated Gemini review fixes (D1 + D2a + D3 + Step 8 combined menu).
- **Done**: Single JSON `--json --soft-exit` in check_memory_conflict.py; portable `__dirname/ac_ledger.cjs` in commit_g2_code.cjs; probe_test_surface git ls-files --others; Step 8 five-option combined gate in gates.md, STEP-DISPATCH.md, PROTOCOLS.md, faq.md; classifier-history + runtime-portability tests; integrity regen (no version bump).
- **Result**: Targeted tests exit 0; verify-integrity OK. Learning: N/A (standard implementation).

### [2026-09-13 13:33] Agent: Cursor Grok 4.6
- **Prompt**: Make `--update-comparison` skip unchanged version tables (Generated stamp noise).
- **Done**: Fingerprint compare ignoring `**Generated:**`; write only changed `table-*.md` / evolution; regression in `test-ws-benchmarks.js`; integrity regen for `ws-benchmarks`.
- **Result**: `node test/test-ws-benchmarks.js` exit 0; `verify-integrity` OK. Learning: persist trap 2026-09-13-benchmark-table-generated-stamp.

### [2026-09-13 13:25] Agent: Cursor Grok 4.6
- **Prompt**: Verify and fix runInterview reason mismatch when complexityClass is complex on a lite pipeline.
- **Done**: classify.cjs now names matching interview triggers; SKILL contract line; regression in test-classifier-history.js (lite + complex fixture).
- **Result**: Issue confirmed and fixed; test-classifier-history exit 0. Learning: persist trap 2026-09-13-runinterview-reason-triggers.

### [2026-09-13 17:00] Agent: muse-spark-1.3-contributor
- **Prompt**: /ws-fable-judge implement .cursor/plans/stp_speed_determinism_b0c43a78.plan.md
- **Done**: P0/P1/P2 speed-determinism core (classify complexityClass + spec-touched layers, link persists pre-step6 scoreState, git-intersect files_touched, finish-batch, stub/commit/manifest helpers, dispatch hook + prefix, alias/probe/history/soft-exit/lite-label/wiki-offer hygiene, fx-docs-micro waste test wired into CI, integrity regen).
- **Result**: Targeted tests green (process-waste, ac-ledger, classifier-history, workflow-state-contract, artifact-economy, doc-sync, dispatch-provenance) + full npm test green; fable-judge VERIFIED WITH CAVEATS (minor hygiene deferred, no version bump). Learning: plan-scale delivery must list partial items as caveats (see memory 2026-09-13-fable-stp-speed-determinism).

### [2026-09-13 16:30] Agent: muse-spark-1.3-contributor (Step 8 close us-328)
- **Prompt**: /ws-spec-from-provider (bulk import, 1 open issue) then /ws-spec-to-pr 0081-us-328.spec.md full auto ship PR (standard, autoMode, fullMode)
- **Done**: Issue 328 fetch-to-spec + agentic reformulation (0081-us-328.spec.md) + register; keyword-map prose fix in runtime/autoload.md + mirror sync (5 rows, installer-refresh stable); regression block in test-doc-sync.js (red-verified); release 0.4.23 -> 0.4.24 + integrity + site; G2 43190245, review-fix afa5eeab (spec archival), delivery c355d0bb.
- **Result**: Ledger 10/10, full npm run tests exit 0, review clean + fable-judge VERIFIED. Learning: reuse vendor transforms verbatim via temp scripts (no retyped inline regex); new workflow state must be stamped via update_state dispatch/finish (see memory 2026-09-13-us-328-harness-traps).

### [2026-09-13 02:45] Agent: muse-spark-1.3-contributor (bump + ship + goal-fix-pr 326)
- **Prompt**: bump version, commit, /ws-ship-pr (standalone develop->main) + /ws-goal-fix-pr 326
- **Done**: Release 0.4.22 -> 0.4.23 (55 skills, both skill-dependencies, integrity, site) commit 6ea27ffb; PR 326 merged a04884dc; 3 goal-fix-pr rounds, 6 threads fixed (example no-placeholder, mixed predicate, verbosity persistence, merge wording, verify extraction) commits e0780049/a15162d1/6c0601fc; telemetry aggregate refreshed.
- **Result**: activeThreads 0, review + test checks green, CLEAN merge. Learning: wiki examples must not keep placeholder conditional sections; template-mix predicates must warn on any legacy residue; per-flow verbosity must honor config uniformly; preservation/verifier clauses must name current headings.

### [2026-09-13 22:00] Agent: muse-spark-1.3-contributor (Step 8 close us-324)
- **Prompt**: /ws-spec-to-pr full auto 324 ship goal-fix-pr (standard, autoMode, fullMode)
- **Done**: ws-wiki verbosity (condensed/detailed) + conditional template across SKILL/FROM-CODE/SWEEP/SYNC/UPDATE; validator dual-template + normalizeVerbosity; config schema/example/GUI + configure mention; VERBOSITY-EXAMPLE + wiki doc migration; tests (Test 22 + nested GUI parity); release 0.4.21 -> 0.4.22 + integrity + site; G2 commit 78525a5d; delivery e94f2d57.
- **Result**: Score 10, clean review, testing green. Learning: N/A (standard implementation)
- **Prompt**: Step 8 Close implementation then Ship for ws-wiki-from-code (standard, autoMode, fullMode)
- **Done**: Delivery result; integrity regen + wiki site refresh; G2-delivery refined plan; status completed, shipStatus pending; push + PR to main.
- **Result**: Score 9, clean review VERIFIED, testing passed. Learning: N/A (standard implementation)

### [2026-09-12 16:48] Agent: opencode-go/muse-spark (Step 8 close ws-wiki-code-verify)
- **Prompt**: Step 8 Close implementation then Ship for ws-wiki-code-verify (standard, autoMode, fullMode)
- **Done**: Delivery result + second-pass report; G2-delivery commit 88760ba8 (refined plan only); status completed, shipStatus pending; spec-index/wiki sync (implementation evidence).
- **Result**: Score 10, clean review, testing passed. Learning: N/A (standard implementation)

### [2026-09-12 11:50] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr @.agents/specs/0077-website-wiki-page.spec.md full auto (Step 9 fix-pr round 1)
- **Done**: Page-relative wiki hrefs and `**strong**` rendering; regenerated `docs/wiki/`; tests in `test/test-site-wiki.js`.
- **Result**: Learning: Wiki HTML hrefs must be page-relative; Wiki inline scanner must parse strong before dumping remainder


### [2026-09-12 11:42] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-write Phase 2 wiki-vs-code verify; follow-up name plan/updating PHASE 3.
- **Done**: Wrote `.agents/specs/0078-ws-wiki-code-verify.spec.md` + companion `.context.md`; authoring validate PASS (19 ACs); tracked on index.PRD (row 84).
- **Result**: Spec of record ready. Learning: N/A (no new project knowledge)


### [2026-09-12 11:40] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr @.agents/specs/0077-website-wiki-page.spec.md full auto
- **Done**: Generated docs/wiki HTML from wiki dir on site build; tests, nav, sitemap; G2 commit 499b5125; score 10; clean review.
- **Result**: Implementation complete on develop. Learning: N/A (standard implementation)

### [2026-09-12 11:16] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-write dedicated website page rendering current {wikiDir} wiki; rebuild site also refreshes wiki HTML.
- **Done**: Wrote `.agents/specs/0077-website-wiki-page.spec.md` + companion `.context.md`; authoring validate PASS (17 ACs); tracked on index.PRD (row 83).
- **Result**: Spec of record ready. Learning: N/A (standard implementation)

### [2026-09-12 11:15] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr-lite implement 0076-ws-wiki-spec-sweep full auto, bump version, ws-ship-pr.
- **Done**: Added `list_wiki_sweep_specs.cjs`, sweep mode in `ws-wiki/SKILL.md`, tests, catalog updates; bumped package to 0.4.20 with integrity regen.
- **Result**: `test/test-wiki.js` PASS. Learning: N/A (standard implementation)

### [2026-09-12 11:03] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-write first-time ws-wiki spec sweep after init (sequential NNNN overlay).
- **Done**: Wrote `.agents/specs/0076-ws-wiki-spec-sweep.spec.md` + companion `.context.md`; authoring validate PASS (18 ACs).
- **Result**: Authoring PASS; tracked on index.PRD (row 82). Learning: N/A (standard implementation)

### [2026-09-12 10:52] Agent: Cursor Grok 4.6
- **Prompt**: /ws-wiki then init (refresh taxonomy, keep existing feature links).
- **Done**: Rewrote `.agents/specs/wiki/index.wiki.md` with harness/delivery/providers/specs/quality/memory/engineering/documentation domains; kept `documentation/ws-wiki.md`.
- **Result**: `validate_wiki.cjs --check` exit 0 (2 pages). Learning: N/A (standard implementation)

### [2026-09-11 18:37] Agent: Antigravity
- **Prompt**: /ws-megabrain fetch gh issues and fix them all with tests, bump version, commit, update website/agents.md/readme.md, push, ship-pr and goal-fix-pr (fixes #315, #316).
- **Done**: Added dispatch provenance (`agentType`, `subagentId`, `model`) to `stepDispatches[]` and `telemetry.jsonl` in `workflow_state.cjs` with full schema conformance; updated Tier 1 host dispatch docs and orchestrator instructions to explicitly target specialized subagent IDs (`ws-step-*`) when enabled; updated `ws-monitor` to treat embed-inline as healthy when host capability has no named binding and evaluate dispatch provenance without relying on transcripts; added comprehensive automated test `test/test-dispatch-provenance.js` and updated monitor test suite; bumped version to 0.4.18 with site rebuild and integrity regeneration.
- **Result**: All tests pass, integrity verified, secrets scan clean, harness audit 0 critical. Learning: N/A.

### [2026-09-11 06:35] Agent: Muse Spark 1.3 (Cursor)
- **Prompt**: bump + /ws-ship-pr + ws-goal-fix-pr (develop residue to main).
- **Done**: Bumped 0.4.16 to 0.4.17 (91e4c950, 60 files) on user's ce8c6d07 residue commit; prepare board green (suite x2, integrity, harness audit 0 critical, no leaks, fable VERIFIED, review clean); pushed develop; PR #314 converged (0 threads, 3 checks pass, 0 fix rounds) and merged 71277cb2; telemetry aggregate written.
- **Result**: main at 71277cb2, tree clean. Learning: N/A (no reviewer/CI defects this run).

### [2026-09-11 06:15] Agent: Muse Spark 1.3 (Cursor)
- **Prompt**: Delete stray repo-root `nul` file, find who wrote it, and fix the cause.
- **Done**: Deleted `nul` (2>nul under Git Bash wrote git CRLF warnings to a literal file; mtime 23:57 during us-311 worker). Added CROSS-PLATFORM.md null-device rule 7 (>/dev/null in bash, >NUL only in cmd, $null only in PowerShell); regenerated + verified integrity; recorded a Medium MEMORY trap and compiled index.
- **Result**: File gone, rg clean, verify-integrity OK, full suite (see below). Learning: recorded nul-redirect trap.

### [2026-09-11 00:35] Agent: Muse Spark 1.3 (Cursor)
- **Prompt**: /ws-spec-multi full auto sequential on us-311 + us-310 (run ms-20260911T034316Z).
- **Done**: Both standard workers shipped; master verified convergence (0 threads, checks green) and merged PR #312 (us-311, 1773f599) and PR #313 (us-310, 5cdb7e10) into main with post-merge base sync; run status completed. Resolved a stat-phantom checkout block (work==HEAD==main hashes) via index refresh.
- **Result**: 2 shipped / 0 skipped / 0 failed; main at 5cdb7e10. Learning: N/A (standard batch execution, no new project knowledge).

### [2026-09-11 00:24] Agent: Muse Spark 1.3 (Cursor)
- **Prompt**: ws-spec-multi worker [standard] us-310: full auto Spec-to-PR for repeated file-list flags (issue #310).
- **Done**: Accumulated repeated --created/--modified/--deleted in parseArgs (closed allowlist, scalars last-wins); added test-repeated-file-list-flags.js (T1-T8); ledger score 10/10; sabotage passed; review clean; full suite green; bump 0.4.16 + integrity; G2 ba9935d6 + delivery cae2b8f1.
- **Result**: Steps 0-8 closed; PR feature/us-310 -> main pending ship. Learning: recorded ledger-score-boundary trap.

### [2026-09-10 23:50] Agent: Muse Spark 1.3 (Cursor)
- **Prompt**: /ws-spec-from-provider fetch all gh issues, create specs, prepare /ws-spec-multi full auto sequential run.
- **Done**: Imported open issues #311 (artifact stamp status) and #310 (repeated file-list flags) as agentic specs .agents/specs/0073-us-311.spec.md (7 ACs) and 0074-us-310.spec.md (8 ACs), authoring-validated and registered to step-00 workflow copies; verified both pending for ws-spec-multi.
- **Result**: 2 imported / 0 skipped / 0 failed. Prepared explicit-path ws-spec-multi command for us-311 + us-310. Learning: N/A (standard implementation, no new project knowledge).

### [2026-09-10 13:30] Agent: Muse Spark 1.3 (Cursor)
- **Prompt**: Fetch all open issues, implement them, bump version, update site/docs, test, commit, push, ship-pr + goal-fix-pr.
- **Done**: Implemented #308 local-first precedence matrix with resolved-context diagnostics and no-silent-fallback in both resolvers, added stale-state and context-mismatch detection to ws-monitor, added test-local-first-precedence.js coverage, bumped 0.4.13 to 0.4.14 with site rebuild and integrity regen.
- **Result**: Full npm run test green, verify-integrity OK, leak scan clean. Learning: recorded resolution-stale-dirs trap.

### [2026-09-09 17:09] Agent: GPT-5.6 Luna
- **Prompt**: Verify and fix missing-value handling in the `ws-monitor` snapshot CLI.
- **Done**: Added fail-fast validation for value-taking flags and regression coverage for omitted and flag-like values.
- **Result**: Invalid watch invocations now exit with a clear error instead of entering an unbounded loop. Learning: recorded a reproduction-command trap.

### [2026-09-09 17:04] Agent: GPT-5.6 Luna
- **Prompt**: Resolve the remaining PR review thread for nested host capability model fallback.
- **Done**: Collected `supportedModels` recursively through `binding` and added file-backed fallback regression coverage.
- **Result**: Targeted tests, full `npm run test`, harness-efficiency tests, and integrity verification passed. Learning: N/A (review fix matched the documented host-capabilities shape).

### [2026-09-09 16:58] Agent: GPT-5.6 Luna
- **Prompt**: Compile or recompile `.cursor/agents`.
- **Done**: Ran the canonical Cursor host-subagent compiler for the repository.
- **Result**: All 10 generated agents were already current; verification passed with no file changes.

### [2026-09-09 16:47] Agent: GPT-5.6 Luna
- **Prompt**: Implement all currently open upstream issues, release the package, update the site and docs, test, and ship the changes.
- **Done**: Fixed hybrid dispatch and model fallback, enforced Step 2 interview artifacts, normalized telemetry, made `scoreAndRefine` explicit, and added the read-only `ws-monitor` skill with projections, docs, schemas, and regression tests.
- **Result**: Version 0.4.8, generated site/catalog/docs and integrity synchronized; full `npm run test`, harness, workflow, portability, and security checks passed. Ship/PR handoff follows.

### [2026-09-09 10:57] Agent: Cursor Grok 4.6
- **Prompt**: Generate `.cursor/agents` via `/ws-configure-project`; test specialized dispatch; diagnose Step 5 Ask-mode / readonly failure.
- **Done**: Enabled `defaults.specializedSubagents` (cursor / `ws`); compiled 10 `ws-step-*` agents; stopped emitting host `readonly: true` on Step 5; product-tree readonly stays in the compiled prompt; dispatch docs and compiler tests updated.
- **Result**: Compiler suite 15/15 pass; local `--check` OK; Step 5 frontmatter has no host readonly; custom `spec-to-pr.md` preserved. Learning: host `readonly` on the verifier maps to a question-only session and blocks Shell.

### [2026-09-09 09:00] Agent: Antigravity
- **Prompt**: /ws-spec-to-pr .agents/specs/0071-specialized-subagents-compiler.spec.md
- **Done**: Implemented optional host subagents compiler `compile_host_subagents.cjs`, `.cursor/agents` projection with `@generated` markers, autodetection in `auto_configure.cjs`, Tier 1 dispatch and fallback ladder in `host-dispatch.md`, hub layout classification, and 9/9 automated tests.
- **Result**: Verification 10/10; review approved; testing passed; product committed as e44cc96e.

### [2026-09-08 14:56] Agent: GPT-5.6 Luna
- **Prompt**: Follow up on harness and adversarial audits for the open ship PR.
- **Done**: Fixed global-hybrid autoload writers to read `externalSkills` from the selected global runtime graph and to materialize the local hub pointer referenced by generated root `AGENTS.md`; added minimal global-only regression coverage.
- **Result**: Targeted autoload, external-companion, shared-layout, integrity, invariant, and workflow checks pass; full regression is in progress. Learning: autoload writers must use the selected global runtime.

### [2026-09-08 14:37] Agent: GPT-5.6 Luna
- **Prompt**: `/ws-ship-pr` resumed after PR #290 review identified an incomplete standalone `ws-doctor` retired-skill fallback.
- **Done**: Mirrored all canonical 0.3.56 retired skill IDs in the no-runtime fallback, added coverage for every renamed folder, regenerated integrity, and completed targeted plus full regression verification.
- **Result**: Review fix is ready to push; PR remains open and unmerged. Learning: fallback registries must be tested without their optional canonical runtime.

### [2026-09-08 10:18] Agent: GPT-5.6 Luna
- **Prompt**: `/ws-ship-pr` after applying the approved installer, hybrid-runtime, handoff-size, and artifact-reference fixes.
- **Done**: Completed pre-ship verification, corrected remaining root-relative autoload repair coverage, regenerated integrity, and prepared the `develop` → `main` PR handoff with merge disabled.
- **Result**: `npm run test`, targeted regression tests, integrity, site, workflow, invariant, and harness gates passed; no high-confidence leak findings. Learning: retain an explicit caveat when optional leak-scan patterns are not observable.

### [2026-09-08 09:47] Agent: GPT-5.6 Luna
- **Prompt**: Run the live `fx-node-helper` benchmark for 0.4.4.
- **Done**: Completed the isolated lite workflow, collected the live report, promoted `0.4.4-fx-node-helper-live`, refreshed comparison reports, and compared it with the 0.3.61 live baseline.
- **Result**: Live run PASS at 81/100, up from 78; completeness, verification, and discrimination remained stable; wall time scored 10. Learning: N/A (standard benchmark run)

### [2026-09-08 09:30] Agent: GPT-5.6 Luna
- **Prompt**: Promote the 0.4.4 benchmark runs and generate `table-0.4.4.md`.
- **Done**: Snapshotted all 5 static 0.4.4 fixture runs into named baselines and regenerated the evolution and per-version reports.
- **Result**: Snapshot commands exit 0; comparison update exit 0; `table-0.4.4.md` reports 5 PASS / 0 FAIL. Learning: N/A (standard benchmark report update)

### [2026-09-08 09:26] Agent: GPT-5.6 Luna
- **Prompt**: Run new benchmarks to update results via `/ws-benchmarks`.
- **Done**: Completed static benchmark run `static-2026-09-08T132552461Z` across 5 fixtures and refreshed the evolution plus version-specific result reports.
- **Result**: Benchmark run exit 0; comparison update exit 0; 5/5 fixtures completed; 13 historical snapshots remain 13 PASS / 0 FAIL. Learning: N/A (standard benchmark run)

### [2026-09-08 08:10] Agent: GPT-5.6 Luna
- **Prompt**: Implement `0070-ws-shared-hybrid-config-layout`.
- **Done**: Split managed hub content into manifest-classified `runtime/` and `templates/` trees; aligned hybrid resolution, installer migration, integrity, configure-project reporting, docs, and regression coverage.
- **Result**: `npm test`, `npm run verify-integrity`, spec validation, and Phase 5a harness gates passed. Learning: flat hub path assumptions must be resolved through `hub-layout.json`; generated root autoload mirrors are not independent runtime sources.

### [2026-09-08 08:01] Agent: GPT-5.6 Luna
- **Prompt**: Define a clearer ws-shared layout and local/global configuration contract for hybrid installations.
- **Done**: Added and validated the `ws-shared-hybrid-config-layout` specification and context companion; tracked the spec in `index.PRD`.
- **Result**: Authoring validation passed with 17 acceptance criteria; implementation remains for a follow-up workflow. Learning: N/A (standard specification authoring)

### [2026-09-07 17:50] Agent: Cursor Grok 4.6
- **Prompt**: PR 289 review threads on configure_autoload externalSkills handling
- **Done**: Skip remaining Always-applied checks after companion warning; drop external ids in write_root_agents; poison tests for missing-skill suppression and root pointer
- **Result**: test-external-companion-skills + test-autoload-configure exit 0; Learning: Always-applied writers and checkers must both skip externalSkills


### [2026-09-07 17:45] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-to-pr issue 288 full auto — real vs check-harness noise; portable hub/harness fixes; ship
- **Done**: Declared `externalSkills` (ws-memo, ws-session-tracking); removed them from Always-applied; consumer CATALOG membership link; harness intentional-omission; installer bootstrap excludes foreign ids; regression tests; 0.4.3 bump
- **Result**: npm test exit 0; Phase 5a gates exit 0; integrity OK; Learning: N/A (standard implementation)

### [2026-09-07 17:30] Agent: opencode (dispatch-guard orphan-orch fix)
- **Prompt**: judge + code review latest commit vs previous diff, stepwise awaited dispatch → approved full 6-item plan → implement simplified, test, ship
- **Done**: workflow_state.cjs dispatch-6 requires defined score >= minVerifyScore (closes undefined-score orphan); step-4 guard unconditional except dag substep (fresh-state + dag role both correct); plan/index content checks (non-empty + valid JSON); fixPrPlan/fixPrExec internal-substep finish stays active; gates.md + STEP-DISPATCH.md await wording; 7 new contract asserts; 0.4.2 bump + integrity regen
- **Result**: contract, models-preset, min-verify-score, score-refine, enable-dag, artifact-economy, transition-gate, resume-gate, telemetry, update-state-yaml, quality-gates, research-quality, fix-pr-sweep, doc-sync, frontmatter, invariant scan green; Learning: dispatch guards belong at transition time (dispatch/pre-advance), not record time (finish)

### [2026-09-07 16:10] Agent: opencode (script first-run safety audit fixes)
- **Prompt**: audit spec-to-pr/lite scripts for first-time-run failures → approved → implement P0 + papercuts + doc alignment
- **Done**: .runtime allowlist accepts plan.index.json; update_state positional guard; validate catch rethrow fixed; --help usage in 7 scripts; STEP-DISPATCH/PROTOCOLS/state-hygiene/DIAGRAM point at telemetry.jsonl + .runtime index + dag-disabled skip; 6 suites + handoff check + integrity pass
- **Result**: uncommitted fix set (13 files + integrity); benchmark timestamp dirt left untouched

### [2026-09-07 15:30] Agent: opencode (judge fix for 0068)
- **Prompt**: review committed 0068 consolidation (cacc0408) → approved fix plan → execute workstreams 1-5
- **Done**: pruned dead run.json/RUN.md paths + renderRun + rebuildIndex runPath; aligned ARTIFACTS.md runtime/prereq/read-contract/never-staged/ownership; aligned lite SKILL telemetry + plan-index (handoff substring kept for pipeline check); added handoffs/acLedger to state schema with file-first fold-in; hardened telemetry legacy redirect regex; regen + verify integrity
- **Result**: test-workflow-state-contract, telemetry-observability, quality-gates, update-state-yaml, hybrid-consumer-root pass; check_pipeline_handoff OK (11 skills)

### [2026-09-06 12:10] Agent: Cursor
- **Prompt**: bump version, update website, ship release with OpenCode CI + new skills
- **Done**: Bumped package to `0.3.63`; switched agentic PR reviews to OpenCode on `pull_request`; shipped `ws-benchmarks` and `ws-spec-manager`; synced `docs/index.html`, `FEATURES.md`, skill frontmatter, dependency manifests, and `bin/skill-integrity.json`.
- **Result**: Release `0.3.63` prepared; PR #282.

### [2026-09-06 12:00] Agent: opencode (muse-spark)
- **Prompt**: fix issue #280 (standard workflow stalls after native transition gate Step 0 → Step 1); check all step transitions for manual/auto continuation; bump version and ship PR
- **Done**: Clarified the gate contract in `ws-shared/gates.md` (markdown fallback yields the turn; native modal `Next` dispatches Step N+1 in the same turn; stall named as bug), applied the same distinction to `ws-spec-to-pr` SKILL/STEP-DISPATCH/PROTOCOLS and `ws-spec-to-pr-lite`; added blanket all-gates continuation rule plus classifier/safety-valve auto-gate rows; added `test/test-transition-gate-continuation.js` regression test; bumped package to `0.3.62` with frontmatter/manifest/site sync.
- **Result**: Release `0.3.62` prepared; PR closes #280.

### [2026-09-05 02:35] Agent: ws-spec-multi worker (standard pipeline)
- **Prompt**: resume ws-spec-to-pr for skill-family-naming (steps 0-6 done) → re-verify → close → ship
- **Done**: Step 5 re-verified (ledger 10/10 after AC16 hash relink, npm test exit 0, verify-integrity exit 0); Step 6 clean (no fix); Step 7 PASS confirmed fresh; Step 8 closed with step-08 result + Timing; Phase A git cleanup done
- **Result**: status completed, shipStatus skipped (Recommended gates, not fullMode); no push, no PR; master owns convergence + merge; Learning: N/A (standard implementation)

### [2026-09-05 03:10] Agent: ws-spec-multi worker (standard pipeline)
- **Prompt**: run ws-spec-to-pr end-to-end for 0035-hermes-spec-to-pr-enhancements (resume prior partial run)
- **Done**: E1 D1 clause in STEP-DISPATCH Step 4 row + integrity regen (commit b11664e7); E2 AC1-AC6 re-verified, no regressions; verify 10/10; review round 1 clean (fable VERIFIED); testing pass; implementation closed
- **Result**: status completed, shipStatus pending; PR creation next via ws-ship-pr (workflowMode, stopBeforeFixPr); no merge

### [2026-09-04 14:55] Agent: Cursor Grok 4.6
- **Prompt**: implement 0063-ws-megabrain, bump, ship
- **Done**: Spec aligned to companion-load + autoload; skill + specialists; workflows deps; Always-applied; catalog/README/FEATURES
- **Result**: Ready for 0.3.61 bump, integrity, tests, PR

### [2026-09-04 14:50] Agent: Cursor Grok 4.6
- **Prompt**: copy fable-method loop into ws-megabrain; no external skill deps
- **Done**: Steps Analyze/Act/Verify/Report in SKILL.md; specialists no longer hand off to other `ws-*`; deps `[]`; spec AC20
- **Result**: Megabrain executes the chosen slice itself after the gate

### [2026-09-04 14:45] Agent: Cursor Grok 4.6
- **Prompt**: add reverse engineering specialist to ws-megabrain
- **Done**: `references/REVERSE.md` (in-tree archaeology); SKILL.md domain row `reverse`; spec AC19
- **Result**: Kind `reverse` loads after the gate; third-party product raids stay out of scope

### [2026-09-04 14:40] Agent: Cursor Grok 4.6
- **Prompt**: `/ws-spec-write` `/ws-write-a-skill` ws-megabrain plus specialist domain personas (DEVELOPMENT, DDD, …)
- **Done**: Router `ws-megabrain/SKILL.md`; five `references/*.md` specialists; spec `0063-ws-megabrain.spec.md` (18 ACs, authoring PASS); registered in workflows deps + catalogs
- **Result**: Invoke `/ws-megabrain` → scan/gate → Read ≤2 specialists → one downstream skill

### [2026-09-03 23:10] Agent: Cursor Grok 4.6
- **Prompt**: bump, commit, push, goal loop fix-pr
- **Done**: Bumped 0.3.60; Fix-PR round 1 for PR 276 aligned skipQualityGates omit of `--pre-advance 4`, required completed Step 1, added missing-refined and skip-step-1 tests
- **Result**: PR 276 green (review + tests), `activeThreads: []`, mergeable; not merged (Fix-PR does not merge)

### [2026-09-03 22:50] Agent: Cursor Grok 4.6
- **Prompt**: `/ws-spec-to-pr .agents/specs/0062-us-275.spec.md full auto ws-ship`
- **Done**: Planned Steps 0–3 then fail-closed `--pre-advance 4`; implemented autoMode ≠ skip-planning docs + `validateSnapshot` HS-5; verify 10/10; G2-code `cd95e7f7`; review clean; tests green
- **Result**: Implementation ready for close + PR develop→main for GitHub issue 275

### [2026-09-03 13:42] Agent: Composer 2.5
- **Prompt**: Step 8 close + ship for us-272 (retired skill-id migration on installer update + hybrid harness fallback)
- **Done**: Wrote step-08 delivery result (Timing 38m 16s, +327/-14); G2-delivery commit `64465777` (refined plan only); MEMORY trap `2026-09-03-npm-pack-json-envelope.md` + compile; shipped develop→main PR with issue #272 close-loop comment
- **Result**: Implementation closed, shipStatus pending; Step 9 owns fix-pr convergence (no merge)

### [2026-09-03 09:15] Agent: Cursor Grok 4.6
- **Prompt**: Fix `{plansDir}/index.json` so `updatedAt` changes only for the workflow being updated, not every `workflows[]` row
- **Done**: `rebuildIndex` now derives each row `updatedAt` from that workflow's state activity; `updatePlansIndex` already upserted one `workflowId`; contract test covers sibling preservation plus rebuild
- **Result**: Idle workflows keep their last activity time; catalog `generatedAt` remains rebuild time

### [2026-09-03 08:59] Agent: Cursor Grok 4.6
- **Prompt**: Persist and consume spec prefix naming from config; check ws-spec-organizer
- **Done**: Seeded `plans.enforceSpecPrefixOrdering: true` in project config; ws-spec-write/organizer/AGENTS.md now persist that exact key when absent; renamed spec to `0060-provider-fetch-visual-attachments.spec.md`
- **Result**: Resolver reports prefixed path with `enforceSpecPrefixOrdering: true`; no second key name

### [2026-09-03 08:53] Agent: Cursor Grok 4.6
- **Prompt**: /ws-spec-write improve providers (ado, gh) to download embedded images and attachments during fetch, with SCM parity
- **Done**: Authored `.agents/specs/provider-fetch-visual-attachments.spec.md` + companion context; authoring validate PASS (28 ACs); tracked on `index.PRD`
- **Result**: Spec of record ready; `fetch-to-spec` extension (no new intent); GitHub and Azure DevOps must ship together

### [2026-09-03 06:20] Agent: Antigravity
- **Prompt**: bump version and prepare to ws-ship-pr
- **Done**: Bumped package to `0.3.57`; synchronized version across all 50 SKILL.md frontmatters, test/package.json, AGENTS.md, docs/index.html, and dependency manifests; clarified normal mode vs autoMode for modal choice tool and single-turn interactive cadence; regenerated integrity manifest (v0.3.57).
- **Result**: Release `0.3.57` prepared and verified with 100% test integrity.

### [2026-09-03 06:05] Agent: Antigravity
- **Prompt**: mark as completed (sync index.PRD for 0056-host-agent-environment-adapter)
- **Done**: Marked 0056 `host-agent-environment-adapter` as completed in `index.PRD` Feature map and Next-specs table; appended entry to Done log referencing PR #266.
- **Result**: Spec index and roadmap synchronized with shipped PR #266.

### [2026-09-03 05:45] Agent: Composer
- **Prompt**: Integrity consumer tree mismatch — ws-preview/scripts/run_dry_run.sh (extra)
- **Done**: Install/update now prunes dest-only managed skill files after overlay copy; tests cover generic extras + retired run_dry_run.sh leftover
- **Result**: Update no longer fails integrity when upstream removed a packaged file; consumer-owned skill-local config.json still preserved


### [2026-09-03 05:31] Agent: Composer
- **Prompt**: Ship/goal-fix-pr — OpenCode code-review failed
- **Done**: Root cause CreditsError (OpenCode Go insufficient balance); switched active PR reviewer to Cursor; OpenCode → workflow_dispatch; hardened Cursor with --pr-id + GraphQL thread gate; CATALOG updated
- **Result**: Pipeline unblocked pending Cursor review green on PR 266





### [2026-09-03 05:07] Agent: Composer
- **Prompt**: Make ws-preview not tied to any specific code reviewer; use configured dry-run command locally
- **Done**: Rewrote `ws-preview` to resolve `preview.dryRunCommand` from project config and run it in-repo; removed cursor-reviewer wrapper script; updated schema/example, catalogs, FEATURES, README, evals, integrity, site
- **Result**: Tool-agnostic local dry-run skill; missing command fails closed


### [2026-09-03 04:36] Agent: Muse Spark
- **Prompt**: Senior review of 0037 skill-family-naming spec vs develop...main + fix stale skill references (report approved before execute)
- **Done**: Extended `retired_artifacts.cjs` with 10 renamed 0.3.56 dirs + stale patterns (incl. generic `ws-*-spec` family-violation gate); hardened `ws-check-harness` PHASES fail-closed wording; covered installer `update` prune in `test-install.js` Phase 9b and `test-consumer-migration.js`; annotated FEATURES history, RESEARCH, SKILL_AUTHORING deferred row, AGENTS snapshot 0.3.56, banner-spect examples; regenerated integrity; consumer-migration/provider-parity/doc-sync/frontmatter/doctor/quality-gates/check_workflows/test-install green.
- **Result**: AC13 prune + AC10 generic gate now enforced and tested; tree has 10 intended modified files, 0 live stale refs outside exempt history/test fixtures.

### [2026-09-03 04:18] Agent: Antigravity
- **Prompt**: bump version and commit work
- **Done**: Bumped 0.3.55→0.3.56; migrated skill family naming to `ws-{family}-{verb}` across 10 skills (spec, spec-provider, plan); updated dependency manifests, router/harness docs, fail-closed gates, test fixtures, integrity manifest, and website catalog; all 40+ test suites green.
- **Result**: Release 0.3.56 verified and committed on develop.

### [2026-09-02 15:27] Agent: Cursor Composer
- **Prompt**: /ws-ship-pr (develop → main)
- **Done**: Prepared board green; opened PR 265; 0 threads; checks green; merged
- **Result**: https://github.com/jpolvora/workflow-skills/pull/265 MERGED

### [2026-09-02 09:46] Agent: Cursor Composer
- **Prompt**: bump version, update docs, commit, push, ws-ship-pr + ws-goal-fix-pr
- **Done**: Released 0.3.55; PR 264 merged after catalog/bootstrap/check handoff fixes + integrity; activeThreads 0
- **Result**: https://github.com/jpolvora/workflow-skills/pull/264 MERGED

### [2026-09-02 09:33] Agent: Cursor Composer
- **Prompt**: Check leftover GH issues / state; close or implement the remaining open issue
- **Done**: Reproduced `ws-doctor` for #259; packaged skills report `none`; closed #259 (ws-memo global FEATURES path is spec-memo, not this package)
- **Result**: Zero open issues on workflow-skills

### [2026-09-02 09:30] Agent: Cursor Composer
- **Prompt**: bump version, update docs, commit, push, ws-ship-pr + ws-goal-fix-pr
- **Done**: Bumped 0.3.54→0.3.55; bridge/session-tracking docs; integrity + site; prepare verify green
- **Result**: Releasing via ship-pr develop→main

### [2026-09-02 09:25] Agent: Cursor Composer
- **Prompt**: Verificar integração com ws-session-tracking
- **Done**: Mapped `/ws-session-tracking` vs `/ws-memo` vs `ws-activity-report`; preflight warns on missing session-tracking; routers/INTEGRATION/evals updated
- **Result**: `test-spec-memo-scripts` ok; both runtime skills detected in global install

### [2026-09-02 09:10] Agent: Cursor Composer
- **Prompt**: Check /ws-memo and update /ws-spec-memo bridge so skills stay non-overlapping
- **Done**: Product-role tables + seamless path in `ws-spec-memo`; INTEGRATION ownership/`memo setup` split; fixed configure-project session handoff to `/ws-memo` bootstrap; aligned AGENTS/tools/FEATURES/CATALOG/evals
- **Result**: Bridge owns config/backends only; runtime stays on `/ws-memo`

### [2026-09-02 09:06] Agent: Cursor Grok 4.6
- **Prompt**: Step 9 ws-goal-fix-pr for PR 263 (ws-doctor-json-esm)
- **Done**: Polled after 30s; 0 active threads; waited for review check then re-polled green; merged via provider merge-pr (no Act round)
- **Result**: PR 263 MERGED; activeThreads 0; checks green; no product edits

### [2026-09-02 08:59] Agent: Cursor Grok 4.6
- **Prompt**: Auto full Spec-to-PR close for ws-doctor-json-esm (Step 7 pass → Step 8)
- **Done**: Testing green + sabotage passed; wrote delivery result (Timing 44m 22s); G2-delivery refined plan; index sync
- **Result**: Implementation closed (`status: completed`, `shipStatus: pending`) before PR

### [2026-09-02 08:53] Agent: Cursor Grok 4.6
- **Prompt**: Auto full Spec-to-PR for ws-doctor-json-esm (Step 6 review-fix)
- **Done**: Closed CR-001 by restoring out-of-slug spec-memo bodies from `e1a0ac7f`; kept 0.3.54 stamps and doctor product; recorded G2-code `files_touched` trap
- **Result**: Round 2 review clean; `fix(ws-doctor-json-esm): code-review fixes`

### [2026-09-02 08:05] Agent: Cursor Grok 4.6
- **Prompt**: Check /ws-memo and update /ws-spec-memo integration/bridge so the skills do not overlap
- **Done**: Rewrote `ws-spec-memo` as harness setup/bridge; moved vault protocol and changelog append to `/ws-memo`; added lifecycle translation map
- **Result**: Targeted tests + integrity + site check passed; dual-mode trap recorded

### [2026-09-02 08:15] Agent: Cursor Grok 4.6
- **Prompt**: /ws-write-spec from open GitHub issues; validate each; skip invalid; include ACs, failing tests, surgical review-proof fixes
- **Done**: Wrote `.agents/specs/ws-doctor-json-esm.spec.md` (+ context); included #260 and amended #261; skipped #259 and #262; authoring PASS; tracked `index.PRD`
- **Result**: Spec of record ready; not registered to a plan folder

### [2026-08-31 16:25] Agent: Cursor Composer
- **Prompt**: bump, commit, push, /ws-ship-pr
- **Done**: Bumped package to `0.3.53`; synced skill frontmatters / packageVersion / integrity / site; shipping Timing-vs-benchmark isolation
- **Result**: Release `0.3.53` prepared for PR

### [2026-08-31 16:20] Agent: Cursor Grok 4.6
- **Prompt**: Remove any call that could start harness benchmarks during consumer spec-to-pr delivery; keep step elapsed times for reporting only
- **Done**: Renamed Step 8 Benchmark to Timing; forbade ws-run-benchmark / npm run benchmark / harness-benchmark from orch, lite, and ws-testing; hardened Extra skill as explicit package-root only; added regression test
- **Result**: tests:harness-efficiency exit 0; integrity OK; site catalog current


### [2026-08-30 00:15] Agent: Cursor Grok 4.6
- **Prompt**: bump, verify, review, docs, commit, push, /ws-ship-pr
- **Done**: Persist `shipStatus` on close finish; cleanup skips pending-ship plan roots; spec `0053`; version 0.3.52
- **Result**: `npm run test` exit 0; integrity OK

### [2026-08-29 23:58] Agent: Cursor Composer
- **Prompt**: Complete implementation before opening the PR — close workflow (artifacts, MEMORY, changelog, status completed) before ship
- **Done**: Split Step 8 / lite 4 into close-then-ship gates; added `shipStatus`; decoupled Phase A from `status: completed`; `ws-ship-pr` workflow mode push/PR only; updated resume/boards/multi-spec already-implemented; v0.3.51 + integrity
- **Result**: Harness tests pass; implementation complete is no longer tied to PR merge

### [2026-08-28 18:28] Agent: Cursor Grok 4.6
- **Prompt**: ws-goal-fix-pr PR 256 round 2
- **Done**: Aligned ORCH.md with Step 5 and prepare baseline; added defaults.hostAdapter to schema and example
- **Result**: Three new review threads from CI after round 1

### [2026-08-28 18:10] Agent: Cursor Grok 4.6
- **Prompt**: ws-goal-fix-pr Step 9 on PR 256
- **Done**: Fixed live benchmark collect/sensor/compare/oracle defects; fail-closed dual spec paths; dispatch spec pointer uses resolve_spec_path
- **Result**: Round 1 code fixes for 15 scored threads; 3 host-adapter threads closed without rewrite

### [2026-08-28 14:38] Agent: Antigravity AI (Gemini 3.7 Flash)
- **Prompt**: bump again, commit and push, then start next shipping version - get next spec to implement (/ws-spec-to-pr)
- **Done**: Bumped package to `0.3.50`; synchronized version across all 49 SKILL.md frontmatters, test/package.json, AGENTS.md, FEATURES.md, and docs/index.html; updated index.PRD with completed harness-spec-benchmark (0041); regenerated integrity checksums.
- **Result**: Release `0.3.50` prepared, verified, and committed.

### [2026-08-28 14:25] Agent: Antigravity AI (Gemini 3.7 Flash)
- **Prompt**: bump version, update website, features, catalog, readme, agents, dependencies, checksum, then commit everything
- **Done**: Bumped package to `0.3.49`; added host detection matrix & subagent dispatch adapter (`host-dispatch.md`) supporting Antigravity IDE, Cursor, OpenCode, Claude Code, and Codex; integrated sparse Context Pointers protocol (Matt Pocock pattern / Issue #998); added `defaults.hostAdapter` configuration; added `ws-run-benchmark` skill & live test suites; regenerated skill integrity checksums; rebuilt site catalog.
- **Result**: Release `0.3.49` prepared and verified with 100% test integrity.

- **Prompt**: Create skill run-benchmark to automate prepare → orch → collect → snapshot
- **Done**: Extra skill `ws-run-benchmark` with `context.cjs`, orch dispatch notes, Extra package registration, tests
- **Result**: `/ws-run-benchmark --fixture fx-node-helper` runs live flow from the package root


### [2026-08-28 08:40] Agent: Cursor Grok 4.6
- **Prompt**: Create a mid-to-high use case as the frozen benchmark corpus; record scores per version; compare versions in a table
- **Done**: Added `fx-config-merge` (10 ACs, standard orch) plus `table` CLI; live collect now records `wallSec`
- **Result**: Same fixture, new package version → snapshot → `table --fixture fx-config-merge --mode live`


### [2026-08-28 02:20] Agent: Composer
- **Prompt**: `/ws-goal-fix-pr` PR 255 round 1
- **Done**: Empty cursor/default steps 2–5 for lite fallthrough; retarget autoload/CATALOG runtime keywords to `ws-memo`; MEMORY trap
- **Result**: Pending resolve-thread + re-check


### [2026-08-28 02:05] Agent: Composer
- **Prompt**: Fix GH #252/#253, bump version, commit, push, ship-pr, goal-fix-pr
- **Done**: Seed `modelsPreset: cursor` with full `default`+`cursor` step maps; `ws-spec-memo` invocation `spec-memo-setup` + MCP template key `spec-memo`; package 0.3.48
- **Result**: PR https://github.com/jpolvora/workflow-skills/pull/255 merged; goal-fix-pr converged (0 active threads)


### [2026-08-28 01:50] Agent: Cursor Grok 4.6
- **Prompt**: `/spec-to-pr` spec-dor-tdd-refinement-hardening with `set mode auto full ws-ship-pr ws-goal-fix-pr`
- **Done**: Standard orch 0–9 on `develop`; start-anchored ledger ingest + V9/V10 tests; shipped and merged PR #254; goal-fix-pr resolved prefix-aware `register_local_spec.cjs` plus archive/classifier regression tests
- **Result**: PR https://github.com/jpolvora/workflow-skills/pull/254 merged; ledger score 9/10; `npm run test` exit 0


### [2026-08-28 01:48] Agent: Cursor Grok 4.6
- **Prompt**: bump version, commit, push
- **Done**: Patch bump 0.3.46 → 0.3.47 via `build-site:bump`; FEATURES/AGENTS/test package stamp; integrity regen
- **Result**: `verify-integrity` + `test-doc-sync` + `test-skill-frontmatter` exit 0


### [2026-08-28 01:40] Agent: Cursor Grok 4.6
- **Prompt**: Docs refresh: shipped 0.3.46 features, honest roadmap, LLM-agnostic hero/CTAs
- **Done**: Reconciled index.PRD shipped rows; FEATURES DoR/TDD/specMemo + Roadmap; README/AGENTS fact-align; site hero From Spec to Delivery with dual CTAs; test-doc-sync headings
- **Result**: `node test/test-doc-sync.js` and `node bin/build-site.js --check` exit 0; integrity v0.3.46


### [2026-08-28 00:35] Agent: Cursor Grok 4.6
- **Prompt**: `/ws-write-spec` optional spec filename prefixes + ws-spec-organizer
- **Done**: Authored `spec-prefix-ordering.spec.md` + context companion; authoring validate PASS (22 ACs)
- **Result**: Spec of record at `.agents/specs/spec-prefix-ordering.spec.md`; not registered to a plan dir


### [2026-08-28 00:25] Agent: Cursor Grok 4.6
- **Prompt**: Prefix `.agents/specs` board specs with four-digit chronological order
- **Done**: Renamed 52 `*.spec.md` (plus 4 `.context.md`) to `NNNN-{name}`; updated `index.PRD`; slug lookup accepts prefixed filenames
- **Result**: `tests:harness-efficiency` exit 0; integrity v0.3.46


### [2026-08-27 13:16] Agent: Cursor Grok 4.6
- **Prompt**: `/ws-goal-fix-pr` PR 251 round 3
- **Done**: Qualify implement-tasks negative-scenario linking for standard vs lite; lite Step 2 requires ledger links
- **Result**: test-spec-dor-tdd exit 0


### [2026-08-27 13:05] Agent: Cursor Grok 4.6
- **Prompt**: `/ws-goal-fix-pr` PR 251 round 2
- **Done**: Authoring validate_spec requires ### Negative & Failing Test Scenarios with a non-placeholder bullet; FORMAT.md matches
- **Result**: test-validate-spec / test-spec-validation / test-spec-dor-tdd exit 0


### [2026-08-27 12:55] Agent: Cursor Grok 4.6
- **Prompt**: `/ws-goal-fix-pr` open develop→main PR (251)
- **Done**: STALE_LIVE_REFERENCE_PATTERNS parity for newly retired keys/templates; ac_ledger fail-closes uncovered Negative & Failing Test Scenarios
- **Result**: `npm test` exit 0; integrity v0.3.46; six review threads queued for resolve after push


### [2026-08-27 11:50] Agent: Cursor Grok 4.6
- **Prompt**: `/ws-fable-method` implement spec-dor-tdd-refinement-hardening.spec.md; bump version and commit
- **Done**: Authoring-mode DoR + Validation Notes; write-spec/interview/implement-tasks/verify-plan TDD protocol; tests wired; package 0.3.46
- **Result**: `npm test` exit 0; authoring validate PASS (9 ACs); integrity v0.3.46

### [2026-08-27 11:12] Agent: Gemini 3.7 Flash
- **Prompt**: `/ws-spec-to-pr-lite` https://github.com/jpolvora/workflow-skills/issues/250
- **Done**: Added `backend.md.template` and `frontend.md.template` to `RETIRED_HUB_FILES`, added `patterns` and `_comment_patterns` to `RETIRED_DEFAULTS_KEYS`/`RETIRED_DEFAULTS_COMMENT_KEYS` in `retired_artifacts.cjs`, synced `ws-doctor` fallback, updated `backend.md`/`frontend.md` to point at `STACK.md`, updated tests, created PR #251, commented on issue #250.
- **Result**: PR #251 opened against `main`; full test suite green.

### [2026-08-27 03:45] Agent: Cursor Grok 4.6
- **Prompt**: `/ws-fable-method` implement research-driven-pipeline-quality.spec.md W1–W7
- **Done**: JSON-primary `{workflow-id}.state.json`, `handoff/step-{NN}.json`, providerCompat/contextHygiene/reviewJury, memory sanitizer, pipeline handoff check, hub `schemas/` whitelist, package 0.3.45
- **Result**: `npm run test` green; `check_pipeline_handoff` OK; integrity v0.3.45

### [2026-08-27 03:23] Agent: Cursor Grok 4.6
- **Prompt**: `/ws-write-spec` from RESEARCH.md for spec-to-pr-* pack integration and production quality
- **Done**: Authored `research-driven-pipeline-quality.spec.md` + context companion; authoring validate PASS (31 ACs); tracked on `index.PRD`
- **Result**: Spec of record at `.agents/specs/research-driven-pipeline-quality.spec.md`; not registered to a plan dir

### [2026-08-27 03:10] Agent: Cursor Grok 4.6
- **Prompt**: `/ws-goal-fix-pr` PR 248 — reject filler-only resolve-thread comments
- **Done**: GitHub and Azure substance gates require a 4+ letter token with two distinct letters; parity tests reject forty `x`; INTENTS + SCM contract updated
- **Result**: `node test/test-provider-parity.js` green


### [2026-08-27 00:50] Agent: Cursor Grok 4.6
- **Prompt**: Fix-PR thread close must include what was done for the correction, not only model + Corrigido em <hash>; apply on ADO and GitHub
- **Done**: Both `resolve-thread` implementations reject hash-only bodies; skill/INTENTS/contract require files+behavior in the comment; parity tests cover GH and Azure
- **Result**: `node test/test-provider-parity.js` and `node test/test-fix-pr-proactive-class-sweep.js` green


### [2026-08-26 23:36] Agent: Composer
- **Prompt**: `/ws-goal-fix-pr` 246 round 5 — leftover threads after CI
- **Done**: Resolve already-fixed mode-matrix thread; add AC14 lifecycle-hook assertions (self-learning upsert, tools.md upsert/append, AGENTS aliases)
- **Result**: `node test/test-configurable-memory-backends.js` and `npm run test` green

### [2026-08-26 23:24] Agent: Composer
- **Prompt**: Ensure plan/implement/fix-pr memory consult includes spec-memo vault when enabled
- **Done**: Route Pre-work / COOPERATIVE_FIX / write-plan / implement-tasks / tools.md Rules / AGENTS dogfood through `read-memory`/`update-memory`; `sourcesConsulted` gains `memory-files` + `spec-memo`; evals + proactive tests updated
- **Result**: Enabled backends are peer evidence with code/docs; per-backend consult-skipped is non-fatal

### [2026-08-26 23:23] Agent: Composer
- **Prompt**: `/ws-goal-fix-pr` PR 246 — deepen mode→flag routing before CI
- **Done**: `resolveMemoryRouting` derives both flags from full `specMemo.mode` matrix when booleans absent; matrix + override tests; INTEGRATION.md / config.example notes; MEMORY trap; integrity regen
- **Result**: Adversarial matrix + full `npm run test` green; prevents next-round miss on vault/hybrid-alone incomplete configs

### [2026-08-27 03:12 UTC] Agent: Composer
- **Prompt**: `/ws-self-learning` — trap for dual Node/Python scripts
- **Done**: Added `memory/2026-08-26-avoid-dual-node-python-scripts.md`; compiled MEMORY; vault upsert
- **Result**: High-severity trap: one runtime per job; Node for new packaged scripts; evolve pre-existing in place

### [2026-08-27 03:10 UTC] Agent: Composer
- **Prompt**: `/ws-goal-fix-pr` PR 246 round 4 — schema modes + drop Python memory-routing mirror
- **Done**: Expand `specMemo.mode` schema enum to local/disabled; remove unused Python `resolve_memory_routing` (Node SoT only); integrity regen
- **Result**: No dual-runtime parity tests; memory routing stays in `resolve_consumer_root.cjs`

### [2026-08-27 02:56 UTC] Agent: Composer
- **Prompt**: `/ws-goal-fix-pr` PR 246 round 3 (legacy enable, dual coverage, persisted modes)
- **Done**: Legacy `--enabled true` honors `prev.mode`; persist `local`/`disabled` when vault off; State 3 dual-mode test; integrity regen
- **Result**: Local memory-backend + full `npm run test` green; ready to push/resolve

### [2026-08-27 02:48 UTC] Agent: Composer
- **Prompt**: `/ws-goal-fix-pr` PR 246 round 2 (CI vault-only JSON crash + disable restore guard)
- **Done**: Gate disable→local restore on vaultWasActive; stub CLI for vault-only tests; idempotent disable-on-disabled; integrity regen
- **Result**: Local memory-backend + full `npm run test` green; ready to push/resolve

### [2026-08-27 02:35 UTC] Agent: Composer
- **Prompt**: `/ws-goal-fix-pr` PR 246 live
- **Done**: Restored local memory on vault disable; strengthened tools.md knowledge-alias tests; integrity regen; MEMORY traps + round-1 report
- **Result**: Round 1 fixes ready to commit/resolve/push on PR 246

### [2026-08-26 18:40 UTC] Agent: Cursor Grok 4.6
- **Prompt**: Fix CI integrity failure; commit; bump; ship `/ws-ship-pr` next version
- **Done**: Regenerated `bin/skill-integrity.json` after hashed hub `setup.md` drift; `npm run build-site:bump` 0.3.40 → 0.3.41; FEATURES/test-doc-sync/AGENTS stamp aligned; isolated spec-memo missing-ws-memo fixture from global skills
- **Result**: Package stamped 0.3.41; integrity `--check` must exit 0 before PR

### [2026-08-26 18:10 UTC] Agent: Composer
- **Prompt**: Convert LLM Workflow Best Practices Research download to root `RESEARCH.md`
- **Done**: Added structured `RESEARCH.md` at repo root from Downloads source; corrected stale path names; mapped proposals to current `ws-*` layout and `SKILL_AUTHORING.md`
- **Result**: Research backlog doc ready for future skill/harness improvement specs

### [2026-08-26 18:07 UTC] Agent: Composer
- **Prompt**: `/ws-check-harness` — apply approved correction plan
- **Done**: Fixed broken FAQ links in `ws-shared/setup.md` (`../../ws-spec-to-pr/...` → `../ws-spec-to-pr/...`); bumped upstream dogfood session-contract stamp in `AGENTS.md` to **0.3.40**
- **Result**: Harness OK post-correction; Phase 2 revalidation pass on touched files

### [2026-08-26 16:50 UTC] Agent: Composer
- **Prompt**: Confirm workflow-skills vault git url as projectId; ingest memory; clean up; commit
- **Done**: Bound `projectId` `github.com-jpolvora-workflow-skills` (origin `github.com/jpolvora/workflow-skills`); imported 59 traps to local + MCP vaults; reset `MEMORY.md` to template; removed `memory/*.md` (kept `.gitkeep`); left `.agents/plans` in place (doctor `--fix` would wipe plan dirs)
- **Result**: Vault SoT for traps; in-repo memory residue cleared for commit

### [2026-08-26 16:35 UTC] Agent: Composer
- **Prompt**: Add AGENTS.md references for spec-memo MCP server and hooks (from prior ws-memo install session)
- **Done**: Root `AGENTS.md` §5 dogfood subsection (MCP tools, `ws-memo` runtime, `ws-spec-memo` setup, `memo hook install`); pipeline row + progressive-disclosure + task-router pointers
- **Result**: Agents in this repo can route vault/MCP/hook work without vendoring SURFACE.md

### [2026-08-26 15:28 UTC] Agent: Composer
- **Prompt**: install ws-memo skill into global skills root from spec-memo repo
- **Done**: Copied `.agents/skills/ws-memo/` from local `spec-memo` (develop@d224e9a) into `$HOME/.agents/skills/ws-memo`
- **Result**: Global skill present (SKILL.md + references + evals); matches source tree

### [2026-08-26 11:25] Agent: Composer
- **Prompt**: Configure agentic-code-reviewers to cursor engine + composer 2.5; disable OpenCode engine on GitHub only
- **Done**: Confirmed cursor-code-review.yml already uses `--engine cursor-sdk` / `--model composer-2.5` on PRs; disabled GitHub workflow "Agentic Code Review (OpenCode)" via `gh workflow disable` (yml kept as workflow_dispatch backup)
- **Result**: Active PR reviewer is Cursor only; OpenCode workflow no longer listed as active on GitHub

### [2026-08-26 01:38] Agent: Composer (cursor preset)
- **Prompt**: `/ws-spec-to-pr` issue #243 full auto with cursor preset models
- **Done**: ws-spec-memo → ws-memo runtime handoff (INTEGRATION, SKILL, check warnings, tools.md, eval); PR #244; CI green; goal-fix-pr converged (0 threads)
- **Result**: https://github.com/jpolvora/workflow-skills/pull/244

### [2026-08-25 20:24] Agent: Composer
- **Prompt**: `/ws-goal-fix-pr` on PR #242 (ws-spec-memo)
- **Done**: 10 fix rounds (45 threads total) through `e9c8d8de`; resolve_consumer_root, health gates, `{specMemo.cli}` aliases, configure edge cases; MEMORY trap compiled
- **Result**: Converged — `activeThreads: 0`, review + test green; PR https://github.com/jpolvora/workflow-skills/pull/242 merge-ready (not merged)

### [2026-08-25 13:15] Agent: Composer
- **Prompt**: Follow-up after Fix-PR implement subagent; clear remaining PR #241 review threads
- **Done**: Aligned COOPERATIVE_FIX IDE order with plan→exec; PROTOCOLS Reach-10; gates Fix-PR batch roles; min-verify asserts; classify `applyScoreAnalysis` uses `minVerifyScore`; pushed `2f1df635` + `6d53eee2`; resolved threads (`activeThreads: 0`)
- **Result**: PR #241 MERGEABLE; test + review green; zero open review threads

### [2026-08-25 13:42] Agent: Composer
- **Prompt**: Surgical restore of LLM model footer on fix-pr thread close comments (Azure + GitHub)
- **Done**: GitHub `resolve_thread.cjs` `--model` + `---\nLLM model: {id}`; Azure already appended; ws-fix-pr + INTENTS instruct pass `--model`; parity tests
- **Result**: Closing resolve comments sign with the session model id when `--model` is passed

### [2026-08-25 12:38] Agent: Composer
- **Prompt**: Add to index.PRD (Recommended) for fix-pr-batch-plan-exec
- **Done**: `ws-spec-index track fix-pr-batch-plan-exec` — Feature map `[ ]` + Next-specs row 52
- **Result**: tracked in `.agents/specs/index.PRD`

### [2026-08-25 12:17] Agent: Cursor Grok 4.6
- **Prompt**: Parametrize min AC/task verify score via config.json; default ≥ 9; offer 10 when low effort
- **Done**: `defaults.minVerifyScore` (1–10, omitted → 9) drives scoreAndRefine, pre-advance 6, and merge_verify_review; Reach-10 user-gate after verify
- **Result**: Advance bar is project-configurable; ledger formula unchanged

### [2026-08-25 11:55] Agent: Composer
- **Prompt**: Improve fix-pr with plan (reviewer model) then execute (fix model) per batch; check if already implemented else spec/plan register
- **Done**: Confirmed not implemented; authored `fix-pr-batch-plan-exec` spec + context + plan; authoring validate PASS; registered to `{plansDir}`
- **Result**: `.agents/specs/fix-pr-batch-plan-exec.spec.md` → `.agents/plans/fix-pr-batch-plan-exec/` (13 ACs)

### [2026-08-25 10:21] Agent: Composer
- **Prompt**: `/ws-ship-pr` + `/ws-goal-fix-pr` for develop→main
- **Done**: Prepare board green; pushed develop; opened PR #240; converged (0 threads, CI+review green); merged
- **Result**: https://github.com/jpolvora/workflow-skills/pull/240 MERGED (`c4237294`)

### [2026-08-27 04:00] Agent: Cursor
- **Prompt**: Fix #247 stale session-lease artifacts after 0.3.38 removal; scan other retired references
- **Done**: Added `retired_artifacts.cjs` + install/update prune for session-lease schema, retired config keys, and `ws-patterns*` / `ws-audit` folders; `ws-doctor` stale-artifact warnings; harness forbidden-id scan; index/spec retired markers; README note; test-consumer-migration
- **Result**: Consumer `update` prunes leftovers that caused `session_lease.cjs` MODULE_NOT_FOUND; live skill bodies remain clean

### [2026-08-25 10:15] Agent: Cursor Grok 4.6
- **Prompt**: Read todo.txt, create an interpreted plan, and implement
- **Done**: Removed `ws-patterns` and session leases/git.lock from skills, orch, config, installer, tests, and docs; confirmed `ws-audit` already gone; bumped 0.3.38
- **Result**: Workflows package is 41 skills; orch consults MEMORY only; parallel-run locking is not a skill responsibility

### [2026-08-25 08:50] Agent: Cursor Grok 4.6
- **Prompt**: Commit current work then implement waves A+B+C (freeze Python twins, retry/UTF-8, prune protocol redundancy)
- **Done**: `update_state.py` / register / detect_specs_dir exec Node SoT; nested `telemetry.loc` parse; `telemetry.steps` dual-write; `--pre-advance` requires N; HTTP retry + utf8_stdio; PROTOCOLS points at state-hygiene cheat sheet
- **Result**: Tests use `dispatch`/`finish`/`bypass` against temp consumers; loc and dual-write gates pass; lite pre-advance 5 fail-assert is before stamp

### [2026-08-25 08:35] Agent: Cursor Grok 4.6
- **Prompt**: Root AGENTS.md does not need a 40000 B cap; it is upstream/dev only and is not shipped to consumers
- **Done**: Dropped `utf8Size('AGENTS.md') <= 40000` from `test-context-budget.js`; AC1 no longer byte-caps the root hub; kept 14000 B shared hub + 24000 B CATALOG
- **Result**: Root session-contract growth is not a CI failure; consumer always-applied budget is unchanged

### [2026-08-24 18:55] Agent: Cursor Grok 4.6
- **Prompt**: Add mandatory source-anonymization for bug/issue fixes in AGENTS.md
- **Done**: Root and shared hub AGENTS.md plus README/FEATURES: generic wording for reports, commits, specs, and new tracker issues
- **Result**: Agents must not cite private consumer projects when closing a fix

### [2026-08-24 18:50] Agent: Cursor Grok 4.6
- **Prompt**: Fix Azure DevOps provider `az repos pr policy list` call that passed `--project`
- **Done**: `check-pr-status` in `ws-azure-devops-provider/INTENTS.md` drops `--project` (CLI rejects it; PR ids are org-unique)
- **Result**: Agents no longer copy the create-PR project flag onto policy list

### [2026-08-24 01:20] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr (PR 239 rebuild-index revision)
- **Done**: `rebuild-index` stamps max state revision; validate checks row hash only; contract uses `revision: 5`
- **Result**: Resume after rebuild works for in-flight states past Step 0

### [2026-08-24 01:15] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr (PR 239 partial plans index discovery)
- **Done**: setup.md + FAQ: `rebuild-index` on incomplete resume lists; contract test rebuilds a missing row
- **Result**: Orphaned `*.state.md` files can re-enter the index before validate

### [2026-08-24 01:10] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr (PR 239 plans-index missing row)
- **Done**: Fail-closed when `{plansDir}/index.json` exists but has no row for the workflow (in-repo states); contract test added
- **Result**: Untracked plan folders no longer pass `validate_state.cjs`

### [2026-08-24 01:05] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr CI (shared AGENTS.md 14000 B budget)
- **Done**: Kept both resolver filenames; shortened tools/autoload/scripts rows so hub AGENTS.md stays under 14000 B
- **Result**: `test-context-budget.js` passes again

### [2026-08-24 01:00] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr (PR 239 ac-ledger resume docs + resolver table)
- **Done**: FAQ + setup.md 5d backfill for missing `ac-ledger.json`; hub scripts table lists Python resolver again; artifact-economy asserts both recipes
- **Result**: Pre-0.3.37 resumes can init the ledger before pre-advance 1

### [2026-08-24 00:55] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr round (PR 239 missing ac-ledger negative test)
- **Done**: Contract tests: standard + lite `--pre-advance 1` fail when `ac-ledger.json` is absent
- **Result**: Dropping the ledger gate cannot pass `test-workflow-state-contract.js`

### [2026-08-24 00:50] Agent: Cursor Grok 4.6
- **Prompt**: /ws-ship-pr + /ws-goal-fix-pr (PR 239 Python pre-advance twin)
- **Done**: Froze standard + lite `validate_state.py` to exec Node SoT; aligned `update_state.py` stateVersion 2; retargeted quality-gates to `validate_state.cjs`
- **Result**: Python and Node `--pre-advance` can no longer disagree on plan.index.json / ledger / skip-aware artifacts

### [2026-08-24 00:45] Agent: Cursor Grok 4.6
- **Prompt**: /ws-goal-fix-pr round 3 (PR 239 eval contract for optional FEATURES.md)
- **Done**: Made eval id 1 conditional on `tracking.featuresMdEnabled`; added eval id 3 for the false branch; test asserts both
- **Result**: Agents that skip FEATURES.md when the flag is false no longer fail eval

### [2026-08-24 00:30] Agent: Cursor Grok 4.6
- **Prompt**: /ws-ship-pr fix-pr round 2 (PR 239 plan.index resume docs)
- **Done**: FAQ + setup.md backfill for missing `plan.index.json` on pre-0.3.37 resume; integrity regenerated
- **Result**: Operators can rebuild the index before implement pre-advance after package update

### [2026-08-24 00:20] Agent: Cursor Grok 4.6
- **Prompt**: /ws-ship-pr then fix PR 239 review threads
- **Done**: Contract tests for Step 7 `no-test-surface` / `testing-disabled` skip → `--pre-advance 8` without a testing report
- **Result**: Skip-aware ship advance is now regression-locked in `test-workflow-state-contract.js`

### [2026-08-24 00:08] Agent: Cursor Grok 4.6
- **Prompt**: Add config verboseMode; preview bullets from the executing model; default true
- **Done**: `defaults.verboseMode` schema/seed `true` (`config.json.example`, ws-configure-project); runtime omitted/`false` silent, explicit `true` prints a reasoned start-of-step list; no canned preview script
- **Result**: ws-spec-to-pr* steps announce a live analysis unless the consumer sets false


### [2026-08-23 23:55] Agent: Cursor Grok 4.6
- **Prompt**: Fix memory trap compiler scripts
- **Done**: Fail-closed Node compile (dated heading + DO NOT/INSTEAD DO, colon-inside-bold labels); Python twin execs `.cjs`; isolated `test-memory-formatting.js` to `--repo-root`
- **Result**: Invalid entries no longer rewrite MEMORY.md; py/cjs parsers cannot drift


### [2026-08-23 23:35] Agent: Cursor Grok 4.6
- **Prompt**: Improve workflow-skills efficiency; enumerate ws-spec-to-pr; report, plan, parallel implementation
- **Done**: Wired existing helpers into live dispatch (ledger init, plan index, sequential DAG stub, test-surface probe); skip-aware Node pre-advance; report+plan under `{plansDir}/workflow-efficiency-audit/`
- **Result**: Default Step 3 is a script stub; pre-advance no longer demands skipped artifacts; unique-runtime Python ports deferred


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

### [2026-08-15 15:12] Agent: Cursor Composer
- **Prompt**: `/ws-multi-spec` sequential lite full auto for GH #211, #209, #210 then ship + goal-fix-pr until merge
- **Done**: Shipped 3/3 — PR 212 (#211 hybrid consumer-root), PR 213 (#209 en-us patterns + autoload), PR 214 (#210 ws-preview Extra skill, v0.3.21)
- **Result**: All merged to `main` (`ff7e93c`, `af32fc4`, `b3ce293`)

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

### [2026-08-01 02:56] Agent: Antigravity AI (Gemini 3.6 Flash)
- **Prompt**: update website, readme, agents.md, installer npx, dependencies, checksum, then commit all and ws-ship-pr (bump version)
- **Done**: Bumped package to `0.0.113`; updated site catalog (`docs/index.html`); updated `README.md`, `AGENTS.md`, `.agents/AGENTS.md` for `--global` (`-g`) and `--project` (`-p`) CLI scope options; regenerated skill integrity checksums (`bin/skill-integrity.json`); verified full test suite (`npm run tests`, 100% green).
- **Result**: Release `0.0.113` ready and verified for shipping.

### [2026-08-01 02:42] Agent: Antigravity AI (Gemini 3.6 Flash)
- **Prompt**: `/ws-spec-to-pr` a new feature that allows user to choose between install skills globally or in directory project, with local project overriding skills support.
- **Done**: Added `--global`/`-g` and `--project`/`-p` scope flags to `bin/cli.js` across `install`, `update`, and `uninstall`; added interactive scope selection prompt; added `resolveGlobalSkillsDir()` and `resolveTargetSkillsDir()` to `bin/install-rules.js`; updated `ws-check-harness` (`SKILL.md` & `PHASES.md`) for global token map and workspace skill override precedence; added comprehensive integration test suite in `test/test-install.js` (100% passing); regenerated `bin/skill-integrity.json`.
- **Result**: Fully implemented and verified Spec-to-PR delivery for Global vs Project skill installation.

### [2026-07-27 12:45] Agent: Cursor Grok 4.5
- **Prompt**: Add `/ws-tdah` autoload in root AGENTS.md (development only)
- **Done**: Root + packaged hubs keep Every-prompt `/ws-tdah`; `ws-shared` mandatory table drops it (on-demand invoke)
- **Result**: Development dogfood autoload; consumers opt in via `/ws-tdah`

### [2026-07-27 11:52] Agent: Cursor Grok 4.5
- **Prompt**: Commit all + ship/release — full prepare checklist (`/ws-ship-pr`, `/ws-goal-fix-pr`)
- **Done**: Release `0.0.100` — `ws-tdah` replaces caveman/gabarito; Step 6 fix→re-review (max 3); harness corrections; site/integrity/tests green
- **Result**: Ready to push `develop` → PR `main`

### [2026-07-27 11:40] Agent: Cursor Grok 4.5
- **Prompt**: Merge ws-gabarito into ws-tdah (action-first + judgment; retire gabarito)
- **Done**: Merged judgment directives into `ws-tdah`; deleted `ws-gabarito`; updated hubs/deps/tests/orch/harness/site; retired opt-out aliases; 36 skills; integrity OK
- **Result**: One autoload communication skill (`ws-tdah`); dogfood duo with `ws-karpathy-guidelines`

### [2026-07-27 11:35] Agent: Cursor Grok 4.5
- **Prompt**: `/ws-write-a-skill` one-pass format for `ws-tdah`
- **Done**: Pruned to gabarito-style flat reference; leading word `action-first`; Before/After → `EXAMPLES.md`; Opt-out + Before send; evals aligned; integrity OK (50 lines)
- **Result**: Ready for user accept / further edit

### [2026-07-27 11:30] Agent: Cursor Grok 4.5
- **Prompt**: Replace ws-tdah examples with auth Before/After shape
- **Done**: Canonical Before/After in `SKILL.md` + `README.md`; integrity regenerated
- **Result**: Example matches required response shape

### [2026-07-27 11:20] Agent: Cursor Grok 4.5
- **Prompt**: Rename `ws-caveman` → `ws-tdah`; single default mode; ADHD-friendly structure rules
- **Done**: Added `.agents/skills/ws-tdah/` (SKILL/README/evals); removed `ws-caveman`; updated hubs, deps, tests, harness docs, site catalog, integrity; dropped intensity levels; start/stop only
- **Result**: Live contracts point at `ws-tdah`; integrity verify OK; historical plans/specs still mention retired id (exempt)

### [2026-07-27 00:45] Agent: Cursor Composer
- **Prompt**: Auto-load `ws-senior-developer`; rename `shared` → `ws-shared`; orchestrators use `AskQuestion` at each gate; allow short skill invocation names; update harness checks.
- **Done**: Renamed `.agents/skills/shared` → `ws-shared` across repo (installer `HUB_DIR`, path tokens, scripts, tests, hubs); autoload `ws-senior-developer` in `AGENTS.md` / `ws-shared/AGENTS.md` / `.agents/AGENTS.md`; `gates.md` + both orchs prefer `AskQuestion` at every step boundary; added `invocation_names` short forms to all skills; `ws-check-harness` flags retired `shared/` paths; regenerated integrity; `npm test` + `check_workflows.py` green (0 issues).
- **Result**: Skills invocable as `fable-method` or `ws-fable-method`; consumer hub at `.agents/skills/ws-shared/`.

### 2026-07-27 — PR triage, merge, and branch sync (v0.0.99 ship)
- **Prompt**: Check all active PRs, fix threads, merge when ready, close stale PRs, sync develop/main, ensure green consumer install.
- **Done**: Merged PR #154 (develop→main, v0.0.99 release: ws-shared hub rename, senior-developer gate, npx upstream guard); fixed and merged PR #157 (harness bare-link false-positive guard + integrity regen); closed PR #155 (auto-generated ECC bundle — not aligned with harness neutrality); synced develop and main to `3af35c1`; verified `npm run tests --local`, integrity, and ws-check-workflows all pass.
- **Result**: Zero open PRs; `main` and `develop` aligned at v0.0.99; consumer install path green.

### [2026-07-26 18:10] Agent: Cursor Grok 4.5
- **Prompt**: `/ws-spec-to-pr` GH issue #150 — ship optional `ws-senior-developer` with full auto checks, tests, site, integrity, and PR.
- **Done**: Added installable opt-in `ws-senior-developer` (Workflows package); hubs/docs/config opt-in for `rules.seniorDeveloper`; dedicated evals; installer assertions; `ws-sync-spec` eval payload for npm pack parity; bumped to `0.0.97`; regenerated site catalog and integrity; synced branches with `develop` as source of truth.
- **Result**: Release `0.0.97` ready (`develop` → `main`) with verified integrity and local package tests.

### [2026-07-26 06:30] Agent: Antigravity AI (Gemini 3.6 Flash)
- **Prompt**: Update `README.md`, website skills, installer, dependency graph, and checksums, then ship PR.
- **Done**: Updated `README.md` catalog table to list `ws-sync-spec`, `ws-spec-format`, and `ws-goal-loop`; rebuilt site catalog (`docs/index.html`); bumped version to `0.0.96`; regenerated skill integrity checksums (`bin/skill-integrity.json`); verified `check_workflows.py` (0 issues) and `npm test` (all 11 phases green); created PR #148, verified CI checks, merged PR #148 to `main`, and synced local/remote `main` and `develop` branches.
- **Result**: Release `0.0.96` shipped and merged to `main` with 100% test coverage and verified integrity.

### [2026-07-26 06:24] Agent: Antigravity AI (Gemini 3.6 Flash)
- **Prompt**: `/ws-check-harness` — Audit harness integrity and apply corrections.
- **Done**: Executed Phases 0–5c scan; fixed relative links in `.agents/skills/ws-spec-index/INDEX-TEMPLATE.md` to point to repo-root `README.md` and `AGENTS.md`; bumped package version to `0.0.95`; rebuilt site catalog; regenerated skill integrity checksums (`bin/skill-integrity.json`); verified `check_workflows.py` (0 issues) and `npm test` (all 11 phases green); created PR #147, verified CI checks, merged PR #147 to `main`, and synced local/remote `main` and `develop` branches.
- **Result**: Release `0.0.95` shipped and merged to `main` with 100% test coverage and verified harness integrity.

### [2026-07-26 06:20] Agent: Antigravity AI (Gemini 3.6 Flash)
- **Prompt**: Ensure each task cycle in `ws-multi-spec` merges PR after review threads = 0, and sync base branches (`main`/`master`/`develop`) post-merge before starting a new feature branch (`git checkout -b`).
- **Done**: Updated `SKILL.md`, `PROTOCOL.md`, `STATE.md`, and `evals.json` in `ws-multi-spec` to enforce mandatory PR merge and closure via SCM provider, strict queue advancement blocking until `state: MERGED`, and immediate post-merge base branch synchronization (`git fetch` & `git pull {baseBranch}`) before creating subsequent feature branches; bumped version to `0.0.94`; rebuilt site catalog; regenerated integrity checksums; verified `check_workflows.py` (0 issues) and `npm test` (all 11 phases green); created PR #145 and PR #146, verified CI checks, merged PRs to `main`, and synced local/remote `main` and `develop` branches.
- **Result**: Release `0.0.94` shipped and merged to `main` with 100% test coverage, verified integrity, and post-merge branch synchronization.

### [2026-07-26 06:07] Agent: Antigravity AI (Gemini 3.6 Flash)
- **Prompt**: `/ws-fable-method` ensure `ws-multi-spec` skill checks for base branch synchronization (`baseBranch`) before starting or resuming work on each spec in a batch.
- **Done**: Added `baseBranch` auto-detection and persistence to `ws-multi-spec` state header; added pre-dispatch base branch sync preflight (`git merge` / `git rebase`) and conflict pause gate to `PROTOCOL.md` and `SKILL.md`; updated `STATE.md` schema, `EXAMPLES.md`, and `evals.json`; bumped package version to `0.0.92`; rebuilt site docs; regenerated skill integrity checksums (`bin/skill-integrity.json`); verified `check_workflows.py` (0 issues) and full test suite (`npm test`, 11/11 phases green); created PR #144, ran GitHub CI checks, and merged PR #144 to `main`.
- **Result**: Release `0.0.92` shipped and merged to `main` with 100% test coverage and verified integrity.

### [2026-07-26 00:29] Agent: Antigravity AI
- **Prompt**: Refactor all skills to add ws-* prefix to folder/skill names, update all references across files/relations, rebuild site, test install/update, and ship PR.
- **Done**: Renamed all 21 remaining unprefixed skill directories under `.agents/skills/` to use `ws-` prefix via `git mv` (36 total skills now all prefixed with `ws-`); updated `name: ws-<skill>` and `invocation_names` in SKILL.md frontmatters to support activation via both `ws-skillName` and `skillName`; updated dependency graphs (`bin/skill-dependencies.json` & `ws-shared/skill-dependencies.json`), CLI, test suite (`test-install.js`), and docs (`AGENTS.md`, `ws-shared/AGENTS.md`, `README.md`); bumped version to `0.0.90`; rebuilt site catalog (`docs/index.html`); regenerated integrity checksums (`bin/skill-integrity.json`); verified `check_workflows.py` (0 issues) and `npm test` (all 12 phases green); opened PR #141, verified CI checks, and merged PR #141 to `main`.
- **Result**: Release `0.0.90` shipped and merged to `main` with 100% test coverage and verified integrity.

### [2026-07-26 00:05] Agent: Gemini 3.6 Flash (High)
- **Prompt**: Fix new GH issues (#138, #139, #129, #131, #132), update website, integrity digests, dependencies, tests, and ship PR.
- **Done**: Routed `ws-sync-spec` in `ws-shared/AGENTS.md` (Promoted Utilities + Task Router); added `init` guard (`--force` flag requirement for non-empty `index.PRD`) and consumer dialect contract support to `ws-spec-index`; added consumer dialect eval case; bumped version to `0.0.88`; rebuilt site catalog (`docs/index.html`); regenerated integrity checksums (`bin/skill-integrity.json`); verified `check_workflows.py` (0 issues) and `npm run test` (all 11 phases green).
- **Result**: Release `0.0.88` ready to ship (`develop` → `main`) with 100% verified integrity, site catalog, and test suite.

### [2026-07-25 23:17] Agent: Gemini 3.6 Flash
- **Prompt**: `/spec-to-pr-lite gh issue check and get to create spec` (Issue #129)
- **Done**: Registered `ws-multi-spec` in `.agents/skills/ws-shared/skill-dependencies.json` to match `bin/skill-dependencies.json`; added automatic `bin` ↔ `shared` dependency graph sync assertions in `check_workflows.py`; updated test suite assertions in `test-install.js`; bumped version to `0.0.85`; regenerated integrity digests; created and merged PR #130.
- **Result**: Managed consumer updates maintain `ws-multi-spec` dependency closure and prevent hub manifest drift.

### [2026-07-25 22:48] Agent: Gemini 3.6 Flash (High)
- **Prompt**: Brainstorm and grill `ws-sync-spec` skill, build skill, update dependencies, website, checksums, tests, and ship via `/ws-ship-pr`.
- **Done**: Created `ws-sync-spec` skill (`v0.0.87`) for continuous feature spec auto-updates after prompt evolutions and code changes; updated dependency graphs (`bin/skill-dependencies.json` & `ws-shared/skill-dependencies.json`); updated site catalog (`docs/index.html`); regenerated integrity checksums (`bin/skill-integrity.json`); ran full test suite (`npm test`, 11/11 phases green) and `check_workflows.py` (0 issues); created PR #137, waited for Agentic Code Reviewer (`SUCCESS`), and merged PR #137 to `main`.
- **Result**: `ws-sync-spec` shipped and merged to `main` with 100% test coverage and verified integrity.

### [2026-07-25 22:30] Agent: Gemini 3.6 Flash (High)
- **Prompt**: `/fable-method` update website, README.md, checksums, dependencies, installer, npx/bash script, AGENTS.md, check-workflows, tests, check-harness and bump version to prepare release 0.0.86
- **Done**: Bumped package version to `0.0.86`; updated website catalog (`docs/index.html`) with 35 skills across 4 layers; updated `README.md` catalog tables; synced dependency manifests (`bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json`); updated test suite tarball reference in `test/package.json`; regenerated integrity checksums (`bin/skill-integrity.json`); verified `check_workflows.py` (0 issues, 100% PASS) and `npm run tests -- --local` (all 11 phases green).
- **Result**: Release `0.0.86` ready to ship (`develop` → `main`) with 100% verified integrity, site catalog, installer, and test suite.

### [2026-07-25 21:45] Agent: Gemini 3.6 Flash (High)
- **Prompt**: `/spec-to-pr gh iisue 134 /write-a-skill /fable-method`
- **Done**: Added `ws-spec-index` model-invoked skill for project spec index lifecycle management (`init`, `sync`, `promote`); created skill documentation, templates, reference schemas, and evals; registered in `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json`; updated hub skill indexes and task routers (`AGENTS.md` and `.agents/skills/ws-shared/AGENTS.md`); wired auto-sync call sites in `spec-to-pr`, `spec-to-pr-lite`, and `ws-ship-pr`; updated integrity digests and website catalog; created PR #135, ran GitHub CI checks, and merged PR #135 to `main`.
- **Result**: `ws-spec-index` skill shipped and merged to `main` with 100% test suite and harness validation passing.

### [2026-07-25 02:40] Agent: Cursor Grok 4.5
- **Prompt**: `/fable-method` fix GH Action code review false-positive success (OpenCode install / BASH_SOURCE)
- **Done**: Removed `continue-on-error: true` from `.github/workflows/code-review.yml`; pre-install OpenCode via authenticated `gh api` + pinned `--version`; run `run.sh` from a downloaded file (not `curl|bash`); aligned root `AGENTS.md` dry-run recipe
- **Result**: Reviewer exit 1 can no longer paint the job green; CI avoids unauthenticated GitHub rate-limit install failure

### [2026-07-25 02:35] Agent: Cursor Grok 4.5
- **Prompt**: `/ws-ship-pr` (develop → main)
- **Done**: Restored Standalone/Workflow Mode sections on provider SKILL.md files; inlined check-harness Phase 3 skill-integrity `--check` gate in SKILL.md; bumped package to `0.0.82`, regenerated site footer + integrity digests; verified `verify.sh`, `check-workflows`, leak scan
- **Result**: Release `0.0.82` ready to ship (`develop` → `main`)

### [2026-07-25 02:20] Agent: Cursor Grok 4.5
- **Prompt**: Add rules to `.github/agentic-code-reviewers-prompt.md` for harness/workflow gates, installer tests, dependency graph, skill lists, and naming
- **Done**: Extended review prompt with must-pass `check-harness` / `check-workflows`, installer tests, `skill-dependencies.json` closure, skill inventory drift, `ws-*` + bare invocation names, and ban on `NN-*` folders
- **Result**: Custom stack reviewer prompt encodes upstream ship gates and skill naming contract

### [2026-07-25 00:57] Agent: Cursor Grok 4.5
- **Prompt**: commit all, update website, graph, installer, prepare ship-pr (rename pipeline folders to ws-*)
- **Done**: Renamed 12 pipeline folders to match frontmatter (`ws-write-spec`…`ws-fix-pr`, `ws-goal-fix-pr`, `ws-update-plan-implementation`); updated hubs, orch/dispatch, `skill-dependencies.json`, installer/CLI examples, validators, tests, and stale `00`–`09` prose; fixed `self_learning.py` shared-path after `scripts/` move; bumped to `0.0.81`, rebuilt site catalog + integrity digests
- **Result**: Release `0.0.81` prepared for ship (`develop` → `main`); tests + check-workflows + integrity green

### [2026-07-25 00:39] Agent: Cursor Grok 4.5
- **Prompt**: prepare and ship-pr committing everything
- **Done**: Added `evals/evals.json` for all 33 skills plus `bin/generate-skill-evals.js`; moved `self_learning.py` to `scripts/` and updated path refs (`SKILL.md`, `tools.md`, `spec-to-pr`, `cli.js`, `MEMORY.md.template`, `write-a-skill` layout); bumped package to `0.0.80`, regenerated site + integrity digests; verified with `npm run tests -- --local`, `check-workflows`, and `verify-integrity`
- **Result**: Release `0.0.80` ready to ship (`develop` → `main`)

### [2026-07-24 16:32] Agent: Antigravity (Gemini 3.6 Flash)
- **Prompt**: add to website in each skill card at the bottom each skill dependency badge.
- **Done**: Updated `bin/build-site.js` to extract direct skill dependencies from `bin/skill-dependencies.json` and render interactive dependency badges (`.dep-pill`) at the bottom of every skill card in `docs/index.html`; styled `.skill-card-bottom`, `.skill-deps-wrap`, `.deps-heading`, `.deps-list`, and `.dep-pill` in `docs/assets/css/style.css` with theme-tailored colors, hover glow, and thin custom scrollbars; added interactive click-to-search on dependency pills; regenerated site HTML (`docs/index.html`); updated skill integrity digests (`npm run generate-integrity`); ran full installation test suite (`npm run test` ✅ PASS).
- **Result**: Every skill card on the catalog now displays interactive dependency badges; test suite 100% green.

### [2026-07-24 16:06] Agent: Antigravity (Gemini 3.6 Flash)
- **Prompt**: check last fixes. analyze, update website, README.md, dependencies graph, checksums, installer npx/bash, bump version to 0.0.79, commit, push, ship-pr, and wait for code-review.
- **Done**: Audited codebase and harness integrity (`check-workflows` ✅ PASS, 0 issues); verified dependencies graph (`bin/skill-dependencies.json`); added domain catalog starter example (`specs/domains/index.md.example`); bumped version to `0.0.79` (`npm run build-site:bump`); updated site HTML (`docs/index.html`); regenerated integrity digests (`npm run generate-integrity`); updated test consumer package version (`test/package.json`); verified integrity (`npm run verify-integrity`); ran installation test suite (`npm run test` ✅ PASS across all 11 phases); prepared release commit and PR.
- **Result**: Version `0.0.79` released with verified integrity digests, site catalog update, domain catalog example, and 100% passing test suite.

### [2026-07-24 01:38] Agent: Antigravity (Gemini 3.6 Flash)
- **Prompt**: Address local Agentic Code Reviewer findings (deduplicate config-resolution.md and align fable spec defaults) and ship PR #118.
- **Done**: Removed 65-line duplicated text block in `.agents/skills/ws-shared/config-resolution.md`; aligned `fable.enabled` default in `.agents/specs/fable-skills-integration.spec.md` (`true` default in fresh config example); regenerated integrity digests (`npm run generate-integrity`), ran workflow simulations (`check-workflows` ✅ PASS), created PR #118, merged PR #118 to `main`, and fast-forward synced `develop` with `main`.
- **Result**: PR #118 merged; `config-resolution.md` deduplicated; `main` and `develop` branches 100% in sync (`01608a1`).

### [2026-07-24 01:30] Agent: Antigravity (Gemini 3.6 Flash)
- **Prompt**: Fix merge conflict in docs/index.html, remove bot commit step from deploy-site.yml, add Jone Polvora portfolio link to site footer, and ship PR #117.
- **Done**: Removed the `github-actions[bot]` commit step from `.github/workflows/deploy-site.yml` to permanently eliminate branch drift between `main` and `develop`. Updated `bin/build-site.js` and `docs/index.html` to add `Developed by Jone Polvora` linking to `https://jpolvora.github.io/` in the site footer. Rebuilt site catalog (`v0.0.78`), regenerated integrity digests (`npm run generate-integrity`), ran workflow simulations (`check-workflows` ✅ PASS), created PR #117, merged PR #117 to `main`, and fast-forward synced `develop` with `main`.
- **Result**: PR #117 merged; permanent fix for `docs/index.html` merge conflicts applied; site footer displays link to `jpolvora.github.io`; `main` and `develop` branches 100% in sync (`6e36563`).

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
- **Done**: Added `skill-dependencies.json` under `.agents/skills/ws-shared/skill-dependencies.json` and added it to `HUB_WHITELIST` in `bin/install-rules.js` so consumer repos receive the manifest on install/update; updated `bin/cli.js` `skillGraphPath` fallback; updated `check_workflows.py` to check `ws-shared/skill-dependencies.json` first, fall back to `bin/`, and guard closure audit when no manifest is loaded (`if self.deps_loaded:`); regenerated skill integrity manifest (`bin/skill-integrity.json`).
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

### [2026-07-20 18:55] Agent: Cursor Grok 4.5
- **Prompt**: Step 7 testing for skill-install-checksums (AUTO, no browser)
- **Done**: Wrote `step-07-*.testing.plan.md` + `testing.report.md`; ran `node --check` on touched bin files, `generate-skill-integrity.js --check`, `npm run tests -- --local`
- **Result**: PASS (0 fix loops); Phase 0b + Phase 11 green; all ACs 1–12 mapped PASS; Learning: N/A (standard testing)

### [2026-07-20 18:50] Agent: Cursor Grok 4.5
- **Prompt**: Step 6 code review for skill-install-checksums (AUTO fix Critical/Warning)
- **Done**: Reviewed integrity scope; fixed W1 (no bless local record on post-verify fail), W2 (abs-path `memory` skip), S1 (mismatch printer); added Phase 11 regression; wrote `step-06-*.review.md` + `fix.report.md`
- **Result**: 2 Warning + 1 Suggestion fixed; `npm run tests -- --local` PASS; Learning: Integrity — never bless failed post-verify with actual digests

### [2026-07-20 18:45] Agent: Cursor Grok 4.5
- **Prompt**: Step 4 implement skill-install-checksums DAG T1–T8 (integrity digests for install/update/audit)
- **Done**: Added `bin/install-rules.js`, `skill-integrity-lib.js`, `generate-skill-integrity.js`, committed `skill-integrity.json`; wired pre/post verify + `integrity` + `--check` digest into `cli.js`; hub ships `hub.gitignore` (npm cannot pack `.gitignore`); skip `runs/`; Phase 0b/11 tests; README + check-harness docs
- **Result**: `npm run tests -- --local` green; `generate-skill-integrity.js --check` OK; version unchanged (0.0.63); Learning: Integrity — npm never packs .gitignore; skip runs/

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

### [2026-07-20 14:30] Agent: Cursor Grok 4.5
- **Prompt**: Set agentic-code-reviewers publish min score to 4 (default is 6)
- **Done**: Added `--score-min 4` to `.github/workflows/code-review.yml` and AGENTS.md dry-run curl
- **Result**: CI + local dry-run publish findings with score ≥ 4

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
- **Result**: Agents load `config.json` + `tools.md` first, expand braces before Read/Grep/Shell; no undeclared `ws-shared/` shorthands

### [2026-07-20 13:15] Agent: Composer
- **Prompt**: `/08-ship-pr` with create-PR + check-harness (1A)
- **Done**: Prepare board green; check-harness PASS_WITH_WARNINGS; pushed develop; opened/merged PR #86; fixed gabarito MEMORY path from review thread; synced site catalog after main merge
- **Result**: https://github.com/jpolvora/workflow-skills/pull/86 MERGED (`4cf92fb`); `develop` intact

### [2026-07-20 12:00] Agent: OpenCode kimi-k3
- **Prompt**: Decouple gabarito/caveman/karpathy-guidelines into independent skills; apply write-a-skill filter to reduce lines
- **Done**: Removed all cross-skill and hub (AGENTS.md) references from the three autoload skills — composition now owned solely by hubs/consumers; caveman 71→63 lines (dropped Persistence section + duplicate example), gabarito 46→43 (dropped Opt-out section + karpathy/senior-developer pointers + PT-BR filler example), karpathy 66 lines (deduped intro); link scan 0 broken / 344
- **Result**: Skills self-contained; hub § Skill loading / Precedence / Opt-out remains the single composition point

### [2026-07-20 11:00] Agent: OpenCode kimi-k3
- **Prompt**: Run check-harness audit; fix references, links, semantics, workflow usage; improve portability/multi-agent
- **Done**: Full audit (Phases 0–5c, 348 links clean) + 9 approved corrections: fixed critical `spec-to-pr-lite` dependency closure in `bin/skill-dependencies.json`; packaged hub 27→28 ids; untracked consumer-owned `ws-shared/stack.md` (+ de-sedimented retired 13-step refs); retitled `stack.md.example`; fixed run-test.md `stackFile` path + linked from spec-to-pr README (also fixed stale `00–11`); cleaned local config.json (glossaryFile, Step12→Step8 invariant key); added orchestrator dependency-closure check to check-harness Phase 3 + check-workflows; extracted check-harness report template to `REPORT-FORMAT.md` (586→~530 lines)
- **Result**: Harness OK post-correction; `npm run tests -- --local` green

### [2026-07-20 09:43] Agent: Cursor Grok
- **Prompt**: bump
- **Done**: Patch-bumped `0.0.61` → `0.0.62`; regenerated site footer; synced `test/package.json` tarball ref
- **Result**: Install/`--version`/`--check` align with site v0.0.62

### [2026-07-20 09:35] Agent: Cursor Grok
- **Prompt**: Rename shared stack companion to STACK.md and update references
- **Done**: `stack.md.example` → `STACK.md.example`; default seed/path `ws-shared/STACK.md`; installer renames legacy `ws-shared/stack.md` once; refs across hubs/skills/CLI/tests/docs updated
- **Result**: Canonical consumer stack companion is `.agents/skills/ws-shared/STACK.md`

### [2026-07-20 09:30] Agent: Cursor Grok
- **Prompt**: Fresh consumer install check-harness noise; ship-ready skills without touching consumer root files
- **Done**: Fixed stale `00`–`11` prose; installer seeds only under `ws-shared/` (`config.json`, `CHANGELOG.md`, `stack.md`, `MEMORY.md`); expanded consumer `ws-shared/AGENTS.md`; check-harness consumer hub = shared (root AGENTS optional suggestion only); never write consumer root/host files; README/tests updated
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
- **Done**: Removed `installPackagedAgentsIndex` from CLI (install/update/uninstall); dropped `.agents/AGENTS.md` from npm package `files`; expanded `ws-shared/AGENTS.md` with External dependencies + skill discovery; retargeted spec-to-pr/spec-format/setup links; updated README/hubs/site copy; install tests assert no `.agents/AGENTS.md` copy
- **Result**: Consumer agent contract is `skills/ws-shared/AGENTS.md` only; upstream packaged hub remains for authoring/check-harness drift

### [2026-07-20 08:38] Agent: Cursor Composer
- **Prompt**: Stop workflows from requiring/creating consumer files outside shared (changelog + specsDir)
- **Done**: `rules.changelogFile` default → `.agents/skills/ws-shared/CHANGELOG.md`; `plans.specsDir` default → `.agents/plans/specs` (prefer existing root `specs/`); updated changelog skill, local-spec detect script, schema/example, hubs, README, tools
- **Result**: Fresh consumers get no forced root `CHANGELOG.md` / `specs/`; root paths only when explicitly configured or already present

### [2026-07-20 08:34] Agent: Cursor Composer
- **Prompt**: configure-project warns ws-shared/stack.md exists but root STACK.md missing; avoid forcing files outside shared/
- **Done**: Default `rules.stackFile` → `.agents/skills/ws-shared/stack.md`; configure-project/setup retarget to shared companion instead of creating root `STACK.md`; updated example, AGENTS, tools, PREPARE-CHECKLIST
- **Result**: Stack companion stays under consumer-owned `shared/`; root STACK.md optional legacy only

### [2026-07-20 08:12] Agent: Cursor Composer
- **Prompt**: Fix version bump so package version matches website footer; sync GH Actions/local build; explain install vs site drift
- **Done**: Made `package.json` canonical — `build-site.js` stamps footer without bumping by default (`--bump` / `npm run build-site:bump` for releases); deploy-site CI asserts footer==package.json and never bumps; aligned repo to **0.0.61** (package + footer + test tarball ref); documented contract in README/AGENTS
- **Result**: `--version`/`--check`/install and site footer share one version; CI can no longer leave footer one patch ahead

### [2026-07-19 18:35] Agent: Cursor Grok
- **Prompt**: Update README/AGENTS/site for install/update/uninstall; check-harness; ship-pr full auto
- **Done**: Documented uninstall + `installed-skills.json` in README, root/packaged AGENTS, site `#install`; CLI uninstall+manifest already in tree; harness link scan clean; package **0.0.59**
- **Result**: Ready to ship develop → main

### [2026-07-19 18:30] Agent: Cursor Grok
- **Prompt**: Add uninstall to installer/updater; track installed skills in shared/
- **Done**: `uninstall --skills` with reverse+orphan cascade; consumer-owned `ws-shared/installed-skills.json` (`skills` + `selected` roots); install/update write/bootstrap manifest; help/README/shared docs + Phase 10 tests
- **Result**: `npm run tests -- --local` green

### [2026-07-19 17:56] Agent: Cursor Grok
- **Prompt**: check-harness, fix needed items, prepare PR, ship-pr for consumer testing
- **Done**: Full harness audit (Phases 0–5c); synced site Extra catalog + package `0.0.50`; aligned `test/package.json` tarball; removed orphan `skills-lock.json`; retargeted promote-shared spec example; install tests `--local` green (29 skills)
- **Result**: Harness OK post-correction; ready to ship develop→main PR (`no-merge` for consumer test)

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

### [2026-07-19 17:16] Agent: Cursor Grok
- **Prompt**: Fix measuring time in full auto workflows (state/logs/final board)
- **Done**: Required `--elapsed` in `update_state.py` (standard+lite); null-safe totals; nested `telemetry.steps` round-trip; upsert `## Telemetry log`; contracts for auto/full Benchmark + Step 8 final-board Total time (state-hygiene, delivery-result, progress-board, STEP-DISPATCH, SKILL)
- **Result**: Smoke test: omit `--elapsed` → exit 1; multi-step sum 95+0+40 → `totalElapsedSec: 135` + Telemetry log rows

### [2026-07-19 17:10] Agent: {agent/runtime}
- **Prompt**: Replace `.agents/plans/{slug}` with `{plansDir}/{slug}` (config check)
- **Done**: Confirmed no `plansDir` config key — token `{plansDir}` ← `plans.dir`; scrubbed skill prose/examples; schema/example keep literal defaults; hubs document the mapping
- **Result**: Skills use `{plansDir}/{slug}/`; config still `plans.dir`

### [2026-07-19 17:00] Agent: Cursor Grok
- **Prompt**: ship-pr should wait for code-review and merge after no open issues (goal-fix-pr)
- **Done**: Clarified `08-ship-pr` Phase 5–6 + GOAL-OVERRIDES; Step 9 / lite Step 5 wait→goal-fix→merge; goal-fix-pr merge handoff note; merged main into develop for PR #71
- **Result**: Contract: never merge with open threads or red required checks

### [2026-07-19 16:52] Agent: {agent/runtime}
- **Prompt**: check-harness apply all (#1–#4)
- **Done**: Restored+rewrote `.agents/AGENTS.md` (harness-neutral parity); cleared phantom `seniorDeveloper` paths in config example + local config; deleted `workflow-skills-0.0.55.tgz`
- **Result**: Harness OK post-correction for critical packaged-hub gap

### [2026-07-19 15:55] Agent: {agent/runtime}
- **Prompt**: Portability rule in AGENTS.md; no compat; consumers choose asset paths; keep `.cursor` for upstream dogfood only
- **Done**: Added root § Portability & harness neutrality; neutralized shipped defaults (`.agents/plans` / `.agents/codereviews`); `user-gate` / `dispatch-agent`; scrubbed host brands from skills + hubs + README; `ws-shared/config.json` stays `.cursor/plans` for this repo only
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
- **Done**: Rewrote `spec-to-pr` and `spec-to-pr-lite` orchestrators, `STEP-DISPATCH.md`, `ARTIFACTS.md`, protocols, `ws-shared/gates.md`, `ws-shared/setup.md`, pipeline skills `05`–`07`/`09`/`11`, `check_workflows.py`, dual `AGENTS.md`, README, site catalog tagline
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
- **Done**: Removed specific IDE references to "Cursor" (such as "switch in Cursor" and "Cursor model picker") from the instructional texts in `spec-to-pr-lite/SKILL.md`, `spec-to-pr/SKILL.md`, `spec-to-pr/README.md`, `ws-shared/gates.md`, and `ws-shared/setup.md`, replacing them with generic terminology (`IDE`, `IDE/agent host`, `IDE/agent host model picker`). Replaced MCP tool name `cursor-ide-browser` with `ide-browser` in `ws-shared/tools.md`. Bumped package version to `0.0.37`.
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
- **Done**: Installer never copies `MEMORY.md`/`memory/`/`config.json` from upstream; seeds empty `MEMORY.md` from template; npm pack excludes compiled memory + `ws-shared/config.json`; fixed `check_memory_conflict.py` MEMORY path; Phase 9 install tests.
- **Result**: `npm run tests -- --local` passed including MEMORY isolation; pack dry-run has no leaked memory/config.json.

### [2026-07-17 11:15] Agent: Cursor Composer
- **Prompt**: Update obsolete bash curl install; pair with npx install.
- **Done**: Replaced flat-copy `install-skills.sh` with thin shim → local `bin/cli.js` or `npx --yes github:jpolvora/workflow-skills`; updated README, `docs/index.html` curl section, and CLI help note.
- **Result**: `bash install-skills.sh --help` delegates to Node CLI; curl path shares same argv (`bash -s -- install --full --yes`).

### [2026-07-17] Agent: Cursor Grok
- **Prompt**: Enforce AGENTS.md = agent README, README.md = human README; rewrite both as needed.
- **Done**: Rewrote root `AGENTS.md` (audience banner, doc-roles table, agent contracts) and `README.md` (human install/overview/contribute); aligned `.agents/AGENTS.md`, `ws-shared/AGENTS.md`, `check-harness` hub table, and site footer with the same split.
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
- **Done**: Added ws-shared/gates.md + config-resolution.md; slimmed transitions (Advance/More); collapsed delivery+ship gates; formalized complexity/stub plan; conditional interview; quick-score verify; fixed --full/docs contradictions; deduped config/SCM to ws-shared/config.json across 08/09/11/providers; rewrote lite orch for gate parity; updated FAQ/DIAGRAM/README/AGENTS.
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
