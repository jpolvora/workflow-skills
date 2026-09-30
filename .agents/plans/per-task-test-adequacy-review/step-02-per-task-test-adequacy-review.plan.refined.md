---
slug: per-task-test-adequacy-review
title: Per-task Test Adequacy review in implement
status: completed
step: 2
workflowId: per-task-test-adequacy-review-20260930T081414Z
startedAt: "2026-09-30T08:14:18.000Z"
acRefs: []
refines: step-01-per-task-test-adequacy-review.plan.md
interview: step-02-per-task-test-adequacy-review.plan-interview.md
endedAt: "2026-09-30T08:25:35.703Z"
---
## 0. Summary & Business Rules

Add a per-task Test Adequacy review inside `ws-implement-tasks` build mode, executed after the TDD cycle per task and before the step handoff. For every task the review asserts a three-way binding: each task AC maps to at least one test with file:line evidence, each mapped test passes a non-shallow litmus (its key assertion is shown to fail under a wrong implementation via a targeted inversion or a documented wrong-code run), and every test the task added maps back to a requirement (no orphan tests). Tasks failing adequacy return to the TDD cycle within the existing fix bounds; adequacy results ride the step-output evidence to Step 5, where the ledger-derived score observes them.

Business rules carried from the spec:

- The litmus is per task, not per assertion: one wrong-implementation run per mapped test is enough; reviewers must not demand combinatorial inversion.
- Documented wrong-code runs (stash the fix, run the test, restore) are acceptable litmus evidence where the sabotage helper does not apply.
- Assertions that pass on unmodified code (false-positive hazard) are inadequate without requiring a full litmus run.
- Inadequate tasks re-enter the TDD cycle; the escape hatch is the existing workflow-level refine/fix bounds (max 3 rounds, then Pause) — no new loop budget.
- Only tests the workflow adds or modifies are reviewed; untouched legacy tests are out of scope.

## 1. Definition of Ready & Scope

Resolved assumptions (spec Confirmed=y): review placement inside build mode per task before step handoff; litmus form is an inversion run or a documented wrong-code run per mapped test; orphan rule is remove-or-remap before handoff; retry reuses the existing implement retry bound then Pause; evidence channel is step-output plus `ac-ledger.json` links; no auth/rate-limit surface (local test commands only).

Measurable ACs (7): AC1 per-task adequacy record with AC-to-test file:line bindings; AC2 non-shallow litmus per mapped test recorded as an inversion run or documented wrong-code run with test name and exit code; AC3 orphan-test rule (remove or remap before handoff); AC4 adequacy failure returns to the TDD cycle until adequate or the existing retry bound Pause triggers; AC5 adequacy records in step-output evidence and linked into `ac-ledger.json` so Step 5 scores observed adequacy; AC6 false-positive-hazard rejection as inadequate without a full litmus run; AC7 same adequacy review in fix mode for anti-regression tests.

Out of scope: full mutation score per task (Step 7 opt-in battery keeps its own threshold); adequacy review for untouched legacy tests; cross-task test deduplication; lite-specific recipe (lite runs the same implement skill, one recipe covers both).

## 2. Technical Design & Architecture

No new skill. Four product surfaces change, all inside existing ids:

