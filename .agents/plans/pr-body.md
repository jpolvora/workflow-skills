## Summary
- Add a shared bootstrap **feature-branch gate** (setup.md §5b) after Identity and before Baseline: create `feat/{slug}` from HEAD, from `{baseBranch}`, or stay.
- Resume skips 5b; HEAD vs `state.branch` mismatch STOPs with checkout-recorded / cancel (4b). `autoMode` stays on current HEAD.
- Workflow-mode `ws-ship-pr` uses `state.branch` as PR head and skips `git pull` when the branch has no upstream (first push). Standalone still defaults to `workingBranch`. AutoConfig / configure-project changes are **not** in this PR.

## Test plan
- [x] `node test/test-feature-branch-gate.js` (AC1–AC11)
- [x] `npm run test` (install Phase 0b + contract suites)
- [x] `npm run verify-integrity`
- [x] `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` (0 issues)
- [ ] CI on this PR
