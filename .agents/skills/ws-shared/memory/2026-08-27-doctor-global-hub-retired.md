### [2026-08-27] Doctor hybrid global hub leftovers

- **Layer:** skills
- **Module:** ws-doctor
- **Severity:** Medium
- **PathPattern:** `.agents/skills/ws-doctor/scripts/doctor.js`
- **Scenario / Context:** Hybrid installs keep skills globally while project `ws-shared` holds config. Retired hub files (`session-lease.schema.json`) and retired `defaults.*` keys can remain under `$HOME/.agents/skills/ws-shared/` after 0.3.38 while the project hub is clean. Scanning only project `sharedDirAbs` / project `config.json` yields a false-negative pre-update diagnostic.
- **DO NOT:** Report stale retired hub files or config keys from the project hub only when `{globalSkillsRoot}` is a distinct tree.
- **INSTEAD DO:** Also list `RETIRED_HUB_FILES` and `listRetiredConfigKeys` under `{globalSkillsRoot}/ws-shared/` when it differs from project `{skillsRoot}`; recommend `update --global` when global leftovers exist. Cover with hybrid fixture tests.
