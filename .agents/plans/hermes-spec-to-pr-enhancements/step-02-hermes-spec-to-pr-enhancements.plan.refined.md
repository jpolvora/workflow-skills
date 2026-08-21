---
slug: hermes-spec-to-pr-enhancements
title: "Hermes Agent Inspirations: ws-spec-to-pr Ecosystem Enhancements"
status: "plan refined ok"
interviewRound: 1
shared_understanding: confirmed
planningHead: "2d89620bdc8fab8d543aa42f6c9d02f80f91aae4"
---

## 0. Summary & Business Rules

Adopt Hermes Agent `github-issue-to-pr` disciplines into the portable `ws-spec-to-pr` ecosystem so agents stop duplicating work, stop undoing intentional design, fix whole defect classes, prove new tests actually bite, triage CI honestly, and close the tracker loop.

**Planning baseline (do not re-implement):** workflow bootstrap was `3e6f052`. Current HEAD is `2d89620` (`f2a38c6` verify score ≥ 9 + SCM parity contract; `2d89620` docs/site). This feature builds **on** that tree. Do not re-plan or re-ship the verify-bar-9 change or the initial seven-intent SCM contract.

**Objectives (AC1–AC6):**

1. **Prior-work sweep** before plans/code: search PRs (issue id + keyword variants) and recent commits; record findings in Step 0 context.
2. **Design-intent inspection** on modification tasks: `git log -p -S` / `git log -L` before treating a gap as a bug.
3. **Defect-class sibling sweep** at implement and review: fix the class or justify exemptions.
4. **Zero-dep sabotage** at verify and testing: invert the fix, prove the new test fails, restore; abort if restore fails. Missing **required** sabotage fail-closes Step 5 as score **< 9** (never Advance below 9).
5. **CI baseline vs diff triage** at ship/fix-pr: **extend** existing `check-pr-status` (failed-log inspect, default-branch reproduce, one flake rerun) plus caller discipline in `ws-ship-pr` / `ws-fix-pr` / `ws-goal-fix-pr`. Do **not** add a parallel unused intent.
6. **Tracker close-loop**: canonical intent `comment-issue` (alias `close-loop`) on GitHub and Azure DevOps, dispatched from `ws-ship-pr`.

**Business / harness rules:**

- Edit only local SoT `.agents/skills/ws-*` (never `{globalSkillsRoot}` / `$HOME/.agents/skills`).
- SCM-neutral: GitHub recipes need Azure DevOps parity. **New intents go on both implementers in the same change** and get a **Required intents** row in `{sharedDir}/scm-provider-contract.md` (allowlist stays empty). Local tracker source skips issue-id PR search and skips close-loop when `id` is null. `ws-local-spec-provider` is not an SCM implementer.
- Skill bodies, gates, banners: en-us. No IDE/agent product names in shipped skill prose.
- Surgical skill authoring (`SKILL_AUTHORING.md`): lean SKILL.md, procedures in INTENTS/references, deterministic scripts where CLI/API is exact.
- `commitPlanFilesOnlyAtStep8`: this plan stays unstaged until delivery.
- Sabotage is fail-closed on restore: unclean restore aborts the verification step.
- README + catalog **are required** on this feature change (root `AGENTS.md` § Harness change protocol). Version bump remains the ship-PR gate (`npm run build-site:bump`).

**Security mitigations:**

- Close-loop posts a short public comment (PR URL + summary). No tokens, PATs, or absolute machine paths in comment bodies or committed JSON.
- Sabotage never leaves inverted product code; restore mismatch → `git restore --source=HEAD -- <paths>` then abort.
- Provider scripts resolve org/repo/PAT from `config.json` / env (`ADO_PAT`); never hardcode consumer literals.

Folded from user-supplied plan (not plan of record): prior-work on both SCM providers + Step 0 / `ws-write-spec`; design-intent in `ws-write-spec`, `ws-spec-format`, `ws-write-plan`; sibling class in `ws-implement-tasks` + `ws-code-review`; sabotage in `ws-verify-plan` + `ws-testing` when `mutationTest` unset; CI triage as an **extension of `check-pr-status`** plus ship/fix-pr/goal-fix-pr callers; `comment-issue` on both providers from `ws-ship-pr`; orch wiring in `STEP-DISPATCH.md` + lite pointers for shared skills; **contract + `test/test-provider-parity.js`** for every new intent.

## 1. Definition of Ready & Scope

**Resolved assumptions (interview closed; see registry):**

