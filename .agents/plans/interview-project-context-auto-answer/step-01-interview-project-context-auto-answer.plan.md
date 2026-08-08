---
slug: interview-project-context-auto-answer
title: "ws-interview: project-context grounded auto-resolution"
status: "plan to be refined"
---

## 0. Summary & Business Rules

**Objective:** Make `ws-interview` gap resolution **project-evidence-first**, then branch fallback by mode: `autoMode` → model judgment (tagged); interactive → escalate blocking gaps to the user.

**Business rules:**
1. Never ask the user (or invent an untagged default) until a **project-context sweep** has been attempted for that gap.
2. Project-sourced answers beat model preference when both exist.
3. Every closed gap records evidence: path(s) + short rationale, or `model-inferred` when judgment was used.
4. Preserve existing Grilling Protocol caps (one question / round, max 3 rounds, no product code edits).

**Security / integrity:** No secrets scanning change. Do not invent new config keys. Keep en-us and harness-neutral path tokens.

## 1. Definition of Ready & Scope

**Assumptions (resolved):**
- Spec path: `{plansDir}/interview-project-context-auto-answer/step-00-interview-project-context-auto-answer.spec.md`
- SoT edit target: `src/skills/ws-interview/SKILL.md` (upstream Skill SoT)
- Dogfood: `.agents/skills/ws-*` is gitignored generated output — align via `npm run sync-skills` after SoT edit (AC6)
- Stack: Node skills package; no DB / frontend / migrations
- Orch already maps `autoMode` → auto-gate index 0; interview `needs_user` auto-picks first option — skill must still **prefer project sweep + explicit model-inferred defaults** before relying on orch auto-pick of a poorly prepared question

**In scope:**
- Expand Grilling Protocol + Resolve / Escalate steps in `ws-interview` SKILL.md
- Optional one-line cross-link in `src/skills/ws-shared/gates.md` and/or `src/skills/ws-spec-to-pr/PROTOCOLS.md` § Refinement FSM 2b if autoMode wording is ambiguous after skill edit
- Update `src/skills/ws-interview/evals/evals.json` with ≥1 assertion covering project-context sweep + autoMode fallback
- Sync dogfood copy / integrity only as required by ship checklist later

**Out of scope:**
- Lite pipeline changes
- New scripts / CLI / config schema keys
- Changing escalation cap (3) or shared-understanding FSM states
- Rewriting orch Step 2 state machine beyond a minimal cross-reference

**Acceptance Criteria (from spec):** AC1–AC7 as written in step-00.

## 2. Technical Design & Architecture

**Layers touched (config.json):**

| Layer | Path | Change |
|-------|------|--------|
| skills-sot | `src/skills/ws-interview/SKILL.md` | Protocol: project-context sweep + evidence + autoMode branch |
| skills-sot | `src/skills/ws-interview/evals/evals.json` | Eval coverage for new obligations |
| skills-sot (optional) | `src/skills/ws-shared/gates.md` and/or `src/skills/ws-spec-to-pr/PROTOCOLS.md` | One-line pointer: Resolve = project sweep before escalate; autoMode closes with model-inferred |
| installer-cli | none expected | No CLI change |
| tests | none expected for this feature | Behavior is agent-protocol; harness regression only if ship later |

**Design — replace/extend “Diligent exploration first” with an ordered sweep checklist:**

When resolving each registered gap, search (as applicable) before escalate/default:

1. Related specs — `{specsDir}/**/*.spec.md`, `{plansDir}/**/step-00-*.spec.md`, current US `step-00`
2. Memory — `{sharedDir}/MEMORY.md` and `{sharedDir}/memory/*` (honor **DO NOT** / **INSTEAD DO**)
3. Codebase + patterns — layers from `config.json` `stack.*.layers`, existing modules mirroring the gap
4. Architecture / domain — `domain.architectureSpec`, `domain.glossaryFile`, `rules.stackFile`, ADRs / schema if present
5. Rules / guides — `config.json` → `rules.*` paths, hub `AGENTS.md`, configured standards skills (`rules.seniorDeveloper`, `rules.karpathyGuidelines`, etc.)

**Resolution precedence:**
- Hit in sweep → `status: resolved`, `resolutionSource: project`, cite path(s)
- Miss + `autoMode` (or workflow auto-answer equivalent) → apply best judgment, `resolutionSource: model-inferred`, do **not** emit `needs_user` for that gap
- Miss + interactive + blocking → Escalate (unchanged surgical user-gate)
- Miss + interactive + non-blocking → default, no user escalate (AC5)

**Registry fields (document in skill; keep YAML step-output compatible):**
Existing registry entries gain documented optional fields: `resolutionSource` (`project` | `model-inferred` | `assumed-default`), `evidence` (paths + rationale). Prefer extending prose + table columns over breaking orch parsers — if orch only reads `resolution` string, embed evidence inline in `resolution` text.

**Invariant checks:** `commitPlanFilesOnlyAtStep8` unchanged. No tenancy/EF keys apply.

**Fable:** N/A — skill-protocol edit; no IaC/K8s/DB domain signals requiring `ws-fable-domain`.

## 3. Step-by-Step Plan

### Step A — Audit current wording (read-only)
- Confirm baseline gaps in Grilling Protocol #1 and Resolve/Escalate vs AC1–AC5.
- Skim PROTOCOLS.md Refinement FSM 2b and gates.md autoMode user-gate rule for conflict.
- **Files:** `src/skills/ws-interview/SKILL.md`, `src/skills/ws-spec-to-pr/PROTOCOLS.md`, `src/skills/ws-shared/gates.md`
- **Check:** List exact paragraphs to replace; no drive-by orch rewrite.

