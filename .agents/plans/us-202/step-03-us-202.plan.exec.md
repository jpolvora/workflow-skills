# Execution Plan — us-202

**execMode:** sequential  
**Reason:** `defaults.enableDag` is false — sequential forced; plan steps A–E serial. Parallel DAG generation skipped (`tasks` / `levels` empty).  
**Source plan:** `.agents/plans/us-202/step-02-us-202.plan.refined.md`

Sizing metrics are recorded for audit only (not used to choose mode):

| Metric | Count | Sequential threshold | Notes |
|--------|------:|---------------------:|-------|
| Plan steps | 5 (A–E) | 3 | Exceeds, but `enableDag: false` wins |
| Unique files this feature | 4 (+ integrity at ship) | 6 | Within |
| Layers | 2 (`skills-sot`, `tests`) | 2 | Within |

## Files in scope

Implementer (Step 4) may touch only:

| File | Role |
|------|------|
| `.agents/skills/ws-spec-to-pr/scripts/update_state.py` | Standard serializer + parser |
| `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py` | Lite copy (independent file; same three serializer/parser edits + union helper) |
| `test/test-update-state-yaml.js` | **New** Node tests (AC4, AC5) |
| `package.json` | `scripts.tests` and `scripts.tests:remote` only — append `&& node test/test-update-state-yaml.js`. Do not bump version |

Step E writes `bin/skill-integrity.json` at **Step 8 / ship**, not during implement.

## Serial order for the implementer

Execute A → B → C → D in one sequential pass. E is a delivery obligation, not this coding turn.

### Step A — Nested mapping serialize + parse (AC1, AC2)

1. In both `update_state.py` copies, `serialize_yaml` non-empty `elif isinstance(subv, dict)` branch: `format_inline_dict(subv)` instead of `format_val(subv)`. Empty dict stays `{}`. Do not change list serialization.
2. In `parse_nested_mapping`, when `val` is non-empty and looks like `{...}` (strip starts with `{` and ends with `}`), assign `parse_inline_dict(val)` instead of `_coerce_scalar(val)`.
3. In `format_val`, one branch before `return str(v)`: `if isinstance(v, dict): return format_inline_dict(v)`. Do not pretty-print lists. Do not reorder `format_val` / `format_inline_dict` (call-time lookup is valid).
4. No PyYAML. No skill-body rewrites.

**Check:** grep both files — nested-dict serialize uses `format_inline_dict(subv)` (not `format_val(subv)`); `format_val` has `isinstance(v, dict)`; no `import yaml`. After serialize, forbidden substrings: `{'baseline'` and `"{'baseline'`. Allowed: `loc: { baseline: 2404 }` (or equivalent flow map with int `2404`).

### Step B — Duplicate `completedSteps` union (AC3)

1. Add `_as_step_ints` + `set_top_level` (names may match local style) in both copies.
2. Route every `data[key] = ...` in `parse_state_yaml` through `set_top_level` (six sites: inline `[]`, block list, nested mapping, `{}`, `[]`, scalar).
3. On duplicate `completedSteps`: stderr warning; merged value is sorted unique ints. Cover inline `[0, 1]` and block `- 0` / `- 1`. Skip bool (bool is int subclass).
4. Leave `main()` append/sort of current `--step` unchanged. Other duplicate top-level keys stay last-wins.
5. Union path must exit 0 (not fail-closed). Distinguishing proof is the written list, not a validator gap.

**Check:** seed `[0, 1]` then `[0]`, parse + `--step 2` writes `[0, 1, 2]` (not `[0, 2]`). Script exits 0.

### Step C — Mirror / no-drift (AC2)

Lite file must contain the same nested-dict serialize call, the same `{...}` parse, the same `format_val` dict branch, and the same `completedSteps` union behavior. Do not extract a shared module. Tests in D enforce the contract.

### Step D — Node tests + package.json chain (AC4, AC5)

1. Add `test/test-update-state-yaml.js` following `test/test-quality-gates.js` helpers: `PYTHON = process.env.PYTHON || 'python'`, `PYTHONIOENCODING=utf-8`, `fs.readFileSync(..., 'utf8')`, `\r?\n`-aware regex, `os.mkdtempSync` + cleanup.
2. Do **not** reuse `writeState()` as-is (it injects `completedSteps: []`). Write a dedicated fixture that owns the full frontmatter. Seed `REQUIRED_KEYS` (`workflowId`, `us`, `status`, `currentStep`) plus `skippedSteps: []`, empty `workflowManifest` / `commits`, `dryRun: true` recommended.
3. Append the file to `package.json` `scripts.tests` and `scripts.tests:remote` only.
4. Encoding utf-8. Distinguishing duplicate-key run is `--step 2` (spec AC5 `--step 1` is not distinguishing because `main()` appends the current step).

**Check:** `node test/test-update-state-yaml.js` exits 0. Integrity regenerate is Step 8, not this turn.

### Step E — Delivery obligations (not this implement turn)

At ship: `npm run generate-integrity && npm run verify-integrity` in the same commit as the hashed script edits. Stay on `develop`. Do not `git add -A`. Do not commit in Steps 1–7.

## AC map

| AC | Criterion | Serial step | Test |
|----|-----------|-------------|------|
| AC1 | Nested maps never go through `str()`; `format_val` never `str()`s a dict; `telemetry.loc` round-trips as a mapping | A, C | `testLocNestedMappingRoundTrip` |
| AC2 | Same nested-mapping serializer mirrored in lite | A (lite), C | `testLiteSerializerMirrorsNestedDictFix` |
| AC3 | Duplicate top-level `completedSteps:` unions unique ints (not silent last-wins) | B, C | `testDuplicateCompletedStepsUnion` |
| AC4 | Seed block `telemetry.loc`, run `--step 1 --elapsed 1`, loc remains a mapping; second pass `--step 2` so flow map parses back as dict | D | `testLocNestedMappingRoundTrip` |
| AC5 | Seed two `completedSteps:` blocks (`[0, 1]` then `[0]`); after `--step 2`, list contains 0, 1, and 2 | D | `testDuplicateCompletedStepsUnion` |

## Locked constraints (do not reopen)

- Keep the custom YAML serializer. Reuse `format_inline_dict` / `parse_inline_dict`. No second formatter.
- Quoted-string loc healing (`loc: "{'baseline': 2404}"`) is out of scope. Unquoted `{...}` recovery is in scope.
- Other duplicate top-level keys remain last-wins.
- Loc seed as **block** nested mapping so today's parser already yields a dict (proves serialize). Required second pass on the rewritten file.
- MEMORY: Python same-module forward reference is not a `NameError` — do not reorder functions. JS tests `\r?\n`-aware. Author under `.agents/skills`. Stage explicit paths only.

## Handoff

`execMode: sequential` — implementer reads this file plus the refined plan; ignore empty `tasks`/`levels` in the DAG JSON. Next skill: `ws-implement-tasks` (Step 4).
