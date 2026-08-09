---
slug: us-183
status: stub
complexityClass: simple
execMode: sequential
createdAt: 2026-08-09T01:58:00Z
---

# Implementation Plan (stub) — us-183

## Goal

Fix broken `../ws-shared/` relative links in `ws-classify-complexity/references/THRESHOLDS.md` so they resolve to `{sharedDir}`.

## Files

| File | Action |
|------|--------|
| `.agents/skills/ws-classify-complexity/references/THRESHOLDS.md` | Edit link targets only (`../` → `../../`) |

## Acceptance checklist

- [ ] AC1 — `config.json` link → `../../ws-shared/config.json` resolves
- [ ] AC2 — `config.json.example` link → `../../ws-shared/config.json.example` resolves
- [ ] AC3 — Link-target-only diff in `THRESHOLDS.md`
- [ ] AC4 — No broken Markdown links for this file
- [ ] AC5 — `npm run generate-integrity` + `npm run verify-integrity` exit 0

## Open Questions

(none)
