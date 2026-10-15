# Chapter 15 — Capstone Lab: Idea to Merged PR, Start to Finish

## Video metadata

- **YouTube title:** Capstone Lab: Idea to Merged PR, Start to Finish | Workflow Skills #15
- **Thumbnail text:** FULL RUN
- **Description (first lines):** No new concepts. One fresh idea rides spec, pipeline, gates, review, ship, and fix-PR to a merged pull request while memory, index, and wiki update around it. The whole course, in one run.

## Learning objectives

After this video, the viewer can:

1. Execute a complete delivery without narration gaps: idea → spec → run → merge.
2. Narrate each artifact as it appears and predict the next gate before it fires.
3. Perform the post-merge close-out: index filing, wiki, changelog, learning line, retro offer.

## Before you record

1. Fresh demo repo, installed and configured (Chapters 02–03 state), `main` protected in spirit: you will merge the demo PR.
2. Fresh idea not used in earlier chapters. Suggested: "Empty search results show a helpful zero-state with a clear-filters action."
3. Two terminals: agent session + `ws-monitor` watch. Screen-record the whole run; teach from the recording if live narration stumbles.

---

## Narration script

[ON SCREEN: terminal, clean repo. Speak slower than usual. This is the exam and the celebration.]

Welcome back. From Spec to Delivery.

Fifteen videos ago, this was a promise. Today we keep it, in one continuous run. No new concepts. No skipping. A fresh idea becomes a spec, the spec becomes a plan, the plan becomes code, and the code survives every skeptic this course has introduced, and lands as a merged pull request. Watch for the moments you can now predict. Predicting the next gate before it fires is what "I learned this" feels like.

The idea: [PAUSE] "Empty search results show a helpful zero-state with a clear-filters action." Small. Real. Testable. Perfect capstone size.

**Minute one: the spec.** [DEMO: draft, validate, register.] I hand the idea to the spec writer. It consults the codebase, the stack file, and memory before asking me anything, Chapter Eleven already paying rent. The draft arrives with Given, When, Then criteria, an out-of-scope section that explicitly excludes redesigning search itself, validation notes describing the exact screen a human should see, and negative scenarios: zero results with no filters active, and a slow backend returning empty after a timeout. Those two lines, written in sixty seconds, are the difference between a nine and an eight in about twenty minutes. Authoring validation passes. The spec tracks itself in the index as pending. Registration creates the ledger. Chapter Four, verbatim, no applause needed. That is the point.

**Classification.** [DEMO: classifier + gate.] Standard or lite? User-facing behavior, new component, real negative paths, modest blast radius. The classifier and I agree: standard, and I accept without overriding. Judgment note, spoken once: if this were a label change on an existing zero-state, lite, and I would have said so in Chapter Six's language: same guarantees, less ceremony, earned trust.

**The run.** [DEMO: invoke the standard pipeline; keep the monitor visible.] Steps one to four, briskly. Plan, with its stack-invariant verification section naming the frontend boundary this touches. Interview, unforced, tightening one ambiguous criterion about which filters "clear" resets. Task graph, sequential, because the work is sequential. Implementation, red then green, with memory-consult proof on screen. Somewhere in this stretch, open the second terminal and watch the monitor classify the run as alive and advancing. Chapter Thirteen is watching Chapter Five work, and both of them are boring now. Boring is the goal.

**The gates.** [DEMO: verify report, then the commits.] Step Five derives the score from the ledger. Watch both negative scenarios: tested, passing, uncapped. Nine. The product commit lands, only the touched files, plan artifacts still uncommitted by design. Step Six reviews the committed range, finds one genuine warning about focus management on the clear-filters button, fixes it, re-reviews clean, second commit. Step Six B: the fresh verifier, who has never seen my implementation chat, re-derives every verdict and injects its faults. The timeout negative scenario earns its keep here; the fault that swallows the empty response gets caught, red, exactly as designed in minute one. Step Seven runs the battery. Green, with sabotage evidence that green means something.

[PAUSE] Pause here, editor's note to myself: let the scoreboard breathe on screen for three seconds. Viewers screenshot scoreboards.

**Close, ship, converge.** [DEMO: close artifacts, preflight, PR, threads, merge.] Close first: status completed, the doc trio done — wiki feature page updated for the new zero-state, index synced with delivery pending its evidence link, changelog appended. Quiet preflight resolves without interrogating me. Push. The non-blocking dry-run reports, and we ship anyway, informed. Pull request opens with its auto-close line. CI goes green. Two review threads arrive, one is the same focus class we already fixed, in a sibling component; the fix round sweeps the class, replies, verifies, resolves. Zero threads. Merge. Issue closed. State records the PR number and URL, ship status terminal, and the close verifier confirms the spec now lives under `completed` with the index pointing at it.

