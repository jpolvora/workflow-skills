# Overlap matrix — autoload utility skills

**US:** `autoload-skills-overlap-audit`  
**Date:** 2026-08-08  
**Skills:** `ws-senior-developer` · `ws-self-learning` · `ws-changelog` · `ws-fable-method` · `ws-tdah`

## Responsibility map

| Skill | Primary job | Secondary | Done when / completion gate |
|-------|-------------|-----------|------------------------------|
| `ws-senior-developer` | Delivery gate: scope, anti-reinvention, ambiguity → `user-gate`, pre-ship **Code review proof** | Route to orch when named; trivial vs plan-required | Proof checklist items have exit codes or blockers |
| `ws-self-learning` | MEMORY consult before mutate; trap write + compile after | Proof line `Learning:` | Grep done + write/N/A + compile or N/A line |
| `ws-changelog` | Append-only task history | Runs **after** self-learning | New top CHANGELOG entry Prompt/Done/Result |
| `ws-fable-method` | 7-step evidence/decide/act/verify loop for non-trivial work | Triviality/fit gates; plan-first STOP | Loop steps Done when table satisfied |
| `ws-tdah` | Action-first reply **shape** + judgment | Opt-out phrases | Before-send shape checklist |

## Pairwise matrix

Legend: `none` · `complementary` · `duplicated` · `conflict` (mitigated = still noted as conflict with mitigation)

| A \\ B | senior | self-learning | changelog | fable | tdah |
|--------|--------|---------------|-----------|-------|------|
| **senior** | — | complementary | none | duplicated* | conflict* |
| **self-learning** | | — | complementary | none | duplicated* |
| **changelog** | | | — | none | none |
| **fable** | | | | — | complementary |
| **tdah** | | | | | — |

\*See evidence cells below.

### Evidence (non-none cells)

| Pair | Type | Evidence |
|------|------|----------|
| senior ↔ self-learning | complementary | Senior requires smallest change / proof; self-learning supplies trap consult before inventing approaches (`ws-self-learning` Pre-work; senior Core Directive 2). |
| senior ↔ fable | duplicated | Both impose plan/classify/verify structure: senior §§2–3 + §5 proof vs fable Steps 0–1 Plan-First / 5 Verify (`ws-senior-developer` L33–67; `ws-fable-method` L29–51). Distinct when orch already owns plan ceremony — need single rule. |
| senior ↔ tdah | conflict (mitigated) | Senior proof wants command evidence detail; tdah Compress / action-first shortens prose (`ws-tdah` Apply 9; senior §5). Hub precedence places senior above tdah when both autoloaded. |
| self-learning ↔ changelog | complementary | Explicit order: changelog runs after self-learning; MEMORY ≠ history (`ws-changelog` L17, L23; `ws-self-learning` L47 DO NOT use as changelog). |
| self-learning ↔ tdah | duplicated | tdah Judgment 11 MEMORY restates consult + write via self-learning (`ws-tdah` L42) while self-learning owns full protocol — duplicate agent obligation text. |
| fable ↔ tdah | complementary | Fable structures investigation; tdah shapes the report (fable Step 6 outcome-first aligns with tdah Lead/Win). |

## Duplication inventory

| Theme | Skills | Canonical owner | Defer / link |
|-------|--------|-----------------|--------------|
| D1 MEMORY consult + trap write | tdah, self-learning | `ws-self-learning` | tdah Judgment 11 → one-line defer |
| D2 Plan / classify / verify ceremony | senior, fable | **Orch when named**; else senior for free-text multi-file; fable for non-trivial investigate when no orch/senior plan already confirmed | Cross-link both ways |
| D3 Surgical / smallest change | senior, fable, (karpathy external) | `ws-senior-developer` Core Directive 2 + §4; fable Step 4 | fable keeps Act surgical; no second "audit and simplify" essay |
| D4 Config entry → configure-project | senior, self-learning, changelog | Keep one-liner entry check per config-dependent skill (shared pattern OK) | none |
| D5 Completion proof lines | self-learning (`Learning:`), senior (Code review proof), changelog (append) | Keep distinct artifacts | Document order: Learning → Changelog → (ship) Proof |

## Workflow impact

| Context | Risk without thin | After thin |
|---------|-------------------|------------|
| Free-text multi-file | Senior plan + fable Plan-First double STOP | Single rule: orch/senior plan wins; fable skips Plan-First if plan already confirmed |
| Every-turn autoload | tdah compresses senior proof | Precedence: senior > tdah for proof depth; tdah still shapes non-proof chat |
| Task end | Clear Learning then Changelog | Keep; reinforce in hub |
| Orch Steps 1–8 | Fable full loop fights orch FSM | Fable: do not add competing orch gates when `ws-spec-to-pr*` owns the session |
