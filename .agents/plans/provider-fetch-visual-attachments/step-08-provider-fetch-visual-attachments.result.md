---
step: 8
slug: provider-fetch-visual-attachments
workflowId: provider-fetch-visual-attachments-20260903T131113Z
status: completed
startedAt: "2026-09-03T13:11:13Z"
endedAt: "2026-09-03T15:08:35.192Z"
acRefs: []
---
# provider-fetch-visual-attachments — Delivery Result

## Expected

Extend `fetch-to-spec` on GitHub and Azure DevOps (same intent, no new SCM id): shared Node ingest helper, `{specStem}.assets/` sidecar + `manifest.json`, `## Visual References` when downloads succeed, register copies to `{us-dir}/attachments/`, partial HTTP failure exit 0, auth failure STOP, parity tests.

## Done

- **Implement:** `ingest_visual_attachments.cjs`; converter subprocess wiring; `register_local_spec.cjs` assets copy; contract + both INTENTS/SKILL + downstream Read obligations; `test/test-visual-attachment-ingest.js`; parity assertions.
- **Verify:** 10/10 (`step-05-*.plan.report.md`); 28 ACs + 8 negative scenarios linked.
- **Review:** Clean (`step-06-*.review.md`); product commit `8880b876`.
- **Testing:** Feature + parity + integrity green; full `npm run test` fails on dogfood `host-capabilities.json` install-tree mismatch (environmental).

## Next steps

- PR review + CI; Step 9 fix-pr if threads appear.
- Optional: resolve dogfood `host-capabilities.json` vs install tree verify for green full suite locally.

## References

- Spec: `.agents/specs/0060-provider-fetch-visual-attachments.spec.md`
- Plan: `step-02-provider-fetch-visual-attachments.plan.refined.md`
- Check: `step-05-provider-fetch-visual-attachments.plan.report.md`
- Review: `step-06-provider-fetch-visual-attachments.review.md`
- Testing: `step-07-provider-fetch-visual-attachments.testing.report.md`

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | ~87 min (5195s telemetry) |
| Tokens | 0 recorded (estimated where absent) |
| LOC baseline | 79525 (telemetry.loc.baseline) |
| Product commit | `8880b876` |
