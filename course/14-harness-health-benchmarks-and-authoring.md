# Chapter 14 — Keep the Harness Honest + Write Your Own Skill

## Video metadata

- **YouTube title:** Keep the Harness Honest + Write Your Own Skill | Workflow Skills #14
- **Thumbnail text:** AUDIT IT
- **Description (first lines):** Doctor, harness and workflow audits, benchmarks, retrospectives, cleanup, and the authoring protocol for a lean new skill. Trust, verified, then extended.

## Learning objectives

After this video, the viewer can:

1. Diagnose an install with `ws-doctor`, `ws-version`, and `ws-show-harness`.
2. Run `ws-check-harness` (Phases 0–5c) and `ws-check-workflows`, and interpret findings.
3. Use benchmarks, retro, preview, and cleanup; then author a minimal skill correctly.

## Before you record

1. Demo install with one deliberate defect (break a skill link or config path) for the doctor.
2. Benchmark folders present (`benchmarks/`) or the Extra package installed.
3. A scratch folder for the new-skill demo. Never author into the global install from a project session.

---

## Narration script

[ON SCREEN: the deliberate defect, then the doctor output.]

Welcome back. From Spec to Delivery.

You have trusted this harness with your codebase for thirteen videos. Today the harness earns that trust again, in public, with its own auditors. Then we extend it: benchmarks, retrospectives, and your first skill of your own.

Start with **diagnosis**. [PAUSE] `ws-doctor` inspects an installed tree read-only: path errors, tool recipes, config switches, missing references, hybrid global-plus-local resolution. It changes nothing; it names problems in hub terms, with file and line energy. `ws-version` prints the four facts every bug report needs: install scope, the loaded skill directory, the package version from the canonical version file, and your stored path tokens. And `ws-show-harness` snapshots the live session: which skills are loaded, the rules, and the precedence hierarchy, so "which instructions were you following?" stops being a philosophical question.

[DEMO: run the doctor on the broken install, fix the named path, re-run clean.]

Notice the loop. Diagnose, fix the named thing, re-run. No trawling. That loop works because the diagnostics cite specifics instead of dumping logs at you. Path errors name the hub-style path you should have used. Prose is skipped; citations are not decoration.

Next, the **auditors**. [ON SCREEN: phase list.] `ws-check-harness`, phases zero through five C, is the deep audit: install mode and scope detection, routing, links (scope-aware, so global and project layouts are judged correctly), portability, SHA-256 integrity digests, duplicated instructions, role clarity, and skill composition topology. Critical findings block a ship claim. The upstream repo holds itself to zero findings, and CI publishes the report. Hold your own installs to the same bar after every update; Chapter Two's post-install check was this auditor in miniature.

`ws-check-workflows` audits the other dimension: behavior. It simulates the finite state machines, standard, lite, and multi-spec, checking step continuity, state isolation between runs, provider dispatch, and artifact transitions. Prose can claim a pipeline is coherent. The simulator knows. When you change gates or steps, this is the audit that catches the lie before your users do.

[PAUSE]

Then, **measurement and reflection**. [ON SCREEN: benchmark report + one retro proposal.] `ws-benchmarks` manages the benchmark suite: inspect evolution results across versions, run static or live comparisons with fixed model identifiers, so version-over-version claims compare like with like, and refresh the published reports. `ws-run-benchmark` drives a single fixture end to end. Rule, said on camera because it matters: benchmarks never run inside a delivery pipeline. Timing a race during the race corrupts both numbers.

`ws-retro` closes the learning loop at run scale. After a completed run, it ranks friction signals, validates evidence-linked candidates, and proposes environment improvements: a memory trap, a harness directive, a reviewer standard, an automated check, a navigation pointer, or a deletion. Propose-only. Nothing applies without your gate approval. Opt-in automation can offer the retro after ship; it can never block close. A system that improves itself silently is a liability. A system that proposes improvements with evidence is a teammate.

