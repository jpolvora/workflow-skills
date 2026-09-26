# Step 1 Plan — subagent-task-dispatch (0137)

- workflowId: us-0137-20260926T171000Z
- slug: subagent-task-dispatch
- spec: .agents/specs/0137-subagent-task-dispatch.spec.md
- flowMode: standard (classifier: 10 steps / 8 files est; executed inline per batch stay-on-develop override)
- modelsPreset: muse

## Key decisions

- Binary mapping: the spec's `antigravity dispatch` is the requester's harness alias;
  `antigravity` in this repo names a host IDE, not this package. Implement as
  `workflow-skills dispatch` (bin/cli.js passthrough) + runtime module. Documented
  in --help and README.
- No phantom execution: without a configured runner (`defaults.hostAdapter.cliTemplate`)
  or an injected executor, dispatch fails closed with a structured error (exit 1 /
  rejected promise). Success paths in tests use fixture runners.
- Spawn without a shell: template tokenized quote-aware first, then {prompt}/{cwd}/{slug}
  substituted per argv element (payload JSON never shell-interpolated).

## Scope

1. `.agents/skills/ws-shared/runtime/scripts/dispatch_subagent_task.cjs` (new):
   API `dispatchSubagentTask({subagent, task, payload}, {executor, repoRoot, timeoutMs})`
   + CLI main (`--subagent/--task/--payload/--json/--repo-root/--timeout-ms/--help`)
2. `bin/cli.js`: `dispatch` passthrough branch + printHelp usage
3. `README.md`: one dispatch usage block
4. `test/test-subagent-dispatch.js` (new) + register in test-suites.json (local + remote)

## Validation map

AC1 params / AC2 missing→exit1 / AC3 bad JSON→exit1 / AC4 payload intact /
AC5 default {} / AC6 async API / AC7 reject ValidationError / AC8 --json envelope /
AC9 throw/timeout→structured, child killed, no orphans / AC10 traversal+illegal fail-closed.

## Verify (focused)

- `node test/test-subagent-dispatch.js`
- `node bin/cli.js dispatch --help` smoke
- authoring validate of 0137 spec
