---
id: null
slug: spec-provider-skills
title: "Provider skills for spec-to-pr (GitHub, Azure DevOps, local specs)"
source: local
specDate: 2026-07-13
---

# Specification — Provider skills for spec-to-pr (GitHub, Azure DevOps, local specs)

## Description

Introduce three **provider skills** that collaborate with the `spec-to-pr` orchestrator and its pipeline dependencies (`00`–`11`, especially entry, ship-pr, and fix-pr). Each provider owns **all platform-specific instructions and scripts** for:

1. **Inbound work items** — pull GitHub issues, Azure DevOps work items / user stories, or hand-written local markdown specs into the canonical `{us-dir}/step-00-{slug}.spec.md` artifact ([spec-format](.agents/skills/spec-to-pr/extra-skills/spec-format/SKILL.md)).
2. **Outbound delivery** — create PRs / pull requests, monitor checks, resolve review threads, and merge using the provider’s preferred CLI and/or PowerShell scripts.

### Goals

- **Single active provider per project** (config-driven): when GitHub is enabled, entry + PR/fix-pr use GitHub; when Azure DevOps is enabled, use ADO; when the user works with local markdown, use the local-spec provider and a configured specs folder (default `specs/` at repo root).
- **Dual mode** for every provider and every updated pipeline skill:
  - **Workflow mode:** dispatched by `spec-to-pr` (and by `08-fix-pr` / `09-goal-fix-pr` / `11-ship-pr` as needed).
  - **Standalone mode:** invocable alone (`/github-provider`, `/azure-devops-provider`, `/local-spec-provider`, plus existing `/fix-pr`, `/ship-pr`, etc.) without running the full FSM.
- **Progressive disclosure:** orchestrator and generic pipeline skills **delegate** to the active provider instead of embedding `gh` / `az` / filesystem details.
- **Portability:** no hardcoded org/repo/project names; resolve from `config.json` (and env for secrets).

### Provider skills (new)

| Skill | Path (proposed) | Owns |
|-------|-----------------|------|
| `github-provider` | `.agents/skills/github-provider/SKILL.md` | GitHub Issues → spec; PR create/checks/merge via `gh` (and optional PowerShell wrappers); thread fetch/resolve scripts for GitHub |
| `azure-devops-provider` | `.agents/skills/azure-devops-provider/SKILL.md` | ADO work items / user stories → spec via `az` and/or PowerShell/REST; PR create/merge and thread resolution for Azure Repos |
| `local-spec-provider` | `.agents/skills/local-spec-provider/SKILL.md` | Detect/configure local specs root (default `specs/`); read/write structured local specs; optional “PR-less” or document-only delivery hooks when no remote tracker is used |

### Responsibilities per provider

#### Shared contract (all three)

Each provider MUST document and implement (or script) these intents:

| Intent | Input | Output |
|--------|-------|--------|
| `fetch-to-spec` | Tracker id or local path | `{us-dir}/step-00-{slug}.spec.md` + optional `*.issue.json` snapshot |
| `validate-auth` | none | Pass/fail with fix instructions |
| `create-pr` | head, base, title/body | PR URL + id |
| `list-threads` | PR id | Structured thread list |
| `resolve-thread` | thread id (+ comment) | Resolved on remote (or dry-run log) |
| `merge-pr` | PR id | Merged (never delete working branch by default) |

Pipeline skills call these intents by **loading the active provider skill**, not by hardcoding CLI flags.

#### `github-provider`

- Prefer **`gh` CLI** when installed and authenticated (`gh auth status`).
- Optionally ship **PowerShell** helpers under `github-provider/scripts/` for Windows consumers (same behavior as `gh` flows).
- Move / wrap existing assets:
  - `spec-to-pr/scripts/github-issue-to-spec.py` → owned or invoked by this provider (keep thin wrappers under `spec-to-pr/scripts/` only if needed for backward compatibility).
  - GitHub thread scripts used by `08-fix-pr` (`fetch_threads.cjs`, `resolve_thread.cjs`) referenced from this provider.
- Entry patterns: `{n}`, `US {n}`, GitHub issue URL.
- PR patterns: `gh pr create|checks|merge|view`; GraphQL thread APIs as today.

#### `azure-devops-provider`

