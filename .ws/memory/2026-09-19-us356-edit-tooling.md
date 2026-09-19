### [2026-09-19] CRLF multi-line edits via edit_file

Layer: tests/devops. Module: ws-monitor scripts. Severity: Medium.
PathPattern: `.agents/skills/**/*.cjs`

Scenario: `muse.edit_file` matches exact text; on CRLF files every
multi-line `find` silently misses. Several patch attempts failed before
switching strategy.

DO NOT: retry multi-line `edit_file` finds on CRLF files, or embed
backslash-`n` / template-interpolation sequences in patcher-script
template literals (they evaluate in the patcher, corrupting output).

INSTEAD DO: single-line `edit_file` anchors, or file-based Node patcher
scripts with no template literals (concatenation + char codes), splitting
target text on explicit CRLF and verifying with `node --check` per hunk.
Verify byte-level truth with char-code dumps when rendered output and
matchers disagree (display layers can rewrite tokens invisibly).
