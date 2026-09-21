---
superseded: true
supersededBy: step-02-us-378.plan.refined.md
slug: us-378
title: "Plan: skill generator for the consumer project (ws-patterns-generator)"
status: completed
step: 1
workflowId: us-378-20260921T112549Z
startedAt: "2026-09-21T11:27:55Z"
endedAt: "2026-09-21T11:36:39.791Z"
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
| 1 | `.agents/skills/ws-patterns-generator/SKILL.md` | Create: Tier 1 lean body (entry gate, steps resolve→harvest→decide→write→summarize, dry-run, idempotency, secrets/anonymization, autoload-row ensure, opt-out, loaded banner, Done-when per step) |
| 2 | `.agents/skills/ws-patterns-generator/scripts/seed_generated_skill.cjs` | Create: idempotent skeleton seed (writes only when missing, never overwrites; `--repo-root`, `--dry-run`; schema-validated flags; repo-root path containment; awaited promises; closed handles) |
| 3 | `bin/skill-dependencies.json` | Edit: add `ws-patterns-generator` to `packages.workflows.skills` plus `dependencies` entry (`ws-configure-project`, `ws-self-learning`, `ws-changelog`, `ws-secrets-leak-review`); add `ws-project-patterns` to `externalSkills` with generator-managed note |
| 4 | `.agents/skills/ws-shared/runtime/skill-dependencies.json` | Edit: mirror of #3 (both graphs stay in sync) |
| 5 | `bin/cli.js` and/or `bin/install-rules.js` | Edit only if verification finds unknown-dir pruning: exempt `externalSkills` ids (generator-managed note) from update/uninstall membership handling; `scanInstalledSkillsOnDisk` already excludes external ids |
| 6 | `.agents/skills/ws-check-harness/scripts/*.cjs` | Edit only if verification flags generator-managed dirs: skip `externalSkills`/marked dirs in the six membership-scoped checks |
| 7 | `CATALOG.md` | Edit: skill inventory row plus task router row |
| 8 | `README.md`, `FEATURES.md`, `docs/` | Edit/rebuild per harness change protocol (feature cards, inventory, site rebuild) |
| 9 | Root `AGENTS.md`, `.ws/AGENTS.md` | Edit only index/router rows that enumerate utility skills, if present |
| 10 | `test/test-ws-patterns-generator.js` | Create: file-logged test battery (see §5) |
| 11 | `test/test-suites.json` | Edit: register the new battery in `local` |
| 12 | `package.json`, site footer, both `packageVersion` | Version patch bump via `node bin/build-site.js --bump` (SKILL frontmatter stamp follows) |
| 13 | `bin/skill-integrity.json` | Regenerate via `npm run generate-integrity` plus `--check` |

Design decisions: (a) `externalSkills` exemption reuses the ws-memo precedent instead of a new marker scheme — generated tree is never vendored upstream and stays out of installer membership; (b) exactly one helper script keeps AC11 reviewable and the skill protocol-led; (c) autoload on/off is row membership managed by generator first-run append (never duplicate) with opt-out phrase `stop ws-project-patterns` — no schema or GUI-editor churn; (d) `configure_autoload.cjs` must preserve unknown existing rows (verify `membershipFromExistingRows`, add test).

Invariants (`config.json.invariants`): `commitPlanFilesOnlyAtStep8: true` honored (no `{plansDir}` staging until Step 8 delivery).

## 3. Step-by-Step Plan