| ID | Assumption | Status |
|----|------------|--------|
| A1 | Duplicate sweep **records** findings in `step-00` under `## Original Issue Context` → `### Prior Work Sweep`. Open PR that already implements the **same tracker id** → `user-gate` (Recommended: stop/reuse). Related or historical hits: record and continue. `autoMode`: record and continue unless an open PR is an exact same-issue duplicate (then Pause). | confirmed (project) |
| A2 | Local `source: local` / `id: null`: keyword + `git log` only; skip issue-number PR search; skip `comment-issue`. If `providers.scm` is github or azure-devops, still search PRs by title keywords. | confirmed (project) |
| A3 | Design-intent git history is **mandatory for code-modification tasks** (bugfix / behavior change). Greenfield new files: skip with reason. | confirmed (project) |
| A4 | Sibling sweep is **repo-wide grep of the same defect/pattern**, not only modified directories or the review diff. Same-defect sibling edits are in-scope (not Karpathy extras). Drive-by cleanups stay out. | confirmed (project) |
| A5 | Sabotage restore: in-place invert from a temp copy of original bytes; `try/finally`; prove restore with `git diff --exit-code -- <paths>` (tracked). Failure → `git restore --source=HEAD -- <paths>` and abort. No stash, no extra worktree (`plans.useWorktrees` is false). | confirmed (project) |
| A6 | Sabotage is **required** for bug-fix / new regression tests. Skip (with reason) when no new tests, no invertible fix, or this run already executed `verification.mutationTest`. Missing **required** sabotage → fail-closed: overall score **< 9** (never Advance; `scoreAndRefine` / Pause). Not a bonus point and not a "cap below 7". | confirmed (project) |
| A7 | Close-loop: comment on **PR create** when tracker `id` is present (standard orch `stopBeforeFixPr: true` always takes this path). Comment again on **merge** only if merge runs in the same session (standalone ship or Step 9 merge). Never auto-close the issue. | confirmed (project) |
| A8 | ADO comments use WIT Comments REST `api-version=7.1` (same version as existing WIT scripts). GitHub uses `gh issue comment`. Not PR discussion threads. | confirmed (project) |
| A9 | Existing sibling wording in `ws-implement-tasks` (fix-mode, modified dirs) and `ws-code-review` (diff-only) is **expanded**, not replaced. | confirmed (project) |
| A10 | Lite has no Step 5/7: sabotage stays standard-only. Lite Step 0/2/3/4/5 still inherit shared skill changes (sweep, design-intent, siblings, CI triage, close-loop). | confirmed (project) |
| A11 | Canonical new intent ids: `sweep-prior-work` and `comment-issue`. `close-loop` is a **tools.md / prose alias** of `comment-issue` (one INTENTS heading, one contract first-column id) so parity stays one heading per implementer. | confirmed (project) |
| A12 | AC5 **extends** `check-pr-status` (INTENTS + contract behavioral guarantee + callers). No new CI-triage intent. | confirmed (project) |
| A13 | README.md + catalog (`node bin/build-site.js`) ship with this feature. `npm run build-site:bump` (version) stays the upstream ship-PR gate. | confirmed (project) |

**Acceptance Criteria (measurable):**

| AC | Pass when |
|----|-----------|
| AC1 | Both SCM providers expose `sweep-prior-work` (SKILL table + INTENTS heading); `{sharedDir}/scm-provider-contract.md` Required intents includes it; `test/test-provider-parity.js` expects it; Step 0 / `ws-write-spec` runs it (or git/keyword equivalent for local) **before** plan/code; findings appear in `step-00` Prior Work Sweep. |
| AC2 | `ws-write-spec`, `ws-spec-format`, `ws-write-plan` require `git log -p -S` or `git log -L` for modification tasks and record intent vs accidental gap. |
| AC3 | `ws-implement-tasks` (build + fix) and `ws-code-review` require class-level sibling search across modules; exemptions named (path + reason). |
| AC4 | `ws-verify-plan` and `ws-testing` run sabotage for bug-fix/regression tests; restored tree is clean; restore failure aborts. Works with `mutationTest` unset. Missing required sabotage → score **< 9**. |
| AC5 | `check-pr-status` procedures (both INTENTS) include failed-log inspect, default-branch reproduce, one infra-flake rerun, and classification (diff / baseline / flake). Contract behavioral guarantee updated. `ws-ship-pr`, `ws-fix-pr`, `ws-goal-fix-pr` consume that intent (no raw `gh`/`az` in those bodies). |
| AC6 | Both providers expose `comment-issue`; contract Required intents includes it; `ws-ship-pr` dispatches after PR create (and merge when in-session); skipped when no tracker id. |

**Out of scope:**

- New orchestrator FSM steps or a new skill id.
- Re-implementing verify score ≥ 9 or the initial seven-intent SCM contract (`f2a38c6` / `2d89620`).
- A new CI-triage intent alongside `check-pr-status`.
- Vendoring Stryker/mutmut; changing `defaults.skipMutationTesting`.
- Auto-closing tracker issues; editing `{globalSkillsRoot}`.
- Recreating a dogfood `SKILL.md` (contract stays in root `AGENTS.md`).
- App UI/API, RBAC, tenancy, i18n, database.
- Resuming `us-217` or `deepseek-harness-improvements`.
- Host/IDE product coupling in skill bodies.
- Adding `sweep-prior-work` / `comment-issue` to `ws-local-spec-provider`.

