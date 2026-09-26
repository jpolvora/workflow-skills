# Step 1 Plan — skill-loader-host-capability (0136)

- workflowId: us-0136-20260926T161500Z
- slug: skill-loader-host-capability
- spec: .agents/specs/0136-skill-loader-host-capability.spec.md
- flowMode: standard (classifier: 10 steps / 18 files est; executed inline per batch stay-on-develop override)
- modelsPreset: muse

## Scope

1. `host-capability-tokens.md`: 8th token row + canonical § Skill-load procedure (normative home; AC1/AC4/AC5/AC7)
2. `host-tool-map.json`: tokens array + per-shape `skillLoader: []` (AC3; empty = unverified native, resolves none)
3. `probe_host_capabilities.cjs`: TOKENS + MINIMAL (AC2; declare path reused)
4. `host-dispatch.md`: cache-entry schema + bind-telemetry line incl. skillLoader (AC10); no tier changes
5. `tools.md`: token list + skill-load delegation (no restated steps)
6. Hubs/router migration to canonical delegation: root AGENTS.md, .ws/AGENTS.md, runtime AGENTS.md, autoload.md (AC6/AC7)
7. Skill-body sweep: migrate divergent HOW recipes; exempt WHICH cross-links + do-not-load prohibitions with stated reasons (AC6)
8. `ws-check-harness/scripts/check_skill_load.cjs` (new) + PHASES.md 5a row + fixtures (AC8)
9. Tests: extend `test-host-capabilities.js` (AC1/AC2/AC3/AC9/AC10); gate fixtures test inside harness test or new asserts
10. FEATURES.md inventory row (dogfood on)

## Gate fail patterns (AC8)

FAIL (divergent raw recipe in a shipped skill body or hub doc):
- F1: `` `Read` `` and `SKILL.md` on the same line (raw Read recipe)
- F2: `Read {skillsRoot}/ws-` path recipe (same-line)
- F3: `load ... SKILL.md ... via {readFile}` restated fallback (same-line)
PASS: canonical doc itself; Markdown cross-links `[x](...SKILL.md)` (WHICH not HOW); `do not load` prohibitions; `skillLoader`/canonical-procedure delegations.

## Already-loaded (AC5)

Bound loader query when exposed, else session already-read tracking; never re-read; emit `skill-load | {id} | {loaded|read} | ISO`.

## Verify (focused)

- `node test/test-host-capabilities.js`
- `node .agents/skills/ws-check-harness/scripts/check_skill_load.cjs --json` → ok true on tree; fixtures prove both directions
- authoring validate of 0136 spec
- probe smoke: `--declare skillLoader=x` persists; unknown host resolves none exit 0
