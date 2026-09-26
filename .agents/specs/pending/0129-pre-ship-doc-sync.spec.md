---
id: null
slug: pre-ship-doc-sync
title: "Pre-ship documentation-sync gate (configurable)"
source: local
specDate: 2026-09-24
---

# Specification — Pre-ship documentation-sync gate (configurable)

## Description

The three post-close documentation surfaces in this package disagree in strength and placement:

- `ws-spec-to-pr` (standard) treats the wiki leg as "offered, not mandatory" (`STEP-DISPATCH.md:152`) while the index leg is a plain close step (`STEP-DISPATCH.md:151`).
- `ws-spec-to-pr-lite` carries the trio inline in its Step 4 close row (`ws-spec-to-pr-lite/SKILL.md:47`).
- Root `AGENTS.md` (Dual-mode close bullet) already phrases all three as a **required** pre-ship step.

This spec adds **one** config switch, `defaults.requirePreShipDocSync` (boolean, default `true`), that makes the **pre-ship doc-sync trio** — `ws-wiki sync {slug}` + `ws-spec-index sync {slug}` + the changelog entry — a **gate-enforced close step** in both orchestrators. The trio is governed by a single flag rather than three flags because it already travels together in both orchs' close rows.

System boundaries:

- Enforcement lives in the orchestrator **close** step (standard Step 8; lite Step 4) and blocks the **ship phase** until every leg completes, honoring the flag. The doc-producing skills (`ws-wiki`, `ws-spec-index`, `ws-changelog`) do not change behavior.
- The wiki leg is conditional: when the project has no wiki (`plans.wikiDir` absent or unconfigured), the leg warn-and-skips with a visible warning; the index and changelog legs stay required. Ships must not be blocked for consumers who never adopted `ws-wiki`.
- With the flag `false`, both orchestrators restore exactly today's behavior (standard: offered-not-mandatory wiki; lite: inline doc sync; index/changelog as today).

Source decision: [`docs/ADR/decision-001-pre-ship-doc-sync.md`](../../docs/ADR/decision-001-pre-ship-doc-sync.md) (D1–D6; status Final). This spec resolves the ADR's residual `Open` items (O3, O4) as stated assumptions.

## Acceptance Criteria

- AC1: `defaults.requirePreShipDocSync` is declared in `{skillsRoot}/ws-shared/runtime/config.schema.json` under `defaults` as `type: boolean`, `default: true`, with a description naming the trio (`ws-wiki sync` + `ws-spec-index sync` + changelog).
- AC2: `{skillsRoot}/ws-shared/templates/config.json.example` seeds `"requirePreShipDocSync": true` under `defaults` with a sibling `_comment_requirePreShipDocSync` explaining the gate and the write-leg fallback.
- AC3: `{skillsRoot}/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` exposes one `defaults` boolean binding for `requirePreShipDocSync` (default `true`) in the Execution & Gates section; `node test/test-powershell-config-editor.js` exits 0.
- AC4: In `ws-spec-to-pr`, when the effective flag is true, the Step 8 close gate blocks the ship phase until `ws-spec-index sync`, the changelog entry, and the wiki leg (or its warn-skip) are recorded. `shipStatus` is not advanced to `pending`/`pushed` while a required leg is outstanding.
- AC5: In `ws-spec-to-pr-lite`, when the effective flag is true, the Step 4 close gate enforces the same trio before the ship gate, with the same blocking semantics as AC4.
- AC6: When the effective flag is true and the wiki is absent or unconfigured (`plans.wikiDir` missing), the wiki leg warn-and-skips with a visible warning in the close output; the gate does **not** block, and the index-sync and changelog legs remain required and recorded.
- AC7: When the effective flag is `false`, both orchs behave exactly as today: standard keeps the wiki leg offered-not-mandatory (no ship block on a missing wiki), lite keeps its inline doc sync, and index/changelog behavior is unchanged. No new gate prompt or block is introduced.
- AC8: An absent, non-boolean, or otherwise invalid `requirePreShipDocSync` value resolves to the effective default `true` at runtime (schema default aligns with the runtime resolution).
- AC9: A regression test (`test/test-pre-ship-doc-sync.js`) asserts: flag-true enforcement in both orchs, wiki-absent warn-skip does not block, flag-false legacy behavior (no gate), and schema/example/GUI default alignment.
- AC10: Re-entering the close gate after a leg already succeeded does not duplicate the changelog entry or the `index.PRD` row (idempotent re-entry).
- AC11: Documentation is reconciled to one strength/placement: root `AGENTS.md` Dual-mode close bullet, `ws-spec-to-pr/STEP-DISPATCH.md` Step 8 rows, the `ws-spec-to-pr-lite` Steps table, and `ws-wiki/SKILL.md` all describe the flag-governed gate consistently; the site is rebuilt.
- AC12: `bin/skill-integrity.json` is regenerated for every changed hashed skill file and `npm run verify-integrity` exits 0.

## Notes

