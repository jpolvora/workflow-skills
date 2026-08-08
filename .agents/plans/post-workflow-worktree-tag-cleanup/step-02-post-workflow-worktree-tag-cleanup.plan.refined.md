---
slug: post-workflow-worktree-tag-cleanup
title: "Post-workflow worktree and tag cleanup"
status: "plan refined ok"
refinedFrom: step-01-post-workflow-worktree-tag-cleanup.plan.md
refinedAt: "2026-08-01T18:18:00Z"
shared_understanding: confirmed
refineRound: 1
autoModeDefaultsApplied: true
---

## 0. Summary & Business Rules

**Objective:** After a workflows pipeline run reaches a terminal delivered/concluded state, the harness must always run a **git runtime cleanup** for that `workflow-id` so local `uswf/` checkpoint tags, worktrees, and related local branches do not remain orphaned. Plan-dir markdown temp delete stays optional and separate.

**Business rules:**

1. **Mandatory vs optional split (AC8):** Git runtime cleanup (tags / worktrees / branches under `uswf/{workflow-id}`) runs by default on successful end-of-workflow. Optional "delete temps" / "Keep all artifacts" continues to control **plan-dir temp markdown only** (exec/dag/issue/report/testing files, baseline, archive).
2. **Namespace safety (AC6):** Cleanup never mutates resources outside `uswf/{workflow-id}` (no repo-wide `git clean`, no unrelated user worktrees/tags/branches). Never push or delete remote tags (AC2).
3. **Lifecycle gates (AC5):** Skip while `status: active` / Pause. In `dryRun`, log intended removals only — no git mutation.
4. **Verification honesty (AC4):** Post-cleanup must report zero leftovers for that namespace; any remainder is a WARN with exact names — never silent success.
5. **Shared contract (AC7):** One protocol + one portable script shared by `ws-spec-to-pr`, `ws-spec-to-pr-lite`, and per-child `ws-multi-spec`.
6. **Dirty worktrees (AC9):** Default `--dirty-policy force` — log dirty paths, then `git worktree remove --force`. Never leave half-registered broken worktrees. Alternate `--dirty-policy stop` remains for interactive orch STOP + user-gate.

**Refinement decisions (autoMode defaults — confirmed):**

1. Dirty worktree policy default = **`--dirty-policy force`** (log then force-remove).
2. **Single Phase A hook** when orch transitions `status → completed` (not while active/paused; dryRun logs only). Do not run Phase A twice at Step 8 and Step 9.
3. **failed / cancelled / paused** runs: **skip auto-clean** unless orch explicitly invokes the cleanup script (manual / menu later). Document only; no new menu in this feature.
4. Site / README / catalog bump: **skip** (protocol + FAQ + orch docs sufficient).
5. Script location: **`src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py`** (lite/multi-spec invoke by path; no duplicate).

**Security / safety mitigations:**

- Scope every `git tag -l`, `git worktree list` filter, and `git branch --list` to the concluding `workflow-id` only.
- Forbid remote tag delete / push of `uswf/*`.
- Prefer a Python script (launcher `python`) over shell `xargs -r` one-liners for Windows/macOS portability (existing bash snippets in protocol are GNU-biased — confirmed in current `artifact-cleanup.md`).
- Do not delete preserved plan artifacts (`step-00` spec, refined plan, `step-08` result, active state) unless the user also chose plan-dir temp delete (existing policy).

---

## 1. Definition of Ready & Scope

### Resolved assumptions

