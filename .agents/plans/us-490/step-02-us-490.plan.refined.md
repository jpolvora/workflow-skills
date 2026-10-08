---
step: 2
slug: us-490
workflowId: us-490-20261008T155141Z
status: completed
startedAt: "2026-10-08T16:10:16Z"
endedAt: "2026-10-08T16:10:16Z"
acRefs: []
supersedes: step-01-us-490.plan.md
---
# Implementation Plan (refined) — us-490

Refined after Step 2 interview (`step-02-us-490.plan-interview.md`). This is the plan of record; `step-01-us-490.plan.md` is superseded. All registry gaps G1–G8 are closed (§9).

## 0. Summary & Business Rules

Add an optional, advisory `ws-retro` skill (issue #490) that reviews a completed workflow run and proposes curated, evidence-linked improvements to the agent environment (never product code): memory entries, harness directives, reviewer standards, automated checks, navigation pointers, and no-op deletions.

- **BR1 (propose-only):** proposals only; nothing is written to memory or directives until a human approves via `user-gate`. Auto runs never write.
- **BR2 (evidence-first):** every candidate cites a specific run moment/artifact; ungrounded candidates are rejected by `validate_candidates.cjs` and never presented.
- **BR3 (single category):** each candidate carries exactly one category from `memory | harness-directive | reviewer-standard | automated-check | navigation-pointer | no-op-deletion`.
- **BR4 (opt-in auto-run):** top-level `retro: { enabled: false }` gates a post-convergence run; omitted/missing/false preserves existing behavior (AC3/AC4).
- **BR5 (never blocks):** the auto-run step never gates close, ship, merge, or fix-PR convergence (AC8).
- **BR6 (single-run scope):** reviews one run; never audits/prunes earlier-run candidates.
- **BR7 (anonymization):** no private consumer names, absolute paths, hostnames, or customer data.

## 1. Definition of Ready & Scope

Resolved (interview §Shared understanding):

- Config key: top-level `retro.enabled` boolean, default `false`.
- Placement: orchestrator-owned optional post-convergence retro step, both standard and lite, triggered when the run's ship phase ends for this process (standard: after Step 9 convergence/stop, else after Step 8 ship; lite: after Step 5), before the optional post-completion proof-of-work step (G1).
- Inputs: workflow state + step artifacts + telemetry first; git/PR context when available; transcripts optional. No new store: memory reuses `ws-self-learning`.

Out of scope: automatic edits without approval; pruning earlier-run candidates; replacing code review/adversarial audit; private-consumer-derived diagnostics.

## 2. Technical Design & Architecture

### 2.1 Placement (AC3/AC4/AC8, G1)

Trigger = "the run's ship phase ended for this process", identical to the proof-of-work post-completion slot. Standard: after Step 9 convergence/stop, or after Step 8 ship when Step 9 does not run. Lite: after Step 5 convergence / terminal ship. Ordering: retro first, then proof-of-work. Batch children that do not merge run it after fix-pr convergence/stop; a later owner-side merge does not re-trigger it.

Hook mechanics (both orchs):

1. `node {skillsRoot}/ws-retro/scripts/retro_hook.cjs should-run --config {sharedDir}/config.json --json`
2. `{"run":false}` → log `retro | skipped:{reason}` (`disabled`/`missing`) and continue.
3. `{"run":true}` → dispatch `ws-retro` in auto mode with compact pointers (`{workflow-id}.state.json`, `telemetry.jsonl`, `{us-dir}`); log `retro | started:{artifact}`. Any failure is logged and ignored (never blocks).

### 2.2 Skill package (AC1, AC2)

`{skillsRoot}/ws-retro/`:

| File | Role |
|------|------|
| `SKILL.md` | Contract: manual standalone invocation (AC2), auto mode, candidate schema (AC5), approval flow (AC7), memory via `ws-self-learning` (AC6), never-block (AC8), anonymization, single-run scope. Frontmatter `name: ws-retro`, `invocation_names: [retro, ws-retro]`. |
| `scripts/retro_hook.cjs` | Pure decision helper (G5): `should-run --config FILE [--json]` → `{"run": true|false, "reason": "enabled"|"disabled"|"missing", "key": "retro.enabled"}`; exit 0 decision, exit 2 usage error, no writes. Explicit `true` only. |
| `scripts/validate_candidates.cjs` | Validator (G3): `--input FILE [--json] [--repo-root DIR]` → `{ok, accepted:[...], rejected:[{id, reason}]}`; stable reasons `field-required`, `category-invalid`, `evidence-required`, `evidence-unresolvable`; malformed JSON exits non-zero. |

Artifacts under the reviewed run's `{us-dir}` (G4, runtime-only): `{workflow-id}.retro.md` (ranked report) and `{workflow-id}.retro.json` (machine candidates). Registered in `ARTIFACTS.md` (T04).

### 2.3 Config surface (AC9)

`config.schema.json` (top-level `retro` object, `enabled` boolean default false), `templates/config.json.example` (`retro` block + `_comment`), `Edit-WorkflowSkillsConfig.ps1` (`-Section 'retro' -Key 'enabled' -Type 'bool'`, integrations tab; G6).

### 2.4 Registration (AC1, AC10, G8)

Both `bin/skill-dependencies.json` and `{skillsRoot}/ws-shared/runtime/skill-dependencies.json`: add `ws-retro` to the `workflows` package list; add `"ws-retro": ["ws-self-learning"]`; append `ws-retro` to `ws-spec-to-pr` and `ws-spec-to-pr-lite` dependency lists.

### 2.5 Docs/site (AC10)

`README.md`, `FEATURES.md` (count line → 53 Workflows + 8 Extra; catalog row), `CATALOG.md`, `{skillsRoot}/ws-shared/runtime/CATALOG.md`, root `AGENTS.md` table, `.ws/AGENTS.md` where rows exist; `docs/index.html` via `npm run build-site`.

### 2.6 Contract docs (AC3/AC4/AC8)

`ws-spec-to-pr/SKILL.md`, `ws-spec-to-pr/STEP-DISPATCH.md` (post-completion section), `ws-spec-to-pr-lite/SKILL.md`, `ws-shared/runtime/gates.md`, `ws-spec-to-pr/ARTIFACTS.md`.

## 3. Step-by-Step Plan

- **T01 — `{skillsRoot}/ws-retro/SKILL.md`** (AC1, AC2, AC5, AC6, AC7, AC8). Sections: mode matrix; input pointers; process (select run → collect friction signals → draft candidates → validate → write report/json → approve via `user-gate` → apply approved only); candidate schema; guardrails BR1–BR7; `## Subagent contract`. Check: no raw `Read {skillsRoot}/ws-...` recipes; aliases `retro`/`ws-retro`.
- **T02 — `{skillsRoot}/ws-retro/scripts/retro_hook.cjs`** (AC3, AC4, NS1). G5 contract; explicit-true only; fail-closed off.
- **T03 — `{skillsRoot}/ws-retro/scripts/validate_candidates.cjs`** (AC5, AC7, NS2, NS4). G3 contract; evidence resolvability with `--repo-root`; repo-root containment; no shell.
- **T04 — Hook wiring** (AC3, AC4, AC8): `ws-spec-to-pr/SKILL.md`, `ws-spec-to-pr/STEP-DISPATCH.md`, `ws-spec-to-pr-lite/SKILL.md`, `ws-shared/runtime/gates.md`, `ws-spec-to-pr/ARTIFACTS.md`.
- **T05 — Config surface** (AC9): schema + example + PS editor.
- **T06 — Registration** (AC1, AC10): both dependency manifests.
- **T07 — Tests** (AC1–AC5, AC9, NS1–NS4): `test/test-ws-retro.js` + `test/test-suites.json`.
- **T08 — Docs** (AC10): README, FEATURES, CATALOG ×2, root AGENTS, `.ws/AGENTS.md`.
- **T09 — Site** (AC10): `npm run build-site`; verify `ws-retro` card.
- **T10 — Verification** (AC10): `npm run generate-integrity` + `npm run verify-integrity`; `node test/test-harness-clean.js` 0 findings; stack scan.
- **T11 — Ship-time bump** (AC10): `npm run build-site:bump` + integrity regeneration at Step 8.

## 4. Permissions, Tenancy & i18n

N/A for auth/tenancy/i18n (no new surface; en-us only). The anonymization rule (BR7) is the active data boundary.

## 5. Test Coverage

| AC | Tests |
|----|-------|
| AC1 | V1 (package + frontmatter + both dependency manifests), V2 (integrity includes package, gate) |
| AC2 | V3 (standalone docs + helpers run without workflow state) |
| AC3 | V4 (`should-run` true only for explicit true) |
| AC4 | V5 (omitted → `missing`; false/non-bool → `disabled`; `run:false`) |
| AC5 | V6 (required fields; closed category enum; accepted output) |
| AC6 | V7 (docs route memory via `ws-self-learning`) |
| AC7 | V8 (docs require user-gate before writes; auto proposes only) |
| AC8 | V9 (docs: never blocks; hook failure = log-and-continue) |
| AC9 | V10 (schema/example/editor trio + parity suite) |
| AC10 | V11 (integrity + harness 0 findings + suites with writable npm cache) |
| NS1 | V12 (no run, no artifact, no memory file modified) |
| NS2 | V13 (no evidence → `evidence-required`; nothing generic emitted) |
| NS3 | V14 (decline path = no writes; no approval bypass helper exists) |
| NS4 | V15 (stack scan clean) |

## 6. Stack & Security Invariants Verification Plan

Stack `typescript-node` (layers: skills-sot + installer-cli + tests). Touched boundaries:

- **Path resolution & containment:** helper inputs resolve under the resolved root; evidence paths validated only when `--repo-root` given; reads only. Verified by stack scan + V6/V15.
- **Process execution:** explicit `node` launchers in docs; helpers spawn nothing; no shell concatenation. Verified by stack scan (NS4).
- **Async safety:** synchronous fs per repo helper convention or awaited promises; no floating promises. Verified by `node --check` + scan.
- **Untrusted input:** candidate JSON validated fail-closed (structured rejection, no crash). Verified by V6/V13.
- **Docs/integrity boundary:** harness links/catalog/integrity green after changes. Verified by T10.
- **Config boundary:** `retro.enabled` opt-in, fail-closed off; GUI row type matches schema (bool). Verified by `test-powershell-config-editor.js` (V10).

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected.
- [ ] No product behavior change outside scope.
- [ ] Config trio updated; parity test green.
- [ ] Hooks non-blocking; default off.
- [ ] Stack & security invariants verified.
- [ ] i18n none needed.
- [ ] V1–V15 cover all ACs.
- [ ] Integrity regenerated; harness 0 findings; site rebuilt; version bumped at ship.

## 8. Open Questions

None blocking. Known host note: `npm test` may need a writable `npm_config_cache` override (MEMORY trap G7); report honestly if still environment-blocked.

## 9. Refinement Decisions (closed registry G1–G8)

- **G1 (blocking, model-inferred):** trigger defined as "run's ship phase ended for this process"; retro → proof-of-work ordering. See §2.1.
- **G2 (blocking, model-inferred):** V5/V12 are authored first (red before `retro_hook.cjs`).
- **G3 (blocking, model-inferred):** validator contract pinned with stable rejection reasons. See §2.2.
- **G4 (non-blocking, project):** `{workflow-id}.retro.md` / `.retro.json` naming per ARTIFACTS.md.
- **G5 (non-blocking, project):** hook mirrors `resolve_proof_of_work.cjs` purity/exit contract.
- **G6 (non-blocking, project):** editor row bool + parity suite gate.
- **G7 (non-blocking, project):** npm cache override for test runs.
- **G8 (non-blocking, project):** dependency manifest placement.
