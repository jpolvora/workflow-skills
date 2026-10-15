# Chapter 07 — Quality Gates and the Verify Score (Why 9 Is the Bar)

## Video metadata

- **YouTube title:** Quality Gates and the Verify Score (Why 9 Is the Bar) | Workflow Skills #7
- **Thumbnail text:** SCORE ≥ 9
- **Description (first lines):** The verify score is derived from the acceptance ledger, never authored by the agent. Caps, refinement rounds, sabotage, mutation, and every fail-closed gate, explained with live numbers.

## Learning objectives

After this video, the viewer can:

1. Explain how the 0–10 score is derived from `ac-ledger.json` and why it cannot be gamed.
2. Name the two score caps (uncovered negative scenarios → 8; critical invariants → below the bar).
3. Walk `scoreAndRefine`, Reach-10, pre-advance validation, and the G2 commit gates.

## Before you record

1. Throwaway run where verify lands at 8 (leave one negative scenario uncovered on purpose).
2. `ac-ledger.json`, one verify report, and `gates.md` open.
3. Config showing `defaults.minVerifyScore: 9`.

---

## Narration script

[ON SCREEN: a verify report with a score.]

Welcome back. From Spec to Delivery.

Today, the number that runs the pipeline. The verify score, zero to ten, and the bar it must clear. Default nine. By the end of this video you will know where the number comes from, why the agent cannot inflate it, and exactly what happens at eight. Especially at eight.

Start with the ledger. [ON SCREEN: `ac-ledger.json`.] When your spec registered in Chapter Four, the system created an acceptance ledger: one row per criterion, each row waiting for evidence. At Step Five, `ws-plan-verify` runs your configured verification commands, matches observed results to ledger rows, and derives the score. Derives. [PAUSE] The agent does not write the number. The agent cannot edit the number. The script computes it from evidence, lists the deficiency of every failing row, and persists the result. A dry-run verify mode shows the computation without advancing anything, and the ledger itself is hash-protected, so hand-tuning it reads as tampering, not initiative.

Why is the bar nine and not seven, or ten? [PAUSE] Ten demands perfection, and perfection gates teach agents to hide uncertainty. Seven lets two criteria slide, and sliding criteria are how "mostly done" ships. Nine says: essentially complete, with at most a minor, named gap. And the bar is yours: `minVerifyScore` in `defaults`, one to ten. Teams do set it to ten for regulated code. The default stays nine, and omitted means nine, never zero. Know your number before the run starts, never negotiate it mid-run.

Now the two caps, and these are exam questions. [ON SCREEN: big numbers 8 and 7.]

Cap one: **eight.** Remember Chapter Four, Negative and Failing Test Scenarios? If a negative scenario has no observed passing test, that is a known defect by definition, and the score caps at eight. Below the bar. Always. The fix is not an argument; the fix is a test that exercises the failure path and passes.

Cap two: **below the bar, effectively seven territory.** The plan carries stack invariant checks, the architectural rules of your platform. A critical invariant violation caps the score under the bar and forces refinement. You cannot out-score a broken invariant with happy-path evidence.

[DEMO: the throwaway run at 8. Show the deficiency list, add the missing negative test, re-verify to 9+.]

On screen: my deliberate failure. Score eight, deficiency list naming the uncovered negative scenario. Notice the UX: the report does not say "failed." It says which row, which evidence is missing, and what would close it. [PAUSE] I add the failure-path test, the scenario passes, re-verify: nine. The gate opens. That loop has a name, `scoreAndRefine`: flagged tasks go back to implementation, then re-verification, at most three rounds, then the run Pauses for a human. Three rounds is a design statement. If three honest attempts cannot close the gap, the gap is a decision, and decisions belong to people.

Two refinements on top. When effort is low, the system may offer a Reach-10 gate: spend a little more, polish the last point. Optional, never required. And when the score already clears the bar, an optional second pass, also under `scoreAndRefine`, reviews the whole diff for over-engineering: simplify criteria, delete unused files, tests, methods, and classes the workflow introduced and nothing uses. Passing the bar is not a license to keep scaffolding.

[PAUSE]

Around the score sit the structural gates, and they all fail closed. [ON SCREEN: gates list.] Pre-advance validation re-checks the state file before every step transition. The G2 commit gates demand product files committed before review, and delivery commits dual-write the JSON and Markdown state so the two never drift. Memory consultation is proven in the step output at implementation and review; missing proof fails the gate. And the pre-ship doc trio — wiki, spec index, changelog — blocks the ship phase when `requirePreShipDocSync` is on, which is the default. A wiki that does not exist yet warns and skips. The index and changelog never skip.

Last: honesty machinery in testing, previewed here, detailed next chapter. When mutation testing is configured, a score under your threshold, default eighty, fails the test step. When it is not configured, sabotage runs instead: assertions are deliberately broken to prove the suite notices. Either way, the question is the same. [PAUSE] "If this code regressed tomorrow, would anything turn red?" If the answer is no, the pipeline says so, out loud, before your customers do.

[ON SCREEN: back to you.]

The score is not bureaucracy. The score is the moment "the agent says it works" becomes "here is the evidence, row by row." Next video: the reviewers. Local code review, the fresh verifier who trusts nobody, and the test battery.

## Usage examples

```bash
# What the scorer sees (golden-path help surface)
node .agents/skills/ws-shared/runtime/scripts/ac_ledger.cjs score --help
node .agents/skills/ws-shared/runtime/scripts/ac_ledger.cjs verify --help

# Watch your bar and caps in config
# .ws/config.json -> "defaults": { "minVerifyScore": 9 }
# .ws/config.json -> "verification": { "mutationThreshold": 80 }
```

Spoken trace for one criterion (show the chain on screen):

```text
spec AC line -> ac-ledger.json row -> verification output -> step-05 report row -> score
negative scenario w/o passing test -> cap 8 | critical invariant violation -> cap below bar
```

## Features in this chapter (enumerated)

1. Derived 0–10 verify score computed from `ac-ledger.json` evidence; the score cannot be authored or overridden; dry-run `verify` mode included.
2. Configurable bar `defaults.minVerifyScore` (1–10, default 9, omitted → 9) with `scoreAndRefine` re-implementation rounds (max 3, then Pause).
3. Caps: uncovered `negativeScenarios` cap at 8; critical stack-invariant violations cap below the bar; per-task test-adequacy review catches thin tests at plan time.
4. Optional Reach-10 offer at low effort, and an over-engineering second pass (remove unused workflow-introduced artifacts) when already above the bar.
5. Structural gates: pre-advance state validation, G2 commit-before-review, dual-write state sync, memory-consult proof, and the pre-ship doc-sync trio (`requirePreShipDocSync`, default true).
6. Test honesty: mutation threshold (default 80) when configured; regression sabotage when mutation is unset.

## Common mistakes

1. Lowering `minVerifyScore` mid-run to unblock a stuck score. Finish the run honestly or Pause; retune the bar between runs.
2. Writing negative scenarios as prose wishes. Each one needs an observable test, or it caps you at 8 by design.
3. Arguing with a deficiency list instead of closing it. The list names the missing evidence; produce the evidence.

## Recap (say this)

"Evidence derives the score, the score guards the door. At eight, you test the failure path. Next: the reviewers."

## Practice

In your demo run, delete the test for one negative scenario, re-verify, and read the deficiency list out loud. Restore the test, re-verify to ≥9, and note both numbers in your changelog habit from Chapter 11.

## Next video

Chapter 08 — Review, Fresh Verify, and Testing That Actually Prove Work.
