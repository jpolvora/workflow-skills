---
slug: commit-before-code-review
title: "Commit workflow product files after verify and after code-review fixes"
status: "plan to be refined"
---

## 0. Summary & Business Rules

Make the **verified implementation** the first required product commit in Spec-to-PR, and keep **code-review fixes** as a second, separate commit. Local review diffs a stable `{base}...HEAD` snapshot. Delivery (Step 8 / lite Step 4) stays unchanged.

**Spec of record:** `.agents/specs/commit-before-code-review.spec.md`

**Progress (2026-08-15):** Skill-contract + hub docs are **landed**. Do not re-implement Steps 1–5 below. Remaining work is leftover hygiene, harness audit, and ship.

**Required order (standard)**

```text
Step 4 implement → Step 5 verify → G2-code (verified implementation)
  → Step 6 code-review (committed diff vs base)
  → fix loop if needed → G2-code (review fixes, if any)
  → Step 7 testing → Step 8 ship
```

**Lite (no Step 5):** G2-code after Step 2 implement, before Step 3 `ws-code-review`; second G2-code after review-fix if any.

**Business rules**

- Orch owns `git commit` (G2-code). `ws-code-review` never commits.
- Stage **only** workflow-touched product paths (`files_touched` created/updated/deleted). Never `git add -A`, `git add .`, or directory-wide `src/` `web/` `tests/`.
- Never stage `{plansDir}/**` (HS-2a). `invariants.commitPlanFilesOnlyAtStep8` stays true.
- Empty commit forbidden: empty stage set → skip, log, continue.
- Uncommitted workflow product files at review start → **STOP**. Do not dispatch review.
- HS-2: no implicit commit without the G2-code gate (`autoMode` auto-gate index 0 counts).
- Distinct messages: `feat({slug}): verified implementation` then `fix({slug}): code-review fixes`. Record `{sha, step, message}` in `commits[]`.
- MEMORY: never `git add -A`; `HEAD` must equal `state.branch` before add/commit.

## 1. Definition of Ready & Scope

**Ready when**

- Spec: `.agents/specs/commit-before-code-review.spec.md`
- Stack: `node-skills-package` (skills-sot / installer-cli / tests); no DB/frontend
- Invariant `commitPlanFilesOnlyAtStep8: true` remains the delivery rule

**Landed (do not redo unless grep shows drift)**

| Surface | Landed change |
|---------|----------------|
| `ws-shared/tools.md` `commit-code` | Path-scoped `files_touched`; never `-A` / `.` / dir-wide `src/` `web/` `tests/` |
| `ws-shared/gates.md` | § Required G2-code save points + auto-gate rows + fail-closed preflight |
| `ws-spec-to-pr` `PROTOCOLS.md` / `STEP-DISPATCH.md` / `SKILL.md` / `DIAGRAM.md` / `docs/faq.md` / `README.md` / `ws-spec-to-pr-run-test.md` | Timing, staging, messages, mermaid, FAQ |
| `ws-spec-to-pr-lite/SKILL.md` | G2-code after Step 2 before Step 3; after Step 3 fixes |
| `ws-code-review/SKILL.md` | `{base}...HEAD`; orch STOP on dirty product files; skill does not commit |
| `ws-check-workflows` `check_workflows.py` + `SKILL.md` §5 | Contract scan for timing + leftover `git add src/ web/ tests/` |
| `ARTIFACTS.md` item 6 | Product staging = `commit-code` path list |
| Root `AGENTS.md`, `ws-shared/AGENTS.md`, `README.md`, `docs/index.html` | Pipeline one-liners + site FAQ “When does Spec-to-PR commit code?” |
| `bin/skill-integrity.json` | Regenerated with the skill edits (re-run at ship if more hashed files change) |

**Still in scope (remaining)**

| Item | Why |
|------|-----|
| Leftover grep | Confirm no G2 recipe still says directory-wide `src/` `web/` `tests/` or “first product commit at Step 8” |
| `STACK.md` Code Review Diff Scope | Still hardcodes `git diff main...HEAD`; optional align to `config.project.baseBranch` / `{base}` (consumer-owned; do not treat as hashed SoT) |
| `ws-check-harness` Phases 0–5c | Implementer log ran `check_workflows.py` + `npm run test`; harness audit not cited |
| Ship PR | Version/catalog bump per upstream `ws-ship-pr` gate if this wave ships |

**Out of scope**

- Committing `{plansDir}` before Step 8
- Changing `defaults.deliveryCommitArtifacts` or Step 8 G2-delivery / G3 UX
- Push / PR before Step 8 / lite Step 4
- Per-round review-fix commits
- A config flag to restore “review uncommitted work”
- New Python commit helper
- Editing `{globalSkillsRoot}/ws-*`
- Re-writing landed skill/hub prose unless a leftover scan finds drift

**ACs (measurable)**

