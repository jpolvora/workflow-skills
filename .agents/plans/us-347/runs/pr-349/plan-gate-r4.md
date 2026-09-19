# plan-gate.md — PR 349 fix batch 4 (goal Act round 4)

- batchId: us-347-pr349-batch4
- prId: 349
- scope: goal-act-round
- workflowId: us-347-20260918T194831Z
- headSha: 195ba0d466970e07ac7a31b904544ec079543003
- plannedAt: 2026-09-18T21:33:30Z
- activeThreadIds: [PRRT_kwDOTFajc86j5nGu]
- status: executed
- executedAt: 2026-09-18T21:40:00Z
- handoffValidation: batchId/prId match; activeThreadIds re-collected identical (single thread, fetched twice via fetch_threads.cjs); headSha == HEAD at exec start (195ba0d4)
- roles: fixPrPlan=reviewerModel→muse-spark (captured session); fixPrExec=executionModel→muse-spark (captured session)
- gateApproval: goal-auto-approved (ws-goal-fix-pr overrides active; Act round proceeds after gate exists)

## Outer preflight (recorded)

- preExistingDirty (tracked M): .agents/plans/index.json, .agents/plans/us-347/step-00-us-347.spec.md, .agents/skills/ws-shared/CHANGELOG.md, .agents/skills/ws-shared/MEMORY.md (+ untracked workflow runs/specs/memory; full list in worker notes, kept on disk, never staged)
- Remote sync: `git fetch origin develop` ok; `git diff --name-only HEAD..FETCH_HEAD` empty → no pull needed, no overlap, no stash
- Provider: scm=github; `gh auth status` pass; thread I/O token via `gh auth token` → GH_TOKEN export
- PR: jpolvora/workflow-skills #349 `feat(us-347): ws-goal-fix-pr orchestrator dispatch`, develop→main, head 195ba0d4 == local HEAD

## Failed-check triage

- `gh pr checks 349`: test pass x2; review **fail** (run 35396884733: "PR has 1 unresolved review thread(s). Resolve them before merging.")
- Classification: **diff-regression** — the review gate fails solely on the 1 active thread, anchored on a line this PR changed (test/test-goal-fix-pr-orchestrator-dispatch.js L37, PR-added file per `git diff origin/main...HEAD`). Not baseline, not infra-flake → no rerun; resolving the thread clears the check.

## Thread scores (worker triage per ws-fix-pr scoring)

### 1. PRRT_kwDOTFajc86j5nGu — dispatch test L37, Lite/inline branch unasserted

- reviewerScore: 5 (SUGGESTION fix-code)
- score: 6
- scoreTriage: ws-fix-pr table maps 0–5 to comment-only and 6–10 to surgical fix. The reviewer's 5 understates: the suggestion is valid (Lite branch added by batches 1–3 has zero assertions — `grep -c -i lite` on the dispatch test returns 0), the anchor file is PR-added so in scope, and additive test-only assertions carry ~zero lock risk after regex verification below. Worker re-triage to 6 authorizes the fix; a comment-only close would leave the regression guard open.
- proposedAction: fix-code — ADD Lite/inline-branch assertions to `test/test-goal-fix-pr-orchestrator-dispatch.js` (do-not-dispatch + pair-inline-on-captured-model + no-internal-telemetry) using ONLY regexes verified to pass against current SKILL.md text; no SKILL.md edits; keep every existing assertion green.
- premiseVerification (done in fixPrPlan, evidence read before scoring):
  - TRUE (branch exists): ws-goal-fix-pr/SKILL.md L98 Lite/inline posture bullet — "do not dispatch a batch worker ... run the ordered `fixPrPlan` → `fixPrExec` pair inline on the captured session model with identical gate/learning contracts and no internal role telemetry".
  - TRUE (telemetry carve-out): SKILL.md L104 Dispatch telemetry — "Lite/inline runs emit none (see Lite / inline posture)".
  - TRUE (zero assertions): `grep -c -i "lite"` on test/test-goal-fix-pr-orchestrator-dispatch.js returns 0; full file read confirms no Lite/inline assertion.
  - TRUE (suggested regexes pass — verified via node against ACTUAL text, 2026-09-18T21:33Z): `/Lite \/ inline posture:.*do not dispatch a batch worker/i` → true; `/run the ordered `fixPrPlan` → `fixPrExec` pair inline on the captured session model/i` → true; `/Lite\/inline runs emit none/i` → true.
  - TRUE (in scope): anchor file is PR-added (`git diff origin/main...HEAD` shows `new file mode` for the test); assertions are additive, no existing assertion touched.
  - CONSTRAINT (no weakening): fixPrExec must NEVER reword SKILL.md to fit the test; if any suggested regex failed, that assertion would be dropped or re-anchored to actual wording — all three pass so the suggestion is adopted as-is.
  - CONSTRAINT (existing locks): all current dispatch-test assertions must stay green; new assertions are appended in the AC1/AC4 area with distinct names (`liteInlinePosture`), no edits to existing blocks.
- plannedEdit (additive, test file only):
  - Insert after the AC1 sessionOwnsLoopInline block (after L47): two `assert(...)` blocks — (1) `AC1 liteInlinePosture: lite/inline runs the pair inline without a batch worker` (do-not-dispatch AND pair-inline conjunction), (2) `AC4 liteInlinePosture: lite/inline emits no internal role telemetry` (Lite/inline-runs-emit-none). Exact regexes as verified above.
