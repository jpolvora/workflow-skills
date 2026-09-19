### [2026-09-15] Wrong-shape skills.json recovery must preserve inherits

- **Layer**: infrastructure
- **Module**: installer (bin/install-rules.js)
- **Severity**: Medium
- **PathPattern**: bin/install-rules.js
- **Scenario / Context**: readGeminiSkillsJson wrong-shape branch (parseable object with non-array entries) backed up then returned bare { entries: [] }, discarding a valid inherits block. Upsert then rewrote the file without shared imports.
- **DO NOT**: Return bare { entries: [] } on parseable wrong-shape JSON without carrying over valid inherits.
- **INSTEAD DO**: Build recovered = { entries: [] } and copy parsed.inherits when it is an array; unparsable JSON and missing file keep bare recovery since inherits cannot be read.
