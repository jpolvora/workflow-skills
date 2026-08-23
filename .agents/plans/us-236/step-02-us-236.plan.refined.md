---
slug: us-236
title: "Coordinated Prompt-to-Spec-to-Execution Lifecycle: 3-Phase Task Orchestrator & Canonical Tracking Skill"
status: active
step: 2
workflowId: us-236-20260823T195756Z
startedAt: "2026-08-23T19:57:56Z"
endedAt: "2026-08-23T20:52:22.788Z"
acRefs: []
---
## 0. Summary & Business Rules

Ship **`ws-task-lifecycle`**: an on-demand coordinator for **prompt-driven** product work (not Spec-to-PR). It sequences existing skills through three named phases: **Intake**, **Implementation**, **Completion**. It does not create `{plansDir}` trees, `step-00-*.spec.md`, or a second FSM.

**Business rules (locked by spec + context):**

1. Default invoke is slash / task-router. Shipped `{sharedDir}/autoload.md` Always-applied table does **not** list this skill (AC33).
2. Consumers may opt in via **`defaults.autoloadTaskLifecycle`** (boolean, default false). `ws-configure-project --section autoload` asks whether to autoload it like other Always-applied skills. Yes persists the flag and includes the skill on `--write-autoload`. Yes does **not** set `defaults.autoload` true.
3. Phase 3 default tracking order: `FEATURES.md` → `PLAN.md` → `PRODUCT.PRD` → `index.PRD`. Optional `tracking.canonicalFiles` overrides the path list only.
4. Missing tracking files: skip + note; do not create stubs; do not abort later Phase 3 steps.
5. `ws-spec-to-pr` / lite / `ws-multi-spec` stay forbidden from this coordinator.
6. Slice specs live under `{specsDir}` (`plans.specsDir`). Register/`step-00` stays `ws-local-spec-provider` when a workflow starts.

**Security:** local files and config only. No network API, no tokens, no tenancy. `configure_autoload.py` must keep portable path forms (MEMORY: table regex `\|[^\r\n]*\|`, no DOTALL row match, no `https://` as Windows drives).

**Design intent:** greenfield skill. Nearby skills stay single-purpose. Option C as shipped Always-applied default remains out of scope; opt-in via configure-project is in scope (user add 2026-08-23).

## 1. Definition of Ready & Scope

**Ready:** `.agents/plans/us-236/step-00-us-236.spec.md` (51 ACs, authoring PASS); context `.agents/specs/us-236.context.md`; stack `node-skills-package`.

**Resolved assumptions (treat as confirmed):**

| Topic | Decision |
|-------|----------|
| Architecture | Option A, skill id `ws-task-lifecycle` |
| Phase names in SKILL.md | Intake, Implementation, Completion (AC3) |
| Invocation | `disable-model-invocation: true`; Always-applied load only when flag + consumer autoload |
| Tracking default | FEATURES.md, PLAN.md, PRODUCT.PRD, `{specsDir}/index.PRD` |
| `tracking.canonicalFiles` | Optional array; absent/empty → default list |
| Autoload opt-in key | `defaults.autoloadTaskLifecycle` |
| Configure question | No (`false`, Recommended) / Yes / Keep current / Skip |
| Package membership | Workflows package (spec-family coordinator) |
| Version | Match `package.json` / `packageVersion` (currently 0.3.36; bump only if this PR is the release bump) |

**Out of scope:** replacing orch FSMs; Option B expansions; shipped Always-applied default; spec-memo vault; inventing missing tracking files; changing Step 5 scoring.

## 2. Technical Design & Architecture

