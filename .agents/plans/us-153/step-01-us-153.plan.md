---
slug: us-153
title: "Align shared hub docs: ws-senior-developer opt-in vs consumer root AGENTS.md autoload"
status: "plan to be refined"
---

## 0. Summary & Business Rules

**Objective:** Align shared-hub documentation so agents understand when `ws-senior-developer` is opt-in vs per-prompt autoload, and how consumer root `AGENTS.md` overrides shared-hub defaults.

**Chosen direction:** **Option A — Document dual-mode explicitly (minimal change).**

| Mode | Behavior |
|------|----------|
| Shared hub only (default install) | `ws-senior-developer` is on-demand / opt-in via `rules.seniorDeveloper` |
| Consumer root `AGENTS.md` present | May promote `ws-senior-developer` to per-prompt autoload (delivery gate); root hub precedence wins over shared-hub opt-in wording |

**Security / scope:** Documentation-only. Do not duplicate Code review proof checklist into hub docs. Do not change consumer repos or installer behavior.

## 1. Definition of Ready & Scope

### Assumptions

- Installer never writes consumer root `AGENTS.md` (unchanged).
- `ws-senior-developer` stays in **Promoted skills** table; not added to shared mandatory autoload table (Option B rejected).
- No new shipped root `AGENTS.md` template in this PR (Option C deferred).

### Acceptance Criteria

| AC | Requirement |
|----|-------------|
| AC1 | Single coherent story in `ws-shared/AGENTS.md`, `setup.md`, and task router for autoload vs invoke |
| AC2 | Precedence when consumer root `AGENTS.md` conflicts with shared hub is documented |
| AC3 | Harness/docs do not treat intentional consumer override as a defect |

### Out of scope

- Changing cursor-server or other consumer root hubs.
- Promoting `ws-senior-developer` to shared mandatory autoload table.
- Shipping optional root `AGENTS.md` snippet (Option C).

## 2. Technical Design & Architecture

Docs-only edits under harness hubs and harness audit guidance.

| File | Change |
|------|--------|
| `.agents/skills/ws-shared/AGENTS.md` | Add **Consumer root override** subsection; extend **Precedence** with dual-hub rule; align task router + External dependencies wording |
| `.agents/skills/ws-shared/setup.md` | Align `rules.seniorDeveloper` row + External dependencies note with dual-mode story |
| `AGENTS.md` (root) | Mirror dual-hub / precedence note in Skill loading or External dependencies (hub drift sync) |
| `.agents/AGENTS.md` | Minimal alignment if root/shared facts change (drift check) |
| `.agents/skills/ws-check-harness/PHASES.md` | Document that root-hub autoload of `ws-senior-developer` is intentional consumer override — not a harness defect (AC3) |

No skill scripts, CLI, or `config.json.example` changes unless harness audit flags a link.

## 3. Step-by-Step Plan

### Step 1 — Shared hub core (`ws-shared/AGENTS.md`)

1. After **Skill loading (mandatory)** or **Precedence**, add **Consumer root override** block:
   - Default: shared hub treats `ws-senior-developer` as opt-in (`rules.seniorDeveloper` or explicit invoke).
   - Override: consumer root `AGENTS.md` may autoload every prompt; when both hubs load, root hub skill-loading / precedence sections win for autoload decisions.
2. Update **Precedence** list: insert item for consumer root `AGENTS.md` when present (below explicit user instructions, above or alongside design constraints — match existing hub style).
3. Task router row for `ws-senior-developer`: clarify *default opt-in; root hub may autoload*.
4. External dependencies `senior-developer` row: same dual-mode one-liner.

**Files:** `.agents/skills/ws-shared/AGENTS.md`

### Step 2 — Bootstrap alignment (`setup.md`)

1. Update `rules.seniorDeveloper` table row: optional guardrails + note root override may promote autoload.
2. Add one sentence under External dependencies / Code review proof pointing to shared hub **Consumer root override** section.

**Files:** `.agents/skills/ws-shared/setup.md`

### Step 3 — Root hub drift sync

1. Add equivalent dual-hub note in root `AGENTS.md` (Skill loading or External dependencies).
2. Cross-link `ws-shared/AGENTS.md` as consumer contract for opt-in default.
3. Sync `.agents/AGENTS.md` only if drift check requires matching facts (no new phantom routes).

**Files:** `AGENTS.md`, `.agents/AGENTS.md` (if needed)

### Step 4 — Harness audit guidance (AC3)

1. In `PHASES.md` Phase 2 or guardrails section: when consumer root `AGENTS.md` autoloads `ws-senior-developer` while shared hub says opt-in, treat as **intentional override** — do not flag as hub/skill-loading drift.
2. Optional: one line in `REPORT-FORMAT.md` under guardrails if PHASES cross-ref is insufficient.

**Files:** `.agents/skills/ws-check-harness/PHASES.md` (and optionally `REPORT-FORMAT.md`)

### Step 5 — Verify

1. `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` (or harness skill Phase 0–5c).
2. Manual read: shared `AGENTS.md`, `setup.md`, task router — AC1/AC2 satisfied.
3. Confirm no Code review proof checklist pasted into hubs.

## 4. Permissions, Tenancy & i18n

N/A — documentation-only change.

## 5. Test Coverage

| AC | Test / verification |
|----|---------------------|
| AC1 | Read `ws-shared/AGENTS.md` § Skill loading, Precedence, Task router, `setup.md` § External dependencies — wording consistent (autoload vs opt-in) |
| AC2 | `ws-shared/AGENTS.md` documents root `AGENTS.md` wins when both hubs present |
| AC3 | `PHASES.md` explicitly exempts intentional root autoload from drift findings; `ws-check-harness` reports 0 critical on doc-only diff |

## 6. Invariants (Do Not Violate)

- Portable skill contract: no IDE/agent product coupling in skill bodies.
- Do not duplicate senior-developer checklist into hub docs.
- Hub drift: root `AGENTS.md` + `.agents/AGENTS.md` stay aligned on facts.
- en-us only for harness docs.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (docs only).
- [ ] Dual-mode story consistent across shared hub + setup + root hub.
- [ ] Harness guidance updated for AC3.
- [ ] `ws-check-harness` / `check_workflows` green.
- [ ] No checklist duplication in hub docs.

## 8. Open Questions

None — Option A selected per issue recommendation for minimal upstream alignment.
