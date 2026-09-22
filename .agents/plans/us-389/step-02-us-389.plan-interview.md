---
slug: us-389
step: 2
workflowId: us-389-20260922T080709Z
status: completed
startedAt: "2026-09-22T08:20:00Z"
endedAt: "2026-09-22T08:26:00Z"
acRefs: []
---
# Plan Interview — us-389

## Registry

| # | Question / Assumption | Finding | Resolution |
|---|-----------------------|---------|------------|
| Q1 | Does `-CheckOnly` already avoid the save path? | Current entry point exits before `Save-ConfigurationFile`, so the live-checkout defect is latent (a future call site that saves without `-ConfigPath` would mutate the hub). | Keep the call-site hygiene fix **and** add a defense-in-depth diagnostic guard so AC2 holds structurally, not by accident. |
| Q2 | Which editor invocations in the test file omit `-ConfigPath`? | Test 4 (`-CheckOnly`), Test 6 (bat `-CheckOnly`), Test 7 (`-FunctionsOnly` snippet) all resolve the live hub config. | Pass an explicit temp `-ConfigPath` to all three; keep the intentional no-`-ConfigPath` probe as an AC2 negative check. |
| Q3 | Does `Save-ConfigurationFile` have more than one writer? | All writes funnel through `Save-ConfigurationFile` (single `Copy-Item` backup + `WriteAllText`). | Guard that one function; no scattered edits. |
| Q4 | Can the suite-level assertion rely on `git status`? | No — the working tree is intentionally dirty (operator config, generated artifacts). | Byte-compare the hub config file content before/after; never shell out to `git status`. |
| Q5 | Does adding `-ConfigPath` to the batch-launcher invocation need bat changes? | `Edit-Config.bat` forwards `%*`. | No bat change; assert the launcher still exits 0 with a forwarded `-ConfigPath`. |
| Q6 | Is the interactive no-`-ConfigPath` fallback still required? | AC5 requires it. | Keep the fallback untouched; document the test-vs-interactive distinction in the parameter help. |
| Q7 | Do non-Windows runs need to skip? | Editor execution is Windows-gated; `pwsh` may exist. | Regression test must skip cleanly when no PowerShell is available, never fail. |
| Q8 | Does the change touch hashed skill content or the config schema? | Only the editor script body under `ws-shared/runtime/scripts/`; no schema/example change. | Regenerate integrity; run the desktop config GUI sync test (unchanged bindings). |

## Verified boundaries

- No `.py` file is added.
- PowerShell editor stays 100% ASCII.
- GUI bindings for `plans`/`reviews`/`preview`/`defaults` are untouched.

## Outcome

Plan accepted with one refinement: the editor guard is added as an explicit,
documented diagnostic no-write contract (not merely an emergent property of the
current entry-point ordering).