- defectClass: new contract carve-out branch shipped without a regression-guard assertion (Lite/inline posture unasserted in the dispatch test)
- sourcesConsulted: code (whole-file verdict on every dispatch/telemetry/learning/worker statement in ws-goal-fix-pr/SKILL.md L27/L44/L75/L78/L81/L82/L90/L95/L97/L98/L99/L100-103/L104/L105/L106/L110/L115/L116/L117; dispatch-test branch map AC1–AC7/NS5 vs every Round-batch bullet + Steps behavior; tree-wide grep for posture text across test/ — live hits only in the dispatch test, rest are packaged fixtures under test/.agents + test/node_modules), memory-files (self_learning --match-paths + MEMORY.md grep; folded sweep-quoters-after-restructure + restated-ownership-whole-file-sweep + dispatch-contract-carveouts-locked-phrasing + pipeline-dedup-locked-substrings + stale-test-after-default-move traps), spec-memo (vault search "lite inline unasserted test branch dispatch telemetry regression guard" — zero hits, miss not fatal), context (no sibling open threads — single active thread; prior PR-349-round-1/2/3.md read; check-pr-status failed log = same 1-thread gate pattern; test-models-preset-and-per-step.js L357-364 confirmed resolver-level only, not a substitute), patterns (full dispatch-test read before insertion; all 3 suggested regexes verified passing via node before adoption; AC1/AC4 area chosen, zero existing blocks touched)
- proactiveFixed: none beyond anchor (anchor-only pattern; dispatch test is the sole live asserter of the posture text)
- proactiveSkipped:
  - SKILL.md L75 trailing "Internal roles emit dispatch telemetry only and never finish outer Step 9" + L104 trailing "Internal roles emit telemetry only and never call `finish --step 9`" — AC4 phrase-locked (`/Internal roles emit (dispatch )?telemetry only and never (call )?finish --step 9/i`); governed by the L98 carve-out + L104 "Lite/inline runs emit none" sentence + L75 "(see Round-batch dispatch)" pointer; the clause constrains kind (never finish), not quantity, so no edit
  - SKILL.md L97 Fresh-worker bullet — AC2 phrase-locked verbatim; adjacent L98 carve-out bullet already scopes it (established skip, batches 1–3)
  - SKILL.md L27/L44/L82/L90/L95/L100-103/L105/L106/L110/L115/L117 — neutral (invocation, SCM intent, done-whens, report contents, self-qualified session-owns-loop, model routing, carve-outs themselves, both-paths dry-run, path-qualified contract rows); no unconditional ownership claim
  - SKILL.md L78/L81/L99/L116 inline-mode sentences (batch-3 scoping glue: session produces evidence / owns write inline) — unasserted but out of thread scope: they restate consequences of the now-locked Lite/inline branch plus existing AC7 locks (Forbidden-N/A, never-duplicates); locking each restatement would multiply phrase locks on wording still settling across waves; the core branch guard covers the regression
  - test/test-models-preset-and-per-step.js L357-364 — resolver-level lite coverage (ignores fixPrPlan/fixPrExec role keys); independent of goal-fix-pr dispatch suppression, not a substitute, no change needed
- amendments: []
- fixApplied: added 2 assert blocks to test/test-goal-fix-pr-orchestrator-dispatch.js after the AC1 sessionOwnsLoopInline block (L47): `AC1 liteInlinePosture` (do-not-dispatch AND pair-inline conjunction) + `AC4 liteInlinePosture` (Lite/inline-runs-emit-none); exact suggested regexes, all verified passing pre-commit; zero SKILL.md edits; all 40 pre-existing assertions green (42 total); matches proposedAction so no amendment required

## Proactive sweep plan (final sweep, fixPrExec)

Batches 1–3 scoped every unconditional batch-worker/dispatch/telemetry/Learning statement found so far. fixPrExec runs the FINAL sweep: (1) whole-file re-read of ws-goal-fix-pr/SKILL.md for any remaining unconditional dispatch/telemetry/learning/worker wording; (2) diff of every new-behavior branch in the dispatch test for any other unasserted branch (beyond Lite/inline). Pre-read expectation: SKILL.md L75/L78/L81/L95/L97+L98/L99/L104/L105/L106/L110/L116 are all path-qualified or neutral after batch 3; the only known unasserted branch is Lite/inline (this anchor). Any further hit follows the size gate (surgical → fix now with amendment; large → proactiveSkipped with path + reason).

## Surgical scope

- Only lines this PR changed: `test/test-goal-fix-pr-orchestrator-dispatch.js` (PR-added; additive assertions only). No SKILL.md edits expected; any proactive SKILL.md hit must itself be PR-changed and pure-insertion safe. Plus harness-required integrity regen only if a hash-covered file changes (test files are not hashed; SKILL.md untouched → likely no regen needed, verify before commit).
- Forbidden in batch: `git stash`, `git add -A`/bare `-u`/directory adds, staging `preExistingDirty` or `{plansDir}` paths, weakening SKILL.md to fit the test, `resolve-thread` before verify+proactive evidence, `finish --step 9` (telemetry only for internal roles).