| # | Assumption |
|---|------------|
| A1 | Skill SoT is `src/skills/` (upstream). Lasting edits land there; dogfood `.agents/skills/` syncs via existing packaging/`sync-skills`. |
| A2 | Extend `src/skills/ws-spec-to-pr/protocols/artifact-cleanup.md` — do not invent a parallel cleanup naming scheme. |
| A3 | `plans.useWorktrees` may be `false` (current dogfood default). Cleanup must no-op cleanly when no worktrees/tags/branches exist for the id. |
| A4 | Terminal moment = single hook when orch sets `status: completed` (after Step 9 merge/convergence **or** after Step 8 when no Step 9 / skip-PR). Cleanup runs **before** the session claims the workflow fully ended (AC1). |
| A5 | Feature PR branch (non-`uswf/`) and remote branches are **out of scope**. |
| A6 | `fable.enabled` + `autoDetectDomain` → DevOps adapter applies (git / harness cleanup). Binding sources: live `git` inventory + protocol/script under SoT. |
| A7 | Auto-clean applies only to successful `completed`. `failed`, `cancelled`, and `paused` skip Phase A unless explicitly invoked. |
| A8 | Script exit **2** (WARN leftovers) surfaces names but does **not** block claim-ended. Exit **1** (hard failure / dirty-policy stop) blocks claim-ended until resolved. |

### Acceptance Criteria (measurable)

| AC | Measure |
|----|---------|
| AC1 | On terminal delivered/concluded, orch invokes shared git cleanup for `{workflow-id}` before claiming ended. |
| AC2 | Local tags matching `uswf/{workflow-id}/*` deleted; no remote tag ops. |
| AC3 | Worktrees associated with `uswf/{workflow-id}` removed (force OK for broken/orphan); local branches `uswf/{workflow-id}/*` deleted when safe. |
| AC4 | Verification prints/log zero remainders; WARN lists exact leftover names if any. |
| AC5 | Skip on active/Pause; dryRun logs only. |
| AC6 | No mutation outside namespace; no repo-wide clean. |
| AC7 | Standard + lite document + invoke same contract; multi-spec per child id. |
| AC8 | Git cleanup runs even when user keeps plan-dir artifacts. |
| AC9 | Dirty WT: default force-remove after log; `--dirty-policy stop` available; never half-registered WT. |
| AC10 | Protocol, orch SKILL/PROTOCOLS, FAQ describe mandatory git vs optional plan-dir split (en-us, portable). |

### Out of scope

- Deleting preserved plan artifacts beyond existing optional temp policy.
- Remote branch deletion for the feature PR branch.
- Rewriting `validate_state.py` checkpoint requirements for **active** runs.
- New skill package / dependency-graph membership (extend existing protocol + script under `ws-spec-to-pr`).
- Auto-clean on `failed` / `cancelled` / `paused`.
- Explicit "Clean git leftovers" user menu (optional later).
- Consumer README / website catalog card for this harness-internal behavior.

---

## 2. Technical Design & Architecture

### Layers (from `config.json` / `STACK.md`)

| Layer | Path | This feature |
|-------|------|----------------|
| skills-sot | `src/skills` | Protocol rewrite, orch docs, shared cleanup script |
| installer-cli | `bin` | Integrity regenerate if hashed paths change; no CLI UX change expected |
| tests | `test/` | Script unit/integration tests (temp git repo fixtures) |

No frontend, DB, ORM, or i18n layers.

### Design

```
Orch sets status → completed (single terminal hook)
        │
        ▼
┌───────────────────────────────────────┐
│ Phase A — MANDATORY git runtime       │  ← always on completed
│  python …/cleanup_workflow_git.py     │     (skip active/paused/failed/cancelled)
│  --workflow-id {id} [--dry-run]       │     dryRun: log only
│  WTs → tags → branches → verify       │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ Phase B — OPTIONAL plan-dir temps     │  ← only if user chose "delete temps"
│  rm exec/dag/issue/report/…           │
│  rm baseline/ archive/                │
└───────────────────────────────────────┘
```

**Primary implementation artifact:** `src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py`

| Behavior | Detail |
|----------|--------|
| Inputs | `--workflow-id`, optional `--dry-run`, optional `--repo` (cwd default), optional `--dirty-policy force\|stop` (**default `force`**) |
| Enumerate | `git tag -l uswf/{id}/*`; parse `git worktree list --porcelain` for branch `uswf/{id}/*` **or** path under configured worktrees for that id/slug; `git branch --list uswf/{id}/*` |
| Remove order | (1) worktrees with `git worktree remove --force` (+ `git worktree prune` if needed), (2) tags `git tag -d`, (3) local branches `git branch -D` only if not checked out elsewhere |
| Dirty WT | Log dirty paths (`git -C <wt> status --porcelain`); default **force-remove**; with `stop` exit 1 without half-register |
| Verify | Re-list tags/WTs/branches; print `CLEAN` or `WARN: leftover: …` with exact names; exit 0 on CLEAN, exit 2 on WARN leftovers, exit 1 on hard failure |
| dryRun | Print intended actions prefixed `[DRY-RUN]`; exit 0 |
| Guards | Refuse empty / `*` / path-traversal-like workflow-id; no shell interpolation beyond prefix `uswf/{id}/` |