- Prefer **`az` boards / repos** when Azure CLI is installed; otherwise PowerShell + REST using PAT from `ADO_PAT` / `AZURE_DEVOPS_PAT` / `config.issueTrackers.azureDevOps.patEnvVar`.
- Own / wrap `ado-workitem-to-spec.py` and ADO-oriented pieces of `08-fix-pr/scripts/fix_pr_azure_context.py` (provider documents the canonical path; fix-pr delegates).
- Entry patterns: `{org}/{project}#{id}`, `ADO {id}`, `WI {id}`, ADO work-item URL.
- PR patterns: Azure Repos PRs via `az repos pr` and/or REST/PowerShell; thread collect/resolve via provider scripts.

#### `local-spec-provider`

- **Detect** existing specs directory: prefer `config.plans.specsDir`, else `specs/` at repo root, else ask once and write config.
- **Configure** default: `plans.specsDir: "specs"` (repo root). Support nested layout e.g. `specs/{slug}.spec.md` and/or `specs/{slug}/README.spec.md` — canonical workflow copy remains `{us-dir}/step-00-{slug}.spec.md`.
- **Read:** register/copy/normalize hand-written markdown into canonical step-00 path (`source: local`).
- **Write:** when brainstorming (`00-write-spec`) or when the user asks to persist a human-browsable mirror, write under `{specsDir}` without breaking the canonical us-dir file.
- **PR/threads:** local provider does **not** talk to a remote tracker. For ship/fix-pr when only local provider is active:
  - Either require an explicit remote provider for PR operations, **or**
  - Document that `create-pr` / `fix-pr` fall back to the **VCS host of `project.repoUrl`** (GitHub vs Azure) while specs remain local — **decision: hybrid allowed**. Specs stay `source: local`; PR host is selected from `project.repoUrl` / enabled tracker for SCM only.
  - Clarify in config: `issueTrackers` for work-item source vs optional `scmProvider` for PR host when specs are local.

### Configuration

Extend `.agents/skills/spec-to-pr/config.json` (+ schema + example):

```json
"providers": {
  "active": "github",
  "_comment": "github | azure-devops | local — primary work-item/spec source for entry",
  "scm": "github",
  "_scmComment": "github | azure-devops — host for create-pr / fix-pr / merge when active=local or when SCM differs from work-item source"
},
"issueTrackers": { "...existing github / azureDevOps blocks..." },
"plans": {
  "dir": ".cursor/plans",
  "specsDir": "specs",
  "worktreesDir": ".cursor/plans/{slug}/worktrees"
}
```

Resolution rules:

1. `providers.active` selects which provider skill handles `fetch-to-spec`.
2. `providers.scm` (default = `active` when active is `github` or `azure-devops`; when `active=local`, default from `repoUrl` host or explicit `scm`) selects which provider handles PR/thread intents.
3. Legacy `issueTrackers.*.enabled` flags remain supported: if `providers.active` is absent, infer active from which tracker is enabled (GitHub preferred if both; else ADO; else local).

### Pipeline / hub changes (in scope)

| Area | Change |
|------|--------|
| `spec-to-pr` Specification Protocol / Entry Gate | Delegate fetch/register to active provider skill; remove duplicated CLI recipes from orchestrator body (link only). |
| `11-ship-pr` | Delegate `create-pr`, checks, merge to `providers.scm` skill. |
| `08-fix-pr` / `09-goal-fix-pr` | Delegate list/resolve threads to `providers.scm` skill; keep scoring/fix FSM generic. |
| `00-write-spec` | After draft, optionally ask local-spec-provider to mirror under `specsDir`. |
| `ARTIFACTS.md` / FAQ / README / tools.md | Document provider delegation and intents. |
| `AGENTS.md` | Route three provider skills (Layer 2 or Layer 5); Task router entries. |
| Install / tests | Package providers; canonicity asserts provider SKILL.md + scripts; migration notes if scripts move. |
| Website | Regenerate catalog after skills land. |

### Dual-mode contract (mandatory)

Every new provider `SKILL.md` and every touched pipeline skill MUST keep:

```text
### Standalone Mode
/github-provider fetch <id> | create-pr | ...

### Workflow Mode
Dispatched by spec-to-pr / ship-pr / fix-pr with intent + params from state.
```

