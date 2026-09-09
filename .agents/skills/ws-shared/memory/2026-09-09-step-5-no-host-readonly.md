### [2026-09-09] Step 5 verifier must not use host readonly

- **Layer**: Infrastructure
- **Module**: compile_host_subagents / ws-plan-verify
- **Severity**: High
- **PathPattern**: .agents/skills/ws-shared/runtime/scripts/compile_host_subagents.cjs;.cursor/agents/ws-step-05-plan-verify.md;.agents/skills/ws-shared/runtime/host-dispatch.md
- **Scenario / Context**: Compiled `ws-step-05-plan-verify` with host `readonly: true`. The host opened a question-only session, Shell was blocked, tests and `ac_ledger.cjs` could not run, and the orch had to execute Step 5 inline.
- **DO NOT**: Set host `readonly: true` on the Step 5 specialized subagent, or dispatch the verifier in a question-only session.
- **INSTEAD DO**: Encode product-tree immutability in the compiled prompt. Allow Shell and `{us-dir}` report/ledger writes. On question-only failure, fall back to generic `generalPurpose`/`shell` or Tier 3 inline.
