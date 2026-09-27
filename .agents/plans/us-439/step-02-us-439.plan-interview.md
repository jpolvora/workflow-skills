---
slug: us-439
step: 2
workflowId: us-439-20260927T170000Z
status: completed
round: 1
blocking_open: 0
shared_understanding: confirmed
startedAt: "2026-09-27T17:00:00Z"
endedAt: "2026-09-27T18:43:13.736Z"
acRefs: []
---
# Plan Interview — us-439

Plan audited: `.agents/plans/us-439/step-01-us-439.plan.md`
Spec audited: `.agents/plans/us-439/step-00-us-439.spec.md`
`force_interview`: false (`check_memory_conflict.cjs`). `autoMode`: true — every gap resolved from
project evidence or a recorded model-inferred default; no `user-gate` emitted.

## Project-context sweep (evidence consulted)

- Spec of record + `step-00` (14 ACs, 6 negative scenarios, DoR table).
- Existing skill/helper/test already on the working tree — read to confirm the plan matches the code.
- Sibling skills for convention: `ws-spec-from-provider` (reverse half), `ws-spec-write`
  (reformulation + anonymization), `ws-spec-provider-github` / `ws-spec-provider-azure-devops`
  (`create-issue` intents), `ws-spec-manager` (router table).
- Owned runtime: `.agents/skills/ws-shared/runtime/git-ownership.md` §5, `.../docs` budgets
  (`test/test-context-budget.js`: root `CATALOG.md` ≤ 24500 B, ws-shared `AGENTS.md` ≤ 14000 B).
- `.ws/config.json` (`providers.active: local` + `issueTrackers.github.enabled: true`),
  `.ws/autoload.md`, `.agents/skills/ws-shared/runtime/autoload.md`.
- `{memoryDir}/MEMORY.md` — absent at the effective path (`memory_missing: true`); no trap conflict.

## Interview registry

| id | class | section | gap | recommendation / resolution | status | resolutionSource | evidence | dependsOn |
|----|-------|---------|-----|-----------------------------|--------|------------------|----------|-----------|
| G1 | non-blocking | 1 Objective | Plan describes an already-implemented skill; "implementation" is really verify + close. | Keep T00 as verify/finalize against AC1/AC3–AC11 rather than greenfield build; no code churn without a failing check. | closed | project | SKILL.md + `run_spec_to_issue.cjs` + `test/test-ws-spec-to-issue.js` present on the branch | — |
| G2 | non-blocking | 2 Architecture | `FEATURES.md` / `docs/llms.txt` were not in the original router edit set. | Include them in T02 (AC13 requires `FEATURES.md`; `docs/llms.txt` mirrors spec entry/exit paths). | closed | project | spec AC13 names `FEATURES.md`; `tracking.featuresMdEnabled: true` | G1 |
| G3 | non-blocking | 5 Task DAG | `enableDag: true` but tasks touch mostly disjoint doc surfaces — parallel >1 subagent adds risk of conflicting hub edits. | Execute the DAG sequentially in one worker (DAG ≤3 parallel is a ceiling, not a requirement); recorded in refined plan. | closed | model-inferred | `defaults.enableDag` true; sequential still satisfies exec plan requirement | G1 |
| G4 | non-blocking | 6 Invariants | No `.py` may ship; helper must stay CommonJS. | Helper is `.cjs`; `ws-check-harness` critical Python scan is the gate. | closed | project | hub `AGENTS.md` § Skill script runtime; `run_spec_to_issue.cjs` header | G1 |
| G5 | non-blocking | 6 Invariants | Hub byte budgets are near the limit; adding router rows risks `test-context-budget.js` failure. | Keep new rows terse; root `CATALOG.md` currently 24492 B (≤24500), ws-shared `AGENTS.md` 13996 B (≤14000); re-run budget test after each doc edit. | closed | project | `test/test-context-budget.js` L40–L42 | G2 |
| G6 | blocking | 6 Invariants | New skill absent from the §5 git-ownership matrix fails `test-git-ownership-contract.js` fail-closed. | Add `ws-spec-to-issue | read-only` matrix row (no local write, no git verbs). | closed | project | `git-ownership.md` §5; `test/test-git-ownership-contract.js` L296–L302 | G1 |
| G7 | blocking | 4 AC map | AC12 round-trip has no owned artifact in this PR (integration is the provider + `ws-spec-from-provider`). | Verify by contract reuse: assert the created body is spec-shaped (Description + ACs + Out of Scope) so `validate_spec.cjs` compat/authoring passes; cite provider `fetch-to-spec` as the reuse surface, no new code. | closed | model-inferred | spec AC12 text; `ws-spec-from-provider` contract | G1 |
| G8 | non-blocking | 3 Reuse | Duplicating provider CLI recipes into the skill body would violate portability. | Skill names no provider recipe; helper delegates to `create_issue.cjs` via the provider folder path. | closed | project | SKILL.md §Guardrails; helper `providerScriptFor()` | G1 |
| G9 | blocking | 6 Invariants | Secret leakage risk via the temp body file. | Temp file is created under `os.tmpdir()` (outside the repo) and removed in `finally`; token only read inside the provider script from the configured env var; nothing echoed. | closed | project | helper `main()` tmpDir/finally; SKILL.md §Guardrails | G1 |
| G10 | non-blocking | 6 Invariants | Version must bump exactly once above the merge-base. | `0.5.5` → `0.5.6` via `node bin/build-site.js --bump`; align `packageVersion` in both manifests + `version.json` + `test/package.json` + site footer. | closed | project | merge-base `dbff8486` `package.json` = 0.5.5; hub `AGENTS.md` § Version bump | G1 |

`blocking_open`: 0 · rounds used: 1/3 · `shared_understanding`: confirmed (workflow auto-confirm).

## DoR / failing-test-baseline audit

- Every AC in the map has a named verification (test file section, harness check, or integrity
  command) — no AC left without a check.
- Failing-test baseline: `test/test-ws-spec-to-issue.js` §6 asserts the `providers.active: local`
  STOP and §7 the anonymization-guard rejection — both negative-first assertions exist before
  final green.
- Framework-boundary invariants: none of the touched boundaries are authorization/async/DTO/
  subscription surfaces; the boundary that matters here is **git/working-tree safety**, covered by
  the tree-snapshot assertion (§6/§7) and the `read-only` ownership class.
- Section 6 of the plan lists stack + security invariants with a verification per row — present.

## Spec sync

No closed decision contradicts an acceptance-criterion sentence; the spec of record and
`step-00` require no AC-text rewrite in this step.
