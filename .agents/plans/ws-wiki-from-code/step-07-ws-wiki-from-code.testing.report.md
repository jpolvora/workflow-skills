---
slug: ws-wiki-from-code
title: ws-wiki from-code genesis and progressive-disclosure split — Testing Report
status: completed
step: 7
workflowId: ws-wiki-from-code-20260912T171926Z
startedAt: "2026-09-12T17:29:45Z"
endedAt: "2026-09-12T17:29:45Z"
spec: .agents/plans/ws-wiki-from-code/step-00-ws-wiki-from-code.spec.md
plan: .agents/plans/ws-wiki-from-code/step-02-ws-wiki-from-code.plan.refined.md
testingPlan: .agents/plans/ws-wiki-from-code/step-07-ws-wiki-from-code.testing.plan.md
productCommit: 013431e4282e4ff892b6c80bb2dcf73a17bd5ee2
acRefs: []
---
# Step 7 Testing Report — ws-wiki-from-code

## 1. Probe (machine, pre-skill)

- Command: `node .agents/skills/ws-testing/scripts/probe_test_surface.cjs --json`
- Result: `hasTestSurface: true` (aliases: `backendTest: npm run test`; globs match `test/**/*.js` incl. `test/test-wiki.js`).
- Decision: no auto-skip; full Step 7 executed. Agent judgment did not skip.

## 2. Base build / verification commands

| Command | Exit | Notes |
|---------|------|-------|
| `node test/test-wiki.js` (targeted) | 0 | "All ws-wiki tests passed successfully." Full AC1–AC18 + NS string + fixture battery green (incl. Tests 19–21 from-code helper + companions). |
| `npm run test` (canonical `backendTest`) | 1 | Fails at `test-install.js` Phase 0b: `bin/skill-integrity.json is stale vs current tree`. Expected — hashed `ws-wiki` files changed; `npm run generate-integrity` deferred to Step 8 ship per spec Notes + MEMORY trap. **Not a product defect.** |
| `node test/test-install.js --local` | 1 | Same integrity stale error (isolated confirmation). |
| `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` | 0 | "Scanned 2 file(s). Found 0 issue(s). Stack invariant scan passed." |
| `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring ".agents/specs/0079-ws-wiki-from-code.spec.md"` | 0 | "PASS (18 ACs)" — AC18. |
| `npm run verify-integrity` | 1 | "bin\skill-integrity.json is stale vs current tree (run: npm run generate-integrity)". Documented; regen at ship. |

DB seeds: N/A (`database.type: none`) — step reported unnecessary, no datasets applied.

API/integration checks: N/A (no HTTP surface); integration signal is `test-wiki.js` enumerator fixtures (from-code areas JSON, containment, empty-frontend skip, sweep/verify composition).

UI/E2E: skipped — no browser bound; autoMode gate approves without browser per dispatch.

Accessibility/contrast on form validation errors and alert indicators: N/A — no UI forms in this change; no browser run to assess. Recorded as skipped per policy (not a failure).

Coverage: no separate coverage runner configured; `test-wiki.js` exit-0 plus stack scan is the coverage signal for touched lines.

## 3. Unit test detail (`test/test-wiki.js`, exit 0)

Covers AC1–AC3 (router + companions + CATALOG), AC5–AC8 (from-code helper JSON shape, canonical order, git-surface, containment, unknown flags), AC9–AC15 (FROM-CODE/INIT prose gates), AC16–AC18 (test battery + host-name scan + spec authoring), and NS1–NS9 negative scenarios. Observed names linked in `ac-ledger.json` (Step 5 evidence); Step 7 re-ran the same suite green post-review (no product edits at Step 6).

## 4. Mutation testing

- `status: skipped`
- Reason: `verification.mutationTest` empty AND `defaults.skipMutationTesting: true` (opt-in default). Per `ws-testing` skip rules, logged as skipped, does not fail.
- Threshold: 80 (default, unused while skipped). Score: N/A. Killed/survived: N/A.

## 5. Regression sabotage

- Formal `run_sabotage.py`: `status: skipped`
- Reason: `backendTest` (`npm run test`) exits non-zero at integrity check before `test-wiki.js` runs, so the helper would false-pass on inversion-unrelated failure. AC ledger marks sabotage `not-required` on all 18 ACs (feature addition, no regression AC).
- **Manual substitute (performed):**
  - Invert: iterate `[...CANONICAL_AREAS].reverse()` in `list_wiki_from_code_areas.cjs` (temporary byte change).
  - Test: `node test/test-wiki.js` → failed on `areas follow canonical id order` (1 test failed).
  - Restore: original bytes from backup; `node test/test-wiki.js` → exit 0 ("All ws-wiki tests passed successfully.").
- Manual substitute result: `status: passed` (inverted code bites targeted suite; bytes restored; post-restore green).

## 6. G2-code (optional at Step 7)

- Step 6 review produced only `step-06-*.review.md` artifacts; no new product commits after `013431e4`. Per gates, Step 7 testing G2 stays optional → not run, no commit.

## 7. Files touched (Step 7 only)

- Created: `.agents/plans/ws-wiki-from-code/step-07-ws-wiki-from-code.testing.plan.md`, `.agents/plans/ws-wiki-from-code/step-07-ws-wiki-from-code.testing.report.md`
- Modified: none (product tree untouched).
- Deleted: none.

## 8. Final verdict

- `status: passed` — targeted wiki suite exit 0, stack scan 0 issues, authoring validate exit 0, mutation `skipped` per policy, manual sabotage substitute `passed`, full `backendTest` fail documented as stale integrity (ship obligation, not product defect).
- Neither Mutation nor Sabotage is `failed` → eligible for Advance toward Step 8. No push performed (per dispatch).
- **Ship note:** Step 8 must run `npm run generate-integrity` + `npm run verify-integrity` before PR; full `npm run test` expected green after integrity regen.
