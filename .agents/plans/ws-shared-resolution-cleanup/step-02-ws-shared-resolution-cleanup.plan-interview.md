---
slug: ws-shared-resolution-cleanup
title: .ws resolution vs ws-shared folders cleanup — plan interview
status: completed
step: 2
workflowId: ws-shared-resolution-cleanup-20260919T210648Z
planPath: .agents/plans/ws-shared-resolution-cleanup/step-01-ws-shared-resolution-cleanup.plan.md
specPath: .agents/plans/ws-shared-resolution-cleanup/step-00-ws-shared-resolution-cleanup.spec.md
refinedPlan: .agents/plans/ws-shared-resolution-cleanup/step-02-ws-shared-resolution-cleanup.plan.refined.md
autoMode: true
round: 1
blocking_open: 0
shared_understanding: confirmed
startedAt: "2026-09-19T21:06:48Z"
endedAt: "2026-09-19T21:12:12.143Z"
acRefs: []
---
# Step 2 — Plan interview (ws-shared-resolution-cleanup)

Audit of `step-01-ws-shared-resolution-cleanup.plan.md` sections 0–8 against the
Step 0 spec (AC1–AC5, NS1–NS3, DoR), project evidence, and the Section 6
Stack & Security Invariants Verification Plan. `autoMode: true` — all gaps
resolved without prompting, per the interview skill Escalate/auto-fallback rule.

Spec has no `## Visual References` — no image reads required.

## Audit summary (sections 0–8)

- §0–§1: scope, business rules D1–D7, AC1–AC5, NS1–NS3, out-of-scope all trace
  to the spec. DoR items (scope bounded, atomic criteria, failure modes,
  telemetry, zero blockers) satisfied.
- §2: layers match `.ws/config.json` stack `node-skills-package`; token-first
  design consistent with `config-resolution.md` path tokens.
- §3: 7 ordered steps, each with a named check. Baseline step is read-only.
- §4: tenancy n/a correctly stated; global-install edit ban restated.
- §5: per-AC checks named. Gaps found in check precision (G1–G3, G7 below).
- §6: stack pack path verified to exist
  (`.agents/skills/ws-shared/runtime/stacks/typescript-node.md`); invariants
  `commitPlanFilesOnlyAtStep8: true`, `skipQualityGates: false`,
  `minVerifyScore: 9` verified present in `.ws/config.json`. Framework
  boundaries assessed (auth n/a, async conditional, validation touched,
  subscription n/a). Review-target list was implicit (G6 below).
- §7: checklist consistent with scope.
- §8: Q1–Q3 open; all resolved below (G4–G5).
- Scenario probes: soft-deletion, concurrency, list sizing, rate limits — all
  n/a with rationale (no data/endpoints/lists/rate-limited calls; single-agent
  ordered pass). Recorded as G7, closed.

## Interview registry

