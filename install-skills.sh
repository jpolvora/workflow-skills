#!/usr/bin/env bash

# Stop on errors
set -e

echo "============================================================"
echo "  workflow-skills — legacy bash installer"
echo "============================================================"
echo "  Note: Package shortcuts (Full / Workflows / Extra) and"
echo "  transitive skill dependency selection are implemented in"
echo "  the Node CLI only:"
echo "    npx github:jpolvora/workflow-skills"
echo "  Prefer the Node CLI for updates and package installs."
echo "============================================================"
echo ""

# Find script directory (source of skills)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_SKILLS_DIR="$SCRIPT_DIR/.agents/skills"
SRC_AGENTS_INDEX="$SCRIPT_DIR/.agents/AGENTS.md"

# Temporary directory for cloning if run remotely/standalone
TEMP_CLONE_DIR=""

cleanup() {
  if [ -n "$TEMP_CLONE_DIR" ] && [ -d "$TEMP_CLONE_DIR" ]; then
    rm -rf "$TEMP_CLONE_DIR"
  fi
}
trap cleanup EXIT

# Detect if we are running from the official workflow-skills repository
IS_WORKFLOW_SKILLS_REPO=false
if [ -f "$SCRIPT_DIR/package.json" ]; then
  if grep -q '"name": "workflow-skills"' "$SCRIPT_DIR/package.json"; then
    IS_WORKFLOW_SKILLS_REPO=true
  fi
fi

# Check if source skills directory exists and we are inside the workflow-skills repo.
# If not, it means the script is being run remotely (e.g. via curl) or in a target project.
# In this case, we clone the repository to a temporary directory to retrieve the skills.
if [ "$IS_WORKFLOW_SKILLS_REPO" = "false" ] || [ ! -d "$SRC_SKILLS_DIR" ]; then
  if [ "$IS_WORKFLOW_SKILLS_REPO" = "false" ] && [ -d "$SRC_SKILLS_DIR" ]; then
    echo "Running in target repository. Fetching original skills from GitHub..."
  fi
  TEMP_CLONE_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t 'workflow-skills')"
  REPO_URL="${WORKFLOW_SKILLS_REPO_URL:-https://github.com/jpolvora/workflow-skills.git}"
  REPO_BRANCH="${WORKFLOW_SKILLS_REPO_BRANCH:-main}"
  git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$TEMP_CLONE_DIR"
  SRC_SKILLS_DIR="$TEMP_CLONE_DIR/.agents/skills"
  SRC_AGENTS_INDEX="$TEMP_CLONE_DIR/.agents/AGENTS.md"
fi

# Get current directory (target repository where script is run)
TARGET_DIR="$(pwd)"

