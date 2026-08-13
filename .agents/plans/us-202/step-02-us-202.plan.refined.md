---
slug: us-202
title: "ws-spec-to-pr update_state.py: duplicate completedSteps keys last-win + telemetry.loc Python dict repr"
status: refined
shared_understanding: confirmed
workflowType: standard
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/202"
refinedFrom: step-01-us-202.plan.md
refineRound: 1
autoMode: true
---

# Implementation Plan — us-202 (refined)

Interview (Step 2, autoMode): project-context sweep closed all §8 items. No user-gate. `shared_understanding: confirmed`.

## 0. Summary & Business Rules

Fix two defects in the custom YAML serializer/parser used by `update_state.py` (standard and lite copies). Consumer workflows recover, but `state.md` can still end a run with a corrupt `telemetry.loc` string and silently dropped `completedSteps` progress.

**Objectives**

1. Nested mappings (especially `telemetry.loc`) serialize as YAML mappings, never Python `str()` repr (`{'baseline': 2404}` / `"{'baseline': 2404}"`).
2. Duplicate top-level `completedSteps:` keys are not silent last-wins. Union unique ints (recover progress) and warn on stderr. Do not fail-closed.
3. Prove both with Node tests that invoke the Python scripts the same way production orch does.

**Business / safety rules**

- Keep the custom YAML serializer. Do not add PyYAML or any new runtime dependency.
- Reuse existing `format_inline_dict` (already used for list-of-dicts). Do not invent a second inline-dict formatter.
- Mirror the same serializer and parser behavior in both skill copies. They are independently shipped files, not a shared module.
- Surgical: serializer/parser + tests only. No skill-body rewrites unless a one-line note is required (not expected).
- Do not treat last-wins as success. Recovered audit (`recovered: true`) is not a substitute for a parser that keeps earlier progress.
- Hashed skill scripts: regenerate integrity at ship (`npm run generate-integrity`), not during this planning step.

**Locked interview decisions (do not reopen)**

1. Duplicate `completedSteps`: **UNION unique ints + stderr warn**. Not fail-closed.
2. `format_val` dict branch: **INCLUDE** (one `isinstance(v, dict)` → `format_inline_dict(v)` before `str(v)`). Defense-in-depth and AC1 names `format_val`.
3. Other duplicate top-level keys: **last-wins** (out of AC3).
4. Quoted-string loc healing (`loc: "{'baseline': 2404}"`): **out of scope**.

## 1. Definition of Ready & Scope

### Confirmed decisions

| Decision | Rationale |
|----------|-----------|
| Reuse `format_inline_dict` at `serialize_yaml`'s nested-dict branch | Spec + existing helper; list-of-dicts already emit `{ k: v }` flow maps. |
| Parse `{ ... }` nested values via existing `parse_inline_dict` | Required for true round-trip: `format_inline_dict` writes `loc: { baseline: 2404 }`; today's `parse_nested_mapping` `_coerce_scalar`s that into a string. Also recovers unquoted Python-repr already on disk (`{'baseline': 2404}`). |
| Duplicate `completedSteps`: **union unique ints, sort, keep one key, stderr warn** | Original audit recovered progress; fail-closed would abort a live orch mid-step. Locked at interview. Other duplicate top-level keys stay last-wins (out of AC3). |
| `format_val` dict → `format_inline_dict` before `str(v)` | **Required** (one branch). AC1 names `format_val`; `format_inline_dict` already calls `format_val` on scalar values — no cycle for loc ints. Do not expand `format_val` to pretty-print lists. Call-time lookup of `format_inline_dict` is fine (defined later in the same module). |
| New focused test file `test/test-update-state-yaml.js` | Quality-gates already covers JSONL/bypass; this bug is serializer/parser-specific. Wire into `package.json` `tests` and `tests:remote`. |
| Distinguishing duplicate-key test uses `--step 2` | Spec AC5 `--step 1` is not distinguishing: `main()` appends the current `--step` if missing, so last-wins `[0]` + `--step 1` also yields `[0, 1]`. Keep AC1–AC5; distinguishing run is `--step 2`. |
| No PyYAML | Both scripts already document a custom parser to stay self-contained. |
| Integrity at Step 8 | User constraint; hashed paths include these scripts. Same-commit regenerate at ship. |

