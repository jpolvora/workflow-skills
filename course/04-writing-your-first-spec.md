# Chapter 04 — Write Your First Spec That Passes Validation

## Video metadata

- **YouTube title:** Write Your First Spec That Passes Validation | Workflow Skills #4
- **Thumbnail text:** WRITE THE SPEC
- **Description (first lines):** A spec is a contract: testable acceptance criteria, out-of-scope, Definition of Ready, and negative scenarios. Write one live, validate it, and register it for the pipeline.

## Learning objectives

After this video, the viewer can:

1. Produce a `*.spec.md` with frontmatter and every required section.
2. Turn vague asks into EARS-shaped, testable acceptance criteria.
3. Pass `validate_spec.cjs --mode=authoring` and register the spec.
4. Explain the gray-area context file and auto-tracking in `index.PRD`.

## Before you record

1. Demo repo configured (Chapter 03 done). Specs folder exists or will be created.
2. Prepare one deliberately bad one-line ask on a slide: "Make export better."
3. Demo slug: use `csv-export` throughout Chapters 04–09 so the story continues.

---

## Narration script

[ON SCREEN: you, then the bad one-line ask.]

Welcome back. From Spec to Delivery.

Today you write your first spec. Not documentation about code that exists. A contract for code that does not exist yet, written so precisely that a machine can score whether the code honors it.

Here is the enemy. [ON SCREEN: "Make export better."] "Make export better." Better how? For whom? What breaks if we are wrong? An agent given this sentence will produce something, and nobody can prove it wrong, because nothing testable was ever claimed. The spec exists to kill that sentence.

[PAUSE]

A Workflow Skills spec is a Markdown file under your specs folder, `{specsDir}`. The name is the slug, optionally numbered, like `0042-csv-export.spec.md`. Frontmatter carries the machine facts: an `id` or `null`, the `slug` without the number prefix, a `title`, a `source` — local, GitHub, or Azure DevOps — and the `specDate`. The body carries the human contract, and every section earns its place.

The sections, in order. [ON SCREEN: scroll the template slowly.]

**Description.** What changes and why, in plain language.

**Acceptance criteria.** The heart. One line each, testable, in the shape "Given a state, when an action happens, then an observable result." That Given, When, Then shape is called EARS style in this project, and there is a closure rule: every stated requirement maps to at least one acceptance criterion, or to an explicit out-of-scope line. No orphan requirements. No silent drops.

**Out of Scope.** What this spec deliberately does not do. This section protects the implementer agent from scope creep, including its own enthusiasm.

**Assumptions and Open Questions.** What you believe but have not proven. Open questions with two or more real product options go into a companion gray-area file, `{slug}.context.md`, decided with you through a user gate. That file is never allowed to be empty theater; it exists only when a real choice exists.

**Definition of Ready.** The DoR. Is the work understood, sliced, and verifiable enough to start? Authoring validation fails closed without it.

**Validation and Observation Notes.** How a human will see that it works: the screen, the log line, the metric.

**Negative and Failing Test Scenarios.** The unhappy paths, named before code exists. Hold onto this section. In Chapter Seven you will see an uncovered negative scenario cap the verify score at eight. Writing them here is free. Discovering them at scoring time is not.

And when a spec comes from a tracker issue, one more section: **Original Issue Context**, keeping the human wording, while the acceptance criteria above it are the reformulated, testable version. Private project details stay out of anything you publish; describe the failure class, not the customer. That anonymization rule runs through the whole project.

[DEMO: ask the agent to draft the spec from a free-text ask, then open the generated file.]

Watch the flow. I give the agent one sentence of intent. The skill looks up the codebase, memory, and the stack file before it asks me anything. Then it drafts. Then, and this is the gate, it validates in authoring mode:

[DEMO]

```bash
node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring "{SPEC_PATH}"
```

Non-zero means we are not done, and the spec does not register. There is no "mostly valid." When validation passes, two bookkeeping steps happen without drama. The spec auto-tracks in `index.PRD` as a pending feature, unless you turned that off. And registration copies it into the run folder as the step zero artifact and initializes the acceptance criteria ledger, the file the verify score will be computed from in Chapter Seven:

[DEMO]

```bash
node .agents/skills/ws-spec-provider-local/scripts/register_local_spec.cjs --input "{SPEC_PATH}"
```

Use `--force` only when you intend to overwrite a plan copy that differs. Registration is the moment a document becomes a contract the pipeline can execute.

[PAUSE]

[ON SCREEN: back to you.]

Three habits separate specs that sail through from specs that bounce. One: observable verbs. "The system returns a file" beats "the system handles the request." Two: numbers. "Within two seconds for ten thousand rows" beats "fast." Three: negative scenarios written by the person who will be paged when they happen. That is usually you. Write the failure you fear, now, while it is cheap.

Your first spec is written, validated, and registered. Next video, we press the big button: the standard pipeline, steps zero to nine, and we watch one spec ride it all the way to a pull request.

## Usage examples

Agent prompts:

```text
Write a spec for: users can export the current table to CSV, respecting row permissions
/ws-spec-manager create "CSV export respects row permissions"
```

Validation, tracking, and registration:

```bash
node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring "{specsDir}/csv-export.spec.md"
node {skillsRoot}/ws-spec-index/scripts/track_index.cjs --specs-dir {specsDir} --slug csv-export
node .agents/skills/ws-spec-provider-local/scripts/register_local_spec.cjs --input "{specsDir}/csv-export.spec.md"
node .agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug csv-export
```

Spec skeleton (spoken structure):

```markdown
---
id: null
slug: csv-export
title: CSV export respects row permissions
source: local
specDate: 2026-10-15
---
## Description
## Acceptance Criteria   (Given … / When … / Then …, one line each)
## Out of Scope
## Assumptions & Open Questions
## Definition of Ready (DoR)
## Validation & Observation Notes
## Negative & Failing Test Scenarios
```

## Features in this chapter (enumerated)

1. Canonical spec schema and validator (`ws-spec-format`); authoring mode fails closed without DoR, Validation Notes, and Negative Scenarios.
2. EARS-shaped acceptance criteria plus the closure rule (every requirement → an AC or an explicit out-of-scope entry).
3. Gray-area companion `{slug}.context.md` for real product choices (≥2 options), resolved through `user-gate`.
4. Tracker reformulation: human wording kept under `## Original Issue Context` (`source: github | azure-devops`); free text uses `source: local`, `id: null`.
5. Spec path resolution (`resolve_spec_path.cjs`) honoring `plans.enforceSpecPrefixOrdering` (`NNNN-{slug}` vs `{slug}`).
6. Auto-tracking in `index.PRD` on standalone writes (`ws-spec-index track`), skipped only when tracking is off or the index is missing.
7. Registration (`register_local_spec.cjs`) creates the step-00 artifact and the `ac-ledger.json` the verify score derives from.

## Common mistakes

1. Writing acceptance criteria that no test could fail ("works well", "is fast"). If it cannot fail, it cannot score.
2. Hiding a real product choice inside Assumptions. Two or more options means a `.context.md` and a gate, not a guess.
3. Hand-editing `index.PRD` rows to look done. Tracking and sync are helper operations; faked rows are filing defects the close verifier catches.

## Recap (say this)

"A spec that cannot fail cannot score. Write the failure first. Next: the pipeline."

## Practice

Take the last feature you shipped. Write five acceptance criteria in Given, When, Then form and two negative scenarios. Run authoring validation until it passes with zero fixes from the agent.

## Next video

Chapter 05 — The Standard Pipeline: Steps 0 to 9, End to End.
