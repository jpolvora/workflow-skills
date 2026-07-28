---
id: 156
slug: us-156
title: "ws-check-harness: false broken-link reports for bare relative targets (e.g. docs/faq.md)"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/156"
specDate: 2026-07-27
---

# Specification — ws-check-harness: false broken-link reports for bare relative targets (e.g. docs/faq.md)

**State:** open

## Description

## Summary

After `workflow-skills update` in **cursor-server**, `ws-check-harness` reported two broken links:

- `.agents/skills/ws-spec-to-pr/SKILL.md` ??? `docs/faq.md`
- `.agents/skills/ws-spec-to-pr/README.md` ??? `docs/faq.md`

Both targets resolve correctly when checked from the **containing file's directory**:

```
.agents/skills/ws-spec-to-pr/docs/faq.md  ??? exists
```

The false positive occurs when the scanner resolves `docs/faq.md` from **repo root** (`docs/faq.md`) instead of click-simulating from the skill folder.

## Impact

- Consumer audits surface spurious ???upstream debt??? items
- Risk of unnecessary local workarounds (e.g. creating a repo-root `docs/faq.md` stub)
- Undermines trust in harness audit results after skill updates

## Repro

1. Install/update full package in a consumer repo (e.g. cursor-server)
2. Run `ws-check-harness` Phase 2 link validation with a scanner that treats bare `docs/...` as repo-root paths
3. Observe false broken-link finding for `ws-spec-to-pr` FAQ links

## Proposed fix

Clarify Phase 2 resolution rules in `ws-check-harness/PHASES.md`:

- Add explicit row for bare relative links (`docs/faq.md`, `README.md`, etc.)
- Document the common false-positive example
- Emphasize: leading `docs/` does **not** imply repo-root resolution inside skill folders

PR: https://github.com/jpolvora/workflow-skills/pull/new/fix/harness-bare-relative-link-resolution

## Test plan

- [ ] Re-run harness audit on cursor-server after merge ??? 0 broken links
- [ ] Confirm existing `docs/faq.md` links in `ws-spec-to-pr` still validate from containing file

## Acceptance Criteria

- [ ] **AC-1:** Update `PHASES.md` Phase 2 check table to add an explicit row for bare relative links (e.g. `docs/faq.md`, `README.md`).
- [ ] **AC-2:** Document in `PHASES.md` that bare relative links resolve from the containing file's directory (click simulation) and that leading `docs/` inside a skill directory does NOT imply repo-root resolution.
- [ ] **AC-3:** Verify all existing links in `ws-spec-to-pr` and other skills validate properly under `ws-check-harness`.

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