1. Author generator SKILL.md (#1): frontmatter (`name`, trigger-scoped `description`, `version` placeholder until bump, invocation names), entry gate (config resolution, path tokens), steps with Done-when, harvest minimum set with tolerated-missing rule, rewrite-vs-append rule, summary labels (`added`/`rewrote`/`unchanged`) with evidence pointers, dry-run, idempotency, secrets/anonymization rule, autoload-row ensure plus opt-out, loaded banner. Check: en-us scan, no host names, no `{plansDir}` writes.
2. Author seed script (#2): parse `--repo-root`/`--dry-run` via schema validator; resolve generated path under repo skills root with containment check; write skeleton (headings plus opt-out note, zero project claims) only when absent; `--dry-run` prints planned write; exit 0 unchanged when present. Check: `node --check`, zero floating promises by inspection, handles closed.
3. Register graphs (#3, #4): workflows membership plus dependencies entry in both files; `externalSkills` entry for `ws-project-patterns` with generator-managed note. Check: JSON parses, both files agree on membership.
4. Verify installer exemption (#5): trace update/uninstall paths over a fixture consumer install containing `ws-project-patterns/`; assert bytes preserved and manifest untouched; implement exemption only on failure. Check: new test passes.
5. Verify harness tolerance (#6): run `ws-check-harness` phases over a fixture install with the generated dir present; add skips only on failure. Check: exit 0 with generated dir present and absent.
6. Verify autoload preservation: `configure_autoload.cjs` round-trip keeps the `ws-project-patterns` row and never duplicates; generator first-run appends when missing. Check: new test passes.
7. Docs/site/catalog (#7–#9): inventory plus router rows, README/FEATURES entries, site rebuild. Check: doc-sync tests green.
8. Bump plus integrity (#12, #13): `node bin/build-site.js --bump`, stamp SKILL frontmatter version, `npm run generate-integrity`, `npm run verify-integrity`. Check: both exit 0, versions agree.
9. Tests (#10, #11): author battery per §5, register suite, run `npm run test` green. Check: new battery plus full suite exit 0.

Ordering: 1→2 authoring, 3→6 wiring/verification, 7 docs, 8 bump/integrity last (hashes final tree), 9 throughout with final full run.

## 4. Permissions, Tenancy & i18n

N/A with rationale: local skill package with no auth boundary, no tenant data, no user-facing UI strings. Secret handling (AC9) is covered in §3 step 1 plus §5 (secrets review) and §6 (input/path rules). No RBAC, tenancy isolation, or i18n keys exist in this feature.

## 5. Test Coverage

New battery `test/test-ws-patterns-generator.js` (registered in `test-suites.json` `local`):

| AC | Test case |
|----|-----------|
| AC1 | `skill-body`: SKILL.md exists; frontmatter `name` plus `version` equals package `packageVersion`; invocation names cover `ws-patterns-generator`; loaded banner directly under `# ws-patterns-generator`; every numbered step has `Done when:` |
| AC2 | `graph-membership`: both graphs list the skill in workflows plus expected dependencies; `generate-integrity`/`--check` exit 0 |
| AC3 | `seed-blank`: fixture run writes skeleton with headings only and zero project claims; second run byte-identical; pre-existing body never overwritten. `installer-exclusion`: fixture consumer install with `ws-project-patterns/` survives update logic byte-identical and stays out of the managed manifest |
| AC4 | `autoload-row`: generator appends the Always-applied row once (never duplicates); `configure_autoload.cjs` round-trip preserves it; opt-out phrase documented; explicit invoke path independent of the row |
| AC5 | `dry-run`: seed `--dry-run` writes nothing and reports planned actions |
| AC6 | `harvest-tolerance`: protocol names the minimum source set; missing-source rule is tolerate-and-note (asserted on SKILL.md text plus seed behavior for absent optional inputs) |
| AC7 | `summary-labels`: protocol mandates `added`/`rewrote`/`unchanged` labels, rewrite-vs-append rule, and evidence pointers per bullet (asserted on SKILL.md text) |
| AC8 | `idempotent-noop`: seed rerun and no-change generator rerun leave bytes identical with `unchanged` summary |
| AC9 | `no-secrets`: generated skeleton plus generator body pass secrets review; anonymization rule present in SKILL.md |
| AC10 | `portable-prose`: en-us, no host product names, path tokens, `user-gate` only for gates (asserted on both bodies) |
| AC11 | `script-invariants`: no `.py` under the new skill; `scan_stack_invariants.cjs --stack typescript-node` reports no new findings on the seed script; flags validated; reads contained; promises handled |
| AC12 | `changelog-rule`: protocol mandates one changelog entry per applied run with label plus counts (asserted on SKILL.md text) |
| AC13 | `harness-clean`: `ws-check-harness` exits 0 with the feature present |

Existing suites (`npm run test`) must stay green; doc-sync and integrity suites cover #7–#8 regressions.

## 6. Stack & Security Invariants Verification Plan

Stack rule pack: `{skillsRoot}/ws-shared/runtime/stacks/typescript-node.md`, Node-subset (this package is JavaScript `.cjs`, no `tsc` gate — strict-type rule N/A with rationale recorded here).

Touched framework boundaries and verification:

- Authorization & endpoint protection: no endpoints or auth surface in this feature — N/A (no code path authenticates or authorizes).
- Concurrency & async safety: seed script must await or handle every promise (no floating rejections); verification by inspection plus `scan_stack_invariants.cjs --stack typescript-node` clean plus `node --check`.
- Input validation & DTO boundary: CLI flags (`--repo-root`, `--dry-run`) validated against a schema before use; untrusted path inputs never concatenated into filesystem paths without `path.resolve` plus repo-root containment check; verification by targeted tests (malicious `--repo-root` rejected, traversal outside root refused).
- Subscription & lifecycle cleanup: all file handles/streams closed (sync API preferred; no lingering listeners); verification by inspection plus scan clean.
- Injection & path traversal: generated-body writes confined to the resolved skills root; issue/body text never interpolated into shell commands (no child processes in the seed script); verification by test plus review.

Interview must treat missing checks above as blocking gaps, not silent passes.

## 7. Pre-PR Checklist

- [ ] Skill body lean (Tier 1, references only if needed), no duplicated normative blocks.
- [ ] Graph registration mirrored in both `skill-dependencies.json` files.
- [ ] Generated-tree exemption proven by fixture test (installer plus harness).
- [ ] Autoload row append-once plus opt-out documented and tested.
- [ ] Stack & security invariants verified (async, validation, containment, cleanup; strict-type N/A recorded).
- [ ] Test cases cover all ACs (battery plus full suite green).
- [ ] Docs/site/catalog in sync; version bumped; integrity regenerated and verified.
- [ ] No `{plansDir}` content staged before Step 8.

## 8. Open Questions

| # | Question | Impact if unresolved |
|---|----------|----------------------|
| 1 | Do all six membership-scoped harness checks already ignore `externalSkills` generator-managed dirs, or do some need explicit skips? | Step 4 discovers via fixture; skips added only on failure — bounded, test-proven either way. |
| 2 | Should the seed script also ensure the autoload row, or stay append-by-generator-protocol with the script seeding the body only? | Default: script seeds body only (single responsibility); row ensure stays agent protocol. Reversible without AC impact. |
| 3 | Does `ws-configure-project` need a generator section now, or is first-run seeding plus documented row management sufficient? | Default: sufficient without new schema keys (avoids GUI-editor sync); revisit only if interview shows a config gap. |
