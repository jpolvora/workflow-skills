### [2026-08-27] Resolve-thread metadata-only notes

- **Layer:** providers
- **Module:** ws-github-provider / ws-azure-devops-provider
- **Severity:** Medium
- **PathPattern:** `**/resolve_thread.cjs|**/fix_pr_azure_context.py`
- **Scenario / Context:** Cooperative bookkeeping lines (`defectClass`, `sourcesConsulted`, `proactiveFixed`, `proactiveSkipped`) can exceed 40 characters without describing what changed.
- **DO NOT:** Count COOPERATIVE_FIX metadata keys or homogeneous filler (e.g. forty `x` characters) as resolution-comment substance.
- **INSTEAD DO:** Strip metadata lines, then require ≥40 remaining characters **and** a 4+ letter alphabetic token with two distinct letters so both GitHub and Azure reject metadata-only and homogeneous filler notes (parity tests).
