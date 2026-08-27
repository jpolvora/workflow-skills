### [2026-08-27] Resolve-thread metadata-only notes

- **Layer:** providers
- **Module:** ws-github-provider / ws-azure-devops-provider
- **Severity:** Medium
- **PathPattern:** `**/resolve_thread.cjs|**/fix_pr_azure_context.py`
- **Scenario / Context:** Cooperative bookkeeping lines (`defectClass`, `sourcesConsulted`, `proactiveFixed`, `proactiveSkipped`) can exceed 40 characters without describing what changed.
- **DO NOT:** Count COOPERATIVE_FIX metadata keys as resolution-comment substance.
- **INSTEAD DO:** Strip those lines before the length gate so both GitHub and Azure reject metadata-only notes (parity test).
