---
id: null
slug: spec-prefix-ordering
title: "Optional chronological spec filename prefixes and ws-spec-organizer"
source: local
specDate: 2026-08-28
---

# Specification — Optional chronological spec filename prefixes and ws-spec-organizer

## Description

Consumers cannot opt into a stable visual order for spec-of-record files. Writers (`ws-write-spec`, `ws-spec-from-provider`, provider `fetch-to-spec`, `ws-local-spec-provider` when it materializes `{specsDir}`) hardcode `{specsDir}/{slug}.spec.md`. `ws-spec-format` FORMAT.md and autoload vocabulary match that single shape. A one-off rename in this upstream tree already uses `NNNN-{slug}.spec.md` and a few scripts resolve that pattern, but there is no config flag, no shared helper, and no packaged reorder tool for existing consumer `{specsDir}` trees.

This feature adds one boolean, **`enforceSpecPrefixOrdering`**, on project `config.json` (parent object: see Assumptions). Default is **false**. Omitted, non-boolean, or missing config resolves to **false**.

| Flag | Writer output for a new spec of record |
|------|----------------------------------------|
| `false` (default) | `{specsDir}/{slug}.spec.md` |
| `true` | `{specsDir}/NNNN-{slug}.spec.md` with a four-digit zero-padded sequence |

Frontmatter `slug` never includes the numeric prefix. Workflow copies stay `{plansDir}/{slug}/step-00-{slug}.spec.md`. `{specsDir}/{slug}.context.md` companions use the same prefix as their spec when the flag is true (or when organizer assigns numbers).

A new skill **`ws-spec-organizer`** owns the Node helper scripts. All spec writers call that helper instead of concatenating `{slug}.spec.md` in prose-only recipes. The same skill exposes a reorder command that chronologically prefixes existing board specs under `{specsDir}` (`{specsDir}` ← `plans.specsDir`).

### Design Intent

Greenfield. Not a regression restore. Skip `git log -p -S` on a prior symbol: no shipped `enforceSpecPrefixOrdering` resolver exists. Intentional constraints: keep `{plansDir}` unprefixed; keep slug identity stable; default off so existing consumers do not rename on install; four-digit prefixes (not the two-digit `01-` examples in `INDEX-TEMPLATE.md`).

### Config shape

| Key | Type | Default | Meaning |
|-----|------|---------|---------|
| `enforceSpecPrefixOrdering` | boolean | `false` | When true, new spec-of-record writes and organizer apply `NNNN-{slug}.spec.md` under `{specsDir}`. When false, writers use `{slug}.spec.md`. |

**Runtime resolution (mandatory):**

1. Explicit JSON boolean `true` in project `config.json` → enforce prefixes.
2. Key omitted, `false`, non-boolean, or config missing → **false**.
3. Schema `default: false` is documentation/seed only. Runtime never treats schema-alone as live true.

Parent object is `plans` (chosen default). Alternate `defaults` parent is recorded in `{specsDir}/spec-prefix-ordering.context.md` and is out of scope unless that decision is reversed.

### Shared contract (single SoT)

One helper module shipped with `ws-spec-organizer` is the only path-builder writers use:

```bash
node {skillsRoot}/ws-spec-organizer/scripts/resolve_spec_path.cjs --repo-root . --slug {slug} [--json]
```

It prints the repo-relative spec-of-record path (and optional companion `.context.md` path). Behaviors:

1. Read resolved `enforceSpecPrefixOrdering`.
2. If an on-disk file already matches `^\d{4}-{slug}\.spec\.md$` or `{slug}.spec.md` under `{specsDir}` (top-level), return that existing path (do not mint a second file or a double prefix).
3. If none exists and flag is false → `{specsDir}/{slug}.spec.md`.
4. If none exists and flag is true → `{specsDir}/{nextNNNN}-{slug}.spec.md` where `nextNNNN` is `max(existing top-level four-digit prefixes) + 1`, or `0001` when none exist.
5. If flag is true and the skill/script is not installed → non-zero exit, stderr names `ws-spec-organizer`, no write.

