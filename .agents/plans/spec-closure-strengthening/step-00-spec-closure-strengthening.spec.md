---
id: null
slug: spec-closure-strengthening
title: Spec closure strengthening
source: local
specDate: 2026-09-30
step: 0
workflowId: spec-closure-strengthening-20260930T095034Z
status: completed
startedAt: "2026-09-30T09:50:34Z"
endedAt: "2026-09-30T09:52:11.271Z"
acRefs: []
---
# Specification — Spec closure strengthening

## Description

New specs pass authoring validation with ACs in any prose shape, and two detectors misread canonical specs: `validate_spec.cjs` accepts free-form AC bullets that autonomous workers interpret differently, and `classify.cjs` open-question detection matches only the exact heading `## Open Questions` while the canonical `ws-spec-format` heading is `## Assumptions & Open Questions`, so canonical specs always report no open questions. A related first-match table finder can also latch onto a verbatim bullet list inside `## Original Issue Context` instead of the canonical `## Out of Scope` table.

This spec strengthens closure in three places. First, authoring validation enforces EARS-shaped ACs: every AC follows one EARS pattern (ubiquitous, event-driven trigger, state-driven, optional-feature, or unwanted-behavior) so each criterion names its trigger, condition, and response. Second, authoring validation enforces a non-empty `## Out of Scope` table with at least one substantive data row, locating the table inside the canonical section rather than by document first-match. Third, `classify.cjs` detects open questions under heading variants containing the open-questions phrase (including the canonical assumptions heading), case-insensitively.

## Acceptance Criteria

- AC1: Authoring validation accepts only ACs matching a documented EARS pattern and rejects free-form AC bullets naming the offending AC id.
- AC2: Authoring validation requires the `## Out of Scope` table to carry at least one substantive data row and rejects empty or placeholder-only tables.
- AC3: The out-of-scope table finder locates the table inside the canonical `## Out of Scope` section and ignores bullet lists or tables in other sections.
- AC4: `classify.cjs` reports open questions when any heading variant containing the open-questions phrase (including the canonical assumptions heading) carries unresolved content, case-insensitively.
- AC5: `classify.cjs` still reports no open questions when the section is absent or contains only an explicit none marker.
- AC6: Existing specs that pass compat validation keep passing compat validation; the new rules apply to authoring mode only.
- AC7: `ws-spec-write` and `ws-spec-format` guidance document the EARS patterns with one example per pattern.

## Original Issue Context

Free-text request: strengthen spec closure with EARS-shaped ACs, a non-empty out-of-scope table, and fixed open-question detection for heading variants in `classify.cjs`.

### Prior Work Sweep

- Keyword and git sweep on `Open Questions`, `out-of-scope-empty`, `ac-sequence`, `EARS`: `classify.cjs` lines 271-272 test only `##\s+Open Questions`, which never matches the canonical `## Assumptions & Open Questions` heading; a recorded trap notes the out-of-scope table finder uses first-match so a verbatim bullet list shadowed the canonical table.
- `validate_spec.cjs --mode=authoring` already requires closure tables and rejects placeholder-only text; no EARS shape rule exists.
- No open PR covers these detector fixes; nearest closed work is the spec-format validation and classifier deliveries.

### Design Intent

- Accidental gaps, not intentional constraints: the exact-heading regex predates the canonical assumptions heading and was never widened, and the first-match table finder predates verbatim issue-context pastes; `git log -S "Open Questions"` shows scope drift rather than a deliberate narrow contract.

## Notes

- Dependencies: `ws-spec-format/scripts/validate_spec.cjs` (EARS rule, table finder), `ws-spec-format/FORMAT.md` (EARS pattern documentation), `ws-classify-complexity/scripts/classify.cjs` (heading-variant detection), `ws-spec-write/SKILL.md` (draft guidance), `ws-spec-format/SKILL.md` (review checklist).
- EARS patterns to document: ubiquitous (`The <system> shall <response>`), event-driven (`When <trigger>, the <system> shall <response>`), state-driven (`While <state>, the <system> shall <response>`), optional-feature (`Where <feature>, the <system> shall <response>`), unwanted-behavior (`If <trigger>, then the <system> shall <response>`).
- The EARS matcher must tolerate the existing `- ACn:` bullet prefix and trailing testability detail after the core clause.
- Stack rule packs under `{skillsRoot}/ws-shared/runtime/stacks/` do not apply to this Node 22 skill-package stack.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rewriting existing historical specs into EARS shape | Compat mode keeps passing; migration is explicitly excluded |
| Semantic quality judgment of AC content | Only syntactic EARS shape is enforced, not requirement correctness |
| Changing the canonical section headings | Headings stay as defined; detectors adapt to the headings |
| Classifier pipeline recommendation changes | Only the open-questions signal is fixed, not the pipeline math |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| EARS strictness | Syntactic pattern match per AC, authoring mode only | Deterministic check without semantic judgment | y |
| Table finder scope | Canonical `## Out of Scope` section only | Ends first-match shadowing from other sections | y |
| Heading matching | Any heading containing the open-questions phrase, case-insensitive | Covers canonical and author-variant headings | y |
| None markers | Explicit none markers still mean no open questions | Preserves the existing negative signal | y |
| Compat stability | All compat-passing specs keep passing | No retroactive breakage for historical files | y |
| Auth, rate limits, external dependencies | N/A because both detectors are local pure functions over spec text | No caller identity, throttle, or remote fallback applies | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | EARS rule, table finder, heading variants, docs only | AC1 through AC7 each map to one behavior |
| Atomic criteria | Each AC names a validator exit, signal value, or doc update | Review AC list against the validator and classifier CLIs |
| Failure modes | Free-form AC, shadowed table, missed variant named | Negative scenarios list each mode with expected signal |
| Observation telemetry | Validator exits and classifier signals named | Telemetry section lists exact commands and outputs |
| Zero open blockers | Strictness, scope, matching, and compat stability decided | Assumptions table shows Confirmed y on decided rows |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring <spec>` exits 0 for EARS-shaped specs and non-zero naming the offending AC otherwise.
- `node {skillsRoot}/ws-classify-complexity/scripts/classify.cjs` reports open questions true for canonical specs with unresolved questions and false for none markers.
- Full historical specs corpus passes compat validation unchanged after the change.
- `npm run test` plus the closure regression tests covering EARS shapes, table shadowing, and heading variants.

### Negative & Failing Test Scenarios

- A free-form AC bullet fails authoring validation with the AC id named instead of passing silently.
- A verbatim bullet list in issue context no longer satisfies or shadows the canonical out-of-scope table check.
- A canonical `## Assumptions & Open Questions` section with unresolved rows reports open questions true instead of false.
- A spec relying on compat mode passes unchanged after the authoring-only rules land.
