---
step: 6
slug: patterns-generator-shared-hub-output
workflowId: patterns-generator-shared-hub-output-20260921T134516Z
status: completed
startedAt: "2026-09-21T13:45:16Z"
endedAt: "2026-09-21T14:11:16.053Z"
acRefs: []
---
# Code review — patterns-generator-shared-hub-output (round 2, re-review)

- Base: `main` (`e45c212b`) · Head: working tree fixes over `beef67be`
- Scope: prior findings + touched scope + new regressions

## Findings

### CR-001 [Warning] closed .agents/skills/ws-patterns-generator/SKILL.md:L56-L58

- **Read evidence**: the generator rules now state the fixed-hub contract: hub-root discovery reads `.ws/config.json` `pathTokens.sharedDir` and otherwise defaults to `.ws`, matching the harness-wide fixed-hub assumption; the companion records the same decision under "Hub-hosted generated body — Fixed hub root (review CR-001)".
- **Verification**: documentation change only; `node --check` and the batteries are unaffected (`test/test-ws-patterns-generator.js` green).
- **State**: closed in round 2.

### CR-002 [Suggestion] closed .agents/skills/ws-configure-project/scripts/configure_autoload.cjs:L567-L572

- **Read evidence**: the generated-id branch now runs `containsAbsolutePath()` before the identity check, so a hand-edited absolute hub row is reported as non-portable instead of passing `--check`.
- **Verification**: `node test/test-autoload-configure.js` green and `test/test-ws-patterns-generator.js` (which exercises `--check` with a hub-path row) green; full suite 103/103.
- **State**: closed in round 2.

### CR-003 [Suggestion] open .agents/plans/ws-spec-multi/ms-20260919T193000Z.summary.md (delivery note)

- Pre-existing broken tracked run summary (no frontmatter) breaks `validate_state.cjs rebuild-index`; renamed in the working tree. Carry the rename into the Step 4 delivery commit with the rationale, or fix the file upstream.
- **Score**: 4/10.

### CR-004 [Suggestion] open test/test-context-budget.js:L41

- SoT consumer hub measures 13 884 B against a 14 000 B budget (116 B headroom) after consolidating the legacy memory rows. No action; recorded for future edits.
- **Score**: 2/10.

### CR-005 [Suggestion] open .agents/specs/0114-patterns-generator-shared-hub-output.context.md

- AC10 records the missing local pre-change wall-time baseline as an explicit declared gap (`NS10`) with measured post-change numbers. Accepted limitation, no action.
- **Score**: 2/10.

## Stack Invariant Compliance

- `scan_stack_invariants.cjs --stack typescript-node`: 0 issues.
- Deterministic gates after the fix pass: `npm run test` 103/103; `test-harness-clean.js` 0 findings; `npm run verify-integrity` matches tree at `0.4.50`; secrets scanner no leaks; `test-context-budget.js` ok.
- Containment, autoload-row lifecycle, installer exclusion, and async/lifecycle invariants unchanged from round 1 (still compliant).

## Round decision

- Critical: 0 · Warning: 0 · Suggestion: 3 open (non-blocking, recorded)
- Round 1 Warning and Suggestion closed with verification evidence; loop exits clean at round 2 (no re-review needed).
- **Apply fixes?** No further fixes — review clean; Advance permitted.
