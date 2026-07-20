# us-90 — Delivery Result

## Expected
- Integrity digests match packaged/GitHub LF content and Windows CRLF working trees (same SHA-256 after LF-canonicalize).
- Consumer install succeeds without `--force-integrity`.
- `npm run verify-integrity` / generate-integrity share the same canonicalization.
- Fail-closed on real digest drift; EOL parity regression covered.
- Package bumped and integrity regenerated in the same change set.

## Done
- `bin/skill-integrity-lib.js`: `canonicalizeForHash` + `hashFileBytes` at enumerate sites; `sha256Hex` remains raw for aggregates.
- Regenerated `bin/skill-integrity.json` (v0.0.65); `verify-integrity` OK.
- Phase 11 EOL parity test in `test/test-install.js` (CRLF/LF/lone-CR).
- `AGENTS.md` note: LF-canonical hashing + regenerate after skill/hub changes.
- Package bump 0.0.64 → 0.0.65; site footer + `test/package.json` tarball synced.
- Check-implementation score **9/10**; code review clean; local install suite PASS including packed `Integrity: source OK`.
- Code commit: `58479c1`.

## Next steps
- Push `develop` and open PR → main (Step 8 ship).
- Close GitHub issue #90 after merge.
- Optional follow-up: broaden `.gitattributes` for `*.md`/`*.js` (explicitly out of scope for v1).

## References
- Spec: specs/us-90/step-00-us-90.spec.md
- Plan: specs/us-90/step-02-us-90.plan.refined.md
- Check: specs/us-90/step-05-us-90.plan.report.md
- Review: specs/us-90/step-06-us-90.review.md
- Testing: specs/us-90/step-07-us-90.testing.report.md

## Benchmark

| Metric | Value |
|--------|-------|
| Total wall-clock time | 0h 11m 20s (680s) |
| Steps executed | 0–7 (8 steps) |
| Total tokens | ~191500 (estimated) |
| LOC lines | +166 / -112 (net +54) on package-shipping paths (`bin/`, `test/`, docs, AGENTS, package.json) |
| Mode | [AUTO] [FULL] |
| Commits | 58479c1 (code); delivery commit pending |
