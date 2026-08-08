# Step 7 Testing Plan — check-harness-upstream-sot

## Scope

Docs-only change under `src/skills/ws-check-harness/{SKILL,PHASES,REPORT-FORMAT}.md`. No runtime code, API, DB, or UI surface.

## Verification (from config)

| Area | Command / action | Notes |
|------|------------------|-------|
| Unit / package | `npm run test` | `verification.backendTest` — installer, integrity, tree verification |
| Build | N/A for this change | Docs-only; no app build |
| DB seeds | Skip | No database |
| API / integration | Skip | No API contracts touched |
| UI / E2E / browser | Skip (`skip-browser` / no UI) | Docs-only |
| Feature AC | Docs accuracy vs harness SoT | Covered by package tests + prior harness review steps |
| Harness audit | `ws-check-harness` Phases 0–5c on this tree | AGENTS.md pre-ship gate row 8 — expect 0 critical for changed skill `ws-check-harness`; record Install mode + Skills scan root |
| Workflows simulation | `ws-check-workflows` | ⏭ orch/dispatch surfaces unchanged |

## Defect threshold

- **Pass:** `npm run test` exits 0
- **Fail:** any non-zero exit or critical assertion failure

## Out of scope

Code fixes (report only). Browser automation. Coverage deltas on untouched runtime.
