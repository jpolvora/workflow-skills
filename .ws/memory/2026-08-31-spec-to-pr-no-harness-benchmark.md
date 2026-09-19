### [2026-08-31] Spec-to-PR must not start harness benchmarks

- **Layer**: Harness
- **Module**: ws-spec-to-pr / delivery timing
- **Severity**: High
- **PathPattern**: .agents/skills/ws-spec-to-pr/**;.agents/skills/ws-spec-to-pr-lite/SKILL.md;.agents/skills/ws-testing/SKILL.md;.agents/skills/ws-run-benchmark/**
- **Scenario / Context**: Step 8 used to say "Benchmark" for elapsed-time reporting. Agents loaded `ws-run-benchmark` (or `npm run benchmark`) during consumer and dogfood delivery, which starts a live fixture orch and inflates wall-clock time.
- **DO NOT**: Load `ws-run-benchmark`, run `npm run benchmark` / `benchmark:static`, or invoke `scripts/harness-benchmark` from spec-to-pr, lite, or ws-testing. Do not treat Timing / `elapsedSec` as a request to start a benchmark. Do not load `ws-run-benchmark/references/ORCH.md` at spec-to-pr Step 5 (that file is the Extra skill's own step 5).
- **INSTEAD DO**: Sum `telemetry.steps[].elapsedSec` into the Timing section (reporting only). Harness benchmarks stay explicit `/ws-run-benchmark` from the workflow-skills package root.
