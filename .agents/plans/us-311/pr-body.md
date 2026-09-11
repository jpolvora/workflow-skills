Fixes #311 — finished step artifacts now carry the step finish result instead of mirroring workflow status.

## Problem

Step artifacts stamped during finish derived status from the overall workflow status. Since a workflow stays active while intermediate steps complete, successful intermediate step reports were persisted with status active.

## Fix

- workflow_state.cjs: new resolveStepStampStatus() closed-enum helper; artifactStampFields()/stampStepArtifact() take the hoisted, already-validated finish status at a single call site. Unknown/missing values throw a descriptive error (fail closed, AC6).
- register_local_spec.cjs: preserve the finish-established result on re-register, else defined provisional default (Step 0 finish always re-stamps in-flow).
- write_review_round.cjs: stamp completed (a persisted round is a finished round; round files are never re-stamped by Step 6 finish).
- state.status lifecycle, telemetry schema, and applyCloseAndShipStatus untouched. No historical re-stamping.

## Verification

- New test/test-artifact-stamp-status.js (T1-T8): intermediate completed/failed/skipped under active workflow, close-step regression, fail-closed unit + CLI rejection, singularity static scan, register + review-round paths. Wired into npm run test.
- npm run test exit 0 (4 full runs); stack invariant scan clean; sabotage verified (script pass + manual T1 bite at inverted code); verify score 10/10; Step 6 review clean (round 1, no findings).
- Release 0.4.15: version stamps, rebuilt site, regenerated + verified integrity.

## Audit caveat

Full interactive ws-check-harness Phases 0-5c were not agent-walked; credited via check_workflows.py exit 0 plus in-suite gates (mechanical Phase 5a equivalent).

## Commits

- d2374503 feat(us-311): verified implementation
- e1919e4e docs(us-311): configured delivery artifacts
