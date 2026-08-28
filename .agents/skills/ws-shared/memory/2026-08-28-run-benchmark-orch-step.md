### [2026-08-28] ws-run-benchmark ORCH.md loads at Step 5

- **Layer**: Harness
- **Module**: ws-run-benchmark
- **Severity**: Medium
- **PathPattern**: .agents/skills/ws-run-benchmark/references/ORCH.md;.agents/skills/ws-run-benchmark/SKILL.md
- **Scenario / Context**: Companion header said load at Step 4 while SKILL.md Step 4 is Prepare and Step 5 is Orch.
- **DO NOT**: Label ORCH.md as Step 4 when prepare is Step 4 and orch dispatch is Step 5.
- **INSTEAD DO**: Keep the companion header aligned with the numbered SKILL.md step that actually loads it (Step 5).
