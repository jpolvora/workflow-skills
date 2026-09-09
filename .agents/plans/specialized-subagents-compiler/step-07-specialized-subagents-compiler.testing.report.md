---
step: 7
slug: specialized-subagents-compiler
workflowId: specialized-subagents-compiler-20260909T120930Z
status: active
startedAt: "2026-09-09T12:09:30Z"
endedAt: "2026-09-09T12:54:46.750Z"
acRefs: []
---
# Testing Report: Specialized Subagents Compiler

**Workflow ID:** `specialized-subagents-compiler-20260909T120930Z`
**Slug:** `specialized-subagents-compiler`
**Timestamp:** `2026-09-09T12:54:30Z`
**Status:** `PASS`
**Mutation Gate:** Bypassed / not configured (`skipMutationTesting: true` or default)

---

## 1. Test Suite Execution Summary

| Test Suite | Command | Result | Details |
|---|---|---|---|
| Specialized Subagents Unit Tests | `node test/test-specialized-subagents-compiler.js` | PASS | 9 tests passed covering AC1–AC17, NS1–NS5 |
| Auto-Configure Integration Tests | `node test/test-configure-auto.js` | PASS | 39 test assertions passed |
| Hub Layout & Runtime Isolation | `node test/test-ws-shared-layout.js` | PASS | Hub layout verified |
| Package Integrity Manifest | `npm run verify-integrity` | PASS | `bin/skill-integrity.json` matches source tree |
| Workflows Simulation Scan | `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` | PASS | 0 issues detected across all workflows |
| Invariant Static Scan | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` | PASS | 20 files scanned, 0 issues |

---

## 2. Verification of Specific Acceptance Criteria

- **Schema Validation (AC1):** Verified valid enum values, boolean enabled flag, and default prefix "ws" in `config.schema.json`.
- **Compiler Generation (AC5–AC9, AC15):** Verified all 10 workflow step definitions (Steps 00–09) are correctly materialized in `.cursor/agents/` with valid YAML frontmatter, restricted descriptions, `disable-model-invocation: true`, and `readonly: true` for Step 05.
- **Clean Mode (AC12, NS5):** Verified that `--clean` removes all generated agents while strictly preserving non-generated custom files.
- **Drift Detection (AC13, NS2):** Verified that `--check` exits 0 on clean projections and exits 1 when a generated file is modified or deleted.
- **Hub Classification (AC14):** Verified `.cursor/agents` is categorized under `generatedHostProjections` with `optional-track-or-ignore`.
- **Fail-Safe Fallback (AC10, AC11, AC16, NS3, NS4):** Verified Tier 1 host dispatch ladder documentation and contract.
- **Auto-Configure Integration (AC2–AC4):** Verified `--section specializedSubagents` fills gaps, auto-detects `cursor` when `.cursor/` is present, and auto-compiles when enabled.

---

## 3. Conclusion

All unit and integration tests are green. Step 7 testing is successfully verified. Ready to advance to Step 8 (Ship / Delivery Close).
