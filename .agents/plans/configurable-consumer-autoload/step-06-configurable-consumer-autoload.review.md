---
slug: configurable-consumer-autoload
title: "Configurable consumer autoload (config flag + root AGENTS.md + harness)"
reviewedAt: 2026-08-10T19:51:00Z
critical: 0
warning: 0
---

# Code review — configurable-consumer-autoload

## Summary

Local review of `defaults.autoload` feature vs refined plan/spec. Diff ~365 LOC across config, configure helper, harness docs, tests.

## Findings

| Severity | Finding | Status |
|----------|---------|--------|
| — | None | Clean |

## Standards

- Surgical scope; no Always-applied membership churn
- UTF-8 I/O in Python helper
- Tests cover AC11 matrix
- Portable paths; installer still does not write root AGENTS.md

## Spec alignment

ACs 1–11 implemented; harness flag-gated critical documented and enforced in `--check`.

## Verdict

**Clean** — 0 Critical / 0 Warning. Advance to testing.
