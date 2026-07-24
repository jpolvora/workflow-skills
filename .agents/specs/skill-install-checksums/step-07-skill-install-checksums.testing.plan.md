---
us: skill-install-checksums
planDate: 2026-07-20
slug: skill-install-checksums
skipBrowser: true
autoMode: true
fullMode: true
sourceSpec: step-00-skill-install-checksums.spec.md
sourceReview: step-06-skill-install-checksums.review.md
---

# Testing plan — skill-install-checksums (Step 7)

**Role:** Release Engineer / QA Lead  
**Stack:** node-skills-hub (CLI + install tests; no frontend, no DB, no API host)  
**Browser/UI:** skipped (`skip-browser` / AUTO: no browser MCP)  
**DB seeds:** N/A (`database.type: none`)  
**API/RBAC/tenancy:** N/A (no HTTP surface)

## Verification commands (from `config.json` / STACK)

| Area | Command | Purpose |
|------|---------|---------|
| Backend build | `node bin/build-site.js` | Optional stamp; not required for integrity ACs; run only if time allows / report if skipped |
| Backend / unit+integration | `npm run tests -- --local` | Full install dry-run suite incl. Phase 0b stale gate + Phase 11 integrity ACs |
| Integrity drift gate | `node bin/generate-skill-integrity.js --check` | AC3/AC11: committed `bin/skill-integrity.json` matches tree + `package.json` version |
| Syntax (touched bin) | `node --check bin/cli.js` · `bin/install-rules.js` · `bin/skill-integrity-lib.js` · `bin/generate-skill-integrity.js` | Parse check after Step 6 surgical fixes |

## Changed surface (test focus)

| Path | Why |
|------|-----|
| `bin/install-rules.js` | Shared copy/skip/whitelist; hub.gitignore alias |
| `bin/skill-integrity-lib.js` | Enumerate, digests, aggregate, local record |
| `bin/generate-skill-integrity.js` | Generator + `--check` |
| `bin/skill-integrity.json` | Published manifest |
| `bin/cli.js` | Pre/post verify, `integrity`, `--check` digest, `--force-integrity`, uninstall rewrite; Step 6 W1 fix |
| `test/test-install.js` | Phase 0b + Phase 11 (AC coverage + W1 regression) |
| `README.md` | AC12 docs |
| `.agents/skills/check-harness/SKILL.md` | AC11 harness bullet |
| `.agents/skills/shared/hub.gitignore` | Packable hub gitignore |

## AC → test mapping

| AC | Observable outcome | Primary evidence |
|----|--------------------|------------------|
| AC1 | Manifest covers all installable skills + managed hub; no consumer-owned | Phase 11 manifest coverage asserts; `--check` OK |
| AC2 | Per-file digests, `skillDigest`, `fullPackageDigest`, canonical order | Phase 11 schema/order asserts in `test-install.js` |
| AC3 | Generator idempotent / stable | Phase 11 regenerate compare; `generate-skill-integrity.js --check` |
| AC4 | Pre-copy source verify fail-closed; no dest overwrite unless `--force-integrity` | Phase 11 source-mismatch abort + force override |
| AC5 | Post-copy verify + write `skill-integrity-local.json` only on success (or force) | Phase 11 clean install local record; W1 regression (no bless on fail) |
| AC6 | `integrity` audit lists paths; exit ≠0 on mismatch | Phase 11 mutate managed file → audit fail |
| AC7 | Selective install: only closure required | Phase 11 selective `goal-fix-pr` audit |
| AC8 | Consumer-owned edits never fail integrity | Phase 11 MEMORY/config edit → audit OK |
| AC9 | `--check` surfaces `fullPackageDigest` match/mismatch vs semver | Phase 11 fixture / evaluate asserts |
| AC10 | Clean install / mutate / force / digest-change covered | Phase 11 suite as a whole |
| AC11 | Stale manifest fails tests/CI path | Phase 0b `--check` inside `npm run tests -- --local` |
| AC12 | README + help document integrity, force flag, trust limit | Phase 11 help + README asserts |

## Integration / E2E paths (CLI, not browser)

1. Local package install (`--local`) workflows + selective skill sets under `test/`.
2. Integrity audit after mutation / consumer-owned edit / selective install.
3. No UI routes, translations, or a11y/contrast checks (no forms).

## Feature-quality checklist

| Check | Pass criteria |
|-------|---------------|
| Fail-closed install | Mismatch → non-zero exit; consumer skill dir not created (unless force) |
| Honest local record | Post-verify fail without force must not rewrite local record from actual digests (Step 6 W1) |
| Audit honesty | After unmanaged extra file under skill, `integrity` still fails |
| Pack lockstep | hub.gitignore / runs skip; no false pack missing-file fails |
| Docs | Help + README mention integrity + trust boundary |

## Defect thresholds (pass/fail)

| Metric | Threshold |
|--------|-----------|
| `npm run tests -- --local` | Exit 0; Phase 0b + Phase 11 must pass |
| `generate-skill-integrity.js --check` | Exit 0 |
| `node --check` on touched bin files | All exit 0 |
| Critical AC failures | 0 allowed |
| Browser / a11y | N/A (skipped) |

## Fix loops (orch override)

Skill default is report-only; **AUTO orch override:** on failure, surgical G2-code fix up to **3** loops, then re-run failed commands. Prefer minimal diffs in `bin/` / `test/` only.

## Out of scope this step

- Browser MCP / visual UI
- Live remote `npx github:…` against package root (use `--local` only)
- Publisher signing / `--against-published` (plan-deferred)
- Automatic post-copy rollback (plan-deferred)
