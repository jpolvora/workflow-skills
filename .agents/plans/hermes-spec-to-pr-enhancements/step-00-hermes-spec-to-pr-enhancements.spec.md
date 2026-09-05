---
id: null
slug: hermes-spec-to-pr-enhancements
title: "Hermes Agent Inspirations: ws-spec-to-pr Ecosystem Enhancements"
source: local
specDate: 2026-08-21
step: 0
workflowId: hermes-spec-to-pr-enhancements-20260905T015600Z
status: active
startedAt: "2026-09-05T01:56:00Z"
endedAt: "2026-09-05T01:56:42.202Z"
acRefs: []
---
# Specification — Hermes Agent Inspirations: ws-spec-to-pr Ecosystem Enhancements

## Description

This specification defines systemic enhancements to the `ws-spec-to-pr` pipeline and companion skills in `workflow-skills`, adopting proven agentic software engineering disciplines from NousResearch's Hermes Agent (`github-issue-to-pr`).

The goal is to increase end-to-end automation reliability, eliminate wasted or duplicate effort, prevent regressions that violate intentional design, ensure defect classes are fixed holistically across sibling call sites, prove regression test validity through sabotage verification (fault injection), distinguish CI infrastructure flakes from diff-introduced failures, and close the communication loop on tracking issues.

All enhancements adhere to the portable, SCM-neutral harness architecture (supporting GitHub, Azure DevOps, and Local providers without host-specific coupling).

## Acceptance Criteria

- AC1: **Pre-flight Duplicate & Prior Work Sweep (Step 0 & SCM Providers)**: Add `sweep-prior-work` capability to `ws-github-provider`, `ws-azure-devops-provider`, and Step 0 intake in `ws-spec-to-pr` / `ws-write-spec`. Before authoring plans or code, the agent searches open/merged PRs (by issue number and keyword variants) and recent git commits to verify if the issue or symptom was already addressed, recording findings in `step-00` context.
- AC2: **Design Intent & Historical Commit Inspection (Step 0/1 & Spec/Plan)**: Enhance `ws-write-spec`, `ws-spec-format`, and `ws-write-plan` with mandatory checks for code modification tasks: agents must inspect historical commit intent (`git log -p -S "<symbol>"` or `git log -L`) on target functions/files to confirm that the reported "bug" or missing behavior is not an intentional architectural restriction or design choice before formulating changes.
- AC3: **Defect Class & Sibling Call Site Remediation (Step 4 & Step 6)**: Update `ws-implement-tasks` and `ws-code-review` with a "Fix the Entire Defect Class" rule. When fixing a bug or applying a pattern, the coder and reviewer agents must search sibling call sites and modules for the same pattern/vulnerability and either fix the full class or explicitly justify exemptions.
- AC4: **Zero-Dependency Sabotage Verification / Fault Injection Proof (Step 5 & Step 7)**: Enhance `ws-verify-plan` and `ws-testing` with a built-in sabotage verification protocol for bug fixes and regression tests. The verifier validates that newly added test assertions fail when the fix is temporarily disabled or inverted (sabotage run) and pass when restored, ensuring tests truly bite without requiring external mutation testing binaries.
- AC5: **CI Baseline vs Diff Failure Triage (Step 8 & Step 9)**: Update `ws-ship-pr`, `ws-fix-pr`, and `ws-goal-fix-pr` with CI failure triage discipline: inspect detailed failure logs (`gh pr checks` / `gh run view --log-failed`), reproduce suspected baseline failures against the default branch, allow a single rerun for confirmed infrastructure flakes, and isolate genuine diff regressions for targeted fixes.
- AC6: **Issue Tracker Close-Loop Reporting (Step 8/9 & Providers)**: Add `comment-issue` / `close-loop` intent to SCM providers (`ws-github-provider`, `ws-azure-devops-provider`) and dispatch it in `ws-ship-pr` upon PR creation and/or merge. Posts a concise traceable resolution comment linking the PR and summary back to the original tracker issue.

## Original Issue Context

Derived from analysis and benchmarking against NousResearch Hermes Agent (`skills/github/github-issue-to-pr/SKILL.md`):
- Source URL: `https://github.com/NousResearch/hermes-agent/blob/main/skills/github/github-issue-to-pr/SKILL.md`
- Core inspirations: Live issue reading with full comment threads, duplicate PR sweep, premise & design intent validation via git history, class-level fixes across sibling call sites, sabotage runs to prove regression tests bite, honest CI shepherding with baseline flake isolation, and closing the loop by commenting on the issue.

### Prior Work Sweep

Recorded at Step 0 intake (`search_plan_history.cjs` + `git log`, 2026-09-05; `source: local`, keyword + git-log path only).

- Prior merged implementation exists in history: `c4d83526` feat(hermes-spec-to-pr-enhancements): verified implementation (2026-08-21), `628fc879` code-review fixes, `97d6a7d4` delivery artifacts. Both intents (`sweep-prior-work`, `comment-issue`) already present on both providers; `run_sabotage.py` exists; sibling/sabotage language partially wired.
- No open PR duplicates this tracker id (`id: null`, local source) — per plan A1, record and continue. This run implements the remaining gaps against the refined plan (contract `check-pr-status` extension, dispatch wiring, tests, docs).
- Compat validation (`validate_spec.cjs --mode=compat`, exit 1): 4 closure-section WARNs (pre-closure spec, allowed) + 2 `composite-ac` errors (AC2, AC4 > 60 words). AC text unchanged by intake — splitting would renumber the contract of record.

## Notes

- **Portability:** All additions must remain provider-agnostic (`providers.scm` in `config.json`), keeping GitHub and Azure DevOps parity where applicable.
- **Fail-closed & Safety:** Sabotage runs must always restore the working tree cleanly; failure to restore aborts the verification step with a clean reset.
- **Harness Compliance:** Changes to skill bodies must follow `SKILL_AUTHORING.md`, keep en-us language, maintain integrity hashes via `npm run generate-integrity`, and pass `npm run test` and `ws-check-harness`.
