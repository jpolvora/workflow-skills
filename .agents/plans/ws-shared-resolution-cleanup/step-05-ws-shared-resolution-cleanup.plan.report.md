---
us: ws-shared-resolution-cleanup
reportDate: "2026-09-19T21:30:00Z"
score: 10
sourcePlans:
  - .agents/plans/ws-shared-resolution-cleanup/step-02-ws-shared-resolution-cleanup.plan.refined.md
  - .agents/plans/ws-shared-resolution-cleanup/step-01-ws-shared-resolution-cleanup.plan.md
evalSource: refined-plan-plus-spec
workflowId: ws-shared-resolution-cleanup-20260919T210648Z
eventId: step5-verify-20260919
step: 5
slug: ws-shared-resolution-cleanup
status: completed
startedAt: "2026-09-19T21:06:48Z"
endedAt: "2026-09-19T21:28:21.656Z"
acRefs: []
---
# Plan Implementation Audit Report — ws-shared-resolution-cleanup

Score: 10/10 (ledger-derived via `ac_ledger.cjs score --boundary step5`; 50/50 units, no known defects, no missing evidence, no invariant violations). Advance bar is `defaults.minVerifyScore` (9): met, no scoreAndRefine required.

## Result by Feature

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 — consumer config via `{sharedDir}/config.json`, project-over-global, no hardcoded `.ws/config.json` in violation context | Implemented | `.agents/skills/ws-show-harness/SKILL.md:26` (violation fixed to token); `.agents/skills/ws-shared/runtime/config-resolution.md:121,155` (providers/fable reads via token). Grep audit over all 55 `SKILL.md`: 4 remaining `.ws/config.json` hits, each an allowlisted entry-gate sentence (`ws-pre-daily:36`, `ws-senior-developer:20`, `ws-spec-to-pr-lite:34`, `ws-wiki:15`) naming the concrete default plus a `user-gate`/`ws-configure-project` pointer, matching the canonical entry-check form. Violation-context count is 0. Test: `test/test-harness-clean.js` exit 0. |
| AC2 — managed runtime via `{sharedDir}/runtime/` / `{skillsRoot}/ws-shared/runtime/`, no bare `ws-shared/` shorthand in link targets | Implemented | `check_harness_links.cjs` exit 0 ("harness links, paths, shorthand, and routing are clean"); `test-harness-clean.js` 0 findings. Sibling-skill relative `../ws-shared/runtime/` links kept as real paths (NS2-compliant). |
| AC3 — `{skillsRoot}` expansion order explicit and honored; global execution gates on project config | Implemented | `resolve_consumer_root.cjs:358` (`requireProjectConfig`). Tests exit 0: `test-local-first-precedence.js`, `test-hybrid-consumer-root.js`, `test-check-harness-install-mode.js`, `test-skills-runtime-resolution.js`. |
| AC4 — `bin/`/tests/docs describe one layout, no stale host-specific defaults | Implemented | `package.json:23` (new AC5 test wired into `tests:harness-efficiency`); `bin/skill-integrity.json` regenerated (digests match). Tests exit 0: full `npm run test`, `test-doc-sync.js`, `test-shared-hub-paths.js`. |
| AC5 — global-without-hub fails closed with `ws-configure-project` pointer | Implemented | `requireProjectConfig()` in `resolve_consumer_root.cjs:358` (+ Python mirror `require_project_config()` in `resolve_consumer_root.py`); new `test/test-global-config-missing.js` exit 0 (fail-closed without hub, pass-through with hub, negative proof both directions). |

Negative scenarios: NS1/NS2 covered transitively by `test-harness-clean.js` Phase 2/4 gates (shorthand + tokenInLinkTargets findings, 0 findings observed); NS3 covered directly by `test-global-config-missing.js`. All linked in `ac-ledger.json` (revision 8+, event `step5-verify-20260919`).

## Additional Features

None. Diff is surgical to resolution mistakes plus the AC5 gate/test: `config-resolution.md` (2 token lines), `resolve_consumer_root.cjs`/`.py` (fail-closed gate + export), `ws-show-harness/SKILL.md` (1 token line), `package.json` (test wiring), `bin/skill-integrity.json` (regenerated), `test/test-global-config-missing.js` (new).

Out-of-scope dirty files observed but untouched by Step 4 and excluded from verification credit: `.agents/skills/ws-shared/runtime/config.schema.json` (pre-existing per state `preExistingDirty`; ws-monitor autoStart wording, unrelated to resolution — adopt-or-exclude verdict: exclude), `.agents/plans/index.json` (workflow bookkeeping, never Step 4 scope), `test/.ws/config.json` (line-ending-only diff, empty content diff). No collateral from this verify run (`git status` file set unchanged before/after; `npm run test` installer phases left no new untracked files).

## Stack Invariant Compliance

`scan_stack_invariants.cjs` over the 5 touched product/test files: 0 issues (0 Critical, 0 Warning). New test uses only sync `fs`/`os`/`path` fixture helpers with `finally`-safe env restore and no floating promises; no `child_process.exec` with interpolated paths; hub paths stay config-derived. No invariant violations linked; no score cap applies.

## Gaps and Next Steps

No gaps. Regression sabotage check: skipped — not a bug-fix/regression change (new fail-closed gate is covered by its own positive/negative test pair, which serves as the invert-equivalent proof: hub-present passes, hub-absent fails with the pointer). Fable: not enabled, no audit run. Next: G2-code after Step 5, then dispatch Step 6 (`ws-code-review` over `git diff main...HEAD`, noting the two excluded pre-existing dirty files stay out of the product commit).
