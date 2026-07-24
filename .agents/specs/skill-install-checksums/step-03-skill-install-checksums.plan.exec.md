---
slug: skill-install-checksums
title: "Skill install checksum integrity — execution plan"
status: "exec ready"
execMode: parallel
planPath: specs/skill-install-checksums/step-02-skill-install-checksums.plan.refined.md
dagPath: specs/skill-install-checksums/step-03-skill-install-checksums.exec.dag.json
createdAt: "2026-07-20T18:25:00Z"
---

# Step 3 — Execution plan & DAG

## Detect size

| Metric | Count | Threshold (`dagThresholds`) | Result |
|--------|------:|----------------------------:|--------|
| Implementation steps (plan A–G) | 7 | ≤ 3 | **exceeded** |
| Expected files (unique) | 11 | ≤ 6 | **exceeded** |
| Layers (cli / skills / tests / docs / packaging) | 5 | ≤ 2 | **exceeded** |

**execMode: `parallel`** (any threshold exceeded → parallel per `03-plan-to-tasks`).

**Concurrency reality:** Critical path shares `bin/cli.js` and the integrity lib (`T1`→`T5` must be serial). Only **T6 ∥ T7** (tests vs docs) share a level. Treat as near-sequential; do not open conflicting worktrees on `bin/cli.js`.

## Source plan

- Refined: `specs/skill-install-checksums/step-02-skill-install-checksums.plan.refined.md`
- Spec ACs: `specs/skill-install-checksums/step-00-skill-install-checksums.spec.md` (AC1–AC12)

## Locked decisions (carry forward)

| Item | Value |
|------|--------|
| Upstream manifest | `bin/skill-integrity.json` |
| Consumer local record | `.agents/skills/shared/skill-integrity-local.json` |
| Algorithm | `sha256`, lowercase hex |
| Unsafe override | `--force-integrity` |
| Audit CLI | `integrity` + `--check` for `fullPackageDigest` |

## MEMORY applied (implementers)

- Node launchers for scripts; no bash CRLF integrity path
- Surgical `cli.js` edits only (extract + hooks)
- After CLI edits: `npm run tests -- --local` (repack)
- On version bump: regenerate integrity + sync `test/package.json` tarball; `package.json` canonical for site footer
- Do not hash/overwrite consumer-owned hub files; do not install `.agents/AGENTS.md`

## Levels (DAG)

```
L0  [T1]
L1  [T2]
L2  [T3]
L3  [T4]
L4  [T5]
L5  [T6, T7]   ← only parallel pair
L6  [T8]       ← conditional (version bump)
```

Max concurrent tasks per level: **2** (≤ 3). No same-level file collision.

---

## Tasks

### T1 — Extract shared install-rules
- **Depends on:** (none)
- **Files:** `bin/install-rules.js`, `bin/cli.js`
- **Plan step:** A (partial)
- **ACs:** AC1, AC8
- **Done when:** Shared whitelist/skip helpers live in `install-rules.js`; `cli.js` imports them; behavior unchanged; `node --check` OK.
- **Coder prompt:** See `exec.dag.json` → `T1.coderPrompt`.

### T2 — Implement skill-integrity-lib
- **Depends on:** T1
- **Files:** `bin/skill-integrity-lib.js`
- **Plan step:** A (lib)
- **ACs:** AC1, AC2, AC8
- **Done when:** Enumerate + hash + digest helpers match §2 rules (hub whitelist asymmetry; consumer exclusions); `node --check` OK.
- **Coder prompt:** See `exec.dag.json` → `T2.coderPrompt`.

### T3 — Generator + committed manifest
- **Depends on:** T2
- **Files:** `bin/generate-skill-integrity.js`, `bin/skill-integrity.json`, `package.json`
- **Plan step:** B
- **ACs:** AC1–AC3, AC11
- **Done when:** Generator writes stable manifest; `--check` green; `generate-integrity` npm script present; two generates → identical bytes.
- **Coder prompt:** See `exec.dag.json` → `T3.coderPrompt`.

