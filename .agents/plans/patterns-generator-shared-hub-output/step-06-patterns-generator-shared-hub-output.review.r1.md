---
step: 6
slug: patterns-generator-shared-hub-output
workflowId: patterns-generator-shared-hub-output-20260921T134516Z
status: completed
startedAt: "2026-09-21T13:45:16Z"
endedAt: "2026-09-21T14:07:18.619Z"
acRefs: []
---
# Code review — patterns-generator-shared-hub-output (round 1)

- Base: `main` (`e45c212b`) · Head: `beef67be` · Scope: `git diff --name-status main...HEAD` (124 paths)
- Feature scope reviewed: `.agents/skills/ws-patterns-generator/**`, `.agents/skills/ws-configure-project/scripts/configure_autoload.cjs`, `.agents/skills/ws-shared/runtime/{AGENTS.md,hub-layout.json,skill-dependencies.json}`, `bin/skill-dependencies.json`, `bin/skill-integrity.json`, `test/test-ws-patterns-generator.js`, `test/test-ws-shared-layout.js`, `README.md`, `FEATURES.md`, `docs/**`, `package.json`, `.agents/specs/0114-*.{spec,context}.md`
- Out of the reviewed scope (other session's commits in the same range): `.agents/plans/**` artifacts.

## Findings

### CR-001 [Warning] open .agents/skills/ws-patterns-generator/scripts/seed_generated_skill.cjs:L67-L80, .agents/skills/ws-configure-project/scripts/configure_autoload.cjs:L202-L214

- **Read evidence**: `resolveHubRel()` (seed script) and `hubRootFor()` (configure_autoload) both discover `pathTokens.sharedDir` by reading `<repo>/.ws/config.json` only.
- **Executable failure scenario**: a consumer relocates the hub (`pathTokens.sharedDir: "<other-dir>"`). The config file then lives at `<other-dir>/config.json`; both helpers probe `.ws/config.json`, miss, and fall back to `.ws`, so the generated body and the autoload row land in the wrong root (or the row renders against a path that does not exist).
- **Missing protection**: no second probe of the configured hub location, and neither SKILL.md nor the companion documents that `pathTokens.sharedDir` is effectively fixed at `.ws` for hub-hosted content.
- **Discards**: the installer always materializes `.ws` and `configure_autoload.cjs` already hardcodes `SHARED_AUTOLOAD_REL = .ws/autoload.md`, so shipping behavior is consistent today; the defect is the silent divergence plus the missing documented contract. Not mitigated for a hand-edited config.
- **Suggestion**: state the fixed-hub contract explicitly in the generator SKILL.md (hub root = the `.ws` project hub; `pathTokens.sharedDir` declares it but is not relocatable for generated hub content) and in the spec companion's decisions, so the fallback is a documented contract rather than a silent guess. (Cheapest correct fix; carrying a second discovery path would duplicate harness-wide assumptions.)
- **Score**: 6/10 · **Sibling occurrences**: `hubRootFor` (configure_autoload) — same class, fixed in the same pass by the shared documentation rule.

### CR-002 [Suggestion] open .agents/skills/ws-configure-project/scripts/configure_autoload.cjs:L567-L577

- **Read evidence**: the generated-id branch of `checkAutoload` validates only `pathTargetsSkill()` and hub existence; it skips `pathFormOk()`.
- **Executable failure scenario**: a hand-edited generated row with an absolute path (`, e.g. `/home/x/ws-project-patterns/SKILL.md`) passes `--check` despite breaking portability.
- **Missing protection**: portability check not applied to the generated branch.
- **Discards**: generated rows are written by `--write-autoload` and always hub-relative, so the path can only be non-portable after manual edit; severity stays Suggestion.
- **Suggestion**: call `pathFormOk()` for generated rows too (one condition) so manual edits are flagged like any other row.
- **Score**: 3/10.

### CR-003 [Suggestion] open .agents/plans/ws-spec-multi/ms-20260919T193000Z.state.md (working tree)

- **Read evidence**: the tracked file has zero YAML frontmatter markers, which makes `validate_state.cjs rebuild-index` fail for the whole plans tree; this workflow renamed it to `ms-20260919T193000Z.summary.md` (bytes untouched, new name matches the plans ignore rules) so Step 0 could index.
- **Executable failure scenario**: any fresh clone keeps the broken tracked file at its old name, so `rebuild-index` keeps failing for other runs.
- **Missing protection**: pre-existing repo defect, not introduced here.
- **Discards**: renaming is not the only option (frontmatter could be added), but the file is a prose run summary, not a state file.
- **Suggestion**: include the rename in the Step 4 delivery commit (plansDir is stageable at close) with the rationale in the commit body, or convert the file to a proper state artifact upstream.
- **Score**: 4/10.

### CR-004 [Suggestion] open test/test-context-budget.js:L41, .agents/skills/ws-shared/runtime/AGENTS.md

- **Read evidence**: the SoT consumer hub budget is 14 000 B and the file now measures 13 884 B after consolidating the three legacy memory rows into one.
- **Executable failure scenario**: the next small doc addition to the hub trips the budget again; the consolidation reduced prose granularity in the legacy-table description (information preserved: both default locations are still named).
- **Missing protection**: no headroom policy documented for the hub budget.
- **Discards**: raising the limit was rejected — the budget is a deliberate context-hygiene gate.
- **Suggestion**: leave as is; note in the changelog that 116 B of headroom remains.
- **Score**: 2/10.

### CR-005 [Suggestion] open .agents/specs/0114-patterns-generator-shared-hub-output.context.md:L## Performance Baselines

- **Read evidence**: the AC10 table records `npm run test` = 176.6 s with no local pre-change sample, and declares that gap explicitly.
- **Executable failure scenario**: a genuine suite-time regression introduced by this change would not be caught by the recorded numbers.
- **Missing protection**: no baseline capture step before implementation in the lite flow.
- **Discards**: the suite entry count is unchanged (103 → 103) and no new test file was added, so the regression surface is limited to two rewritten batteries.
- **Suggestion**: keep the explicit gap (`NS10` declared gap) rather than fabricating a baseline.
- **Score**: 2/10.

## Stack Invariant Compliance

- `scan_stack_invariants.cjs --stack typescript-node`: 0 issues (0 Critical, 0 Warning) across 72 files.
- Filesystem-write containment: `realpathLoose(target)` is required to resolve the **full** target chain and fails closed on `null`; hub-root, generated-dir, and dangling-leaf link fixtures all assert refusal with no write outside the repo (MEMORY trap honoured).
- Input validation: `--repo-root` must exist and be a directory; `pathTokens.sharedDir` is read defensively (non-string/empty → `.ws`); lexical containment still requires the target inside both the hub and the repo root.
- Async/lifecycle: synchronous CommonJS, no floating promises, no opened handles.
- Autoload/exclusion invariants: generated rows are hub-relative, existence-driven, never duplicated; the id stays in `externalSkills` and out of `installed-skills.json`.
- Deterministic gates: `npm run test` 103/103, `test-harness-clean.js` 0 findings, integrity regenerated/verified at `0.4.50`, secrets scanner no leaks, `test-context-budget.js` ok.
- `config.json.verification.localReviewCommand` / `preview.localReviewCommand`: empty → no local reviewer dry-run to ingest (gate not configured in this repo).

## Round decision

- Critical: 0 · Warning: 1 · Suggestion: 4
- Action: apply the CR-001 documentation fix (Warning) in the same surgical pass as CR-002 (one condition) and CR-003 (delivery-commit note); re-review round 2.
- **Apply fixes?** Yes (workflow rule: no Advance with open Critical/Warning).
