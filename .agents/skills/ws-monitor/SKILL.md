---
name: ws-monitor
description: Read-only live observer for active Spec-to-PR and multi-spec workflow runs, memory vault status, telemetry, artifacts, and multi-host transcripts.
version: 0.4.70
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
- Check project memory vault (`spec-memo` MCP/CLI or local `{memoryDir}/memory/`) to discover and cross-reference running workflows for the current project.
- Read transcript roots from configured `monitor.transcriptRoots`, workspace candidate roots (`.agents/transcripts/`, `.cursor/`, `.opencode/`), and host locations when requested via `--transcript-root` or `--discover-host-transcripts`.
- Report missing artifacts, state drift, empty telemetry fields, path failures, rejected models, interrupted turns, batch queue stalls, and memory vault synchronization gaps.
- Write a Markdown report only when the caller passes `--report`.
- Share observation semantics with the `ws-spec-to-pr` opt-in execution observer
  through [`observer-instructions.md`](../ws-shared/runtime/observer-instructions.md) — reference that file;
  do not duplicate its contract here.
- Prefer state-recorded agent transcript paths (`state.agentTranscripts` via
  `resolveStateAgentTranscripts`) before host-store discovery.
- Do not fix product code, patch managed skills, edit workflow state, or file an upstream issue automatically.

Upstream issue text must be anonymized before filing: remove consumer repository names, local paths, hostnames, tracker ids, transcripts, credentials, and customer data. Describe the failure class and portable contract instead.

## Invocation

```text
/ws-monitor [--slug <slug>] [--workflow-id <id>] [--transcript-root <path>]
/ws-monitor --watch --interval <seconds> --iterations <count>
/ws-monitor --watch --interval <seconds> --until-terminal
/ws-monitor --vault
/ws-monitor --discover-host-transcripts
/ws-monitor --follow-transcript --session-id <id> [--agent <name>] --open-issue --report <path>
```

The command observes all workflow folders under the configured `plans.dir` by default. Use `--json` for machine-readable output and `--report <path>` to save a consumer-local report. `--watch` requires positive-integer `--iterations` **or** `--until-terminal` (mutually exclusive; a usage error exits non-zero before any scan); `--interval` must also be a positive integer when supplied. `--until-terminal` repeats snapshots until the scoped report has no workflow in `active` / `blocked` / `in_progress`, then exits 0 — bounded unattended watching without an external poll loop.

## Default prompt parameters (live watch profile)

A natural-language invocation of the form

```text
ws-monitor full live watch poll every minute until workflow finished + session id = '<id>' agent <name> follow transcript and open SCM provider issue, detect stall or hung up stopwatch, show report when workflow finished
```

activates the **default watch profile**. When any part of that phrasing appears, apply the mapped parameters without re-asking; `agent` and `session id` are optional (omit `--session-id` to correlate by slug/workflow id).

| Prompt parameter | Applied flag | Behavior |
|------------------|--------------|----------|
| full live watch | `--watch` | Repeated snapshots instead of one |
| poll every minute until workflow finished | `--interval 60 --until-terminal` | 60s cadence; exit when the scoped report has no `active`/`blocked`/`in_progress` workflow |
| session id = '<id>' | `--session-id <id>` | Alternative transcript correlation key (a session may not mention the slug) |
| agent <name> (optional) | `--agent <name>` | Annotates the report/issue with the observed agent; no filtering side effects |
| follow transcript | `--follow-transcript` (alias of `--discover-host-transcripts`) | Enables bounded host-session discovery |
| open SCM provider issue | `--open-issue` | Proposes an enriched defect issue and writes the body; the skill runs the configured provider `create-issue` intent at terminal |
| detect stall or hung up stopwatch | `--stall-window <sec>` (default 600) | `worker-session-stall` (idle session) / `stalled-workflow` (hung state/telemetry clock); `stopwatch` reports idle vs threshold |
| show report when workflow finished | `--report <path>` | Writes the final Markdown report when the watch exits |

Profile flags stay explicit: nothing changes unless the phrasing or the flags are present. `--dry-run` keeps `--open-issue` advisory (proposal only, no tracker mutation).

