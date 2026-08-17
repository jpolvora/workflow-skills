# step-06 - Code review - deepseek-harness-improvements (P1: AC4-AC9)

> Review snapshot: `git diff a5ae8a3b81d6e25d99aab53fead4a8588aab80f9...HEAD` (single commit c7a3c42).
> Stack: node-skills-package (skills-sot + installer-cli + tests; no frontend/i18n/DB).
> Plan: step-02-deepseek-harness-improvements.plan.refined.md - Spec: step-00 (P1 = AC4-AC9).
> Method: all retained findings pass the four proof steps (Evidence Read, Failure Scenario, Missing Protection, Discards).

---

## Round 2 - re-review result (after fix commit 9e7b361): CLEAN ✅
>
> Re-review snapshot: `git diff a5ae8a3b81d6e25d99aab53fead4a8588aab80f9...HEAD` (now 3 commits: c7a3c42 feat, 817264d chore, 9e7b361 fix). Focus: the ws-code-review fix round (9e7b361) plus any new regression it introduced.

### Fixed in round 2 (verified present & correct)

- **W1** (AC7/AC8 evals) - `ws-goal-fix-pr/evals/evals.json` now has evals **3-5**: stale-revision conflicts loudly + never overwrites (AC7); blocked verdict only after >=3 consecutive identical reasons with counter reset (AC8); resume re-arms PR number + success criterion and re-initializes the blocked counter (AC8). Not only added, they match the guard table in `ws-goal-fix-pr/SKILL.md` and the mirrored `ws-goal-loop/evals/evals.json` evals 3-5. JSON parses; integrity regenerated.
- **W2** (AC6 reproducible-artifact invariant) - `ws-spec-to-pr/SKILL.md` item 8 documents the invariant (fail closed via pre-advance `validate_state.py --pre-advance <N>`); `test/test-update-state-yaml.js::testArtifactReproducibilityPreAdvance` added: pre-advance 2 exits non-zero + names the missing artifact when the required spec/plan are absent, and exits 0 when they are present.
- **W3** (lite stateVersion reject) - `ws-spec-to-pr-lite/scripts/validate_state.py` now defines `CURRENT_STATE_VERSION = 1` and `verify_state_version`, mirroring the standard validator exactly (identical reject branches + messages for missing/older/unknown/non-integer), invoked from the shared `validate()` body.
- **S1** (no centralization) - all four version constants keep independent values = 1, each with a keep-in-sync cross-reference comment to the sibling copies (standard/lite update_state `_STATE_VERSION`, standard/lite validate_state `CURRENT_STATE_VERSION`). Confirmed all equal 1.

### Regression check (fix round)

The only behavioral code change introduced by the fix round is lite validation now rejecting un-versioned / older / unknown stateVersion - exactly the intended AC4 "reject loud, no compat shims" contract, which is a planned behavior, not a regression. Normal pipeline flow is preserved because update_state stamps stateVersion before invoking validation (standard and lite stamp tests exit 0). Integrity manifest regenerated; `verify-integrity` reports OK.

### Re-verified evidence (this round, exit statuses)

- `node test/test-update-state-yaml.js` → **exit 0** (incl. stateVersion reject for missing/older/unknown/nonint, and AC6 pre-advance artifact-fail + artifact-pass)
- `node test/test-resume-gate.js` → **exit 0**
- `python -m py_compile` on all 4 state scripts (std/lite update_state + validate_state) → **exit 0**
- `npm run verify-integrity` → **exit 0** (OK: bin/skill-integrity.json matches tree)

### Residual (Suggestion-level only; no Warning/Critical)

- **Lite reject test coverage:** `test-update-state-yaml.js::testStateVersionStampAndReject` exercises the reject branches against `VALIDATE_STANDARD` only, not `VALIDATE_LITE`. The lite reject branch is code-correct (mirrors standard, py_compile clean) and the lite "current version = ok" path is indirectly exercised via lite update_state's post-update validator call, but the lite missing/older/unknown reject branches lack a direct unit assertion. Non-blocking (the lite code defect W3 addressed is fully fixed); follow-up Suggestion: run the same 4 reject cases against a `VALIDATE_LITE` copy to close the coverage gap.

### Round 2 verdict

**0 Critical / 0 Warning / 1 Suggestion (non-blocking residual test coverage).** All three round-1 Warnings (W1-W3) and the S1 hygiene item are code-complete and verified. **CLEAN** for this fix round; advance may proceed.

## Scope & verification performed