## 2. Technical Design & Architecture

**Stack:** `node-skills-package` (Node 22 / JavaScript harness). Layers from `config.json`:

| Layer | Path | This feature |
|-------|------|----------------|
| skills-sot | `.agents/skills` | All protocol edits + new provider/testing scripts |
| hub-contract | `.agents/skills/ws-shared` | `scm-provider-contract.md` Required intents + `check-pr-status` guarantee; `tools.md` aliases; README/catalog at implement |
| installer-cli | `bin` | Integrity regenerate only (no CLI flag changes) |
| tests | `test/` | **Extend** `test/test-provider-parity.js`; plus hermes contract/sabotage/wiring tests |

**Frontend / DB:** none. Pattern files `backend.md` / `frontend.md` do not exist (templates only). This work is skill-harness markdown/scripts; no app API/UI conventions apply.

**Architecture:**

```
Step 0  providers.sweep-prior-work  →  ws-write-spec records ### Prior Work Sweep
        ws-write-spec / ws-spec-format  →  design-intent git log for modification tasks
Step 1  ws-write-plan  →  plan entries for sibling sweep + sabotage method
Step 4  ws-implement-tasks  →  Fix Entire Defect Class (repo-wide; exemptions)
Step 5  ws-verify-plan  →  run_sabotage.py (standard); missing required → score < 9
Step 6  ws-code-review  →  class completeness beyond the diff
Step 7  ws-testing  →  sabotage when mutationTest unset/skipped (standard)
Step 8  ws-ship-pr  →  check-pr-status (extended) + comment-issue on create
Step 9  ws-fix-pr / ws-goal-fix-pr  →  check-pr-status (extended); close-loop on merge if ship merges
```

**Provider intents (contract SoT first):**

Add to `{sharedDir}/scm-provider-contract.md` **Required intents** (allowlist empty) in the **same change** as both implementers:

| Intent | GitHub | Azure DevOps | Local tracker |
|--------|--------|--------------|---------------|
| `sweep-prior-work` | `gh pr list --search`, `git log` | `az repos pr list` / PR search REST + WIT WIQL, `git log` | keywords + `git log`; optional scm PR keyword search (not a local-provider intent) |
| `comment-issue` (alias `close-loop`) | `gh issue comment {id} --body-file` | POST `{apiBase}/{org}/{project}/_apis/wit/workItems/{id}/comments?api-version=7.1` | skip |
| `check-pr-status` (**extend**, do not replace) | keep `gh pr checks`; add `gh run view --log-failed` (or documented equivalent); classify; one flake rerun | keep `az repos pr policy list`; add build-log fetch parity; classify; one flake rerun | n/a (delegates to `providers.scm`) |

Prefer thin Python scripts (tool-first): `sweep_prior_work.py` and `comment_issue.py` under each provider `scripts/`. Agents still **Read** INTENTS.md; scripts print JSON to stdout (repo-relative paths only). Mutating `comment-issue` honors `dry-run` (print body, no POST).

**`check-pr-status` contract guarantee (update the existing row, no new id):**

Input: PR id. Output: CI / policy / review-run status **plus** per-failed-check classification (`diff-regression` / `baseline` reproduced on `project.baseBranch` / `infra-flake`) and whether a single flake rerun was used. Finished when none are pending, in progress, or queued. Callers (`ws-ship-pr`, `ws-fix-pr`, `ws-goal-fix-pr`) use this intent only.

**Shared sabotage helper:** `python .agents/skills/ws-testing/scripts/run_sabotage.py --test "<cmd>" --paths <files> --invert-patch <file>` invoked by `ws-verify-plan` and `ws-testing`. Agent authors the invert patch; the script only applies / runs / restores (deterministic). One implementation; no duplicate invert logic.

**Orch:** `STEP-DISPATCH.md` Step 0/4/5/7/8/9 one-liners. `ws-spec-to-pr/SKILL.md` skill map notes only if the Step table changes. Lite Steps 0–5 index: pointer lines for shared skills (sweep at 0, siblings at 2/3, CI+close-loop at 4/5). Do not add verify/testing steps to lite. Do not change the already-shipped Step 5 ≥ 9 Advance bar.

**Hub:** `{sharedDir}/tools.md` source-control table adds `check-pr-status` (currently missing), `sweep-prior-work`, and `comment-issue` / `close-loop` (resolve via `providers.scm`). Root/`ws-shared` `AGENTS.md` task router unchanged (no new skill ids; Dual-mode already points at the contract). README + catalog required this change (A13).

**Invariant checks:** `commitPlanFilesOnlyAtStep8` true; portable aliases; en-us; no absolute paths in committed JSON; integrity after hashed skill content; parity test exit 0.

## 3. Step-by-Step Plan

