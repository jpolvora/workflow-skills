---
superseded: true
supersededBy: step-02-us-440.plan.refined.md
slug: us-440
title: "skillLoader: adopt token-centered skill loading at inline body-load sites"
status: completed
step: 1
workflowId: us-440-20260927T162130Z
startedAt: "2026-09-27T16:21:30Z"
endedAt: "2026-09-27T16:25:56.442Z"
acRefs: []
---
## 0. Summary & Business Rules

Convert the remaining **in-session skill body-load sites** across the shipped `ws-*` skill bodies to token-centered wording that cites `{skillLoader}` and links the canonical skill-load procedure in `{skillsRoot}/ws-shared/runtime/host-capability-tokens.md` § Skill-load procedure.

Business rules:
- `{skillLoader}` is the **only** sanctioned token for loading a skill **body in the same session**. It routes through the canonical procedure (already-loaded dedupe + `skill-load | {id} | {loaded|read}` telemetry).
- Two classes are **semantically mismatched** and must stay unchanged (documented exemptions):
  1. `dispatch-agent` orchestration — the subagent loads its own body; `{skillLoader}` is the wrong token.
  2. Script-level delegation — no body is read; there is nothing to load.
- No converted site restates the procedure; each delegates **by link** (check_duplicates stays green).
- Security: no secret, credential, host product name, or internal spec/issue number is introduced into shipped prose.

## 1. Definition of Ready & Scope

**In scope (product edits — 6 files):**
| File | Sites |
|------|-------|
| `.agents/skills/ws-task-lifecycle/SKILL.md` | L29 invoke `ws-spec-write`; L31 invoke `ws-spec-index`; L38 load `ws-senior-developer`; L59 invoke `ws-changelog` then `ws-self-learning` |
| `.agents/skills/ws-spec-manager/SKILL.md` | subcommand→target mapping (§ Direct Subcommands); § 4 Dispatch & Delegate |
| `.agents/skills/ws-spec-write/SKILL.md` | L104 delegate to `ws-spec-provider-local` |
| `.agents/skills/ws-code-review/SKILL.md` | L52 write via `ws-self-learning`; L91 run `ws-fable-judge` |
| `.agents/skills/ws-ship-pr/SKILL.md` | L78 `ws-fable-judge` row note; L124 security `ws-secrets-leak-review` |
| `.agents/skills/ws-goal-fix-pr/SKILL.md` | L15 wrap `ws-fix-pr` in `ws-goal-loop`; L56 contract reference; L87 `ws-goal-loop` helper |

**Canonical wording shape (from `.agents/skills/ws-spec-list/ACTIONS.md`):** `load \`ws-<id>\` via \`{skillLoader}\` ([canonical skill-load procedure](../ws-shared/runtime/host-capability-tokens.md))` — token **plus** link, no restated how-to.

**Out of scope / exemptions (unchanged, recorded in the PR):**
- `dispatch-agent` orchestration sites: `ws-spec-to-pr/STEP-DISPATCH.md`, `ws-spec-to-pr-lite/SKILL.md` — reason "subagent loads its own body; `{skillLoader}` is the wrong token".
- Script-level delegation: `ws-configure-project` → `ws-spec-memo` `.cjs`; `ws-ship-pr` → `ws-secrets-leak-review` hook; `ws-goal-fix-pr` → `ws-goal-loop` helper script — reason "no body read".
- Autoload set in `autoload.md` (non-goal); host-tool-map pre-map (non-goal); dispatch-tier / user-gate / orchestrator semantics (non-goal).
- `check_skill_load.cjs` gate extension (AC11/AC12): **optional and deferred**. A bare `Load`/`invoke` detector matches ~103 candidate lines across ~60 shipped docs; shipping it inside this doc-only patch would require an oversized allowlist and risk false positives. Per the spec Notes, split into a follow-up spec. AC11/AC12 are conditional ("If … is extended") and are satisfied vacuously by not extending.

**Measurable ACs:** AC1–AC14 from `step-00-us-440.spec.md` (14 ACs) plus NS1–NS5.

## 2. Technical Design & Architecture

Doc-only change across layer `skills-sot` (`.agents/skills`, per `config.json.stack.backend.layers`). No runtime, schema, API, or installer change.

