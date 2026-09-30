# Fresh-Verify Report

Template for `ws-fresh-verify` (standard Step 6b).

Canonical skill: [`SKILL.md`](SKILL.md). Registry:
[`ARTIFACTS.md`](../ws-spec-to-pr/ARTIFACTS.md).

- **Slug**: [slug]
- **Date/Time**: [Timestamp]
- **Round**: [n]/3
- **Defects**: [count] (`loopAction`: continue | pause | done)

## Per-AC Verdicts

| AC | Verdict | Pass evidence | Injection red | Score |
|----|---------|---------------|---------------|-------|
| AC1 | pass / fail | [path:Lstart-Lend] or *none* | [failing test + exit code] or *none* | 1 / 0 |

An AC scores 1 only with both pass evidence and an injection red; otherwise 0.

## Injection Results

| AC | Red observed | Failing test | Test exit code | Restored | Worktree removed |
|----|--------------|--------------|----------------|----------|------------------|
| AC1 | yes / no | [name] or *none* | [code] | yes / no | yes / no |

## Defects

- [ ] **ACn**: [missing pass evidence | missing red signal | both] — [detail]

Empty when zero defects.

## Round History

| Round | Defects in | Defects out | Action |
|-------|------------|-------------|--------|
| 1 | [n] | [n] | continue / pause / done |

Appended per round, never rewritten.

## Skip Marker

Present only on the skip path: `no-product-changes` — the run has no product
tree changes, so no verdicts were re-derived and no faults were injected.

The orchestrator owns the fix loop and any later commit. This verifier never
stages or commits files.
