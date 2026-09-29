---
id: 455
slug: us-455
title: add a simple skill to show version and directory of the skill file
source: github
specDate: 2026-09-29
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/455"
labels: []
step: 0
workflowId: us-455
status: completed
startedAt: "2026-09-29T12:51:03.958Z"
endedAt: "2026-09-29T12:51:03.958Z"
acRefs: []
---
# Specification — add a simple skill to show version and directory of the skill file

**State:** open

## Description

Add a packaged skill `ws-version` invoked as `/ws-version`. It reports, with no extra reasoning steps, which skill tree the running copy came from and which package version that tree carries.

Version is no longer copied into each `SKILL.md`. The canonical values live in `.agents/skills/ws-shared/version.json` (`packageVersion` aligned with root `package.json`). The skill must read that file from the skills root it actually loaded, then say whether that root is the machine-wide install (`$HOME/.agents/skills`, or `WORKFLOW_SKILLS_GLOBAL_DIR` when set) or the project-local install (`{repo}/.agents/skills`).

It also reads the project hub `.ws/config.json` (when present) and prints the resolved path tokens the hub already defines (`skillsRoot`, `sharedDir`, and `plans.dir` / `plans.specsDir` when set). Missing config is a reported gap, not a crash and not an invented path.

The skill body stays agent-neutral: no IDE product names, Node-only helpers if a script is required, and registration in `bin/skill-dependencies.json` plus the task router so install and catalog stay consistent with other utility skills.

## Acceptance Criteria

- AC1: Invoking `/ws-version` prints the absolute directory of the `ws-version` skill folder that was loaded, and labels the install scope as `global` when that directory is under the global skills root, otherwise `project-local`.
- AC2: The same reply prints `packageVersion` read from `{loadedSkillsRoot}/ws-shared/version.json`. When that file is missing or is not valid JSON, the reply says version is unavailable and still prints the skill directory (non-zero helper exit is surfaced; the skill does not invent a version).
- AC3: When `$PWD/.ws/config.json` exists and parses, the reply includes `pathTokens.skillsRoot`, `pathTokens.sharedDir`, `plans.dir`, and `plans.specsDir` as stored (brace tokens not expanded into a second root). When `.ws/config.json` is missing or invalid JSON, the reply says project config is unavailable and still prints scope, directory, and version from AC1–AC2.
- AC4: `ws-version` is a skill package under `.agents/skills/ws-version/` with `SKILL.md`, is listed in `bin/skill-dependencies.json`, and is reachable from the task router. A harness check of the new skill id does not report a missing dependency edge.
- AC5: Output stays short (one screen of facts: scope, skill directory, version, token paths, config status). It does not start a workflow, write files, or prompt for confirmation.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing the version bump or `version.json` write path | Issue only needs a reader of the existing single version file |
| Comparing global vs project copies field-by-field | Detection is which tree this invocation loaded, plus that tree's version |
| IDE-specific status bars or product commands | Skills stay host-neutral |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Skill id and invoke name | `ws-version` via `/ws-version` | Matches the issue command and `ws-*` package naming | y |
| Version file | `{skillsRoot}/ws-shared/version.json` field `packageVersion` | That file is the shared package version after per-skill hardcoding was removed | y |
| Scope rule | Directory under global skills root → `global`; otherwise `project-local` | Matches install scopes already used by the installer | y |
| Input validation, auth, concurrency, data lifecycle, idempotency | N/A because this is a read-only local report with no user payload, network call, or stored state | Those dimensions do not apply to a one-shot status print | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | One read-only skill; no installer or bump changes | Spec Out of Scope table |
| Atomic criteria | AC1–AC5 each have a pass/fail observation | Authoring validator + later implementation check |
| Failure modes | Missing `version.json` and missing/invalid `.ws/config.json` stay non-fatal and explicit | AC2 and AC3 |
| Stack invariant | Packaged helper, if any, is Node (`.cjs`) and is launched with `node`; no Python | `ws-check-harness` skill-script runtime rule |
| Observation telemetry | Named read of `version.json` and `.ws/config.json` | Validation notes below |
| Open blockers | None | Prior-work sweep found no open PR for issue 455 |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Skill reply text contains scope, absolute skill directory, and `packageVersion` (or an explicit unavailable line).
- `node -e` (or the skill helper) reading `.agents/skills/ws-shared/version.json` matches the printed version when the loaded root is this repo.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` on this spec exits 0 before register.

### Negative & Failing Test Scenarios

- Point the version read at a skills root with no `ws-shared/version.json`: reply must not print a guessed version and must still print the skill directory.
- Pass a `.ws/config.json` that is not JSON: reply reports config unavailable and still prints scope and version.
- A helper implemented as `.py`, or a skill body that names a specific IDE, fails the harness portability / Node-only checks.

## Original Issue Context

Due to on how now we bump version (previously the version was hardcoded in each skill.md file, now it is just one file version.json and package.json etc) we need to quickly detect if I am running a global skill installation and version or local project install and version.

`/ws-version` will quickly detecth version.json and show the file directory
$HOME/.agents/skills or {localProjectDirectory}/.agents/skills/ or whatever where from it is running.
More useful info can be  showed like token paths, just fastest info possible with low reasoning. Of course we need to parse config.json so info is correctly exhbited.

### Prior Work Sweep

No open pull request references issue 455. Keyword search returned only merged or closed pull requests (installer global-home work such as #174, version bumps, unrelated skill features). None implement `/ws-version`. Design-intent history skip: this is a new skill, not a behavior restore.

## Notes

Lookup: version lives in `.agents/skills/ws-shared/version.json`. `bin/skill-dependencies.json` has no `ws-version` entry yet. Stack file is the Node 22 skill package (`config.json` `stack.id` `node-skills-package`). MEMORY had no trap that changes this report.
