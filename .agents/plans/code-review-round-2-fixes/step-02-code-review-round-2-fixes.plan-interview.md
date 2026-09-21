---
slug: code-review-round-2-fixes
title: Harness Hardening Round 2 — Plan Interview (Step 2)
status: completed
step: 2
workflowId: code-review-round-2-fixes
startedAt: "2026-09-20T23:54:05.000Z"
endedAt: "2026-09-20T23:59:00.000Z"
mode: auto
blocking_open: 0
shared_understanding: confirmed
acRefs: []
---
## Interview registry

AUTO-MODE: zero prompts; sweep-miss gaps closed as model-inferred. Project-context sweep covered
`observer.cjs`, `step_coordinator.cjs` (gate + `mirrorSpecMemo`), `ws-ship-pr/scripts/verify.cjs`,
`check_unique_runtime.cjs`, `check_hub_separation.cjs`, `check_memory_conflict.cjs`,
`Edit-WorkflowSkillsConfig.ps1`, `test-provider-parity.js`, `test-observer-us365.js`,
`test-global-config-missing.js`, `package.json`, `MEMORY.md`, and `.ws/config.json`.
Memory traps folded in: CRLF-safe edits, dynamic banned-path construction, helper export checks
(`MEMORY.md` 2026-09-20 entries — already cited in the plan §0 business rules).

| ID | Class | Section | Gap | Recommendation | Status | Resolution | ResolutionSource | Evidence |
|----|-------|---------|-----|----------------|--------|------------|------------------|----------|
| G1 | non-blocking | Task 1 | Helper export names (`withBatonLock`, `refreshPlansIndexForState`, canonical writer signature) not verified pre-plan | Smoke-require each helper before editing; reuse, do not duplicate | closed | Kept as Task 1 implementation check: verify exports via smoke-require before test edits | project | `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs:517-521` shows the `persist` pattern (`revision` bump + `syncStateDualWrite` + `refreshPlansIndexForState`); `observer.cjs:119-127,165-193` confirms the current direct-mutate path lacking all three |
| G2 | non-blocking | Task 3 | Spawn nuance: `spawnSync` with `shell:true` joins argv into a string, so spaced `--cwd` breaks; failure `reason` drops `stderr` | Set `shell:false` and pass `--cwd` as an intact argv element; include captured `stderr` in the failure `reason` | closed | Plan Task 3 already specifies this; no change needed | project | `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs:433-458` (`shell: process.platform === 'win32'` at :451, `reason: cli-exit-...` at :455 without stderr) |
| G3 | non-blocking | Task 5 | `check_unique_runtime.cjs` already resolves a global root for loading its runtime (lines 24-37); the hardcoded scan root is the remaining gap | Scope the fix to the per-file scan root (resolve from consumer context/config `pathTokens.skillsRoot`, local-or-global), not the runtime loader | closed | Refined plan scopes Task 5 to the scan root; loader candidates already cover global | project | `.agents/skills/ws-check-harness/scripts/check_unique_runtime.cjs:24-37` (global candidates present); `.agents/skills/ws-check-harness/scripts/check_hub_separation.cjs:50` hardcodes `path.join(repoRoot, '.agents', 'skills')` |
| G4 | non-blocking | Task 7 | Exact paths for `fix_pr_azure_context.cjs` and the GitHub/ADO `sweep_prior_work.cjs` variants not verified in the sweep | Locate via glob at implementation start; keep the three sub-actions (apiBase threading, PR-row unification, `--specs-dir` forwarding) | closed | Refined plan records the locate-first check | assumed-default | Plan Task 7 names the behaviors; file layout follows the provider skill trees |
| G5 | non-blocking | Task 8 | GUI `org`-vs-`owner` binding and the full unbound-schema-keys list not enumerated in the plan | Diff schema keys against editor bindings at implementation; parity asserts in `test-powershell-config-editor.js` are the gate | closed | Refined plan makes the schema-diff enumeration an explicit Task 8 check | assumed-default | `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1:1208,1230` confirms the `karpathyGuidelines` / `auditVerdictsBlockShip` rows exist; binding correctness is test-gated |
| G6 | non-blocking | Task 10 | Wiring point for `test-configure-auto.js` in the `npm test` chain not pinpointed | Add to the `npm run tests` chain (`package.json` `"test": "npm run tests"`) | closed | Refined plan names the chain explicitly | project | `package.json:23` (`"test": "npm run tests"`); `test/test-configure-auto.js` exists on disk |
| G7 | non-blocking | Tasks 11/13/14/15 | Exact paths for `secrets_scanner.cjs`, `run_sabotage.cjs`, `cleanup_workflow_git.cjs`, benchmark `paths.cjs`/`sensor.cjs`, build-site bump path, CI workflow files not individually verified | Locate via glob at implementation start; behaviors and negative scenarios already pinned | closed | Refined plan records the locate-first check | assumed-default | Spec F-ids and negative scenarios NS8/NS9 pin the behaviors; paths resolve under `scripts/`, `bin/`, `.github/workflows/` |
| G8 | non-blocking | Task 2 | `resolveGateChoice` unmatched-input fallback and `More options...` dead end confirmed as specified | Map unmatched/cancel text to `EXIT_BLOCKED`; drop `More options...` until a second page exists; keep autoMode/non-TTY defaults | closed | Plan Task 2 already specifies this; no change needed | project | `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs:221-235` (line 234 silent index-0 fallback), `:557` (`['Next', 'More options...']`), `:559-563` (autoMode/non-TTY defaults) |
| G9 | non-blocking | Tasks 4/6 | Ship-base fallback (`return 'main'`) and `HOME`-based `~` expansion confirmed as specified | Fail-closed base detection honoring `SHIP_PR_BASE`; `os.homedir()` expansion with fail-closed | closed | Plan Tasks 4/6 already specify this; no change needed | project | `.agents/skills/ws-ship-pr/scripts/verify.cjs:28-39`; `.agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.cjs:48` (`process.env.HOME \|\| ''`) |
| G10 | non-blocking | Task 10 | Parity suite currently asserts contract/docs only (no PR-row alias asserts); global-config test uses a weak negated regex | Synthesized-row alias asserts failing on empty envelopes; direct refusal-phrase asserts | closed | Plan Task 10 already specifies this; no change needed | project | `test/test-provider-parity.js:89-139` (contract asserts only); `test/test-global-config-missing.js:102` (negated regex) |

