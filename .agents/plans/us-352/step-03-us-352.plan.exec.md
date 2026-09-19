# Exec Plan — us-352 (Step 3, sequential)

execMode: sequential (DAG disabled). One task after another, in order.

## Task list

1. **schema** — Add `ws-goal-fix-pr.useSubAgents` (boolean, default false) to
   `config.schema.json` + `config.json.example` section.
   Verify: `node -e` JSON parse both files.
2. **resolver** — Add + export `resolveFixPrDispatchMode` in `workflow_state.cjs`.
   Verify: `node -e` truth-table probe (absent/false/true/non-boolean).
3. **skills** — Append fix-loop execution-mode section to `ws-goal-fix-pr`
   SKILL.md; short paragraphs to `ws-fix-pr` + `ws-ship-pr` SKILL.md.
   Verify: `node test/test-goal-fix-pr-orchestrator-dispatch.js`.
4. **gui** — One `Add-ConfigFieldRow` for `ws-goal-fix-pr.useSubAgents` in
   `Edit-WorkflowSkillsConfig.ps1` (integrations tab, ASCII-only).
   Verify: `node test/test-powershell-config-editor.js`.
5. **docs+test** — README bullet; new `test/test-fix-pr-subagent-mode.js`;
   register in `package.json`.
   Verify: `node test/test-fix-pr-subagent-mode.js`.
6. **full-gate** — `npm run test` (touched areas), `test-harness-clean.js`,
   Step 5 self-check report, Step 6 self-review, Step 7 testing report,
   Step 8 ship (push + PR, base main).

Files touched (product): 10 files listed in step-01 plan section 4.
No DAG JSON (sequential). No worktree (Windows + config default false).
