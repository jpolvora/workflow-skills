---
slug: us-347
title: Plan interview — ws-goal-fix-pr as orchestrator with per-round subagent dispatch
status: completed
step: 2
workflowId: us-347-20260918T194831Z
verdict: approve-with-findings
blocking_open: 0
shared_understanding: confirmed
startedAt: "2026-09-18T19:48:31Z"
endedAt: "2026-09-18T19:58:46.924Z"
acRefs: []
---
# Step 2 Plan Interview — us-347

**Plan audited:** `.agents/plans/us-347/step-01-us-347.plan.md`
**Spec:** `.agents/plans/us-347/step-00-us-347.spec.md` (8 ACs, DoR, NS1–NS5)
**Verdict:** `approve-with-findings` — plan covers all 8 ACs + DoR with an adequate Section 6; 7 non-blocking findings below are consumed by Step 3+ as implementation constraints. No plan rewrite, no escalation (autoMode).

## Coverage summary

| AC / DoR | Plan coverage | Assessment |
|----------|---------------|------------|
| AC1 session owns loop | §1, §3 step 2, §5 `sessionOwnsLoopInline` | Covered |
| AC2 fresh worker + gate-only | §1, §3 steps 1–2, §5 `freshWorkerPerRound` + `gateBeforeMutation` | Covered with wording ambiguity (F1) |
| AC3 model chains, no numeric 9, rejection retry | §1, §3 step 2, §5 `fixPrPlanChain` / `fixPrExecChain` / `noNumericNine` / `modelRejectionFallback` | Covered; normative source pinned (F3) |
| AC4 ordered telemetry, no finish from internal | §1, §3 step 2, §5 `orderedDispatchEvents` / `noFinishFromInternal` | Covered; field contract tightened (F4) |
| AC5 Tier 3 fallback | §1, §3 step 2, §5 `tier3Fallback`, §6 Tier 3 contract checks | Covered; matches `host-dispatch.md` Tier 3 |
| AC6 guards preserved | §1, §3 step 3, §5 `guardsPreserved` | Covered; dry-run granularity (F5), NS3/NS4 naming (F6) |
| AC7 semantics preserved | §1, §3 step 3, §5 `semanticsPreserved` | Covered; verify/learn ownership clarified (F2) |
| AC8 tests green + integrity | §1, §3 steps 4–6, §5 table, §7 checklist | Covered |
| DoR bounded scope | §2 layers + §3 touch lists match spec touch list | Covered |
| DoR atomic criteria | §5 maps AC1–AC8 + NS1–NS5 to named assertions | Covered |
| DoR failure modes | NS1–NS5 mapped in §5 | Covered (F5/F6 tighten) |
| DoR observation telemetry | Dispatch events + gate files + round reports named | Covered (F4) |
| DoR zero open blockers | §8 none blocking; Assumptions confirmed in spec | Covered |
| DoR harness neutrality | §6 checks + §5 `harnessNeutrality` (NS5) | Covered |
| Section 6 invariants | N/A rationales + operative harness-neutrality boundary | Adequate for `node-skills-package` |

## Interview registry

