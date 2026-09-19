# plan-gate.md — PR 349 fix batch 2 (goal Act round 2)

- batchId: us-347-pr349-batch2
- prId: 349
- scope: goal-act-round
- workflowId: us-347-20260918T194831Z
- headSha: 3c9f1f7777a194f264e810b3330666bfccfd6c04
- plannedAt: 2026-09-18T21:08:48Z
- activeThreadIds: [PRRT_kwDOTFajc86j5QsX]
- status: executed
- executedAt: 2026-09-18T21:15:00Z
- handoffValidation: batchId/prId match; activeThreadIds re-collected identical (single thread, fetched twice); headSha == HEAD at exec start (3c9f1f77)
- roles: fixPrPlan=reviewerModel→muse-spark (captured session); fixPrExec=executionModel→muse-spark (captured session)
- gateApproval: goal-auto-approved (ws-goal-fix-pr overrides active; Act round proceeds after gate exists)

## Outer preflight (recorded)

- preExistingDirty (tracked M): .agents/plans/index.json, .agents/plans/us-347/step-00-us-347.spec.md, .agents/skills/ws-shared/CHANGELOG.md, .agents/skills/ws-shared/MEMORY.md (+ untracked workflow runs/specs/memory; kept on disk, never staged)
- Remote sync: `git fetch origin develop` ok; `git diff --name-only HEAD..FETCH_HEAD` empty → no pull needed, no overlap, no stash
- Provider: scm=github; `gh auth status` pass; thread I/O token via `gh auth token` → GH_TOKEN export
- PR: jpolvora/workflow-skills #349 `feat(us-347): ws-goal-fix-pr orchestrator dispatch`, develop→main, head 3c9f1f77 == local HEAD

## Failed-check triage

- `gh pr checks 349`: test pass x2; review **fail** (run 35394718947: unresolved review thread gate)
- Classification: **diff-regression** — the review gate fails solely on the 1 active thread, anchored on a line this PR changed (ws-goal-fix-pr/SKILL.md L104). Not baseline, not infra-flake → no rerun; resolving the thread clears the check.

## Thread scores (worker triage per ws-fix-pr scoring)

### 1. PRRT_kwDOTFajc86j5QsX — SKILL.md L104, dispatch-telemetry vs lite/no-telemetry contradiction

- score: 6
- proposedAction: fix-code — scope the `Dispatch telemetry` bullet in `.agents/skills/ws-goal-fix-pr/SKILL.md` L104 to the dispatched path with ADDED words only (pure insertion; zero deletions, zero reorders of locked text).
- premiseVerification (done in fixPrPlan, evidence read before scoring):
  - TRUE (unconditional claim): L104 "every batch emits ordered `fixPrPlan` → `fixPrExec` dispatch events to `telemetry.jsonl` ..." with no path qualifier.
  - TRUE (lite carve-out): L98 Lite/inline posture bullet — pair runs inline "with identical gate/learning contracts and no internal role telemetry".
  - TRUE (lite forms batches): lite Steps table Step 5 row — "for each batch, write and validate the gate-only plan before any product edit, then execute inline"; lite Invariant 6 — "Fix-PR runs gate-only plan then execute inline on `currentModel`, while numeric Step `5` remains the only outer telemetry row"; lite Invariant 2 — "no subagent dispatch"; tools.md L133 — lite "ignores every role key including `fixPrPlan` / `fixPrExec`".
  - TRUE (ws-fix-pr agrees): ws-fix-pr/SKILL.md L59 — "lite Step 5, run the same two phases sequentially inline under `currentModel`; lite ignores both role keys and does not add internal role telemetry".
  - CONTRADICTION CONFIRMED: a lite Step 5 Act-round batch is a "batch" under L104's unqualified universal but must emit "no internal role telemetry" per L98 — an agent either pollutes telemetry.jsonl on an inline run or stalls reconciling the two bullets. L104 is a stale quoter of the pre-lite-posture contract (batch 1 added L98 but did not reconcile L104).
  - CONSTRAINT (test AC4): `test/test-goal-fix-pr-orchestrator-dispatch.js` L144-148 requires the CONTIGUOUS substring "every batch emits ordered `fixPrPlan` → `fixPrExec` dispatch events" plus `telemetry.jsonl`, "actual model and the configured model", the no-finish lock, and "outer caller owns the single outer finish". The reviewer's literal "every dispatched batch emits ..." diff BREAKS the AC4 regex (inserts "dispatched " inside the locked substring) — REJECT the literal diff, keep its intent.
  - CONSTRAINT (siblings): test-hermes (baseline triage) + test-fix-pr-proactive-class-sweep (proactive/Learning locks) assert unrelated phrases in this file — untouched by this edit. NS5: added words contain no forbidden product/tool-id terms.
