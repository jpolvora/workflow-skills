### [2026-09-29] autoMode must not ask to continue after Step 5

- **Layer**: Harness
- **Module**: ws-spec-to-pr / gates
- **Severity**: High
- **PathPattern**: .agents/skills/ws-shared/runtime/gates.md;.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md
- **Scenario / Context**: `full auto ship-pr` still stopped after a passing Step 5 because the Pass 1 menu, Reach-10 offer, and "user-gate at every step boundary" obligation were read as a continue prompt.
- **DO NOT**: End the host turn after `finish --step 5` in `autoMode`, or print Next / Reach-10 / the model-switch banner as a question.
- **INSTEAD DO**: When the verify score is at or above `minVerifyScore`, run G2-code if the stage set is non-empty and dispatch Step 6 in the same turn. Pause only after max below-bar rounds or another hard stop.
