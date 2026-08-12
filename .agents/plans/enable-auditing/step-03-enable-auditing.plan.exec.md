# Execution plan — enable-auditing

**execMode:** sequential  
**Reason:** 5 implementation steps, 12+ files, 3 layers — exceeds `dagThresholds` but sequential execution avoids merge conflicts on shared hub files.

**Source plan:** `step-02-enable-auditing.plan.refined.md`

## Task order

1. **T1** — Config: `defaults.enableAuditing` in example + schema + `config-resolution.md`
2. **T2** — `ws-audit` skill package (`SKILL.md`, `AUDIT-FORMAT.md`, `audit_log.js`)
3. **T3** — Orch integration (`ws-spec-to-pr`, `STEP-DISPATCH`, lite, multi-spec)
4. **T4** — Hub + `skill-dependencies.json` registration
5. **T5** — Tests + integrity regenerate