**Audit note (current SoT):** `artifact-cleanup.md` today bundles tags/worktrees into optional Step 8 "delete temps" and uses GNU `xargs -r` + `grep` pipelines — confirms AC gap and portability need for the Python script.

**Protocol:** Rewrite `artifact-cleanup.md` title/body to document Phase A (mandatory on `completed`) vs Phase B (optional). Keep preserved file list for Phase B. Replace git bash snippets with script invoke.

**Orch wiring:**

| Orch | When to invoke Phase A |
|------|------------------------|
| `ws-spec-to-pr` | **Once** when setting `status: completed` (after Step 9 convergence **or** after Step 8 when no Step 9). Before claiming ended. Update `PROTOCOLS.md` Ship order + `STEP-DISPATCH.md` Step 8/9 notes: Phase A is mandatory; Phase B stays optional temp delete. |
| `ws-spec-to-pr-lite` | Same single hook when lite sets `completed` (after Step 5 fix-pr convergence or Step 4 end when skip ship/fix-pr). Link shared protocol from lite SKILL. |
| `ws-multi-spec` | Child workers run Phase A via their own orch on child `completed`. Document in `PROTOCOL.md` Phase 5: successful child already cleaned; skipped/failed/aborted children do **not** auto-clean (same A7). Batch `runId` is not a `uswf/` namespace target. |

**Docs (AC10):** FAQ troubleshooting entry; `PROTOCOLS.md` checkpoints/cleanup; lite SKILL ship table; `ARTIFACTS.md` one-line pointer (cleanup is mandatory git + optional plan-dir, not optional-only).

**Exit-code contract for orch:**

| Exit | Meaning | Orch behavior |
|------|---------|---------------|
| 0 | CLEAN | Proceed; claim ended OK |
| 2 | WARN leftovers | Surface leftover names; still may claim ended (honesty over hard block) |
| 1 | Hard failure or dirty-policy stop | Do **not** claim ended; STOP / escalate |

### Fable DevOps — binding primary sources & observation rules

(`config.fable.enabled` + `autoDetectDomain`; domain = git/harness cleanup)

**Primary sources (must inspect before mutating):**

1. Live git inventory: `git worktree list --porcelain`, `git tag -l uswf/{workflow-id}/*`, `git branch --list uswf/{workflow-id}/*`.
2. Authoritative protocol: `src/skills/ws-spec-to-pr/protocols/artifact-cleanup.md`.
3. Cleanup script under SoT: `src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py`.
4. Orch terminal status from `{workflow-id}.state.md` frontmatter (`status`, `dryRun`).

**Forbidden inputs:** Assumed leftover lists from memory; mutating without re-listing; remote tag/branch ops.

**Minimum evidence before claim clean:** Script verify section output with zero leftovers **or** WARN with exact names. Dry-run must show intended deletions without mutation.

**Observation rules:** Prefer dry-run / verify exit codes over narrative claims; no `|| true` swallowing remove failures that leave half-registered worktrees.

### Invariant checks (`config.json.invariants`)

| Key | Impact |
|-----|--------|
| `commitPlanFilesOnlyAtStep8` | Unchanged — cleanup script is SoT under `src/skills`, not plan-dir. Plan artifact itself still Step 8 only. |
| Others (EF/tenancy) | N/A |

---

## 3. Step-by-Step Plan

### Step 1 — Shared cleanup script (foundation)

**Action:** Add `src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py` implementing Phase A (enumerate → remove → verify; dry-run; dirty policy default force; namespace guard). Follow existing script patterns (`ensure_utf8_stdio`, argparse, subprocess list-args git).

