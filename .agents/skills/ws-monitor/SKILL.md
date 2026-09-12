---
name: ws-monitor
description: Read-only live observer for active Spec-to-PR and multi-spec workflow runs, memory vault status, telemetry, artifacts, and multi-host transcripts.
version: 0.4.19
disable-model-invocation: true
invocation_names:
  - monitor
  - ws-monitor
  - workflow-monitor
---

# ws-monitor

> When this skill is loaded, output "ws-monitor loaded."

Observe active `ws-spec-to-pr`, `ws-spec-to-pr-lite`, and `ws-spec-multi` runs without changing product code, workflow state, managed skills, or consumer configuration. The observer diagnoses live execution signals that offline harness checks cannot see.

## Boundaries

- Read `{plansDir}/{slug}/` state JSON/Markdown, `{plansDir}/ws-spec-multi/` batch runner state, `telemetry.jsonl`, expected step artifacts, and memory vault records.
- State and telemetry (`stepDispatches` in state files, `telemetry.jsonl`) are the canonical source of truth for dispatch provenance (`subagentId`, `agentType`, `model`). Memory vault records and transcripts are secondary observational signals.
- Check project memory vault (`spec-memo` MCP/CLI or local `{sharedDir}/memory/`) to discover and cross-reference running workflows for the current project.
- Read transcript roots from configured `monitor.transcriptRoots`, workspace candidate roots (`.agents/transcripts/`, `.cursor/`, `.opencode/`), and host locations when requested via `--transcript-root` or `--discover-host-transcripts`.
- Report missing artifacts, state drift, empty telemetry fields, path failures, rejected models, interrupted turns, batch queue stalls, and memory vault synchronization gaps.
- Write a Markdown report only when the caller passes `--report`.
- Do not fix product code, patch managed skills, edit workflow state, or file an upstream issue automatically.

Upstream issue text must be anonymized before filing: remove consumer repository names, local paths, hostnames, tracker ids, transcripts, credentials, and customer data. Describe the failure class and portable contract instead.

## Invocation

```text
/ws-monitor [--slug <slug>] [--workflow-id <id>] [--transcript-root <path>]
/ws-monitor --watch --interval <seconds> --iterations <count>
/ws-monitor --vault
/ws-monitor --discover-host-transcripts
```

The command observes all workflow folders under the configured `plans.dir` by default. Use `--json` for machine-readable output and `--report <path>` to save a consumer-local report. `--watch` requires positive-integer `--iterations` and repeats snapshots for that bounded count; `--interval` must also be a positive integer when supplied.

## Steps

1. **Resolve** — Load project `{sharedDir}/config.json`, resolve `{plansDir}`, memory routing (`resolveMemoryRouting`), and transcript candidate roots. Apply project-local-over-global hub precedence.
   - Done when: the active plans directory, memory backend status, and transcript roots are known, plus `resolvedContext` names the selected local/global source.
2. **Collect** — Run the snapshot script against state files (single-spec and `ws-spec-multi`), telemetry, expected artifacts, memory vault records, and host transcripts.
   - Done when: each selected workflow has a state summary, telemetry summary, artifact status, and classified signals.
3. **Classify** — Mark findings as `critical`, `warning`, or `info`; distinguish evidence from inference.
   - Done when: every finding has a stable code, message, and available evidence path.
4. **Report** — Print Markdown or JSON and optionally persist the report path supplied by the caller.
   - Done when: the report identifies the next diagnostic action and contains the anonymization guardrail.

## Automatic Live Watching

When watching a live running workflow in the background or during paired sessions:

- **Bounded polling loop:** Execute `/ws-monitor --watch --interval <seconds> --iterations <count>`. Recommended cadence: `--interval 10` for active subagent steps (Step 4 build, Step 7 testing), `--interval 5` during fast convergence loops (`ws-goal-fix-pr`).
- **State transitions to track:**
  - `currentStep` advancement (e.g. Step 0 Spec -> Step 1 Plan -> Step 2 Interview -> Step 3 Tasks -> Step 4 Implement -> Step 5 Verify -> Step 6 Review -> Step 7 Test -> Step 8 Ship).
  - Step status changes in `stepStatus` (`in_progress` -> `completed` / `skipped` / `failed`).
  - Verification score: verify score meets `minVerifyScore` (default 9) before advancing to Step 6.
  - Files touched: verify mutating steps report non-empty `filesTouched` in telemetry upon finish.
- **Stall & drift detection:**
  - `stale-state`: telemetry timestamp is newer than state file mtime (> 5 seconds), indicating delayed state flush or revision race.
  - Stalled turn: if a transcript indicates `turn_ended` without a corresponding workflow handoff or state update.

## Multi-Spec Batch Monitoring (`ws-spec-multi`)

`ws-spec-multi` runs sequential batches over multiple specifications, maintaining queue state under `{plansDir}/ws-spec-multi/ms-*.state.md` (or `.state.json`):

