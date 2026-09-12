---
slug: ws-wiki-code-verify
title: ws-wiki Phase 2 verify and Phase 3 plan/apply — Testing Plan
status: active
step: 7
workflowId: ws-wiki-code-verify-20260912T160041Z
startedAt: "2026-09-12T16:00:41Z"
spec: .agents/plans/ws-wiki-code-verify/step-00-ws-wiki-code-verify.spec.md
plan: .agents/plans/ws-wiki-code-verify/step-02-ws-wiki-code-verify.plan.refined.md
---

# Step 7 Testing Plan — ws-wiki-code-verify

## 1. Scope

Touched product files (Step 4 + Step 5 G2 commit `c1260ddf`):

- `.agents/skills/ws-wiki/scripts/list_wiki_feature_pages.cjs` (new enumerator, AC4–AC5)
- `.agents/skills/ws-wiki/SKILL.md` (Phase 2 + Phase 3 prose, AC1–AC3, AC6–AC16)
- `CATALOG.md` + `.agents/skills/ws-shared/runtime/CATALOG.md` (AC18)
- `test/test-wiki.js` (AC17 coverage)

No DB, no HTTP API, no frontend, no migrations. Stack: `node-skills-package` (TypeScript-Node invariants: sync fs, CLI validation, path containment).

## 2. Unit & coverage commands (from `config.json.verification`)

| Alias | Command | Role in this step |
|-------|---------|-------------------|
| `backendTest` | `npm run test` | Canonical unit surface (`tests` + `tests:harness-efficiency`, ends with `test-wiki.js`) |
| `mutationTest` | (empty) | Mutation skipped per policy |
| Targeted | `node test/test-wiki.js` | Direct AC4–AC18 battery for this change |
| Stack scan | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` | Zero-floating-Promise + containment rules |
| Spec authoring | `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring "<spec>"` | AC19 |
| Integrity (read-only) | `npm run verify-integrity` | Regen deferred to ship (Step 8); check only here |

Coverage: no separate coverage runner configured; `test-wiki.js` asserts JSON shapes, exit codes, mtimes, and string presence as the coverage signal for touched lines.

## 3. Gaps vs changed files

- Enumerator branches (empty wiki, containment reject, unknown flag, `--help`, sort, exclusions, domain/feature derivation) → covered by `test-wiki.js` fixtures.
- SKILL.md prose gates (post-sweep offer, STOPs, dry-run purity, audited/apply lifecycle, truth gates, batch order, checkpoint schema) → covered by string assertions in `test-wiki.js` (gate behavior itself is prose + orch autoMode, not machine-executable).
- CATALOG rows → string assertions.
- No product-code runtime path beyond the enumerator; no DB seed, no API contract, no UI route to probe.

## 4. Targets / credentials / DB seeds

- Target hosts/ports: N/A (local filesystem skill, no dev server).
- Credentials: none.
- DB seeds: N/A (`database.type: none`). Seed step reported as unnecessary.

## 5. API contracts / RBAC / tenancy

- API contracts: N/A (no HTTP endpoints). Applicable boundary is path containment (`assertContained` on `--repo-root`/`--wiki-dir`); verified by NS2/NS11 tests + stack scan.
- RBAC: N/A. Tenancy: N/A (repo-local paths only).
- Regression guard NS10: no network fetch in `ws-wiki/scripts` (static grep test).

## 6. Integration / E2E paths

- Integration: enumerator + `validate_wiki.cjs` + `sync_wiki_index.cjs` composition exercised via `test-wiki.js` index-only fixture (validate still runs).
- UI/E2E: skipped — no browser bound (`skip-browser` effective; autoMode gate approves without browser per dispatch).

## 7. Feature-quality AC checklist (observable outcomes)

AC1–AC19 + NS1–NS11 mapped in plan §5; each maps to either a `test-wiki.js` assertion (observed, exit 0) or a prose-copy assertion plus a negative fixture. Full matrix reproduced in the testing report.

## 8. Defect-threshold pass/fail metrics

- PASS when: `node test/test-wiki.js` exit 0, stack scan exit 0, authoring validate exit 0, sabotage `passed` (inverted code bites, bytes restored), mutation `skipped` with reason, no other planned area failed.
- FAIL (fail-closed, handoff to implement fix, no Advance to 8) when: any runner non-zero, mutation score < threshold (if run), or sabotage `failed`.

## 9. Mutation section

- Command: `verification.mutationTest` empty + `defaults.skipMutationTesting: true` → mutation **skipped** (log `status: skipped`, do not fail).
- Threshold: 80 (default, unused while skipped).
- Scope: N/A while skipped; sabotage runs instead (supersede rule inverted: sabotage runs when mutation skipped).

## 10. Regression sabotage

- Helper: `python .agents/skills/ws-testing/scripts/run_sabotage.py --test "npm run test" --paths .agents/skills/ws-wiki/scripts/list_wiki_feature_pages.cjs --invert-patch <caller patch>`
- Invert patch: caller-authored sort-order inversion (reverse POSIX sort) on the new enumerator; every declared path must change bytes; test must exit non-zero; restoration must match pre-invert snapshot bytes on `--paths` only.
- Full mutation ran → sabotage would be `skipped` (superseded). Here mutation skipped → sabotage runs.
