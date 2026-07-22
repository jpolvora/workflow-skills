---
slug: us-95
title: "fix(check-workflows): dependency closure audit fails in consumer repos (missing bin/skill-dependencies.json)"
status: "plan to be refined"
---

## 0. Summary & Business Rules
When running `python .agents/skills/check-workflows/scripts/check_workflows.py` inside consumer repositories, `bin/skill-dependencies.json` does not exist because `bin/` is an upstream repo root folder that is not shipped to consumer projects.
This causes false-positive CRITICAL Dependency Closure errors because `_load_dependencies()` sets `self.deps_map = {}` when `bin/skill-dependencies.json` is missing.

To fix this:
1. Ship `skill-dependencies.json` under `.agents/skills/shared/skill-dependencies.json` as a whitelisted managed hub file during install/update.
2. Update `check_workflows.py` path resolution:
   - Check `.agents/skills/shared/skill-dependencies.json` (consumer install path).
   - Fall back to `REPO_ROOT/bin/skill-dependencies.json` (upstream dev path).
   - If neither file exists, guard closure audit (`if self.deps_loaded:`) to avoid false positives.
3. Update `bin/install-rules.js` to add `'skill-dependencies.json'` to `HUB_WHITELIST`.
4. Update `bin/cli.js` to resolve `skillGraphPath` from `.agents/skills/shared/skill-dependencies.json` or `bin/skill-dependencies.json`.
5. Keep `.agents/skills/shared/skill-dependencies.json` synced with `bin/skill-dependencies.json`.

## 1. Definition of Ready & Scope
- **AC1:** `python .agents/skills/check-workflows/scripts/check_workflows.py` checks `.agents/skills/shared/skill-dependencies.json` first, then falls back to `bin/skill-dependencies.json`.
- **AC2:** If neither dependency manifest exists, `check_workflows.py` skips the dependency closure audit without raising false-positive CRITICAL errors.
- **AC3:** `HUB_WHITELIST` in `bin/install-rules.js` includes `'skill-dependencies.json'` so `npx workflow-skills install/update` copies `skill-dependencies.json` to `.agents/skills/shared/skill-dependencies.json`.
- **AC4:** `npm run tests` and `node bin/generate-skill-integrity.js --check` pass clean.

## 2. Technical Design & Architecture
- **`.agents/skills/check-workflows/scripts/check_workflows.py`**:
  - Update `_load_dependencies()` and path constants to resolve `SHARED_DEPS_PATH` (`.agents/skills/shared/skill-dependencies.json`) first, then `BIN_DEPS_PATH` (`bin/skill-dependencies.json`).
  - Set `self.deps_loaded = True` when a manifest is found and parsed.
  - In `simulate_standard_workflow()` and `simulate_lite_workflow()`, only run `missing_deps` evaluation when `self.deps_loaded` is True.
- **`bin/install-rules.js`**:
  - Add `'skill-dependencies.json'` to `HUB_WHITELIST`.
- **`bin/cli.js`**:
  - Update `skillGraphPath` fallback to check `.agents/skills/shared/skill-dependencies.json` if `bin/skill-dependencies.json` is missing.
- **`.agents/skills/shared/skill-dependencies.json`**:
  - Copy of `bin/skill-dependencies.json` kept in sync.

## 3. Step-by-Step Plan
1. Create `.agents/skills/shared/skill-dependencies.json` as a copy of `bin/skill-dependencies.json`.
2. Update `bin/install-rules.js` to include `'skill-dependencies.json'` in `HUB_WHITELIST`.
3. Update `bin/cli.js` to support resolving `skill-dependencies.json` from `.agents/skills/shared/` or `bin/`.
4. Update `.agents/skills/check-workflows/scripts/check_workflows.py` path resolution and guard logic.
5. Run integrity regeneration (`npm run generate-integrity`) and execute verification tests (`npm run tests -- --local`, `python .agents/skills/check-workflows/scripts/check_workflows.py`).

## 4. Permissions, Tenancy & i18n
N/A (Developer CLI tooling & workflow scripts).

## 5. Test Coverage
- AC1: Test `check_workflows.py` with `.agents/skills/shared/skill-dependencies.json` present.
- AC2: Test `check_workflows.py` with neither manifest present (mocked/isolated).
- AC3: Verify `HUB_WHITELIST` in `bin/install-rules.js` includes `skill-dependencies.json`.
- AC4: Run `npm run tests -- --local` and `node bin/generate-skill-integrity.js --check`.

## 6. Invariants (Do Not Violate)
- Do not break existing CLI commands or package installation.
- Maintain LF-canonical line endings for integrity digests.
- Keep `check-harness` and `check-workflows` green.

## 7. Pre-PR Checklist
- [ ] Layer boundaries respected.
- [ ] Test cases cover all ACs.

## 8. Open Questions
None.
