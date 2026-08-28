---
id: 168
slug: us-168-resolve-review-thread
title: "fix(ws-goal-fix-pr): execute resolveReviewThread GraphQL mutation after posting thread fix replies"
source: github
issueState: closed
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/168"
specDate: 2026-07-29
status: completed
---

# Specification — fix(ws-goal-fix-pr): execute resolveReviewThread GraphQL mutation after posting thread fix replies

**State:** open

## Description

### Problem
When `ws-goal-fix-pr` / `ws-fix-pr` addresses a PR review thread, it posts a reply comment detailing the resolution. However, posting a comment reply via the REST API or `gh` CLI does not set GitHub's GraphQL `isResolved` field to `true` on the thread.

As a result, if `ws-ship-pr` or `ws-goal-fix-pr` attempts to merge the PR, the review thread remains open (`isResolved: false`) in GitHub's GraphQL API and UI, even though fixes were pushed and comments were added.

### Root Cause
Replying to a PR review comment (`POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies`) adds a response to the thread conversation but does not execute GitHub's `resolveReviewThread` GraphQL mutation.

### Solution
In `ws-goal-fix-pr`, `ws-fix-pr`, and `ws-github-provider`, after posting a thread resolution reply or verifying that a thread fix is committed, explicitly execute the `resolveReviewThread` GraphQL mutation:

```graphql
mutation($threadId: ID!) {
  resolveReviewThread(input: { threadId: $threadId }) {
    thread {
      id
      isResolved
    }
  }
}
```

Command:
```bash
gh api graphql -F threadId="$THREAD_ID" -f query='mutation($threadId: ID!) { resolveReviewThread(input: { threadId: $threadId }) { thread { isResolved } } }'
```

This ensures thread status transitions to `isResolved: true` in GitHub's GraphQL API and UI prior to triggering PR merge gates.

## Acceptance Criteria

- [ ] AC1: `ws-goal-fix-pr` / `ws-fix-pr` / `ws-github-provider` instructions and scripts specify executing `resolveReviewThread` GraphQL mutation (`gh api graphql -F threadId="$THREAD_ID"...`) after replying to a thread or resolving a thread.
- [ ] AC2: `ws-github-provider` documents how to fetch `threadId` (GraphQL `reviewThreads` node `id`) and resolve review threads.
- [ ] AC3: Error handling / graceful fallback is documented if `resolveReviewThread` fails or thread ID is not available.
- [ ] AC4: Automated tests (`npm run test`) and harness checks (`ws-check-harness`) pass cleanly with 0 errors.

## Notes

- issue: #168
- repo: jpolvora/workflow-skills
