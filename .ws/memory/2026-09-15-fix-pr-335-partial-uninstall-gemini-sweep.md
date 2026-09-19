### [2026-09-15] Partial uninstall must still sweep legacy Gemini ws-* junctions
- **Layer**: infrastructure
- **Module**: installer (bin/cli.js)
- **Severity**: Medium
- **PathPattern**: bin/cli.js
- **Scenario / Context**: Global partial uninstall keeps the Gemini skills.json declarative entry when ws-* skills remain, but the filtered target list skips the gemini branch entirely so legacy ws-* junctions under ~/.gemini/config/skills/ stay on disk and cause duplicate discovery alongside skills.json.
- **DO NOT**: Filter gemini out of secondary removal on partial uninstall without a separate legacy sweep.
- **INSTEAD DO**: After removeSkillsFromSecondaryTargets, loop recorded gemini targets and call cleanupLegacyGeminiSkills(resolveTargetHomeDir(t)) even when the skills.json entry is preserved; log the swept count.