### Assumptions (stated)

- `format_inline_dict` values for `telemetry.loc` are scalars (`int` / `null` / `str`) per `delivery-result.md` (`baseline`, `final`, `added`, `removed`, `netDelta`). Deeper-than-one nested maps inside `format_inline_dict` are not in the reported bug; the `format_val` dict one-liner covers accidental nested dicts without extra recursion design.
- Test fixtures must still pass post-update `validate_state.py` (update_state invokes it). Seed `REQUIRED_KEYS` (`workflowId`, `us`, `status`, `currentStep`) plus `completedSteps` / `skippedSteps: []` / empty `workflowManifest` (or `dryRun: true`) so disk/commit checks do not fail. Seed `completedSteps` so there is no gap after the chosen `--step` (loc test: seed `[0]` then `--step 1` → `[0, 1]`).
- Post-update `validate()` does **not** run monotonicity-gap checks (those are `--pre-advance` only). Distinguishing proof is the **written** `completedSteps` list, not a validate_state gap failure.

### Acceptance Criteria (measurable)

Keep AC1–AC5.

| AC | Criterion | Plan step | §5 test |
|----|-----------|-----------|---------|
| AC1 | `serialize_yaml` / nested maps never go through `str()`; `format_val` never `str()`s a dict; `telemetry.loc` `{ baseline: 2404 }` round-trips as a mapping, never Python repr | A, C | `testLocNestedMappingRoundTrip` |
| AC2 | Same nested-mapping serializer mirrored in lite `update_state.py` | A (lite), C | `testLiteSerializerMirrorsNestedDictFix` |
| AC3 | Duplicate top-level `completedSteps:` is not silent last-wins; `[0, 1]` then `[0]` does not drop 1 (union unique ints) | B, C | `testDuplicateCompletedStepsUnion` |
| AC4 | Unit test seeds `telemetry.loc: { baseline: 2404 }`, runs `python update_state.py --step 1 --elapsed 1`, asserts loc remains a mapping | D | `testLocNestedMappingRoundTrip` |
| AC5 | Unit test seeds two `completedSteps:` blocks (`[0, 1]` then `[0]`); after update, list contains both 0 and 1 | D | `testDuplicateCompletedStepsUnion` (`--step 2` distinguishing) |

### Out of scope

- Consumer product / US 2728-a delivery.
- `ws-audit` `draft-issue` ignoring `unusual` severity.
- Rewriting skill bodies, orch FSM, `validate_state.py` duplicate-key policy (post-write file has a single key).
- Adding PyYAML, sharing one Python module across standard/lite, or migrating the serializer to block-style nested YAML (flow `{ k: v }` is the chosen reuse).
- Fail-closed abort on any duplicate top-level key (locked: union for `completedSteps` only).
- Healing already-quoted corrupt strings `loc: "{'baseline': 2404}"` (quoted scalar). Unquoted Python-repr `{...}` is recovered via `parse_inline_dict`.
- Changing last-wins behavior for other duplicate top-level keys (e.g. two `currentStep:`).

### Scenario probes (interview)

| Probe | Result |
|-------|--------|
| Soft-deletion | N/A — no entities / ORM. |
| Concurrency | N/A — single-process script, one state file per run. |
| List sizing | `completedSteps` is bounded (board steps 0–9). Union of unique ints is cheap. |
| Rate limits | N/A. |

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

`main()` does not rewrite `telemetry.loc`; the value only round-trips parse → serialize. Production loc is a one-level mapping of ints/nulls (`delivery-result.md`).

**Fix (required):** in both copies, that else branch must call `format_inline_dict(subv)`:

```python
lines.append(f"  {subk}: {format_inline_dict(subv)}")
```

