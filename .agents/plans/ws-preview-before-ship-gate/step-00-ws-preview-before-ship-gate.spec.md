---
id: null
slug: ws-preview-before-ship-gate
title: Optional ws-preview dry-run gate in ws-ship-pr before Create PR
source: local
specDate: 2026-09-17
step: 0
workflowId: ws-preview-before-ship-gate-20260917T011747Z
status: completed
startedAt: "2026-09-17T01:17:47Z"
endedAt: "2026-09-17T01:21:26.459Z"
acRefs: []
---
# Specification — Optional ws-preview dry-run gate in ws-ship-pr before Create PR

## Description

`ws-ship-pr` ships through preflight, the Prepare-to-PR board, an optional code-review loop, commit and push, PR creation via the configured SCM provider, convergence, merge, and telemetry. The local pipeline review dry-run (`preview.dryRunCommand`, owned by `ws-preview`) was standalone only: nothing ran it automatically in the ship path, so a branch could reach PR creation without ever executing the consumer's dry-run mirror of the review pipeline.

This spec adds one optional, non-blocking gate — Step 4b in `ws-ship-pr` — that reuses `preview.dryRunCommand` exactly as `ws-preview` would run it (no extra flags, no PR threads published). The gate runs after the workflow is completed — in workflow runs the close phase (`status: completed`, delivery commit) has already finished — and after the `ws-ship-pr` Step 4 commit/push step, immediately before the `ws-ship-pr` Step 5 Create PR call. It therefore observes the final pushed tree and runs before any provider `validate-auth` or `create-pr` call, regardless of SCM provider (`github` and `azure-devops` share the gate; provider resolution and `validate-auth` stay inside Step 5). Enablement is `preview.previewBeforeShip`: omitted or any non-`false` value resolves to enabled (default `true`); explicit `false` disables. An empty or whitespace-only `dryRunCommand` also skips with a recorded reason. Failures and findings are reported on the Prepare-to-PR board and shipping always continues to Step 5.

Touchpoints: `.agents/skills/ws-ship-pr/SKILL.md` (Step 4b), `.agents/skills/ws-preview/SKILL.md` (cross-reference note), `.agents/skills/ws-shared/runtime/config.schema.json` (`preview.previewBeforeShip` boolean, default `true`), `.agents/skills/ws-shared/templates/config.json.example` (seed `true`), project `.agents/skills/ws-shared/config.json` (seed `true`), GUI editor `Edit-WorkflowSkillsConfig.ps1` (preview checkbox), and `ws-configure-project/INTERVIEW.md` § Preview (prose plus table row).

## Acceptance Criteria

- AC1: Step 4b is positioned after the workflow close phase (workflow runs: `status: completed`, delivery commit already made) and after the `ws-ship-pr` Step 4 commit and push complete, immediately before Step 5 Create PR, so the dry-run observes the final pushed tree and runs before any provider `validate-auth` or `create-pr` call.
- AC2: The gate runs only when Step 5 Create PR will actually execute; it skips with a recorded reason when `shipAction` is `skip` or `push-only`, when `dry-run` is set, or in standalone runs that will not create a PR.
- AC3: Enablement resolves as enabled unless `preview.previewBeforeShip` is explicit `false` (key omitted or any non-`false` value means enabled, default `true`); explicit `false` skips the gate without running any command.
- AC4: A trimmed empty or whitespace-only `preview.dryRunCommand` skips the gate with a recorded reason (`empty command`); no default reviewer backend is invented and nothing is downloaded.
- AC5: When enabled with a non-empty command, the gate runs that command verbatim from the consumer repo root (git top-level, else `$PWD`) with no extra skill-owned flags and a long-lived call (timeout of at least 600000 ms), under the same never-publish-PR-threads contract as `ws-preview`.
- AC6: The run summary is recorded on the Prepare-to-PR board; a non-zero exit or reported findings are reported to the user and shipping continues to Step 5 regardless — the gate never blocks ship, merge, or PR handoff.
- AC7: The gate is SCM-independent: identical behavior for `providers.scm` `github` and `azure-devops`; no provider CLI recipes are embedded in the gate prose.
- AC8: Config surfaces stay in sync: schema boolean with default `true`, template seed `true`, project config `true` with `_comment_previewBeforeShip`, GUI checkbox under the preview section defaulting to true, and INTERVIEW § Preview documenting the reuse plus the explicit-`false` opt-out.
- AC9: A failing dry-run (non-zero exit) still ends with Step 5 attempted as configured, and no PR threads are published by the gate in any outcome (negative scenario).

## Notes

### Prior Work Sweep