Hub docs (FORMAT.md filename table, autoload vocabulary + path rules, tools.md, writer SKILL.md recipes) cite this helper and the flag. They do not keep a second filename grammar.

### Writer and lookup sites

| Site | Duty |
|------|------|
| `ws-write-spec` | Write (and optional context companion) via resolve helper |
| `ws-spec-from-provider` | Skip-existing treats prefixed `NNNN-us-{id}.spec.md` as already imported; write via write-spec |
| `ws-github-provider` / `ws-azure-devops-provider` `fetch-to-spec` | Spec of record path via write-spec / helper; `step-00` unchanged |
| `ws-local-spec-provider` register | When copying into `{specsDir}`, destination from helper; already-in-specsDir input stays in place |
| `ws-sync-spec` | Edit the resolved existing spec of record |
| `ws-spec-index` `track` | Find existing `{slug}.spec.md` or `NNNN-{slug}.spec.md`; Feature map backtick uses on-disk filename |
| `ws-spec-list` | Glob `{specsDir}/**/*.spec.md`; slug from frontmatter (strip prefix only if frontmatter missing) |
| `ws-spec-archive` `scan_plans` | Link spec of record via helper |
| `ws-task-lifecycle` | Delegates write-spec (no private path concat) |

`ws-write-plan` and other `{plansDir}` artifacts are not prefixed.

### `ws-spec-organizer` reorder

```bash
node {skillsRoot}/ws-spec-organizer/scripts/organize_specs.cjs --repo-root . [--dry-run | --apply]
```

- Default is `--dry-run` (print planned `git mv` / index edits; no writes).
- `--apply` performs `git mv` when tracked, filesystem rename when untracked; updates `{specsDir}/index.PRD` `spec:` backticks to on-disk names; assigns matching prefixes to sibling `{slug}.context.md`.
- Chronology for existing files: `specDate` (frontmatter day), then git first-add author timestamp, then mtime; ties by filename.
- Scope: top-level `{specsDir}/*.spec.md` and matching `*.context.md` only. Do not rename `index.PRD`, `domains/`, nested leftover plan folders, `{plansDir}/**`, or `step-00-*.spec.md`.
- Strip a leading `^\d{4}-` from the stem before reassigning so re-runs never produce `0001-0001-slug.spec.md`.
- Does not rewrite frontmatter `slug`.
- `--apply` on a dirty overlapping path set: fail closed (non-zero) rather than partial rename.

### Packaging

`ws-spec-organizer` is a Workflows-package skill (not Extra). `ws-write-spec` lists it as a dependency so the helper is present wherever writers install. Register in `bin/skill-dependencies.json`, both CATALOG task routers, integrity, and `ws-configure-project` interview for the flag (MEMORY: new config keys need INTERVIEW.md gate tables and write semantics).

## Acceptance Criteria

