### [2026-09-15] Home prefix check must require path separator
- **Layer**: infrastructure
- **Module**: installer (bin/cli.js)
- **Severity**: Medium
- **PathPattern**: bin/cli.js
- **Scenario / Context**: resolveTargetHomeDir used target.path.startsWith(envHome) without a separator, so a sibling home sharing a string prefix (e.g. /home/user2 vs /home/user) resolved to the wrong home and read/wrote the wrong skills.json.
- **DO NOT**: Use raw startsWith(envHome) to decide home ownership.
- **INSTEAD DO**: Check target.path === envHome or startsWith(envHome + path.sep) before returning envHome, else fall back to dirname chain.