| id | class | section | gap | recommendation | status | resolutionSource | evidence |
|----|-------|---------|-----|----------------|--------|------------------|----------|
| F1 | scope-wording | §1 AC2 | Spec AC2 says "never reused across rounds or across plan/fix substeps", which literally reads as per-substep workers, while the Assumptions table (confirmed y) pins one batch worker running the ordered pair. The plan follows Assumptions but does not name the reading. | Step 4 skill text must state the batch-worker reading explicitly: one fresh worker per round batch runs the ordered `fixPrPlan` → `fixPrExec` pair; that worker is never reused for another round or substep instance. Tests assert batch-worker (one worker per round, ordered pair inside), not two dispatches per round. | closed | project | Spec Assumptions table (batch worker, confirmed y) + Description caller-visible contract (fresh-worker-per-round) |
| F2 | design-ownership | §2/§3 | Under dispatch, ownership of per-round verify (goal Step 4), post-round learning (goal Step 5), and fix-pr-internal verify/learn/resolve/push (ws-fix-pr Step 5) is unstated: worker vs session. Risk of double-write or dropped `Learning:` titles. | Default: the worker owns everything inside the ws-fix-pr batch scope (gate, fixes, proactive evidence, verify, round report, resolve, push); the session owns goal-loop steps (initialize, convergence check, heartbeat wait, re-check, pre-merge gate, final report) and never duplicates per-round `Learning:` writes. Step 3+ keeps this split unless ws-fix-pr audit proves otherwise. | closed | assumed-default | ws-fix-pr SKILL.md Steps 4–5 own verify/learn/resolve/push; ws-goal-fix-pr SKILL.md Steps 1–2, 6–8 own loop |
| F3 | chain-normative | §2/§3 step 2 | Plan cites both STEP-DISPATCH.md and ws-fix-pr "Internal model roles" as chain wording, but STEP-DISPATCH prose abbreviates the chain (role → preset role → phase key → session) while the spec + ws-fix-pr table normatively define 5 links (role → preset role → top-level phase key → preset phase key → captured session). | Normative source is the ws-fix-pr table (matches spec AC3 exactly); STEP-DISPATCH is an abbreviated pointer only. Skill-text assertions must assert the 5-link chain per role plus numeric-`"9"` exclusion. | closed | project | ws-fix-pr SKILL.md § Internal model roles table; STEP-DISPATCH.md line 24; spec AC3 |
| F4 | telemetry-fields | §3 step 2 / §5 | Plan names rejection retry + `configuredModel` record and ordered JSONL events, but does not pin the telemetry field contract (event location, `configuredModel` vs actual fields). | Dispatch section must specify ordered `telemetry.jsonl` events per batch carrying actual vs configured models; `modelRejectionFallback` test asserts both fields are recorded on retry, not just continuation. | closed | project | Spec Telemetry (ordered dispatch events with actual vs configured models); ws-fix-pr Internal roles (record actual fallback model) |
| F5 | test-granularity | §5 | `dry-run` zero-mutation guarantee (zero commits/pushes/resolves) is folded into the `guardsPreserved` wording assertion with no named dry-run case, although spec Telemetry explicitly requires zero `git` remote mutations and zero `resolve-thread` calls. | Add a named dry-run assertion (e.g. `dryRunZeroMutation`) covering zero commits/pushes/`resolve-thread` under both dispatch and Tier 3 paths. | closed | project | Spec AC6 + Telemetry dry-run row; ws-fix-pr `dry-run` parameter note |
| F6 | test-granularity | §5 | NS3 (stale-revision loud conflict) and NS4 (gate-before-resolve/push) are folded into `guardsPreserved` without named assertions; NS4 gains a dispatch dimension (fix worker must not resolve/push before complete gate evidence). | Name explicit assertions for stale-revision conflict wording survival and gate-before-resolve/push (both substeps evidenced, same-class hits fixed or recorded skipped) so Step 5 cannot pass on a wording-only review. | closed | assumed-default | Spec NS3/NS4; ws-goal-fix-pr SKILL.md Step 3 Forbidden clause |
| F7 | companions | §3 step 5 | Plan covers integrity + version bump + site rebuild, but does not address skill-eval companions or wiki/doc-page refresh that a skill-body restructure can require. | Step 4/8 confirms whether `ws-goal-fix-pr`/`ws-fix-pr` evals.json or wiki doc pages need hand updates; if so, hand-edit specific files only — never run the bulk eval regenerator (it deletes hand-added cases). Site rebuild already planned stays as-is. | closed | project | Memory 2026-09-18 eval-regenerator-deletes-hand-evals; 2026-09-12 wiki-doc-page-refresh-on-skill-change |

## Findings for Step 3+ (constraints, not plan edits)

1. **F1 — batch-worker reading (scope):** implement and test one fresh worker per round batch running the ordered pair; state it verbatim in the new dispatch section.
2. **F2 — verify/learn ownership (design):** worker owns fix-pr-internal verify/learn/report/resolve/push; session owns loop + final report; no duplicated `Learning:` writes.
3. **F3 — chain normative (design):** follow the ws-fix-pr 5-link table per role; STEP-DISPATCH is a pointer, not the norm.
4. **F4 — telemetry fields (telemetry):** ordered `telemetry.jsonl` events per batch with actual vs configured models; assert on rejection retry.
5. **F5 — dry-run case (tests):** named zero-mutation assertion for both execution paths.
6. **F6 — NS3/NS4 cases (tests):** named stale-revision and gate-before-resolve/push assertions.
7. **F7 — companions (ship):** confirm evals/wiki hand updates at implementation/ship time; no bulk regenerator.

## Memory consult

- Keywords: goal-fix-pr, orchestrator, plan audit, Tier 3.
- Backends: local memory files (`.agents/skills/ws-shared/MEMORY.md` + `memory/*.md`); spec-memo vault integration is enabled in config (`hybrid`) but no vault MCP/CLI consult was available in this dispatch — local files only.
- Hits applied: 2026-09-15 pipeline-dedup-locked-substrings (keep `state.handoffs` + phrase-locked substrings — plan §3 step 1 already cites); 2026-09-09 integrity-after-final-skill-edit (integrity after final edit — plan §3 step 5 already orders correctly); 2026-09-18 sweep-quoters-after-restructure (quoter sweep — plan §3 step 2 already cites); 2026-09-14 fix-pr traps (bare `git add -u`, overlap/inseparable-anchor, staged-WIP — plan §6 already guards); 2026-09-12 portable-prose-no-internal-spec-numbers + dep-edge declaration (plan §6 already guards); 2026-09-18 eval-regenerator (new, F7).
- No `force_interview` memory conflict; no blocking open questions.

## Escalation

None. All gaps resolved via project evidence or sensible defaults in autoMode. `shared_understanding: confirmed`. Next: Step 3 task decomposition consuming this registry.
