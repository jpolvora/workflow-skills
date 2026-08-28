---
slug: spec-dor-tdd-refinement-hardening
title: "Harness: Spec Creation Hardening with Definition of Ready, Validation Notes, and TDD Execution Protocol"
status: active
step: 2
workflowId: spec-dor-tdd-refinement-hardening-20260828T042229Z
sourcePlan: step-01-spec-dor-tdd-refinement-hardening.plan.md
shared_understanding: confirmed
acRefs: []
startedAt: "2026-08-28T04:26:15Z"
endedAt: "2026-08-28T04:56:20.725Z"
---
## 0. Summary & Binding Decisions

Finish the DoR / Validation Notes / TDD hardening wave without rewriting work already on `develop`. Commit `73aa9aa2` landed FORMAT, authoring validation, write-spec / interview / implement-tasks / verify-plan contracts, and the named test files. This refined plan gap-fills what that wave left broken or untested: **start-anchored ledger ingest**, **steal-case + header-only tests**, and **harness**.

Interview autoMode closed every draft §8 question from project evidence. Implementers must follow these bindings; do not re-open them.

**Bindings**

1. **Compat stays the CLI default.** `validate_spec.cjs` keeps `mode: 'compat'` when `--mode` is omitted. Historical specs warn on missing DoR / Notes / negative subsection; they do not fail. New `ws-write-spec` writes always run `--mode=authoring`.
2. **Authoring is fail-closed.** `--mode=authoring` requires DoR data rows (not header-only), non-placeholder Validation Notes, and `### Negative & Failing Test Scenarios` with at least one non-placeholder bullet. Header-only DoR or TBD-only Notes is FAIL. Any non-placeholder Notes body without the negative subsection is still FAIL.
3. **TDD is instruction-plus-evidence, not a new runner.** No language-specific TDD harness. No new FSM states.
4. **Ledger ingest is ingest-only.** `ac_ledger.cjs` parses Negative bullets from the real Notes section. It must not re-implement authoring heading checks. Uncovered `negativeScenarios` remain a Step 5 `knownDefect` cap at 8 (standard orch).
5. **Do not duplicate landed skill prose.** AC1–AC7 contracts already match on `develop`. Leave `SKILL.md` / `FORMAT.md` / `validate_spec.cjs` authoring rules untouched unless a named grep misses.
6. **Interview Subagent contract stays generic.** Audit step (not the Subagent contract) is the SoT for DoR grilling and the failing-test-baseline gap. Do not paste the Audit sentence into the Subagent contract.
7. **No root `AGENTS.md` §6 edit.** Dogfood snapshot already lists DoR and Validation Notes. Live `ws-write-spec` requires the negative subsection. This wave does not change that authoring contract, so do not add hub prose.
8. **Do not fix `validate_spec.cjs` unanchored `## Description` capture.** Same defect class, different feature, not in the AC list. Record it on the sibling sweep as a remaining hit.
9. **V9 steal-case lives in `test/test-ac-ledger.js` (SoT) and a thin assert in `test/test-spec-dor-tdd.js` (AC8 named file).** T03 owns both asserts and the red observation. T04 must not re-add V9 after green.
10. **V10 header-only DoR fixture is required** (MEMORY Medium). Characterization of existing `dor-empty`. Add under T04. If authoring unexpectedly PASSES, that is red for a T01 validator fix.
11. **This workflow's `{us-dir}/ac-ledger.json` currently has `negativeScenarios: []`** because Step 0 init hit the steal bug (AC1/AC2 inline backticks). Implementers must not rewrite that plans-dir file. Orch re-inits at Step 5 after the product fix.

**Security / safety:** no secrets, no host product names in skill bodies, author only `$PWD/.agents/skills/ws-*` plus `test/` and required harness docs. Never write `{globalSkillsRoot}/ws-*`. Never stage `{plansDir}`.

## 1. Definition of Ready & Scope

**Ready**

