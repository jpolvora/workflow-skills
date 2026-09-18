# Fix-PR plan gate — PR 346, batch 1 (goal-act-round 1)

- batchId: pr-346-r1
- prId: 346
- prUrl: https://github.com/jpolvora/workflow-skills/pull/346
- scope: goal-act-round
- headSha: d61cac6daad1070ce64a619283c20f6e81b0b0e0
- plannedAt: 2026-09-18T18:48:12Z
- status: planned
- activeThreadIds:
  - PRRT_kwDOTFajc86j2vy4
  - PRRT_kwDOTFajc86j2vz8
  - PRRT_kwDOTFajc86j2v03
  - PRRT_kwDOTFajc86j2v1v
  - PRRT_kwDOTFajc86j2v2g
  - PRRT_kwDOTFajc86j2v3h
- gatePath: .agents/plans/us-344/runs/pr-346/plan-gate.md
- preExistingDirty: 4 modified + 16 untracked, none overlapping fix paths (verified 2026-09-18T18:48Z; no pull needed, HEAD == origin/develop; no stash)

## CI triage (check-pr-status 2026-09-18T18:48Z)

- `test` x2 (runs 35381472812, 35381493103): FAIL, identical root cause —
  `test/test-reviewer-aligned-gates.js:352` ENOENT for
  `<tmp>/.agents/skills/ws-shared/MEMORY.md` (AC8 framework-trap seeding).
  Classification: **diff-regression** (NOT baseline, NOT infra-flake).
  Evidence: same file passes on base `main` @ 95e8856f (worktree run:
  "All reviewer-aligned implementation gate tests passed successfully") and
  reproduces on HEAD locally + in both CI runs. Cause: PR commit 14dec9f3
  moved trap seeding to the effective memory dir (default repo root) while
  AC8 still expects the legacy `ws-shared/` location. No flake rerun
  (deterministic, non-infra).
- `review` (run 35381492980, Agentic Code Review): completed/failure at step
  "Block merge on unresolved threads" — consequence of the 6 open threads,
  not a separate defect. Clears on re-run after resolve + push.

## Thread scores and proposed actions

All threads from `github-actions` (agentic-code-reviewers v0.6.0, opencode),
posted 2026-09-18T18:43:50-53Z, all against the foreign memoryDir batch
(14dec9f3), all in PR scope (develop→main diff).

### T1 — PRRT_kwDOTFajc86j2vy4 — tools.md L24 — score 6 — fix-code

- proposedAction: Edit `.agents/skills/ws-shared/runtime/tools.md` rule 2:
  replace the mechanical `{memoryDir}/MEMORY.md` → root-MEMORY.md example
  with a neutral `{plansDir}` example and add the effective-resolution rule
  (configured wins with entries, else legacy `{sharedDir}` with entries,
  else configured; never read/write the raw configured path when legacy
  still holds entries). Keep the token-table row's
  `| \`{memoryDir}\` | \`rules.memoryDir\` |` prefix byte-identical (guarded
  by test-memory-dir-resolution.js §7); state effective resolution in the
  Default cell instead.
- defectClass: memoryDir token contract contradicts effective-dir fallback
- sourcesConsulted: [code, memory-files, spec-memo, context]
- proactiveFixed: []
- proactiveSkipped: []
- amendments: []

### T2 — PRRT_kwDOTFajc86j2vz8 — tools.md L17 — score 6 — fix-code (similar occurrence)

- proposedAction: Same tools.md edit as T1 (token-table Default cell note).
- defectClass: memoryDir token contract contradicts effective-dir fallback
- sourcesConsulted: [code, memory-files, spec-memo, context]
- proactiveFixed: []
- proactiveSkipped: []
- amendments: []

### T3 — PRRT_kwDOTFajc86j2v03 — tools.md L62 — score 6 — fix-code (similar occurrence)

