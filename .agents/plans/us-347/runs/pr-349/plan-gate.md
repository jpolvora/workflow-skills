# plan-gate.md — PR 349 fix batch 1 (goal Act round 1)

- batchId: us-347-pr349-batch1
- prId: 349
- scope: goal-act-round
- workflowId: us-347-20260918T194831Z
- headSha: a5f0a3a6030c6266eb52ece134ef2db6bb3c6573
- plannedAt: 2026-09-18T20:54:40Z
- activeThreadIds: [PRRT_kwDOTFajc86j4_HF, PRRT_kwDOTFajc86j4_Hs]
- status: executed
- executedAt: 2026-09-18T20:54:40Z
- handoffValidation: batchId/prId match; activeThreadIds re-collected identical; headSha == HEAD at exec start (a5f0a3a6); telemetry fixPrPlan → fixPrExec emitted in order (model muse-spark both roles)
- roles: fixPrPlan=reviewerModel→muse-spark (captured session); fixPrExec=executionModel→muse-spark (captured session)
- gateApproval: goal-auto-approved (ws-goal-fix-pr overrides active; Act round proceeds after gate exists)

## Outer preflight (recorded)

- preExistingDirty (tracked M): .agents/plans/index.json, .agents/plans/us-347/step-00-us-347.spec.md, .agents/skills/ws-shared/CHANGELOG.md, .agents/skills/ws-shared/MEMORY.md (+ untracked workflow runs/specs/memory; full list in worker notes, kept on disk, never staged)
- Remote sync: `git fetch origin develop` ok; `git diff --name-only HEAD..FETCH_HEAD` empty → no pull needed, no overlap, no stash
- Provider: scm=github; `gh auth status` pass; thread I/O token via `gh auth token` → GH_TOKEN export
- PR: jpolvora/workflow-skills #349 `feat(us-347): ws-goal-fix-pr orchestrator dispatch`, develop→main, head a5f0a3a6 == local HEAD

## Failed-check triage

- `gh pr checks 349`: test pass x2; review **fail** (run 35393094709: "PR has 2 unresolved review thread(s). Resolve them before merging.")
- Classification: **diff-regression** — the review gate fails solely on the 2 active threads, both anchored on lines this PR changed (ws-goal-fix-pr/SKILL.md L97, L104). Not baseline, not infra-flake → no rerun; resolving both threads clears the check.

## Thread scores (worker triage per ws-fix-pr scoring)

### 1. PRRT_kwDOTFajc86j4_HF — SKILL.md L97, lite-carve-out claim

- score: 7
- proposedAction: fix-code — ADD a Lite/inline carve-out bullet to `## Round-batch dispatch` in `.agents/skills/ws-goal-fix-pr/SKILL.md`, immediately after the Fresh-worker bullet; never replace or reword that bullet.
- premiseVerification (done in fixPrPlan, evidence read before scoring):
  - TRUE: lite Step 5 invokes ws-goal-fix-pr — `.agents/skills/ws-spec-to-pr-lite/SKILL.md` L48 Step 5 row lists `ws-goal-fix-pr / ws-fix-pr` with exit criterion "then execute inline ... ignore role model switches".
  - TRUE: lite is inline-only — lite SKILL.md Invariant 2 (L28, "no subagent dispatch"), L32 ("dispatches no dispatch-agent subagents ... Do not read or apply ... fixPrPlan, fixPrExec"), tools.md L133 ("ignores every role key including fixPrPlan/fixPrExec").
  - TRUE: ws-fix-pr already carves out lite Step 5 — ws-fix-pr/SKILL.md L59 ("lite Step 5, run the same two phases sequentially inline under currentModel; lite ignores both role keys and does not add internal role telemetry").
  - GAP CONFIRMED: ws-goal-fix-pr `## Round-batch dispatch` (L93–105) has no lite carve-out; Fresh-worker bullet is unconditional. A lite run on a subagent-capable host would dispatch per-round workers + role models, violating lite Invariant 2.
- phraseLockConstraint: `test/test-goal-fix-pr-orchestrator-dispatch.js` AC2 asserts the Fresh-worker sentence verbatim (`one fresh worker per round batch runs the ordered ... pair inside that worker; that worker is never reused...`) — the fix MUST add a bullet, never edit that bullet. New bullet must avoid NS5 forbidden product/tool-id terms.
- newBulletIntent: "Lite / inline posture: when the caller is ws-spec-to-pr-lite Step 5 (or any inline-only run), do not dispatch a batch worker and ignore both role model keys; run the ordered fixPrPlan → fixPrExec pair inline on the captured session model with identical gate/learning contracts and no internal role telemetry, matching ws-fix-pr § Internal model roles and the lite inline contract."
- defectClass: dispatch contract omits lite/inline carve-out (unconditional fresh-worker dispatch contradicts lite inline-only invariant)
- sourcesConsulted: code (skills-tree grep: anchor-only hits for both patterns; STEP-DISPATCH + AGENTS.md + Subagent-contract rows reviewed), memory-files (MEMORY.md grep + self_learning --match-paths; folded quoter-sweep + locked-substrings + no-spec-numbers traps), spec-memo (vault search, zero hits — miss, not fatal), context (sibling thread Hs; no prior PR-349 round reports — advisory absent; check-pr-status failed log = same 2-thread pattern), patterns (test-goal-fix-pr-orchestrator-dispatch.js AC2/AC5/NS5 locks honored)
- proactiveFixed: .agents/skills/ws-goal-fix-pr/SKILL.md Subagent-contract row (L109 summary quoter) — added lock-safe parenthetical scoping fresh-worker dispatch to the standard path and pointing lite/inline runs at Round-batch dispatch; AC1 locked sentence preserved verbatim
- proactiveSkipped:
  - .agents/skills/ws-spec-to-pr/STEP-DISPATCH.md model-switching prose — standard-orch only, lite never reads it (lite SKILL.md forbids STEP-DISPATCH step numbers); AC3 sanctions it as abbreviated pointer, no carve-out needed
  - docs/index.html + docs/wiki + FEATURES.md + README.md fixPrPlan mentions — role-routing references, not dispatch-contract quoters; no rename/removal made, nothing stale
