### [2026-09-21] Never call toRepoRelative without allowOutside on audit paths

- **Layer**: Tests / Workflow harness
- **Module**: ws-check-harness Phase 5a gate `check_duplicates.cjs`
- **Severity**: High
- **PathPattern**: `.agents/skills/ws-check-harness/scripts/check_duplicates.cjs`
- **Scenario / Context**: After the round-3 change made `check_duplicates.cjs` audit the resolved skills root, a global-only consumer (no project-local `.agents/skills`) has `context.skillsRoot` outside the repository. `shippedMarkdown` converted every traversed path with `toRepoRelative(context.repoRoot, full)` (no `allowOutside`), and `toRepoRelative` throws `Path is outside repository` for outside paths, so the gate aborted before producing any report — the advertised global-install audit was broken (PR #377 review thread, score 8).
- **DO NOT**: Call `toRepoRelative(repoRoot, path)` on a path that can be outside the repository (global skills root, `WORKFLOW_SKILLS_SHARED_DIR` override). Do not "fix" it with `allowOutside: true` alone: that overload collapses an outside path to its basename, which merges distinct files and breaks resolvability.
- **INSTEAD DO**: Use a local non-throwing display helper `displayPath(repoRoot, value)` = `path.relative(resolve(repoRoot), resolve(value))` normalized to `/` (never throws; keeps `..`- or cross-drive absolute form). Resolve it back with `path.resolve(repoRoot, display)` in the reader, and keep occurrence paths resolvable. Cover with a fixture that installs two skills only under `WORKFLOW_SKILLS_GLOBAL_DIR` and asserts the duplicate is reported without throwing. Related: `2026-09-21-skills-root-package-membership.md`.
