#!/usr/bin/env bash
# Thin wrapper around the canonical Node CLI installer.
# Prefer: npx --yes github:jpolvora/workflow-skills
# Curl (same flags as npx): curl -fsSL …/install-skills.sh | bash -s -- install --full --yes
set -eu
set -o pipefail

# Prefer UTF-8 for any tool output nested under this shim (Windows Git Bash / Cygwin).
export PYTHONUTF8="${PYTHONUTF8:-1}"
export PYTHONIOENCODING="${PYTHONIOENCODING:-utf-8}"
export LANG="${LANG:-C.UTF-8}"
export LC_ALL="${LC_ALL:-C.UTF-8}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || SCRIPT_DIR=""

echo "============================================================"
echo "  workflow-skills — curl/bash shim → Node CLI"
echo "============================================================"
echo "  Canonical: npx --yes github:jpolvora/workflow-skills"
echo "  Same argv as npx (install --full --yes, update, …)."
echo "  Consumer-owned under .agents/skills/shared/:"
echo "    config.json · STACK.md · MEMORY.md · memory/ · installed-skills.json"
echo "    AGENTS.md (hub) · optional CHANGELOG.md (rules.changelogFile)"
echo "  Path tokens: config pathTokens + shared/tools.md ({skillsRoot}/{sharedDir}/{plansDir})"
echo "  (seeded on first install; never overwritten by upstream)"
echo "  No .agents/AGENTS.md copy — agent contract is skills/shared/AGENTS.md"
echo "  Pack/install skips __pycache__ / *.pyc"
echo "  Workflows: session model at gates; Pause → IDE/agent host → Resume to switch"
echo "============================================================"
echo ""

# Local checkout: run the packaged CLI (supports uncommitted changes).
if [ -n "$SCRIPT_DIR" ] \
  && [ -f "$SCRIPT_DIR/package.json" ] \
  && [ -f "$SCRIPT_DIR/bin/cli.js" ] \
  && grep -q '"name": "workflow-skills"' "$SCRIPT_DIR/package.json" 2>/dev/null; then
  if ! command -v node >/dev/null 2>&1; then
    echo "Error: node is required to run the local installer (bin/cli.js)." >&2
    echo "Install Node.js, or use: npx --yes github:jpolvora/workflow-skills $*" >&2
    exit 1
  fi
  echo "Using local CLI: $SCRIPT_DIR/bin/cli.js"
  exec node "$SCRIPT_DIR/bin/cli.js" "$@"
fi

# Remote / curl | bash: delegate to npx (same argv surface as the Node CLI).
if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx (Node.js) is required." >&2
  echo "Install Node.js from https://nodejs.org/ then run:" >&2
  echo "  npx --yes github:jpolvora/workflow-skills $*" >&2
  exit 1
fi

echo "Delegating to: npx --yes github:jpolvora/workflow-skills $*"
exec npx --yes github:jpolvora/workflow-skills "$@"
