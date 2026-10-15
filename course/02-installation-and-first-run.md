# Chapter 02 — Install Workflow Skills in 5 Minutes (Project + Global)

## Video metadata

- **YouTube title:** Install Workflow Skills in 5 Minutes (Project + Global) | Workflow Skills #2
- **Thumbnail text:** INSTALL IT
- **Description (first lines):** Install Workflow Skills with one npx command, in project scope or global scope, verify integrity, and run your first harness check. Node 22 is the only requirement.

## Learning objectives

After this video, the viewer can:

1. Install the Full, Workflows, or Extra package in project scope.
2. Install globally and add secondary host targets.
3. Update and uninstall without losing consumer data.
4. Verify an install with `--check`, `integrity`, and the harness check.

## Before you record

1. Node 22 on PATH: show `node -v` once.
2. Demo repo clean. You will install into it live.
3. A second empty folder for the global-scope segment.

---

## Narration script

[ON SCREEN: terminal, demo repo.]

Welcome back. From Spec to Delivery.

Today we install. Five minutes, one requirement, and by the end your repo has the full harness and passes its first health check.

The one requirement is Node version twenty-two or newer. [DEMO: type the version check.] No Python. No global packages. No editor extension. Skills are Markdown and Node scripts, and that is the whole runtime.

[DEMO]

```bash
node -v
```

Now the install. There are three packages, and the names matter. **Full**, shortcut F, is everything: all skills plus the consumer hub. **Workflows**, shortcut W, is the delivery pipelines and their dependencies, forty-seven skills. **Extra**, shortcut E, is eight standalone utilities, like the skill authoring skill and the benchmark tools, with no hub. For learning, install Full. You can uninstall pieces later, and uninstall is safe. We will prove that.

[PAUSE]

Option A, the recommended one: npx. Interactive first, so viewers see the menu.

[DEMO: run it, choose project scope, choose Full, confirm.]

```bash
npx --yes github:jpolvora/workflow-skills
```

Two warnings while this runs, and they save real support tickets. First: never add `@latest` or `@main` to that GitHub address. It breaks with a confusing exit one twenty-eight. The course description has the exact working command. Second: when stdin is not a terminal, in CI or in an agent, you must pass `--yes`, or the interactive prompt waits forever.

[ON SCREEN: the created folders.]

Look at what landed. Skills under `.agents/skills`. Your hub under `.ws`, with `config.json` seeded from the template, plus `STACK.md`, the agent hub file, and the autoload file. And notice what did not happen: the installer never writes your repo-root files. Your config, your stack notes, your memory, and your changelog are consumer-owned and are preserved on every update. Managed content, the runtime contracts and the templates, lives inside the skills install, never as copies inside `.ws`.

[PAUSE]

Non-interactive installs are one line each. Project scope is the default. [DEMO: show, do not run, the three lines in the Usage examples below.] Use `--package workflows` when a team wants only the pipelines. Use `--skills` with a comma list when you want a surgical install; dependencies come along automatically, because the installer resolves the dependency graph for you.

Now, global scope. [ON SCREEN: second terminal.] A global install puts the skills once, under your home `.agents/skills`, and every project on the machine can use them, while each project still keeps its own `.ws/config.json`. That mix is called hybrid mode, and it is fully supported. Project config always wins.

[DEMO]

```bash
npx --yes github:jpolvora/workflow-skills install --full --global --yes
```

During an interactive global install, the tool also asks about secondary host targets: canonical, plus Claude, Codex, and Gemini projections, so other agent hosts on your machine see the same skills. Non-interactive runs reuse your recorded targets and auto-detect existing host folders. On Windows, the Gemini target gets real folder copies, because that host's scanner skips links. That detail is handled for you; you only choose the targets.

[PAUSE]

Day two operations: update, check, uninstall. Update refreshes the skills you already track, from the manifest in `.ws/installed-skills.json`. Add `--include-new` when you also want brand-new upstream skills. [DEMO: run the version and check commands.]

