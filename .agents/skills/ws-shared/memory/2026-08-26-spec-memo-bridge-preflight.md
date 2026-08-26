### [2026-08-26] spec-memo vault bridge CLI and preflight gates

- **Layer**: skills / ws-spec-memo
- **Module**: check_spec_memo / configure_spec_memo / tools.md
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-spec-memo/**` | `.agents/skills/ws-shared/tools.md`
- **Scenario / Context**: PR #242 agentic review. Bare `memo` in tools.md broke npx-only vault clients; preflight exit 1 with vault disabled broke Recommended default path; `--stdin-json` was documented without the flag.
- **DO NOT**: Hardcode `memo` in bridge aliases; fail check when `specMemo.enabled` is not true; pipe choices.json without `--stdin-json`; treat seeded empty MEMORY.md as pollution.
- **INSTEAD DO**: Use `{specMemo.cli}` everywhere; exit 0 when vault off; require CLI/doctor only when enabled; fail malformed stdin-json; flag MEMORY pollution only when compiled trap headers exist.
