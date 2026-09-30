---
step: 6
slug: per-task-test-adequacy-review
workflowId: per-task-test-adequacy-review-20260930T081414Z
status: completed
startedAt: "2026-09-30T08:14:18.000Z"
endedAt: "2026-09-30T08:49:40.139Z"
acRefs: []
---
# Code Review — per-task-test-adequacy-review (round 1)

- **Base**: main (review snapshot pinned to committed range `320d3cfa..f4cfd836`, HEAD `f4cfd836474cb575289aa6f657b2fcc01becd5ac`, verified unchanged at report time)
- **Scope**: 7 files of the G2-code commit only. Unmerged develop residue (sibling batch specs, classifier fix) and prior merged items are out of scope and excluded.
- **Rule pack**: typescript-node.md; stack scan exit 0 (0 issues); local reviewer dry-run skipped (no `localReviewCommand` configured); fable-judge skipped (optional integration, precedent: prior items).
- **Score**: 7/10 (two Warnings with fixes, one Suggestion; no Critical)

## Findings

### CR-001 [Warning] open .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs:L365-L378

Multi-task adequacy evidence overwritten (last-wins): `row.adequacy = {...}` unconditionally replaces the previous summary, so when two tasks cover one AC only the latest record survives in the ledger.

1. **Read Evidence**: `ac_ledger.cjs:L365-L378` assigns `row.adequacy` without reading the prior value. Observed in this run: AC1 linked adequacy-T1 then adequacy-T5; the row shows only T5 (`taskId: T5`).
2. **Executable Failure Scenario**: Task T1 links its record for AC1 (event `adequacy-t1`), then task T5 links a different record for AC1 (event `adequacy-t5`). Step 5 reads `row.adequacy` and sees only T5's status/counts/recordPath; T1's record path, sha, and verdict are unrecoverable from the ledger, so observed adequacy per AC5 is latest-only instead of per-task.
3. **Missing Protection**: no append/history slot for the one-record-per-task by many-tasks-per-AC domain.
4. **Discards**: `linkEventIds` accumulates event ids only (no record paths); us-dir record files are not enumerated in the ledger; the score rule reads `row.adequacy.status` (latest) only. Sibling plural evidence (`findings`, `verdicts`, `tests`, `commits`) all append to arrays; `sabotage` is single-slot by design (one run per AC — exemption). Adequacy is the only plural-evidence single slot.

**Sibling occurrences**: none beyond this site (checked `sabotage` single-slot: exempt by single-runner design).

```suggestion
Append each linked adequacy summary to `row.adequacyHistory[]` (dedupe by event id) and keep `row.adequacy` as the latest. Score rule unchanged (latest status governs). Cover with a multi-link history test.
```

### CR-002 [Warning] open .agents/skills/ws-implement-tasks/scripts/check_test_adequacy.cjs:L105-L137

Binding file:line range not containment-checked: `checkBindings` verifies file existence, range well-formedness, and test-name presence anywhere in the file — never that the name occurs within `[lineStart, lineEnd]`. False line pointers validate adequate.

1. **Read Evidence**: `check_test_adequacy.cjs:L105-L137`; the only content assertion is `content.includes(binding.test)` over the whole file.
2. **Executable Failure Scenario**: bind AC1 to `{test: "X", file: "feature.test.js", lineStart: 1, lineEnd: 1}` while `X` is defined at line 500. The helper exits 0 adequate, and AC1's headline file:line evidence points at the wrong line. AC1's core promise (covering test with file:line evidence) is unproven.
3. **Missing Protection**: no slice containment check requiring the test name within `lines[lineStart-1..lineEnd]`.
4. **Discards**: ledger `evidenceFile`/score checks validate range shape and name-anywhere only, which makes this helper the sole line-truth gate rather than a redundant one. Score's name-in-file weakness is pre-existing and out of scope (named exemption, not widened).

**Sibling occurrences**: ledger score name-in-file check shares the weakness (pre-existing; exemption with path + reason: `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` score `mapped` check — changing legacy scoring semantics is out of scope for this spec).

```suggestion
Require the test name within the sliced range; keep a distinct gap message for name-absent-anywhere vs name-outside-range. Cover both with assertions.
```

### CR-003 [Suggestion] open .agents/skills/ws-implement-tasks/SKILL.md:L49-L55

`addedTests` is self-reported: the helper can only check listed names, so test names the worker forgets to list escape the orphan check. The recipe does not tell workers to derive the list from the task diff.

```suggestion
Add one recipe sentence: derive `addedTests` from the task diff (every test name the task added or modified), never from memory.
```

## Stack Invariant Compliance

- Strict type safety: N/A (plain `.cjs`, no TS annotations).
- Async safety: pass (synchronous `fs`/`spawnSync` only; no floating promises).
- Boundary validation: pass (record JSON shape-validated before use in both helper and ledger verb; malformed input throws/exits non-zero with no partial attach).
- Path traversal: pass (binding files containment-checked via `toRepoRelative`; `--record`/`--adequacy-file` resolve caller paths in the trusted-operator CLI class, same as `run_sabotage.cjs`/`plan_index.cjs` precedents; writes go only to the ledger file or caller-chosen emit path).
- Resource lifecycle: pass (no streams/listeners; sync I/O only).
- Deterministic scan: exit 0, 0 issues.

## Memory Sweep

Checked compiled MEMORY traps against the 7 in-scope files: CLI space-form-only (no `=` offset trap), dashed-flag normalization with loud unknown-flag failure, per-flag test assertions, CRLF preservation on `ac_ledger.cjs`, smoke-required exports, one-link-per-file ledger hygiene, integrity-after-final-edit ordering. No confirmed violations.

**Apply fixes?** Workflow autoMode: yes — fix round 1 (CR-001, CR-002, CR-003 in one surgical pass), then re-review.