- Each edit is a **single-line, surgical prose substitution**: replace the bare markdown link `[ws-<id>](../ws-<id>/SKILL.md)` (or bare `` `ws-<id>` ``) with the token shape, keeping surrounding prose, punctuation, and line structure intact.
- Link target from `{skillsRoot}/ws-<id>/` → `../ws-shared/runtime/host-capability-tokens.md` (shared runtime doc, not a SKILL.md body, so Phase 5a `check_skill_load.cjs` never reads it as a raw recipe).
- No new files, no new config keys, no `.ws/config.json` change (so the PowerShell config editor sync + `test-powershell-config-editor.js` are not triggered).
- Package integrity + version bump are handled at ship (AC14).

Invariants from `config.json.invariants`: `commitPlanFilesOnlyAtStep8: true` (plan dir committed only at Step 8); others `false`/N/A (no entities, migrations, tenancy, or EF surface).

## 3. Step-by-Step Plan

1. **Establish green baseline** — run `node .agents/skills/ws-check-harness/scripts/check_skill_load.cjs`, `node .agents/skills/ws-shared/runtime/scripts/check_duplicates.cjs`, `node test/test-harness-clean.js`, `npm run test`; capture exit codes. (`skills-sot`)
2. **Convert `ws-task-lifecycle/SKILL.md`** — 4 sites per § 1 table. (`skills-sot`)
3. **Convert `ws-spec-manager/SKILL.md`** — token+link note under § Direct Subcommands (the subcommand→target mapping) and under § 4 Dispatch & Delegate. (`skills-sot`)
4. **Convert `ws-spec-write/SKILL.md`** — L104 delegate line; keep the `register_local_spec.cjs` bash block unchanged. (`skills-sot`)
5. **Convert `ws-code-review/SKILL.md`** — L52 (`ws-self-learning`) and L91 (`ws-fable-judge`). (`skills-sot`)
6. **Convert `ws-ship-pr/SKILL.md`** — L78 `ws-fable-judge` row note and L124 security dependency line; leave the `ws-secrets-leak-review` **hook** delegation untouched. (`skills-sot`)
7. **Convert `ws-goal-fix-pr/SKILL.md`** — L15 wrap, L56 contract reference, L87 helper note; leave the `ws-goal-loop` helper **script** semantics untouched. (`skills-sot`)
8. **Exemption audit** — grep the two exempt classes (`STEP-DISPATCH.md`, `ws-spec-to-pr-lite/SKILL.md` dispatch rows; `.cjs`/hook delegations) and confirm zero `{skillLoader}` was introduced there; confirm no `.py` added. (`skills-sot`)
9. **Verify converted coverage** — `rg -n "\{skillLoader\}"` over the 6 files returns a hit at every converted site (AC1–AC6); `check_skill_load.cjs` and `check_duplicates.cjs` stay 0-finding. (`tests`)
10. **Integrity + version + docs** — bump `package.json` `version` + `packageVersion` in `bin/skill-dependencies.json` and `.agents/skills/ws-shared/runtime/skill-dependencies.json` (+ `ws-shared/version.json`, site footer on rebuild); `npm run generate-integrity` + `npm run verify-integrity`; keep hubs/catalog/FEATURES in sync. (`installer-cli`)

## 4. Permissions, Tenancy & i18n

N/A — no RBAC, tenancy, route guard, or user-visible i18n string. Prose is en-us only (harness language rule). No host product name may appear as a loader value (host neutrality).

## 5. Test Coverage

