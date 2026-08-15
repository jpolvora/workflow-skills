### [2026-08-14] ws-doctor skill-folder docs/ vs hybrid skillsRoot
- **Layer**: Infrastructure
- **Module**: ws-doctor / doctor.js resolveCitedPath
- **Severity**: High
- **Scenario / Context**: `--skill` scans on hybrid/global installs; `isCitingFromPublishedSkillFolder` compared `path.relative(projectRoot, sourceFile)` to the project-relative `tokenMap.skillsRoot` string. Global `{skillsRoot}` files did not match, so skill-folder `docs/` citations fell back to project-root and false-positive Missing references returned.
- **DO NOT**: Detect published skill folders by matching a project-relative posix path against `tokenMap.skillsRoot` (or `startsWith('docs/')` always project-root).
- **INSTEAD DO**: Compare `sourceFile` to absolute `_abs.skillsRoot` and `_abs.globalSkillsRoot`. Treat markdown `docs/` links as file-relative inside published `ws-*` (not `ws-shared`). For backtick prose `docs/` in skill folders, accept a project-root hit only when the skill companion is absent. Cover with `test/test-ws-doctor.js` fixtures including the trap (project-root file present, skill companion absent).