Sequential (`defaults.enableDag: false`). Author only `$PWD/.agents/skills/ws-*` plus `test/`, hub files listed, `README.md`, and catalog. Do not touch `{globalSkillsRoot}`. Do not rewrite the shipped ≥ 9 gate or the original seven required intents except to **add** rows / **extend** `check-pr-status` behavior.

### S1 — GitHub `sweep-prior-work` + contract row (AC1)

- Add `sweep-prior-work` to `.agents/skills/ws-shared/scm-provider-contract.md` Required intents (same change as S2). Allowlist stays empty.
- Add intent row to `.agents/skills/ws-github-provider/SKILL.md` and procedure to `INTENTS.md`.
- Add `.agents/skills/ws-github-provider/scripts/sweep_prior_work.py`: `--issue {n}` optional, `--keywords k1 k2`, `--files` optional. Runs `gh pr list --search "#{n}" --state all`, `gh pr list --search "{keywords}" --state open`, `git log --oneline -20 -- <files>` when files known. stdout JSON (relative paths). `validate-auth` first.
- Engineering check: `python -m py_compile` on the script; `--help` exits 0; dry-run without `gh` auth prints skip reason, exit 0 (advisory). Do not land GitHub-only.

### S2 — Azure DevOps `sweep-prior-work` parity (AC1)

- Mirror intent in `.agents/skills/ws-azure-devops-provider/SKILL.md` + `INTENTS.md` (same change as S1 contract row).
- Add `.agents/skills/ws-azure-devops-provider/scripts/sweep_prior_work.py` using config `org`/`project`/`apiBase`/`patEnvVar`. Search PRs by text and related work-item links; `git log` same as GitHub.
- Engineering check: same compile; missing PAT → STOP with validate-auth text (no silent GitHub fallback).

### S3 — Step 0 + write-spec + spec-format record prior work (AC1)

- `.agents/skills/ws-write-spec/SKILL.md`: after Parse & Ingest, run provider `sweep-prior-work` when `source` is github or azure-devops; local: keyword + `git log` (and scm keyword PR search if `providers.scm` is not unused). Write `### Prior Work Sweep` under `## Original Issue Context`. Exact open duplicate of the same tracker id → `user-gate` (A1).
- `.agents/skills/ws-spec-format/FORMAT.md` + `SKILL.md`: optional subsection; **required** when `source` is github or azure-devops.
- `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` Step 0: sweep before plan/code (findings in `step-00`).
- Engineering check: FORMAT validation list mentions the subsection; no host product names.

### S4 — Design intent in spec/plan skills (AC2)

- `.agents/skills/ws-write-spec/SKILL.md` Agentic protocol: for modification tasks, inspect `git log -p -S "<symbol>"` and/or `git log -L :<func>:<file>`; record `### Design Intent` (intentional constraint vs accidental gap).
- `.agents/skills/ws-spec-format/FORMAT.md`: optional `### Design Intent` under Notes or Original Issue Context.
- `.agents/skills/ws-write-plan/SKILL.md`: Step 1 load requires the same git-history check before recommending a behavior change; generated plans must name sibling-sweep and sabotage verification in §3/§5 when AC is a bugfix/regression.
- Engineering check: skip-with-reason allowed for greenfield; mandatory for "fix bug / restore behavior" wording.

### S5 — Defect class in implement-tasks (AC3)

- `.agents/skills/ws-implement-tasks/SKILL.md`:
  - Build mode: after Implement, **Fix the Entire Defect Class** (grep/search sibling modules, not style-only "Scan codebase").
  - Fix mode: widen "Sweep siblings" from modified directories to **repo-wide same pattern**; exemptions: path + reason in `step-output.summary`.
  - Reconcile with surgical scope: same-defect siblings in-scope; no drive-by refactors.
- Engineering check: Done-when is empirical (search performed; remaining hits listed or justified).

### S6 — Defect class in code-review (AC3)

- `.agents/skills/ws-code-review/SKILL.md` Step 4: search **beyond the review diff** (sibling modules) for the same vulnerability/pattern; report as class finding or named exemption. Today the skill only searches the full **diff**.
- Keep existing four proof steps; class completeness is additional, not a substitute for Investigate.
- Engineering check: report template still has sibling occurrences; Critical if an unfixed sibling of a proven defect remains without exemption.

### S7 — Sabotage helper script (AC4)

- Add `.agents/skills/ws-testing/scripts/run_sabotage.py`:
  1. Snapshot listed file bytes (utf-8) to temp.
  2. Apply invert from a **caller-supplied patch file** (agent-authored; script does not invent invert).
  3. Run `--test` command (explicit launcher from `verification.backendTest` or a single targeted test).
  4. Expect **non-zero** (test bites).
  5. `finally`: restore bytes; `git diff --exit-code -- <paths>` for tracked files.
  6. Restore failure: `git restore --source=HEAD -- <paths>`; exit 1; do not continue verify/testing.
- Engineering check: unit test in `test/` with a tiny fixture dir (no network). Working tree of the **repo** must remain unchanged after the test.

