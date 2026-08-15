#!/usr/bin/env bash
# ws-preview v1 — cursor-reviewer dry-run wrapper (portable stack/branch from config or flags).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

CONFIG_PATH="${WS_SHARED_CONFIG:-.agents/skills/ws-shared/config.json}"
STACK=""
TARGET_BRANCH=""
MODEL=""
INCLUDE_UNCOMMITTED=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stack)
      STACK="$2"
      shift 2
      ;;
    --target-branch)
      TARGET_BRANCH="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --committed-only)
      INCLUDE_UNCOMMITTED=0
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

read_config() {
  node -e "
const fs = require('fs');
const p = process.argv[1];
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { process.exit(0); }
const stack = cfg.preview?.stack || cfg.stack?.id || '';
const base = cfg.project?.baseBranch || 'main';
const remote = cfg.project?.gitRemote || 'origin';
process.stdout.write(JSON.stringify({ stack, baseBranch: base, gitRemote: remote }));
" "$CONFIG_PATH"
}

if [[ -z "$STACK" || -z "$TARGET_BRANCH" ]]; then
  CFG_JSON="$(read_config)"
  [[ -z "$STACK" ]] && STACK="$(node -e "const c=JSON.parse(process.argv[1]); process.stdout.write(c.stack||'');" "$CFG_JSON")"
  if [[ -z "$TARGET_BRANCH" ]]; then
    BASE="$(node -e "const c=JSON.parse(process.argv[1]); process.stdout.write(c.baseBranch||'main');" "$CFG_JSON")"
    TARGET_BRANCH="refs/heads/$BASE"
  fi
fi

if [[ -z "$STACK" ]]; then
  echo "ws-preview: stack id required (set stack.id or preview.stack in config, or pass --stack)" >&2
  exit 2
fi

TMP_DIR=".tmp-cursor-reviewer"
RUN_SH="${TMP_DIR}/run.sh"
mkdir -p "$TMP_DIR"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

curl -fsSL "https://raw.githubusercontent.com/jpolvora/cursor-reviewer/release/run.sh" -o "$RUN_SH"
chmod +x "$RUN_SH"

ARGS=(--dry-run --verbose --stack "$STACK" --target-branch "$TARGET_BRANCH")
if [[ "$INCLUDE_UNCOMMITTED" -eq 1 ]]; then
  ARGS+=(--include-uncommitted)
fi
if [[ -n "$MODEL" ]]; then
  ARGS+=(--model "$MODEL")
fi

bash "$RUN_SH" "${ARGS[@]}"
