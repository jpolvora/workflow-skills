### [2026-09-15] Shared-path skills.json must merge/strip include_only, never narrow or delete

- **Layer**: infrastructure
- **Module**: installer (bin/install-rules.js)
- **Severity**: Medium
- **PathPattern**: bin/install-rules.js
- **Scenario / Context**: Upsert merged ws-* into any matching path by forcing include_only to include ws-*, narrowing an unrestricted entry (no filter means all skills) to only ws-*. Remove deleted the whole entry for a matching path, dropping personal patterns sharing the same canonical path. Same-path sharing is the designed case since the default global dir is shared.
- **DO NOT**: Force include_only onto an unrestricted entry on upsert, or delete a whole entry on remove when it still carries non-workflow patterns.
- **INSTEAD DO**: Upsert merges only when existing.include_only is an array, leaving unrestricted entries untouched. Remove strips only ws-* via flatMap, keeping entries with remaining patterns or no filter, deleting only when the filter becomes empty; write when the snapshot changes, not only on length change.
