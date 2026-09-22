# Implementation Plan — us-402: packaged skill ws-spec-translate-to-human

## 1. Goal

Ship a packaged skill **`ws-spec-translate-to-human`** that emits a parallel human
companion `step-NN-{slug}.spec-translated.md` beside the agent spec it translates
(default `step-00-{slug}.spec-translated.md`). The companion is a numbered runbook
with `### Implementation`, `### UI Test`, `### Out of scope`, where every source AC
maps to an implementation or UI-test step, labels resolve to real system names
from project sources (flagged when unresolvable, never invented), and the agent
spec plus product code stay untouched. Generation is wired into the
refinement/planning path as a non-blocking, configurable step (default `en-us`
output, `pt-BR` supported).

## 2. Contract (AC mapping)

- AC1 (packaged skill): NEW `.agents/skills/ws-spec-translate-to-human/SKILL.md`
  with en-us body and valid frontmatter (`name`, `description`, `version`,
  `invocation_names`), following `SKILL_AUTHORING.md` 3-tier layout (Tier 2
  `references/`, Tier 3 `scripts/*.cjs`); registered in package membership.
- AC2 (companion target): only write target is the `*-translated.md` companion
  beside the source artifact under `{plansDir}/{slug}/`; agent spec never
  overwritten (validator asserts distinct paths + spec hash stability).
- AC3 (companion shape): title + `### Implementation`, `### UI Test`,
  `### Out of scope` in order (last omitted only when the source states no
  boundary); continuous numbering within each section.
- AC4 (AC→step mapping): every source AC maps to ≥1 implementation or UI-test
  step; each step cites its source AC id (`(ACn)`); each UI-test step runs from
  an initial state to a visible verification.
- AC5 (context gathering): skill gathers agent spec, issue snapshot, original
  tracker item, MEMORY, changelog, README, docs, AGENTS/hub, optional vault, and
  records which were consulted; blocking ambiguity goes through `user-gate`
  (interactive) or is recorded as an open question in the companion (`autoMode`).
- AC6 (label mapping): spec terms map to real system labels from project
  sources without expanding scope; unresolvable names use the
  `[unresolved: ...]` flag, never an invented name.
- AC7 (no product/spec edits): skill never implements product code and never
  edits the agent spec; preserves source ACs and Out-of-scope intent.
- AC8 (refinement wiring): companion generation is a non-blocking,
  configurable step in `ws-plan-write` (owner) with one-line pointers in
  `ws-spec-to-pr` / `ws-spec-to-pr-lite`; config section
  `ws-spec-translate-to-human` (`enabled` default true, `outputLanguage`
  default `en-us`); disabling changes neither the agent spec nor gate outcomes.
- AC9 (gates green): `npm run test`, `ws-check-harness` Phases 0–5c,
  `node test/test-harness-clean.js` exit clean; version bump +
  `npm run generate-integrity` + `verify-integrity` consistent; catalog /
  FEATURES / docs reflect the new skill.

## 3. Design

One leaf skill plus prose hooks; deterministic validator instead of a
generator (the agent authors the runbook prose; the script proves the shape).

1. NEW `.agents/skills/ws-spec-translate-to-human/SKILL.md` — Tier 1 body
   (≤150 lines): entry check, invocation (`/ws-spec-translate-to-human <spec>
   [slug=] [output=] [lang=]` + refinement-path call), 5 steps
   (resolve target → gather context → map labels → write companion → validate),
   each with a verifiable Done gate. Frontmatter `version` tracks the package
   version via `build-site:bump`.
2. NEW `references/COMPANION-FORMAT.md` (Tier 2) — companion schema, section
   order, `(ACn)` citation rule, `[unresolved: ...]` flag, open-question block,
   phrase patterns ported from the reference skill (en-us default + `pt-BR`
   output template), context-source checklist with consulted/not-found marking,
   `user-gate`-vs-record rule.
3. NEW `references/EXAMPLE.md` (Tier 2) — one compact example companion for a
   two-AC sample spec, both languages noted.
4. NEW `scripts/validate_companion.cjs` (Tier 3, Node builtins only) —
   `--spec <path> --companion <path>`: asserts companion sits beside the spec
   with the `.spec-translated.md` name, spec path untouched (refuses
   identical paths), sections present in order, continuous numbering per
   section, every `ACn` from the source cited ≥1, unresolved flags well-formed.
   Exit 0 / non-zero; no writes to the spec.
5. `ws-plan-write/SKILL.md` — refinement hook: after the plan handoff, offer
   companion generation through the new skill when
   `ws-spec-translate-to-human.enabled !== false` (non-blocking: validator or
   skill failure is recorded, never a planning gate failure).
6. One-line pointers (distinct wording per file, duplicates-gate safe):
   `ws-spec-to-pr/SKILL.md`, `ws-spec-to-pr-lite/SKILL.md`.
7. Membership: `bin/skill-dependencies.json` **and** the identical mirror
   `.agents/skills/ws-shared/runtime/skill-dependencies.json` — add the id to
   the `workflows` package list; new leaf key `"ws-spec-translate-to-human":
   []`; extend `ws-plan-write`, `ws-spec-to-pr`, `ws-spec-to-pr-lite` dep lists.
8. Config: `config.schema.json` + `templates/config.json.example` gain the
   `ws-spec-translate-to-human` section (`enabled` bool default true,
   `outputLanguage` string default `en-us`), following the
   one-parent-section-per-skill convention (`ws-goal-fix-pr` precedent: no
   `--section` wizard row, no GUI-editor row — the parity test enforces only
   `plans`/`reviews`/`preview`/`defaults`).