## Steps

1. **Resolve** — Load project `.ws/config.json` (bootstrap, fixed), resolve `{plansDir}`, memory routing (`resolveMemoryRouting`), and transcript candidate roots. Apply project-local-over-global hub precedence.
   - Done when: the active plans directory, memory backend status, and transcript roots are known, plus `resolvedContext` names the selected local/global source.
2. **Collect** — Run the snapshot script against state files (single-spec and `ws-spec-multi`), telemetry, expected artifacts, memory vault records, and host transcripts.
   - Done when: each selected workflow has a state summary, telemetry summary, artifact status, and classified signals.
3. **Classify** — Mark findings as `critical`, `warning`, or `info`; distinguish evidence from inference.
   - Done when: every finding has a stable code, message, and available evidence path.
4. **Report** — Print Markdown or JSON and optionally persist the report path supplied by the caller.
   - Done when: the report identifies the next diagnostic action and contains the anonymization guardrail.

## Automatic Live Watching

When watching a live running workflow in the background or during paired sessions:

- **Bounded polling loop:** Execute `/ws-monitor --watch --interval <seconds> --iterations <count>`, or `--watch --interval <seconds> --until-terminal` to stop automatically when the scoped workflow reaches a non-active status. Recommended cadence: `--interval 10` for active subagent steps (Step 4 build, Step 7 testing), `--interval 5` during fast convergence loops (`ws-goal-fix-pr`).
- **State transitions to track:**
  - `currentStep` advancement (e.g. Step 0 Spec -> Step 1 Plan -> Step 2 Interview -> Step 3 Tasks -> Step 4 Implement -> Step 5 Verify -> Step 6 Review -> Step 7 Test -> Step 8 Ship).
  - Step status changes in `stepStatus` (`in_progress` -> `completed` / `skipped` / `failed`).
  - Verification score: verify score meets `minVerifyScore` (default 9) before advancing to Step 6.
  - Files touched: verify mutating steps report non-empty `filesTouched` in telemetry upon finish.
- **Stall & drift detection:**
  - `stale-state`: telemetry timestamp is newer than state file mtime (> 5 seconds), indicating delayed state flush or revision race.
  - Pause vs stall: a workflow whose state carries `state.turnPause` is **paused at a turn boundary** — report `worker-session-paused` (info) and never `worker-session-stall` for it; the stall warning applies only to an active workflow with an available, idle session and **no** pause marker.
  - Stalled turn: if a transcript indicates `turn_ended` without a corresponding workflow handoff or state update.
  - Stopwatch: each active workflow exposes `stopwatch` (`lastActivityAt`, `idleMs`, `thresholdMs`, `stalled`, `source`); `--stall-window <seconds>` overrides the default 600s threshold.
  - Hung workflow: no correlated session and the state/telemetry clock has not advanced beyond the threshold → `stalled-workflow` (warning). A turn-boundary pause marker suppresses both stall signals.

## Detecting workflow defects & opening a fix issue

The live watch exists to catch **workflow misbehavior**: failed operations, workarounds, and stalls that point at an instruction, tool-calling spec, contract, or logic that should change. The observer never patches code or state; it reports the failure class and the contract to fix.

- **Actionable signals:** every `critical` / `warning` finding is a candidate defect (`missing-artifact`, `missing-exec-artifact`, `step-drift`, `empty-files-touched`, `stale-state`, `context-mismatch`, `config-unreadable`, `telemetry-parse-error`, `hybrid-path-resolution`, `model-fallback`, `turn-ended`, `generic-dispatch`, `subagent-error`, `worker-session-stall`, `stalled-workflow`, `terminal-run-active`, and the multi-spec queue signals).
- **Stopwatch:** `source: session` uses the correlated session mtime; `source: state-telemetry` is the hung-workflow clock when no session is available.
- **Enriched proposal:** with `--open-issue`, `report.issueProposal` carries `provider`, `title`, `codes`, `slugs`, `dryRun`, and an anonymized `body`; the body is written to `{plansDir}/{slug}/workflow-monitor.issue.md` (or `{plansDir}/workflow-monitor.issue.md`) and `bodyPath` is reported.
- **Filing (opt-in, agent step):** when the proposal exists and the run is not `dry-run`, load the configured SCM provider (`providers.scm`) and run its `create-issue` intent with the proposed title/body:
  - GitHub: `node {skillsRoot}/ws-spec-provider-github/scripts/create_issue.cjs --title "<title>" --body-file <bodyPath> [--label bug]`
  - Azure DevOps: `node {skillsRoot}/ws-spec-provider-azure-devops/scripts/create_issue.cjs --title "<title>" --body-file <bodyPath> [--type Bug]`
  - `provider: unresolved` → do not file; report the missing `providers.scm` and stop.
