---
slug: autoload-skills-overlap-audit
status: passed
---

# Testing report — autoload-skills-overlap-audit

## Commands

| Command | Exit |
|---------|------|
| `npm run generate-integrity` | 0 |
| `npm run verify-integrity` | 0 |
| `npm run test` | 0 |

## Notes

- Integrity regenerated after skill/hub hash changes.
- No app unit surface; package installer + quality-gates + memory formatting covered.
- Formal `ws-check-harness` Phase 5b/5c not executed as standalone skill run; mitigated conflicts documented in `recommendations.md`.

## Ship follow-up (2026-08-08 /ws-ship-pr)

| Check | Evidence |
|-------|----------|
| `npm run test` (incl. `test-autoload-configure.js`) | exit 0 |
| `npm run verify-integrity` | exit 0 (v0.0.120) |
| `ws-check-workflows` | 0 critical |
| `configure_autoload.py --check` | ok, 0 findings |
| Harness Phase 2 autoload rules | documented in `PHASES.md` + tests |
| `shared-autoload-md` AC6–AC9 | closed (configure-project helper + harness dual-hub override) |
