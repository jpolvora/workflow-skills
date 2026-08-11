---
slug: configurable-consumer-autoload
title: "Configurable consumer autoload (config flag + root AGENTS.md + harness)"
testedAt: 2026-08-10T19:55:00Z
---

# Testing report — configurable-consumer-autoload

## Commands

| Command | Result |
|---------|--------|
| `node test/test-autoload-configure.js` | PASS (incl. AC11) |
| `npm run test` | PASS (install + quality-gates + memory + autoload + delivery-commit) |
| `npm run verify-integrity` | PASS (v0.3.4) |
| `python …/check_workflows.py` | PASS 0 issues |

## Mutation

Skipped (`defaults.skipMutationTesting: true`).

## Verdict

Ready to ship.
