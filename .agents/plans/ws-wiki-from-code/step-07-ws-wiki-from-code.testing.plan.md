---
slug: ws-wiki-from-code
title: ws-wiki from-code genesis and progressive-disclosure split — Testing Plan
status: active
step: 7
workflowId: ws-wiki-from-code-20260912T171926Z
startedAt: "2026-09-12T17:29:45Z"
spec: .agents/plans/ws-wiki-from-code/step-00-ws-wiki-from-code.spec.md
plan: .agents/plans/ws-wiki-from-code/step-02-ws-wiki-from-code.plan.refined.md
productCommit: 013431e4282e4ff892b6c80bb2dcf73a17bd5ee2
acRefs: []
---

# Step 7 Testing Plan — ws-wiki-from-code

## 1. Scope

Touched product files (Step 4 + Step 5 G2 commit `013431e4`):

- `.agents/skills/ws-wiki/scripts/list_wiki_from_code_areas.cjs` (new from-code area enumerator, AC6–AC8)
- `.agents/skills/ws-wiki/SKILL.md` (router refactor, AC2–AC3)
- `.agents/skills/ws-wiki/INIT.md`, `FROM-CODE.md`, `PHASE-1-SWEEP.md`, `PHASE-2-VERIFY.md`, `PHASE-3-APPLY.md`, `SYNC.md`, `UPDATE.md` (companions, AC3–AC15)
- `CATALOG.md` + `.agents/skills/ws-shared/runtime/CATALOG.md` (AC1, AC18)
- `test/test-wiki.js` (Tests 16–21, AC16 + NS coverage)

No DB, no HTTP API, no frontend, no migrations. Stack: `node-skills-package` (TypeScript-Node invariants: sync fs, CLI validation, path containment).

## 2. Unit & coverage commands (from `config.json.verification`)

| Alias | Command | Role in this step |
|-------|---------|-------------------|
| `backendTest` | `npm run test` | Canonical unit surface (`tests` + `tests:harness-efficiency`); **expected fail** on stale `bin/skill-integrity.json` until ship regen |
| `mutationTest` | (empty) | Mutation skipped per policy |
| Targeted | `node test/test-wiki.js` | Direct AC1–AC18 + NS battery for this change |
| Stack scan | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` | Zero-floating-Promise + containment rules on new helper |
| Spec authoring | `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring ".agents/specs/0079-ws-wiki-from-code.spec.md"` | AC18 |
| Integrity (read-only) | `npm run verify-integrity` | Document stale state; regen deferred to Step 8 ship |

Coverage: no separate coverage runner configured; `test-wiki.js` asserts JSON shapes, exit codes, companion presence, and string contracts as the coverage signal for touched lines.

## 3. Gaps vs changed files

- From-code enumerator (canonical order, empty-area skip, containment, unknown flags, `--help`, `git-surface` paths `[]`, no network) → `test-wiki.js` Tests 19–21.
- Companion prose (merge/overwrite gates, dry-run purity, checkpoint schema, init offer) → string assertions in `test-wiki.js`.
- Router SKILL.md (subcommand table, aliases, load-on-demand pointers) → string assertions + host-name scan (AC17).
- CATALOG rows → string assertions.
- No product-code runtime beyond helpers; no DB seed, no API contract, no UI route to probe.

## 4. Targets / credentials / DB seeds

- Target hosts/ports: N/A (local filesystem skill, no dev server).
- Credentials: none.
- DB seeds: N/A (`database.type: none`). Seed step reported as unnecessary.

## 5. API contracts / RBAC / tenancy

- API contracts: N/A (no HTTP endpoints). Applicable boundary is path containment (`assertContained` on `--repo-root`); verified by NS2/NS3 tests + stack scan.
- RBAC: N/A. Tenancy: N/A (repo-local paths only).
- Regression guard NS8/NS10: no network fetch in `ws-wiki/scripts` (static grep tests).

## 6. Integration / E2E paths

- Integration: `list_wiki_from_code_areas.cjs` + existing `validate_wiki.cjs` / `sync_wiki_index.cjs` / sweep & verify enumerators exercised via `test-wiki.js` fixtures.
- UI/E2E: skipped — no browser bound (`skip-browser` effective; autoMode gate approves without browser per dispatch).

## 7. Feature-quality AC checklist (observable outcomes)

AC1–AC18 + NS1–NS9 mapped in spec; each maps to either a `test-wiki.js` assertion (observed, exit 0) or a prose-copy assertion plus a negative fixture. Full matrix reproduced in the testing report.

## 8. Defect-threshold pass/fail metrics

- PASS when: `node test/test-wiki.js` exit 0, stack scan exit 0, authoring validate exit 0, mutation `skipped` with reason, sabotage `passed` or `skipped` with documented manual substitute, no other planned area failed.
- FAIL (fail-closed, handoff to implement fix, no Advance to 8) when: targeted wiki suite non-zero, stack scan issues, mutation score < threshold (if run), or sabotage `failed`.

## 9. Mutation section

- Command: `verification.mutationTest` empty + `defaults.skipMutationTesting: true` → mutation **skipped** (log `status: skipped`, do not fail).
- Threshold: 80 (default, unused while skipped).
- Scope: N/A while skipped.

## 10. Regression sabotage

- Formal helper: `python .agents/skills/ws-testing/scripts/run_sabotage.py --test "npm run test" --paths .agents/skills/ws-wiki/scripts/list_wiki_from_code_areas.cjs --invert-patch <caller patch>`
- **Constraint:** `backendTest` (`npm run test`) fails at `test-install.js` Phase 0b on stale `bin/skill-integrity.json` before reaching `test-wiki.js`, so `run_sabotage.py` would produce a false-positive pass (non-zero exit unrelated to inversion). AC ledger marks sabotage `not-required` on all 18 ACs.
- **Manual substitute:** invert canonical area iteration order in `list_wiki_from_code_areas.cjs`, run `node test/test-wiki.js` (expect non-zero on `areas follow canonical id order`), restore bytes, re-run green.
- Full mutation ran → sabotage would be `skipped` (superseded). Here mutation skipped → manual substitute runs instead of formal helper.