| id | class | section | gap | recommendation | status | resolution | resolutionSource | evidence |
|----|-------|---------|-----|----------------|--------|------------|------------------|----------|
| G1 | blocking | §0/§3-step-2 | AC1 violation class undefined: the 5 named `.ws/config.json` hits in `SKILL.md` (`ws-pre-daily:36`, `ws-senior-developer:20`, `ws-show-harness:26`, `ws-spec-to-pr-lite:34`, `ws-wiki:15`) are entry-gate sentences (`$PWD/.ws/config.json` missing → `user-gate` → `ws-configure-project`), matching the canonical contract — blind rewrite per plan §3 step 2 would damage contract-conformant prose | Define violation-vs-allowlist rule; Step 4 audits each hit before editing | closed | Violation = consumer instruction telling an agent to read/write config at a literal `.ws/config.json` path where token expansion applies (esp. scripts building paths from literals). Allowlist = (a) entry-gate sentences naming the concrete default (`$PWD/.ws/config.json` + `user-gate` pointer), (b) Markdown link targets to the real repo file, (c) `config-resolution.md`'s own canonical-path block. Step 4 records a per-hit verdict table; only violations are rewritten | project | `.agents/skills/ws-shared/runtime/config-resolution.md:10,36-37` (Entry check uses `$PWD/.ws/config.json`); `.agents/skills/ws-check-harness/scripts/check_harness_links.cjs:121` (lookbehind exempts sibling `../ws-shared/` links) |
| G2 | non-blocking | §5-AC1 | AC1 grep gate covers only `SKILL.md`, but identical `.ws/config.json` strings exist in scripts (`ws-ship-pr/scripts/verify.sh:9`, `ws-configure-project/scripts/configure_autoload.py:101`, provider `*.py` help text), docs, and `INTERVIEW.md`/`THRESHOLDS.md` | Keep SKILL.md grep as the AC gate; fold script/help-text hits into the §6 path-safety review | closed | No plan-text change to the AC gate; refined plan §5/§6 maps script path-construction hits to the §6 validation-boundary review (literals as defaults with config-derived override = acceptable; literals as sole resolution = violation) | project | `verify.sh:9`, `configure_autoload.py:101`, provider scripts help text (repo grep) |
| G3 | non-blocking | §5-AC3/AC4 | No explicit red baseline for AC3/AC4 tasks (suite-green only) | Name the existing suites as red baselines: breaking the order/wording fails them | closed | Red baselines: AC3 → `test-local-first-precedence.js`, `test-hybrid-consumer-root.js`, `test-check-harness-install-mode.js`; AC4 → `test-doc-sync.js`, `test-shared-hub-paths.js`. Reintroducing a violation fails the suite — that is the failing-test baseline | project | `test/` listing (all five files present) |
| G4 | blocking | §8-Q2 | Pre-existing dirty `.agents/skills/ws-shared/runtime/config.schema.json` (18 insertions, predates Step 0); plus newly dirty `.agents/plans/index.json` (workflow bookkeeping, appeared during run) | Step 4 diff-review rule: adopt schema diff only if in-scope resolution wording, else exclude; index.json stays orch-owned | closed | Rule recorded in refined plan §3 step 1: `git diff` the schema file in Step 4 — in-scope resolution wording → adopt into baseline, else leave untouched and exclude from `files_touched`/commit. `.agents/plans/index.json` is workflow bookkeeping, never Step 4 product scope | project | `git diff --stat` (18 insertions, 1 deletion); `git status --short` (both paths dirty) |
| G5 | non-blocking | §8-Q1 | AC5 test filename undecided | Default to `test/test-global-config-missing.js` | closed | Default `test/test-global-config-missing.js` per `test/test-*.js` convention. Step 4 may instead extend `test-check-harness-install-mode.js` if the fixture fits; record the choice in Step 4 notes | assumed-default | `test/` naming convention; no existing config-missing fail-closed test found (repo grep for `ws-configure-project` in `test/` shows only entry-gate/configure coverage, e.g. `test-wiki.js:259`) |
| G6 | non-blocking | §6 | §6 names boundary classes but no explicit script review-target list | Add the list to the refined plan | closed | Review targets added: `ws-ship-pr/scripts/verify.sh` (literal default path), `ws-shared/runtime/scripts/resolve_consumer_root.cjs` (+ Python mirror), `ws-configure-project/scripts/configure_autoload.py`, provider `*.py` config reads, any new AC5 test file (awaited promises, `finally` fixture cleanup, arg arrays over interpolated `exec`) | model-inferred | Plan §6 classes + repo script inventory |
| G7 | non-blocking | §3/§5 | Failing-test-baseline rule: AC1 has scratch-probe, AC5 has negative proof (delete hub fixture → pointer), AC2/NS1/NS2 ride the link checker — confirm the mechanism | Confirm NS1/NS2 mechanism, keep probes | closed | NS1 (bare `ws-shared/` shorthand) and NS2 (token in link target) are asserted by `check_harness_links.cjs` (`shorthand` + `tokenInLinkTargets` findings) run via `node test/test-harness-clean.js` Phase 2/4 gate — that suite is the red baseline. AC1 keeps its `/tmp` scratch-probe; AC5 keeps its delete-fixture negative proof | project | `check_harness_links.cjs:72-73,93,121-126`; `test-harness-clean.js:126` (Phase 2/4 gate) |

## Escalation record

No escalation emitted (`autoMode: true` — G1/G4 blocking gaps closed via
project-context sweep + best-judgment defaults; 1 round, cap never reached).

## Shared understanding

`confirmed` — auto-confirmed in autoMode; refined plan carries all resolutions.
Step 4 executes the refined plan; per-hit verdict table (G1) and diff-review
rule (G4) are mandatory Step 4 notes.
