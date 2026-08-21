# Disposable patterns — ws-cleanup

Scan enclosure: `{plansDir}` (required), `{reviewsDir}` (code-review rounds), optional repo-root temp globs. Never product `src/` / app trees.

## Scratch (always eligible when untracked)

| Pattern | Reason |
|---------|--------|
| `{plansDir}/**/telemetry/` | Per-step JSONL / aggregate scratch |
| `{plansDir}/telemetry/` | Cross-workflow aggregate dir |
| `{plansDir}/**/.runtime/` | Orch / goal-loop runtime |
| `{plansDir}/**/.finding-*.json` | Audit/finding scratch |
| `{plansDir}/**/.audit-session-*.json` | Audit session scratch |
| `{plansDir}/**/{workflow-id}.baseline/` | Baseline snapshot (artifact-cleanup Phase B) |
| `{plansDir}/**/step-03-*.plan.exec.md` | Exec dump |
| `{plansDir}/**/step-03-*.exec.dag.json` | DAG dump |
| `{plansDir}/**/step-00-*.issue.json` | Issue fetch temp |
| `{reviewsDir}/PR*.md` | Local code-review round artifacts (`PR-NNN-round-K.md`) |
| Repo root `.tmp-*/` | Agent temp dirs |
| Repo root `*.bak_*` | Backup leftovers |

## Shipped plan roots (default mode; omitted with `--scratch-only`)

Eligible **only** when:

1. Folder is `{plansDir}/{slug}/` or `{plansDir}/{slug}.archive/`, and
2. `*.state.md` has `status: completed` \| `cancelled` \| `failed`, **or** the folder name ends with `.archive`, and
3. No path under the folder is git-tracked.

Active / paused / unknown status → list scratch children only; skip deleting the plan root.

## Never delete

- Any path returned by `git ls-files` (tracked)
- `{skillsRoot}/ws-*/**` skill bodies
- `{sharedDir}/config.json`, `STACK.md`, `MEMORY.md`, `memory/**`, `CHANGELOG.md`, `installed-skills.json`
- `{specsDir}/**` spec of record (unless it only exists as a disposable copy under a shipped plan being removed — plan-dir copies go with the plan)
- Product source outside the enclosure above

## Gitignore suggestions (advisory)

Suggest when matching debris exists or patterns are recommended and absent from root `.gitignore`:

```gitignore
.agents/plans/**/telemetry/
.agents/plans/**/.runtime/
.agents/plans/**/.finding-*.json
.agents/plans/**/.audit-session-*.json
.agents/plans/**/*.baseline/
.agents/codereviews/PR*.md
.tmp-*/
```

Use configured `{plansDir}` / `{reviewsDir}` segments when they differ from the defaults.