### Step B — Update Grilling Protocol + Resolve/Escalate in SoT
- Rewrite rule 1 as **Project-context sweep first** with the ordered source list (AC1).
- Expand Step **Resolve**: prefer project evidence; require evidence / `resolutionSource` in registry (AC2, AC5).
- Expand Step **Escalate**: only after sweep miss; if `autoMode` → model-inferred close instead of `needs_user` (AC3); else existing surgical escalate (AC4).
- Keep caps, design-tree order, no-code-edits, fast-exit behavior.
- Enforce en-us + tokens `{sharedDir}` / `{specsDir}` / `{plansDir}` / `user-gate` (AC7).
- **Files:** `src/skills/ws-interview/SKILL.md`
- **Check:** Diff is surgical; no host product names; version bump only if this repo’s skill-ship convention requires it on content change (defer to ship gate).

### Step C — Minimal orch/gates cross-link (only if needed)
- If Step B alone leaves autoMode interview ambiguous vs orch “auto-pick option 0”, add **one** clarifying sentence under Refinement FSM 2b and/or gates Conditional interview: project sweep → then model-inferred in autoMode before escalate.
- **Files (optional):** `src/skills/ws-spec-to-pr/PROTOCOLS.md`, `src/skills/ws-shared/gates.md`
- **Check:** No FSM state renumbering; no new gates.

### Step D — Evals
- Add eval prompt/assertions: agent must search project context before asking; in autoMode must not block on user for sweep-miss gaps; registry cites evidence or model-inferred.
- **Files:** `src/skills/ws-interview/evals/evals.json`
- **Check:** Assertions map to AC1–AC4.

### Step E — Dogfood align
- Run `npm run sync-skills` so `.agents/skills/ws-interview/` matches SoT (AC6), noting `.gitignore` ignores generated `ws-*` under `.agents/skills/`.
- **Check:** Dogfood SKILL.md contains new sweep/fallback wording.

### Step F — Authoring hygiene (pre-claim)
- Spot-check progressive disclosure: keep SKILL lean; avoid duplicating full MEMORY/rules catalogs — point to config tokens.
- Follow `SKILL_AUTHORING.md` pruning: no sediment, Done-when criteria stay verifiable.
- **Check:** Skill still loads with banner line; steps remain numbered with Done when.

## 4. Permissions, Tenancy & i18n

- **RBAC / tenancy:** N/A (harness skill package; `tenancyField` empty).
- **i18n:** Skill body en-us only; no UI strings.

## 5. Test Coverage

| AC | Verification | Method / check |
|----|--------------|----------------|
| AC1 | Skill prose lists full sweep sources | Manual review of `SKILL.md` Grilling Protocol / Resolve |
| AC2 | Prefer project + evidence required | Manual review + eval assertion (evals.json) |
| AC3 | autoMode → model-inferred, no user block | Manual review Escalate branch + eval assertion |
| AC4 | Interactive blocking → user-gate protocol | Manual review Escalate + existing grill rules unchanged |
| AC5 | Non-blocking defaults without escalate | Manual review Resolve Done when |
| AC6 | Dogfood aligned | `npm run sync-skills` then diff SoT vs `.agents/skills/ws-interview/SKILL.md` |
| AC7 | en-us + tokens / neutrality | `ws-check-harness` Phase portability/en-us when shipping; spot-check diff |

No unit/integration app tests (protocol-only change). Optional later: `ws-check-workflows` only if PROTOCOLS/gates FSM text changes materially.

## 6. Invariants (Do Not Violate)

- From `config.json.invariants`: `commitPlanFilesOnlyAtStep8` — do not commit plan artifacts early during implement/ship of this feature.
- Skill SoT is `src/skills/ws-*` — never treat `.agents/skills/ws-interview` as lasting SoT (MEMORY: use `ws-shared` config paths, not retired `shared/`).
- No silent consumer-script refactors; this change is upstream skill prose.
- Do not hardcode IDE/agent product names or absolute machine paths.
- Do not expand scope into lite orch, new config keys, or escalation-cap changes.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot only; optional gates/protocols one-liners).
- [ ] Domain entities and mappings encapsulated — N/A.
- [ ] Schema migrations created — N/A.
- [ ] Authorization checks applied — N/A.
- [ ] i18n keys declared — N/A (en-us skill prose).
- [ ] Test cases cover all ACs (manual + evals mapping in §5).
- [ ] `npm run sync-skills` after SoT edit.
- [ ] On ship: integrity / harness per upstream `ws-ship-pr` gate if hashed content changes.

## 8. Open Questions

1. **Registry schema:** Embed evidence only inside the existing `resolution` string, or add explicit `resolutionSource` / `evidence` fields to step-output YAML? **Recommendation:** add documented optional fields; if orch ignores unknowns, keep `resolution` human-readable with evidence inline for backward compatibility.
2. **autoMode vs softSkipEligible:** Should `softSkipEligible` fast-exit still skip the full project-context sweep when `blocking_open == 0` after Audit? **Recommendation:** yes — keep fast exit; sweep applies when Resolve runs on registered gaps.
3. **Orch cross-link required?** If skill Escalate text alone is unambiguous for autoMode, skip PROTOCOLS/gates edits (prefer minimal diff). Confirm during interview.
