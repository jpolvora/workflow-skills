---
slug: us-202
title: "ws-spec-to-pr update_state.py: duplicate completedSteps keys last-win + telemetry.loc Python dict repr"
status: "plan to be refined"
workflowType: standard
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/202"
---

# Implementation Plan — us-202

## 0. Summary & Business Rules

Fix two defects in the custom YAML serializer/parser used by `update_state.py` (standard and lite copies). Consumer workflows recover, but `state.md` can still end a run with a corrupt `telemetry.loc` string and silently dropped `completedSteps` progress.

**Objectives**

1. Nested mappings (especially `telemetry.loc`) serialize as YAML mappings, never Python `str()` repr (`{'baseline': 2404}` / `"{'baseline': 2404}"`).
2. Duplicate top-level `completedSteps:` keys are not silent last-wins. Union unique ints (recover progress), optionally warn on stderr.
3. Prove both with Node tests that invoke the Python scripts the same way production orch does.

**Business / safety rules**

- Keep the custom YAML serializer. Do not add PyYAML or any new runtime dependency.
- Reuse existing `format_inline_dict` (already used for list-of-dicts). Do not invent a second inline-dict formatter.
- Mirror the same serializer and parser behavior in both skill copies. They are independently shipped files, not a shared module.
- Surgical: serializer/parser + tests only. No skill-body rewrites unless a one-line note is required (not expected).
- Do not treat last-wins as success. Recovered audit (`recovered: true`) is not a substitute for a parser that keeps earlier progress.
- Hashed skill scripts: regenerate integrity at ship (`npm run generate-integrity`), not during this planning step.

## 1. Definition of Ready & Scope

### Confirmed decisions

| Decision | Rationale |
|----------|-----------|
| Reuse `format_inline_dict` at `serialize_yaml`'s nested-dict branch | Spec + existing helper; list-of-dicts already emit `{ k: v }` flow maps. |
| Parse `{ ... }` nested values via existing `parse_inline_dict` | Required for true round-trip: `format_inline_dict` writes `loc: { baseline: 2404 }`; today's `parse_nested_mapping` `_coerce_scalar`s that into a string. Also recovers unquoted Python-repr already on disk (`{'baseline': 2404}`). |
| Duplicate `completedSteps`: **union unique ints, sort, keep one key** | Original audit recovered progress; fail-closed would abort a live orch mid-step. Warn on stderr. Other duplicate top-level keys stay last-wins (out of AC3). |
| New focused test file `test/test-update-state-yaml.js` | Quality-gates already covers JSONL/bypass; this bug is serializer/parser-specific. Wire into `package.json` `tests` and `tests:remote`. |
| No PyYAML | Both scripts already document a custom parser to stay self-contained. |
| Integrity at Step 8 | User constraint; hashed paths include these scripts. Same-commit regenerate at ship. |

### Assumptions (stated)

- `format_inline_dict` values for `telemetry.loc` are scalars (`int` / `null` / `str`). Deeper-than-one nested maps inside `format_inline_dict` are not in the reported bug; do not recurse unless the same one-liner in `format_val` is free (see Step A).
- Test fixtures must still pass post-update `validate_state.py` (update_state invokes it). Seed `completedSteps` / `currentStep` / `skippedSteps` so monotonicity has no gaps after the chosen `--step`.
- Spec AC5's `--step 1` case is **not distinguishing**: `main()` appends the current `--step` if missing, so last-wins `[0]` + `--step 1` also yields `[0, 1]`. Distinguishing case uses `--step 2` (see §5).

### Acceptance Criteria (measurable)

| AC | Criterion | Plan step | §5 test |
|----|-----------|-----------|---------|
| AC1 | `serialize_yaml` / nested maps never go through `str()`; `telemetry.loc` `{ baseline: 2404 }` round-trips as a mapping, never Python repr | A, C | `testLocNestedMappingRoundTrip` |
| AC2 | Same nested-mapping serializer mirrored in lite `update_state.py` | A (lite), C | `testLiteSerializerMirrorsNestedDictFix` |
| AC3 | Duplicate top-level `completedSteps:` is not silent last-wins; `[0, 1]` then `[0]` does not drop 1 | B, C | `testDuplicateCompletedStepsUnion` |
| AC4 | Unit test seeds `telemetry.loc: { baseline: 2404 }`, runs `python update_state.py --step 1 --elapsed 1`, asserts loc remains a mapping | D | `testLocNestedMappingRoundTrip` |
| AC5 | Unit test seeds two `completedSteps:` blocks (`[0, 1]` then `[0]`); after update, error **or** list contains both 0 and 1 | D | `testDuplicateCompletedStepsUnion` |

### Out of scope

