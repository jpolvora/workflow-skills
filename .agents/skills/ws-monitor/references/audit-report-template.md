# Workflow monitor report

Generated: `{timestamp}`
Plans directory: `{plansDir}`

## Summary

- Workflows observed: `{workflowCount}`
- Active workflows: `{activeCount}`
- Critical findings: `{criticalCount}`
- Warnings: `{warningCount}`

## Findings

Each finding must include:

- Severity: `critical` | `warning` | `info`
- Stable code
- Generic failure-class description
- Consumer-local evidence path, when safe to retain
- Recommended diagnostic action

## Workflow snapshots

For each workflow, record status, pipeline, current step, verification score, telemetry event count, expected artifacts, and the last event.

## Transcript scan

List only explicitly configured roots and the number of files scanned. Do not paste transcript contents.

## Upstream filing check

Before filing, remove private repository names, local paths, hostnames, tracker ids, transcript text, secrets, and customer data.
