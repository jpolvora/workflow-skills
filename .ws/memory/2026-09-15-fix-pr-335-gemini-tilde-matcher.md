### [2026-09-15] Gemini skills.json matcher must expand tilde before compare
- **Layer**: infrastructure
- **Module**: installer (bin/install-rules.js)
- **Severity**: Medium
- **PathPattern**: bin/install-rules.js
- **Scenario / Context**: upsert/remove isMatch used path.resolve without tilde expansion and short-circuited default-tilde targets to tilde-only equality, so an absolute entry and its ~/ form for the same folder never matched, creating duplicates on install and orphans on uninstall.
- **DO NOT**: Compare skills.json entry paths with bare path.resolve or gate default-tilde targets to tilde-only equality.
- **INSTEAD DO**: Normalize via normalizeGeminiPath(p, homeDir) expanding leading ~/~\ to homeDir before resolve, and match on normalized equality in both upsert and remove; keep distinct homes distinct.