## Audit notes

- Plan §§0–8 scanned. Every AC (AC1–AC15) has ≥1 task and ≥1 §5 test mapping; §6 covers
  authorization (no new surface), concurrency (AC1/AC2/AC3), input validation (flags, `~`, `SHIP_PR_BASE`,
  GUI enum), and lifecycle cleanup (temp dirs, child drain, handles).
- DoR satisfied: scope bounded to F01–F27 files, Node 22 CommonJS with no new deps, stack invariants
  with verification commands, traceability via the spec inventory table.
- Failing-test baselines present: §5 names a red test per task; spec negative scenarios NS1–NS9 each map
  to a §5 bullet. No blocking gap on test baselines.
- Spec assumption "Memory routing for this repo" is unconfirmed but requires no design decision
  (plan §8 records it as no-action under AC9). Not a gap.
- `force_interview` not in play: no `check_memory_conflict.cjs` exit-2 trigger against this plan; memory
  traps were folded as project evidence rather than conflicts.
- No escalation was needed (`blocking_open == 0`); shared understanding treated as confirmed per
  AUTO-MODE dispatch contract.

## Step-output

```yaml
status: success
refine:
  registry:
    - {id: G1, class: non-blocking, section: Task 1, gap: helper export names unverified, status: closed, resolution: smoke-require check kept in Task 1, resolutionSource: project}
    - {id: G2, class: non-blocking, section: Task 3, gap: spawn shell:true nuance, status: closed, resolution: plan already specifies shell:false + stderr in reason, resolutionSource: project}
    - {id: G3, class: non-blocking, section: Task 5, gap: loader already global-aware, scan root is the gap, status: closed, resolution: refined plan scopes Task 5 to scan root, resolutionSource: project}
    - {id: G4, class: non-blocking, section: Task 7, gap: provider file paths unverified, status: closed, resolution: locate-first check in refined plan, resolutionSource: assumed-default}
    - {id: G5, class: non-blocking, section: Task 8, gap: unbound schema keys not enumerated, status: closed, resolution: schema-diff enumeration as explicit Task 8 check, resolutionSource: assumed-default}
    - {id: G6, class: non-blocking, section: Task 10, gap: wiring point for test-configure-auto, status: closed, resolution: npm run tests chain named in refined plan, resolutionSource: project}
    - {id: G7, class: non-blocking, section: Tasks 11/13/14/15, gap: exact file paths unverified, status: closed, resolution: locate-first check in refined plan, resolutionSource: assumed-default}
    - {id: G8, class: non-blocking, section: Task 2, gap: gate fallback confirmed, status: closed, resolution: plan already specifies EXIT_BLOCKED mapping, resolutionSource: project}
    - {id: G9, class: non-blocking, section: Tasks 4/6, gap: base fallback and HOME expansion confirmed, status: closed, resolution: plan already specifies fail-closed fixes, resolutionSource: project}
    - {id: G10, class: non-blocking, section: Task 10, gap: weak test asserts confirmed, status: closed, resolution: plan already specifies hardened asserts, resolutionSource: project}
  round: 1
  blocking_open: 0
  shared_understanding: confirmed
```

## Memory consult

- Backends queried: local files (`MEMORY.md` via Select-String; no vault/MCP in this session).
- Hits: 2026-09-20 traps on CRLF-safe edits, dynamic banned-path construction, helper export checks,
  and managed-hub move sweep — all already reflected in plan §0 business rules; no new trap (no novel,
  reusable evidence beyond the plan's existing notes).
- `Learning: N/A (no new project knowledge — interview applied existing memory traps; zero failures)`.
