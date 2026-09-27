---
slug: us-439
step: 8
status: completed
workflowId: us-439-20260927T170000Z
acRefs: []
startedAt: "2026-09-27T17:00:00Z"
endedAt: "2026-09-27T18:58:00Z"
---
# Delivery Result — us-439

## Summary

Added the packaged skill `ws-spec-to-issue`: it turns a free-text feature idea into an agentically
reformulated, anonymized tracker item (GitHub issue or Azure DevOps User Story) **without** writing
any local spec and **without** touching git. It is the outbound companion of `ws-spec-from-provider`
(the item re-enters through a provider `fetch-to-spec` when implementation starts).

## Timing

| Metric | Value |
|--------|-------|
| Started | 2026-09-27T17:00:00Z |
| Ship phase | 2026-09-27T18:58:00Z |
| Total wall-clock | ~118 min |

## Changes

### New skill (additive)
| File | Role |
|------|------|
| `.agents/skills/ws-spec-to-issue/SKILL.md` | Invocation, tracker resolution + auth, reformulation + anonymization, steps, guardrails |
| `.agents/skills/ws-spec-to-issue/scripts/run_spec_to_issue.cjs` | Node-only helper: tracker resolution, anonymization guard, `--dry-run`, provider `create-issue` delegation via `--body-file` |
| `.agents/skills/ws-spec-to-issue/evals/evals.json` | Skill eval fixtures |
| `test/test-ws-spec-to-issue.js` | Contract tests (frontmatter, both manifests, `--help`, GH/ADO dry-run, `local` STOP, leak guard) |

### Registration + routing
- Both dependency manifests (`bin/skill-dependencies.json`, `.agents/skills/ws-shared/runtime/skill-dependencies.json`): `packages.workflows.skills` membership + explicit `dependencies` + `ws-spec-manager` routing.
- `.agents/skills/ws-shared/runtime/git-ownership.md` §5: `read-only` matrix row.
- Routers/indexes: root `AGENTS.md`, `.ws/AGENTS.md`, `.ws/autoload.md`, `CATALOG.md`, `README.md`, `FEATURES.md`, `SPEC-MANAGEMENT.md`, `docs/llms.txt`, ws-shared runtime `AGENTS.md`/`CATALOG.md`/`autoload.md`, `.agents/skills/ws-spec-manager/SKILL.md`.
- `test/test-suites.json` registers the new contract test.

### Version + integrity + site
- `package.json` `0.5.5` → `0.5.6`, aligned across both `packageVersion` keys, `.agents/skills/ws-shared/version.json`, `test/package.json` tarball ref and site footer (`build-site:bump`).
- `bin/skill-integrity.json` regenerated (59 skills, v0.5.6).
- `docs/index.html`, `docs/wiki/specs/spec-lifecycle.html`, `docs/wiki/harness/diagnostics-and-benchmarks.html` rebuilt.

### Docs / hub sync (pre-ship trio)
- `ws-spec-index sync us-439`: `index.PRD` Feature-map bullet → `[x]`, Next-specs row 150 → `[x] done`, Done-log row added.
- `ws-wiki sync`: `.agents/specs/wiki/specs/spec-lifecycle.md` notes the outbound tracker path; wiki validates (12 pages); HTML regenerated.
- `ws-changelog`: entry appended to `.ws/CHANGELOG.md`.

## Verification

| Command | Exit |
|---------|------|
| `node test/test-ws-spec-to-issue.js` | 0 |
| `npm run test` | 0 (139/139) |
| `node test/test-harness-clean.js` | 0 (0 findings) |
| `check_skill_load.cjs` | 0 (158 docs) |
| `check_duplicates.cjs` | 0 |
| `node test/test-git-ownership-contract.js` | 0 |
| `node test/test-context-budget.js` | 0 |
| `check_workflows.cjs` | 0 |
| `node test/test-powershell-config-editor.js` | 0 (12/12) |
| `npm run verify-integrity` | 0 |
| `node bin/build-site.js --check` | 0 |
| Verify score | 10/10 |

## Commits

| SHA | Step | Message |
|-----|------|---------|
| `0d2337df` | 5 | `feat(us-439): add ws-spec-to-issue outbound tracker skill` |

## PR

See `prUrl` in workflow state (Step 8 ship phase).

## scoreAndRefine

Not executed (verify score 10/10 on first pass).