- `ws-implement-tasks/SKILL.md` (recipe): build mode gains a new step 5 **Test Adequacy review** after the TDD cycle (old steps 5-8 renumber to 6-9; the only step-number quoter is internal, `Fix mode step 4`, which is unaffected). The new step runs per task: build the AC-to-test file:line map, run the litmus per mapped test (targeted inversion via `node {skillsRoot}/ws-testing/scripts/run_sabotage.cjs` with a caller-authored invert patch, or a documented wrong-code run recording test name + exit code), enforce the orphan rule, reject false-positive hazards without a litmus run, and validate the record with the new helper before handoff. Inadequate tasks re-enter the TDD cycle; the bound is the existing workflow-level refine/fix escape hatch. Fix mode step 5 (Anti-regression test) gains the same adequacy review for each anti-regression test (binding to finding-derived AC, litmus, orphan check). The `step-output` YAML gains an `adequacy:` evidence block (per-task record verdicts); guardrails gain one line (no handoff with an inadequate or missing adequacy record).
- `ws-implement-tasks/scripts/check_test_adequacy.cjs` (new deterministic helper, first script under this skill): validates one adequacy record JSON (`--record <path>`, optional `--emit-record <out>` for the canonical form). Fail-closed rules: every listed AC has >=1 binding whose file:line exists and names the test; every binding has a litmus entry (`inversion-run` or `wrong-code-run`) with a recorded non-zero exit code plus evidence text naming the test; every added test is mapped (binding or remap target) else it is an orphan; any test listed under `falsePositives` (passed on unmodified code) forces inadequate with the test named and no litmus demanded. Exit 0 adequate (prints verdict JSON), exit 1 inadequate with named gaps, exit 2 usage. Stdlib only; repo-root resolution mirrors the `run_sabotage.cjs` HUB header (G6); dashed flags normalized to camelCase; unknown flags fail loudly.
- `ws-spec-to-pr/scripts/ac_ledger.cjs` (adequacy link verb + score rule): `link` gains `--adequacy-file <path>` (space form only, like every other verb; file pointer keeps PowerShell callers safe from inline-JSON stripping). The referenced record is schema-validated and attached as `row.adequacy` on each `--ac` target. `scoreLedger` gains one backward-compatible rule: an AC row carrying `adequacy.status === 'inadequate'` sets `knownDefect` and appends a deficiency naming the AC (caps at 8 through the existing path). AC rows without adequacy score exactly as today, so every existing ledger and scoring test is unaffected. Help text documents the verb.
- `ws-plan-verify/SKILL.md` (consumer note): Step 3 gains one bullet — when AC rows carry adequacy records, the derived score observes adequacy (inadequate adequacy fails closed via `knownDefect`, same as missing sabotage); no verify-code change because `ac_ledger.cjs score` owns the math.

Adequacy record schema (v1, shared by the helper and the ledger verb; G1/G5 refinements applied): `{schemaVersion: 1, taskId, acs: [AC ids], status: adequate|inadequate, bindings: [{ac, test, file, lineStart, lineEnd}], litmus: [{test, kind, exitCode, evidence}], addedTests: [names], orphansRemoved: [{test, action: removed|remapped, target?: ACn|NSn}], falsePositives: [{test, observedOn}], checkedAt}`. Bindings may cite NS ids for negative-scenario tests. One record may cover several ACs of the same task; link with one `--ac` per covered AC to attach it to each row.

Retry-bound interpretation (decided, recorded here per the subagent contract): `ws-implement-tasks` carries no per-task numeric retry counter today, so "the existing implement retry bound" is the established workflow-level escape hatch (Step 5 scoreAndRefine max 3 / Step 6 fix max 3, then Pause with residuals). The recipe states this explicitly; no new counter is introduced.

No `skill-dependencies.json` change: doc-level `node {skillsRoot}/...` invocations carry no edges (precedent: `ws-implement-tasks` already invokes `ac_ledger.cjs` with no entry), and the new helper requires no sibling skill script. No CATALOG/FEATURES/README/AGENTS/site change: no new skill id and no frontmatter description change (precedent: item 0154 footprint). `bin/skill-integrity.json` regenerates after the final product edit.

Design intent (modification ACs): `git log -S "false-positive" -- .agents/skills/ws-implement-tasks/SKILL.md` lands on 73aa9aa2 (TDD-cycle delivery), which introduced the flag as hygiene with no per-task assertion-depth gate; `git log -S adequacy/litmus` shows no prior adequacy record. This is a gap extension, not a bug restore.

Layer edits (config `stack.backend.layers`): `skills-sot` (recipe + helper + ledger verb + verify note) and `tests` (new regression test). No `installer-cli` change.

## 3. Step-by-Step Plan

