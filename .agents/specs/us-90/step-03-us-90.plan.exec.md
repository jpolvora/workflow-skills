---
slug: us-90
title: "Fix skill integrity mismatch (EOL-canonical digests) — execution plan"
status: "exec ready"
execMode: parallel
planPath: specs/us-90/step-02-us-90.plan.refined.md
dagPath: specs/us-90/step-03-us-90.exec.dag.json
createdAt: "2026-07-20T19:18:00Z"
---

# Step 3 — Execution plan & DAG

## Detect size

| Metric | Count | Threshold (`dagThresholds`) | Result |
|--------|------:|----------------------------:|--------|
| Implementation steps (plan A–E) | 5 | ≤ 3 | **exceeded** |
| Expected files (unique) | 7 | ≤ 6 | **exceeded** |
| Layers (cli / tests / docs / packaging) | 4 | ≤ 2 | **exceeded** |

**execMode: `parallel`** (any threshold exceeded → parallel per `03-plan-to-tasks`).

**Concurrency reality:** Critical path is serial on the hasher + regenerated manifest (`T1`→`T2`). Only **T3 ∥ T4** (tests vs docs) share a level after T2. Package bump (`T5`) stays last. Near-sequential overall; do not parallelize T1/T2.

## Source plan

- Refined: `specs/us-90/step-02-us-90.plan.refined.md`
- Spec: `specs/us-90/step-00-us-90.spec.md` (AC1–AC5)

## Locked decisions (carry forward)

| Item | Value |
|------|--------|
| Canonical hash input | LF-normalized file bytes before SHA-256 |
| Algorithm | `\r\n`→`\n`, then remaining `\r`→`\n`; no on-disk rewrite |
| Choke point | `hashFileBytes` at `enumerateSkillFiles` / `enumerateHubFiles` only; keep `sha256Hex` raw for aggregates |
| Generator / CLI | No separate hash path; both use lib enumerate → `hashFileBytes` |
| Manifest | Regenerate + commit with hasher change (digests will change vs CRLF-poisoned baseline) |
| Docs | Root `AGENTS.md` one sentence only; skip README for v1 |
| Out of scope | `.gitattributes` expand; git-blob hashing; skill body refactors; `--force-integrity` as the fix |

## MEMORY applied (implementers)

- Integrity pack alignment (`hub.gitignore`, skip `runs/`); never bless failed post-verify with actual digests
- Regenerate integrity after skill/hub/hasher changes; fail closed on `--check` red
- Script/skill preflight: Node for integrity logic; LF for `.sh`; no silent managed-skill refactors beyond integrity path
- On version bump: `build-site:bump` + sync `test/package.json` tarball path; regenerate integrity so `packageVersion` matches

## Levels (DAG)

```
L0  [T1]           Hash canonicalize (plan A)
L1  [T2]           Regenerate manifest (plan B)
L2  [T3, T4]       Tests ∥ Docs (plan C ∥ D)
L3  [T5]           Package bump (plan E)
```

Max concurrent tasks per level: **2** (≤ 3). No same-level file collision.

---

## Tasks

### T1 — Hash canonicalize
- **Depends on:** (none)
- **Files:** `bin/skill-integrity-lib.js`
- **Plan step:** A
- **ACs:** AC1, AC3
- **Done when:** `canonicalizeForHash` + `hashFileBytes` exported; both enumerate file-hash sites use `hashFileBytes`; header comment says LF-canonical / EOL-stable; `sha256Hex` left raw for aggregates; `node --check` OK; CRLF vs LF vs lone-CR buffers → same digest.
- **Coder prompt:** See `exec.dag.json` → `T1.coderPrompt`.

### T2 — Regenerate manifest
- **Depends on:** T1
- **Files:** `bin/skill-integrity.json`
- **Plan step:** B
- **ACs:** AC1, AC3, AC5
- **Done when:** `npm run generate-integrity` then `npm run verify-integrity` exit 0; manifest staged with hasher change; sample path digests match LF-canonical expectation.
- **Coder prompt:** See `exec.dag.json` → `T2.coderPrompt`.

### T3 — Regression tests
- **Depends on:** T2
- **Parallel group:** `verify-docs` (with T4)
- **Files:** `test/test-install.js`
- **Plan step:** C
- **ACs:** AC1–AC4
- **Done when:** EOL parity test (CRLF/LF/lone-CR → same hex); existing Phase 0b / Phase 11 integrity gates still green; `npm run tests -- --local` green (or targeted phase if available).
- **Coder prompt:** See `exec.dag.json` → `T3.coderPrompt`.

### T4 — Docs (LF-canonical note)
- **Depends on:** T2
- **Parallel group:** `verify-docs` (with T3)
- **Files:** `AGENTS.md`
- **Plan step:** D
- **ACs:** AC4 (doc alignment; gates unchanged)
- **Done when:** One sentence in § Upstream skill integrity regenerate that digests are LF-canonical / EOL-stable; Phase 0b marker strings still present; no README edit.
- **Coder prompt:** See `exec.dag.json` → `T4.coderPrompt`.

### T5 — Package bump (ship prep)
- **Depends on:** T3, T4
- **Files:** `package.json`, `docs/index.html`, `test/package.json`
- **Plan step:** E
- **ACs:** AC5
- **Done when:** `npm run build-site:bump`; `test/package.json` tarball path synced; footer version == `package.json`; `npm run generate-integrity` + `verify-integrity` after bump (manifest `packageVersion` refreshed). May land at Step 8 commit with the fix.
- **Coder prompt:** See `exec.dag.json` → `T5.coderPrompt`.

---

## AC → task map

| AC | Tasks | Coverage |
|----|-------|----------|
| AC1 | T1, T2, T3 | LF-canonical digests identical CRLF WT ↔ LF tree / tarball |
| AC2 | T2, T3 | Source install without `--force-integrity` (existing Phase 11 path) |
| AC3 | T1, T2 | Single choke `hashFileBytes`; generate/check share path |
| AC4 | T3, T4 | Fail-closed gates unchanged; AGENTS note only |
| AC5 | T2, T5 | Manifest regenerated + package bump + tarball sync |

Every plan step A–E maps to ≥1 task. Every task has non-empty `files` and `coderPrompt` in the DAG JSON.

## Expected files (unique, 7)

1. `bin/skill-integrity-lib.js`
2. `bin/skill-integrity.json`
3. `test/test-install.js`
4. `AGENTS.md`
5. `package.json`
6. `docs/index.html`
7. `test/package.json`

## Handoff

Next: [04-implement-tasks](../../.agents/skills/04-implement-tasks/SKILL.md) with:

- `specs/us-90/step-03-us-90.plan.exec.md`
- `specs/us-90/step-03-us-90.exec.dag.json`

Do **not** commit `specs/` until Step 8 ship policy (`commitPlanFilesOnlyAtStep8`).
