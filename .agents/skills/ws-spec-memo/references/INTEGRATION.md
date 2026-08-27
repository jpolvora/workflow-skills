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

## Config switches

`{sharedDir}/config.json` → `enableMemoryFiles` and `enableSpecMemoIntegration` (or under `specMemo`):

| Key | Default | Role |
|-----|---------|------|
| `enableMemoryFiles` | `true` | When `true`, write traps/learnings to `{sharedDir}/memory/*.md` and compiled `MEMORY.md` |
| `enableSpecMemoIntegration` | `false` | When `true`, route memory reads/writes to `spec-memo` MCP server tools or CLI |
| `specMemo.cli` | `memo` | CLI launcher (`memo` or `npx -y spec-memo`) |
| `specMemo.vaultRoot` | `""` | Override `$SPEC_MEMO_ROOT`; empty uses `~/.spec-memo` |
| `specMemo.bootstrapOnSession` | `true` | Recommend `bootstrap` at session start when spec-memo enabled |
| `specMemo.writeBlockHook` | `false` | Whether setup ran `memo hook install` |
| `specMemo.importOnEnable` | `true` | Whether setup ran one-shot `memo import` |
| `specMemo.mcpServerName` | `spec-memo` | Expected MCP namespace id in agent host |

## Routing Matrix (4 Combinations)

| `enableMemoryFiles` | `enableSpecMemoIntegration` | Mode Name | Read Behavior (`read-memory`) | Write Behavior (`update-memory`) |
|---|---|---|---|---|
| `true` | `false` | Local Files Only (Default) | `Grep`/`Read` `{sharedDir}/MEMORY.md` | Write `{sharedDir}/memory/*.md` + `--compile` |
| `false` | `true` | Spec-Memo Only (Vault) | MCP/CLI `bootstrap` or `search` | `upsert --kind trap` (no local files created) |
| `true` | `true` | Dual Mode (Both) | Query MCP/CLI first, supplement with `MEMORY.md` | Persist to both local markdown files and vault |
| `false` | `false` | Disabled (None) | Returns empty results (no error) | Skips persistence; records `Learning: N/A` |

## Operation routing

| Moment | Local Markdown (`enableMemoryFiles`) | Spec-Memo MCP/CLI (`enableSpecMemoIntegration`) |
|--------|---------------------------------------|-------------------------------------------------|
| Session start | `Grep`/`Read` `MEMORY.md` | `memo bootstrap` or MCP `bootstrap` |
| Pre-plan consult | `ws-self-learning` `--match-paths` | `bootstrap --path …` or `search --kind trap` |
| New trap | Write `memory/YYYY-MM-DD-*.md` + `--compile` | `upsert --kind trap` with DO NOT / INSTEAD DO body |
| Failure reflection ($\ge 2$ friction) | Mandatory trap in `{sharedDir}/memory/` | Mandatory `upsert --kind trap` |
| Adversarial audit (`REFUTED` / `CAVEATS`) | Mandatory reflection in `memory/` | High/Critical `upsert --kind trap` |
| Task done changelog | Append `{changelogFile}` | `append --event "…"` (event log) |
| Fix-PR learning | `memory/*` + compile | `upsert --kind trap` |
| Legacy migration | Manual copy | `memo import --from {repoRoot}` |
| Pollution scan | `ws-cleanup` | `memo doctor` + `ws-cleanup` for untracked scratch |
| Promote ADR to product | Edit `docs/` manually | `memo promote {id} --to docs/…` (via `ws-memo`) |

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