- Gray-area companion: [`0129-pre-ship-doc-sync.context.md`](0129-pre-ship-doc-sync.context.md) records the enforcement-mechanism decision and deferred ideas.
- `### Design Intent` is intentionally omitted: this is a greenfield capability (no prior `requirePreShipDocSync` implementation exists in the tree to diff), so `git log -p -S` has no subject.
- ADR reconciliation: the ADR header says `DRAFT` while `Status` says `Final (accepted)` and the `Open` section repeats O3/O4 under a "None" line. This spec treats D1–D6 as accepted (Final) and disposes of O3 (resolved by D5: gate-enforced close) and O4 (artifact boundary enumerated in AC1–AC12).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Three separate flags (one per doc leg) | ADR D1 settles one flag for the whole trio; separate flags add GUI/config surface with no distinct behavior. |
| Changing `ws-wiki`, `ws-spec-index`, or `ws-changelog` skill semantics | The flag only gates *whether the close step blocks*; the doc-producing skills stay unchanged. |
| Auto-creating a wiki for consumers who never adopted `ws-wiki` | ADR D4: warn-and-skip the wiki leg instead of provisioning documentation. |
| Migrating existing consumer `config.json` files to add the key | Default-on schema resolution covers absent keys; no migration shim (latest-layout-only). |
| Enforcement inside `ws-spec-multi` directly | It delegates to the per-spec orchestrators, which inherit the gate. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Config key name and location (ADR O4 boundary / D3) | `defaults.requirePreShipDocSync`, boolean | `defaults` already holds behavioral gates (`minVerifyScore`, `autoload`, `enableDag`); one GUI checkbox; default on matches the hub required-step intent. | y |
| Enforcement mechanism (ADR O3) | Gate-enforced close step in both orchs | D5 settles gate enforcement; documentation-only "required" repeats the offered-not-mandatory drift being fixed. | y |
| Default value | `true` | D3; hub already phrases the trio as required. | y |
| Absent/invalid value resolution | Effective `true` | Matches schema `default` and the `minVerifyScore` omitted-clamp precedent. | y |
| Wiki-absent detection | `plans.wikiDir` existence (same check as current `STEP-DISPATCH.md:152`) | Reuses the existing conditional already stated for the wiki leg. | y |
| Interaction with `skipQualityGates` | Global bypass skips the gate and logs the bypass, like other gates | Consistent with the existing `[GATES BYPASSED]` contract; avoids a special case. | y |
| Auth boundaries, data lifecycle, rate limiting, data retention | `N/A because` the feature only gates local documentation-sync steps and introduces no network call, credential, or stored-data surface. | These dimensions do not apply to a local close gate. | y |
| ADR header `DRAFT` vs `Status: Final` (ADR body) | Treat D1–D6 as accepted (Final) | The ADR states owner acceptance on 2026-09-24; the `(DRAFT)` header is stale text. | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only the flag, the two orch close steps, schema/example/GUI, tests, hubs, and integrity change. | Compare `git diff --stat` against AC1–AC12 file set; no edits to doc-producing skill semantics. |
| Atomic criteria | AC1–AC12 are single-assertion and countable. | `node test/test-pre-ship-doc-sync.js` reports one result per AC. |
| Failure modes covered | Wiki-absent warn-skip, invalid flag value, and flag-false legacy are each asserted. | Negative scenarios NS1–NS4 in Validation Notes run red before the happy path. |
| Observation telemetry | Named commands and a visible wiki warn-skip warning are defined. | Telemetry section commands exit 0; warn-skip string asserted in the close output. |
| Zero open blockers | O3 disposed by D5, O4 disposed by AC1–AC12, ADR header reconciled. | Assumptions table rows marked `Confirmed: y`; no `TBD`/`TODO` remains. |
| Stack invariants | Node 22 only; no Python; `pathTokens`/`{sharedDir}` tokens used, no host coupling. | `ws-check-harness` Phases 0–5c impacts 0 critical; no `.py` under `.agents/skills/` or `bin/`. |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node test/test-pre-ship-doc-sync.js` exits 0 (new AC-mapped regression suite).
- `node test/test-powershell-config-editor.js` exits 0 (GUI binding parity).
- `npm run test` exits 0 (full alias, after `npm pack`).
- `npm run verify-integrity` exits 0 after `npm run generate-integrity`.
- `ws-check-harness` Phases 0–5c: 0 critical for the changed skills.
- Close-output warning string emitted on the wiki warn-skip path (e.g. `wiki-sync skipped: no wiki configured`).

### Negative & Failing Test Scenarios

- NS1 (wiki absent, flag true): a close run with `plans.wikiDir` absent must **not** block ship and must emit the visible wiki warn-skip; index-sync + changelog legs still recorded. Fails today (no flag/gate exists) and must pass after implementation.
- NS2 (wiki present, flag true, wiki leg not run): the close gate must STOP the ship phase; assert `shipStatus` is not advanced and no PR/push occurs.
- NS3 (flag false): standard close must not block on a missing wiki (legacy offered-not-mandatory) and lite close must match today's inline doc sync; assert no new gate prompt appears.
- NS4 (invalid value): `requirePreShipDocSync` set to a non-boolean must resolve to the effective `true` and behave as enabled, not throw.
