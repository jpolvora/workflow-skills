---
id: 430
slug: us-430
title: "Score 10 on first verify: run format and full test aliases in implement, and do not cap on baseline-dirty"
source: github
specDate: 2026-09-26
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/430"
labels: []
step: 0
workflowId: us-430-20260926T123545Z
status: completed
startedAt: "2026-09-26T06:10:17.682Z"
endedAt: "2026-09-26T06:10:17.682Z"
acRefs: []
---
# Specification — First verify reaches 10 when defects are only outside the change

**State:** open

## Description

A standard `ws-spec-to-pr` Step 5 score is capped at 8 when `ac_ledger.cjs` sets `knownDefect` from a non-zero verification alias. Today a non-skipped alias with `exitCode !== 0` sets `knownDefect` even when the failures are outside workflow `files_touched`, and `ws-implement-tasks` Build mode does not require the same aliases Step 5 scores (`backendFormat`, `frontendTest`, `backendBuild`, `backendTest`).

This change binds three contracts:

1. **Implement validate.** Before the Build-mode handoff, run every configured `config.json` `verification` alias that Step 5 scores. A filtered test command is extra evidence and does not replace `frontendTest` or `backendTest`. For `backendFormat`, run the configured verify command. If it fails, format only files this step created or modified, then re-run. Remaining failures outside `files_touched` are reported in step output and are not an implementation failure.
2. **Verify link.** A non-zero `backendFormat` or build alias is not a scoring defect until failing paths are listed. When none of those paths are in `files_touched`, link `skipReason: baseline-dirty` together with the real `exitCode`. That alias does not set `knownDefect`.
3. **Ledger fail-closed.** `knownDefect` from an alias requires either no `skipReason` and at least one failing path inside `files_touched`, or an explicit product failure. A bare non-zero `exitCode` is not enough.
4. **Interview rewrite.** When `ws-plan-interview` closes a decision that contradicts a one-line acceptance criterion, that sentence is updated in the spec of record and in `{plansDir}/{slug}/step-00-*.spec.md` in the same step, then re-registered, before verify reads the spec.

## Acceptance Criteria

- AC1: Build-mode validate in `ws-implement-tasks` runs each configured scoring alias (`backendFormat`, `backendBuild`, `backendTest`, `frontendTest` when non-empty) before handoff. A filtered test invocation does not satisfy `backendTest` or `frontendTest`.
- AC2: When `backendFormat` fails, the step formats only paths it created or modified and re-runs the alias. Failures that remain only outside `files_touched` are recorded in step output and do not fail the implement step.
- AC3: When a full `frontendTest` or `backendTest` alias exits 0, an earlier filtered run that failed in a setup file this step did not touch does not set ledger `knownDefect`.
- AC4: `ws-plan-verify` does not link a non-zero format or build alias as a scoring defect until failing paths are listed. If none of those paths are in `files_touched`, the link includes `skipReason: baseline-dirty` and the real `exitCode`, and `knownDefect` stays false for that alias.
- AC5: `ac_ledger.cjs` sets `knownDefect` from an alias only when the alias has no `skipReason` and at least one failing path is inside `files_touched`, or when the report marks an explicit product failure. A bare non-zero `exitCode` with no path inside `files_touched` does not set `knownDefect`.
- AC6: When plan interview locks a decision that contradicts a one-line acceptance criterion, that sentence in the spec of record and in `step-00-*.spec.md` matches the locked decision before Step 5 runs, so the criterion is not scored `ImplementedDifferently` solely because the pre-interview sentence remained.
- AC7: A first Step 5 pass scores 10 when the only format failures are outside `files_touched` and every configured test alias exits 0.

## Out of Scope

| Item | Reason |
|------|--------|
| Changing `defaults.minVerifyScore` | The defect is a false `knownDefect`, not the advance threshold |
| Rewriting consumer product code that failed format | Format repair is limited to workflow `files_touched` |
| Auto-fixing environment flakes inside the test runner | The step reports a flake when the full alias passes; it does not patch the runner |
| Lite pipeline step numbers | Contracts stay on standard Step 4 implement, Step 2 interview, and Step 5 verify |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|------------|----------------|-----------|
| Empty verification aliases | Skip aliases whose `config.json` value is empty | This repo leaves several aliases blank; only configured commands are scored |
| Auth, tenancy, i18n, and UI | N/A because the change is skill prose plus the ledger scorer | No network identity, tenant, locale, or rendered UI |
| Which paths count as touched | Workflow `files_touched` already recorded for the run | Same set Step 5 and product commit already use |
| Stack invariants | Node 22 only; ledger logic stays in `ac_ledger.cjs` | Skill scripts must not add a Python helper |

## Definition of Ready (DoR)

| Check | Status |
|-------|--------|
| Scope bounded to `ws-implement-tasks`, `ws-plan-verify`, `ws-plan-interview`, and `ac_ledger.cjs` | Ready |
| Acceptance criteria are pass/fail on ledger fields and spec text | Ready |
| Failure modes named below | Ready |
| Observation commands named below | Ready |
| Open blockers | None |
| Stack invariants | Scoring changes stay in the existing Node ledger script. No new interpreter. Async script steps that shell out must await the child result before linking `exitCode`. |

## Validation & Observation Notes

Telemetry:

- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0133-us-430.spec.md` exits 0.
- A ledger fixture with `backendFormat` `exitCode` 2, `skipReason: baseline-dirty`, and no path inside `files_touched` reports `knownDefect: false`.
- A ledger fixture with the same exit and a failing path inside `files_touched` and no `skipReason` reports `knownDefect: true`.
- Skill text for implement validate names the configured full aliases, not a filtered substitute.

### Negative & Failing Test Scenarios

- Negative 1: `backendFormat` exits non-zero, no failing path is inside `files_touched`, and `skipReason` is omitted. The score must not treat that alias as `knownDefect`.
- Negative 2: `backendFormat` exits non-zero and a failing path is inside `files_touched` with no `skipReason`. `knownDefect` must be true and the score must stay at or below 8.
- Negative 3: A filtered frontend test exits non-zero and the configured full `frontendTest` alias exits 0 with no product edit. `knownDefect` must stay false.
- Negative 4: Interview text changes an acceptance sentence in the refined plan only. Verify must still see the updated sentence in `step-00-*.spec.md`. If it does not, the criterion may be `ImplementedDifferently` and this AC fails.
- Negative 5 (stack): A new Python helper under `.agents/skills/` for this scoring rule must fail `ws-check-harness` (Node-only skill runtime).

## Original Issue Context

Title: Score 10 on first verify: run format and full test aliases in implement, and do not cap on baseline-dirty

URL: https://github.com/jpolvora/workflow-skills/issues/430

## What happened

A standard `ws-spec-to-pr` run implemented the planned feature, and the first Step 5 ledger score was **8/10** (`knownDefect: true`). A second pass changed nothing about product behavior and the same ledger scored **10/10**.

The cap came from two alias results linked with a real non-zero `exitCode`:

- `backendFormat` (`dotnet format --verify-no-changes`) exited 2 on whitespace in files the implementation step had not edited.
- `frontendTest` (`cd web && npm test`) exited 1. The implementer had invoked a filtered Vitest run that died in global setup before any test body. A later full `npm test` exited 0 (all suites) with no change to the Vitest setup.

`ImplementedDifferently` on one acceptance criterion (interview overrode the spec sentence) did **not** keep the score at 8 once those aliases were green.

## Why the first run could not reach 10

`ws-implement-tasks` Build mode step 7 says to run build and unit tests for modified layers. It does not require the verification aliases that `ac_ledger` treats as score inputs (`backendFormat`, `frontendTest`, `backendBuild`, `backendTest`). A filtered or partial command can fail for an environment reason, get recorded as a product defect, and cap the score at 8.

`ws-plan-verify` already says to link `skipReason: baseline-dirty` when a format or build alias fails only on paths outside `files_touched`, and that a non-zero real exit still sets `knownDefect`. On this run the verifier linked `exitCode: 2` with no `skipReason`, so pre-existing whitespace capped the score. The instruction exists; it is easy to skip, and there is no fail-closed check that a non-zero format result must include the offending paths before it can set `knownDefect`.

Interview closed a behavior that contradicted a one-line acceptance criterion (reject does not credit a hold; the spec still said it releases a locked balance). The refined plan recorded the decision. The spec of record and `step-00` copy kept the original sentence, so verify marked that criterion `ImplementedDifferently`. That should be rewritten during refinement so the spec the scorer reads matches the locked decision.

## Proposed change

**`ws-implement-tasks` (Build mode, Validate)**

- Before the step handoff, run every configured `config.json` `verification` alias that Step 5 will score, not only a filtered test for the new class.
- `backendFormat`: run `--verify-no-changes`. If it fails, format only files this step created or modified, then re-run. If the remaining failures are outside `files_touched`, say so in `step-output` and do not treat them as an implementation failure.
- `frontendTest` / `backendTest`: run the configured command (full alias). A filtered run is extra evidence, not a substitute. If the full command fails only in a setup file this step did not touch, and a second full run passes with no product edit, report that as an environment flake instead of a failed feature.

**`ws-plan-verify`**

- Do not link a non-zero `backendFormat` or build alias as a scoring defect until the failing paths are listed.
- If none of those paths are in workflow `files_touched`, link `skipReason: baseline-dirty` and the real `exitCode`. `knownDefect` stays false for that alias.
- Add a ledger check: `knownDefect` from an alias requires either no `skipReason` and at least one failing path inside `files_touched`, or an explicit product failure. A bare non-zero exit is not enough.

**Spec refinement (`ws-plan-interview` / refined plan)**

- When the user closes a decision that contradicts a one-line acceptance criterion, update that sentence in the spec of record and in `step-00-*.spec.md` in the same step, then re-register. The scorer must not see the pre-interview wording.

## Done when

- A first Step 5 pass scores 10 when the only format failures are outside `files_touched` and the configured test aliases exit 0.
- A filtered test failure that the full alias does not reproduce does not set `knownDefect`.
- An interview override of an acceptance criterion is visible in `step-00` before verify runs.

### Prior Work Sweep

No pull request is tied to issue 430. Keyword search returned no matching pulls. `git log` on `ws-implement-tasks/SKILL.md`, `ws-plan-verify/SKILL.md`, and `ac_ledger.cjs` shows later unrelated releases. None close issue 430.

### Design Intent

`ac_ledger.cjs` currently sets `knownDefect` when any non-skipped alias has `exitCode !== 0`. `ws-plan-verify` already documents `skipReason: baseline-dirty`, and the scorer still treats a linked non-zero exit without that reason as a defect. This spec changes that fail-open path into a fail-closed rule. It is not a restore of a removed check.

## Notes

Lookup: no MEMORY hit for `baseline-dirty` scoring. Stack is the Node 22 skill package. The issue has no visual attachments and no comments.
