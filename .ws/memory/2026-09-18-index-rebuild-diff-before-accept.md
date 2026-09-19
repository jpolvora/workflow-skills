### [2026-09-18] diff the plans index before accepting a rebuild
- **Layer**: `harness`
- **Module**: `ws-spec-to-pr orch / plans index`
- **Severity**: `Medium`
- **PathPattern**: `.agents/plans/index.json`
- **Scenario / Context**: A Step 4 implementer ran `validate_state.cjs rebuild-index`; it silently dropped 8 legacy multi-spec rows with empty `workflowId` (62 entries vs 69 at HEAD). The orch audit caught it with a count-vs-HEAD check and restored the exact rows; because index JSON is order-sensitive, the restore re-appended then re-sorted to HEAD order so the final diff stays additive.
- **DO NOT**: Accept a rebuilt `index.json` without comparing entry count and ids against HEAD; never assume rebuild preserves legacy or schema-drifted rows.
- **INSTEAD DO**: After any rebuild-index, diff workflow ids vs HEAD, restore dropped rows verbatim, and keep ordering stable so the index diff stays additive.