| Layer | Files | Change |
|-------|--------|--------|
| skills-sot | `.agents/skills/ws-task-lifecycle/SKILL.md` | New 3-phase dispatch protocol |
| skills-sot | `.agents/skills/ws-task-lifecycle/evals/evals.json` | Order + no-plan-tree contracts |
| installer-cli | `bin/skill-dependencies.json` | Skill node + workflows package row + deps |
| hub | `config.schema.json`, `config.json.example` | `tracking` + `defaults.autoloadTaskLifecycle` |
| hub | `autoload.md` | Do **not** add the skill to the shipped table |
| configure | `configure_autoload.py`, `INTERVIEW.md`, `SKILL.md` | Flag persist + membership merge |
| tests | `test/test-autoload-configure.js`, `test/test-ws-task-lifecycle.js` | Flag membership + SKILL.md contracts |
| catalog | `FEATURES.md`, `CATALOG.md`, root `AGENTS.md`, `autoload.md` specs router | Inventory + prompt-task route |
| docs | `README.md`, `docs/index.html` | Harness change protocol (site rebuild at ship) |

**Config shapes:**

```json
"defaults": {
  "autoload": false,
  "autoloadTaskLifecycle": false
},
"tracking": {
  "canonicalFiles": ["FEATURES.md", "PLAN.md", "PRODUCT.PRD", "index.PRD"]
}
```

`index.PRD` in the default list is repo-relative only when that file lives at repo root; this upstream uses `{specsDir}/index.PRD`. Skill Phase 3 resolves `index.PRD` as: listed path if present, else `{specsDir}/index.PRD`. Document that in SKILL.md (no extra AC; supports AC22–AC23).

**`configure_autoload.py` membership merge (after preserve):**

1. `membership = preserved if preserved else default_always_applied_membership()`.
2. If `defaults.autoloadTaskLifecycle is True`: `ensure_member(membership, ws-task-lifecycle, trigger)`.
3. If false/omitted: **do not add**. Do not strip a row the consumer already customized (AC46 is “does not add”, not “must remove”).
4. Persist helper: `--set-autoload-task-lifecycle true|false` (mirror `--set-autoload`; must not set `defaults.autoload`).

**Invariants:** `commitPlanFilesOnlyAtStep8: true`. Product commits after Step 5/6 only. No frontend/DB.

## 3. Step-by-Step Plan

### S1 — Coordinator skill body (AC1–AC32, AC38–AC39, AC51)

**Action:** Author `.agents/skills/ws-task-lifecycle/SKILL.md` per `ws-write-a-skill` (loaded banner, Done when, explicit launchers, version). Exactly three phases named Intake, Implementation, Completion.

- Intake: read `{specsDir}/index.PRD` and repo-root `PLAN.md` when present; product change + missing slice spec → invoke `ws-write-spec` (do not draft spec body here); then `[ ]` → `[~]` before product edits; forbid `{plansDir}/{slug}/` and `step-00-*.spec.md`; paths use `{specsDir}` token only.
- Implementation: load karpathy then senior-developer; run `verification.backendTest` when non-empty; else skip note.
- Completion: walk default or `tracking.canonicalFiles`; FEATURES → PLAN → PRODUCT.PRD → index.PRD; `[x]` / Done-log where those conventions exist; skip missing with a named note; then `ws-changelog` then `ws-self-learning`.
- Forbid `ws-spec-to-pr` and `ws-spec-to-pr-lite`. On-demand default; opt-in Always-applied via `defaults.autoloadTaskLifecycle`.

**Files:** `.agents/skills/ws-task-lifecycle/SKILL.md`

**Checks:** YAML `name: ws-task-lifecycle`; three phase headings; no hardcoded `.agents/specs`; no mkdir `{plansDir}`.

### S2 — Skill evals (AC38–AC39)

**Action:** `evals/evals.json` with assertions that Completion lists FEATURES.md before PLAN.md, and that the skill forbids creating a `{plansDir}` workflow tree. Pair with S7 mechanical grep so CI fails if SKILL.md regresses.

**Files:** `.agents/skills/ws-task-lifecycle/evals/evals.json`

### S3 — Tracking + autoload config (AC26–AC27, AC40–AC41)

**Action:** Add optional `tracking.canonicalFiles` (array of strings) and `defaults.autoloadTaskLifecycle` (boolean, default false) to schema and example. Comment: omitted/false → on-demand only.

**Files:** `.agents/skills/ws-shared/config.schema.json`, `.agents/skills/ws-shared/config.json.example`

