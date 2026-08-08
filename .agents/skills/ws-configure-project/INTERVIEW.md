# ws-configure-project — Interview reference

Disclosed detail for [`SKILL.md`](SKILL.md). Load when detecting or interviewing sections.

## Required (must resolve before workflows)

| Section | Keys | Notes |
|---------|------|-------|
| `project` | `name`, `baseBranch` | `workingBranch` default `develop`; `gitRemote` default `origin`; `repoUrl` / `org` strongly recommended |
| `providers` | `active`, `scm` | Or legacy `issueTrackers.*.enabled` inference — prefer explicit `providers` |
| `verification` | at least one build or test command used by the stack | Empty strings OK only if that stack side is absent |
| `plans` | `dir` | Default `.agents/plans` |

## Optional (offer once, skippable)

`stack`, `domain`, `fable`, `reviews`, `rules` (non-empty paths only), `defaults`, `dagThresholds`, `issueTrackers` details, `orchestration` / DB fields under `stack`, **`autoload`** (root `AGENTS.md` + Always-applied path refresh; not a `config.json` key).

## Detection heuristics

Scan consumer **repo root** (not this skill package alone):

| Signal | Suggest |
|--------|---------|
| `package.json` | Node stack; read `scripts.build` / `test` / `lint` / `dev` → `verification.*` / `orchestration.*` |
| `*.sln` / `*.slnx` / `*.csproj` | .NET; `dotnet build` / `dotnet test` |
| `pyproject.toml` / `requirements.txt` | Python; pytest/uvicorn hints when present |
| `go.mod` / `Cargo.toml` | Go / Rust verification commands |
| `.git` + `git remote get-url origin` | `project.repoUrl`, `org`, host → `providers.scm` (`github.com` → github; `dev.azure.com` / `visualstudio.com` → azure-devops) |
| `gh` auth / GitHub remote | `providers.active=github`, enable `issueTrackers.github` |
| ADO remote only | `providers.active=azure-devops` |
| No tracker remote / `specs/**/*.spec.md` | Suggest `active=local` + set `scm` from remote host or ask |
| No app stack detected + `.agents/skills/` present | Suggest `verification.backendTest: "python .agents/skills/ws-check-workflows/scripts/check_workflows.py"` for harness validation |
| `prisma/` / `drizzle` / `Migrations/` / compose DB services | `stack.database.*` hints |
| Top-level `src/`, `web/`, `tests/` | `stack.backend.srcDir` / frontend `sourceDir` / test paths |
| `.agents/skills/ws-shared/STACK.md` (preferred) | `rules.stackFile` → that path |
| Root `STACK.md` / `stack.md` (legacy optional) | Keep only if user already uses it; do not create or require |
| `.agents/skills/ws-shared/CHANGELOG.md` (preferred) | `rules.changelogFile` → that path |
| Repo-root `CHANGELOG.md` | Only if user sets `rules.changelogFile: "CHANGELOG.md"` |
| Existing repo-root `specs/` | Keep `plans.specsDir: "specs"` |
| No specs dir yet | Suggest `plans.specsDir: ".agents/specs"` |
| Fable skills in `.agents/skills/` | Suggest `fable.enabled: true` (**Recommended**), `autoAudit: true`, `autoDetectDomain: true`, `auditVerdictsBlockShip: true` |
| Top-level `.cursor/`, `.opencode/`, `.gemini/` or IDE env | Detect host IDE (Cursor / OpenCode / Antigravity) to suggest canonical model strings for `defaults.plannerModel`, `defaults.executionModel`, `defaults.reviewerModel` (Cursor: `claude-3-5-sonnet` / `gpt-4o`; OpenCode: `claude-3-5-sonnet` / `gemini-2.0-flash`; Antigravity: `gemini-3.6-flash` / `claude-3-5-sonnet`) |
| Existing `config.json` placeholders `<…>` | Treat as gaps |

## Interview order

1. `project` (name, org, repoUrl, baseBranch, workingBranch)
2. `providers` + matching `issueTrackers` slice
3. `plans.dir` / `plans.specsDir` / optional `reviews.dir`
4. `verification` (+ `orchestration` if detected)
5. `stack` summary (id, description, key paths) — or defer to STACK.md generation
6. `fable` (Enable/disable Fable skills integration; autoAudit, autoDetectDomain, auditVerdictsBlockShip)
7. `defaults` — optional (autoMode, dryRun, skipTesting, scoreAndRefine) + **LLM model preferences for autoMode phase switching**:
   - `plannerModel` (Planning phase: Steps 0–3)
   - `executionModel` (Execution phase: Step 4)
   - `reviewerModel` (Review & Verification phase: Steps 5–7)
   - Offer canonical host model choices or custom string; fallback to active model if empty or switch fails.
8. `domain` / `rules` — optional
9. `autoload` — optional (or standalone `--section autoload`)

Each user-gate: **Accept suggestion (Recommended)** / **Keep current** / **Edit…** / **Skip**.

## Autoload

Not a `config.json` section. Refreshes `{sharedDir}/autoload.md` and optionally generates repo-root `AGENTS.md`.

| Signal | Suggest |
|--------|---------|
| `{sharedDir}/autoload.md` missing | Install/update workflows hub (installer copies `autoload.md` via hub whitelist) |
| Always-applied skill has `SKILL.md` under project `.agents/skills/` | Path `.agents/skills/ws-<id>/SKILL.md` |
| Skill only under global skills root | Path `{globalSkillsRoot}/ws-<id>/SKILL.md` |
| Skill missing both places | Keep `{skillsRoot}/…` token; harness `--check` warns |
| Root `AGENTS.md` absent | **Generate/Refresh root `AGENTS.md` (Recommended)** |
| Root `AGENTS.md` present | Refresh (**Recommended**) / Keep current / Skip |

**Root gate options:** Generate/Refresh root `AGENTS.md` (**Recommended**) / Keep current root `AGENTS.md` / Skip.

**Helper (agents and tests):**

```bash
python {skillsRoot}/ws-configure-project/scripts/configure_autoload.py --write-autoload
python {skillsRoot}/ws-configure-project/scripts/configure_autoload.py --write-root-agents
python {skillsRoot}/ws-configure-project/scripts/configure_autoload.py --check --json
```

Default `--repo-root` is the consumer **cwd**. Pass `--repo-root <dir>` when cwd is not the target project. Use `--force` only when overwriting a non-generated root `AGENTS.md` (creates `AGENTS.md.bak`).

**Path rules:** never write absolute paths (`C:\…`, `/Users/…`). Markdown links use real relative targets; prose may use `{skillsRoot}` / `{globalSkillsRoot}` / `{sharedDir}` tokens.

## Write rules

- Merge into existing JSON; do not delete unknown keys.
- Preserve `_comment*` keys from the example when present.
- After write: show path `.agents/skills/ws-shared/config.json` and remind it is gitignored.
- Autoload writes: `{sharedDir}/autoload.md` (Always-applied paths) and optional repo-root `AGENTS.md` only after user-gate Generate/Refresh — installer never creates root `AGENTS.md`.
