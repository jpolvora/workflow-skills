---
name: ws-spec-memo
version: 0.3.54
disable-model-invocation: true
description: >-
  Setup/bridge only: enable or disable the external vault in config.json, import/migrate
  MEMORY into the vault, run preflight check, or hybrid fallback when MCP/CLI is unavailable.
  Do not trigger for day-to-day vault search/get/upsert/bootstrap when MCP is already registered
  — use /ws-memo instead. Companion reverse-handoff: https://github.com/jpolvora/spec-memo/issues/17
invocation_names:
  - ws-spec-memo
  - spec-memo-setup
---

# ws-spec-memo

> When this skill is loaded, output "ws-spec-memo loaded."

**Bridge skill:** routes workflow-skills memory, changelog, failure reflections, and legacy `.agents` artifacts to the [spec-memo](https://github.com/jpolvora/spec-memo) external vault based on `config.json` settings (`enableMemoryFiles` and `enableSpecMemoIntegration`).

- **`enableMemoryFiles: true`**: writes traps/learnings to local `{sharedDir}/memory/*.md` and compiles `{sharedDir}/MEMORY.md` via `ws-self-learning`.
- **`enableSpecMemoIntegration: true`**: reads/writes memory records via `spec-memo` MCP server tools or `memo` CLI.
- Both can be enabled (dual-mode: persists to local files and vault), or both disabled. Legacy `specMemo.enabled` and `mode` resolve seamlessly.

Mapping table → [`references/INTEGRATION.md`](references/INTEGRATION.md). MCP host snippet → [`references/MCP-TEMPLATE.json`](references/MCP-TEMPLATE.json) (server key `spec-memo` matches `specMemo.mcpServerName`; aligned with [spec-memo#17](https://github.com/jpolvora/spec-memo/issues/17)).

**Role segregation (two-skill split):**
- **`ws-memo`** (owned by [spec-memo](https://github.com/jpolvora/spec-memo)): upstream runtime skill for day-to-day vault operations (10 MCP tools: `bootstrap`, `search`, `get`, `upsert`, `append`, `forget`, `gc`, `promote`, `check_version`, `install_skills` + CLI extras like `canvas`, `doctor`, `rank`, `sync-vault`).
- **`ws-spec-memo`** (owned by workflow-skills): integration bridge covering harness configuration (`config.json`), setup wizard interview, lifecycle hook translation (failure reflection, adversarial audit traps, changelog append), dual-mode fallback, preflight health diagnostics, and legacy data import.

**Runtime (after setup):** when vault is enabled and MCP/`spec-memo` is already registered, prefer **`/ws-memo`** / MCP `bootstrap` for session briefs and vault ops — do **not** run this skill’s `bootstrap` as the primary path. Keep this skill’s `bootstrap` only as hybrid fallback when vault is off or MCP/CLI fails.

**Also invoked from:** [`ws-configure-project`](../ws-configure-project/SKILL.md) step 7 / `--section specMemo` during project setup.

## Invocation

```text
/ws-spec-memo
/ws-spec-memo setup
/ws-spec-memo check
/ws-spec-memo bootstrap [--slug {slug}] [--path {file}]
/ws-spec-memo import [--dry-run]
/ws-spec-memo disable
```

| Subcommand | Effect |
|------------|--------|
| *(default)* / `setup` | Detect `memo` CLI, interview `specMemo.*`, optional import + write-block hook |
| `check` | Read-only health: CLI, vault, repo pollution, config |
| `bootstrap` | Session brief **with hybrid fallback** — if MCP `spec-memo` / `user-spec-memo` is already registered, prefer `/ws-memo` / MCP `bootstrap` and skip this subcommand; otherwise run CLI bootstrap or in-repo MEMORY |
| `import` | One-shot `memo import --from` for legacy in-tree workflow data |
| `disable` | Set `specMemo.enabled: false` (keeps vault data; restores in-repo memory path) |

## Entry check

Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check. Missing `{sharedDir}/config.json` → `user-gate` recommending `ws-configure-project` before setup (check/bootstrap may still run with defaults).

Expand path tokens from [`tools.md`](../ws-shared/tools.md) before shell.

## Steps — setup (default)

1. **Preflight** — Run:
   ```bash
   node {skillsRoot}/ws-spec-memo/scripts/check_spec_memo.cjs --repo-root {repoRoot} --json
   ```
   Require exit 0 when `specMemo.enabled` is not explicit `true`; when enabled, require exit 0 only if `cli.available` and `doctor.ok` (alias `vault.ok`). Parse `pollution` in all cases.
   - Done when: preflight JSON is in context.

2. **CLI gate** — When `cli.available` is false, `user-gate`:
   1. **Install spec-memo globally (Recommended)** — `npm install -g spec-memo` then re-run preflight
   2. **Use npx for this session only** — set `specMemo.cli` to `npx -y spec-memo`
   3. **Cancel** — STOP (never infer yes)
   - Done when: CLI reachable or user cancelled.

3. **Interview** — `user-gate` sequence (Recommended first on each):
   1. **Enable external vault (`specMemo.enabled: true`)** / Keep in-repo memory only (`false`)
   2. On enable: **Mode vault** (vault-only memory writes) / **Mode hybrid** (vault + in-repo fallback when MCP/CLI fails)
   3. On enable: **Import legacy tree now** / Skip import
   4. On enable: **Install write-block pre-commit hook** (`memo hook install`) / Skip hook
   5. On enable: **Bootstrap on session start** (`specMemo.bootstrapOnSession: true`) / Manual bootstrap only
   - Done when: choices captured for configure script.

4. **Apply config** — Run:
   ```bash
   node {skillsRoot}/ws-spec-memo/scripts/configure_spec_memo.cjs --repo-root {repoRoot} --apply --json --stdin-json < choices.json
   ```
   Write `{choices.json}` as a short uncommitted temp with flags from step 3; delete after. Script merges `specMemo` into `{sharedDir}/config.json` only (never commit).
   - Done when: script exit 0; config summary printed.

5. **MCP host** — When enabled, print [`references/MCP-TEMPLATE.json`](references/MCP-TEMPLATE.json) and remind: register `spec-memo` MCP server in the agent host (stdio: `{cli} serve`). Vault identity binds via git remote; no in-repo pointer files required.
   - Done when: MCP snippet shown or user skipped enable.

6. **Post-setup check** — Re-run `check_spec_memo.cjs`. When import ran, suggest `ws-cleanup` for disposable in-tree scratch after user confirms vault contents.
   - Done when: final report delivered; skill stops.

**Next:** Runtime vault ops → **`/ws-memo`** (spec-memo skill). See [`references/INTEGRATION.md`](references/INTEGRATION.md) § Runtime handoff.

## Steps — check

1. Run `check_spec_memo.cjs --repo-root {repoRoot}` (human markdown default).
2. When `specMemo.enabled` and pollution findings exist, recommend `memo doctor --fix` or `ws-cleanup` via `user-gate`.
   - Done when: report printed; no config writes unless user invokes setup.

**Next:** Runtime vault ops → **`/ws-memo`** when vault is enabled.

## Steps — bootstrap

If MCP `user-spec-memo` / `spec-memo` is already registered, prefer `/ws-memo` / MCP `bootstrap` and skip this subcommand.

1. Read `{sharedDir}/config.json` → `specMemo`. When `enabled` is not explicit `true`, fall back to `ws-self-learning` § Pre-work consult (`Grep`/`Read` `{sharedDir}/MEMORY.md`).
2. When enabled, run `{specMemo.cli}` bootstrap (default `memo bootstrap`) with optional `--slug` / `--path` from invocation. Prefer MCP `bootstrap` tool when the host exposes the `spec-memo` namespace.
3. On CLI/MCP failure and `specMemo.mode` is `hybrid`, warn once and consult in-repo MEMORY. On `vault` mode failure, report actionable fix (install CLI, register MCP, run setup) and STOP.
   - Done when: brief (<8 KB) printed or MEMORY consult completed.

**Next:** Runtime vault ops → **`/ws-memo`** when vault is enabled.

## Steps — import

1. Run `check_spec_memo.cjs --json` and require `cli.available: true` for `{specMemo.cli}` (default `memo`).
2. `user-gate`: **Import legacy workflow tree to vault (Recommended)** / Cancel.
3. Run `{specMemo.cli} import --from {repoRoot}` (add `--dry-run` when flag passed).
4. Print import counts; recommend write-block hook if not installed.
   - Done when: import exit 0 or user cancelled.

**Next:** Runtime vault ops → **`/ws-memo`** when vault is enabled.

## Steps — disable

1. Run:
   ```bash
   node {skillsRoot}/ws-spec-memo/scripts/configure_spec_memo.cjs --repo-root {repoRoot} --apply --json --enabled false
   ```
   Preserve other `specMemo.*` keys; never delete vault data.
2. Tell the user in-repo `{sharedDir}/MEMORY.md` / `memory/*` paths are active again.
   - Done when: `specMemo.enabled` is explicit `false` and summary printed.

**Next:** When re-enabling vault later, run setup again then **`/ws-memo`** for runtime ops.

## Bridge obligations (when `specMemo.enabled: true`)

Other skills keep their contracts; agents reroute tool aliases per INTEGRATION.md:

| workflow-skills alias | spec-memo |
|-----------------------|-----------|
| `read-memory` | MCP/CLI `bootstrap` or `search` |
| `update-memory` (trap) | `upsert --kind trap` |
| `ws-changelog` event | `append` (vault log) + optional in-repo `{rules.changelogFile}` when hybrid |
| Plan/spec working copies | stay in vault `plans/` / `specs/`; product repo keeps `{specsDir}/*.spec.md` of record only |

After trap writes via vault, **do not** also write `{sharedDir}/memory/*.md` unless mode is `hybrid` and vault write failed.

## Rules

- Never commit `{sharedDir}/config.json`.
- Never write `{plansDir}`, `{sharedDir}/memory/*`, or agent changelogs into the product tree when vault mode is active.
- Explicit launchers: `node` for skill scripts; `memo` / configured `specMemo.cli` for vault ops.
- Source anonymization: generic wording in reports; no private consumer hostnames in new issues.
