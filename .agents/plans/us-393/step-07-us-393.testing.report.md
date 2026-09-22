---
slug: us-393
step: 7
workflowId: us-393-20260922T080709Z
status: completed
startedAt: "2026-09-22T08:55:01Z"
endedAt: "2026-09-22T09:05:00Z"
acRefs: [AC8]
---

# Testing Report — us-393

## Surface

Machine probe: the package test surface exists (`test/`, 115 entries). `verification.backendTest` = `npm run test`.

## Commands and results

| Command | Exit | Result |
|---------|------|--------|
| `npm run test` | 0 | 115/115 entries passed (mode=local) |
| `node test/test-harness-clean.js` | 0 | Harness OK (upstream clean) — 0 findings |
| `node .agents/skills/ws-check-workflows/scripts/check_workflows.cjs` | 0 | 0 issues; ws-spec-multi simulation PASS |
| `node bin/validate-evals.cjs` | 0 | 54 eval files validated |
| `npm run verify-integrity` | 0 | `bin/skill-integrity.json` matches tree (v0.4.54) |

## Coverage of the change

- The new eval case (id 3) is schema-valid and its assertions map to AC1–AC6.
- No `.py` added; no script touched, so no unit surface changed.
- Mutation testing skipped (`defaults.skipMutationTesting: true`); regression sabotage not required for a docs/eval-only change.

## Verdict

Green. No test failure to hand off to `ws-implement-tasks`.
