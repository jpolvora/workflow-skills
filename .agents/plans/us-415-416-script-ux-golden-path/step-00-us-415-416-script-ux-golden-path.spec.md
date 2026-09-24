---
id: 416
slug: us-415-416-script-ux-golden-path
title: "Workflow script UX and golden-path state commands: discoverable help, score diagnostics, boundary errors, exit codes, per-gate commands, tamper-evidence"
source: github
specDate: 2026-09-24
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/416"
step: 0
workflowId: us-415-416-script-ux-golden-path
status: completed
startedAt: "2026-09-24T12:44:25.967Z"
endedAt: "2026-09-24T12:44:25.967Z"
acRefs: []
---
# Specification — Workflow script UX and golden-path state commands

## Description

This specification consolidates two complementary upstream defect reports about the same root cause: the sanctioned path for driving workflow state is invisible, so agents under time pressure hand-edit machine state instead of using it. It fixes the existing harness behaviors they expose. Implement this group **first** of the three consolidated groups: everything downstream (run-state integrity, monitor accuracy) depends on agents using correct, documented commands.

- **Tool layer (#415):** four `ws-spec-to-pr` script UX defects — generic-only `--help`, opaque `score` aggregates, boundary-mismatch errors that omit the expected boundary, and `finish` exiting non-zero while reporting success.
- **Skill-text layer (#416):** no per-gate golden-path commands in `STEP-DISPATCH`/`gates.md`, and no tamper-evidence on `.state.*` / `ac-ledger.json`, so hand-edits that happen to be self-consistent sail through silently.

Verified live against the current tree on 2026-09-24 (all claims still reproduce; nothing outdated): `ac_ledger.cjs` prints a single generic `Usage:` line; `verify(options, context, false)` vs `score` → `true` is only visible at the dispatch table (`ac_ledger.cjs:558-559`); `scoreState` persist lives at `ac_ledger.cjs:394-396`; the phantom-file `NOTICE` lives in `ws-shared/runtime/scripts/workflow_state.cjs:747`; no `tamper`/`hand-edit` wording exists in `ws-spec-to-pr` skill text or `gates.md`.

## Acceptance Criteria

- AC1: `node .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs <subcommand> --help` documents that subcommand's required and optional flags with one example, for every subcommand (`init`, `link`, `sync-plan-index`, `verify`, `score`, `report`); the generic usage line alone no longer satisfies this AC.
- AC2: `node .agents/skills/ws-spec-to-pr/scripts/update_state.cjs <subcommand> --help` documents that subcommand's flags with one example, for every subcommand (`dispatch`, `finish`, `finish-batch`, `bypass`), including `--modified` / `--created` / `--deleted` / `--noop` on `finish`.
- AC3: `ac_ledger` help states that `--ledger` plus a positional boundary (`score <boundary>`) is required, that `score` persists `scoreState` while `verify` is a dry run, and documents the `link` evidence-linking flags (`--ledger --event-id --ac/--negative/--gap/--plan-index/--commit`, task/test backfill).
- AC4: `score` / `verify` output lists per-row deficiencies (missing `sha256` in `files[]` entries, unmapped `tests[]`, missing `tasks`/`planSections`, `knownDefect` cap at 8) instead of only the aggregate `missingEvidence` / `earnedUnits` numbers.
- AC5: `validate_state --pre-advance N` failures name the expected boundary label (`step5` vs `pre-step6` vs `ship`) and, when cheap to compute, the differing fields.
- AC6: `finish` with phantom `filesTouched` paths is unambiguous: either it fails without applying, or it applies and exits 0. An `ok: true` payload with an incremented revision must never accompany a non-zero exit.
- AC7: `ws-spec-to-pr` / `ws-spec-to-pr-lite` `STEP-DISPATCH` (or `gates.md`) prints the exact copy-paste commands at each gate boundary (e.g. pre-advance 6: `link --ledger ... --commit sha=<sha>,step=4`, then `score pre-step6`, then `finish --step 4/5`).
- AC8: A fresh agent completing a green slice reaches every gate using only documented commands, with zero hand-edits to `.state.*` or `ac-ledger.json`.
- AC9: Any future hand-edit to `.state.*` / `ac-ledger.json` (`scoreState`, `commits[]`) either fails closed with a message naming the supported command, or is explicitly documented as supported; at minimum, skill text states hand-editing these files is unsupported.
- AC10: Existing suites (`npm run test`, `ws-check-harness`) stay green; new unit coverage pins the exit-code contract (AC6) and the boundary-label error content (AC5).

## Original Issue Context

### Prior Work Sweep

- Exact open PR for the same tracker ids: none (`gh pr list --state open --search {415,416}` empty on 2026-09-24) — no stop/reuse gate; proceed.
- Related hits recorded, continue: `link --ledger` is mentioned in `ws-spec-to-pr/STEP-DISPATCH.md` (but not as per-gate copy-paste commands); `scoreState` persist confirmed at `ac_ledger.cjs:394-396`; phantom-file `NOTICE` confirmed at `ws-shared/runtime/scripts/workflow_state.cjs:747`; `verify` dry-run vs `score` persist confirmed at `ac_ledger.cjs:558-559`.

### Issue #415 (verbatim)

## Problem

During a full `ws-spec-to-pr` run (Steps 0ΓÇô9, all gates passed, slice shipped), four workflow-script UX defects cost real debugging time. Each was verified against the script source; none is a misread. Common thread: the CLIs are undiscoverable and their diagnostics are opaque.

## 1. Subcommand `--help` prints only the generic usage line

`ac_ledger.cjs verify --help`, `score --help`, and `update_state.cjs finish --help` all print just:

```
Usage: ac_ledger.cjs init|link|sync-plan-index|verify|score|report [options]
Usage: update_state.cjs dispatch|finish|finish-batch|bypass <state> --step N [options]
```

Undiscoverable essentials, all learned by reading source:

- `ac_ledger` requires `--ledger` plus a positional boundary (`score <boundary>`), and `score` **persists** `scoreState` while `verify` is dry-run (`verify(options, context, false)` vs `score` ΓåÆ `true`; only visible at the dispatch table).
- `ac_ledger link` (the sanctioned evidence-linking path: `--ledger --event-id --ac/--negative/--gap/--plan-index`, plus task/test backfill from the plan index) is never mentioned, so agents hand-edit `ac-ledger.json` instead.
- `update_state finish` accepts `--modified/--created/--deleted` (and `--noop`, shown once in an example) ΓÇö required, since finishing a mutating step without `filesTouched` fails closed.

Ask: per-command help listing required/optional flags and one example per subcommand.

## 2. `score` gives no per-row deficiency detail

A fully-implemented slice scored **3/10** with only `missingEvidence: true` / `earnedUnits: 112/290`. Learning why required reading `scoreLedger`:

- `files[]` must be `{path, lineStart, lineEnd, sha256}` objects (plain path strings earn nothing),
- `tests[]` need `{name, sourceFile}` with the name literally present in the file,
- rows need `tasks` or `planSections`,
- every negative scenario needs an observed passing test or `knownDefect` caps the score at 8.

Ask: `score`/`verify` should list per-row deficiencies (e.g. `AC5: files[0] missing sha256; no mapped tests; no tasks`) instead of a bare aggregate.

## 3. Boundary-mismatch error omits the expected boundary

`validate_state --pre-advance N` fails with e.g. `ledger scoreState must match derived pre-step6 score` without stating which boundary label it expects (`step5` vs `pre-step6` vs `ship`). The label had to be flipped once per gate by trial. Ask: include the expected boundary (and, when cheap, the differing fields) in the error.

## 4. `finish` exits 1 on phantom-file NOTICE while reporting success

Passing a wrong filename in `--modified` prints `NOTICE: dropped N phantom...`, returns an `ok: true` payload with an incremented revision ΓÇö and exits non-zero. Either the finish should fail without applying, or the notice should stay exit-0. Current state reads as both success and failure.

## Acceptance

- Every subcommand help documents its flags with an example.
- A fresh agent scoring a green slice reaches the documented rubric without opening script source.
- Boundary and phantom diagnostics are unambiguous on first read.

### Issue #416 (verbatim)

## Problem

Related to #415 (undiscoverable flags, opaque diagnostics), but a different failure mode: when the sanctioned path is invisible, agents under time pressure **hand-edit machine state** instead of using it ΓÇö bypassing the very fail-closed validation the workflow depends on. This run did all of the following by hand via throwaway scripts:

- Wrote `.state.json` / `.state.md` directly (hit frontmatter/hash mismatch; recovered through `finish-batch`).
- Set AC statuses, file refs, test refs, tasks, and `commits[]` in `ac-ledger.json` with custom scripts.
- Flipped `scoreState.boundary` by hand three times (`step5` ΓåÆ `pre-step6` ΓåÆ `step5` ΓåÆ `ship`).

Every one of these had a sanctioned path that was only discovered afterwards by reading script source: `update_state` for all state transitions; `ac_ledger link --ledger --event-id --ac/--negative/--gap/--plan-index/--commit` (accepts `sha`+`step` commit entries); `ac_ledger score <boundary>` persists `scoreState` (`score` ΓåÆ `verify(..., true)`). The gates caught the resulting inconsistencies (hash mismatches, boundary mismatches) ΓÇö but only after wasted cycles, and hand-edits that happen to be self-consistent would sail through silently.

## Proposal

1. **Golden path per gate, in the skill text.** `ws-spec-to-pr` / `ws-spec-to-pr-lite` STEP-DISPATCH (or `gates.md`) should print the exact commands at each boundary, e.g. pre-advance 6: `link --ledger ΓÇª --commit sha=<sha>,step=4 ΓÇª`, then `score pre-step6`, then `finish --step 4/5`. No agent should have to derive this from script source.
2. **Tamper-evidence on machine state.** `validate_state` already hash-checks linked files; extend the same suspicion to the ledger/state themselves ΓÇö e.g. warn (or fail) when `scoreState` was written by anything other than `score`, or when `commits[]` entries lack a corresponding `link --commit` event. At minimum, document that hand-editing these files is unsupported.
3. **Consider one composed command** (`advance --to <step>` running link-commit ΓåÆ score-persist ΓåÆ finish in the supported order) so the easy path and the correct path are the same path.

## Acceptance

- A fresh agent completing a green slice reaches every gate using only documented commands, with zero hand-edits to `.state.*` or `ac-ledger.json`.
- Any future hand-edit to those files either fails closed with a message naming the supported command, or is explicitly covered as supported.

## Notes

### Design Intent

All four #415 defects and the #416 observations were verified against current script source (not misreads): single generic `Usage:` line, dispatch-table-only persist semantics, `NOTICE` + `ok: true` + non-zero exit shape, absent tamper wording. No intentional-constraint evidence found; treat as accidental gaps. The implementer must still run `git log -p -S "<symbol>"` on touched functions before changing behavior and record intent vs accident per finding.

### Deferred idea (not in scope)

#416 proposes a composed `advance --to <step>` command (link-commit → score-persist → finish in order). This spec ships docs-only golden path + tamper-evidence; the composed command is deferred until a follow-up issue asks for it.

### Implementation order

Group 1 of 3 (implement first). Followed by Group 2 (`us-414-run-state-integrity`: fail-closed preset resolution, ship writeback, Step 9 artifacts) and Group 3 (`us-412-418-monitor-accuracy`: monitor expectation model, transcript correlation).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Composed `advance --to <step>` command | Deferred by design (see Notes); docs-only golden path ships first. |
| Run-state integrity fixes | Group 2 (`us-414-run-state-integrity`) owns preset resolution, ship writeback, Step 9 artifacts. |
| Monitor accuracy fixes | Group 3 (`us-412-418-monitor-accuracy`) owns expectation model and transcript correlation. |
| Scoring rubric weight changes | Only deficiency reporting changes (AC4); earned-unit weights stay as-is. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Help surface | Plain-text stdout `--help` per subcommand | The ask is agent-facing terminal output; no man pages or docs-site changes | y |
| `finish` phantom semantics | Implementer chooses fail-without-applying or apply-with-exit-0 | The issue allows either; the contract is unambiguous exit state | y |
| Boundary label vocabulary | `step5`, `pre-step6`, `ship` as used by current gates | Matches existing `scoreState.boundary` values agents already flip | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | `ac_ledger.cjs`, `update_state.cjs`, `validate_state.cjs`, `workflow_state.cjs` NOTICE path, `STEP-DISPATCH.md` (standard + lite), `gates.md` | Plan maps each AC to a file |
| Atomic criteria | Every AC is a single pass/fail statement | `validate_spec.cjs --mode=authoring` exits 0 |
| Failure modes | Negative scenarios enumerate expected red tests | Test run before fix (expected red) |
| Observation telemetry | Help/diagnostics exercised via CLI stdout assertions; fresh-agent walkthrough for AC8 | CLI tests + manual walkthrough |
| No open blockers | Both issues reproduced with code citations; no open PR owns them | Prior Work Sweep and code citations above |
| Stack invariants | Node-only skill scripts; no tokens or machine paths in help text or errors | `ws-check-harness` + secrets review |

## Validation & Observation Notes

- Telemetry: `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring <spec>` must PASS; `npm run test` and `ws-check-harness` green with exit codes cited.
- Manual: fresh-agent green-slice walkthrough reaching every gate on documented commands only (AC8).

### Negative & Failing Test Scenarios

- NEG1: `finish --modified <nonexistent-file>` must not yield `ok: true` with a non-zero exit (red before fix, green after).
- NEG2: `validate_state --pre-advance 6` with a `step5`-persisted ledger must fail naming `pre-step6` (red before fix listing no label, green after).
- NEG3: hand-editing `scoreState.boundary` then advancing must fail closed naming `ac_ledger score <boundary>` (red before fix, green after).

## Related specs

- Group 2: `us-414-run-state-integrity` (implement second).
- Group 3: `us-412-418-monitor-accuracy` (implement third).
- Precedent: `0125-us-412-413-liveness-checkpoints.spec.md` (grouped-issue consolidation shape).
