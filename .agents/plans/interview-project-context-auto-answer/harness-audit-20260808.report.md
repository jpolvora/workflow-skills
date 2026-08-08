---
slug: interview-project-context-auto-answer
auditedAt: 2026-08-08T04:00:00Z
installMode: upstream
skillsScanRoot: src/skills
status: Harness OK
critical: 0
warnings: 0
---

# Harness audit — interview-project-context-auto-answer (v0.0.118)

## Phases 0–5c (focused, dry-run evidence)

| Phase | Result | Evidence |
|-------|--------|----------|
| 0 Install mode / tokens | ✅ | Upstream package root; SoT `src/skills`; `{sharedDir}` config present |
| 1 Inventory / routing | ✅ | `ws-interview` listed in root `AGENTS.md` + `.agents/AGENTS.md`; in `bin/skill-dependencies.json` workflows |
| 2 Links / SoT paths | ✅ | Changed files use `{sharedDir}` / `{specsDir}` / `{plansDir}` / `user-gate` tokens |
| 3 Integrity | ✅ | `npm run verify-integrity` OK @ packageVersion **0.0.118** |
| 4 Portability / neutrality | ✅ | No IDE/agent product names in changed skill/gate/protocol prose |
| 4b Dependency graph | ✅ | No skill add/remove; graph version synced to 0.0.118 |
| 5 en-us | ✅ | Changed SoT prose en-us only |
| 5c Context | ✅ | Protocol-only skill change; dogfood via `npm run sync-skills` |

**Critical findings:** 0  
**Correction plan:** none

## ws-check-workflows

```text
Overall Status: PASS
Total Issues Detected: 0
Standard / Lite / Multi-spec simulations: all PASS (incl. Step 2 ws-interview)
```

Command: `python src/skills/ws-check-workflows/scripts/check_workflows.py --report`
