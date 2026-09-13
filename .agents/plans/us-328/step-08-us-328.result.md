---
step: 8
slug: us-328
workflowId: us-328-20260913T160800Z
status: completed
startedAt: "2026-09-13T16:08:00Z"
endedAt: "2026-09-13T16:23:10.629Z"
acRefs: []
---
# Step 08 — Delivery result (us-328)

## Summary

Fixed the stale `ws-shared/autoload.md` keyword-map prose (`{sharedDir}/scm-provider-contract.md` →
`{sharedDir}/runtime/scm-provider-contract.md`) in the runtime source and synchronized the generated
consumer mirror (prose + 4 renderer-canonical sibling link targets). Added a regression block to
`test/test-doc-sync.js`. Shipped with patch bump `0.4.23` → `0.4.24` + regenerated integrity manifest.

## Files delivered

- `.agents/skills/ws-shared/runtime/autoload.md` — 1-row prose fix (hashed hub input)
- `.agents/skills/ws-shared/autoload.md` — mirror sync (5 rows, installer-refresh stable)
- `test/test-doc-sync.js` — regression assertions (red-verified pre-fix)
- `.agents/specs/0081-us-328.spec.md` — spec of record (authoring-validated)
- Release mechanics: 55 `version:` stamps, `package.json`, both `skill-dependencies.json`,
  `bin/skill-integrity.json`, `docs/index.html` footer

## Commits

- `43190245` `feat(us-328): verified implementation` (G2, 63 files)
- `afa5eeab` `fix(us-328): code-review fixes` (spec archival)

## Verification

- Ledger: 10/10 at `pre-step6` and `step5` boundaries, 0 errors, 0 defects
- Full `npm run tests`: exit 0 (post-fix worktree)
- Review: clean round 2 + fable-judge **VERIFIED**
- Integrity: generate + verify OK (v0.4.24); site `--check` current

## Timing

Total wall-clock (telemetry sum, reporting only): **543s estimated** across steps 0–7
(Spec 3, Planning 0, Interview 0, Plan-to-tasks 0, Implement 144, Verify 153, Review 234, Testing 9).

## Follow-ups (out of scope, reported not fixed)

- Mirror lacks the `ws-monitor` keyword row present in the runtime source (pre-existing drift).
- `0037-skill-family-naming.spec.md:25` cites the bare token (historical record).
