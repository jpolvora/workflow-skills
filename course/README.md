# Workflow Skills — The Complete Video Course

**From Spec to Delivery, with any coding agent.**

This folder is a ready-to-record YouTube course for the `workflow-skills` project (version 0.5.48, 62 skills plus the `ws-shared` hub). Every chapter is a teleprompter script written in clear, spoken English. You can read each file top to bottom, record one video per chapter, and publish them as a playlist.

> How this course was built: it was scanned from the project's real sources — `README.md`, `FEATURES.md`, `CATALOG.md`, `AGENTS.md`, `docs/flow.md`, the living wiki in `.agents/specs/wiki/`, the skill bodies in `.agents/skills/ws-*/SKILL.md`, and the installer in `bin/cli.js`. Nothing here is invented. When a script quotes a command, a step number, or a config key, that is the exact name the project uses today.

---

## Who this course is for

1. Developers who use an AI coding agent and want repeatable, reviewed delivery instead of one-shot prompts.
2. Teams on GitHub or Azure DevOps who want the same spec-to-pull-request process on both hosts.
3. Skill authors who want to understand, extend, or audit a portable agent harness.

You do not need a specific IDE. The skills are plain Markdown plus Node scripts, and they run in any host that can load a `SKILL.md` file.

## What you will be able to do at the end

1. Install Workflow Skills in project or global scope and explain the difference.
2. Configure any repository with `.ws/config.json` and verify the setup.
3. Write a spec that passes validation on the first try.
4. Run the standard pipeline (steps 0 to 9) and the lite pipeline (steps 0 to 5), and choose between them on purpose.
5. Explain every quality gate: the derived verify score, commit-before-review, fresh verification, testing, and the secrets scan.
6. Ship a pull request and converge its review threads to zero.
7. Manage dozens of specs with the index, the list board, Kanvas, and the living wiki.
8. Use memory so the agent stops repeating the same mistakes.
9. Run advanced modes: unattended `autoMode`, batch delivery, distributed step runs, and live monitoring.
10. Audit the harness itself and author your own skill.

## Playlist (record in this order)

| # | File | Video title | Time* |
|---|------|-------------|-------|
| 00 | [00-welcome.md](00-welcome.md) | Welcome — What You Will Build in This Course | 4 min |
| 01 | [01-what-is-workflow-skills.md](01-what-is-workflow-skills.md) | What Is Workflow Skills? Spec-Driven Delivery Explained | 8 min |
| 02 | [02-installation-and-first-run.md](02-installation-and-first-run.md) | Install Workflow Skills in 5 Minutes (Project + Global) | 9 min |
| 03 | [03-configuration-masterclass.md](03-configuration-masterclass.md) | Configuration Masterclass: config.json Without Fear | 11 min |
| 04 | [04-writing-your-first-spec.md](04-writing-your-first-spec.md) | Write Your First Spec That Passes Validation | 10 min |
| 05 | [05-standard-pipeline-steps-0-to-9.md](05-standard-pipeline-steps-0-to-9.md) | The Standard Pipeline: Steps 0 to 9, End to End | 14 min |
| 06 | [06-lite-pipeline-and-choosing-your-speed.md](06-lite-pipeline-and-choosing-your-speed.md) | Lite vs Standard: Pick the Right Speed Every Time | 8 min |
| 07 | [07-quality-gates-verify-score.md](07-quality-gates-verify-score.md) | Quality Gates and the Verify Score (Why 9 Is the Bar) | 10 min |
| 08 | [08-review-fresh-verify-and-testing.md](08-review-fresh-verify-and-testing.md) | Review, Fresh Verify, and Testing That Actually Prove Work | 11 min |
| 09 | [09-shipping-and-fixing-prs.md](09-shipping-and-fixing-prs.md) | Ship the PR and Fix Every Review Thread | 10 min |
| 10 | [10-managing-specs-at-scale.md](10-managing-specs-at-scale.md) | Manage Specs at Scale: Index, List, Kanvas, Organizer | 10 min |
| 11 | [11-memory-wiki-and-knowledge.md](11-memory-wiki-and-knowledge.md) | Memory, Changelog, and the Living Wiki | 10 min |
| 12 | [12-providers-github-azure-local.md](12-providers-github-azure-local.md) | GitHub, Azure DevOps, and Local Specs: One Contract | 9 min |
| 13 | [13-advanced-automode-distributed-multi-monitor.md](13-advanced-automode-distributed-multi-monitor.md) | Advanced: autoMode, Multi-Spec, Distributed, Monitor | 12 min |
| 14 | [14-harness-health-benchmarks-and-authoring.md](14-harness-health-benchmarks-and-authoring.md) | Keep the Harness Honest + Write Your Own Skill | 10 min |
| 15 | [15-capstone-end-to-end-lab.md](15-capstone-end-to-end-lab.md) | Capstone Lab: Idea to Merged PR, Start to Finish | 13 min |
| A | [APPENDIX-A-full-feature-catalog.md](APPENDIX-A-full-feature-catalog.md) | Appendix A — Every Feature and Every Skill (Reference) | read |
| B | [APPENDIX-B-cheat-sheet-and-glossary.md](APPENDIX-B-cheat-sheet-and-glossary.md) | Appendix B — Cheat Sheet, Glossary, and FAQ | read |

\* Spoken time at a calm 130 words per minute, pauses included. Demo chapters run longer if you type live.

Total spoken runtime: about **2 hours 40 minutes** across 16 videos.

## How to use each chapter file

Every chapter has the same eight parts, in the same order, so you always know where you are:

1. **Video metadata** — copy-paste title, thumbnail text, and YouTube description.
2. **Learning objectives** — what the viewer can do after this video.
3. **Before you record** — the exact demo setup, so you never improvise on camera.
4. **Narration script** — the words to read. `[PAUSE]`, `[ON SCREEN]`, `[DEMO]`, and `[B-ROLL]` are director cues. Do not read the cues out loud.
5. **Usage examples** — copy-paste commands and agent prompts shown on screen.
6. **Features in this chapter** — the enumerated checklist for the description box and chapters.
7. **Common mistakes** — the traps, spoken as friendly warnings.
8. **Recap, practice, and next video** — the spoken close and a homework task.

Recording workflow: read [RECORDING-GUIDE.md](RECORDING-GUIDE.md) once, then record one chapter per session. Keep the same mic, same framing, and same "From Spec to Delivery" opening line in every video. Your viewers will feel the course as one product.

## Conventions used in the scripts

1. `ws-...` names are spoken as written. For example, say "W S spec to P R" the first time, then just "spec-to-PR".
2. Placeholders look like `{slug}`, `{specsDir}`, `{plansDir}`, `{skillsRoot}`, and `{sharedDir}`. On camera, replace `{slug}` with your demo slug and say the real folder out loud once.
3. Commands are shown exactly as you type them. Never add `@latest` or `@main` to the install command. The scripts remind you on camera.
4. "User gate" means the agent stops and asks you to choose. "Fail closed" means the workflow stops instead of guessing. Both phrases are defined in Chapter 01 and reused after that.
