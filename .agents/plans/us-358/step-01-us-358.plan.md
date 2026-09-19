# Plan — us-358: AGENTS.md skill-dependency-graph authoring rule

## Scope
Docs-only. Single product file: `AGENTS.md` (Harness change protocol section).
Manifest `bin/skill-dependencies.json` and scripts untouched.

## AC mapping
- AC1 (rule: consult manifest, callers/callees, atomic update or follow-ups) → edit 1: new rule block in Harness change protocol.
- AC2 (rule requires integrity regen + harness checks over affected set) → same edit 1 covers it.
- AC3 (worked example spec-list → spec-index) → same edit 1 covers it.
- AC4 (verify-integrity + test-harness-clean pass) → verification step.

## Edits
1. `AGENTS.md` § Harness change protocol: insert numbered item 4 (after item 3, before the closing `---`):
   rule text + manifest reference + integrity/harness-check requirement + worked example.
   Portable, host-neutral wording. en-us.

## Verification
- `Select-String "skill-dependencies.json" AGENTS.md` non-empty (AC1/AC3).
- `npm run verify-integrity` exit 0; `node test/test-harness-clean.js` 0 findings (AC4).
- `git diff --stat` shows `AGENTS.md` only (DoR bounded scope).

## Out of scope (per spec)
No runtime gate script, no automated diff tooling, no skill-body changes.

## Stack invariants
`node-skills-package` docs change; no framework boundaries touched. Section 6 N/A beyond Node harness checks.
