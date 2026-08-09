---
name: Audit Recent PRs
overview: "Repair confirmed gaps in the latest five merged PR features, then re-audit PRs #178–#182 against the current `.agents/skills` architecture and latest specifications. Preserve the existing US-183 artifacts and do not commit or push."
todos:
  - id: baseline
    content: "Pin PR #178–#182 diffs and latest authoritative intent while preserving existing US-183 work"
    status: completed
  - id: fix-gaps
    content: Implement confirmed autoload, interview, harness coverage, stale-spec, and CI prerequisite fixes
    status: completed
  - id: verify
    content: Run targeted tests, full package tests, integrity, workflow simulation, harness audit, and diff checks
    status: completed
  - id: reaudit
    content: Perform independent standards/spec re-reviews for all five PRs and fix any clear residual defects
    status: completed
  - id: report
    content: Deliver per-PR functional verdicts, evidence, supersessions, and remaining risks
    status: completed
isProject: false
---

# Fix and Re-audit PRs #178–#182

## Scope and intent baseline
- Pin each merged PR’s first-parent diff and use current authoritative intent, not obsolete historical paths:
  - #182: `.agents/specs/shared-autoload-md.spec.md` and `.agents/specs/autoload-skills-overlap-audit.spec.md`
  - #181: `.agents/plans/agents-skills-as-sot/step-00-agents-skills-as-sot.spec.md` plus current root `AGENTS.md`
  - #180: `.agents/plans/interview-project-context-auto-answer/step-00-interview-project-context-auto-answer.spec.md`
  - #179: current `.agents/skills/ws-check-harness/{SKILL.md,PHASES.md,REPORT-FORMAT.md}`, where PR #181 supersedes `src/skills`
  - #178: `.agents/specs/remove-consumer-agents-md-requirement.spec.md`, interpreted under the current optional root `AGENTS.md` contract
- Keep `.agents/plans/us-183/` and `.agents/specs/us-183.spec.md` intact and outside this audit’s edits.

## Confirmed fixes
- Harden PR #182’s autoload configurator in `.agents/skills/ws-configure-project/scripts/configure_autoload.py`:
  - preserve consumer-customized Always-applied membership and triggers while resolving paths;
  - reject a row whose path points to a different skill ID;
  - detect Windows forward-slash, UNC, and general POSIX author-machine absolute skill paths.
- Extend `test/test-autoload-configure.js` with regression cases for customization preservation, skill/path mismatch, and cross-platform absolute paths.
- Correct PR #180’s fast-exit contract in `.agents/skills/ws-interview/SKILL.md`: `softSkipEligible` may skip escalation, but registered non-blocking gaps still pass through project-context resolution before defaults. Add a focused eval case in `.agents/skills/ws-interview/evals/evals.json`.
- Update PR #178’s completed spec and `.agents/specs/index.PRD` wording to the latest hub model: root `AGENTS.md` is optional/consumer-owned, `.agents/AGENTS.md` is not part of the contract, and `.agents/skills/ws-shared/AGENTS.md` is the consumer hub. Preserve historical plan artifacts as historical evidence rather than rewriting them.
- Add focused current-intent coverage for PR #179’s upstream `.agents/skills` versus consumer local/global scan-root selection. Do not restore superseded `src/skills` behavior.

## Verification and CI restoration
- Keep the secrets-hook functional test strict and make CI provide its declared runtime prerequisite (`ripgrep`) before `npm run tests -- --local`; do not weaken the scanner assertion or fold unrelated US-183 spec work into this audit.
- Regenerate `bin/skill-integrity.json` after hashed skill changes, rebuild the catalog without a release version bump, and run:
  - `node test/test-autoload-configure.js`
  - `npm run test`
  - `npm run verify-integrity`
  - `python -X utf8 .agents/skills/ws-check-workflows/scripts/check_workflows.py`
  - current `ws-check-harness` Phases 0–5c, confirming upstream scan root `.agents/skills` and zero critical findings
  - `git diff --check`

## Post-fix review
- Re-review each PR independently against its fixed merge range and latest intent, separating repository-standard findings from specification findings.
- For each PR report: delivered requirements, functional evidence, superseded requirements, remaining risks, and exact command outcomes.
- Fix any newly discovered clear correctness gap, rerun the affected checks, then provide a five-PR verdict summary. No commit, push, issue update, or PR mutation unless separately requested.