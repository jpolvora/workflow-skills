# explicit-knowledge-chain — Delivery Result

## Expected

From spec ACs + plan scope: explicit ordered knowledge chain (codebase → project docs → MCP sources → web) in research guidance; per-claim chain-link citation with reference; `UNCERTAIN` flag for ungrounded claims, never as observed fact; explicit anti-fabrication ban + gap statement; per-claim source table in the report step; judge chain-compliance check; max-2-rounds budget preserved; all grep-verifiable in both skill files.

## Done

- `ws-fable-method/SKILL.md`: Knowledge chain & anti-fabrication section (chain order, earlier-preferred + skipped-link rule, unreachable-MCP gap rule, per-claim citation rule, `UNCERTAIN` rule, fabrication ban); Step 2 row carries the chain (2-round budget intact); Step 6 row requires the 4-column source table.
- `ws-fable-judge/SKILL.md`: Step 1b chain-compliance check (per-claim link+reference, skipped-link violation, `UNCERTAIN` rule, fabrication check, `UNCERTAIN`/`UNVERIFIABLE` contrast, return-for-completion rule); sourcing flags ride the existing verdict.
- `ws-fable-judge/references/REPORT.md`: `Source Chain Compliance` template section.
- `AGENTS.md` §2 dogfood mirror (chain row, table row, ban paragraph; generic wording, no spec numbers).
- `test/test-explicit-knowledge-chain.js` (registered in `test-suites.json`): 17 grep assertions covering AC1–AC8 + review findings; full suite 153/153 green.
- Verify score 10/10 (step5 boundary, 80/80 units); review clean after 1 fix round (CR-001, CR-002 closed); harness audit 0 findings; integrity regenerated + verified.
- DAG: L1 (T1 method, T2 judge, T3 AGENTS.md) → L2 (T4 test); all byte budgets met on delta basis.

## Next steps

- Ship: push `develop` + open PR `develop` → `main` (shared-head rule), then Step 9 fix-pr convergence.
- Master merges after independent convergence checks (do not merge here).

## References

- Spec: .agents/plans/explicit-knowledge-chain/step-00-explicit-knowledge-chain.spec.md
- Plan: step-01-explicit-knowledge-chain.plan.md (Step 2 bypassed: interview-not-required)
- Check: step-05-explicit-knowledge-chain.plan.report.md
- Review: step-06-explicit-knowledge-chain.review.md

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 24m 36s (1476s agent execution) |
| Steps executed | 8 (0-7; step 8 close/ship in progress) |
| Total tokens | 0 (estimated: false) |
| Lines added | +78 |
| Lines removed | -10 |
| Net LOC delta | +68 |
| Baseline LOC | n/a (skill-package stack; counted product scope only) |
| Final LOC | n/a (skill-package stack; counted product scope only) |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | unknown | 44s | 0 | 3 |
| 1 | Planning | unknown | 116s | 0 | 1 |
| 2 | Interview | unknown | 0s | 0 | 0 |
| 3 | Plan to tasks | unknown | 86s | 0 | 1 |
| 4 | Implement | unknown | 740s | 0 | 7 |
| 5 | Verify | unknown | 43s | 0 | 1 |
| 6 | Code review | unknown | 181s | 0 | 1 |
| 7 | Testing | unknown | 266s | 0 | 2 |
