# spec-memo ↔ workflow-skills integration map

**Audience:** agents running `ws-spec-memo` or vault-mode memory/changelog.

## Ownership (no overlap)

Two products, two skills. Load **one** for the job; do not merge bodies or re-document the other package's protocol here.

| Product | Skill | Owns | Does not own |
|---------|-------|------|--------------|
| **workflow-skills** | **`ws-spec-memo`** | `config.json` flags (`enableMemoryFiles`, `enableSpecMemoIntegration`, `specMemo.*`), setup/import/disable, harness preflight (`check_spec_memo.cjs`), hybrid fallback when MCP/CLI is down, **which** backends `read-memory` / `update-memory` / `update-ws-changelog` use | Vault MCP/CLI schemas, tool parameter matrices, doctor/canvas/sync/prompt recipes, `install_skills`, session/prompt tracking |
| **spec-memo** | **`/ws-memo`** | Day-to-day vault memory MCP/CLI (bootstrap, search, get, upsert, append, forget, gc, promote, canvas, doctor, rank, sync), `install_skills` (defaults install **both** `ws-memo` + `ws-session-tracking`), host MCP wiring via `memo setup` | Writing workflow-skills `{sharedDir}/config.json` / `specMemo.*`; Spec-to-PR plan timesheets |
| **spec-memo** | **`/ws-session-tracking`** | Prompt turn ingestion, `session_start` / `session_end`, intent stories, `derive_rules`, vault `memo activity` / MCP `prompt` (billing by client/session) | Harness `config.json`; plan-folder Spec-to-PR clocks (`ws-activity-report`); trap upsert protocol (`/ws-memo`) |
| workflow-skills | **`ws-self-learning`** | Local trap files + compile | Vault upsert protocol |
| workflow-skills | **`ws-changelog`** | Local changelog body | Vault `append` protocol |
| workflow-skills | **`ws-activity-report`** (Extra) | Spec-to-PR / lite plan-folder timesheets (bootstrap → PR thread / delivery commit) | Vault `memo activity` / prompt sessions |
| workflow-skills | **`ws-configure-project`** `--section specMemo` | Seeds flags by calling this bridge's scripts | Runtime vault ops |

`ws-spec-memo` must **not** vendor [SURFACE.md](https://github.com/jpolvora/spec-memo/blob/develop/.agents/skills/ws-memo/references/SURFACE.md) or count MCP tools (that catalog drifts). If `/ws-memo` / `/ws-session-tracking` consumer-handoff wording drifts, open a [spec-memo](https://github.com/jpolvora/spec-memo) issue ([companion](https://github.com/jpolvora/spec-memo/issues/17)) — do not paste a second encyclopedia into this package.

### Two different "setup" commands

| Command | Package | Writes |
|---------|---------|--------|
| `/ws-spec-memo setup` or configure-project `--section specMemo` | workflow-skills | `{sharedDir}/config.json` → `specMemo.*` + memory flags |
| `memo setup` (CLI) | spec-memo | Host MCP wiring + vault deployment mode (`local` / `hybrid` / `remote`) only — **not** harness `config.json` |

### Agent decision tree

```text
Configure / import / disable / harness check / MCP down + hybrid fallback
  → ws-spec-memo

Vault memory (search / get / upsert / append / bootstrap when MCP up / canvas / doctor / sync)
  → /ws-memo  (require enableSpecMemoIntegration: true)

Prompt turns / session_start|end / derive_rules / vault activity report
  → /ws-session-tracking  (MCP prompt; same vault as /ws-memo)

Spec-to-PR plan-folder timesheet for a civil day
  → ws-activity-report  (Extra; does not use vault prompt sessions)

read-memory / update-memory / update-ws-changelog
  → tools.md aliases (this map) ; vault half executed via /ws-memo
```

`specMemo.bootstrapOnSession: true` → recommend **`/ws-memo` bootstrap** at session start when MCP is registered — **not** `/ws-spec-memo bootstrap`. Optional: `/ws-session-tracking` `session_start` when the agent is tracking billable prompt turns (independent of memory bootstrap).

### Seamless enable sequence

```text
1. /ws-spec-memo setup  (or ws-configure-project --section specMemo)
2. Register MCP from MCP-TEMPLATE.json  ({specMemo.cli} serve)
3. /ws-memo install_skills if ws-memo or ws-session-tracking SKILL.md missing
4. Thereafter: tools.md aliases + /ws-memo for memory; /ws-session-tracking for prompt/session
```
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
2. Ensure runtime skills are loadable (`/ws-memo` `install_skills` installs both by default):
   - `{skillsRoot|globalSkillsRoot}/ws-memo/SKILL.md` — vault memory
   - `{skillsRoot|globalSkillsRoot}/ws-session-tracking/SKILL.md` — prompt / session / vault activity
3. Use **`/ws-memo`** for memory ops and **`/ws-session-tracking`** for prompt/session — this skill stops.
4. Do **not** route Spec-to-PR civil-day timesheets through vault `memo activity`; that stays **`ws-activity-report`**.

`check_spec_memo.cjs` may **warn** when either runtime skill is missing while vault is enabled; it must not fail the Recommended disabled-vault path.

## Related skills

| Skill | Relationship |
|-------|--------------|
| `ws-spec-memo` | Setup, check, import, disable, hybrid fallback (this skill) |
| `ws-memo` | Runtime vault **memory** (spec-memo package; load after setup) |
| `ws-session-tracking` | Runtime prompt/session/activity (spec-memo package; same `install_skills`) |
| `ws-activity-report` | Spec-to-PR plan-folder timesheet (workflow-skills Extra; not vault sessions) |
| `ws-self-learning` | In-repo trap engine; local half of `read-memory` / `update-memory` |
| `ws-changelog` | In-repo history; local half of `update-ws-changelog` |
| `ws-configure-project` | Seeds `config.json`; optional `--section specMemo` for vault setup |
| `ws-cleanup` | Removes in-tree disposable scratch after import |
| `ws-doctor` | Diagnoses ws-* install; not vault health |
