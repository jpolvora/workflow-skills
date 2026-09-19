### [2026-09-16] Retiring a skill id must sweep every advertising surface
- **Layer**: other
- **Module**: skill retirement (ws-karpathy-guidelines -> ws-senior-developer merge)
- **Severity**: Medium
- **PathPattern**: .agents/skills/**
- **Scenario / Context**: After the 0.4.30 merge retired ws-karpathy-guidelines, a PR review thread still flagged the removed skill advertised as a consumable companion (ws-megabrain frontmatter + Step 5, fixed in 7b63fffe; docs/index.html stepper pills, fixed with 0.4.31). Proactive sweep for PR #337 found more prose hits in ws-fix-pr (README, COOPERATIVE_FIX heading) and ws-show-harness; AUTO_FIX.md is byte-locked by test/test-fix-pr-proactive-class-sweep.js and was recorded as a skip.
- **DO NOT**: Retire or rename a skill id without sweeping site cards, stepper pills, role matrices, skill READMEs, scripts, harness docs, autoload rows, and FEATURES/config aliases.
- **INSTEAD DO**: Run `rg -i "<retired-id>"` across .agents/skills, docs, root docs, and hubs; fix genuine references, keep intentional compatibility aliases, and record byte-locked or out-of-scope hits with `path + reason`.
