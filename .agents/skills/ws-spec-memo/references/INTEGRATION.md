# spec-memo ↔ workflow-skills integration map

**Audience:** agents running `ws-spec-memo` or vault-mode memory/changelog.

## Ownership (no overlap)

Two complementary skills. Load one for the job; do not merge them.

| Need | Skill | Package |
|------|-------|---------|
| Enable/disable vault, interview `specMemo.*`, import MEMORY, hybrid fallback, harness preflight | **`ws-spec-memo`** | workflow-skills (this skill) |
| Day-to-day vault MCP/CLI (bootstrap, search, get, upsert, append, forget, gc, promote, prompt, canvas, doctor, rank, sync, install_skills) | **`/ws-memo`** | [spec-memo](https://github.com/jpolvora/spec-memo) (not packaged here) |
| Local trap files + compile | **`ws-self-learning`** | workflow-skills |
| Local changelog body | **`ws-changelog`** | workflow-skills |
| Seed `config.json` including memory backends | **`ws-configure-project`** `--section specMemo` | workflow-skills |

`ws-spec-memo` does **not** own the vault tool catalog, SSE/canvas ports, or `install_skills`. Do not duplicate [SURFACE.md](https://github.com/jpolvora/spec-memo/blob/develop/.agents/skills/ws-memo/references/SURFACE.md) here. If `/ws-memo` consumer-handoff wording drifts, open a spec-memo issue ([companion](https://github.com/jpolvora/spec-memo/issues/17)) — do not vendor a second encyclopedia.

### Agent decision tree

```text
Configure / import / disable / harness check / MCP down + hybrid fallback
  → ws-spec-memo

Search / get / upsert / append / bootstrap (MCP up) / canvas / doctor / sync / prompt
  → /ws-memo  (require enableSpecMemoIntegration: true)

read-memory / update-memory / update-ws-changelog
  → tools.md aliases (this map) ; vault half executed via /ws-memo
```

`specMemo.bootstrapOnSession: true` means recommend **`/ws-memo` bootstrap** at session start when MCP is registered — not `/ws-spec-memo bootstrap`.

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
| `enableSpecMemoIntegration` | `false` | When `true`, route memory reads/writes to spec-memo MCP or `{specMemo.cli}` |
| `specMemo.mode` | (`local` when files-only) | Persisted label: `local` \| `vault` \| `hybrid` \| `disabled`. When either boolean flag is **absent**, `resolveMemoryRouting` derives both flags from `mode` (incomplete merges must not silently re-enable local files). Explicit boolean flags always win. |
| `specMemo.cli` | `memo` | CLI launcher (`memo` or `npx -y spec-memo`) — always expand this token; never hardcode `memo` |
| `specMemo.vaultRoot` | `""` | Override `$SPEC_MEMO_ROOT`; empty uses `~/.spec-memo` |
| `specMemo.bootstrapOnSession` | `true` | Recommend `/ws-memo` bootstrap at session start when vault enabled |
| `specMemo.writeBlockHook` | `false` | Whether setup ran `memo hook install` |
| `specMemo.importOnEnable` | `true` | Whether setup ran one-shot `memo import` |
| `specMemo.mcpServerName` | `spec-memo` | Expected MCP namespace id in agent host |

## Routing Matrix (4 Combinations)

| `enableMemoryFiles` | `enableSpecMemoIntegration` | Mode Name | Read Behavior (`read-memory`) | Write Behavior (`update-memory`) |
|---|---|---|---|---|
| `true` | `false` | Local Files Only (Default) | `Grep`/`Read` `{sharedDir}/MEMORY.md` | Write `{sharedDir}/memory/*.md` + `--compile` |
| `false` | `true` | Spec-Memo Only (Vault) | `/ws-memo` bootstrap or search | `/ws-memo` upsert `kind: trap` (no local files created) |
| `true` | `true` | Dual Mode (Both) | Query vault first, supplement with `MEMORY.md` | Persist to both local markdown files and vault |
| `false` | `false` | Disabled (None) | Returns empty results (no error) | Skips persistence; records `Learning: N/A` |

## Lifecycle translation

workflow-skills hooks stay named `read-memory` / `update-memory` / `update-ws-changelog`. This bridge decides backends; `/ws-memo` executes vault tools (discover schema first). Sanitize trap bodies with `sanitize_memory.cjs` before either backend.

| Moment | Local Markdown (`enableMemoryFiles`) | Vault (`enableSpecMemoIntegration`) |
|--------|---------------------------------------|-------------------------------------|
| Session start (`bootstrapOnSession`) | `Grep`/`Read` `MEMORY.md` | `/ws-memo` bootstrap (MCP preferred). `/ws-spec-memo bootstrap` only when MCP/CLI is down and mode is hybrid |
| Pre-plan / fix-pr / implement consult (`read-memory`) | `ws-self-learning` `--match-paths` / `Grep` `MEMORY.md` — **same evidence class as code** | `/ws-memo` bootstrap / search `kinds: ["trap"]` — **required when this flag is true**; dual → vault first then local |
| New trap | Write `memory/YYYY-MM-DD-*.md` + `--compile` | `/ws-memo` upsert `kind: trap` with DO NOT / INSTEAD DO; MCP frontmatter `severity`: `low`\|`medium`\|`high`\|`critical` (lowercase only — Title-Case `High` fails vault validation) |
| Failure reflection ($\ge 2$ friction) | Mandatory trap in `{sharedDir}/memory/` | Mandatory vault upsert |
| Adversarial audit (`REFUTED` / `CAVEATS`) | Mandatory reflection in `memory/` when files enabled | High/Critical vault upsert when vault enabled |
| Task done changelog | Append `{changelogFile}` | `/ws-memo` append (`event`) |
| Fix-PR learning | `memory/*` + compile | `/ws-memo` upsert `kind: trap` |
| Legacy migration | Manual copy | `{specMemo.cli} import --from {repoRoot}` (this skill's `import` subcommand) |
| Pollution scan | `ws-cleanup` | Harness: `check_spec_memo.cjs`. Vault residue: `/ws-memo` doctor |
| Promote ADR to product | Edit `docs/` manually | `/ws-memo` promote (formats live in that skill) |

After a vault trap write succeeds, do **not** also write `{sharedDir}/memory/*.md` unless **dual** (both flags true). Hybrid fallback writes local files only when the vault write **failed**.

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

Setup may offer `memo hook install` to block accidental commits of those paths. Bypass: `SKIP_MEMO_HOOK=1`. Do not invent a custom hook script.

## Runtime handoff (after setup)

When `enableSpecMemoIntegration: true` (or `specMemo.enabled: true`) and the host has registered the `spec-memo` MCP server (or `{specMemo.cli} serve`):

1. Finish wiring with **`ws-spec-memo`** (setup, check, import, disable, hybrid bootstrap fallback).
2. Ensure **`ws-memo`** is loadable:
   - `{skillsRoot}/ws-memo/SKILL.md` or `{globalSkillsRoot}/ws-memo/SKILL.md`
   - if missing: user runs **`/ws-memo`** `install_skills` (that skill owns the command)
3. Use **`/ws-memo`** for day-to-day vault operations — this skill stops.

`check_spec_memo.cjs` may **warn** when `ws-memo` is missing while vault is enabled; it must not fail the Recommended disabled-vault path.

## Related skills

| Skill | Relationship |
|-------|--------------|
| `ws-spec-memo` | Setup, check, import, disable, hybrid fallback (this skill) |
| `ws-memo` | Runtime vault ops (spec-memo package; load after setup) |
| `ws-self-learning` | In-repo trap engine; local half of `read-memory` / `update-memory` |
| `ws-changelog` | In-repo history; local half of `update-ws-changelog` |
| `ws-configure-project` | Seeds `config.json`; optional `--section specMemo` for vault setup |
| `ws-cleanup` | Removes in-tree disposable scratch after import |
| `ws-doctor` | Diagnoses ws-* install; not vault health |
