---
name: Rename to spec-to-pr
overview: Rename the orchestrator skill from `us-workflow` to `spec-to-pr`, update all hub/pipeline/docs/test references, add a CLI migration so consumers keep `config.json`, then run check-harness and regenerate the site catalog.
todos:
  - id: git-mv-tree
    content: git mv us-workflow → spec-to-pr; rename run-test doc; drop .bak
    status: completed
  - id: identity-docs
    content: Update SKILL frontmatter, titles, aliases, US-WF→STP; keep uswf/ and us-{id}
    status: in_progress
  - id: ref-sweep
    content: Sweep AGENTS.md, pipeline skills, check-harness, README, package.json, tests, schema
    status: pending
  - id: cli-migrate
    content: Add us-workflow→spec-to-pr migration in bin/cli.js update + test case
    status: pending
  - id: verify
    content: build-site.js, npm run tests -- --local, check-harness Phases 0–5c + CHANGELOG
    status: pending
isProject: false
---

# Rename `us-workflow` → `spec-to-pr`

## Chosen identity

| Field | Value |
|-------|--------|
| Skill folder / `name:` | `spec-to-pr` |
| Invoke | `/spec-to-pr`, `@[spec-to-pr]` |
| Human title | Spec-to-PR (orchestrator) |
| Task description prefix | `STP step {N} — {Label}` (was `US-WF`) |
| Legacy aliases (keep forever in SKILL.md) | `/us-workflow`, `/us-delivery-workflow`, `@[us-workflow]`, `@[us-delivery-workflow]` |

## Explicit non-renames (compat)

Do **not** change these runtime conventions (in-flight consumer state / plan dirs):

- Git checkpoint tags: `uswf/{workflow-id}/before-step-{N}`
- Worktree / branch prefixes that use `uswf/`
- Plan slugs: `us-{id}` under `.cursor/plans/`
- Repo package name: `workflow-skills` stays

Document in SKILL/README that `uswf/` and `us-{id}` are historical runtime tokens, not the skill name.

## Rename mechanics

1. **Move tree** with `git mv`:
   - [`.agents/skills/us-workflow/`](.agents/skills/us-workflow/) → `.agents/skills/spec-to-pr/`
2. **Rename test doc**:
   - `us-workflow-run-test.md` → `spec-to-pr-run-test.md`
3. **Drop dead bak** if still present: `us-workflow.md.bak` (do not keep under new folder).
4. **Frontmatter** in [`SKILL.md`](.agents/skills/us-workflow/SKILL.md): `name: spec-to-pr`; description rewritten around Spec→PR FSM; `upstream` line updated; legacy aliases section expanded.
5. **Internal titles**: README H1, DIAGRAM, FAQ, setup, tools, config.schema `$id`/`title`, schema comment paths → `spec-to-pr`.

## Reference sweep (string replace + path fix)

Update every reference from `us-workflow` / path `../us-workflow/` to `spec-to-pr`:

- Hub: [`AGENTS.md`](AGENTS.md) (canonical upstream table, skill loading paths for caveman/gabarito/karpathy/changelog/learning, Layer 2/5, Task Router, Verification)
- Root [`README.md`](README.md), [`package.json`](package.json) description
- All pipeline skills `00`–`11` (frontmatter `upstream:` + body links to orchestrator / `extra-skills/spec-format`)
- Nested extras under the moved tree (relative `AGENTS.md` / parent links stay valid after folder rename; fix any absolute skill-name strings)
- [`check-harness.md`](.agents/skills/check-harness.md) + [`.opencode/commands/check-harness.md`](.opencode/commands/check-harness.md) examples that hardcode `us-workflow`
- [`test/test-install.js`](test/test-install.js) expected paths and pipeline list
- [`bin/build-site.js`](bin/build-site.js) comments only (scanner is path-agnostic)
- Light touch: [`CHANGELOG.md`](CHANGELOG.md) entry for the rename; [`MEMORY.md`](MEMORY.md) only if a rename trap is worth recording

Leave historical mentions in old CHANGELOG entries as-is when they describe past releases; add a **new** entry for this rename.

## Consumer install migration (required)

[`bin/cli.js`](bin/cli.js) `update` matches folders by **same name**. After rename, consumers with only `us-workflow/` would stop receiving orchestrator updates.

Add migration in `runUpdate` (and optionally interactive install):

1. If target has `.agents/skills/us-workflow` and upstream has `spec-to-pr`:
   - Preserve `us-workflow/config.json` if present
   - Install/update `spec-to-pr` with that config preserved
   - Remove old `us-workflow/` directory after successful copy (or rename aside then delete)
   - Log: `Migrated 'us-workflow' → 'spec-to-pr' (config.json preserved)`
2. Extend [`test/test-install.js`](test/test-install.js) with a case that seeds old folder + config and asserts post-update layout.

## Verification sequence

```text
git mv + content updates
→ node bin/build-site.js          # refresh docs/index.html
→ npm run tests -- --local        # install pack + consumer checks
→ load check-harness Phases 0–5c  # routing, links, orphans, portability
→ present harness findings; apply only if you approve
```

Harness focus after rename: AGENTS paths to `.agents/skills/spec-to-pr/...`, Layer tables, auto-load extras, no leftover `us-workflow/` directory, no broken `../us-workflow/` links.

## Out of scope

- Renaming numbered pipeline skills (`00-write-spec`, …)
- Changing artifact filenames in [`ARTIFACTS.md`](.agents/skills/us-workflow/ARTIFACTS.md)
- Changing `workflow-skills` npm/repo name
- Force-push or consumer repo PRs (document migration only)