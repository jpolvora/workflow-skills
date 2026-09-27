---
slug: reduce-spec-to-pr-tokens
title: Reduce token usage in spec-to-pr-* workflows via prose compaction and deduplication
step: 2
workflowId: reduce-spec-to-pr-tokens-20260927T043013Z
status: completed
shared_understanding: confirmed
blocking_open: 0
round: 1
source_plan: .agents/plans/reduce-spec-to-pr-tokens/step-01-reduce-spec-to-pr-tokens.plan.md
source_spec: .agents/plans/reduce-spec-to-pr-tokens/step-00-reduce-spec-to-pr-tokens.spec.md
startedAt: "2026-09-27T04:46:31.629Z"
endedAt: "2026-09-27T04:46:31.629Z"
acRefs: []
---
# Step 2 — Plan interview registry (reduce-spec-to-pr-tokens)

Mode: autoMode — sweep-miss blocking gaps closed as model-inferred with explicit rationale.
Outcome: all gaps closed, 0 blocking open, shared understanding confirmed. No spec AC sentences
overridden, so no spec sync was required.

## Audit scope

- Scanned plan sections 0–8 against spec AC1–AC9, DoR, negative scenarios NS1–NS3.
- Audited plan §6 Stack & Security Invariants Verification Plan for touched framework boundaries
  (authorization, async/concurrency, validation/DTO, lifecycle cleanup).
- Ran scenario probes (soft-deletion, concurrency, list sizing, rate limits) — all N/A for this
  docs-only refactor; recorded below.
- Project-context sweep: `test/test-context-budget.js`, `test/test-liveness-checkpoints.js` (D1 block),
  `.agents/skills/ws-spec-to-pr/SKILL.md` (autoMode table + turn-boundary recipes),
  `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` (turn-boundary pause section),
  `.agents/skills/ws-shared/runtime/gates.md` (autoMode gate contract),
  `package.json` (version + integrity scripts), plan-embedded memory constraints.

## Interview registry

