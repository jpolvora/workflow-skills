# Code Review: Improve agentic code reviewers prompt

**Commit**: 7d6d39fb  
**Branch**: develop  
**Base**: main  
**Reviewer**: ws-code-review (automated)  
**Date**: 2026-09-27  

---

## Phase 1: Spec Compliance

| AC | Compliant | Evidence |
|----|-----------|----------|
| AC1: Audit recorded | Y | Spec §Description records `--stack Custom` requires `--custom-prompt`, `--score-min 5` enforced in prompt §5 and workflow args. `include-patterns` and `extra-exclude` paths documented. Workflow unchanged except comment addition. |
| AC2: Revised prompt ≤80 lines, high-signal gates kept, low-value repetition removed, en-us | Y | New prompt is 43 lines (was 57). All 8 high-signal gates preserved (routing, NN-*, inventory drift, dependency closure, installer, harness gates, secrets, FSM). Low-value items removed: "Shared vs promoted skills", "Invocation names", "ESM / Node" general advice. File is en-us. |
| AC3: Custom-stack contract preserved | Y | Workflow still has `--stack Custom --custom-prompt .github/agentic-code-reviewers-prompt.md --score-min 5`. Added explicit comment on line 125: "Custom stack requires --custom-prompt; do not run Custom without it." Prompt §3 also states "never Custom alone". |
| AC4: Coverage delta explicit | Y | Decision: keep-local default. No sections moved upstream. Spec Notes state "Companion decision: if upstream generic improvement is warranted... write context.md... otherwise no companion file (no gray area)." Implementation kept all content repo-local. |
| AC5: Workflow functionally intact | Y | Diff shows only comment addition (line 125). All functional elements unchanged: env-driven engine/model/variant, Node 22.13, timeout 1200000ms, `gh api` PR context, `AGENTIC_CODE_REVIEWERS_EXTRA_EXCLUDE_PATTERNS=.agents/plans/**,.agents/specs/**`, `score_min 5` flag, `include-patterns`. |
| AC6: Hub paths aligned with current managed layout | Y | All referenced paths verified: `AGENTS.md` (exists), `.ws/AGENTS.md` (exists), `{skillsRoot}/ws-shared/runtime/autoload.md` (exists), `bin/skill-dependencies.json` (exists), `docs/index.html` (exists), `node bin/build-site.js` (exists), `config.schema.json` (exists at `.agents/skills/ws-shared/runtime/`), `config.json.example` (exists at `.agents/skills/ws-shared/templates/`). No retired `.ws/runtime` or `.agents/skills/ws-shared` hub paths. |
| AC7: Validation observable | Y | Spec §Validation & Observation Notes enumerates: `validate_spec.cjs --mode=authoring`, `check_harness_links.cjs` / `npm run test`, `npm run review:dry`, `git diff main...HEAD`. Limitation note included for credential/network unavailability. |

---

## Phase 2: Adversarial Review

### Findings

| # | Severity | File | Line | Description | Suggested Fix |
|---|----------|------|------|-------------|---------------|
| 1 | Low | `.github/agentic-code-reviewers-prompt.md` | 17 | "Shared vs promoted skills" guidance removed. Previously flagged inventing skill folders in `ws-shared/` hub. Now only covered implicitly by inventory drift item. | Consider adding: "Do not invent skill folders in `ws-shared/` — it holds config/docs only." |
| 2 | Low | `.github/agentic-code-reviewers-prompt.md` | 17 | "Invocation names" guidance removed. Previously restricted to `ws-skillname` and bare `skillname` only. NN-* ban remains but positive allowed-forms list is gone. | Consider adding: "Invocation names: `ws-skillname` or bare `skillname` only." |
| 3 | Low | `.github/agentic-code-reviewers-prompt.md` | 30 | "ESM / Node" general advice removed (Promise rejections, path joins). Minor loss of general harness quality guidance. | Optional: add "Match existing ESM patterns; handle Promise rejections." |
| 4 | Info | `.github/workflows/agentic-code-review.yml` | 125 | Added comment is accurate and helpful. No functional change. | None needed. |
| 5 | Info | `.github/agentic-code-reviewers-prompt.md` | 38 | "Prefer `node` over `python` for harness checks; no Python runtime is a consumer dependency." Good alignment with Node-only stack invariant. | None needed. |

### Security Review

- No secrets or tokens in prompt or workflow
- Workflow uses `${{ secrets.* }}` references correctly
- Prompt correctly instructs reviewer to check for committed secrets
- No hardcoded credentials, API keys, or tokens

### Prompt Effectiveness Assessment

The revised prompt is more concise (43 vs 57 lines) while preserving all high-signal gates. The numbered priority list (items 1–8) gives the reviewer clear triage guidance. The removal of low-value repetition (e.g., detailed invocation name rules, general ESM advice) reduces cognitive load without losing harness-defect coverage. The prompt remains effective for its purpose.

### Hub Path Verification

All paths referenced in the prompt were verified against the actual repository:

| Reference | Path Exists | Notes |
|-----------|-------------|-------|
| Root `AGENTS.md` | Y | |
| `.ws/AGENTS.md` | Y | |
| `{skillsRoot}/ws-shared/runtime/autoload.md` | Y | Current managed layout |
| `bin/skill-dependencies.json` | Y | |
| `docs/index.html` | Y | |
| `node bin/build-site.js` | Y | |
| `config.schema.json` | Y | At `.agents/skills/ws-shared/runtime/` |
| `config.json.example` | Y | At `.agents/skills/ws-shared/templates/` |
| `.cursorrules` | N/A | Consumer file, not repo file — prompt correctly references it as installer seed |
| `CHANGELOG.md` | Y | |
| `spec-to-pr/STEP-DISPATCH.md` | Y | |

---

## Overall Verdict

**APPROVE**

All 7 acceptance criteria are met. The prompt is simplified (57→43 lines), high-signal gates are preserved, hub paths are correct, workflow is functionally intact with only a comment addition, and no security concerns were identified. The three minor findings (removed guidance items) are low-severity and do not block approval.

**Score: 9/10**

---

## JSON Summary

```json
{
  "reviewPath": ".agents/plans/improve-agentic-reviewers-prompt/step-06-improve-agentic-reviewers-prompt.review.md",
  "verdict": "APPROVE",
  "score": 9,
  "findings": [
    {
      "severity": "low",
      "file": ".github/agentic-code-reviewers-prompt.md",
      "description": "\"Shared vs promoted skills\" guidance removed — ws-shared/ hub files should be config/docs only"
    },
    {
      "severity": "low",
      "file": ".github/agentic-code-reviewers-prompt.md",
      "description": "\"Invocation names\" allowed-forms list removed — ws-skillname or bare skillname only"
    },
    {
      "severity": "low",
      "file": ".github/agentic-code-reviewers-prompt.md",
      "description": "\"ESM / Node\" general advice removed — Promise rejections, path joins"
    }
  ],
  "specCompliant": true
}
```
