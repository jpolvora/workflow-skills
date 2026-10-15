---
step: 6
slug: latest-20-new-features
workflowId: latest-20-new-features
status: completed
startedAt: "2026-10-13T15:17:20.311Z"
endedAt: "2026-10-13T15:17:20.311Z"
acRefs: []
---
# Local dry-run code review — latest 20 NEW FEATURES

- Mode: standalone `ws-code-review` dry run (no fixes applied, no PR threads, no commits)
- Range: `142018a2^...HEAD` (`142018a2` = 20th newest `feat(...)` commit on `develop`; HEAD `6fcfda1b`)
- Scope: 559 files changed, 89321 insertions, 672 deletions; product scope 103 files under `.agents/skills`, `bin`, `test`, `scripts`
- Stack pack: `typescript-node.md` applied to the `node-skills-package` stack (no dedicated pack exists); `STACK.md` diff scope includes `bin/**` as installer source, so the generic `bin/` build-output exclusion does not apply here
- Base note: `config.project.baseBranch` is `main`; local `main` is stale and `origin/main...HEAD` is one docs commit, so the user-confirmed 20-feature range above replaces the default base for this dry run only

## Features in scope (newest first)

1. `f7284f01` feat(us-510): sanctioned single-agent state bootstrap contract
2. `f08e3ce3` feat(us-509): link --ac target list applies to every named AC
3. `39cf18f8` feat(us-508): check_workflows repo-root resolution + parity skip
4. `e1469ae8` feat(us-507): state-less ws-monitor runs from step artifacts
5. `88b65955` feat(us-506): packaged fail-closed state bootstrap
6. `c9b47ecf` feat(us-504): verified implementation
7. `ebe82a78` feat(us-502): batch worker liveness marker + watchdog
8. `13ae5cdc` feat(us-498): truthful install-mode reporting
9. `df3a7559` feat(us-492): shared hub once per run + config.json.bak
10. `d164bb4d` feat(us-490): verified implementation
11. `99ca78b0` feat(ws-spec-from-provider): ws-spec-from-issue alias
12. `7cb436be` feat(us-488): verified implementation
13. `e39f76b5` feat(us-476): stale-parent-row propagation grace
14. `a9fcefe0` feat(us-477): session-source stall deference
15. `dbf18d62` feat(us-464): verified implementation
16. `266ad05c` feat(us-475): foreign-commit guard for shared-head batches
17. `f49dce76` feat(us-474): deterministic spec-index sync filing
18. `2edacd4a` feat(explicit-knowledge-chain): research guidance
19. `a467d395` feat(per-step-context-budgets): dispatch context budgets
20. `142018a2` feat(benchmark-publish-fixed-models): fixed-model comparison

## Findings

### CR-001 [Warning] open .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs:L1684-L1719

Bootstrap `init` replay reports identity values that are not the persisted identity. The replay branch parses the existing pair (`existing`) but only checks `revision`, `completedSteps`, and terminal status; it never compares `existing.workflowId`, `existing.slug`, `existing.branch`, or `existing.baselineCommit` against the requested flags, and the result record echoes the request variables instead of the persisted ones.

Proof of exploitability:

1. Read Evidence: `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs:L1684-L1719` — `existing` is read, the progressed-run refusal checks only revision/completed/terminal, and the return at L1707-L1719 emits `workflowId, slug, branch, baselineCommit: baseline` from the invocation.
2. Executable Failure Scenario: bootstrap `demo` on branch `develop` at baseline `abc1234...`, then re-run `init` with `--branch feature-other --baseline 1111111...` (or a different `--workflow-id`). Observed probe output: exit 0, `idempotentReplay: true`, result claims `branch: feature-other`, `baselineCommit: 1111111...`, while the on-disk state still records `develop` / `abc1234...` and both files stay byte-identical.
3. Missing Protection: no identity-equality guard in the replay window and no test covering a mismatched-identity replay (`test/test-state-bootstrap.js` replays only with identical inputs).
4. Discards: the pair is not overwritten, so this is not data corruption; downstream resume reads the disk state, not the result record. The defect is the machine-readable result itself: a single agent that trusts stdout (the documented bootstrap consumer) proceeds under a branch/baseline/workflow-id that the run does not hold, and every later gate keyed to the reported baseline (diff range, convergence, ledger scoring) is computed against the wrong commit.

Score: 8/10. Sibling occurrences: searched the same defect class in the range — `ac_ledger.cjs` replay (`NOTICE: event-id ... already applied; skipping link payload`) discloses the skip on stderr instead of reporting false success, and `publish_comparison.cjs` throws on hash drift before any unchanged-skip; both are exempt with reason. `sync_index.cjs` returns `already in sync` without echoing unverified identity. One proven instance only.

suggestion: In the replay branch, compare `existing.workflowId/slug/branch/baselineCommit` to the requested values and refuse (non-zero, nothing touched) on any mismatch, or return the persisted values; add a mismatched-identity replay assertion to `test/test-state-bootstrap.js`. Remove this finding only after that probe exits non-zero.

### CR-002 [Suggestion] open FEATURES.md:L7-L7

`FEATURES.md` header still reads `Package version: **0.5.38**` while `package.json`, `bin/skill-dependencies.json` (`packageVersion`), `.agents/skills/ws-shared/version.json`, and the generated site footer all read `0.5.46` (site check: `Site is current: 62 skills`, `v0.5.46`). The skill count (62) is correct; only the version label lags. No gate catches it (`test-doc-sync` passes).

