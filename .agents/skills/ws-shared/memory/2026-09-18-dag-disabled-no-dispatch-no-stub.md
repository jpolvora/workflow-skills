### [2026-09-18] dag-disabled means skip step 3, never dispatch plus stub
- **Layer**: `harness`
- **Module**: `ws-spec-to-pr orch step 3 / step 4 gate`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`
- **Scenario / Context**: With `defaults.enableDag: false`, the orch dispatched `ws-plan-to-tasks` (wrote an unneeded tasks.md), finished step 3 as completed, then ran `write_simple_plan_stub.cjs` with the refined plan as `--plan` — destroying an 18KB `step-02-*.plan.refined.md` by overwrite (the script writes a simple-path stub into `--plan`). Pre-advance 4 failed on the missing exec plan, which exposed the chain. Recovery cost a file removal, a re-finish, and a full repair re-dispatch.
- **DO NOT**: Dispatch `ws-plan-to-tasks` or run `write_simple_plan_stub.cjs` when `enableDag` is false; never pass a real plan file as `--plan` to the stub writer (it overwrites `--plan` unconditionally); never finish step 3 as completed in sequential mode.
- **INSTEAD DO**: Follow STEP-DISPATCH Step 3 row literally for `enableDag: false` — no dispatch, no stubs, `update_state finish --step 3 --status skipped --reason dag-disabled` (pre-advance 4 explicitly exempts `skippedReason 3 == dag-disabled`). Reserve `write_simple_plan_stub.cjs` for `complexityClass: simple` only, with `--plan` pointing at a NEW `step-01-*.plan.md` path.
