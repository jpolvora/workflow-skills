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
