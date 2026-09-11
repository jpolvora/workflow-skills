---
slug: us-310
title: Plan interview — Accumulate repeated file-list flags in parseArgs
status: completed
step: 2
workflowId: us-310-20260911T041227Z
startedAt: "2026-09-11T04:12:27.000Z"
endedAt: "2026-09-11T04:15:30.000Z"
acRefs: []
---
## Interview registry

autoMode: all gaps resolved via project-context sweep or defaults; zero user escalations. `shared_understanding: confirmed` (orch auto-confirm "End refinement and advance").

| id | class | section | gap | recommendation | status | resolutionSource | evidence |
|----|-------|---------|-----|----------------|--------|------------------|----------|
| G1 | design | §2 | Array vs pre-joined comma string for accumulation representation | Keep array of raw values; `listArg` recurses arrays via `flatMap` and splits commas, so mixed forms compose with zero normalizer change | closed | project | `workflow_state.cjs` `listArg` L553–559: `Array.isArray` branch + comma split + backslash normalization |
| G2 | design | §2 | Allowlist key form: camelCase `created` vs raw `--created` | Match post-normalization camelCase keys (`created`/`modified`/`deleted`) since `parseArgs` camelCases before assignment; also covers `--dry-run`-style normalization path uniformly | closed | project | `parseArgs` L615: `token.slice(2).replace(/-([a-z])/g…)`; file-list flags have no dashes so keys are stable |
| G3 | design | §2 | Single-use shape: must a lone `--modified a` stay a string (not `[a]`)? | Yes — store raw value when key undefined; only convert on second occurrence. Keeps `options.modified !== undefined` precedence checks and any string-shape consumers identical | closed | project | `normalizeFilesTouched` L573–589: `options.* !== undefined` branches; `listArg` accepts both shapes |
| G4 | test | §5/T7 | Scalar last-wins proof: unit-level, CLI-level, or both? | Both: unit `parseArgs` repeat assertions (step/model) + one CLI-level `finish` with a repeated scalar-shaped flag showing no accumulation leak | closed | assumed-default | AC7 demands "no other parseArgs consumer changes observable behavior"; spec NS5 names `--step` twice |
| G5 | test | §3.5 | Exact `run_sabotage.py` invocation for this fix | `--test "node test/test-repeated-file-list-flags.js" --paths .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs --invert-patch <generated>`; clean non-allowlisted `.runtime` residue before `validate_state` | closed | project | `.agents/skills/ws-testing/scripts/run_sabotage.py` usage header; MEMORY `[2026-09-03] Sabotage leftover .runtime files fail validate_state` |
| G6 | release | §2.4 | Bump + integrity ordering for managed-runtime change | All edits → `npm run build-site:bump` (0.4.15→0.4.16) → `generate-integrity` → `verify-integrity` → full tests; commit `bin/skill-integrity.json` with content | closed | project | `CATALOG.md` Before-ship rows 2,3,7 (+row 7 detail: integrity hashes `ws-shared/runtime/`); MEMORY integrity-regen traps |
| G7 | invariants | §6 | Skill rule: blocking gap if touched boundaries lack invariant checks | Covered — §6 names closed-allowlist boundary validation, sync-only async safety, unchanged normalization/containment, plus commands | closed | project | Plan §6 + `{sharedDir}/runtime/stacks/typescript-node.md` rules 2–5 |
| G8 | process | §7 | Concurrent-worker isolation (us-311 files, dirty CHANGELOG/index) | G2-code stages only this workflow `files_touched` minus `{plansDir}`/`preExistingDirty`; never stage/commit the foreign files | closed | project | MEMORY `[2026-09-02] G2-code must stage only this slug files_touched` + worker preExistingDirty list |
| G9 | process | §3 | Red-before/green-after should be explicit TDD order, not "if needed" | Reorder: write tests → run red (T1–T3,T5 fail pre-fix) → implement → run green | closed | assumed-default | Spec NS1–NS3 define red-before expectations; TDD order makes the evidence mechanical |

`blocking_open: 0`. Failing-test baseline present (T1–T3,T5 red-before). Section 6 verification plan mandated and present.

## step-output

```yaml
status: success
refine:
  round: 0
  blocking_open: 0
  shared_understanding: confirmed
```