Score: 3/10. Sibling occurrences: version surfaces checked — `package.json`, `bin/skill-dependencies.json`, `ws-shared/version.json`, `docs/index.html` footer all agree at `0.5.46`; `FEATURES.md` is the only stale surface.

suggestion: Update the header at the next docs refresh or derive it in `build-site.js` so it cannot drift.

## Stack Invariant Compliance

- [x] No `.py`/`.pyc`/`.pyo` under `.agents/skills/` or `bin/` (Node-only runtime rule)
- [x] Deterministic scan: `scan_stack_invariants.cjs --stack typescript-node` over 59 changed `.cjs`/`.js` files — 0 issues (0 Critical, 0 Warning)
- [x] Subprocess use in new guards uses `spawnSync` argument arrays (`foreign_commit_guard.cjs`, `sync_index.cjs` organizer call); no shell string interpolation found in the new scripts
- [x] Path containment: `sync_index.cjs` (`isSafeSlug`, `resolveUnder`), `worker_liveness_check.cjs` (`.runtime` realpath containment, batch id regex), `workflow_state.cjs` init (plain-name identity, slug/directory match) all fail closed
- [x] Integrity: `npm run verify-integrity` — OK, manifest matches tree (v0.5.46)
- [x] Harness: `node test/test-harness-clean.js` — 0 findings; `node bin/build-site.js --check` — site current
- [ ] External local reviewer dry run: not run — `verification.localReviewCommand` and `preview.localReviewCommand` are empty, and `preview.dryRunCommand` (`npm run review:dry` → `bin/review-dry-run.cjs`) hardcodes `--target-branch refs/heads/main`, so it cannot review this 20-feature range. Marked UNVERIFIABLE, not passed.

## Re-run verifications (fresh execution)

| Suite | Result |
|---|---|
| test-state-bootstrap.js, test-state-bootstrap-init.js | exit 0 |
| test-ac-ledger.js | exit 0 |
| test-worker-liveness-check.js | exit 0 |
| test-foreign-commit-guard.js | exit 0 |
| test-spec-index-filing.js | exit 0 |
| test-fetch-threads-token-fallback.js | exit 0 |
| test-check-workflows-global-root.js | exit 0 |
| test-ws-monitor-us507.js, us464, us476 | exit 0 |
| test-benchmark-comparison-publish.js | exit 0 |
| test-ws-retro.js | exit 0 |
| test-step-context-budgets.js, test-explicit-knowledge-chain.js | exit 0 |
| test-ws-doctor.js, test-check-harness-install-mode.js, test-workflow-state-contract.js | exit 0 |
| test-powershell-config-editor.js (12 tests) | exit 0 |
| test-doc-sync.js, test-harness-clean.js | exit 0 |
| check_workflows.cjs --json | PASS, parity `checked` |
| Full `npm run test` | Not run in this dry run (host npm-cache trap is documented in MEMORY; targeted suites above cover every feature in scope) |

## Fable audit (adversarial, claims vs ground truth)

Verdict: **VERIFIED WITH CAVEATS**

| Fraud class | Result |
|---|---|
| Weakened Checks | None found. The only removed assertion (`workflows = 49` catalog count) was updated to `54` with the inventory; site check independently confirms 62 skills. |
| False Completion | One instance inside the reviewed code, not in the delivery reports: CR-001 — bootstrap replay result reports un-persisted identity as success. Delivery claims themselves match the diff. |
| Scope Creep | None found. The 559-file range is dominated by plan/spec/run artifacts of the 20 features themselves (350 plan files, 44 spec files); product changes stay inside the named skill/test surfaces and every new test suite is registered in `test/test-suites.json`. |
| Unauthorized Action | None found. All range commits arrived via merged `develop` PRs; this dry run made no commits, pushes, or PR actions. |

Action items: fix CR-001 before relying on bootstrap stdout identity; run the external reviewer once `localReviewCommand` is configured or `review:dry` accepts a target range; persist a memory trap for CR-001 with the fix (Severity: High, `workflow_state.cjs` init replay).

| Claim | Chain link | Reference | Uncertain |
|---|---|---|---|
| Replay misreports identity | codebase (executed probe) | `workflow_state.cjs:L1684-L1719` + probe in this session | No |
| All targeted suites pass | codebase (fresh runs) | suite list above, all exit 0 | No |
| Invariant scan clean | codebase (fresh run) | `scan_stack_invariants.cjs`, 59 files, 0 issues | No |
| External reviewer would pass | none | not run; `localReviewCommand` empty, `review:dry` pins `refs/heads/main` | UNVERIFIABLE |

## MEMORY sweep

Compiled `.ws/MEMORY.md` directives were checked against the product diff: wiki/site regeneration (us-510 trap) — `docs/wiki` and site check green; byte budgets — `test-step-context-budgets` green; tarball/version alignment — integrity green at 0.5.46; negative-scenario ledger cap (us-509) — `test-ac-ledger` green; check_workflows JSON/`^` traps (us-508) — no shell-built git args in the new code. No confirmed MEMORY violations beyond CR-001, which extends the us-510 bootstrap trap family.

**Apply fixes?** Dry run only — no fixes applied. CR-001 (Warning) remains open; under workflow rules it would block Advance until fixed and re-reviewed.
