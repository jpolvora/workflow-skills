---
superseded: true
supersededBy: step-02-us-324.plan.refined.md
slug: us-324
title: "ws-wiki verbosity + richer conditional template"
status: "plan to be refined"
---

## 0. Summary & Business Rules

Add `verbosity` (`condensed` default, `detailed` rich) to `ws-wiki` page-writing flows and replace the rigid 3-section template with a conditional 5-section set (`Feature`, `How it works`, `Backend`, `Frontend`, `Third-party services`). `condensed` preserves current terse one-fact-per-line style and token cost. `detailed` writes paragraph prose with feature-by-feature walkthroughs and disables terse rewriting for wiki bodies. Validator accepts both styles during migration (old pages warn, new conditionals omit cleanly). No product-code change.

Business rules: default stays `condensed`; `autoMode` never prompts and takes `condensed`; persisted choice (`from-code.state.json` + `plans.wiki.verbosity`) drives later `sync`/`update`; unknown verbosity fails closed to `condensed`; state files never staged in product commits.

## 1. Definition of Ready & Scope

Scope: `SKILL.md`, `FROM-CODE.md`, `PHASE-1-SWEEP.md`, `SYNC.md`, `UPDATE.md`, `validate_wiki.cjs`, `config.schema.json` + `config.json.example` + GUI editor + `ws-configure-project` mention, docs before/after example, `test/test-wiki.js`. Out of scope: product code, bulk rewrite, `ws-spec-write` gate, new skill id, network helpers.

ACs: AC1 SKILL docs + template; AC2 FROM-CODE gate/persist/honor; AC3 SWEEP gate; AC4 SYNC gate; AC5 UPDATE honor; AC6 validator old/new/conditional; AC7 condensed default + detailed disables terse; AC8 persistence; AC9 index/list unchanged; AC10 before/after example; AC11 tests; AC12 portability; AC13 schema/example/GUI default condensed; AC14 backward compat CI green.

## 2. Technical Design & Architecture

Layers (Node 22 skill package): skill prose (`.agents/skills/ws-wiki/*.md`), Node validator (`scripts/validate_wiki.cjs`), JSON schema (`ws-shared/runtime/config.schema.json`), example config (`ws-shared/templates/config.json.example`), PS GUI (`ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1`), consumer docs (`.agents/specs/wiki/documentation/ws-wiki.md` + skill example), tests (`test/test-wiki.js`).

Template mapping: old `Feature Overview` -> new `Feature`; old `Business Rules & Logic` -> `How it works` + `Backend`; old `Technical Architecture` -> `Backend`/`Frontend`/`Third-party services`. New required: `Feature` + `How it works`. New conditional: `Backend`, `Frontend`, `Third-party services` (omit when not applicable, no placeholder). Old full 3-section still passes with `legacy-template` warning. Malformed (missing both new-required and old-complete) fails.

Verbosity resolution order per run: explicit gate choice > `{wikiDir}/from-code.state.json:verbosity` > `config plans.wiki.verbosity` > `condensed`. Normalizer `normalizeVerbosity()` fails closed to `condensed` with warning on unknown.

Invariants: `commitPlanFilesOnlyAtStep8`, portable `user-gate`, `{wikiDir}` tokens, no host names, no network, CATALOG 24000 B budget preserved.

## 3. Step-by-Step Plan

1. `SKILL.md`: replace Wiki Structure 3-section block with verbosity section + new conditional template + mapping table + persistence + before/after pointer; keep load banner, entry check, subcommand table, helper one-liners.
2. `FROM-CODE.md`: extend Start gate with verbosity options (condensed Recommended / detailed / Cancel), `autoMode` condensed, persist `verbosity` in `from-code.state.json`, honor in merge/overwrite writes, document terse-disable in detailed.
3. `PHASE-1-SWEEP.md`: add verbosity Start-gate extension + checkpoint persistence (`sweep.state.json:verbosity` or state memory), `autoMode` condensed, honor per spec overlay.
4. `SYNC.md`: add verbosity resolution (explicit > state file > config > condensed), `autoMode` persisted/default, honor on single-page write.
5. `UPDATE.md`: expand to honor persisted verbosity unless overridden, preserve untouched sections.
6. `validate_wiki.cjs`: implement dual-template accept (new-required OR old-complete), conditional omit, legacy warnings, unknown-verbosity-agnostic (validator ignores style prose, checks headings only), keep link/index checks unchanged; export new constants for tests.
7. Config surface: add `plans.wiki.verbosity` (`enum condensed|detailed`, default `condensed`) to `config.schema.json`; add `wiki.verbosity` + comment to `templates/config.json.example` (and project `config.json` only if that file tracks wiki verbosity — check tracked status); bind GUI editor key; mention in `ws-configure-project/SKILL.md` if it documents `wikiDir`.
8. Docs example: add condensed vs detailed before/after to skill docs (`SKILL.md` inline short example + `.agents/specs/wiki/documentation/ws-wiki.md` update) without blowing CATALOG budget.
9. Tests: extend `test/test-wiki.js` with new-template pass, conditional omit pass, old warn-compat pass, malformed fail, gate-string asserts; keep all existing asserts green.
10. Run `validate_wiki --check`, new-fixture validator runs, `npm run test` subset, `generate-integrity` + `verify-integrity`, `build-site --check` if docs changed.

