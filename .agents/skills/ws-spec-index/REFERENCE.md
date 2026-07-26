# ws-spec-index Reference

Reference details, evidence rules, path tokens, and call contracts for `ws-spec-index`.

## Path Tokens

| Token | Default | Source |
|-------|---------|--------|
| `{plans.specsDir}` | `.agents/specs/` | `config.json` → `plans.specsDir` |
| `{plans.dir}` | `.agents/plans/` | `config.json` → `plans.dir` |

## Status Legend

| Mark | Meaning | Notes |
|------|---------|-------|
| `[ ]` | todo | Initial state for planned items |
| `[~]` | partial | In-progress work |
| `[x]` | done | Completed and delivered |
| `Verified: ...` | optional host smoke | **Never auto-written by sync**; human / host verification only |

## Evidence Rule E1

Mark `[x]` or update spec `status` only when **both** conditions hold:

1. **Ship-success signal** (either is sufficient; merge is **not** required):
   - Local delivery commit recorded in `step-08-{slug}.result.md` / ship gate, **or**
   - `shipAction: create-pr` with PR URL captured.
2. **Mapping** to a known index row or `*.spec.md` slug.

If no mapping exists: return `updated: []` and `skipped: "No matching index row for slug"`. Do **not** edit files.

## Orchestrator Call Contract

```yaml
input:
  mode: sync | init | promote
  slug: string?                 # workflow slug when known
  shipEvidence:                 # sync only
    deliveryCommit: boolean?
    prUrl: string?
    resultPath: string?         # step-08-*.result.md when present
  specsDir: string?             # override; else config plans.specsDir
  indexFile: string?            # default index.PRD
  sourcePath: string?           # init: README/PRD/SPECS path or free text
  inboxItem: string?            # promote

output:
  updated: string[]             # paths or row ids touched
  skipped: string?              # reason when no-op
```

## Call Sites Wired in `workflow-skills`

1. `spec-to-pr` Step 8: Call `sync` after successful delivery commit and/or create-PR ship action.
2. `spec-to-pr-lite` Step 4: Call `sync` on ship path with delivery evidence.
3. `ws-ship-pr`: Call `sync` after successful ship action.

## Out of Scope (v1)

- Cursor session `stop` / after-agent hooks
- Deterministic Python/Node index rewrite scripts
- Coupling to Kanban board / `/board` data plane
- Auto-writing `Verified:`
