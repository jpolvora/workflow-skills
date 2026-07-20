# Tools — Standard Agent Vocabulary

Canonical tool names every agent uses. Project-specific parameters from `config.json`. Do not hardcode build/test commands in skills — use these aliases.

## Core tools

| Tool | Action | Native | Source from config |
|------|--------|--------|--------------------|
| `build-backend` | Compile backend | `Shell` | `verification.backendBuild` |
| `test-backend` | Run backend tests | `Shell` | `verification.backendTest` |
| `lint-backend` | Check code style | `Shell` | `verification.backendFormat` |
| `build-frontend` | Compile frontend | `Shell` | `verification.frontendBuild` |
| `test-frontend` | Run frontend tests | `Shell` | `verification.frontendTest` |
| `build-all` | Build both stacks | `Shell` | chain `backendBuild` + `frontendBuild` |
| `migrations-add` | Add EF migration | `Shell` | `verification.migrationsAdd` |
| `migrations-apply` | Apply EF migrations | `Shell` | `verification.migrationsApply` |
| `seed-db` | Seed demo data | `Shell` | `database.seedScript` |
| `start-stack` | Start full stack | `Shell` | `orchestration.startCommand` |
| `stop-stack` | Stop API + Vite | `Shell` | `orchestration.stopCommand` |
| `compose-up` | Docker full stack | `Shell` | `orchestration.composeCommand` |

## State & workflow tools

Resolve `{plansDir}` from `config.json` → `plans.dir` (there is **no** `plansDir` key). Default value of `plans.dir`: `.agents/plans`. `{us-dir}` = `{plansDir}/{slug}/`. Resolve `{reviewsDir}` from `config.json` → `reviews.dir` (default `.agents/codereviews`). See [`ARTIFACTS.md`](../spec-to-pr/ARTIFACTS.md).

