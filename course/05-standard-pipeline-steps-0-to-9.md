# Chapter 05 — The Standard Pipeline: Steps 0 to 9, End to End

## Video metadata

- **YouTube title:** The Standard Pipeline: Steps 0 to 9, End to End | Workflow Skills #5
- **Thumbnail text:** STEPS 0–9
- **Description (first lines):** One spec rides the full ws-spec-to-pr state machine: spec, plan, interview, tasks, implementation, verify, review, fresh verify, testing, ship, and fix-PR. Every artifact, every gate, on screen.

## Learning objectives

After this video, the viewer can:

1. Name all ten steps (0–9 plus 6b) and the artifact each one writes.
2. Explain the finite-state-machine discipline: pre-advance validation, handoffs, and telemetry.
3. Describe what happens below the verify bar and at each Pause.

## Before you record

1. Continue the `csv-export` spec from Chapter 04, registered but not yet run.
2. Open `docs/flow.md` diagrams and `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`.
3. This is the longest video. Record the step walk in two sittings: steps 0–4, then 5–9.

---

## Narration script

[ON SCREEN: the flow diagram, full pipeline.]

Welcome back. From Spec to Delivery.

Today is the centerpiece. The standard pipeline, `ws-spec-to-pr`, steps zero to nine, plus the half-step everyone asks about, six B. One spec goes in. One merged pull request comes out. I will walk every step, name the artifact it writes, and show you the gate that guards the door to the next step.

First, the shape. [PAUSE] This pipeline is a finite state machine, an FSM. That sounds academic, so here is the practical meaning. The workflow has a current step, a machine state file, `{workflow-id}.state.json`, with a human-readable twin, `.state.md`. Before every advance, a validator checks the state. Bad state, no advance. Every dispatched step writes a named artifact, records a handoff, and appends telemetry to one stream, `telemetry.jsonl`. Nothing lives only in the chat. If the session dies at step five, a new session resumes from the state file. That is the whole trick, and it is a good trick.

[ON SCREEN: highlight Step 0.]

**Step zero, Spec.** Entry gate, tracker fetch when there is one, and a prior-work sweep: history, existing plans, and delivered code are searched so we never rebuild what already shipped. Then spec authoring or the existing-spec short circuit, registration, ledger initialization, and complexity classification. The classifier recommends standard or lite, and a user gate lets you accept or override either way. Mid-flight runs never switch pipelines. State remembers `workflowType`, and cross-resume between standard and lite is refused.

**Step one, Planning.** The plan writer produces `step-01-{slug}.plan.md` and builds the plan index. This plan is structured, and it includes a stack and security invariants verification section: how each framework boundary the change touches will be checked. A memory conflict check runs here. If a stored trap contradicts the plan, the interview next step becomes mandatory. No traps hit, no drama.

**Step two, Plan Interview.** An interrogation of the plan: hidden assumptions, ambiguous acceptance criteria, contradicted requirements. It writes an interview registry and a refined plan. It can be skipped when the rules say the plan is already tight, and it cannot be skipped when a memory trap forced it. Either way the decision is recorded, never silent.

**Step three, Tasks.** The refined plan becomes an execution graph. By default, with `enableDag` false, that means a sequential stub, written by a script, no subagent theater. Turn DAG on, and tasks fan out with dependencies, at most three workers in parallel in implementation. Sequential is the default because most work is sequential, and pretending otherwise wastes tokens.

[PAUSE]

**Step four, Implementation.** The implementer skill builds the tasks, red then green: failing test first where the plan demands it, then the code. It must show proof it consulted memory. It sweeps the repo for the same defect class it just fixed, not only the one reported line. And it touches only its assigned files. If `files_touched` comes back empty without an explicit no-op reason, the step does not finish. Silence is not a result.

[ON SCREEN: the verify report.]

**Step five, Verify.** The scorer derives a zero-to-ten score from the acceptance criteria ledger. Derived is the load-bearing word. The agent cannot author the score, round it up, or override it. The run advances only at or above your bar, `minVerifyScore`, default nine. Below the bar, a named substep, `scoreAndRefine`, sends flagged tasks back to implementation and re-verifies, at most three rounds, then the run Pauses and asks a human. Pauses are not failures. Pauses are the system refusing to guess with your codebase.

After the bar is met, the product commit happens. Listen to the ordering, because it is a design decision: **verify, then commit, then review.** Only the touched product files are staged. Plan files wait. Review will diff the committed range, base to HEAD, so the reviewer sees exactly what would merge.

**Step six, Code Review.** A two-phase adversarial review of that committed diff, including the stack rule packs for your platform. Findings trigger a fix loop and a re-review, at most three rounds, and the fixes get their own product commit. Residual critical findings Pause the run. They never ride along quietly.

