---
id: null
slug: parametrized-min-verify-score
title: "Parametrized min verify score (defaults.minVerifyScore)"
source: local
specDate: 2026-08-25
---

# Specification — Parametrized min verify score (defaults.minVerifyScore)

## Description

Standard Step 5 check-implementation advances only when the ledger-derived score is at least **9**. That **9** is hardcoded in scripts, gates, orchestrator dispatch, and docs. Consumers cannot raise or lower the bar without forking skill bodies.

This feature adds one integer, **`defaults.minVerifyScore`**, on project `config.json`. It is the single advance / `scoreAndRefine` / post-review `requiresFix` bar. Default remains **9**. Allowed range is **1–10**. Omitted or invalid values resolve to **9** so existing projects keep today's contract.

After verify, when the score already meets the bar, is below 10, and reaching 10 looks low-effort, the orchestrator asks whether to polish to 10 before G2-code and Step 6. `autoMode` skips that offer and advances.

### Design Intent

Keep the ledger-derived 0–10 score formula. Keep `knownDefect` cap 8, `missingEvidence` cap 9, and `completeTen` as the only path to 10. Change **who compares the score to a threshold**: scripts and orch read `defaults.minVerifyScore` instead of a literal 9. Do not add a second knob. Do not author or override the numeric score.

### Config shape

| Key | Type | Default | Meaning |
|-----|------|---------|---------|
| `defaults.minVerifyScore` | integer 1–10 | `9` | Minimum ledger score to Advance Step 5, to stop the mandatory `scoreAndRefine` loop, to flag tasks for re-implement, and to set `requiresFix` from verify score in `merge_verify_review.cjs`. |

**Runtime resolution (mandatory):**

1. Explicit integer `1`–`10` in project `config.json` → that value.
2. Key omitted, non-integer, out of range, or config missing → **9**.
3. JSON Schema `default: 9` is documentation/seed only. Runtime never treats schema-alone as the live value (same omitted-key discipline as `verboseMode`, except the fallback here is 9, not off).

### Enforcement sites (read the resolved integer)

| Site | Today | After |
|------|-------|-------|
| `workflow_state.cjs` pre-advance 6 | `derived.score < 9` | `derived.score < minVerifyScore` |
| `merge_verify_review.cjs` `requiresFix` | `verify.score < 9` | `verify.score < minVerifyScore` |
| `classify.cjs` low-score cluster | `s < 9` | `s < minVerifyScore` |
| `gates.md`, `STEP-DISPATCH.md`, `ws-verify-plan`, TEMPLATE, autoload, CATALOG, FEATURES, README, DIAGRAM, FAQ | literal ≥ 9 | configured bar, default 9 |
| `ws-configure-project` defaults interview | not asked | integer 1–10, Recommended 9 |

Helper: one exported resolver (for example `resolveMinVerifyScore(config)` next to other defaults resolvers) used by Node scripts. Skill/orch prose cites `defaults.minVerifyScore` (default 9).

### Score-10 offer (after verify, before G2-code)

Present `user-gate` only when **all** hold:

- overall score **≥** resolved `minVerifyScore`
- overall score **< 10**
- ledger `knownDefect` is false
- remaining gap is `missingEvidence` and/or `completeTen` false (evidence/linkage, not a known defect)
- the executing agent judges remaining work as small (link tests/files, fill evidence, tiny AC polish). Large rework → skip the offer.

Options:

1. **Reach 10 before advance** (Recommended)
2. **Advance at {score}**

Cancel → STOP (HS-1). Never infer yes.

`autoMode`: skip the offer; advance at the current passing score.

Choosing Reach 10 runs one `scoreAndRefine` polish round (role `scoreAndRefine`), then re-verify. If still < 10, do not block Advance when score still meets `minVerifyScore`.

### Not this feature

The scoring **formula** stays in `ac_ledger.cjs`. Caps at 8/9/`completeTen` are how 10 is earned, not the Advance bar.

## Acceptance Criteria

- AC1: `config.schema.json` defines `defaults.minVerifyScore` as an integer with minimum 1, maximum 10, and default 9.
- AC2: `config.json.example` seeds `defaults.minVerifyScore` as 9 with a comment that omitted or invalid values resolve to 9.
- AC3: Runtime resolution uses an explicit integer 1–10 from project `config.json`.
- AC4: Runtime resolution falls back to 9 when the key is omitted, non-integer, out of range, or config is missing.
- AC5: `workflow_state.cjs` pre-advance 6 fails when the derived ledger score is below the resolved minVerifyScore.
- AC6: `merge_verify_review.cjs` sets `requiresFix` from verify score using the resolved minVerifyScore.
- AC7: `classify.cjs` counts low-score tasks using the resolved minVerifyScore.
- AC8: Gate and orch copy names `defaults.minVerifyScore` (default 9) instead of a hardcoded Advance bar of 9.
- AC9: After verify, orch presents a Reach-10 `user-gate` when score meets the bar, is below 10, and effort to 10 is low.
- AC10: `autoMode` skips the Reach-10 offer and advances at the current passing score.
- AC11: `ac_ledger.cjs` keeps `knownDefect` cap 8, `missingEvidence` cap 9, and `completeTen` as the only path to score 10.
- AC12: `ws-configure-project` defaults interview asks for minVerifyScore with Recommended 9.
- AC13: Automated tests cover omitted→9, explicit 8 allowing score 8, explicit 10 blocking score 9, and invalid→9.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Second config knob for post-review vs scoreAndRefine | Approved design is one integer |
| Changing the 0–10 ledger scoring weights | Formula stays; only the Advance comparison is parameterized |
| Lite Step 2/3 score gate | Lite has no Step 5 ledger Advance bar |
| Forcing score 10 on every run | Offer is optional; min bar stays configurable |
| Per-task threshold different from overall min | Same resolved integer flags tasks and gates Advance |
| Weakening fable REFUTED / G2-code / HS gates | Unrelated safety floors |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Allowed range | Integer 1–10 | User chose full range; default 9 preserves today's bar | y |
| Config shape | Single `defaults.minVerifyScore` | Same bar for scoreAndRefine, Step 5 Advance, and post-review `requiresFix` | y |
| Omitted key | Resolve to 9 | Existing consumers must not change behavior | y |
| Reach-10 offer in `autoMode` | Skip and advance | Avoid a new blocking gate in unattended runs | y |
| Reach-10 after a failed polish | Advance if still ≥ minVerifyScore | Offer is optional quality, not a new hard bar | y |
| Auth / tenancy / TTL | N/A because this is local config + Node CLIs with no network or tenant data | Local files only | y |
