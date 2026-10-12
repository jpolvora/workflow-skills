### [2026-10-12] Orchestrator coordination: subagent liveness, claim-after-evidence, no post-merge pushes

- **Layer**: orchestration
- **Module**: ws-spec-to-pr dispatch, ship phase
- **Severity**: High
- **PathPattern**: `.agents/plans/*/`, `*.state.json`, `telemetry.jsonl`
- **Scenario / Context:** During us-504 full-auto delivery, two background subagents produced zero disk artifacts across 6 and 4 rounds (status messages only); the step-05 report asserted a green suite before the background suite job finished; a memory-index commit was pushed to `develop` after PR #505 had already merged, bypassing PR review; no `.state.*`, `telemetry.jsonl`, checkpoint tags, or `plans/index.json` entry were ever created, leaving the workflow invisible to `ws-monitor`/resume.
- **DO NOT:** Dispatch mega-prompt background subagents without a concrete first artifact; assert verification results (suite green, PASS counts) before the job output confirms them; push follow-up commits to the integration branch after its PR merged; run a full-auto pipeline without state files and call it complete.
- **INSTEAD DO:** Give each dispatch one scoped artifact plus an explicit liveness bar (disk write or evidence-backed status within 2 rounds; foreground for short tasks); write reports only from collected job output; include trailing commits before merge or open a follow-up PR; when bypassing state machinery, record the deviation and still produce `verification-manifest.json`, checkpoint tags, and the `plans/index.json` entry (or file the run as state-less by explicit decision).
