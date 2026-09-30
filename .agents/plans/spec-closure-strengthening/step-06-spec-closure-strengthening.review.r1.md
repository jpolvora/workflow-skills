---
step: 6
slug: spec-closure-strengthening
workflowId: spec-closure-strengthening-20260930T095034Z
status: completed
startedAt: "2026-09-30T09:50:34Z"
endedAt: "2026-09-30T10:46:57.340Z"
acRefs: []
---
# Code Review — spec-closure-strengthening (round 1)

- **Scope**: committed diff `main...HEAD` (e37dcc6f, 15 files) vs refined plan; stack pack `typescript-node.md`.
- **Score**: 9/10 (no open Critical/Warning; 2 Suggestions)
- **Phases**: triage over 18 hypotheses (H1-H18); 16 discarded with reason, 2 retained as Suggestions with proof below.

## Findings

### CR-001 [Suggestion] open .agents/skills/ws-spec-format/scripts/validate_spec.cjs:L53-L70

Blank-line style deviations around the inserted EARS block: double blank line before
`const EARS_PATTERNS` (L55-57) and missing blank line between `earsViolation` close
(L69) and `function headingPresent` (L70). File convention is single blank lines
between top-level items.

1. **Read Evidence**: committed diff hunk `@@ -53,6 +53,20 @@` shows `+\n+const EARS_PATTERNS`
   after a context blank, and `+}` immediately followed by context
   `function headingPresent`.
2. **Executable Failure Scenario**: none behavioral — `node --check` passes and all
   suites green; purely visual inconsistency in shipped code.
3. **Missing Protection**: none — no formatter gate configured (`backendFormat` empty).
4. **Discards**: no functional impact; full suite 150/150 and scanner 0 issues hold
   regardless.

Sibling occurrences: none — rest of the inserted code follows file conventions
(verified by reading L57-L100).

```suggestion
Normalize to single blank lines at both seams (cosmetic, zero behavior change).
```

### CR-002 [Suggestion] open .agents/skills/ws-spec-format/scripts/validate_spec.cjs:L91-L100

Documented residual: a spec whose ONLY `## Out of Scope` match is a verbatim table
inside `## Original Issue Context` (no canonical section) reads the verbatim table and
can pass without a canonical section. Verbatim bullets still fail closed
(`out-of-scope-empty` via the committed `verbatim-only` test).

1. **Read Evidence**: `tableAfterCanonicalHeading` (L96-L100) last-match lookup +
   limitation comment (L91-L95); `headingPresent` stays first-match-anywhere (L70-L72).
2. **Executable Failure Scenario**: tracker body containing `## Out of Scope` plus a
   pipe table pasted verbatim into `## Original Issue Context`, author writes no
   canonical section → validator reads the verbatim table rows as closure evidence.
3. **Missing Protection**: skeleton-order-aware parsing distinguishing verbatim-nested
   from canonical headings (rejected: disproportionate complexity and false-positive
   risk vs the pathological trigger; pre-existing first-match behavior was strictly
   worse for the reported shadowing defect).
4. **Discards**: realistic verbatim shapes are bullets, not tables (covered by the
   `verbatim-only` test asserting fail-closed); `ws-spec-write` import guidance
   directs authors to demote verbatim headings; corpus diff 0/159 shows no live
   occurrence.

Sibling occurrences: DoR/Assumptions/notes first-match callers keep legacy behavior
(exempt: no AC coverage, no reported shadowing, existing tests pin behavior);
`classify.cjs` section lookup exempt per batch verify-only mandate.

```suggestion
Accept as documented residual (code comment + this finding); no code change. Revisit
only if a live verbatim-table occurrence is reported.
```

## Discarded hypotheses (triage record)

H2 EARS `name` field documentary-only (maps code to spec pattern names) — keep. H3
`\r` offsets safe (validator normalizes CRLF/CR before parsing; `\s` covers stragglers).
H4 case-insensitive EARS is specified tolerance. H5 `tableRowsAfter` refactor is a
verbatim move (suite green). H6 compat call-site change is warnings-only (0/159 diff).
H7/H8 reshapes are AC-lines-only (verified by diff grep; single exception is the
composite-test anchor whose assertion is unchanged). H9 new-test assertions are direct
CLI exit/output checks plus sabotage proof (non-tautological). H10 suites entry correct
(150 entries run). H11 FORMAT.md `- ACn:` occurrences are inside table cells and a code
fence, never validated as specs. H12 long SKILL.md line has no length gate. H13
integrity diff is exactly the 4 skill files + digests. H14 no in-repo writer emits
non-EARS specs (suite green). H16 EARS regexes are linear (no nested quantifiers).
H17 generic EARS message matches file conventions. H18 docs claims match implementation.

## Stack Invariant Compliance

- `scan_stack_invariants.cjs --stack typescript-node`: exit 0, 0 issues (re-run on the
  committed tree).
- Pack rules: boundary regexes linear; sync-only; no new path inputs; no handles.
- `config.json.invariants`: `commitPlanFilesOnlyAtStep8` respected (G2 staged product
  only); no other invariant surface touched.
- Local reviewer dry-run: skipped, no runner configured (`preview.localReviewCommand`
  empty; no `verification.localReviewCommand`).
- Fable: VERIFIED at Step 5 over identical product content (no product edits since).

## Memory sweep

Matched traps checked against the diff: AC-bullet document-wide scan (FORMAT.md table
cells/fence safe), CRLF edit safety (surgical hunks, no EOL churn), quoting-file sweep
after restructure (local-only helper; message change has zero test pins), carve-out
assertions (compat/tolerance/N-A-because/verbatim-only all asserted same-batch),
detection terminals (prefix anchoring is specified tolerance), portable prose (no spec
numbers cited), dashed flags (no new flags). Zero violations.

**Apply fixes?** Yes — autoMode: one optional Suggestions fix pass (CR-001 blank lines;
CR-002 documented acceptance), then targeted re-review.
