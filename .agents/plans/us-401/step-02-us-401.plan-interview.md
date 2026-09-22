# Plan Interview — us-401 (audit of step-01 plan)

## 2a. Audit — gap registry

| # | Gap | Severity | Disposition |
|---|-----|----------|-------------|
| G1 | Forward-integration default (rebase vs merge-forward) unconfirmed in spec assumptions | blocking | Assumed-default: rebase own commits; merge-forward fallback where rebase is disallowed. Helper prints the command, never executes it. |
| G2 | Enforcement mechanism unconfirmed (test vs harness check) | blocking | Assumed-default: committed regression test only (AC7 `or` permits); no Phase 5a list change, harness gate surface stable. |
| G3 | `check_duplicates.cjs` (≥6 repeated lines) could trip on forbidden-verb lists copied into many docs | medium | Closed by design: full list lives only in `git-ownership.md`; all other touchpoints link (1 line), never restate. |
| G4 | `check_harness_links.cjs` must resolve new cross-doc links | medium | Links use verified relative paths; full `npm run test` + `test-harness-clean.js` prove it. |
| G5 | `workflow-state.schema.json` gains optional props; `test-workflow-state-contract.js` must still pass | medium | Additive optional fields only; run the named suite pre-commit. |
| G6 | `refresh_baseline.cjs` state write must match dual-write semantics | medium | Reuse `syncStateDualWrite` from `workflow_state.cjs` via the same `HUB_SCRIPTS_DIR` resolution as `commit_g2_code.cjs`. |
| G7 | Forbidden-verb scanner must not false-positive on the canonical doc's own documentation of the list | medium | Scanner scopes to fenced command blocks + `.cjs` sources; canonical doc marks its documentation list so prose never scans as a recipe. |

Project-context sweep: touched framework boundaries are `ws-shared` runtime
docs, `ws-spec-to-pr` scripts (hashed SoT → integrity regen), and the committed
test. No hub relocation occurs, so the High memory trap on managed-runtime moves
needs no resolver sweep; its named suites (`test-harness-clean`, full tests)
still run before ship.

## 2b. Resolve

No user input required in autoMode; G1/G2 closed as model-inferred assumed
defaults above. No `needs_user` items.

## 2d. Exit

Refinement complete; `shared_understanding: confirmed`.

## 2e. Shared understanding

Confirmed (auto via 2c-equivalent exit). Advance to Step 3.
