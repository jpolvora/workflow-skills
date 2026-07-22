---
id: 101
slug: us-101
title: "Harness audit: consumer hub link targets, delivery checklist portability, doc sprawl"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/101"
specDate: 2026-07-22
---

# Specification — Harness audit: consumer hub link targets, delivery checklist portability, doc sprawl

**State:** open

## Description

## Summary

`check-harness` full audit on consumer test repo **jskills** (`jpolvora/jskills`, workflows + extra packages installed). Pipeline simulation (`check-workflows`) **PASS** — no critical FSM or retired-folder drift. This issue tracks **upstream-fixable warnings and suggestions** from that audit.

**Audit date:** 2026-07-22  
**Consumer install mode:** `.agents/skills/shared/AGENTS.md` as primary hub (no packaged root `.agents/AGENTS.md`)

---

## Warnings (upstream)

### 1. Managed skills link to root `AGENTS.md` sections that consumers do not ship

Several managed files link to `../../../AGENTS.md#external-dependencies` or `../../../AGENTS.md` § Opt-out / § Skill loading. In consumer installs the installer **does not** write root `AGENTS.md` with those sections — only optional human install docs (or nothing).

**Affected files (examples):**

| File | Link target | Problem |
|------|-------------|---------|
| `gabarito/README.md` | `../../../AGENTS.md` § Opt-out, § Skill loading | Root hub lacks these sections in default consumer layout |
| `08-ship-pr/PREPARE-CHECKLIST.md` | `../../../AGENTS.md#external-dependencies` | Anchor missing on typical consumer root `AGENTS.md` |
| `shared/setup.md` | `../../../AGENTS.md#external-dependencies` | Same — points at upstream-only root hub |
| `spec-to-pr/README.md` | `../../../AGENTS.md` as "Project entry" | Consumer entry is `shared/AGENTS.md` |

**Evidence:** `check-harness` Phase 2 anchor scan flagged `PREPARE-CHECKLIST.md → ../../../AGENTS.md#external-dependencies` as missing anchor on consumer root.

**Proposed fix:**

- In consumer-facing managed docs, link to **`shared/AGENTS.md`** (or `{sharedDir}/AGENTS.md` in prose) for Opt-out, Skill loading, External dependencies, and task router.
- Reserve `../../../AGENTS.md` references for upstream repo docs only, or gate them with "when authoring against the source repo".
- Optionally: installer/doc template for a **thin consumer root pointer** (consumer-owned) — `check-harness` already suggests this; managed skills should not assume it exists.

---

### 2. `shared/AGENTS.md` delivery checklist includes upstream-only commands

The **Recommended Feature Delivery Checklist** block (recent addition under shared hub) references:

- `npm run build-site:bump`
- `npm run generate-integrity` / `npm run verify-integrity`

These apply to the **workflow-skills upstream repo**, not typical consumer projects (e.g. jskills has no `package.json`).

**Risk:** Agents or humans in consumer repos follow checklist items that cannot run.

**Proposed fix:**

- Split checklist: **Upstream maintainers** vs **Consumer projects** (harness validation + `check-workflows` + configure-project + ship-pr).
- Or wrap upstream-only items in a conditional note: "when maintaining workflow-skills source repo".

---

## Suggestions (upstream)

### 3. `check-harness` Phase 4 still cites root `AGENTS.md` in consumer mode

`check-harness/SKILL.md` Phase 4 says compare filesystem routing against `` [`AGENTS.md`](../../../AGENTS.md) ``. Consumer mode resolution (§ Hub resolution) correctly uses `shared/AGENTS.md`, but the Phase 4 prose still anchors to root — easy for agents to audit the wrong file.

**Proposed fix:** Phase 4 text should say "resolved hub per § Hub resolution" and use `shared/AGENTS.md` in consumer examples.

---

### 4. `spec-to-pr/SKILL.md` sprawl (write-a-skill lens)

`spec-to-pr/SKILL.md` is large (~500+ lines). Protocols are partially extracted (`protocols/`, `STEP-DISPATCH.md`, `ARTIFACTS.md`) but the orchestrator body remains heavy context load.

**Proposed fix (non-blocking):** Continue progressive disclosure — move remaining stable tables to siblings and keep `SKILL.md` as FSM + dispatch contract only.

---

### 5. Installer / configure-project: seed `verification` for harness-only consumers

Consumer jskills had empty `verification.*` after install until `configure-project` / harness fix. For skills-only test consumers, suggest defaulting:

```json
"verification": {
  "backendTest": "python .agents/skills/check-workflows/scripts/check_workflows.py"
}
```

in `configure-project` detection heuristics when no app stack is detected.

---

## Not upstream (consumer / jskills — for context only)

| Item | Status |
|------|--------|
| Root `AGENTS.md` thin pointer to shared hub | Fixed locally in jskills |
| `config.json` placeholders | Fixed via configure-project values |
| `verification.*` empty | Fixed locally |
| 24 locally modified managed skill files | Consumer should revert or PR upstream before `update` |
| No `git remote` on jskills | Consumer repo setup |

---

## What passed

- Pipeline folders `00`–`09` + `goal-fix-pr` + `update-plan-implementation` present
- No retired path ids in `spec-to-pr` / `STEP-DISPATCH.md` dispatch
- `ws-*` `name:` fields align with § 3b folder map
- `check-workflows` deep validation: **0 issues** (standard + lite)
- Shared hub internal links: **0 broken**
- No `name:` collisions across 30 installed skills
- No hardcoded project stack in generic orchestrator skills

---

## Repro

```bash
# In a consumer clone with workflows (+ optional extra) installed:
# Run check-harness (read-only scan), consumer mode.

python .agents/skills/check-workflows/scripts/check_workflows.py
```

**Test consumer:** https://github.com/jpolvora/jskills (local harness test project)

## Acceptance Criteria

_No explicit acceptance criteria in the issue — extract/validate during refinement._

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
