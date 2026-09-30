# Testing plan — us-459

## Scope

CSS-only restyle of `.agents/skills/ws-kanvas/refs/board.html` (`<style>` block) plus the
regenerated `bin/skill-integrity.json`. No JS/TS, no API, no DB, no auth surface.

## Configured aliases

| Alias | Command | Layer |
|-------|---------|-------|
| `backendTest` | `npm run test` | test/ |

`frontendTest` / `backendBuild` / `frontendBuild` are empty in `config.json` → not applicable.

## Target battery

1. **Unit / contract suites** — full `npm run test` (144 entries) as the non-regression gate.
2. **Feature suites** — `node test/test-kanvas-board.js` (board contract + integrity AC9),
   `node test/test-kanvas-drag-drop.js` (drag-and-drop / `api/move`).
3. **AC visual checks** — `us-459-verify.cjs`: AC2 literal search + AC3 WCAG contrast probe.
4. **Stack invariants** — `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs
   --stack typescript-node`.
5. **Mutation** — `verification.mutationTest` empty and `defaults.skipMutationTesting: true` → skip.
6. **Regression sabotage** — no newly added regression assertions in this change → skip.

## AC checklist (observable outcomes)

| AC | Observable outcome | Check |
|----|--------------------|-------|
| AC1 | six distinct column cues | six `.column[data-column-id]` accents present |
| AC2 | no hardcoded grey/transparent surfaces | literal search 0 matches |
| AC3 | body text ≥ 4.5:1 both schemes | contrast probe 17.97:1 |
| AC4 | drop-target + popup palette-consistent | `outline-color: var(--phase-accent)`; Canvas/CanvasText popup |
| AC5 | no behavior change | style-only diff + both kanvas suites green |
