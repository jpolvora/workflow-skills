---
slug: dispatch-prompt-audit-trail
step: 2
status: completed
shared_understanding: confirmed
blocking_open: 0
workflowId: dispatch-prompt-audit-trail-20260930T043902Z
startedAt: "2026-09-30T04:47:53.310Z"
endedAt: "2026-09-30T04:47:53.310Z"
acRefs: []
---
# Plan interview — dispatch-prompt-audit-trail

Audit of `step-01-dispatch-prompt-audit-trail.plan.md` (§0–8) against the spec
(`step-00`), DoR, Section 6 mandate, memory traps, and project evidence. Mode: auto
(best-judgment defaults, no user escalation). `check_memory_conflict.cjs` exited 0
(proceed; no `force_interview`).

Scenario probes applied: crash between markdown/manifest writes (fail-closed order),
concurrent DAG node writes (distinct filenames), tampered prompt bytes (sha gate),
pre-feature in-flight runs (grandfather exemption), oversized builder input
(builder throws before any write), skip-marker spoofing (manifest-only, `skipped`
flag, no markdown).

## Interview registry

| id | class | section | gap | recommendation | status | resolution | resolutionSource | evidence |
|----|-------|---------|-----|----------------|--------|------------|------------------|----------|
| G1 | blocking | §2 | `workflow-state.schema.json` enumerates `stepDispatches[]` items with `additionalProperties: false` — storing `promptPath`/`promptSha256` without a schema edit fails state validation | Extend the schema item properties with the two new optional string keys | closed | Extend `stepDispatches.items.properties` with `promptPath` + `promptSha256` (optional, minLength 1); keep `priorPromptSha256` telemetry-only | project | `.agents/skills/ws-shared/runtime/workflow-state.schema.json:122-138` |
| G2 | blocking | §3 | `npm run test` runs `test/run-tests.cjs`, which enumerates entries from `test/test-suites.json` — a new test file with no entry never runs | Add `["test/test-dispatch-prompt-audit.js"]` to the `local` entries in `test-suites.json` | closed | Add the suites entry in the same change as the test file | project | `test/run-tests.cjs:24` (`SUITES_FILE`), `package.json` scripts `tests` |
| G3 | non-blocking | §3 | New `.cjs` EOL: siblings on disk are CRLF but `.gitattributes` has no `.cjs` rule and `core.autocrlf=true` | Write the new writer script LF (repo-normalized form); patch CRLF siblings via Node replace scripts with explicit `\r\n` anchors | closed | Assumed default: LF for the new file; CRLF-aware patching for `workflow_state.cjs` edits | assumed-default | `.gitattributes` (no `.cjs` rule); memory `2026-09-20-crlf-edits-and-exports` |
| G4 | non-blocking | §2 | DAG node-id shape for the `--node` sanitize rule | Keep sanitize-to-`[A-Za-z0-9_-]` (empty-after-sanitize is a hard error); observed ids are simple (`T1`) so the rule is purely defensive | closed | Keep plan rule unchanged | project | `.agents/skills/ws-plan-to-tasks/SKILL.md:54` (`{"id": "T1", ...}`) |
| G5 | non-blocking | §2 | Lite backfill path needs the same `dispatch`/`finish` flags | No extra code: lite `update_state.cjs` wraps `runUpdateCli` from `workflow_state.cjs`, so the flags exist on both pipelines automatically | closed | No lite script change; lite change is SKILL recipe prose only | project | `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs:40` |
| G6 | non-blocking | §6 | Plan §6 says "no invariants"; config actually has `stack` (node-skills-package, layers skills-sot/bin/tests) and `invariants.commitPlanFilesOnlyAtStep8: true` | Cite the operative invariant + layers in refined §6; stack rule packs remain N/A (consumer-app packs only) | closed | Refined §6 cites config stack/invariants; verification checklist unchanged | project | `.ws/config.json` `stack` + `invariants`; `.agents/skills/ws-shared/runtime/stacks/` (4 consumer packs) |
| G7 | non-blocking | §2 | Where does `priorPromptSha256` live — `stepDispatches` entry, telemetry event, or both? | Telemetry event + writer manifest only; the entry keeps the latest pair (single-latest semantics match the existing replace-by-step) | closed | Model default: prior sha on telemetry event and manifest `priorPromptSha256`; entry keeps latest | model-inferred | Existing replace-by-step at `workflow_state.cjs:1720` keeps latest-only |
| G8 | non-blocking | §2 | AC6 names Replay/Refine/Previous verbs — no such substeps exist in `workflow_state.cjs` | Re-dispatch = second `dispatch` to the same step (existing replace path); prior sha preserved by the G7 rule; no new substep vocabulary | closed | No new substep; recipe prose uses "re-dispatch" generically | project | `workflow_state.cjs` substep set (`scoreAndRefine`, `reviewFix`, `fixPrPlan`, `fixPrExec` only) |
| G9 | non-blocking | §5 | AC3 "budget exceed fails before write" test needs a deterministic oversized builder input | Drive `build_dispatch_context.cjs` with a stub skill whose `## Subagent contract` exceeds the budget (temp fixture skill dir), assert non-zero exit + zero pair files | closed | Test builds a temp skill fixture with an over-budget contract section | model-inferred | Builder budget throw at `build_dispatch_context.cjs:243`; `resolveSkillMdPath` fixture pattern from existing dispatch-context tests |

## Confirmation

`shared_understanding: confirmed` (autoMode resolve-all; `blocking_open: 0`). No AC
sentence overrides — no spec sync required. Refined plan:
`step-02-dispatch-prompt-audit-trail.plan.refined.md`.
