#!/bin/sh
# // generated-by: spec-memo@0.25.0
# spec-memo fail-open hook (max 1500ms)
SESSION_FILE=".spec-memo/.active-session-id"
SID="hook-$(date +%s)-$$"
mkdir -p .spec-memo 2>/dev/null || true
echo "$SID" > "$SESSION_FILE" 2>/dev/null || true
if command -v memo >/dev/null 2>&1; then
  timeout 1.5 memo bootstrap >/dev/null 2>&1 || true
  timeout 1.5 memo prompt session_start --session-id "$SID" >/dev/null 2>&1 || true
fi
exit 0
