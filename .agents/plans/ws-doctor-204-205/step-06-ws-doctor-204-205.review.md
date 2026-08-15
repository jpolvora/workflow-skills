---
slug: ws-doctor-204-205
reviewDate: 2026-08-14
base: main (working tree; uncommitted on develop)
mode: report-only
clean: true
critical: 0
warning: 0
suggestion: 0
autoMode: true
---

# Code Review — ws-doctor-204-205

ws-code-review loaded. First pass is report-only (no product-code edits).

## Review Summary

- **Target:** `.agents/skills/ws-github-provider/SKILL.md`, `.agents/skills/ws-azure-devops-provider/SKILL.md`, `.agents/skills/ws-doctor/scripts/doctor.js`, `test/test-ws-doctor.js`
- **Plan:** `.agents/plans/ws-doctor-204-205/step-01-ws-doctor-204-205.plan.md`
- **Spec:** `.agents/plans/ws-doctor-204-205/step-00-ws-doctor-204-205.spec.md` (AC1–AC8)
- **Step 5:** score 10/10, `VERIFIED`
- **Findings:** 0 Critical, 0 Warning, 0 Suggestion
- **Verdict:** **Clean.** No feedback. AutoMode would **not** start a fix loop. Step 6 may Advance.

## In-scope diff (Step 1)

`git diff HEAD --` on the four planned paths (not `origin/main...HEAD`; `branchStrategy: stay`, uncommitted on `develop`). HEAD `8d5d103a71b79168c398528fc40f534acb47d078`.

| Path | Status |
|------|--------|
| `.agents/skills/ws-github-provider/SKILL.md` | modified (one Canonical scripts cell) |
| `.agents/skills/ws-azure-devops-provider/SKILL.md` | modified (one Canonical scripts cell) |
| `.agents/skills/ws-doctor/scripts/doctor.js` | modified (`escapeRegExp`, `isCitingFromPublishedSkillFolder`, gated `docs/` special-case) |
| `test/test-ws-doctor.js` | modified (helpers + AC1–AC8 cases wired in `main()`) |

Stack `node-skills-package`: skills-sot + tests. No frontend / i18n / DB. `bin/` installer logic untouched (integrity regenerate is Step 8; **not flagged**). Unrelated dirty trees (`us-202/`, telemetry, specs, plans) excluded per orch.

## Verified against plan / AC

| AC | Result | Evidence |
|----|--------|----------|
| AC1 | Pass | GitHub Canonical scripts “Spec of record → workflow copy” cell is `` `python {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source github` `` (`SKILL.md:72`). Other Canonical rows still bare paths without args. |
| AC2 | Pass | Azure DevOps same row with `--source azure-devops` (`SKILL.md:71`). `ado-workitem-to-spec.py` / `fix_pr_azure_context.py` unchanged. |
| AC3 | Pass | Live `doctor.js --json --skill ws-github-provider` and `--skill ws-azure-devops-provider`: `missingLaunchers` has **0** `register_local_spec` hits. Test `testProviderRegisterRowsNotMissingLaunchers` passed. |
| AC4 | Pass | `resolveCitedPath` gates project-root `docs/` on `!isCitingFromPublishedSkillFolder` (`doctor.js:360–361`); skill-folder cites fall through to `path.dirname(sourceFile)` (`doctor.js:372–374`). Fixture + trap tests passed. |
| AC5 | Pass | Hub `ws-shared` excluded (`m[1] !== 'ws-shared'`, `doctor.js:316`). `testHubDocsStaysProjectRoot` passed (companion only at project root). |
| AC6 | Pass | Live `--json --skill ws-spec-to-pr`: **0** findings with `cited` `docs/faq.md`. Companion `.agents/skills/ws-spec-to-pr/docs/faq.md` exists. |
| AC7 | Pass | Fixture `testSkillFolderDocsCompanionsWhenPresent` passed. Live `--skill ws-check-harness` still lists `docs/specs/`, `docs/testing/`, `docs/faq.md` with **skill-relative** `expanded` (`.agents/skills/ws-check-harness/docs/...`), not repo-root `docs/faq.md` — expected (companions absent; plan: do not add stubs). |
| AC8 | Pass | Cases live in `test/test-ws-doctor.js` `main()` (`413–420`). Fresh `node test/test-ws-doctor.js` this review → exit 0. `package.json` `tests` already includes that file (unchanged). |

## Code review proof (ws-senior-developer)

| Check | Evidence / outcome |
|-------|--------------------|
| Build / test / format aliases | `verification.backendTest` is `npm run test` (full pack/integrity — deferred to Step 7 / ship). Targeted: `node test/test-ws-doctor.js` → **exit 0**. `backendBuild` / format aliases empty. |
| Secrets checking | Diff is two table cells, path-resolution helper, and Node tests. No credentials, tokens, or PII. |
| Docs / spec-index | Only the two planned Canonical cells. Catalog/version bump and integrity are ship. |
| Scope / correctness | Surgical four-file working-tree diff. `ws-shared` excluded from the skill-folder exception. File-relative fallthrough is `path.dirname(sourceFile)`. No auto-fix, no `register_local_spec.py` edit, no `tools.md` / PHASES.md / companion stubs. |
| Remaining risks / blockers | None for Advance. Integrity regenerate at Step 8 in the same commit as hashed SKILL.md + `doctor.js`. |