### S8 — Wire sabotage into verify-plan and testing (AC4)

- `.agents/skills/ws-verify-plan/SKILL.md` + `TEMPLATE.md`: **Regression Sabotage Check** for bug-fix/regression tests; record pass/fail/skipped+reason. Missing **required** run → fail-closed overall score **< 9** (never Advance; triggers `scoreAndRefine` / Pause per `gates.md`). Do **not** use a "score cap below 7". Do **not** treat sabotage as a bonus point (override user-supplied plan). Do **not** change the already-shipped Advance bar of ≥ 9.
- `.agents/skills/ws-testing/SKILL.md`: after unit tests, when `verification.mutationTest` is empty or skipped, run sabotage on newly added regression assertions. When full mutation ran, log sabotage `skipped` (superseded).
- Standard `STEP-DISPATCH.md` Steps 5 and 7: one line each for sabotage. Lite: explicit "sabotage is standard-only". Leave the existing `<9` / ≥ 9 gate wording intact.
- Engineering check: protocol states restore-abort; no new mutation binary dependency. This repo's `mutationTest` is empty and `skipMutationTesting` is true, so sabotage is the live path here.

### S9 — Extend `check-pr-status` + caller triage (AC5)

- **Do not** add a new intent id.
- Update `{sharedDir}/scm-provider-contract.md` `check-pr-status` Behavioral guarantee (classification + log fetch + one flake rerun). Keep "Finished when none pending/in progress/queued".
- Extend `check-pr-status` procedures in both provider `INTENTS.md`:
  - GitHub: keep `gh pr checks`; on fail `gh run view --log-failed` (or documented equivalent).
  - ADO: keep `az repos pr policy list`; add build log via REST or `az pipelines runs show`.
  - Both: classify each failed check as **diff regression** / **baseline** (reproduced on `project.baseBranch`) / **infra flake**. One rerun only for confirmed flake.
- `.agents/skills/ws-ship-pr/SKILL.md` Monitor step: consume `check-pr-status` output; baseline failures do not block merge **only** when reproduced on default branch and recorded; diff regressions route to fix-pr.
- `.agents/skills/ws-fix-pr/SKILL.md` Step 1: inspect failed-check logs via `check-pr-status` before formulating CI-driven fixes; do not "fix" baseline noise.
- `.agents/skills/ws-goal-fix-pr/SKILL.md`: same classification in heartbeat when checks red; one flake rerun; do not count baseline as loop progress.
- `{sharedDir}/tools.md`: add `check-pr-status` to the Source control table (it is a required intent today but missing from the alias table).
- Engineering check: no raw `gh`/`az` in `ws-ship-pr` / `ws-fix-pr` / `ws-goal-fix-pr` bodies; delegate to provider intents. ADO parity recipes required.

### S10 — `comment-issue` on both providers + contract row (AC6)

- Add `comment-issue` to `{sharedDir}/scm-provider-contract.md` Required intents (same change as both SKILL/INTENTS). Document `close-loop` as alias in the guarantee / tools.md only (one heading id).
- GitHub: intent + `.agents/skills/ws-github-provider/scripts/comment_issue.py` wrapping `gh issue comment {id} --body-file`.
- ADO: intent + `.agents/skills/ws-azure-devops-provider/scripts/comment_issue.py` POST work-item comment (`api-version=7.1`).
- Body: PR URL + one-paragraph summary. No secrets, no absolute paths. `dry-run`: print body, no POST.
- Skip when `id` is null / `source: local`.
- Engineering check: `validate-auth` first; missing id exits 0 with `skipped`.

### S11 — Dispatch close-loop from ship-pr + tools.md (AC6)

- `.agents/skills/ws-ship-pr/SKILL.md`: after successful `create-pr`, dispatch `comment-issue` when workflow state has tracker id (`state.us` / spec frontmatter `id`). After in-session `merge-pr`, dispatch again (or a "merged" follow-up) per A7. Standard orch `stopBeforeFixPr` comments on create only at Step 8.
- `.agents/skills/ws-shared/tools.md`: add `sweep-prior-work` and `comment-issue` / `close-loop` (plus `check-pr-status` from S9). Resolve via provider skills, not raw CLI in pipeline skills.
- Engineering check: `stopBeforeFixPr` orch still comments on create (Step 8); merge comment is Step 8 standalone merge or Step 9 path only if merge runs.

### S12 — Orchestrator wiring (AC1–AC6)

- `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`: Step 0 sweep; Step 4 class sweep (skill-owned, orch reminder); Step 5/7 sabotage; Step 8/9 CI triage via `check-pr-status` + close-loop. Do not edit the shipped ≥ 9 Advance rows except to mention sabotage fail-closed as `< 9`.
- `.agents/skills/ws-spec-to-pr/SKILL.md`: only if the public step map needs a phrase; keep FSM 0–9.
- `.agents/skills/ws-spec-to-pr-lite/SKILL.md` Steps 0–5 index: Step 0 prior-work; Step 2/3 class sweep via shared skills; Step 4/5 CI triage + close-loop; note sabotage/mutation remain standard-only.
- Engineering check: `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` 0 critical after wiring.

