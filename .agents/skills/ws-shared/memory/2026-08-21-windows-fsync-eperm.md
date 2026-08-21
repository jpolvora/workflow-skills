### [2026-08-21] Windows fsync EPERM on read-only temp files

- **Layer**: Infrastructure
- **Module**: `ws-goal-loop / convergence.cjs atomicWrite`
- **Severity**: Medium
- **PathPattern**: `.agents/skills/**/scripts/*.cjs, **atomicWrite**`
- **Scenario / Context**: `atomicWrite` wrote the temp file then `openSync(..., 'r')` + `fsyncSync`. On Windows that read-only handle returns `EPERM: operation not permitted, fsync`, so round-log writes aborted and left `.tmp-<pid>` files.
- **DO NOT**: `fsyncSync` a descriptor opened with `'r'`, or treat fsync `EPERM`/`EINVAL` as a fatal write failure on Windows/sandboxed volumes.
- **INSTEAD DO**: Open the temp file with `'w'`, write, best-effort `fsyncSync` (ignore `EPERM`/`EINVAL`), close, then rename onto the destination.
