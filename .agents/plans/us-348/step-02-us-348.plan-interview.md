# Plan Interview — us-348 (host capabilities: detect tools & cache)

Auditor: worker inline (Step 2) · Plan: `step-01-us-348.plan.md` · Spec: `step-00-us-348.spec.md`

## Registry

| # | Finding / Question | Severity | Verdict |
|---|--------------------|----------|---------|
| 1 | §6 names no touched framework boundaries (docs + Node script + JSON only). Is §6 vacuous? | Gap-check | Accepted — §6 correctly records "none" with rationale plus the invariant that still applies (`commitPlanFilesOnlyAtStep8`) and names the implement-time `scan_stack_invariants.cjs` run. Not a silent pass. |
| 2 | Token naming taste (`{readFile}` vs prose). Spec explicitly proposes `{readFile}`-style tokens. | Decision | APPROVED — adopt `{readFile}` style; evidence is the spec's shell-out symptom. |
| 3 | Pre-map granularity: per-model vs per-host-family. | Decision | Per-host-family neutral shape keys + `generic` fallback. Keeps the map small and portable; per-model entries would rot and risk product branding in shipped prose. |
| 4 | Cache invalidation: TTL vs explicit-refresh-only. | Decision | Explicit-refresh-only within a session key (`hostId::orchestratorModel`), refresh on `--refresh` flag, host/toolset change, or explicit rebind. Matches existing host-dispatch §2 no-re-probe rule; predictable. |
| 5 | Memory trap (High): ship must bump release version when branch version equals base. Plan omits it. | Gap | REFINED — added ship step 7 to refined plan. |
| 6 | Memory trap (Medium): token contracts must state effective resolution when a fallback exists. | Gap | REFINED — refined plan requires the tokens doc to state effective resolution (pre-map hit → host-declared → minimal fallback). |
| 7 | Memory trap (Medium): restructured contracts need a quoting-file sweep. Plan edits `tools.md` + `host-dispatch.md`. | Gap | REFINED — added quoter-sweep check to refined plan step 4. |
| 8 | Memory trap (Medium): new contract carve-outs need same-batch regression assertions. | Check | Covered — new `test/test-host-capabilities.js` ships in the same batch with negative assertions. |
| 9 | Memory trap (High): avoid redundant dual Node/Python scripts. | Check | Covered — probe script is Node-only (`.cjs`), no Python twin. |
| 10 | AC coverage: every AC maps to ≥1 plan step and ≥1 §5 test (AC1→step 1, AC2→step 3, AC3→steps 1+4, AC4→steps 3+4, AC5→step 2). | Check | PASS. |

## End decision

**APPROVED with refinements** — proceed to Step 4 on the refined plan. No blocking gaps; §6 audit
complete for touched boundaries (none); unresolved choices in §8 all decided above.
