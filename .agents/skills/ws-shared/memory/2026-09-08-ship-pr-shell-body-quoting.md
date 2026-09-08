### [2026-09-08] Ship command bodies must not use shell substitutions
- **Layer**: `Tooling`
- **Module**: `ws-ship-pr / GitHub provider`
- **Severity**: `High`
- **PathPattern**: `**/ws-ship-pr/**;**/ws-spec-provider-github/**`
- **Scenario / Context**: An inline PR body containing Markdown backticks was passed through a shell command. The shell executed the backticked verification commands before invoking the provider, produced a too-large argument, and the PR create intent failed.
- **DO NOT**: Put backticks, `$()` expressions, or other shell-active syntax directly inside an inline `gh` body argument.
- **INSTEAD DO**: Write the body through a safe file tool or use a shell-quoted body-file path, then pass it to the provider without command substitution.
