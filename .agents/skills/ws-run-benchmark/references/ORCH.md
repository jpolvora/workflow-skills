# Live orch dispatch (load at Step 4 only)

Parent session stays on the **package root**. Orch work happens only under `{sandbox}`.

## Dispatch

Use `dispatch-agent` (`subagent_type: generalPurpose`). Put this header in the prompt:

```text
Consumer repo root: {sandbox}
Treat that path as $PWD for every Read/Write/Shell/git call.
Do not edit files outside that root.
Load {sandbox}/.agents/skills/{orchSkill}/SKILL.md and follow it for spec `{specFile}`.
Sandbox config already has dryRun: true and autoMode: true.
Do not push, publish, or create a remote PR.
Stop when {sandbox}/.agents/plans/{slug}/plan.index.json and ac-ledger.json exist and the spec implementation is in the sandbox working tree or git history.
Return: slug, workflowId, ledger present yes/no, files_touched.
```

Replace `{sandbox}`, `{orchSkill}`, `{specFile}`, `{slug}` from `context.cjs --fixture`.

## Completion gate

Done when the subagent returns **and** both files exist:

- `{sandbox}/.agents/plans/{slug}/plan.index.json`
- `{sandbox}/.agents/plans/{slug}/ac-ledger.json`

Missing either file → do not collect; report the gap.

## Notes

- Orch skills inside the sandbox are the copied consumer tree, not the parent authoring SoT.
- `git diff HEAD` completeness in collect is uncommitted-only. Product commits inside the sandbox are still allowed; verifyScore still comes from the ledger.