Empty dict stays `{}`. List-of-dicts already use `format_inline_dict`. Do not change list serialization.

**Fix (required for round-trip):** in `parse_nested_mapping`, when `val` is non-empty and looks like a flow/Python mapping (`strip` starts with `{` and ends with `}`), assign `parse_inline_dict(val)` instead of `_coerce_scalar(val)`. `parse_inline_dict` already accepts `{ N: 0, ... }` (regex fallback; `ast.literal_eval` fails on unquoted YAML keys) and Python-repr `{'N': 0, ...}` via `ast.literal_eval`.

Without this, a successful serialize of `{ baseline: 2404 }` becomes a string on the next `update_state.py` run.

**Fix (required, one branch):** before `format_val`'s `return str(v)`:

```python
if isinstance(v, dict):
    return format_inline_dict(v)
```

Defense if any other call site passes a dict. `format_inline_dict` already calls `format_val` on scalar values; loc ints do not recurse. Nested dict values would recurse once per level via this same branch — acceptable; do not add a second formatter or pretty-print lists. Do not reorder `format_val` / `format_inline_dict` (call-time name lookup is valid; MEMORY: same-module forward reference is not a `NameError`).

**After serialize, forbidden substrings in frontmatter:** `{'baseline'` and `"{'baseline'` (quoted Python repr). Allowed: `loc: { baseline: 2404 }` or equivalent flow map with int `2404`.

Quoted-string healing (`loc: "{'baseline': 2404}"` already on disk) stays out of scope: `_coerce_scalar` would keep a string. Unquoted `{...}` recovery is in scope because it is the round-trip of `format_inline_dict`.

### Defect 2 — duplicate `completedSteps` last-wins (AC3)

`parse_state_yaml` is a plain dict. A second top-level `completedSteps:` replaces the first. `serialize_yaml` cannot emit duplicate keys; duplicates come from hand-merge / concatenated frontmatter.

**Fix:** add a small helper used at every top-level assignment (do not copy-paste merge into each branch). There are six `data[key] = ...` sites in `parse_state_yaml` (inline `[]`, block list, nested mapping, `{}`, `[]`, scalar).

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

Do not fail-closed. Do not merge other duplicate keys (last-wins).

**Exit 0:** union path must succeed so a live orch with concatenated frontmatter continues. Distinguishing proof is the written list (`0`, `1`, and `2` after `--step 2`), not a validator gap.

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
3. **Required:** `format_val` dict → `format_inline_dict` before `str(v)` (one branch). Do not pretty-print lists. Do not reorder functions.
4. Repeat the same three edits in `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py` (same serializer; lite copy is not imported from standard).
5. Do not add PyYAML. Do not restyle list serialization or skill markdown.

**Files:** both `update_state.py` copies.

**Check:** grep both files: nested-dict serialize branch contains `format_inline_dict(subv)` and does not call `format_val(subv)` for dicts; `format_val` has an `isinstance(v, dict)` branch. No `import yaml`.

### Step B — Duplicate `completedSteps` union (AC3)

1. Add `_as_step_ints` + `set_top_level` (names may match local style) in both copies.
2. Route every `data[key] = ...` in `parse_state_yaml` through `set_top_level`.
3. On duplicate `completedSteps`, stderr warning; merged value is sorted unique ints.
4. Leave `main()` append/sort of the current `--step` unchanged.
5. Other duplicate top-level keys remain last-wins.

**Files:** both `update_state.py` copies.

**Check:** seed `[0, 1]` then `[0]`, parse+`--step 2` keeps `1` (see §5). Script still exits 0. Written list is `[0, 1, 2]` (not `[0, 2]`).

### Step C — Mirror / no-drift (AC2)

