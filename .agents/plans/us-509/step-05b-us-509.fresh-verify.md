---
step: "6b"
slug: us-509
workflowId: us-509-20261013T015209Z
status: completed
startedAt: "2026-10-13T02:00:00Z"
endedAt: "2026-10-13T02:02:00Z"
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC15]
---
# Fresh-worker verify — us-509

Fresh re-derivation of every AC verdict plus a fault injection per AC on isolated
scratch skill trees (a full copy of `.agents/skills` per injection; no product
tree was mutated). Method: for each AC, inject one fault into the relevant
`ac_ledger.cjs` branch and confirm the AC's observable check fails (the fault is
caught). A control run on the unpatched helper confirms the green behaviour.

## Fault-injection matrix

| AC | Injected fault | Observed under fault | AC check catches it |
|----|----------------|----------------------|---------------------|
| AC1 | `parseArgs` consumes one value per `--ac` | three-AC space-separated link links 0 rows (exit 1) | yes |
| AC2 | same | `AC1/AC2/AC3` commit linkage truncates | yes |
| AC10 | same | revision/write semantics collapse to a single target | yes |
| AC3 | same | union of `AC1 AC2 AC3` loses its members | yes |
| AC4 | same | `--ac AC1 AC2 --score-boundary step5` stops consuming at AC2, leftover errors | yes |
| AC12 | same | `score --boundary pre-step6` reports 3 linkage errors | yes |
| AC5 | skip pre-mutation validation + skip unknown ids | `AC1` receives the rejected commit (partial payload persisted) | yes |
| AC6 | same | rejected call exits 0 and the ledger differs byte-wise | yes |
| AC7 | remove the unconsumed-token guard | `--commit a b` exits 0 (token silently dropped) | yes |
| AC8 | remove `negative` from `targetLists` | `--negative NS1 NS2` links neither row | yes |
| AC9 | revert the usage line to `[--ac ACn ...]` | help no longer names `--ac AC1 AC2` | yes |
| AC11 | remove the already-applied NOTICE/skip | replay applies the duplicate payload | yes |
| AC13 | pre-fix single-value consumption of `--ac` | `--ac` with no value yields `unknown AC: undefined` | yes |
| AC14 | make `--productFailure` consume the next token | the following `--status Implemented` is swallowed (`AC1.status=Pending`) | yes |
| AC15 | remove the boundary-label validation | `score --boundary nope` exits 0 | yes |

All 15 ACs have at least one caught injection; `allFaultsCaught: true`.

## Control (unpatched) re-derivation

`link --ac AC1 AC2 AC3 --commit sha=abcdef1,step=5 --score-boundary pre-step6`
on a fresh scratch copy of the shipped helper: exit 0, all three rows carry the
commit, `score --boundary pre-step6` reports `errors: []`. Green.

## Independent re-derivation

- Direct command re-derivation (not the packaged suite) executed for the multi-AC
  commit link, the unknown-id atomicity path, the leftover-token path, the
  missing-value path, the `--negative` path, the bare `--productFailure` path,
  the invalid-boundary path, and the suggestion-durability path.
- Suite re-run: `node test/test-ac-ledger.js`, `test/test-script-ux-golden-path.js`,
  `test/test-per-task-adequacy.js` all exit 0.

## Verdict

No defects found. Fresh verdicts match the Step 5 report. Proceed to Step 7.
