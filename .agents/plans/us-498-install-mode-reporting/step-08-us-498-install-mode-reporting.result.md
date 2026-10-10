---
step: 8
slug: us-498-install-mode-reporting
workflowId: us-498-install-mode-reporting-20261010T070620Z
status: completed
startedAt: "2026-10-10T08:40:00Z"
endedAt: "2026-10-10T08:40:00Z"
acRefs: []
---
# us-498-install-mode-reporting — Delivery Result

## Expected

From the spec (`.agents/skills/../specs/pending/0172-us-498-install-mode-reporting.spec.md`; workflow copy `step-00-us-498-install-mode-reporting.spec.md`) and the refined plan (`step-02-us-498-install-mode-reporting.plan.refined.md`):

- **#494 / AC1–AC12, AC14:** the read-only Phase 0 detector `.agents/skills/ws-check-harness/scripts/detect_install_mode.cjs` must establish directory identity of the resolved local and global skills roots **before** the consumer scope decision, so a coincident tree reports `installScope: "global"` (never `hybrid`), lists `{globalSkillsRoot}` as the only scan root, states the coincidence in an informational note, and omits the hybrid duplicate-`name:` guidance. Distinct roots keep today's matrix; `upstream` keeps short-circuiting; uncanonicalizable roots fall back to their resolved absolute path without throwing.
- **#495 / AC16–AC29:** `globalVersion` must come from `{globalSkillsRoot}/ws-shared/version.json`, then the `packageVersion` projection in `{globalSkillsRoot}/ws-shared/runtime/skill-dependencies.json`, then package-owned `ws-*` frontmatter (representative-id probe order first, then a package-scoped modal fallback excluding `externalSkills`), else honest `null`; every candidate semver-validated; `null` ⇒ `globalVersionDrift` `null`; drift stays an informational note with exit code 0.
- **AC13/AC15:** exit 0 with the documented JSON field set for every scope outcome, and documentation stating that hybrid requires two distinct resolved roots.
- Bounded surface: the detector + its regression suite, plus the `ws-check-harness` detection wording (`SKILL.md` / `PHASES.md`), with integrity regenerated.

## Done

**Implementation (G2-code `13ae5cdc` on `develop`, branched from `b601313a`):**

| File | Change |
|------|--------|
| `.agents/skills/ws-check-harness/scripts/detect_install_mode.cjs` | `canonicalizeForCompare` / `sameRootPath` (reuses the exported `inside()`); `rootsCoincide` before the scope matrix; semver-gated version chain + `externalSkillIds` union; coincidence note; consumer-scope drift note |
| `.agents/skills/ws-check-harness/SKILL.md`, `PHASES.md` | AC15 wording (hybrid requires different resolved roots; global-version source) |
| `test/test-check-harness-install-mode.js` | 11 new fixtures / 68 assertions covering AC1–AC29 and NS1–NS12 |
| `bin/skill-integrity.json` | regenerated for the changed hashed content |

**Verification:** Step 5 check-implementation **score 10/10** (`knownDefect: false`, no deficiencies); Step 6 code review **CLEAN** (0 Critical, 0 Warning, 3 accepted Suggestions — no fix round needed); Step 6b fresh-verify **29/29 ACs pass with pass evidence + a recorded red signal, 0 defects**; Step 7 testing **PASS** (29/29 ACs, 12/12 negative scenarios, 0 uncovered).

**Observed acceptance signals (pre-fix → post-fix):** `--repo-root $HOME` (coincident roots) `installScope: hybrid → global`, `skillsScanRoots: ['.agents/skills','{globalSkillsRoot}'] → ['{globalSkillsRoot}']`, plus the same-directory note; `--repo-root .` `globalVersion: 0.37.1 → 0.5.35` (canonical hub file), drift `ahead → behind`, `warnings: []`.

**Pre-ship board:** version `0.5.37 → 0.5.38` (single bump, `npm run build-site:bump`); integrity regenerated + `verify-integrity` OK (v0.5.38); config schema/example unchanged → desktop config GUI editor sync **not applicable**; `ws-check-harness` Phases 0–5c all exit 0 (`detect_install_mode`, `check_harness_links`, `check_duplicates`, `check_hub_separation`, `check_pipeline_handoff`, `check_shell_quoting`, `check_skill_load`, `check_unique_runtime`, `check_spec_filing`, `check_git_ownership`); `node test/test-harness-clean.js` → 0 findings; `scan_stack_invariants.cjs --stack typescript-node` → 0 issues; docs/site/catalog rebuilt (`docs/index.html`, `docs/wiki` 12 pages).