**Affected files:**
- `src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py` (new)
- No duplicate under lite; lite/multi-spec invoke the same path via `{skillsRoot}/ws-spec-to-pr/scripts/…`.

**Engineering checks:**
- `python -m py_compile` on script.
- Refuse empty/`*` workflow-id; refuse patterns that would match outside prefix.
- Use subprocess git with list args (no shell interpolation of id into unsafe globs beyond `uswf/{id}/`).
- AC2, AC3, AC4, AC5, AC6, AC9.

### Step 2 — Protocol split (mandatory git vs optional temps)

**Action:** Rewrite `artifact-cleanup.md`:
- Rename framing to **Post-workflow cleanup** with Phase A mandatory on `completed` / Phase B optional.
- Replace GNU `xargs -r` snippets for git ops with: invoke `python {skillsRoot}/ws-spec-to-pr/scripts/cleanup_workflow_git.py --workflow-id …`.
- Keep Phase B `rm` list for plan-dir temps + preserved list.
- Document skip active/Pause/failed/cancelled; dryRun; Keep-all still runs Phase A.
- Document single hook on `status→completed` and exit-code contract.

**Affected files:**
- `src/skills/ws-spec-to-pr/protocols/artifact-cleanup.md`

**Engineering checks:** AC5, AC8, AC10; en-us; no host product names.

### Step 3 — Standard orch invoke points

**Action:** Update Ship / end-of-workflow order so Phase A always runs **once** on `status→completed` **before** claiming ended; Phase B only on delete-temps choice. Do not invoke Phase A at both Step 8 and Step 9.

**Affected files:**
- `src/skills/ws-spec-to-pr/PROTOCOLS.md` (Ship order; Checkpoints “Delete on completion”)
- `src/skills/ws-spec-to-pr/STEP-DISPATCH.md` (Step 8 order; Step 9 completion hook → single completed transition)
- `src/skills/ws-spec-to-pr/SKILL.md` (brief cleanup row / pointer if needed)
- `src/skills/ws-spec-to-pr/ARTIFACTS.md` (link text: mandatory git + optional plan-dir)

**Engineering checks:** AC1, AC7, AC8.

### Step 4 — Lite + multi-spec parity

**Action:** Document + invoke same Phase A at lite terminal `completed`; multi-spec notes child orch owns Phase A on child success; skipped/failed children do not auto-clean.

**Affected files:**
- `src/skills/ws-spec-to-pr-lite/SKILL.md`
- `src/skills/ws-multi-spec/PROTOCOL.md` (Phase 5 / post-child)

**Engineering checks:** AC1, AC7.

### Step 5 — FAQ / troubleshooting docs

**Action:** Add FAQ entry: stale `uswf/` tags/worktrees; mandatory git cleanup vs Keep all artifacts; how to re-run script manually (including failed/cancelled leftovers); WARN leftovers meaning; dirty-policy force default.

**Affected files:**
- `src/skills/ws-spec-to-pr/docs/faq.md`

**Engineering checks:** AC10; portable wording. No README/site bump (resolved).

### Step 6 — Tests

**Action:** Add automated tests exercising the script against a temporary git repo with planted tags/worktrees/branches. Prefer Node `test/test-cleanup-workflow-git.js` matching existing `test/*.js` style (spawn `python` via child_process).

**Affected files:**
- `test/test-cleanup-workflow-git.js` (new)

**Cases:** see §5.

**Engineering checks:** All ACs with automated or documented manual cases; `npm run test` green.

### Step 7 — Integrity / harness (ship prep, not feature logic)

**Action:** After SoT edits: `npm run generate-integrity` && `npm run verify-integrity`; `ws-check-harness` Phases 0–5c when shipping. No dependency-graph membership change (no new skill id). Update `ws-spec-to-pr-run-test.md` cleanup expectations to mandatory Phase A if that runbook still assumes optional-only git cleanup.

**Affected files:**
- `bin/skill-integrity.json` (regenerated)
- `src/skills/ws-spec-to-pr/ws-spec-to-pr-run-test.md` (only if cleanup section still describes optional git delete)

