# Context — Fresh-worker verifier step

Companion to `0155-fresh-worker-verifier-step.spec.md`. Gray area: stage placement and naming had more than one valid product option.

## Feature Boundary

In: a fresh-worker stage that re-derives AC verdicts from the spec, injects one fault per AC on scratch, scores evidence-or-zero, and loops fixes at most 3 times.

Out: replacing the Step 5 score, mutation testing, lite support, and non-invert fault engines.

## Implementation Decisions

- **New `05b` stage after Step 6, not a Step 5 substep:** chosen because Step 5 math is ledger-derived and frozen at its boundary, while fresh verification needs reviewed code plus its own report and fix loop. Rejected alternative: fold into Step 5 (couples two scoring models and complicates the existing gate).
- **`step-05b-{slug}.fresh-verify.md` naming:** chosen to sort with verify outputs without renumbering steps 6 through 9. Rejected alternative: `step-06b` (suggests review ownership the stage does not have).
- **One fault per AC:** chosen to prove each AC test can fail at linear cost. Rejected alternative: full combinatorial injection (cost explosion) and single smoke injection (does not prove per-AC adequacy).
- **Max 3 fix rounds then Pause:** chosen to match the existing scoreAndRefine bound and its Pause-on-residual semantics.

## Deferred Ideas

- Lite inline parity once the standard stage has size and runtime data.
- Opt-in mutation sampling inside the verifier for high-risk ACs.
- Verdict-diff view between ledger-derived Step 5 and fresh re-derivation.
