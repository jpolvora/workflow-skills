---
superseded: true
supersededBy: step-02-hermes-spec-to-pr-enhancements.plan.refined.md
superseded: true
supersededBy: step-02-hermes-spec-to-pr-enhancements.plan.refined.md
slug: hermes-spec-to-pr-enhancements
title: "Hermes Agent Inspirations: ws-spec-to-pr Ecosystem Enhancements"
status: active
interviewRound: 0
shared_understanding: pending
planningHead: 3b5c7a9a5755cbb0f8ffad844bc44432c3d8f809
step: 1
workflowId: hermes-spec-to-pr-enhancements-20260905T015600Z
startedAt: "2026-09-05T01:56:00Z"
endedAt: "2026-09-05T02:07:33.068Z"
acRefs: []
---
## 0. Summary & Business Rules

Close the remaining gaps of the Hermes disciplines spec against a tree that already contains the merged Aug-21 implementation (`c4d83526` feat + `628fc879` review fixes + `97d6a7d4` delivery). Step 0 prior-work sweep confirmed: both provider intents (`sweep-prior-work`, `comment-issue`) exist on both SCM implementers, `run_sabotage.py` exists, sibling/sabotage/triage/close-loop language is wired, contract + tools + parity test (`>= 9`) + README Hermes row + catalog card all present, and `test-hermes-spec-to-pr-enhancements.js` + `test-provider-parity.js` pass on this HEAD.

**This run therefore does NOT re-implement S1–S11.** Scope is exactly:

1. **E1 — one doc delta (D1):** `ws-spec-to-pr/STEP-DISPATCH.md` Step 4 row has no defect-class sibling-sweep orch reminder (refined-plan S12 requires "Step 4 class sweep (skill-owned, orch reminder)"). Add one clause. Skill-owned behavior already lives in `ws-implement-tasks` (build + fix).
2. **E2 — empirical re-verification matrix (§5):** re-prove every AC against the current tree (post family-naming renames) instead of trusting the Aug-21 evidence.
3. **E3 — gates:** targeted + full `npm run test`, `generate-integrity` + `verify-integrity`, `ws-check-harness` Phases 0–5c (0 critical), `check_workflows.py` (0 critical, orch row changed).

**Business / harness rules:**

- Edit only local SoT `.agents/skills/ws-*` (+ `test/`, hub contract files if a gap demands it). Never `{globalSkillsRoot}`.
- SCM-neutral: no new intent ids in this run (D1 is prose-only), so no contract/parity changes expected.
- en-us; no IDE/agent product names; lean SKILL-adjacent prose (STEP-DISPATCH is orch-owned dispatch copy).
- `commitPlanFilesOnlyAtStep8`: plan files stay unstaged until Step 8 delivery (delivery config: `includeRefinedPlan: true` only).
- Sabotage runs (if any execute in Step 7): never leave invert artifacts under `{us-dir}/.runtime/` (trap 2026-09-03); restore-abort stays fail-closed.
- Memory traps folded (exit-2 consult, `force_interview: true`): pre-advance docs name `skipQualityGates` (this run: gates active, no bypass); G2-code stages only this slug `files_touched` via path-scoped `git add -- <paths>` (never `-A`); no harness benchmarks; negative-scenario coverage gates the Step 5 score.

## 1. Definition of Ready & Scope

**Resolved assumptions:**

| ID | Assumption | Status |
|----|------------|--------|
| B1 | Merged Aug-21 work is the implementation base. Do not re-author provider scripts, INTENTS procedures, contract rows, sabotage helper, or caller discipline that already exists and passes tests. | confirmed (step-00 sweep) |
| B2 | Branch `feat/hermes-spec-to-pr-enhancements` was created from-current (`develop` tip `3b5c7a9a`) because unrelated dirty tracked files forbade stash/create-from-base. The tip is 1 committed file ahead of `origin/main` (`f4c88848`): `.agents/specs/index.PRD`. Ship diff review scopes to `files_touched` only. | confirmed (bootstrap) |
| B3 | Compat validation exit 1 on the spec-of-record (4 pre-closure WARNs + AC2/AC4 `composite-ac` errors) does not block register for pre-closure specs; AC text is frozen (renumber risk). | confirmed (Step 0) |
| B4 | `defaults.enableDag: false` → Step 3 sequential stub via `write_sequential_dag.cjs`; Step 2 interview REQUIRED (memory exit 2 + classifier `runInterview: true`). The prior attempt's closed interview registry is reference, not a skip reason. | confirmed (config + consult) |
| B5 | D1 is prose-only (no new intent id) → contract Required intents and parity hardcoded list untouched. | confirmed (design) |

