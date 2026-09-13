---
slug: us-324
step: 2
status: "interview complete"
shared_understanding: confirmed
round: 1
blocking_open: 0
---

# Step 02 — Plan interview (us-324)

Auto interview (autoMode). Project-context sweep first; memory traps folded; no user escalation (all blocking gaps project-resolved or model-inferred defaults).

## Interview registry

| id | class | section | gap | recommendation | status | resolutionSource | resolution / evidence |
|----|-------|---------|-----|----------------|--------|------------------|-----------------------|
| G1 | non-blocking | §2 template | Required vs conditional heading set ambiguous (which of 5 are mandatory) | Require `Feature` + `How it works`; conditionals optional | closed | project | Issue text: "each section only if it makes sense"; spec AC6 encodes this. |
| G2 | non-blocking | §2 migration | Old pages fail or warn | Warn-only, malformed old still fail | closed | project | Spec AC6/AC14 + `validate_wiki.cjs` must keep CI green; `test-wiki.js` NS2 precedent. |
| G3 | non-blocking | §3 persist | Single vs dual persistence (state file vs config) | Both: state wins per-run, config is fallback | closed | project | Issue persistence bullet lists both; `config.schema.json` already has `plans.wikiDir`, add `plans.wiki.verbosity`. |
| G4 | non-blocking | §3 sweep persist | `sweep.state.json` key name | `verbosity` key alongside `completedFiles` | closed | model-inferred | Mirrors `from-code.state.json:verbosity`; no existing key to conflict. |
| G5 | blocking | §5 tests | Validator fixtures must prove fail-closed on missing required | Add explicit fail fixtures (new missing How-it-works, old missing Business-Rules) | closed | project | Memory trap "Verify score must fail-close on uncovered negative scenarios" + spec NS1/NS2. |
| G6 | non-blocking | §6 invariants | New async/network risk in validator | Keep sync fs, no network, allowlist normalizer | closed | project | `list_*` helpers assert no fetch; validator is sync; memory "no duplicate skill targets" not applicable. |
| G7 | non-blocking | §0 scope | CATALOG budget risk from doc expansion | Keep CATALOG rows terse; put example in skill docs, not CATALOG | closed | project | Memory "Root CATALOG.md must stay under 24000 B"; verify with byte check. |
| G8 | non-blocking | §2 portability | Risk of citing internal spec numbers in companions | Generic wording only; numbers stay in spec/memory | closed | project | Memory "Portable skill prose must not cite internal spec numbers". |
| G9 | non-blocking | §2 gates | Documented verbosity branches must be reachable | Every documented mode has a gate option; overwrite/detailed reachable | closed | project | Memory "Documented user-gate branches must be reachable". |

## Confirmation

`shared_understanding: confirmed` (autoMode end-refinement). Refined plan at `step-02-us-324.plan.refined.md` (adds this registry reference + §6 allowlist detail, no scope change).