- **AC4** (stateVersion stamp + reject): implemented in standard & lite update_state.py (`stamp_state_version`, `_STATE_VERSION=1`) and standard validate_state.py (`verify_state_version`, `CURRENT_STATE_VERSION=1`). **Verified live**: missing/older(0)/unknown(7)/nonint("abc") all exit 1 with clear stderr; stateVersion:1 exits 0; monotonic max() preserves a higher version. New regression test `testStateVersionStampAndReject` added.
- **AC5** (nested-dict fix + duplicate completedSteps union): the nested-dict serializer (`format_inline_dict`) and duplicate-union logic were already present at base (fix for the [2026-08-13] trap); this commit adds stamping and retains the round-trip/union regression tests. **Verified live**: duplicate `completedSteps` warns + unions to a single key; nested `loc` round-trips.
- **AC9** (resume gate): `setup.md` §4c adds the mechanical `git rev-list --count origin/{state.baseBranch}..HEAD` pre-check with mark-complete/stop path; `ws-spec-to-pr/SKILL.md` notes AC9; `test/resume-gate.js` covers 0-unique-commits stop + contract-encoding assertions. Git mechanics verified (`origin/main..HEAD` = 3 on develop).
- **Invariants (config.json)**: `commitPlanFilesOnlyAtStep8: true` - respected (no `{plansDir}` staged in this commit). No EF/tenancy/migrations invariants apply (all false). No i18n locales.
- **MEMORY ## Review Patterns sweep**: relevant traps - [2026-08-13] update_state nested loc repr (AC5, addressed), [2026-08-15] stale orch resume (AC9, addressed). No dedicated `## Review Patterns` section exists; individual trap entries swept against changed files.

> Note: the Node test suite could not be executed under the DSH read-only sandbox (child_process.spawnSync piped over named pipes - EPERM, so subprocess status returned null). Findings below were instead verified by executing update_state.py / validate_state.py directly via pwsh (evidence inline). This is a sandbox limitation, not a code defect.

---

## Critical

No Critical findings.

---

## Warning

### W1 - AC7/AC8 eval coverage missing from ws-goal-fix-pr (known gap) - score 6/10

**path:** `.agents/skills/ws-goal-fix-pr/evals/evals.json` (unchanged in this commit; guard table added only to `ws-goal-fix-pr/SKILL.md`)

**Description:** The plan §5 test-coverage table requires the eval cases for AC7-AC8 in `ws-goal-loop/evals/evals.json` **and** `ws-goal-fix-pr/evals/evals.json` (stale-revision conflict, 3-round blocked, resume re-arm). Only ws-goal-loop gained evals 3-5. ws-goal-fix-pr/evals/evals.json was not touched (still evals 1-2); only its SKILL.md guard table was added.

**Evidence read:** `git diff base...HEAD -- ws-goal-fix-pr/` = SKILL.md guard-table insertion only; `ws-goal-fix-pr/evals/evals.json` absent from the diff; `ws-goal-loop/evals/evals.json` +32 lines (evals 3,4,5).

**Failure scenario:** Step 9 (ws-goal-fix-pr) fallback drift: the fix-loop skill ships no eval case for stale-revision conflict, 3-round blocked, or resume re-arm, so a future agent building/regressing ws-goal-fix-pr has no machine-checkable guard to trip - the only protection is prose in SKILL.md. The underlying primitive (ws-goal-loop) is covered, so the mechanism is proven; the skill-specific loop (PR number + success criterion re-arm) is not.

**Missing protection:** No eval asserts ws-goal-fix-pr loop state (PR number, revision, 3-round blocked/escaped verdict) is revision-guarded / re-armed.

**Discards:** Not Critical - AC7/AC8 lifecycle behavior is present (SKILL.md contract) and the contract is eval-covered at the ws-goal-loop primitive level (evals 3-5); no runtime loop code is bypassed.

**Sibling occurrences:** `ws-goal-loop/evals/evals.json` (the +32 that shows what should have been mirrored); `ws-goal-fix-pr/SKILL.md` (guard table now cross-references ws-goal-loop).

**Suggestion:** Add `ws-goal-fix-pr/evals/evals.json` evals 3-5 mirroring ws-goal-loop evals 3-5 but exercising the fix-loop specifics (stale revision on a thread verdict is not applied; blocked/escalated only after >=3 identical concrete reasons; resume re-states PR id + success criterion and resets the blocked counter). Update `bin/skill-integrity.json` in the same commit.

---

### W2 - AC6 (reproducible-artifact invariant) not implemented in P1 - score 7/10

**path:** `.agents/skills/ws-spec-to-pr/scripts/validate_state.py` + `test/test-update-state-yaml.js` (no AC6 check added) - spec AC6 - plan §5

**Description:** AC6 is in the P1 scope ("P1 state integrity (AC4-AC6)"). Spec AC6: "A documented + checked invariant: every step artifact a later step reads is reproducible from state plus the committed diff (ws-check-harness or ws-audit phase)." Plan §5 maps it to an "artifact-reproducibility check" in `test/test-update-state-yaml.js`. This commit adds `testStateVersionStampAndReject` (AC4) but no artifact-reproducibility check, and no ws-check-harness / ws-audit phase change.

**Evidence read:** `git grep -i "reproducib" HEAD -- test` - only unrelated hits (test-cleanup-workflow-git.js, test-delivery-commit-artifacts.js, test-install.js); no AC6 check in the diff; plan §5 lists the check but plan §3 Step-1 files inconsistently omit it.

**Failure scenario:** A later step reads an artifact (e.g. step-06 review or step-01 plan) whose content is not derivable from state.yaml + the committed diff - no check confirms artifact reproducibility, so a stale/mis-derived artifact can be consumed downstream undetected, silently degrading the "deterministic over silent corruption" guarantee P1 hardens.

