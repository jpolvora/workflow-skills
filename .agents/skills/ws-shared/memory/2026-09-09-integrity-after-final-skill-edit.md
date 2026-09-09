### [2026-09-09] Integrity regeneration follows final skill edits
- **Layer:** Release verification
- **Module:** `generate-skill-integrity` / package verification
- **Severity:** Medium
- **PathPattern:** `bin/skill-integrity.json`; `.agents/skills/ws-*/SKILL.md`
- **Scenario / Context:** A shipped skill body or documentation edit made after integrity generation causes the full install verification phase to reject the package as stale.
- **DO NOT:** Start the full test or package verification suite while continuing to edit hashed skill files, or treat a stale manifest as a test defect.
- **INSTEAD DO:** Finish all hashed skill edits first, run `npm run generate-integrity && npm run verify-integrity`, then run the full verification suite without concurrent source edits.
