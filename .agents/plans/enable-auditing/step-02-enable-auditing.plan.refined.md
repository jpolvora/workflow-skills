---
slug: enable-auditing
title: "defaults.enableAuditing — runtime workflow audit wrapper for ws-spec-to-pr*"
status: "plan refined ok"
---

## 0. Summary & Business Rules

(Same as step-01; interview confirmed skill id `ws-audit`, upstream issue gate via `gh issue create` draft, default-off config.)

## Interview registry

| id | class | section | gap | resolution | resolutionSource |
|----|-------|---------|-----|------------|------------------|
| G1 | non-blocking | 2 | Skill package name | `ws-audit` | project (step-01 plan) |
| G2 | non-blocking | 8 | Issue auto-create | user-gate only; no auto | spec AC10 |
| G3 | blocking | 3 | Upstream repo resolution | `skill-dependencies.json` upstream block | project |

## 1–8. (unchanged from step-01)

See `step-01-enable-auditing.plan.md` for full sections 1–8. Open questions: all resolved.
