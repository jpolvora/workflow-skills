### [2026-10-12] Verify repo convention before rebutting reviewers (us-504 follow-up)

- **Layer**: orchestration
- **Module**: ws-fix-pr, git
- **Severity**: High
- **PathPattern**: `.ws/memory/**`, `.ws/.gitignore`
- **Scenario / Context:** On PR #512 I rebutted three review threads claiming memory trap sources are local-only by design (citing a `git check-ignore` match), resolved them, and the re-run reviewer proved me wrong: `git ls-files .ws/memory` shows 212 tracked source files, so my 3 traps truly lacked backing files. Fixed by force-adding the sources (`memory/**` is gitignored, `-f` required) in commit `91e7e70a`.
- **DO NOT:** Rebut a reviewer with a design claim verified only by ignore rules or local-disk state; `check-ignore` matches do not describe tracking status, and local disk is not the CI/fresh-clone ground truth.
- **INSTEAD DO:** Run `git ls-files <dir>` to establish the tracked convention first; when the reviewer is right, resolve with an explicit correction naming the mistaken rebuttal; force-add (`-f`) files the design tracks despite gitignore, recompile to prove stability, and push the fix to the same PR branch.
