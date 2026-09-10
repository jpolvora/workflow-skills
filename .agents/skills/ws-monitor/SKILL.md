---
name: ws-monitor
description: Read-only live observer for active Spec-to-PR workflow runs, telemetry, artifacts, and configured host transcripts.
version: 0.4.14
disable-model-invocation: true
invocation_names:
  - monitor
  - ws-monitor
  - workflow-monitor
---

# ws-monitor

> When this skill is loaded, output "ws-monitor loaded."

Observe active `ws-spec-to-pr` and `ws-spec-to-pr-lite` runs without changing product code, workflow state, managed skills, or consumer configuration. The observer diagnoses live execution signals that offline harness checks cannot see.

## Boundaries

- Read `{plansDir}/{slug}/` state JSON/Markdown, `telemetry.jsonl`, and expected step artifacts.
- Read transcript roots only when the user configures them through `monitor.transcriptRoots` or `--transcript-root`.
- Report missing artifacts, state drift, empty telemetry fields, path failures, rejected models, and interrupted turns.
- Write a Markdown report only when the caller passes `--report`.
- Do not fix product code, patch managed skills, edit workflow state, or file an upstream issue automatically.

Upstream issue text must be anonymized before filing: remove consumer repository names, local paths, hostnames, tracker ids, transcripts, credentials, and customer data. Describe the failure class and portable contract instead.

## Invocation

```text
/ws-monitor [--slug <slug>] [--workflow-id <id>] [--transcript-root <path>]
/ws-monitor --watch --interval <seconds> --iterations <count>
```

The command observes all workflow folders under the configured `plans.dir` by default. Use `--json` for machine-readable output and `--report <path>` to save a consumer-local report. `--watch` requires positive-integer `--iterations` and repeats snapshots for that bounded count; `--interval` must also be a positive integer when supplied.

## Steps

1. **Resolve** — Load project `{sharedDir}/config.json`, resolve `{plansDir}`, and apply project-local-over-global hub precedence.
   - Done when: the active plans directory and optional transcript roots are known, plus `resolvedContext` names the selected local/global source.
2. **Collect** — Run the snapshot script against state files, telemetry, expected artifacts, and explicitly configured transcript roots.
   - Done when: each selected workflow has a state summary, telemetry summary, artifact status, and classified signals.
3. **Classify** — Mark findings as `critical`, `warning`, or `info`; distinguish evidence from inference.
   - Done when: every finding has a stable code, message, and available evidence path.
4. **Report** — Print Markdown or JSON and optionally persist the report path supplied by the caller.
   - Done when: the report identifies the next diagnostic action and contains the anonymization guardrail.

## Signal map

| Signal | Classification | Meaning |
|--------|----------------|---------|
| Missing mandatory Step 2 interview/refined artifact | Critical | The plan contract is incomplete before downstream work |
| `currentStep` past Step 5 with a score below `minVerifyScore` | Critical | The workflow has advanced while verification is below the gate |
| Completed mutating step with empty `filesTouched` | Warning | The subagent handoff did not reach telemetry |
| `packageVersion: "unknown"` | Warning | Runtime provenance is unavailable |
| `ENOENT` or `build_dispatch_context` in a transcript | Critical | A path or hybrid installation resolution failed |
| Rejected/unavailable model in a transcript | Warning | Dispatch should fall back to the active session model |
| `turn_ended` before handoff | Warning | A host turn may have interrupted execution |
| Telemetry ahead of selected state (`stale-state`) | Critical or warning | The monitor must not report an older step as current without explaining the state-source mismatch |
| State branch/HEAD/worktree differs from active checkout (`context-mismatch`) | Critical or warning | Orchestrator and monitor resolved different local/global roots, or config changed mid-run |
| Local config present but unreadable (`config-unreadable`) | Critical | Report candidate paths; never silently fall back to the global hub |

## Launcher

```bash
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs [--slug <slug>] [--workflow-id <id>] [--transcript-root <path>] [--report <path>] [--json]
```

Transcript scanning is opt-in. Do not guess host-private transcript paths or read credentials.
