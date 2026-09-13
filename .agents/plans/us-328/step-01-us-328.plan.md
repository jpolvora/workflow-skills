---
superseded: true
supersededBy: step-02-us-328.plan.refined.md
step: 1
slug: us-328
workflowId: us-328-20260913T160800Z
status: completed
startedAt: "2026-09-13T16:08:00Z"
endedAt: "2026-09-13T16:10:07.961Z"
acRefs: []
---
# Implementation plan — us-328: stale autoload keyword-map prose

## 0. Goal

Correct the keyword-map prose `{sharedDir}/scm-provider-contract.md` → `{sharedDir}/runtime/scm-provider-contract.md` in the
runtime autoload source and synchronize the generated consumer mirror, with a regression assertion in `test-doc-sync.js`.

## 1. Scope & touch list

| # | File | Change |
|---|------|--------|
| 1 | `.agents/skills/ws-shared/runtime/autoload.md:147` | Prose token → `{sharedDir}/runtime/scm-provider-contract.md` (one row) |
| 2 | `.agents/skills/ws-shared/autoload.md:146` | Same prose via `renderConsumerAutoload` regen (source fix propagates; verify, do not hand-diverge) |
| 3 | `.agents/skills/ws-shared/autoload.md:5,141,142` | Mirror sibling link targets → `runtime/tools.md`, `runtime/scm-provider-contract.md`, `runtime/gates.md` (renderer eight-file list already covers; verify post-regen) |
| 4 | `test/test-doc-sync.js` | Regression asserts: source prose token exact; mirror prose token exact; mirror has zero bare `](tools.md)` / `](scm-provider-contract.md)` / `](gates.md)`; `bin/build-site.js --check` still green |
| 5 | `bin/skill-integrity.json` (+ `package.json` version + site footer per version-bump rule, only if the touched hub files are hashed inputs) | Regen in the same commit (`npm run generate-integrity && npm run verify-integrity`) |

Explicit non-goals: no renderer feature work, no other autoload rows, no spec-memo repo changes, no new test file.

## 2. Implementation steps

1. **Reproduce (red):** run the new assertion logic against the pre-fix tree (or grep the bare token) to confirm it fails.
2. **Fix source:** single-token edit in `runtime/autoload.md` keyword-map row.
3. **Regen mirror:** `node -e "renderConsumerAutoload"` equivalent — apply the same eight-file `](x)` → `](runtime/x)` rewrite plus `../../ws-` → `../ws-` skill-path shift that `bin/cli.js` performs; verify the diff touches only the expected rows (prose + 3 sibling links).
4. **Regression test:** append the assertion block to `test/test-doc-sync.js`; run `node test/test-doc-sync.js` (green).
5. **Integrity + site:** `npm run generate-integrity && npm run verify-integrity`; `node bin/build-site.js --check`.
6. **Sweep:** repo-wide grep for bare `{sharedDir}/scm-provider-contract.md` → zero hits outside historical specs/changelog evidence quotes; `ws-check-harness` Phases 0–5c walk (or at minimum Phase 5a + link audit) before ship.

## 3. Verification mapping

- AC1 (source prose) → grep exact `{sharedDir}/runtime/scm-provider-contract.md` in `runtime/autoload.md` + absent bare token; test assert.
- AC2 (mirror prose + links) → same asserts against `.agents/skills/ws-shared/autoload.md` + `Test-Path` runtime targets; test assert.
- AC3 (no new misses) → repo-wide grep zero (excluding `0081-us-328.spec.md` evidence quotes + CHANGELOG history lines).
- AC4 (regression test green) → `node test/test-doc-sync.js` exit 0.
- AC5 (integrity) → generate + verify exit 0 (or verify-only green when files unhashed).

## 4. Risks

- Mirror hand-divergence reverted by next install/update → mitigated by editing source + regen (never mirror-only).
- Version-bump/integrity churn if hub files hashed → regen in same commit per harness protocol; one patch bump per release PR.
- `test/package.json` pre-existing dirty (`M`) → never stage; product commits use path-scoped `files_touched` only.

## 5. Rollback

`git checkout --` the five files above (or per-path restore from `uswf/.../before-step-4` checkpoint tag); re-run `test-doc-sync.js` to confirm red-again state.

## 6. Stack & Security Invariants Verification Plan

Stack: `node-skills-package` (Node 22 skill markdown + Node test harness). No backend/framework boundary is touched:
no `verification.backendBuild` (empty), no migrations, no API auth surfaces, no dependency changes. Invariants
`commitPlanFilesOnlyAtStep8: true` honored (no `{plansDir}` in product commits). Verification commands: `node
test/test-doc-sync.js`, `npm run verify-integrity`, `node bin/build-site.js --check`. Secrets scan: change adds no
tokens/URLs beyond the public repo issue URL already in the spec; `ws-secrets-leak-review` patterns unaffected.
