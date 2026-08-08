---
slug: interview-project-context-auto-answer
status: delivery
workflowId: interview-project-context-auto-answer-20260808T034812Z
shipAction: create-pr
fullMode: true
autoMode: true
packageVersion: 0.0.118
deliveredAt: 2026-08-08T03:55:00Z
---

# Delivery Result — interview-project-context-auto-answer

## Summary

Shipped project-context grounded auto-resolution for `ws-interview`: mandatory project-context sweep before escalate/defaults; registry `resolutionSource` / evidence; `autoMode` model-inferred vs interactive `user-gate`. Cross-linked `gates.md` and `PROTOCOLS.md` 2b. Package bumped to **0.0.118** with integrity regenerate.

## Artifacts

| Step | Path |
|------|------|
| Spec | `step-00-interview-project-context-auto-answer.spec.md` |
| Plan | `step-01-interview-project-context-auto-answer.plan.md` |
| Classify | `step-00-interview-project-context-auto-answer.classify.md` (recommended standard; override-lite) |
| Review | `step-06-interview-project-context-auto-answer.review.md` (clean) |
| Result | `step-08-interview-project-context-auto-answer.result.md` |

## Code changes

- `src/skills/ws-interview/SKILL.md`
- `src/skills/ws-interview/evals/evals.json`
- `src/skills/ws-shared/gates.md`
- `src/skills/ws-spec-to-pr/PROTOCOLS.md`
- `bin/skill-integrity.json`, site catalog, version sync (0.0.118)

## Benchmark

| Metric | Value |
|--------|-------|
| Mode | auto + full |
| Pipeline | lite (override from classify=standard) |
| Review | clean (0 Critical/Warning) |
| Tests | `npm run test` pass |
| Integrity | `npm run verify-integrity` OK @ 0.0.118 |

## Prepare to PR (final)

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | Test coverage | ⏭ | Protocol/docs + evals; no app runtime code |
| 2 | Build | ⏭ | No `backendBuild`; site rebuilt via `build-site:bump` |
| 3 | Tests | ✅ | `npm run test` pass after integrity |
| 4 | Security / leak scan | ✅ | Diff grep — no credential patterns |
| 5 | Fable-judge | ✅ | VERIFIED WITH CAVEATS — see below |
| 6 | Consumer/upstream prepare | ✅ | Upstream ship gate: integrity + bump + tests |
| 7 | Board shown; ready | ✅ | this result |

### Fable-judge verdict

**VERIFIED WITH CAVEATS**

- Ground truth: `git diff origin/main...HEAD` shows interview protocol + cross-links + plans; claims match files.
- Tests green after `generate-integrity` + version bump.
- Caveat: classifier recommended `standard`; workflow continued `lite` per explicit `/ws-spec-to-pr-lite` invocation (logged override-lite).
