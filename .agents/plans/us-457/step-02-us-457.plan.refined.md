---
step: 2
slug: us-457
workflowId: us-457-20260929T134533Z
status: completed
title: Resolve missing local skill paths from the global install without junctions
startedAt: "2026-09-29T13:49:24.514Z"
endedAt: "2026-09-29T13:49:24.514Z"
acRefs: []
---
## 0. Summary

Interview confirmed: when a repo-relative skill path from `.ws/config.json` is missing under the project, resolve it by reading `{globalSkillsRoot}` directly. Never create a junction, symlink, or copy inside the consumer repo.

## 1. Scope

In scope: a Node helper under `.agents/skills/ws-shared/runtime/scripts/resolve_skill_path.cjs`, a short contract note in `.agents/skills/ws-shared/runtime/tools.md`, and `test/test-resolve-skill-path.js`.

Out of scope: installer `--symlink` for secondary global host targets, rewriting config strings to absolute paths, deleting existing junctions.

## 2. Design

Add `resolveSkillFile(repoRoot, repoRelativePath, options)`:

1. Reject absolute paths and any `..` segment before join (AC6).
2. If the project path exists and `fs.lstat` says it is not a symbolic link, return `{ root: "local", path }` (AC3).
3. If the project path is missing, map the same relative path under `WORKFLOW_SKILLS_GLOBAL_DIR` or `$HOME/.agents/skills`, require the resolved path to stay inside that root, and return `{ root: "global", path }` when the file exists (AC1, AC2).
4. If neither exists, throw an error that names the missing skill path and create nothing (AC4).
5. The helper must not call `symlink`, `link`, or `cp`. Existing product directories are only read (AC5).

## 3. Steps

1. Implement the helper in `.agents/skills/ws-shared/runtime/scripts/resolve_skill_path.cjs` for AC1, AC3, AC4, AC6.
2. Document the no-junction rule in `.agents/skills/ws-shared/runtime/tools.md` for AC2 and AC5.
3. Add `test/test-resolve-skill-path.js` covering local hit, global fallthrough, missing both, traversal, and a spy that the tree gains no link. Tests: V1:local-hit, V2:global-fallthrough, V3:missing, V4:traversal.

## 4. Verification

- `node --check .agents/skills/ws-shared/runtime/scripts/resolve_skill_path.cjs`
- `node test/test-resolve-skill-path.js`
- `npm run test` at ship time

## 6. Stack invariants

Path containment before read. No floating promises. No junctions. AC6 is the traversal negative.
