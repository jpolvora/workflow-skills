# Delivery result — us-358 (Step 8)

## Status: shipped (PR opened, merge owned by master orchestrator)

## Change
`AGENTS.md` § Harness change protocol, new item 4: skill dependency-graph check —
every skill edit must consult `bin/skill-dependencies.json` (callers/callees), verify
dependent contracts, update atomically or record follow-ups, regenerate integrity data,
and run harness checks over the affected set. Includes `ws-spec-list` → `ws-spec-index`
worked example.

## Commits
- Product: `docs(us-358): add skill dependency-graph authoring rule to AGENTS.md` (AGENTS.md, +1)
- Delivery: plan artifact (this us-dir, per `deliveryCommitArtifacts` defaults)

## Proof
- `npm run verify-integrity` exit 0; `node test/test-harness-clean.js` 0 findings; `npm run test` exit 0.
- `git diff main...HEAD --stat`: AGENTS.md +1 (product) plus us-dir plan (delivery).

## Learning
Learning: N/A (standard implementation, no new project knowledge; 0 tool/test failures).
