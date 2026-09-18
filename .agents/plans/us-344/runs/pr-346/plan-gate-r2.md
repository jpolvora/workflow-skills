# Fix-PR plan gate — PR 346, batch 2 (goal-act-round 2)

- batchId: pr-346-r2
- prId: 346
- prUrl: https://github.com/jpolvora/workflow-skills/pull/346
- scope: goal-act-round
- headSha: 8c597a0444163711e5027d4540189d14fc01545f
- plannedAt: 2026-09-18T19:05:07Z
- status: planned
- activeThreadIds:
  - PRRT_kwDOTFajc86j3F6W
  - PRRT_kwDOTFajc86j3F7l
- gatePath: .agents/plans/us-344/runs/pr-346/plan-gate-r2.md
- preExistingDirty: unchanged from r1 (4 modified + untracked plan/review/
  memory artifacts); none overlap fix paths. HEAD == origin/develop @r1 push.

## CI triage (check-pr-status on 8c597a04)

- `test` x2: PASS (1m19s / 1m10s) — round-1 AC8 fix confirmed in CI.
- `review` (run 35383111388): fail at "Block merge on unresolved threads"
  (consequence of the 2 new threads below, not a separate defect).
- No baseline/infra failures. No flake rerun.

## Thread scores and proposed actions

### T7 — PRRT_kwDOTFajc86j3F6W — gates.md L32 — score 6 — fix-code

Claim: option-cap contract (rules 1/8, ≤3/question) contradicted by
authored menus with 4–5 options and numbered Cancel. All instances
verified on disk; only the resume gate was reconciled by 91b1f7b6.

- proposedAction (all in PR-diff files):
  1. gates.md Step 8 combined gate (L196-202): restructure 5 options into
     primary question (Create-PR / Push-only / More options…) + overflow
     question (Skip-shipping / Skip-delivery-commit+Create-PR /
     Separate-gates-or-Pause). Remap dependent prose: Recommended mapping
     (L204), mechanical mapping (L206), after-close (L210), legacy pointer
     (L216) — by intent name, never stale numbers.
  2. gates.md legacy Ship-after-close menu (L220, 5 options): chunk to
     primary (Create PR / Push only / More ship options…) + overflow
     (Skip PR / Skip shipping entirely / Pause).
  3. setup.md branch-exists gate (L116-120, 4 options): drop Cancel to a
     dismiss note → 3 options. Keep the literal `Cancel (HS-1)` text
     (pinned by test-feature-branch-gate.js).
  4. setup.md ls-remote gate (L121), dirty-tree gate (L151-154),
     branch-resume gate (L205-207): convert numbered Cancel bullets to
     `Dismiss → Cancel (HS-1)` notes (established precedent: setup.md
     L193). Keep literals pinned by tests.
  5. INTERVIEW.md memory-backend gate (L254, 4 inline options): two-stage
     Q1 intent (Local only / Vault involved / None) + Q2 (only when
     vault: Spec-memo only / Both dual-mode). No test pins these strings.
- defectClass: over-cap / numbered-Cancel menus contradict option-cap rule
- sourcesConsulted: [code, memory-files, spec-memo, context]
- proactiveFixed: []
- proactiveSkipped: []
- amendments: []

### T8 — PRRT_kwDOTFajc86j3F7l — ws-self-learning/SKILL.md L22 — score 6 — fix-code

Claim (bot 5/suggestion, up-scored: verified real hygiene regression with a
zero-risk fix): root-default memory lost the hub-.gitignore coverage and no
suggestion mechanism lists the new paths.

- proposedAction:
  1. ws-cleanup/references/PATTERNS.md gitignore fence: add `MEMORY.md`
     and `memory/` (exactly the suggested diff).
- defectClass: generated root memory lacks ignore coverage + suggestions
- sourcesConsulted: [code, memory-files, spec-memo, context]
- proactiveFixed:
  - .agents/skills/ws-cleanup/scripts/list_disposable.cjs
    (hardcoded suggestPatterns mirror of the PATTERNS fence; without it the
    doc fix is dead text — ws-cleanup would still not suggest the patterns)
  - test/test-ws-cleanup.js (+1 assertion locking MEMORY.md + memory/
    suggestions; answers "no test asserts ignore coverage")
- proactiveSkipped: []
- amendments: []

## Memory consult (proactive discovery, pre-gate)

- spec-memo vault search ("user-gate option cap chunking gitignore
  ws-cleanup"): 0 hits → consulted, no applicable trap.
- Local MEMORY.md: HIT — user-gate-option-cap trap (at-most-3 rule 8,
  intent-first + More… paging, Cancel dismiss, lock with
  test-user-gate-option-cap.js). T7 fix follows that INSTEAD DO exactly
  (no new trap for the chunking pattern — already covered).
- T8 gitignore-mirror class: no covering entry → new Medium trap in
  post-round learning.

## Verification plan (fixPrExec)

1. Targeted: test-user-gate-option-cap, test-feature-branch-gate,
   test-delivery-commit-artifacts, test-ws-cleanup, test-harness-clean —
   all exit 0.
2. Integrity: generate + verify exit 0 (skill files change).
3. Full `npm run tests` exit 0.
4. Re-collect list-threads + check-pr-status after push.

## Commit plan (fixPrExec)

- Message: `fix(#346): fix issues from review threads
  [PRRT_kwDOTFajc86j3F6W, PRRT_kwDOTFajc86j3F7l]`
- Stage path-scoped only: gates.md, setup.md, INTERVIEW.md, PATTERNS.md,
  list_disposable.cjs, test-ws-cleanup.js, bin/skill-integrity.json.
- Push origin HEAD, provider resolve-thread x2 with cooperative fields +
  `--model muse-spark`.
