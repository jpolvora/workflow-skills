### [2026-09-19] Canonical single-source contract files need the new wording plus a same-batch test pin

- **Layer**: `harness`
- **Module**: `ws-spec-to-pr worker turn rules`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/WORKER-TURN-RULES.md`
- **Scenario / Context**: The continuation mandate was added to the quoting dispatch builders (`STEP-DISPATCH.md`, `PROTOCOLS.md` addendum, lite block) but not to `WORKER-TURN-RULES.md`, which declares itself the single source of truth that builders quote without divergent copies. Contract tests pinned the builders only, so the drift was unguarded. The review bot filed a SUGGESTION with two sibling occurrences. Fixed by adding the mandate sentence to the canonical Turn rule section and pinning it with a same-batch assertion in `test-worker-turn-guard.js`.
- **DO NOT**: Add contract wording to quoting builders without updating the declared canonical file; do not pin new wording in tests against the builders alone.
- **INSTEAD DO**: Add the sentence to the canonical file first, then pin it with a same-batch regression assertion against the canonical path alongside the builder assertions.