```bash
npx --yes github:jpolvora/workflow-skills --version
npx --yes github:jpolvora/workflow-skills --check
npx --yes github:jpolvora/workflow-skills integrity
npx --yes github:jpolvora/workflow-skills update
```

The integrity command recomputes SHA-256 digests of your installed skills and compares them with the local record. Installs verify the source before copying, and the copy after. A mismatch fails closed: exit non-zero, no silent continue. There is an unsafe override flag; pretend it does not exist.

Uninstall removes named skills and cascades dependencies that nothing else needs, and it never deletes your `.ws` consumer data. [PAUSE] Say that sentence again, because it is the trust contract of the whole tool: uninstall never deletes your config, your memory, or your changelog.

Last step today: prove the install is healthy. Ask your agent to run the `ws-check-harness` skill, phases zero to five C. In a fresh install you want zero critical findings. Then run `/ws-version` any time you need a one-screen snapshot: install scope, skill directory, and package version. [DEMO: show a version snapshot.]

[ON SCREEN: back to you.]

Installed, verified, and safe to update. Next video is the one people usually skip and later regret: configuration. We will fill `.ws/config.json` properly, once, and every later chapter gets easier because of it.

## Usage examples

```bash
# Interactive (recommended first time)
npx --yes github:jpolvora/workflow-skills

# Non-interactive, project scope
npx --yes github:jpolvora/workflow-skills install --full --yes
npx --yes github:jpolvora/workflow-skills install --package workflows --yes
npx --yes github:jpolvora/workflow-skills install --skills ws-spec-to-pr,ws-goal-fix-pr --project --yes

# Global scope + explicit host targets
npx --yes github:jpolvora/workflow-skills install --full --global --targets all --yes
npx --yes github:jpolvora/workflow-skills install --full --global --targets gemini --yes

# Update / uninstall (consumer data under .ws/ is always preserved)
npx --yes github:jpolvora/workflow-skills update
npx --yes github:jpolvora/workflow-skills update --include-new
npx --yes github:jpolvora/workflow-skills uninstall --skills ws-goal-fix-pr --yes

# Health and version
npx --yes github:jpolvora/workflow-skills --version
npx --yes github:jpolvora/workflow-skills --check
npx --yes github:jpolvora/workflow-skills integrity
```

curl shim (same flags after `bash -s --`; still requires Node):

```bash
curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s -- install --full --yes
```

## Features in this chapter (enumerated)

1. Zero-dependency Node CLI (`bin/cli.js`); Node ≥ 22 is the only runtime; no `.py` files ship.
2. Three packages: Full (`f`), Workflows (`w`, 47 skills), Extra (`e`, 8 skills); dependency closure is automatic.
3. Project scope (`.agents/skills` + `.ws/`) vs global scope (`$HOME/.agents/skills`, override `WORKFLOW_SKILLS_GLOBAL_DIR`); hybrid mode with project config winning.
4. Global secondary host targets: `canonical`, `claude`, `codex`, `gemini` (declarative `skills.json` + Windows physical copies).
5. SHA-256 integrity before and after copy; `integrity` audit and `--check` version comparison; self-overwrite guard blocks installing the source repo into itself.
6. Update with `--include-new`; uninstall cascades unused deps and never deletes `.ws/` consumer data.
7. Relocatable hub root via `pathTokens.sharedDir`; the bootstrap `.ws/config.json` stays the discovery point and traversal fails closed.

## Common mistakes

1. Adding `@latest` or `@main` to the GitHub specifier (npm exit 128). Use the canonical form verbatim.
2. Running an interactive install under a pipe without `--yes` (it hangs waiting for input).
3. Installing into the upstream source repo itself while authoring skills. Upstream work targets a scratch directory or `test/` instead.

## Recap (say this)

"One command installs, one command updates, and your data is never the price. Next: configuration."

## Practice

Install Workflows (not Full) into a throwaway folder, run `integrity`, uninstall one skill, and confirm `.ws/config.json` is still on disk. That round trip is the trust contract, proven by hand.

## Next video

Chapter 03 — Configuration Masterclass: config.json Without Fear.
