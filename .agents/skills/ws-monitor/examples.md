# ws-monitor examples

## One snapshot

```bash
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --slug us-example --json
```

## Save a local report

```bash
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --report {plansDir}/us-example/workflow-monitor.report.md
```

## Observe configured transcripts

```bash
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --transcript-root .agents/transcripts --report {plansDir}/us-example/workflow-monitor.report.md
```

## Bounded polling

```bash
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --watch --interval 5 --iterations 12 --json
```
