# Refined Plan — fix(ws-goal-fix-pr): execute resolveReviewThread GraphQL mutation after posting thread fix replies

**US:** 168
**Slug:** us-168-resolve-review-thread
**Spec:** `.agents/plans/us-168-resolve-review-thread/step-00-us-168-resolve-review-thread.spec.md`
**Base Plan:** `.agents/plans/us-168-resolve-review-thread/step-01-us-168-resolve-review-thread.plan.md`

## Refinement Summary

Plan reviewed and validated in `autoMode`. Architecture and file targets confirmed:
1. `resolve_thread.cjs` under `ws-github-provider` script directory will be updated with `execSync('gh auth token')` fallback when environment variables are not set.
2. Skill documentation files (`ws-goal-fix-pr/SKILL.md`, `ws-fix-pr/SKILL.md`, `ws-github-provider/SKILL.md`) will be updated to explicitly state the requirement to execute `resolveReviewThread` GraphQL mutation (`gh api graphql -F threadId="$THREAD_ID"...` or via `resolve_thread.cjs`) to transition thread status to `isResolved: true`.

## Confirmed Target Files

- `.agents/skills/ws-github-provider/scripts/resolve_thread.cjs`
- `.agents/skills/ws-github-provider/SKILL.md`
- `.agents/skills/ws-goal-fix-pr/SKILL.md`
- `.agents/skills/ws-fix-pr/SKILL.md`

## Verification Requirements

- Execute `resolve_thread.cjs` script locally without arguments to verify usage message and token lookup fallback logic.
- Run test suite: `npm run test`
- Run harness audit: `ws-check-harness` (or script check)
