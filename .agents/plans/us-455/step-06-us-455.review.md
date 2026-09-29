---
step: 6
slug: us-455
workflowId: us-455-20260929T125300Z
status: completed
startedAt: "2026-09-29T13:09:00Z"
endedAt: "2026-09-29T13:11:30Z"
acRefs: []
---
# Code Review — us-455

Reviewed range: `git diff main...HEAD` (product commit `0e1039ffbcec2e2a97f39d2151968766cacedd6d`).

Stack: `node-skills-package` (rule pack `typescript-node.md`). Primary in-scope product paths: `.agents/skills/ws-version/**`, `test/test-ws-version.js`, dual `skill-dependencies.json`, catalog/FEATURES/AGENTS router rows.

## Findings

### CR-001 [Warning] closed test/test-ws-version.js:L212-L213

**Score:** 7/10

**Description:** Ineffective assertion in `testSkillRegisteredInDependencyGraph`. The assert message claims `dependencies.ws-version is []`, but the check was only `Array.isArray(...)`. A non-empty dependency list would still pass, so AC4’s empty-edge contract was not actually gated.

**Proof:**
1. **Read Evidence:** committed `test/test-ws-version.js` L212–L213 used `Array.isArray(bin.dependencies['ws-version'])` / runtime twin with message `is []`.
2. **Executable Failure Scenario:** Edit either `skill-dependencies.json` to `"ws-version": ["ws-changelog"]`; `node test/test-ws-version.js` still reported green for those asserts.
3. **Missing Protection:** No `.length === 0` (or deep-equal to `[]`) on the registered edge list.
4. **Discards:** Package-membership `includes('ws-version')` checks do not prove an empty edge; harness may catch unrelated graph errors but this named test is the AC4 empty-edge gate.

**Sibling occurrences:** Only these two asserts in the committed diff. Peer tests that expect non-empty edges use `.includes(...)`; no other `is []` soft checks in this change set.

**Fix applied (round 1):** Require `Array.isArray(...) && ...length === 0` for both bin and runtime. Re-ran `node test/test-ws-version.js` — exit 0.

```suggestion
assert(
  Array.isArray(bin.dependencies['ws-version']) && bin.dependencies['ws-version'].length === 0,
  'bin dependencies.ws-version is []',
);
```

### CR-002 [Suggestion] open test/test-ws-version.js:L136-L148

**Score:** 4/10

**Description:** Missing/invalid `version.json` coverage includes absent file and broken JSON, but not a parseable object with a non-semver `version` string (helper rejects via `SEMVER_RE`). Optional fixture would lock AC2’s “never invent a semver” path for wrong-shape values.

**Proof:** Helper returns unavailable for non-matching strings; tests do not exercise that branch.

**Sibling occurrences:** None required.

```suggestion
// Fixture: { "version": "1.2.3-beta" } → packageVersion unavailable, non-zero exit, skillDir still printed
```

### Stack Invariant Compliance

| Checklist | Status |
|-----------|--------|
| Node-only (`.cjs` helper; no `.py`) | Pass |
| Host-neutral skill prose / helper strings | Pass |
| Async / floating promises | N/A (sync fs + `console.log`) |
| Boundary validation (`version.json` / `.ws/config.json`) | Pass (parse + shape + semver; unavailable paths) |
| Path / injection | Pass (`__dirname` + fixed relative names; no shell concat) |
| Dual `skill-dependencies.json` membership + `"ws-version": []` | Pass (after CR-001 fix) |
| `scan_stack_invariants.cjs --stack typescript-node` on helper + test | Pass (0 issues) |
| `verification.localReviewCommand` / `preview.localReviewCommand` | Skipped (empty) |
| Fable autoAudit (enabled) | No classic frauds; CR-001 was a weakened check and was tightened |

## Evidence

| Check | Result |
|-------|--------|
| `git diff --name-status main...HEAD` | Product: new `ws-version` skill + tests + deps/catalog/docs; also branch commits include plan/spec/changelog paths outside this fix |
| `node test/test-ws-version.js` (after fix) | exit 0 |
| `node --check .agents/skills/ws-version/scripts/report_version.cjs` | exit 0 |
| Stack invariant scan | 0 Critical, 0 Warning |
| MEMORY sweep | No confirmed DO NOT violations (dual deps + Node-only followed) |

## Diff hygiene

- Additive skill package; surgical router/deps/docs updates.
- Integrity / version bump deferred to Step 8 per plan (not reviewed as a product-logic defect).
- Working-tree fix only: `test/test-ws-version.js` (not committed).

## Apply fixes?

Round 1 applied for CR-001. No open Critical/Warning remain. CR-002 Suggestion left open (optional). Ready to Advance.

## Learning

`Learning: N/A (standard implementation)` — no new durable trap beyond the one-time weak assert, which is now fixed in-tree.
