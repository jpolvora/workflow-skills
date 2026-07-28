---
slug: continuous-ai-verification-quality-gates
reviewDate: 2026-07-28
base: develop (working tree; uncommitted implementation)
mode: report-only
clean: true
critical: 0
warning: 0
suggestion: 3
reReviewRound: 1
reReviewDate: 2026-07-28
---

# Code Review — continuous-ai-verification-quality-gates

## Re-review round 1

**Verdict:** clean — prior **C1, W1, W2, W3** verified fixed in code (not claim-only).  
**Status:** `critical: 0` · `warning: 0` · Suggestions only (S1–S3; do not block Advance).  
**Evidence:** `node test/test-quality-gates.js` → all passed; lite dry-run tag soft-pass + lite `--bypassed` typed JSONL spot-checked; no stray `uswf/qg-*` tags on package worktree.

| ID | Claim | Code evidence | Result |
|----|-------|---------------|--------|
| **C1** | dryRun soft-pass missing checkpoint tags | Standard `verify_checkpoint_tag(..., dry_run=)` → warnings + `(soft-pass: dryRun)`; lite same via `sink=warnings`; both `validate_pre_advance` / `run_pre_advance_checks` thread `dryRun`. Runtime: standard exit 0 + warning; lite warning present. Test `testCheckpointDryRunSoftPass`. | **Closed** |
| **W1** | typed `{type:"gate-bypass"}` on `--bypassed` | Standard + lite `update_state.py` append second JSONL line (`gate`/`reason`/`timestamp`/`step`). Aggregate `noteGateBypass` counts typed + `bypassed:true`, deduped by `timestamp\|step`. Test asserts `gateBypassCount === 1`. | **Closed** |
| **W2** | no double-count state+JSONL scores | Aggregate: state primary; `workflowsWithStateScores` skips JSONL scores/verdicts for that wf dir; still ingests bypass/errors. Test `testAggregateNoDoubleCount` → average 8 / VERIFIED once. | **Closed** |
| **W3** | tests must not tag real worktree | `initTempGitRepo` + `GIT_DIR`/`GIT_WORK_TREE`; `withGitTag` uses temp only. Post-suite `git tag -l 'uswf/qg-*'` empty. | **Closed** |

### New findings this re-review

None Critical/Warning.

- **S3 (new)** — Fix round also changed `.agents/skills/ws-self-learning/scripts/self_learning.py` (`SHARED_DIR`: `shared` → `ws-shared`). Correct per skill docs, **unrelated** to C1/W1–W3. Accept as drive-by; do not expand scope further. Not a product defect in quality-gates.

### Residual (non-blocking)

- **S1** — `test-quality-gates.js` still not in `npm test` (ship/CI concern).
- **S2** — `bin/skill-integrity.json` regenerate deferred to Step 8 (expected).
- **S3** — unrelated `self_learning.py` path fix (see above).

**Orchestrator:** Critical/Warning clear → may Advance Step 6 (Suggestions optional).

---

**Scope:** quality-gates implementation (classifier, pre-advance CI, JSONL telemetry, bypass, aggregate, ship PREPARE, hubs, tests).  
**Plan cross-ref:** `step-02-…plan.refined.md` · Step 5 score **9/10**.  
**autoMode:** report-only this pass (orchestrator: do **not** Advance with open Critical/Warning; dispatch fix subagent).

## Code review proof (ws-senior-developer)

| Check | Evidence / outcome |
|-------|--------------------|
| Build / test / format aliases | `python -m py_compile` on standard+lite `validate_state.py` / `update_state.py` → OK. `node --check` on `classify.cjs` + `generate-telemetry-aggregate.cjs` → OK. `node test/test-quality-gates.js` → **All quality-gates tests passed** (exit 0). `package.json` `npm test` still **does not** run this suite (Suggestion). |
| Secrets checking | JSONL path redacts emails/tokens/keys via `sanitize_telemetry_string`. No hardcoded secrets in diff. Formal `ws-secrets-leak-review` not re-run this step (low risk, docs/scripts). |
| Docs / spec-index | Hubs + ARTIFACTS/STEP-DISPATCH/PREPARE updated; classify registered. Site `docs/index.html` touched separately (ship concern). Integrity regenerate deferred to Step 8 (expected). |
| Scope / correctness | AC1–AC4/AC6 largely solid. **Critical** dry-run vs checkpoint mismatch; **Warnings** on AC5 typed bypass + aggregate counting + test git side-effects. |
| Remaining risks / blockers | **Block Advance** until Critical + Warnings cleared (max 3 fix→re-review rounds). |

