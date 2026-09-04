---
name: ws-spec-from-provider
description: Bulk-import open GitHub issues or ADO User Stories into local specs (spec-write + register). Trigger when importing tracker backlog to {specsDir} for ws-spec-list / ws-spec-multi.
version: 0.3.61
disable-model-invocation: true
invocation_names:
  - spec-from-provider
  - ws-spec-from-provider
---

# ws-spec-from-provider

> When this skill is loaded, output "ws-spec-from-provider loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check.

Bulk-import remote work items into the local specs pipeline: agentic `{specsDir}` specs + full `register_local_spec` (`step-00` under `{plansDir}`). Downstream: [`ws-spec-list`](../ws-spec-list/SKILL.md) / [`ws-spec-multi`](../ws-spec-multi/SKILL.md).

**Specs family:** Role = batch tracker → local specs. Single-id fetch stays on providers. Router: [`../ws-shared/autoload.md`](../ws-shared/autoload.md).

## Invocation

```text
/ws-spec-from-provider
/ws-spec-from-provider --dry-run
/ws-spec-from-provider --limit N
```

| Flag | Effect |
|------|--------|
| (none) | List → confirm → import → register |
| `--dry-run` | List candidates only; no writes |
| `--limit N` | Cap import count after skip filter (positive int) |

## Provider resolution

1. Read `{sharedDir}/config.json`. Expand `{skillsRoot}` / `{sharedDir}` / `{plansDir}` / `{specsDir}`.
2. Resolve tracker (first match):
   - `providers.active` ∈ `github` \| `azure-devops`
   - else enabled `issueTrackers.github` (prefer) or `issueTrackers.azureDevOps`
   - else `project.repoUrl` host (`github.com` → github; `dev.azure.com` \| `visualstudio.com` → azure-devops)
3. `providers.active: local` with no github/ado fallback → **STOP** (set `providers.active` or enable a tracker).
4. Load matching provider for auth: [`ws-spec-provider-github`](../ws-spec-provider-github/SKILL.md) or [`ws-spec-provider-azure-devops`](../ws-spec-provider-azure-devops/SKILL.md) `validate-auth`. Failure → **STOP**.

| Tracker | Candidates |
|---------|------------|
| **github** | Open issues (all assignees) for `issueTrackers.github` owner/repo |
| **azure-devops** | Open **User Stories** assigned to the PAT identity (`@Me`) in `issueTrackers.azureDevOps` org/project |

## Steps

1. **Resolve & auth** — Provider resolution above; run provider `validate-auth`.
   - Done when: tracker is `github` or `azure-devops` and auth exits 0.

2. **List** — Run the matching list script; parse JSON array of `{id, title, url?, state?}`.

   ```bash
   # github
   python {skillsRoot}/ws-spec-from-provider/scripts/list_open_issues.py [--repo-root .]
   # azure-devops
   python {skillsRoot}/ws-spec-from-provider/scripts/list_my_user_stories.py [--repo-root .]
   ```

   Do not pass `--limit` to list scripts (cap after skip).
   - Done when: stdout JSON parsed (empty array OK).

3. **Skip existing** — Drop any id when **either** `{specsDir}/us-{id}.spec.md`, `{specsDir}/NNNN-us-{id}.spec.md`, **or** `{plansDir}/us-{id}/step-00-us-{id}.spec.md` exists (already promoted / registered). Then apply `--limit N` to the remaining set only.
   - Done when: `to_import` and `skipped` lists are fixed.

4. **Confirm** — Unless `--dry-run`: `user-gate` with count + up to 10 titles. **Import (Recommended)** / **Cancel**. Cancel → **STOP**. `--dry-run`: print `to_import` + `skipped`; **STOP** (no writes).
   - Done when: Import chosen, or dry-run listed.

5. **Import each id** — For every id in `to_import`, in order:

   1. Snapshot + base converter via the active provider `fetch-to-spec` phase 1–2 recipes ([`ws-spec-provider-github/INTENTS.md`](../ws-spec-provider-github/INTENTS.md) / [`ws-spec-provider-azure-devops/INTENTS.md`](../ws-spec-provider-azure-devops/INTENTS.md)).
   2. Load [`ws-spec-write`](../ws-spec-write/SKILL.md) and **agentically reformulate** the snapshot into the path from `resolve_spec_path.cjs --slug us-{id}` (`source: github` \| `azure-devops`). Visual attachment ingest is inherited from provider `fetch-to-spec` via the shared ingest helper — **do not** add a second downloader in this skill. Skip the standalone `index.PRD` gate (this skill owns the call).
   3. Full register:

      ```bash
      node {skillsRoot}/ws-spec-provider-local/scripts/register_local_spec.cjs \
        --input "$(node {skillsRoot}/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug us-{id})" --source {github|azure-devops}
      ```

   On any non-zero exit: record failure for that id; continue remaining ids (do not abort the batch unless auth/config broke).
   - Done when: every `to_import` id is `imported`, `failed`, or intentionally left unprocessed only if the session was stopped.

6. **Report** — Print counts: imported / skipped / failed (with paths or errors). Handoff: `/ws-spec-list` or `/ws-spec-multi`.
   - Done when: summary printed with repo-relative paths.

## Rules

- en-us; path tokens only; explicit `python` / `node` launchers.
- Never invent tracker ids; never embed tokens; never `git add` / commit.
- Skip when `{specsDir}/us-{id}.spec.md`, `{specsDir}/NNNN-us-{id}.spec.md`, or `{plansDir}/us-{id}/step-00-us-{id}.spec.md` exists — no `--force` in this skill.
- Full register (1B): every successful import writes `{us-dir}/step-00-us-{id}.spec.md`.
- Full spec-write (5B): every successful import is agentically enhanced, not converter-only.

## Dependencies

[ws-spec-provider-github](../ws-spec-provider-github/SKILL.md) · [ws-spec-provider-azure-devops](../ws-spec-provider-azure-devops/SKILL.md) · [ws-spec-write](../ws-spec-write/SKILL.md) · [ws-spec-provider-local](../ws-spec-provider-local/SKILL.md) · [ws-spec-format](../ws-spec-format/SKILL.md)
