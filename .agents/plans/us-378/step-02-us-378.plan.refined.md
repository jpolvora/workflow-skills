---
slug: us-378
title: "Plan: skill generator for the consumer project (ws-patterns-generator)"
status: completed
step: 2
workflowId: us-378-20260921T112549Z
startedAt: "2026-09-21T11:27:55Z"
endedAt: "2026-09-21T11:39:49.057Z"
acRefs: []
---
## 0. Summary & Business Rules

Implement spec `0110-us-378` (source github, issue 378): ship skill `ws-patterns-generator`, which harvests project knowledge (run artifacts, changelog, MEMORY, docs, rules, wiki, stack file) and (re)writes a consumer-owned autoloaded skill `ws-project-patterns` that steers code generation. First run seeds a blank skeleton; later runs rewrite when stale or append bullets with evidence pointers; `--dry-run` previews; no-change runs are byte-identical no-ops.

Business rules: portability (no host names, path tokens, `user-gate` only for gates); Node 22 only (CommonJS `.cjs` helpers, explicit `node` launcher); en-us bodies; consumer-owned generated tree never overwritten by installer update; no secrets in generated output.

## 1. Definition of Ready & Scope

Resolved assumptions (from spec): generator id `ws-patterns-generator`; generated skill `ws-project-patterns` at project-local `{skillsRoot}/ws-project-patterns/SKILL.md`; skeleton-only seed; explicit invoke applies, `--dry-run` previews; rewrite when retiring/relocating bullets else append; manual recurrence plus orch post-close mention; harvest minimum set with tolerated missing sources; auth/rate/concurrency/expiry N/A (local-only foreground runs).

Acceptance criteria (measurable): AC1 generator SKILL.md shape (frontmatter, loaded banner, Done-when per step); AC2 graph registration plus integrity green; AC3 consumer-owned generated home plus blank seed plus installer exclusion test; AC4 autoload row plus opt-out; AC5 invoke/dry-run semantics; AC6 harvest minimum set with tolerated gaps; AC7 labeled summary plus evidence pointers; AC8 idempotent no-op; AC9 secrets review clean plus anonymization; AC10 en-us plus portability; AC11 collector-script invariants plus invariant scan clean; AC12 changelog entry per applied run; AC13 `ws-check-harness` exit 0.

Out of scope: scheduling daemons; MEMORY/vault writes; interactive per-correction capture; cross-project sharing; auto commit/push; embeddings dedup; managed-skill edits; deep MCP introspection; new `config.json` schema keys (autoload on/off is row membership, see §2).

## 2. Technical Design & Architecture

Config layers touched (`node-skills-package`): skills-sot (`.agents/skills`), installer-cli (`bin`), tests (`test`). No database, frontend, or network surface.

File inventory:

| # | Path | Action |
|---|------|--------|
| 1 | `.agents/skills/ws-patterns-generator/SKILL.md` | Create: Tier 1 lean body (entry gate, steps resolve→harvest→decide→write→summarize, dry-run, idempotency, secrets/anonymization, first-run-only autoload-row append, opt-out, loaded banner, Done-when per step) |
| 2 | `.agents/skills/ws-patterns-generator/scripts/seed_generated_skill.cjs` | Create: idempotent skeleton seed (writes only when missing, never overwrites; `--repo-root`, `--dry-run`; schema-validated flags; repo-root path containment; awaited promises; closed handles) |
| 3 | `bin/skill-dependencies.json` | Edit: add `ws-patterns-generator` to `packages.workflows.skills` plus `dependencies` entry (`ws-configure-project`, `ws-self-learning`, `ws-changelog`, `ws-secrets-leak-review`); add `ws-project-patterns` to `externalSkills` with `generatorManaged: true` note |
| 4 | `.agents/skills/ws-shared/runtime/skill-dependencies.json` | Edit: mirror of #3 (both graphs stay in sync) |
| 5 | `bin/cli.js` and/or `bin/install-rules.js` | Verify only (no edit expected): externalSkills ids already excluded from manifest/disk scans; fixture test proves update/uninstall preserve the generated tree |
| 6 | `.agents/skills/ws-check-harness/scripts/*.cjs` | Verify only (no edit expected): membership-scoped checks already exclude graph externalSkills ids; fixture test proves exit 0 with the dir present and absent |
| 7 | `.agents/skills/ws-configure-project/scripts/configure_autoload.cjs` | Edit: `dropExternalCompanionMembers` keeps `generatorManaged` entries whose tree exists on disk (local or global skills root); ws-memo/ws-session-tracking behavior unchanged |
| 8 | `CATALOG.md` | Edit: skill inventory row plus task router row |
| 9 | `README.md`, `FEATURES.md`, `docs/` | Edit/rebuild per harness change protocol (feature cards, inventory, site rebuild) |
| 10 | Root `AGENTS.md`, `.ws/AGENTS.md` | Edit only if utility-skill enumeration found at implement (default: none) |
| 11 | `test/test-ws-patterns-generator.js` | Create: file-logged test battery (see §5) |
| 12 | `test/test-suites.json` | Edit: register the new battery in `local` |
| 13 | `package.json`, site footer, both `packageVersion` | Version patch bump via `node bin/build-site.js --bump` (SKILL frontmatter stamp follows) |
| 14 | `bin/skill-integrity.json` | Regenerate via `npm run generate-integrity` plus `--check` |