- amendments:
  - timestamp: 2026-09-18T20:54:40Z
    threadId: PRRT_kwDOTFajc86j4_HF
    newFact: proactive quoter sweep found a same-file summary quoter restating unconditional dispatch — Subagent contract row (L109) "every Act round batch runs in a fresh worker via dispatch-agent" with no lite qualifier.
    previousAction: add Lite/inline carve-out bullet in Round-batch dispatch only.
    revisedAction: additionally add a lock-safe parenthetical to the L109 summary row pointing lite/inline runs at Round-batch dispatch; AC1 locked sentence untouched.
    rationale: same defect class (dispatch contract omits lite carve-out) in the same file; MEMORY trap "Restructured contracts need a quoting-file sweep" requires reconciling quoters in the same batch; parenthetical preserves the AC1 phrase lock.
    evidenceSource: code grep (.agents/skills/ws-goal-fix-pr/SKILL.md L109) + local MEMORY trap 2026-09-18-sweep-quoters-after-restructure.md

### 2. PRRT_kwDOTFajc86j4_Hs — SKILL.md L104, tier-ladder claim

- score: 6
- proposedAction: fix-code — surgical reword of the `Tier 3 fallback` bullet trigger in `.agents/skills/ws-goal-fix-pr/SKILL.md` L104 so it no longer misstates the host-dispatch ladder, while preserving every AC5 phrase lock and the spec-AC5 Tier-3-fallback framing. Reject the reviewer's literal "Fallback ladder" diff (it breaks the AC5 test regex and contradicts spec AC5).
- premiseVerification (done in fixPrPlan, evidence read before scoring):
  - TRUE (ladder exists): `host-dispatch.md` §3 — Tier 2 applies when `subagentTool` is none but `backgroundTaskTool` is bound or a CLI runner is configured; Tier 3 only when both aliases are none (L72). tools.md L118–120 restates the same ladder.
  - TRUE (current text over-triggers): L104 "on hosts with no bound subagent tool, run Tier 3" skips Tier 2 for CLI-runner hosts and misstates the cited normative doc.
  - CONSTRAINT (spec): us-347 spec AC5 (`.agents/specs/0095-us-347.spec.md` L27) prescribes "on hosts with no bound subagent tool the skill runs Tier 3 inline-isolated execution per host-dispatch.md" — the reviewer's rename to a Tier 1→2→3 ladder bullet contradicts the spec of record.
  - CONSTRAINT (test): AC5 test regex requires `Tier 3 inline-isolated execution per .*host-dispatch\.md` plus `adopt the step persona, context pointers only, log inline-isolated-step`, `identical gate/learning contracts`, `never a silent change` — the reviewer's diff drops the `per host-dispatch.md` adjacency and fails the suite.
  - RESOLUTION: keep the `Tier 3 fallback` bullet + all locks; narrow only the trigger to "hosts where dispatch-agent cannot dispatch (no bound subagent tool and no CLI/background runner — Tiers 1–2 unavailable per the host-dispatch.md ladder)". Tier 1→2 selection stays in the portable dispatch-agent adapter (tools.md/host-dispatch.md); this bullet names only the terminal Tier 3 fallback. Preserves AC5 intent (documented Tier-3 terminal fallback, never silent) with zero test risk.
- defectClass: fallback bullet over-triggers Tier 3, skipping Tier 2 (misstates the cited host-dispatch ladder)
- sourcesConsulted: code (skills-tree grep: "no bound subagent tool" anchor-only hit; host-dispatch.md §3 + tools.md tier ladder read as evidence), memory-files (same consult as thread 1 — quoter-sweep + locked-substrings traps folded), spec-memo (vault search, zero hits — miss, not fatal), context (sibling thread HF; no prior PR-349 round reports — advisory absent; check-pr-status failed log = same 2-thread pattern), patterns (AC5 test regex + spec AC5 framing preserved; reviewer literal diff rejected — breaks regex adjacency + contradicts spec)
- proactiveFixed: none beyond anchor (anchor-only pattern; no sibling over-trigger hits in tree)
- proactiveSkipped: none (no same-class hits found)
- amendments: []
- fixApplied: Tier 3 bullet trigger narrowed to "hosts where dispatch-agent cannot dispatch (no bound subagent tool and no CLI/background runner — Tiers 1-2 unavailable per the host-dispatch.md ladder)"; Tier 1→2 selection stays in the dispatch-agent adapter; all AC5 locks + dry-run wording intact

## Surgical scope

- Only lines this PR changed: `.agents/skills/ws-goal-fix-pr/SKILL.md` `## Round-batch dispatch` bullets (add one bullet; reword one bullet trigger). Plus harness-required integrity regen if SKILL.md is hash-covered (same commit, `npm run generate-integrity` + verify).
- Forbidden in batch: `git stash`, `git add -A`/bare `-u`/directory adds, staging `preExistingDirty` or `{plansDir}` paths, `resolve-thread` before verify+proactive evidence, `finish --step 9` (telemetry only for internal roles).