**Step six B, Fresh Verify.** A different worker, holding only the spec, the plan of record, and a compact handoff, re-derives every acceptance verdict from scratch, and injects one deliberate fault per criterion on a scratch copy of the tree. Evidence or zero: a criterion with no pass evidence, or a fault the tests fail to catch, is a defect. Defects loop through fix and re-verify, at most three rounds. Your real branch stays byte-identical during the sabotage. This step exists because the worker who wrote the code is the worst judge of the code.

[PAUSE]

**Step seven, Testing.** The test battery: unit, integration, end-to-end where configured, coverage, and mutation testing when you configured it. When mutation is not configured, the step uses sabotage instead: it deliberately breaks assertions to prove the suite can catch a regression at all. A test suite that cannot fail is decoration, and this step refuses to accept decoration.

**Step eight, Close and Ship.** Close comes first and is a real state change: `status: completed` means implementation is done, recorded before any push. Close also runs the pre-ship documentation trio, wiki sync, spec-index sync, and the changelog entry, gated when `requirePreShipDocSync` is true, which is the default. Only then does ship push and open the pull request, with the tracker auto-close keyword in the body on GitHub, followed by CI triage.

**Step nine, Fix-PR.** Review threads converge to zero. Each round plans before it edits: a gate written on the reviewer model, then execution on the execution model, in a fresh worker, while your session owns the loop. The same defect class is swept repo-wide before a thread is resolved, so the same bug does not reopen next week under a different file name. Then merge, and the tracker item closes.

[ON SCREEN: back to you.]

That is the machine. Ten steps, every one with an artifact, a gate, and a resume point. In the next video we run the same feature through the lite pipeline, and I will show you exactly which ceremony you give up, and which guarantees you keep.

## Usage examples

```text
Run ws-spec-to-pr for spec csv-export
Run ws-spec-to-pr for spec csv-export preset=cheap
Run ws-spec-to-pr for issue 123            (tracker id via the active provider)
```

On-disk evidence of one run (`{plansDir}/csv-export/`):

```text
step-00-csv-export.spec.md          step-05-csv-export.plan.report.md
step-01-csv-export.plan.md          step-06-csv-export.review.md
step-02-csv-export.plan-interview.md  step-05b-csv-export.fresh-verify.md
step-03-csv-export.plan.exec.md     step-07-csv-export.testing.*
ac-ledger.json                      step-08-csv-export.result.md
{workflow-id}.state.json + .state.md   telemetry.jsonl
step-{NN}-csv-export.prompt.md + .prompt.json   (durable dispatch audit pair)
```

State and ledger commands named on camera (golden-path surface):

```bash
node .agents/skills/ws-spec-to-pr/scripts/update_state.cjs --help
node .agents/skills/ws-shared/runtime/scripts/ac_ledger.cjs --help
```

## Features in this chapter (enumerated)

1. FSM steps 0–9 + 6b, each with a named artifact, a handoff, and telemetry; pre-advance `validate_state.cjs` on every transition.
2. Prior-work sweep at Step 0; complexity classification gate (`ws-classify-complexity`) with user override; `workflowType` isolation (no cross-resume).
3. Plan interview registry (`step-02-{slug}.plan-interview.md` + refined plan) and memory-conflict `force_interview`.
4. Sequential-by-default execution (`enableDag: false`, scripted stub) or DAG with at most 3 parallel workers.
5. Commit-before-review: product commit after verify (standard), review diff `{base}...HEAD`, review fixes as a second commit; plan files ship only at close.
6. Dispatch economy: indexed plan slices, bounded subagent contracts, per-step context budgets, and a durable prompt-audit pair per dispatch.
7. Worker liveness: `.runtime/worker-started-{step}-{batch}.md` markers and one read-only verdict (`alive` / `pending` / `wedged`); only `wedged` authorizes takeover.
8. Turn-boundary resilience: mid-step `checkpoint` and `pause-turn` records resume the next session from `state.turnPause.nextAction`.
9. Close semantics: `status: completed` before push/PR; `shipStatus` tracked separately; dual-written `.state.json` + `.state.md`.

## Common mistakes

1. Hand-editing `.state.*` or `ac-ledger.json`. State moves only through the sanctioned scripts; hand edits are tamper evidence.
2. Staging plan files or the whole tree in the product commit. Only `files_touched` product paths stage; never `git add -A` in workflow commits.
3. Treating a Pause as a crash. A Pause is a gate doing its job; read the residual list, decide, and resume.

## Recap (say this)

"Ten steps, every claim evidenced, every advance validated. Next: the fast lane."

## Practice

Open any finished run folder. Pick one acceptance criterion and trace it by hand: spec line → ledger row → verify report → fresh-verify verdict → test result. If any link is missing, you just learned why evidence-or-zero exists.

## Next video

Chapter 06 — Lite vs Standard: Pick the Right Speed Every Time.