### T4 — Wire install/update verify + local record
- **Depends on:** T3
- **Files:** `bin/cli.js`, `.agents/skills/shared/.gitignore`
- **Plan step:** C
- **ACs:** AC4, AC5, AC7, AC8
- **Done when:** Pre-verify before first copy; post-verify + local record write; `--force-integrity`; uninstall rewrites record; local file gitignored + consumer-owned.
- **Coder prompt:** See `exec.dag.json` → `T4.coderPrompt`.

### T5 — `integrity` audit + `--check` digest
- **Depends on:** T4
- **Files:** `bin/cli.js`
- **Plan step:** D
- **ACs:** AC6, AC9
- **Done when:** `integrity` audits local record; `--check` compares `packageRoot` `fullPackageDigest` to remote; help lists commands; exit 1 + labeled mismatch.
- **Coder prompt:** See `exec.dag.json` → `T5.coderPrompt`.

### T6 — Automated integrity tests
- **Depends on:** T5
- **Parallel group:** `verify-docs` (with T7)
- **Files:** `test/test-install.js`
- **Plan step:** E
- **ACs:** AC10, AC11
- **Done when:** Phase 0b stale gate + Phase 11 scenarios (§5); `npm run tests -- --local` green.
- **Coder prompt:** See `exec.dag.json` → `T6.coderPrompt`.

### T7 — Docs + check-harness stale note
- **Depends on:** T5
- **Parallel group:** `verify-docs` (with T6)
- **Files:** `README.md`, `.agents/skills/check-harness/SKILL.md`
- **Plan step:** F
- **ACs:** AC12, AC11
- **Done when:** README Safety/install covers integrity + trust limit; harness Phase 3 bullet for `--check` gate; no host product names.
- **Coder prompt:** See `exec.dag.json` → `T7.coderPrompt`.

### T8 — Release hygiene if version bumps
- **Depends on:** T6, T7
- **Files:** `package.json`, `test/package.json`, `bin/skill-integrity.json`
- **Plan step:** G (conditional)
- **ACs:** AC11 (when version changes)
- **Done when:** If version bumped → integrity regenerated + test tarball synced (+ site footer match if docs regenerated). Else skip with note.
- **Coder prompt:** See `exec.dag.json` → `T8.coderPrompt`.

---

## AC → task map

| AC | Tasks | Coverage |
|----|-------|----------|
| AC1 | T1, T2, T3 | Install-rule parity + manifest coverage |
| AC2 | T2, T3 | Per-file + skillDigest + fullPackageDigest |
| AC3 | T3 | Generator idempotent |
| AC4 | T4 | Pre-copy source verify + force override |
| AC5 | T4 | Post-copy verify + local record |
| AC6 | T5 | `integrity` audit |
| AC7 | T4, T5 | Selective closure only |
| AC8 | T1, T2, T4 | Consumer-owned never hashed / never fail |
| AC9 | T5 | `--check` fullPackageDigest |
| AC10 | T6 | Automated scenarios AC4–AC8 + digest change |
| AC11 | T3, T6, T7, T8 | Stale gate + docs/harness + release regen |
| AC12 | T7 | README Safety / install |

Every plan step A–G maps to ≥1 task. Every task has non-empty `files` and `coderPrompt` in the DAG JSON.

## Expected files (unique, 11)

1. `bin/install-rules.js`
2. `bin/skill-integrity-lib.js`
3. `bin/cli.js`
4. `bin/generate-skill-integrity.js`
5. `bin/skill-integrity.json`
6. `package.json`
7. `.agents/skills/shared/.gitignore`
8. `test/test-install.js`
9. `README.md`
10. `.agents/skills/check-harness/SKILL.md`
11. `test/package.json` (T8 conditional)

## Handoff

Next: [04-implement-tasks](../../.agents/skills/04-implement-tasks/SKILL.md) with:

- `specs/skill-install-checksums/step-03-skill-install-checksums.plan.exec.md`
- `specs/skill-install-checksums/step-03-skill-install-checksums.exec.dag.json`

Do **not** commit `specs/` until Step 8 ship policy (`commitPlanFilesOnlyAtStep8`).
