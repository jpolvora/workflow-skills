---
name: ws-audit
description: Runtime workflow audit observer — logs script/tool/I/O/dispatch anomalies, diagnoses performance bottlenecks, detects disposable scratch scripts, and proposes upstream GitHub issues, draft PRs, and session todos (user-gate).
version: 0.3.34
disable-model-invocation: true
invocation_names:
  - audit
  - ws-audit
---

# ws-audit

> When this skill is loaded, output "ws-audit loaded."

**Leading word:** *observe* — live runtime anomalies, performance bottlenecks, correctness risks, and disposable script opportunities during orchestration, not static install diagnose (`ws-doctor`) or harness integrity (`ws-check-harness`).

Opt-in via `defaults.enableAuditing` (`boolean`, default `false`). When effective `true`, all workflows and orchestrators (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-multi-spec`, `ws-ship-pr`, `ws-goal-fix-pr`, `ws-fix-pr`) wrap executions with this protocol.

Language: **en-us**. Harness-neutral: portable aliases from [`tools.md`](../ws-shared/tools.md) only.

## Boundaries

| Skill | Use when |
|-------|----------|
| **This skill** | Live script execution errors, tool/I/O/dispatch anomalies, command bottlenecks, and disposable scratch script opportunities across any workflow run; log even when the model recovers |
| [`ws-doctor`](../ws-doctor/SKILL.md) | Static install diagnose (paths, parse, config summary, missing refs) |
| [`ws-check-harness`](../ws-check-harness/SKILL.md) | Meta-harness integrity Phases 0–5c (includes static nested-quote `-c` scan) |
| [`ws-fable-judge`](../ws-fable-judge/SKILL.md) | Adversarial claim vs git diff |

## Config

| Key | Default | Effective when |
|-----|---------|----------------|
| `defaults.enableAuditing` | `false` | Explicit `true` in project `{sharedDir}/config.json` |

Resolution: missing config, omitted key, null, or unreadable → `false`. See [`config-resolution.md`](../ws-shared/config-resolution.md) § Runtime audit.

## Workflow & orchestrator obligations (when enabled)

1. **Init** at bootstrap:
   - In orchestrator runs: initialize once `{us-dir}` is known (`--us-dir "{us-dir}"`).
   - In standalone workflow runs (`ws-ship-pr`, `ws-goal-fix-pr`, `ws-fix-pr`): initialize under the target plan dir (`--us-dir "{plansDir}/pr-{PR-NUMBER}"` or `--us-dir "{plansDir}/ship-{branch}"`).

   ```bash
   node {skillsRoot}/ws-audit/scripts/audit_log.js init \
     --us-dir "{us-dir}" --slug "{slug}" --workflow-id "{workflow-id}"
   # Standalone ws-fix-pr / ws-goal-fix-pr: --us-dir "{plansDir}/pr-{PR-NUMBER}"
   # Standalone ws-ship-pr: --us-dir "{plansDir}/ship-{branch}"
   ```

   Persist returned `session` JSON in workflow state (`auditSession`) or active context.

2. **Append** after notable events:
   - **Script execution errors (mandatory):** whenever any managed script, provider helper, SCM wrapper, Node state manager (`update_state.cjs`, `validate_state.cjs`), or verification script fails with a non-zero exit code, unhandled exception, bad CLI argument/option, or stderr error. Log with `category: "script"`, `severity: "error"`, capturing command line, stdout, stderr, and `recovered: true/false`.
   - **Inline `-c` / `-e` / quoting failures (mandatory):** any `python -c`, `node -e` / `node --eval`, or shell one-liner that fails with `SyntaxError`, nested-quote parse errors, or mixed `"`/`'` payloads. Classify then append **both** findings (do not skip when recovered):

     ```bash
     node {skillsRoot}/ws-audit/scripts/audit_log.js classify-shell-failure \
       --command "{command}" --stderr-file "{us-dir}/.audit-stderr.txt" \
       --step "{step}" --skill "{skill}" --recovered true
     ```

     Write each returned finding via `append` (`category: script` severity `error` + `category: disposable-script`). Prefer permanent helpers such as `node {skillsRoot}/ws-shared/scripts/extract_frontmatter_field.cjs` over inventing another one-liner ([`CROSS-PLATFORM.md`](../ws-shared/CROSS-PLATFORM.md)).
   - **Anomalies / Errors:** tool mismatch, missing handoff artifact, unusual dispatch.
   - **Opportunities / Suggestions:** agent writing disposable scratch scripts (`scratch/*`, `tmp/*`, inline helpers for parsing/filtering/querying that could be pre-generated upstream), redundant command executions, inefficient polling loops, unhandled stderr warnings or fragile shell pipelines.

   Write finding JSON with the host file-writing tool (never inline shell JSON), then:

   ```bash
   node {skillsRoot}/ws-audit/scripts/audit_log.js append \
     --session-file "{us-dir}/.audit-session-{slug}.json" \
     --finding-file "{us-dir}/.finding-step-4.json"
   ```

   Log skill-content and script defects **even when recovered**.

3. **Finalize** at workflow end (before or after Step 8 delivery result):

   ```bash
   node {skillsRoot}/ws-audit/scripts/audit_log.js finalize \
     --session-file "{us-dir}/.audit-session-{slug}.json"
   ```

4. **Remediation gate (user-gate only — never auto-create):**

   When `has-errors` or `has-suggestions` is true:

   ```bash
   node {skillsRoot}/ws-audit/scripts/audit_log.js draft-remediation \
     --session-file "{us-dir}/.audit-session-{slug}.json"
   ```

   Present `user-gate` with the returned options (recommended first):
   1. **Open GitHub issue on upstream repo** — `gh issue create` with draft title/body; target `skill-dependencies.json` → `upstream.repo`
   2. **Open draft PR with a permanent helper / recipe fix** — after accept only: implement the recommended companion script or recipe fix, then `gh pr create --draft`
   3. **Create session todo / goal** — host todo or goal from `remediation.options[].todo`
   4. **Copy draft only**
   5. **Skip**

   Cancel / dismiss → STOP (do not create issue, PR, or todo). Do **not** treat a consumer fix PR as the primary outcome for managed skill defects when an upstream issue is the better track.

## Log format

See [`AUDIT-FORMAT.md`](AUDIT-FORMAT.md). Path: `{us-dir}/audit-{slug}-{timestamp}.log.md`.

## Resolve helper

```bash
node {skillsRoot}/ws-audit/scripts/audit_log.js resolve [--config "{sharedDir}/config.json"]
```

Returns `{"enableAuditing":true|false}`.

## When disabled

No init/append/finalize obligation; no end-of-run remediation gate from this feature.
