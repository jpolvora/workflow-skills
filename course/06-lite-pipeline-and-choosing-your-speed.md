# Chapter 06 — Lite vs Standard: Pick the Right Speed Every Time

## Video metadata

- **YouTube title:** Lite vs Standard: Pick the Right Speed Every Time | Workflow Skills #6
- **Thumbnail text:** LITE OR FULL?
- **Description (first lines):** Same config, same providers, same shipping guarantees. Half the ceremony. Learn the six lite steps, what you give up, and how the complexity classifier decides.

## Learning objectives

After this video, the viewer can:

1. Recite the six lite steps (0–5) and map them to standard steps.
2. State which guarantees lite keeps and which ceremony it drops.
3. Use `ws-classify-complexity` thresholds and override the recommendation safely.

## Before you record

1. A small, well-understood spec ready (example: `fix-empty-state-copy`).
2. `dagThresholds` in `.ws/config.json` on screen.
3. Keep the Chapter 05 flow diagram open for the side-by-side.

---

## Narration script

[ON SCREEN: the two pipeline diagrams side by side.]

Welcome back. From Spec to Delivery.

Not every change deserves ten steps. A copy fix with a test does not need a plan interview and a task graph. That is why there are two pipelines, and today you learn to pick the right one on purpose, instead of by habit or by mood.

Meet lite. [ON SCREEN: lite steps.] `ws-spec-to-pr-lite`, steps zero to five. Step zero, spec, with the same prior-work sweep. Step one, planning, informed by design-intent history. Step two, implementation, with the same defect-class sweep. Step three, review, with the same fix and re-review loop, siblings included. Step four, close, then ship, with CI triage and the tracker auto-close. Step five, fix-PR, plan before edit, inline on your session model. Six steps. Same destination: a merged pull request with zero open threads.

[PAUSE]

Now the honest accounting. What do you keep in lite? [ON SCREEN: checklist, kept column.] You keep the spec as contract. You keep commit before review, so review always diffs a real range. You keep the review fix loop with its own commit. You keep quiet ship preflight, push, pull request, CI checks, and the fix-PR convergence loop. You keep the same GitHub or Azure operations, the same config file, and isolated state.

What do you give up? [ON SCREEN: dropped column.] The formal plan interview. The task DAG ceremony. The scored verify step with the nine-out-of-ten bar, and the fresh-worker re-verification that follows review. Lite trusts a tighter loop: plan, build, review, ship. For small, well-understood work with good tests, that trust is earned. For a payment flow, it is not.

[PAUSE]

So who decides? A classifier, `ws-classify-complexity`, reads the spec against thresholds in your config, the `dagThresholds` section, and recommends lite or standard. Then a gate asks you. Accept, or override in either direction. In unattended mode the recommendation is auto-accepted, which is exactly why your thresholds deserve five honest minutes in config.

Three rules for choosing well. One: blast radius decides, not line count. A three-line change to auth outranks a three-hundred-line change to a settings page. Two: reversibility decides. If a wrong merge is cheap to revert and easy to detect, lite is safe. If detection takes a customer report, standard. Three: novelty decides. The first time a codebase area meets a new pattern, standard. The fifth similar change, lite.

[DEMO: classify the small spec, accept lite, and run it. Keep this brisk.]

Watch the run feel. No interview artifact. No ledger score gate. The state file still records every step, telemetry still flows, and if I stop the session mid-review, resume picks up exactly here. Isolated state means a lite run and a standard run on the same repo never cross-resume into each other. The `workflowType` field is the guardrail, and both orchestrators enforce it.

[ON SCREEN: back to you.]

One more pattern: batches. When you have five small specs and one big one, you do not choose once. `ws-spec-multi` classifies each spec and dispatches lite or standard per item, one at a time, syncing the base branch between items. That is Chapter Thirteen. For now, the skill is the per-spec judgment: ceremony proportional to risk.

Quick test. [PAUSE] A spec that renames a button label and updates its snapshot test? Lite. A spec that changes how invoices round tax? Standard, every time, and you want the fresh verifier injecting faults into those rounding criteria. If you answered both without hesitating, you are ready for the gates.

Next video is the heart of the standard pipeline's discipline: the verify score. Where the number comes from, why nine, and what happens at eight.

## Usage examples

```text
Run ws-spec-to-pr-lite for spec fix-empty-state-copy
Classify this spec: ws-classify-complexity for csv-export
```

Lite on disk (`{plansDir}/{slug}/`):

```text
step-00-{slug}.spec.md     step-06-{slug}.review.md (review artifacts)
step-01-{slug}.plan.md     step-08-{slug}.result.md (close/ship evidence)
{workflow-id}.state.json   (workflowType: lite) + .state.md + telemetry.jsonl
```

Side-by-side (speak this table, do not read every cell):

| | Standard `ws-spec-to-pr` | Lite `ws-spec-to-pr-lite` |
|---|---|---|
| Steps | 0–9 + 6b fresh verify | 0–5 |
| Plan interview | Yes (Step 2) | No |
| Scored verify (bar 9 default) | Yes (Step 5) | No scored gate |
| Commit → review → fix commit | Yes | Yes |
| Ship + fix-PR convergence | Yes (Steps 8–9) | Yes (Steps 4–5) |
| State | `workflowType: standard` | `workflowType: lite` (no cross-resume) |

## Features in this chapter (enumerated)

1. Lite pipeline steps 0–5: spec, plan, implement, commit, review (+fix commit), close+ship, fix-PR.
2. Complexity classifier (`ws-classify-complexity`) driven by `dagThresholds`, with accept/override gate and auto-accept in `autoMode`.
3. Shared guarantees: one `config.json`, same provider intents, commit-before-review, quiet ship preflight, CI triage, PR auto-close keyword.
4. Isolated state per `workflowType`; a lite run can never resume a standard run (and vice versa).
5. Fix-PR in lite plans before editing, inline on the current session model; standard dispatches fresh workers per round.
6. Batch escalation path: `ws-spec-multi` classifies per spec and dispatches the right pipeline per item.

## Common mistakes

1. Choosing lite by diff size alone. A tiny diff in a critical path is standard work.
2. Expecting lite to produce a verify score. Lite has no Step 5 ledger gate; if you need the number, run standard.
3. Trying to resume a standard run with the lite orchestrator to "save time". The state guard refuses; finish or abandon deliberately.

## Recap (say this)

"Ceremony proportional to risk. The classifier proposes, you dispose. Next: the score."

## Practice

List your next five real tasks. Classify each as lite or standard in writing, with the deciding factor (blast radius, reversibility, or novelty) named. Keep the list; Chapter 13 batches exactly this queue.

## Next video

Chapter 07 — Quality Gates and the Verify Score (Why 9 Is the Bar).