### S13 — Automated tests (AC1–AC6)

- **Extend** `test/test-provider-parity.js`: hardcoded required list gains `sweep-prior-work` and `comment-issue`; raise `required.length >= 7` to `>= 9`. Contract table remains the source of `required` ids (first-column backticks).
- Add `test/test-hermes-spec-to-pr-enhancements.js` (or split files) asserting:
  - Both provider SKILL.md + INTENTS.md contain `sweep-prior-work` and `comment-issue`.
  - Contract Required intents includes both; `check-pr-status` guarantee mentions log-failed / baseline / flake (or equivalent tokens).
  - `run_sabotage.py` restore: fixture invert then clean tree; simulated restore failure takes restore path and non-zero exit.
  - `STEP-DISPATCH.md` / lite index contain the wiring phrases.
  - `ws-implement-tasks` / `ws-code-review` contain "defect class" / sibling-exemption language beyond "modified directories" / diff-only.
  - `ws-verify-plan` fail-closed language is **< 9**, not "below 7".
  - `tools.md` lists `sweep-prior-work`, `comment-issue`, and `check-pr-status`.
  - GitHub INTENTS has `gh run view --log-failed` (or documented equivalent); ADO has log-fetch parity.
  - ship-pr / fix-pr / goal-fix-pr mention baseline vs diff + single flake rerun **and** `check-pr-status`.
- Extend `test/test-ws-doctor.js` only if new script rows need launcher prefixes (follow existing register-row pattern).
- Engineering check: `npm run test` includes the new file (via existing test runner glob or `package.json`).

### S14 — Integrity, harness, docs (all ACs)

- After skill content changes: `npm run generate-integrity` && `npm run verify-integrity`.
- `npm run test`.
- `ws-check-harness` Phases 0–5c → 0 critical (en-us, portability, links, no host names).
- `ws-check-workflows` if orch/gates/sim docs changed.
- Hub: `tools.md` (S9/S11); `scm-provider-contract.md` (S1/S9/S10). Update root `AGENTS.md` / `ws-shared/AGENTS.md` **only** if a routing/index row must mention the new intents (prefer tools.md + existing Dual-mode contract pointer).
- **README.md + catalog are required** this PR (harness change protocol). Update human feature narrative; rebuild `docs/index.html` via `node bin/build-site.js` during implement. `npm run build-site:bump` (package version + footer) remains the **ship-PR** gate, not a reason to skip README/catalog.
- Engineering check: no `$HOME/.agents/skills` writes; no absolute paths in new JSON fixtures.

## 4. Permissions, Tenancy & i18n

N/A for this harness package.

- **RBAC / permissions:** none. Close-loop uses existing tracker auth (`gh auth` / `ADO_PAT`); no new permission matrix.
- **Tenancy / data leakage:** none. `domain.tenancyField` is empty; EF tenancy invariants are false.
- **i18n:** none. `stack.frontend.i18n.framework` is `none`. Skill prose stays en-us (harness language contract, not locale files).

Keep this section for template completeness.

## 5. Test Coverage

| AC | Test case | Method / command |
|----|-----------|------------------|
| AC1 | Contract Required intents + both SKILL/INTENTS list `sweep-prior-work` | `test/test-provider-parity.js` (extended hardcoded list) + `testHermesSweepIntentPresent` |
| AC1 | Sweep script JSON has no drive-letter/absolute paths | `testSweepPriorWorkJsonRelativePaths` (fixture stdout parse) |
| AC1 | FORMAT.md documents `### Prior Work Sweep`; write-spec SKILL mentions dispatch | `testPriorWorkSubsectionInFormat` |
| AC1 | STEP-DISPATCH Step 0 mentions sweep before plan/code | `testStepDispatchSweep` |
| AC2 | write-spec, spec-format, write-plan mention `git log -p -S` or `git log -L` | `testDesignIntentGitLogRequired` |
| AC3 | implement-tasks requires repo-wide class sweep + exemption justification (not only modified dirs) | `testImplementTasksDefectClassScope` |
| AC3 | code-review searches sibling modules beyond the diff | `testCodeReviewSiblingBeyondDiff` |
| AC4 | Sabotage: inverted code makes test fail; restore leaves fixture clean | `testSabotageBitesThenRestores` (invokes `run_sabotage.py`) |
| AC4 | Restore failure aborts non-zero and attempts `git restore` | `testSabotageRestoreFailureAborts` |
| AC4 | verify-plan + testing SKILL mention sabotage when `mutationTest` unset; missing required → `< 9` not "below 7" | `testSabotageWiredWhenMutationUnset` |
| AC5 | Contract `check-pr-status` guarantee + both INTENTS log recipes; no new intent id | `testCiLogRecipesParity` + parity test still lists exactly one `check-pr-status` |
| AC5 | ship-pr, fix-pr, goal-fix-pr mention baseline vs diff + single flake rerun + `check-pr-status` | `testCiTriageLanguage` |
| AC6 | Contract + both providers list `comment-issue`; ship-pr dispatches on create | `test/test-provider-parity.js` + `testCommentIssueIntentAndShipDispatch` |
| AC6 | comment script dry-run skips POST; null id → skipped | `testCommentIssueSkipLocalAndDryRun` |
| Docs | README mentions prior-work / sabotage / CI triage / close-loop (or equivalent feature bullets) | `testHermesReadmeCatalog` (string presence) |
| All | Integrity + install suite | `npm run test`; `npm run generate-integrity` && `npm run verify-integrity` |
| All | Harness + workflow sim | `ws-check-harness` Phases 0–5c; `ws-check-workflows` / `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` |

