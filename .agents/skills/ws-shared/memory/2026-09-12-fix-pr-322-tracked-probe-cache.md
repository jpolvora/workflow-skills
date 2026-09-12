### [2026-09-12] Never commit consumer-local probe cache upstream
- **Layer**: harness
- **Module**: ws-shared host binding probe cache
- **Severity**: High
- **PathPattern**: .agents/skills/ws-shared/host-capabilities.json; .gitignore; bin/install-rules.js
- **Scenario / Context**: Host probe upserts `{sharedDir}/host-capabilities.json` during dogfood workflows. A broad stage (`git add -A`) then tracks the per-machine binding (hostId::model, timestamps) in upstream history, polluting every checkout with stale bindings.
- **DO NOT**: Stage or commit `.agents/skills/ws-shared/host-capabilities.json` upstream, or assume root `.gitignore` already covers it when `templates/hub.gitignore` does.
- **INSTEAD DO**: `git rm` the tracked file when present, add `.agents/skills/ws-shared/host-capabilities.json` to root `.gitignore` (hub-layout installerMetadata=ignore, spec 0059 AC9 never-shipped-upstream), and stage only workflow `files_touched` in product/fix commits.
