# Workflow defect report

Detected by `ws-monitor` live watch (read-only observer). Filed to fix the workflow/harness contract that produced the failure class below.

- Generated: 2026-09-29T20:33:08.136Z
- Project: workflow-skills
- Session id: ses_f118937d5ffe11Jx3M4vo9DWs0
- Agent: opencode
- SCM provider: github
- Command: node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --watch --interval 60 --until-terminal --follow-transcript --session-id ses_f118937d5ffe11Jx3M4vo9DWs0 --agent opencode --open-issue

## Summary

1 actionable finding(s) across 1 workflow(s).

Codes: model-fallback

## Failure classes

### `model-fallback` (warning)

- Transcript contains a rejected or unavailable model identifier
  - Evidence: session.jsonl
- Suspected contract to update: modelsPreset / stepModels resolution (model resolution)

## Expected contract

A live workflow must either progress to a terminal state or record an explicit turn-boundary pause, with telemetry and step artifacts consistent with the state file. The contracts above should make the observed failure class deterministic-free.

## Reproduction shape

- Install scope: project-local or global skills install (state the scope when filing).
- A workflow run reaching the step named in the evidence with the reported signal.
- Re-run the command above with `--json` to reproduce the finding list.

## Scope checklist

- [ ] Observer did not modify product code or workflow state
- [ ] Body anonymized (no consumer secrets, customer data, or absolute machine paths)
