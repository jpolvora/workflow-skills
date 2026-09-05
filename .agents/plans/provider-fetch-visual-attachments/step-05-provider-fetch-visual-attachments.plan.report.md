---
us: null
reportDate: "2026-09-03T14:38:00Z"
score: 10
sourcePlans:
  - step-02-provider-fetch-visual-attachments.plan.refined.md
evalSource: step-02-provider-fetch-visual-attachments.plan.refined.md
step: 5
slug: provider-fetch-visual-attachments
workflowId: provider-fetch-visual-attachments-20260903T131113Z
files_touched: []
recommendation: Advance
status: active
startedAt: "2026-09-03T13:11:13Z"
endedAt: "2026-09-03T14:39:40.803Z"
acRefs: []
---
# Plan Implementation Audit Report — provider-fetch-visual-attachments

**Score: 10/10**

**Recommendation: Advance**

## Executive Summary

All 28 acceptance criteria and 8 negative scenarios are implemented with file:line and test evidence. The shared `ingest_visual_attachments.cjs` helper, GitHub and Azure DevOps converter wiring, contract/INTENTS parity, register copy, downstream skill Read obligations, FORMAT/cleanup/FEATURES docs, and fixture tests match the refined plan.

Focused verification passed: `node test/test-visual-attachment-ingest.js` (exit 0) and `node test/test-provider-parity.js` (exit 0). Full `npm run tests` exited 1 due to a pre-existing install tree mismatch (`ws-shared/host-capabilities.json` present in the source dogfood tree but correctly omitted from packaged install); `backendTest` alias recorded with `skipReason: baseline-dirty`.

## Result by Feature

| AC | Situation | Evidence |
|----|-----------|----------|
| AC1 | **Implemented** | Nine required intents unchanged; contract + parity tests (`test/test-provider-parity.js:L90-L99`) |
| AC2 | **Implemented** | `github-issue-to-spec.py` extracts body + comment URLs (`L163-L180`); fixture test |
| AC3 | **Implemented** | `ado-workitem-to-spec.py` `collect_visual_urls` for HTML, relations, comments (`L248-L261`) |
| AC4 | **Implemented** | Single shared helper; both converters subprocess `ingest_visual_attachments.cjs` |
| AC5 | **Implemented** | `specStemFromPath` + `{specStem}.assets/` (`ingest_visual_attachments.cjs:L80-L84`, `L303-L305`) |
| AC6 | **Implemented** | `classifyKind` + `01-screenshot-login.png` naming in fixture |
| AC7 | **Implemented** | Keyword/origin kind algorithm (`ingest_visual_attachments.cjs:L100-L112`) |
| AC8 | **Implemented** | `resolveGithubToken` / `resolveAdoPat` auth reuse (`L198-L228`) |
| AC9 | **Implemented** | `isGithubAllowlisted` / `isAdoAllowlisted` + disallowed-host skip |
| AC10 | **Implemented** | `PER_FILE_LIMIT` / `RUN_LIMIT` + `size-limit skip` test |
| AC11 | **Implemented** | HTTP failure → manifest `failed`, exit 0 (`partial HTTP failure` test) |
| AC12 | **Implemented** | `buildVisualReferencesSection` + rewritten repo-relative links |
| AC13 | **Implemented** | Zero `ok` → no `.assets/` dir (`size-limit skip` test) |
| AC14 | **Implemented** | `register_local_spec.cjs` copies sidecar (`L133-L137`) |
| AC15 | **Implemented** | `ws-spec-write/SKILL.md` vision Read obligation |
| AC16 | **Implemented** | `ws-plan-write`, `ws-plan-interview`, `ws-implement-tasks` SKILL bodies |
| AC17 | **Implemented** | `FORMAT.md` optional heading; compat validate passes without it |
| AC18 | **Implemented** | `scm-provider-contract.md` `fetch-to-spec` row extended |
| AC19 | **Implemented** | Both `INTENTS.md` ingest procedures; parity exit 0 |
| AC20 | **Implemented** | `test-provider-parity.js` asserts both INTENTS mention assets/Visual References |
| AC21 | **Implemented** | `ALLOWED_MIME` / `DISALLOWED_MIME` gates in helper |
| AC22 | **Implemented** | PDF as file link, not `![]`; spec-write skips PDF vision |
| AC23 | **Implemented** | ADO `clean_html` img→markdown before strip |
| AC24 | **Implemented** | Offline `--input` + partial download without abort |
| AC25 | **Implemented** | Mock-HTTP fixtures for both converters (`test-visual-attachment-ingest.js:L249-L416`) |
| AC26 | **Implemented** | `ws-spec-from-provider` inherits via `fetch-to-spec`; no second downloader |
| AC27 | **Implemented** | `ws-cleanup/PATTERNS.md` never-delete `*.assets/` |
| AC28 | **Implemented** | `FEATURES.md` § SCM parity documents ingest on `fetch-to-spec` |

## Negative Scenarios

| NS | Guard test | Status |
|----|------------|--------|
| NS1 Parity split | `test-provider-parity.js` INTENTS assets assertion | Covered |
| NS2 New intent leak | Required intents count = 9 | Covered |
| NS3 Silent host switch | Partial failure without provider switch | Covered |
| NS4 Stripped ADO images | `ado clean_html preserves img markdown` | Covered |
| NS5 Remote leftover | Spec rewrites remote URLs after `ok` download | Covered |
| NS6 Hard fail on 404 | `partial HTTP failure` exit 0 | Covered |
| NS7 Disallowed host | `helper ok image + disallowed host` | Covered |
| NS8 Plan-only assets | Register copies `{specStem}.assets/` under `{specsDir}` | Covered |

## Verification Evidence

| Command | Exit |
|---------|------|
| `node test/test-visual-attachment-ingest.js` | 0 |
| `node test/test-provider-parity.js` | 0 |
| `npm run tests` | 1 (install tree verify: missing `host-capabilities.json` in test target — pre-existing dogfood dirty file) |

## Regression Sabotage Check

| Field | Result |
|-------|--------|
| Status | not-required (`sabotage.required: false` in ac-ledger) |

## Gaps and Next Steps

- None blocking implementation. Score 10/10 meets `minVerifyScore: 9`.
- **Note:** `npm run tests` install-phase failure is environmental (dogfood `host-capabilities.json` in source tree). Targeted feature tests pass. Orch may proceed to Step 6 and G2 product commit.
- Do **not** product commit in this step (orch G2 after Step 5 when score ≥ 9).
