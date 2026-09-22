# Tasks — us-402 (sequential)

`defaults.enableDag=false` → sequential inline execution, no DAG file.
Each task maps to plan §3 items; every AC is covered.

1. T1 — New skill Tier 1+2: `SKILL.md`, `references/COMPANION-FORMAT.md`,
   `references/EXAMPLE.md`. (AC1, AC3–AC7)
2. T2 — New skill Tier 3: `scripts/validate_companion.cjs`. (AC2, AC3, AC4, AC7)
3. T3 — Refinement wiring: `ws-plan-write` hook + orch one-liners. (AC8)
4. T4 — Membership + config: both `skill-dependencies.json` copies, schema,
   example. (AC1, AC8)
5. T5 — Indexes/docs: CATALOG ×2, autoload ×2, FEATURES, README, site rebuild.
   (AC9)
6. T6 — Tests: `test/test-spec-translate-to-human.js` + `test-wiki.js` count.
   (AC7, AC9)
7. T7 — Gates: stack scan, full suite, harness, integrity, version bump.
   (AC9)

Decision: sequential order T1→T7; no parallel dispatch.
