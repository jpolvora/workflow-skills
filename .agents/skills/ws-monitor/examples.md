# ws-monitor examples

## One snapshot

```bash
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --slug us-example --json
```

## Automatic live workflow watch (bounded polling)

```bash
# Watch active workflow execution for a 5-minute window (interval 10s, 30 iterations)
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --watch --interval 10 --iterations 30

# Fast watch for convergence loops
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --watch --interval 5 --iterations 20 --json
```

## Default live watch profile (poll until terminal, follow transcript, file a defect issue)

```bash
# 60s poll until the scoped workflow is terminal; follow the transcript by
# session id; detect stall/hang; propose an enriched defect issue and write the report.
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --slug us-example \
  --watch --interval 60 --until-terminal --follow-transcript \
  --session-id "<session-id>" --agent "<agent-name>" --open-issue \
  --report {plansDir}/us-example/workflow-monitor.report.md

# Advisory: propose the issue without filing (the skill skips create-issue)
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --slug us-example --open-issue --dry-run --json

# Override the stall/hang threshold (seconds)
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --slug us-example --stall-window 1800 --json
```

The proposal body is written to `{plansDir}/us-example/workflow-monitor.issue.md`; the skill
then runs the configured provider `create-issue` intent (GitHub/ADO) with that title/body.

## Observe multi-spec batch runs (ws-spec-multi)

```bash
# Inspect all workflows including ws-spec-multi batch runner state files
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs

# Focus on a specific multi-spec run ID or queued slug
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --slug 02-user-auth --json
```

## Check memory vault records for current project

```bash
# Query memory vault (spec-memo or local memory files) and cross-reference with disk
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --vault
```

## Collect host agent transcripts (Cursor, OpenCode, Antigravity)

```bash
# Auto-discover workspace candidate transcripts (.cursor, .opencode, .agents/transcripts)
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --discover-host-transcripts

# Observe explicitly configured transcript roots
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --transcript-root .agents/transcripts --report {plansDir}/us-example/workflow-monitor.report.md
```

## Save a local report

```bash
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --report {plansDir}/us-example/workflow-monitor.report.md
```
