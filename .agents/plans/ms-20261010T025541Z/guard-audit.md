# Foreign-commit guard audit — ms-20261010T025541Z

Baseline store: `foreign-commits.json` (branch `main`, the run `baseBranch`). The guard is git-read-only; its only write is that sidecar.

## Dispatch 1 — us-492

| Step | Result |
|------|--------|
| `check-advance` | exit `2` (no baseline yet — first dispatch, proceed) |
| `record-baseline` | exit `0` · local `3490363` · remote `3490363` |
| `check-convergence` | exit `0` · PR #499 head `0a6cb30` == local tip `0a6cb30` |
| merge | `gh pr merge 499 --merge` exit `0` · state `MERGED` · merge commit `8eecfd4f` |
| issue | #492 auto-closed (`CLOSED` / `COMPLETED`) via `Closes #492` |

Foreign commits in the PR #499 range (`3490363..0a6cb30`) — disclosed in the PR body and archived at `PR-499-foreign-commit-audit.md`: 7 commits, all prior repo work already pushed on `origin/develop` (spec import, spec-memo config, memory records, batch history). None authored by a third-party writer.

## Dispatch 2 — us-497-link-integrity

| Step | Result |
|------|--------|
| `check-advance` | exit `1` — unexpected advance on `main` |
| named commits | `6e3f6544, ba88954a, 614281c3, af5e300a, 1110317a, 0a74caff, 83c2cbbf` (the 7 pre-batch `develop` commits) + `df3a7559, 05eafbb9, 1ae28047, 0a6cb30f` (us-492) + `8eecfd4f` (own PR #499 merge); the helper prints the local and remote lists, so the set appears twice |
| classification | **own + pre-existing advance, not foreign**: every commit is either this batch's us-492 work, this batch's own merge commit, or a commit already on `origin/develop` before the run started. Single worktree (`git worktree list` → only `L:/source/workflow-skills`), no concurrent writer. |
| user gate | Resume chosen (accept the advance, re-record baseline, continue) |
| `record-baseline` | exit `0` · local `8eecfd4` · remote `8eecfd4` |

Post-merge sync for item 1: `origin/main` was already at the merge commit (`8eecfd4f`); local `main` and local `develop` were fast-forwarded to `8eecfd4f` (`git fetch origin main:main`, since a checkout was blocked by the dirty working tree).

## Item 2 close — us-497-link-integrity

| Step | Result |
|------|--------|
| `check-convergence` | exit `0` · PR #500 head `0361093` == local tip `0361093` |
| `list-foreign` (`8eecfd4..0361093`, own = 7 us-497 commits) | exit `0` · **none detected** — quiet path, so no foreign-commit block was added to the PR body (nothing to disclose); PR-body disclosure was only used for PR #499, which had a non-empty range |
| merge | `gh pr merge 500 --merge` exit `0` · state `MERGED` · merge commit `b601313a` |
| issues | #497, #496, #493 all `CLOSED` / `COMPLETED` via the three `Closes` lines in the PR body |
| post-merge sync | `origin/main` `8eecfd4..b601313`; local `develop` fast-forwarded to `b601313a` |

## Dispatch 3 — us-498-install-mode-reporting

| Step | Result |
|------|--------|
| `check-advance` | exit `1` — unexpected advance on `main` |
| named commits | `190356a7, f1d85b2d, e9bb9785, 377d1d67, 4a7a33b1, 020ce306, 03610931` (us-497) + `b601313a` (own PR #500 merge); local/remote lists repeat |
| classification | **own advance** — every commit belongs to this batch's us-497 item or its merge; single worktree, no third-party writer |
| user gate | Resume chosen (accept the advance, re-record baseline, continue) |
| `record-baseline` | exit `0` · local `b601313` · remote `b601313` |

