# plan-gate.md — PR 349 fix batch 3 (goal Act round 3)

- batchId: us-347-pr349-batch3
- prId: 349
- scope: goal-act-round
- workflowId: us-347-20260918T194831Z
- headSha: d1f0875d649454fbbef9ba4d529536d4d8445961
- plannedAt: 2026-09-18T21:22:58Z
- activeThreadIds: [PRRT_kwDOTFajc86j5cKi, PRRT_kwDOTFajc86j5cLO, PRRT_kwDOTFajc86j5cLy]
- status: executed
- executedAt: 2026-09-18T21:30:00Z
- handoffValidation: batchId/prId match; activeThreadIds re-collected identical (3 threads, fetched twice via fetch_threads.cjs); headSha == HEAD at exec start (d1f0875d)
- roles: fixPrPlan=reviewerModel→muse-spark (captured session); fixPrExec=executionModel→muse-spark (captured session)
- gateApproval: goal-auto-approved (ws-goal-fix-pr overrides active; Act round proceeds after gate exists)

## Outer preflight (recorded)

- preExistingDirty (tracked M): .agents/plans/index.json, .agents/plans/us-347/step-00-us-347.spec.md, .agents/skills/ws-shared/CHANGELOG.md, .agents/skills/ws-shared/MEMORY.md (+ untracked workflow runs/specs/memory; kept on disk, never staged)
- Remote sync: `git fetch origin develop` ok; `git diff --name-only HEAD..FETCH_HEAD` empty → no pull needed, no overlap, no stash
- Provider: scm=github; `gh auth status` pass; thread I/O token via `gh auth token` → GH_TOKEN export
- PR: jpolvora/workflow-skills #349 `feat(us-347): ws-goal-fix-pr orchestrator dispatch`, develop→main, head d1f0875d == local HEAD

## Failed-check triage

- `gh pr checks 349`: test pass x2; review **fail** (run 35395750880: unresolved review thread gate)
- Classification: **diff-regression** — the review gate fails solely on the 3 active threads, all anchored on lines this PR changed (ws-goal-fix-pr/SKILL.md L81, L116, L99 — each anchor line verified present in `git diff origin/main...HEAD`). Not baseline, not infra-flake → no rerun; resolving all 3 threads clears the check.

## Thread scores (worker triage per ws-fix-pr scoring)

All 3 threads share one body (1 WARNING + 2 similar-occurrence markers), one score, one defect class, one file.

### 1. PRRT_kwDOTFajc86j5cKi — SKILL.md L81, Step 5 post-round learning ownership unconditional

- score: 7
- proposedAction: fix-code — scope the Step 5 learning-ownership sentence in `.agents/skills/ws-goal-fix-pr/SKILL.md` L81 to the standard dispatch path by pure insertion (prefix qualifier + appended inline-mode sentence; zero deletions, zero reorders of locked text).
- premiseVerification (done in fixPrPlan, evidence read before scoring):
  - TRUE (unconditional claim): L81 "The batch worker owns the per-round MEMORY write inside its scope; the session records the worker-reported `Learning:` titles ..." with no path qualifier.
  - TRUE (lite carve-out): L98 Lite/inline posture — "do not dispatch a batch worker", pair runs inline.
  - TRUE (Tier 3 carve-out): L105 Tier 3 fallback — session adopts the step persona, runs inline-isolated, no batch worker.
  - TRUE (repeats): L99 Ownership split and L116 Subagent contract restate worker-owned learning wording.
  - CONTRADICTION CONFIRMED: on lite/Tier-3 runs no batch worker exists, so the L81 ownership rule names a nonexistent owner — the agent either skips the required trap (emitting `Learning: N/A`, which L81 itself forbids for accepted defects) or double-writes it. Same unconditional-contract defect class as the L104 telemetry wave (batch 2), applied to the Learning clause.
  - CONSTRAINT (test AC7): `test/test-goal-fix-pr-orchestrator-dispatch.js` L228-231 requires the `Forbidden: ... Learning: N/A` sentence intact — untouched by this edit (ownership sentence is a separate sentence). L236-239 lock (`never duplicates ... per-round ... `Learning:` write`) lives on L99, not L81. Reviewer literal diff rewords the ownership sentence but is rejectionsafe-equivalent to pure insertion here; pure insertion chosen for zero lock risk.
- plannedEdit (pure insertion into L81; existing sentences preserved verbatim):
  - BEFORE: `... in MEMORY. The batch worker owns the per-round MEMORY write inside its scope; the session records the worker-reported `Learning:` titles in the round log without duplicating the write.`
  - AFTER: `... in MEMORY. On the standard dispatch path, the batch worker owns the per-round MEMORY write inside its scope; the session records the worker-reported `Learning:` titles in the round log without duplicating the write. On the Lite / inline posture and the Tier 3 path (no batch worker) the session itself owns that per-round write under the same rule.`
