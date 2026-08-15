# Execution Plan — ws-doctor-204-205

**execMode:** sequential  
**Reason:** `defaults.enableDag` is `false` (config default) — sequential forced; skip parallel DAG generation. Implementer runs plan steps A → B → C serially.  
**Source plan:** `.agents/plans/ws-doctor-204-205/step-01-ws-doctor-204-205.plan.md`  
**Interview:** skipped (no `step-02-*.plan.refined.md`); Step 1 plan is the source of record.

Sizing metrics are recorded for audit only (not used to choose mode — `enableDag: false` wins even if thresholds would allow parallel):

| Metric | Count | Sequential threshold (`dagThresholds`) | Notes |
|--------|------:|---------------------------------------:|-------|
| Plan steps | 3 (A–C) | 3 (`maxImplementationSteps`) | Within |
| Unique files this feature | 4 | 6 (`maxExpectedFiles`) | Within (integrity regenerate is ship, not implement) |
| Layers | 2 (`skills-sot`, `tests`) | 2 (`maxLayers`) | Within |

## Files in scope

Implementer (Step 4) may touch only:

| File | Role |
|------|------|
| `.agents/skills/ws-github-provider/SKILL.md` | One Canonical scripts cell: prefix `python ` on `register_local_spec.py --source github` |
| `.agents/skills/ws-azure-devops-provider/SKILL.md` | One Canonical scripts cell: prefix `python ` on `register_local_spec.py --source azure-devops` |
| `.agents/skills/ws-doctor/scripts/doctor.js` | `resolveCitedPath` — skill-folder `docs/` is file-relative; hub/`ws-shared` stay project-root |
| `test/test-ws-doctor.js` | Fixture + live cases for AC1–AC8 |

Integrity (`bin/skill-integrity.json`) regenerates at **Step 8 / ship**, not during implement.

## Serial order for the implementer

Execute A → B → C in one sequential pass. Do not spawn parallel task groups. Empty `tasks` / `levels` in the DAG JSON are intentional.

### Step A — Prefix Canonical scripts launchers (AC1, AC2, AC3)

1. In `.agents/skills/ws-github-provider/SKILL.md` Canonical scripts table, change only the “Spec of record → workflow copy” cell to `` `python {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source github` ``.
2. Same one-cell change in `.agents/skills/ws-azure-devops-provider/SKILL.md` with `--source azure-devops`.
3. Leave every other table row and the Spec path-rule paragraph unchanged. Do not rewrite YAML frontmatter. Cell-level StrReplace only (CRLF-safe).

**Check:** live `node .agents/skills/ws-doctor/scripts/doctor.js --skill ws-github-provider` and `--skill ws-azure-devops-provider` — Missing launchers must not include those `register_local_spec.py --source` rows.

### Step B — File-relative `docs/` inside published skill folders (AC4, AC5, AC6, AC7)

1. In `.agents/skills/ws-doctor/scripts/doctor.js`, add `isCitingFromPublishedSkillFolder` (and `escapeRegExp` if missing). Gate `candidate.startsWith('docs/')` project-root special-case on `!isCitingFromPublishedSkillFolder(...)`.
2. Skill-folder `docs/...` falls through to existing file-relative `path.dirname(sourceFile)`. Exclude `ws-shared`. Do not export the helper. Do not add `--fix`.

**Check:** `node --check .agents/skills/ws-doctor/scripts/doctor.js` exits 0. Live `--json --skill ws-spec-to-pr` has no `docs/faq.md` missingRef/pathError.

### Step C — Regression tests (AC8; maps AC1–AC7)

1. Extend `test/test-ws-doctor.js` with the cases in the source plan §5. Wire them in `main()` after existing smokes.
2. Do not add a new test file or change `package.json` (already lists `test/test-ws-doctor.js`).

**Check:** `node test/test-ws-doctor.js` exits 0. Full `npm run test` at Step 7 / ship.

## AC map

| AC | Criterion | Serial step |
|----|-----------|-------------|
| AC1 | GitHub Canonical scripts row has `python` launcher | A |
| AC2 | Azure DevOps Canonical scripts row has `python` launcher | A |
| AC3 | Doctor Missing launchers omit those register rows | A, C |
| AC4 | Skill-folder `docs/` is file-relative | B, C |
| AC5 | Hub / repo-root `docs/` stays project-root | B, C |
| AC6 | Live `ws-spec-to-pr` `docs/faq.md` not missing | B, C |
| AC7 | Skill companions resolve when present under the skill | B, C |
| AC8 | `test/test-ws-doctor.js` covers the split; `npm run test` includes it | C |

## Locked constraints (do not reopen)

- No auto-fix mode. No `register_local_spec.py` edits. No `tools.md` launcher-policy change.
- No `ws-check-harness/docs/**` stubs. No `resolveCitedPath` export / `main` guard.
- Integrity regenerate at ship, not Step 4. Stay on `develop`. Never `git add -A`.

## Handoff

`execMode: sequential` — implementer reads this file plus the Step 1 plan; ignore empty `tasks`/`levels` in the DAG JSON. Next skill: `ws-implement-tasks` (Step 4).
