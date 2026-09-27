---
id: 217
slug: us-217
title: "ws-spec-to-pr Step 4/6 subagents do not consult frontend.md/backend.md (MEMORY consult is also weakly enforced)"
source: github
specDate: "2026-08-19"
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/217"
labels:
  - bug
---

# Feature Specification: Pattern and MEMORY Consult Enforcement for Subagents (US 217)

## Description

In `ws-spec-to-pr` and `ws-spec-to-pr-lite`, subagents executing Step 1 (planning), Step 4 (implementation), and Step 6 (code review) do not systematically consult `{sharedDir}/frontend.md`, `{sharedDir}/backend.md`, or `{sharedDir}/MEMORY.md` before designing and implementing changes. As a result, code written by subagents frequently misses project-specific architectural and UI conventions (e.g., toolbar layouts, framework idioms, i18n rules, and learned anti-patterns).

This feature establishes an explicit, verifiable protocol for pattern and memory consultation across the planning, implementation, and review pipeline:
1. **Subagent Base Prompt Prefix**: Injects mandatory instructions into the subagent dispatch template in `PROTOCOLS.md` and `ws-spec-to-pr-lite` requiring subagents to inspect `config.json.defaults.patternsFrontend` / `patternsBackend` and read the corresponding `{sharedDir}/frontend.md` or `{sharedDir}/backend.md` when touching UI or backend layers.
2. **Subagent Proof in `step-output`**: Extends the `step-output` contract for `ws-implement-tasks` and `ws-write-plan` to require `pattern_consult` (`frontend`, `backend`: `consulted | skipped | n/a`) and `memory_consult` (`keywords`, `hits`) fields.
3. **Memory Conflict Detection**: Wires `ws-spec-to-pr/scripts/check_memory_conflict.py` into the workflow dispatch and verifies robust `{sharedDir}` path resolution across project-local and hybrid install scopes.
4. **Code Review MEMORY & Pattern Sweep**: Updates `ws-code-review` to sweep compiled `MEMORY.md` entries (titles, DO NOT, INSTEAD DO) against the diff path set rather than relying on a non-existent `## Review Patterns` heading, and validates diffs against `frontend.md`/`backend.md` when respective layers are modified.

## Acceptance Criteria

- AC1: `ws-spec-to-pr/PROTOCOLS.md` (Base Prompt Prefix) and `ws-spec-to-pr-lite/SKILL.md` (Inline step instructions) explicitly mandate reading `{sharedDir}/frontend.md` when `defaults.patternsFrontend` is true and UI files are touched, reading `{sharedDir}/backend.md` when `defaults.patternsBackend` is true and backend files are touched, and grepping `{sharedDir}/MEMORY.md` for plan/spec keywords before coding or planning.
- AC2: `ws-implement-tasks/SKILL.md` and `ws-write-plan/SKILL.md` define layer detection rules (`Web`/UI vs `Domain`/`Application`/backend) and document `step-output` schema fields `pattern_consult` (`frontend: consulted|skipped|n/a`, `backend: consulted|skipped|n/a`) and `memory_consult` (`keywords: [...]`, `hits: [...]`).
- AC3: `ws-spec-to-pr/scripts/check_memory_conflict.py` resolves `{sharedDir}` dynamically (using `--shared-dir`, `$PWD/.agents/skills/ws-shared`, or `WORKFLOW_SKILLS_SHARED_DIR`) rather than hardcoding static parent paths, and is documented/wired into Step 1/Step 4 validation in `STEP-DISPATCH.md` and `PROTOCOLS.md`.
- AC4: `ws-code-review/SKILL.md` replaces references to `MEMORY.md → ## Review Patterns` with a sweep of all compiled `MEMORY.md` entries against the pull request diff and plan keywords, reporting confirmed DO NOT violations by severity, and reads `frontend.md`/`backend.md` when matching layers are in the diff.
- AC5: `config.schema.json` and `config.json.example` specify `defaults.patternsFrontend` and `defaults.patternsBackend` boolean toggles with clear descriptions.
- AC6: Automated tests verify prompt dispatch prefixes, `step-output` pattern consult validation, and `check_memory_conflict.py` path resolution under project-local and hybrid install modes.

## Original Issue Context

```markdown
# ws-spec-to-pr Step 4/6 subagents do not consult frontend.md/backend.md (MEMORY consult is also weakly enforced)

Issue URL: https://github.com/jpolvora/workflow-skills/issues/217

## Description / Problem

When running `/ws-spec-to-pr` on a project that has:
- `.agents/skills/ws-shared/frontend.md` (UI patterns, grid conventions, toolbar rules, RxJS destroy idioms)
- `.agents/skills/ws-shared/MEMORY.md` (learned traps, e.g. "always add Back button toolbar to subpages", "use takeUntilDestroyed in effects")
- `config.json` with `defaults.patternsFrontend: true` and `defaults.autoload: true`

The **Step 4 implement-tasks subagents** and **Step 6 code-review subagents** do **not** consult `frontend.md` or `backend.md`, and only consult `MEMORY.md` if the subagent happens to follow a vague "Grep MEMORY" one-liner in the base prompt prefix.

### Concrete Failure Modes

### 1. Subagents are spawned in fresh sessions
The orchestrator session may have loaded `ws-patterns-frontend` or `ws-patterns-backend`, but subagents spawned via `dispatch-agent` get:
- System prompt / tools
- Base prompt prefix (from `ws-spec-to-pr/PROTOCOLS.md`)
- Step-specific instructions

### 2. Base Prompt Prefix has no pattern instruction
In `ws-spec-to-pr/PROTOCOLS.md` (lines 35-50):
- Reads: `config.json`, `tools.md`, `STACK.md`, `MEMORY.md`
- **No mention** of `frontend.md` / `backend.md` / `ws-patterns-*`
- `step-output` schema has no field for pattern consult proof

### 3. `ws-write-plan` same gap
`ws-write-plan/SKILL.md` **Reads:** `config.json`, `tools.md` / `STACK.md`, MEMORY. No `frontend.md`. UI conventions are not baked into `step-01` unless they happen to be in the spec.

### 4. Step 6 MEMORY sweep is a no-op on compiled MEMORY
`ws-code-review/SKILL.md` step 5:
> Sweep known patterns: grep each ID in `MEMORY.md → ## Review Patterns`
Compiled `{sharedDir}/MEMORY.md` (from `self_learning.py --compile`) is a flat list of `### [YYYY-MM-DD] Title` entries. There is **no** `## Review Patterns` section. The sweep never matches consumer traps.

### 5. `check_memory_conflict.py` is dead
`ws-spec-to-pr/scripts/check_memory_conflict.py` exists and documents:
```text
python check_memory_conflict.py <plan_file>
```
It is **not** referenced from `STEP-DISPATCH.md`, Step 1, Step 3, or Step 4.

### 6. Config flag is documentation-only for the pipeline
Consumer `config.json`:
```json
"patternsFrontend": true,
"patternsBackend": true
```
Nothing in `STEP-DISPATCH.md` / `PROTOCOLS.md` / `ws-implement-tasks` branches on these flags.
```
