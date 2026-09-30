---
slug: spec-closure-strengthening
title: Spec closure strengthening
status: completed
step: 2
workflowId: spec-closure-strengthening-20260930T095034Z
startedAt: "2026-09-30T09:50:34Z"
endedAt: "2026-09-30T10:06:08.815Z"
acRefs: []
---
## 0. Summary & Business Rules

Enforce spec closure at authoring time in `validate_spec.cjs` (EARS-shaped ACs, substantive
`## Out of Scope` table, canonical-section table finder) and document the EARS patterns in
`ws-spec-write` / `ws-spec-format` guidance. The `classify.cjs` heading-variant fix (AC4/AC5)
is baselined (commit `5117abca`, verified `test/test-classify-open-questions.js` 9/9) and is
verify-only in this run: no `classify.cjs` edits.

Business rules:

- Authoring mode is strict (new specs); compat mode exit codes are frozen (AC6).
- Every authoring rejection names the offending AC id or table rule.
- No bulk migration of historical specs; only test-pinned files move (see section 1).

## 1. Definition of Ready & Scope

Resolved assumptions (from spec Assumptions table, all Confirmed y): syntactic EARS match in
authoring only; canonical-section table scope; case-insensitive heading matching; none markers
stay negative; compat stability.

Acceptance criteria and verdicts:

- AC1: authoring accepts only EARS-shaped ACs; free-form bullets rejected naming the AC id.
- AC2: authoring requires at least one substantive `## Out of Scope` data row.
- AC3: table finder reads the canonical `## Out of Scope` section; ignores other sections.
- AC4/AC5: VERIFY-ONLY — baselined `hasLegacyOpenQuestions` + `hasCanonicalOpenQuestions`
  (`classify.cjs` lines 286-308), pinned by `test/test-classify-open-questions.js` (9/9 green
  at Step 0). Heading "variants" = canonical `## Assumptions & Open Questions` + legacy
  `## Open Questions`, case-insensitive, per the recorded classifier trap. No code change.
- AC6: compat exit-code map over the 159-file corpus is byte-identical before/after
  (pre-change: 134 pass / 25 pre-existing fails recorded at Step 0).
- AC7: `ws-spec-write` + `ws-spec-format` guidance document all 5 EARS patterns + 1 example
  each; canonical reference in `FORMAT.md`.

Out of scope (spec + plan): bulk EARS migration of historical specs; semantic AC quality
judgment; heading renames; classifier pipeline math; generalizing the finder fix to
DoR/Assumptions lookups (deferred, section 8).

Test-pinned exception to the no-migration row: `test/test-validate-spec.js` requires
`.agents/specs/completed/0051-spec-dor-tdd-refinement-hardening.spec.md` to PASS authoring,
and `test/test-harness-benchmark.js` V17 requires all 5 `benchmarks/fixtures/*/spec.md` to
PASS authoring. Their ACs are free-form today, so the EARS rule forces mechanical,
meaning-preserving EARS rewrites of exactly these 6 files (plus 2 test fixture blocks).
The alternative (weakening those tests to compat) violates test-contract preservation.
Compat still passes for the whole corpus; no other historical spec is touched.
(Interview G2: closed, project-sourced.)

## 2. Technical Design & Architecture

Layer: `skills-sot` (`.agents/skills`) + `tests` (`test/`, `benchmarks/fixtures`).

### AC1 — EARS rule (`validate_spec.cjs`)

New pure function `earsViolation(acText)` returning `''` when the AC body matches one of five
case-insensitive prefix-anchored patterns, else a short reason. Called only when
`options.mode === 'authoring'`, after the existing `composite-ac` check, inside the per-row
loop so the error carries `ac: row[1]`:

- ubiquitous: `^the\s+.+\s+shall\s+.+`
- event-driven: `^when\s+.+,\s*the\s+.+\s+shall\s+.+`
- state-driven: `^while\s+.+,\s*the\s+.+\s+shall\s+.+`
- optional-feature: `^where\s+.+,\s*the\s+.+\s+shall\s+.+`
- unwanted-behavior: `^if\s+.+,\s*then\s+the\s+.+\s+shall\s+.+`

Error: `{ code: 'ac-ears', ac, message: '<AC>: AC does not match a documented EARS pattern
(<pattern hint>).' }`. Prefix anchoring (not full-line) tolerates trailing testability
detail; the `- ACn:` prefix is already stripped by the row regex; backtick spans pass
through `.+`. No new dependencies; regexes are linear (no nested quantifiers — ReDoS
review per pattern is an explicit implementation checklist item, interview G12).
Syntactic-only matching is per spec assumption (interview G1).

