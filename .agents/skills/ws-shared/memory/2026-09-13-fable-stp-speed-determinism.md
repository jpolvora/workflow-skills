### [2026-09-13] Plan-scale delivery must list partial items as caveats, not full completion

- **Layer**: `harness`
- **Module**: `ws-spec-to-pr / speed-determinism plan`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/scripts/*; .agents/skills/ws-classify-complexity/scripts/classify.cjs; test/test-workflow-process-waste.js`
- **Scenario / Context**: Implementing a multi-phase reconciled plan (P0/P1/P2) where mechanical traps (scoreState persist on link, spec-touched layers, git-intersect files_touched, finish-batch, stub/commit/manifest helpers, dispatch hook) land and targeted plus full suites pass, but minor hygiene bullets remain (memory-conflict mtime gate, fuller prose dedup, version bump deferred to release PR).
- **DO NOT**: Claim 100% completion of every plan sub-bullet when verification proves the core traps but minor hygiene items remain open.
- **INSTEAD DO**: Ship the mechanical core with passing tests and integrity green, then report VERIFIED WITH CAVEATS naming each deferred bullet, its file, and the proof command for the landed core (`link` persists `pre-step6` scoreState; classify emits `complexityClass`; `test-workflow-process-waste` guards simple-path waste).
