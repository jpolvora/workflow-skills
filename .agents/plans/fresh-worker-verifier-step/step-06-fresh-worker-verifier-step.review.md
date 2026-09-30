---
step: 6
slug: fresh-worker-verifier-step
workflowId: fresh-worker-verifier-step-20260930T062223Z
status: completed
startedAt: "2026-09-30T06:22:23.921Z"
endedAt: "2026-09-30T07:25:34.238Z"
acRefs: []
---
# Code review — fresh-worker-verifier-step (round 2)

- **Base**: main (f85e94d) — targeted re-review of round-1 findings plus regression check
- **Score**: 10/10 (0 open; 4 Warnings + 3 Suggestions closed)
- **Verification**: `test/test-fresh-verify.js` green; full `npm run test` 148/148 green; stack scan 0 issues; real-spec AC extraction still yields 8/8

## Findings

### CR-001 [Warning] closed .agents/skills/ws-fresh-verify/scripts/run_fresh_injection.cjs:L80-L85

Fixed: `--invert-patch=` now slices 15. Regression assertion
`CR-001: =-form flags parse without mangling` passes. Sibling
`run_sabotage.cjs` exemption stands (foreign ownership, separate follow-up).

### CR-002 [Warning] closed .agents/skills/ws-fresh-verify/scripts/run_fresh_injection.cjs:L218-L224

Fixed: null/undefined `testExitCode` fails closed with `test-execution-failed`
(exit 1) before any red evaluation. Regression assertion `CR-002: execution
failure named` passes via a maxBuffer-overflow fixture (portable null-status
trigger, probed `status=null signal=SIGTERM`).

### CR-003 [Warning] closed .agents/skills/ws-fresh-verify/scripts/run_fresh_injection.cjs:L178-L182

Fixed: declared paths differing from HEAD fail closed with
`paths-dirty-vs-head` (exit 1) before worktree creation. Regression assertions
`CR-003: dirty paths fail closed` / `dirty reason named` pass. Clean-fixture
injection paths unaffected (full suite green).

### CR-004 [Warning] closed .agents/skills/ws-fresh-verify/scripts/build_fresh_dispatch.cjs:L70-L73

Fixed: `isRefused` lowercases the basename before testing. Regression assertion
`CR-004: case-variant prior output refused` passes. Allowlist semantics
unchanged (exact `--spec`/`--plan` strings still admitted).

### CR-005 [Suggestion] closed .agents/skills/ws-fresh-verify/scripts/build_fresh_dispatch.cjs:L77-L92

Fixed: `extractAcList` scans only the `## Acceptance Criteria` section.
Regression assertion `CR-005: AC list scoped to the criteria section` passes,
and the real `step-00` spec still extracts 8/8 ACs.

### CR-006 [Suggestion] closed test/test-fresh-verify.js:L131-L139

Fixed: `red-signal-unparseable` branch covered by an exit-3 empty-output
fixture (`CR-006: unparseable red exits 1`, reason named). Passes.

### CR-007 [Suggestion] closed .agents/skills/ws-fresh-verify/scripts/run_fresh_injection.cjs:L94-L100

Fixed: `--fail-pattern` compiles at parse time; invalid regex exits 2 with
`argument --fail-pattern: invalid regular expression`. Regression assertion
`CR-007: invalid fail pattern exits 2` passes.

## Stack Invariant Compliance

- `scan_stack_invariants.cjs` re-run over touched scripts + test: 0 issues.
- No new sibling occurrences: `=`-offset class re-swept across both touched
  scripts (all correct); refusal/exit vocabulary unchanged elsewhere.
- Byte budgets re-checked: injection script and test file remain within DAG
  budgets.

## Apply fixes?

No open Critical/Warning. Advance to Step 7.