### AC2 — substantive row (`validate_spec.cjs`, `closureFindings`)

Extend the `hasOut` branch: error when `!data.length` (existing zero-row case) OR every
data row is placeholder-only per the existing `isPlaceholder` helper (`N/A because`
counts as substantive). Reuse code `out-of-scope-empty`; message becomes
`Out of Scope must include at least one substantive data row.` Compat branch untouched.
No existing test matches the old message (interview G3).

### AC3 — canonical-section finder (`validate_spec.cjs`)

Root cause (confirmed by read): `tableAfterHeading` uses `text.search(heading)`, i.e.
document first-match on the HEADING. A verbatim `## Out of Scope` pasted inside
`## Original Issue Context` latches the finder onto the verbatim bullets instead of the
canonical table (recorded trap `spec-import-verbatim-markers`).

Fix: new helper `headingIndexOutsideIssueContext(text, heading)` computing the
`## Original Issue Context` span (heading line through the next `## ` heading or EOF) and
returning the first heading match outside that span (`-1` when none). New
`tableAfterCanonicalHeading(text, heading)` mirrors `tableAfterHeading` from that index.
`closureFindings` uses the canonical lookup for `## Out of Scope` heading presence AND
table rows (interview G4), in both authoring and compat paths. Compat effect is
warnings-only so no exit flip is possible by construction (interview G8; verified
empirically by the AC6 diff). DoR/Assumptions/notes lookups keep `tableAfterHeading`
(defect-class sibling noted, generalization deferred — section 8).

### AC7 — docs

- `ws-spec-format/FORMAT.md`: new `### EARS-shaped Acceptance Criteria` under Closure
  sections (5 patterns + 1 example each + tolerance notes); Validation item 1 gains the
  EARS requirement; AC template lines updated to EARS shape.
- `ws-spec-write/SKILL.md`: protocol item 2 (`## Acceptance Criteria`) requires EARS shape
  with the 5 pattern one-liners + pointer to FORMAT.md.
- `ws-spec-format/SKILL.md`: Review step 2 checks AC EARS shape + pointer to FORMAT.md.

### Fixture/spec reshapes (meaning-preserving, ubiquitous pattern unless noted)

- `test/test-validate-spec.js` base AC1: `Emit one deterministic result.` becomes
  `The validator shall emit one deterministic result.`
- `test/test-spec-validation.js` valid AC1/AC2: same treatment (AC2 becomes
  `The validator shall validate the result with a named test.`).
- `0051-...spec.md` AC1-AC9: prefix `The ... shall ...` with verb adjustments
  (documents→document, validates→validate, instructs→instruct, etc.); AC8/AC9 reworded to
  name the system first. Each stays one line, ≤60 words, ≤1 bold span (composite guard).
- `benchmarks/fixtures/*/spec.md` (5 files): same mechanical rewrite; `fx-incomplete` AC1
  becomes `The worker shall do something useful.` (oracle cap untouched, interview G10).

Every rewritten AC gets an explicit composite pre-check before running the suite
(interview G9).

## 3. Step-by-Step Plan

1. `validate_spec.cjs`: add `earsViolation` + authoring-only call (AC1). Files: 1.
   Checks: unit-run new cases; `--help`/compat paths untouched; per-pattern ReDoS
   linearity review (G12).
2. `validate_spec.cjs`: substantive-row check in `closureFindings` (AC2). Checks: empty,
   placeholder-only, and `N/A because` tables.
3. `validate_spec.cjs`: issue-context-aware canonical finder for Out of Scope (AC3).
   Checks: verbatim-duplicate-heading fixture passes with canonical table; canonical-empty
   + other-section table still fails; verbatim-only (no canonical) reports heading-missing
   (G4); no-blank-line edge cases.
4. Defect-class sibling sweep (AC3 bugfix): grep all `tableAfterHeading` /
   `text.search(heading)` first-match callers; confirm DoR/Assumptions/notes callers keep
   current behavior and record the deferred generalization with path + reason.
5. Reshape fixtures + 0051 + benchmark fixtures to EARS (section 2) with per-AC composite
   pre-check (G9).