## Review Patterns (MEMORY)

`MEMORY.md` has no `## Review Patterns` section — sweep N/A.

Applicable MEMORY traps checked against the modified set:

| Trap | Result |
|------|--------|
| SKILL.md frontmatter CRLF (`build-site` fence slicing) | Diff is two table cells only; YAML frontmatter not rewritten. |
| `ws-doctor` `asciiSafe` punctuation | Formatters / `asciiSafe` untouched. |
| Author under `.agents/skills` | Provider SKILL.md + `doctor.js` edited in SoT paths. |
| Integrity after SoT edits | Planned for Step 8, not this review. |
| Never `git add -A` | Review does not stage or commit. |

## Invariants (`config.json`)

| Invariant | Result |
|-----------|--------|
| `commitPlanFilesOnlyAtStep8: true` | This review file stays under `{plansDir}`; not a product commit. |
| `skipQualityGates: false` | Doctor smokes + `test/test-ws-doctor.js` re-ran this pass. |
| Tenancy / EF / i18n | N/A (`tenancyField` empty; `i18n.locales` empty; DB none). |

## Fable Judge (`fable.enabled` + `autoAudit`)

ws-fable-judge loaded. Ground truth is `git diff HEAD` on the four scoped paths (uncommitted on `develop`), not orch claims.

### Claims vs Ground Truth

- **Claimed Scope:** Prefix `python` on two Canonical scripts cells; gate `docs/` project-root special-case for published `ws-*` skill folders (exclude `ws-shared`); extend `test/test-ws-doctor.js`. Four implement files. No commit. HEAD stays `develop`.
- **Ground Truth Diff:** Uncommitted vs HEAD `8d5d103`. Touched product files only the four planned paths. Pre-existing dirty trees are outside this feature blast radius (state `preExistingDirty`).

### Re-Run Verification Results

- `node test/test-ws-doctor.js` → **PASSED** (exit 0). Prior smokes plus AC1–AC8 cases green.
- `node .agents/skills/ws-doctor/scripts/doctor.js --json --skill ws-github-provider` / `--skill ws-azure-devops-provider` → **PASSED** (0 `register_local_spec` missingLaunchers).
- `node .agents/skills/ws-doctor/scripts/doctor.js --json --skill ws-spec-to-pr` → **PASSED** (0 `docs/faq.md` missingRef/pathError).
- `git rev-parse --abbrev-ref HEAD` → `develop`. `git rev-parse HEAD` → `8d5d103a71b79168c398528fc40f534acb47d078` (baseline; no commit).
- `npm run test` (full suite) → **UNVERIFIABLE** this step (plan defers to Step 7). Not treated as fraud.
- `npm run generate-integrity` / `verify-integrity` → **UNVERIFIABLE** this step (plan: Step 8). Not treated as fraud.

### Fraud Audit

- **Weakened Checks:** None detected. Diff adds tests and assertions; existing smokes still run first in `main()`; no skipped/widened prior asserts.
- **False Completion:** None detected. Requested scoped verification re-ran this session and passed. AC7 uses fixtures as the plan required; live check-harness `expanded` is skill-relative.
- **Scope Creep:** None detected. Working-tree product edits are the four planned files. No `register_local_spec.py`, `tools.md`, PHASES.md, `package.json`, or integrity manifest edits.
- **Unauthorized Actions:** None detected. HEAD remains `develop` at baseline; no commit, push, or integrity regenerate.

**Verdict:** `VERIFIED WITH CAVEATS` — core AC claims match the diff; feature tests and live doctor re-ran green; full `npm run test` / integrity stale are planned non-fraud ship items. `auditVerdictsBlockShip: true` does **not** block (verdict is not `REFUTED`).

## Hypotheses discarded (incomplete or non-defects)

Candidates that did **not** retain all four proof steps (Evidence / Failure / Missing protection / Discards):

- Hybrid `--skill` fallback to `{globalSkillsRoot}` may not match `tokenMap.skillsRoot` in `isCitingFromPublishedSkillFolder`. **Discard:** spec/plan implement project-relative `{skillsRoot}/ws-*/`; hybrid not in AC1–AC8; this repo scans project-local SoT.
- Bare Spec path-rule prose still cites `register_local_spec.py --source …` without `python`. **Discard:** plan §1 — not a managed-script command (`isManagedScriptCitation` requires `{skillsRoot}` or `ws-*/scripts/`); out of scope.
- Live `ws-check-harness` still reports `docs/specs/`, `docs/testing/`, `docs/faq.md`. **Discard:** companions absent; `expanded` is now skill-relative (the #205 false positive is gone). Plan forbids stub files.
- Live `ws-spec-to-pr` pathError `protocols/artifact-cleanup.md` from `docs/faq.md`. **Discard:** pre-existing; not `docs/` prefix; file-relative both before and after this change; not in blast radius.
- Integrity digest stale / full `npm run test` not run. **Discard:** orch — Step 7 / Step 8.

## Findings

No feedback.

## Apply fixes?

No. Clean (0 Critical / 0 Warning). AutoMode: skip fix → re-review. Orchestrator may Advance Step 6.
