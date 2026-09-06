#!/bin/sh
# // generated-by: spec-memo@0.25.0
# spec-memo fail-open hook (max 1500ms)
SESSION_FILE=".spec-memo/.active-session-id"
SID=""
if [ -f "$SESSION_FILE" ]; then SID="$(cat "$SESSION_FILE" 2>/dev/null)"; fi
if [ -z "$SID" ]; then SID="hook-orphan-$$"; fi
if command -v memo >/dev/null 2>&1; then
  timeout 1.5 memo prompt record --session-id "$SID" --body '[hook-automated turn]' >/dev/null 2>&1 || true
fi
exit 0
