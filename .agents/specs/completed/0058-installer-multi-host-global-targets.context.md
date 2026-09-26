# Context Companion — Installer Multi-Host Global Targets and Symlink Strategy

Companion to `installer-multi-host-global-targets.spec.md`. Captures architectural trade-offs, design decisions, and deferred ideas for multi-host skill distribution.

## Feature Boundary

- **In Scope:**
  - Interactive multi-target selection prompt prior to package selection in `bin/cli.js` when global installation scope is active.
  - Predefined target profiles: Canonical Agents (`~/.agents/skills`), Claude Code (`~/.claude/skills`), OpenAI Codex (`~/.codex/skills`), and Gemini CLI / Antigravity (`~/.gemini/config/skills`).
  - Symlink / directory junction creation from canonical `~/.agents/skills` to selected secondary targets.
  - Per-skill granular linking/copying to preserve pre-existing third-party skills in target directories.
  - Graceful fallback from symlinking to copying if symlink privileges or OS support are unavailable.
  - CLI non-interactive flags (`--targets`, `--symlink`, `--no-symlink`) for automated pipelines.
  - Fixing `assertNotSelfOverwrite` to evaluate the resolved target directory instead of `process.cwd()` when `--global` is specified.

- **Out of Scope:**
  - Managing or modifying non-workflow third-party skills residing in target directories.
  - Host-specific IDE extensions, plugins, or marketplace packaging.
  - Modifying the runtime portable contract of `ws-*` skills (skills remain IDE-neutral).

## Implementation Decisions

1. **Granular Per-Skill Symlinks vs Whole-Directory Symlinks:**
   - *Decision:* Symlink individual skill directories (`ws-*`) into secondary targets rather than symlinking the parent `skills` directory itself.
   - *Rationale:* Secondary directories such as `~/.gemini/config/skills` or `~/.claude/skills` frequently contain user-installed third-party or proprietary skills. Replacing the entire directory with a symlink to `~/.agents/skills` would hide or clobber those existing skills. Per-skill links isolate `workflow-skills` while coexisting peacefully with other tools.

2. **Cross-Platform Symlink Mechanism (Windows Junctions vs POSIX Symlinks):**
   - *Decision:* On Windows (`win32`), use `fs.symlinkSync(target, link, 'junction')` for directories, which does not require elevated administrator privileges or Windows Developer Mode. On POSIX platforms (macOS / Linux), use standard directory symlinks (`'dir'`).
   - *Rationale:* Windows standard symlinks fail with `EPERM` unless Developer Mode or admin rights are enabled. Directory junctions (`junction`) work seamlessly for absolute local directory paths without requiring special permissions.

3. **Fallback Strategy on Symlink Error:**
   - *Decision:* If symlink creation throws any filesystem exception (e.g., cross-drive boundary, permission denied, unprivileged environment), log an informational notice and transparently fall back to direct folder copying (`copyDirSync`).
   - *Rationale:* Ensures the installer never crashes or blocks the developer from receiving skills on restricted machines.

4. **Multi-Host Target State Tracking:**
   - *Decision:* Record the configured secondary target directories in `~/.agents/skills/ws-shared/installed-skills.json` under an optional `globalTargets` array.
   - *Rationale:* Enables `npx --yes github:jpolvora/workflow-skills update --global` to automatically update all previously linked or copied targets in a single operation without re-prompting.

## Deferred Ideas

- **Automatic Running Host Detection:** Automatically sniffing active process trees to detect which agent IDE is currently running. Deferred because developers often use multiple agents interchangeably on the same machine.
- **Custom User-Defined Directory Prompts:** Interactive path typing in CLI prompts. Deferred to keep the initial prompt rapid and keyboard-navigable via simple numbered toggles; users can still set `WORKFLOW_SKILLS_GLOBAL_DIR` or pass custom `--targets`.
