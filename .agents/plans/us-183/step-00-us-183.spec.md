---
id: 183
slug: us-183
title: "Fix broken ../ws-shared/ links in ws-classify-complexity/references/THRESHOLDS.md"
source: github
issueState: closed
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/183"
status: completed
specDate: 2026-08-08
---

# Specification — Fix broken `../ws-shared/` links in `ws-classify-complexity/references/THRESHOLDS.md`

**State:** finished

## Description

Two Markdown links in `.agents/skills/ws-classify-complexity/references/THRESHOLDS.md` are broken by an off-by-one relative path (`../` instead of `../../`).

## Evidence

`.agents/skills/ws-classify-complexity/references/THRESHOLDS.md` line 15:

```markdown
[`config.json`](../ws-shared/config.json) → `dagThresholds` (defaults in [`config.json.example`](../ws-shared/config.json.example)):
```

Resolved from the containing directory `references/`:

- `../ws-shared/config.json` → `.agents/skills/ws-classify-complexity/ws-shared/config.json` (**MISSING**)
- Correct target: `.agents/skills/ws-shared/config.json` (exists)

## Proposed fix

Change both link targets from `../ws-shared/` to `../../ws-shared/`:

```markdown
[`config.json`](../../ws-shared/config.json) → `dagThresholds` (defaults in [`config.json.example`](../../ws-shared/config.json.example)):
```

`../../` climbs `references/` → `ws-classify-complexity/` → `skills/`, landing at `.agents/skills/ws-shared/`, which is the declared `{sharedDir}`.

## Context

Found by a `ws-check-harness` audit (consumer install). All other cross-skill Markdown links in the harness resolve correctly; this is the only broken secondary link. The doc is reachable from `SKILL.md` (lines 22 and 87 reference `references/THRESHOLDS.md`), so the broken links affect a workflow-reachable reference doc.

## Acceptance Criteria

- **AC1** — In `references/THRESHOLDS.md`, the `config.json` link target is `../../ws-shared/config.json` and resolves to the existing file.
- **AC2** — In the same line, the `config.json.example` link target is `../../ws-shared/config.json.example` and resolves to the existing file.
- **AC3** — No other content in `THRESHOLDS.md` changes (link-target-only diff).
- **AC4** — `ws-check-harness` link validation reports no broken Markdown links for this file.
- **AC5** — `npm run generate-integrity` and `npm run verify-integrity` exit 0 (hashed skill content changed).

## Notes

Generated from `gh issue view` JSON (GitHub); acceptance criteria added during Step 0 refinement (the issue had none).

The issue body as filed on GitHub has its backticks stripped by shell quoting at creation time. The technical claim was verified independently against the file on disk before accepting it.
