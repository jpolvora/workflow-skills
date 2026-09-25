### [2026-09-25] ws-spec-multi batch orchestration traps

Layer: Tests/DevOps. Module: ws-spec-multi batch runs. Severity: Medium.
PathPattern: `.agents/plans/ws-spec-multi/*.state.md`
Scenario: 5-item sequential batch (ms-20260924T184514Z) to merged PRs with per-item base syncs on Windows PowerShell.

DO NOT:
- Do NOT write `gh` JSON to files with PowerShell `Out-File -Encoding utf8` (writes BOM) or `>` redirection (writes UTF-16) and feed them to node converters — both break JSON parsing. Use `[System.IO.File]::WriteAllText` with UTF8-no-BOM, or pipe `gh` stdout straight into the consumer.
- Do NOT call `refreshPlansIndexForState` to repair a single stale hash without checking row identity first — it keys/creates rows by the state's `workflowId`, so a timestamped-id index row plus an unprefixed-id state file yields a DUPLICATE slug row and resets revision. Revert immediately if row count grows.
- Do NOT expect `record_child_outcome.cjs --status shipped` to pass for workers whose `state.json` predates the `stateVersion`/`workflowId` schema — the guard fails closed; record manually with merge evidence instead.
- Do NOT rerun a timed-out Agentic Code Review action more than once — two identical 1200s OpenCode timeouts mean systemic slowness (large diff), not flake. Gate (Resume/Skip/Abort) after one rerun.
- Do NOT merge `origin/main` into `develop` while a worker is live on `develop` — defer base sync to the handoff between items.

INSTEAD DO:
- Base-sync conflict pattern that held for 4/4 merges: reviewed skill code from `origin/main` (theirs), post-merge close artifacts from `develop` (ours), bookkeeping files as unions, then `generate-integrity` + `verify-integrity` + feature test before committing the merge.
- Stamp run-state `updatedAt` from `[DateTime]::UtcNow`, never placeholders; keep one row per spec and freeze `totalItems`.