Two janitors complete the kit. **`ws-preview`** runs your configured local review dry-run command without publishing anything, the same command the ship step reuses before creating a PR. **`ws-cleanup`** you met in Chapter Ten: gated deletion of workflow leftovers, with ignore-rule suggestions. Clean workspace, honest board, current docs. Unglamorous. Load-bearing.

[PAUSE]

Finally, **authoring**. [DEMO: the scratch skill skeleton.] `ws-write-a-skill` is the protocol: one clear trigger description, progressive disclosure (the body stays lean; references load on demand), portable capability vocabulary, no host product names, no hardcoded consumer paths, and scripts in Node under the skill's `scripts/` folder. Register dependencies, regenerate integrity digests, run the harness check over the affected skill set, and verify callers and callees still honor their contracts. In this upstream repo, you author under the local skills tree and never edit the global install. In your own project, the same rule protects you: edit the source tree your installer ships from, not the copy other projects are running.

Keep skills small. [ON SCREEN: back to you.] The leanest skill that passes its audits beats the cleverest skill that needs a manual. If your new skill needs a paragraph of exceptions, it wants to be two skills.

One chapter left. The capstone: an empty spec, one run, a merged pull request, everything you have learned, in order, without me stopping to teach. Bring coffee.

## Usage examples

```text
Diagnose this install: ws-doctor
What is running here? ws-show-harness . Audit the harness: ws-check-harness
Simulate the pipelines: ws-check-workflows . Retro the last run: ws-retro
Dry-run review locally: ws-preview
```

```bash
npx --yes github:jpolvora/workflow-skills --version
npm run test
npm run generate-integrity && npm run verify-integrity
npm run benchmark:static
node test/test-harness-clean.js
```

New-skill skeleton (author in the source tree, never the managed copy):

```text
.agents/skills/ws-my-skill/
  SKILL.md            <- trigger description + lean body, en-us, portable tokens
  scripts/*.cjs       <- Node helpers (CommonJS), invoked as: node {skillsRoot}/ws-my-skill/scripts/x.cjs
  references/         <- loaded on demand only
```

## Features in this chapter (enumerated)

1. Diagnostics trio: `ws-doctor` (read-only path/config/reference diagnosis), `ws-version` (scope/dir/version/tokens snapshot), `ws-show-harness` (session skills/rules/precedence).
2. Harness audit (`ws-check-harness` Phases 0–5c): install mode, routing, scope-aware links, portability, integrity digests, duplication, topology; upstream invariant is 0 findings.
3. Workflow simulation (`ws-check-workflows`): FSM continuity, state isolation, provider dispatch, and artifact transitions for standard/lite/multi.
4. Benchmarks (`ws-benchmarks`, `ws-run-benchmark`): fixed-model static/live comparisons and evolution reporting; never inside a delivery run.
5. Retrospective (`ws-retro`): ranked, evidence-linked environment proposals across six destinations; propose-only, gate-approved, non-blocking.
6. Local dry-run (`ws-preview`) reusing `preview.dryRunCommand`; gated cleanup (`ws-cleanup`) with `.gitignore` suggestions.
7. Skill authoring (`ws-write-a-skill` + SKILL_AUTHORING): lean bodies, progressive disclosure, dependency graph upkeep, integrity regeneration, caller/callee contract checks.

## Common mistakes

1. Editing the globally installed copy of a skill to "fix" it. Author in the source tree; `update` overwrites managed copies by design.
2. Running benchmarks inside a spec-to-PR delivery. Benchmarks are an Extra, upstream activity; delivery timing is elapsed-time reporting only.
3. Applying retro proposals without reading their evidence links. Propose-only exists so a human verifies before the environment changes.

## Recap (say this)

"Diagnose by name. Audit behavior, not prose. Propose improvements with evidence. Next: the capstone."

## Practice

Break one link in a scratch install, let `ws-doctor` find it, fix exactly what it names, and re-run until clean. Then run `ws-retro` on your last completed run and approve or reject each proposal in writing.

## Next video

Chapter 15 — Capstone Lab: Idea to Merged PR, Start to Finish.
