# Fix report — benchmark-publish-fixed-models (round 1 → 2)

Fix mode applied all 8 round-1 findings surgically. Full suite green (151 entries), integrity regenerated + verified.

## Fixes

- CR-001 (Warning): added `assertSafeRunId` allowlist (`/^[\w][\w.-]*$/`) before filename derivation in `publishComparison`. Regression: traversal runId rejected, no escape write.
- CR-002 (Warning): duplicate harness names rejected (one scored column per harness). Regression: split-column manifest fails.
- CR-003 (Warning): duplicate judge check ids rejected at load. Regression: duped judge fails.
- CR-004 (Warning): manifest samples cross-checked against `samples/<harness>/sample-<n>.json` when the file exists (canonical compare). Regression: matching files pass, drifted file fails.
- CR-005 (Warning): `collect_sample.cjs` requires `<runDir>/prd.md` before any delete. Regression: plain dir refused, nothing created.
- CR-006 (Warning): engine reports vendored to `sample-<n>/engine-report.json`; collector copies on every run; manifest resynced; report republished. Regression: every manifest evidenceRef resolves to a committed (non-`benchmarks/runs/`) path.
- CR-007 (Suggestion): `stableDeepEqual` now canonical (sorted-key) — key order no longer false-rejects. Regression: reordered settings pass.
- CR-008 (Suggestion): evolution rows insert inside the comparison section (after last row) with EOL matching the existing file; working file normalized to pure CRLF. Regression: row lands before trailing content.

## Verification

- `node test/test-benchmark-comparison-publish.js`: PASS (20 blocks incl. 8 new).
- `npm run test`: all 151 entries passed.
- `npm run verify-integrity`: OK.
- Stack scan: re-run at re-review.

Files changed this round: `publish_comparison.cjs`, `collect_sample.cjs`, sample dirs (+engine-report.json), sample JSONs, `run-manifest.json`, comparison report md/json, `test-benchmark-comparison-publish.js`, `bin/skill-integrity.json`.

## Ledger evidence note (pointer map)

`ac_ledger.cjs link` is append-only (same path+lines replaces the file-level hash; there is no
unlink verb), and file evidence hashes whole-file bytes. The fix round shifted lines in
`publish_comparison.cjs`, so Step 5 ranges were refreshed in place (same ranges, current hash)
and the post-fix ranges below are the authoritative pointers. Ledger score re-derived 10/10
at boundary step5 after refresh.

| AC | Step 5 range (refreshed hash) | Post-fix authoritative range |
|----|-------------------------------|------------------------------|
| AC1 | L266-L269 | L290-L293 (PRD drift) |
| AC2 | L97-L102 | L112-L117 (model mix) |
| AC3 | L89-L94 | L104-L109 (shortfall) |
| AC4 | L107-L112, L270-L273 | L122-L127 (binary), L294-L297 (judge freeze) |
| AC5 | L153-L160 | L168-L175 (renderReport) |
| AC7 | L124-L130 | L139-L144 (deviation) |
| AC8 | L235-L252 | L250-L267 (ensureEvolutionLink) |
