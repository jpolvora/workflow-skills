---
slug: us-90
title: "Step 7 Testing Report — LF-canonical skill integrity digests"
status: passed
skipBrowser: true
autoGate: "Approve and run test battery without browser"
anchor: uswf/us-90-20260720T191159Z/before-step-7
commit: 58479c1
reportDate: 2026-07-20
---

# Testing Report — us-90

**Verdict:** PASS — proceed to Step 8  
**Role:** Fresh Verifier (no production code edits)  
**Plan:** `specs/us-90/step-07-us-90.testing.plan.md`

## Executive summary

Required battery green on Windows CRLF working tree at `58479c1` (v0.0.65). Integrity `--check` OK; full local install suite exit 0 including Phase 0b fail-closed gates, Phase 11 EOL CRLF/LF/lone-CR parity, and packed install **without** `--force-integrity` (`Integrity: source OK`). Browser/DB/API skipped (N/A + auto). Optional site build exit 0 (no bump).

## Commands executed

| ID | Command | Exit | Result |
|----|---------|------|--------|
| V1 | `npm run verify-integrity` | **0** | `OK: bin\skill-integrity.json matches tree (v0.0.65)` |
| V2 | `npm run tests -- --local` | **0** | Full suite Success (Phase 0→11) |
| V3 | `node bin/build-site.js` | **0** | `Using package.json version: 0.0.65 (pass --bump to patch-bump)` · Site updated 30 skills |

### V1 evidence (verbatim)

```text
> workflow-skills@0.0.65 verify-integrity
> node bin/generate-skill-integrity.js --check

OK: bin\skill-integrity.json matches tree (v0.0.65)
```

### V2 evidence (key lines)

```text
Mode:          Local (development release)
[Phase 0] Self-overwrite protection...
✅ CLI refuses install when cwd is package root
[Phase 0b] Canonicity + dry-run contract files...
✅ skill-integrity.json matches tree (generate --check)
✅ package.json verify-integrity + generate-integrity scripts present
✅ AGENTS.md documents upstream skill integrity regenerate obligation
✅ verify.sh gates on integrity --check
✅ check-harness Phase 3 integrity detect + regenerate guidance present
...
Integrity: source OK (30 skill(s) + hub)
...
Integrity: consumer OK (30 skill(s) + hub)
Successfully installed 30 skill(s)
...
[Phase 11] Skill integrity checksums...
✅ integrity manifest covers installable skills + hub whitelist
✅ skill/full digests present; generator idempotent
✅ EOL canonical digest parity (CRLF/LF/lone-CR)
✅ fullPackageDigest changes when included file changes
✅ --check digest evaluation labels match/mismatch
✅ install aborts on source mismatch without copy
✅ --force-integrity overrides source mismatch
✅ post-verify failure does not bless bad local integrity record
...
✅ Success! Install, canonicity, self-overwrite, update+config preserve, packages, deps, non-interactive --yes, MEMORY isolation, uninstall, and integrity all passed.
```

Pack note: `workflow-skills-0.0.65.tgz` (105 files, package size 216.5 kB); suite cleaned tarball after install.

## AC results

| AC | Result | Evidence |
|----|--------|----------|
| **AC1** Same digests CRLF ↔ LF | **PASS** | V1 green on CRLF WT; Phase 11 `EOL canonical digest parity (CRLF/LF/lone-CR)` |
| **AC2** Install without `--force-integrity` | **PASS** | Packed local install: `Integrity: source OK (30 skill(s) + hub)` then copy; consumer OK |
| **AC3** Shared LF-canonical helper | **PASS** | Phase 11 generator idempotent + EOL unit via `hashFileBytes` / `canonicalizeForHash`; V1 uses same `--check` path |
| **AC4** Fail-closed gates | **PASS** | Phase 0b markers + verify.sh + check-harness Phase 3; Phase 11 tamper / mismatch / no-bless-on-fail all ✅ |
| **AC5** Manifest + bump in change set | **PASS** | Commit `58479c1` ships lib + `skill-integrity.json` + 0.0.65 package/footer/tarball path; V1 confirms tree match |

## Feature quality / testing quality

| Area | Status | Notes |
|------|--------|-------|
| Unit / install suite | PASS | `backendTest` full local |
| Coverage on touched code | PASS | Phase 11 covers EOL parity + integrity fail paths for hasher change |
| Flakiness | None observed | Single run exit 0 (~7.7s suite after pack) |
| Assertions | Adequate | Explicit fail on digest inequality; buffer equality for canonicalize |
| DB seeds | N/A | No database |
| API contracts / RBAC | N/A | No API |
| UI / E2E / browser | **SKIPPED** | Auto gate + no product UI |
| Accessibility / contrast | **N/A** | No forms/alerts UI |

## Defects

| Severity | Count | Detail |
|----------|-------|--------|
| Critical / High | **0** | — |
| Medium | **0** blocking | — |
| Info | 1 | `node bin/build-site.js` left `docs/index.html` modified (stamp regen; state already listed `docs/index.html` in `preExistingDirty`). Not a test failure; do not bump. Out-of-scope `bin/cli.js` help line noted in Step 5/6 — not retested as defect. |

## Defect threshold decision

Thresholds from plan met: V1 exit 0, V2 exit 0, zero Critical integrity regressions → **PASS**.

## Recommendation

- [x] **PASS** — Advance to Step 8 (Ship)
- [ ] FAIL — fix loop via `04-implement-tasks` (not required)

**Learning:** N/A (standard verification; MEMORY integrity/pack/EOL guidance applied; no new trap)
