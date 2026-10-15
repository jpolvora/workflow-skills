# Chapter 09 — Ship the PR and Fix Every Review Thread

## Video metadata

- **YouTube title:** Ship the PR and Fix Every Review Thread | Workflow Skills #9
- **Thumbnail text:** SHIP + FIX
- **Description (first lines):** Quiet ship preflight, push, PR creation with auto-close, CI triage, then the fix-PR convergence loop: plan on the reviewer model, execute, sweep the defect class, resolve to zero.

## Learning objectives

After this video, the viewer can:

1. Walk close → preflight → dry-run → push → PR → CI without unnecessary prompts.
2. Run `ws-fix-pr` (one pass) and `ws-goal-fix-pr` (convergence loop) and explain the difference.
3. Explain plan-before-edit, the same-class sweep, and merge discipline.

## Before you record

1. Demo PR open with two review threads (one real defect, one same-class sibling).
2. GitHub CLI (`gh`) or Azure CLI authenticated; show provider parity verbally.
3. `preview.dryRunCommand` configured for the dry-run cameo (or explicit `false` to show the skip).

---

## Narration script

[ON SCREEN: the Prepare-to-PR board.]

Welcome back. From Spec to Delivery.

The code is verified, reviewed, re-verified, and tested. Today it leaves the building. Shipping, and then the part of shipping everyone dreads: other people's review comments. We will converge them to zero, systematically, without the midnight manual session from Chapter Zero.

Shipping starts before the push, at **close**. [PAUSE] In the standard pipeline, closing is Step Eight's first half, and it already happened in our Chapter Five story: implementation marked `status: completed`, memory and changelog written, delivery artifacts recorded. `completed` means the work is done. A separate field, `shipStatus`, tracks the delivery. Conflating "done" with "merged" is how teams lose track of finished work sitting unshipped. This system never conflates them.

Then, **quiet preflight**. [ON SCREEN: preflight resolving fields.] The ship skill resolves head, base, remote, provider, and commit title from state, then git, then config, then auto-detection, and asks you only about genuine ambiguity. Same-branch runs are classified for you: a feature branch opens a PR into base; a shared head pushes and opens into the configured base; a head equal to every base pushes only, no PR, because no host accepts a PR from a branch into itself. You answer questions when the answer is actually unknown. Not as a ritual.

Next, the **non-blocking dry-run**. After push and before PR creation, the ship step runs your configured preview command exactly as written, when `previewBeforeShip` is on, which is the default. Findings, even a failing exit, are reported on the Prepare-to-PR board and never block shipping. It is a smoke alarm, not a lock. If your project keeps no preview, the gate skips with a recorded reason. Silence is never the skip signal; the board says why.

[DEMO: push, PR creation, the `Closes #` line in the body.]

Push, then pull request. On GitHub, the body carries `Closes #` plus the tracker id, so merging into the default branch closes the source issue automatically. The tooling guarantees that line idempotently; a body that already closes the issue is left alone, and local specs with no id skip it cleanly. After the PR opens: CI triage. PR status is checked, failures are read, and the enriched status distinguishes your failures from flaky neighbors. Wait about thirty seconds after creation for reviewers and checks to actually start. The ship checklist says so, because racing an empty thread list is how "zero threads" lies get told.

[PAUSE]

Now the threads arrive. [ON SCREEN: the two review threads.] Enter the fix-PR discipline. Two skills, one contract. `ws-fix-pr` is a single pass: read the threads, fix, reply, resolve. `ws-goal-fix-pr` is the convergence loop: repeat rounds with heartbeat waits until active threads equal zero, then merge. Same fixes. Different patience.

Every round, in both, **plans before it edits**. [ON SCREEN: the round gate artifact.] The plan batch runs on the reviewer-class model and writes the complete gate: which threads, which files, which fixes, in which order. Only then does execution, on the execution-class model, validate and apply it. In standard runs each round batch executes in a fresh worker while your session owns the loop. Hosts without subagent dispatch run the identical contract inline. The gate is the same; only the chair changes.