- proposedAction: Same tools.md edit as T1 (rule 2 now defines the
  precedence the read-memory row's "effective" wording assumes).
- defectClass: memoryDir token contract contradicts effective-dir fallback
- sourcesConsulted: [code, memory-files, spec-memo, context]
- proactiveFixed: []
- proactiveSkipped: []
- amendments: []

### T4 — PRRT_kwDOTFajc86j2v1v — tools.md L147 — score 6 — fix-code (similar occurrence)

- proposedAction: Same tools.md edit as T1 (+ rule 10 "effective"
  sharpening for the MEMORY/changelog sentence, same file).
- defectClass: memoryDir token contract contradicts effective-dir fallback
- sourcesConsulted: [code, memory-files, spec-memo, context]
- proactiveFixed: []
- proactiveSkipped: []
- amendments: []

### T5 — PRRT_kwDOTFajc86j2v2g — ws-changelog/SKILL.md L33 — score 6 — fix-code (similar occurrence)

- proposedAction: No edit in the anchor file — L33 already states effective
  resolution ("when the configured file holds no `### [` entries and
  `{sharedDir}/CHANGELOG.md` does, keep appending to the legacy file").
  Resolved by this batch's tools.md fix, which the thread's own correction
  targets. Resolution comment explains anchor-verified + batch fix.
- defectClass: memoryDir token contract contradicts effective-dir fallback
- sourcesConsulted: [code, memory-files, spec-memo, context]
- proactiveFixed: []
- proactiveSkipped: []
- amendments: []

### T6 — PRRT_kwDOTFajc86j2v3h — ws-check-harness/SKILL.md L64 — score 6 — fix-code

- proposedAction: Add the missing `| \`{memoryDir}\` | \`rules.memoryDir\` |
  \`.\` (repo root) |` row after `{reviewsDir}` in the SKILL.md Path token
  map (bot scored 4/suggestion; up-scored to 6 after verifying the gap is
  real in both the doc map and the executable mirror).
- defectClass: harness token map omits {memoryDir}, breaks expansion audit
- sourcesConsulted: [code, memory-files, spec-memo, context]
- proactiveFixed:
  - .agents/skills/ws-check-harness/scripts/check_harness_links.cjs
    (executable TOKENS mirror lacks `{memoryDir}`; add `'{memoryDir}': '.'`
    so doc map and checker agree; verified zero current `]({memoryDir}…)`
    link targets, so no new findings)
- proactiveSkipped: []
- amendments: []

## CI diff-regression fix (in-batch, not a thread)

- File: test/test-reviewer-aligned-gates.js (AC8, lines ~352-414).
- Change: expect `MEMORY.md` at repo root and trap files under root
  `memory/` (the new default contract already asserted by
  test-memory-dir-resolution.js §1/§2/§6), instead of the legacy
  `.agents/skills/ws-shared/` paths. Fixture temp projects carry no config,
  so effective dir == configured default == root.
- Rationale: 14dec9f3 intentionally moved the default; AC8 is the stale
  half. Updating the stale test (not reverting the feature) restores green.

## Why no new --print-effective-paths CLI flag

The threads note no shipped helper *prints* the effective dir. Verified
`self_learning.cjs` main() resolves `resolveEffectiveMemoryPaths` for all
three modes (`--compile`/`--query`/`--match-paths`), and `auto_configure.cjs`
seeds at the effective dir — so every script entry point already honors it.
Only raw Grep/Read needed the precedence rule, which the rule-2 sentence now
states. A new flag would expand PR scope for no behavioral gain; recorded as
a deliberate non-change, not an oversight.

## Memory consult (proactive discovery, pre-gate)

- spec-memo vault search ("fix-pr PR convergence baseline CI failure slogan
  docs-only"): 0 hits → spec-memo consulted, no applicable trap.
- Local `.agents/skills/ws-shared/MEMORY.md` grep (memoryDir/effective/
  legacy memory): 2 hits, both unrelated (trap-source narrowing,
  specMemo.mode routing) → memory-files consulted, no applicable trap.
- Context: 6/6 threads share one root batch (14dec9f3); no prior
  PR-346 round reports exist (first round).

## Verification plan (fixPrExec)

1. Targeted: `node test/test-reviewer-aligned-gates.js`,
   `node test/test-memory-dir-resolution.js`,
   `node test/test-check-harness-links.js`,
   `node test/test-harness-clean.js` — all exit 0.
2. Integrity: `npm run generate-integrity` (skill files change) +
   `npm run verify-integrity` exit 0.
3. Full: `npm run tests` exit 0 (touches executable checker logic).
4. Re-collect `list-threads` + `check-pr-status` after push; resolve only
   with complete gate + proactive evidence.

## Commit plan (fixPrExec)

- Message: `fix(#346): fix issues from review threads [<6 threadIds>]`
- Stage path-scoped only: the 4 fix files + bin/skill-integrity.json.
  Never `git add -A`/`.`; preExistingDirty stays unstaged.
- Push `origin HEAD` (develop; never main directly), then provider
  `resolve-thread` x6 with `<!-- resolution-reply -->` + cooperative fields
  + `--model muse-spark`.
