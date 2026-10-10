---
step: 8
slug: us-497-link-integrity
workflowId: us-497-link-integrity-20261010T042722Z
status: completed
startedAt: "2026-10-10T05:15:00Z"
endedAt: "2026-10-10T05:30:00Z"
acRefs: ["AC1", "AC2", "AC3", "AC4", "AC5", "AC6", "AC7", "AC8", "AC9", "AC10", "AC11", "AC12", "AC13", "AC14", "AC15", "AC16", "AC17", "AC18", "AC19", "AC20", "AC21", "AC22", "AC23", "AC24"]
---
# us-497-link-integrity — Delivery Result

## Expected

One link-integrity contract across install scopes: the Phase 5a link gate fails only on links that are
genuinely broken in the layout it audits (issue #496), and the installer never ships a broken link in the
first place (issue #493). Fixing one half must not cancel the other.

- **AC1–AC11 (installer half, #493)** — every bare link target naming a runtime sibling of the shipped
  autoload source is rewritten at install time, including `host-capability-tokens.md`; the
  skills-install-scope autoload emits `runtime/host-capability-tokens.md` while the project-hub autoload
  emits a hub-relative managed-runtime link; a fresh install ships zero unresolvable targets; an absent
  runtime file keeps the fail-closed `{globalSkillsRoot}` token; a non-runtime target is untouched; the
  rewrite is idempotent and `update` converges a stale body; both renderers carry the same registry; the
  shipped source keeps its bare same-directory sibling link.
- **AC12–AC24 (gate half, #496)** — while the resolved install scope is global and the project hub is
  absent, a depth-1 hub binding literal is an informational install-layout note (never a broken link) and
  the absent hub is a warning naming `ws-configure-project`; neither counts toward `total`/`ok`; the hub
  directories come from the resolved consumer context; the tolerance stops at the hub binding level, is
  never a link-text prefix rule, and never absorbs the genuine `#493` break; the upstream package root
  still reports zero findings.

## Done

Three surgical source edits plus regression coverage, a contract-doc sync, and one release bump.

1. **`check_harness_links.cjs`** — `analyze()` now reads `context.executionScope` and the exported
   `consumerHubExists()`, derives both hub directories from `context.sharedDir` / `context.skillsRoot`
   (never a literal `.ws`), and adds `hubBindingClass()`: containment via the exported `inside()`, a
   depth-1 level check, and a `path.basename()` membership test against
   `HUB_BINDING_FILES = {AGENTS.md, autoload.md, config.json, STACK.md}`. A tolerated literal lands in a
   new `installLayoutNotes` bucket (with `remediation: ws-configure-project`) and an absent project hub
   in `warnings`; both are returned beside `findings`, excluded from `total`/`ok`, and printed on the
   human path in every outcome. No scope detection was added (AC24).
2. **`bin/cli.js`** and **`configure_autoload.cjs`** — the bare-runtime rewrite list is hoisted into
   `MANAGED_RUNTIME_SIBLING_FILES` (exported from the configurator) and gains
   `host-capability-tokens.md`; the per-file fail-closed prefix helpers are unchanged, and the shipped
   `runtime/autoload.md` keeps its bare same-directory form.
3. **`.agents/skills/ws-check-harness/PHASES.md`** — the Phase 5a row and the global-only hub-resolution
   bullet now document exactly the implemented tolerance (level, class, scope window, informational
   bucket, warning).

Regression coverage: `test/test-check-harness-links.js` gained a global-only fixture that runs a copy of
the checker from inside a canonical global skills root (so `executionScope` really resolves `global`),
plus project-scope and hybrid fixtures, the hub-subtree/depth-1 negative, traversal and percent-encoded
traversal negatives, the genuine-break cross-class guard, the unknown-argument guard, the human-path
diagnostics check, and a source-level no-owned-scope-detection assertion. `test/test-autoload-configure.js`
gained the project-hub rewrite, the fail-closed token, the non-runtime-target guard, the rewrite-set
completeness assertion, and the two-list wiring guard. `test/test-install.js` gained a real
global-install block (rewrite, zero unresolved runtime-sibling targets, stale refresh, idempotency).
`test/test-doc-sync.js` pins the shipped source form and the mirror guard.

Verification: ledger score **10/10** (240/240 units, `knownDefect: false`, `missingEvidence: false`, no
deficiencies); `npm run test` **160/160 entries green**; stack invariant scan **0 issues**;
`test-harness-clean.js` **0 findings**; all `ws-check-harness` phases 0–5c green; integrity regenerated
and verified at **0.5.37**. Code review: 0 Critical, 1 Warning (human-path diagnostics dropped on a
failing gate) fixed in round 1. Step 6b fresh-verify: 24/24 AC verdicts re-derived, and 6 mechanism fault
injections **all detected** — the first run exposed two real test-coverage defects (the tolerance window
was unasserted, and the depth-1 level check was neither asserted nor load-bearing), both fixed before
proceeding. Red baseline: the pre-fix checker exits 1 with exactly the three reported `#496` literals
under `brokenLinks`, and the pre-fix project-hub renderer leaves the bare `#493` target in place.

Doc-sync trio: `ws-spec-index sync` filed the spec to `completed/` (`verify_close_filing` ok), the wiki
pages `harness/install-and-hub.md` and `harness/diagnostics-and-benchmarks.md` were updated in place and
`validate_wiki.cjs` passes, and the changelog entry was appended through the packaged helper.

Release housekeeping: version bumped exactly once (`0.5.36` → `0.5.37`, strictly above `main`'s `0.5.36`),
site rebuilt, integrity regenerated in the same change, and the config-editor suite re-run green (12/12)
even though no config schema or example changed.

## Next steps

- The master orchestrator owns convergence (`ws-goal-fix-pr`) and the merge; this worker stops at PR
  creation and does **not** merge.
- Aggregate `npm run test` passed 160/160 on the final payload; an earlier run on the same branch aborted
  at entry 44/160 on `test/test-subagent-dispatch.js`, the documented Windows host flake (green standalone
  and green per-entry for the other entries). Not a product defect.
- Two non-blocking review Suggestions stay open by choice: derive `HUB_BINDING_FILES` from
  `hub-layout.json`, and revisit the binding-file class only through the spec owner if a future runtime
  sibling is ever expected at hub depth 1.
- Sequencing note (not a blocker): the sibling install-mode reporting spec (batch item 3) still owns the
  corrected install-scope value; this gate consumes whatever it publishes and adds no detection of its own.

## References

- Spec: `.agents/specs/completed/0171-us-497-link-integrity.spec.md` (workflow copy `.agents/plans/us-497-link-integrity/step-00-us-497-link-integrity.spec.md`)
- Companion: `.agents/specs/completed/0171-us-497-link-integrity.context.md`
- Plan: `.agents/plans/us-497-link-integrity/step-02-us-497-link-integrity.plan.refined.md`
- Check: `.agents/plans/us-497-link-integrity/step-05-us-497-link-integrity.plan.report.md`
- Review + fix: `.agents/plans/us-497-link-integrity/step-06-us-497-link-integrity.review.md`, `.agents/plans/us-497-link-integrity/step-06-us-497-link-integrity.fix.report.md`
- Fresh verify: `.agents/plans/us-497-link-integrity/step-05b-us-497-link-integrity.fresh-verify.md`
- Testing: `.agents/plans/us-497-link-integrity/step-07-us-497-link-integrity.testing.report.md`

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 58m 00s (workflow 04:27:22Z → close; host did not expose token counters, estimated: false) |
| Steps executed | 8 (0–7) |
| Lines added | +644 (15 files, feature commit range `8eecfd4f..e9bb9785`) |
| Lines removed | -102 |
| Net LOC delta | +542 |
| Version | 0.5.36 → 0.5.37 |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | deepseek-v4.1-flash | 47s | n/a | 2 |
| 1 | Planning | deepseek-v4.1-flash | 8s (finish) | n/a | 1 |
| 2 | Interview | deepseek-v4.1-flash | 8s (finish) | n/a | 2 |
| 3 | Plan to tasks | deepseek-v4.1-flash | 9s (finish) | n/a | 2 |
| 4 | Implement | deepseek-v4.1-flash | 47s (finish) | n/a | 15 |
| 5 | Verify | deepseek-v4.1-flash | 31s (finish) | n/a | 1 |
| 6 | Code review + 6b | deepseek-v4.1-flash | 241s (finish) | n/a | 4 |
| 7 | Testing | deepseek-v4.1-flash | 46s (finish) | n/a | 2 |

### Lane

| Item | Value |
|------|-------|
| autoMode | true |
| flowMode | standard |
| Branch | develop (stay-on-develop; base `main`; batch policy `stay-on-develop`, no feature branch) |
| Product commits | `190356a7` (G2-code after Step 5), `f1d85b2d` (review fix W1), `e9bb9785` (fresh-verify round 2) |
| Delivery commit | configured delivery artifacts (`step-02` refined plan + this result) |
| Batch | `ws-spec-multi` run `ms-20261010T025541Z`, item 2 |
| Merge | not performed here — owned by the master orchestrator |
