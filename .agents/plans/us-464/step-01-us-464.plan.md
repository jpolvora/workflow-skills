---
step: 1
slug: us-464
workflowId: us-464-20260930T220628Z
status: completed
acRefs: []
title: Slug-scoped ws-monitor discovery by state-derived slug
startedAt: "2026-09-30T22:06:28Z"
endedAt: "2026-09-30T22:20:00Z"
---
## 0. Summary & Business Rules

Slug-scoped discovery in `ws-monitor/scripts/monitor_snapshot.cjs` filters state files by the
**plan folder name** first (`path.basename(path.dirname(file)) === options.slug`) and only then by
the state's raw `slug`/`us` fields. A canonical `ws-spec-multi` batch state written to the
runId-folder layout (`{plansDir}/{runId}/{runId}.state.md`) has no `slug:` frontmatter and its folder
is the run id, so it is dropped from `--slug ws-spec-multi` even though the workflow record reports
`slug: ws-spec-multi`. The unfiltered scan and `--workflow-id` both include it.

Deliverable: make `--slug <value>` select every discovered run whose **state-derived slug** equals the
value, independent of folder name and state-file layout, while a supplied `--workflow-id` still
returns the matching run regardless of any slug filter, and an unmatched filter returns zero.

Business rules:
- Read-only observer: no product write, no state mutation, no network.
- The state-derived slug must be computed the **same way the workflow record does**, so the filter and
  the reported slug never disagree: multi-spec → `state.slug || 'ws-spec-multi'`; standard →
  `state.slug || state.us || path.basename(workflowDir)`.
- Node-only `.cjs`, launched with `node`; no `.py`.

## 1. Definition of Ready & Scope

**Resolved assumptions (spec, Confirmed = y):** filter key is the state-derived `slug`; all three
documented layouts (slug-named folder, canonical runId folder, legacy flat file) must be covered;
filtering is independent of run liveness; input validation/auth/concurrency are N/A (read-only).

**Measurable ACs:** AC1–AC7 from `step-00-us-464.spec.md`.

**In scope:**
- `monitor_snapshot.cjs` slug-filter path: derive the slug from state (report-consistent), not the
  folder name.
- Regression coverage in `test/` for the three layouts plus the no-match and `--workflow-id` cases.

**Out of scope (spec table):** the `ws-spec-multi` artifact layout; other monitor filters/detectors;
migrating state files; `--watch` exit semantics beyond scope inclusion.

## 2. Technical Design & Architecture

Stack: `node-skills-package` (Node 22 / JavaScript). Layers touched:

| Layer | Path | Role |
|-------|------|------|
| skills-sot | `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | discovery + filter fix |
| tests | `test/test-ws-monitor-us464.js`, `test/test-suites.json` | regression coverage |

**Current defect (`snapshot()` filter):**

```js
if (options.slug) {
  stateFiles = stateFiles.filter((file) => {
    if (path.basename(path.dirname(file)) === options.slug) return true;   // folder-name match
    const loaded = readState(file);
    const st = loaded.state;
    if (!st) return false;
    if (st.slug === options.slug || st.us === options.slug) return true;
    if (Array.isArray(st.items) && st.items.some((item) => item.slug === options.slug)) return true;
    return false;
  });
}
```

**Fix:** introduce a single `stateDerivedSlug(state, stateFile)` helper that mirrors the workflow
record's slug derivation, and filter on that value only (foldername no longer selects by itself).
Concretely, in the `options.slug` filter, read the state and keep the file when
`stateDerivedSlug(st, file) === options.slug`. Multi-spec states derive `state.slug || 'ws-spec-multi'`
so the canonical runId-folder run is selected (AC1–AC5). The `--workflow-id` predicate (AC6) is
unchanged and already runs after the slug filter. An unmatched slug yields an empty list → zero count
(AC7). Keep the `items` check only as a secondary union for the case where a batch state legitimately
carries queue rows matching the slug but has no top-level `slug` — it stays consistent with the
reported record.

**Not touched:** every other detector (`classifyWorkflow`, transcript scan, `deriveTerminalStatus`),
`expectedArtifacts`, `--watch` loop, transcript correlation.

## 3. Step-by-Step Plan

1. **Add `stateDerivedSlug(state, stateFile)`** in `monitor_snapshot.cjs` and export it. → AC1, AC2
2. **Rewrite the `options.slug` filter** to select on the derived slug (folder name no longer the
   selector); keep the `--workflow-id` predicate intact. → AC1, AC2, AC3, AC4, AC5, AC6, AC7
3. **Regression tests** in `test/test-ws-monitor-us464.js`: three-layout fixture (slug-named folder,
   canonical runId folder, legacy `ws-spec-multi/` flat file), `--slug` includes all three,
   `--workflow-id` returns the canonical run, unmatched slug returns zero. Register the suite in
   `test/test-suites.json`. → AC1–AC7
4. **Harness / Node-only check** — no `.py`; `test-harness-clean.js` 0 findings.
5. **Integrity + one version bump at ship** — `npm run build-site:bump`, `npm run generate-integrity`
   + `verify-integrity`.

## 4. Permissions, Tenancy & i18n

N/A — local read-only filesystem scan; no RBAC, tenancy, authZ, or user-facing i18n. Output is
en-us factual JSON/text.

## 5. Test Coverage

| AC / NS | Named check / test | Expected files |
|---------|--------------------|----------------|
| AC1 | `testSlugSelectsCanonicalRunIdRun` — `--slug ws-spec-multi` includes the canonical runId-folder run | `monitor_snapshot.cjs` |
| AC2 | `testSlugIndependentOfFolderName` — same state under a non-slug folder is still selected | `monitor_snapshot.cjs` |
| AC3 | `testSlugSelectsCanonicalLayout` — canonical layout covered | `monitor_snapshot.cjs` |
| AC4 | `testSlugSelectsSlugNamedFolder` — slug-named plan folder covered | `monitor_snapshot.cjs` |
| AC5 | `testSlugSelectsLegacyFlatFile` — legacy `ws-spec-multi/` flat file covered | `monitor_snapshot.cjs` |
| AC6 | `testWorkflowIdBypassesSlugFilter` — `--workflow-id` returns the run under any slug filter | `monitor_snapshot.cjs` |
| AC7 | `testUnmatchedSlugReturnsZero` — no state-derived slug matches → `workflowCount: 0` | `monitor_snapshot.cjs` |
| NS1 | Canonical run dropped from `--slug` output fails | `monitor_snapshot.cjs` |
| NS2 | Unmatched slug returning the unfiltered set fails | `monitor_snapshot.cjs` |
| NS3 | Slug-named-folder and legacy flat runs remain in scope after the change | `monitor_snapshot.cjs` |

## 6. Stack & Security Invariants Verification Plan

| Invariant | Verification check | Expected files |
|-----------|--------------------|----------------|
| Node-only runtime | `node --check` on the edited `.cjs`; no `.py` introduced | `monitor_snapshot.cjs` |
| Read-only observer | source scan: filter reads state only; no `writeFileSync` added on the discovery path | `monitor_snapshot.cjs` |
| Filter/report consistency | derived-slug helper reuses the record derivation (`state.slug || 'ws-spec-multi'` / `state.slug || state.us || basename(dir)`) | `monitor_snapshot.cjs` |
| Fail-closed zero | unmatched slug returns `workflowCount: 0`, never the unfiltered set | `monitor_snapshot.cjs` |
| Regression safety | new suite + existing `test/test-ws-monitor*.js` green under `npm run test` | `test/` |
