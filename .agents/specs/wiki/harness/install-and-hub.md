# Install & Hub (`harness` — part 1)

## Feature Overview

The harness ships portable skill bodies (`.agents/skills/ws-*` is the only SoT) through a package installer (`Workflows` / `Extra`, `--global` vs project-local) with hybrid execution: skill bodies resolve local-first then `{globalSkillsRoot}`, while project `$PWD/.agents/skills/ws-shared/config.json` always wins over global defaults. The consumer hub (`ws-shared/`) is split into installer-owned `runtime/` (contracts, scripts, schemas, stacks), setup-only `templates/` (seeds), and consumer-owned root (`config.json`, `STACK.md`, `MEMORY.md`, `CHANGELOG.md`), classified by a layout manifest. Upstream authoring (root `AGENTS.md` dogfood contract, version bumps, site rebuilds) is fully separated from the consumer-portable hub. Skill ids follow `ws-{family}-{verb}` with the spec family first; the compiler can project canonical skills into host-native subagents.

## Business Rules & Logic

- **SoT and neutrality**: author and hash only under `.agents/skills/`; skill bodies never name host products, never hardcode consumer paths, and never keep legacy-path shims — latest layout only on install/update.
- **Hybrid precedence**: explicit override > project-local hub > global fallback; global installs write only the minimal consumer bundle and never copy `runtime/`/`templates/`/manifests/memory globally; consumer files are preserved byte-identical and migrations fail closed on collision.
- **Package selection**: selecting a skill auto-selects transitive deps; deselect never silently drops dependents; retired ids migrate idempotently to canonical ids; unpackaged external companions (`ws-memo`, `ws-session-tracking`) are declared in `externalSkills`, never vendored, pruned, or required.
- **Hub identity**: consumer mode audits `ws-shared/AGENTS.md` as the hub; no skill/installer may require `.agents/AGENTS.md`; `rules.harness` resolves via thin local pointer or documented global fallback.
- **Naming law**: every id containing `spec` matches `^ws-spec-`; folder, `name:`, graph keys, and router rows use the identical string; `update` leaves only new directories.
- **Subagents projection**: disabled by default; compiled agents set `disable-model-invocation: true`; unsupported hosts fall back to generic dispatch.

## Technical Architecture

- **Installer**: `bin/cli.js` (`--global`, `--targets`, `--symlink`), `bin/skill-dependencies.json` (+ `externalSkills`), `bin/install-rules.js` target registry + `HUB_WHITELIST`, `runtime/hub-layout.json` manifest, `retired_artifacts.cjs` (`RETIRED_HUB_FILES`, `RETIRED_DEFAULTS_KEYS`), `compile_host_subagents.cjs --host/--prefix/--clean/--check/--json/--force`.
- **Multi-host globals**: `$HOME/.agents/skills` stays canonical; per-skill junctions (Windows) / symlinks (POSIX) with copy fallback project into Claude/Codex/Gemini dirs without clobbering third-party skills.
- **Consumer config**: `pathTokens` (`skillsRoot`, `sharedDir`), `providers.active/scm`, `plans.specsDir/wikiDir`, `rules.*`, `defaults.specializedSubagents`; consumer-owned scripts resolve the hub from `$PWD`, never `__file__`.
- **Provenance**: living synthesis of specs 0002, 0007, 0010, 0013, 0017, 0027, 0032, 0037, 0052, 0058, 0061, 0069, 0070, and 0071.
