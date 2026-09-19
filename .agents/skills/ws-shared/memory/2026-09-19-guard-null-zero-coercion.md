### [2026-09-19] Guard classifiers must not coerce null to zero
- **Layer**: `harness`
- **Module**: `ws-spec-to-pr worker turn guard`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/scripts/*.cjs`
- **Scenario / Context**: The worker-turn guard used `Number(toolCalls) === 0` to detect preview-only turns; `Number(null) === 0` misclassified envelope-less CLI fixture turns (unknown count) as zero-tool-call failures and broke the coordinator suite. Fixed to strict `toolCalls === 0` with unknown falling through to the artifact check.
- **DO NOT**: Compare possibly-null counts with `Number(x) === 0` in fail-closed classifiers; do not treat "unknown" as "zero".
- **INSTEAD DO**: Use strict `x === 0` for the zero case and route null/unknown to the next observable signal (artifact presence); pin both branches with regression assertions.
