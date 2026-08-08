---
slug: check-harness-upstream-sot
step: 6
title: "Code review — ws-check-harness SoT-aware skills scan root"
reviewDate: 2026-08-08
base: working-tree (SoT scope only)
spec: step-00-check-harness-upstream-sot.spec.md
plan: step-02-check-harness-upstream-sot.plan.refined.md
verify: step-05-check-harness-upstream-sot.plan.report.md
fixReport: step-06-check-harness-upstream-sot.fix.report.md
status: completed
critical: 0
warning: 0
suggestion: 3
info: 2
round: re-review-1
---

# Code review — check-harness-upstream-sot

**Banner:** `[AUTO] Starting step 6 Code review`  
**Scope:** `src/skills/ws-check-harness/{SKILL.md,PHASES.md,REPORT-FORMAT.md}`  
**Mode:** autoMode + fullMode (report only — orch dispatches fix)

ws-code-review loaded. ws-senior-developer loaded.

## Summary (initial review)

Implementation matches the refined plan for Install mode detection, skills scan root, Phase 4 inventory, report header (OQ1), integrity upstream-only, and AC10 checklists. One **Warning** remained: Phase 2 still resolved hub install-path literals under `.agents/skills/` for bare “File exists” without an explicit SoT-id equivalence rule, which can re-inflate critical/warning counts when dogfood lags — undermining AC4 / AC3 hub↔disk intent.

| Severity | Count (initial) |
|----------|------:|
| Critical | 0 |
| Warning | 1 |
| Suggestion | 3 |
| Info | 2 |

**Initial verdict:** `needs_fix` (clear Warning before Advance).

---

## Critical

No feedback.

---

## Warning

### W1 — Phase 2 hub install-path existence vs upstream SoT (AC4 / AC3 gap)

- **path:** `src/skills/ws-check-harness/PHASES.md:L252-L276` (Phase 2 File exists + hub literal resolution); related `L85`, `L331`, `L372`
- **score:** 8/10
- **sibling occurrences:** Dogfood policy stated for Phase 4 unrouted/phantom (`L85`, `L331`) but not wired into Phase 2 existence or Phase 4c `phantom_routes` when the hub cites install-path literals
- **description:** Upstream hubs (root `AGENTS.md`, packaged `.agents/AGENTS.md`) routinely Markdown-link skill paths as `.agents/skills/ws-*/SKILL.md`. Docs correctly say hubs may keep those install-path literals while inventory SoT is `src/skills`. Dogfood lag policy (§3 / Phase 4a) forbids counting missing `.agents/skills/ws-*` as unrouted/phantom — but Phase 2 still says resolve hub literals from repo root and check **File exists** at that path. A literal-missing dogfood copy with SoT present under `src/skills/ws-*` can still be reported as a broken hub link / phantom (**critical** per Phase 2/4c), contradicting AC4 and AC3 (“Comparing routed hub ids to disk uses SoT folders under `src/skills/ws-*`”).
- **suggestion:**

```text
In PHASES.md Phase 2 (File exists / hub routing table literal row) and Phase 4c phantom_routes:
When Install mode is upstream and a hub citation is an install-path literal under
{skillsRoot}/.agents/skills/ws-<id>/…, treat the route as present if the same folder id
exists under skills scan root src/skills/ws-<id>/ (SKILL.md). Do not emit broken-link /
phantom critical/warning solely because the dogfood copy is missing or differs, unless
the user explicitly requested a dogfood-sync audit. Keep optional one-line informational
note only (align with §3 Dogfood lag).
Optionally add one sentence in SKILL.md Detection notes cross-referencing this rule.
```

**Fix instructions for implement-tasks (`mode=fix`):**

1. Edit `src/skills/ws-check-harness/PHASES.md` Phase 2 table / resolution rules: add an **Upstream install-path literal** rule (SoT id equivalence under `src/skills`).
2. Edit Phase 4c `phantom_routes` row (or a note under it): existence = id under skills scan root, not dogfood path.
3. Optionally one cross-ref sentence under `SKILL.md` Detection notes / dogfood.
4. Do not change consumer behavior; do not require `npm run sync-skills`.

**Status after fix round 1:** **CLOSED** — see Re-review round 1 below.

---

## Suggestion

### S1 — Phase §1b still describes Phase 4 discovery under `.agents/` only

