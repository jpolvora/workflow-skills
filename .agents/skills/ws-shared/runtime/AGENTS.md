# Consumer Hub — Workflow Config & Shared Project Data

> **You are in the consumer hub** (`{sharedDir}/runtime/AGENTS.md` as installed; thin entrypoint at `{sharedDir}/AGENTS.md`; authoring source at `.agents/skills/ws-shared/runtime/AGENTS.md`). This is **not** the upstream authoring hub: package skill authoring, ship checklists, and source-repo workflows live in the upstream repo's root `AGENTS.md` / `CATALOG.md` and are out of scope here. An optional consumer repo-root `AGENTS.md` may override autoload via `autoload.md`; otherwise this file is the routing contract.

**Audience: agents** (config resolution, gates, skill loading, consumer-owned paths). Humans: install narrative in the project README.

> **Config, gates, bootstrap docs, skill loading, and consumer-owned project data** for spec-driven delivery via [`ws-spec-to-pr`](../../ws-spec-to-pr/SKILL.md) and [`ws-spec-to-pr-lite`](../../ws-spec-to-pr-lite/SKILL.md). Specs are the contract of record; this hub stores project config, not specs.
>
> This folder is **not** an installable skill package. The installer copies this managed runtime and the sibling setup templates when a workflow or Full package is selected.
>
> **Consumer-owned** (preserved on update; never overwritten by upstream):
> `config.json`, `STACK.md`, `installed-skills.json`, plus legacy `MEMORY.md`, `memory/*`, and `CHANGELOG.md` when present under `ws-shared/`.
> Fresh install seeds `config.json` from `../templates/config.json.example` and `STACK.md` from `../templates/STACK.md.example`. `MEMORY.md` + `memory/` and `CHANGELOG.md` default to the repo root (`rules.memoryDir` / `rules.changelogFile`) and are created on first use. Prefer [`ws-configure-project`](../../ws-configure-project/SKILL.md) to fill placeholders.
>
> **Installer scope:** skill packages install to **project-local** `.agents/skills/` and/or **global** `$HOME/.agents/skills/` (`--global` / `WORKFLOW_SKILLS_GLOBAL_DIR`). The installer never creates or overwrites consumer repo-root files (root `AGENTS.md`, host pointers).
>
> **Hybrid / override (mandatory):** Skill bodies may load from the global skills root while **project** `$PWD/.ws/config.json` supplies config. **Local (project) config always overrides global hub config.** Package authoring and install-scope rules live in the upstream root `AGENTS.md` (source repo only).

> **Layout / source control:** `runtime/` is managed workflow content, `../templates/` is managed setup content, and `hub-layout.json` is the classification manifest. Track non-secret `config.json` and a maintained `STACK.md`; ignore generated memory/history and installer metadata.

**Language:** en-us only for skill bodies, gates, banners, and harness docs.

**Source anonymization (mandatory):** Do not cite private consumer projects in reports, commits, specs, or new tracker issues. Diagnose from pasted errors; publish generic wording.

---

## Config & Tools

| File | Purpose |
|------|---------|
| [`config.json.example`](../templates/config.json.example) | Project config template — seeded to `config.json`; fill via [`ws-configure-project`](../../ws-configure-project/SKILL.md); track only when non-secret |
| [`config.schema.json`](config.schema.json) | JSON Schema for `config.json` validation |
| [`config-resolution.md`](config-resolution.md) | Config path + SCM resolution |
| [`scm-provider-contract.md`](scm-provider-contract.md) | Required SCM intents (`ws-spec-provider-github` ↔ `ws-spec-provider-azure-devops` parity) |
| [`gates.md`](gates.md) | User-gate / delivery / ship / session-model banner |
| [`tools.md`](tools.md) | Tool aliases, path tokens, launchers (`node` / `bash`). Load with `config.json`. |
| [`CATALOG.md`](CATALOG.md) | On-demand promoted-skill inventory and consumer task router |
| [`CROSS-PLATFORM.md`](CROSS-PLATFORM.md) | UTF-8, quoting, and explicit-launcher runtime contract |
| [`autoload.md`](autoload.md) | Always-applied list, specs skill router, hub contracts (SCM, verify score) |
| [`STACK.md.example`](../templates/STACK.md.example) | Template for human-readable stack companion — seeds `STACK.md` |
| [`setup.md`](setup.md) | Bootstrap & entry logic shared by `ws-spec-to-pr` and `ws-spec-to-pr-lite` |
| [`MEMORY.md.template`](../templates/MEMORY.md.template) | Empty memory index template (legacy reference) |
| [`CHANGELOG.md.template`](../templates/CHANGELOG.md.template) | Empty ws-changelog stub (legacy reference) |
| [`skill-dependencies.json`](skill-dependencies.json) | Install graph + **`packageVersion`** + single **`upstream`** ownership block |
| [`scripts/`](scripts/) | [`resolve_consumer_root.cjs`](scripts/resolve_consumer_root.cjs) (Node only). `--repo-root` → cwd hub. |