- Local keyword and `git log` sweep on `ws-ship-pr/`, `ws-preview/`, and symbol `previewBeforeShip`: no prior occurrence — the symbol and Step 4b are new in the working tree (uncommitted at spec time).
- Provider PR search (read-only, `providers.scm: github`): PR #214 added the `ws-preview` (pipeline-review) skill and PR #215 shipped it — the dry-run command contract this gate reuses. No prior PR implements a before-ship dry-run gate.
- Related memory trap `ws-preview uses preview.dryRunCommand only` constrains the gate to reuse the configured command verbatim (no invented backends, flags, or wrapper scripts).

### Design Intent

- Prior behavior was intentional, not a regression: the dry-run was standalone (`/ws-preview`) by design, and the ship path relied on the Prepare board plus the code-review loop as pre-PR gates. The gap (branches reaching PR creation without the dry-run ever executing) is the deliberate motivation for this additive gate.
- `git log -p -S "previewBeforeShip"` returns no commits, confirming greenfield symbol introduction on existing skills; no prior constraint is being restored or overridden.
- No dependency-edge change: the gate reuses the configured shell command directly and dispatches no `ws-preview` scripts (that skill ships none), so the install graph is unchanged.

### Workflow Step 8 ordering

- Standard Step 8 (and lite Step 4, same close-then-ship order) runs close phase first (delivery result, G2-delivery commit, MEMORY, changelog, `status: completed`) and dispatches `ws-ship-pr` (`workflowMode: true`, `stopBeforeFixPr: true`, push/PR only) in the ship phase — so the gate runs **after the workflow is completed**, never before close. It runs inside ship, after the G2-delivery commit is pushed, immediately before Create PR; the dry-run therefore observes the final tree including delivery artifacts.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Blocking ship on dry-run findings | Explicit non-blocking contract: report and continue shipping |
| Auto-fixing dry-run findings inside the gate | Fixes belong to review-fix flow or explicit user request, not the gate |
| New reviewer backend or wrapper script | Consumer owns the recipe via `preview.dryRunCommand`; nothing vendored or downloaded |
| PREPARE-CHECKLIST required row for the gate | Board summary only; not a required checklist row and never a STOP |
| `skipQualityGates` interaction change | Informational gate stays independent of quality-gate bypass semantics |
| Version bump in this change | Release versioning happens once per release PR, not per gate edit |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Omitted `previewBeforeShip` means enabled | Default `true` (schema default plus runtime not-explicit-`false` check) | Requested default-true; existing consumers with a configured command get the gate without a config edit | y |
| Gate never blocks ship | Report findings and continue to Step 5 in all outcomes | Requested error semantics; dry-run is advisory, convergence owns quality | y |
| Standalone default runs the gate | Standalone without `dry-run`/`push-only`/`skip` creates a PR, so the gate runs | Consistent with "only when Create PR will actually run" | y |
| Input validation, auth, rate limits, concurrency, ordering, data lifecycle, idempotency, observability hooks, external-dependency fallback, state-transition guards | N/A because this is local skill prose plus one consumer-owned shell invocation: no new endpoints, no shared mutable state, no network writes of its own, and the invoked command owns its own retries and telemetry | Only gate placement, enablement resolution, skip reasons, and board reporting are observable | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Step 4b plus config surfaces in Description; nothing else mutated | Diff vs AC1–AC9 |
| Atomic criteria | Each AC maps to one gate sentence, schema key, or doc line | Reviewer checklist against the diff |
| Failure modes | Non-zero exit, empty command, explicit `false`, skip intents covered | Negative & Failing Test Scenarios NS1–NS5 |
| Observation telemetry | Gate summary on the Prepare board; authoring validation; integrity check | Validation & Observation Notes |
| Open blockers | None | N/A |
| Stack invariants | Skill prose en-us; no host-product coupling; portable path tokens; no internal spec numbers in shipped bodies; hashed skill edits followed by integrity regen | `npm run generate-integrity && npm run verify-integrity`, harness link gate |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug ws-preview-before-ship-gate` resolves this spec-of-record path.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring ".agents/specs/0089-ws-preview-before-ship-gate.spec.md"` exits 0.
- `node test/test-powershell-config-editor.js` verifies the GUI checkbox binding stays green.
- `npm run generate-integrity && npm run verify-integrity` passes after final skill edits.
- `node test/test-harness-clean.js` reports zero findings at the package root.

### Negative & Failing Test Scenarios

- NS1: `dryRunCommand` exits non-zero → gate reports the failure on the board and Step 5 Create PR still runs; fail AC6/AC9 if ship stops.
- NS2: `dryRunCommand` empty or whitespace-only → gate skips with `empty command` reason and runs nothing; fail AC4 if a backend is invented.
- NS3: `preview.previewBeforeShip: false` with a configured command → gate skips without invoking the command; fail AC3 if it runs.
- NS4: `shipAction: push-only` (or `skip`, or `dry-run`) → gate skips with `no PR creation` reason even when enabled and configured; fail AC2 if it runs.
- NS5: Dry-run reports findings with exit 0 → summary recorded, shipping continues, and no PR threads are published; fail AC5/AC6 on extra flags or published threads.