Design decisions: (a) `externalSkills` exemption reuses the ws-memo precedent instead of a new marker scheme — generated tree is never vendored upstream and stays out of installer membership; (b) exactly one helper script keeps AC11 reviewable and the skill protocol-led; (c) autoload on/off is row membership: generator appends the row at seed/first-run only (never on later runs, never duplicates), off = delete row, opt-out phrase `stop ws-project-patterns` works regardless — no schema or GUI-editor churn; (d) `configure_autoload.cjs` must preserve unknown existing rows and keep presence-gated generator-managed rows (verify plus test); (e) carve-out keyed on `generatorManaged` entry flag plus on-disk tree presence, so ws-memo policy is untouched.

Invariants (`config.json.invariants`): `commitPlanFilesOnlyAtStep8: true` honored (no `{plansDir}` staging until Step 8 delivery).

## 3. Step-by-Step Plan

1. Author generator SKILL.md (#1): frontmatter (`name`, trigger-scoped `description`, `version` placeholder until bump, invocation names), entry gate (config resolution, path tokens), steps with Done-when, harvest minimum set with tolerated-missing rule, rewrite-vs-append rule, summary labels (`added`/`rewrote`/`unchanged`) with evidence pointers, dry-run, idempotency, secrets/anonymization rule, first-run-only autoload-row append plus opt-out, loaded banner. Check: en-us scan, no host names, no `{plansDir}` writes. Load `ws-write-a-skill` structure rules before drafting.
2. Author seed script (#2): parse `--repo-root`/`--dry-run` via schema validator; resolve generated path under repo skills root with containment check; write skeleton (headings plus opt-out note, zero project claims) only when absent; `--dry-run` prints planned write; exit 0 unchanged when present. Check: `node --check`, zero floating promises by inspection, handles closed.
3. Register graphs (#3, #4): workflows membership plus dependencies entry in both files; `externalSkills` entry for `ws-project-patterns` with `generatorManaged: true`. Check: JSON parses, both files agree on membership.
4. Verify installer exemption (#5): trace update/uninstall paths over a fixture consumer install containing `ws-project-patterns/`; assert bytes preserved and manifest untouched. Check: new test passes; implement exemption only on failure.
5. Verify harness tolerance (#6): run `ws-check-harness` phases over a fixture install with the generated dir present; assert exit 0. Check: new test passes; add skips only on failure.
6. Implement autoload carve-out (#7): presence-gated keep for `generatorManaged` entries in `dropExternalCompanionMembers`; regression test proves ws-memo rows still drop and unknown non-managed rows still preserved. Check: new test passes plus existing autoload suite green.
7. Verify autoload round-trip: `configure_autoload.cjs` keeps the `ws-project-patterns` row when the tree exists, drops it when absent, never duplicates. Check: new test passes.
8. Docs/site/catalog (#8–#10): inventory plus router rows, README/FEATURES entries, site rebuild. Check: doc-sync tests green.
9. Bump plus integrity (#13, #14): `node bin/build-site.js --bump`, stamp SKILL frontmatter version, `npm run generate-integrity`, `npm run verify-integrity`. Check: both exit 0, versions agree.
10. Tests (#11, #12): author battery per §5, register suite, run `npm run test` green. Check: new battery plus full suite exit 0.

Ordering: 1→2 authoring, 3→7 wiring/verification, 8 docs, 9 bump/integrity last (hashes final tree), 10 throughout with final full run.

## 4. Permissions, Tenancy & i18n

N/A with rationale: local skill package with no auth boundary, no tenant data, no user-facing UI strings. Secret handling (AC9) is covered in §3 step 1 plus §5 (secrets review) and §6 (input/path rules). No RBAC, tenancy isolation, or i18n keys exist in this feature.

## 5. Test Coverage

New battery `test/test-ws-patterns-generator.js` (registered in `test-suites.json` `local`):

| AC | Test case |
|----|-----------|
| AC1 | `skill-body`: SKILL.md exists; frontmatter `name` plus `version` equals package `packageVersion`; invocation names cover `ws-patterns-generator`; loaded banner directly under `# ws-patterns-generator`; every numbered step has `Done when:` |
| AC2 | `graph-membership`: both graphs list the skill in workflows plus expected dependencies; `generate-integrity`/`--check` exit 0 |
| AC3 | `seed-blank`: fixture run writes skeleton with headings only and zero project claims; second run byte-identical; pre-existing body never overwritten. `installer-exclusion`: fixture consumer install with `ws-project-patterns/` survives update logic byte-identical and stays out of the managed manifest |
| AC4 | `autoload-row`: generator appends the Always-applied row at seed/first-run only (never duplicates, never on later runs); `configure_autoload.cjs` round-trip preserves it when the tree exists and drops it when absent; ws-memo rows still drop; opt-out phrase documented; explicit invoke path independent of the row |
| AC5 | `dry-run`: seed `--dry-run` writes nothing and reports planned actions |
| AC6 | `harvest-tolerance`: protocol names the minimum source set; missing-source rule is tolerate-and-note (asserted on SKILL.md text plus seed behavior for absent optional inputs) |
| AC7 | `summary-labels`: protocol mandates `added`/`rewrote`/`unchanged` labels, rewrite-vs-append rule, and evidence pointers per bullet (asserted on SKILL.md text) |
| AC8 | `idempotent-noop`: seed rerun and no-change generator rerun leave bytes identical with `unchanged` summary |
| AC9 | `no-secrets`: generated skeleton plus generator body pass secrets review; anonymization rule present in SKILL.md |
| AC10 | `portable-prose`: en-us, no host product names, path tokens, `user-gate` only for gates (asserted on both bodies) |
| AC11 | `script-invariants`: no `.py` under the new skill; `scan_stack_invariants.cjs --stack typescript-node` reports no new findings on the seed script; flags validated; reads contained; promises handled |
| AC12 | `changelog-rule`: protocol mandates one changelog entry per applied run with label plus counts (asserted on SKILL.md text) |
| AC13 | `harness-clean`: `ws-check-harness` exits 0 with the feature present |

Existing suites (`npm run test`) must stay green; doc-sync and integrity suites cover #8–#9 regressions.

## 6. Stack & Security Invariants Verification Plan

Stack rule pack: `{skillsRoot}/ws-shared/runtime/stacks/typescript-node.md`, Node-subset (this package is JavaScript `.cjs`, no `tsc` gate — strict-type rule N/A with rationale recorded here).

Touched framework boundaries and verification:

- Authorization & endpoint protection: no endpoints or auth surface in this feature — N/A (no code path authenticates or authorizes).
- Concurrency & async safety: seed script must await or handle every promise (no floating rejections); verification by inspection plus `scan_stack_invariants.cjs --stack typescript-node` clean plus `node --check`.
- Input validation & DTO boundary: CLI flags (`--repo-root`, `--dry-run`) validated against a schema before use; untrusted path inputs never concatenated into filesystem paths without `path.resolve` plus repo-root containment check; verification by targeted tests (malicious `--repo-root` rejected, traversal outside root refused).
- Subscription & lifecycle cleanup: all file handles/streams closed (sync API preferred; no lingering listeners); verification by inspection plus scan clean.
- Injection & path traversal: generated-body writes confined to the resolved skills root; issue/body text never interpolated into shell commands (no child processes in the seed script); verification by test plus review.
- Autoload carve-out: `dropExternalCompanionMembers` change preserves ws-memo behavior (regression test) and only keeps present generator-managed trees.

Interview treats missing checks above as blocking gaps, not silent passes.

## 7. Pre-PR Checklist

- [x] Skill body lean (Tier 1, references only if needed), no duplicated normative blocks.
- [x] Graph registration mirrored in both `skill-dependencies.json` files (workflows membership plus `generatorManaged` external entry).
- [x] Generated-tree exemption proven by fixture test (installer plus harness).
- [x] Autoload carve-out plus first-run-only append plus opt-out documented and tested.
- [x] Stack & security invariants verified (async, validation, containment, cleanup; strict-type N/A recorded).
- [x] Test cases cover all ACs (battery plus full suite green).
- [x] Docs/site/catalog in sync; version bumped; integrity regenerated and verified.
- [x] No `{plansDir}` content staged before Step 8.

## 8. Open Questions

All Step 1 open questions resolved by interview (see `step-02-us-378.plan-interview.md`): harness-check scoping verified project-sourced (G2); seed/autoload split set to script-seeds-body-only with protocol-owned row append (G7, §3 steps 1–2); no new `ws-configure-project` section — first-run seeding plus documented row management is sufficient (G3 resolution, §2 decision e).
