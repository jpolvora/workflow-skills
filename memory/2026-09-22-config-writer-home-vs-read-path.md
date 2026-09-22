### [2026-09-22] Resolved config read-path is not a writer home

- **Layer**: application
- **Module**: `ws-shared` (`resolve_consumer_root.cjs`), writer scripts (`auto_configure`, `configure_spec_memo`, `detect_specs_dir`)
- **Severity**: High
- **PathPattern**: `.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs, .agents/skills/ws-configure-project/scripts/auto_configure.cjs`
- **Scenario / Context**: While making the hub root relocatable, three writer scripts were pointed at `resolveConsumerContext().configPath` for config writes. That field is a READ path: it falls back to the shipped `config.json.example` when the bootstrap config is absent, so a fresh-tree `--auto` run silently "seeded" nothing and the suite failed with ENOENT on the expected bootstrap file. A separate partial-tree fixture (global runtime copied without its new sibling module) crashed with "Cannot find module".
- **DO NOT**: Use a resolved read-path (with fallback candidates) as a write target; hard-require a shipped sibling module from a helper that partial-tree fixtures copy standalone.
- **INSTEAD DO**: Expose an explicit writer home on the resolved context (`localConfig`: fixed bootstrap `.ws/config.json`, or the explicit-env hub when set) and route all config creates/updates through it; make sibling-module loads degrade to pre-change default behavior when the sibling is absent (corrupt installs are already flagged by integrity `--check`).
