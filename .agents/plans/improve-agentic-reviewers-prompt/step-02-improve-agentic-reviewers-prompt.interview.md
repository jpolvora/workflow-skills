# Plan Interview — Improve agentic code reviewers prompt

**Plan**: `.agents/plans/improve-agentic-reviewers-prompt/step-01-improve-agentic-reviewers-prompt.plan.md`
**Spec**: `.agents/plans/improve-agentic-reviewers-prompt/step-00-improve-agentic-reviewers-prompt.spec.md`
**Refined spec**: `.agents/plans/improve-agentic-reviewers-prompt/step-02-improve-agentic-reviewers-prompt.plan.refined.md`
**Date**: 2026-09-27
**Interviewer**: ws-plan-interview (automated audit)

---

## 1. Coverage — AC Mapping

| AC | Covered? | Notes |
|----|----------|-------|
| AC1 | Yes | "Current State Audit" section covers prompt structure, workflow invocation, custom-stack contract, path references, and redundancy analysis. |
| AC2 | Yes | Change 1 proposes a rewrite keeping all high-signal gates, removing redundancy, with line budget. |
| AC3 | Yes | Change 2 proposes a workflow comment making the Custom-prompt coupling explicit. |
| AC4 | **Partial** | Plan does not explicitly include the upstream-vs-local coverage delta analysis. Refined spec R3 covers this, but the plan itself should reference it. |
| AC5 | Yes | Change 3 explicitly states "No workflow functional changes." |
| AC6 | Yes | "Path reference audit" table verifies all hub paths against current managed layout. |
| AC7 | Yes | "Validation Plan" section enumerates 6 validation steps including dry-run with fallback. |

**Verdict**: 6/7 ACs fully covered. AC4 is partially covered (deferred to refined spec but not in plan body).

---

## 2. Accuracy — Line Counts & Section References

### Prompt file (`.github/agentic-code-reviewers-prompt.md`)

| Plan claim | Actual | Match? |
|------------|--------|--------|
| Total 57 lines | 57 lines | Yes |
| §1 lines 5–20, 14 bullets | Lines 5–20, 14 bullets | Yes |
| §2 lines 22–28, 5 bullets | Lines 22–28, 5 bullets | Yes |
| §3 lines 30–34, **4 bullets** | Lines 30–34, **3 bullets** | **No** |
| §4 lines 36–53, 8 high-signal + 3 low-signal | Lines 36–53, 8 + 3 | Yes |
| §5 lines 55–57 | Lines 55–57 | Yes |

**Issue 1**: Plan says §3 has "4 bullets: workflows, shell/PowerShell, JSON schemas" but actual §3 has only **3 bullets** (the plan lists 3 items but claims 4).

### Workflow file (`.github/workflows/agentic-code-review.yml`)

| Plan claim | Actual | Match? |
|------------|--------|--------|
| `--stack Custom` at line 131 | Line 131 | Yes |
| `--custom-prompt` at line 132 | Line 132 | Yes |
| `--score-min 5` at line 133 | Line 133 | Yes |
| Timeout 1200000ms | `AGENTIC_CODE_REVIEWERS_TIMEOUT_MS: "1200000"` | Yes |
| Include patterns (18 globs) | Line 134, 18 globs | Yes |
| Extra exclude `.agents/plans/**,.agents/specs/**` | Line 105 | Yes |
| Node 22.13 | Line 50 | Yes |
| Default model `opencode-go/muse-spark-1.2-contributor` | Line 39 | Yes |
| Default variant `low` | Line 40 | Yes |
| Default engine `opencode` | Line 38 | Yes |

**Verdict**: All workflow references accurate.

### Proposed content line count

| Plan claim | Actual | Match? |
|------------|--------|--------|
| "65 lines" | ~50 lines (code block lines 83–132) | **No** |
| "down from 57" | 50 is down from 57, but 65 is not | **No** |

**Issue 2**: Plan claims the proposed content is "65 lines (down from 57)" but the actual proposed content block is ~50 lines. The "down from 57" phrasing is also contradictory since 65 > 57. The correct claim is "~50 lines (down from 57)."

---

## 3. Completeness — Workflow Coupling (AC3)

The plan addresses AC3 via Change 2 (workflow comment). The comment is minimal, self-documenting, and placed at the exact invocation point. The plan correctly identifies that no CI check currently validates the coupling and proposes the comment as a zero-infra solution.

**Verdict**: Adequate. The comment approach is sound and matches the refined spec R4 decision.

---

## 4. Hub Paths — Current vs Retired

The plan's "Path reference audit" table correctly identifies:

| Reference | Status |
|-----------|--------|
| Root `AGENTS.md` | OK |
| `.ws/AGENTS.md` | OK (consumer hub entrypoint) |
| `{skillsRoot}/ws-shared/runtime/autoload.md` | OK (managed layout) |
| `bin/skill-dependencies.json` | OK |
| `docs/index.html` via `node bin/build-site.js` | OK |
| `bin/cli.js` installer | OK |

**No stale path references found.** The prompt already uses current managed-layout tokens. The plan correctly identifies this.

**Verdict**: Accurate.

---

## 5. Validation — Soundness (AC7)

The plan's validation approach is sound:

1. `npm run test` — full harness suite
2. `check_harness_links.cjs` — path reference validation
3. `npm run review:dry` — live proof (with documented fallback)
4. `git diff` scope check — ensures only intended files changed
5. Line count verification — enforces ≤80 target
6. Path reference grep — catches stale paths

The plan explicitly documents the dry-run limitation and fallback per AC7.

**Verdict**: Sound and complete.

---

## 6. Issues Summary

| # | Issue | Severity | Action |
|---|-------|----------|--------|
| 1 | §3 bullet count wrong (says 4, actual 3) | Low | Fix in refined plan |
| 2 | Proposed content line count wrong (says 65, actual ~50); "down from 57" contradictory | Low | Fix in refined plan |
| 3 | AC4 upstream-vs-local analysis not in plan body (only in refined spec R3) | Low | Add to refined plan |

---

## 7. Recommendations

1. Fix §3 bullet count from "4 bullets" to "3 bullets" in the plan.
2. Fix proposed content line count from "65 lines" to "~50 lines" and remove the contradictory "down from 57" phrasing.
3. Add a brief AC4 upstream-vs-local analysis section to the plan body (or explicitly reference refined spec R3).
4. The plan is otherwise thorough, accurate, and ready for implementation after these minor fixes.

---

## 8. Plan Approval

**Approved with minor fixes.** The issues are cosmetic (line count, bullet count) and one gap (AC4 coverage in plan body). None affect the plan's soundness or implementation readiness. The refined plan should incorporate the fixes above before implementation proceeds.