- **Queue inspection:**
  - Parse queue table: extract index, slug, specPath, flowMode (`lite` or `standard`), status (`pending`, `in_progress`, `shipped`, `skipped`, `failed`), prNumber, prUrl, and reason.
  - Active worker: identify the item with `status: in_progress`. The monitor can cross-inspect the child worker's plan directory under `{plansDir}/{activeSlug}/`.
  - Phase 4b convergence: verify PR merge convergence (`merged: true`, `activeThreads: 0`) before advancing to the next spec in queue.
- **Queue signals:**
  - `multi-spec-idle`: run status is `active` but no item is `pending` or `in_progress`.
  - `multi-spec-failed-item`: an item failed; inspect `reason` to diagnose child worker failure.
  - `multi-spec-concurrency`: multiple items marked `in_progress` simultaneously (batch execution is strictly sequential).

## Memory Vault Data Collection (Current Project)

The monitor checks project memory vault records to identify running or active workflows recorded in the project's knowledge store:

- **Routing resolution:** Query `resolveMemoryRouting(config)` to determine active memory backends (`enableSpecMemoIntegration` for external vault, `enableMemoryFiles` for local markdown).
- **External vault querying (`spec-memo`):**
  - Via MCP: Call `spec-memo` tool `search` with `{ "kinds": ["state"], "status": "active", "cwd": "{repoRoot}" }` or `get` by `{ "kind": "state", "slug": "{slug}" }`.
  - Via CLI: Run `{specMemo.cli || 'memo'} search --kinds state --status active --cwd {repoRoot} --json`.
  - Active project records: extract workflow state records, active slug, recorded run checkpoints, and session tags.
- **Local memory files:** When local memory is active, inspect `{sharedDir}/memory/*.md` and `{sharedDir}/MEMORY.md` for active workflow markers, traps, and decision logs.
- **Reconciliation:** Compare vault records with on-disk state under `{plansDir}`. If the vault lists a workflow as active that is missing on disk, report `vault-unreconciled-workflow`.

## Host Agent Transcript Collection (Cursor, OpenCode, Antigravity)

Transcripts provide secondary evidence to diagnose why a subagent or orchestrator stalled, fell back, or threw errors:

- **Host transcript locations:**
  - **Cursor**: Workspace `.cursor/transcripts/`, `.cursor/chats/`, and user workspace storage (`%APPDATA%/Cursor/User/workspaceStorage/<hash>/` on Windows, `~/.config/Cursor/User/workspaceStorage/` on Linux, `~/Library/Application Support/Cursor/User/workspaceStorage/` on macOS).
  - **OpenCode**: Workspace `.opencode/transcripts/`, `.opencode/sessions/`, `.opencode/logs/`, and user sessions (`~/.opencode/sessions/`).
  - **Antigravity**: Workspace `.agents/transcripts/`, `.system_generated/logs/`, and IDE app data (`<appDataDir>/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`).
- **Discovery:**
  - Workspace candidate roots are auto-discovered if they exist in the repository.
  - User-level / host IDE transcript paths are scanned when passing `--discover-host-transcripts` or configured via `monitor.transcriptRoots` or `--transcript-root <path>`.
- **Diagnostic pattern scanning:**
  - `hybrid-path-resolution`: `ENOENT`, `build_dispatch_context` (missing skills or path resolution failures).
  - `model-fallback`: rejected, unsupported, or unavailable model identifiers.
  - `turn-ended`: turn ended before workflow handoff block was emitted.
  - `generic-dispatch`: generic subagent used where named specialized subagent was expected.
  - `subagent-error`: fatal errors, unhandled promise rejections, or worker exceptions.
- **Anonymization guardrail:** Transcripts may contain sensitive workspace tokens, prompt history, or private code. Always sanitize before reporting or filing upstream.

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
| Generic dispatch where named projection was expected (`generic-dispatch`) | Warning | Host supports named subagents but dispatch used generic fallback without explanation (embed-inline is healthy when host lacks named-agent binding) |
| Multi-spec queue item failed (`multi-spec-failed-item`) | Warning | A spec within the batch run encountered a terminal failure |
| Multi-spec queue active with no progress (`multi-spec-idle`) | Info | Batch run is active but all queue items are processed or none pending |
| Memory vault records active workflow missing on disk (`vault-unreconciled-workflow`) | Info | Memory vault lists an active workflow that does not exist in local plans |
| Transcript contains unhandled error or exception (`subagent-error`) | Warning | Subagent or worker crashed or threw an unhandled exception |

## Launcher

```bash
# Snapshot all workflows
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs

# Watch active runs with bounded polling
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --watch --interval 10 --iterations 30

# Filter by slug or workflow ID (supports single-spec and multi-spec batch)
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --slug us-example --json

# Query with memory vault and host transcript auto-discovery
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --vault --discover-host-transcripts

# Observe explicit transcript roots and save report
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --transcript-root .agents/transcripts --report {plansDir}/us-example/workflow-monitor.report.md
```

Transcript scanning is opt-in. Do not guess host-private transcript paths or read credentials.
