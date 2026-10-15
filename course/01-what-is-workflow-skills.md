# Chapter 01 — What Is Workflow Skills? Spec-Driven Delivery Explained

## Video metadata

- **YouTube title:** What Is Workflow Skills? Spec-Driven Delivery Explained | Workflow Skills #1
- **Thumbnail text:** SPEC → PR
- **Description (first lines):** Workflow Skills turns a written spec into a reviewed pull request, in any coding agent, on GitHub or Azure DevOps. In this video: the problem, the contract idea, the two pipelines, and the full feature map.

## Learning objectives

After this video, the viewer can:

1. Explain "the spec is the contract of record" in one sentence.
2. Name the two delivery pipelines and when each one fits.
3. List the six building blocks: skills, config, providers, gates, state, and memory.

## Before you record

1. Demo repo from the Recording Guide, clean `git status`.
2. Open `README.md`, `FEATURES.md`, and `docs/flow.md` in editor tabs.
3. Have the project site ready in a browser tab: the public catalog page.

---

## Narration script

[ON SCREEN: you, then the README hero.]

Welcome back. From Spec to Delivery.

Today, the big picture. What is Workflow Skills, why does the spec come first, and what exactly do you get? By the end, you will have the whole map in your head, and every later video will just zoom in.

[PAUSE]

First, the problem, in three scenes. Scene one: you prompt an agent, "add export to CSV." The agent writes code. It looks right. Scene two: review. The export ignores permissions, and nobody wrote that requirement down, so nobody can prove the agent broke it. Scene three: next month, a different agent changes the export again, because there is no record of what "correct" meant. [PAUSE]

All three scenes have the same root cause. The requirement lived in a chat message, and the chat is gone.

Workflow Skills flips that. [ON SCREEN: a spec file.] You write the requirement once, as a spec file, with testable acceptance criteria. That file is the contract of record. The plan is derived from the spec. The code is derived from the plan. The review checks the code against the spec. And the score that lets you ship is computed from the spec, not written by the agent. If anyone asks "why does it work this way," the answer is never a lost chat. The answer is the spec.

[PAUSE]

Now, what is actually in the box? Six building blocks. Count with me.

One, **skills**. Sixty-two small, single-purpose skills, plus the shared hub. Each skill is a Markdown instruction file with helper scripts. One skill writes specs. One writes plans. One implements. One reviews. Small pieces, composed in order.

Two, **pipelines**. Two orchestrators carry a spec to a pull request. The standard pipeline, `ws-spec-to-pr`, runs steps zero to nine, with planning, an interview, verification, review, fresh re-verification, testing, shipping, and fixing review threads. The lite pipeline, `ws-spec-to-pr-lite`, runs steps zero to five, same guarantees, less ceremony, for smaller work. A classifier helps you pick, and we will use both.

Three, **config**. One file, `.ws/config.json`, describes your project: your stack, your build and test commands, your provider, your quality bar. The skills read the config. Nothing about your project is hardcoded in the skills, which is why the same skills work in any repo.

Four, **providers**. GitHub, Azure DevOps, and plain local files all implement the same operations: fetch a work item, create a pull request, read review threads, resolve them. The pipeline never speaks "GitHub" or "Azure" directly. It speaks the shared contract, so your process is portable.

Five, **gates and state**. At every step boundary, the workflow checks the state file before it advances. We call that failing closed: when something required is missing, the run stops and tells you, instead of guessing. And the score gate is real. Implementation advances only when the derived verify score reaches your bar. The default bar is nine out of ten.

And six, **memory**. A local memory file, and optionally an external vault, record traps: "we tried this, it broke, do it this way instead." The agent must consult memory before it plans and before it codes. A missing consult is a gate failure, not a warning.

[PAUSE]

[DEMO: show the skill folders list for five seconds. Do not read every name.]

On screen: the skill library. Do not memorize this. Nobody does. There are four families you will actually touch every week. The pipeline family that runs steps zero to nine. The spec family that creates, lists, organizes, and archives specs. The quality family: review, fresh verify, testing, secrets scan. And the harness family that keeps the system itself honest: doctor, monitor, and the harness check. Appendix A in this course folder lists every single skill, and the project catalog does the same on the website.

Last piece of the map: where things live. [ON SCREEN: folder tree.] Skills live under `.agents/skills`. Your project config and hub live under `.ws`, and that folder is yours. Updates never overwrite your config, your stack notes, or your changelog. Specs live in your specs folder. Plans and run state live in your plans folder. Clean separation, and Chapter Three makes it concrete.

So, the one sentence to keep: **the spec is the contract, the pipeline is the conveyor belt, and the gates are the inspectors.** [PAUSE]

In the next video, we install it, twice: once inside one project, and once globally for your whole machine. See you there.

## Usage examples

Show, do not type yet:

```text
.agents/skills/        <- the 62 skills + ws-shared hub (managed, overwritten on update)
.ws/config.json        <- YOUR project config (never overwritten)
{specsDir}/*.spec.md   <- your specs, the contract of record
{plansDir}/{slug}/     <- run artifacts: plan, state, reports, telemetry
```

Agent prompt viewers will use from Chapter 04 onward:

```text
Run ws-spec-to-pr for spec {slug}
```

## Features in this chapter (enumerated)

1. Spec as contract of record; plans, code, and PRs are derived artifacts.
2. Standard pipeline `ws-spec-to-pr` (steps 0–9) and lite pipeline `ws-spec-to-pr-lite` (steps 0–5), plus batch (`ws-spec-multi`) and distributed (`ws-spec-to-pr-distributed`) variants.
3. 62 portable skills + `ws-shared` hub; Markdown + Node 22 only; no Python, no IDE lock-in.
4. One consumer-owned `.ws/config.json` for stack, verification commands, providers, and quality bar.
5. Provider parity: GitHub and Azure DevOps implement the same intents; local specs need no tracker.
6. Fail-closed gates, machine state (`{workflow-id}.state.json` + `.state.md`), and a derived 0–10 verify score (default bar 9).
7. Memory before plan and code, a living wiki, and a kanban board for spec state.

## Common mistakes

1. Treating the spec as documentation written after coding. Here the spec is written first and scored against.
2. Editing installed skill copies inside a consumer project and expecting them to survive `update`. Lasting changes go upstream, by pull request.

## Recap (say this)

"The spec is the contract. The pipeline moves it. The gates inspect it. Next: install."

## Practice

Open the public catalog site, find the two pipeline skills, and read only their one-line descriptions. Then write, in your own words, one feature you shipped last month as a single testable sentence that starts with "Given…, when…, then…".

## Next video

Chapter 02 — Install Workflow Skills in 5 Minutes (Project + Global).
