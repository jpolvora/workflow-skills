---
step: 2
slug: us-328
workflowId: us-328-20260913T160800Z
status: completed
startedAt: "2026-09-13T16:08:00Z"
endedAt: "2026-09-13T16:10:46.883Z"
acRefs: []
---
# Refined implementation plan — us-328: stale autoload keyword-map prose

## 0. Goal

Correct the keyword-map prose `{sharedDir}/scm-provider-contract.md` → `{sharedDir}/runtime/scm-provider-contract.md`
in the runtime autoload source and synchronize the generated consumer mirror, with a regression assertion in
`test-doc-sync.js`. Interview deltas vs step-01 draft: mirror sync method locked to renderer regen (Q1), three
sibling link-target fixes confirmed in scope (Q2), five memory traps folded (Q3), patch bump `0.4.23` → `0.4.24`
locked (Q4), no companion (Q5).

## 1. Scope & touch list

| # | File | Change |
|---|------|--------|
| 1 | `.agents/skills/ws-shared/runtime/autoload.md:147` | Prose token → `{sharedDir}/runtime/scm-provider-contract.md` (one row) |
| 2 | `.agents/skills/ws-shared/autoload.md:146` | Same prose via `renderConsumerAutoload` regen; diff must show only expected rows |
| 3 | `.agents/skills/ws-shared/autoload.md:5,141,142` | Mirror sibling links → `runtime/tools.md`, `runtime/scm-provider-contract.md`, `runtime/gates.md` |
| 4 | `test/test-doc-sync.js` | Regression asserts (source prose, mirror prose, zero bare mirror links); generic comments (portable-prose trap) |
| 5 | `package.json`, `bin/skill-dependencies.json` (`packageVersion`), site footer | Patch bump `0.4.23` → `0.4.24` via `npm run build-site:bump` |
| 6 | `bin/skill-integrity.json` | Regen after final edits, same commit (`npm run generate-integrity && npm run verify-integrity`) |

Explicit non-goals: renderer code changes, other autoload rows, spec-memo repo, new test file, `context.md`.

## 2. Implementation steps

1. **Reproduce (red):** grep bare `{sharedDir}/scm-provider-contract.md` in both autoload copies (expect 2 hits);
   confirm mirror bare links `](tools.md)` / `](scm-provider-contract.md)` / `](gates.md)` present.
2. **Fix source:** single-token edit in `runtime/autoload.md` keyword-map row.
3. **Regen mirror:** apply `renderConsumerAutoloadText` transform; `git diff` must show only prose row + 3 link rows.
4. **Regression test:** append assertion block to `test/test-doc-sync.js`; `node test/test-doc-sync.js` green.
5. **Bump + integrity + site:** `npm run build-site:bump`; `npm run generate-integrity && npm run verify-integrity`;
   `node bin/build-site.js --check`.
6. **Sweep:** repo-wide grep for bare token → zero outside `0081-us-328.spec.md` evidence + CHANGELOG history;
   link audit of mirror (all relative `.md` targets resolve); harness Phase 5a + `test-doc-sync` before ship.

## 3. Verification mapping

- AC1 → exact-token grep in `runtime/autoload.md` + test assert.
- AC2 → exact-token grep + bare-link absence in mirror + `Test-Path` runtime targets + test assert.
- AC3 → repo-wide grep zero (excluding spec evidence + changelog history).
- AC4 → `node test/test-doc-sync.js` exit 0.
- AC5 → generate + verify exit 0.

## 4. Risks

- Mirror divergence reverted by installer → regen path (Q1).
- Untracked skill-tree files polluting integrity walk → move aside before regen (currently none under
  `.agents/skills/` besides tracked edits; `{plansDir}/us-328/` + specs are outside the walk).
- `test/package.json` pre-existing dirty → never stage (G2 scoping per trap).

## 5. Rollback

Per-path restore from `uswf/us-328-20260913T160800Z/before-step-4` checkpoint tag; re-run `test-doc-sync.js`
to confirm red-again state.

## 6. Stack & Security Invariants Verification Plan

Stack `node-skills-package` (Node 22 skill markdown + Node test harness). No framework boundaries touched:
`verification.backendBuild` empty, no migrations, no API/auth surfaces, no dependency changes. Invariant
`commitPlanFilesOnlyAtStep8: true` honored. Commands: `node test/test-doc-sync.js`,
`npm run verify-integrity`, `node bin/build-site.js --check`. No new tokens/URLs (public issue URL already in
spec). `scan_stack_invariants.cjs` pre-completion scan runs at Step 4 per `ws-implement-tasks`.
