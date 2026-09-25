# Workflow defect report

Detected by `ws-monitor` live watch (read-only observer). Filed to fix the workflow/harness contract that produced the failure class below.

- Generated: 2026-09-25T03:32:28.430Z
- Project: workflow-skills
- Session id: 01a0d48d-eeaa-77c1-8b7c-2bd9c4d69126
- Agent: muse
- SCM provider: github
- Command: node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --watch --interval 60 --until-terminal --follow-transcript --session-id 01a0d48d-eeaa-77c1-8b7c-2bd9c4d69126 --agent muse --open-issue

## Summary

7 actionable finding(s) across 3 workflow(s).

Codes: empty-files-touched, model-fallback

## Failure classes

### `empty-files-touched` (warning)

- Completed mutating Step 1 reported no filesTouched
- Completed mutating Step 2 reported no filesTouched
- Completed mutating Step 3 reported no filesTouched
- Completed mutating Step 4 reported no filesTouched
- Completed mutating Step 6 reported no filesTouched
- Suspected contract to update: update_state.cjs finish / step dispatch filesTouched (telemetry handoff)

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
