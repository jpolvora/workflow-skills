### [2026-09-25] BOM and PowerShell traps from kanvas-board worker run

- **Layer:** Tests / DevOps
- **Module:** ws-kanvas scripts, test-install, Windows PowerShell sessions
- **Severity:** Medium
- **PathPattern:** .agents/skills/ws-kanvas/**, test/test-*.js
- **Scenario / Context:** Implementing the ws-kanvas board on a Windows checkout: (1) hub config files written by PowerShell (`Set-Content -Encoding utf8`) carry a BOM, so a naive `JSON.parse` of `.ws/config.json` throws and the server silently fell back to defaults (empty board); same for BOM-prefixed `*.spec.md` frontmatter. (2) A literal U+FEFF pasted into source or test code is invisible and fragile — normalize to an explicit `\uFEFF` escape. (3) Standalone `node test/test-install.js --local` without a prior `npm pack` resolves a stale gitignored tarball, rewrites the `test/package.json` tarball ref at the stale version, and fails PATH-sensitive hook stages; the sanctioned `npm run tests` path (pretests packs first) stays green. (4) PowerShell `Start-Job` servers die with the spawning tool call, so start+probe+stop must live in a single call.
- **DO NOT:** Parse consumer JSON configs or spec frontmatter without stripping a leading BOM; commit literal U+FEFF characters; run `test-install.js` standalone without packing first; split a background-server probe across tool calls.
- **INSTEAD DO:** Strip `/^\uFEFF/` (explicit escape, never a pasted char) in every Node config/frontmatter reader; always run install tests via `npm run tests`; revert a test-dirtied `test/package.json` tarball ref with `git checkout`; keep server start, HTTP probe, and stop in one shell invocation.
