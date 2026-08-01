# ACTIONS — ws-spec-list

Disclosed reference for [`SKILL.md`](SKILL.md).

## Fields (from `*.state.md` frontmatter)

| Field | Board column | Notes |
|-------|--------------|-------|
| `us` / `slug` | Slug | Prefer `slug`, else `us`, else parent folder name |
| `status` | Status | `active` \| `completed` \| `cancelled` \| `failed` |
| `workflowType` | Type | `standard` \| `lite` (unknown → `—`) |
| `currentStep` | Step | Integer; show as `N/max` |
| `completedSteps` | Done% | `round(100 * len / max)`; max = 10 standard (0–9), 6 lite (0–5) |
| `prUrl` / `prNumber` | Delivery | URL if present; else `#N`; else `step-08-*.result.md` → `result`; else `—` |
| path contains `.archive` | Loc | `archive` vs `live` |

Orphan spec rows: Status=`orphan`, Type/Step/Done%/Delivery=`—`, Loc=`spec`.

## Board format

```markdown
## Spec board ({plansDir})

| # | Slug | Status | Type | Step | Done% | Delivery | Loc |
|---|------|--------|------|------|-------|----------|-----|
| 1 | auto-mode-… | completed | lite | 6/6 | 100% | #42 | live |
| 2 | us-101 | active | standard | 4/10 | 40% | — | live |
| 3 | new-feature | orphan | — | — | — | — | spec |
```

Footer: `N rows · filter: {all|--active|--status X} · /ws-spec-list`

## Action matrix

| Action | When offered | Effect |
|--------|--------------|--------|
| **Continue** | `active` or `failed` (live state) | Load orch matching `workflowType` (`ws-spec-to-pr` / `ws-spec-to-pr-lite`) with state path; hand off; stop list skill |
| **Start** | `orphan`, or no live state for a chosen slug | Start orch on that spec path / slug (classify if needed); hand off; stop |
| **Finish** | `active` or `failed` | Confirm → set `status: completed`, `endedAt: ISO`; do **not** invent PR |
| **Cancel** | `active` or `failed` | Confirm → set `status: cancelled`, `endedAt: ISO` |
| **Archive** | live row with terminal or stale state (`completed`/`cancelled`/`failed`, or user insists on active) | Confirm → move `{workflow-id}.state.md` (and sibling stale copies per ARTIFACTS) into `{us-dir}/{workflow-id}.archive/` |
| **Remove** | any row | Confirm (type slug) → delete `{us-dir}/` **or** orphan spec file only; never delete `{sharedDir}` |
| **Open PR** | Delivery has URL or `#N` | Print URL / `gh pr view` via SCM provider if configured; read-only |
| **Back** | always | Return to Select |
| **Exit** | always | Stop skill |

### Confirm gates

Finish / Cancel / Archive / Remove: `user-gate` with **Confirm (Recommended)** / **Back**. Remove second line: must match slug string before delete.

### Orch handoff

```text
Continue → Read state → load {skillsRoot}/ws-spec-to-pr[/lite]/SKILL.md → resume at currentStep
Start    → load orch entry (or ws-write-spec when no spec body yet)
```

Do not edit code or run pipeline steps inside this skill.