- Canonical spec: `.agents/plans/spec-dor-tdd-refinement-hardening/step-00-spec-dor-tdd-refinement-hardening.spec.md` (record also at `.agents/specs/0051-spec-dor-tdd-refinement-hardening.spec.md`).
- Stack: Node 22 skills package (`config.json` `stack.id` = `node-skills-package`). Layers: `skills-sot` (`.agents/skills`), `tests` (`test/`). No frontend, DB, or i18n.
- Confirmed assumptions: CLI default `--mode=compat`; authoring requires DoR + Notes + negative subsection; TDD = fail tests before code edits.
- MEMORY (Medium+): authoring fixtures need DoR data rows and non-placeholder Notes; authoring must require the negative subsection (compat warn-only; ledger ingest-only); verify score fail-closes on uncovered negatives; unanchored `negativeScenariosFromSpec` can steal inline AC backticks (start-anchor ingest only).
- Scenario probes (soft-deletion, concurrency, list sizing, rate limits): **N/A** (no entities, API, or shared store).

**Sweep (do not redo unless drift)**

| AC | Landed surface | Status |
|----|----------------|--------|
| AC1 | `.agents/skills/ws-spec-format/FORMAT.md` DoR table + Notes + negative subsection + authoring FAIL copy | Present |
| AC2 | `.agents/skills/ws-spec-format/scripts/validate_spec.cjs` `readinessFindings` / `negativeScenarioFindings`; `test/test-validate-spec.js` missing/empty/pass/telemetry-only/compat cases | Present; **V10 header-only fixture missing** |
| AC3 | `.agents/skills/ws-write-spec/SKILL.md` Agentic Reformulation Protocol (atomic ACs, negative failure, observation notes, DoR); `--mode=authoring` on new writes | Present |
| AC4 | `.agents/skills/ws-interview/SKILL.md` Audit step: DoR audit + blocking gap when a task lacks a failing test baseline | Present (Audit step, not Subagent contract) |
| AC5 | `.agents/skills/ws-implement-tasks/SKILL.md` Build mode TDD cycle (failing tests first, false-positive hazard, then green) | Present |
| AC6 | `ws-verify-plan/SKILL.md` maps negative tests; uncovered `negativeScenarios` cap score at 8 | Skill present; **ingest stolen by unanchored match** |
| AC7 | `validate_spec.cjs` default `mode: 'compat'`; `test/test-validate-spec.js` compat exit 0 + WARN | Present |
| AC8 | `test/test-spec-dor-tdd.js` + `test/test-validate-spec.js` already in `package.json` `tests:harness-efficiency` | Present; **missing steal-case + header-only DoR fixture** |
| AC9 | Harness / `npm test` / integrity after any hashed edit | Not yet run for this remaining gap |

**Failing-test baselines (DoR — blocking if missing)**

