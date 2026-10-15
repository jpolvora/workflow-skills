# Chapter 08 — Review, Fresh Verify, and Testing That Actually Prove Work

## Video metadata

- **YouTube title:** Review, Fresh Verify, and Testing That Actually Prove Work | Workflow Skills #8
- **Thumbnail text:** TRUST NO ONE
- **Description (first lines):** Two-phase adversarial review, a fresh worker who re-derives every verdict and injects faults, secrets scanning, and a test battery with mutation or sabotage. Proof, not vibes.

## Learning objectives

After this video, the viewer can:

1. Run the two-phase local review and its fix → re-review loop (max 3).
2. Explain fresh verification: fresh eyes, one fault per criterion, evidence-or-zero.
3. Configure testing: unit/integration/E2E, coverage, mutation or sabotage, and the secrets scan.

## Before you record

1. Demo branch with a committed product diff and one deliberate review finding planted.
2. `step-06` review output and `step-05b` fresh-verify report from a prior run to show.
3. Threshold visible: `verification.mutationThreshold`.

---

## Narration script

[ON SCREEN: a review report.]

Welcome back. From Spec to Delivery.

Your code passed verification with a nine. Congratulations. Now three skeptics get their turn. Today: the local code review, the fresh verifier, and the test battery. Their shared motto, and the thumbnail is honest: trust no one. Especially not the author. Especially when the author is an agent. Especially when it is the same agent grading its own homework.

**Skeptic one: the local review,** `ws-code-review`. [PAUSE] It reviews the committed diff, base to HEAD. Not the working tree, not a vibe. The committed range. That is why Chapter Five committed before review. If product files are still uncommitted, the step stops. No diff, no review.

The review runs in two phases. Phase one, triage: what changed, where is the risk, which areas deserve depth. Phase two, adversarial proof: findings must argue exploitability, in a four-part proof, before they count against you. That structure matters. It separates "this could theoretically matter" from "here is the input, here is the path, here is the damage." Stack rule packs for your platform ride along, so platform invariants are checked by name, not by reviewer memory.

Findings are graded. Critical or Warning findings open a fix loop: implementation fixes, re-review, at most three rounds. Fixes land as their own product commit, so the history reads verify commit, review commit, clean story. After three rounds with residual critical findings, the run Pauses with the list. It does not merge around them. [DEMO: show the planted finding, one fix round, clean re-review.] One planted finding, one fix, one clean re-review. On a real team branch, budget for round two. Round three is a smell; bring a human.

An optional jury setting can run one to three reviewers and merge their findings, with warnings kept as the union, never averaged away. And a configured local review command can dry-run the same preview reviewers will use. Both are config, both are off until you ask.

[PAUSE]

**Skeptic two: the fresh verifier,** `ws-fresh-verify`, step six B. [ON SCREEN: the fresh-verify report.] This is my favorite step in the whole system, so let me sell it properly. A brand-new worker receives the spec, the plan of record, and a compact handoff. Not the implementation chat. Not the author's reasoning. It re-derives every acceptance verdict from the evidence, as if the code were written by a stranger. Because to this worker, it was.

Then it gets rude. For each acceptance criterion, it injects one deliberate fault on a scratch copy of the tree and checks that something turns red. Your real branch never moves; the scratch tree is removed after. The scoring rule is evidence-or-zero. A criterion with no observed pass evidence scores zero for that row. A fault no test catches scores as a defect even if the feature "works" when you click it. Defects loop: fix, re-verify, at most three rounds, then Pause with the residual list. Runs with no product changes write an explicit skip marker instead of fake verdicts. No product, no theater.

Why both review and fresh verify? [PAUSE] Review reads the diff like a senior engineer. Fresh verify interrogates the spec like an auditor. They catch different animals. Review finds the risky line. Fresh verify finds the criterion everybody believed and nobody tested.

**Skeptic three: the test battery,** `ws-testing`. Unit, integration, and end-to-end suites from your configured commands, with coverage. The testing step never edits product or test sources; it runs, measures, and reports, and routes failures back to implementation as fixes. Two honesty settings from Chapter Seven live here: mutation testing when configured, failing under your threshold, default eighty. Or sabotage when mutation is unset, deliberately breaking assertions to prove the suite can fail. Either way the step answers one question with data: does this suite actually guard this change?

And riding shotgun before ship: **the secrets and PII scan,** `ws-secrets-leak-review`. It audits the change for leaked credentials and personal data, and offers an optional pre-commit hook, installed only when you ask. Findings here are the cheapest security incident you will ever have. The one in production is the expensive kind.

[ON SCREEN: back to you.]

Notice the pattern across all three skeptics. Fresh context. Named evidence. Bounded retries. A Pause instead of a shrug. That pattern is the product, honestly. The pipelines are just where it lives.

Next video: the payoff. Push, pull request, CI, and the fix-PR loop that hunts review threads down to zero.

## Usage examples

```text
Review my branch: /code-review base=develop
Run ws-fresh-verify for slug csv-export
Run the test battery: ws-testing for slug csv-export
Scan for leaks: ws-secrets-leak-review
```

Reports to show on screen:

```text
step-06-{slug}.review.md (+ .fix.report.md)     <- two-phase review + fix rounds
step-05b-{slug}.fresh-verify.md                <- per-AC verdicts + fault outcomes
step-07-{slug}.testing.*                       <- suite, coverage, mutation/sabotage
```

Config knobs named in this chapter:

```jsonc
"defaults": { "reviewJury": 1 },               // 1–3 reviewers, warnings kept as union
"verification": { "mutationThreshold": 80 }    // unset mutation -> sabotage instead
```

## Features in this chapter (enumerated)

1. Two-phase adversarial review (Triage → 4-part Proof of Exploitability) over the committed `{base}...HEAD` diff, with stack rule packs.
2. Fix → re-review loop (max 3) with a separate product commit for fixes; residual Critical findings Pause the run.
3. Fresh-worker re-verification (Step 6b): independent AC re-derivation, one fault injection per AC on a scratch worktree, evidence-or-zero scoring, fix + re-verify (max 3).
4. Review jury option (1–3 reviewers, union of warnings) and `localReviewCommand` dry-run parity with PR reviewers.
5. Test battery (`ws-testing`): unit/integration/E2E, coverage, mutation threshold gate, or regression sabotage when mutation is unset; testing never edits sources.
6. Secrets & PII leak scan (`ws-secrets-leak-review`) with an optional, explicitly requested pre-commit hook.

## Common mistakes

1. Reviewing an uncommitted working tree. The review diffs `{base}...HEAD`; commit the product files first (the G2 gate enforces this).
2. Asking the implementing worker to grade its own criteria. Fresh verify exists precisely to use a clean context.
3. Treating a green suite as proof. Without mutation or sabotage evidence, green only proves the tests passed, not that they can fail.

## Recap (say this)

"Review reads the diff. Fresh verify interrogates the spec. Testing proves the guard works. Next: ship it."

## Practice

Plant a small bug that no current test catches (swap a comparison, drop a permission check). Run fresh verify and testing. Write down which skeptic caught it, and which round. That table is your team's best argument for keeping Step 6b.

## Next video

Chapter 09 — Ship the PR and Fix Every Review Thread.
