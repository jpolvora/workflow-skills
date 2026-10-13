---
step: 6
slug: us-507
workflowId: uswf-us-507-20261012T235108Z
status: completed
startedAt: "2026-10-13T00:10:00Z"
endedAt: "2026-10-13T00:10:00Z"
acRefs: []
---
# Code Review - us-507

Local adversarial review of the committed product diff
(`git diff 7aded9cb...HEAD`: `e1469ae8`, `74e3340d`, `1925b9f9`) for state-less
run discovery in `ws-monitor`.

## Scope reviewed

`monitor_snapshot.cjs` (+~150: `isStepArtifactName`, `statelessFreshness`,
`listStatelessRuns`, `snapshot()` selection/record build, liveness-loop guard,
Markdown render branch, `DEFECT_CONTRACTS['run-without-state']`, exports);
`ws-monitor/SKILL.md` signal map + actionable signals; new
`test/test-ws-monitor-us507.js` (+370) + `test/test-suites.json`; release/docs
bump (`package.json`, `bin/skill-dependencies.json`, `bin/skill-integrity.json`,
`ws-shared/version.json`, `ws-shared/runtime/skill-dependencies.json`,
`test/package.json`, `docs/index.html`, `README.md`, `FEATURES.md`).

## Findings

| ID | Area | Severity | Finding | Resolution |
|----|------|----------|---------|------------|
| CR-001 | `snapshot()` state-less selection | Warning | `listStatelessRuns()` scanned every plan directory on every tick even when `--workflow-id` was supplied, although a state-less directory can never match that selector (it records no identity). The filter ran after the full scan, so the wasted work was unconditional and the "never selects" rule lived only in the filter predicate. | Fixed in `1925b9f9`: skip the scan entirely when `options.workflowId` is set; the leftover filter now only applies the `--slug` match. Re-verified (suite + `us464` + `us388` + integrity). |
| - | Detection bounds | Info | Scan is top-level only, skips non-directories and unreadable directories, and treats state presence (not parse success) as the discriminator (AC10/AC14/AC15). Verified by the suite's `none`/`nested`/`entries` blocks. | No action |
| - | Read-only contract | Info | Detection uses only `readdirSync`/`statSync`; the fixture tree is byte-identical across two snapshots (AC18). | No action |
| - | Severity contract | Info | Memory trap `[2026-09-25] Monitor severity contract` honored: no shape-derived tolerance was introduced; the new code owns its own window rule and existing codes are untouched. | No action |
| - | Single detector | Info | Evidence derives from the existing `step-NN-{slug}.` naming used by `expectedArtifacts()`; `missing-child-state` and `stateDerivedSlug` are unchanged (AC13/AC16). | No action |
| - | Cross-signal safety | Info | A state-less record (status `active`/`stale`) never qualifies as a `terminalChildren` or `activeMulti` entry in `detectStaleParentRows`, so multi-spec lineage checks are unaffected. | No action |
| - | Host coupling / deps | Info | No host product ids, no new dependency, no config key, no CLI flag; `node --check` clean. | No action |

## Re-review

CR-001 applied. `node test/test-ws-monitor-us507.js` (all AC blocks),
`test-ws-monitor-us464.js`, and `test-ws-monitor-us388.js` re-run green;
`npm run generate-integrity` + `verify-integrity` regenerated after the edit and
the ledger evidence re-linked/re-scored (pre-step6 = 10/10). No Critical or open
Warning remains.

## Verdict

**Approved** - one Warning found and fixed; the diff is surgical and traces to
the spec ACs.
