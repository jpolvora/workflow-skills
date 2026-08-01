---
slug: post-workflow-worktree-tag-cleanup
title: "Post-workflow worktree and tag cleanup"
status: "plan to be refined"
---

## 0. Summary & Business Rules

**Objective:** After a workflows pipeline run reaches a terminal delivered/concluded state, the harness must always run a **git runtime cleanup** for that `workflow-id` so local `uswf/` checkpoint tags, worktrees, and related local branches do not remain orphaned. Plan-dir markdown temp delete stays optional and separate.

**Business rules:**

1. **Mandatory vs optional split (AC8):** Git runtime cleanup (tags / worktrees / branches under `uswf/{workflow-id}`) runs by default on successful end-of-workflow. Optional "delete temps" / "Keep all artifacts" continues to control **plan-dir temp markdown only** (exec/dag/issue/report/testing files, baseline, archive).
2. **Namespace safety (AC6):** Cleanup never mutates resources outside `uswf/{workflow-id}` (no repo-wide `git clean`, no unrelated user worktrees/tags/branches). Never push or delete remote tags (AC2).
3. **Lifecycle gates (AC5):** Skip while `status: active` / Pause. In `dryRun`, log intended removals only — no git mutation.
4. **Verification honesty (AC4):** Post-cleanup must report zero leftovers for that namespace; any remainder is a WARN with exact names — never silent success.
5. **Shared contract (AC7):** One protocol + one portable script shared by `ws-spec-to-pr`, `ws-spec-to-pr-lite`, and per-child `ws-multi-spec`.
6. **Dirty worktrees (AC9):** Must not leave half-registered broken worktrees. Prefer force-remove after logging dirty paths (recommended default for autoMode); interactive STOP + user-gate is an allowed alternate (see §8).

**Security / safety mitigations:**

- Scope every `git tag -l`, `git worktree list` filter, and `git branch -l` to the concluding `workflow-id` only.
- Forbid remote tag delete / push of `uswf/*`.
- Prefer a Python script (launcher `python`) over shell `xargs -r` one-liners for Windows/macOS portability (existing bash snippets in protocol are GNU-biased).
- Do not delete preserved plan artifacts (`step-00` spec, refined plan, `step-08` result, active state) unless the user also chose plan-dir temp delete (existing policy).

---

## 1. Definition of Ready & Scope

### Resolved assumptions

| # | Assumption |
|---|------------|
| A1 | Skill SoT is `src/skills/` (upstream). Lasting edits land there; dogfood `.agents/skills/` syncs via existing packaging/`sync-skills`. |
| A2 | Extend `src/skills/ws-spec-to-pr/protocols/artifact-cleanup.md` — do not invent a parallel cleanup naming scheme. |
| A3 | `plans.useWorktrees` may be `false` (current dogfood default). Cleanup must no-op cleanly when no worktrees/tags/branches exist for the id. |
| A4 | Terminal moment = `status: completed` (or lite equivalent after ship / fix-pr convergence). Cleanup runs **before** the session claims the workflow fully ended (AC1). |
| A5 | Feature PR branch (non-`uswf/`) and remote branches are **out of scope**. |
| A6 | `fable.enabled` + `autoDetectDomain` → DevOps adapter applies (git / harness cleanup). Binding sources: live `git` inventory + protocol/script under SoT. |

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
| AC9 | Dirty WT: force-remove after log **or** STOP + user-gate; never half-registered WT. |
| AC10 | Protocol, orch SKILL/PROTOCOLS, FAQ describe mandatory git vs optional plan-dir split (en-us, portable). |

### Out of scope

- Deleting preserved plan artifacts beyond existing optional temp policy.
- Remote branch deletion for the feature PR branch.
- Rewriting `validate_state.py` checkpoint requirements for **active** runs.
- New skill package / dependency-graph membership (extend existing protocol + script under `ws-spec-to-pr`).

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
Terminal orch end (status→completed / lite end)
        │
        ▼
┌───────────────────────────────────────┐
│ Phase A — MANDATORY git runtime       │  ← always (unless active/Pause/dryRun-log)
│  python …/cleanup_workflow_git.py     │
│  --workflow-id {id} [--dry-run]       │
│  tags → worktrees → branches → verify │
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
| Inputs | `--workflow-id`, optional `--dry-run`, optional `--repo` (cwd default), optional `--dirty-policy force\|stop` (default `force`) |
| Enumerate | `git tag -l uswf/{id}/*`; parse `git worktree list --porcelain` for paths/branches matching namespace; `git branch --list uswf/{id}/*` |
| Remove order | (1) worktrees with `git worktree remove --force` (+ `git worktree prune` if needed), (2) tags `git tag -d`, (3) local branches `git branch -D` only if not checked out elsewhere |
| Dirty WT | Log dirty paths (`git -C <wt> status --porcelain`); then force-remove **or** exit non-zero for orch STOP + user-gate |
| Verify | Re-list tags/WTs/branches; print `CLEAN` or `WARN: leftover: …` with exact names; exit 0 on CLEAN, exit 2 on WARN leftovers, exit 1 on hard failure |
| dryRun | Print intended actions prefixed `[DRY-RUN]`; exit 0 |

