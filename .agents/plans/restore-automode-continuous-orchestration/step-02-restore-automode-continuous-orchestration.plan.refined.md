---
slug: restore-automode-continuous-orchestration
title: Restore autoMode continuous orchestration (host-turn chaining through ship and fix-pr)
status: completed
step: 2
workflowId: restore-automode-continuous-orchestration-20260927T023632Z
shared_understanding: confirmed
startedAt: "2026-09-27T02:43:42.213Z"
endedAt: "2026-09-27T02:47:08.000Z"
acRefs: []
---
## 0. Summary & Business Rules

Unattended `defaults.autoMode` runs of `ws-spec-to-pr` and `ws-spec-to-pr-lite` keep one host session through Steps 0→9: auto-apply gate index 0, dispatch each step, run Step 8 close, workflow-mode `ws-ship-pr`, and Step 9 `ws-goal-fix-pr` until terminal ship and fix-pr convergence or a hard stop. The orchestrator does not voluntarily end the host turn between steps.

Pause and checkpoint stay a host-forced fallback only. When the IDE ends a turn mid-step, persist `state.stepCheckpoints` and `state.turnPause` so `ws-monitor` reports `worker-session-paused` instead of `worker-session-stall`. Do not insert `pause-turn` between step boundaries in `autoMode`.

Hard stops stay in force: HS-1, HS-5, verify below `defaults.minVerifyScore` after max scoreAndRefine rounds, merge blocked, and user cancel. `autoMode` still does not skip planning Steps 1–3 for `standard` / `complex`.

This run is `workflowType: standard`, `complexityClass: complex`, `finalPipeline: standard`, `runInterview: true`, `enableDag: true`. Authoring target is the local SoT under `.agents/skills/`. Do not edit the global install.

### Design Intent

`git log -S "does not chain host turns"` on the orch docs and `test/test-liveness-checkpoints.js`:

- `ad134fce` (US-412/413) made D1 require the phrase `does not chain host turns` in `.agents/skills/ws-spec-to-pr/SKILL.md`. That is the AC8 wording regression. Completed spec `.agents/specs/completed/0125-us-412-413-liveness-checkpoints.spec.md` still records that sentence and must not be rewritten (AC8).
- `34f49a75` (ancestor of HEAD) flipped active orch prose to continuous chaining through close, `ws-ship-pr`, and `ws-goal-fix-pr`, and changed D1 to `/chain host turns|chains Steps 0/i`. That positive pattern still matches the old sentence, because `does not chain host turns` contains `chain host turns`. NS1 is not enforced yet.

Behavior change is limited to closing that false pass and patching any active-doc sentence the sibling sweep still finds. Do not restate compliant paragraphs.

Interview locked the current tree: active orch and human docs do not use `does not chain host turns` as the primary contract (the only hits are `.agents/specs/completed/0125-us-412-413-liveness-checkpoints.spec.md` and this spec’s historical narrative). T01–T05 and T08b stay confirm-only. Edit one of those files only when a re-read finds a contradictory sentence. The required edit is D1. `WORKER-TURN-RULES.md` already scopes turn rules to dispatched workers; the `autoMode` orchestrator stays unattended through Steps 0→9. Do not change `worker_turn_guard.cjs` or `step_coordinator.cjs`. `gates.md` already cross-links that scope. Registry: `step-02-restore-automode-continuous-orchestration.plan-interview.md`.

## 1. Definition of Ready & Scope

Assumptions from the spec are confirmed: primary path chains until terminal or a hard stop; pause markers only on a host-forced mid-step end; lite uses the same continuous rule for its steps plus close, ship, and fix-pr.

Acceptance criteria:

