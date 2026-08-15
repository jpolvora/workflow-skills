### [2026-08-12] ws-doctor asciiSafe punctuation mapping
- **Layer**: Infrastructure
- **Module**: ws-doctor / doctor.js
- **Severity**: Medium
- **Scenario / Context**: Human markdown diagnose reports on Windows prefer ASCII-safe stdout. Blanket stripping of non-ASCII to `?` corrupted em dashes and arrows in report lines and dumped config comments.
- **DO NOT**: Wrap the full markdown report in a naive non-ASCII-to-`?` sanitizer while the formatter still emits Unicode punctuation (em dash, arrows).
- **INSTEAD DO**: Emit ASCII separators in formatters (` - `, `->`) and/or transliterate common punctuation in `asciiSafe` before the residual `?` fallback. Keep `--json` free of destructive ASCII mangling.