| id | class | section | gap | recommendation | status | resolution | resolutionSource | evidence |
|----|-------|---------|-----|----------------|--------|------------|------------------|----------|
| Q1 | blocking | §8 / T06 | Byte-base for AC6 thresholds unspecified (1000- vs 1024-base) | Lock one explicit byte-constant set in the test | closed | Locked 1024-base constants: SKILL.md ≤ 11776 B, STEP-DISPATCH.md ≤ 24064 B, PROTOCOLS.md ≤ 20992 B, lite SKILL.md ≤ 10240 B, combined ≤ 67072 B. Ratio is base-invariant (either base proves ≥30%), so either choice is valid; 1024-base picked because baselines were recorded in bytes via `statSync().size` and the existing budget test already asserts byte-exact constants (18000/14000/24500), never KB floats. Test asserts integer bytes only. | model-inferred | `test/test-context-budget.js:9,40-42` (byte-exact precedent: 18000/14000/24500 B); plan §0 raw baselines 15371/37206/31551/13342 B |
| Q2 | blocking | §8 / T03-T04 | D1-locked phrase inventory lives in the test, not the spec | Grep D1 assertions, retain substrings verbatim | closed | Verbatim inventory (retain exactly; NS2 fails by design on rewording): (1) SKILL.md must match `/Chain host turns:` or `/chains Steps 0/i` — live instance at `SKILL.md:51` ("Chain host turns: orchestrator owns Steps 0→9…"); (2) forbidden substring `does not chain host turns` must appear in NEITHER SKILL.md NOR PROTOCOLS.md; (3) SKILL.md must match `/Host-forced turn end|host forced/i` — live instance at `SKILL.md:55` ("Host-forced turn end only:…"); (4) PROTOCOLS.md must match `/turn[- ]boundary/i` — live instances at `PROTOCOLS.md:266,268,297`; (5) PROTOCOLS.md must contain both `checkpoint` and `pause-turn` — live instances at `PROTOCOLS.md:266-269`. Compaction must move text around these substrings, never reword them. | project | `test/test-liveness-checkpoints.js:340-354` (D1 block); `.agents/skills/ws-spec-to-pr/SKILL.md:51,55`; `.agents/skills/ws-spec-to-pr/PROTOCOLS.md:266-269,297` |
| Q3 | non-blocking | §8 / T03 | PROTOCOLS summary depth per Step 5/6/8/9 undecided (1-line pointer vs 3-line summary+pointer) | Default to leanest form that keeps gates green | closed | Default: 1-line pointer per step (`STEP-DISPATCH.md` for actions, `gates.md` for gate transitions); 3 lines is the ceiling, used only if V7:liveness or V9:run-integrity needs the extra sentence (e.g. a pause-recipe pointer). Rationale: 1-line form maximizes byte savings toward AC6; expansion is measurable at implementation time (budgets either pass or they do not), so no upfront choice of 3-line summaries is needed. | model-inferred | Spec AC3 (remove redundant procedures; depth unfixed); plan T03 already permits "at most 1–3 lines" — refined plan pins 1-line default |
| Q4 | non-blocking | §8 / T00 | Spec baselines (~96.5 KB) differ slightly from observed raw sizes (97470 B) | Name the authoritative measurement | closed | Authoritative: LF-normalized `Buffer.byteLength(fs.readFileSync(f,'utf8').replace(/\r\n?/g,'\n'),'utf8')` computed at implementation time; raw `statSync().size` values are informational only; pass/fail is exclusively the AC6 byte constants from Q1. No behavior choice hinges on the delta (~1 KB, CRLF/LF and rounding noise). | project | `test/test-context-budget.js:38` (established normalization precedent `.replace(/\r\n?/g,'\n')` before `Buffer.byteLength`); plan T00/T06 already specify this normalization |
| S1 | blocking | §6/§7 (missing) | Upstream-ship obligations absent as tasks: skill `.md` files are hashed install content, but the plan names integrity regen only in passing (§6 prose), and omits version bump, full `ws-check-harness`, and site/docs sync | Fold Harness change protocol obligations into the refined plan as an explicit task | closed | Added refined-plan T08 (ship hygiene, runs after T07 green): (a) `npm run generate-integrity` + `npm run verify-integrity` in the same change after skill content is stable; (b) one patch version bump (`package.json` version + aligned `packageVersion` in `bin/skill-dependencies.json` + site footer, strictly above merge-base); (c) full `ws-check-harness` Phases 0–5c + `node test/test-harness-clean.js` 0 findings; (d) site rebuild (`node bin/build-site.js`) + README/FEATURES/hub sync for any changed behavior or CLI surface. Evidence: root AGENTS.md Harness change protocol + `package.json:3,31-32` (version 0.5.2, integrity scripts present). | project | Root `AGENTS.md` § Harness change protocol + § Upstream developer workflow; `package.json:3,31-32` |
| S2 | non-blocking | T07 | T07 runs `check_pipeline_handoff.cjs` (V11) but never the full `ws-check-harness`, so a harness-phase regression (e.g. duplicate-prose detector on the new pointers) could slip past | Cover with T08(c) full-harness gate | closed | Closed via T08(c): full `ws-check-harness` subsumes the `check_pipeline_handoff.cjs` probe; V11 retained as the fast per-edit signal, T08(c) as the pre-ship gate. | project | `.agents/skills/ws-check-harness/scripts/check_pipeline_handoff.cjs:43-55` (pipeline skill list includes `ws-plan-interview`; handoff-pointer edits are harness-checked); root AGENTS.md verification checklist |
| A1 | non-blocking | §2 SoT | AC2 centralization targets (`gates.md`, `tools.md`, PROTOCOLS turn-boundary recipes, ARTIFACTS.md, `git-ownership.md`) assumed present with resolvable anchors | Verify targets exist before pointer edits | closed | Verified: `gates.md` carries the autoMode gate contract (`gates.md:37,43` — auto-select index 0, planning never waived for standard/complex); turn-boundary recipes live in `PROTOCOLS.md:266-269`; `check_pipeline_handoff.cjs` + `measure_harness.cjs` + `check_duplicates.cjs` are the harness probes. Implementer greps each pointer anchor before deleting source paragraphs (V3:pointer-parity); orphan anchors fail T02/T05 by design. | project | `.agents/skills/ws-shared/runtime/gates.md:37,43`; `.agents/skills/ws-spec-to-pr/PROTOCOLS.md:266-269`; `test/test-context-budget.js:49-67` |
| A2 | non-blocking | §5 | Failing-test-baseline rule (interview Step 1: every task needs a red baseline) vs docs-only change with no new unit tests | Confirm negative probes satisfy the rule | closed | Satisfied: NS1 inflate-then-fail probe (T06/V6) is the red baseline for budgets; NS2 D1 fails by design on dropped chaining/pause phrases (V7); NS3 state-validation failure on removed G2-code language (V9). No additional red test required; implementer must observe each probe fail-then-pass during T01–T06, not just final green. | project | Plan §5 NS1–NS3 mappings; `test/test-context-budget.js:59` (duplicate detector precedent for fail-closed probes) |

