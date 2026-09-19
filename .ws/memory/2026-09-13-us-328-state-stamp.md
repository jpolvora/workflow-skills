### [2026-09-13] New workflow state must be stamped via update_state dispatch/finish

- **Layer**: `harness`
- **Module**: `ws-spec-to-pr / workflow_state`
- **Severity**: `Medium`
- **PathPattern**: `.agents/plans/*/step-00-*.spec.md; .agents/plans/*/*.state.md`
- **Scenario / Context**: A hand-written `.state.md` for a new workflow failed `--pre-advance 1` with `artifact metadata identity mismatch`: provider register stamps `step-00` with `workflowId: <slug>`, while the gate requires the full workflow id plus `endedAt`/`acRefs`, and no `.state.json` existed. Resolved by running `update_state.cjs dispatch` then `finish --step 0`, which created the JSON, stamped the artifact, and rebuilt the index entry.
- **DO NOT**: Hand-create a workflow `.state.md` and expect pre-advance gates to pass; do not patch `workflowId` into `step-00` by hand.
- **INSTEAD DO**: Write the minimal bootstrap frontmatter, then run `update_state.cjs dispatch <state> --step 0` followed by `finish <state> --step 0 --status completed` before any `--pre-advance` check.
