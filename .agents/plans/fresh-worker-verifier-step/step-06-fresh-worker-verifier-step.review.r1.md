---
step: 6
slug: fresh-worker-verifier-step
workflowId: fresh-worker-verifier-step-20260930T062223Z
status: completed
startedAt: "2026-09-30T06:22:23.921Z"
endedAt: "2026-09-30T07:17:32.621Z"
acRefs: []
---
# Code review — fresh-worker-verifier-step (round 1)

- **Base**: main (f85e94d) — `git diff main...HEAD` is exactly the G2 commit fcc2b4a (24 files)
- **Score**: 6/10 (4 Warnings, 3 Suggestions; no Critical)
- **Stack rule pack**: typescript-node (`scan_stack_invariants.cjs` clean); harness invariants swept against MEMORY

## Findings

### CR-001 [Warning] open .agents/skills/ws-fresh-verify/scripts/run_fresh_injection.cjs:L80-L85

`--invert-patch=<path>` mangles the value: the prefix `--invert-patch=` is 15
characters but the parser slices 16, dropping the value's first character.

1. **Read Evidence**: `run_fresh_injection.cjs` `=`-form branch for
   `--invert-patch=` uses `a.slice(16)` while the prefix is 15 chars long.
2. **Executable Failure Scenario**: `node run_fresh_injection.cjs ... --invert-patch=/tmp/inv.patch` resolves the patch as `tmp/inv.patch`
   (relative, missing leading `/`) and fails with `missing-invert-patch` — or
   worse, resolves to an unintended relative file.
3. **Missing Protection**: correct `slice(15)` offset plus a regression
   assertion covering the `=` form.
4. **Discards**: the space-separated form is unaffected and documented, but the
   `=` branch is reachable code that silently corrupts input; no caller
   contract forbids the `=` form.

Sibling: `ws-testing/scripts/run_sabotage.cjs` carries the identical
`slice(16)` line — named exemption (foreign ownership, Step 7 path; needs its
own upstream follow-up, not this PR's blast radius). `build_fresh_dispatch.cjs`
and `write_fresh_report.cjs` `=`-offsets were verified correct.

```suggestion
Use `a.slice(15)` for `--invert-patch=` and add a `=`-form regression
assertion to `test/test-fresh-verify.js`.
```

### CR-002 [Warning] open .agents/skills/ws-fresh-verify/scripts/run_fresh_injection.cjs:L206-L217

A null test exit status (signal kill or 16 MB `maxBuffer` overflow) can yield a
false red: `proc.status === 0` is false for `null`, so a signal-killed run with
a pattern-matching output fragment reports `test-failed-as-expected`.

1. **Read Evidence**: L206-L217 branches only on `proc.status === 0` vs else;
   `redObserved` (L249) is true when `testExitCode !== 0` (null passes) and a
   name extracted.
2. **Executable Failure Scenario**: a verbose suite exceeding 16 MB, or an
   OOM-killed test binary (`status: null`), with any `FAIL`-shaped line in the
   captured fragment → exit 0 `test-failed-as-expected` with
   `testExitCode: null`.
3. **Missing Protection**: fail closed when `testExitCode` is null/undefined
   (`test-execution-failed`, exit 1).
4. **Discards**: no other layer checks for null status; the JSON shape even
   permits `testExitCode: null` alongside `redObserved: true`.

```suggestion
After the spawn, fail closed with reason `test-execution-failed` (exit 1)
when `proc.status` is null or undefined. Cover with a self-signalling test
binary regression case.
```

### CR-003 [Warning] open .agents/skills/ws-fresh-verify/scripts/run_fresh_injection.cjs:L176-L196

No dirty-vs-HEAD guard: the scratch worktree is cut at HEAD, so a standalone
run with uncommitted edits to the declared paths silently verifies committed
bytes instead of the working tree.

1. **Read Evidence**: L176-L196 adds the worktree at HEAD with no
   `git diff --quiet HEAD -- <paths>` check.
2. **Executable Failure Scenario**: implementer edits `sample.txt`, runs the
   injector standalone before committing → report claims the working tree
   verified while the injected bytes came from HEAD.
3. **Missing Protection**: fail closed with `paths-dirty-vs-head` when any
   declared path differs from HEAD.
4. **Discards**: pipeline ordering (6b after committed G2) mitigates only the
   orch path; the script is also a documented standalone tool with no warning.

```suggestion
Check `git status --porcelain -- <paths>` (or `git diff --quiet HEAD`) before
creating the worktree; exit 1 naming the dirty paths. Cover with a dirty-file
fixture case.
```

### CR-004 [Warning] open .agents/skills/ws-fresh-verify/scripts/build_fresh_dispatch.cjs:L20-L36

Case-sensitive refusal patterns allow a case-variant bypass on
case-insensitive filesystems: `STEP-05-X.PLAN.REPORT.MD` resolves to the same
file as `step-05-x.plan.report.md` on Windows/macOS yet evades every
`REFUSED_PATTERNS` match.

1. **Read Evidence**: `isRefused` tests the raw basename; all 17 patterns are
   lowercase-only with no `i` flag.
2. **Executable Failure Scenario**: `--prior-output STEP-05-SLUG.PLAN.REPORT.MD`
   on Windows → allowlist miss (not the exact `--spec`/`--plan` string) →
   refusal miss → prior full output injected into the fresh dispatch.
3. **Missing Protection**: lowercase the basename before testing.
4. **Discards**: no other layer normalizes case; the allowlist compares exact
   resolved strings.

```suggestion
Lowercase the basename in `isRefused` and add a case-variant refusal
assertion.
```

### CR-005 [Suggestion] open .agents/skills/ws-fresh-verify/scripts/build_fresh_dispatch.cjs:L77-L84

`extractAcList` scans the whole spec, so a `- ACn:` bullet outside
`## Acceptance Criteria` (e.g. quoted in Notes) would pollute the handoff AC
list. Scope extraction to the Acceptance Criteria section.

```suggestion
Scan only lines between `## Acceptance Criteria` and the next `##` heading.
```

### CR-006 [Suggestion] open test/test-fresh-verify.js:L1-L10

The `red-signal-unparseable` branch (non-zero exit, no pattern match) has no
regression coverage. Add an exit-3 empty-output fixture case asserting exit 1
with reason `red-signal-unparseable`.

```suggestion
Add the unparseable-red test block to `test/test-fresh-verify.js`.
```

### CR-007 [Suggestion] open .agents/skills/ws-fresh-verify/scripts/run_fresh_injection.cjs:L101-L119

An invalid `--fail-pattern` regex surfaces as `red-signal-unparseable`,
misattributing a caller typo as a test-output problem. Validate the pattern at
parse time (exit 2 on invalid regex).

```suggestion
Compile `--fail-pattern` in `parseArgs` and fail usage on invalid regex.
```

## Stack Invariant Compliance

- `scan_stack_invariants.cjs` (typescript-node): 0 issues over new scripts + test.
- MEMORY sweep: no DO NOT/INSTEAD DO violations (path-scoped recipes, no
  whole-tree verbs in prose, CRLF-safe edits, integrity regen from clean tree,
  both dependency copies updated).
- Local reviewer dry-run: not configured (`preview.localReviewCommand` empty) —
  skipped. Fable auto-audit: optional integration, skipped (same as prior
  standard runs in this batch).
- Sibling sweep: `slice(16)` class searched across the diff (one hit, CR-001)
  plus `run_sabotage.cjs` (named exemption above); all other `=`-offsets in the
  new scripts verified arithmetically.

## Apply fixes?

Workflow autoMode: apply fixes and re-review (round 2).