## Consumer-owned (local only)

| File | Purpose |
|------|---------|
| `config.json` | Project identity, stack, verification, providers (track when non-secret) |
| `STACK.md` | Human-readable companion to `config.json` (track when maintained) |
| `MEMORY.md` (legacy) | Compiled anti-regression index when it holds entries (default location is now `rules.memoryDir`) |
| `memory/*.md` (legacy) | Individual memory entries (default location is now `rules.memoryDir`) |
| `CHANGELOG.md` (legacy) | Append-only history when it holds entries (default location is now `rules.changelogFile`) |
| `installed-skills.json` | Managed skill list for `update` / `uninstall` (installer-written) |

---

## Skill loading (mandatory)

| Skill | Path | Trigger |
|-------|------|---------|
| `ws-senior-developer` | [`../ws-senior-developer/SKILL.md`](../../ws-senior-developer/SKILL.md) | Every prompt or `rules.seniorDeveloper` — delivery gate and surgical diffs |
| `ws-changelog` | [`../ws-changelog/SKILL.md`](../../ws-changelog/SKILL.md) | Every task completion |
| `ws-self-learning` | [`../ws-self-learning/SKILL.md`](../../ws-self-learning/SKILL.md) | Before plan/code/fix: consult `{memoryDir}/MEMORY.md`; on completion: write traps → compile; after each fix-PR round: record reviewer/CI mistakes |

`ws-tdah` is **on-demand** here (invoke `/ws-tdah` · `/tdah` · `start ws-tdah`).

### Consumer root override (dual-hub)

Default **shared hub only**: `ws-tdah` and `ws-senior-developer` are **on-demand** — `ws-tdah` via explicit invoke; `ws-senior-developer` via `rules.seniorDeveloper` or explicit invoke.

Consumers may add a **root** `AGENTS.md` (installer never writes it; generate via [`ws-configure-project`](../../ws-configure-project/SKILL.md) `--section autoload`) promoting [`autoload.md`](autoload.md) Always-applied skills to per-prompt autoload — an intentional override, not hub drift. Effective autoload is **false** unless `config.json` sets `defaults.autoload: true`.

**Specs progressive disclosure:** when the user mentions specs, plans, Spec-to-PR, `index.PRD`, or related keywords without naming a skill, load [`autoload.md`](autoload.md) § Specs vocabulary and § Specs skill router — then load **only** the matching skill.

**Hub contracts (load on demand):** SCM parity → [`scm-provider-contract.md`](scm-provider-contract.md), then **one** provider skill. Verify score / `scoreAndRefine` → orch Step 5 or [`ws-plan-verify`](../../ws-plan-verify/SKILL.md); gate copy in [`gates.md`](gates.md) (advance at `defaults.minVerifyScore`, default 9). Config / tokens / gates → `config.json` + [`tools.md`](tools.md) / [`gates.md`](gates.md).

When **both** hubs load, root `AGENTS.md` sections **win** for autoload decisions.

See also: [`setup.md`](setup.md) § External dependencies.

### Precedence (highest first)

1. Explicit user instructions (current turn)
2. Consumer root `AGENTS.md` when present (skill loading + precedence — overrides shared-hub opt-in defaults)
3. Design / spec / architecture constraints
4. `ws-senior-developer` (delivery gate and surgical diffs; opt out via `stop ws-senior-developer` / `stop ws-karpathy-guidelines` or unset path)
5. `ws-fable-method` when autoloaded (root / `autoload.md`; defer Plan-First when orch owns session or senior plan already confirmed)
6. `ws-tdah` when autoloaded (root hub, `autoload.md`, or `/ws-tdah`; opt out via `stop ws-tdah` / `stop verbosity` / `normal mode`)
7. `ws-megabrain` when autoloaded (defer orch; `stop ws-megabrain`)

### Opt-out

| Phrase | Effect |
|--------|--------|
| `stop ws-tdah` / `stop verbosity` / `normal mode` | Disable ws-tdah |
| `stop ws-megabrain` | Disable ws-megabrain |
| `stop ws-gabarito` / `sem ws-gabarito` | Same disable (retired alias) |
| `stop ws-senior-developer` / `stop ws-karpathy-guidelines` | Disable ws-senior-developer when autoloaded |
| `/ws-tdah` · `/tdah` · `start ws-tdah` · `start ws-gabarito` | Activate (single default mode) |
| `/wait-what` · `wait what` · `re-pitch` · `repitch` | Re-pitch last topic with missing premise (keeps ws-tdah active) |



---

## Promoted skills (top-level installables)

Inventory tables: [`CATALOG.md`](CATALOG.md) (on demand).

## Task router (consumer)

