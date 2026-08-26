# spec-memo ↔ workflow-skills integration map

**Audience:** agents running `ws-spec-memo` or vault-mode memory/changelog.

## Problem

workflow-skills stores agent working state in-repo by default:

| Artifact | Default path | Skill |
|----------|--------------|-------|
| Anti-regression traps | `{sharedDir}/memory/*.md` → `MEMORY.md` | `ws-self-learning` |
| Task history | `{rules.changelogFile}` | `ws-changelog` |
| Feature specs (of record) | `{specsDir}/*.spec.md` | `ws-write-spec`, providers |
| Workflow run artifacts | `{plansDir}/{slug}/` | `ws-spec-to-pr*` |
| PRD index | `{specsDir}/index.PRD` | `ws-spec-index` |

[spec-memo](https://github.com/jpolvora/spec-memo) moves **working memory** (traps, decisions, plans, logs, scratch) to `~/.spec-memo/projects/<projectId>/`, keyed by normalized git remote. Product repos keep specs of record and product code only.

## Config switch

`{sharedDir}/config.json` → `specMemo`:

| Key | Default | Role |
|-----|---------|------|
| `enabled` | `false` | When explicit `true`, bridge table below applies |
| `mode` | `vault` | `vault` = vault-only writes; `hybrid` = fallback to in-repo MEMORY on MCP/CLI failure |
| `cli` | `memo` | CLI launcher (`memo` or `npx -y spec-memo`) |
| `vaultRoot` | `""` | Override `$SPEC_MEMO_ROOT`; empty uses `~/.spec-memo` |
| `bootstrapOnSession` | `true` | Recommend `bootstrap` at session start when enabled |
| `writeBlockHook` | `false` | Whether setup ran `memo hook install` |
| `importOnEnable` | `true` | Whether setup ran one-shot `memo import` |
| `mcpServerName` | `spec-memo` | Expected MCP namespace id in agent host |

## Operation routing

When `specMemo.enabled: true`, agents follow `tools.md` aliases and [`ws-spec-memo`](../SKILL.md) — autoloaded `ws-self-learning` / `ws-changelog` skill bodies are unchanged in this release; the bridge reroutes at the alias layer.

| Moment | In-repo (default) | Vault mode (`specMemo.enabled: true`) |
|--------|-------------------|----------------------------------------|
| Session start | `Grep`/`Read` `MEMORY.md` | `memo bootstrap` or MCP `bootstrap` |
| Pre-plan consult | `ws-self-learning` `--match-paths` | `bootstrap --path …` or `search --kind trap` |
| New trap | Write `memory/YYYY-MM-DD-*.md` + `--compile` | `upsert --kind trap` with DO NOT / INSTEAD DO body |
| Task done changelog | Append `{changelogFile}` | `append --event "…"` (+ hybrid may still append in-repo) |
| Fix-PR learning | `memory/*` + compile | `upsert --kind trap` |
| Legacy migration | Manual copy | `memo import --from {repoRoot}` |
| Pollution scan | `ws-cleanup` | `memo doctor` + `ws-cleanup` for untracked scratch |
| Promote ADR to product | Edit `docs/` manually | `memo promote {id} --to docs/…` |

## Import mapping (`memo import`)

spec-memo importer scans (first match wins per category):

| Legacy source | Vault destination |
|---------------|---------------------|
| `{specsDir}/`, `specs/` | `projects/<id>/specs/` |
| `{sharedDir}/memory/`, `memory/` | `traps/` (+ decisions when frontmatter matches) |
| `{plansDir}/` | `plans/` |
| `{rules.changelogFile}` | `logs/` |

Specs of record may remain in `{specsDir}` for Spec-to-PR register flow; vault holds working copies and traps.

## Git boundaries (vault mode)

**May stay in product git:** `{specsDir}/*.spec.md`, `index.PRD`, product source, hub `config.json` (gitignored locally).

**Must not be committed when vault mode is active:** `{plansDir}/`, `{sharedDir}/MEMORY.md`, `{sharedDir}/memory/*`, agent changelogs, `.state.md`, `telemetry.jsonl`.

Install `memo hook install` to block accidental commits of those paths.

## Two-skill split (setup vs runtime)

| Skill | Package | Role |
|-------|---------|------|
| **`ws-spec-memo`** | workflow-skills (this repo) | Setup/bridge only: `specMemo.*` in `{sharedDir}/config.json`, import, hybrid MEMORY fallback, write-block hook interview, check/bootstrap |
| **`ws-memo`** | [spec-memo](https://github.com/jpolvora/spec-memo) | Runtime vault ops: search, get, forget, gc, promote (formats), canvas, SSE, status, rank, sync/backup, hooks |

**`ws-spec-memo` does not own** search, get, gc, promote, canvas, SSE, status monitor, rank, vault sync/backup, or the full MCP/CLI catalog. Do not duplicate [SURFACE.md](https://github.com/jpolvora/spec-memo/blob/develop/.agents/skills/ws-memo/references/SURFACE.md) here.

### Runtime handoff (after setup)

When `specMemo.enabled: true` and the host has registered the `spec-memo` MCP server (or `{specMemo.cli} serve`):

1. Finish wiring with **`ws-spec-memo`** (setup, check, bootstrap, import, disable).
2. Load **`ws-memo`** from the spec-memo package or clone:
   - `{skillsRoot}/ws-memo/SKILL.md` when installed beside other `ws-*` skills, **or**
   - copy from `spec-memo/.agents/skills/ws-memo/` into `{skillsRoot}/ws-memo/`.
3. Use **`/ws-memo`** (or invoke that skill) for day-to-day vault operations — not an expanded `ws-spec-memo` body.

`check_spec_memo.cjs` may **warn** when `ws-memo` is missing while vault is enabled; it must not fail the Recommended disabled-vault path.

## Related skills

| Skill | Relationship |
|-------|--------------|
| `ws-spec-memo` | Setup, check, bootstrap bridge (this skill) |
| `ws-memo` | Runtime vault ops (spec-memo package; load after setup) |
| `ws-self-learning` | In-repo trap engine; hybrid fallback |
| `ws-changelog` | In-repo history; hybrid may dual-write |
| `ws-configure-project` | Seeds `config.json`; optional `--section specMemo` for vault setup |
| `ws-cleanup` | Removes in-tree disposable scratch after import |
| `ws-doctor` | Diagnoses ws-* install; not vault health |
