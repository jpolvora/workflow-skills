---
slug: configurable-consumer-autoload
title: "Configurable consumer autoload (config flag + root AGENTS.md + harness)"
score: 9
checkedAt: 2026-08-10T19:50:00Z
---

# Check-implementation — configurable-consumer-autoload

## Score: 9 / 10

| AC | Status | Evidence |
|----|--------|----------|
| AC1 | OK | `config.json.example` + `config.schema.json` define `defaults.autoload` default false |
| AC2 | OK | `resolve_effective_autoload` + AC11 missing/omitted tests |
| AC3–6 | OK | SKILL/INTERVIEW + `--set-autoload`; true writes root; false does not require root |
| AC7–9 | OK | `--check` critical when true+missing/incomplete; OK when false+missing; dual-hub docs |
| AC10 | OK | PHASES/SKILL/AGENTS/configure docs updated |
| AC11 | OK | `node test/test-autoload-configure.js` all AC11 assertions passed |

## Gaps

None blocking. Full package test + integrity deferred to ship prepare.

## Gate

autoMode: score ≥ 7 → Advance.
