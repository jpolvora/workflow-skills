# Review fix report — explicit-knowledge-chain (round 1/3)

Fixed: CR-001, CR-002. Remaining: none.

## CR-001 — marker contrast added
File: `.agents/skills/ws-fable-judge/SKILL.md` (Step 1b, +1 bullet).
Added: "Do not confuse `UNCERTAIN` (no chain source grounds the claim) with `UNVERIFIABLE` (a verification that cannot be re-run); the two markers are never interchangeable."
Test lock: `assert.match(judge, /never interchangeable/)` in `test/test-explicit-knowledge-chain.js`.

## CR-002 — return-for-completion rule added
File: `.agents/skills/ws-fable-judge/SKILL.md` (Step 1b, +1 bullet).
Added: "A report without the per-claim source table is returned for completion before the audit counts."
Test lock: `assert.match(judge, /returned for completion before the audit counts/)` in `test/test-explicit-knowledge-chain.js`.

## Verification
- `node test/test-explicit-knowledge-chain.js`: exit 0.
- Integrity regenerated + verified (digest `ccdbf2a2e5c8…`, v0.5.23).
- No other files touched by the fix.
