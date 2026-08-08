# check-harness-upstream-sot — Delivery Result

## Expected

Update `ws-check-harness` so Phase 0 **Install mode** also selects the **skills inventory root** used by Phases 1–5c (especially Phase 4):

- Upstream package root → skills scan root `src/skills` (SoT), with markers **and** SoT required; markers without SoT ⇒ hard consumer.
- Consumer → scan `{skillsRoot}` / `{globalSkillsRoot}`; ignore stray `src/skills`.
- Dogfood lag under `.agents/skills` must not inflate critical/warning inventory counts.
- Report keeps execution `Mode` (`normal` | `dry-run`); adds `Install mode` + `Skills scan root`.
- Integrity Phase 3 item 7 remains upstream-only.
- AC1–AC10 satisfied in SoT docs (`SKILL.md`, `PHASES.md`, `REPORT-FORMAT.md`).

## Done

- SoT docs updated under `src/skills/ws-check-harness/{SKILL.md,PHASES.md,REPORT-FORMAT.md}` (Install mode table, scan-root rules, Phase 2/4 dogfood SoT-id equivalence, report header fields, AC10 checklists).
- Verify score **10/10** (`step-05-…plan.report.md`); review clean after fix round 1 (`step-06-…review.md` / fix report).
- Testing: `npm run generate-integrity` + `npm run verify-integrity` + `npm run test` PASS (`step-07-…testing.report.md`); re-confirmed on isolated ship tree.
- Package version **0.0.117** aligned with `docs/index.html` footer; integrity regenerated for hashed SoT.
- Secrets leak scan on ship-scope: **No leaks detected**.
- Fable-judge (ship-scope): **VERIFIED** — docs-only contract change; ground-truth diff matches stated blast radius; verifications re-ran green; no classic frauds.

## Next steps

- Orch Step 9 (`ws-goal-fix-pr`) after code-review CI starts (`stopBeforeFixPr: true`).
- Optional (non-DoD): live `/ws-check-harness --dry-run` at package root; optional `npm run sync-skills` for dogfood.

## References

- Spec: `.agents/plans/check-harness-upstream-sot/step-00-check-harness-upstream-sot.spec.md`
- Plan: `step-02-check-harness-upstream-sot.plan.refined.md`
- Check: `step-05-check-harness-upstream-sot.plan.report.md`
- Review: `step-06-check-harness-upstream-sot.review.md`
- Testing: `step-07-check-harness-upstream-sot.testing.report.md`
- PR: _(filled after create)_

## Benchmark

| Metric | Value |
|--------|-------|
| Total wall-clock time | 25m 30s (1530s agent execution) |
| Steps executed | 9 (0–8) |
| Total tokens | 0 (estimated: true) |
| Lines added | +74 |
| Lines removed | -31 |
| Net LOC delta | +43 |
| Baseline LOC | 17249 |
| Final LOC | 17292 |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | Cursor Grok 4.5 | 120s | 0 | 2 |
| 1 | Planning | Cursor Grok 4.5 | 180s | 0 | 1 |
| 2 | Interview | Cursor Grok 4.5 | 120s | 0 | 1 |
| 3 | Plan to tasks | Cursor Grok 4.5 | 90s | 0 | 2 |
| 4 | Implement | Cursor Grok 4.5 | 300s | 0 | 3 |
| 5 | Verify | Cursor Grok 4.5 | 120s | 0 | 1 |
| 6 | Code review | Cursor Grok 4.5 | 240s | 0 | 4 |
| 7 | Testing | Cursor Grok 4.5 | 180s | 0 | 3 |
| 8 | Ship | Cursor Grok 4.5 | 180s | 0 | 8 |

### Telemetry board

| Metric | Value |
|--------|-------|
| Total time | 25m 30s (1530s) |
| Total tokens | 0 (estimated) |
| LOC net | +43 (src/) |

### Mode / commits

| Item | Value |
|------|-------|
| Mode | autoMode + fullMode; shipAction create-pr; stopBeforeFixPr |
| Branch | `feat/check-harness-upstream-sot` → `main` |
| Commits | content + delivery docs (this Step 8) |