1. Recipe: build-mode adequacy step. Edit `.agents/skills/ws-implement-tasks/SKILL.md`: insert new step 5 Test Adequacy review (binding map, litmus forms, orphan rule, false-positive rejection, helper invocation, TDD re-entry with the workflow-level bound, ledger link via `--adequacy-file`, step-output evidence); renumber old steps 5-8 to 6-9; keep every phrase-locked substring intact (`failing tests first`, `false-positive`, `--negative`, `Lite orch`, scoring aliases, `format only files this step created or modified`, `stack-invariant-scan: pass | fail`, `Do not drop ACs`, `state.handoffs`, `Visual References`) and keep `Step 5 fail-closes` absent. Red baseline: TDD red-first applies — new regression assertions in step 6 are written against the pre-edit SKILL (missing adequacy prose) and observed failing before this edit lands. Affected files: the SKILL.md. Checks: build_dispatch_context totalBytes stays <= 32000 (measured 10318 pre-change; +3.5 KB fits per G2); check_pipeline_handoff green; no duplicated prose blocks vs sibling skills.
2. Recipe: fix-mode adequacy + step-output evidence. Same SKILL.md: extend fix step 5 with the adequacy review for anti-regression tests; add the `adequacy:` block to the step-output YAML; add the handoff guardrail line. Red baseline: same failing-first rule — AC7 prose assertions fail before, pass after. Affected files: the SKILL.md. Checks: same locked-phrase set; fix-mode step numbers unchanged.
3. Helper: implement `check_test_adequacy.cjs` with `--record/--emit-record/--repo-root/--help`, the fail-closed rules from §2, and exit codes 0/1/2. Red baseline: fixture-driven assertions fail before the helper exists (module missing), pass after. Affected files: `.agents/skills/ws-implement-tasks/scripts/check_test_adequacy.cjs` (new). Checks: dashed-flag normalization; unknown-flag failure; `--help` text; space-form argv only; CRLF-safe file reads; smoke-require of exports.
4. Ledger: `--adequacy-file` link verb + inadequate-adequacy score rule + help text. Red baseline: new-link-verb assertions fail on the unmodified CLI (unknown option path), pass after. Affected files: `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`. Checks: schema validation fail-closed (bad record throws, ledger unchanged); per-AC opt-in (no adequacy rows score byte-identical to before); existing `test-ac-ledger.js` and `test-workflow-state-contract.js` green unmodified.
5. Consumer note: one adequacy bullet in `ws-plan-verify/SKILL.md` Step 3 (observed-adequacy scoring, inadequate fail-closes via knownDefect). Red baseline: prose assertion fails before, passes after. Affected files: the SKILL.md. Checks: locked phrases intact (`negative test`, `negativeScenarios`, `skipReason: baseline-dirty`, `failing paths are enumerated`); no score-math prose (score owns the math).
6. Regression test: write `test/test-per-task-adequacy.js` (§5 mapping) and register it in `test/test-suites.json`. Red baseline: suite fails before product edits (assertions target new behavior), passes after; register last so intermediate runs stay green. Affected files: the test + suites file. Checks: temp fixture repos (mirror the sabotage fixture pattern); no network; side-effect free for `.ws/config.json`.
7. Sweeps + hygiene: quoter sweep for implement step-number references and retired link-verb phrasing (expect zero residual hits); defect-class sibling sweep (repo-wide grep for `adequacy|litmus` collisions in skill prose); integrity regen from a tree holding only this slug's hashed files; full `npm run test`; `ws-check-harness`; `test-harness-clean.js` 0 findings. Checks: digest changed in the commit; no `.py` under skills/`bin/`.

## 4. Permissions, Tenancy & i18n

N/A — agent-harness skill package. No auth surface (the review runs local test commands with no network surface, per spec assumptions), no tenant data (no consumer PII in records; source anonymization applies to specs/commits/PRs), no user-facing strings requiring i18n (en-us skill prose only).

## 5. Test Coverage

`test/test-per-task-adequacy.js` maps each AC to named assertions (helper + ledger + recipe prose):

