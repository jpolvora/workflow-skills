#!/bin/sh
# // generated-by: spec-memo@0.25.0
# spec-memo fail-open hook (fire-and-forget background, portable sh)
SESSION_FILE=".spec-memo/.active-session-id"
SID="hook-$(date +%s)-$$"
mkdir -p .spec-memo 2>/dev/null || true
echo "$SID" > "$SESSION_FILE" 2>/dev/null || true
if command -v memo >/dev/null 2>&1; then
  memo bootstrap >/dev/null 2>&1 || true &
  memo prompt session_start --session-id "$SID" >/dev/null 2>&1 || true &
fi
exit 0
