---
name: ws-azure-devops-provider
description: Azure DevOps work-item→spec and PR ops (PAT auth, create-pr, list/resolve threads, merge). Trigger when providers.scm/active is azure-devops or user invokes /ws-azure-devops-provider.
version: 0.3.16
disable-model-invocation: true
invocation_names:
  - azure-devops-provider
  - ws-azure-devops-provider
---

# ws-azure-devops-provider

> When this skill is loaded, output "ws-azure-devops-provider loaded."

**Entry check:** Verify `$PWD/.agents/skills/ws-shared/config.json`. If missing or unconfigured, `user-gate` → run [`ws-configure-project`](../ws-configure-project/SKILL.md) (or invoke it now).

Integrate Azure DevOps Work Items and Pull Requests with workflow-skills. Pipeline skills (`ws-write-spec`, `ws-ship-pr`, `ws-fix-pr`, `ws-goal-fix-pr`, `ws-spec-to-pr`) link here instead of embedding `az` / REST recipes.

## Invocation

### Standalone Mode

```
/ws-azure-devops-provider <intent> [args...]
```

Examples: `fetch-to-spec 12345` · `validate-auth` · `create-pr --head develop --base main` · `list-threads 42` · `merge-pr 42`.

### Workflow Mode

Orch entry / `ws-fix-pr` / `ws-goal-fix-pr` / `ws-ship-pr` pass intent + args when `providers.active` or `providers.scm` is `azure-devops`; gates follow the parent.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `<intent>` | required | Contract table below |
| ids | per intent | ADO WI / PR ids |
| `dry-run` | false | Simulate when caller supports it |

## Prerequisites

- Prefer Azure CLI (`az`) + DevOps extension for PR create/merge.
- PAT: `issueTrackers.azureDevOps.patEnvVar` (default `ADO_PAT`) → `ADO_PAT` → `AZURE_DEVOPS_PAT`. Never commit tokens.
- Config: `issueTrackers.azureDevOps` with `org` / `project`, and/or `providers.*` = `azure-devops`.
- Legacy fallback only: if tracker fields missing, scripts may read `.agents/skills/azure-devops/azure-devops.config.json` when that path exists — do not recreate that layout for new consumers.

Auth/config failure → **STOP**. No silent provider fallback.

## Intent contract

| Intent | Input | Output | Implementation |
|--------|-------|--------|----------------|
| `fetch-to-spec` | `ADO {id}`, `WI {id}`, `{org}/{project}#{id}`, or URL | **1.** `{specsDir}/us-{id}.spec.md` (spec of record) → **2.** `{us-dir}/step-00-us-{id}.spec.md` (workflow copy, `source: azure-devops`) + optional JSON snapshot | `ado-workitem-to-spec.py` → `register_local_spec.py` |
| `validate-auth` | none | Pass/fail + fixes | Org/project + PAT; optional WIT smoke |
| `create-pr` | head, base, title/body | PR URL + id | Prefer `az repos pr create`; if `az` missing/fails → REST in INTENTS.md |
| `list-threads` | PR id | Thread list | `fix_pr_azure_context.py collect` |
| `check-pr-status` | PR id | Status of build pipelines & policy checks | `az repos pr policy list` / build API |
| `resolve-thread` | thread id (+ PR id, comment) | Resolved (or dry-run) | `fix_pr_azure_context.py resolve-thread` |
| `merge-pr` | PR id | Merged | Wait policies then `az repos pr update --status completed` |

**Spec path rule:** `fetch-to-spec` **always** writes `{specsDir}/{slug}.spec.md` first, then promotes it to `{us-dir}/step-00-{slug}.spec.md` via [ws-local-spec-provider](../ws-local-spec-provider/SKILL.md) `register_local_spec.py --source azure-devops`. Never write `step-00` straight from the converter, and never skip the `{specsDir}` copy.

**Branch rule:** never delete `project.workingBranch` (default `develop`) after merge.

**Procedures:** load [`INTENTS.md`](INTENTS.md) for the intent being run.

## Canonical scripts

| Script | Path |
|--------|------|
| Work item → spec of record | `{skillsRoot}/ws-azure-devops-provider/scripts/ado-workitem-to-spec.py` (default output `{specsDir}/us-{id}.spec.md`) |
| Spec of record → workflow copy | `{skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source azure-devops` |
| Thread ops | `{skillsRoot}/ws-azure-devops-provider/scripts/fix_pr_azure_context.py` |

## Config keys

| Key | Role |
|-----|------|
| `providers.active` / `providers.scm` | `azure-devops` → this skill |
| `issueTrackers.azureDevOps` | enabled, `org`, `project`, `patEnvVar` |
| `project.workingBranch` / `baseBranch` / `gitRemote` | create/merge defaults |
| `plans.specsDir` | `{specsDir}` — spec of record written by `fetch-to-spec` (default `.agents/specs`) |
| `plans.dir` | `{us-dir}` root for the workflow copy |

## Dependencies

[ws-spec-to-pr](../ws-spec-to-pr/SKILL.md) · [ws-ship-pr](../ws-ship-pr/SKILL.md) · [ws-fix-pr](../ws-fix-pr/SKILL.md) · [ws-goal-fix-pr](../ws-goal-fix-pr/SKILL.md) · [ws-spec-format](../ws-spec-format/SKILL.md) · [ws-local-spec-provider](../ws-local-spec-provider/SKILL.md) (spec registration)

## Done when

- Intent from the contract table completed with cited CLI/script exit 0 (or dry-run simulation recorded).
- `fetch-to-spec`: `{specsDir}/{slug}.spec.md` exists **and** `{us-dir}/step-00-{slug}.spec.md` was registered with `source: azure-devops`.
- Auth/config failures STOP (no silent fallback).