**Engineering checks:** verify-integrity exit 0; 0 critical harness findings.

---

## 4. Permissions, Tenancy & i18n

| Area | Status |
|------|--------|
| RBAC / permissions | N/A — local git ops in developer clone only |
| Tenancy isolation | N/A — namespace isolation is `uswf/{workflow-id}` string prefix, not multi-tenant app data |
| i18n | N/A — en-us only for protocol, script messages, FAQ, orch docs |

---

## 5. Test Coverage

| AC | Test case | Method / harness |
|----|-----------|------------------|
| AC1 | Orch docs/protocol assert Phase A on `status: completed`; optional lightweight doc-assert | `test` doc contract + manual orch checklist |
| AC2 | Plant `uswf/{id}/before-step-1` tag → run script → tag gone; assert no `git push` invoked | `testCleanupDeletesLocalTagsOnly` |
| AC3 | Plant worktree + branch under namespace → remove → absent; broken/orphan registration force-removed | `testCleanupRemovesWorktreesAndBranches` |
| AC4 | After leftover plant → exit 2 + WARN names in stdout | `testCleanupWarnsOnLeftovers` |
| AC5 | `--dry-run` leaves tags/WTs intact but logs intents; protocol asserts skip when status active / failed / cancelled | `testCleanupDryRunNoMutate` + markdown contract |
| AC6 | Plant unrelated `uswf/other-id/*` and user branch → remain untouched | `testCleanupNamespaceIsolation` |
| AC7 | Protocol/SKILL/lite/multi-spec contain shared script path reference | `testDocsReferenceSharedCleanupContract` |
| AC8 | Protocol states Phase A runs when Keep all; Phase B gated | `testProtocolMandatoryVsOptionalSplit` |
| AC9 | Dirty worktree: default/`force` removes after log; `stop` exits 1 without half-register | `testCleanupDirtyWorktreeForce` / `testCleanupDirtyWorktreeStop` |
| AC10 | FAQ + protocol mention mandatory git vs optional plan-dir | `testFaqDocumentsCleanupSplit` |

**Manual / orch verification (Step 7 testing skill):** dry-run full orch snippet logging Phase A; update `ws-spec-to-pr-run-test.md` cleanup section to expect mandatory Phase A.

---

## 6. Invariants (Do Not Violate)

1. **`commitPlanFilesOnlyAtStep8`** — Do not commit `{plansDir}` artifacts before Step 8 delivery.
2. **Namespace isolation** — Never delete tags/worktrees/branches outside `uswf/{workflow-id}/` (and worktree paths associated with that id).
3. **No remote tag mutation** — Local `git tag -d` only; never push/delete remote `uswf/*`.
4. **No half-registered worktrees** — Prefer force-remove + prune over leaving broken entries.
5. **Active / Pause / failed / cancelled sacred for auto-clean** — No Phase A auto-invoke except on `completed` (explicit invoke allowed).
6. **dryRun purity** — Log only; zero git mutations.
7. **Portability** — en-us; no host product names in skill/protocol/FAQ; script launchers `python` / `node` / `bash` per `tools.md`.
8. **Extend, don’t fork** — Single protocol path under `ws-spec-to-pr/protocols/artifact-cleanup.md`; lite/multi-spec link it.
9. **Fable DevOps** — Mutate only after inspecting live git lists + protocol; verify by observation (script exit + leftover names).
10. **Karpathy** — Surgical edits to orch docs; no drive-by refactors of `validate_state.py` checkpoint rules for active runs.
11. **Single completed hook** — Phase A once per successful terminal transition; never double-run at Step 8 and 9.

