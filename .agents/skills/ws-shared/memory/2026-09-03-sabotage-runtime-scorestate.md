---
title: "Sabotage leftover .runtime files fail validate_state"
date: 2026-09-03
severity: high
---

### [2026-09-03] Sabotage leftover .runtime files fail validate_state

- **Layer**: Harness
- **Module**: ws-spec-to-pr / workflow_state
- **Severity**: High
- **PathPattern**: `.agents/plans/**/.runtime/*;.agents/skills/ws-shared/scripts/workflow_state.cjs;.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`
- **Scenario / Context**: Step 5/7 sabotage writes `qg.bak` or invert patches under `{us-dir}/.runtime/`. `validate_state` treats unknown `.runtime` names as HS-5. `ac_ledger.cjs link` also nulls `scoreState`, so a later `--pre-advance` can fail until `score --boundary` matches the next step.
- **DO NOT**: Leave sabotage backups in `.runtime/`, or assume `scoreState` survives a ledger `link`.
- **INSTEAD DO**: Delete non-allowlisted `.runtime` files before `validate_state`. Re-run `ac_ledger.cjs score --boundary step5|pre-step6` after any `link` that cleared `scoreState`.
