# Check-Implementation Report — us-351 (score 10/10)

Verifier: worker inline (Step 5) · Spec of record: `step-02-us-351.plan.refined.md` ‖ `step-00-us-351.spec.md`
Mode: criterion-by-criterion (all ACs evidenced).

## AC verdicts

| AC | Evidence | Score |
|----|----------|-------|
| AC1 fresh install tree under `.ws` | `test-install.js` Phase 1 tree+content match (managed `runtime/`+`templates/` mirrored at `<consumer>/.ws/`, seeds `AGENTS.md`/`autoload.md`/`config.json`/`STACK.md`/`installed-skills.json`); full `test-install.js --local` EXIT 0 | 10 |
| AC2 zero stale refs, new location everywhere | `test-shared-hub-paths.js` (new, wired into `tests:harness-efficiency`): 235 residual hits allowlisted (SoT/global/relocation/history), 0 unlisted, 0 unused allowlist entries | 10 |
| AC3 local + global installs | `test-ws-shared-layout.js` (global execution, project config, legacy relocation, thin pointer, link rewrites) + new collision leave-both block; hybrid install tests; precedence tests — all green | 10 |
| AC4 committable `.ws` | `git ls-files .ws` = 146 tracked files; installer seeds `.ws/.gitignore` (alias) that never ignores the hub itself; fresh-install asserts green | 10 |
| AC5 integrity + harness checks | `npm run generate-integrity` + `verify-integrity` OK (v0.4.40); `test-harness-clean.js` 0 findings (dup/link/integrity gates green in-suite) | 10 |
| AC6 one-time legacy relocation | layout-test relocation block (move-not-delete, emptied-dir removal, backup prune, `.bak`, idempotent re-run) + `test-install.js` Phase 9c pre-rename migration + new collision leave-both test — green | 10 |

Negatives: collision leaves both + never overwrites current `.ws` (new layout-test block);
malformed local config surfaces `configError`, never silent global fallback (precedence test);
bare consumer resolves the observable `.ws` default (precedence test); malformed `.ws/config.json`
reported config-unreadable by monitor (precedence test). Sabotage: covered by hermes
`run_sabotage bites then restores` (fixture re-hubbed to `.ws`).

## Static checks

- `scan_stack_invariants.cjs --files <68 touched .cjs/.py>`: 0 issues. Repo-wide run shows
  3 pre-existing `no-floating-promises` findings in `test-reviewer-aligned-gates.js:140`,
  `test-visual-attachment-ingest.js:131,135` — untouched lines outside this workflow's hunks,
  recorded as a finding, not fixed (surgical scope; suite does not gate on them).
- `test-harness-clean.js`: 0 findings. `test-ws-shared-layout.js`,
  `test-shared-hub-paths.js`, `test-doc-sync.js`, link/dup gates: ok.
- Integrity regenerated + verified (v0.4.40, fullPackageDigest `e5093f0e222e…`).

## Root-cause fix worth noting

Relocating the hub broke every skill script at load time: `.cjs`
`require('../../ws-shared/…')` and `.py` `parents[2]/"ws-shared"` assumed the hub inside
the skills tree (proven by consumer-fixture `MODULE_NOT_FOUND`). Fix: installed-location
probe in every skill script (packaged `<skills>/ws-shared` first to preserve the upstream
dev loop, else `<repo>/.ws`; mirrors `resolveConsumerContext` runtimeSource precedence),
plus the same probe for the runtime's own `ac_ledger.cjs` cross-require and the ESM doctor.
No dual data defaults: readers never probe the legacy hub path (refined-plan line 25–26).

**Overall score: 10/10** — at/above `minVerifyScore` 9. Ready for Step 6 review; single
delivery commit after review (no review-fix round needed unless review finds one).
