---
step: 6
slug: us-347
workflowId: us-347-20260918T194831Z
status: completed
startedAt: "2026-09-18T19:48:31Z"
endedAt: "2026-09-18T20:35:43.308Z"
acRefs: []
---
# Code Review — us-347 (ws-goal-fix-pr as orchestrator with per-round subagent dispatch)

No feedback

## Snapshot

- Base: `main` (== `origin/main`); range `main...HEAD` holds 9 commits, 148 files (`git diff --name-status main...HEAD`, EXIT 0).
- Workflow-owned G2 delta `76268d8a..HEAD`: 2 commits, 61 files — `7440d018 feat(us-347): ws-goal-fix-pr orchestrator dispatch` (60 files) + `1543c3e6 feat(us-347): bump test harness tgz to 0.4.37` (1 file, `test/package.json`).
- Remainder of the range is prior `develop` history outside this workflow (`76268d8a` tracking commit, us-344 delivery, `fix(#346)` rounds, `ws-shared` memory-dir + user-gate changes) — out-of-workflow pre-existing content, discarded in triage (same treatment as the us-344 review precedent).
- G2 breakdown (per-file substantive-line count, version lines excluded):
  - 53 version-only `SKILL.md` bumps (`0.4.36` → `0.4.37`), including `ws-fix-pr` (plan step 1 audit correctly resolved to no-touch).
  - Substantive: `.agents/skills/ws-goal-fix-pr/SKILL.md` (Act round dispatch rewrite + `Round-batch dispatch` section + Subagent contract), new `test/test-goal-fix-pr-orchestrator-dispatch.js` (273 lines), `bin/skill-integrity.json` (regenerated), `bin/skill-dependencies.json` + `ws-shared/runtime/skill-dependencies.json` (`packageVersion` only), `docs/index.html` (badge + footer version strings), `package.json` (version + new-test wiring in `tests` and `tests:remote`), `test/package.json` (tgz pointer `0.4.37`).
- Dirty worktree at review time is plans/tracking/memory/specs only (`index.json`, `us-347/` artifacts, `ws-shared/MEMORY.md` + `memory/`, `.agents/specs/0094-*`) — zero dirty product files, ignored per skill (committed diff is the only snapshot).

## Phase 1 Triage

- Stack: `node-skills-package` (Node 22 skill package). Rule pack loaded: `.agents/skills/ws-shared/runtime/stacks/typescript-node.md` (strict-any, floating promises, boundary validation, injection/path-traversal, resource lifecycle).
- Exclusions applied: `bin/`, `obj/`, `dist/`, `node_modules/`, CI YAML, translations. The two `bin/` manifests are release artifacts verified via `npm run verify-integrity` (EXIT 0) rather than adversarial line scan; no other surviving file falls in exclusions.
- Candidate hypotheses raised and disposed (none survived to Phase 2):
  - H1 mass version bump hides a substantive edit → disproven: per-file diff shows 0 non-version lines in all 53 other skill bodies.
  - H2 `ws-fix-pr` L57 fallback wording ("record the actual fallback model") weaker than goal-fix-pr L102 ("record `configuredModel` vs actual") → untouched pre-existing code (version-only diff); discarded per skill. Test locks both wordings; no-touch was the plan-gated outcome.
  - H3 `test/package.json` jumps `0.4.35` → `0.4.37` → pointer must match `package.json` `0.4.37` (it does); `pretests` regenerates the tgz. Discarded.
  - H4 eval id 8 ("The round invokes ws-fix-pr once") stale under dispatch → still true at round level (worker invokes once); all four assertions still hold. Discarded; no eval edit needed (F7 hand-confirmed, bulk regenerator never run).
  - H5 STEP-DISPATCH 4-link chain vs normative 5-link chain → disclosed abbreviation ("abbreviated pointer only", F3); numeric-`"9"` exclusion consistent on both sides. Discarded.
  - H6 lite inline posture vs dispatch → Tier 3 fallback covers no-dispatch hosts incl. lite (spec assumption); lite SKILL.md L28/L32/L48 unchanged and consistent. Discarded.
  - H7 learning ownership vs `ws-self-learning` § Post fix-pr round → procedure vs ownership, compatible; no contradiction. Discarded.
  - H8 new-test assertions vacuous → checked: verbatim `includes` + tight regexes + resolver fixtures asserting exact model strings, 40 OKs, red-baseline header (chain strings absent pre-rewrite). Effective; no Warning.
  - H9 stack violations in new test → scan 0 issues; sync `fs` on fixed repo-relative paths, no user input, no promises. Discarded.
  - H10 G2 staging holds foreign paths → 61 files all release/feature-scoped; no `plans/`, secrets, or gitignored paths. Discarded.
  - H11 integrity stale → `verify-integrity` OK + `harness-clean` 0 findings. Discarded.
  - H12 MEMORY violations → sweep below; none confirmed. Discarded.

## Phase 2 Adversarial Investigation (4-part Proof of Exploitability)

No hypotheses survived triage, so no 4-part proof was openable. Nothing was retained without Read Evidence + Executable Failure Scenario + Missing Protection + Discards.

## Sibling Generalization

No proven finding exists to generalize. Sibling searches performed over the committed range and beyond (all re-run fresh this review):

