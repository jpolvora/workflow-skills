---


name: ws-audit
description: Runtime workflow audit observer — logs script/tool/I/O/dispatch anomalies during ws-spec-to-pr* runs and proposes upstream GitHub issues for skill execution errors.
version: 0.3.9
disable-model-invocation: true
invocation_names:
  - audit
  - ws-audit
---

# ws-audit

> When this skill is loaded, output "ws-audit loaded."

**Leading word:** *observe* — live runtime anomalies during orchestration, not static install diagnose (`ws-doctor`) or harness integrity (`ws-check-harness`).

Opt-in via `defaults.enableAuditing` (`boolean`, default `false`). When effective `true`, orchestrators wrap `ws-spec-to-pr`, `ws-spec-to-pr-lite`, and `ws-multi-spec` child runs with this protocol.

Language: **en-us**. Harness-neutral: portable aliases from [`tools.md`](../ws-shared/tools.md) only.

## Boundaries

| Skill | Use when |
|-------|----------|
| **This skill** | Live script/tool/I/O/dispatch anomalies during an orch run; log even when the model recovers |
| [`ws-doctor`](../ws-doctor/SKILL.md) | Static install diagnose (paths, parse, config summary, missing refs) |
| [`ws-check-harness`](../ws-check-harness/SKILL.md) | Meta-harness integrity Phases 0–5c |
| [`ws-fable-judge`](../ws-fable-judge/SKILL.md) | Adversarial claim vs git diff |

## Config

| Key | Default | Effective when |
|-----|---------|----------------|
| `defaults.enableAuditing` | `false` | Explicit `true` in project `{sharedDir}/config.json` |

Resolution: missing config, omitted key, null, or unreadable → `false`. See [`config-resolution.md`](../ws-shared/config-resolution.md) § Runtime audit.

## Orchestrator obligations (when enabled)

1. **Init** at bootstrap (after `{us-dir}` known):

   ```bash
   node {skillsRoot}/ws-audit/scripts/audit_log.js init \
     --us-dir "{us-dir}" --slug "{slug}" --workflow-id "{workflow-id}"
   ```

   Persist returned `session` JSON in workflow state (`auditSession`).

2. **Append** after each notable event (script failure/retry, tool mismatch, missing handoff artifact, unusual dispatch):

   ```bash
   node {skillsRoot}/ws-audit/scripts/audit_log.js append \
     --session '{...}' \
     --finding '{"step":"4","skill":"ws-implement-tasks","category":"script","severity":"error","summary":"...","evidence":"...","recovered":true}'
   ```

   Log skill-content defects **even when recovered**.

3. **Finalize** at workflow end (before or after Step 8 delivery result):

   ```bash
   node {skillsRoot}/ws-audit/scripts/audit_log.js finalize --session '{...}'
   ```

4. **Upstream issue gate** when `has-errors` is true:

   ```bash
   node {skillsRoot}/ws-audit/scripts/audit_log.js has-errors --session '{...}'
   node {skillsRoot}/ws-audit/scripts/audit_log.js draft-issue --session '{...}'
   ```

   Present `user-gate`:

   1. **Open GitHub issue on upstream repo** (Recommended) — `gh issue create` with draft title/body; target `skill-dependencies.json` → `upstream.repo` (default `jpolvora/workflow-skills`)
   2. **Copy draft only**
   3. **Skip**

   Do **not** auto-create the issue without user acceptance. Do **not** treat a consumer fix PR as the primary outcome for managed skill defects.

## Log format

See [`AUDIT-FORMAT.md`](AUDIT-FORMAT.md). Path: `{us-dir}/audit-{slug}-{timestamp}.log.md`.

## Resolve helper

```bash
node {skillsRoot}/ws-audit/scripts/audit_log.js resolve [--config "{sharedDir}/config.json"]
```

Returns `{"enableAuditing":true|false}`.

## When disabled

No init/append/finalize obligation; no end-of-run issue gate from this feature.