**Protocol:** Rewrite `artifact-cleanup.md` title/body to document Phase A (mandatory) vs Phase B (optional). Keep preserved file list for Phase B.

**Orch wiring:**

| Orch | When to invoke Phase A |
|------|------------------------|
| `ws-spec-to-pr` | After Step 9 convergence **or** when Step 8 ends with skip-PR / no Step 9 and state moves to `completed`. Before claiming workflow ended. Update `PROTOCOLS.md` Ship order + `STEP-DISPATCH.md` Step 8/9 notes. |
| `ws-spec-to-pr-lite` | After Step 5 fix-pr convergence (or Step 4 end when skip ship/fix-pr yields completed). Link shared protocol from lite SKILL. |
| `ws-multi-spec` | After each child worker concludes successfully — call Phase A with **child** `workflow-id` (not batch run id). Note in `PROTOCOL.md` Phase 5. |

**Docs (AC10):** FAQ troubleshooting entry; `PROTOCOLS.md` checkpoints/cleanup; lite SKILL ship table; `ARTIFACTS.md` one-line pointer if cleanup link text changes.

### Fable DevOps — binding primary sources & observation rules

(`config.fable.enabled` + `autoDetectDomain`; domain = git/harness cleanup)

**Primary sources (must inspect before mutating):**

1. Live git inventory: `git worktree list --porcelain`, `git tag -l uswf/{workflow-id}/*`, `git branch --list uswf/{workflow-id}/*`.
2. Authoritative protocol: `src/skills/ws-spec-to-pr/protocols/artifact-cleanup.md`.
3. Cleanup script under SoT (once added): `src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py`.
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

**Action:** Add `src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py` implementing Phase A (enumerate → remove → verify; dry-run; dirty policy; namespace guard).

**Affected files:**
- `src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py` (new)
- Optionally thin mirror note in lite if scripts are only under standard path (lite invokes same path via relative link — no duplicate script).

**Engineering checks:**
- `python -m py_compile` on script.
- Refuse empty/`*` workflow-id; refuse patterns that would match outside prefix.
- Use subprocess git with list args (no shell interpolation of id into unsafe globs beyond `uswf/{id}/`).
- AC2, AC3, AC4, AC5, AC6, AC9.

### Step 2 — Protocol split (mandatory git vs optional temps)

**Action:** Rewrite `artifact-cleanup.md`:
- Rename framing to **Post-workflow cleanup** with Phase A mandatory / Phase B optional.
- Replace GNU `xargs -r` snippets for git ops with: invoke `python {skillsRoot}/ws-spec-to-pr/scripts/cleanup_workflow_git.py --workflow-id …`.
- Keep Phase B `rm` list for plan-dir temps + preserved list.
- Document skip active/Pause; dryRun; Keep-all still runs Phase A.

**Affected files:**
- `src/skills/ws-spec-to-pr/protocols/artifact-cleanup.md`

**Engineering checks:** AC5, AC8, AC10; en-us; no host product names.

### Step 3 — Standard orch invoke points

**Action:** Update Ship / end-of-workflow order so Phase A always runs on terminal success **before** claiming ended; Phase B only on delete-temps choice.

**Affected files:**
- `src/skills/ws-spec-to-pr/PROTOCOLS.md` (Ship order; Checkpoints “Delete on completion”)
- `src/skills/ws-spec-to-pr/STEP-DISPATCH.md` (Step 8 order; Step 9 completion hook)
- `src/skills/ws-spec-to-pr/SKILL.md` (brief cleanup row / pointer if needed)
- `src/skills/ws-spec-to-pr/ARTIFACTS.md` (link text if describing optional-only today)

**Engineering checks:** AC1, AC7, AC8.

### Step 4 — Lite + multi-spec parity

**Action:** Document + invoke same Phase A at lite terminal end; multi-spec per child `workflow-id` after child success.

**Affected files:**
- `src/skills/ws-spec-to-pr-lite/SKILL.md`
- `src/skills/ws-multi-spec/PROTOCOL.md` (Phase 5 / post-child)

**Engineering checks:** AC1, AC7.

### Step 5 — FAQ / troubleshooting docs

**Action:** Add FAQ entry: stale `uswf/` tags/worktrees; mandatory git cleanup vs Keep all artifacts; how to re-run script manually; WARN leftovers meaning.

**Affected files:**
- `src/skills/ws-spec-to-pr/docs/faq.md`
- Human/hub touch only if install narrative changes — **not required** for protocol-only (harness change protocol: update README/AGENTS/site only if consumer-facing capability description warrants a catalog blurb; prefer minimal — one FAQ + protocol is enough unless ship gate requires site bump for skill content change).

**Engineering checks:** AC10; portable wording.

### Step 6 — Tests

**Action:** Add automated tests exercising the script against a temporary git repo with planted tags/worktrees/branches.

**Affected files:**
- `test/test-cleanup-workflow-git.js` (or `test/test-cleanup-workflow-git.py` — prefer Node to match `test/` style **or** Python unittest invoked from npm script; follow existing `test/*.js` pattern calling `python` via child_process).

