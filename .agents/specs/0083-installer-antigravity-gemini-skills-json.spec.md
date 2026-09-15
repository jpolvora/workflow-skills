---
id: null
slug: installer-antigravity-gemini-skills-json
title: "Declarative Antigravity and Gemini Skills Configuration via skills.json"
source: local
specDate: 2026-09-14
---

# Specification — Declarative Antigravity and Gemini Skills Configuration via skills.json

## Description

The workflow-skills installer (`bin/cli.js`, `bin/install-rules.js`) provides a global installation scope option (`--global`) with multi-host target support (`--targets canonical,gemini,...`). Historically, the Gemini CLI and Antigravity IDE target (`gemini`) was implemented by projecting individual skill folders from the canonical directory (`$HOME/.agents/skills/ws-*`) into `$HOME/.gemini/config/skills/` via directory symlinks or Windows junctions (with fallback to recursive directory copies).

While functional, projecting individual skill directories creates operational friction:
1. It creates dozens of individual reparse points (junctions) or duplicate directory copies on the host filesystem.
2. On Windows, broken reparse points or permission errors can cause dangling references or installation failures.
3. If users update or install new workflow skills, each individual skill must be re-projected or refreshed.
4. It risks cluttering `$HOME/.gemini/config/skills/` where developers keep personal or third-party skills.

According to the official Google Antigravity and Gemini customization documentation, Antigravity IDE and Gemini CLI natively support external skill discovery through a declarative JSON configuration file: `$HOME/.gemini/config/skills.json`. The configuration schema defines an `entries` array containing path specifications:

```json
{
  "entries": [
    {
      "path": "~/.agents/skills",
      "include_only": ["ws-*"]
    }
  ]
}
```

When this configuration is present, Antigravity IDE and Gemini CLI automatically discover and load all `ws-*` skills directly from the canonical global skills directory (`~/.agents/skills`), applying progressive disclosure without requiring individual directory junctions, symlinks, or file copying.

This feature modifies the `gemini` host target in the workflow-skills installer to use declarative configuration in `$HOME/.gemini/config/skills.json` instead of projecting individual skill folders into `$HOME/.gemini/config/skills/`. In addition, the installer will safely clean up legacy `ws-*` symlinks/junctions/copies in `$HOME/.gemini/config/skills/` to prevent duplicate skill discovery, preserve all existing custom user entries in `skills.json`, and handle uninstallation cleanly.

## Acceptance Criteria

- AC1: Define helper functions in bin/install-rules.js to read, upsert, and remove entries in $HOME/.gemini/config/skills.json with path ~/.agents/skills and include_only pattern ws-*.
- AC2: Update global installation and update workflows in bin/cli.js so the gemini target configures $HOME/.gemini/config/skills.json instead of creating directory links or copies in ~/.gemini/config/skills.
- AC3: Automatically detect and remove legacy ws-* symlinks, junctions, and directories inside $HOME/.gemini/config/skills during gemini target configuration to prevent duplicate skill discovery.
- AC4: Update global uninstallation in bin/cli.js so removing workflow-skills or the gemini target deletes the ~/.agents/skills entry from $HOME/.gemini/config/skills.json.
- AC5: Preserve pre-existing custom entries, inherits blocks, and comments in $HOME/.gemini/config/skills.json and non-workflow skill directories in ~/.gemini/config/skills across all operations.
- AC6: Update secondary target detection in bin/install-rules.js so the gemini target auto-detects when ~/.gemini, ~/.gemini/config/skills.json, or ~/.gemini/config/skills exists.
- AC7: Update CLI documentation in README.md and docs/index.html describing declarative skills.json configuration for Antigravity and Gemini CLI.
- AC8: Provide automated tests in test/test-install.js covering skills.json creation, idempotency, legacy cleanup, custom entry preservation, and uninstallation.

## Original Issue Context

The user requested upgrading the Antigravity/Gemini skills installation mechanism:
"modify antigravity/gemini skills installation: instead of linking the skills from skills folder to $HOME/.agents/skills, use this technique: configuration in file \"$HOME\\.gemini\\config\\skills.json\" => { \"entries\": [ { \"path\": \"~/.agents/skills\", \"include_only\": [\"ws-*\"] } ] } consult/query official antigravity/gemini docs harness for more details."

### Prior Work Sweep