# Refuse installing into the workflow-skills source tree (except test/)
if [ "$IS_WORKFLOW_SKILLS_REPO" = "true" ] && [ -z "$TEMP_CLONE_DIR" ]; then
  RESOLVED_TARGET="$(cd "$TARGET_DIR" && pwd)"
  RESOLVED_SCRIPT="$(cd "$SCRIPT_DIR" && pwd)"
  if [ "$RESOLVED_TARGET" = "$RESOLVED_SCRIPT" ]; then
    echo "Error: Refusing to install into the workflow-skills source repository."
    echo "  Package root: $RESOLVED_SCRIPT"
    echo "  Current dir:  $RESOLVED_TARGET"
    echo "Run from a consumer project, or from the test/ folder."
    echo "Prefer: npx github:jpolvora/workflow-skills"
    exit 1
  fi
  case "$RESOLVED_TARGET" in
    "$RESOLVED_SCRIPT"/test|"$RESOLVED_SCRIPT"/test/*) ;;
    "$RESOLVED_SCRIPT"/*)
      echo "Error: Refusing to install into the workflow-skills source repository."
      echo "  Package root: $RESOLVED_SCRIPT"
      echo "  Current dir:  $RESOLVED_TARGET"
      echo "Run from a consumer project, or from the test/ folder."
      echo "Prefer: npx github:jpolvora/workflow-skills"
      exit 1
      ;;
  esac
fi

# Avoid copying skills onto the source itself
RESOLVED_SRC_SKILLS_DIR="$(cd "$SRC_SKILLS_DIR" && pwd)"
RESOLVED_TARGET_SKILLS_DIR="$(mkdir -p "$TARGET_DIR/.agents/skills" && cd "$TARGET_DIR/.agents/skills" && pwd)"

if [ "$RESOLVED_SRC_SKILLS_DIR" = "$RESOLVED_TARGET_SKILLS_DIR" ]; then
  echo "Error: Target directory is the same as the source skills directory."
  echo "This script should be run from within the target repository where you want to install the skills."
  echo "Example:"
  echo "  cd /path/to/my-project"
  echo "  bash $SCRIPT_DIR/install-skills.sh"
  echo "Prefer: npx github:jpolvora/workflow-skills"
  exit 1
fi

echo "Note: For updates that preserve config.json and install new skills, prefer:"
echo "  npx github:jpolvora/workflow-skills update"
echo "  npx github:jpolvora/workflow-skills update --include-new"
echo

# Scan for skills directories
skills=()
for dir in "$SRC_SKILLS_DIR"/*; do
  if [ -d "$dir" ]; then
    skills+=("$(basename "$dir")")
  fi
done

if [ ${#skills[@]} -eq 0 ]; then
  echo "No skills found in $SRC_SKILLS_DIR"
  exit 0
fi

# Initialize selected array to false
selected=()
for ((i=0; i<${#skills[@]}; i++)); do
  selected[i]=false
done

while true; do
  clear 2>/dev/null || true
  
  echo "============================================================"
  echo "  Workflow Skills - Skill Installer (bash)"
  echo "============================================================"
  echo "Source: $SRC_SKILLS_DIR"
  echo "Target: $TARGET_DIR/.agents/skills"
  echo "------------------------------------------------------------"
  echo "Toggle selection by entering the number."
  echo "Enter 'a' to select/deselect all."
  echo "Enter 'y' or 'i' to install the selected skills."
  echo "Enter 'q' to quit."
  echo "------------------------------------------------------------"
  echo
  
  for ((i=0; i<${#skills[@]}; i++)); do
    mark=" "
    if [ "${selected[i]}" = "true" ]; then
      mark="x"
    fi
    printf "  [%s] %2d) %s\n" "$mark" $((i+1)) "${skills[i]}"
  done
  echo
  
  if [ -t 0 ]; then
    read -p "Select action or toggle (e.g. 1, a, y, q): " opt
  else
    read -p "Select action or toggle (e.g. 1, a, y, q): " opt < /dev/tty
  fi
  
  if [[ "$opt" =~ ^[0-9]+$ ]]; then
    idx=$((opt - 1))
    if [ $idx -ge 0 ] && [ $idx -lt ${#skills[@]} ]; then
      if [ "${selected[idx]}" = "true" ]; then
        selected[idx]="false"
      else
        selected[idx]="true"
      fi
    else
      echo "Invalid number: $opt. Press enter to continue..."
      if [ -t 0 ]; then
        read -r
      else
        read -r < /dev/tty
      fi
    fi
  elif [ "$opt" = "a" ] || [ "$opt" = "A" ]; then
    all_selected=true
    for ((i=0; i<${#skills[@]}; i++)); do
      if [ "${selected[i]}" = "false" ]; then
        all_selected=false
        break
      fi
    done
    
    for ((i=0; i<${#skills[@]}; i++)); do
      if [ "$all_selected" = "true" ]; then
        selected[i]="false"
      else
        selected[i]="true"
      fi
    done
  elif [ "$opt" = "y" ] || [ "$opt" = "Y" ] || [ "$opt" = "i" ] || [ "$opt" = "I" ]; then
    break
  elif [ "$opt" = "q" ] || [ "$opt" = "Q" ]; then
    echo "Exiting without installing."
    exit 0
  else
    echo "Invalid option: $opt. Press enter to continue..."
    if [ -t 0 ]; then
      read -r
    else
      read -r < /dev/tty
    fi
  fi
done

# Perform copy (preserve config.json on overwrite — same contract as Node CLI update)
installed_count=0
echo
echo "Starting installation..."
for ((i=0; i<${#skills[@]}; i++)); do
  if [ "${selected[i]}" = "true" ]; then
    skill_name="${skills[i]}"
    src_path="$SRC_SKILLS_DIR/$skill_name"
    dest_dir="$TARGET_DIR/.agents/skills/$skill_name"
    
    echo "Installing '$skill_name'..."
    
    preserved_config=""
    if [ -d "$dest_dir" ]; then
      echo "  Warning: Destination directory '.agents/skills/$skill_name' already exists."
      if [ -t 0 ]; then
        read -p "  Overwrite? (y/n): " confirm_overwrite
      else
        read -p "  Overwrite? (y/n): " confirm_overwrite < /dev/tty
      fi
      if [[ ! "$confirm_overwrite" =~ ^[yY](es)?$ ]]; then
        echo "  Skipped: $skill_name"
        continue
      fi
      if [ -f "$dest_dir/config.json" ]; then
        preserved_config="$(mktemp)"
        cp "$dest_dir/config.json" "$preserved_config"
      fi
      rm -rf "$dest_dir"
    fi
    
    mkdir -p "$TARGET_DIR/.agents/skills"
    cp -r "$src_path" "$dest_dir"
    if [ -n "$preserved_config" ] && [ -f "$preserved_config" ]; then
      cp "$preserved_config" "$dest_dir/config.json"
      rm -f "$preserved_config"
      echo "    Preserved existing config.json"
    fi
    echo "  Installed: $skill_name -> .agents/skills/$skill_name"
    installed_count=$((installed_count + 1))
  fi
done

# Packaged consumer index (portability / upstream PR rules)
if [ -f "$SRC_AGENTS_INDEX" ]; then
  mkdir -p "$TARGET_DIR/.agents"
  cp "$SRC_AGENTS_INDEX" "$TARGET_DIR/.agents/AGENTS.md"
  echo "  Installed packaged index: .agents/AGENTS.md"
fi

echo
if [ $installed_count -gt 0 ]; then
  echo "Successfully installed $installed_count skill(s) into $TARGET_DIR/.agents/skills"
else
  echo "No skills were installed."
fi
