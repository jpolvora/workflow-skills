# Fix-PR plan gate — PR 346, batch 3 (goal-act-round 3)

- batchId: pr-346-r3
- prId: 346
- prUrl: https://github.com/jpolvora/workflow-skills/pull/346
- scope: goal-act-round
- headSha: 256cd5f9a7b22e16737a7b22e40244c64c11bf34
- plannedAt: 2026-09-18T19:14:29Z
- status: planned
- activeThreadIds:
  - PRRT_kwDOTFajc86j3WWp
  - PRRT_kwDOTFajc86j3WX1
  - PRRT_kwDOTFajc86j3WZG
  - PRRT_kwDOTFajc86j3WaM
  - PRRT_kwDOTFajc86j3Wbq
- gatePath: .agents/plans/us-344/runs/pr-346/plan-gate-r3.md
- preExistingDirty: unchanged (fix commit r2 landed clean; untracked
  plan/review/memory artifacts excluded as before).

## CI triage (check-pr-status on 256cd5f9)

- `test` x2: PASS (1m27s / 1m25s).
- `review` (run 35384345855): still running when threads posted; failure (if
  any) will again be the unresolved-threads block. No code failures.

## Thread scores and proposed actions

Both findings are valid refinements of round-2 fixes (own miss → fix).

### T9 — PRRT_kwDOTFajc86j3WWp — gates.md L196 — score 6 — fix-code

Claim: round-2 Step 8 chunk left stale "one combined menu (five options)"
wording elsewhere. Verified 4 real sites (thread's `docs/faq.md` path is
wrong; the file is `.agents/skills/ws-spec-to-pr/docs/faq.md` — same fix,
corrected path, recorded as amendment-free path correction since the
defect and remedy are identical).

- proposedAction:
  1. gates.md L17 dual-mode rules-table row: rewrite to primary +
     overflow wording (per suggested diff).
  2. STEP-DISPATCH.md row 8 (L55): primary+overflow mapping, no option
     numbers.
  3. STEP-DISPATCH.md §Step 8 (L128-146): primary question + overflow
     menu; mechanical sequence remapped by intent name.
  4. artifact-cleanup.md L5: "or option 5 legacy close menu" →
     "or Separate gates / Pause legacy close menu".
  5. ws-spec-to-pr/docs/faq.md Step 8 (L165-171): primary + overflow menu
     + intent-named mechanical flow.
- defectClass: stale 5-option Step 8 refs after chunking
- sourcesConsulted: [code, memory-files, spec-memo, context]
- proactiveFixed:
  - .agents/skills/ws-spec-to-pr/STEP-DISPATCH.md (not in PR diff; stale
    dispatch copy of the chunked gate — same class)
  - .agents/skills/ws-spec-to-pr/protocols/artifact-cleanup.md (same)
  - .agents/skills/ws-spec-to-pr/docs/faq.md (same)
- proactiveSkipped: []
- amendments: []

### T10–T13 — PRRT_kwDOTFajc86j3WX1 / 3WZG / 3WaM / 3Wbq — score 6 — fix-code

Claim (bot 5/suggestion x4, same text; up-scored: silent-source-loss
consequence): round-2 gitignore patterns unanchored, match at every depth.

- proposedAction: anchor to `/MEMORY.md` + `/memory/` in both mirrors
  (PATTERNS.md fence + list_disposable.cjs suggestPatterns) and update the
  round-2 test assertion to the anchored forms. patternCovered already
  treats leading-slash and bare forms as covering each other (verified
  L241-244), so alreadyIgnored stays accurate.
- defectClass: unanchored gitignore suggestions match nested paths
- sourcesConsulted: [code, memory-files, spec-memo, context]
- proactiveFixed: []
- proactiveSkipped: []
- amendments: []

## Memory consult (pre-gate)

- Vault search ("stale cross-references doc restructure gitignore anchor
  root"): 0 hits. Local grep: only unrelated CSS/edit anchors.
- No covering trap for either class → 2 new traps in post-round learning.

## Verification plan

1. Targeted: delivery-commit-artifacts, feature-branch-gate, ws-cleanup,
   option-cap, harness-clean — exit 0.
2. Integrity generate + verify exit 0.
3. Full `npm run tests` exit 0.
4. Re-collect threads + checks after push.

## Commit plan

- Message: `fix(#346): fix issues from review threads
  [PRRT_kwDOTFajc86j3WWp, PRRT_kwDOTFajc86j3WX1, PRRT_kwDOTFajc86j3WZG,
  PRRT_kwDOTFajc86j3WaM, PRRT_kwDOTFajc86j3Wbq]`
- Stage: gates.md, STEP-DISPATCH.md, artifact-cleanup.md, faq.md,
  PATTERNS.md, list_disposable.cjs, test-ws-cleanup.js,
  bin/skill-integrity.json.
- Push origin HEAD; resolve x5 with cooperative fields + muse-spark.
