### [2026-09-04] Step 4 pre-advance docs must name skipQualityGates

- **Layer**: `harness`
- **Module**: `ws-spec-to-pr / STEP-DISPATCH`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `.agents/skills/ws-spec-to-pr/protocols/state-hygiene.md`
- **Scenario / Context**: Reviewer scored 6 on PR 276 because Step 4 Action and autoMode paragraphs called `--pre-advance 4` mandatory while `gates.md` / `state-hygiene.md` already omit that call under `--skip-gates` / `skipQualityGates`.
- **DO NOT**: Document `--pre-advance 4` as unconditional, or treat `skipQualityGates` as a waiver of autoMode planning (Steps 1–3 still required unless that bypass is explicit).
- **INSTEAD DO**: Same unless-clause in SKILL.md, STEP-DISPATCH (preamble + Step 4 row), and state-hygiene: omit and log `gate-bypass | pre-advance`. Keep autoMode ≠ skip planning.