## Review Patterns (MEMORY)

`MEMORY.md` has no `## Review Patterns` section — sweep N/A.

---

## Critical

### C1 — Pre-advance requires git checkpoint tags that dry-run never creates
**Score:** 2/10 (blocks dry-run advance under AC2)

**Evidence Read**
- `STEP-DISPATCH.md:29` — checkpoint step: **skip tag write in `dryRun`; log only**.
- `PROTOCOLS.md` § Checkpoints — **Dry-run: log only**.
- `validate_state.py` (standard) `verify_checkpoint_tag` @ L260–294 always errors on missing tag; `validate_pre_advance` @ L475 always calls it (no `dryRun` branch).
- Lite mirror: `ws-spec-to-pr-lite/scripts/validate_state.py` L240–265 + L382 — same always-on tag check.
- Runtime: `dryRun: true` + present spec → `--pre-advance 1` returns `ok: false` / `checkpoint tag missing: uswf/…/before-step-1`.

**Failure Scenario**
Any `dry-run` (or other path that logs checkpoints without writing `uswf/*/before-step-*` tags) hits post-step pre-advance → **HS-5 STOP** before board/dispatch. Dry-run regression for the whole orch after AC2.

**Missing Protection**
`verify_checkpoint_tag` / `validate_pre_advance` must skip (or soft-warn) git tag existence when `dryRun: true`, matching checkpoint creation rules. Optionally accept `checkpoints[]` log-only evidence in dry-run.

**Discards**
Not “agent forgot to tag” — protocol explicitly forbids tag write in dry-run. Not fixed by `--skip-gates` (that bypasses the gate entirely and is not the dry-run default).

**Sibling occurrences**
- `.agents/skills/ws-spec-to-pr/scripts/validate_state.py:260`, `:475`
- `.agents/skills/ws-spec-to-pr-lite/scripts/validate_state.py:240`, `:382`
- Contract: `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md:29`

**suggestion**
```text
In both validate_state.py (standard + lite):
  if dryRun: skip verify_checkpoint_tag (or warnings-only); still check artifacts + monotonicity.
Add test: dryRun:true + missing tag + present artifacts → pre-advance exit 0.
Keep non-dryRun hard-fail on missing/unreachable tags.
```

---

## Warning

### W1 — AC5 typed `{type:"gate-bypass"}` never emitted by `update_state`; aggregate undercounts
**Score:** 5/10

**Evidence Read**
- Spec AC5 / refined plan §5d require JSONL: `{type:"gate-bypass", gate, reason, timestamp}`.
- `update_state.py` (standard L606–625, lite mirror) only sets `bypassed: true` on the **step** record when `--bypassed`.
- `STEP-DISPATCH.md:40` / state-hygiene put typed event on the **agent** (“log gate-bypass in JSONL”) — not automated.
- `generate-telemetry-aggregate.cjs:255–258` increments `gateBypassCount` **only** for `record.type === 'gate-bypass'`; ignores `bypassed: true`.

**Failure Scenario**
Orch correctly passes `--bypassed` on every skipped-quality step; aggregate `gateBypassCount` stays **0** unless agents manually append typed lines. AC5/AC7 dashboard metric wrong.

**Missing Protection**
No script path that appends typed bypass events when `--bypassed` / skip path runs; aggregate has no fallback to `bypassed:true`.

**Discards**
Not cosmetic — AC wording is explicit. Step 5 already scored AC5=8 for this gap; still open.

**Sibling occurrences**
- `.agents/skills/ws-spec-to-pr/scripts/update_state.py:623`
- `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py` (same `--bypassed` / JSONL shape)
- `bin/generate-telemetry-aggregate.cjs:255–258`
- Protocol-only: `STEP-DISPATCH.md:40`