**Close-out, sixty seconds.** [DEMO: learning line, retro offer, board.] The run ends with a Learning line. One real trap surfaced — focus return after clearing filters — recorded as do-not and instead-do, compiled into memory, waiting for the next agent who touches this component. The retro offers one proposal with evidence; I approve it. Kanvas shows the card in Production. The index shows the checkbox ticked, the Done log holding the PR URL. Past, present, future: changelog, wiki, memory. Chapter Eleven's three tenses, all updated by one ordinary Tuesday-sized feature.

[ON SCREEN: back to you. End screens ready.]

That is the whole course, in one run. [PAUSE] You came here prompting and hoping. You leave specifying, scoring, reviewing, and shipping, with an agent that does the typing and a system that does the checking, and with the judgment to choose lite or standard, gated or unattended, per piece of work. The appendices in this course folder hold every feature and every skill for reference, plus the cheat sheet and FAQ. Keep them beside the keyboard.

Thank you for building along with me. From Spec to Delivery is not a slogan anymore; it is your workflow now. Like, subscribe for the deep dives, and tell me in the comments which pipeline you will run first. I read them all, and the good questions become the next videos.

See you in the next one.

## Usage examples (the whole run, in order)

```text
1. Write a spec for: Empty search results show a helpful zero-state with a clear-filters action
2. (validate)  -> validate_spec.cjs --mode=authoring  |  (register) -> register_local_spec.cjs
3. Classify + choose: standard (highlights: new component, negative paths, modest blast radius)
4. Run ws-spec-to-pr for spec search-zero-state
5. Accept gates as they fire: verify >= 9 -> commit -> review/fix -> fresh verify -> testing
6. Ship when asked: Create PR   (close already done; dry-run non-blocking; CI triage)
7. Converge: ws-goal-fix-pr until activeThreads == 0 -> merge
8. Close-out: verify_close_filing.cjs -> Learning line -> retro (approve/reject) -> Kanvas check
```

Artifacts produced (point at each once, never read filenames in full):

```text
{specsDir}/completed/search-zero-state.spec.md   (+ index.PRD [x] + Done log with PR URL)
{plansDir}/search-zero-state/  steps 00-08 artifacts, ac-ledger.json, state pair, telemetry
{reviewsDir}/PR-<N>-round-*.md                   wiki page updated . MEMORY trap compiled
```

## Features in this chapter (enumerated — the course checklist)

1. Spec authoring with DoR, validation notes, negative scenarios; authoring validation; index auto-track; ledger init.
2. Complexity classification with gate; standard pipeline Steps 0–9 + 6b executed in order with pre-advance validation.
3. Derived verify score ≥ `minVerifyScore` (default 9), commit-before-review, review fix loop, fresh-verify fault injection, test battery.
4. Close semantics (`status: completed`), pre-ship doc-sync trio, quiet preflight, push, PR with auto-close, CI triage.
5. Fix-PR convergence to zero threads with plan-before-edit rounds and defect-class sweep; merge and tracker close.
6. Knowledge close-out: memory trap compiled, changelog appended, wiki synced, Kanvas/index agree, retro proposed.
7. Live observability throughout: state pair, telemetry stream, `ws-monitor` watch, dispatch audit pairs.

## Common mistakes (final exam edition)

1. Narrating tool names instead of outcomes. Viewers (and teammates) adopt outcomes; the skill names are findable in every appendix.
2. Skipping the close-out because the PR merged. Unfiled specs, stale wiki, and missing traps are how next quarter's run gets slower.
3. Declaring "done" from the agent's summary. Done is the close verifier exiting zero and the index pointing at `completed/`.

## Recap (say this)

"Idea in, merged PR out, knowledge updated. That is From Spec to Delivery."

## Practice (course final)

Repeat this capstone on a real, small feature in your own repository within seven days. Publish your verify score, your review rounds, and your convergence time in the video comments or your team channel. Those three numbers are your baseline; Chapter 14's benchmarks exist to move them.

## Next video

There is no next video. There is Appendix A (every feature, every skill) and Appendix B (cheat sheet, glossary, FAQ) in this folder, and then there is your first real run. Go ship one.