| AC | Done when |
|----|-----------|
| AC1 | Standard: G2-code after Step 5 success or approve-to-continue; Step 6 not dispatched until commit exists or stage set empty |
| AC2 | Lite: same after Step 2, before Step 3 |
| AC3 | `ws-code-review` primary diff is `git diff {base}...HEAD` vs `config.project.baseBranch` (auto-detect `main`/`master`) |
| AC4 | Uncommitted workflow product files at review start → orch STOP |
| AC5 | After fix → re-review, one G2-code iff product files remain; skip if clean |
| AC6 | Staging = path-scoped `files_touched`; no `-A` / `.` / `{plansDir}` / unrelated dirty / empty commit |
| AC7 | Distinct messages + `{slug}`; `commits[]` records `{sha, step, message}` |
| AC8 | `autoMode` auto-commits when non-empty; `dryRun` simulates only; dry-run does not dispatch review if simulated stage set is non-empty |
| AC9 | `commitPlanFilesOnlyAtStep8` and Step 8 G2-delivery / G3 unchanged |
| AC10 | Listed surfaces describe new timing; leftover scan clean |

AC1–AC10 contract text is already in the landed files. Remaining = prove with grep + `check_workflows.py` + harness + tests, then ship.

## 2. Technical Design & Architecture

**Layers**

| Layer | Path | Status |
|-------|------|--------|
| skills-sot | `.agents/skills` | Landed orch/gates/tools/code-review/check-workflows/FAQ |
| installer-cli | `bin` | Integrity already regenerated once; bump again only if more hashed edits |
| tests | `test/` | No hardcoded old `commit-code` shell found; `ws-check-workflows` owns the contract |

No DB, frontend, migrations, or i18n. Do not load `ws-fable-domain` (no IaC/K8s/Docker/DB signals).

### Staging algorithm (shared, both orch) — landed in `gates.md` / `tools.md`

1. Union `files_touched` from implement (and review-fix for the second save).
2. Drop `{plansDir}/**`, secrets, gitignored, `preExistingDirty`.
3. Keep paths still created/modified/deleted in `git status`.
4. `git add -- <paths>` and `git add -u --` for those deletes.
5. Empty `git diff --cached` → skip, log `g2-code | skip | empty-stage | ISO`.
6. `HEAD` must equal `state.branch` (checkout that branch only if drifted).

### When G2-code is required — landed

| Mode | Save point | After | Before | Message | `commits[].step` |
|------|------------|-------|--------|---------|------------------|
| standard | Post-verify | Step 5 ≥ 7 or Approve | Step 6 | `feat({slug}): verified implementation` | `5` |
| lite | Post-implement | Step 2 | Step 3 | same | `2` |
| both | Post-review-fix | Fix loop left dirty product files | Advance std 7 / lite 4 | `fix({slug}): code-review fixes` | `6` / `3` |

Checkpoint: `update_state` → G2-code → tag `before-step-{next}` @ new HEAD.

`skipQualityGates` does **not** skip G2-code or the dirty-tree STOP.

## 3. Step-by-Step Plan

### Step 1 — Shared G2-code contract — LANDED

**ACs:** AC6, AC8, AC10

Landed: `tools.md` `commit-code`, `gates.md` § Required G2-code save points, `ARTIFACTS.md` item 6.

**Do not re-edit** unless leftover grep hits these files.

### Step 2 — Standard orch timing — LANDED

**ACs:** AC1, AC4, AC5, AC7, AC9

Landed: `PROTOCOLS.md`, `STEP-DISPATCH.md`, `SKILL.md`, `DIAGRAM.md`, `docs/faq.md`, orch `README.md`, `ws-spec-to-pr-run-test.md`.

### Step 3 — Lite orch — LANDED

**ACs:** AC2, AC4, AC5

Landed: `ws-spec-to-pr-lite/SKILL.md` (G2-code is a gate, not a new FSM step).

### Step 4 — `ws-code-review` — LANDED

**ACs:** AC3, AC4, AC10

Landed: committed `{base}...HEAD`; standalone warns then still reviews `...HEAD`; skill does not commit.

### Step 5 — `ws-check-workflows` contract — LANDED

**ACs:** AC10, regression for AC1–AC2

Landed: `check_g2_code_contract` in `check_workflows.py`; SKILL.md §5. Implementer reported 0 issues.

### Step 6 — Leftover hygiene + verify (remaining)

**ACs:** all (proof)

1. Grep `.agents/skills/ws-spec-to-pr*`, `ws-shared/tools.md`, `ws-shared/gates.md`, `ws-code-review` for leftover G2 recipes (`git add src/ web/ tests/`, “first product commit at Step 8” as the product-save rule). G2-delivery at Step 8 is still valid.
2. Optional: `STACK.md` Code Review Diff Scope — replace hardcoded `main` with `config.project.baseBranch` / `{base}` (consumer-owned; skip if interview says leave it).
3. Re-run `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` (expect 0).
4. `ws-check-harness` Phases 0–5c → 0 critical (not cited on the implementation pass).
5. `npm run test`.
6. Integrity: re-run `npm run generate-integrity && npm run verify-integrity` only if Step 6 edits hashed skills; `STACK.md` / `config.json` are consumer-owned and not hashed SoT.

