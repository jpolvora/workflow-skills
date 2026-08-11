---
slug: configurable-consumer-autoload
title: "Configurable consumer autoload (config flag + root AGENTS.md + harness)"
workflowId: configurable-consumer-autoload-20260810T194555Z
deliveredAt: 2026-08-10T19:56:00Z
packageVersion: 0.3.4
---

# Delivery result — configurable-consumer-autoload

## Summary

Shipped `defaults.autoload` (default false): config schema/example, `configure_autoload.py` resolve/set/check, configure-project interview docs, harness flag-gated root AGENTS.md enforcement, AC11 tests. Package bumped to **0.3.4**.

## Modes

autoMode + fullMode + ship + goal-fix-pr · workflowType standard · finalPipeline standard

## Evidence

- Autoload AC11 suite green
- `npm run test` green
- Integrity OK at 0.3.4
- Workflows simulation PASS

## Delivery commit artifacts staged

Per `defaults.deliveryCommitArtifacts`: refined plan only (`includeDeliveryResult: false`).

## Next

Step 9: `ws-goal-fix-pr` until `activeThreads == 0`, then merge when checks green.