- **Anonymization guardrail:** strip consumer repository names, local paths, hostnames, tracker ids, transcripts, credentials, and customer data before filing. The proposal body is already sanitized; re-check before posting.

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
  - `missing-child-state`: a queue item that advanced (`in_progress` / `shipped` / `failed`) has no valid child machine state (a parseable `*.state.json` carrying the workflow-identity fields and the item's own slug) under `{plansDir}/{slug}/`. Complements `stale-parent-row` (which requires a child that already closed); this one is the silent blind spot where the child left no state at all. Derived from the multi-spec `expectedArtifacts` model instead of a parallel detector.
  - `stale-parent-row`: a queue row is non-terminal while its child worker (same slug) is terminal, the run itself is terminal, or a newer active run claims the same `in_progress` slug (supersede never retired). The parent row did not propagate the child close.
  - `terminal-run-active`: a run whose steps through the close step are all terminal still reports an active status with no `endedAt`. The observer derives a terminal reported status (never counted live) and flags the stale state file.

## Terminal-state observation

A run is **terminal-shaped** when every step from 0 through the pipeline close step (`standard` → 8, `lite` → 4) is terminal (`completed` or `skipped`) in `completedSteps` / `skippedSteps` / `stepStatus`. A terminal-shaped run that still reports `status: active` with `endedAt: null` emits `terminal-run-active` and is reported with a derived terminal status, so `activeCount` and `status == active` polling reflect only real in-flight work.

## Memory Vault Data Collection (Current Project)

The monitor checks project memory vault records to identify running or active workflows recorded in the project's knowledge store:

- **Routing resolution:** Query `resolveMemoryRouting(config)` to determine active memory backends (`enableSpecMemoIntegration` for external vault, `enableMemoryFiles` for local markdown).
- **External vault querying (`spec-memo`):**
  - Via MCP: Call `spec-memo` tool `search` with `{ "kinds": ["state"], "status": "active", "cwd": "{repoRoot}" }` or `get` by `{ "kind": "state", "slug": "{slug}" }`.
  - Via CLI: Run `{specMemo.cli || 'memo'} search --kinds state --status active --cwd {repoRoot} --json`.
  - Active project records: extract workflow state records, active slug, recorded run checkpoints, and session tags.
- **Local memory files:** When local memory is active, inspect `{memoryDir}/memory/*.md` and `{memoryDir}/MEMORY.md` for active workflow markers, traps, and decision logs.
- **Reconciliation:** Compare vault records with on-disk state under `{plansDir}`. If the vault lists a workflow as active that is missing on disk, report `vault-unreconciled-workflow`.

## Host Agent Transcript Collection (Cursor, OpenCode, Antigravity, Muse)

Transcripts provide secondary evidence to diagnose why a subagent or orchestrator stalled, fell back, or threw errors:

- **Host transcript locations:**
  - **Cursor**: Workspace `.cursor/transcripts/`, `.cursor/chats/`, and user workspace storage (`%APPDATA%/Cursor/User/workspaceStorage/<hash>/` on Windows, `~/.config/Cursor/User/workspaceStorage/` on Linux, `~/Library/Application Support/Cursor/User/workspaceStorage/` on macOS).
  - **OpenCode**: Workspace `.opencode/transcripts/`, `.opencode/sessions/`, `.opencode/logs/`, and user sessions (`~/.opencode/sessions/`).
  - **Antigravity**: Workspace `.agents/transcripts/`, `.system_generated/logs/`, and IDE app data (`~/.gemini/antigravity-ide/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`).
  - **Muse**: User sessions (`~/.local/share/muse/sessions/YYYY/MM/DD/<session-id>/session.jsonl`, `$XDG_DATA_HOME` honored when set).
- **Adapter table:** per-OS default locations for Cursor, OpenCode, Antigravity, and Muse live in `references/host-adapters.md` (adapter data, not portable contract).
- **Transcript source:** each workflow reports `transcriptSource` (`available` with adapter + location class, or `transcript-unavailable` with reason `discovery-disabled` / `no-matching-session` / `scan-capped` when the bounded scan stopped early with zero candidates).
- **Read-only + bounded:** SQLite-family stores are tail-read in place through read-only file descriptors (WAL-safe, never copied, locked, or modified); only the recent-window tail is read under per-tick time/read caps; a session idle beyond the stall window while its workflow is active raises `worker-session-stall` unless the state carries a turn-boundary pause marker (`worker-session-paused` instead).
- **Discovery budget:** candidate roots are ranked (correlated-path roots first, then explicit, config, workspace, and host roots) and each root gets a reserved slice of the per-tick file budget, so unrelated roots cannot exhaust the budget before the correlated session is read. Correlated-path entries are collected first within a root, and a truncated root slice is reported honestly through `transcript.capped`.
- **Shared correlation window:** the scan sanitizes each bounded window once, filters on that same window, stores it, and `transcriptSource` resolution matches the identical window — a file the scan counted always resolves `available` when it matches, and `scan-capped` is reported only when the scan stopped before reading the matching file (`discovery-disabled` / `no-matching-session` / `scan-capped`).
- **Discovery:**
  - Workspace candidate roots are auto-discovered if they exist in the repository.
  - User-level / host IDE transcript paths are scanned when passing `--discover-host-transcripts` (alias `--follow-transcript`) or configured via `monitor.discoverHostTranscripts` (`monitor.hostHome` overrides the home; `monitor.transcriptRoots` adds explicit roots) or `--transcript-root <path>`.
  - `--session-id <id>` adds an alternative correlation key so a session that does not mention the slug/workflow id still resolves; `--agent <name>` annotates the report and issue proposal.
- **Diagnostic pattern scanning:**
  - `hybrid-path-resolution`: a resolution failure (`ENOENT` family) adjacent to dispatch-context construction (missing skills or path resolution failures; bare script-name substrings stay silent).
  - `model-fallback`: a rejected, unsupported, or unavailable model identifier inside a dispatch record (docs prose and reconciler outcomes stay silent).
  - `turn-ended`: turn ended before workflow handoff block was emitted.
  - `generic-dispatch`: generic subagent used where named specialized subagent was expected.
  - `subagent-error`: a fatal error, unhandled rejection, or worker exception beside a stack trace (prose and retried-then-succeeded attempts stay silent).
- **Anonymization guardrail:** Transcripts may contain sensitive workspace tokens, prompt history, or private code. Always sanitize before reporting or filing upstream.

## Signal map

| Signal | Classification | Meaning |
|--------|----------------|---------|
| Missing mandatory Step 2 interview/refined artifact | Critical | The plan contract is incomplete before downstream work |
| `currentStep` past Step 5 with a score below `minVerifyScore` | Critical | The workflow has advanced while verification is below the gate |
| Completed mutating step with empty `filesTouched` | Warning | The subagent handoff did not reach telemetry (silent only with an explicit no-op declaration on the finish event, or a skip reason) |
| Missing exec artifact on a truly completed Step 3 (`missing-exec-artifact`) | Critical | Step 3 finished `completed` but `step-03-*.plan.exec.md` is absent; a `dag-disabled` skip is the designed sequential shape (no stubs written) and stays silent as grandfathered |
| Expected artifacts on a `lite` pipeline run | Critical only for the lite contract | Lite Steps 0-5 (spec, plan, implement, review, ship, fix-pr) expect only the shared-name `step-00` spec, `step-01` plan, `step-06` review, and `step-08` result (us-385); standard-only interview/exec/verify artifacts stay silent, and unknown or legacy pipeline values keep the standard contract |
| `packageVersion: "unknown"` | Warning | Runtime provenance is unavailable |
| `ENOENT`-family failure adjacent to dispatch-context construction in a transcript | Critical | A path or hybrid installation resolution failed |
| Rejected/unavailable model inside a dispatch record in a transcript | Warning | Dispatch should fall back to the active session model |
| `turn_ended` before handoff | Warning | A host turn may have interrupted execution |
| Telemetry ahead of selected state (`stale-state`) | Critical or warning | The monitor must not report an older step as current without explaining the state-source mismatch |
| State branch/HEAD/worktree differs from active checkout (`context-mismatch`) | Critical or warning | Orchestrator and monitor resolved different local/global roots, or config changed mid-run |
| Local config present but unreadable (`config-unreadable`) | Critical | Report candidate paths; never silently fall back to the global hub |
| Generic dispatch where named projection was expected (`generic-dispatch`) | Warning | Host supports named subagents but dispatch used generic fallback without explanation (embed-inline is healthy when host lacks named-agent binding) |
| Multi-spec queue item failed (`multi-spec-failed-item`) | Warning | A spec within the batch run encountered a terminal failure |
| Multi-spec queue active with no progress (`multi-spec-idle`) | Info | Batch run is active but all queue items are processed or none pending |
| Multi-spec queue row stale vs child/lineage (`stale-parent-row`) | Warning | A non-terminal row never transitioned: the child worker closed, the run is terminal, or a superseding run claims the same slug |
| Multi-spec item advanced without child state (`missing-child-state`) | Warning | An `in_progress`/`shipped`/`failed` queue row has no child machine state (`*.state.json`) under `{plansDir}/{slug}/`; the child run is unobservable/resumable, or the state writer was skipped |
| Terminal-shaped run still active (`terminal-run-active`) | Warning | All steps through the close step are terminal but the state file still reports active with no `endedAt`; reported status is derived terminal |
| Memory vault records active workflow missing on disk (`vault-unreconciled-workflow`) | Info | Memory vault lists an active workflow that does not exist in local plans |
| Transcript contains an unhandled error with a stack trace (`subagent-error`) | Warning | Subagent or worker crashed or threw an unhandled exception |
| Worker session idle while workflow is active (`worker-session-stall`) | Warning | The correlated session shows no recent activity and the state carries no turn-boundary pause marker; possible stall |
| Workflow paused at a turn boundary (`worker-session-paused`) | Info | `state.turnPause` is present: the host turn ended mid-step; awaiting continuation. Replaces `worker-session-stall` while set |
| Workflow active but state/telemetry clock idle beyond the threshold (`stalled-workflow`) | Warning | No correlated session and no state/telemetry progress; possible hang. Suppressed by a turn-boundary pause marker |

## Launcher

```bash
# Snapshot all workflows
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs

# Watch active runs with bounded polling
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --watch --interval 10 --iterations 30

# Watch until the scoped workflow leaves active|blocked|in_progress
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --slug us-example --watch --interval 10 --until-terminal

# Default live watch profile: 60s poll until terminal, follow transcript by
# session id, detect stall/hang, and propose an enriched defect issue
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --slug us-example \
  --watch --interval 60 --until-terminal --follow-transcript \
  --session-id "<session-id>" --agent "<agent-name>" --open-issue \
  --report {plansDir}/us-example/workflow-monitor.report.md

# Filter by slug or workflow ID (supports single-spec and multi-spec batch)
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --slug us-example --json

# Query with memory vault and host transcript auto-discovery
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --vault --discover-host-transcripts

# Observe explicit transcript roots and save report
node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --transcript-root .agents/transcripts --report {plansDir}/us-example/workflow-monitor.report.md
```

Transcript scanning is opt-in. Do not guess host-private transcript paths or read credentials.