Manual / agentic (not npm): one dry-run read of INTENTS recipes; no live `gh`/`az` mutation required for merge of this feature.

## 6. Invariants (Do Not Violate)

From `config.json.invariants` and harness MEMORY (Medium+):

| Invariant | Rule |
|-----------|------|
| `commitPlanFilesOnlyAtStep8` | true. Do not `git add` `{plansDir}` until Step 8 delivery. Never `git add -A`. |
| `skipQualityGates` | false. Do not bypass harness/test gates for this work. |
| EF / tenancy sample keys | false / N/A. Do not add EF/tenancy scaffolding. |
| Portable SCM | `providers.scm` github \| azure-devops; active may be local. No silent provider fallback. New intents on **both** implementers + Required intents row (allowlist empty). |
| Language | en-us in skill bodies, gates, banners. |
| No host product names | Skill prose uses `user-gate`, `dispatch-agent`, path tokens. |
| Author local SoT only | `$PWD/.agents/skills/ws-*`. Never write `{globalSkillsRoot}`. |
| Dogfood contract | Root `AGENTS.md` § Upstream session contract. Do not add a packaged extra `SKILL.md` for dogfood. |
| MEMORY consult | Missing `MEMORY.md` is not fatal (exit 0 consult-skipped). Do not map that to HS-5. |
| Audit / plan JSON | Repo-relative posix paths only; no `L:\` / `C:\` in committed JSON. |
| Integrity | After hashed skill content: `npm run generate-integrity` && `npm run verify-integrity`. |
| Sabotage restore | Failure to restore aborts verification (fail-closed). |
| Verify Advance | Score ≥ 9 already shipped. Missing required sabotage → **< 9**. Do not reintroduce a < 7 cap. |
| Surgical class-fix | Sibling same-defect is in-scope; do not use AC3 as license for unrelated refactors. |
| Config path | Scripts use `.agents/skills/ws-shared/config.json` (not retired `shared/`). |
| Shipped HEAD | Do not revert or rewrite `f2a38c6` / `2d89620` except as needed to layer this feature. |

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot / tests / hub contract + tools.md / README + catalog; no installer CLI behavior change unless integrity only).
- [ ] Domain entities and mappings encapsulated. **N/A** (no domain entities).
- [ ] Schema migrations created. **N/A**.
- [ ] Authorization checks applied. **N/A** beyond existing provider `validate-auth`.
- [ ] i18n keys declared. **N/A**.
- [ ] Test cases cover all ACs (section 5), including **extended** `test-provider-parity.js`.
- [ ] GitHub and Azure DevOps parity for new intents and CI log recipes; contract Required intents updated; allowlist empty.
- [ ] `check-pr-status` extended (not a second intent); callers use the intent name.
- [ ] Local tracker: sweep is keyword/git; close-loop skipped when `id` is null.
- [ ] Sabotage helper always restores; abort on restore failure; missing required sabotage → score < 9.
- [ ] README + catalog updated; version bump deferred to ship-PR `build-site:bump`.
- [ ] No edits under `{globalSkillsRoot}`; no absolute paths in new artifacts.
- [ ] `npm run test` exit 0; integrity generate+verify exit 0; `ws-check-harness` 0 critical; `ws-check-workflows` 0 critical if orch changed.
- [ ] Skill bodies remain lean (details in INTENTS.md / scripts); en-us; no host product names.

## 8. Open Questions

None remaining. Round 1 closed every §8 item from project evidence (see Interview registry). `softSkipEligible` was false; interview still ran; no `needs_user`.

**Not blockers (unchanged):** mutation-framework install (explicitly out of scope); lite sabotage (A10); permissions/tenancy/i18n; re-planning verify-bar-9 or the initial SCM contract.

**Resolved from user-supplied plan (do not re-litigate):** target skills list; SCM parity; orch dispatch file set; sabotage when `mutationTest` unset; expand existing sibling wording rather than add a new skill. **Overridden from user-supplied:** sabotage is fail-closed `< 9`, not a bonus score; README/catalog required now; AC5 extends `check-pr-status`; new intents also land in `scm-provider-contract.md` + `test-provider-parity.js`.

## Interview registry

| id | class | section | gap | status | resolution | resolutionSource | evidence | dependsOn |
|----|-------|---------|-----|--------|------------|------------------|----------|-----------|
| G1 | blocking | S8 / A6 | Plan "score cap below 7" is stale vs shipped ≥ 9 gate | closed | Missing required sabotage fail-closes as overall score **< 9**; do not change shipped Advance ≥ 9; not a bonus point | project | `{sharedDir}/gates.md` Check-implementation; `ws-spec-to-pr/STEP-DISPATCH.md` Step 5; `ws-verify-plan` already caps fable REFUTED at < 9; `post-bootstrap-commits.md`; HEAD `2d89620` (`f2a38c6`) | |
| G2 | blocking | §2 / S1 / S10 / S13 | New intents missing from contract Required intents; allowlist empty; parity test hardcodes 7 | closed | Add `sweep-prior-work` and `comment-issue` to both implementers **and** Required intents in the same change; extend `test/test-provider-parity.js` (`>= 9` + hardcoded ids) | project | `{sharedDir}/scm-provider-contract.md` § Adding an intent / empty allowlist; `test/test-provider-parity.js` required list; `post-bootstrap-commits.md` | |
| G3 | blocking | S9 / AC5 | Risk of a parallel unused CI-triage intent | closed | **Extend** existing `check-pr-status` (INTENTS + contract guarantee) and caller discipline; no new intent id | project | GitHub/ADO INTENTS `check-pr-status` are status-only today; contract already requires the id; AC5 + `post-bootstrap-commits.md` | |
| G4 | blocking | S14 / §8 Q6 | README/catalog treated as optional until ship | closed | README + catalog **required** this feature (harness change protocol). Version bump stays ship-PR `build-site:bump` | project | Root `AGENTS.md` § Harness change protocol; `2d89620` docs/site commit; `post-bootstrap-commits.md` | |
| G5 | non-blocking | §8 Q1 / A5 | Sabotage restore: stash vs worktree vs byte copy | closed | A5: temp byte copy + `git restore` fallback. No stash; no worktree | project | `config.json` `plans.useWorktrees: false` | |
| G6 | non-blocking | §8 Q2 / A7 | Close-loop on create vs merge | closed | Comment on create when tracker id present; merge follow-up only if merge actually runs (`stopBeforeFixPr` → create-only at Step 8) | project | `ws-ship-pr/SKILL.md` `stopBeforeFixPr`; `gates.md` Combined delivery + Fix-PR; AC6 "creation and/or merge" | |
| G7 | non-blocking | §8 Q3 / A8 | ADO comment API: WIT vs PR discussion | closed | WIT Comments `api-version=7.1` on the work item (tracker analog). Not PR threads | project | `ado-workitem-to-spec.py` / ADO INTENTS already use `api-version=7.1`; spec AC6 "tracker issue" | |
| G8 | non-blocking | §8 Q4 / A1 | Duplicate open PR: record-only vs user-gate | closed | Always record in Prior Work Sweep. Exact open PR for the **same tracker id** → `user-gate` (Recommended: stop/reuse). Else continue | project | AC1 "recording findings"; user-supplied plan "logging findings"; `create-pr` already reuses open head→base | |
| G9 | non-blocking | §8 Q5 / S7 | Script-invented invert vs agent patch | closed | Agent writes invert patch file; script apply/run/restore only | project | `SKILL_AUTHORING.md` deterministic tool-first scripts | |
| G10 | non-blocking | tools.md / S9 | `check-pr-status` missing from tools.md aliases | closed | Add `check-pr-status` to Source control tools alongside new aliases | project | `{sharedDir}/tools.md` lists `create-pr` / threads / merge but not `check-pr-status`; contract already requires it | G3 |
| G11 | non-blocking | S13 | Hermes-only tests would miss parity allowlist failures | closed | Extend `test-provider-parity.js`; keep a hermes-specific file for sabotage/wiring/docs | project | `test/test-provider-parity.js` union/allowlist loop; `post-bootstrap-commits.md` | G2 |
| G12 | non-blocking | A11 | `comment-issue` vs `close-loop` as two required ids | closed | Canonical id `comment-issue`; `close-loop` is tools.md/prose alias (one INTENTS heading) | project | Parity test matches first-column backticks + `## \`id\`` headings; spec wording is singular "intent" | G2 |
| G13 | non-blocking | out of scope | Do not re-plan verify-bar-9 or initial SCM contract | closed | Layer this feature on HEAD `2d89620`; out of scope to re-implement those commits | project | `post-bootstrap-commits.md`; Dual-mode already documents contract + ≥ 9 | G1 |
| G14 | non-blocking | A10 | Lite sabotage | closed | Sabotage remains standard-only; lite inherits shared skill changes | project | Lite has no Step 5/7; classify.md recommended standard | |