1. Lite file must contain the same nested-dict serialize call, the same `{...}` parse, the same `format_val` dict branch, and the same `completedSteps` union behavior.
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
| AC1, AC4 | `testLocNestedMappingRoundTrip` | Seed temp `state.md` with **block** nested mapping `telemetry.loc` (`loc:` then `baseline: 2404`) so today's parser already yields a dict (proves serialize). Include `REQUIRED_KEYS` (`workflowId`, `us`, `status`, `currentStep`), `completedSteps: [0]`, `skippedSteps: []`, empty `workflowManifest` / `commits`, `dryRun: true` recommended. Run `python .agents/skills/ws-spec-to-pr/scripts/update_state.py <state> --step 1 --elapsed 1`. Assert exit 0. Assert frontmatter `loc` remains a mapping: `baseline:` / `{ baseline: 2404 }` / `{baseline: 2404}` with integer 2404. Assert absence of Python repr: no `{'baseline'` and no `"{'baseline'`. **Required second pass** `--step 2 --elapsed 1` on the rewritten file so `format_inline_dict` output parses back as a dict, not a quoted string. |
| AC2 | `testLiteSerializerMirrorsNestedDictFix` | (1) String/regex contract: lite `serialize_yaml` nested-dict branch uses `format_inline_dict(subv)`, not `format_val(subv)`; lite `format_val` has the dict branch. (2) Run lite `update_state.py` on the same loc fixture (`--step 1 --elapsed 1`) and assert loc stays a mapping / no Python repr. Lite `next_step` is always `step+1` (no 3→4 skip); `--step 1` / `--step 2` are safe for both copies. |
| AC3, AC5 | `testDuplicateCompletedStepsUnion` | Seed frontmatter with **two** top-level `completedSteps:` keys, first `[0, 1]` (or block `- 0` / `- 1`), second `[0]`, plus `skippedSteps: []` and `REQUIRED_KEYS`. **Do not** use `writeState()` (it injects `completedSteps: []`). **Distinguishing run:** `python update_state.py <state> --step 2 --elapsed 1`. Assert exit 0 (union path, not fail-closed) and written `completedSteps` contains `0`, `1`, and `2` — not `[0, 2]`. Spec AC5 `--step 1` may be an extra case but cannot alone prove the parser (append of step 1 hides last-wins). Assert a single `completedSteps` key after write. Optional: stderr matches `/duplicate completedSteps/i`. |
| AC3 | (same function, negative) | Must **not** treat last-wins as success. Post-update `validate()` does not check monotonicity gaps, so last-wins `[0, 2]` would also exit 0 — the assertion is the **written list**, not validator-gap failure. Fail-closed is rejected; do not assert non-zero exit. |

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
| MEMORY: skill SoT / no `git add -A` / CRLF regex | Author under `.agents/skills`; stage explicit paths; JS tests `\r?\n`-aware. |

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot scripts + tests only; no installer behavior change except integrity at ship).
- [ ] Domain entities and mappings encapsulated — N/A (no domain entities).
- [ ] Schema migrations created — N/A.
- [ ] Authorization checks applied — N/A.
- [ ] i18n keys declared — N/A.
- [ ] Test cases cover all ACs (AC1–AC5 mapped in §3 and §5).
- [ ] Both `update_state.py` copies use `format_inline_dict` for nested maps; `format_val` has a dict branch; quoted Python repr never appears after serialize.
- [ ] Duplicate `completedSteps` unions unique ints and warns on stderr (fail-closed rejected).
- [ ] Distinguishing test `--step 2` asserts written list contains `0`, `1`, and `2`.
- [ ] `node test/test-update-state-yaml.js` exits 0; `package.json` `tests` / `tests:remote` include the file.
- [ ] `npm run test` (configured `verification.backendTest`) exits 0 before ship.
- [ ] Step 8: `npm run generate-integrity && npm run verify-integrity` exit 0 in the same commit as script edits. No version bump in implement-only commits; ship uses `build-site:bump` if this PR ships package content.

## 8. Open Questions

All resolved. No blockers. Stack is known (`node-skills-package`). Ready for Step 3.

