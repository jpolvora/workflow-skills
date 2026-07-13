# spec-provider-skills — Delivery Result

## Expected
- Three provider skills (`github-provider`, `azure-devops-provider`, `local-spec-provider`) with dual-mode and shared intents.
- Config `providers.active` / `providers.scm` + `plans.specsDir` in schema/example; legacy `issueTrackers` inference.
- Orchestrator + `00-write-spec` + `08`/`09`/`11` delegate to providers; no embedded happy-path CLI recipes.
- Converter/thread scripts moved under providers with thin shims at old paths (AC9).
- AGENTS hub routing, install tests, and site catalog updated.
- AC1–AC9 satisfied (Step 6 Quick Score 9.3; Step 11 integration PASS).

## Done
- [x] Provider scaffolds + scripts (T1–T5)
- [x] Config schema/example + local hybrid defaults (T6)
- [x] Orchestrator / ARTIFACTS / FAQ delegation (T7)
- [x] `00-write-spec` optional `--mirror` via local-spec-provider (T8)
- [x] `11-ship-pr` / `08-fix-pr` / `09-goal-fix-pr` scm wiring (T9–T11)
- [x] AGENTS + README + tests + docs/site (T12–T14)
- [x] Review fixes: en-us resolve default, in-place mirror, portable docstring, stronger shim asserts
- [x] Commits: `db51544` (feat), `ad3feea` (fix)
- [x] `npm run tests -- --local` pass; `node bin/build-site.js` → 33 skills

## Next steps
- After Step 13 merge: consumers run `npx github:jpolvora/workflow-skills update --include-new` to install new provider folders.
- Optional: live GH/ADO `fetch-to-spec` smoke against a real tracker.
- Optional: harness audit (`check-harness`) for hub consistency.
- Untracked local-only: `.agents/AGENTS.md`, `.cursor/plans/`, codereview scratch (not part of delivery).

## References
- Spec: `.cursor/plans/spec-provider-skills/step-00-spec-provider-skills.spec.md`
- Plan: `step-02-spec-provider-skills.plan.refined.md`
- Verify: `step-06-spec-provider-skills.plan.report.md`
- Delivery: `step-10-spec-provider-skills.report.md`
- Integration: `step-11-spec-provider-skills.integration-test.report.md`

## Benchmark

| Metric | Value |
|--------|-------|
| Total wall-clock time | (agent steps ~2.5h estimated) |
| Steps executed | 0(skip),1–3,5–7,9–12 (+13 pending) |
| Total tokens | ~350000 (est.) |
| Lines added | +3088 |
| Lines removed | -1321 |
| Net LOC delta | +1767 (path-scoped skills/docs/tests/hub) |
| Baseline LOC | 21689 |
| Final LOC | 23198 |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec Creation | n/a | 0s | 0 | skip |
| 1 | Planning | composer-2 | 180s | 32500 | 1 |
| 2 | Refinement | composer-2 | 420s | 40500 | 1 |
| 3 | Exec plan/DAG | composer-2 | 180s | 37500 | 2 |
| 5 | Implementation | composer-2 | 3600s | 160000 | ~30 |
| 6 | Verification | composer-2 | 180s | 57000 | 1 |
| 7 | First commit | composer-2 | 120s | 0 | 36 |
| 9 | Code review | composer-2 | 240s | 43000 | 1 |
| 10 | Fixes + commit | composer-2 | 180s | 31000 | 5 |
| 11 | Integration | composer-2 | 120s | 22500 | 2 |
| 12 | Delivery | composer-2 | — | 0 | plan+result |