| AC | Named check / test |
|----|--------------------|
| AC1 | `rg -n "\{skillLoader\}" .agents/skills/ws-task-lifecycle/SKILL.md` → ≥1 hit at each of L29/L31/L38/L59 sites |
| AC2 | `rg -n "\{skillLoader\}" .agents/skills/ws-spec-manager/SKILL.md` → hits in subcommand mapping + Dispatch & Delegate |
| AC3 | `rg -n "\{skillLoader\}" .agents/skills/ws-spec-write/SKILL.md` → hit at register delegation |
| AC4 | `rg -n "\{skillLoader\}" .agents/skills/ws-code-review/SKILL.md` → hits at L52 + L91 |
| AC5 | `rg -n "\{skillLoader\}" .agents/skills/ws-ship-pr/SKILL.md` → hits at fable-judge row note + security dependency |
| AC6 | `rg -n "\{skillLoader\}" .agents/skills/ws-goal-fix-pr/SKILL.md` → hits at L15/L56/L87 |
| AC7 | Manual: each converted line carries both `` {skillLoader} `` and the `host-capability-tokens.md` link, no restated steps |
| AC8 | `node .agents/skills/ws-shared/runtime/scripts/check_duplicates.cjs` exit 0 |
| AC9 | `git diff -- .agents/skills/ws-spec-to-pr/STEP-DISPATCH.md .agents/skills/ws-spec-to-pr-lite/SKILL.md` empty; PR records exemption reason |
| AC10 | `git diff` shows no `.cjs`/hook conversion; PR records "no body read" reason |
| AC11–AC12 | Conditional (gate not extended) — assert `check_skill_load.cjs` unchanged and 0 findings |
| AC13 | `node .agents/skills/ws-check-harness/scripts/check_skill_load.cjs` exit 0; `npm run test` exit 0; `node test/test-harness-clean.js` 0 findings |
| AC14 | `npm run generate-integrity` → 0; `npm run verify-integrity` → 0; `package.json` version strictly above merge-base |
| NS1 | Manual review: no bare `Load`/`invoke` `ws-<id>` remains at an in-scope site |
| NS2 | Exemption audit (step 8) — no `{skillLoader}` in dispatch/script classes |
| NS3 | `check_duplicates.cjs` green (no pasted procedure) |
| NS4 | N/A (no gate extension shipped) — recorded |
| NS5 | Post-edit `verify-integrity` run **before** regenerate would name the drifted digest; then regenerate → green |

## 6. Stack & Security Invariants Verification Plan

Touched stack: `node-skills-package` (rule pack `{skillsRoot}/ws-shared/runtime/stacks/` — no matching framework pack for a Markdown-only harness change; `typescript-node.md` applies only to `.cjs` runtime, which is not touched). Touched `config.json.invariants`: `commitPlanFilesOnlyAtStep8` (enforced by the pipeline; no `{plansDir}` commit before Step 8).

Framework boundaries explicitly assessed:
- **Authorization & endpoint protection:** N/A — no endpoint, route, or guard touched.
- **Concurrency & async safety:** N/A — no runtime code; no promise/async surface.
- **Input validation & DTO boundary:** N/A — prose only; no parser or DTO. (The optional gate extension, which *would* add a static-scan input surface, is deferred and out of scope.)
- **Subscription & lifecycle cleanup:** N/A — no subscriptions, hooks, or streams.
- **Harness-specific invariants (the real risk surface):**
  - Portability & harness neutrality: no host/IDE product name or host-only folder layout introduced.
  - Node-only runtime: no `.py`/`.pyc`; no script added.
  - Phase 5a `check_skill_load.cjs`: converted lines must not match F1/F2/F3 (no `` `Read` ``/`SKILL.md` raw recipe, no `{skillsRoot}/ws-…` load-by-path) — verified by the gate itself.
  - Phase 5a `check_duplicates.cjs`: no ≥6-line normative block duplicated by the edits.
  - Dependency-graph: no skill id added/removed; callers/callees unchanged in `bin/skill-dependencies.json`.
  - Integrity: any hash-bearing install content change → regenerate in the same commit (MEMORY trap 2026-09-06: regenerate from a clean tree).

## 7. Pre-PR Checklist
- [ ] Layer boundaries respected (`skills-sot` docs only).
- [ ] Domain entities and mappings encapsulated — N/A.
- [ ] Schema migrations created — N/A.
- [ ] Authorization checks applied — N/A.
- [ ] Stack & security invariants verified (harness invariants: portability, node-only, Phase 5a gates, dependency graph, integrity).
- [ ] i18n keys declared — N/A (en-us docs).
- [ ] Test cases cover all ACs (AC1–AC14; AC11–AC12 conditional/deferred).

## 8. Open Questions

1. **Gate extension (AC11/AC12):** implement now or defer? **Assumed default (deferred)** per spec Notes ("independently shippable", split if scope expands). A bare-load detector matches ~103 lines across ~60 docs → oversized allowlist → not a bounded patch.
2. **`ws-ship-pr` security line (L124):** skill-body reference vs script-level hook. **Assumed default:** convert the Dependencies skill reference (AC5) and leave the `ws-secrets-leak-review` **hook** delegation untouched (AC10).
3. **`ws-goal-fix-pr` helper (L87):** spec AC6 lists it as converted; AC10 exempts the script-level helper. **Assumed default:** convert the `ws-goal-loop` **skill body** citation while leaving the helper **script** call semantics unchanged, and record the script exemption in the PR.
