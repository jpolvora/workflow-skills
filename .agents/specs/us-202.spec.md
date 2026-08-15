---
id: 202
slug: us-202
title: "ws-spec-to-pr update_state.py: duplicate completedSteps keys last-win + telemetry.loc Python dict repr"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/202"
labels: [bug]
specDate: 2026-08-13
---

# Specification — ws-spec-to-pr update_state.py: duplicate completedSteps keys last-win + telemetry.loc Python dict repr

**State:** open
**Labels:** bug

## Description

## Summary

Runtime audit on consumer **MarchanteERP** (`ws-spec-to-pr` standard, slug `us-2728-a`, package **0.3.15**) recorded one **unusual** skill-script finding at Step 1. Workflow recovered (`recovered: true`); `state.md` still carries a corrupt `telemetry.loc` value at end of run.

`draft-issue` did not auto-emit this (helper only includes `severity: error`). Filing anyway so the managed script is fixed upstream — consumer copies are overwritten on `update`.

**Audit session:** `.agents/plans/us-2728-a/.audit-session-us-2728-a.json`  
**Audit log:** `.agents/plans/us-2728-a/audit-us-2728-a-2026-08-13T13-20-18-853Z.log.md`  
**Skill:** `ws-spec-to-pr` (`scripts/update_state.py`; same serializer in `ws-spec-to-pr-lite`)

---

### Finding (runtime)

- **timestamp:** 2026-08-13T13:32:40Z
- **step:** 1
- **category:** script
- **severity:** unusual
- **recovered:** true
- **summary:** Prior state.md had duplicate `completedSteps` YAML keys; `update_state.py` also serialized `telemetry.loc` as Python dict repr
- **evidence:** `completedSteps` appeared twice (0-1 then overwritten to 0); `loc: {'baseline': 2404}` after `serialize_yaml`

---

### 1. Nested dicts go through `str()` — `telemetry.loc` becomes Python repr

**File:** `.agents/skills/ws-spec-to-pr/scripts/update_state.py` (`serialize_yaml` / `format_val`; lite copy is the same)

```python
elif isinstance(subv, dict):
    if not subv:
        lines.append(f"  {subk}: {{}}")
    else:
        lines.append(f"  {subk}: {format_val(subv)}")  # nested map

def format_val(v):
    ...
    return str(v)  # dict → "{'baseline': 2404}"
```

**Still on disk after Step 8** (`us-2728-a-20260813T131841Z.state.md`):

```yaml
telemetry:
  workflowStartedAt: "2026-08-13T13:18:41Z"
  loc: "{'baseline': 2404}"
```

Round-trip: dict → Python repr → next parse keeps a string (`_coerce_scalar`) → next serialize quotes it because of `:` → `"{'baseline': 2404}"`. Downstream telemetry that expects a mapping (`baseline` int) gets a string.

**Fix:** serialize nested mappings with `format_inline_dict` (or a real nested YAML block). Never `str()` a dict. Mirror in `ws-spec-to-pr-lite/scripts/update_state.py`. Add a unit test: `telemetry.loc = {baseline: 2404}` round-trips as a mapping, not a quoted repr.

---

### 2. Duplicate `completedSteps` keys — last key wins, earlier progress dropped

`parse_state_yaml` is a plain dict: a second top-level `completedSteps:` silently replaces the first.

Evidence: file had `completedSteps: [0, 1]` then a later `completedSteps: [0]`; parse kept `[0]`; Step 1 append recovered the list.

`serialize_yaml` itself cannot emit duplicate keys (Python dict). The duplicate came from a prior write (hand-merge / orch edit / concatenating frontmatter). The script still should not silently drop progress.

**Fix (either or both):**

- Detect duplicate top-level keys and **fail** (or warn + merge).
- For `completedSteps` specifically: **union** lists, then sort unique ints.
- Do not treat last-wins as success.

---

## Suggested test

1. Seed `state.md` with `telemetry.loc: { baseline: 2404 }` (nested mapping). Run `python update_state.py … --step 1 --elapsed 1`. Frontmatter `telemetry.loc` remains a mapping (`baseline: 2404` or `{ baseline: 2404 }`), never `"{'baseline': 2404}"`.
2. Seed frontmatter with two `completedSteps:` blocks (`[0, 1]` then `[0]`). Script either errors or writes `completedSteps: [0, 1]` after `--step 1`, not `[0]` then re-append only.

## Out of scope

- Consumer product code / US 2728-a delivery (recovered; ship completed).
- `ws-audit` `draft-issue` ignoring `unusual` (optional follow-up; this issue is the script defect).

## Context

- Upstream: https://github.com/jpolvora/workflow-skills
- `packageVersion`: `0.3.15` (`.agents/skills/ws-shared/skill-dependencies.json`)
- Reporter: runtime audit, MarchanteERP, workflow `us-2728-a-20260813T131841Z`, 2026-08-13

## Acceptance Criteria

- AC1: `serialize_yaml` / `format_val` in `.agents/skills/ws-spec-to-pr/scripts/update_state.py` never emit a nested mapping via `str()`; `telemetry.loc` with `{ baseline: 2404 }` round-trips as a YAML mapping (`baseline: 2404` or `{ baseline: 2404 }`), never Python repr `"{'baseline': 2404}"`.
- AC2: The same nested-mapping serializer is mirrored in `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py`.
- AC3: Duplicate top-level `completedSteps:` keys are not silent last-wins: the parser fails, or unions lists then sorts unique ints, so `[0, 1]` then `[0]` does not drop step 1.
- AC4: Unit test seeds `telemetry.loc: { baseline: 2404 }`, runs `update_state.py --step 1 --elapsed 1`, and asserts `telemetry.loc` remains a mapping (not a quoted repr).
- AC5: Unit test seeds two `completedSteps:` blocks (`[0, 1]` then `[0]`); after `--step 1` the script errors or writes `completedSteps` containing both 0 and 1.

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
