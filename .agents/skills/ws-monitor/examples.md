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
