### [2026-09-21] Lexical path containment must be re-verified on realpaths before writes

- **Layer**: `Infrastructure`
- **Module**: `ws-patterns-generator seed script`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-patterns-generator/scripts/seed_generated_skill.cjs`
- **Scenario / Context**: The seed script gated writes with `path.resolve` + `startsWith` prefix checks only. A consumer `.agents/skills` directory that is a symlink (or junction) to a location outside the repository passes the lexical check while Node writes follow the link, so the generated skill body lands outside the repo. PR review flagged the escape; the fix resolves both roots before comparing.
- **DO NOT**: Trust `path.resolve` + `startsWith` prefix checks as a write-containment guarantee when any path segment can be a symlink or junction; call `fs.realpathSync` directly on a path whose leaf may not exist yet (it throws on ENOENT).
- **INSTEAD DO**: Re-verify containment on resolved real paths before writing: `fs.realpathSync` the verified-existing root, resolve the target root through its deepest existing ancestor (`realpathLoose`: walk up past missing leaves, realpath, rejoin), and require the resolved target to start with the resolved root + separator. Cover with a fixture test that links the skills root outside the repo (junction on win32, dir symlink elsewhere) and asserts refusal plus zero writes outside, and a positive control where an in-repo link still seeds.
