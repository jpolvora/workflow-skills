---
slug: us-90
title: "Step 7 Testing Plan — LF-canonical skill integrity digests"
status: planned
skipBrowser: true
autoGate: "Approve and run test battery without browser"
anchor: uswf/us-90-20260720T191159Z/before-step-7
commit: 58479c1
---

# Testing Plan — us-90

**Role:** Release Engineer / QA Lead (fresh Verifier)  
**Mode:** `autoMode` + `fullMode` → auto-gate: **Approve and run test battery without browser**  
**Skip browser:** yes (no product UI; orch auto forbids browser MCP)

## Scope

| Surface | In scope? | Notes |
|---------|-----------|-------|
| Unit / install suite | Yes | `verification.backendTest` = `npm run tests -- --local` |
| Integrity gate | Yes | `npm run verify-integrity` (must exit 0; AGENTS Testing Step approval) |
| Backend build | Optional | `verification.backendBuild` = `node bin/build-site.js` (no bump) |
| Frontend / browser | No | `frontend.framework: none`; skip-browser |
| DB / seeds / RBAC / API | N/A | No database, no API host, no tenancy |

**Changed files under test (commit `58479c1`):**

- `bin/skill-integrity-lib.js` — LF-canonical hash choke point
- `bin/skill-integrity.json` — regenerated manifest
- `test/test-install.js` — EOL parity regression (Phase 11)
- `AGENTS.md` — LF-canonical note
- `package.json`, `test/package.json`, `docs/index.html` — bump 0.0.65
- `bin/cli.js` — out-of-scope help line (harmless)

## Commands (from `config.json.verification`)

| ID | Command | Pass criteria |
|----|---------|---------------|
| V1 | `npm run verify-integrity` | exit 0; tree matches manifest (v0.0.65) |
| V2 | `npm run tests -- --local` | exit 0; Phase 0b + Phase 11 (incl. EOL parity) green |
| V3 | `node bin/build-site.js` (optional) | exit 0; no version bump; footer still 0.0.65 |

## AC → observable outcomes

| AC | Observable check | Method |
|----|------------------|--------|
| **AC1** | Same digests CRLF WT ↔ LF content; `--check` green on this Windows CRLF tree | V1 + Phase 11 `testEolCanonicalDigestParity` (or equivalent) in V2 |
| **AC2** | Packed/local install source integrity without `--force-integrity` | Phase 11 pack/install path in V2 |
| **AC3** | Generate + verify share `hashFileBytes` / LF canonicalize | Covered by V1 (idempotent check) + Phase 11 EOL unit asserts in V2 |
| **AC4** | Fail-closed on drift/tamper; gates not weakened | Phase 0b `--check` markers + Phase 11 tamper cases in V2 |
| **AC5** | Manifest + package bump committed with hasher | Already in `58479c1`; V1 confirms `packageVersion` / tree match |

## Feature-quality checklist

| Check | Expected |
|-------|----------|
| Integrity comment / header reflects EOL-stable hashing | Present in lib (reviewed prior steps; reconfirmed via green V1) |
| Consumer path does not require `--force-integrity` for EOL alone | Phase 11 install path green |
| No DB/API/UI defects to score | N/A — skip |
| Accessibility / contrast on form errors | N/A — no product UI |

## Defect thresholds (pass / fail)

| Metric | Threshold |
|--------|-----------|
| `verify-integrity` | Must exit **0** (fail closed) |
| `npm run tests -- --local` | Must exit **0**; any Phase failure = Step 7 fail |
| New Critical/High product defects | 0 allowed (CLI integrity regression counts as Critical) |
| Medium docs-only drift | Report; do not block if V1+V2 green |
| Browser / a11y | Skipped by gate |

## Gaps vs changed files

| Gap risk | Mitigation |
|----------|------------|
| Readonly Step 5 did not re-run full local suite | This step **must** run V2 |
| Windows CRLF WT could still false-green if hasher broken | V1 on CRLF WT + Phase 11 buffer CRLF/LF/lone-CR parity |
| Pack path vs source path drift after bump | `--local` exercises packed CLI + source phases (MEMORY) |

## Explicit skips

- Browser MCP / UI E2E
- DB seed / rollback
- API contract / Bearer JWT / RBAC probes
- Frontend build/test (`frontend` not product-touched beyond static `docs/` stamp)

## Execution order

1. Write this plan (done when file exists).
2. Run V1 → record exit + stdout.
3. Run V2 → record exit + key phase results.
4. Optionally V3 if build check needed.
5. Write `step-07-us-90.testing.report.md`.
6. No production code edits unless V1/V2 fail (then report for fix loop; no silent fix).