**Files (only if drift or STACK.md tweak):** leftover hits; optional `.agents/skills/ws-shared/STACK.md`

### Step 7 — Hub docs already requested — LANDED

**ACs:** AC10 (human/agent narrative)

User asked to update FAQ/README/docs/AGENTS. Landed: root `AGENTS.md`, `ws-shared/AGENTS.md`, `README.md`, `docs/index.html` stepper + FAQ. Do not revert. If harness-inline later overwrote a one-liner, restore the product-commit sentence (grep `product commit → review → review-fix`).

### Step 8 — Ship (after Step 6 green)

Upstream `ws-ship-pr` gate: tests, catalog/version if shipping package content, integrity, harness, hub drift already aligned.

**Files:** `package.json` / `docs/index.html` footer only if this wave is the release PR.

## 4. Permissions, Tenancy & i18n

N/A. Portable en-us skill/gate wording only. No host/IDE product names in edited skill bodies.

## 5. Test Coverage

| AC | Test / check | Method | Status |
|----|----------------|--------|--------|
| AC1 | PROTOCOLS + STEP-DISPATCH contain `G2-code after Step 5 before Step 6` | `check_workflows.py` `check_g2_code_contract` | Landed |
| AC2 | Lite SKILL contains `G2-code after Step 2 before Step 3` | same | Landed |
| AC3 | `ws-code-review/SKILL.md` `{base}...HEAD` + `config.project.baseBranch` | same | Landed |
| AC4 | STOP wording in standard + lite; skill does not dispatch itself | doc contract | Landed |
| AC5 | One review-fix commit for all rounds; skip if clean | PROTOCOLS / STEP-DISPATCH / lite / gates | Landed |
| AC6 | `commit-code` path-scoped; leftover `git add src/ web/ tests/` scan | `check_workflows.py` | Landed; re-run in Step 6 |
| AC7 | `feat({slug})` / `fix({slug})` + `commits[]` | gates.md / PROTOCOLS | Landed |
| AC8 | Auto-gate rows; dryRun simulate + no review if simulated stage non-empty | gates.md | Landed |
| AC9 | G2-delivery / HS-2a / Step 8 intent unchanged | diff of those sections | Landed |
| AC10 | Surfaces + hub docs; leftover phrase scan | check-workflows + grep README/AGENTS/index.html | Docs landed; re-grep in Step 6 |

No new app unit tests unless a `test/` assertion hardcodes the old shell (none found).

## 6. Invariants (Do Not Violate)

- `invariants.commitPlanFilesOnlyAtStep8` = true
- HS-2 / HS-2a / HS-3 unchanged in intent
- Never `git add -A` / `git add .`
- `ws-code-review` does not `git commit`
- Shared skills stay orch-agnostic (no Step 6 vs Step 3 inside `ws-code-review`)
- No new FSM step numbers
- Author `$PWD/.agents/skills/ws-*` only
- `dryRun` makes no real commits
- en-us in skill bodies, gates, banners

## 7. Pre-PR Checklist

- [x] Layer boundaries respected (skills-sot + check-workflows; no installer graph change).
- [ ] Domain entities and mappings encapsulated. **N/A**
- [ ] Schema migrations created. **N/A**
- [ ] Authorization checks applied. **N/A** (G2/HS gates only)
- [ ] i18n keys declared. **N/A**
- [x] Test cases cover all ACs (contract checks in `check_workflows.py`).
- [ ] Re-run `ws-check-workflows` exit 0 after any leftover edits.
- [ ] `ws-check-harness` Phases 0–5c → 0 critical.
- [x] Integrity regenerated with the skill-contract commit; regenerate again only if more hashed files change.
- [ ] Leftover `src/ web/ tests/` G2-code recipe still zero at ship.

## 8. Open Questions

Resolved from landed text + user docs request (interview may override):

1. **Commit messages** — **Accepted:** `feat({slug}): verified implementation` and `fix({slug}): code-review fixes` (in `gates.md`).
2. **Standalone `/code-review`** — **Accepted:** warn if dirty; still review `{base}...HEAD` only; fail-closed STOP is workflow-mode.
3. **`dryRun` + dirty tree** — **Accepted:** simulate G2-code; do not dispatch review if simulated stage set is non-empty.
4. **Site/README** — **Accepted:** user asked to update FAQ/README/docs/AGENTS; those files are updated. Keep them.

**Still optional:** align `STACK.md` Code Review Diff Scope off hardcoded `main` (consumer-owned; not a ship blocker).