- Consumer product / US 2728-a delivery.
- `ws-audit` `draft-issue` ignoring `unusual` severity.
- Rewriting skill bodies, orch FSM, `validate_state.py` duplicate-key policy (post-write file has a single key).
- Adding PyYAML, sharing one Python module across standard/lite, or migrating the serializer to block-style nested YAML (flow `{ k: v }` is the chosen reuse).
- Fail-closed abort on any duplicate top-level key (recommend union for `completedSteps` only; see §8).
- Healing already-quoted corrupt strings `loc: "{'baseline': 2404}"` (quoted scalar). Unquoted Python-repr `{...}` is recovered via `parse_inline_dict`.

## 2. Technical Design & Architecture

### Layers (from `config.json`)

| Layer | Path | Edits |
|-------|------|-------|
| skills-sot | `.agents/skills` | `ws-spec-to-pr/scripts/update_state.py`, `ws-spec-to-pr-lite/scripts/update_state.py` (serializer + parser only) |
| tests | `test/` | New `test/test-update-state-yaml.js`; `package.json` scripts chain |
| installer-cli | `bin` | No logic change this feature. `bin/skill-integrity.json` regenerates at ship when scripts change |

No frontend, database, i18n, or tenancy layers apply (`stack.id`: `node-skills-package`).

`config.fable.autoDetectDomain` is on, but this work is portable Python in skill scripts (no IaC / K8s / Docker / DB). No `ws-fable-domain` adapter.

### Defect 1 — nested dict `str()` (AC1, AC2)

**Today** (standard ~line 197–201; lite ~182–186):

```python
elif isinstance(subv, dict):
    if not subv:
        lines.append(f"  {subk}: {{}}")
    else:
        lines.append(f"  {subk}: {format_val(subv)}")  # dict → str() → "{'baseline': 2404}"
```

`format_val` has no dict branch; it falls through to `return str(v)`. Next parse `_coerce_scalar`s the repr into a string; next serialize quotes it because of `:`.

**Fix (required):** in both copies, that else branch must call `format_inline_dict(subv)`:

```python
lines.append(f"  {subk}: {format_inline_dict(subv)}")
```

Empty dict stays `{}`. List-of-dicts already use `format_inline_dict`. Do not change list serialization.

**Fix (required for round-trip):** in `parse_nested_mapping`, when `val` is non-empty and looks like a flow/Python mapping (`strip` starts with `{` and ends with `}`), assign `parse_inline_dict(val)` instead of `_coerce_scalar(val)`. `parse_inline_dict` already accepts `{ N: 0, ... }` and Python-repr `{'N': 0, ...}` via `ast.literal_eval` then regex fallback.

Without this, a successful serialize of `{ baseline: 2404 }` becomes a string on the next `update_state.py` run.

**Optional same-file one-liner:** before `format_val`'s `return str(v)`, if `isinstance(v, dict): return format_inline_dict(v)`. Defense if any other call site passes a dict. `format_inline_dict` already calls `format_val` on scalar values; no cycle for loc's ints. Implement if it stays one branch; do not expand `format_val` to pretty-print lists.

**After serialize, forbidden substrings in frontmatter:** `{'baseline'` and `"{'baseline'` (quoted Python repr). Allowed: `loc: { baseline: 2404 }` or equivalent flow map with int `2404`.

### Defect 2 — duplicate `completedSteps` last-wins (AC3)

`parse_state_yaml` is a plain dict. A second top-level `completedSteps:` replaces the first. `serialize_yaml` cannot emit duplicate keys; duplicates come from hand-merge / concatenated frontmatter.

**Fix:** add a small helper used at every top-level assignment (do not copy-paste merge into each branch):

```python
def _as_step_ints(val) -> list[int]:
    # list of int/digit-str only; skip bool (bool is int subclass)
    ...

def set_top_level(data: dict, key: str, value) -> None:
    if key == "completedSteps" and key in data:
        merged = sorted(set(_as_step_ints(data[key])) | set(_as_step_ints(value)))
        print("Warning: duplicate completedSteps keys; unioned unique ints", file=sys.stderr)
        data[key] = merged
        return
    data[key] = value
```

Cover both inline `completedSteps: [0, 1]` and block:

```yaml
completedSteps:
  - 0
  - 1
```

After parse, existing `main()` appends `--step` if missing and sorts. Union first, then that append still runs.

Do not fail-closed (see §8). Do not merge other duplicate keys.

### Tests (AC4, AC5)

New `test/test-update-state-yaml.js` following `test/test-quality-gates.js` helpers: `PYTHON = process.env.PYTHON || 'python'`, `PYTHONIOENCODING=utf-8`, `fs.readFileSync(..., 'utf8')`, `\r?\n`-aware regex, `os.mkdtempSync` + cleanup. Do not reuse `writeState()` as-is: that helper already emits `completedSteps: []`, which would add a third key. Write a dedicated fixture that owns the full frontmatter.

