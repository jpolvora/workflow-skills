### [2026-09-13] Classifier runInterview reason must name the actual trigger
- **Layer**: `harness`
- **Module**: `ws-classify-complexity / classify.cjs`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-classify-complexity/scripts/classify.cjs; test/test-classifier-history.js`
- **Scenario / Context**: `runInterview` became true on `complexityClass === 'complex'` (schema/migration/tenancy) even when the pipeline stayed `lite` with layers ≤ 2 and no open questions, but the executionProfile reason still said "Standard execution has open questions or more than two detected layers."
- **DO NOT**: Hard-code a single standard-pipeline reason whenever `runInterview` is true; do not assume interview implies standard + layers/OQ.
- **INSTEAD DO**: Build the reason from the matching triggers (`complex` class, standard + layers > 2, standard + open questions) so classify.md and JSON stay factually aligned.