- **path:** `src/skills/ws-check-harness/PHASES.md:L64-L66`
- **score:** 4/10
- **sibling occurrences:** none material
- **description:** §1b says Phase 4 discovers `disable-model-invocation` markdown under `.agents/` / `.agents/skills/`, while Phase 4a invents `SKILL.md` from the mode-aware skills scan root (`src/skills` upstream). Mild agent confusion risk.
- **suggestion:** Clarify that skill inventory follows skills scan root; §1b paths remain valid for consumer/dogfood orchestrator discovery or “also check scan root when upstream.”
- **status:** open (optional; does not block Advance)

### S2 — Phase 1 path-token `rg` always lists `src/skills/`

- **path:** `src/skills/ws-check-harness/PHASES.md:L240-L242`
- **score:** 3/10
- **sibling occurrences:** Phase 2 retired-id `rg` at `L294-L296` (both trees intentional for retired-id hunt; consumer missing `src/skills` may make `rg` error)
- **description:** Example always passes `src/skills/` and `.agents/skills/`. Pure consumer trees without `src/skills` may get tool path errors. Phase 4a examples are correctly mode-split.
- **suggestion:** Mirror Phase 4a: two commented commands, or note “omit missing roots.”
- **status:** open (optional; does not block Advance)

### S3 — Comment typo in Phase 2 retired-id scan

- **path:** `src/skills/ws-check-harness/PHASES.md:L293`
- **score:** 2/10
- **sibling occurrences:** none
- **description:** Comment says `{skillsRoot}/.agents/skills consumer` (implies nested path). Should be `{skillsRoot}` (often `.agents/skills`).
- **suggestion:** Fix comment to `{skillsRoot}` / `.agents/skills` (consumer).
- **status:** open (optional; does not block Advance)

---

## Info

### I1 — AC / plan coverage (Steps A–G)

Install mode tables, SoT hard rule, mode-aware §3/§3b/Phase 4 find + dep closure, `REPORT-FORMAT.md` header (`Mode` + `Install mode` + `Skills scan root`), integrity upstream-only, AC10 DoD checklists, en-us / relative paths — all present and aligned with refined OQ1–OQ3. Step H optional items correctly non-mandatory.

### I2 — Senior-developer Code review proof

| Checklist item | Evidence / outcome |
|----------------|--------------------|
| Build / test / format aliases | N/A — documentation/contract only (`skills-sot`); no app build surface |
| Secrets checking | N/A — no secret-bearing diffs in scope |
| Docs / spec-index | In-scope SoT docs updated; plan artifacts remain under `{plansDir}` (commit at Step 8) |
| Scope / correctness / policy | Scope surgical to three SoT files; no installer/eval drive-by. Residual risk after round 1: **none blocking** (W1 closed) |
| Command evidence / blockers | Static review vs spec + refined plan + step-05 report + fix report. Advance: clear (0 Critical, 0 Warning) |

---

## Re-review round 1 (after fix)

**Banner:** `[AUTO] Starting step 6 re-review`  
**Fix report:** `step-06-check-harness-upstream-sot.fix.report.md` (round 1/3, W1 only)  
**Touched scope:** `PHASES.md` (Phase 2 File exists, resolution rule, Phase 4c, §3 Dogfood lag) + `SKILL.md` Detection notes

### W1 closure evidence

| Required fix | Evidence | Result |
|--------------|----------|--------|
| Phase 2 File exists — upstream SoT-id equivalence | `PHASES.md` File exists row: install-path literal → present if `src/skills/ws-<id>/SKILL.md`; consumer unchanged | ✅ |
| Phase 2 hub literal resolution | Resolution table: existence (upstream) via SoT-id; consumer requires `{skillsRoot}` path | ✅ |
| Phase 4c `phantom_routes` | Existence = skills scan root id; dogfood-literal lag not critical when SoT present | ✅ |
| § 3 Dogfood lag cross-ref | Applies SoT-id equivalence to Phase 2 File exists + Phase 4c | ✅ |
| SKILL.md Detection notes | Upstream hub install-path SoT-id equivalence sentence + PHASES §3 link | ✅ |

No new Critical/Warning regressions in the three-file scope. Suggestions S1–S3 remain open (non-blocking).

| Severity | Count (re-review 1) |
|----------|------:|
| Critical | 0 |
| Warning | 0 |
| Suggestion | 3 (S1–S3, optional) |
| Info | 2 |

**Verdict:** `completed` — W1 closed; 0 Critical, 0 Warning. Advance Step 6.

---

## Apply fixes?

**autoMode (initial):** Yes — dispatch fix for W1 (optional S1–S3).

**Re-review 1:** No further fix required for Critical/Warning. Suggestions optional only.
