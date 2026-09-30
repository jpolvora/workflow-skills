---
step: 2
slug: spec-closure-strengthening
workflowId: spec-closure-strengthening-20260930T095034Z
status: completed
blocking_open: 0
shared_understanding: confirmed
startedAt: "2026-09-30T09:50:34Z"
endedAt: "2026-09-30T10:06:08.814Z"
acRefs: []
---
# Plan interview — spec-closure-strengthening

Auto-mode audit of `step-01-spec-closure-strengthening.plan.md` (sections 0-8) against the
spec, memory traps, and project evidence. Grilling protocol applied; every gap closed via
project-context sweep (no escalation needed).

Scenario probes: soft-deletion, concurrency, list sizing, rate limits — all N/A (local
pure functions over spec text; single synchronous file read; no state, no network, no
tenant surface). Touched framework boundaries: CLI-input regex safety only (section 6 of
the plan); authorization / async / DTO / subscription boundaries untouched — audited OK,
no blocking gap.

Failing-test-baseline audit: every implementation task names its red baseline (EARS
reject, placeholder-only, shadow-fail, mode-split); AC4/AC5 cite the green baselined
suite; AC7 is docs-only. No blocking gap.

## Interview registry

| id | class | section | gap | recommendation | status | resolutionSource | evidence |
|----|-------|---------|-----|----------------|--------|------------------|----------|
| G1 | non-blocking | 2 | EARS matcher could accept a non-EARS sentence that merely contains "shall" later in the line | Accept: spec mandates syntactic-only matching | closed | project | step-00 Assumptions row 1: "Syntactic pattern match per AC, authoring mode only" |
| G2 | non-blocking | 1 | 0051 + 5 benchmark fixtures must move to EARS despite the no-migration row | Rewrite exactly the 6 test-pinned files; bulk migration stays excluded | closed | project | test/test-validate-spec.js:107-112 (0051 authoring PASS); test/test-harness-benchmark.js:47 (V17 fixtures authoring PASS); test-contract preservation wins |
| G3 | non-blocking | 2 | `out-of-scope-empty` message change could break a message-pinned test | Reuse code, extend message | closed | project | grep over test/*.js: zero matches for "at least one data row" / "substantive data row" |
| G4 | non-blocking | 2 | Verbatim-only spec (no canonical section) should report heading-missing, not table-empty | Canonical lookup covers heading presence + table rows | closed | project | plan section 2 already specifies both; implementation checklist carries it |
| G5 | non-blocking | 5 | Sabotage vehicle for the AC3 finder fix | Inversion run: restore first-match, show shadow-pass fixture fails; committed test pins fixed behavior | closed | project | .agents/skills/ws-testing/scripts/run_sabotage.cjs exists but serves the ws-testing mutation flow (skipMutationTesting: true, not gated); inversion run is the proportionate sabotage |
| G6 | non-blocking | 6 | Invariant scanner runnability unproven | Re-run post-change at Step 4/7 | closed | project | scan_stack_invariants.cjs --stack typescript-node exits 0 pre-change ("0 issues"); re-run closes the loop |
| G7 | non-blocking | 3 | Integrity regen must not stamp foreign hashes | List dirty hashed paths (skills/bin roots) before regen; proceed only when all belong to this slug | closed | project | trap 2026-08-23-shared-worktree-integrity; preExistingDirty holds only plans/.ws residue (non-hashed) |
| G8 | non-blocking | 2 | AC3 finder change in the compat path could flip compat exits | Impossible by construction (compat closure findings are warnings-only) + empirical AC6 diff | closed | project | validate_spec.cjs:277-287 compat branch pushes warnings only |
| G9 | non-blocking | 2 | Each EARS rewrite must dodge composite-AC triggers (>60 words, >1 bold, joined imperatives) | Add explicit per-AC composite pre-check to the refined plan | closed | project | compositeReason in validate_spec.cjs:47-54; spot-check of 0051 AC3 rewrite passes (no opening imperative, 0 bold, <60 words) |
| G10 | non-blocking | 2 | fx-incomplete AC1 rewrite vs oracle completeness cap | Rewrite text only; oracle untouched | closed | project | test-harness-benchmark.js V18 asserts oracle cap values, not AC prose |
| G11 | non-blocking | 2 | EARS keyword case tolerance | Case-insensitive match; capitalized examples in docs | closed | project | spec Notes patterns are lowercase-anchored by example; tolerance is a superset that cannot reject a documented shape |
| G12 | non-blocking | 6 | ReDoS review of new regexes not an explicit step | Add per-pattern linearity review to refined step 3 | closed | project | typescript-node.md rule 3 (boundary input validation) |

## step-output

```yaml
status: success
refine:
  round: 1
  blocking_open: 0
  shared_understanding: confirmed
needs_user: null
```

Refined plan: `step-02-spec-closure-strengthening.plan.refined.md`. No AC sentence
overrides; no spec sync required.