## Section 6 audit (Stack & Security Invariants Verification Plan)

Plan §6 is adequate for a docs-only refactor and is preserved in the refined plan with T08 appended:

- Stack (`node-skills-package`, Node 22, CommonJS `.cjs`, LF, zero Python): plan authorizes zero
  `.cjs`/`.js` logic edits, zero `bin/` changes, zero new interpreters; `git status` allow-list
  (four skill markdown files + `test/test-context-budget.js`) is now extended by T08-controlled
  generated files only (integrity data, site build output, version-bump lines). Verdict: pass.
- Authorization & endpoint protection: NOT TOUCHED with absence proof (`git diff --name-only`
  contains no `.cjs`/server files; ladder retained as pointer). Verdict: pass.
- Concurrency & async safety: NOT TOUCHED; step-baton/multi-CLI prose stays intact, verified by
  V8/V9 exits 0. Verdict: pass.
- Input validation & DTO boundary: NOT TOUCHED; telemetry/state schemas untouched, verified by V8.
  Verdict: pass.
- Subscription & lifecycle cleanup: NOT TOUCHED; observer contract stays prose-only and opt-in,
  verified by presence checks (never starting a watcher); harness benchmarks stay unloaded per the
  memory-injected `spec-to-pr-no-harness-benchmark` trap. Verdict: pass.
- Hygiene: LF write-back, Node-only, surgical diffs, integrity-after-stable (local MEMORY ordering
  trap) — all retained; T08 makes the ordering enforceable (integrity+version+harness run once,
  after T07 green, not interleaved with prose edits). Verdict: pass with T08.

## Scenario probes

- Soft-deletion: N/A — no records, no delete paths; nothing to probe.
- Concurrency: N/A — no async code or coordinator changes; V8/V9 assert state-contract integrity.
- List sizing: N/A — no lists paginated; the only sizing concern is byte budgets (AC6/V6).
- Rate limits: N/A — no external calls; test suites run locally.

## Memory consult

- Backends queried: plan-embedded memory constraints (vault traps `pipeline-dedup-locked-substrings`,
  `spec-to-pr-no-harness-benchmark`; local MEMORY `2026-09-25-crlf-worktree-edits`,
  `2026-09-22-skill-ship-verify-ordering`) as recorded in step-01 plan §0; direct local-memory file
  reads attempted (`MEMORY.md`, `memory/*.md`) but the files are not present under this workspace
  root, so no additional local hits. No new durable trap: all applicable guidance was already
  injected in the step-01 plan and is preserved verbatim in the refined plan.
- memory_consult: { backends: ["plan-embedded (vault+local via step-01 §0)", "local files (miss — absent under workspace root)"], hits: 4 (via plan), new_traps: 0 }

## AC mapping preservation

All AC1–AC9 and NS1–NS3 mappings from plan §5 are preserved unchanged in the refined plan; T08
adds harness-ship gates without altering any AC→task→verification edge.

## Shared understanding

- shared_understanding: confirmed (autoMode; 0 blocking gaps open; no AC sentence overridden, so no
  spec-of-record / step-00 sync required).
- Learning: N/A (interview-only step; no tool/test/build failures; no new reusable project knowledge
  beyond Q1–Q4 resolutions recorded above).