**Acceptance Criteria (measurable):**

| AC | Pass when (this run) |
|----|----------------------|
| AC1 | Re-verified: both providers expose `sweep-prior-work`; contract row + parity `>= 9` hold; Step 0 / write-spec record it. No new code unless verification finds a rename regression. |
| AC2 | Re-verified: write-spec / spec-format (+validator) / write-plan require `git log -p -S` / `-L` for modification tasks. |
| AC3 | Re-verified implement-tasks + code-review class language; **plus D1**: STEP-DISPATCH Step 4 row carries the orch reminder. |
| AC4 | Re-verified: `run_sabotage.py` + verify-plan fail-closed `< 9` + testing wiring; helper tests green. |
| AC5 | Re-verified: `check-pr-status` guarantee + both INTENTS log recipes; all three callers delegate (no raw `gh`/`az`). |
| AC6 | Re-verified: `comment-issue` on both providers + contract; ship-pr dispatches on create/merge. |

**Out of scope:**

- Re-implementing any merged S1–S11 content; new intent ids; new orchestrator steps or skill ids.
- Editing the spec-of-record AC text; touching `{globalSkillsRoot}`; benchmarks.
- Staging/committing/reverting unrelated dirty files (listed in state `preExistingDirty` + untracked others).
- Pushing before Step 8 ship; merging the PR (master loop owns convergence + merge).

## 2. Technical Design & Architecture

**Stack:** `node-skills-package` (Node 22). Layers touched: skills-sot (1 file) + tests (verify-only) + hub-contract (verify-only).

**Gap table (evidence at planningHead):**

| Refined-plan item | Tree status | Evidence |
|---|---|---|
| S1/S2 sweep intents + scripts | satisfied | both SKILL tables + INTENTS headings + `sweep_prior_work.py` ×2; contract line 32; parity `>= 9` |
| S3 Step 0 / write-spec / FORMAT sweep | satisfied | write-spec line 77; FORMAT lines 48–54; spec-format SKILL line 33; validator lines 256–257; STEP-DISPATCH Step 0 row |
| S4 design intent | satisfied | write-spec line 80; FORMAT line 54/149; write-plan lines 42, 49; validator line 273 |
| S5/S6 defect class | satisfied in skills | implement-tasks lines 51, 73; code-review line 77 |
| S7 sabotage helper | satisfied | `run_sabotage.py` + hermes sabotage tests green |
| S8 sabotage wiring | satisfied | verify-plan line 58 (`knownDefect` caps 8 = `< 9`); testing line 79; STEP-DISPATCH Steps 5/7 rows |
| S9 check-pr-status ext + callers | satisfied | contract line 33; both INTENTS log/classify/rerun; ship-pr Monitor; fix-pr fixPrExec; goal-fix-pr loop; tools.md line 75 |
| S10/S11 comment-issue + ship dispatch | satisfied | both providers + scripts; contract line 35; ship-pr create/merge; tools.md line 76 |
| S12 orch wiring | **1 gap (D1)** | STEP-DISPATCH Steps 0/5/7/8/9 wired; **Step 4 row lacks class-sweep reminder** |
| S12 lite pointers | satisfied | lite Steps 0–5 index + standard-only sabotage note |
| S13 tests | satisfied (re-run) | hermes suite green; parity green |
| S14 integrity/harness/docs | verify in-run | README Hermes row; catalog card + FAQ; integrity + harness re-run |

**D1 edit (exact):** in `STEP-DISPATCH.md` Step 4 Action cell, after the `ws-implement-tasks` mode-build dispatch clause, append orch reminder: `skill owns Fix-Entire-Defect-Class (repo-wide sibling sweep + exemptions); orch confirms the reminder ran before verify.` Keep the existing `--skip-gates` unless-clause wording intact (trap 2026-09-04: never document `--pre-advance 4` as unconditional).