Wire:

```text
package.json scripts.tests        += && node test/test-update-state-yaml.js
package.json scripts.tests:remote += && node test/test-update-state-yaml.js
```

(`test-memory-formatting.js` is tests-only; this file belongs on both chains like `test-quality-gates.js`.)

### Invariant checks

- `commitPlanFilesOnlyAtStep8: true` — this plan file is not committed until Step 8.
- `skipQualityGates: false` — do not bypass.
- No EF / tenancy / i18n invariants apply.

## 3. Step-by-Step Plan

### Step A — Nested mapping serialize + parse (AC1, AC2)

1. In `.agents/skills/ws-spec-to-pr/scripts/update_state.py` `serialize_yaml`, change the non-empty `elif isinstance(subv, dict)` line from `format_val(subv)` to `format_inline_dict(subv)`.
2. In `parse_nested_mapping`, when `val` is a `{...}` flow/Python mapping, use `parse_inline_dict(val)`.
3. Optional: `format_val` dict → `format_inline_dict` before `str(v)`.
4. Repeat the same three edits in `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py` (same serializer; lite copy is not imported from standard).
5. Do not add PyYAML. Do not restyle list serialization or skill markdown.

**Files:** both `update_state.py` copies.

**Check:** grep both files: nested-dict serialize branch contains `format_inline_dict(subv)` and does not call `format_val(subv)` for dicts. No `import yaml`.

### Step B — Duplicate `completedSteps` union (AC3)

1. Add `_as_step_ints` + `set_top_level` (names may match local style) in both copies.
2. Route every `data[key] = ...` in `parse_state_yaml` through `set_top_level`.
3. On duplicate `completedSteps`, stderr warning; merged value is sorted unique ints.
4. Leave `main()` append/sort of the current `--step` unchanged.

**Files:** both `update_state.py` copies.

**Check:** seed `[0, 1]` then `[0]`, parse+`--step 2` keeps `1` (see §5). Script still exits 0 so `validate_state.py` monotonicity passes (`[0, 1, 2]`, no gap).

### Step C — Mirror / no-drift (AC2)

1. Lite file must contain the same nested-dict serialize call and the same `{...}` parse + `completedSteps` union behavior.
2. Tests enforce this (string contract + lite script run). Do not extract a shared module (out of scope / would widen the diff).

**Files:** lite `update_state.py` (already edited in A/B); assertions in Step D.

### Step D — Node tests + package.json chain (AC4, AC5)

1. Add `test/test-update-state-yaml.js` with the §5 functions.
2. Append the file to `package.json` `scripts.tests` and `scripts.tests:remote` only. Do not bump `package.json` version here (ship bump is Step 8 / `build-site:bump`).
3. Encoding utf-8; regex `\r?\n`-aware (MEMORY: Windows Node keeps CRLF).

**Files:** `test/test-update-state-yaml.js`, `package.json` (scripts only).

**Check:** `node test/test-update-state-yaml.js` exits 0. Full `npm run test` remains green after implement (Step 4/7). Integrity regenerate is Step 8, not this plan.

### Step E — Delivery obligations (not this planning turn)

1. At ship: `npm run generate-integrity && npm run verify-integrity` in the same commit as the hashed script edits (MEMORY: skill SoT under `.agents/skills`; integrity after content change).
2. Stay on `develop`. Do not `git add -A`. Do not commit in Steps 1–7.

**Files:** `bin/skill-integrity.json` at Step 8 only.

## 4. Permissions, Tenancy & i18n

Not applicable. This is an upstream Node skill-package fix with no RBAC, tenant isolation, or i18n keys (`stack.frontend.i18n.framework`: none; `domain.tenancyField`: empty).

## 5. Test Coverage