Intent → skill: [`CATALOG.md`](CATALOG.md) § Task router. Specs keywords: [`autoload.md`](autoload.md) § Specs skill router. Pipeline steps 0–9: orch dispatch only.

| Intent (utility shortcuts) | Load |
|----------------------------|------|
| Explain spec / US status & delivery panorama | `ws-spec-explain` |
| Archive plan history into `index.PRD` / clean shipped plan dirs | `ws-spec-archive` |
| Clean workflow leftovers / shipped plan dirs | `ws-cleanup` |
| Observe a live Spec-to-PR workflow run | `ws-monitor` |
| Prompt-driven task (not Spec-to-PR) | `ws-task-lifecycle` |

**Product commits:** standard after Step 5 reaches `minVerifyScore` (default 9); lite after Step 2. Commit only `files_touched`; review `{base}...HEAD`; review fixes get a separate commit. `{plansDir}` only at Step 8 / lite 4; never `git add -A`. Fix-PR: `fixPrPlan` before `fixPrExec` in standard Step 9; lite inline.

Step-level baton runs (multi-CLI) execute different steps in different CLI processes via `step_coordinator.cjs` (`defaults.stepRunners` / `defaults.runners` / `defaults.stepBaton`); state-file baton with claim/release/expiry; gates surface at the coordinator while workers stay non-interactive.

## Managed skills — no silent local refactors

Skills under `.agents/skills/` (except consumer-owned `ws-shared/` data) are **managed upstream copies**. `update` overwrites them.

| Context | Do | Do not |
|---------|----|--------|
| **Consumer repo / CI / Actions** | Verify a real runtime bug with evidence. If a lasting skill/script fix is needed, **tell the user to fix upstream** ([workflow-skills](https://github.com/jpolvora/workflow-skills) PR) or open that PR; local experiments are temporary only. | Autonomously reorder, “hygiene-refactor,” or rewrite managed skill scripts from a false positive (e.g. Python same-module call-before-`def` is not a `NameError`). |
| **Managed script calls** | Invoke with explicit launchers (`node` / `bash`) per [`tools.md`](tools.md) § Script launchers. On failure: report and stop. | Rewrite managed scripts for shell quirks, or invent temp scanners/bridges when a recipe fails. |
| **Agent shell scans** | Prefer `node --check` on real `*.cjs` paths, or a short **uncommitted** temp script if a one-liner heredoc breaks on quoting. Delete temps when done. | Commit throwaway scanners into the consumer tree, or treat shell `SyntaxError` in an embedded heredoc as a skill-script bug. |

---

## Cross-platform runtime

Load [`CROSS-PLATFORM.md`](CROSS-PLATFORM.md) before creating shell recipes or temporary scripts.

PowerShell rules (avoid runtime errors and on-the-fly script patching):

1. No `&&` / `||` chaining: separate commands with `;` and gate on `$LASTEXITCODE`.
2. No inline JSON on the command line (the shell strips quotes): use `key=value` flags, payload files, or an in-process driver.
3. One simple invocation per uncertain call; route nested quotes, JSON, or multiline source through a temp script plus an explicit `node` launcher.
4. Content edits go through file tools only; never rewrite tracked file bytes from a shell one-liner.
5. Never patch a managed or installed script to work around a shell error: fix the invocation, or report and stop.
6. After one failed invocation variant, try at most one different quoting approach, then report the observed error instead of burning more turns.

---

## Recommended Feature Delivery Checklist (before push / ship)

### Consumer Projects

Run this checklist before `/ship-pr` or shipping features:

- [ ] **1. Run Tests & Verification**: Execute `verification.backendTest` / `verification.frontendTest` and the stack invariant scan (`node .ws/runtime/scripts/scan_stack_invariants.cjs`).
- [ ] **2. Harness & Workflow Audit**: Run `ws-check-harness` / `ws-check-workflows` to ensure 0 critical findings.
- [ ] **3. Configure & Verify Project**: Verify `.ws/config.json` settings and stack definitions.
- [ ] **4. Clean Docs & Artifacts**: Ensure no merge conflict markers or uncommitted scratch files.
- [ ] **5. Ship via `ship-pr`**: Execute `/ship-pr` (runs Prepare Board, commits, pushes, creates PR).

### Package authoring (upstream source repo only)

Ship checklist and authoring workflow live in the upstream repo's root `CATALOG.md` and `AGENTS.md` (authoring-only; not copied to consumer installs).

---

## Skill discovery (consumers)

Installed skills live at `.agents/skills/<name>/SKILL.md`. Load on demand from orchestrator dispatch, task intent, or host skill discovery. **This file** is the consumer-facing hub. A thin root `AGENTS.md` (when the consumer adds one) should point here — installer never writes it.

---

## External dependencies

Full table: [`CATALOG.md`](CATALOG.md) § External dependencies. Resolve `rules.*` and artifact paths from project `config.json` (first match wins).
