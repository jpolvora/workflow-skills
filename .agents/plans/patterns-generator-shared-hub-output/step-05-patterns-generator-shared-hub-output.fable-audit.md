# Fable judge audit — patterns-generator-shared-hub-output (pre-ship)

## Claims audited

1. Generated body moved to `{sharedDir}/ws-project-patterns/SKILL.md` with full-path realpath containment retained.
2. `configure_autoload.cjs` renders/validates hub-path rows for generator-managed ids; row dropped when the hub tree is absent.
3. `hub-layout.json` classifies the path consumer-owned; hub ignore template keeps it tracked; installer exclusion unchanged.
4. Batteries updated; `npm run test` 103/103; harness clean; integrity regenerated at `0.4.50`; secrets clean.
5. Integration half closed by analysis (overlap matrix, plan, code-reduction no-op with evidence, measured baselines).

## Ground truth

- `git diff --stat beef67be~1..HEAD` → 78 files, +579/−245. Blast radius: `.agents/skills/ws-patterns-generator/**`, `.agents/skills/ws-configure-project/scripts/configure_autoload.cjs`, `.agents/skills/ws-shared/runtime/{AGENTS.md,hub-layout.json,skill-dependencies.json}`, `bin/{skill-dependencies,skill-integrity}.json`, `test/{test-ws-patterns-generator,test-ws-shared-layout}.js`, `test/package.json`, `package.json`, `README.md`, `FEATURES.md`, `docs/**`, `.agents/specs/0114-*`, `.agents/plans/patterns-generator-shared-hub-output/**` (delivery), `MEMORY.md` + `memory/*`, `.ws/CHANGELOG.md`, plus the release-mandated 55 `SKILL.md` version-frontmatter syncs.
- Fresh re-runs during this audit: `npm run verify-integrity` → matches tree (`0.4.50`); `node test/test-harness-clean.js` → Harness OK, 0 findings. Post-fix `npm run test` → 103/103 (run after the review-fix commit, product tree unchanged since).

## Fraud hunt

| Fraud | Detection result |
|-------|------------------|
| Weakened checks | **None.** The two test batteries were re-targeted to the new contract and gained assertions (no skills-root body, configured `pathTokens.sharedDir`, hub-path row, layout classification, ignore template). No assertion was deleted or relaxed; `test-context-budget.js` and `test-harness-clean.js` are untouched. |
| False completion | **None.** All claims re-verified by executed commands, not by pasted output. |
| Scope creep | **Declared, justified only.** (a) release-mandated `build-site:bump` rewrote 55 `SKILL.md` frontmatter versions plus the site footer and `test/package.json` tarball ref; (b) review CR-003 renamed a pre-existing frontmatter-less `ws-spec-multi` run summary out of the `*.state.md` glob (bytes untouched) because it broke `validate_state.cjs rebuild-index` for the whole plans tree; (c) index.PRD status/done-log sync. No drive-by refactors in product code. |
| Unauthorized action | **None.** No force-push, no history rewrite, no data deletion. The rename preserves content; commits are the user-requested auto-ship flow. |

## Verdict

**VERIFIED WITH CAVEATS**

Caveats / unverifiable items:

1. **UNVERIFIABLE (AC10):** suite-time non-regression cannot be proven for this machine — no local pre-change wall-time sample exists. Post-change measurement 176.6 s with an unchanged 103-entry count is recorded as a declared gap (`NS10`).
2. **Cross-scope housekeeping (CR-003):** the unrelated run-summary rename is a repo-wide side effect accepted as a documented fix for a tracked broken file.
3. **Open non-blocking Suggestions:** CR-004 (SoT hub headroom 116 B), CR-005 (baseline gap).
4. `fable.auditVerdictsBlockShip: "refuted"` → caveated verdicts do **not** block ship.

Adversarial self-learning: High-severity memory entry written (`memory/2026-09-21-fable-audit-caveats-baseline.md`) and compiled.