| Tool | Action | Native |
|------|--------|--------|
| `read-state` | Read workflow state | `Read` `{us-dir}/{workflow-id}.state.md` |
| `write-state` | Write/append state | `Write` / `StrReplace` (hygiene before board) |
| `read-config` | Load project config | `Read` `.agents/skills/shared/config.json` |
| `read-artifacts-registry` | Canonical artifact names | `Read` `.agents/skills/spec-to-pr/ARTIFACTS.md` |
| `read-stack` | Load stack reference | `Read` `config.json.rules.stackFile` (default `.agents/skills/shared/STACK.md`) |
| `read-memory` | Load learned knowledge | `Read` `.agents/skills/shared/MEMORY.md` (index via `Grep`) |
| `search-code` | Find patterns in code | `Grep` / `Glob` |
| `run-script` | Run workflow / provider script | `Shell` with **explicit launcher** (see [Script launchers](#script-launchers)): `python` / `node` / `bash` + path. Orchestrator helpers: `python .agents/skills/spec-to-pr/scripts/{name}.py`. Converters/thread helpers: prefer `.agents/skills/{github,azure-devops,local-spec}-provider/scripts/` (shims may still live under `spec-to-pr/scripts/` / `09-fix-pr/scripts/`) |

## Source control tools

| Tool | Action | Native |
|------|--------|--------|
| `commit-code` | Commit src/web/tests only | `Shell` `git add src/ web/ tests/ && git commit -m "..."` |
| `commit-delivery` | Commit plan + result (Step 8) | `Shell` stage `step-02-{slug}.plan.refined.md` **or** `step-01-{slug}.plan.md`, plus `step-08-{slug}.result.md` |
| `push-branch` | Push working branch | `Shell` `git push {gitRemote} {workingBranch}` — from `config.project` |
| `create-pr` | Create PR via SCM provider | Resolve `providers.scm` → [`github-provider`](../github-provider/SKILL.md) or [`azure-devops-provider`](../azure-devops-provider/SKILL.md) `create-pr` (not raw `gh`/`az` alone) |
| `list-threads` / `resolve-thread` / `merge-pr` | PR review + merge intents | Same SCM provider skill as `create-pr` |
| `create-checkpoint` | Tag before step N | `Shell` `git tag uswf/{id}/before-step-{N}` |
| `revert-to-checkpoint` | Revert to tag M | `Shell` `git reset --mixed {tag}` + per-path restore |

Entry / fetch: resolve `providers.active` → [`github-provider`](../github-provider/SKILL.md) · [`azure-devops-provider`](../azure-devops-provider/SKILL.md) · [`local-spec-provider`](../local-spec-provider/SKILL.md) `fetch-to-spec`. Consumers who already installed `spec-to-pr` before these folders existed: `npx github:jpolvora/workflow-skills update --include-new`.

## Agent dispatch tools

| Tool | Action | Native |
|------|--------|--------|
| `dispatch-agent` | Spawn subagent for step | Subagent dispatch (host-provided); prefer `subagent_type: generalPurpose\|shell`; `description: "STP step {N} — {Label}"` |
| `dispatch-parallel` | Spawn ≤3 concurrent DAG tasks | Subagent dispatch (host-provided) — same worktree, no file overlap |
| `user-gate` | Ask question | Prefer native structured choice UI when available; ≥2 options, recommended first; cancelled → HS-1. Markdown fallback with same options when unavailable (see [`gates.md`](gates.md)); log `user-gate-fallback` |
| `user-gate-auto` | Auto-select first option | auto-gate table — no user-gate prompt |
| `browser-mcp` | Browser integration test | Host browser MCP when available (only normal mode, non-dry-run, gated) |

## Knowledge tools

| Tool | Action | Native |
|------|--------|--------|
| `update-memory` | Write learned pattern | Create unique file in `shared/memory/` and run `python .agents/skills/self-learning/self_learning.py --compile` |
| `update-changelog` | Append historical log | `Write`/`StrReplace` `config.json.rules.changelogFile` (default `.agents/skills/shared/CHANGELOG.md`) |

## Script launchers

Managed skill scripts are upstream-owned. Invoke with an **explicit launcher**; never rely on shebang alone or the host default shell.

| Extension | Launcher | Example |
|-----------|----------|---------|
| `*.py` | `python` | `python .agents/skills/.../scripts/foo.py` |
| `*.cjs` / `*.js` | `node` | `node .agents/skills/.../scripts/foo.cjs` |
| `*.sh` | `bash` | `bash .agents/skills/.../scripts/foo.sh` |

**Contract (agents):**

1. Prefix every recipe/script call with the launcher above (`python …`, `node …`, `bash …`).
2. Do **not** rewrite managed scripts for shell quirks (no pwsh/cmd translations, no in-place dialect patches).
3. Do **not** invent temp scanners/bridges when a recipe fails — report the failure (missing launcher, non-zero exit) and stop; lasting fixes go upstream.
4. Consumer `verification.*` (and other config command strings): run **unchanged**. If they assume `pwsh` and the host is bash (or the reverse), that is a **consumer config** problem, not a skill-script problem.

Skill `.sh` dialect: Git Bash–compatible bash. Prefer Node/Python for new logic; keep shell as thin glue.

## Rules

1. **No hardcoded commands** in skills — use tool aliases. Config.json holds project-specific values.
2. **Shell only for git/build/scripts** — never use bash where `Read`/`Write`/`Grep`/`Glob` suffice.
3. **Explicit launchers** — every managed script call uses `python` / `node` / `bash` per [Script launchers](#script-launchers).
4. **One worktree max** — step 4 worktrees are exclusive under `{worktrees-dir}` when `config.plans.useWorktrees` is true.
5. **No commit of `{plansDir}/`** — except Step 8 delivery per [`ARTIFACTS.md`](../spec-to-pr/ARTIFACTS.md).
6. **Subagents: fresh per step** — never resume a subagent across steps.
7. **Orch never edits code** — hard stop. Code changes spawn via `dispatch-agent`.
8. **Paths from config** — never hardcode plans or review dirs; always resolve `plans.dir` / `reviews.dir` / `workingBranch` / `baseBranch` into tokens `{plansDir}` / `{reviewsDir}` / etc.
