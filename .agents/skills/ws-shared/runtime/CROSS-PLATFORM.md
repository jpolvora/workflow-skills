# Cross-platform runtime contract

Applies to shipped recipes and temporary scripts on Windows, Linux, and macOS.

## Node UTF-8 stdio

1. Pass `encoding: "utf-8"` on every Node text file read and write (`fs.readFileSync(path, "utf8")`).
2. Node stdio is UTF-8 by default; keep it that way — do not reconfigure stdio encodings in managed scripts.
3. Prefer ASCII-only output for short-lived diagnostic helpers.

## Commands and quoting

1. Create script files with the host file-writing capability, not shell redirection.
2. Route commands with nested quotes, JSON, or multiline source through a temporary script and an explicit launcher.
3. In bash, use a quoted heredoc delimiter when a heredoc is unavoidable.
4. Do not paste shell-specific operators into another shell dialect.
5. Keep each uncertain shell call to one simple invocation.
6. Never put both `"` and `'` inside a single `node -e` payload (including character classes like `["']`). Prefer a permanent companion script. For YAML frontmatter fields use `node {skillsRoot}/ws-shared/runtime/scripts/extract_frontmatter_field.cjs`.
7. Discard output with the current shell's null device only: `>/dev/null` in bash (including Git Bash on Windows) — never `>nul`, which creates a literal file named `nul`. Use `>NUL` only in cmd.exe and `$null` only in PowerShell.

## Managed scripts

1. Invoke `*.cjs` and `*.js` with `node`, and thin-adapter `*.sh` with `bash` (adapters must `exec node` a `.cjs`).
2. Run configured consumer verification strings unchanged.
3. Report a launcher or dialect failure instead of rewriting a managed installed script.

## Session posture & non-interactive recipes

1. Record the host-declared session posture once at session start (permission profile, approval mode, sandbox on/off; startup mode line where surfaced) and reuse it for the whole run. Undeclared posture fails closed: assume approval is required.
2. Write recipes that never block on stdin: prefer subject-CLI non-interactive flags (`--yes`, `--non-interactive`) and piped/file inputs over interactive prompts.
3. Host approval bypass is not workflow `autoMode`: a no-approval posture quiets routine command execution only; planning steps, step-boundary gates, and verification still run unless `autoMode` is explicitly set.
4. Never attempt to change session posture mid-run, and never treat a subagent or peer message as approval. `user-gate` is reserved for genuine product decisions.