| Task | Baseline before any product edit |
|------|----------------------------------|
| T01 | Run existing V1–V4 (`node test/test-spec-dor-tdd.js`, `node test/test-validate-spec.js`). Expect green if no drift. On grep miss: add/adjust the named assert, observe red, then patch FORMAT/validator. Do not rewrite first. |
| T02 | Run existing V5–V7. Same drift protocol. |
| T03 | **Named red:** V9 steal-case in `test/test-ac-ledger.js` plus thin `negativeScenariosFromSpec` assert in `test/test-spec-dor-tdd.js`. Against unmodified `ac_ledger.cjs`, `negativeScenarios.length` is 0 (this workflow's Step 0 ledger is the live proof). Observe that failure, then change the regex. |
| T04 | **Named negative:** V10 header-only DoR fixture must FAIL `--mode=authoring` (`dor-empty`). Existing validator already implements this; if the new test is unexpectedly green-on-PASS (authoring exit 0), that is red for T01. Do not re-add V9. |
| T05 | No new behavior. Named check is `npm test` + `ws-check-harness` (V11). Integrity only if T03 hashed `ac_ledger.cjs`. |

**Remaining in scope**

- T01 verify-only for AC1 / AC2 / AC7 (drift protocol above).
- T02 verify-only for AC3 / AC4 / AC5 (edit skill bodies only on grep drift, after a red assert).
- T03 start-anchor `negativeScenariosFromSpec` (AC6 runtime). TDD: red V9, then regex fix. Sibling sweep. Sabotage.
- T04 AC8 V10 header-only DoR fixture; confirm V9 already in the two AC8 named files.
- T05 AC9 `npm test`, integrity if hashed files change, `ws-check-harness`. No `AGENTS.md` / `FEATURES.md` prose.

**Out of scope**

- Retroactive DoR on historical specs.
- Language-specific TDD runners or replacing FSM states.
- Duplicating authoring heading checks inside `ac_ledger.cjs`.
- Rewriting landed FORMAT / validator / skill contracts that already match ACs.
- Editing `C:/Users/jpolv/.agents/skills/ws-*`.
- Repeating the Audit sentence in the Interview Subagent contract.
- Root `AGENTS.md` §6 negative-subsection phrase.
- `validate_spec.cjs` unanchored `## Description` capture.
- Rewriting `{plansDir}` `ac-ledger.json` as a product file.

**AC → plan step**

| AC | Plan step | Task |
|----|-----------|------|
| AC1 | T01 | T01 |
| AC2 | T01, T04 | T01, T04 |
| AC3 | T02 | T02 |
| AC4 | T02 | T02 |
| AC5 | T02 | T02 |
| AC6 | T03 | T03 |
| AC7 | T01 | T01 |
| AC8 | T03, T04 | T03, T04 |
| AC9 | T05 | T05 |

## 2. Technical Design & Architecture

**Layers**

| Layer | Path | Edits |
|-------|------|--------|
| skills-sot | `.agents/skills` | Expected product edit: `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` only, unless T01/T02 grep finds drift |
| tests | `test/` | `test/test-ac-ledger.js`, `test/test-spec-dor-tdd.js`, `test/test-validate-spec.js` |
| harness docs | `AGENTS.md`, `FEATURES.md` | **No edits** (bindings 7; FEATURES already has the 0.3.46 DoR+TDD row and the `negativeScenarios` score cap) |
| installer-cli | `bin` | No behavior change; `npm run generate-integrity` if hashed skill files change |

No schema, API, UI, tenancy, or i18n. `invariants.commitPlanFilesOnlyAtStep8` stays true. Fable domain auto-detect does not apply (not IaC / K8s / Docker / migrations).

**Design intent (`git log -S`)**

- `73aa9aa2` introduced DoR + TDD skill contracts and authoring validation. That is the intended behavior: authoring fail-closed, compat warn-only, TDD in implement-tasks, negatives scored in verify-plan.
- `negativeScenariosFromSpec` matching `## Validation & Observation Notes` without a start-of-line anchor is an accidental ingest bug, not a design to treat inline AC backticks as a section. This spec's AC1 and AC2 lines contain that heading in backticks, so Step 0 `ac_ledger.cjs init` stored `negativeScenarios: []` even though the spec body has three Negative bullets.

**Ingest fix (T03)**

Current (both matches unanchored):

```js
text.match(/## Validation & Observation Notes[\s\S]*?(?=\n## |$)/i)
notes.match(/### Negative & Failing Test Scenarios[\s\S]*?(?=\n### |\n## |$)/i)
```

Required: start-of-line (multiline `^`) heading, then slice until the next same-level heading. Same start-anchor for `### Negative & Failing Test Scenarios` inside that slice. Keep placeholder / TBD filters. Do **not** import or copy `validate_spec.cjs` `headingPresent` into the ledger. Do **not** fail init when the subsection is missing (ingest-only; empty array is valid for historical specs).

Preferred shape (mirror `headingPresent` / `sectionBody` locally, do not require `validate_spec.cjs`):

```js
function sliceHeading(text, heading, nextRe) {
  const start = text.search(new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im'));
  if (start < 0) return '';
  const rest = text.slice(start);
  const cut = rest.search(nextRe);
  return cut < 0 ? rest : rest.slice(0, cut);
}
```

Notes: `heading = '## Validation & Observation Notes'`, `nextRe = /\n## /`. Inner: `heading = '### Negative & Failing Test Scenarios'`, `nextRe = /\n### |\n## /`.

**TDD for T03 (mandatory)**

1. Add the steal-case fixture **first** (AC line containing the Notes heading in backticks **plus** a later start-of-line Notes section with three Negative bullets). Keep the existing clean `ns.spec.md` case (one bullet, no AC backticks).
2. Add the thin AC8 assert in `test/test-spec-dor-tdd.js` that calls exported `negativeScenariosFromSpec` on the same shape.
3. Run both against unmodified `ac_ledger.cjs`. Expect `negativeScenarios.length === 0` today (red for the new assertion that wants 3).
4. Then change the regex. Do not edit `ac_ledger.cjs` before that red observation.

Steal-case fixture must include (order matters):

- `- ACn: ... \`## Validation & Observation Notes\` ...` before any start-of-line Notes heading
- later `## Validation & Observation Notes` then `### Negative & Failing Test Scenarios` with three non-placeholder bullets
- Assert `length === 3` and `NS1` text matches the first real bullet

**Sibling sweep (defect class: unanchored `## ` section steal)**

Repo-wide grep in `.agents/skills/**/*.cjs` for `match(/## ` without `^` / `(?:^|\\n)`. Known sibling: `validate_spec.cjs` Description capture (`text.match(/## Description\s*\n.../)`) is also unanchored. **Do not change it** (binding 8). Ledger is the only ingest path for `negativeScenarios`. List remaining hits with path + reason.

**Sabotage (mutation unset)**

`verification.mutationTest` is empty and `defaults.skipMutationTesting` is true. For the ingest regression, name `python .agents/skills/ws-testing/scripts/run_sabotage.py` with an invert patch that removes the start-anchor. Required sabotage miss → `knownDefect` cap 8 at Step 5. Restore failure aborts.

## 3. Step-by-Step Plan

### T01 — Confirm authoring format + validator (AC1, AC2, AC7)

**ACs:** AC1 AC2 AC7  
**Tests:** V1 V2 V3 V4  
**Files (read unless drift):** `.agents/skills/ws-spec-format/FORMAT.md`, `.agents/skills/ws-spec-format/scripts/validate_spec.cjs`, `test/test-validate-spec.js`, `test/test-spec-dor-tdd.js`

1. Grep FORMAT for DoR table columns (`Readiness Item`), Notes, and `### Negative & Failing Test Scenarios` plus authoring-fail copy. If present, **do not rewrite**.
2. Confirm `validate_spec.cjs` default `mode: 'compat'`, authoring fail-closed on missing/empty DoR, missing/placeholder Notes, missing/placeholder negative subsection. `headingPresent` is already start-anchored; leave it.
3. Run V1–V4 first (expect green). On grep miss: add/adjust the named assert, observe red, then patch. Never rewrite skill/FORMAT before a red observation.
4. V10 header-only fixture is **T04**, not T01, unless V10 reveals authoring PASS (then T01 fixes `dor-empty` with that test as the red baseline).

Engineering check: `node test/test-validate-spec.js` exit 0. Do not change compat default.

### T02 — Confirm write-spec, interview, implement-tasks contracts (AC3, AC4, AC5)

**ACs:** AC3 AC4 AC5  
**Tests:** V5 V6 V7  
**Files (read unless drift):** `.agents/skills/ws-write-spec/SKILL.md`, `.agents/skills/ws-interview/SKILL.md`, `.agents/skills/ws-implement-tasks/SKILL.md`, `test/test-spec-dor-tdd.js`

1. AC3: Agentic Reformulation Protocol still requires atomic ACs, `### Negative & Failing Test Scenarios`, observation notes, and DoR. Draft step still runs `--mode=authoring`. Edit only if grep misses those tokens, and only after a red string-assert.
2. AC4: Audit step still audits the plan against spec DoR and registers a **blocking** gap when a task lacks a failing test baseline. **Do not** duplicate that paragraph into the Interview Subagent contract (lean; Audit is SoT).
3. AC5: Build-mode TDD cycle still says failing tests first against unmodified code, false-positive hazard if they pass, then minimal green. Keep Lite vs standard ledger-link wording. No new TDD runner.

Engineering check: existing `test/test-spec-dor-tdd.js` string asserts still pass. No product edit unless drift.

### T03 — Start-anchor ledger negative ingest (AC6, AC8 ingest)

**ACs:** AC6 AC8  
**Tests:** V8 V9  
**Files:** `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`, `.agents/skills/ws-verify-plan/SKILL.md` (read), `test/test-ac-ledger.js`, `test/test-spec-dor-tdd.js`

1. Confirm `ws-verify-plan/SKILL.md` already maps negative tests and caps uncovered `negativeScenarios` at 8. **Do not rewrite** that skill unless grep misses `negativeScenarios` / `knownDefect`.
2. **Red first:** extend `test/test-ac-ledger.js` with the steal-case fixture (three bullets). Add a thin `negativeScenariosFromSpec` assert in `test/test-spec-dor-tdd.js` so the named AC8 file covers ingest. Run both **before** editing `ac_ledger.cjs`. Expect `length === 0`.
3. **Green:** start-anchor outer Notes and inner Negative headings (see §2). Keep TBD filters. No heading-presence errors on init.
4. **Sibling sweep:** grep `.agents/skills` for unanchored `## Validation & Observation Notes` / `### Negative & Failing Test Scenarios` ingest. Fix only ledger ingest. Record `validate_spec.cjs` Description capture as remaining (path + reason).
5. **Sabotage:** invert the start-anchor; steal-case must fail; restore. Record in Step 5 evidence.

Engineering check: `node test/test-ac-ledger.js` and `node test/test-spec-dor-tdd.js` exit 0. Re-init of this workflow's `{plansDir}` ledger is orch-owned, not a product file.

### T04 — Named tests for authoring, DoR, TDD, ingest (AC8)

**ACs:** AC8 AC2  
**Tests:** V1 V2 V3 V5 V6 V7 V8 V9 V10  
**Files:** `test/test-spec-dor-tdd.js`, `test/test-validate-spec.js`, `test/test-ac-ledger.js`

Keep existing asserts. Add only:

- V10 header-only DoR authoring FAIL (heading + separator, zero data rows) in `test/test-validate-spec.js`. Assert non-zero exit and `dor-empty` / non-placeholder readiness message.
- Confirm V9 already exists from T03 in both AC8 named files. **Do not** re-implement steal-case here (would hide the red observation).
- Do not treat telemetry-only Notes as PASS (already V3).

Keep both files on `package.json` `tests:harness-efficiency`. Do not add a third named suite as a substitute for AC8's two files. `test/test-ac-ledger.js` stays the ledger SoT helper (already on the same npm script).

### T05 — Harness, integrity (AC9)

**ACs:** AC9  
**Tests:** V11  
**Files:** hashed skill tree only if T03 edited `ac_ledger.cjs` (integrity regen); no `AGENTS.md` / `FEATURES.md` edits

1. `npm test` (config `verification.backendTest`).
2. If T03 changed hashed `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`, run `npm run generate-integrity` and `npm run verify-integrity` in the same change set.
3. `ws-check-harness` Phases 0–5c → 0 critical.
4. Do not add an ingest-regex feature card. Do not edit root `AGENTS.md` §6.

## 4. Permissions, Tenancy & i18n

N/A. Portable en-us skill and test wording only. No RBAC, tenant filters, or i18n keys. No host/IDE product names in edited skill bodies.

## 5. Test Coverage

| AC | Test id | Case | Method / file |
|----|---------|------|----------------|
| AC1 | V1 | FORMAT documents DoR table, Notes, negative subsection, authoring-fail copy | `test/test-spec-dor-tdd.js` `assert.match` on `.agents/skills/ws-spec-format/FORMAT.md` |
| AC2 | V2 | Authoring FAIL missing DoR, missing Notes, placeholder Notes | `test/test-validate-spec.js` `missingDorRun` / `missingNotesRun` / `emptyNotesRun` |
| AC2 | V3 | Authoring FAIL telemetry-only Notes (no negative subsection) | `test/test-validate-spec.js` `telemetryOnlyRun` |
| AC2 | V10 | Authoring FAIL header-only DoR (heading + separator, no data row) | `test/test-validate-spec.js` new fixture |
| AC3 | V5 | write-spec protocol: atomic/negative failure/observation notes/DoR | `test/test-spec-dor-tdd.js` matches on `.agents/skills/ws-write-spec/SKILL.md` |
| AC4 | V6 | interview DoR audit + failing test baseline | `test/test-spec-dor-tdd.js` matches on `.agents/skills/ws-interview/SKILL.md` |
| AC5 | V7 | implement-tasks failing tests first + false-positive | `test/test-spec-dor-tdd.js` matches on `.agents/skills/ws-implement-tasks/SKILL.md` |
| AC6 | V8 | verify-plan negative test / `negativeScenarios` | `test/test-spec-dor-tdd.js` matches on `.agents/skills/ws-verify-plan/SKILL.md` |
| AC6 | V9 | Ingest ignores inline AC backticks; reads start-of-line Notes (3 bullets) | `test/test-ac-ledger.js` + thin `negativeScenariosFromSpec` assert in `test/test-spec-dor-tdd.js`; **red before** `ac_ledger.cjs` edit |
| AC7 | V4 | Omit `--mode` (compat): exit 0 + WARN for missing DoR / negatives | `test/test-validate-spec.js` `compat` / `compatTelemetry` |
| AC8 | V1–V10 | Named suites cover authoring, DoR, TDD contracts, ingest | `test/test-spec-dor-tdd.js`, `test/test-validate-spec.js` (ingest helper in `test/test-ac-ledger.js`) |
| AC9 | V11 | Full package tests + harness 0 critical; integrity if hashed | `npm test`; `ws-check-harness`; `npm run generate-integrity` when T03 edits `ac_ledger.cjs` |

**V9 defect-class sibling sweep:** grep unanchored Notes/Negative heading ingest under `.agents/skills`. Exempt `validate_spec.cjs` Description capture (record path + reason; do not patch).

**V9 sabotage:** `python .agents/skills/ws-testing/scripts/run_sabotage.py` invert start-anchor; steal-case must fail; restore.

## 6. Invariants (Do Not Violate)

- `invariants.commitPlanFilesOnlyAtStep8` = true. Never `git add` `{plansDir}`. Never `git add -A`.
- Stay on branch `develop`. Do not commit or push from this plan step.
- Author `$PWD/.agents/skills/ws-*` only. Never write `{globalSkillsRoot}/ws-*`.
- CLI default remains `--mode=compat`. Do not flip the default to authoring.
- Authoring requires DoR data rows + Notes + negative subsection. Compat warns only.
- Ledger ingest-only: no duplicate heading FAIL codes inside `ac_ledger.cjs`.
- No new FSM states. No language-specific TDD runner.
- Shared pipeline skills stay orch-agnostic (Lite vs standard already called out in implement-tasks; do not invent Step-number coupling).
- en-us in skill bodies, gates, banners.
- Surgical diffs: no drive-by FORMAT/SKILL rewrites when grep already matches.
- T03 observes V9 red before any `ac_ledger.cjs` edit. T04 does not re-add V9.

## 7. Pre-PR Checklist

- [x] Layer boundaries respected (skills-sot + tests; no installer CLI behavior change; no hub prose).
- [x] Domain entities and mappings encapsulated. **N/A**
- [x] Schema migrations created. **N/A**
- [x] Authorization checks applied. **N/A**
- [x] i18n keys declared. **N/A**
- [x] Test cases cover all ACs (V1–V11).
- [x] T03 observed red on steal-case before `ac_ledger.cjs` edit.
- [x] Sibling sweep recorded (path + reason for any remaining unanchored `## ` ingest).
- [x] Sabotage invert of start-anchor recorded when mutation remains unset.
- [x] `npm test` exit 0.
- [x] Integrity regenerated iff hashed skill files changed.
- [x] `ws-check-harness` 0 critical.

## 8. Open Questions

None remaining. Interview autoMode round 1 closed every draft §8 item from project evidence (see ## Interview registry). Implementers must follow §0 bindings; do not re-open these choices.

Closed (was draft §8):

1. Interview Subagent contract vs Audit step (AC4) → leave Subagent contract generic.
2. Root `AGENTS.md` §6 Negative subsection (AC9 hub) → skip; no hub phrase this wave.
3. `validate_spec.cjs` unanchored `## Description` capture → do not change; list on sibling sweep.
4. V10 header-only DoR fixture → add in T04 (MEMORY Medium).
5. Where V9 lives → `test/test-ac-ledger.js` SoT **and** thin assert in `test/test-spec-dor-tdd.js`; T03 owns both.

## Interview registry

| id | class | section | gap | recommendation | status | resolution | resolutionSource | evidence | dependsOn |
|----|-------|---------|-----|----------------|--------|------------|------------------|----------|-----------|
| G1 | blocking | §3 T01 | T01 could rewrite FORMAT/validator on grep miss without a red observation | Named existing V1–V4 first; on drift, add/adjust assert, observe red, then patch | closed | Verify-only unless drift. Drift uses the named assert as the failing baseline before any FORMAT/validator edit. V10 stays T04. | project | `test/test-spec-dor-tdd.js` V1; `test/test-validate-spec.js` V2–V4 already green; FORMAT.md DoR + Notes + negative subsection present; `validate_spec.cjs` `mode: 'compat'` L16 | |
| G2 | blocking | §3 T02 | T02 could rewrite skill bodies on grep miss without a red observation | Named existing V5–V7 first; on drift, red assert then patch | closed | Verify-only unless drift. Do not paste Audit into Subagent contract. | project | `ws-write-spec/SKILL.md` Agentic Reformulation + `--mode=authoring`; `ws-interview/SKILL.md` Audit failing-test baseline; `ws-implement-tasks/SKILL.md` failing tests first + false-positive; `test/test-spec-dor-tdd.js` V5–V7 | G6 |
| G3 | blocking | §3 T03 | Product ingest fix without a named red steal-case | Add V9 (3-bullet steal fixture + thin AC8 assert) and observe `length === 0` before regex change | closed | T03 owns V9 red then start-anchor both Notes and inner Negative headings. Keep ingest-only (no heading FAIL on init). | project | `ac_ledger.cjs` L54–56 unanchored matches; `{us-dir}/ac-ledger.json` `negativeScenarios: []` despite three spec bullets; `test/test-ac-ledger.js` clean `ns.spec.md` currently passes because it has no AC backticks | |
| G4 | blocking | §3 T04 / T03 | T04 re-adding V9 after T03 greened would hide the red observation | T03 owns V9; T04 only adds V10 and confirms AC8 files still list ingest | closed | Do not re-implement steal-case in T04. AC8 mapping: thin assert in `test/test-spec-dor-tdd.js` plus SoT in `test/test-ac-ledger.js`. | project | Spec AC8 names those two files; `package.json` `tests:harness-efficiency` already includes both plus `test-ac-ledger.js` | G3 |
| G5 | blocking | §3 T05 | T05 has no failing-test baseline | Treat AC9 as a pass-gate (`npm test` + `ws-check-harness`), not new behavior | closed | No hub prose. Integrity regen only if T03 hashed `ac_ledger.cjs`. | project | Spec AC9; `verification.backendTest` = `npm run test`; FEATURES.md already has 0.3.46 DoR+TDD row and `negativeScenarios` cap | G7 |
| G6 | non-blocking | §8 Q1 / AC4 | Whether to repeat Audit sentence in Interview Subagent contract | Leave Subagent contract generic (lean) | closed | Audit step remains SoT. V6 already matches Audit, not Subagent. | project | `ws-interview/SKILL.md` Audit L53 vs Subagent L91–97; `SKILL_AUTHORING.md` remove duplicate instructions; `test/test-spec-dor-tdd.js` L18–20 | |
| G7 | non-blocking | §8 Q2 / AC9 | Root `AGENTS.md` §6 omits `### Negative & Failing Test Scenarios` | Skip hub phrase; live `ws-write-spec` is the consumer contract | closed | This wave does not change the authoring contract already landed in `73aa9aa2`. Compact snapshot already lists DoR and Validation Notes. | project | `AGENTS.md` §6 L285; `ws-write-spec/SKILL.md` L62–65; remaining scope = ingest + steal-case + harness | |
| G8 | non-blocking | §8 Q3 / §2 sibling | `validate_spec.cjs` unanchored `## Description` capture is the same defect class | Do not change in this spec | closed | Record as remaining sibling hit with path + reason. Ledger is the only `negativeScenarios` ingest path. | project | Spec AC list omits Description capture; `validate_spec.cjs` L271; Out of Scope does not include validator Description | G3 |
| G9 | non-blocking | §8 Q4 / V10 | Header-only DoR fixture missing despite `dor-empty` | Add V10 in T04 | closed | Characterization of existing fail-closed table parse. If authoring PASSES, T01 must fix with V10 as red. | project | MEMORY 2026-08-27 Authoring fixtures (Medium): DO NOT treat header-only DoR as PASS; `readinessFindings` `dor-empty` L148–155; `test/test-validate-spec.js` has no header-only fixture | |
| G10 | non-blocking | §8 Q5 / V9 | AC8 does not name `test/test-ac-ledger.js` | Implement steal-case in ledger SoT **and** thin AC8 assert | closed | T03 adds both. Do not drop the AC8 file coverage. | project | Spec AC8; `ac_ledger.cjs` exports `negativeScenariosFromSpec` L380; existing ns ingest tests in `test/test-ac-ledger.js` L151–189 | G3 G4 |
| G11 | non-blocking | process / AC6 | This run's `{us-dir}/ac-ledger.json` already stole empty negatives | Do not rewrite plans-dir ledger as product; orch re-inits at Step 5 | closed | Live proof of V9: AC1/AC2 backticks match first, slice ends at `## Definition of Ready`, inner Negative never ingested. | project | `{us-dir}/ac-ledger.json` `negativeScenarios: []`; spec AC1/AC2 + three Negative bullets in `### Negative & Failing Test Scenarios` | G3 |
| G12 | non-blocking | §4 probes | Soft-deletion, concurrency, list sizing, rate limits | N/A | closed | No entities, API, or shared mutable store. | project | `config.json` `database.type: none`; frontend framework none; stack `node-skills-package` | |
| G13 | non-blocking | plan.index | Step 1 index maps every AC to every task | Ignore index bleed; this refined plan's AC → task table is SoT | closed | Do not edit `plan.index.json` in this step. | assumed-default | `{us-dir}/plan.index.json` AC1 `taskIds` includes T01–T05; draft plan §1 table is 1:1 | |
