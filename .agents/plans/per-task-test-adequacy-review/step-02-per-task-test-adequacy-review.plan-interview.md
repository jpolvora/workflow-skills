---
slug: per-task-test-adequacy-review
title: Plan interview registry
status: completed
step: 2
workflowId: per-task-test-adequacy-review-20260930T081414Z
startedAt: "2026-09-30T08:14:18.000Z"
shared_understanding: confirmed
blocking_open: 0
rounds: 0
endedAt: "2026-09-30T08:25:35.702Z"
acRefs: []
---
## Interview registry

Interview forced by High-severity MEMORY traps matching touched plan paths (gates.md conditional-interview rule), even though the classifier set `runInterview: false`. autoMode: sweep-miss blocking gaps close as model-inferred; no user-gate emitted.

| id | class | section | gap | recommendation | status | resolutionSource | evidence |
|----|-------|---------|-----|----------------|--------|------------------|----------|
| G1 | blocking | §2 | Adequacy record schema carries a single `ac` field, but one task may cover several ACs; unclear how multi-AC tasks bind | Use `acs: [...]` on the record plus a per-binding `ac`; `link --ac AC1 --ac AC2 --adequacy-file` attaches the same record to each target; helper requires >=1 binding per listed AC | closed | model-inferred | plan_index.cjs maps taskIds per AC (tasks span ACs); no project precedent for multi-AC record shape, shape chosen by judgment |
| G2 | non-blocking | §3 step 1 | Recipe growth (~3.5 KB) must keep the Step 4 dispatch context within budget | Keep the addition tight; measured headroom confirms fit | closed | project | build_dispatch_context.cjs probe: totalBytes 10318 / 32000 with current SKILL; +3.5 KB fits with ~18 KB spare |
| G3 | non-blocking | §6 | Per-boundary invariant disposition stated only as "none touched" | Add one explicit disposition line per boundary (auth, async, DTO, subscription) in the refined plan | closed | assumed-default | No project hit beyond the N/A rationale; wording tightened by default |
| G4 | non-blocking | §3 | §3 implement steps lack an explicit failing-test-baseline line each | Add a red-baseline check line to every implement step in the refined plan | closed | assumed-default | Implement recipe already mandates TDD red-first; plan now states it per step |
| G5 | non-blocking | §2 | `orphansRemoved[].target` allows only AC ids, but AC3 also admits spec negative scenarios as backing requirements | Allow `target: ACn \| NSn`; bindings may cite NS ids for negative-scenario tests | closed | model-inferred | AC3 text names both requirement kinds; no project precedent for the field shape |
| G6 | non-blocking | §2 | Helper repo-root resolution convention unstated | Mirror the `run_sabotage.cjs` HUB header (cwd-local first, packaged, global fallback) | closed | project | .agents/skills/ws-testing/scripts/run_sabotage.cjs:17-45 |
| G7 | non-blocking | §1/§2 | Spec DoR telemetry row needs exact fields and commands named | Plan §2 already names the record schema, the `adequacy:` step-output block, and the `--adequacy-file` verb; no spec change required | closed | project | step-01 §2 schema + §3 step 1; spec telemetry section lists the same channels |
| G8 | non-blocking | §5 | AC4 has only a recipe-prose test (no executable assertion) | Accept: process ACs are asserted via recipe prose by precedent | closed | assumed-default | Precedent: placement/process ACs asserted via contract prose (e.g. fresh-worker AC7 style) |

Scenario probes (soft-deletion, concurrency, list sizing, rate limits): N/A — local CLI validator over files, no datastore, no endpoints, synchronous I/O, no throttled surface. Section 6 audit: all four framework boundaries explicitly dispositioned in the refined plan; no blocking gap.

Spec sync: no closed decision overrides an AC sentence; the spec of record and `step-00` are unchanged, no re-register needed.

`shared_understanding: confirmed` via autoMode fast path (blocking_open == 0 after Resolve; sweep completed for all non-blocking gaps).
