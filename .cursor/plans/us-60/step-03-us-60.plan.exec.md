# us-60 — Execution Plan (Parallel)

**Mode:** parallel — plan exceeds `dagThresholds`.
**Reason:** 6 steps under §3, ~10 expected files, 3 stack layers (`skills`, `cli`, `tests`) — above maxImplementationSteps: 3, maxExpectedFiles: 6, maxLayers: 2.
**Plan:** `step-02-us-60.plan.refined.md`
**Stack:** node-skills-hub (docs/skills/CLI; no Domain/DB/FE layers invented)

---

## Size detection

| Metric | Value | Threshold | Result |
|--------|-------|-----------|--------|
| Steps (§3) | 6 (AC1–AC6 + verification) | ≤ 3 | exceed |
| Files | ~10 core (excl. optional extras) | ≤ 6 | exceed |
| Layers | 3 (`skills`, `cli`, `tests`) | ≤ 2 | exceed |

→ `execMode: parallel`

Verification (plan Step 6 / AC7) is **not** a DAG implement task; run via workflow verify / check-harness + `npm run tests -- --local` after implement.

---

## Levels

### Level 0 (parallel, max 3) — no shared files

| Task | Title | ACs | Files |
|------|-------|-----|-------|
| **T1** | External Dependencies + Active rules disclosure | AC1, AC2 | `AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/shared/setup.md`, `.agents/skills/shared/config.json.example` |
| **T2** | Extract STEP-DISPATCH.md + fix retired skill id | AC3, AC4 | `.agents/skills/spec-to-pr/STEP-DISPATCH.md` (new), `.agents/skills/spec-to-pr/SKILL.md`, `.agents/skills/10-update-plan-implementation/SKILL.md` |
| **T3** | domain-review instructional en-us | AC5 | `.agents/skills/domain-review/SKILL.md`, `.agents/skills/domain-review/REPORT.md` |

### Level 1

| Task | Title | ACs | Files | dependsOn |
|------|-------|-----|-------|-----------|
| **T4** | CLI create-if-missing seeds + install tests | AC6 | `bin/cli.js`, `test/test-install.js`, `README.md` | (none; file-isolated from L0; setup.md left to T1) |

---

## Task detail

### T1 — External Dependencies + Active rules disclosure (AC1, AC2)

**Acceptance**
- Root `AGENTS.md` keeps `#external-dependencies`; resolution order for guardrails; Code review proof = pointer only.
- Packaged `.agents/AGENTS.md` resolves External Dependencies without consumer root section; Active rules = ask-question-gates + progressive-disclosure note only.
- `setup.md` documents `rules.*` + proof pointer; light comments on `config.json.example` rules block.
- No stack-specific rule dump.

**Coder prompt:** See `step-03-us-60.exec.dag.json` → T1.coderPrompt.

### T2 — Extract STEP-DISPATCH.md + fix retired skill id (AC3, AC4)

**Acceptance**
- `STEP-DISPATCH.md` exists (moved Step instructions 0–13 + Step 12/13 protocols).
- `spec-to-pr/SKILL.md` progressive-loads it; post-workflow invoke `/10-update-plan-implementation`.
- `10-update-plan-implementation/SKILL.md` invoke fixed; check-harness forbidden-examples untouched; `step-10-*.report.md` artifact names untouched.

**Coder prompt:** See dag.json → T2.coderPrompt.

### T3 — domain-review instructional en-us (AC5)

**Acceptance**
- Instruction tokens en-us (Index, Suggested order, Dependencies, Parent / Sub, YES).
- Consumer PT alias note present; no consumer domain content rewrite.

**Coder prompt:** See dag.json → T3.coderPrompt.

### T4 — CLI create-if-missing seeds + install tests (AC6)

**Acceptance**
- Create-if-missing `.cursorrules` → AGENTS.md pointer and `CHANGELOG.md` stub; never clobber.
- Install tests: create-once / no-clobber.
- Seed docs in README / CLI help only (do not edit `setup.md`; T1 owns it).

**Coder prompt:** See dag.json → T4.coderPrompt.

---

## Isolation notes

- L0 tasks share **no** files (AC1+AC2 merged into T1 because both touch `.agents/AGENTS.md`).
- T4 does not touch `setup.md` so it need not wait on T1; Level 1 only because max 3 concurrent per level.
- Do not invent Domain/DB/FE layers; only `skills` / `cli` / `tests` (+ root hub docs under T1).

---

## Post-DAG verification (AC7 — not a task)

1. Grep: retired invoke/dispatch, PT instructional tokens, STEP-DISPATCH present, External Dependencies reachable from packaged index.
2. `check-harness` Phases 0–5c on touched paths.
3. `npm run tests -- --local`.
4. `node bin/build-site.js` only if catalog/routing tables changed.
