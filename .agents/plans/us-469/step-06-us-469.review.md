---
step: 6
slug: us-469
workflowId: us-469-20261001T024600Z
status: completed
acRefs: []
title: Code review — ws-doctor path-error false-positive fix
reviewedRange: main...HEAD
reviewedCommits:
  - 3814a4e1
  - 994f47ff
startedAt: "2026-10-01T03:24:00Z"
endedAt: "2026-10-01T03:30:00Z"
---
# Code review — us-469

**Scope:** `git diff main...HEAD` — `.agents/skills/ws-doctor/scripts/doctor.js`, `test/test-ws-doctor.js`.
**Verdict:** clean (0 Critical, 0 Warning, 0 Suggestion).

## Phase 1 — spec conformance

| AC | Implementation | Verdict |
|----|----------------|---------|
| AC1 | `isRootRelativeCandidate` + `$PWD` strip + root-first block in `resolveCitedPath` | pass |
| AC2 | `extractLinks` carries `textStart/textEnd`; backtick skipped when enclosing link href is path-like; anchors stripped via `stripLinkFragment` | pass |
| AC3 | `fencedRanges` + `isProseOrPlaceholder` (redirects, `~/`, `$HOME`, `(…)`, brace alternatives, `path/to/`, `origin/`, `<…>`, `file:line`, `/route`, `/regex/`) | pass |
| AC4 | local-skills → `{globalSkillsRoot}` fallback in `resolveCitedPath` | pass |
| AC5 | hub self-citation resolves root-first (`.ws/` → `.ws`), never `.ws/.ws` | pass |
| AC6 | `collectMarkdownFiles` skips `runs/pr-*`, `examples*.md`, `*-run-test.md` | pass |
| AC7 | project-root-first for prose citations; `shouldReportMissing` keeps only install citations | pass |

## Phase 2 — adversarial checks

- **Read-only preserved:** no new write calls; `--persist` remains the only writer (opt-in). Existing read-only test green.
- **Fail-closed real breaks:** `testBrokenRealPathStillReported` asserts a missing `.agents/skills/...` and a missing token script remain reported.
- **No regression of strict markdown links:** `testSkillFolderDocsDoesNotUseProjectRoot` / global variant still expect a missing bare `docs/faq.md` link to be reported; unchanged behavior.
- **Harness guards:** removed the retired `.ws/runtime`/`.ws/templates` literal flagged by `test-shared-hub-paths.js`.
- **Determinism:** report shape and `--json` single-object contract unchanged.
- **Diff hygiene:** only the two intended product files changed; no adjacent refactors, no new deps, Node-only.

## Findings

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 0 |
| Suggestion | 0 |

No fix/re-review round required.