- AC1: `.agents/skills/ws-shared/runtime/gates.md` § Interactive execution cadence states that `autoMode` keeps the same host session through Steps 0→9 (close → `ws-ship-pr` → `ws-goal-fix-pr`) without voluntary turn stops; hard stops unchanged; host-forced mid-step end uses PROTOCOLS turn-boundary pause.
- AC2: `.agents/skills/ws-spec-to-pr/SKILL.md` `autoMode ≠ skip planning` table places host-turn chaining through Step 9 in the Does column and voluntary turn end between step boundaries in the Never column; prose matches AC1.
- AC3: `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` and `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` § Automatic Mode align with AC1–AC2; PROTOCOLS § Turn-boundary pause is fallback-only in `autoMode`.
- AC4: `.agents/skills/ws-spec-to-pr-lite/SKILL.md` states continuous close, ship, and fix-pr in `autoMode` without voluntary host-turn stops between steps.
- AC5: `README.md`, `FEATURES.md`, and `.agents/specs/wiki/delivery/spec-to-pr-pipeline.md` describe continuous `autoMode` plus host-forced checkpoint/pause fallback; rebuild the site wiki when that wiki source changes.
- AC6: `test/test-liveness-checkpoints.js` D1 asserts SKILL.md documents chaining and does not accept `does not chain host turns`, plus host-forced pause fallback. D2 README/FEATURES checks stay as they are.
- AC7: `checkpoint` / `pause-turn` CLI, schemas, and `ws-monitor` pause-versus-stall semantics stay valid. Do not remove operations or telemetry types.
- AC8: Do not rewrite `.agents/specs/completed/0125-us-412-413-liveness-checkpoints.spec.md`. This spec records the corrected reading (option (a) restored for `autoMode`).

Out of scope: `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs` and step-baton worker contracts; host runtime changes that try to lengthen IDE turns; waiving planning Steps 1–3; a new “super auto” config flag; harness benchmarks (`scripts/harness-benchmark/`, `ws-benchmarks`).

Negative scenarios (spec order):

- NS1: Reintroducing `autoMode does not chain host turns` as the primary contract in SKILL.md or PROTOCOLS.md fails D1.
- NS2: Requiring `pause-turn` between every step boundary in `autoMode` fails review against AC1.
- NS3: Removing `checkpoint` / `pause-turn` or `turnPause` schema fields fails the existing US-412/413 regression tests (AC7).

## 2. Technical Design & Architecture

Stack id `node-skills-package` (Node 22, JavaScript). Layers from `.ws/config.json`: skills-sot `.agents/skills`, installer-cli `bin`, tests `test/`. Frontend none. Database none. `domain.tenancyField` is empty. `frontend.i18n.framework` is `none`.

`config.json` `invariants`: `entitiesAreClassNotRecord`, `migrationsCliOnly`, `tenancyViaGlobalQueryFilters`, `efOnlyInInfrastructure`, and `noInlineHandWrittenMigrations` are false. `commitPlanFilesOnlyAtStep8` is true. `skipQualityGates` is false. No product auth, tenancy, or i18n surface is touched.

`fable.enabled` and `fable.autoDetectDomain` are true. The touch set has no IaC, Kubernetes, Docker, database migration, or data-script files, so domain adapters are skipped.

Nearest stack pack: `.agents/skills/ws-shared/runtime/stacks/typescript-node.md`. This change does not add TypeScript product code. Checks that still apply are docs and tests only (section 6).

HEAD already contains the `34f49a75` prose flip in:

- `.agents/skills/ws-shared/runtime/gates.md` (AC1)
- `.agents/skills/ws-spec-to-pr/SKILL.md` (AC2)
- `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` and `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` (AC3)
- `.agents/skills/ws-spec-to-pr/WORKER-TURN-RULES.md` (AC9) — scope paragraph only; do not change `worker_turn_guard.cjs` or `step_coordinator.cjs`
- `.agents/skills/ws-spec-to-pr-lite/SKILL.md` (AC4)
- `README.md`, `FEATURES.md`, `.agents/specs/wiki/delivery/spec-to-pr-pipeline.md` (AC5)

Implementation edits a file only when the sibling sweep finds a primary-contract contradiction. The required code edit is D1 in `test/test-liveness-checkpoints.js`: the positive regex must not succeed on `does not chain host turns`, and the same file must reject that phrase in `.agents/skills/ws-spec-to-pr/SKILL.md` and `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` (NS1). Leave the D2 block unchanged (AC6).

`defaults.enableDag` is true. Prose audits (T01–T05, T08) may run in parallel. T06 depends on those audits finishing, because the assertion locks the final sentences. T07 re-runs the existing checkpoint suite and does not edit `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs`.

Memory traps applied: do not stage unrelated dirty files; do not run harness benchmarks; CRLF files need single-line edit anchors; regenerate integrity only after the last hashed-file edit.

## 3. Step-by-Step Plan

### T01 — Confirm gates cadence (AC1, NS2)