## 3. Step-by-Step Plan

Sequential (`defaults.enableDag: false`).

### E1 — D1 dispatch reminder (AC3/S12)

- Edit `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` Step 4 row only. No other file.
- Engineering check: `check_workflows.py` 0 critical after the edit (row still parses as Step 4 action).

### E2 — Empirical re-verification matrix (AC1–AC6)

For each AC row in §2, re-confirm by file:line read (not memory): intents present on both implementers, contract rows unchanged, caller delegation intact, sabotage helper + tests green. Record results in `step-05` report inputs (ledger links). Any rename regression found becomes a surgical fix under the same E1 change discipline (no new intents).

### E3 — Gates (all ACs)

- Targeted: `node test/test-hermes-spec-to-pr-enhancements.js`, `node test/test-provider-parity.js` (exit 0).
- Full: `npm run test` (exit 0; heavy — run once after E1).
- `npm run generate-integrity && npm run verify-integrity` (STEP-DISPATCH is hashed content → regenerate in same change).
- `ws-check-harness` Phases 0–5c → 0 critical; `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` → 0 critical.
- No `$HOME/.agents/skills` writes; no absolute paths in artifacts.

## 4. Permissions, Tenancy & i18n

N/A (harness markdown + scripts; no app surface). Close-loop auth unchanged (`gh auth` / `ADO_PAT`); no new permission matrix.

## 5. Test Coverage

| AC | Test case | Method / command |
|----|-----------|------------------|
| AC1–AC3, AC5–AC6 | Intent/prose presence per §2 gap table | `test/test-hermes-spec-to-pr-enhancements.js` (existing asserts) + file:line re-reads in E2 |
| AC4 | Sabotage bites/restores/aborts; `< 9` wording | hermes suite sabotage block (green at plan time) |
| All | Parity allowlist/union | `test/test-provider-parity.js` (green at plan time) |
| All | Full gate | `npm run test` (Step 7) |
| D1 | Orch sim still valid | `check_workflows.py` after edit |

Manual/agentic (not npm): one read-through of the edited Step 4 row; no live `gh`/`az` mutation.

## 6. Invariants (Do Not Violate)

From `config.json.invariants`, worker constraints, and MEMORY (Medium+ FI traps):

| Invariant | Rule |
|---|---|
| `commitPlanFilesOnlyAtStep8` | true. No `git add` under `{us-dir}` until Step 8 delivery. Never `git add -A` / `.`. |
| `skipQualityGates` | false. Pre-advance gates run literally; docs name the bypass they do NOT use. |
| G2-code scope | Path-scoped `git add -- <files_touched>` only; unrelated dirty files never staged/committed/reverted. |
| Portable SCM | No new intent ids; no raw `gh`/`az` in pipeline bodies; no silent provider fallback. |
| Language/portability | en-us; no host product names in shipped prose. |
| No benchmarks | Never load `ws-run-benchmark` / run benchmark scripts. |
| Sabotage hygiene | No leftover `.runtime` files; re-score ledger after any `link` that clears `scoreState`. |
| Verify bar | Already-shipped Advance ≥ 9 untouched; sabotage-missing fail-closed stays `< 9` (cap 8). |
| No early push | No push before Step 8 ship; no merge (master loop owns it). |

## 7. Pre-PR Checklist

- [ ] E1 edit minimal (Step 4 row clause only); E2 matrix re-confirmed per AC.
- [ ] `npm run test` exit 0; integrity generate+verify exit 0; harness 0 critical; workflows sim 0 critical.
- [ ] Delivery commit stages only configured artifacts (`includeRefinedPlan` → refined plan).
- [ ] No edits under `{globalSkillsRoot}`; no absolute paths; en-us; no host names.
- [ ] PR created via `ws-ship-pr` (`workflowMode`, `stopBeforeFixPr`); local review pass recorded; PR left unmerged.

## 8. Open Questions

None blocking. Interview (Step 2, required by `force_interview`) audits: (a) D1 wording minimality, (b) B2 from-current branch strategy vs rebase-to-main at ship, (c) whether E2 finds any rename regression that widens scope. `softSkipEligible` false.