Three rules make the loop trustworthy. **Rule one: sweep the class.** Before resolving a thread, search the repo for the same defect pattern and fix the class, or record an explicit exemption. Reviewers reopen classes, not lines. Fix the class and the thread stays closed. **Rule two: surgical commits.** The batch starts from whatever dirty tree you honestly have, snapshots it, stages only the thread-fix paths, and never runs a whole-tree stash or `git add -A`. Your unrelated work is not the loop's business. **Rule three: resolve last.** A thread is resolved only after the reply is posted and the fix commit is verified. Resolve is a conclusion, not a hope.

The loop's heartbeat re-checks threads and checks on a timer, three hundred seconds by default in the ship flow, until convergence. Convergence means zero active threads and green required checks. Then merge, and the tracker item closes on any base through the close-issue operation. The comment-only operation exists too, for when you want a status note without changing tracker state. Names differ by intent, and the intent is explicit every time.

[ON SCREEN: the merged PR, zero threads.]

[PAUSE] Look at the board. Merged. Zero threads. Issue closed. State records the PR number, URL, and final ship status, so next month's "did that ship?" is a file read, not an archaeology dig.

That is one feature, end to end. Next video, we zoom out: what happens when you have thirty specs, an index, a board, and a wiki that must not rot.

## Usage examples

```text
Ship this run: ws-ship-pr
Fix threads once: ws-fix-pr
Converge to zero: ws-goal-fix-pr        (loop until activeThreads == 0, then merge)
```

Ship behavior to point at on screen:

```text
close (status: completed) -> quiet preflight -> push -> preview dry-run (non-blocking)
-> create PR (body keeps "Closes #{id}" on GitHub) -> check-pr-status CI triage
-> fix-PR rounds: fixPrPlan (reviewer model) -> fixPrExec (execution model)
-> resolve threads only after reply + verified commit -> merge -> close-issue
```

Surgical batch rules (say them verbatim once):

```text
snapshot preExistingDirty . stage only fix paths (git add --) . never git add -A
never whole-tree stash . sweep the defect class before resolving
```

## Features in this chapter (enumerated)

1. Close-before-ship semantics: `status: completed` at close; `shipStatus`/`prNumber`/`prUrl` written back to state after delivery.
2. Quiet ship preflight resolves head/base/remote/provider/title (state → git → config → auto-detect) and classifies feature / shared-head / push-only runs.
3. Non-blocking preview dry-run (`preview.dryRunCommand`, `previewBeforeShip` default on) after push, before Create PR; findings never block.
4. GitHub PR auto-close (`Closes #{id}`, idempotent) and post-merge `close-issue` on any base; `comment-issue` stays comment-only.
5. Fix-PR plan-before-edit: `fixPrPlan` (reviewer model) writes the gate, `fixPrExec` (execution model) applies it; fresh worker per round, Tier 3 inline fallback with identical contracts.
6. Convergence loop (`ws-goal-fix-pr`): heartbeat re-checks until `activeThreads == 0`; proactive same-class sweep before resolve; surgical staging only.
7. Hermes delivery disciplines: prior-work sweep, design-intent history, repo-wide defect-class fixes, CI triage via extended PR status.

## Common mistakes

1. Resolving a thread when the fix is written but not committed and verified. Resolve is the last act of a round, never the first.
2. Declaring victory on an empty thread list checked five seconds after PR creation. Wait for reviewers and CI to start (≈30 s), then converge.
3. Whole-tree stash or `git add -A` during a fix batch. Snapshot the pre-existing dirty state and stage only your fix paths.

## Recap (say this)

"Close means done. Ship means delivered. Converged means zero threads. Next: thirty specs, one board."

## Practice

Open any old PR with unresolved threads (or create two on the demo PR). Run one `ws-fix-pr` pass and read the round gate before execution. Then run `ws-goal-fix-pr` and time how long convergence actually takes.

## Next video

Chapter 10 — Manage Specs at Scale: Index, List, Kanvas, Organizer.
