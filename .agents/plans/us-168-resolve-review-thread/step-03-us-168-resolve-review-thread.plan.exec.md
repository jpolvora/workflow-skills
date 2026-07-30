# Execution Plan — fix(ws-goal-fix-pr): execute resolveReviewThread GraphQL mutation after posting thread fix replies

**US:** 168
**Slug:** us-168-resolve-review-thread

## DAG Tasks

### Task 1: Enhance `resolve_thread.cjs` Token Fallback
- **Target File:** `.agents/skills/ws-github-provider/scripts/resolve_thread.cjs`
- **Action:** Add `child_process.execSync('gh auth token')` fallback when environment variables (`AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN`, `GITHUB_TOKEN`, `GH_TOKEN`) are not set in `resolveToken()`.

### Task 2: Update Skill Instructions & Docs
- **Target Files:**
  - `.agents/skills/ws-github-provider/SKILL.md`
  - `.agents/skills/ws-goal-fix-pr/SKILL.md`
  - `.agents/skills/ws-fix-pr/SKILL.md`
- **Action:** Document the explicit execution of `resolveReviewThread` GraphQL mutation and `resolve_thread.cjs` usage when resolving review threads.

### Task 3: Verification
- Run `node .agents/skills/ws-github-provider/scripts/resolve_thread.cjs` to test token resolution.
- Run `npm run test` and `ws-check-harness` to ensure integrity.
