## Code Review

**Branch:** `develop` @ `ec54747`
**Base:** `origin/main`
**Stack:** `node-skills-hub` (Markdown skills + Node CLI + tests)
**Files:** 16 (vs `origin/main`)
**Plan:** `.cursor/plans/us-60/step-02-us-60.plan.refined.md`
**Verify:** `.cursor/plans/us-60/step-06-us-60.plan.report.md` (score 9.25 APPROVE)
**Anchor:** `uswf/us-60-20260717T173842Z/before-step-9` @ `ec547472f8e6409d0786d010dd8482e4e10b91c2`

### Critical

_None._

### Warning

- **`test/package.json` (HEAD vs working tree)**: WARNING — version sync drift after build-site bump (Score: 7/10)

  **Analysis (4 steps):**
  1. **Evidence Read:** Committed `package.json` is `0.0.29`; committed `test/package.json` still has `file:../workflow-skills-0.0.28.tgz`. Uncommitted dirty already bumps test consumer to `0.0.29`. Neither `.tgz` present on disk until pack. MEMORY trap *Ship verify bumps package version* documents this exact failure mode.
  2. **Failure Scenario:** Clone/PR head at `ec54747` → `package.json` says 0.0.29 but `test/package.json` still references 0.0.28.tgz → local `cd test && npm install` (or any consumer of the file: dep without re-pack) fails or resolves a stale/missing tarball.
  3. **Missing Protection:** No install/harness assert that `package.json` version matches `test/package.json` `file:` dep; Step 7 committed site/version bump without the leftover `test/package.json` sync.
  4. **Discards:** Not cosmetic; not intentional leave-behind (working tree already has the fix); not a check-harness forbidden-example false positive; not dual-mode related.

  **Sibling occurrences:** Same pattern historically on ship/`build-site` (MEMORY 2026-07-16); this commit is the current instance.

  **Step 10 fix:** Stage and commit `test/package.json` → `file:../workflow-skills-0.0.29.tgz` (already correct in working tree). No other product code change required for this finding.

### Note

- **AC7 / check-harness:** Step 6 left full interactive `check-harness` Phases 0–5c deferred. Spot-checks + `npm run tests -- --local` green. Optional before merge to `main`; not a product defect in the diff.
- **README seed scope:** Optional root seeds section leads with “Full / workflow” while `self-learning` alone also calls `ensureSharedHubInstalled` → seeds (Phase 10 proves). Parenthetical “when shared/ hub is ensured” softens this; optional README clarifying phrase only.
- **check-harness forbidden-example** of `step-10-update-plan-implementation` retained by design — do **not** “fix” in Step 10.
- **Uncommitted dirty:** Only `test/package.json` (0.0.29 sync) + plans dir (workflow artifacts). Plans stay uncommitted until Step 12 per invariant.

### Praise

- Dual-mode held: `STEP-DISPATCH.md` standard-orch-only banner; lite SKILL refuses it; shared skills stay orch-agnostic via `gates.md`.
- AC1–AC6 on disk: portable External Dependencies (root + `.agents/AGENTS.md` + `setup.md` + Code review proof pointer); Active rules progressive disclosure; STEP-DISPATCH extract + SKILL pointer; retired invoke fixed; domain-review en-us + alias note; CLI create-if-missing + Phase 10 create-once/no-clobber tests.
- Surgical extract: FSM/invariants remain in `spec-to-pr/SKILL.md`; dispatch table not rewritten for meaning.

---

**Step 10 actionability:** `needs_fix: true` only for `test/package.json` sync (Warning). No Critical. Clear to advance after that one-liner (or include with next G2-code commit).

**Apply fixes?** Orchestrator / Step 10 — YES for Warning only.
