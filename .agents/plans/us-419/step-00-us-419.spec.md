---
id: 419
slug: us-419
title: "Observer-log follow-ups (us-412-413 run): intra-root enumeration edge, missing agentTranscripts marker, G2 plans-index hash staleness, compactOutputs no-op"
source: github
specDate: 2026-09-24
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/419"
step: 0
workflowId: us-419
status: completed
startedAt: "2026-09-24T18:21:10.785Z"
endedAt: "2026-09-24T18:21:10.785Z"
acRefs: []
---
# Specification — Observer-log follow-ups (us-412-413 run): intra-root enumeration edge, missing agentTranscripts marker, G2 plans-index hash staleness, compactOutputs no-op

## Description

Close the four actionable residual findings from the five read-only observation windows of the standard `ws-spec-to-pr` run `us-412-413-liveness-checkpoints-20260924T043148Z` (the run that shipped liveness checkpoint/pause work in PR #417, closing #413). All four are small, file-local defects in the monitor/observer/state toolchain, each with a named fix direction and a named regression test:

1. `ws-monitor` intra-root transcript enumeration can skip a path-correlated session that sorts after the name-sorted per-root slice (`monitor_snapshot.cjs`).
2. No pipeline step ever writes the sanctioned `agentTranscripts` state marker, so the monitor always falls back to host discovery (`observer.cjs` writer exists but is never invoked).
3. G2 delivery commits and baseline refreshes leave `{plansDir}/index.json` `stateSha256` stale until the next state write (`commit_g2_code.cjs`, `refresh_baseline.cjs`).
4. The `compactOutputs` state section never updates after first write because its heading regex treats the literal heading as a capture group (`workflow_state.cjs`).

Two low-priority hygiene items (test-sandbox EOL stat dirtiness, rounded gate-history timestamps) ship only if cheap. Everything else in the observer logs was adjudicated as pre-fix behavior already fixed by PR #417 or as honest/by-design, and is recorded under Adjudicated so the logs are fully accounted for.

## Acceptance Criteria

- AC1: `monitor_snapshot.cjs` collects path-correlated transcript candidates beyond the name-sorted per-root slice (correlate on the path during enumeration, bounded), then fills the slice with name-sorted others; `capped` stays honest when the bound truncates. New eval fixture (merged root, correlated target sorts last) proves `filesScanned >= 1` when the correlated file exists.
- AC2: A dispatched run carries an `agentTranscripts` marker — available paths when the host session path is known, otherwise the explicit absent marker with a valid reason (`discovery-disabled` | `no-matching-session` | `scan-capped`) — recorded at dispatch time, or the dispatch contract documents the exact manual call site. New coverage asserts a dispatched run carries a marker.
- AC3: `commit_g2_code.cjs` and `refresh_baseline.cjs` call `refreshPlansIndexForState` immediately after `syncStateDualWrite`, so `{plansDir}/index.json` `stateSha256` matches the state right after a G2 commit, before any subsequent state write. New regression asserts the hash match in that window.
- AC4: `workflow_state.cjs` `compactOutputs` handling matches the literal `## Step outputs (compact)` heading (escaped regex or `indexOf`/slice), so a second `finish` updates the section. New unit assertion proves a second `finish` updates the section.
- AC5: (low, fix-if-cheap) `test/test-install.js` fixture writes leave `git status` clean (LF-stable writes or a `.gitattributes` rule for `test/.ws/**`).
- AC6: (low, fix-if-cheap) gate-history entries record exact write-time timestamps instead of rounded/estimated values.
- AC7: No behavior change to the adjudicated classes (discovery starvation honesty, stall-gate unavailability, checkpoint/pause behavior from PR #417, shared correlation window, `scan-capped` vocabulary); existing monitor/observer fixtures still pass.

## Original Issue Context

## Context

Consolidated follow-up from the five read-only observation windows of the standard `ws-spec-to-pr` run `us-412-413-liveness-checkpoints-20260924T043148Z` (the run that shipped the liveness checkpoint/pause work in PR #417, closes #413). Evidence: `{plansDir}/us-412-413-liveness-checkpoints/observer/window-{1..5}-report.md` plus the `monitor-*.json` snapshots and `observer.log`.

Most logged findings were either the pre-fix behavior that PR #417 fixed (#412/#413 classes) or were adjudicated as honest/by-design; those are listed under **Adjudicated — no action** so the logs are fully accounted for. The items below are the ones still actionable at HEAD `3ea19198`.

All evidence is sanitized: no consumer names, host paths, session ids, or transcript content.

## Findings to fix

### 1. Intra-root transcript enumeration can skip a path-correlated session (severity: medium; #412-class residual)

- Where: `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` — `listTranscriptCandidates` (L1138-L1162) stops enumeration at `slice + 1` **name-sorted** candidates before any correlation runs; `scanTranscriptRoots` (L1179-L1195) can only reorder candidates that were already enumerated (correlated-first at L1188-L1192).
- Failure: a path-correlated file that sorts after the name-sorted slice inside one large/merged root is never collected, even though path correlation could have ranked it first. Result is the honest-degradation signature `filesScanned: 0` + `capped: true`.
- Evidence: window-4 W4-F3 and window-5 W5-F4 / review CR-001. Live repro: a 301-file merged root with the target sorting last yields `filesScanned: 0` / `scan-capped`; with 61 flood roots the same target yields `0` when last vs `1` when first. Carry-over Suggestion `intra-root-enumeration-stop` (AC11) from the run's step-5 report; the binding fixtures (M1/M9) are root-centric and pass, so this is a reachability edge, not a false `available`.
- Fix direction: correlate on the path during enumeration (`correlationMatches(fullPath, key)` is already path-capable, L275-L280) and collect path-correlated candidates eagerly under a hard bound, then fill the per-root slice with name-sorted others; keep `capped` honest when the bound truncates. Add an eval fixture (merged root, target sorts last) proving `filesScanned >= 1` when the correlated file exists.

### 2. State-recorded transcript marker is never written by the pipeline (severity: medium; #412-adjacent)

- Contract: `{skillsRoot}/ws-shared/runtime/observer-instructions.md` — state files record available transcript paths when known and carry the explicit absent marker otherwise; `ws-monitor` prefers `state.agentTranscripts` before host-store discovery.
- Reality: the sanctioned writer exists (`observer.cjs record --state <state> --paths a,b | --reason <discovery-disabled|no-matching-session|scan-capped>`, L455-L467, backed by `recordAgentTranscripts` L175-L181), but no orchestrator/dispatch step invokes it. Every observed poll had `agentTranscripts: null`, so the monitor depended solely on opt-in host discovery, which resolved nothing in this environment.
- Evidence: window-1 F4, window-2 F5, window-3 F4, window-4 W4-F5; `observer.cjs watch` emitted `info/transcript-absent` on every invocation; monitor reported `stateAgentTranscripts: null` / empty.
- Fix direction: record the marker at dispatch time — available paths when the host session path is known, otherwise the explicit absent marker with a valid reason — or, if the marker is intended to be manual, document the exact call site in the dispatch contract. Add coverage that a dispatched run carries a marker.

### 3. Plans-index `stateSha256` goes stale after G2 commit / baseline refresh (severity: medium)

- Where: `.agents/skills/ws-spec-to-pr/scripts/commit_g2_code.cjs` L125 and `refresh_baseline.cjs` L171 call `syncStateDualWrite` without `refreshPlansIndexForState` (imported only as `syncStateDualWrite` in both). The coordinator (L534-L535, L641-L642, L902-L904) and `observer.cjs persistObserverMutation` (L165-L168) do refresh the index.
- Failure: after a G2 delivery commit, `{plansDir}/index.json` `stateSha256` no longer matches the state until the next state write; `validate_state.cjs --pre-advance N` can report a mismatch in that window. Observed live after the 06:42:26Z commit and self-healed at the 06:43:12Z dispatch.
- Evidence: window-5 W5-F5 / review IN-001.
- Fix direction: call `refreshPlansIndexForState(context, state, { stateFile })` immediately after `syncStateDualWrite` in both scripts (`context` is already resolved in `commit_g2_code.cjs`; `refresh_baseline.cjs` needs the import and can resolve context from its existing `repoRoot`). Add a regression asserting the plans-index hash matches right after a G2 commit, before any subsequent state write.

### 4. `compactOutputs` heading regex is a no-op (severity: low; pre-existing)

- Where: `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` L1041-L1052. L1045 builds `new RegExp("(" + heading + "\\n\\n)...")` from the raw heading `## Step outputs (compact)`; the parentheses become a capture group, so the pattern can never match the literal heading text.
- Failure: once the section exists, every `finish` leaves it frozen (observed live: only `- Step 0: pending` after steps 0-5). `build_dispatch_context.cjs` reads that section, though JSON `state.handoffs` remains the primary source.
- Evidence: window-5 W5-F6 / review IN-002.
- Fix direction: escape the heading (`heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) or locate the section with `indexOf`/slice; add a unit assertion that a second `finish` updates the section.

### 5. Lower-priority observations (fix if cheap)

- **Test-sandbox stat-only dirtiness** (window-4 W4-F4): `test/test-install.js` rewrites `test/.ws/*` fixtures (L700/L818) and leaves ` M` entries with identical HEAD/index/worktree blob hashes (EOL-only). Content-identical, but a persistent dirty line can confuse cleanliness gates (pre-ship board, `git status`-based checks). Consider LF-stable fixture writes or a `.gitattributes` rule for `test/.ws/**`.
- **Gate-history timestamps are rounded/estimated** (window-4 W4-F6): e.g. `step-4-finish` gate `06:10:00Z` while the state file mtime is `06:08:15Z`, and `integrity-regen` `06:12:00Z`. Low impact, but it misleads timeline reconstruction. Consider writing exact write-time timestamps.

## Adjudicated — no action (accounted for)

- **Discovery starvation** (windows 1-3 F1): later explained as environment absence — an unbounded probe over the same 61 roots found zero files containing this workflow's id/slug, so `filesScanned: 0` + `capped: true` is honest truncation (window-4 W4-F2, window-5 W5-F3). No correlated session existed to find.
- **Stall gate unreachable while `transcriptSource` is unavailable** (windows 1-3 F2): by design — `worker-session-stall` requires an available correlated session; the fix landed in PR #417.
- **State/telemetry frozen with an active step** (windows 1-5 F3/W4-F1/W5-F1): #413, fixed by PR #417 (checkpoint / pause-turn ops). The logs retain the recurrence evidence.
- **Scan-vs-resolve correlation-window mismatch** (window-1 F5, window-2 F6): fixed by PR #417 (one shared sanitized window, AC12/AC13).
- **`scan-capped` reason semantics edge** (window-3 F5): adjudicated not a defect in the run's step-5 report (honest truncation vocabulary when no correlated session exists).
- **Info-only noise**: 18x `info/vault-unreconciled-workflow` per poll (stale vault records, unrelated), `observer.log` overwrite per invocation (by design), one transient `elapsedMs` spike (not reproduced), deferred release bump (applied in PR #417 as 0.4.66).

## Fix checklist

- [ ] 1. `monitor_snapshot.cjs` — collect path-correlated candidates beyond the name-sorted per-root slice; eval fixture for target-sorts-last.
- [ ] 2. Record `agentTranscripts` marker at dispatch (or document the exact call site); coverage that a dispatched run carries a marker.
- [ ] 3. `commit_g2_code.cjs` + `refresh_baseline.cjs` — `refreshPlansIndexForState` after `syncStateDualWrite`; regression for the index hash.
- [ ] 4. `workflow_state.cjs compactOutputs` — escape the heading regex; unit assertion for a second `finish`.
- [ ] 5. (low) test-sandbox EOL stat-dirtiness; (low) exact gate-history timestamps.

## Related

- #412 (open) — transcript discovery/correlation class. Item 1 is a residual edge of this class and item 2 is its state-marker fallback; this issue can be folded into #412 if maintainers prefer.
- #413 — closed by PR #417.
- #414, #415, #416, #418 — other observer-log issues from adjacent runs.

## Scope

- [x] No product fix was applied by the reporter
- [x] No managed consumer skill copy was patched
- [x] All private data was removed (counts and repo-relative paths only)

### Prior Work Sweep

Provider `sweep-prior-work` (`--issue 419`, keywords observer-log / monitor / transcript / plans-index / compactOutputs): no exact open PR for issue 419. One text hit (PR #184, release 0.3.0) matched the `#419` search token only and is unrelated. Keyword-adjacent open issues #412, #414, #415, #416, #418 are tracked as combined specs `0125-us-412-413-liveness-checkpoints`, `0126-us-415-416-script-ux-golden-path`, `0127-us-414-run-state-integrity`, `0128-us-412-418-monitor-accuracy`; this spec covers only the residual items listed above, so duplicate risk is limited to the explicit #412 fold-in note. Record and continue.

### Design Intent

Modification tasks in long-lived scripts, so history was inspected before treating each gap as a bug: `git log -S "compactOutputs" -- workflow_state.cjs` shows only a docs/config reference commit, i.e. no intentional-constraint commit for the heading-regex behavior — the capture-group pattern reads as an accidental gap, not a designed limitation. Items 1–3 likewise match no documented design (per-issue evidence: correlated-first reorder exists but cannot see beyond the enumerated slice; the `record` writer exists but has no pipeline call site; index refresh exists in sibling call sites but not the two G2 scripts). Greenfield skip does not apply (all four touch existing files). Proceed as bugfix.

## Notes

- Line numbers cited from the issue were observed at HEAD `3ea19198`; re-verify against the current tree at implementation time and update the spec if they drifted.
- Stack is the Node 22 skill package (no web framework); no stack rule pack applies, so DoR carries no framework invariants beyond script-contract safety.
- Whether to fold this issue into #412 is a maintainer tracking decision, not an implementation fork; no `context.md` companion.
- MEMORY lookup (`.ws/MEMORY.md`) and stack file (`.ws/STACK.md`) returned no applicable traps for these paths.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Adjudicated log classes (discovery starvation, stall-gate unavailability, checkpoint/pause behavior, shared correlation window, `scan-capped` vocabulary) | Already fixed by PR #417 or honest/by-design; AC7 pins no-regression only |
| `observer.log` overwrite-per-invocation, `info/vault-unreconciled-workflow` noise, transient `elapsedMs` spike | By design / unrelated / not reproduced |
| Rewriting monitor discovery bounds or transcript correlation windows | Owned by #412-class specs (`0125`, `0128`); this spec only adds the intra-root reachability edge |
| Release version bump | Applied separately per repo ship process, not part of this fix |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Cited line numbers may have drifted since HEAD `3ea19198` | Re-verify at implementation; update spec if drifted | Two weeks of `develop` churn separate the observation from the fix | n |
| Observer window reports and monitor snapshots under `{plansDir}/us-412-413-liveness-checkpoints/observer/` are available as evidence | Read them during implementation | The issue text references them as the evidence base | n |
| Low-priority items 5 ship only if cheap | Implement AC5/AC6 only when the fix is under ~30 minutes each, else defer with a note | Explicit "fix if cheap" in the issue | y |
| Auth boundaries, idempotency, concurrency, TTL, and external-dependency dimensions | `N/A because` all changes are local deterministic script edits with no network, auth, or shared-state surface | Implicit-requirement dimensions with no applicable surface collapse to this row | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Changes limited to `monitor_snapshot.cjs`, dispatch/`observer.cjs` marker call site, `commit_g2_code.cjs`, `refresh_baseline.cjs`, `workflow_state.cjs`, plus fixtures/tests | `git diff --stat` shows only those areas |
| Atomic criteria | AC1–AC4 each map to one file-local fix plus its named regression; AC5/AC6 are optional cheap items | Each AC has a red-then-green test listed under Negative scenarios |
| Failure modes | Each fix states its truncation/fallback behavior (`capped` honesty, absent-marker reasons, hash-match window, frozen-section read path) | Review the four fix diffs for preserved fallback semantics |
| Observation telemetry | Named signals exist for every AC (eval fixture counts, marker presence, hash compare, section content, `git status`, gate timestamps) | Run the Telemetry commands below |
| Zero open blockers | No open questions above block AC1–AC4; line-number drift is handled by re-verification | Confirm Assumptions table has no blocking `n` row for AC1–AC4 |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Eval fixture: merged-root transcript root with the correlated target sorting last → `filesScanned >= 1` (AC1).
- Dispatched run state file carries `agentTranscripts` paths or an explicit absent `reason` (AC2); `observer.cjs watch` no longer emits bare `info/transcript-absent` for a marked run.
- `node .agents/skills/ws-spec-to-pr/scripts/validate_state.cjs --pre-advance N` reports no index mismatch immediately after a G2 commit (AC3).
- State `## Step outputs (compact)` section content changes across two consecutive `finish` calls (AC4).
- `git status --porcelain` clean after `test/test-install.js` fixture pass (AC5).

### Negative & Failing Test Scenarios

- Red: merged root with the correlated target sorting last yields `filesScanned: 0` + `scan-capped` (pre-AC1 behavior).
- Red: a freshly dispatched run has `agentTranscripts: null` with no absent-marker reason (pre-AC2 behavior).
- Red: `{plansDir}/index.json` `stateSha256` mismatches the state file immediately after a G2 delivery commit (pre-AC3 behavior).
- Red: a second `finish` leaves `## Step outputs (compact)` frozen at `- Step 0: pending` (pre-AC4 behavior).
- Red: `validate_spec.cjs --mode=authoring` fails while any closure table or DoR row is placeholder-only.