| AC | Test function | Method / assertion |
|----|---------------|-------------------|
| AC1, AC4 | `testLocNestedMappingRoundTrip` | Seed temp `state.md` with nested mapping `telemetry.loc` (`loc:` block with `baseline: 2404`, or flow `{ baseline: 2404 }` once parser accepts `{...}`). Run `python .agents/skills/ws-spec-to-pr/scripts/update_state.py <state> --step 1 --elapsed 1`. Assert exit 0. Assert frontmatter `loc` remains a mapping: `baseline:` / `{ baseline: 2404 }` / `{baseline: 2404}` with integer 2404. Assert absence of Python repr: no `{'baseline'` and no `"{'baseline'`. Recommended second pass `--step 2 --elapsed 1` on the rewritten file so `format_inline_dict` output parses back as a dict, not a quoted string. |
| AC2 | `testLiteSerializerMirrorsNestedDictFix` | (1) String/regex contract: lite `serialize_yaml` nested-dict branch uses `format_inline_dict(subv)`, not `format_val(subv)`. (2) Run lite `update_state.py` on the same loc fixture (`--step 1 --elapsed 1`) and assert loc stays a mapping / no Python repr. |
| AC3, AC5 | `testDuplicateCompletedStepsUnion` | Seed frontmatter with **two** top-level `completedSteps:` keys, first `[0, 1]` (or block `- 0` / `- 1`), second `[0]`, plus valid `skippedSteps: []` and other keys `validate_state.py` needs. **Distinguishing run:** `python update_state.py <state> --step 2 --elapsed 1`. Assert exit 0 (union path, not fail-closed) and written `completedSteps` contains `0`, `1`, and `2` — not `[0, 2]`. Spec-suggested `--step 1` may be an extra case but cannot alone prove the parser (append of step 1 hides last-wins). Assert a single `completedSteps` key after write. Optional: stderr matches `/duplicate completedSteps/i`. |
| AC3 | (same function, negative) | Must **not** treat last-wins + `validate_state` gap failure as success. Union path exits 0. If a reviewer later chooses fail-closed (§8), this test would instead assert non-zero exit **before** write and a message about duplicate keys — not a monotonicity gap after `[0, 2]`. |

**Invocation:** `node test/test-update-state-yaml.js`. Also chained via `npm run tests` / `tests:remote`.

**Launcher:** explicit `python` (or `process.env.PYTHON`) per `tools.md` script launchers. Set `PYTHONIOENCODING=utf-8`.

## 6. Invariants (Do Not Violate)

From `config.json.invariants` and harness:

| Invariant | How this plan honors it |
|-----------|-------------------------|
| `commitPlanFilesOnlyAtStep8: true` | Plan artifacts stay uncommitted until Step 8. |
| `skipQualityGates: false` | Do not add skip-gates or weaken validation. Post-update `validate_state.py` must still pass. |
| `entitiesAreClassNotRecord` / EF / tenancy flags | N/A (all false / unused). |
| Custom YAML only | No PyYAML. Reuse `format_inline_dict` / `parse_inline_dict`. |
| Surgical scope | Touch only the two `update_state.py` files + new test + `package.json` scripts. No skill-body drive-by. |
| Managed-script launchers | Tests call `python <script>`; do not rewrite scripts for shell quoting. |
| Stay on `develop` | `branchStrategy: stay`. No checkout of another branch. |
| Integrity | Hashed skill scripts change → regenerate at ship, same commit as content. |

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot scripts + tests only; no installer behavior change except integrity at ship).
- [ ] Domain entities and mappings encapsulated — N/A (no domain entities).
- [ ] Schema migrations created — N/A.
- [ ] Authorization checks applied — N/A.
- [ ] i18n keys declared — N/A.
- [ ] Test cases cover all ACs (AC1–AC5 mapped in §3 and §5).
- [ ] Both `update_state.py` copies use `format_inline_dict` for nested maps; quoted Python repr never appears after serialize.
- [ ] Duplicate `completedSteps` unions unique ints (or documented fail-closed if §8 flips).
- [ ] `node test/test-update-state-yaml.js` exits 0; `package.json` `tests` / `tests:remote` include the file.
- [ ] `npm run test` (configured `verification.backendTest`) exits 0 before ship.
- [ ] Step 8: `npm run generate-integrity && npm run verify-integrity` exit 0 in the same commit as script edits. No version bump in implement-only commits; ship uses `build-site:bump` if this PR ships package content.

## 8. Open Questions

1. **Duplicate-key policy (recommended: union).** This plan unions unique ints for `completedSteps` and warns on stderr, matching `recovered: true` in the original audit. Fail-closed (exit non-zero on any duplicate top-level key) is valid per the issue but would abort a live orch that already has concatenated frontmatter. Prefer union unless the interviewer requires fail-closed — if so, AC5 tests must assert a duplicate-key error, not a `validate_state` gap on `[0, 2]`.
2. **`format_val` dict dispatch.** Optional one-liner; not required if the `serialize_yaml` branch is the only dict call site. Implementer may include it as defense-in-depth without a new AC.
3. **Other duplicate top-level keys** (e.g. two `currentStep:`). Out of AC3. Leave last-wins unless interview expands scope.
4. **Quoted-string loc healing** (`loc: "{'baseline': 2404}"`). Out of scope. Unquoted `{...}` recovery via `parse_inline_dict` is in scope because it is the round-trip of `format_inline_dict`.

No blockers. Stack is known (`node-skills-package`). Ready for Step 2 interview (or Step 3 if interview skipped).
