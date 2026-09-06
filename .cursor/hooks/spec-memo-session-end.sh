#!/bin/sh
# // generated-by: spec-memo@0.25.0
# spec-memo fail-open hook (max 1500ms)
SESSION_FILE=".spec-memo/.active-session-id"
SID=""
if [ -f "$SESSION_FILE" ]; then SID="$(cat "$SESSION_FILE" 2>/dev/null)"; fi
if [ -z "$SID" ]; then exit 0; fi
if command -v memo >/dev/null 2>&1; then
  timeout 1.5 memo prompt session_end --session-id "$SID" >/dev/null 2>&1 || true
fi
rm -f "$SESSION_FILE" 2>/dev/null || true
exit 0
