---
us: skill-install-checksums
reportDate: 2026-07-20
slug: skill-install-checksums
skipBrowser: true
autoMode: true
fixLoops: 0
verdict: PASS
sourcePlan: step-07-skill-install-checksums.testing.plan.md
sourceSpec: step-00-skill-install-checksums.spec.md
---

# Testing report — skill-install-checksums (Step 7)

**Verdict:** PASS (0 fix loops)  
**Stack:** node-skills-hub · package `0.0.63`  
**Browser/UI / DB / API:** N/A (skipped per plan + AUTO)

## Command results

| Check | Command | Exit | Evidence |
|-------|---------|------|----------|
| Syntax | `node --check` on `bin/cli.js`, `install-rules.js`, `skill-integrity-lib.js`, `generate-skill-integrity.js` | 0 | `node --check: ALL OK` |
| Integrity drift | `node bin/generate-skill-integrity.js --check` | 0 | `OK: bin\skill-integrity.json matches tree (v0.0.63)` |
| Unit + integration | `npm run tests -- --local` | 0 | Full suite Success; Phase 0b + Phase 11 all green |
| Backend build | `node bin/build-site.js` | skipped | Not required for integrity ACs; site stamp orthogonal |

### Suite highlights (`npm run tests -- --local`)

**Phase 0b**
- `skill-integrity.json matches tree (generate --check)`

**Phase 11 (integrity)**
- manifest covers installable skills + hub whitelist
- skill/full digests present; generator idempotent
- `fullPackageDigest` changes when included file changes
- `--check` digest evaluation labels match/mismatch
- help and README mention integrity
- install aborts on source mismatch without copy
- `--force-integrity` overrides source mismatch
- post-install writes local integrity record
- post-verify failure does not bless bad local integrity record (Step 6 W1 regression)
- integrity audit fails on managed file mutation
- consumer-owned edits ignored by integrity
- selective closure integrity ignores non-installed skills

Closing line: `Success! Install, canonicity, … and integrity all passed.` (exit 0)

## AC → result matrix

| AC | Result | Evidence |
|----|--------|----------|
| AC1 | PASS | Phase 11 manifest coverage; `--check` OK v0.0.63 |
| AC2 | PASS | Phase 11 digests present + generator idempotent |
| AC3 | PASS | Phase 11 idempotent; live `generate-skill-integrity.js --check` |
| AC4 | PASS | abort on source mismatch; force override |
| AC5 | PASS | local record written; W1: no bless on post-verify fail |
| AC6 | PASS | audit fails + path report on managed mutation |
| AC7 | PASS | selective `goal-fix-pr` audit OK |
| AC8 | PASS | MEMORY/config edits ignored |
| AC9 | PASS | `--check` digest label match/mismatch |
| AC10 | PASS | Phase 11 covers clean / mutate / force / digest-change |
| AC11 | PASS | Phase 0b stale gate inside suite |
| AC12 | PASS | help + README integrity/trust asserts |

## Areas from skill Steps 2–6

| Area | Status |
|------|--------|
| Base build / syntax | PASS (`node --check`) |
| Unit / install integration | PASS (`npm run tests -- --local`) |
| DB seeds | N/A |
| API contracts | N/A |
| UI/E2E / a11y contrast | SKIPPED (no browser; no forms) |
| Feature quality vs ACs | PASS (all 12 ACs) |

## Defects / fix loops

None. Thresholds met on first run (0 of 3 loops used).

## Gaps

- Plan-deferred (not failures): `integrity --against-published`; automatic post-copy rollback.
- Residual documented risk: post-verify fail can leave partial consumer tree; operator re-runs install/update.

## Recommendation

Advance to Step 8 (`ws-ship-pr`) under AUTO fullMode.