- Old Act-round phrasing quoters: `invoke [ws-fix-pr]` → only the new L75 itself ("the worker must invoke", intentional); `invokes ws-fix-pr` → eval id 8 only (still accurate, see H4).
- `ws-fix-pr` quoters (`ws-check-workflows`, `ws-self-learning`, `ws-ship-pr`, providers, lite): reference batch/gate semantics, none quote goal-fix-pr's execution host. No stale copy.
- `ws-goal-fix-pr` quoters + STEP-DISPATCH L24/L155 + lite L48: all consistent with orchestrator + ordered internal pair + outer-owned finish.
- Harness neutrality (own re-run): zero product/tool-id terms in goal-fix-pr + ws-fix-pr bodies; `dispatch-agent` portable alias used.
- Spec-number leak: zero `347`/`us-347`/issue-number hits in the skill diff (portable prose holds).
- Wiki companions: `.agents/specs/wiki/documentation/` holds no goal-fix-pr page — nothing to drift (F7 hand-confirmed).
- No unfixed sibling, no exemption needed.

## MEMORY Sweep

- Backends: local compiled `.agents/skills/ws-shared/MEMORY.md` (read in full, both windows) + root `MEMORY.md` (pointer-only, defers to ws-shared). Keywords: goal-fix-pr, orchestrator, dispatch-agent, neutrality, integrity, quoters.
- Trap mapping, all satisfied, zero violations:
  - Phrase-locked substrings (`state.handoffs`): retained in goal-fix-pr L117.
  - Restructured-contract quoter sweep: swept (evals, STEP-DISPATCH, lite, self-learning, fix-pr quoters); zero residual stale copies.
  - Integrity-after-final-edit: manifest regenerated after final skill edit; `verify-integrity` green.
  - Eval bulk regenerator: no `evals.json` touched, generator never run.
  - Portable prose (no internal spec numbers): clean.
  - Direct `ws-*` dep edges: no new skill invocation (`dispatch-agent` is an alias; `host-dispatch.md`/STEP-DISPATCH are docs); existing `ws-goal-fix-pr → ws-fix-pr` edge covers.
  - Fix-pr staging traps (`preExistingDirty`, path-scoped staging, no bare `git add -u`, inseparable-anchor): `ws-fix-pr` untouched, protections intact.
  - G2 staging scope: workflow `files_touched` only.
- Vault: not queried (review-scope local sweep satisfies the skill's Step 5; Step 5 ran vault search with zero hits).

## Checks Run

- `scan_stack_invariants.cjs --files ws-goal-fix-pr/SKILL.md,test/test-goal-fix-pr-orchestrator-dispatch.js`: `Scanned 2 file(s). Found 0 issue(s) (0 Critical, 0 Warning).` EXIT 0.
- `config.json.invariants`: `commitPlanFilesOnlyAtStep8: true` respected (no `plans/` paths in either G2 commit); EF/tenancy keys `false`/N/A for this Node package.
- Local Reviewer Dry-Run Gate: skipped — `preview.localReviewCommand` is empty and `verification` defines no reviewer runner; nothing configured to execute read-only.
- Fable autoAudit (`fable.enabled: true`, `autoAudit: true`, policy `refuted`): applied `ws-fable-judge` contract.
  - Claims collected: score 10, 8/8 ACs Implemented with file-line evidence, 5/5 negatives covered, new suite 40/40, integrity + harness-clean green, full suite green.
  - Ground truth: `git diff`/`git status` confirm the 61-file G2 delta; every cited evidence line re-anchored in the current bodies (goal-fix-pr L42/L51-52/L62-65/L75/L78/L81/L87/L95/L97/L99-105/L109/L114, ws-fix-pr L48-59); Tier 3 token `inline-isolated-step` verified in `host-dispatch.md` L78; `finish --step 9` occurs only in the two "never" clauses (L103/L114).
  - 4 frauds: Weakened Checks — none (one NEW test file, zero existing-test edits; `package.json` chains extended symmetrically); False Completion — none (ledger-derived score matches re-anchored evidence); Scope Creep — none (all 61 files release/feature-scoped, no drive-by refactors); Unauthorized Action — none (G2 commits are authorized workflow commits; this review made zero product edits and zero commits).
  - Verdict: **VERIFIED** — 0 frauds. No self-learning entry required (VERIFIED produces none).
- Fresh re-runs this review (all EXIT 0): `test-goal-fix-pr-orchestrator-dispatch.js` (40 OK), `test-models-preset-and-per-step.js` (ok), `test-fix-pr-proactive-class-sweep.js` (ok), `npm run verify-integrity` (OK v0.4.37), `test-harness-clean.js` (0 findings). Full `npm run test`: Step-5-observed EXIT 0 on byte-identical content (G2 commits are content-preserving); not re-run by the reviewer to avoid generated-artifact tree dirt — Step 7 re-runs it as its own gate.

### Stack Invariant Compliance

- Authorization & endpoint protection: N/A — no routes, endpoints, or guards; SCM via provider contract only (`list-threads`/`check-pr-status`/`resolve-thread`, never raw `gh`/`az`).
- Concurrency & async safety: N/A — skill-contract prose + sync harness test; scan found zero floating promises.
- Input validation & DTO boundary: N/A — no new inputs, schemas, or config keys; resolution reuses the existing Step 9 chain.
- Subscription & lifecycle cleanup: N/A — no streams, hooks, or subscriptions.
- Config invariants: `commitPlanFilesOnlyAtStep8` honored; no invariant violations linked.
- Harness-neutrality boundary (operative for this change class): portable `dispatch-agent`/`user-gate` aliases only; Tier 3 wording matches the `host-dispatch.md` contract; no host product names or tool ids.
- Checklist status: all applicable checks pass; `No feedback`, clean — Advance permitted (orchestrator owns the fix loop; no fix round required).
