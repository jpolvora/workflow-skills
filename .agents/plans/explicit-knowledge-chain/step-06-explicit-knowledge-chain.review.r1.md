---
step: 6
slug: explicit-knowledge-chain
workflowId: explicit-knowledge-chain-20260930T140853Z
status: completed
startedAt: "2026-09-30T14:32:25.736Z"
endedAt: "2026-09-30T14:32:25.736Z"
acRefs: []
---
# Code review R1 — explicit-knowledge-chain

Scope: G2 commit `2edacd4a` (7 files; shared-head note: `main...HEAD` also contains prior merged batch items 1–6, out of scope).
Base: `main`. Stack: node-skills-package (typescript-node rule pack). localReviewCommand: none configured (skipped).

### CR-001 [Warning] open .agents/skills/ws-fable-judge/SKILL.md:L28-L35

UNCERTAIN vs UNVERIFIABLE not contrasted in judge Step 1b.
Read evidence: Step 1b introduces `UNCERTAIN` while Step 3 uses `UNVERIFIABLE`, with no contrast sentence.
Failure scenario: an audit labels an ungrounded claim `UNVERIFIABLE`, breaking the deterministic single-marker matching (AC3/AC8).
Missing protection: one contrast sentence fixing the two meanings as non-interchangeable.
Discards: surrounding contexts differ (grounding vs re-run), but a hurried agent can still mix two uppercase markers without an explicit ban.

### CR-002 [Warning] open .agents/skills/ws-fable-judge/SKILL.md:L28-L35

Return-for-completion rule missing from judge (spec negative scenario).
Read evidence: Step 1b checks per-claim compliance but never states the table-missing gate.
Failure scenario: a report without the per-claim source table passes the audit instead of being returned for completion.
Missing protection: the explicit return-for-completion sentence in Step 1b.
Discards: the method skill states the table requirement; the judge side owned the enforcement and lacked it.

## Discarded hypotheses
- Step 1b numbering breaks quoters: no test/skill cites judge step numbers — dropped.
- Stale old-text assertions: full suite green after the change (153/153) — dropped.
- Portability (host names / spec numbers): added prose is generic — dropped.
- Suite registration bloat: `test-suites.json` diff is +3 lines only — dropped.

## Memory sweep
Folded traps honored: no internal spec numbers in shipped prose; integrity regenerated after final skill edits from a clean skill tree; test regexes verified via node; quoter sweep done (fable-domain + plan-write hits generic, skipped with reason). No violations.

## Invariants
`scan_stack_invariants.cjs`: 0 issues. `test-harness-clean.js`: 0 findings. Integrity manifest matches tree.

## Verdict
2 Warnings → fix round required. No Critical.
