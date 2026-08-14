---
slug: ws-doctor-204-205
title: "Fix ws-doctor GitHub issues #204 and #205"
status: "plan to be refined"
workflowType: standard
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/204"
---

# Implementation Plan — ws-doctor-204-205

## 0. Summary & Business Rules

Two `ws-doctor` findings in `jpolvora/workflow-skills`, one real documentation gap and one false-positive path resolution. Ship both in one surgical PR. Tracker origin: [GitHub #204](https://github.com/jpolvora/workflow-skills/issues/204) and [#205](https://github.com/jpolvora/workflow-skills/issues/205). Spec of record is local (`source: local`); this plan follows `{us-dir}/step-00-ws-doctor-204-205.spec.md`.

**Objectives**

1. **#204:** Prefix `python` on the two Canonical scripts rows that invoke `register_local_spec.py` with `--source` in `ws-github-provider` and `ws-azure-devops-provider` SKILL.md. Align those recipes with [`tools.md` § Script launchers](../../skills/ws-shared/tools.md).
2. **#205:** In `resolveCitedPath()`, when the citing file lives under a published skill folder (`{skillsRoot}/ws-*/` excluding the hub `ws-shared`), resolve plain relative `docs/...` against the citing file directory. Keep project-root `docs/` for hub and other top-level files.
3. Cover the `docs/` resolution split in `test/test-ws-doctor.js`. `package.json` `tests` already includes that file.

**Business / safety rules**

- Documentation gap only for #204: do **not** change `register_local_spec.py`. Do **not** rewrite other Canonical scripts rows that are bare path citations without args (for example `github-issue-to-spec.py` with no argv).
- Do **not** add doctor auto-fix mode. Do **not** change `tools.md` launcher policy. Do **not** edit `ws-check-harness` phases or create stub companion docs under `ws-check-harness/`.
- Surgical: four files in implement (two SKILL.md, `doctor.js`, `test-ws-doctor.js`). Integrity regenerate is a **ship** concern (same commit as hashed content), not an extra feature in Step 4.
- Stay on `develop` (`branchStrategy: stay`). Never `git add -A`. Never stage `{plansDir}/` before Step 8 (`invariants.commitPlanFilesOnlyAtStep8`).
- SKILL.md line endings: edit the two table cells only (StrReplace). Do not rewrite YAML frontmatter; MEMORY trap — `build-site` CRLF fence slicing.

`config.fable.enabled` + `autoDetectDomain` are on. This work is Node harness / markdown skills, not IaC, K8s, Docker, or DB. **No `ws-fable-domain` adapter.**

`defaults.enableDag` is `false` → later exec is sequential (no parallel DAG), even though dagThresholds would also allow a small serial slice.

## 1. Definition of Ready & Scope

### Confirmed decisions

| Decision | Rationale |
|----------|-----------|
| Edit only the two Canonical scripts **table** rows | Spec AC1/AC2 name those rows. Spec path-rule prose that cites bare `` `register_local_spec.py --source …` `` is not a managed-script path (`isManagedScriptCitation` requires `{skillsRoot}` or `ws-*/scripts/`); leave it. |
| `python` launcher prefix, keep the rest of the cell | Doctor flags command-like backticks (`path` + args, no `python`/`node`/`bash` first token). Prefix is the minimum fix. |
| Skill-folder `docs/` = file-relative via `path.dirname(sourceFile)` | Spec wording. Do not invent skill-root resolution for nested files. |
| Exclude `ws-shared` from the skill-folder exception | Hub files under `{skillsRoot}/ws-shared/` must keep project-root `docs/`. Match `listSkillDirs` (already skips `ws-shared`). Repo-root `AGENTS.md` is not under a skill folder. |
| Do not export `resolveCitedPath` / add a `main` guard | `doctor.js` always runs `main()` on load. Existing tests drive the CLI. Fixture + `--json` `missingReferences` / `pathErrors` `expanded` is enough. |
| Fixture tests for AC4/AC5/AC7; live smoke for AC3/AC6 | Live `ws-spec-to-pr/docs/faq.md` exists. Live `ws-check-harness` has **no** `docs/` companions today; AC7 is conditional on those files existing — prove with tmp fixtures, do not add stubs to the skill. |
| Integrity at Step 8 | Hashed paths include the two SKILL.md files and `doctor.js`. `npm run generate-integrity && npm run verify-integrity` in the same ship commit. |

### Assumptions (stated)

- Canonical scripts cells today (exact strings to replace):
  - GitHub: `` `{skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source github` ``
  - Azure DevOps: `` `{skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source azure-devops` ``
- Target cells:
  - `` `python {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source github` ``
  - `` `python {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source azure-devops` ``
- Other Canonical scripts rows (`github-issue-to-spec.py`, `ado-workitem-to-spec.py`, `fetch_threads.cjs`, `resolve_thread.cjs`, `fix_pr_azure_context.py`) stay unchanged.
- `resolveCitedPath` special-case prefixes other than `docs/` (`.agents/`, `AGENTS.md`, `README.md`, `bin/`, `specs/`, `test/`, `ws-*`) stay as they are.
- Live `--skill ws-check-harness` may still list `docs/specs/`, `docs/testing/`, `docs/faq.md` **if those files are absent**. That is a true missing companion after file-relative resolve, not the #205 project-root false positive. AC7 passes when fixtures create the companions.

### Acceptance Criteria (measurable)

| AC | Criterion | Plan step | §5 test |
|----|-----------|-----------|---------|
| AC1 | GitHub Canonical scripts “Spec of record → workflow copy” row is `python {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source github` | A | `testGithubCanonicalRegisterRowHasPythonLauncher` |
| AC2 | Azure DevOps Canonical scripts same row with `--source azure-devops` and `python` prefix | A | `testAzureCanonicalRegisterRowHasPythonLauncher` |
| AC3 | `node …/doctor.js --skill ws-github-provider` and `--skill ws-azure-devops-provider` do not list those `register_local_spec.py --source` rows under Missing launchers | A (live), C | `testProviderRegisterRowsNotMissingLaunchers` |
| AC4 | Skill-folder markdown citing `docs/faq.md` resolves to `{skillsRoot}/ws-spec-to-pr/docs/faq.md` (file-relative), not `{projectRoot}/docs/faq.md` | B, C | `testSkillFolderDocsFileRelative` (+ trap `testSkillFolderDocsDoesNotUseProjectRoot`) |
| AC5 | Hub / repo-root file citing `docs/...` still resolves against project root | B, C | `testHubDocsStaysProjectRoot` |
| AC6 | `doctor.js --skill ws-spec-to-pr` does not report `docs/faq.md` as Missing reference / Path error when `.agents/skills/ws-spec-to-pr/docs/faq.md` exists | B (live), C | `testLiveSpecToPrDocsFaqNotMissing` |
| AC7 | `doctor.js --skill ws-check-harness` does not report skill-relative `docs/specs/`, `docs/testing/`, or `docs/faq.md` when those companions exist under that skill | B, C | `testSkillFolderDocsCompanionsWhenPresent` |
| AC8 | `test/test-ws-doctor.js` covers skill-folder file-relative `docs/` and hub/top-level project-root `docs/`; `npm run test` includes that file and exits 0 | C | file already on `package.json` `tests` / `tests:remote`; new cases above |

### Out of scope

- Auto-fix / apply mode in `ws-doctor`.
- Rewriting other Canonical scripts rows that are path citations without args.
- Changing `register_local_spec.py`, `tools.md` launcher policy, or `ws-check-harness` PHASES.md.
- Creating `ws-check-harness/docs/**` stubs so a live scan goes quiet.
- Exporting `resolveCitedPath`, adding a `main` guard, or new test files.
- Integrity regenerate during Step 4 (ship Step 8). Website bump / version only if ship checklist requires it for hashed skill content.
- Closing GitHub #204 / #205 before the implementing PR merges.

## 2. Technical Design & Architecture

### Layers (from `config.json`)

| Layer | Path | Edits |
|-------|------|-------|
| skills-sot | `.agents/skills` | `ws-github-provider/SKILL.md`, `ws-azure-devops-provider/SKILL.md` (one Canonical scripts cell each); `ws-doctor/scripts/doctor.js` (`resolveCitedPath` + small helper) |
| tests | `test/` | Extend `test/test-ws-doctor.js` only. `package.json` scripts chain already runs it |
| installer-cli | `bin` | No logic this feature. `bin/skill-integrity.json` regenerates at **ship** when hashed skill content changes |

No frontend, database, i18n, or tenancy layers (`stack.id`: `node-skills-package`).

### Defect 1 — missing `python` launcher (#204 → AC1–AC3)

Doctor `scanPathAndRefs` treats a backtick as a managed-script **command** when `isManagedScriptCitation` is true **and** the trimmed value has whitespace **and** does not start with `python`/`node`/`bash`. The two Canonical scripts cells match that rule. Bare path cells without args do not (`/\s/.test` is false after trim of the path token).

**Fix:** prefix `python ` inside those two backticks only.

Doctor then strips the launcher before resolving the script path (`replace(/^(python\|node\|bash)\s+/i, '')`), so the existing `register_local_spec.py` file continues to resolve. Do not touch the Python script.

### Defect 2 — `docs/` special-case wins before file-relative (#205 → AC4–AC7)

Today `resolveCitedPath` (~lines 344–363):

```javascript
} else if (
  candidate.startsWith('.agents/') ||
  candidate.startsWith('AGENTS.md') ||
  candidate.startsWith('README.md') ||
  candidate.startsWith('bin/') ||
  candidate.startsWith('docs/') ||  // always project-root
  candidate.startsWith('specs/') ||
  candidate.startsWith('test/') ||
  /^ws-[a-z0-9-]+(\/|$)/i.test(candidate)
) {
  abs = path.resolve(projectRoot, candidate);
} else if (hadToken) {
  abs = path.resolve(projectRoot, candidate);
} else {
  abs = path.resolve(path.dirname(sourceFile), candidate);
}
```

That is correct for hub/top-level files. It is wrong for skill companions:

- `.agents/skills/ws-spec-to-pr/README.md` → `docs/faq.md` exists at `.agents/skills/ws-spec-to-pr/docs/faq.md`
- `.agents/skills/ws-check-harness/PHASES.md` cites `docs/specs/`, `docs/testing/`, `docs/faq.md` as skill-relative (companions may or may not exist on disk)

**Fix:** add a helper used only in this branch:

```javascript
function isCitingFromPublishedSkillFolder(sourceFile, projectRoot, tokenMap) {
  const rel = toPosix(path.relative(projectRoot, sourceFile));
  const root = toPosix(tokenMap.skillsRoot).replace(/\/+$/, '');
  const m = rel.match(new RegExp(`^${escapeRegExp(root)}/(ws-[^/]+)/`));
  return Boolean(m && m[1] !== 'ws-shared');
}
```

Then treat `docs/` as project-root **only when not** citing from a published skill folder:

```javascript
(candidate.startsWith('docs/') && !isCitingFromPublishedSkillFolder(sourceFile, projectRoot, tokenMap))
```

Skill-folder `docs/...` then falls through to the existing file-relative branch (`path.dirname(sourceFile)`).

Do not change other prefixes. Do not resolve `docs/` against skill root when the citing file is nested (spec: citing file directory).

**Hub preservation (AC5):** `scanPathAndRefs` for hub files uses repo-root `AGENTS.md` and `{sharedDir}` markdown (`AGENTS.md`, `tools.md`, `autoload.md`, `gates.md`, `setup.md`). None of those match `isCitingFromPublishedSkillFolder` (`ws-shared` excluded; repo-root not under `ws-*/`). Their `docs/` citations stay `path.resolve(projectRoot, candidate)`.

### Tests (AC8)

Keep the existing smoke helpers (`run`, `mkTmp`, `--json` parse, read-only assertions). Add focused cases; do not replace AC2–AC7 smoke.

UTF-8: `encoding: 'utf8'` already on `spawnSync`. Windows: `\r?\n`-aware string checks if matching SKILL.md cells. Do not wrap doctor stdout in a non-ASCII sanitizer (MEMORY: `asciiSafe`).

## 3. Step-by-Step Plan

`enableDag: false` → execute A → B → C in order. One implementer. No file overlap.

### Step A — Prefix Canonical scripts launchers (AC1, AC2, AC3)

**Action:** In `.agents/skills/ws-github-provider/SKILL.md` Canonical scripts table, change only the “Spec of record → workflow copy” cell to start with `python `. Same one-cell change in `.agents/skills/ws-azure-devops-provider/SKILL.md` with `--source azure-devops`. Leave every other table row and the Spec path-rule paragraph unchanged.

**Affected files:**

- `.agents/skills/ws-github-provider/SKILL.md`
- `.agents/skills/ws-azure-devops-provider/SKILL.md`

**Engineering checks:**

- Diff is two lines (plus CRLF-safe match). No frontmatter rewrite.
- Live: `node .agents/skills/ws-doctor/scripts/doctor.js --skill ws-github-provider` and `--skill ws-azure-devops-provider` — Missing launchers must not include `register_local_spec.py --source github` / `--source azure-devops`.
- Confirm other Canonical rows still lack a launcher **and** still have no args (still valid path citations).

### Step B — File-relative `docs/` inside published skill folders (AC4, AC5, AC6, AC7)

**Action:** In `.agents/skills/ws-doctor/scripts/doctor.js`, add `isCitingFromPublishedSkillFolder` (and a tiny `escapeRegExp` if not already present). Gate the `candidate.startsWith('docs/')` project-root special-case on `!isCitingFromPublishedSkillFolder(...)`. Do not export the helper. Do not add `--fix`. Do not change `asciiSafe` / markdown formatters.

**Affected files:**

- `.agents/skills/ws-doctor/scripts/doctor.js`

**Engineering checks:**

- `node --check .agents/skills/ws-doctor/scripts/doctor.js` exits 0.
- Live: `node .agents/skills/ws-doctor/scripts/doctor.js --json --skill ws-spec-to-pr` — no `missingReferences` / `pathErrors` entry whose `cited` is `docs/faq.md` (file exists at `.agents/skills/ws-spec-to-pr/docs/faq.md`).
- Live `--skill ws-check-harness`: if `docs/faq.md` still appears, `expanded` must be skill-relative (`.agents/skills/ws-check-harness/docs/faq.md`), not repo-root `docs/faq.md`. Do not create those files to silence the report.

### Step C — Regression tests (AC8; maps AC1–AC7)

**Action:** Extend `test/test-ws-doctor.js` with the cases in §5. Wire them in `main()` after the existing smokes. Do **not** add a new test file or change `package.json` (already lists `test/test-ws-doctor.js` on `tests` and `tests:remote`).

**Affected files:**

- `test/test-ws-doctor.js`

**Engineering checks:**

- `node test/test-ws-doctor.js` exits 0.
- `npm run test` includes that file and exits 0 (full suite at Step 7 / ship).
- Fixture trees cleaned in existing `cleanup()`.

## 4. Permissions, Tenancy & i18n

Not applicable. `stack.frontend` is none; `database.type` is none; `invariants` EF/tenancy flags are false. No RBAC, tenant isolation, or i18n keys. Doctor remains read-only (stdout/stderr only).

## 5. Test Coverage

| AC | Test case / method | How it proves it |
|----|--------------------|------------------|
| AC1 | `testGithubCanonicalRegisterRowHasPythonLauncher` | Read `.agents/skills/ws-github-provider/SKILL.md`; Canonical scripts row contains exact `` `python {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source github` ``. Assert the old unprefixed cell is absent. |
| AC2 | `testAzureCanonicalRegisterRowHasPythonLauncher` | Same for azure-devops SKILL.md and `--source azure-devops`. |
| AC3 | `testProviderRegisterRowsNotMissingLaunchers` | `doctor.js --json --skill ws-github-provider` and `--skill ws-azure-devops-provider`. `sections.toolScriptDiagnostics.missingLaunchers` has no `cited` matching `register_local_spec.py --source (github\|azure-devops)`. |
| AC4 | `testSkillFolderDocsFileRelative` | Tmp project: `{skillsRoot}/ws-fixture/README.md` markdown-links `docs/faq.md`; create **only** `{skillsRoot}/ws-fixture/docs/faq.md`. `--json --skill ws-fixture` → no missingRef/pathError for `docs/faq.md`. |
| AC4 (trap) | `testSkillFolderDocsDoesNotUseProjectRoot` | Tmp project: skill README cites `docs/faq.md`; create **only** `{projectRoot}/docs/faq.md`. Must **report** missing (skill-relative path absent). Distinguishes old project-root special-case. |
| AC5 | `testHubDocsStaysProjectRoot` | Tmp project: hub `{sharedDir}/AGENTS.md` (or repo-root `AGENTS.md` if the scan includes it without `--skill`) cites `docs/catalog.md`; create **only** `{projectRoot}/docs/catalog.md`. Full diagnose (no `--skill`, so hub files are scanned) → no missingRef for that cite. Skill-folder files must not be required. |
| AC6 | `testLiveSpecToPrDocsFaqNotMissing` | Against this repo: `--json --skill ws-spec-to-pr`. No finding with `cited` `docs/faq.md` while `.agents/skills/ws-spec-to-pr/docs/faq.md` exists. |
| AC7 | `testSkillFolderDocsCompanionsWhenPresent` | Tmp skill `ws-check-harness` (or `ws-fixture`) PHASES-style markdown citing `docs/specs/`, `docs/testing/`, `docs/faq.md`; create those companions under the skill. `--json --skill …` does not list them as missingRef/pathError. |
| AC8 | `package.json` `tests` / `tests:remote` | Already `&& node test/test-ws-doctor.js`. No script edit unless a regression removes it. `npm run test` exit 0 at Step 7 / ship. |

Fixture doctor copies: follow `testMissingConfigDoesNotInventValues` (local `package.json` `"type": "module"` next to copied `doctor.js` so Node treats it as ESM).

## 6. Invariants (Do Not Violate)

From `config.json.invariants` and repo harness:

| Invariant | How this plan honors it |
|-----------|-------------------------|
| `commitPlanFilesOnlyAtStep8: true` | Do not `git add` `{plansDir}/` in Steps 0–7. Delivery commit at Step 8 may include the refined plan per `defaults.deliveryCommitArtifacts`. |
| `entitiesAreClassNotRecord` / EF / tenancy flags | Unused (all false). Do not introduce EF, tenancy filters, or handwritten migrations. |
| `skipQualityGates: false` | Run doctor smokes and `test/test-ws-doctor.js` in implement; full `npm run test` before ship. |
| Surgical scope | No drive-by SKILL.md rewrites, no formatter/asciiSafe changes, no new CLI flags. |
| Managed scripts | Explicit `python` / `node` / `bash` only. Do not rewrite `register_local_spec.py`. |
| MEMORY: never `git add -A` | Stage explicit hashed paths at ship. |
| MEMORY: SKILL.md CRLF | Cell-level StrReplace; keep `.gitattributes` `eol=lf`; do not reslice frontmatter. |
| MEMORY: integrity after SoT edits | `generate-integrity` + `verify-integrity` at ship, not a fake Step 4 “feature”. |
| Portability | No host product names in skill edits. Launcher vocabulary stays `python`/`node`/`bash`. |

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot + tests only; installer-cli integrity at ship).
- [ ] Domain entities and mappings encapsulated — N/A (no domain model).
- [ ] Schema migrations created — N/A.
- [ ] Authorization checks applied — N/A (read-only doctor).
- [ ] i18n keys declared — N/A.
- [ ] Test cases cover all ACs (AC1–AC8 in `test/test-ws-doctor.js`; live doctor smokes AC3/AC6).
- [ ] Other Canonical scripts rows without args unchanged; `register_local_spec.py` unchanged.
- [ ] `docs/` project-root special-case still applies to hub / repo-root citers; `ws-shared` excluded from the skill-folder exception.
- [ ] **Ship-step (not implement):** `npm run generate-integrity && npm run verify-integrity` in the same commit as hashed skill content. `npm run test` (or `npm run tests`) exit 0. Close GitHub #204 and #205 when that PR merges.

## 8. Open Questions

None. autoMode; assumptions in §1 are sufficient to implement without `needs_user`.
