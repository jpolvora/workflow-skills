### [2026-09-15] Partial uninstall must still sweep legacy Gemini ws-* junctions

- **Layer**: infrastructure
- **Module**: installer (bin/cli.js)
- **Severity**: Medium
- **PathPattern**: bin/cli.js
- **Scenario / Context**: Global partial uninstall keeps the Gemini skills.json declarative entry when ws-* skills remain, but the filtered target list skips the gemini branch entirely so legacy ws-* junctions under ~/.gemini/config/skills/ stay on disk and cause duplicate discovery alongside skills.json.
- **DO NOT**: Filter gemini out of secondary removal on partial uninstall without a separate legacy sweep.
- **INSTEAD DO**: After removeSkillsFromSecondaryTargets, loop recorded gemini targets and call cleanupLegacyGeminiSkills(resolveTargetHomeDir(t)) even when the skills.json entry is preserved; log the swept count.

### [2026-09-15] Gemini skills.json matcher must expand tilde before compare

- **Layer**: infrastructure
- **Module**: installer (bin/install-rules.js)
- **Severity**: Medium
- **PathPattern**: bin/install-rules.js
- **Scenario / Context**: upsert/remove isMatch used path.resolve without tilde expansion and short-circuited default-tilde targets to tilde-only equality, so an absolute entry and its ~/ form for the same folder never matched, creating duplicates on install and orphans on uninstall.
- **DO NOT**: Compare skills.json entry paths with bare path.resolve or gate default-tilde targets to tilde-only equality.
- **INSTEAD DO**: Normalize via normalizeGeminiPath(p, homeDir) expanding leading ~/~\ to homeDir before resolve, and match on normalized equality in both upsert and remove; keep distinct homes distinct.

### [2026-09-15] Home prefix check must require path separator

- **Layer**: infrastructure
- **Module**: installer (bin/cli.js)
- **Severity**: Medium
- **PathPattern**: bin/cli.js
- **Scenario / Context**: resolveTargetHomeDir used target.path.startsWith(envHome) without a separator, so a sibling home sharing a string prefix (e.g. /home/user2 vs /home/user) resolved to the wrong home and read/wrote the wrong skills.json.
- **DO NOT**: Use raw startsWith(envHome) to decide home ownership.
- **INSTEAD DO**: Check target.path === envHome or startsWith(envHome + path.sep) before returning envHome, else fall back to dirname chain.