## 4. Permissions, Tenancy & i18n

N/A because wiki-only markdown + local validator. No RBAC, no tenant boundary, no runtime i18n strings. Skill prose stays en-us. No secrets.

## 5. Test Coverage

- AC1: `test-wiki.js` asserts SKILL contains `verbosity`, `condensed`, `detailed`, `How it works`, `Third-party services`, before/after pointer.
- AC2: asserts FROM-CODE contains verbosity gate strings + `from-code.state.json` + `autoMode` condensed.
- AC3: asserts SWEEP contains verbosity gate + `autoMode`.
- AC4: asserts SYNC contains verbosity resolution + persisted/default + `autoMode`.
- AC5: asserts UPDATE contains verbosity honor + preserve.
- AC6: validator fixture runs — new full pass, new omit-Frontend pass, old 3-section pass with warning, new missing-How-it-works fail, old missing-Business-Rules fail.
- AC7: asserts condensed default strings + terse-disable (`caveman`/`ws-tdah` disable for wiki bodies in detailed).
- AC8: asserts state-file verbosity key + config `plans.wiki.verbosity` docs; manual check state file excluded from product commit (never staged).
- AC9: `sync_wiki_index` unchanged — existing index tests still pass.
- AC10: before/after example file exists and SKILL links it.
- AC11: full `test/test-wiki.js` + `test-context-budget.js` + integrity green.
- AC12: host-name regex scan over changed `.md`/`.cjs` returns zero; `{wikiDir}` token present.
- AC13: schema default `condensed`, example default, GUI binding asserted.
- AC14: existing wiki `validate --check` passes; old fixture pages pass.

## 6. Stack & Security Invariants Verification Plan

Stack: Node 22 skill package (`node-skills-package`). Touched boundaries:

- Authorization & endpoint protection: N/A (no endpoints); verify no auth logic touched via `git status` scope check.
- Concurrency & async safety: validator uses sync `fs` only; no new promises/floating async; verify with `grep -n "async\|Promise\|setTimeout" scripts/validate_wiki.cjs` shows no new async.
- Input validation & DTO boundary: `normalizeVerbosity()` allowlists `condensed|detailed`, trims/case-folds, fails closed; `--wiki-dir` containment unchanged; verify with unknown-value fixture + traversal fixture.
- Subscription & lifecycle cleanup: N/A (no subscriptions); verify no new watchers/timers.
- Portability: no host names, portable `user-gate`, `{wikiDir}` tokens; verify with host regex + token grep.
- Supply chain: no new npm deps; no network in helpers; verify with `grep -rn "fetch(" scripts/`.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skill prose + validator + config surface only).
- [ ] Domain entities and mappings encapsulated (N/A, docs only).
- [ ] Schema migrations created (N/A).
- [ ] Authorization checks applied (N/A, scope check done).
- [ ] Stack & security invariants verified (auth, async, validation, cleanup per §6).
- [ ] i18n keys declared (N/A, en-us prose).
- [ ] Test cases cover all ACs (per §5).

## 8. Open Questions

- Should `INIT.md` gain a verbosity seed gate, or stay untouched with sweep/from-code owning the choice? Chosen: untouched (issue marks init optional); revisit if review demands.
- Should old pages eventually fail (hard cutover) or warn forever? Chosen: warn-only in this change; hard cutover deferred.
- `sweep.state.json` vs `from-code.state.json` as the single persisted key? Chosen: each flow persists its own run choice; `from-code.state.json:verbosity` + `plans.wiki.verbosity` are the cross-run defaults `sync`/`update` read.