| # | Question | Resolution | resolutionSource |
|---|----------|------------|------------------|
| 1 | Duplicate-key policy (union vs fail-closed) | UNION unique ints for `completedSteps` + stderr warn. Not fail-closed. | project (spec AC3 allows union; audit `recovered: true`; fail-closed would abort live orch) + orch lock |
| 2 | Optional `format_val` dict → `format_inline_dict` | INCLUDE as one branch before `str(v)`. | project (AC1 names `format_val`; it is the `str()` sink) + orch lock |
| 3 | Other duplicate top-level keys | Leave last-wins. Out of AC3. | project (AC3 scoped to `completedSteps`) + orch lock |
| 4 | Quoted-string loc healing (`loc: "{'baseline': 2404}"`) | Out of scope. Unquoted `{...}` via `parse_inline_dict` stays in scope. | project (quoted form is the post-corrupt serialize symptom) + orch lock |

## Gap registry

| id | class | section | gap | resolution | resolutionSource |
|----|-------|---------|-----|------------|------------------|
| G1 | blocking | 8 | Duplicate-key policy: union vs fail-closed | Union unique ints + stderr warn; script exits 0; AC5 distinguishing `--step 2` asserts written `[0, 1, 2]` | project — spec AC3 ("fails, or unions"); issue `recovered: true`; `main()` continues after parse. Evidence: `.agents/plans/us-202/step-00-us-202.spec.md` AC3; `update_state.py` `parse_state_yaml` last-wins dict. |
| G2 | blocking | 8 / 2 | `format_val` dict dispatch listed optional | Required one-branch `isinstance(v, dict): return format_inline_dict(v)` before `str(v)` | project — AC1 names `serialize_yaml` / `format_val`; `format_val` ~line 159–170 is the `str()` fallthrough. Evidence: both `update_state.py` copies. |
| G3 | non-blocking | 8 | Other duplicate top-level keys (e.g. two `currentStep:`) | Last-wins; out of AC3 | project — AC3 scoped to `completedSteps` only |
| G4 | non-blocking | 8 / 1 | Quoted-string loc healing | Out of scope. Unquoted `{...}` recovery in scope | project — `_coerce_scalar` strips quotes and keeps a string; quoted form is the second-serialize symptom |
| G5 | non-blocking | 5 | Spec AC5 `--step 1` is not distinguishing | Keep AC1–AC5. Distinguishing run `--step 2`. After `--step 2` the list still contains 0 and 1 (AC5). Optional extra `--step 1` case allowed | project — `main()` appends `--step` if missing (`update_state.py` ~475–481) |
| G6 | non-blocking | 5 | Plan implied validate_state gap-fail would catch last-wins | Post-update `validate()` does not call `verify_monotonicity` (pre-advance only). Distinguishing assertion is written YAML, not exit-from-gap | project — `validate_state.py` `validate()` vs `validate_pre_advance()` |
| G7 | non-blocking | 1 / 5 | Fixture must pass post-update validate | Seed `REQUIRED_KEYS` (`workflowId`, `us`, `status`, `currentStep`); `skippedSteps: []`; empty manifest/`commits`; `dryRun: true` recommended; loc seed as **block** mapping; loc `--step 1` seed `completedSteps: [0]` | project — `REQUIRED_KEYS` in both `validate_state.py`; `test-quality-gates.js` `writeState` pattern (do not reuse as-is) |
| G8 | non-blocking | 2 | `format_val` is defined before `format_inline_dict` | Call-time lookup is fine; do not reorder functions | project + MEMORY — Python same-module forward reference is not a `NameError` |
| G9 | non-blocking | 4 | Soft-delete / concurrency / list-size / rate-limit probes | N/A | project — no tenancy/DB; `completedSteps` bounded 0–9 |
| G10 | non-blocking | 1 | Deeper-than-one nested maps in `format_inline_dict` | Loc values are scalars; `format_val` dict one-liner is sufficient; do not add a recursive pretty-printer | project — `ws-spec-to-pr/protocols/delivery-result.md` loc fields are ints/null |

All gaps closed. `blocking_open: 0`. `shared_understanding: confirmed`.