- AC1: `config.schema.json` defines `plans.enforceSpecPrefixOrdering` as a boolean with default false.
- AC2: `config.json.example` seeds `plans.enforceSpecPrefixOrdering` as false with a comment that omitted or non-boolean values resolve to false.
- AC3: Runtime resolution treats only an explicit JSON `true` as enforce-on; omitted, false, non-boolean, or missing config resolve to false.
- AC4: `ws-configure-project` INTERVIEW.md includes a gate table, option table (Recommended: false), and write semantics for `plans.enforceSpecPrefixOrdering`.
- AC5: `ws-spec-organizer` ships `SKILL.md` with loaded banner `ws-spec-organizer loaded.`, `scripts/resolve_spec_path.cjs`, and `scripts/organize_specs.cjs`; recipes use `node` launchers.
- AC6: `resolve_spec_path.cjs --slug {slug}` with flag false and no existing file prints `{specsDir}/{slug}.spec.md` (repo-relative, posix).
- AC7: `resolve_spec_path.cjs --slug {slug}` with flag true and no existing file prints `{specsDir}/NNNN-{slug}.spec.md` where NNNN is max existing top-level four-digit prefix plus one, or 0001.
- AC8: `resolve_spec_path.cjs` returns the existing on-disk path when either `{slug}.spec.md` or `NNNN-{slug}.spec.md` already exists at `{specsDir}` top-level and does not emit a double-prefixed stem.
- AC9: `resolve_spec_path.cjs` with flag true and missing organizer script exits non-zero and writes no spec file.
- AC10: `ws-write-spec` writes the spec of record (and lazy context companion) to the path returned by `resolve_spec_path.cjs`; frontmatter `slug` equals the unprefixed slug.
- AC11: `ws-spec-from-provider` skip-existing treats `{specsDir}/NNNN-us-{id}.spec.md` as already imported (same as unprefixed `us-{id}.spec.md` or an existing `{plansDir}/us-{id}/step-00-us-{id}.spec.md`).
- AC12: Provider `fetch-to-spec` and `register_local_spec.cjs` do not write `{plansDir}/{slug}/step-00-{slug}.spec.md` with a numeric prefix on the plan filename or folder.
- AC13: `ws-spec-index` `track` finds prefixed or unprefixed spec-of-record files and writes Feature map `spec:` backticks using the on-disk filename.
- AC14: `organize_specs.cjs` with no `--apply` (or with `--dry-run`) exits 0 and leaves `{specsDir}` filenames unchanged.
- AC15: `organize_specs.cjs --apply` on a fixture of mixed unprefixed board specs assigns `0001`… in chronological order (`specDate`, then git first-add, then mtime), `git mv`s tracked files, and rewrites `index.PRD` `spec:` backticks.
- AC16: `organize_specs.cjs --apply` assigns the same NNNN to a sibling `{slug}.context.md` as its `{slug}.spec.md`.
- AC17: `organize_specs.cjs --apply` does not rename `{plansDir}` trees, `index.PRD`, or nested directories under `{specsDir}` that are not top-level `*.spec.md` / `*.context.md`.
- AC18: Re-running `--apply` on an already prefixed tree does not produce stems matching `^\d{4}-\d{4}-`.
- AC19: `bin/skill-dependencies.json` lists `ws-spec-organizer` in the Workflows package and as a dependency of `ws-write-spec`.
- AC20: FORMAT.md, autoload.md specs vocabulary/path rules, tools.md, CATALOG task routers (root and ws-shared), and FEATURES.md (when `tracking.featuresMdEnabled` is not false) describe the flag and the organizer helper; skill bodies stay host-neutral.
- AC21: Automated tests cover resolve (false/true/existing/missing-skill) and organize (dry-run vs apply, no double prefix, skip plans dir).
- AC22: `npm run generate-integrity` is run in the same change that hashes `ws-spec-organizer` and updated writer skills.

## Original Issue Context

Free-text `/ws-write-spec` ask: prefix new spec writes when a config flag is on; centralize the contract; add `ws-spec-organizer` to reorder existing consumer `{specsDir}` trees; `enforceSpecPrefixOrdering` default false.

### Prior Work Sweep

- Local keyword + `git log` on `.agents/specs`, `ws-write-spec`, `ws-spec-from-provider`, `ws-spec-index`, `autoload.md`: FORMAT and writer recipes still document `{specsDir}/{slug}.spec.md` only.
- `track_index.cjs`, `register_local_spec.cjs`, and `scan_plans.cjs` already resolve optional `^\d{4}-{slug}.spec.md` from an upstream dogfood rename; that is lookup-only, not a config-gated writer contract.
- `INDEX-TEMPLATE.md` examples use two-digit `01-feature-a.spec.md` (not the four-digit contract).
- `ws-spec-from-provider` skip-existing still checks exact `{specsDir}/us-{id}.spec.md`.
- No GitHub PR titled for `ws-spec-organizer` / `enforceSpecPrefixOrdering` at sweep time.
- Related commit note: four-digit prefixes appear in this repo’s spec board; not a shipped consumer flag.