**Missing protection:** No gate (ws-check-harness / ws-audit phase) or unit check asserts artifact reproducibility from state + diff.

**Discards:** Not Critical - the delivered stateVersion/version machinery is correct and verified; AC6 is a missing additional invariant rather than a defect in delivered behavior. It is, however, a formal in-scope AC left undelivered.

**Sibling occurrences:** None (no partial AC6 anywhere).

**Suggestion:** Add the plan-specified artifact-reproducibility check (either as a `test/test-update-state-yaml.js` case asserting the step artifact is derivable from state + diff, or a ws-check-harness / ws-audit phase), and reconcile plan §3 Step-1 file list vs §5 table so the AC is traceably covered.

---

### W3 - Lite validate_state has no stateVersion reject (AC4 partially applied) - score 5/10

**path:** `.agents/skills/ws-spec-to-pr-lite/scripts/validate_state.py` (unchanged) - spec AC4

**Description:** Standard update_state.py stamps `stateVersion` and standard validate_state.py rejects stale/unknown versions. The lite twin was updated to stamp (`ws-spec-to-pr-lite/scripts/update_state.py` +`stamp_state_version`), but lite validate_state.py was not given the corresponding `verify_state_version`, so a lite state carries a `stateVersion` that lite validation neither enforces nor rejects.

**Evidence read:** diff shows ws-spec-to-pr-lite/scripts/update_state.py `_STATE_VERSION`/stamp added; `git diff base...HEAD --stat ws-spec-to-pr-lite/scripts/validate_state.py` empty; lite validate_state.py has no `stateVersion`/`CURRENT_STATE_VERSION` symbol; lite update_state.py:677 invokes sibling lite validate_state.py post-update.

**Failure scenario:** A lite workflow with an older/non-versioned or unknown-versioned frontmatter passes lite validate_state (exit 0) instead of failing loudly. The spec AC4 "reject unknown/older versions with exit code 1" is therefore not honored for the lite pipeline - the very workflow type the state-hardening P1 step targets.

**Missing protection:** Lite validator has no version-reject branch.

**Discards:** Downgraded from Critical because the standard path (the orchestrator's primary validator) is enforced and verified, and lite simply ignores the key rather than acting on stale state; the version is at least stamped for forward compatibility.

**Sibling occurrences:** `test-update-state-yaml.js::testStateVersionStampAndReject` validates the standard validator only.

**Suggestion:** Mirror `verify_state_version` in `ws-spec-to-pr-lite/scripts/validate_state.py` (same `CURRENT_STATE_VERSION`) so lite states are reject-loud too, and extend the reject test to the lite validator. Regenerate `bin/skill-integrity.json`.

---

## Suggestion

### S1 - Duplicated, independently defined state-schema version constants - score 4/10

**path:** `.agents/skills/ws-spec-to-pr/scripts/update_state.py:65` (`_STATE_VERSION=1`), `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py:65` (`_STATE_VERSION=1`), `.agents/skills/ws-spec-to-pr/scripts/validate_state.py:86` (`CURRENT_STATE_VERSION=1`)

**Description:** Three files define the state schema version in three independent constants (two `_STATE_VERSION`, one `CURRENT_STATE_VERSION`), all equal to `1` today. A future schema bump risks raising one and leaving others, producing silent asymmetry (an update stamping a version the validator rejects, or vice-versa).

**Suggestion:** Share one schema-version source (or derive the validator's `CURRENT_STATE_VERSION` from the same constant) and add a test asserting std update == lite update == validator. Low priority while all are `1`.

---

### S2 - Integrity manifest bump captured unrelated develop content changes - score 3/10

**path:** `bin/skill-integrity.json`

**Description:** The manifest was regenerated to match HEAD content, including hash changes for files not modified in this commit range (`ws-self-learning/scripts/self_learning.py`, `ws-preview/scripts/run_dry_run.sh`). I verified the recorded hashes match the actual HEAD content (SHA-256 cross-check), so verify-integrity should pass - but this workflow's integrity bump fingerprints content authored by unrelated develop commits.

**Suggestion:** Acceptable (manifest must reflect the current tree). For cleaner per-workflow attribution, regenerate integrity immediately after your own skill-content changes on the feature branch so unrelated develop content is not bundled into the same bump.

---

## Apply fixes?

Findings: **0 Critical / 3 Warning / 2 Suggestion.**

Per the ws-code-review loop, Critical/Warning must be cleared before Advance (max 3 fix - re-review rounds). W1-W3 are actionable: W1 add `ws-goal-fix-pr/evals/evals.json` evals 3-5 (+ integrity); W2 implement the AC6 artifact-reproducibility check/test; W3 add `verify_state_version` to lite validate_state.py (+ test, + integrity). S1/S2 optional hygiene, may ride the same surgical pass.

Recommended: **Apply fixes (all 3 Warnings + 2 Suggestions) and re-review**, then regenerate integrity. AutoMode would run the same fix - re-review loop up to 3 rounds; residual Warning after max rounds - Pause (fail closed).