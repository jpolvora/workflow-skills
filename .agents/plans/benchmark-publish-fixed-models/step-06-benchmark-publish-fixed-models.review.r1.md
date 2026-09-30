---
step: 6
slug: benchmark-publish-fixed-models
workflowId: benchmark-publish-fixed-models-20260930T114235Z
status: completed
startedAt: "2026-09-30T11:42:35Z"
endedAt: "2026-09-30T12:17:20.192Z"
acRefs: []
---
# Code review — benchmark-publish-fixed-models (round 1)

Scope: commit 142018a2 (`8665aab...142018a2`, 28 files, all workflow files_touched).
Stack pack: typescript-node. Product tree committed; no uncommitted product files at review time.
Verdict: 6 warnings + 2 suggestions. No clean pass; fix round required.

### CR-001 [Warning] open .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs:L284-L285

Unsanitized `manifest.runId` flows into output filenames, allowing writes outside `--results-dir`.

1. Read Evidence: `const reportFile = \`comparison-${manifest.runId}.md\`` then `writeComparisonFile(path.join(resultsDir, reportFile), ...)` — no segment validation (contrast `safePackageVersionSegment` in `benchmarks_manager.cjs`).
2. Executable Failure Scenario: publish a run dir whose manifest sets `runId` to `../evil`; the report lands at `benchmarks/evil`-adjacent paths instead of `benchmarks/results/`.
3. Missing Protection: runId allowlist (`/^[\w][\w.-]*$/`) with fail-closed rejection.
4. Discards: run-dir containment (L256) constrains inputs, not the derived output name; `writeComparisonFile` performs no containment check.

```suggestion
Reject runIds outside /^[\w][\w.-]*$|..." before deriving filenames.
```

### CR-002 [Warning] open .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs:L283-L283

Duplicate harness names across columns evade the AC2 within-column model-uniformity gate.

1. Read Evidence: `columns.map((column) => validateColumn(...))` never checks harness uniqueness; uniformity is enforced per column only (L94-L102).
2. Executable Failure Scenario: manifest declares two `workflow-skills` columns with different per-role models; each column passes uniformity while the harness mixes models across the run, defeating AC2's whole-run intent.
3. Missing Protection: duplicate-harness rejection before scoring.
4. Discards: `protocolExceptions` matching uses `.some` on harness name, so a split column also confuses exception attribution; nothing else dedupes.

```suggestion
Throw when two columns share a harness name.
```

### CR-003 [Warning] open .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs:L273-L274

Duplicate judge check ids silently double-count scoring totals.

1. Read Evidence: `checkIds` built by bare `.map` with no uniqueness check; `validateColumn` sums `sample.checks[id]` per id (L106-L113) and `renderReport` renders one row per id.
2. Executable Failure Scenario: judge declares `C1` twice; every per-sample total counts `C1` twice and aggregates inflate, while samples still validate.
3. Missing Protection: duplicate check-id rejection at judge load.
4. Discards: the unknown-check loop (L114-L118) only rejects extras absent from the judge, not dupes inside it.

```suggestion
Throw when judge.checks contains a repeated id.
```

### CR-004 [Warning] open .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs:L283-L289

Manifest-inline samples are never cross-checked against the committed `sample-*.json` evidence files, so the two can diverge silently.

1. Read Evidence: scoring reads `column.samples` from the manifest only; nothing globs `samples/<harness>/sample-*.json` although the run convention commits them.
2. Executable Failure Scenario: edit `samples/workflow-skills/sample-1.json` (or forget to regenerate it) without touching the manifest; publish succeeds and the committed evidence contradicts the scored report.
3. Missing Protection: when the per-index sample file exists, require deep equality with the manifest sample.
4. Discards: hash gates cover `prd.md`/`judge.json` bytes only, not sample files.

```suggestion
For each manifest sample index, when samples/<harness>/sample-<n>.json exists, require deep-equal with the inline sample.
```

### CR-005 [Warning] open benchmarks/comparisons/fixed-models-001/collect_sample.cjs:L80-L84

`--run-dir` is used for a recursive delete without validating it is a comparison run dir.

1. Read Evidence: `runDir` resolves from CLI, then `fs.rmSync(sampleDir, { recursive: true, force: true })` where `sampleDir` joins fixed segments onto it.
2. Executable Failure Scenario: invoke with `--run-dir /tmp` (typo) and an absolute `--engine-report`; the script deletes/creates `/tmp/samples/...` outside any run.
3. Missing Protection: require a run-dir marker (`prd.md` present) before any delete.
4. Discards: no containment helper is called; the default (script dir) is safe but the flag path is not.

```suggestion
Throw unless <runDir>/prd.md exists before rmSync.
```

### CR-006 [Warning] open benchmarks/comparisons/fixed-models-001/run-manifest.json:L1-L95

Sample `evidenceRefs` point at gitignored engine reports, so committed evidence does not reproduce.

1. Read Evidence: sample entries reference `benchmarks/runs/static-.../report.json`; `benchmarks/runs` is gitignored (0 tracked files), so clones lack the artifacts the judge scored.
2. Executable Failure Scenario: fresh clone + `publish_comparison` succeeds (manifest is self-contained) but no party can inspect the engine artifacts behind the binaries.
3. Missing Protection: vendor each engine `report.json` into the sample dir and reference the committed copy.
4. Discards: snapshotting to `benchmarks/baselines/` would pollute the version-over-version evolution scope; vendoring keeps comparison evidence local.

```suggestion
Copy each engine report.json to samples/workflow-skills/sample-<n>/engine-report.json and repoint evidenceRefs.
```

### CR-007 [Suggestion] open .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs:L75-L77

Settings-vs-defaults comparison is key-order sensitive and can false-reject equivalent objects.

1. Read Evidence: `stableDeepEqual` compares raw `JSON.stringify` output.
2. Executable Failure Scenario: `settings {a:1,b:2}` vs `defaults {b:2,a:1}` throws a deviation error although the objects are equal.
3. Missing Protection: canonical (sorted-key) comparison.
4. Discards: same-author manifests usually share key order, so impact is limited to hand-edited manifests.

```suggestion
Compare with sorted-key canonicalization.
```

### CR-008 [Suggestion] open .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs:L244-L246

Evolution rows append at EOF even when trailing content follows the comparison section.

1. Read Evidence: when the section exists, the new row is appended after `existing.replace(/\s*$/, '')` regardless of what follows the section.
2. Executable Failure Scenario: a future generator appends a section after the comparison block; the next publish detaches its row from the section.
3. Missing Protection: insert the row within the section (after the last existing comparison row).
4. Discards: both current writers keep the section last, so no live file triggers this today.

```suggestion
Insert the row after the last comparison row under the section heading instead of EOF.
```

### Stack Invariant Compliance

- `scan_stack_invariants.cjs` on touched scripts: 0 issues (verified Step 4/5).
- `config.json.invariants`: `commitPlanFilesOnlyAtStep8` honored (no plans staging in G2); no other flags apply.
- Local reviewer dry-run: not configured (`preview.localReviewCommand` empty) — skipped per contract.
- MEMORY sweep: benchmark/comparison traps folded (Generated-only skip honored by both writers; no pipeline benchmark started; ship-stage isolation applies at Step 8). No violations.

### Sibling sweep

Evolution writers repo-wide: only `benchmarks_manager.cjs` + `publish_comparison.cjs` (both in diff). No same-class siblings outside the diff.

Score: 6/10 (warnings open, gates effective but hardenable).

**Apply fixes?** Yes — fix round via ws-implement-tasks mode=fix, then re-review.