Standalone must not require a full workflow state file when only fetching a spec or listing threads (create minimal outputs under `{plans-dir}` as needed).

### Out of scope

- Implementing Jira/Linear/other trackers.
- Changing numbered FSM step order (0–13) or artifact naming (`step-00-` … `step-12-`).
- Deleting `develop` after merge.
- Requiring PowerShell on non-Windows (POSIX remains first-class via `gh`/`az`/Python).

### Audience / language

Skill bodies, scripts, gates, and user-facing workflow banners: **en-us** only (repository mandate).

## Acceptance Criteria

- AC1: Three new skills exist at `.agents/skills/github-provider/`, `.agents/skills/azure-devops-provider/`, and `.agents/skills/local-spec-provider/`, each with `SKILL.md` frontmatter (`name`, `description`, dual-mode sections) and a `scripts/` folder (or documented script paths) covering `fetch-to-spec` at minimum.
- AC2: With `providers.active: "github"` (or legacy GitHub-only enabled), invoking entry with a numeric issue id produces `{us-dir}/step-00-us-{id}.spec.md` via the GitHub provider (`gh` and/or its scripts), without the orchestrator embedding raw `gh` recipes beyond a link to the provider.
- AC3: With `providers.active: "azure-devops"` and valid org/project/PAT, entry with `ADO {id}` or `{org}/{project}#{id}` produces the canonical spec via the Azure DevOps provider (`az` and/or PowerShell/Python REST).
- AC4: With `providers.active: "local"`, entry with a path under `specs/` (or configured `specsDir`) registers/copies to `{us-dir}/step-00-{slug}.spec.md` with `source: local`; missing `specs/` is detected and default-configured to repo-root `specs/`.
- AC5: `11-ship-pr` create/merge and `08-fix-pr` thread fetch/resolve call the provider selected by `providers.scm` (GitHub → `gh`/GitHub scripts; Azure DevOps → `az`/ADO scripts); no GitHub-only hardcoding remains in those skills’ happy paths.
- AC6: Each provider skill is invocable standalone for at least `fetch-to-spec` (and for remote providers, `validate-auth` + one PR intent) without running the full `spec-to-pr` FSM.
- AC7: `config.schema.json` + `config.json.example` document `providers.active`, `providers.scm`, and `plans.specsDir`; backward compatible with existing `issueTrackers` when `providers` is omitted.
- AC8: `AGENTS.md` routes the three providers; `npm run tests -- --local` still passes; site catalog regenerated after implementation.
- AC9: Existing converter scripts (`github-issue-to-spec.py`, `ado-workitem-to-spec.py`) remain reachable (moved under provider `scripts/` **or** thin wrappers left in place) so consumers are not broken mid-migration.

## Child Tasks

### Task #1 — Provider skill scaffolds

- **Status:** planned
- **Description:** Create the three skill directories with SKILL.md (intents, dual mode, config keys) and script layout.

### Task #2 — Config + schema + inference

- **Status:** planned
- **Description:** Add `providers` block; document inference from legacy `issueTrackers`; default `specsDir`.

### Task #3 — Wire orchestrator entry

- **Status:** planned
- **Description:** Refactor Specification Protocol / Entry Gate to dispatch active provider `fetch-to-spec`.

### Task #4 — Wire ship-pr + fix-pr + goal-fix-pr

- **Status:** planned
- **Description:** Delegate SCM intents to `providers.scm` skill; keep generic FSM in pipeline skills.

### Task #5 — Hub, docs, tests, site

- **Status:** planned
- **Description:** Update AGENTS.md, ARTIFACTS/FAQ/README, install tests, build-site.

## Notes

- Current state already has entry docs and converters under `spec-to-pr/scripts/` and dual GitHub/ADO support inside `08-fix-pr`; this feature **extracts and productizes** that into first-class provider skills and forces all workflow dependencies to reference them.
- Hybrid mode (`active=local`, `scm=github|azure-devops`) is intentional so teams can author specs offline while still shipping via GitHub or Azure Repos.
- Prefer moving scripts into provider folders with short compatibility shims rather than duplicating logic.
- Related paths today: `.agents/skills/spec-to-pr/SKILL.md` (Specification Protocol), `.agents/skills/08-fix-pr/`, `.agents/skills/11-ship-pr/`, `.agents/skills/spec-to-pr/config.json.example`.