**Cases:** see §5.

**Engineering checks:** All ACs with automated or documented manual cases; `npm run test` green.

### Step 7 — Integrity / harness (ship prep, not feature logic)

**Action:** After SoT edits: `npm run generate-integrity` && `npm run verify-integrity`; `ws-check-harness` Phases 0–5c when shipping. No dependency-graph membership change unless a new skill id is added (it is not).

**Affected files:**
- `bin/skill-integrity.json` (regenerated)

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
| AC1 | Orch docs/protocol assert Phase A on `status: completed`; optional lightweight doc-assert or checklist in `ws-check-workflows` if simulation covers cleanup hooks | `test` doc contract + manual orch checklist; extend workflow sim **only if** cheap |
| AC2 | Plant `uswf/{id}/before-step-1` tag → run script → tag gone; assert no `git push` invoked | `testCleanupDeletesLocalTagsOnly` |
| AC3 | Plant worktree + branch under namespace → remove → absent; broken/orphan registration force-removed | `testCleanupRemovesWorktreesAndBranches` |
| AC4 | After partial failure mock / leftover plant → exit 2 + WARN names in stdout | `testCleanupWarnsOnLeftovers` |
| AC5 | `--dry-run` leaves tags/WTs intact but logs intents; document skip when status active (protocol unit / string assert) | `testCleanupDryRunNoMutate` |
| AC6 | Plant unrelated `uswf/other-id/*` and user branch → remain untouched | `testCleanupNamespaceIsolation` |
| AC7 | Protocol/SKILL/lite/multi-spec contain shared script path reference | `testDocsReferenceSharedCleanupContract` (string/fixture grep in test) |
| AC8 | Protocol states Phase A runs when Keep all; Phase B gated | `testProtocolMandatoryVsOptionalSplit` (markdown contract test) |
| AC9 | Dirty worktree: with `--dirty-policy force` removes after log; with `stop` exits non-zero without half-register | `testCleanupDirtyWorktreeForce` / `testCleanupDirtyWorktreeStop` |
| AC10 | FAQ + protocol mention mandatory git vs optional plan-dir | `testFaqDocumentsCleanupSplit` |

**Manual / orch verification (Step 7 testing skill):** dry-run full orch snippet logging Phase A; completed mini-fixture if available in `ws-spec-to-pr-run-test.md` cleanup section — update that runbook to expect mandatory Phase A.

---

## 6. Invariants (Do Not Violate)

1. **`commitPlanFilesOnlyAtStep8`** — Do not commit `{plansDir}` artifacts before Step 8 delivery.
2. **Namespace isolation** — Never delete tags/worktrees/branches outside `uswf/{workflow-id}/` (and worktree paths associated with that id).
3. **No remote tag mutation** — Local `git tag -d` only; never push/delete remote `uswf/*`.
4. **No half-registered worktrees** — Prefer force-remove + prune over leaving broken entries.
5. **Active / Pause sacred** — No Phase A while `status: active`.
6. **dryRun purity** — Log only; zero git mutations.
7. **Portability** — en-us; no host product names in skill/protocol/FAQ; script launchers `python` / `node` / `bash` per `tools.md`.
8. **Extend, don’t fork** — Single protocol path under `ws-spec-to-pr/protocols/artifact-cleanup.md`; lite/multi-spec link it.
9. **Fable DevOps** — Mutate only after inspecting live git lists + protocol; verify by observation (script exit + leftover names).
10. **Karpathy** — Surgical edits to orch docs; no drive-by refactors of `validate_state.py` checkpoint rules for active runs.

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
- [ ] `npm run test` + `npm run verify-integrity` + harness 0 critical before ship.
- [ ] FAQ troubleshooting updated (AC10).

---

## 8. Open Questions

1. **Dirty worktree policy default (AC9)** — Recommended: **`--dirty-policy force`** (log dirty paths, then `worktree remove --force`) so autoMode and interrupted sessions always clear half-registrations. Alternate: **`stop`** → orch presents user-gate (force / keep & WARN / abort claim-ended).  
   Interview should confirm default.

2. **Exact terminal hook relative to Step 9** — Recommended: run Phase A once when orch sets `status: completed` (after Step 9 merge/convergence **or** after Step 8 when no Step 9). Avoid running twice (8 and 9). Alternate: run after Step 8 always and again after 9 only if new checkpoints appeared (unlikely). Prefer single hook on status transition to `completed`.

3. **Failed / aborted workflows** — Spec focuses on delivered/concluded success. Recommended: **do not** auto-clean on `paused` / failed (user may resume). Optional later enhancement: explicit "Clean git leftovers" menu — out of scope unless interview expands AC1.

4. **Site / README bump** — Recommended: skip consumer README/install narrative unless FAQ-level troubleshooting is also mirrored on the website; integrity + protocol + FAQ sufficient for this harness-internal behavior. Confirm at interview if catalog card needs a one-liner.

5. **Script location** — Recommended: under `ws-spec-to-pr/scripts/` (shared by pointer). Alternate: `ws-shared/scripts/` — only if we want shared-hub ownership; adds packaging surface. Prefer orch scripts folder to minimize scope.