- defectClass: learning-write ownership stated unconditionally while lite/Tier-3 modes define no batch worker (stale quoter of pre-carve-out contract)
- sourcesConsulted: code (ENTIRE ws-goal-fix-pr/SKILL.md line-by-line verdict on every batch-worker/dispatch/telemetry/Learning statement — L75/L78/L81/L82/L90/L95/L97/L98/L99/L100-103/L104/L105/L106/L110/L111-115/L116/L117; tree-wide grep for "batch worker owns|worker-reported `Learning" across .agents/skills docs README FEATURES — zero hits outside the file), memory-files (folded dispatch-contract-carveouts-locked-phrasing + sweep-quoters-after-restructure traps), spec-memo (vault search "learning write ownership batch worker lite inline" — zero hits, miss not fatal), context (sibling threads Ki+LO+Ly share one body; prior PR-349-round-1/2.md read; check-pr-status fail = same thread-gate pattern), patterns (full test-goal-fix-pr-orchestrator-dispatch.js read; AC2/AC4/AC5/AC7/NS5 locks honored; reviewer literal Step-5 diff accepted in intent but executed as pure insertion)
- proactiveFixed: .agents/skills/ws-goal-fix-pr/SKILL.md L75 Act round (prefixed "on the standard dispatch path, " — unconditional dispatch instruction vs L98 "do not dispatch a batch worker"; AC2 regex still matches) + L78 Verify (prefixed "On the standard dispatch path, " + appended inline-mode sentence — "dispatched worker / worker-reported outcome" assumed a worker exists; AC7 verify lock untouched)
- proactiveSkipped:
  - SKILL.md L97 Fresh-worker bullet — AC2 phrase-locked verbatim, cannot reword; adjacent L98 carve-out bullet already scopes it
  - SKILL.md L95/L104/L110 — already path-qualified (batch-1/2 scoping); reviewed, no change
  - SKILL.md L76/L82/L90/L100-103/L105/L106/L111-115/L117 — neutral (done-whens, report contents, model routing, carve-outs themselves); no ownership claim
  - ws-fix-pr/SKILL.md L59 — silent on per-round learning owner but wrong layer: post-round learning is goal-loop Step 5 scope, ws-fix-pr has no such step; ownership assigned here instead
  - test/test-goal-fix-pr-orchestrator-dispatch.js L236-239 — AC7 lock asserting the preserved never-duplicates pattern; left intact per pure-insertion constraint, no lock edits needed
- amendments: []
- fixApplied: L81 scoped by pure insertion — "On the standard dispatch path, " prefix + " On the Lite / inline posture and the Tier 3 path (no batch worker) the session itself owns that per-round write under the same rule." sentence; Forbidden-N/A sentence verbatim; zero deletions; matches proposedAction so no amendment required

### 2. PRRT_kwDOTFajc86j5cLO — SKILL.md L116, Subagent-contract learning ownership unconditional

- score: 7
- proposedAction: fix-code — scope the L116 Subagent-contract learning-ownership row by pure insertion (infix path qualifier + appended inline-mode sentence; zero deletions).
- premiseVerification: same contradiction as thread 1; L116 "the batch worker owns the per-round `ws-self-learning` write (and pattern files when those flags are on), and the session never duplicates it" names a nonexistent owner on lite/Tier-3 runs. No test regex locks L116 wording (AC7 locks only the Forbidden-N/A rule and the L99 never-duplicates pattern); NS5: added words contain no forbidden product/tool-id terms.
- plannedEdit (pure insertion into L116):
  - BEFORE: `- After every Act round, collect the worker-reported `Learning:` titles into the round log; the batch worker owns the per-round `ws-self-learning` write (and pattern files when those flags are on), and the session never duplicates it.`
  - AFTER: `- After every Act round, on the standard dispatch path collect the worker-reported `Learning:` titles into the round log; the batch worker owns the per-round `ws-self-learning` write (and pattern files when those flags are on), and the session never duplicates it. On the Lite / inline posture and the Tier 3 path (no batch worker) the session owns that per-round write itself under the same rule.`