### Design Intent

New capability. Prefixes are an opt-in visual index on the spec board, not a change to slug, workflow id, or plan folder names.

## Notes

- Next number on **create** is max existing prefix + 1 (stable append). Full chronology rewrite is **organizer --apply** only.
- Agents expand `{specsDir}` from `plans.specsDir` before calling the helper.
- Hybrid install: run organizer scripts from the same `{skillsRoot}` that holds `ws-spec-organizer/SKILL.md` (local skill body overrides global).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Prefixing `{plansDir}/{slug}/` or `step-00-{slug}.spec.md` | Plan identity stays `{slug}`; board prefixes are spec-of-record only |
| Two-digit `01-` prefixes as the shipped grammar | Conflicts with four-digit dogfood; INDEX-TEMPLATE examples update to four digits as a doc fix inside this spec, not a second grammar |
| Auto-running organizer on `npx` install/update | Reorder is explicit `--apply`; install must not rewrite consumer specs |
| Renaming `index.PRD` or `domains/` | Not spec-of-record files |
| Changing frontmatter `slug` to include NNNN | Breaks `{plansDir}/{slug}/` and tracker `us-{id}` |
| `ws-write-plan` filename prefixes | Plans are not the spec board |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Config parent object | `plans.enforceSpecPrefixOrdering` | Sits beside `plans.specsDir`; orch `defaults.*` flags are pipeline behavior, not spec-board layout | n |
| Package membership | Workflows + `ws-write-spec` depends on `ws-spec-organizer` | Helper must exist wherever writers exist; Extra-only would fail `enforce: true` on Workflows-only installs | n |
| Implicit dimensions not listed as ACs | N/A because this is a local Node helper and filename contract: no auth, rate limits, tenancy, or networked retries | Filename/config/install graph only | n |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Flag + shared resolve helper + organizer reorder + writer/lookup call sites; no plan-path prefixes | Out of Scope table; AC12 AC17 |
| Atomic criteria | Each AC is a single pass/fail (schema, resolve, skip-existing, dry-run, apply, packaging) | Enumerate AC1–AC22 |
| Failure modes | Missing skill when enforce true; dry-run no-op; no double prefix; skip-existing must see prefixed files | AC9 AC14 AC18 AC11; Negative scenarios |
| Observation telemetry | Named node CLIs and `npm run test` / integrity | Validation Notes |
| Open blockers | Config parent and package membership have chosen defaults in Assumptions | context.md; Confirmed n until implement interview |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/spec-prefix-ordering.spec.md` exit 0
- `node {skillsRoot}/ws-spec-organizer/scripts/resolve_spec_path.cjs --repo-root . --slug fixture --json` stdout path + `enforce` boolean
- `node {skillsRoot}/ws-spec-organizer/scripts/organize_specs.cjs --repo-root <fixture> --dry-run` exit 0 and unchanged `git status` for `{specsDir}`
- `npm run test` including new organizer/resolve fixtures
- `npm run verify-integrity` after `generate-integrity`

### Negative & Failing Test Scenarios

- Flag true and `resolve_spec_path.cjs` absent: command exits non-zero; no `{specsDir}` file created.
- `organize_specs.cjs` without `--apply`: exit 0; fixture filenames unchanged.
- Fixture spec already named `0003-demo.spec.md`: resolve `--slug demo` returns that path, not `0004-0003-demo.spec.md`.
- `ws-spec-from-provider` skip: `{specsDir}/0002-us-99.spec.md` exists → id 99 is skipped (must not write a second `us-99.spec.md`).
- `--apply` while a target `NNNN-*.spec.md` already exists as a different slug: fail closed, no partial `git mv`.