Do **not** commit consumer `config.json` (gitignored).

### S4 — configure-project interview + helper (AC42–AC48)

**Action:** After the existing Enable consumer root autoload gate, ask: Autoload `ws-task-lifecycle` like other Always-applied skills? **No (`false`, Recommended)** / Yes (`true`) / Keep current / Skip.

- Yes → `--set-autoload-task-lifecycle true` then `--write-autoload` (membership merge). Do **not** `--set-autoload true`.
- No / Skip / Keep false → `--set-autoload-task-lifecycle false` (or leave omitted); `--write-autoload` must not add the row.

**Files:** `INTERVIEW.md`, `SKILL.md` (Autoload step), `scripts/configure_autoload.py`

**MEMORY:** keep `\|[^\r\n]*\|` table replace; no DOTALL; no absolute paths.

### S5 — Catalog, router, dependencies (AC34–AC37)

**Action:** Workflows package + `dependencies.ws-task-lifecycle` → write-spec, spec-format, spec-index, karpathy, senior-developer, changelog, self-learning. Task-router row: prompt-driven implementation (not Spec-to-PR) → `ws-task-lifecycle`. Specs skill router in `autoload.md`: same intent. FEATURES.md inventory row. Root `AGENTS.md` CATALOG pointer / task router as required by harness protocol.

**Files:** `bin/skill-dependencies.json`, `CATALOG.md`, `FEATURES.md`, `AGENTS.md`, `.agents/skills/ws-shared/autoload.md` (router only — not Always-applied table), `.agents/skills/ws-shared/AGENTS.md` (consumer router if it duplicates CATALOG rows)

### S6 — Shipped Always-applied stays lean (AC33)

**Action:** Do not add `ws-task-lifecycle` to `DEFAULT_ALWAYS_APPLIED` or the hub `autoload.md` table. `test-autoload-configure` existing preserve tests must still pass.

### S7 — Tests (AC38–AC39, AC49–AC50)

**Action:**

1. `test/test-autoload-configure.js`: temp tree, default table, `autoloadTaskLifecycle` false/omitted → `--write-autoload` table has no `ws-task-lifecycle`; set true in config → table includes it; `--set-autoload-task-lifecycle true` does not flip `defaults.autoload`.
2. `test/test-ws-task-lifecycle.js`: read SKILL.md; fail if Completion mentions PLAN.md before FEATURES.md; fail if body instructs creating `{plansDir}` / `step-00` for prompt tasks; assert three phase names; assert `{specsDir}` token and no `.agents/specs` hardcoded path in skill prose.

Wire `test-ws-task-lifecycle.js` into `package.json` `tests` or `tests:harness-efficiency`.

**Files:** `test/test-autoload-configure.js`, `test/test-ws-task-lifecycle.js`, `package.json`

### S8 — Integrity, site, changelog (ship hygiene)

**Action:** After skill files exist: `npm run generate-integrity` + `verify-integrity`; `npm run test`; site/README/FEATURES already touched in S5. Agent changelog under `{sharedDir}/CHANGELOG.md` at task completion. Do not bump version unless this PR is the release.

## 4. Permissions, Tenancy & i18n

N/A. Local skill package; no RBAC, no tenant field, no i18n UI. Configure-project gates stay en-us.

## 5. Test Coverage

