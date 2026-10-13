---
step: 6b
slug: us-511
workflowId: us-511-20261013T040003Z
status: completed
verdict: pass
startedAt: "2026-10-13T04:21:00.000Z"
endedAt: "2026-10-13T04:21:00.000Z"
---
# Fresh Verify — us-511

Fresh re-derivation of every AC verdict on the committed product commit
`dbd9a655397fe390e86ef2fc78454813e229c29b`, plus fault injection. Evidence-or-zero:
each verdict below is an observed command result, not a re-read of the Step 5 report.

## Re-derived AC verdicts

| AC | Re-derivation | Verdict |
|----|---------------|---------|
| AC1 | `node test/test-fetch-threads-token-fallback.js` Case A/B — env then CLI order | PASS |
| AC2 | Case A: `gh` stub marker absent, env token in header | PASS |
| AC3 | Case B: stub marker present (fallback attempted) | PASS |
| AC4 | Case B captured `Authorization: Bearer <cli-sentinel>` | PASS |
| AC5 | Cases C/D/E: exit 1 + message names `gh auth login` + three variables | PASS |
| AC6 | Cases C/E: zero-thread text absent, no `fetch` call | PASS |
| AC7 | Case B: stub stderr absent from process stderr | PASS |
| AC8 | Cases A/B sentinel scan of temp repo → 0 hits; no stdout/stderr leak | PASS |
| AC9 | Shim source: `spawnSync`, no `gh auth token` logic | PASS |
| AC10 | Case H: shim exit non-zero + inherited error text | PASS |
| AC11 | Case J: INTENTS.md, SKILL.md, COOPERATIVE_FIX.md, README.md name the four-link chain | PASS |
| AC12 | Case B: stderr names `gh auth token` | PASS |
| AC13 | Case F: exit 0 + real zero-thread message | PASS |
| AC14 | Case A: `--json` keys `prNumber`/`owner`/`repo`/`cooperativeContract`/`activeThreads` | PASS |

## Fault injection (mutate → expect red → restore)

| # | Injected fault | Expected | Observed |
|---|----------------|----------|----------|
| 1 | Neutralized CLI fallback (`if (false) return …`) | fallback ACs fail | `FAIL AC1/AC3 CLI fallback run exits 0` → red |
| 2 | Precedence inversion (`if (false && envToken)`) | env-first fails | `FAIL AC2 env token short-circuits`, `FAIL AC4 … env token`, `FAIL AC13`, `FAIL AC9/AC10` → red |
| 3 | Failure exits 0 | loud-failure fails | `FAIL AC5 no-source run exits non-zero`, `FAIL NS3`, `FAIL NS4`, `FAIL AC10` → red |

After each injection the script was restored with `git checkout --` and the module re-run
green (`test-fetch-threads-token-fallback: ok`). No injection residue remains
(`git status` clean for the file).

## Regression re-run

`npm run test` (166 entries) green on the committed tree; `test-provider-parity.js`,
`test-skills-runtime-resolution.js`, `test-install.js` included. Harness clean, integrity
verified (see Step 5 / Step 7).

## Verdict

**PASS.** All AC verdicts re-derived green; three independent fault injections each turned
the suite red, proving the tests bind the fix. No fix loop required.
