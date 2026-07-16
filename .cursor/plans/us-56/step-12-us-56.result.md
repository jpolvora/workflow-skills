# us-56 — Delivery Result

## Expected

From [issue #56](https://github.com/jpolvora/workflow-skills/issues/56) / `step-00-us-56.spec.md`:

- AC1: Canonical docs/help use `npx --yes github:jpolvora/workflow-skills`; no `github:…@latest` / `@main` recommendations.
- AC2: Broken `@latest` form no longer recommended; Troubleshooting maps exit 128 → drop `@latest`.
- AC3: Agent/CI can `install --full|--package|--skills --yes` without per-skill overwrite prompts.
- AC4: `config.json` preserved on overwrite/update.
- AC5: `update --include-new` remains supported and documented.

Out of scope: npm registry publish.

## Done

- Removed `github:…@latest` / `@main` from `bin/cli.js` help/`--check`, `README.md`, `docs/index.html`; added exit-128 troubleshooting.
- Added non-interactive `install --full|--package|--skills --yes` with `copyDirPreservingConfig`.
- One-shot overwrite on TTY; `stdout.isTTY` guards `console.clear()`; non-TTY without `--yes` hard-fails.
- Phase 8 tests for non-interactive install + config preserve; `npm run tests -- --local` passed (Step 2).
- Code review 9/10 — 0 Critical / 0 Warning (Info/Nit only; not fixed).
- G2-code commit: `2f6ee04` — `fix(installer): non-interactive install --yes; drop github:@latest docs (US 56)`.

## Next steps

- Optional: add Phase 8 assert for `install --full --yes`; early non-TTY bail on default interactive; align remaining `npx github:…` strings to `npx --yes`.
- Optional: run `check-harness` (low risk for installer-only change).
- Ship gate (Step 5): push / PR / skip (default Skip — `fullMode: false`).

## References

- Spec: `.cursor/plans/us-56/step-00-us-56.spec.md`
- Plan: `.cursor/plans/us-56/step-01-us-56.plan.md`
- Review: `.cursor/plans/us-56/step-03-us-56.review.md`
- Issue: https://github.com/jpolvora/workflow-skills/issues/56

## Benchmark

| Metric | Value |
|--------|-------|
| Total wall-clock time | ~10m 29s (629s agent execution) |
| Steps executed | 3 (plan, implement, review) + bootstrap/delivery |
| Total tokens | ~94300 (estimated: true) |
| Lines added | +434 |
| Lines removed | -76 |
| Net LOC delta | +358 |
| Baseline commit | `dfc8d6b` |
| Code commit | `2f6ee04` |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 1 | Planning | cursor-grok-4.5 | 210s | 16000 | 1 |
| 2 | Implementation | cursor-grok-4.5 | 179s | 37500 | 6 |
| 3 | Code Review & Fix | cursor-grok-4.5 | 240s | 40500 | 1 |
| 4 | Consolidation | orch | — | 0 | plan + result |
