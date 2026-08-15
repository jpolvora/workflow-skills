# Implementation Plan — us-211

**Slug:** us-211  
**Workflow:** lite · autoMode · fullMode  
**Branch:** feature/us-211 → main

## Goal

Fix hybrid/global installs: scripts must resolve consumer `{sharedDir}` from `$PWD` (or `--repo-root`), never from a global-hub `ws-shared` sibling of `__file__` or `parents[4]` → `$HOME`.

## Tasks

### 1. Shared resolver (`ws-shared/scripts/`)

- **`resolve_consumer_root.py`**: `resolve_repo_root(override, script_file)` — `--repo-root` → CWD hub probe (`config.json` or `.example`) → `parents[4]` only when script is **not** under `{globalSkillsRoot}`.
- **`resolve_consumer_root.cjs`**: JS twin with same precedence + `sharedDir(repoRoot)` helper.

### 2. Port scripts

| Script | Change |
|--------|--------|
| `ws-self-learning/scripts/self_learning.py` | Import resolver; add `--repo-root`; set `SHARED_DIR` from consumer root |
| `ws-spec-to-pr/scripts/validate_state.py` | Replace `REPO_ROOT = parents[4]` with resolver |
| `ws-spec-to-pr-lite/scripts/validate_state.py` | Same |
| `ws-local-spec-provider/scripts/detect_specs_dir.py` | Same + `--repo-root` CLI |
| `ws-classify-complexity/scripts/classify.cjs` | `loadConfig()` uses consumer `sharedDir` via resolver |

### 3. `tools.md`

- Skill-script expand rule: `{skillsRoot}/ws-<id>/...` if present, else `{globalSkillsRoot}/ws-<id>/...`.
- Restate: `../ws-shared/` links in global SKILL.md are not runtime config; runtime uses `$PWD/{sharedDir}`.

### 4. Tests (`test/test-hybrid-consumer-root.js`)

Fixture: fake global skills tree + separate consumer cwd with distinctive `dagThresholds` / `plans.dir` / MEMORY.

Assert:
- `self_learning.py --compile` writes consumer `MEMORY.md`
- `classify.cjs` reads consumer `dagThresholds`
- `validate_state.py` resolves consumer `plans.dir`

Register in `package.json` `tests` script.

## Verification

- `npm run test` (exit 0)
- `npm run generate-integrity && npm run verify-integrity` if hashed content changes
- `npm run build-site:bump` for package ship
- Harness audit 0 critical (if runnable)

## Out of scope

Per spec: SKILL.md entry checks, local skill override, configure_autoload emission, secrets-leak shim.