Read `.agents/skills/ws-shared/runtime/gates.md` § Interactive execution cadence. Keep the `autoMode` exception that holds one host session through Steps 0→9, names `ws-ship-pr` and `ws-goal-fix-pr`, lists the hard stops, and points host-forced mid-step ends at PROTOCOLS § Turn-boundary pause. If any sentence tells `autoMode` to stop the turn at each boundary or to call `pause-turn` between steps, replace that sentence only (single-line anchor). Defect-class sibling sweep: search active harness docs for `does not chain host turns` (exclude `.agents/specs/completed/0125-us-412-413-liveness-checkpoints.spec.md` and this spec’s historical narrative).

### T02 — Confirm standard orch table (AC2)

In `.agents/skills/ws-spec-to-pr/SKILL.md`, the `autoMode ≠ skip planning` Does column must chain host turns through Step 9 (close → `ws-ship-pr` → `ws-goal-fix-pr`). The Never column must forbid voluntarily ending the host turn between step boundaries. Adjacent prose must match AC1 (host-forced `checkpoint` / `pause-turn` only). Edit only a contradictory sentence. Do not waive Steps 1–3.

### T03 — Confirm dispatch and protocols (AC3, NS2)

Align `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` `autoMode ≠ skip planning` with AC1–AC2 (chain through Step 9; never voluntarily halt between boundaries). Align `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` § Automatic Mode and § Turn-boundary pause so pause is fallback-only in `autoMode`. Do not edit baton sections except a cross-link if the sweep requires one. Do not edit `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs`.

### T04 — Confirm lite parity (AC4)

In `.agents/skills/ws-spec-to-pr-lite/SKILL.md`, keep the sentence that `autoMode` proceeds continuously through close, `ws-ship-pr`, and fix-pr without voluntarily ending the host turn between steps. Patch only if that sentence is missing or contradicted.

### T05 — Confirm human docs (AC5)

Confirm `README.md`, `FEATURES.md`, and `.agents/specs/wiki/delivery/spec-to-pr-pipeline.md` describe continuous `autoMode` and the host-forced checkpoint/pause fallback (`checkpoint`, `pause-turn`, `--until-terminal` stays for D2). If `.agents/specs/wiki/delivery/spec-to-pr-pipeline.md` changes, rebuild the site in T09. Do not hand-edit generated `docs/index.html` ahead of the builder.

### T06 — Lock D1 against the negation (AC6, NS1)

Edit `test/test-liveness-checkpoints.js` D1 only. Require chaining language in `.agents/skills/ws-spec-to-pr/SKILL.md` and assert that neither that file nor `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` contains `does not chain host turns`. The positive matcher must not succeed on that negated sentence; a bare `/chain host turns/` substring is not enough. Keep the host-forced pause fallback assert. Do not change the D2 block. Use a single-line anchor (CRLF-safe). Replace the comment `// D1 - AC8` so the live test does not label the retired US-412/413 sentence as the requirement.

Sabotage (mutation unset: `verification.mutationTest` is empty): after D1 is green, author an invert patch that restores the `ad134fce` D1 requirement (the files must contain `does not chain host turns`). A patch that only drops the new reject and leaves `/chain host turns/` is not a valid invert: current prose still matches that substring, so the suite stays green. Then run `node .agents/skills/ws-testing/scripts/run_sabotage.cjs --test "npm run test" --paths test/test-liveness-checkpoints.js --invert-patch <patch>`.

`--test` must stay `npm run test` (`verification.backendTest`). `run_sabotage.cjs` rejects any command that is not a configured `verification.*Test` alias, so `node test/test-liveness-checkpoints.js` is not a legal sabotage command. That alias runs `test/run-tests.cjs`, which includes `test/test-liveness-checkpoints.js` in the local suite.

V9 pass: the helper process exits 0, JSON `status` is `passed`, `reason` is `test-failed-as-expected`, and `testExitCode` is non-zero. The helper exits 1 when the inverted suite still passes (`test-passed-with-inverted-code`). Do not treat helper exit 0 as a miss. Restore must match the pre-invert snapshot on that path only.

### T07 — Keep pause machinery (AC7, NS3)

