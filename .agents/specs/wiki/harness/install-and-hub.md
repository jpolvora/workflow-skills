# Install & Hub (`harness`)

> Provenance: `bin/cli.js`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/runtime/hub-layout.json`, root `AGENTS.md` § Skill SoT, living synthesis of specs 0002, 0007, 0010, 0013, 0017, 0027, 0032, 0037, 0052, 0058, 0061, 0069, 0070, 0071.

## Feature

The harness ships portable skill bodies through a package installer that supports Workflows-only and Full package selections, project-local installs, and optional global installs under `$HOME/.agents/skills`. Canonical skill content lives only under `.agents/skills/ws-*` in the upstream source tree; consumers receive managed copies on install and update. Hybrid execution resolves skill bodies local-first then `{globalSkillsRoot}`, while project `$PWD/.agents/skills/ws-shared/config.json` always overrides global hub defaults. The consumer hub splits into installer-owned `runtime/` (contracts, scripts, schemas), setup-only `templates/` (seeds), and consumer-owned root files (`config.json`, `STACK.md`, `MEMORY.md`, `CHANGELOG.md`), classified by `hub-layout.json`. Upstream authoring prose in root `AGENTS.md` stays separate from the consumer-portable hub contract in `ws-shared/AGENTS.md`.

## How it works

Authors hash and publish only from `.agents/skills/` in the upstream package. Skill bodies never name host products, never hardcode consumer artifact paths, and never ship legacy-path shims; install and update deliver the latest layout only. Config resolution follows explicit override, then project-local hub, then global fallback. Global installs write only the minimal consumer bundle and never copy `runtime/`, `templates/`, manifests, or memory files into the global tree as consumer data.

Package selection auto-selects transitive dependencies when a skill is chosen, and deselect never silently drops dependents. Retired skill ids migrate idempotently to canonical ids during update. Unpackaged external companions such as `ws-memo` and `ws-session-tracking` appear in `externalSkills`, are never vendored, and are never required for core workflow installs. Consumer mode audits `ws-shared/AGENTS.md` as the hub entrypoint; no skill or installer may require a repo-root `.agents/AGENTS.md`. The `rules.harness` path resolves through a thin local pointer or documented global fallback.

Naming law requires every id containing `spec` to match `^ws-spec-`, with identical strings across folder name, `name:` frontmatter, dependency graph keys, and router rows. Subagent projection via `compile_host_subagents.cjs` is disabled by default, compiled agents set `disable-model-invocation: true`, and unsupported hosts fall back to generic dispatch.

## Backend

The installer entrypoint is `bin/cli.js` with flags such as `--global`, `--targets`, and `--symlink`. `bin/skill-dependencies.json` carries the install graph, `packageVersion`, and `externalSkills`. `bin/install-rules.js` implements the target registry and `HUB_WHITELIST`. `retired_artifacts.cjs` tracks `RETIRED_HUB_FILES` and `RETIRED_DEFAULTS_KEYS`. Multi-host global installs keep `$HOME/.agents/skills` canonical and project per-skill junctions on Windows or symlinks on POSIX into companion host skill directories without clobbering third-party skills.

Consumer configuration uses `pathTokens` (`skillsRoot`, `sharedDir`), `providers.active` and `providers.scm`, `plans.specsDir` and optional `plans.wikiDir`, `rules.*` guardrail paths, and `defaults.specializedSubagents`. Consumer-owned scripts resolve the hub from `$PWD` via `resolve_consumer_root.cjs`, never from `__file__` inside a managed skill copy.
