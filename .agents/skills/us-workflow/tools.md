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

| Tool | Action | Native |
|------|--------|--------|
| `read-state` | Read workflow state | `Read` `.cursor/plans/{slug}/{workflow-id}.state.md` |
| `write-state` | Write/append state | `Write` / `StrReplace` (hygiene before board) |
| `read-config` | Load project config | `Read` `.agents/skills/us-workflow/config.json` |
| `read-stack` | Load stack reference | `Read` `stack.md` |
| `read-memory` | Load learned knowledge | `Read` `MEMORY.md` (root; index via `Grep`) |
| `search-code` | Find patterns in code | `Grep` / `Glob` |
| `run-script` | Run workflow script | `Shell` `python .agents/skills/us-workflow/scripts/{name}.py` |

## Source control tools

| Tool | Action | Native |
|------|--------|--------|
| `commit-code` | Commit src/web/tests only | `Shell` `git add src/ web/ tests/ && git commit -m "..."` |
| `commit-delivery` | Commit plan + result | `Shell` `git add {slug}.plan.md {slug}.result.md && git commit -m "..."` |
| `push-branch` | Push current branch | `Shell` `git push origin {branch}` |
| `create-pr` | Create GitHub PR | `Shell` `gh pr create --head {branch} --base {baseBranch}` |
| `create-checkpoint` | Tag before step N | `Shell` `git tag uswf/{id}/before-step-{N}` |
| `revert-to-checkpoint` | Revert to tag M | `Shell` `git reset --mixed {tag}` + per-path restore |

## Agent dispatch tools

| Tool | Action | Native |
|------|--------|--------|
| `dispatch-agent` | Spawn subagent for step | `Task` — `subagent_type: generalPurpose\|shell`; `description: "US-WF step {N} — {Label}"` |
| `dispatch-parallel` | Spawn ≤3 concurrent DAG tasks | `Task` — same worktree, no file overlap |
| `user-gate` | Ask question | `AskQuestion` — ≥2 options, recommended first |
| `user-gate-auto` | Auto-select first option | auto-gate table — no AskQuestion |
| `browser-mcp` | Browser integration test | `CallMcpTool` `cursor-ide-browser` (only normal mode, non-dry-run, gated) |

## Knowledge tools

| Tool | Action | Native |
|------|--------|--------|
| `update-memory` | Write learned pattern | `Write`/`StrReplace` `MEMORY.md` — generalizable, non-duplicate, concise |
| `update-changelog` | Append historical log | `Write`/`StrReplace` `CHANGELOG.md` |

## Rules

1. **No hardcoded commands** in skills — use tool aliases. Config.json holds project-specific values.
2. **Shell only for git/build/scripts** — never use bash where `Read`/`Write`/`Grep`/`Glob` suffice.
3. **One worktree max** — step 5/10/11 worktrees are exclusive.
4. **No commit of `.cursor/plans/`** — except step 12 delivery (`{slug}.plan.md` + `{slug}.result.md`).
5. **Subagents: fresh per step** — never resume Task across steps.
6. **Orch never edits code** — hard stop. Code changes spawn via `dispatch-agent`.
