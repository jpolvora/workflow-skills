---
id: 457
slug: us-457
title: Resolve missing local skills from the global install; do not junction them into the repo
source: github
specDate: 2026-09-29
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/457"
labels: []
step: 0
workflowId: us-457
status: completed
startedAt: "2026-09-29T13:30:55.936Z"
endedAt: "2026-09-29T13:30:55.936Z"
acRefs: []
---
# Specification — Resolve missing local skills from the global install; do not junction them into the repo

## Description

Hybrid installs keep skill bodies under `{globalSkillsRoot}` (`$HOME/.agents/skills` or `WORKFLOW_SKILLS_GLOBAL_DIR`) while the consumer repo supplies `$PWD/.ws/config.json`. Config fields such as `rules.seniorDeveloper` and `rules.karpathyGuidelines` may still store repo-relative paths (for example `.agents/skills/ws-senior-developer/SKILL.md`).

When that path is absent on disk, resolution must read the matching file under `{globalSkillsRoot}` directly. The session must not create a directory junction, symlink, or copy inside the consumer tree so the repo-relative string exists. Those links make `git status` and the editor treat the global skill tree as untracked project files and can be committed by mistake.

Resolution order for a missing local skill path: project path first when the file exists, otherwise the same relative path under `{globalSkillsRoot}`. Config strings stay repo-relative. Skills that are real product files (`ws-memo`, `ws-session-tracking`, consumer hub files under `.ws/`) stay ordinary directories. Global-only bodies (`ws-senior-developer`, spec providers, `ws-shared/runtime` when not installed locally) stay only under the global skills root.

Installer projection of skills onto secondary global host targets (`--symlink` / `--no-symlink` under the user home) is a different mechanism and is unchanged.

## Acceptance Criteria

- AC1: When a repo-relative skill path in `.ws/config.json` is missing under the project and the same relative path exists under `{globalSkillsRoot}`, the loader reads that global file and does not create a junction, symlink, or copy under the consumer repo.
- AC2: After that resolution, `git status` in the consumer repo does not list the resolved global skill directory as an untracked or new path.
- AC3: When the project-local path exists as a real directory (not a link), the loader uses that local path and does not replace it with the global tree.
- AC4: A missing path under both the project and `{globalSkillsRoot}` fails closed with a named missing-skill error and still creates no junction, symlink, or copy.
- AC5: Packaged skills that belong in the product tree remain ordinary files or directories; this change does not delete or rewrite them.
- AC6: Path resolution rejects traversal and absolute escapes when joining a repo-relative config path onto `{globalSkillsRoot}` (containment check before read).

## Original Issue Context

## Problem

When a repo-relative skill path in `.ws/config.json` is missing under the project (hybrid install: bodies live in `$HOME/.agents/skills`), a session created **directory junctions** inside the product tree so those paths would exist on disk:

- `.agents/skills/ws-senior-developer` → `~/.agents/skills/ws-senior-developer` (`rules.seniorDeveloper` and `rules.karpathyGuidelines`)
- `.agents/skills/ws-spec-provider-github`
- `.agents/skills/ws-spec-provider-azure-devops`
- `.agents/skills/ws-shared/runtime`

Observed 2026-09-29 in `spec-memo` while running `/ws-spec-from-provider`. The editor and `git status` then treat the global skill trees as untracked project files. Junctions are not a copy, but they still pollute the working tree and can be committed by mistake.

## Expected

Do not create junctions, symlinks, or copies of global skills inside the consumer repo.

Resolve the skill by reading the global install directly when the project-local path is absent (same hybrid rule as autoload: local path first, then `{globalSkillsRoot}`). Config strings can stay repo-relative; the resolver should fall through to the global tree instead of materializing a link so the string exists on disk.

## Notes

- Packaged skills that belong in the product (`ws-memo`, `ws-session-tracking`, consumer `ws-shared` files) stay real project files.
- Global-only skills (`ws-senior-developer`, spec providers, `ws-shared/runtime`) must stay only under the global skills root.

### Prior Work Sweep

- No open pull request for issue 457.
- Related merged PRs from keyword search `junction global skills missing` (not the same defect): [#335](https://github.com/jpolvora/workflow-skills/pull/335) (declarative gemini/antigravity skills.json), [#336](https://github.com/jpolvora/workflow-skills/pull/336) (pipeline guardrails). No commits matched the sweep file filter.
- Installer `--symlink` junctions in `bin/cli.js` target secondary global host folders, not the consumer repo.

### Design Intent

No packaged script in this repo creates consumer-repo junctions to fill missing `rules.*` skill paths. `bin/cli.js` junctions are intentional only for secondary global host targets. The observed consumer-tree junctions are accidental session behavior, not a designed installer feature. The fix is resolver fallthrough, not a new link type.

## Notes

Stack: Node 22 skill package. Touch the skill-path resolver used when `rules.*` or equivalent repo-relative skill paths are missing. Do not change global-install `--symlink` behavior.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing installer `--symlink` / `--no-symlink` for secondary global host targets | Those links live under the user home, not the consumer repo |
| Rewriting `config.json` skill paths to absolute global paths | Config strings stay repo-relative; resolution falls through |
| Deleting real project-local skill directories | Product files that belong in the repo stay |
| Auto-removing junctions an earlier session already created | Cleanup of existing links is a separate operator step |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Input bounds, auth, concurrency, data lifecycle, idempotency, and external rate limits | N/A because this is a local filesystem path fallthrough with no network write, no multi-user state, and no retry queue | Absent dimensions stay out of ACs | y |
| Existing junctions already on disk | Leave them; do not create new ones | Removal can delete a link the operator still wants; creation is the defect | y |
| `{globalSkillsRoot}` | `$HOME/.agents/skills` unless `WORKFLOW_SKILLS_GLOBAL_DIR` is set | Matches the published hybrid install contract | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only missing local skill-path resolution; no installer symlink redesign | Spec Out of Scope table |
| Atomic criteria | AC1–AC6 each have a pass/fail observation | Review AC list |
| Failure modes | Missing global file and path escape fail closed with no link created | AC4 and AC6 |
| Stack invariants | Node path containment: no traversal or absolute escape when joining onto `{globalSkillsRoot}`; no floating promises in the resolver | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` on the touched files |
| Observability | Resolver reports which root satisfied the path (local or global) without printing secrets | Log or return field in the resolver result |
| Blockers | None | N/A because issue text and hybrid rule are sufficient |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `git status --porcelain` in a fixture consumer repo stays empty after resolving a missing `rules.seniorDeveloper` path against a fake global skills root.
- Resolver result names `root: global` when the local path is absent and `root: local` when the project file exists.
- `npm run test` for the resolver fixture exits 0.

### Negative & Failing Test Scenarios

- Negative 1: Local skill path missing and global path missing → error names the missing skill and the consumer tree gains no junction, symlink, or copy.
- Negative 2: Config path `../outside` or an absolute path joined onto `{globalSkillsRoot}` is rejected and no link is created (path traversal invariant).
- Negative 3: Creating a junction so the repo-relative path exists is a failing outcome even when the global `SKILL.md` is readable through that junction.
