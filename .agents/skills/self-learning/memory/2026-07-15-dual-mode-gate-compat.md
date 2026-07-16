### [2026-07-15] Dual-mode orch gates vs shared skills
- **Layer**: N/A
- **Module**: spec-to-pr / spec-to-pr-lite
- **Severity**: High
- **Trap Avoided**: Optimizing full orch alone (private config paths, step-number assumptions in shared skills, re-AskQuestion inside 11-ship-pr) breaks lite or double-gates users. Blank-plan Dynamic Execution left Step 5 without artifacts.
- **Solution**: Put gate UX and config/SCM in `shared/gates.md` + `shared/config-resolution.md`. Shared skills take `workflowMode` / `shipAction` / `workflowType`. Always write a stub plan for simple path. Delivery result filename stays `step-12-*.result.md` for both orchs.