9. Indexes/docs: `CATALOG.md` (Layer 5 row + task-router row),
   `ws-shared/runtime/CATALOG.md` (row + scope-note `workflows` 48→49),
   `runtime/autoload.md` + `.ws/autoload.md` mirror (specs-router row +
   keyword row), `FEATURES.md` skill-table row, `README.md` skills-table row,
   `docs/index.html` via `node bin/build-site.js` rebuild.
10. NEW `test/test-spec-translate-to-human.js` — package/frontmatter/membership/
    docs registration; validator green/red matrix on fixtures (valid companion,
    missing section, broken numbering, uncovered AC, companion==spec path);
    spec-hash stability (validator never writes the spec); schema/example
    defaults. Plus one-line update of the stale membership count in
    `test/test-wiki.js` (48→49).
11. REGEN: `bin/build-site.js --bump` (0.4.59→0.4.60 lifts package.json,
    both manifests, site footer, all skill frontmatter versions in lockstep),
    `npm run generate-integrity` + `npm run verify-integrity`.

Out of scope (per spec): implementing translated steps as product code;
rewriting agent specs; translating plan/review/testing artifacts; automated
browser execution; new SCM/provider intents; pt-BR skill body; `--section`
wizard row for the new config section; `ws-spec-manager` front-door changes.

Decisions: validator-not-generator (deterministic AC3/AC4/AC7 proof, no LLM
in scripts); default-enabled non-blocking hook (spec ties the skill to the
refinement phase but forbids gating); no `evals/` seed (validator walks only
existing files; dogfood runs through the committed test); GUI-editor row
deferred per `ws-goal-fix-pr` precedent.

## 4. Files touched (surgical set)

- NEW: `.agents/skills/ws-spec-translate-to-human/SKILL.md`
- NEW: `.agents/skills/ws-spec-translate-to-human/references/COMPANION-FORMAT.md`
- NEW: `.agents/skills/ws-spec-translate-to-human/references/EXAMPLE.md`
- NEW: `.agents/skills/ws-spec-translate-to-human/scripts/validate_companion.cjs`
- NEW: `test/test-spec-translate-to-human.js`
- EDIT: `.agents/skills/ws-plan-write/SKILL.md` (refinement hook)
- EDIT: `.agents/skills/ws-spec-to-pr/SKILL.md` (one-line pointer)
- EDIT: `.agents/skills/ws-spec-to-pr-lite/SKILL.md` (one-line pointer)
- EDIT: `bin/skill-dependencies.json` (+ runtime mirror, identical)
- EDIT: `.agents/skills/ws-shared/runtime/skill-dependencies.json`
- EDIT: `.agents/skills/ws-shared/runtime/config.schema.json`
- EDIT: `.agents/skills/ws-shared/templates/config.json.example`
- EDIT: `CATALOG.md`
- EDIT: `.agents/skills/ws-shared/runtime/CATALOG.md` (row + count 48→49)
- EDIT: `.agents/skills/ws-shared/runtime/autoload.md` (+ `.ws/autoload.md` mirror)
- EDIT: `.ws/autoload.md`
- EDIT: `FEATURES.md` (skill-table row)
- EDIT: `README.md` (skills-table row)
- EDIT: `test/test-wiki.js` (count 48→49)
- REGEN: `package.json`, `bin/skill-integrity.json`, `docs/index.html`
  (via `build-site:bump` + `generate-integrity`)

## 5. Verification

- `node .agents/skills/ws-spec-translate-to-human/scripts/validate_companion.cjs --spec <fixture> --companion <fixture>` green/red matrix.
- `node test/test-spec-translate-to-human.js` (new; must pass).
- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`.
- `npm run test` (touched area + full suite before ship).
- `ws-check-harness` Phases 0–5c + `node test/test-harness-clean.js` (0 findings).
- `npm run verify-integrity`; `node bin/build-site.js --check`.
- `node test/test-powershell-config-editor.js` green (no GUI-bound section added).

## 6. Stack & Security Invariants Verification Plan

- Runtime: Node 22 only. New helper is CommonJS `.cjs` (`require`, Node
  builtins only: `fs`/`path`); never `.py`; recipes invoke it with explicit
  `node`. Verify: `check_unique_runtime.cjs` green + no `.py` under touched
  paths.
- No new network, auth, or provider surface: the validator reads two local
  markdown files and prints a report; argv are file paths (no shell
  interpolation — `spawnSync` arrays where applicable, plain `readFileSync`
  in-process otherwise). No secrets handling: inputs are spec/companion prose;
  nothing is printed beyond section/AC identifiers and counts.
- Injection safety: `--spec`/`--companion` are resolved with `path.resolve`
  and refused when identical or when the companion name does not end with
  `.spec-translated.md`; no glob expansion, no dynamic require, no `eval`.
- False-positive guard: the committed test scopes forbidden-behavior scans to
  the new skill folder and its fixtures; the canonical forbidden-verb prose in
  `git-ownership.md` is untouched. One-line wiring pointers are distinct
  strings per host file (duplicates gate ≥6 lines cannot trip).
- Touched framework boundaries: `ws-shared` runtime schema/template
  (consumer config contract — additive optional section only), `ws-plan-write`
  + both orchs (prose hooks, no behavior change to gates), installer
  manifests (both copies, version lockstep), harness `test-harness-clean.js`
  (no new gates — unchanged), `test-wiki.js` count bump (membership growth,
  not a gate change). No hub relocation, no alias change; resolver/bootstrap
  copies need no sweep. Still run the trap-named suites before ship:
  `test-harness-clean` + full `npm run test`.
- Pre-completion: run `scan_stack_invariants.cjs` and the new skill test;
  both must exit 0 before the Step 5 product commit.
