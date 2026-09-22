### [2026-09-21] Adversarial audit caveats: capture the baseline before changing the thing you must prove

- **Layer**: `Tests / Workflow harness`
- **Module**: `ws-fable-judge`, `ws-ship-pr` prepare board, lite pipeline
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-fable-judge/SKILL.md, .agents/skills/ws-ship-pr/PREPARE-CHECKLIST.md`
- **Scenario / Context**: The fable audit of the hub-hosted patterns delivery returned **VERIFIED WITH CAVEATS** because one AC required measured non-regression (`npm run test` wall time) and no pre-change sample had been taken before implementation started, making the claim UNVERIFIABLE. Two further caveats were cross-scope housekeeping (a rename of another session's broken run summary) and an accepted documentation gap.
- **DO NOT**: Start behavior changes before capturing the measurement baseline an AC will demand; present cross-scope housekeeping as if it were in-scope work; treat a caveated verdict as a silent pass without a memory entry.
- **INSTEAD DO**: When an AC names a measurement, capture the baseline **before** the first product edit (one command, recorded in the companion/plan); keep unrelated housekeeping in its own commit with an explicit rationale; on a CAVEATS/REFUTED verdict write the mandatory memory entry (High/Critical), compile, and keep the verdict visible on the ship board.
