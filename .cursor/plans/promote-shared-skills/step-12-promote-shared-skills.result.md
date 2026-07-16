---
slug: promote-shared-skills
title: "Promote shared skills to first-class installable packages"
deliveredAt: 2026-07-16T10:05:00Z
commit: 0e0bc9c252a88e32034b3b6b45119082fc4f04ca
verifyScore: 9.3
---

# Delivery Result — promote-shared-skills

## Summary

Promoted seven workflow-agnostic skills from `.agents/skills/shared/<skill>/` to top-level installable skills. Added `bin/skill-dependencies.json` with Full / Workflows / Extra packages and install-time dependency edges. Updated the Node installer for package shortcuts, transitive dep select-on, hub-only `shared/` copy, and consumer migration. Regenerated the site catalog with an **Installation packages** section. Expanded local install tests (Phases 4–7).

## Files (high level)

| Area | Changes |
|------|---------|
| Skills | `git mv` caveman, gabarito, karpathy-guidelines, spec-format, goal-loop, self-learning, changelog → top-level |
| Hub | `shared/` config/docs only; rewritten `shared/AGENTS.md` |
| Installer | `bin/cli.js` + `bin/skill-dependencies.json` |
| Site | `bin/build-site.js`, `docs/index.html` |
| Harness | Root + packaged `AGENTS.md`, link sweep, check-harness rules |
| Tests | `test/test-install.js` Phases 4–7 |
| Docs | `README.md`, `install-skills.sh` banner |

## Acceptance Criteria

All AC1–AC15 **PASS** (see `step-06-promote-shared-skills.plan.report.md`).

## Telemetry

| Item | Value |
|------|-------|
| Baseline LOC | 22448 |
| First code commit | `0e0bc9c` |
| Verify score | 9.3 |
| Tests | `npm run tests -- --local` green |
| Package version | 0.0.25 |

## Follow-ups

- Run full `check-harness` Phases 0–5c before merge to `main`.
- Bash installer remains flat-only (Node CLI is canonical for packages).