Do not remove `checkpoint` or `pause-turn` from `.agents/skills/ws-spec-to-pr/scripts/update_state.cjs`, state schema prose in `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, or pause-versus-stall text in `.agents/skills/ws-monitor/SKILL.md`. Re-run `node test/test-liveness-checkpoints.js` so T1–T9 still pass. Sibling sweep: no edit to `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs`.

### T08b — Scope worker turns vs unattended orchestrator (AC9)

In `.agents/skills/ws-spec-to-pr/WORKER-TURN-RULES.md`, keep a Scope section that binds the turn rule to dispatched workers only and states that `autoMode` orchestrator host sessions stay unattended through Steps 0→9. Worker obligations stay: preview plus at least two tool calls, zero-tool-call failure, and no mid-batch parent ping. Do not edit `.agents/skills/ws-spec-to-pr/scripts/worker_turn_guard.cjs` or `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs`. In `.agents/skills/ws-shared/runtime/gates.md`, the `autoMode` cadence already cross-links that file and must not treat a finished worker as a reason to end the orchestrator session. Do not add a second cross-link.

### T08 — Leave completed spec 0125 (AC8)

Do not modify `.agents/specs/completed/0125-us-412-413-liveness-checkpoints.spec.md`. `git diff` on that path must be empty at the end of implementation. The corrected interpretation lives only in this spec.

### T09 — Ship set when hashed markdown changes (AC5)

If any file under `.agents/skills/` changed: one version bump via `npm run build-site:bump` (not a second bump later), then `npm run generate-integrity` and `npm run verify-integrity` as the last hashed-content step. If `.agents/specs/wiki/delivery/spec-to-pr-pipeline.md` changed, that same site rebuild covers the wiki. Always run `node test/test-liveness-checkpoints.js`. If the sweep edits nothing under `.agents/skills/` and the wiki source is unchanged, skip the version bump and integrity regen; still run the liveness test. Stage only files this work touched.

## 4. Permissions, Tenancy & i18n

No RBAC permissions, no tenant isolation field, and no i18n keys. `domain.tenancyField` is empty and `frontend.i18n.framework` is `none`. Product-stack invariants that would govern entities, EF, and tenancy filters are false (`entitiesAreClassNotRecord`, `migrationsCliOnly`, `tenancyViaGlobalQueryFilters`, `efOnlyInInfrastructure`, `noInlineHandWrittenMigrations`).

Checks that still apply are docs and tests only: the sibling sweep in T01 and `node test/test-liveness-checkpoints.js` (D1, unchanged D2, existing T1–T9). No authorization attribute, route guard, locale file, or tenant query filter is added.

## 5. Test Coverage

| AC / NS | Step | Test |
|---------|------|------|
| AC1 | T01 | V1:ac1-gates-cadence — `.agents/skills/ws-shared/runtime/gates.md` cadence names same-session Steps 0→9, `ws-ship-pr`, `ws-goal-fix-pr`, hard stops, and host-forced PROTOCOLS pause |
| AC2 | T02 | V2:ac2-skill-table — `.agents/skills/ws-spec-to-pr/SKILL.md` Does column chains through Step 9; Never column forbids voluntary turn end |
| AC3 | T03 | V3:ac3-dispatch-protocols — `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` and `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` match AC1–AC2; pause section is fallback-only |
| AC4 | T04 | V4:ac4-lite-continuous — `.agents/skills/ws-spec-to-pr-lite/SKILL.md` states continuous close, ship, and fix-pr without voluntary host-turn stops |
| AC5 | T05, T09 | V5:ac5-readme-features-wiki — `README.md`, `FEATURES.md`, and `.agents/specs/wiki/delivery/spec-to-pr-pipeline.md` describe continuous `autoMode` plus host-forced fallback; site rebuild only if the wiki source changes |
| AC6 | T06 | V6:ac6-d1-negation — D1 in `test/test-liveness-checkpoints.js` requires chaining and rejects `does not chain host turns`; D2 block unchanged |
| AC7 | T07 | V7:ac7-checkpoint-retained — full `node test/test-liveness-checkpoints.js` keeps checkpoint, `pause-turn`, and `turnPause` cases (T1–T9) |
| AC8 | T08 | V8:ac8-spec-0125-untouched — `git diff` empty for `.agents/specs/completed/0125-us-412-413-liveness-checkpoints.spec.md` |
| AC9 | T08b | V12:ac9-worker-scope — `WORKER-TURN-RULES.md` Scope binds workers only and keeps the orchestrator unattended; `worker_turn_guard.cjs` and `step_coordinator.cjs` unchanged |
| NS1 | T06 | V9:ns1-d1-sabotage — `run_sabotage.cjs --test "npm run test"` exits 0 with `reason: test-failed-as-expected` and non-zero `testExitCode` after an invert that requires `does not chain host turns`; restore matches the pre-invert snapshot |
| NS2 | T01, T03 | V10:ns2-no-pause-every-boundary — review of `.agents/skills/ws-shared/runtime/gates.md` and `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` shows `pause-turn` is not required between `autoMode` step boundaries |
| NS3 | T07 | V11:ns3-regression-suite — `node test/test-liveness-checkpoints.js` fails if `checkpoint`, `pause-turn`, or `turnPause` operations are removed |

Defect-class sibling sweep (repo-wide, T01): active orch and human docs must not use `does not chain host turns` as the primary contract. The completed 0125 spec is the allowed historical hit.

## 6. Stack & Security Invariants Verification Plan

Reiterated `config.json` `invariants`: `entitiesAreClassNotRecord` false, `migrationsCliOnly` false, `tenancyViaGlobalQueryFilters` false, `efOnlyInInfrastructure` false, `noInlineHandWrittenMigrations` false, `commitPlanFilesOnlyAtStep8` true, `skipQualityGates` false. Stack pack `.agents/skills/ws-shared/runtime/stacks/typescript-node.md` applies only as a non-touch checklist: this diff does not add product TypeScript, HTTP routes, or persistence.

Touched framework boundaries:

- Authorization and endpoint protection: not touched. No attributes, policies, or route guards. Check: docs/tests only (V1:ac1-gates-cadence through V4:ac4-lite-continuous).
- Concurrency and async safety: not touched. D1 stays synchronous `fs` plus `assert`. No new floating promises, sync-over-async, or cancellation paths. Check: `node test/test-liveness-checkpoints.js`.
- Input validation and DTO boundary: not touched. No new schema, CLI flag, or injection surface. `checkpoint` / `pause-turn` parsers in `.agents/skills/ws-spec-to-pr/scripts/update_state.cjs` stay as they are (AC7, V7:ac7-checkpoint-retained).
- Subscription and lifecycle cleanup: not touched. No hooks, streams, or listeners.

Checks that still apply: sibling sweep, `node test/test-liveness-checkpoints.js`, and sabotage V9:ns1-d1-sabotage because `verification.mutationTest` is empty. Do not run `scan_stack_invariants.cjs` as a product-boundary gate for this docs-and-test diff. Do not run harness benchmarks.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot prose and `test/` only).
- [ ] Domain entities and mappings encapsulated (none; database type `none`).
- [ ] Schema migrations created (none; migration invariants false).
- [ ] Authorization checks applied (none; no endpoint surface).
- [ ] Stack and security invariants verified as docs/tests only (section 6).
- [ ] i18n keys declared (none; i18n framework `none`).
- [ ] Test cases cover AC1–AC9 and NS1–NS3 (section 5).
- [ ] `.agents/skills/ws-spec-to-pr/scripts/worker_turn_guard.cjs` unchanged (AC9).
- [ ] `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs` unchanged.
- [ ] `.agents/specs/completed/0125-us-412-413-liveness-checkpoints.spec.md` unchanged (AC8).
- [ ] `node test/test-liveness-checkpoints.js` exits 0.
- [ ] When any `.agents/skills/` markdown changed: one `npm run build-site:bump`, then `npm run generate-integrity` and `npm run verify-integrity` after the last hashed edit.
- [ ] When `.agents/specs/wiki/delivery/spec-to-pr-pipeline.md` changed: site rebuild is that same `npm run build-site:bump` (no second bump).
- [ ] Stage only files this work touched. Do not stage unrelated dirty files. Do not run harness benchmarks.

## 8. Open Questions

No open questions. Interview closed every gap (`blocking_open: 0`, `shared_understanding: confirmed`).

| Topic | Decision | Source |
|-------|----------|--------|
| T01–T05 and T08b | Confirm-only on the current tree; edit only a contradictory sentence found on re-read | project |
| Sabotage result | Helper exit 0, `reason: test-failed-as-expected`, `testExitCode` non-zero | project |
| Sabotage command | `npm run test` only (`verification.backendTest`) | project |
| D1 comment | Retitle off the retired `// D1 - AC8` label while editing the assertion | assumed-default |
| Section 7 | Checklist names AC1–AC9 and leaves both worker scripts unchanged | assumed-default |
