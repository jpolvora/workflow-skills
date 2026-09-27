---
name: ws-spec-to-issue
description: Turn a free-text feature description into an anonymized tracker item (GitHub issue or Azure DevOps User Story) without writing any local spec file or touching git. Trigger on /spec-to-issue, ws-spec-to-issue, "open an issue for this idea", or "send this idea to the tracker".
disable-model-invocation: true
invocation_names:
  - spec-to-issue
  - ws-spec-to-issue
---
# ws-spec-to-issue

> When this skill is loaded, output "ws-spec-to-issue loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check.

**Specs family:** outbound companion of [`ws-spec-write`](../ws-spec-write/SKILL.md) — it reformulates an idea into a spec-shaped payload and creates it on the tracker instead of writing a local `*.spec.md`. The reverse half is [`ws-spec-from-provider`](../ws-spec-from-provider/SKILL.md) (or a provider `fetch-to-spec`) when the team is ready to implement.

Use this skill when an idea arrives while the working tree must stay clean (for example an active `ws-spec-to-pr` run): route the idea to the tracker now, import it later.

## Invocation

```text
/spec-to-issue "<description>" [--title "<title>"] [--tracker github|azure-devops]
               [--label <name>]... [--type "<work item type>"] [--dry-run]
```

| Parameter | Default | Notes |
|-----------|---------|-------|
| `<description>` | — | Raw free-text idea; reformulated, never copied verbatim |
| `--title` | inferred | Override the tracker title derived from the description |
| `--tracker` | resolved | Force `github` or `azure-devops` instead of resolving from config |
| `--label` | none | Repeatable; passed to the provider `create-issue` intent when supported |
| `--type` | `User Story` (ADO) | Work-item type for Azure DevOps; ignored by GitHub |
| `--dry-run` | false | Print the resolved tracker, title, and anonymized body; create nothing |

## Tracker resolution & auth

1. Resolve the active tracker (first match): explicit `--tracker`; else `providers.active` when it is `github` or `azure-devops`; else the enabled `issueTrackers.github` / `issueTrackers.azureDevOps` block; else the `project.repoUrl` host (`github.com` → github; `dev.azure.com` / `visualstudio.com` → azure-devops).
2. `providers.active: local` with no enabled tracker fallback: **STOP** with a named error; do not write a local spec and do not guess a host.
3. Load **only** the resolved provider body — [`ws-spec-provider-github`](../ws-spec-provider-github/SKILL.md) or [`ws-spec-provider-azure-devops`](../ws-spec-provider-azure-devops/SKILL.md). Never load both.
4. Run the resolved provider `validate-auth` before any mutating call. Auth failure **STOPs** with the provider remediation; there is no provider fallback.

## Payload shaping & anonymization

1. **Reformulate (agentic).** Reuse the [`ws-spec-write`](../ws-spec-write/SKILL.md) § Agentic Reformulation & Enhancement Protocol to turn the free text into a spec-shaped payload: a title plus a body carrying `## Description`, atomic testable `## Acceptance Criteria`, and `## Out of Scope`. Do not paste the raw input.
2. **Anonymize before creating.** The payload must carry no private consumer project name, no absolute local path, no hostname, no customer data, and no secret. When the input quoted private context, restate the failure class or feature generically (hub `AGENTS.md` § Source anonymization).
3. **Guardrail scan.** Pass the payload through `run_spec_to_issue.cjs`; it fails closed when it detects an absolute path or a token-shaped secret and reports each finding. Anonymize and retry.

## Steps

1. **Resolve tracker + auth** — the resolution and auth rules above.
   - Done when: one tracker is resolved and the provider `validate-auth` exits 0.

2. **Reformulate** — build the spec-shaped payload per § Payload shaping & anonymization.
   - Done when: title, Description, Acceptance Criteria, and Out of Scope exist and the text is not a verbatim copy.

3. **Dry-run (recommended first)** — print the resolved tracker, title, and anonymized body:

   ```bash
   node {skillsRoot}/ws-spec-to-issue/scripts/run_spec_to_issue.cjs --title "<title>" --body-file <payload.md> --dry-run
   ```

   - Done when: the JSON payload prints and no create call ran.

4. **Create** — call the helper without `--dry-run`; it resolves the tracker, runs the provider `create-issue` intent with the body passed through `--body-file`, and prints the created id and URL:

   ```bash
   node {skillsRoot}/ws-spec-to-issue/scripts/run_spec_to_issue.cjs --title "<title>" --body-file <payload.md> [--label <name>] [--type "User Story"]
   ```

   - Done when: the provider exits 0 and the created id + URL are printed.

5. **Report** — return the created id + URL. On provider failure, surface the provider error and exit non-zero.
   - Done when: the caller has the created id and URL, or a non-zero failure report.

## Guardrails

- **No local artifact.** Never create `{specsDir}` or `{plansDir}` output, no `step-00` copy, and never run `git add`, commit, stash, or reset. `git status --porcelain` must be byte-identical before and after.
- **No embedded secrets.** The token is read only from the configured env var inside the provider script. A transient body file is created under the OS temp dir (outside the repository) and removed after the call; nothing sensitive is echoed.
- **Provider-neutral prose.** The skill names no provider CLI recipe; the network call belongs to the provider `create-issue` intent.
- Contract: hub [`AGENTS.md`](../../../.ws/AGENTS.md) § Managed skills · [`ws-spec-format`](../ws-spec-format/SKILL.md).

## Done when

- The active tracker is resolved, `validate-auth` passed, and the reformulated anonymized payload was created through the provider `create-issue` intent (id + URL printed) — or `--dry-run` printed the payload and created nothing.
- No local `{specsDir}` / `{plansDir}` artifact and no git mutation occurred.

## Subagent contract

- Resolve the tracker from `.ws/config.json`; STOP on `providers.active: local` with no enabled tracker.
- Reformulate via the `ws-spec-write` protocol and anonymize before the create call.
- Run the resolved provider `validate-auth` first; never load both provider bodies.
- Delegate creation to the provider `create-issue` intent through `run_spec_to_issue.cjs`; never embed a provider CLI recipe.
- Leave the working tree untouched and remove the transient body file after the call.
