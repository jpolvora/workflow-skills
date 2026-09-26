# Context Companion — Declarative Antigravity and Gemini Skills Configuration via skills.json

Companion to `0083-installer-antigravity-gemini-skills-json.spec.md`. Captures architectural trade-offs, design decisions, and deferred ideas for Antigravity IDE and Gemini CLI skills integration.

## Feature Boundary

- **In Scope:**
  - Upgrading the `gemini` global host target in `bin/install-rules.js` and `bin/cli.js` from directory junction/symlink/copy projection to declarative configuration via `$HOME/.gemini/config/skills.json`.
  - Adding helper functions in `bin/install-rules.js` to parse, upsert, and remove entries from `$HOME/.gemini/config/skills.json` with entry `{ "path": "~/.agents/skills", "include_only": ["ws-*"] }`.
  - Preserving pre-existing user entries and `inherits` blocks in `$HOME/.gemini/config/skills.json`.
  - Automatically sweeping and cleaning up legacy `ws-*` directory junctions, symlinks, and copies from `$HOME/.gemini/config/skills/` during install/update to eliminate duplicate skill discovery in Antigravity.
  - Updating global uninstall to remove the `~/.agents/skills` entry from `$HOME/.gemini/config/skills.json`.
  - Updating auto-detection in `detectExistingSecondaryTargets` to detect the `gemini` target when `$HOME/.gemini` or `$HOME/.gemini/config/skills.json` or `$HOME/.gemini/config/skills` exists.
  - Adding automated regression tests in `test/test-install.js` verifying `skills.json` creation, idempotency, legacy cleanup, and non-destructive operation on user entries.
  - Updating documentation in `README.md` and `docs/index.html`.

- **Out of Scope:**
  - Modifying Claude Code (`~/.claude/skills`) or OpenAI Codex (`~/.codex/skills`) targets (neither supports a declarative `skills.json` mechanism).
  - Editing, formatting, or validating non-workflow skill entries in `~/.gemini/config/skills.json`.
  - Project-local `.agents/skills.json` generation (project-local installations operate within the project workspace directly).

## Implementation Decisions

1. **Declarative Configuration vs. Per-Skill Reparse Points:**
   - *Decision:* Configure `$HOME/.gemini/config/skills.json` with `"path": "~/.agents/skills"` and `"include_only": ["ws-*"]` instead of creating 50+ directory junctions or copies under `~/.gemini/config/skills/`.
   - *Rationale:* Antigravity IDE and Gemini CLI natively support JSON configuration files for scanning external skill directories. This eliminates permission friction on Windows (developer mode / junctions), avoids broken reparse points when temp directories shift, and prevents duplicate skill collisions.

2. **Legacy Reparse Point and Copy Cleanup:**
   - *Decision:* When configuring `skills.json` during install or update, detect and remove any legacy `ws-*` directory junctions, symlinks, or directories in `$HOME/.gemini/config/skills/`.
   - *Rationale:* If older versions of `workflow-skills` previously projected individual skill folders into `~/.gemini/config/skills/`, having both the physical folders/links and the `skills.json` entry would cause Antigravity to discover each skill twice. Non-`ws-*` folders are strictly preserved.

3. **Safe JSON Parsing and Atomic Writes:**
   - *Decision:* When reading `$HOME/.gemini/config/skills.json`, handle non-existent files by seeding a clean structure `{ "entries": [] }`. If the file exists but contains invalid JSON, log a warning, create a timestamped backup (`skills.json.bak.<timestamp>`), and initialize a safe entries array.
   - *Rationale:* Protects user configurations from corruption while preventing installer crashes.

4. **Idempotent Upsert and Selective Deletion:**
   - *Decision:* Check if an entry with `path: "~/.agents/skills"` (or equivalent normalized path) already exists. If found, ensure `"include_only"` contains `"ws-*"` without duplicating entries. On uninstall, remove only this entry; if `entries` becomes empty and no other fields exist, leave a clean `{ "entries": [] }` or prune gracefully.
   - *Rationale:* Zero side-effects on custom user skill folders or external team configurations registered in the same file.

## Deferred Ideas

- **Project-Level `skills.json` Management:** Generating a project-level `.agents/skills.json` during `ws-configure-project`. Deferred because project-local workflow-skills are already co-located under `.agents/skills` where Antigravity discovers them by default.
- **Dynamic Pattern Customization:** Allowing users to specify custom `include_only` regex patterns via CLI flags. Deferred because all workflow-skills use the canonical `ws-*` namespace.
