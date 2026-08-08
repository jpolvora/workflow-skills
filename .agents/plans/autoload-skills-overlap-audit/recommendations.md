# Recommendations — autoload utility skills

**US:** `autoload-skills-overlap-audit` · **2026-08-08**  
**Gate (autoMode):** Thin + cross-link accepted for all clusters. Merge = report-only. Karpathy = note-only.

## Per-skill recommendation

| Skill | Rec | Rationale |
|-------|-----|-----------|
| `ws-senior-developer` | **Thin** | Keep proof + scope gate; add orch/fable complementarity note |
| `ws-self-learning` | **Keep** (+ tiny cross-link) | Already owns MEMORY; already excludes changelog |
| `ws-changelog` | **Keep** | Already after self-learning; distinct artifact |
| `ws-fable-method` | **Thin** | Keep 7-step loop; defer when orch/senior plan already confirmed |
| `ws-tdah` | **Thin** | Keep shape; Judgment 11 → defer to self-learning |
| Always-applied membership | **Keep all five** | No Demote this PR (AC6 = precedence text, not membership cut) |

## Cluster recommendations

| Cluster | Rec | Pros | Cons |
|---------|-----|------|------|
| senior ↔ fable | Thin + rule | Clears double plan/verify; keeps both skills | Agents must read one rule |
| senior ↔ tdah | Keep precedence (mitigated conflict) | Already in hub | Proof may still feel terse — acceptable |
| self-learning ↔ tdah | Thin tdah | One MEMORY protocol | tdah loses inline MEMORY detail |
| self-learning ↔ changelog | Keep | Already complementary | — |
| Merge any pair | **Do not merge** | Distinct artifacts remain for all five | — |

## Prioritized edit list (maps to matrix)

| # | Finding | File | Edit |
|---|---------|------|------|
| E1 | D1 duplicated | `ws-tdah/SKILL.md` | Judgment 11 → defer to `ws-self-learning` |
| E2 | D2 duplicated | `ws-fable-method/SKILL.md` | Gate: skip Plan-First / competing orch gates when plan already confirmed or orch owns session |
| E3 | D2 duplicated | `ws-senior-developer/SKILL.md` | Note: fable owns investigate loop when no orch; orch/senior plan wins when present |
| E4 | AC6 / AC8 | `ws-shared/autoload.md` | Precedence among Always-applied + fable-vs-senior rule |
| E5 | AC6 | `ws-shared/AGENTS.md` | Precedence: mention fable when autoloaded (below senior, above tdah) |

## Simplification proof (AC8)

1. **Single rule (fable vs senior):** If a Spec-to-PR orch session is active, or `ws-senior-developer` already confirmed a plan for the task, do **not** start fable Plan-First / full competing plan ceremony — use fable Evidence→Act→Verify only when investigation structure helps, or skip fable loop for orch-dispatched steps.
2. **MEMORY:** One protocol (`ws-self-learning`); tdah only points.
3. **Completion order:** `Learning:` (self-learning) → changelog append → senior Code review proof at ship.
4. **No merges / no Always-applied demotion** this PR → zero graph/integrity churn; thinner always-on *instruction* footprint without removing skills.

## Harness notes (AC7)

Ship follow-up (`/ws-ship-pr` 2026-08-08): `npm run test`, `verify-integrity`, `ws-check-workflows` (0 critical), `configure_autoload.py --check` (0 findings), Phase 2 autoload dual-hub rules documented. Phase 5b senior↔tdah remains **mitigated** via precedence. `shared-autoload-md` AC6–AC9 closed.

## Merge report-only (AC9 N/A)

No skill id retirement. If a future US merges senior+fable, require >50% obligation overlap proof in a new matrix revision.
