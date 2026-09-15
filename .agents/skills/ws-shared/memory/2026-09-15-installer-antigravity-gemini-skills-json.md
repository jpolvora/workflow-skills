### [2026-09-15] Antigravity and Gemini CLI skills declarative configuration
- **Layer**: `infrastructure`
- **Module**: `installer (bin/install-rules.js, bin/cli.js)`
- **Severity**: `Medium`
- **PathPattern**: `bin/install-rules.js;bin/cli.js;test/test-install.js`
- **Scenario / Context**: Antigravity and Gemini CLI discover skills declaratively from `$HOME/.gemini/config/skills.json` (`entries: [{ path: "~/.agents/skills", include_only: ["ws-*"] }]`). Projecting or symlinking individual skill folders into `~/.gemini/config/skills/` creates duplicate discovery and requires folder management.
- **DO NOT**: Project or symlink individual workflow skills into `$HOME/.gemini/config/skills/` for the `gemini` host target, and do not overwrite or clobber custom user entries or `inherits` blocks in `skills.json`.
- **INSTEAD DO**: Configure `$HOME/.gemini/config/skills.json` declaratively with `path: "~/.agents/skills"` and `include_only: ["ws-*"]`. Sweep legacy `ws-*` junctions/symlinks from `~/.gemini/config/skills/` while preserving non-`ws-*` user skills. On corrupt JSON, create a `.bak.<timestamp>` backup, log a warning, and heal safely.
