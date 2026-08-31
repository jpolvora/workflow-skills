# Live orch dispatch (ws-run-benchmark skill step 5 only)

Never load this file from `ws-spec-to-pr` or `ws-spec-to-pr-lite`. Numbering here is this Extra skill's own steps, not the Spec-to-PR pipeline.

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
- Completeness/judge diff uses the prepare baseline (`.benchmark-baseline-sha`) plus untracked paths. Product commits inside the sandbox are expected; verifyScore still comes from the ledger.