- plannedEdit (pure insertion into L104; locked sentence preserved verbatim):
  - BEFORE: `- **Dispatch telemetry:** every batch emits ordered ... per role. Internal roles emit telemetry only ...`
  - AFTER: `- **Dispatch telemetry:** on the standard dispatch path, every batch emits ordered ... per role. Lite/inline runs emit none (see Lite / inline posture). Internal roles emit telemetry only ...`
  - Rationale: opening qualifier scopes the universal to dispatched batches (mirrors L110 "standard dispatch path" vocabulary); added sentence defers lite/inline to the posture bullet per the thread's required resolution. "every batch emits ordered `fixPrPlan` → `fixPrExec` dispatch events" survives as an intact substring → AC4 stays green.
- defectClass: dispatch-telemetry bullet states an unqualified universal that contradicts the lite no-internal-telemetry carve-out (stale quoter of pre-carve-out contract)
- sourcesConsulted: code (bullet-by-bullet review of every Round-batch dispatch L93-106 + Subagent-contract L108-117 row in ws-goal-fix-pr/SKILL.md; skills/docs/test grep for "every batch emits|emits ordered|dispatch events to telemetry" — anchor-only outside the AC4 regex itself; ws-fix-pr L59 lite carve-out confirmed), memory-files (self_learning --match-paths + MEMORY.md grep; folded sweep-quoters-after-restructure + dispatch-contract-carveouts-locked-phrasing + pipeline-dedup-locked-substrings traps), spec-memo (vault search zero hits — miss, not fatal), context (no sibling open threads — single active thread; prior PR-349-round-1.md read; check-pr-status failed log = same 1-thread gate pattern), patterns (AC4/AC2/AC5/NS5 test locks read before rewording; reviewer literal "every dispatched batch" diff rejected — breaks AC4 contiguous-substring regex)
- proactiveFixed: none beyond anchor (anchor-only pattern; no sibling over-trigger hits in tree)
- proactiveSkipped:
  - .agents/skills/ws-goal-fix-pr/SKILL.md L97 Fresh-worker bullet — AC2 phrase-locked (verbatim test assertion), cannot reword; adjacent L98 carve-out bullet already scopes it, same rule+carve-out shape as the L104 fix
  - .agents/skills/ws-goal-fix-pr/SKILL.md L95/L99/L105/L106/L110 — already path-qualified (batch-1 parentheticals / narrowed trigger / both-paths wording); reviewed, no change
  - test/test-goal-fix-pr-orchestrator-dispatch.js L145 — AC4 lock regex asserting the preserved substring; test file, out of surgical scope
- amendments: []
- fixApplied: L104 scoped by pure insertion — "on the standard dispatch path, " prefix + " Lite/inline runs emit none (see Lite / inline posture)." sentence; locked "every batch emits ordered `fixPrPlan` → `fixPrExec` dispatch events" substring intact; zero deletions, zero reorders; matches proposedAction so no amendment required

## Surgical scope

- Only lines this PR changed: `.agents/skills/ws-goal-fix-pr/SKILL.md` L104 `Dispatch telemetry` bullet (pure-insertion scoping). Plus harness-required integrity regen if SKILL.md is hash-covered (same commit, `npm run generate-integrity` + verify).
- Forbidden in batch: `git stash`, `git add -A`/bare `-u`/directory adds, staging `preExistingDirty` or `{plansDir}` paths, `resolve-thread` before verify+proactive evidence, `finish --step 9` (telemetry only for internal roles).
