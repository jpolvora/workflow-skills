---
slug: spec-provider-skills
step: 11
title: "Integration test report — spec-provider-skills"
mode: auto-full
skipBrowser: true
sourcePlan: step-11-spec-provider-skills.integration-test.plan.md
executedAt: "2026-07-13T14:55:00Z"
verdict: PASS
---

# Integration Test Report — spec-provider-skills

**Mode:** `[AUTO][FULL]` — browser MCP skipped  
**Stack:** node-skills-hub (no API/DB/UI runtime)  
**Plan:** `step-11-spec-provider-skills.integration-test.plan.md`  
**Config verification:** `backendBuild` = `node bin/build-site.js`; `backendTest` = `npm run tests -- --local`

## Summary

| Check | Result | Evidence |
|-------|--------|----------|
| IT-BUILD | **PASS** | exit 0; site updated: 33 skills / 5 layers; all three providers in `docs/index.html` |
| IT-PACK | **PASS** | `npm run tests -- --local` exit 0; Phase 0/0b/1/2/2b all green |
| IT-SHIM (converters + ADO ctx) | **PASS** | `--help` exit 0 for GH/ADO converters + `fix_pr_azure_context.py` shims |
| IT-SHIM (08 CJS) | **PASS*** | Thin shims load/forward; no argparse `--help`. Manual `--help` exits 1 with arg errors (expected). Automated Phase 0b + consumer Phase 2: "Shim --help / usage forward smoke passed" |
| IT-DUAL | **PASS** | Standalone + Workflow headings in all three provider `SKILL.md` |
| Browser / UI | **SKIP** | Per `skip-browser` / no browser MCP |
| Live GH/ADO fetch | **SKIP** | Optional; not AC gate for hub packaging |

\* Not a defect: CJS entrypoints expect PR/thread IDs; reachability proven by pack canonicity + suite smoke.

**Overall verdict: PASS** — safe to advance toward Step 12 (delivery). No critical failures; **0 code fixes** applied.

## Execution log

### 1. Build site (`IT-BUILD`)

```text
node bin/build-site.js
→ ✅ Site updated: 33 skills across 5 layers (exit 0)
```

Catalog cards present for `azure-devops-provider`, `github-provider`, `local-spec-provider`.

### 2. Local install suite (`IT-PACK`)

```text
npm run tests -- --local
→ ✅ Success! Install, canonicity, self-overwrite, update+config preserve, rename migration all passed.
```

Highlights:
- Phase 0b: canonicity (providers + converter shims) + shim forward smoke
- Install: 25 skills including three providers
- Phase 2: `update --include-new` reinstalled `azure-devops-provider`; consumer shim forward smoke
- Phase 2b: legacy `us-workflow` → `spec-to-pr` migration

### 3. Shim smoke (`IT-SHIM-*`)

| Shim path | Command | Exit | Notes |
|-----------|---------|------|-------|
| `spec-to-pr/scripts/github-issue-to-spec.py` | `--help` | 0 | Forwards; argparse help OK |
| `spec-to-pr/scripts/ado-workitem-to-spec.py` | `--help` | 0 | Forwards; help OK |
| `08-fix-pr/scripts/fix_pr_azure_context.py` | `--help` | 0 | en-us help; collect/resolve-thread |
| `08-fix-pr/scripts/fetch_threads.cjs` | `--help` | 1 | "Pull request ID must be an integer" — shim loaded |
| `08-fix-pr/scripts/resolve_thread.cjs` | `--help` | 1 | GraphQL treats `--help` as id — shim loaded |

Suite-owned smoke covers usage/forward for CJS without requiring argparse `--help`.

### 4. Dual-mode spot-check (`IT-DUAL`)

| Provider | Standalone | Workflow |
|----------|------------|----------|
| github-provider | L19 | L36 |
| azure-devops-provider | L19 | L37 |
| local-spec-provider | L23 | L37 |

### 5. N/A sections

- Database / seeds: none  
- API HTTP contracts: none  
- RBAC / tenancy matrix: none  
- Browser routes / a11y: skipped  

## Defects

None blocking. Non-blocking notes (carry from Step 6; unchanged):

1. Live remote `fetch-to-spec` smoke still optional before merge.
2. Offer `/check-harness` to user after skill/hub edits (process).

## Code fixes this step

None (max 3 allowed; none required).

## Artifacts

| File | Action |
|------|--------|
| `step-11-spec-provider-skills.integration-test.plan.md` | created |
| `step-11-spec-provider-skills.integration-test.report.md` | created (this file) |

Plans dir remains uncommitted per workflow invariant (`commitPlanFilesOnlyAtStep12`).

## AC coverage (integration battery)

| AC | Status via this step |
|----|----------------------|
| AC8 | Confirmed: tests + site catalog |
| AC9 | Confirmed: shims reachable + suite forward smoke |
| AC1 (dual-mode) | Confirmed: heading spot-check |
| AC2–AC7 | Relies on Step 6 APPROVE; not re-failed here |

## Recommendation

**Advance to Step 12** (PR / delivery gate). Integration battery PASS under auto-full without browser.