**suggestion**
```text
Preferred: when --bypassed and --jsonl-out, also append a second JSONL line
  {type:"gate-bypass", gate:"quality-gates"|pre-advance|…, reason:"skip-gates|config", timestamp}.
And/or: aggregate gateBypassCount += 1 for step records with bypassed===true (dedupe per step file).
Extend testSkipGatesBypassedJsonlField to assert typed event + aggregate count.
```

### W2 — Aggregate can double-count scores/verdicts from dual-write (state.md + JSONL)
**Score:** 6/10

**Evidence Read**
- Refined plan AC7: scan `*.state.md`; **optionally merge gate-bypass events** from JSONL.
- Implementation: `ingestStateFile` pulls verificationScore / fableVerdict from state telemetry; `ingestJsonlRecord` also ingests scores/verdicts/errors from **all** non-bypass JSONL lines (`generate-telemetry-aggregate.cjs:252–263`, `:265–297`, `:300–320`).
- Dual-write (AC4) means the same step metrics land in both sources → inflated `averageVerificationScore` / `fableVerdictDistribution` / `errorTypeDistribution`.

**Failure Scenario**
After real workflows dual-write Step 5/6 scores, regenerate averages and verdict histograms are ~2×.

**Missing Protection**
No dedupe key; JSONL path not limited to bypass (and maybe errors) as plan intended.

**Discards**
Current on-disk `aggregate.json` shows zeros because existing states lack scores — latent until dual-write is exercised.

**Sibling occurrences**
- `bin/generate-telemetry-aggregate.cjs:252–263` (JSONL metrics)
- `bin/generate-telemetry-aggregate.cjs:283–296` (state.md metrics)

**suggestion**
```text
Primary metrics from state.md only; JSONL contribute gate-bypass (and optionally errors not in state).
Or dedupe by (workflowId/slug, step, timestamp) before averaging.
Add unit test: same score in state + JSONL → averageVerificationScore counts once.
```

### W3 — Quality-gates tests mutate real-repo git tags
**Score:** 6/10

**Evidence Read**
- `test/test-quality-gates.js:138–148` `withGitTag` runs `git tag` / `git tag -d` in **REPO_ROOT** (not a temp clone).
- Several AC2 tests create `uswf/qg-*-wf/before-step-*` on the developer’s `develop` worktree.

**Failure Scenario**
Interrupted run / crash between create and delete leaves stray `uswf/*` tags; parallel test or live workflow can race on tag names; CI shared runners pollute tag namespace.

**Missing Protection**
No isolated git dir / `GIT_DIR` sandbox; finally-delete is best-effort only.

**Discards**
Tests currently pass; risk is environmental hygiene, not assertion logic.

**Sibling occurrences**
- `test/test-quality-gates.js:138` and all `withGitTag(...)` call sites in AC2 tests

**suggestion**
```text
Use a temporary git repo (mkdtemp + git init) as cwd for validate_state checkpoint tests,
or mock subprocess; never tag the package worktree.
```

---

## Suggestion

### S1 — `test/test-quality-gates.js` not wired into `npm test`
**Score:** 7/10  
`package.json` → `tests` still only `test-install.js`. Suite passes standalone; CI will not regress AC1–AC7 unless wired (or documented as manual). Ship-checklist item.

### S2 — `bin/skill-integrity.json` stale until Step 8
**Score:** 8/10  
Expected until ship (`npm run generate-integrity` && `verify-integrity`). Do not treat as product defect in this review pass.

---

## Clean areas (no finding)

- AC1 PREPARE fable row + REFUTED STOP / `auditVerdictsBlockShip` safety floor
- AC3 `ws-classify-complexity` + packaging / hub registration; harness-neutral wording
- AC4 JSONL schema fields, lazy dir, PII sanitize, dual-write to state.md
- AC6 deferred Pass 1 + `--score-analysis` distribution path
- Portability: no IDE product coupling in new skill bodies; path tokens / config-driven plansDir

---

## Apply fixes?

**Round 1 complete — cleared.** See **## Re-review round 1** (top). No further fix round required for Critical/Warning. Suggestions S1–S3 optional.
)