- AC1: a record mapping each task AC to a covering test with file:line validates adequate; a record missing one AC binding exits 1 naming the AC. Recipe prose carries the binding-map requirement.
- AC2: a mapped test with an `inversion-run` litmus (non-zero exit code + evidence naming the test) validates adequate; `wrong-code-run` kind likewise; a mapped test with no litmus entry exits 1 naming the surviving assertion/test.
- AC3: an added test with no binding and no `orphansRemoved` entry exits 1 naming the orphan; the same test listed as `removed` (or `remapped` to an AC/NS target) validates adequate. Recipe prose carries the remove-or-remap rule.
- AC4: recipe prose requires TDD re-entry on inadequate and names the workflow-level bound + Pause escape hatch (no new counter); helper exit 1 is the re-entry signal.
- AC5: `link --adequacy-file` attaches `row.adequacy` to every `--ac` target; `score` with an `inadequate` adequacy sets knownDefect and caps (deficiency names the AC); `score` with no adequacy rows is byte-identical to pre-change scoring; step-output YAML in the recipe carries the `adequacy:` evidence block.
- AC6: a record listing a test under `falsePositives` exits 1 naming the test even with zero litmus entries; recipe prose rejects pass-on-unmodified-code without a full litmus run.
- AC7: fix-mode recipe prose requires the adequacy review per anti-regression test (binding + litmus + orphan check via the same helper); helper accepts a fix-mode record (`taskId` finding-derived).

Negative scenarios from the spec: pass-on-unmodified-code re-enters TDD instead of done (AC6 test); orphan removed/remapped before handoff, never shipped as-is (AC3 test); surviving key assertion fails adequacy with the assertion named (AC2 test); missing adequacy evidence fails handoff validation (helper exits 1 on a record with empty bindings/litmus; recipe requires the helper run before handoff). Each is a named test block.

## 6. Stack & Security Invariants Verification Plan

Stack: Node 22 skill package (`node-skills-package`); no `{skillsRoot}/ws-shared/runtime/stacks/` rule pack applies (spec Notes). Touched framework boundaries (G3 dispositions): authorization — untouched (local CLI, no identity, no endpoint); concurrency/async — untouched (synchronous `fs`/`spawnSync` only, no floating promises, no cancellation surface); input validation/DTO — the helper validates untrusted record JSON fail-closed (schema check before use; malformed record exits 2/non-zero, never partial-attach) and the ledger verb validates before mutation (ledger unchanged on throw); subscription/lifecycle — untouched (no streams, no listeners, no temp dirs retained).

Applicable harness invariants (verified at implement + review):

- Node-only runtime: the helper is `.cjs`, stdlib + in-repo helpers only, zero npm deps; recipes invoke via `node`.
- CLI hygiene: dashed flags normalized to camelCase keys; unknown flags fail loudly; every documented flag covered by an assertion; space-form argv only (no `--flag=value` branches, so no `=` offset trap).
- EOL safety: read record/fixture files CRLF-tolerant; verify cross-module exports with a smoke require.
- Ledger hygiene: one `link` call per file evidence (`path:Lstart-Lend` on both bounds); space-form `--test` with comma-free names; scoreState boundary matching the next pre-advance; ledger mutations before hash stamping.
- Git ownership: path-scoped staging of this slug's `files_touched` only; no whole-tree verbs; foreign dirty paths untouched; integrity regen only when the tree holds this slug's hashed files alone.
- Secrets: no tokens/PATs/hostnames in recipe, helper, tests, or records (records carry file:line evidence, test names, and exit codes only).
- Portable prose: no internal spec/issue/PR numbers, no host product names in shipped text; en-us.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot + tests only; no installer logic change).
- [ ] Recipe keeps every phrase-locked substring; dispatch-context budget green.
- [ ] Helper exits 0/1/2 per contract with all flags asserted.
- [ ] Ledger change is per-AC opt-in; existing scoring tests green unmodified.
- [ ] Test cases cover all ACs (AC1-AC7 + 4 negative scenarios, named blocks).
- [ ] Quoter + sibling sweeps done with zero residual hits.
- [ ] Integrity regenerated from a clean tree and verified; digest changed in commit.
- [ ] `npm run test`, `ws-check-harness`, `test-harness-clean.js` all green.

## 8. Open Questions

None blocking. Interview registry (step-02 interview, 8 gaps, all closed): (a) multi-AC records via `acs[]` + per-binding `ac`; (b) orphan/remap targets admit NS ids; (c) helper mirrors the sabotage HUB header; (d) per-step red baselines stated; (e) per-boundary §6 dispositions; (f) dispatch budget measured 10318/32000 pre-change; (g) retry bound = existing workflow-level escape hatch, no new counter; (h) fable domain adapters skipped; translate-companion skipped (autoMode, non-blocking).
