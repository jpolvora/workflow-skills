# PR 349 goal-fix-pr — round 4 (Act round 2 dispatched)

- Observed: activeThreads = 1 (PRRT_kwDOTFajc86j5QsX, score 6, SKILL.md L104 Dispatch-telemetry quoter vs new lite bullet); checks = test pass x2, review **fail** ("PR has 1 unresolved review thread(s)")
- Triage: review fail = **diff-regression** (gate on the new thread; L104 is a line this PR changed). Same defect class as batch 1 (unconditional dispatch wording vs lite carve-out) — a stale quoter batch 1's sweep missed. Not baseline/flake → Act round 2.
- Revision: 2 (second accepted Act round). Blocked reason: empty (reason changed → counter reset).
- Dispatch: FRESH worker via dispatch-agent (never reuse round-1 worker), batch = 1 thread, gate = .agents/plans/us-347/runs/pr-349/plan-gate-r2.md, round = 2. Roles: fixPrPlan→reviewerModel→current(muse-spark); fixPrExec→executionModel→current(muse-spark).
- Worker scope: ws-fix-pr once for PR 349; verify premise (L104 "every batch emits" vs L98 "no internal role telemetry" + lite contract); fix must preserve AC4 phrase locks in test/test-goal-fix-pr-orchestrator-dispatch.js (check what AC4 asserts verbatim before rewording — ADD scoping words, never delete locked sentences); proactive sweep must cover ALL remaining Round-batch dispatch + Subagent-contract bullets for unconditional dispatch/telemetry wording; verify/commit/push/resolve.