---

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (`src/skills` + `test/` + integrity only).
- [ ] Domain entities and mappings encapsulated — N/A (no domain model).
- [ ] Schema migrations created — N/A.
- [ ] Authorization checks applied — N/A (local git namespace guard instead).
- [ ] i18n keys declared — N/A (en-us literals OK).
- [ ] Test cases cover all ACs (AC1–AC10 mapped in §5).
- [ ] Protocol Phase A mandatory / Phase B optional documented.
- [ ] Standard, lite, and multi-spec invoke/document shared contract.
- [ ] Single `status→completed` Phase A hook documented (no double invoke).
- [ ] failed/cancelled/paused skip auto-clean documented.
- [ ] `npm run test` + `npm run verify-integrity` + harness 0 critical before ship.
- [ ] FAQ troubleshooting updated (AC10).
- [ ] No README/site bump required for this change (confirmed).

---

## 8. Open Questions (resolved)

| # | Question | Resolution | Basis |
|---|----------|------------|-------|
| 1 | Dirty worktree policy default (AC9) | **`--dirty-policy force`** (log dirty paths, then `worktree remove --force`) | AUTO recommended default; clears half-registrations in autoMode |
| 2 | Exact terminal hook vs Step 8/9 | **Single Phase A when `status→completed`** (after Step 9 **or** Step 8 when no Step 9) | AUTO recommended; avoids double cleanup |
| 3 | Failed / aborted / cancelled workflows | **Skip auto-clean** unless orch explicitly invokes cleanup script | AUTO recommended; user may resume; no new menu this feature |
| 4 | Site / README bump | **Skip** | AUTO recommended; protocol + FAQ + orch docs enough |
| 5 | Script location | **`ws-spec-to-pr/scripts/cleanup_workflow_git.py`** | AUTO recommended; minimize packaging surface |

## Shared understanding

`shared_understanding: confirmed` (autoMode — End refinement and advance equivalent; defaults applied; no blocking gaps open).

---

## Interview registry

| id | class | section | gap | status | resolution | dependsOn |
|----|-------|---------|-----|--------|------------|-----------|
| OQ1 | blocking | §8 / AC9 | Dirty WT default force vs stop | resolved | Default `--dirty-policy force`; `stop` remains optional flag | |
| OQ2 | blocking | §8 / AC1 | Phase A at Step 8 and/or 9 | resolved | Single hook on `status→completed` only | |
| OQ3 | blocking | §8 / AC1 | Auto-clean on failed/cancelled? | resolved | Skip unless explicit invoke; document in protocol | |
| OQ4 | non-blocking | §8 / AC10 | Site/README bump? | resolved | Skip catalog/README; FAQ + protocol only | |
| OQ5 | non-blocking | §8 / design | Script under orch vs ws-shared | resolved | Keep under `ws-spec-to-pr/scripts/` | |
| G1 | blocking | §2 / protocol | Current protocol bundles git cleanup into optional delete-temps | resolved | Split Phase A mandatory / Phase B optional in rewrite | OQ2 |
| G2 | blocking | §2 / portability | GNU `xargs -r` / grep pipelines in artifact-cleanup.md | resolved | Replace with Python script (launcher `python`) | OQ5 |
| G3 | non-blocking | §2 / remove order | Tags-before-WTs in old protocol is riskier | resolved | Refined order: worktrees → tags → branches | |
| G4 | blocking | §2 / orch | STEP-DISPATCH / PROTOCOLS only mention optional temp delete | resolved | Wire mandatory Phase A on completed transition | OQ2 |
| G5 | non-blocking | §2 / multi-spec | Who owns cleanup for child ids | resolved | Child orch on child `completed`; multi-spec documents skip for failed/skipped | OQ3 |
| G6 | non-blocking | §2 / AC3 | How to associate worktrees to workflow-id | resolved | Match porcelain branch `uswf/{id}/*` or path under worktreesDir for that id | |
| G7 | non-blocking | §3 / tests | Node vs Python test harness | resolved | Prefer `test/test-cleanup-workflow-git.js` spawning python | |
| G8 | blocking | §2 / AC4 | Does WARN (exit 2) block claim-ended? | resolved | No — surface leftovers; exit 1 blocks | |
| G9 | non-blocking | §1 / A7 | cancelled vs failed wording | resolved | Both skip auto-clean with paused | OQ3 |
| G10 | non-blocking | §3 / Step 7 | run-test.md optional cleanup assumption | resolved | Update runbook only if it still says optional-only git delete | |