- defectClass: same as thread 1
- sourcesConsulted: same batch-wide consult as thread 1 (code whole-file + tree-wide, memory-files 2 traps folded, spec-memo zero-hit miss, context siblings + prior rounds, patterns full test read)
- proactiveFixed: same batch-wide proactive set as thread 1 (L75 + L78 scoped; anchors L81/L99/L116 fixed)
- proactiveSkipped: same batch-wide skip set as thread 1 (L97 locked+adjacent-carve-out; L95/L104/L110 qualified; neutrals; ws-fix-pr L59 wrong layer; test lock intact)
- amendments: []
- fixApplied: L116 scoped by pure insertion — "on the standard dispatch path " infix + appended inline-mode sentence; zero deletions; matches proposedAction so no amendment required

### 3. PRRT_kwDOTFajc86j5cLy — SKILL.md L99, Ownership-split learning ownership unconditional

- score: 7
- proposedAction: fix-code — scope the L99 Ownership-split bullet by pure insertion (prefix qualifier + appended inline-mode sentence; zero deletions).
- premiseVerification: same contradiction as thread 1; L99 "the batch worker owns everything inside the `ws-fix-pr` batch scope ..." + "never duplicates the worker's per-round `Learning:` write" names a nonexistent owner on lite/Tier-3 runs.
- CONSTRAINT (test AC7 L236-239 — READ EXACT LOCK): regex `/never duplicates.*per-round .*`Learning:` write/is` requires the ordered tokens "never duplicates" ... "per-round" ... "`Learning:` write" to survive in the file. L99's "never duplicates the worker's per-round `Learning:` write" is the satisfying occurrence — the planned edit preserves that sentence verbatim, so the lock stays green. No test-file edits needed.
- plannedEdit (pure insertion into L99):
  - BEFORE: `- **Ownership split:** the batch worker owns everything inside the `ws-fix-pr` batch scope (plan gate, fixes, proactive evidence, verify, round report, resolve, push). The session owns the goal-loop steps plus the final report, and never duplicates the worker's per-round `Learning:` write — it records the worker-reported `Learning:` titles in the round log.`
  - AFTER: `- **Ownership split:** on the standard dispatch path, the batch worker owns everything inside the `ws-fix-pr` batch scope (plan gate, fixes, proactive evidence, verify, round report, resolve, push). The session owns the goal-loop steps plus the final report, and never duplicates the worker's per-round `Learning:` write — it records the worker-reported `Learning:` titles in the round log. On the Lite / inline posture and the Tier 3 path (no batch worker) the session owns the batch scope itself under identical gate/learning contracts.`
- defectClass: same as thread 1
- sourcesConsulted: same batch-wide consult as thread 1
- proactiveFixed: same batch-wide proactive set as thread 1
- proactiveSkipped: same batch-wide skip set as thread 1
- amendments: []
- fixApplied: L99 scoped by pure insertion — "on the standard dispatch path, " prefix + appended inline-mode sentence; "never duplicates the worker's per-round `Learning:` write" preserved verbatim so AC7 L236-239 lock stays green; zero deletions; matches proposedAction so no amendment required

## Proactive sweep plan (entire ws-goal-fix-pr/SKILL.md, fixPrExec)

Batches 1–2 swept only the Round-batch dispatch section and missed this Learning wave. fixPrExec sweeps the ENTIRE skill file for every remaining unconditional batch-worker/dispatch/telemetry/Learning ownership statement. Pre-identified candidates (both lines PR-changed per `git diff origin/main...HEAD`, both pure-insertion safe):

- L75 Act round: "dispatch one fresh worker per round batch through the portable `dispatch-agent` alias" (unconditional dispatch instruction vs L98 "do not dispatch a batch worker") → prefix "on the standard dispatch path, ". AC2 regex `/dispatch.*fresh worker per round batch.*`dispatch-agent`/is` still matches (leading "dispatch path, dispatch one fresh worker ..."). Closing clause already qualified ("when dispatch is available").
- L78 Verify: "Batch verification evidence is produced inside the dispatched worker; the session applies this loop-level check to the worker-reported outcome" (assumes a worker exists) → prefix "On the standard dispatch path, " + appended "On the Lite / inline posture and the Tier 3 path (no batch worker) the session produces that evidence inline and applies this check itself." AC7 verify lock (first sentence) untouched.

## Surgical scope

- Only lines this PR changed: `.agents/skills/ws-goal-fix-pr/SKILL.md` L81, L116, L99 (anchors) + L75, L78 (proactive same-class hits, both PR-changed). All pure insertion. Plus harness-required integrity regen if SKILL.md is hash-covered (same commit, `npm run generate-integrity` + verify).
- Forbidden in batch: `git stash`, `git add -A`/bare `-u`/directory adds, staging `preExistingDirty` or `{plansDir}` paths, `resolve-thread` before verify+proactive evidence, `finish --step 9` (telemetry only for internal roles).
