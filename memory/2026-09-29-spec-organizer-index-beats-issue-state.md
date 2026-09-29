### [2026-09-29] Spec organizer index completion vs issueState

Layer: skills
Module: ws-spec-organizer
Severity: Medium
PathPattern: .agents/skills/ws-spec-organizer/scripts/organize_specs.cjs
Scenario / Context: `--by-status` filed delivered specs into `pending/` because frontmatter `issueState: open` was checked before `index.PRD` `[x]` and Done-log rows.
DO NOT: Treat tracker `issueState: open` as pending when the index already marks that slug completed.
INSTEAD DO: Resolve status as frontmatter `status:`, then index Archive / Done log / `[x]`, then `issueState`. An index completion signal moves the spec to `completed/` even when `issueState` is `open`.
