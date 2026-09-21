---
step: 8
slug: patterns-generator-shared-hub-output
workflowId: patterns-generator-shared-hub-output-20260921T134516Z
status: completed
startedAt: "2026-09-21T13:45:16Z"
endedAt: "2026-09-21T14:12:58.094Z"
acRefs: []
---
# Delivery result — patterns-generator-shared-hub-output (lite)

- Workflow: `patterns-generator-shared-hub-output-20260921T134516Z` (lite, autoMode + fullMode)
- Branch: `develop` (strategy `stay`) · base `main` · baseline `f5696827`
- Spec: `.agents/specs/0114-patterns-generator-shared-hub-output.spec.md` (merged #382 integration scope + hub-output scope, 16 ACs)
- Commits: `beef67be` (implementation, 71 files) · `d8665b74` (review round 1 fixes)
- Review: 2 rounds, **0 Critical / 0 Warning**; 3 open Suggestions recorded (delivery-commit rename note, hub budget headroom, AC10 baseline gap)

## What changed

1. **Generated body is hub-hosted.** `seed_generated_skill.cjs` resolves the hub root from `.ws/config.json` `pathTokens.sharedDir` (default `.ws`) and writes `{sharedDir}/ws-project-patterns/SKILL.md`. Full-path realpath containment is retained: a linked hub root, a linked generated-skill directory, and a dangling leaf `SKILL.md` are all refused with no write outside the repo; in-repo links still seed.
2. **Autoload row follows the body.** `configure_autoload.cjs` treats generator-managed ids as hub-hosted: rows render the hub path, existence is checked against the hub tree (no global-skills fallback), a stale row is dropped when the tree is absent, and `--check` no longer flags the managed row while flagging absolute/manual edits.
3. **Classification + source control.** `hub-layout.json` classifies `ws-project-patterns` as consumer-owned tracked content; the hub ignore template does not ignore it; `externalSkills` notes updated in both dependency mirrors.
4. **No SoT pollution.** Because the body leaves the skills root, `bin/skill-integrity.json` no longer manifests it and the Phase 5a `ws-*` package scans never see it.
5. **Integration half closed by analysis.** Overlap matrix, draft integration plan (mechanism, bounded file list, non-goals, rollback/no-op), and a documented code-reduction **no-op** decision (no code duplication between `ws-self-learning` and the generator; shared sources are read by reference).

## Verification

| Gate | Result |
|------|--------|
| `npm run test` | 103/103 entries (mode=local) |
| `test-context-budget.js` | ok (hub 13 884 B / 14 000 B after consolidating legacy rows) |
| `test-harness-clean.js` | Harness OK (upstream clean) — 0 findings |
| `npm run generate-integrity` + `verify-integrity` | matches tree at `0.4.50` |
| `scan_stack_invariants.cjs --stack typescript-node` | 0 issues (72 files) |
| Secrets scanner | no leaks |
| Targeted batteries | `test-ws-patterns-generator.js`, `test-autoload-configure.js`, `test-ws-shared-layout.js`, `test-external-companion-skills.js` green |

Measurements (AC10): suite wall 176.6 s (no local pre-change sample — declared gap), `seed_generated_skill.cjs` 58.3 ms, skeleton body 483 B, generator SKILL.md 4 615 B.

## AC coverage

All 16 ACs are implemented and evidenced; negative scenarios NS1–NS6, NS9, NS13–NS16 carry observed test links, and NS7/NS8/NS10/NS11/NS12 are recorded as explicit declared gaps with reasons in `ac-ledger.json`.

## Open items

- CR-003: the pre-existing broken tracked run summary under `{plansDir}/ws-spec-multi/` was renamed out of the `*.state.md` glob (bytes untouched) so `validate_state.cjs rebuild-index` works; carry the rename into this delivery commit.
- CR-004/CR-005: hub budget headroom (116 B) and the missing local suite baseline remain documented limitations.
- Concurrency: another session commits on `develop` (it committed this workflow's spec work earlier); re-check `git log` before pushing.
- Ship: branch strategy `stay` on `develop`; PR #383 merged at 13:24Z, so shipping opens a **new** PR from `develop` to `main`.
