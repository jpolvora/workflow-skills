---
slug: ws-shared-resolution-cleanup
title: .ws resolution vs ws-shared folders cleanup
status: completed
step: 2
workflowId: ws-shared-resolution-cleanup-20260919T210648Z
draftPlan: .agents/plans/ws-shared-resolution-cleanup/step-01-ws-shared-resolution-cleanup.plan.md
specPath: .agents/plans/ws-shared-resolution-cleanup/step-00-ws-shared-resolution-cleanup.spec.md
interview: .agents/plans/ws-shared-resolution-cleanup/step-02-ws-shared-resolution-cleanup.plan-interview.md
acRefs: []
startedAt: "2026-09-19T21:06:48Z"
endedAt: "2026-09-19T21:12:12.145Z"
---
# Refined plan — .ws resolution vs ws-shared folders cleanup

Step 1 plan as audited in Step 2, with interview resolutions (G1–G7) applied.
Delta lines are marked with `(Step 2:)`. `step-01-*.plan.md` remains untouched.

## 0. Summary & Business Rules

Single-agent ordered cleanup pass over path-resolution mistakes between the project consumer hub (`.ws/`, token `{sharedDir}`) and the upstream skill source of truth (`.agents/skills/ws-shared/`, token `{skillsRoot}/ws-shared`). All 55 skills under `.agents/skills/ws-*`, root `AGENTS.md`, `.ws/AGENTS.md`, `ws-shared/runtime/` contract files, plus `bin/`, `test/`, and site/docs (`docs/index.html`, `README.md`, `CATALOG.md`, `FEATURES.md`) must resolve consumer config, managed runtime, and skill bodies through portable tokens (`{sharedDir}`, `{skillsRoot}`, `{globalSkillsRoot}`) and documented install layouts instead of hardcoded paths.

Business rules (from grill D1–D7, frozen): wider scope accepted (all 55 skills + hubs + `bin/` + `test/` + site/docs; global install tree itself is never edited); strict tokens (upstream-authoring links use relative `../ws-shared/runtime/` only between sibling skills; consumer-facing prose and scripts use tokens expanded before tool calls; project `.ws/config.json` wins over global; never hardcode `.ws/` or `.agents/skills/ws-shared/` as consumer instructions); `{skillsRoot}` expansion order is explicit override → project `.agents/skills` → `{globalSkillsRoot}`; global bodies stay read-only fallback; strict gates (`test-harness-clean.js` 0 findings, `npm run test` green, `verify-integrity` clean, `ws-check-harness` consumer/global/hybrid cases).

Baseline evidence (measured 2026-09-19, pre-plan): 55 `ws-*` skill dirs; 5 `SKILL.md` files contain a `.ws/config.json` string (`ws-pre-daily:36`, `ws-senior-developer:20`, `ws-show-harness:26`, `ws-spec-to-pr-lite:34`, `ws-wiki:15`).