6. Docs: FORMAT.md + both SKILL.md files (AC7).
7. New `test/test-spec-closure-ears.js` + register in `test/test-suites.json` (section 5).
8. Run: new test, both validator tests, benchmark test, FULL `npm run test` (must stay
   green), compat corpus before/after diff (must be zero), AC3 inversion run (restore
   first-match → shadow-pass fixture fails; record evidence, G5), invariant scanner
   re-run (G6), `npm run generate-integrity` + `verify-integrity` (only after confirming
   the tree holds this slug's hashed files alone, G7), `ws-check-harness`,
   `test-harness-clean.js` (0 findings).
9. Ship hygiene (Step 8): version bump, site rebuild, FEATURES/docs sync per board.

## 4. Permissions, Tenancy & i18n

N/A. Both detectors are local pure functions over spec text: no caller identity, no
tenant data, no user-facing strings, no locale handling. CLI input is a repo file path
(pre-existing surface, unchanged).

## 5. Test Coverage

New `test/test-spec-closure-ears.js` (hermetic temp fixtures, spec-shaped base with
closure + DoR + notes):

- AC1/EARS-accept: one authoring PASS per pattern (5 cases).
- AC1/EARS-reject: free-form AC fails authoring with `ACn:` named in output (2 cases:
  bare imperative, system-without-shall); same spec PASSES compat (mode split).
- AC1/tolerance: trailing detail after core clause passes; backtick system names pass.
- AC2: zero-row Out of Scope fails (`out-of-scope-empty`); placeholder-only fails;
  `N/A because` row passes; one substantive + one placeholder row passes.
- AC3/shadow-pass: verbatim `## Out of Scope` + bullets inside Original Issue Context
  plus canonical table passes authoring.
- AC3/shadow-fail: canonical Out of Scope empty + table in Notes fails
  `out-of-scope-empty`.
- AC3/sabotage-inversion: documents that restoring first-match `text.search` makes the
  shadow-pass fixture fail (run once during implementation, recorded as evidence; the
  committed test pins the fixed behavior).
- AC6/mode-split: full free-form spec passes compat, fails authoring (exit-code pair).
- AC4/AC5: covered by existing `test/test-classify-open-questions.js` (9/9, no new test).

Existing suites guarding the change: `test-validate-spec.js`, `test-spec-validation.js`,
`test-harness-benchmark.js` (V17), full `npm run test`, corpus before/after diff.

## 6. Stack & Security Invariants Verification Plan

Stack pack `typescript-node.md` reviewed; applicable rules verified, rest N/A with reason:

- Boundary Input Validation (Warning): spec file text is untrusted input; it already
  flows through the validator's line/table parsers. New EARS regexes are anchored,
  linear-time, no nested quantifiers or backtracking traps — review each pattern for
  ReDoS during implementation (explicit checklist item); no `eval`/dynamic RegExp from
  input.
- Async safety (Critical): N/A — script is fully synchronous (`readFileSync`, no
  promises); no new async surface.
- Type safety (Critical): N/A — plain `.cjs`, no TypeScript; keep style consistent.
- Path traversal (Critical): no new path inputs; `--repo-root` + spec path handling
  unchanged.
- Resource lifecycle (Warning): N/A — no streams/handles; single read.

Verification: `node --check` on the edited script; full test suite; invariant scan
re-run post-change (`scan_stack_invariants.cjs --stack typescript-node`, green 0 issues
pre-change).

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot + tests only; no hub/config changes).
- [ ] EARS rule authoring-only; compat corpus diff is zero (134/25 map identical).
- [ ] AC4/AC5 evidence cited, `classify.cjs` untouched.
- [ ] New test registered in `test-suites.json`; full suite green (150 entries).
- [ ] Integrity regenerated from a clean tree + verified.
- [ ] `ws-check-harness` + `test-harness-clean.js` 0 findings.
- [ ] Version bump + site rebuild + docs sync at ship.
- [ ] Test cases cover all ACs (AC4/AC5 via baselined suite).

## 8. Open Questions

All interview gaps closed (see `step-02-...plan-interview.md`). Standing decisions:

1. 0051 + benchmark-fixture EARS rewrites vs the no-migration row — DECIDED: rewrite
   (6 files), forced by existing authoring-pass test contracts; bulk migration excluded.
2. `out-of-scope-empty` code/message reuse for placeholder-only — DECIDED: reuse code,
   extend message; zero message pins in tests.
3. Finder generalization to DoR/Assumptions — DECIDED: deferred; record with paths in
   the fix report.
4. `classify.cjs` strict "any heading variant" substring reading — DECIDED: baseline
   accepted per mandate + recorded trap (canonical + legacy, case-insensitive).
5. No blockers; no reviewer input needed beyond this audit.
