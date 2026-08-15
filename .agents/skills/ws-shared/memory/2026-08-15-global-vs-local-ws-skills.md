### [2026-08-15] Global vs local ws-* duplicates in this upstream repo
- **Layer**: Infrastructure
- **Module**: AGENTS.md / upstream-dev-harness
- **Severity**: High
- **Scenario / Context**: Agent hosts list the same `ws-*` id from this repo's `.agents/skills` (SoT) and `{globalSkillsRoot}` (`$HOME/.agents/skills`). Treating them as one tree leads to editing the managed global install or following WIP local bodies as if they were the published skill.
- **DO NOT**: `Read` both copies; edit or "fix" `{globalSkillsRoot}/ws-*` from this package root; retarget `pathTokens.skillsRoot` at the global dir; rely on a host/IDE skill-toggle as the contract.
- **INSTEAD DO**: Default invoke `{globalSkillsRoot}/ws-<id>` when it exists (scripts from that same tree). Author / test / review that id → `$PWD/.agents/skills/ws-<id>/` only. Session autoload is root `AGENTS.md` § Upstream session contract. Consumer hybrid (local override + project config) is unchanged.
