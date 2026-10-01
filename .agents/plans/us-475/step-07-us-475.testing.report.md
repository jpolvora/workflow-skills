---
step: 7
slug: us-475
workflowId: us-475-20260930T201858Z
status: completed
acRefs: []
title: Testing report — executable foreign-commit guard
startedAt: "2026-09-30T20:45:00Z"
endedAt: "2026-09-30T20:47:00Z"
---
# Testing — us-475

## Executed

| Battery | Command | Result |
|---------|---------|--------|
| Unit / contract | `node test/test-foreign-commit-guard.js` | exit 0 — 8 named checks (AC1–AC7 + git-read-only) |
| Full package suite (`verification.backendTest`) | `npm run test` | exit 0 — 155/155 entries passed, hub config byte-identity verified |
| Static | `node --check .agents/skills/ws-spec-multi/scripts/foreign_commit_guard.cjs` | exit 0 |

## Coverage of the new surface

`test/test-foreign-commit-guard.js` exercises the guard against live throwaway git repos
(local `develop` + bare `origin`): baseline capture, quiet advance, unexpected advance with
named commits, convergence equal, convergence refusal naming both heads, foreign listing with
and without an own set, the protocol pause options, and the git-read-only argv contract.

## Mutation testing

Not configured (`verification.mutationTest` empty, `defaults.skipMutationTesting: true`); the
fresh-verify fault injections (Step 6b) cover the two fail-closed behaviours.

## Residual

The full suite is the authoritative gate and is green; no test-only fixtures were left in the
repository (all temp repos are created under the OS temp dir and removed by each check).
