# Output format

Load when emitting `ws-activity-report` results.

## Short title

One line, ~100–120 chars max. Prefer the first useful source:

1. **Work item / issue title** — ADO `System.Title` or GitHub issue title from `step-00-*.issue.json` / `*.issue.json` (`fields["System.Title"]` or `title`).
2. **PR title** — strip noisy prefixes (`feat(US 2670):`, `feat(US-2670):`, `feat(2672) -`, `US 2686 —`) keep the readable remainder.
3. Fallback: `#` / title of `step-00-*.spec.md` or branch name.

If WI/issue and PR differ materially, prefer WI/issue; optional abbreviated `PR: …` note in the technical table. Source label: `WI` | `issue` | `PR` | `spec`.

## Entry form (modal)

```text
### US {id} — {short title}
Date: {YYYY-MM-DD}
Start: {HH:mm}
End: {HH:mm}
Duration: {H:MM}
Description:
{line1}
{line2 optional}
```

| Field | Rule |
|-------|------|
| **Date** | Civil day of the segment (report timezone) |
| **Start** | `HH:mm` of start, or `00:00` if continuation clip |
| **End** | `HH:mm` of end event, or `23:59` if mid-span clip |
| **Description** | ≤ **2 lines**, en-us; `US {id}` + what shipped + `PR {n}` when known |

### Description examples

```text
US 183 — fixed broken ws-shared link paths in THRESHOLDS.md.
PR 42 — closed after review / fix-pr.
```

## Technical table (mandatory)

Every run must include **Short title**:

| US | Short title | Start | End | End kind | PR | Last event | Thread | Author |
|----|-------------|-------|-----|----------|-----|------------|--------|--------|

Optional audit columns when space allows:

| US | Short title | Title source | First bootstrap file | Start | End | End kind | PR | Last event | Thread | Author | Merge PR (ref.) |
|----|-------------|----------------|----------------------|-------|-----|----------|-----|------------|--------|--------|-----------------|

`End kind` ∈ `thread` | `commit` | `gap`. `Title source` ∈ `WI` | `issue` | `PR` | `spec`.

## Summary

- Sum of entry durations
- Wall-clock min→max across entries
- PR ids covered
- Gaps (missing PR, auth, comments, bootstrap files)

## Checklist

1. Resolve `{date}` + timezone
2. Discover overlapping plans
3. Start = `bootstrap_start.py` (creation / override)
4. Short title (WI/issue vs PR)
5. End = max(thread comment, delivery commit)
6. Clip multi-day if needed
7. Description ≤ 2 lines
8. Entries + table with Short title + summary
9. No invented times or titles