- Spec `0058-installer-multi-host-global-targets.spec.md` established the secondary global targets mechanism (`GLOBAL_HOST_TARGETS`, `--targets`, `projectSkillToTarget`).
- Commit `598902c1` added auto-detection of existing secondary host targets (`detectExistingSecondaryTargets`), treating `~/.gemini` as detection consent for the `gemini` target.
- Commit `28fe32cf` hardened junction handling with lexical `lstatSync` checks to clean up dangling reparse points on Windows.
- Antigravity official customization docs (`agy-customizations/docs/json_configs.md`) detail `skills.json` schema, `entries`, `inherits`, and path resolution (`~/` resolves to user home directory).

### Design Intent

The original multi-host installer treated all secondary targets identically by creating per-skill folder symlinks or directory copies in `<targetDir>/<skillName>`. This uniform approach was necessary for Claude Code (`~/.claude/skills`) and Codex (`~/.codex/skills`) because neither environment offers external directory redirection. However, Antigravity IDE and Gemini CLI provide a first-class declarative configuration mechanism (`skills.json`). Using `skills.json` is architecturally superior: it avoids creating 50+ filesystem reparse points, eliminates Windows junction permission issues, automatically reflects newly added skills in the canonical tree, and prevents duplicate skill collisions.

## Notes

- Antigravity path resolution rules treat `~/` as relative to user home directory, making `"~/.agents/skills"` fully portable across user profiles and operating systems.
- Filter pattern `"include_only": ["ws-*"]` guarantees that only workflow-skills are imported from `~/.agents/skills`, leaving non-workflow global skills unaffected.
- If `$HOME/.gemini/config/skills.json` already contains user entries (e.g., custom personal skills or third-party repositories), the upsert operation appends or updates only the `~/.agents/skills` entry without modifying other array items.
- Legacy cleanup inside `$HOME/.gemini/config/skills` must strictly target entries matching `ws-*` or `ws-shared`, leaving user-authored skills (such as custom prompts or team scripts) intact.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Modifying Claude Code or OpenAI Codex target mechanisms | Neither platform provides a declarative external directory configuration file like `skills.json`. |
| Formatting or linting non-workflow entries in `skills.json` | The installer must only read, upsert, or remove its own designated entry without altering user data. |
| Project-local `.agents/skills.json` generation | Project-local installations already place skills directly under `.agents/skills`, where Antigravity discovers them natively. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Canonical path format in `skills.json` | `"~/.agents/skills"` | Supported natively by Antigravity path resolution and portable across platforms | y |
| Scope pattern in `include_only` | `["ws-*"]` | Covers all workflow-skills while preventing unintended global skill pollution | y |
| Legacy skill folder cleanup scope | Only entries starting with `ws-` | Protects user-created custom skills residing in `~/.gemini/config/skills/` | y |
| Corrupt `skills.json` recovery | Create `.bak.<timestamp>` and reinitialize safe structure | Prevents unrecoverable data loss while allowing installation to proceed | y |
| Implicit-requirement dimensions | N/A because installer operations are local file system tasks without authentication boundaries, server sessions, or remote database lifecycles | Local JSON manipulation and filesystem cleanup require no network auth, throttles, or server lifecycle controls | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Antigravity schema alignment | Path and include_only syntax match Antigravity documentation | Cross-reference with `agy-customizations/docs/json_configs.md` |
| Stack invariant compliance | File modifications use atomic write patterns and error containment | Code inspection and invariant review |
| Legacy cleanup safety | Non-workflow skills in `~/.gemini/config/skills` are never deleted | Automated test assertion with custom skill fixture |
| Authoring validation | Spec passes authoring mode validation without errors | Execute `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Global installation command `npx --yes github:jpolvora/workflow-skills install --full --global --targets gemini --yes` outputs `Configured Antigravity / Gemini skills in ~/.gemini/config/skills.json`.
- File `$HOME/.gemini/config/skills.json` contains valid JSON with `path: "~/.agents/skills"` and `include_only: ["ws-*"]`.
- Running `node test/test-install.js` passes all suites including new tests for `skills.json` integration.

### Negative & Failing Test Scenarios

- Corrupt JSON recovery test: when `$HOME/.gemini/config/skills.json` contains invalid/malformed JSON, the installer creates a `.bak` backup, logs an informative warning, and writes a valid structure without crashing.
- Legacy directory cleanup test: when `$HOME/.gemini/config/skills/` contains legacy `ws-tdah` junction and `my-custom-skill` directory, installing gemini removes `ws-tdah` but preserves `my-custom-skill`.
- Uninstallation cleanup test: when uninstalling with `--targets gemini`, the `~/.agents/skills` entry is removed from `skills.json`, while any pre-existing custom entries remain untouched.
- Read-only permission containment test: when `skills.json` cannot be written due to permissions, the auto-detected target logs a best-effort warning without failing canonical installation.
