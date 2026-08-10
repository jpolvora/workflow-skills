---
slug: configurable-consumer-autoload
title: "Configurable consumer autoload (config flag + root AGENTS.md + harness)"
status: refined
---

## 0. Summary & Business Rules

Same as step-01. Confirmed key: `defaults.autoload`. Helper owns resolve/set/check. Installer never writes root AGENTS.md.

## 1. Definition of Ready & Scope

Unchanged from step-01. Interview Recommended=No.

## 2. Technical Design & Architecture

Implemented via `configure_autoload.py` (`resolve_effective_autoload`, `set_autoload`, `--set-autoload`, flag-gated `--check`). Docs in configure-project + harness PHASES.

## 3. Step-by-Step Plan

Completed in implementation: schema/example → helper → docs → tests.

## 4. Permissions, Tenancy & i18n

N/A.

## 5. Test Coverage

Covered in `test/test-autoload-configure.js` AC11 suite — all passed.

## 6. Invariants (Do Not Violate)

Preserved.

## 7. Pre-PR Checklist

- [x] Schema + example + resolve defaults
- [x] Configure docs + helper
- [x] Harness PHASES
- [x] Autoload tests green
- [ ] Full `npm run test` + integrity + version bump at ship

## 8. Open Questions

None.

## Interview notes

autoMode: End auto-confirmed refined plan without changes.