**Honest alias note:** the configured `backendTest` alias (`npm run test`) exited 1 at entry 44/160 on the known Windows flake `test/test-subagent-dispatch.js` under load; entries 44–160 were re-run individually (116/116 exit 0) and the flaky entry passes standalone on retry. Recorded in the ledger as `exitCode=1, productFailure=false, failingPaths=[test/test-subagent-dispatch.js]` — no product defect, no score cap.

## Next steps

1. **Merge is owned by the batch orchestrator** (`ws-goal-fix-pr` convergence + merge). This run stops after the PR opens; no merge performed here.
2. Review/CI threads on the PR, if any, are handled by the convergence loop — the detector change keeps the link gate and harness self-audit green, so no follow-up defect is expected.
3. **Registered revision (not in this spec's surface):** add a focused `*Test` alias to `config.json.verification` so `ws-fresh-verify`'s `run_fresh_injection.cjs` can name a per-AC failing assertion on a scratch worktree (today it accepts only config-declared aliases, and the sole alias red-lines on integrity inside an inverted worktree).
4. Machine-global install on the reporting host remains `0.5.35`; the detector now reports that truthfully (`behind`). Run the installer `update` to align it (operator action, not a defect).
5. Spec filing: `ws-spec-index sync us-498-install-mode-reporting` files `0172-us-498-install-mode-reporting.spec.md` from `pending/` to `completed/` at close (recorded in the close evidence below).

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 6h 10m 9s (22209s agent execution; includes one host-forced turn boundary during Step 1) |
| Steps executed | 9 (0–8) |
| Total tokens | 0 (not instrumented; estimated: true) |
| Lines added | +459 |
| Lines removed | -20 |
| Net LOC delta | +439 |
| Baseline LOC | 0 (the tracked `src/` / `web/` / `tests/` globs do not exist in this package) |
| Final LOC | 0 (same reason; the product delta is the 4-file diff above) |

## Ship

| Field | Value |
|-------|-------|
| PR | **#501** — https://github.com/jpolvora/workflow-skills/pull/501 (`develop` → `main`) |
| Head SHA | `7c16f68664c778df17714777546ff444504443cf` |
| Ship action | `create-pr` (`fullMode`, `workflowMode: true`, `stopBeforeFixPr: true`) |
| Close loop | `comment-issue` posted on #498 with the PR URL; PR body carries `Closes #498` (`ensure_pr_closer.cjs`) |
| `shipStatus` | `pr-open` |
| Active review threads | 0 (`fetch_threads.cjs 501 --json` → `activeThreads: []`) |
| Required checks | pending at handoff (`review` + 2 × `test` GitHub Actions jobs) |
| Merge | **not performed** — the batch orchestrator owns `ws-goal-fix-pr` convergence and the merge |
| Phase A git cleanup | not run (shipping is not terminal: `pr-open`) |
| Post-convergence retro | `retro | started:.agents/plans/us-498-install-mode-reporting/us-498-install-mode-reporting-20261010T070620Z.retro.md` (auto mode: 3 validated proposals C1-C3, zero prompts, zero writes; artifacts not committed) |
| Telemetry aggregate | `bin/generate-telemetry-aggregate.cjs` → `.agents/plans/telemetry/aggregate.json` (39 workflows) |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | deepseek-v4.1-flash | 30s | 0 | 2 |
| 1 | Planning | deepseek-v4.1-flash | 21709s | 0 | 1 |
| 2 | Interview | deepseek-v4.1-flash | 101s | 0 | 2 |
| 3 | Plan to tasks | deepseek-v4.1-flash | 58s | 0 | 1 |
| 4 | Implement | deepseek-v4.1-flash | 270s | 0 | 10 |
| 5 | Verify | deepseek-v4.1-flash | 41s | 0 | 1 |
| 6 | Code review (+6b fresh verify) | deepseek-v4.1-flash | 0s | 0 | 6 |
| 7 | Testing | deepseek-v4.1-flash | 0s | 0 | 2 |

## References

- Spec: `.agents/plans/us-498-install-mode-reporting/step-00-us-498-install-mode-reporting.spec.md` (source of record `.agents/specs/pending/0172-us-498-install-mode-reporting.spec.md`, GitHub issue #498)
- Plan: `step-02-us-498-install-mode-reporting.plan.refined.md` (interview: `step-02-us-498-install-mode-reporting.plan-interview.md`)
- DAG: `step-03-us-498-install-mode-reporting.plan.exec.md` + `.exec.dag.json`
- Check: `step-05-us-498-install-mode-reporting.plan.report.md`
- Fresh verify: `step-05b-us-498-install-mode-reporting.fresh-verify.md`
- Review: `step-06-us-498-install-mode-reporting.review.md` (round 1, clean)
- Testing: `step-07-us-498-install-mode-reporting.testing.report.md`
- Product commit: `13ae5cdcc6ed651ec35202bb3483ca749c8ab3ac`
