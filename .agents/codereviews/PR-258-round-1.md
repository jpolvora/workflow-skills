# PR-258 round 1

- **batchId:** pr-258-r1-20260831
- **head before:** a010ccd9
- **threads:**
  - PRRT_kwDOTFajc86d3QcL (score 7) — legacy ORCH Step 5 trap now forbids load from spec-to-pr/lite/testing
  - PRRT_kwDOTFajc86d3QdU (score 6) — removed near-duplicate dual-file trap (untracked source) and recompiled MEMORY
  - PRRT_kwDOTFajc86d3Qee (score 6) — orch-timing test now asserts MEMORY + orch trap wording
- **proactive:** scanned for other Step-5 ORCH invitations in memory/; only the one legacy trap needed the exclude clause
- **verify:** `node test/test-orch-timing-not-benchmark.js` pass; `self_learning.cjs --compile` → 33 entries
- **Learning:** Conflicting Medium+High MEMORY traps on the same ORCH Step 5 phrase can undo a High forbid — legacy traps must carry an explicit consumer-pipeline exclude when a new High trap narrows scope
