---
slug: configurable-consumer-autoload
title: "Configurable consumer autoload (config flag + root AGENTS.md + harness)"
status: "plan to be refined"
---

## 0. Summary & Business Rules

Persist `defaults.autoload` (boolean, default `false`) so consumers can opt into root `AGENTS.md` Always-applied promotion. Missing/omitted config → effective false. `ws-configure-project` interviews and writes the flag; when true also refreshes `autoload.md` + root `AGENTS.md`. `ws-check-harness` / `configure_autoload.py --check` fail closed when flag is true and root is missing or incomplete.

## 1. Definition of Ready & Scope

**In scope:** schema/example/config key; configure interview + helper CLI; harness PHASES + `--check` enforcement; automated tests (AC11); hub docs.

**Out of scope:** Always-applied membership list changes; installer writing root `AGENTS.md`; adding `ws-karpathy-guidelines` to Always-applied.

## 2. Technical Design & Architecture

| Layer | Files |
|-------|-------|
| Config SoT | `config.json.example`, `config.schema.json`, dogfood `config.json` |
| Configure | `ws-configure-project/SKILL.md`, `INTERVIEW.md`, `scripts/configure_autoload.py` |
| Harness | `ws-check-harness/PHASES.md` (+ SKILL note if needed) |
| Tests | `test/test-autoload-configure.js` |
| Hub notes | `ws-shared/AGENTS.md` § Consumer root override / autoload mention |

**Resolve rule:** no config / omitted / not explicit `true` → `false`.

## 3. Step-by-Step Plan

1. Add `defaults.autoload: false` + schema property + comment in example.
2. Extend `configure_autoload.py`: `resolve_effective_autoload`, `--set-autoload`, enrich `--check` when true.
3. Update configure-project SKILL + INTERVIEW: autoload mutates config; Recommended=No; true → write flag + write-autoload + write-root-agents.
4. Document harness: when effective true → critical if root missing or no `autoload.md` / Always-applied instruction.
5. Extend `test-autoload-configure.js` for AC11 cases.
6. Touch AGENTS.md / PHASES as needed; run `npm run test` + integrity if hashed files change.

## 4. Permissions, Tenancy & i18n

N/A (harness package).

## 5. Test Coverage

| AC | Test |
|----|------|
| AC1–2 | schema/example + resolve false when missing/omitted |
| AC3–6 | `--set-autoload` writes config; true triggers root write path; false does not require root |
| AC7–9 | `--check` critical when true+missing root; ok when false+missing; dual-hub ok when true+autoload.md ref |
| AC10–11 | docs strings + automated cases in test-autoload-configure.js |

## 6. Invariants (Do Not Violate)

- Installer never creates consumer root `AGENTS.md`.
- No absolute author-machine paths.
- Always-applied membership SoT remains `autoload.md`.
- Surgical diffs only under `.agents/skills` + tests + schema/example.

## 7. Pre-PR Checklist

- [ ] Schema + example + resolve defaults
- [ ] Configure docs + helper
- [ ] Harness PHASES
- [ ] Tests green
- [ ] Integrity regenerate if needed
- [ ] en-us, portable

## 8. Open Questions

None — key name `defaults.autoload` confirmed by spec.