(Step 2:) Correction per G1 — those 5 hits are entry-gate sentences (`$PWD/.ws/config.json` missing → `user-gate` → `ws-configure-project`), matching the canonical contract (`config-resolution.md` § Entry check uses the same form). They are **candidates, not confirmed violations**: Step 4 audits each against the violation/allowlist rule (§3 step 2) before editing. 203 token usages (`{sharedDir}`/`{skillsRoot}`/`{globalSkillsRoot}`) already present across skill bodies; bare `ws-shared/` occurrences are dominated by legitimate relative links (`../ws-shared/runtime/...`, exempted by the link checker's lookbehind) — link-target violations (if any) are owned by `check_harness_links.cjs` / `test-harness-clean.js` findings, to be captured as the numeric baseline in Step 4 before editing.

Security mitigations: no product runtime change (Node 22 skill package, docs/prose/scripts only); no secrets handling; global-without-hub must fail closed with a `ws-configure-project` pointer, never silently read global config as project config.

(Step 2:) Violation/allowlist rule per G1 — **violation** = consumer instruction telling an agent to read/write config at a literal `.ws/config.json` path where token expansion applies (especially scripts building paths from literals). **Allowlist** = (a) entry-gate sentences naming the concrete default (`$PWD/.ws/config.json` + `user-gate` pointer), (b) Markdown link targets to the real repo file, (c) `config-resolution.md`'s own canonical-path block. Only violations are rewritten.

## 1. Definition of Ready & Scope

Resolved assumptions: canonical tokens `{sharedDir}`, `{skillsRoot}`, `{globalSkillsRoot}` cover all cases (strict tokens per D3); global-vs-vendored matrix recorded in spec Notes D2/D6; workforce is a single-agent ordered pass (D4); standard resolution order per D6.

Measurable Acceptance Criteria (from spec, unchanged):

- AC1: Every skill resolves consumer config via `{sharedDir}/config.json` with project-local precedence over global, never a hardcoded `.ws/config.json` path where a token applies — verified by grep audit over `.agents/skills/ws-*/SKILL.md`.
- AC2: Managed runtime references resolve via `{sharedDir}/runtime/` in consumer context and `{skillsRoot}/ws-shared/runtime/` in upstream-authoring context, with no bare `ws-shared/` shorthand in link targets — verified by `check_harness_links.cjs` and `test-harness-clean.js` with 0 findings.
- AC3: Global vs vendored resolution is explicit: `{skillsRoot}` expansion (explicit override, then project `.agents/skills`, then `{globalSkillsRoot}`) is honored in prose and scripts, and global execution checks for project `config.json` for config-dependent skills — verified by `ws-check-harness` consumer/global/hybrid cases.
- AC4: `bin/` installer, `test/` gates, and site/docs describe the same layout (SoT `.agents/skills/ws-*`, project hub `.ws/`, global fallback) with no stale host-specific folder defaults — verified by `npm run test` and `ws-check-harness` green.
- AC5: Negative case — a skill invoked globally without a project hub fails closed with a `ws-configure-project` pointer instead of silently reading global config as project config — verified by a config-missing test.

Negative scenarios (must stay covered): NS1 (bare `ws-shared/MEMORY.md` shorthand warns, prefers `{memoryDir}/MEMORY.md`); NS2 (token inside Markdown link target flags as broken-link finding); NS3 (global config-dependent invocation without project `.ws/config.json` prompts `ws-configure-project`).

Out of scope: editing `$HOME/.agents/skills` live installs; behavior changes beyond path resolution (diffs stay surgical to resolution mistakes); new host adapters or marketplace manifests.

## 2. Technical Design & Architecture

Layers (per `.ws/config.json` stack `node-skills-package`): `skills-sot` (`.agents/skills` — published skill bodies, upstream SoT; primary edit layer), `installer-cli` (`bin/` — installer wording/layout), `tests` (`test/` — gates). No backend/frontend/database layers; no schema, migrations, or API changes.

Design: token-first prose. Consumer-facing references use `{sharedDir}/config.json`, `{sharedDir}/runtime/`, `{skillsRoot}/ws-shared/runtime/` (upstream-authoring context), and `{globalSkillsRoot}` for the global fallback, each expanded from project `.ws/config.json` `pathTokens` before tool calls. Sibling-skill links keep relative `../ws-shared/runtime/<file>` form (real paths, not tokens — tokens inside Markdown link targets are flagged findings per NS2). Scripts resolve roots at runtime from config (`pathTokens.sharedDir`, `pathTokens.skillsRoot`, `plans.dir`) with the documented fallback chain, never a hardcoded `.ws/` or `.agents/skills/ws-shared/` literal in consumer instructions.

Invariant checks: `commitPlanFilesOnlyAtStep8: true` — plan artifacts under `.agents/plans/ws-shared-resolution-cleanup/` are not staged/committed until Step 8 close; Step 4 stages only workflow `files_touched`. Skill-body edits change hashed install content, so `npm run generate-integrity` + `npm run verify-integrity` must run in the same change. No host product names in skill bodies (portability rule); no legacy path aliases or migration shims.

## 3. Step-by-Step Plan

1. Capture numeric baseline (read-only): run `node test/test-harness-clean.js`, `node .agents/skills/ws-check-harness/scripts/check_harness_links.cjs`, and the grep audits (hardcoded `.ws/config.json`; bare `ws-shared/` in link targets) over all 55 skills; record finding counts as the before-state. Affected files: none (observation only). Check: findings list saved to step working notes, not product files. (Step 2, G4:) First run `git diff -- .agents/skills/ws-shared/runtime/config.schema.json` — the 18-insertion pre-existing modification is adopted into the baseline only if it touches resolution/config wording, otherwise left untouched and excluded from `files_touched`/commits. `.agents/plans/index.json` (workflow bookkeeping) is never Step 4 scope.
2. AC1 — consumer config token sweep: audit the 5 known `.ws/config.json` occurrences (`.agents/skills/ws-pre-daily/SKILL.md`, `ws-senior-developer/SKILL.md`, `ws-show-harness/SKILL.md`, `ws-spec-to-pr-lite/SKILL.md`, `ws-wiki/SKILL.md`) against the §0 violation/allowlist rule and record a per-hit verdict table (violation → rewrite to `{sharedDir}/config.json` plus project-over-global precedence wording where missing; allowlisted entry-gate prose → no change); re-grep all 55 `SKILL.md` for remaining hardcoded `.ws/config.json` outside allowlisted contexts and fix each violation. Affected files: violating skills only. Check: grep count for `\.ws/config\.json` in violation (non-allowlisted) context is 0.
3. AC2 — managed runtime reference sweep: convert consumer-context runtime links to `{sharedDir}/runtime/` and upstream-authoring references to `{skillsRoot}/ws-shared/runtime/`; keep sibling-skill relative `../ws-shared/runtime/` links where they are real paths; eliminate bare `ws-shared/` shorthand in Markdown link targets. Covers the 55 skill bodies plus root `AGENTS.md`, `.ws/AGENTS.md`, and `ws-shared/runtime/` contract files (`tools.md`, `config-resolution.md`, `gates.md`). Check: `check_harness_links.cjs` and `test-harness-clean.js` report 0 findings.
4. AC3 — global vs vendored explicitness: verify prose and scripts honor `{skillsRoot}` expansion order (explicit override → project `.agents/skills` → `{globalSkillsRoot}`); verify config-dependent skills executed from a global root check for project `{sharedDir}/config.json` and point at `ws-configure-project` when missing. Touch only wording/scripts that misstate or skip the order or the gate. Check: `ws-check-harness` consumer, global, and hybrid cases green.
5. AC4 — installer/tests/docs alignment: sweep `bin/` installer wording, `test/` gate expectations, and `docs/index.html`, `README.md`, `CATALOG.md`, `FEATURES.md` for stale host-specific folder defaults or layouts contradicting SoT `.agents/skills/ws-*` / project hub `.ws/` / global fallback; fix wording only. Check: `npm run test` green, `ws-check-harness` green.
6. AC5 — config-missing fail-closed test: add a test under `test/` (default `test/test-global-config-missing.js`; alternatively extend `test-check-harness-install-mode.js` if the fixture fits — record the choice) asserting a globally invoked config-dependent resolution without a project hub fails closed with a `ws-configure-project` pointer (never silently uses global config). Covers NS3. Check: new test passes; deleting the hub fixture makes it fail with the pointer (negative proof).
7. Integrity + full gates: run `npm run generate-integrity` + `npm run verify-integrity` (same change, skill bodies are hashed), then `npm run test`, `node test/test-harness-clean.js` (0 findings), and `ws-check-harness` consumer/global/hybrid. Check: all green; no collateral edits (`git status` shows only intended files; installer side-effects reverted if any).

## 4. Permissions, Tenancy & i18n

No RBAC permissions, no tenancy model, no user-facing strings: this is an upstream skill-package cleanup. No tenant data, no endpoints, no i18n keys. Only invariant: never edit `$HOME/.agents/skills` live installs from this package root (managed consumer installs; `update` overwrites them).

## 5. Test Coverage

- AC1 → grep audit `Select-String -Path '.agents/skills/ws-*/SKILL.md' -Pattern '\.ws/config\.json'` count 0 in violation (non-allowlisted) context; existing suite `npm run test` stays green. Negative sibling: a reintroduced hardcoded `.ws/config.json` consumer instruction must be caught by the audit (probe: re-add in a scratch copy under `/tmp`, confirm grep flags it). (Step 2, G2:) identical strings in scripts/help text (`verify.sh`, `configure_autoload.py`, provider `*.py`) are reviewed under §6 path-safety review, not the SKILL.md grep gate.
- AC2 → `node .agents/skills/ws-check-harness/scripts/check_harness_links.cjs` exit 0; `node test/test-harness-clean.js` reports 0 findings. NS1/NS2 covered transitively: the checker's `shorthand` finding (bare `ws-shared/...`, NS1 family) and `tokenInLinkTargets` finding (NS2) run inside the `test-harness-clean.js` Phase 2/4 gate — that suite is their red baseline.
- AC3 → `ws-check-harness` consumer case green; global case green; hybrid case green (global bodies + project `.ws/config.json`). (Step 2, G3:) red baselines are `test-local-first-precedence.js`, `test-hybrid-consumer-root.js`, `test-check-harness-install-mode.js` — breaking the expansion order fails them.
- AC4 → `npm run test` green; `ws-check-harness` green; no stale host-specific folder defaults in `bin/`, `test/`, `docs/index.html`, `README.md`, `CATALOG.md`, `FEATURES.md` (grep for legacy host folder names returns 0). (Step 2, G3:) red baselines include `test-doc-sync.js` and `test-shared-hub-paths.js`.
- AC5 → new config-missing test under `test/` (default `test/test-global-config-missing.js`, name finalized in Step 4): globally invoked config-dependent resolution without a project hub asserts fail-closed with `ws-configure-project` pointer; NS3 covered by the same test. No existing test covers this (repo grep confirms: `test/` mentions of `ws-configure-project` cover entry-gate wording and configure flows only).

## 6. Stack & Security Invariants Verification Plan

Stack rule pack: `.agents/skills/ws-shared/runtime/stacks/typescript-node.md` (verified present; closest pack for the Node 22 skill package; no product runtime, so framework boundaries below are assessed, not built). Project invariants from `.ws/config.json` (verified present): `commitPlanFilesOnlyAtStep8: true` (plan artifacts uncommitted until Step 8 close), `skipQualityGates: false`.

Touched framework boundaries:

- Authorization & endpoint protection: not touched — no endpoints, routes, or policies in scope; no verification beyond confirming no auth-related wording is altered.
- Concurrency & async safety (zero floating promises): touched only if AC5's new test or touched scripts add async Node code — every Promise must be awaited/returned/caught per the rule pack; verify by review of the new test file plus `npm run test` passing without unhandled rejections.
- Input validation & DTO boundary: touched at the CLI/config boundary — scripts must treat hub paths as config-derived (tokens expanded from `.ws/config.json` `pathTokens`), never string-concatenated from untrusted input; no `child_process.exec` with interpolated paths (rule pack §4 — use arg arrays if a subprocess is added). (Step 2, G6:) explicit review targets — `ws-ship-pr/scripts/verify.sh` (literal `.ws/config.json` default), `ws-shared/runtime/scripts/resolve_consumer_root.cjs` (+ Python mirror), `ws-configure-project/scripts/configure_autoload.py`, provider `*.py` config reads, and the new AC5 test file.
- Subscription & lifecycle cleanup: not touched — no streams, listeners, or long-lived handles; new test must close any fixtures/handles it opens (`finally` cleanup).

Verification commands: `node test/test-harness-clean.js` (0 findings); `npm run test`; `npm run verify-integrity`; `ws-check-harness` consumer/global/hybrid cases; `git status` collateral check. Secret scan: no secrets in scope; run configured secrets checking at review proof per the session contract.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (edits in `skills-sot`, `installer-cli`, `tests`, docs only; no product runtime).
- [ ] Domain entities and mappings encapsulated (n/a — no domain model).
- [ ] Schema migrations created (n/a — `database.type: none`).
- [ ] Authorization checks applied (n/a — no endpoints; AC5 fail-closed gate implemented and tested).
- [ ] Stack & security invariants verified (async/validation/path-safety review on new test + touched scripts per §6 review-target list).
- [ ] i18n keys declared (n/a — `frontend.framework: none`).
- [ ] Test cases cover all ACs (§5 mapping AC1–AC5 + NS1–NS3).
- [ ] (Step 2, G4:) Dirty-file verdicts recorded: `config.schema.json` adopted-or-excluded with rationale; `.agents/plans/index.json` untouched by Step 4.

## 8. Open Questions

- Q1: AC5 test filename — (Step 2, G5:) default `test/test-global-config-missing.js`; Step 4 may extend `test-check-harness-install-mode.js` instead. Resolved with default.
- Q2: Pre-existing dirty file `.agents/skills/ws-shared/runtime/config.schema.json` — (Step 2, G4:) Step 4 diff-reviews it (adopt if in-scope resolution wording, else exclude). Resolved with rule.
- Q3: `bin/`, site/docs sweep may surface zero violations — acceptable outcome is "audited, no change" per file; Step 4 records per-file verdicts rather than forcing edits. Confirmed, unchanged.
