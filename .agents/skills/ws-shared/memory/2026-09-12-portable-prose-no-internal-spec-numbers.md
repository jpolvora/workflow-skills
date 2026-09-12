### [2026-09-12] Portable skill prose must not cite internal spec numbers

- **Layer**: `harness`
- **Module**: `skill portability`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-*/**`
- **Scenario / Context**: `PHASE-1-SWEEP.md` read "sweep does not present 0075's per-diff Apply/Cancel gate". Spec `0075` is upstream-only history; a consumer cannot resolve it. Code review flagged it on PR 323.
- **DO NOT**: Reference internal spec/issue/PR numbers or other upstream-only history in shipped skill bodies or companion docs.
- **INSTEAD DO**: Describe the behavior or gate generically (for example, "a per-diff Apply/Cancel gate like `/ws-wiki sync [slug]`") and keep spec-number provenance in specs or memory, not in portable procedure text.
