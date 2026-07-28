# PR #164 — Fix round 1

**Date:** 2026-07-28  
**Threads handled:** 1  
**Mode:** ws-goal-fix-pr autoMode

## Thread PRRT_kwDOTFajc86UXad4

| Field | Value |
|-------|-------|
| File | `.agents/skills/ws-classify-complexity/SKILL.md` |
| Score | 6 |
| Action | fix-code |

**Issue:** Extra `classify` invocation alias violates allowed-forms (`ws-skillname` + bare `skillname` only).

**Fix:**
- Removed `classify` from `invocation_names` (kept `classify-complexity`, `ws-classify-complexity`)
- Updated standalone example to `/classify-complexity`
- Aligned two orch references in `ws-spec-to-pr/SKILL.md`
- Regenerated `bin/skill-integrity.json`

## Verification

- `npm run verify-integrity` → OK
