---
name: ws-spec-memo
version: 0.3.59
disable-model-invocation: true
description: >-
  workflow-skills ↔ spec-memo bridge only: wire config.json memory backends, import/migrate
  MEMORY, harness preflight, disable vault, or hybrid fallback when MCP/CLI is down.
  Never for day-to-day vault search/get/upsert/bootstrap/doctor when MCP is registered
  — that is /ws-memo (spec-memo package). Companion: https://github.com/jpolvora/spec-memo/issues/17
invocation_names:
  - ws-spec-memo
  - spec-memo-setup
---

# ws-spec-memo

> When this skill is loaded, output "ws-spec-memo loaded."

**Product roles (keep separate):**

| Product | Skill | Focus |
|---------|-------|-------|
| [workflow-skills](https://github.com/jpolvora/workflow-skills) (this package) | **`ws-spec-memo`** (this skill) | Harness **integration**: which memory backends run, `config.json` / `specMemo.*`, import, disable, preflight, hybrid fallback |
| [spec-memo](https://github.com/jpolvora/spec-memo) (external) | **`/ws-memo`** | Vault **memory** runtime: MCP/CLI protocol, schemas, doctor, canvas, sync, `install_skills` |
| [spec-memo](https://github.com/jpolvora/spec-memo) (external) | **`/ws-session-tracking`** | Prompt/session runtime: MCP `prompt`, `session_start`/`end`, vault activity — not Spec-to-PR plan timesheets |

Do **not** merge these skills. Do **not** vendor spec-memo `SURFACE.md` or re-list MCP tool parameters here. Map → [`references/INTEGRATION.md`](references/INTEGRATION.md). Host snippet → [`references/MCP-TEMPLATE.json`](references/MCP-TEMPLATE.json) (key `spec-memo` = `specMemo.mcpServerName`).

| This skill owns | `/ws-memo` owns | `/ws-session-tracking` owns | Neither (other skills) |
|-----------------|-----------------|-----------------------------|------------------------|
| `enableMemoryFiles` / `enableSpecMemoIntegration` / `specMemo.*` | MCP + CLI vault **memory** (bootstrap, search, upsert, append, …) | MCP `prompt` / session lifecycle / vault `memo activity` | Local trap files → `ws-self-learning` |
| Setup / import / disable / write-block hook gate | `install_skills` (also installs session-tracking), doctor, canvas, sync | Intent stories, `derive_rules` | Local changelog → `ws-changelog` |
| Harness preflight (`check_spec_memo.cjs`) | Vault health after bridge flags a problem | — | Spec-to-PR day timesheet → `ws-activity-report` |
| Backend choice for `read-memory` / `update-memory` / `update-ws-changelog` | How to invoke memory vault tools | How to invoke prompt/session tools | Seed wizard → `ws-configure-project --section specMemo` |
| Hybrid fallback when MCP/CLI is down | Session **memory** brief when MCP is up | Billable prompt session boundaries | |

**Seamless path (after user enables vault):**

1. This skill (or configure-project) writes flags → print MCP snippet → stop.
2. Host registers `spec-memo` MCP (`{specMemo.cli} serve`).
3. Ensure `/ws-memo` (+ `/ws-session-tracking`) loadable — `/ws-memo` `install_skills` installs both by default.
4. Day-to-day: aliases in [`tools.md`](../ws-shared/tools.md); memory vault half via **`/ws-memo`**; prompt/session via **`/ws-session-tracking`**. Session memory brief with `bootstrapOnSession` → **`/ws-memo` bootstrap**, not this skill.

**Also invoked from:** [`ws-configure-project`](../ws-configure-project/SKILL.md) step 7 / `--section specMemo`.

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
| *(default)* / `setup` | Detect `{specMemo.cli}`, interview flags, optional import + write-block hook, print MCP snippet, hand off to `/ws-memo` |
| `check` | Harness health: CLI, config routing, in-repo pollution; when vault active, `runtimeHandoff` for `ws-memo` + `ws-session-tracking` (warnings only) |
| `bootstrap` | MCP registered → load `/ws-memo` and stop. MCP down + vault enabled → `{specMemo.cli} bootstrap` (any vault mode). CLI failure: hybrid → in-repo MEMORY once; vault-only → STOP with fix steps |
| `import` | One-shot `{specMemo.cli} import --from {repoRoot}` |
| `disable` | `specMemo.enabled: false` (keeps vault data; restores in-repo memory when vault was the only backend) |

## Entry check

Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check. Missing `{sharedDir}/config.json` → `user-gate` recommending `ws-configure-project` before setup (check/bootstrap may still run with defaults).

Expand path tokens from [`tools.md`](../ws-shared/tools.md) before shell. Use `{specMemo.cli}` (never hardcode `memo`).

## Steps — setup (default)

1. **Preflight** — Run:
   ```bash
   node {skillsRoot}/ws-spec-memo/scripts/check_spec_memo.cjs --repo-root {repoRoot} --json
   ```
   Require exit 0 when `specMemo.enabled` is not explicit `true`; when enabled, require exit 0 only if `cli.available` and `doctor.ok` (alias `vault.ok`). Parse `pollution` and `runtimeHandoff` (`wsMemo`, `wsSessionTracking`) in all cases.
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

5. **MCP host + runtime skills** — When enabled: print [`references/MCP-TEMPLATE.json`](references/MCP-TEMPLATE.json); remind the host to register server `spec-memo` (stdio: `{specMemo.cli} serve`). Vault identity binds via git remote; no in-repo pointer files. If preflight shows `wsMemo` or `wsSessionTracking` missing, tell the user the next action is **`/ws-memo`** `install_skills` (installs both by default) — do not paste the vault tool encyclopedia here.
   - Done when: MCP snippet shown (or user skipped enable) and missing-runtime-skill warnings delivered when applicable.

6. **Post-setup check** — Re-run `check_spec_memo.cjs`. When import ran, suggest `ws-cleanup` for disposable in-tree scratch after user confirms vault contents.
   - Done when: final report delivered; this skill stops; day-to-day vault ops → **`/ws-memo`**.

## Steps — check

1. Run `check_spec_memo.cjs --repo-root {repoRoot}` (human markdown default).
2. When `specMemo.enabled` and pollution findings exist, `user-gate`: **`/ws-cleanup` (Recommended)** / **`/ws-memo` doctor --fix** (vault residue) / Skip.
   - Done when: report printed; no config writes unless user invokes setup.

**Next:** Runtime vault ops → **`/ws-memo`** when vault is enabled.

## Steps — bootstrap

If MCP `user-spec-memo` / `spec-memo` is already registered, load **`/ws-memo`** `bootstrap` and skip this subcommand.

1. Read `{sharedDir}/config.json` routing (`enableSpecMemoIntegration` / `enableMemoryFiles` / `specMemo.mode`). When vault is not enabled, consult in-repo MEMORY via `ws-self-learning` (`Grep`/`Read` `{sharedDir}/MEMORY.md`).
2. When vault is enabled and MCP is down: run `{specMemo.cli} bootstrap` with optional `--slug` / `--path` from invocation (CLI only; protocol details stay in `/ws-memo`).
3. On CLI failure and hybrid mode: warn once and consult in-repo MEMORY. On vault-only failure: report actionable fix (install CLI, register MCP, run setup) and STOP.
   - Done when: brief (<8 KB) printed, MEMORY consult completed, or `/ws-memo` took over.

**Next:** Runtime vault ops → **`/ws-memo`** when vault is enabled.

## Steps — import

1. Run `check_spec_memo.cjs --json` and require `cli.available: true` for `{specMemo.cli}`.
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
2. Tell the user in-repo `{sharedDir}/MEMORY.md` / `memory/*` paths are active again when local files were restored.
   - Done when: `specMemo.enabled` is explicit `false` and summary printed.

**Next:** When re-enabling vault later, run setup again then **`/ws-memo`** for runtime ops.

## Lifecycle translation

Other skills keep their contracts. This bridge owns **which backends** run; **`/ws-memo`** owns **how** vault tools are called. Never load this skill to execute upsert/append/search when MCP is registered — load `/ws-memo` instead. Follow [`tools.md`](../ws-shared/tools.md) and [`INTEGRATION.md`](references/INTEGRATION.md) § Lifecycle translation:

| Hook | Alias | Local files | Vault (`enableSpecMemoIntegration`) |
|------|-------|-------------|-------------------------------------|
| Pre-plan / pre-code / pre-fix consult | `read-memory` | `MEMORY.md` / `--match-paths` | `/ws-memo` bootstrap or search |
| New trap, failure reflection, fable REFUTED/CAVEATS, fix-pr defect | `update-memory` | `memory/*.md` + `--compile` | `/ws-memo` upsert (`kind: trap`; frontmatter `severity` lowercase) |
| Task-done history | `update-ws-changelog` | `{rules.changelogFile}` | `/ws-memo` append |

Dual: vault first on read; persist to both. Vault write succeeded → do not also write `{sharedDir}/memory/*` unless dual-mode (both flags true). Hybrid + vault fail → local files once, warn.

## Rules

- Never commit `{sharedDir}/config.json`.
- Never write `specMemo.*` from `/ws-memo`; never run vault tool encyclopedia from this skill.
- Never vendor spec-memo `SURFACE.md` or count/list MCP tool parameters here (drift trap).
- Never write `{plansDir}`, `{sharedDir}/memory/*`, or agent changelogs into the product tree when vault-only mode is active.
- Explicit launchers: `node` for skill scripts; `{specMemo.cli}` for vault CLI (fallback bootstrap/import only).
- Source anonymization: generic wording in reports; no private consumer hostnames in new issues.
