# Plan — fix(ws-goal-fix-pr): execute resolveReviewThread GraphQL mutation after posting thread fix replies

**US:** 168
**Slug:** us-168-resolve-review-thread
**Spec:** `.agents/plans/us-168-resolve-review-thread/step-00-us-168-resolve-review-thread.spec.md`

## Summary

Enhance `resolve_thread.cjs` under `ws-github-provider` to fall back to `gh auth token` if environment variables are not set, and ensure `ws-goal-fix-pr`, `ws-fix-pr`, and `ws-github-provider` documentation explicitly require executing the `resolveReviewThread` GraphQL mutation after posting thread fix replies so that GitHub PR review threads transition to `isResolved: true`.

## Proposed Changes

### `ws-github-provider`

#### [MODIFY] [resolve_thread.cjs](file:///l:/source/workflow-skills/.agents/skills/ws-github-provider/scripts/resolve_thread.cjs)
- Add fallback in `resolveToken()` to execute `gh auth token` via `child_process.execSync` if environment variables are missing.
- Ensure clean error handling if both environment variables and `gh` token resolution fail.

#### [MODIFY] [SKILL.md](file:///l:/source/workflow-skills/.agents/skills/ws-github-provider/SKILL.md)
- Document `resolveReviewThread` GraphQL mutation and fallback token behavior.

### `ws-goal-fix-pr`

#### [MODIFY] [SKILL.md](file:///l:/source/workflow-skills/.agents/skills/ws-goal-fix-pr/SKILL.md)
- Update step instructions to explicitly mandate executing `resolveReviewThread` GraphQL mutation (`resolve_thread.cjs` or `gh api graphql`) after addressing review threads.

### `ws-fix-pr`

#### [MODIFY] [SKILL.md](file:///l:/source/workflow-skills/.agents/skills/ws-fix-pr/SKILL.md)
- Ensure thread resolution step references `resolve_thread.cjs` and the `resolveReviewThread` GraphQL mutation.

## Verification Plan

### Automated Tests
- Run `node .agents/skills/ws-github-provider/scripts/resolve_thread.cjs` without arguments to verify usage and token resolution.
- Run `npm run test` to verify installer and integrity tests pass.
- Run `node bin/cli.js --help` to check CLI functions.
- Run `ws-check-harness` to verify harness integrity.
