### [2026-08-16] audit session JSON must persist repo-relative paths
- **Layer**: `Infrastructure`
- **Module**: `ws-audit / audit_log.js initAudit`
- **Severity**: `Medium`
- **Scenario / Context**: `initAudit` stored `usDir` and `logPath` via `path.resolve`, so committed `.audit-session-*.json` files contained Windows absolute paths (`l:\source\...`). Other clones and CI cannot resume those sessions; the commit leaks a local filesystem layout.
- **DO NOT**: Persist `path.resolve` absolute paths in audit session JSON that may be committed under `{us-dir}`.
- **INSTEAD DO**: Write posix repo-relative `usDir`/`logPath` (hydrate to absolute only for fs I/O). Cover with `test/test-ws-audit.js` asserting the on-disk JSON is not absolute and has no drive letter.
