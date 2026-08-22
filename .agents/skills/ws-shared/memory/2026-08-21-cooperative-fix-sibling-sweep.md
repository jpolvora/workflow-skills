### [2026-08-21] Cooperative fix must sweep the defect class
- **Layer**: `Harness`
- **Module**: `ws-fix-pr / COOPERATIVE_FIX`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-fix-pr/**, .agents/skills/ws-goal-fix-pr/SKILL.md`
- **Scenario / Context**: Reviewer threads often flag one file:line plus similar occurrences. Resolving after patching only the anchor left the same false-green or untyped-schema class elsewhere, so the next review round re-opened siblings.
- **DO NOT**: Close a review thread after fixing only the anchored instance when the body names extra paths or a grep would find the same class.
- **INSTEAD DO**: Name the defect class, grep repo-wide (and every path the thread already listed), fix in-scope hits in the same round, and record path+reason for any skip.
