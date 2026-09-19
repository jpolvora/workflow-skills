# Code review — us-358 (Step 6)

## Verdict: PASS, no fix round needed.

## Scope reviewed
`git diff main...HEAD --stat`: `AGENTS.md | 1 +`. Single added list item, no other files.

## Findings
1. Rule text complete: manifest consult (callers/callees), contract verification, atomic update or explicit follow-ups — AC1 covered.
2. Integrity + harness-check requirement present with exact commands — AC2 covered.
3. Worked example present (`ws-spec-list` → `ws-spec-index`) — AC3 covered.
4. Placement correct: item 4 in Harness change protocol, ships with before-ship checklist, not a parallel process.
5. Style: en-us, host-neutral (manifest path + commands only), matches surrounding list style.
6. Surgical: no adjacent edits, no formatting churn, no skill-body changes.

## Adversarial check
- Could the rule be read as requiring a new blocking gate script? No — text says "consult ... verify ... update or record follow-ups" plus existing regen/check commands; spec Out of Scope (no runtime enforcement) preserved.
- Version bump? Not required: root `AGENTS.md` is the upstream-authoring hub, not hashed package content (`verify-integrity` passes without regen).

## Fix round
None. Proceed to testing.