| AC | Plan | Test |
|----|------|------|
| AC1–AC3 | S1 | `test-ws-task-lifecycle.js` dir + YAML name + three phase headings |
| AC4–AC11 | S1 | grep SKILL.md for `{specsDir}/index.PRD`, `PLAN.md`, `ws-write-spec`, `[~]`, forbid `{plansDir}` / `step-00` / `.agents/specs` |
| AC12–AC15 | S1 | grep karpathy, senior-developer, `verification.backendTest`, skip note |
| AC16–AC30 | S1 | grep FEATURES before PLAN; skip-note; `tracking.canonicalFiles`; changelog then self-learning |
| AC31–AC32 | S1 | grep forbid spec-to-pr / lite |
| AC33 | S6 | `test-autoload-configure.js` default table; `test-ws-task-lifecycle.js` hub autoload.md table |
| AC34–AC37 | S5 | `test-doc-sync.js` / grep FEATURES, CATALOG, skill-dependencies, AGENTS router |
| AC38–AC39 | S2+S7 | evals.json + `test-ws-task-lifecycle.js` fail-closed greps |
| AC40–AC41 | S3 | schema/example parse in autoload-configure or new assertions |
| AC42–AC48 | S4 | INTERVIEW/SKILL grep; `--set-autoload-task-lifecycle` helper tests |
| AC49–AC50 | S7 | `test-autoload-configure.js` write-autoload membership cases |
| AC51 | S1 | grep SKILL.md on-demand + `autoloadTaskLifecycle` |

Run: `node test/test-autoload-configure.js`, `node test/test-ws-task-lifecycle.js`, `npm run test`.

No mutationTest configured; sabotage via `run_sabotage.py` only if Step 7 requires it. Not a defect-class bugfix — no sibling sweep beyond skill-family grep.

## 6. Invariants (Do Not Violate)

- `commitPlanFilesOnlyAtStep8: true` — no `{plansDir}` in product commits until ship.
- Never `git add -A`.
- Never edit `{globalSkillsRoot}/ws-*` from this package root.
- Never write absolute author-machine paths into `autoload.md`.
- Do not add `ws-task-lifecycle` to shipped Always-applied `DEFAULT_ALWAYS_APPLIED`.
- Do not expand `ws-spec-index` / `ws-sync-spec` into this coordinator.
- `ws-karpathy-guidelines` surgical scope on product diffs.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot vs hub vs tests vs catalog).
- [ ] Domain entities and mappings encapsulated (N/A — no domain model).
- [ ] Schema migrations created (N/A — JSON schema only).
- [ ] Authorization checks applied (N/A).
- [ ] i18n keys declared (N/A; en-us skill bodies).
- [ ] Test cases cover all ACs.
- [ ] Integrity manifest regenerated if hashed skill files changed.
- [ ] FEATURES.md / CATALOG.md / AGENTS.md / README / docs synced (harness change protocol).

## 8. Open Questions

None blocking. Interview auto-confirm (autoMode): keep defaults in §1 table. Optional later: glob-detect tracking files; mandatory `ws-sync-spec` in Completion.

### MEMORY traps applied (check_memory_conflict exit 2)

| Trap | INSTEAD DO |
|------|------------|
| Shared worktree dirty skills | Touch only us-236 files; do not stage other dirty trees (ws-multi-spec, us-235, docs leftovers) |
| Local skills only | Author `$PWD/.agents/skills/ws-task-lifecycle/`; never write `{globalSkillsRoot}` |
| Extra demotion / CATALOG 24 KB | Register in **Workflows** package; one short task-router row |
| configure_autoload CRLF | `\|[^\r\n]*\|` table replace; no DOTALL; no `https://` as drives |
| skill-integrity CRLF | regenerate with repo script; verify `--check` |
| git add -A | path-scoped `files_touched` only |
| Global vs local duplicates | Read/edit local SoT for this id |

## Interview registry

| id | class | section | gap | status | resolution | resolutionSource | evidence |
|----|-------|---------|-----|--------|------------|------------------|----------|
| G1 | non-blocking | 8 | Open questions empty | closed | Keep §1 table; no further product options | project | step-00 spec Assumptions |
| G2 | blocking | 3 | MEMORY force_interview traps | closed | Apply INSTEAD DO in §8; Workflows package; local SoT only; no git add -A | project | MEMORY.md + check_memory_conflict.py |
| G3 | non-blocking | 2 | index.PRD path in default list vs `{specsDir}` | closed | Resolve listed path then `{specsDir}/index.PRD` | assumed-default | spec AC22–AC23 + plan §2 |
| G4 | non-blocking | 4 | Tenancy/i18n absent | closed | N/A because local skill package | project | FORMAT implicit-requirement collapse |

shared_understanding: confirmed (autoMode End refinement and advance)

