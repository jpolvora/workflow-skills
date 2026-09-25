---
name: ws-patterns-generator
description: Consumer project-patterns skill generator that harvests run artifacts and project knowledge to seed and refresh an autoloaded, hub-hosted ws-project-patterns skill.
version: 0.4.71
disable-model-invocation: true
invocation_names:
  - ws-patterns-generator
  - patterns-generator
---

# ws-patterns-generator

> When this skill is loaded, output "ws-patterns-generator loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check. This skill is config-dependent: without project `.ws/config.json` (bootstrap, fixed), use `user-gate` to recommend `ws-configure-project`; cancel stops the run.

Recurring generator for the consumer project. It harvests findings and (re)writes the consumer-owned skill `{sharedDir}/ws-project-patterns/SKILL.md`: blank skeleton on first run, full rewrite when stale, appended bullets otherwise. The body is hub-hosted and autoload-only: the installer never ships or overwrites it, and it is loaded through its Always-applied row in `{sharedDir}/autoload.md`, not through skills-root discovery. Complements `ws-self-learning` (MEMORY traps) without writing MEMORY itself.

## Invocation

```text
/ws-patterns-generator
/ws-patterns-generator --dry-run
```

| Flag | Effect |
|------|--------|
| (none) | Harvest → regenerate → apply → summarize → changelog |
| `--dry-run` | Print the planned summary and diff without writing any file |

## Steps

1. **Resolve paths** — Expand `{skillsRoot}` / `{sharedDir}` / `{plansDir}` / `{specsDir}` from project config. The generated body and the consumer autoload table use the configured project hub (single resolver `resolve_hub_root.cjs`: bootstrap `.ws/config.json`, then `pathTokens.sharedDir`, else `.ws`): body `{sharedDir}/ws-project-patterns/SKILL.md`, autoload `{sharedDir}/autoload.md`. A relocated hub keeps its bootstrap `.ws/config.json` discovery copy.
   - Done when: generated path and autoload path are resolved and config is verified.

2. **Seed when missing** — Run `node {skillsRoot}/ws-patterns-generator/scripts/seed_generated_skill.cjs --repo-root .` (exit 0). The script writes under the configured hub, writes only when the body is missing, and refuses traversal, symlinked, and unresolvable hubs fail-closed. When this run seeded the body (first run), append the Always-applied row for `ws-project-patterns` to the consumer autoload table when missing; never duplicate an existing row. Later runs never edit autoload. Opt out: `stop ws-project-patterns`.
   - Done when: the body exists; the autoload row is present at most once.

3. **Harvest sources** — Read the minimum set: workflow state plus telemetry plus logs under `{plansDir}`, the effective changelog, the effective MEMORY, README plus AGENTS.md, `rules.*` files, wiki content, the stack file. A missing source is tolerated and named in the summary instead of aborting the run.
   - Done when: every source has findings or a named skip.

4. **Decide rewrite vs append** — Rewrite the whole body when the run retires or relocates existing bullets; otherwise append new bullets. Every bullet carries an evidence pointer to its source path.
   - Done when: mode plus reason recorded; every new bullet has a pointer.

5. **Write or preview** — Apply the regenerated body on explicit invoke. With `--dry-run`, print the planned summary and diff and write nothing.
   - Done when: applied, or preview printed with zero writes.

6. **Summarize and log** — Emit one summary labeled `added`, `rewrote`, or `unchanged` with added/retired counts. A run with no new findings is idempotent: label `unchanged`, leave the body byte-identical. Every applied run appends one changelog entry through the effective changelog file with the label plus counts.
   - Done when: summary emitted; changelog appended for applied runs.

7. **Secrets and portability gate** — The body holds no secrets, tokens, or personal data; pasted consumer traces are anonymized to the failure class. Bodies stay en-us with portable path tokens and name no host products; `user-gate` appears only for gates.
   - Done when: the body passes review with nothing to strip.

## Rules

- en-us; path tokens only; explicit `node` launchers; never `git add` or commit.
- The generated body stays under the configured project hub (`{sharedDir}`, default `.ws/`; consumer-owned, installer-excluded, tracked) and is never seeded into `{skillsRoot}`. The hub root is relocatable via `pathTokens.sharedDir` (repo-relative, contained; bootstrap `.ws/config.json` stays fixed as the discovery point); traversal and symlinked escapes are refused fail-closed.
- Never write MEMORY.md or vault traps directly; never edit managed skill bodies.
- Autoload row edits happen at seed/first-run only.

## Dependencies

[ws-configure-project](../ws-configure-project/SKILL.md) · [ws-self-learning](../ws-self-learning/SKILL.md) · [ws-changelog](../ws-changelog/SKILL.md) · [ws-secrets-leak-review](../ws-secrets-leak-review/SKILL.md)
