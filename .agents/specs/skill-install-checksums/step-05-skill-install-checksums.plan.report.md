---
us: "skill-install-checksums"
reportDate: 2026-07-20
score: 9
sourcePlans: ["step-02-skill-install-checksums.plan.refined.md"]
evalSource: step-00-skill-install-checksums.spec.md
githubSource: none
---

# Implementation Report - skill-install-checksums

**Generated on:** 2026-07-20
**Score:** 9/10
**Evaluation source:** step-00-skill-install-checksums.spec.md (ACs 1–12; refined plan for deferred/locked decisions)
**Reference Plan:** step-02-skill-install-checksums.plan.refined.md
**Gate (AUTO):** score ≥ 7 → may Advance (no Pause required)

## Result by Feature (Plan & ACs)

| Feature | Situation | Detail / Evidence |
|---------|-----------|-------------------|
| AC1 Upstream SHA-256 manifest covers installable skills + managed hub | **Implemented** | `bin/skill-integrity.json` present (`packageVersion` 0.0.63, `algorithm` sha256, 30 skills, 11 hub files). Enum via `bin/skill-integrity-lib.js` + `bin/install-rules.js` (`HUB_WHITELIST`, `SKIP_INSTALL_FILES`, consumer-owned sets). `node bin/generate-skill-integrity.js --check` OK. Phase 11 covers installable skills + hub whitelist. |
| AC2 Per-file digests, `skillDigest`, `fullPackageDigest`, canonical order | **Implemented** | Manifest schema + `canonicalOrder` (`hubPlacement: after-skills`). Digest rules in `skill-integrity-lib.js` (`digestFromFilesMap`, `aggregateDigest`). |
| AC3 Maintained generator; stable / idempotent output | **Implemented** | `bin/generate-skill-integrity.js` + `package.json` script `generate-integrity`. Phase 11 idempotency + lowercase hex asserts. `--check` drift gate. |
| AC4 Pre-copy source verify; fail closed; no overwrite unless `--force-integrity` | **Implemented** | `preVerifySourceIntegrity` in `bin/cli.js` (~L574–596) before copy in `installSelectedSkills` / update path. Test: install aborts on source mismatch without creating dest skill dir; `--force-integrity` proceeds (`test/test-install.js` Phase 11). |
| AC5 Post-copy consumer verify + `skill-integrity-local.json` | **Implemented** | `postVerifyAndWriteLocal` (~L602–653); writes `shared/skill-integrity-local.json` with closure digests + `verifiedAt`. Gitignored + `CONSUMER_OWNED_HUB_FILES`. Clean workflows install test asserts local record. |
| AC6 `integrity` audit; exit ≠0 on mismatch; print paths | **Implemented** | `runIntegrityAudit` / `integrity` command (~L715–778, L1180+). Mutation of managed `SKILL.md` → audit fail + path report (Phase 11). |
| AC7 Selective closure only | **Implemented** | Verify/audit scoped to installed ids; record-only absent skills skipped. Phase 11 selective `goal-fix-pr` install + audit OK without Extra-only skills. |
| AC8 Consumer-owned never hashed / never fail audit | **Implemented** | Exclusions in `install-rules.js` + hub enum. Edit `MEMORY.md`/`config.json` → integrity still exit 0 (Phase 11). |
| AC9 `--check` compares `fullPackageDigest` distinctly from semver | **Implemented** | `--check`/`check` fetches remote `bin/skill-integrity.json`; `evaluateVersionAndDigestCheck` labels `fullPackageDigest: match|mismatch`; digest mismatch → exit 1. Unreachable remote → warn/skip digest only (plan lock). Unit-style fixture asserts in Phase 11. |
| AC10 Automated tests (clean / mutate / force / digest change) | **Implemented** | `test/test-install.js` Phase 0b (stale gate) + Phase 11 (AC1–AC12 scenarios). Evidence: `npm run tests -- --local` PASS (orch-provided). |
| AC11 Stale committed manifest fails CI/tests/harness | **Implemented** | Phase 0b runs `generate-skill-integrity.js --check`. check-harness Phase 3 bullet (upstream) in `.agents/skills/check-harness/SKILL.md`. Live `--check` OK for v0.0.63. |
| AC12 README documents commands, fail-closed, exclusions, unsigned trust limit | **Implemented** | `README.md` Safety/install: integrity commands, `--force-integrity`, exclusions, unsigned trust boundary, no post-copy rollback. Help text aligned. Phase 11 help+README assert. |
| Plan: shared `install-rules` + integrity lib + generator | **Implemented** | `bin/install-rules.js`, `bin/skill-integrity-lib.js`, `bin/generate-skill-integrity.js`, CLI wiring. |
| Plan: uninstall rewrites local integrity record | **Implemented** | `rewriteLocalIntegrityForRemaining` (~L655–693) called from uninstall path. |
| Hub pack: `hub.gitignore` → consumer `.gitignore` | **Implemented differently** | Refined plan named whitelist `.gitignore`; npm cannot pack that name. Locked asymmetry adapted: source `hub.gitignore` + `HUB_DEST_ALIASES`; consumer verify reads dest file under whitelist key (`enumerateHubFiles`). Covered by tests; not an AC gap. |
| `integrity --against-published` | **Not implemented** (deferred by plan) | Refined plan §8 / out of scope: v1 = local `integrity` + `--check` remote digest. |
| Automatic post-copy rollback | **Not implemented** (deferred by plan) | Refined plan: fail-closed exit ≠0; no auto-rollback. Documented in README + CLI messages. |

## Additional Features Beyond Original Plan

| Feature / Extra Behavior | Location in Code | Note |
|--------------------------|------------------|------|
| `hub.gitignore` npm-pack alias | `bin/install-rules.js`, `enumerateHubFiles` | Required packaging fix; keeps installer/hash lockstep |
| `SKIP_INSTALL_FILES` includes `runs` | `bin/install-rules.js` | Aligns copy/hash skip with ephemeral runs dirs |
| `package.json` files negation for local integrity | `package.json` `!.agents/skills/shared/skill-integrity-local.json` | Extra safety vs shipping consumer record |
| Uninstall local-record rewrite | `bin/cli.js` `rewriteLocalIntegrityForRemaining` | Plan G8; keeps AC6 honest after uninstall |

## Gaps and Next Steps

- None blocking for Step 6 (score 9 ≥ 7). AUTO may Advance.
- Deferred (intentional, do not treat as fail): `integrity --against-published`; automatic post-copy rollback.
- Residual risk (documented): post-verify failure can leave a partially overwritten consumer tree; operator must re-run install/update (or `--force-integrity`) to recover.
- Optional follow-up (out of this US): publisher signing / pinned lockfile (spec out of scope).

## Verification evidence (this step)

| Check | Result |
|-------|--------|
| `node bin/generate-skill-integrity.js --check` | OK v0.0.63 (re-run during verify) |
| `npm run tests -- --local` | PASS including Phase 11 (orch-provided; not re-run this step) |
| Spec ACs 1–12 mapped | All Implemented except plan-deferred items above |
| Product code edits this step | None (readonly verify) |

## Scoring notes

Weighted adherence vs ACs + refined plan locks: **9/10**. Full AC coverage with automated evidence; −1 for intentional residual (no post-copy rollback / no `--against-published`) and hub packaging deviation from the literal refined whitelist name (correctly adapted, still worth a half-step caution vs a clean 10).
