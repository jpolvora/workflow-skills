---
id: null
slug: autoload-skills-overlap-audit
title: "Overlap audit and simplification of autoload utility skills"
source: local
specDate: 2026-08-08
---

# Specification — Overlap audit and simplification of autoload utility skills

## Description

The planned consumer autoload set ([`shared-autoload-md`](../shared-autoload-md/step-00-shared-autoload-md.spec.md)) always applies five utility skills together:

| Skill | Stated job |
|-------|------------|
| `ws-senior-developer` | Delivery gate: scope, anti-reinvention, ambiguity → `user-gate`, pre-ship proof |
| `ws-self-learning` | Pre-work MEMORY consult; post-work trap write + compile |
| `ws-changelog` | Append-only task history (`rules.changelogFile`) |
| `ws-fable-method` | 7-step evidence/decide/act/verify problem-solving loop |
| `ws-tdah` | Action-first reply shape + operational judgment |

When all five load every turn, agents risk conflicting instructions (tone vs proof depth, plan ceremony vs fable loop, MEMORY vs CHANGELOG completion gates), duplicated “stop on ambiguity / surgical change / verify” rules, and extra workflow friction.

### Goal

Analyze, check, verify, and enhance these five skills so that:

1. Overlaps, shared instructions, and duplicated responsibility are identified with evidence (quoted directives + file:line).
2. Merge, split, or simplify options are proposed with a clear recommendation per cluster.
3. Approved simplifications reduce orchestration / everyday workflow cost (fewer competing gates, clearer precedence, thinner always-on footprint) without losing distinct durable value (MEMORY vs CHANGELOG, delivery proof vs reply shape, structured investigation loop).

### Analysis method (required deliverable)

Produce an audit artifact under `{plansDir}/autoload-skills-overlap-audit/` (e.g. `overlap-matrix.md` + short `recommendations.md`) that includes:

1. **Responsibility map** — one sentence primary job + secondary jobs per skill; “Done when” / completion gates listed.
2. **Overlap matrix** — pairwise cells: `none` | `complementary` | `duplicated` | `conflict` with evidence quotes.
3. **Duplication inventory** — repeated themes across ≥2 skills (e.g. surgical edits, ambiguity stop, verify before claim, config entry check, completion proof lines).
4. **Workflow impact** — how the set interacts with `ws-spec-to-pr` / lite steps (plan ceremony, verify, ship proof, post-task MEMORY + CHANGELOG).
5. **Options** — for each cluster: Keep separate / Thin + cross-link / Merge / Demote from autoload (on-demand only), with pros/cons and recommended default.
6. **Proposed improvements** — concrete, surgical edits (file-level), ordered by impact; no drive-by unrelated refactors.

Known tension seeds to investigate (not presuppose verdicts):

- `ws-senior-developer` vs `ws-fable-method` — both impose plan / classify / verify structure.
- `ws-senior-developer` vs `ws-tdah` — proof checklist vs compression / action-first (already partially mitigated by hub precedence; confirm skill-body alignment).
- `ws-self-learning` vs `ws-changelog` — both “after task” writes; skills already distinguish MEMORY vs history — verify bodies and hub text stay non-overlapping and order is single-sourced.
- `ws-tdah` judgment “MEMORY” vs `ws-self-learning` full protocol — duplicate consult rules?
- `ws-karpathy-guidelines` (often co-loaded, not in this five) vs senior / fable / tdah surgical language — note external overlap only if it blocks simplifying the five; do not expand scope to rewrite karpathy unless required for a conflict fix.

### Non-goals

- Do not redesign the full pipeline orchestrators in this spec except where a one-line hub/dispatch note is required after a merge.
- Do not invent a sixth mega-skill without evidence that merge reduces net context and conflicts.
- Do not remove consumer-owned MEMORY/CHANGELOG semantics.
- Autoload wiring (`autoload.md`, configure-project root `AGENTS.md`) stays owned by `shared-autoload-md`; this spec may recommend autoload membership changes but does not re-specify that feature.

## Acceptance Criteria

- AC1: An audit document exists under `{plansDir}/autoload-skills-overlap-audit/` with a complete pairwise overlap matrix for all five skills (`none` / `complementary` / `duplicated` / `conflict`) and at least one evidence citation per non-`none` cell (skill path + directive paraphrase or quote).
- AC2: The audit lists every duplicated responsibility theme found across ≥2 of the five skills, and for each theme states which skill should own the canonical rule vs which should link/defer.
- AC3: The audit proposes an explicit recommendation per skill and per conflict cluster: Keep | Thin | Merge-into-X | Demote-from-autoload, with rationale tied to simplifying everyday and orch workflows (fewer competing “Done when” / gates).
- AC4: Proposed improvements include a prioritized edit list (file paths under `.agents/skills/ws-*`) that removes or cross-links duplicated instructions rather than copying them; each item maps to ≥1 matrix finding.
- AC5: After approved edits (implementation phase), no two of the five skills independently redefine the same completion artifact: MEMORY writes stay only in `ws-self-learning`; CHANGELOG appends stay only in `ws-changelog`; Code review proof checklist stays only in `ws-senior-developer` (or its documented successor if merged); fable 7-step loop stays only in `ws-fable-method` (or successor); reply-shape rules stay only in `ws-tdah` (or successor).
- AC6: Hub / precedence text (`ws-shared/AGENTS.md`, and root autoload docs if present) is updated so load order and conflict mitigation for the surviving set are consistent with the audit recommendations (en-us, portable paths/tokens).
- AC7: `ws-check-harness` Phase 5b/5c (or equivalent auto-load conflict review) is re-run on the five skills (and any merge result); unresolved conflicts are fixed or explicitly accepted with mitigation documented in the audit; no new critical harness findings from the simplification edits.
- AC8: Workflow simplification is demonstrated in the audit or follow-up notes: either reduced always-on line footprint, fewer duplicate completion gates for agents, or a documented “when to invoke fable vs senior plan ceremony” single rule that orch and free-text agents can follow without double planning.
- AC9: If a merge is recommended and approved, skill ids, `bin/skill-dependencies.json`, hubs, integrity, and installer tests are updated in the same change set; retired ids are removed from autoload defaults and documented as retired (no orphan router entries).

## Notes

- Related: [`shared-autoload-md`](shared-autoload-md.spec.md) (wiring). Prefer sequencing: audit/simplify skill bodies before or with finalizing default autoload membership.
- Prefer thin + cross-link over merge unless two skills share >50% of agent-facing obligations and no distinct artifact/trigger remains.
- Language: en-us. Portability: no host product names; paths via `{skillsRoot}` / `{sharedDir}` / tokens.
- Validation helpers: `ws-check-harness` Phases 5b–5c; optional `ws-fable-judge` on claimed simplification vs diff.
