# Verify report — us-358 (Step 5)

## Score: 10/10 — advance to review.

## AC checks
- AC1: `Select-String "skill-dependencies.json" AGENTS.md` hits new rule block (line 380) — rule states every skill edit must consult the manifest (callers/callees), verify dependent contracts, update atomically or record follow-ups. PASS.
- AC2: rule text requires `npm run generate-integrity` + `npm run verify-integrity` and `ws-check-harness` / `node test/test-harness-clean.js` over the affected set. PASS (read rule text).
- AC3: worked example present (`ws-spec-list` → check `ws-spec-index`). PASS.
- AC4: `npm run verify-integrity` exit 0 (`skill-integrity.json` matches tree v0.4.41); `node test/test-harness-clean.js` 0 findings. PASS.

## Scope
Working-tree `git diff --stat` shows unrelated pre-existing modifications (index.json, CHANGELOG, MEMORY, test/package.json from sibling activity); this workflow's change is `AGENTS.md` +1 line only. Commit will stage `AGENTS.md` path-scoped only.

## Negative scenarios
- Rule without manifest ref → grep empty: covered (line 380 contains `bin/skill-dependencies.json`).
- Edit without integrity regen → `verify-integrity` run post-edit: green.
- Missing harness-clean proof → run completed: 0 findings.
