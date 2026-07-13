# Goal Loop Round 2 — PR-27

| Field | Value |
|-------|-------|
| ID | fixpr_27 |
| Iteration | 2/20 |
| Mode | drive |
| Success criterion | activeThreads == 0 |
| Criterion met | pending re-collect |
| Actions taken | Fixed mojibake in pipeline SKILL.md bodies; reverted accidental `us-workflow`→`spec-to-pr` rename from prior commit; regenerated catalog (mojibake=0, FFFD=0) |
| Build/tests | `node bin/build-site.js` OK |
| Commits | ade36f6 (partial), 2193012 (restore + cleanup) |
| Push | yes |
| Resolved earlier | PRRT_kwDOTFajc86QPkso, PRRT_kwDOTFajc86QPksv |
