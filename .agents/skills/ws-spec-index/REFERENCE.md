# ws-spec-index Reference

Reference details, evidence rules, path tokens, and call contracts for `ws-spec-index`.

## Path Tokens

| Token | Default | Source |
|-------|---------|--------|
| `{specsDir}` | `.agents/specs/` | `config.json` → `plans.specsDir` |
| `{plansDir}` | `.agents/plans/` | `config.json` → `plans.dir` |

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

## Status-Subfolder Completion Transition

When E1 is satisfied **and** `config.json` → `plans.statusSubfolders` is explicit `true`, `sync` additionally files the spec of record into `completed/`:

```bash
node {skillsRoot}/ws-spec-index/scripts/sync_index.cjs --specs-dir {specsDir} --slug {slug} --delivery-commit <sha>
```

The deterministic helper (`sync_index.cjs`) updates the index status and delegates filing to `organize_specs.cjs --slug {slug} --status completed --apply`, which moves the `*.spec.md` plus companion `*.context.md` and `*.assets/` sidecars and rewrites `index.PRD` `spec:` references to the subfolder-relative path in the same apply; it fails closed when filing cannot complete. When `plans.statusSubfolders` is omitted or `false`, specs stay in place (flat boards are never restructured by `sync`). Record the move in `updated[]` (e.g. `moved: pending/{file} → completed/{file}`); if the helper reports no renames (already filed), proceed with the checkbox/Done-log update only.

`sync_index.cjs` output (JSON): `{ status: synced|outstanding|skipped|error, slug, updated[], moved[], filingOutstanding, stalePendingPath?, reason? }`. `status: outstanding` (non-zero exit) means the filing did not happen — surface it, never treat it as success.

**Close verification:** `verify_close_filing.cjs --specs-dir {specsDir} --slug {slug}` exits non-zero when the index marks the slug completed but the spec still resolves under `pending/`, naming the stale path. Wire it into the Step 8 close phase (fail closed) and mirror it with the harness gate `ws-check-harness/scripts/check_spec_filing.cjs`.

## Minimum Index Contract & Accepted Dialects

Consumer repositories may evolve their `index.PRD` layout. `ws-spec-index` operations must respect living documents and accept common Markdown table/list variations:

| Area | Accepted Dialects / Variations | Machine Match Strategy |
|------|--------------------------------|------------------------|
| **Next specs table** | Template: `# \| Spec \| Status \| Target Phase \| Notes`<br/>Live: `# \| Status \| Spec file \| Scope` (or any table with Status + Spec/file) | Locate backtick `*.spec.md` or slug in table row; update status column cell (`[ ]` → `[x]`). |
| **Done log table** | Template: `Date \| Slug \| Title \| PR / Commit`<br/>Live: `When \| Item \| Notes` (or Date/When + Item/Slug) | Append completed row using available column layout. |
| **Archive table** | Template: `Slug \| Outcome \| Last state \| PR / Commit \| Summary` under `## Archive` or `## N. Delivery archive` | Owned by `ws-spec-archive`. `sync` must preserve existing Archive rows; do not delete the section. |
| **Feature map** | Bullet lists `- [ ] Feature (\`spec: ...\`)` or nested bullets with separate `- **spec:** \`...\`` | Match backtick `*.spec.md` or slug; update checkbox `[ ]` → `[x]`. |
| **Dual-path specs** | Normal after any run starts: `{specsDir}/{slug}.spec.md` or `{specsDir}/NNNN-{slug}.spec.md` (spec of record) plus `{plansDir}/{slug}/step-00-*.spec.md` (workflow copy) | Spec-of-record path is primary for index status updates. |
| **`init` Guard** | Non-empty `{specsDir}/index.PRD` exists | Refuse to overwrite without explicit `--force` flag. Return `skipped: "index.PRD already exists"`. |
| **Spec Frontmatter** | Frontmatter may have `status: draft|completed` or no `status` field | Index row + disk slug mapping is primary; spec frontmatter update is optional. |

## Orchestrator Call Contract

```yaml
input:
  mode: sync | init | promote | track
  slug: string?                 # workflow slug when known; required for track
  shipEvidence:                 # sync only
    deliveryCommit: boolean?
    prUrl: string?
    resultPath: string?         # step-08-*.result.md when present
  specsDir: string?             # override; else config plans.specsDir
  indexFile: string?            # default index.PRD
  sourcePath: string?           # init: README/PRD/SPECS path or free text
  inboxItem: string?            # promote
  # track: slug required; spec file `{specsDir}/{slug}.spec.md` or `{specsDir}/NNNN-{slug}.spec.md` must exist

output:
  updated: string[]             # paths or row ids touched
  skipped: string?              # reason when no-op
```

## Call Sites Wired in `workflow-skills`

1. `ws-spec-to-pr` Step 8: Call `sync` after successful delivery commit and/or create-PR ship action.
2. `ws-spec-to-pr-lite` Step 4: Call `sync` on ship path with delivery evidence.
3. `ws-ship-pr`: Call `sync` after successful ship action.
4. `ws-spec-write` standalone (auto-track, no gate): Call `track` with `{slug}` when `tracking.autoTrackSpecWrite` is not explicit `false` and the index exists. Skip when orch Step 0 invoked write-spec.

## Out of Scope (v1)

- IDE/agent session stop / after-agent hooks
- Deterministic Python/Node index rewrite scripts
- Coupling to Kanban board / `/board` data plane
- Auto-writing `Verified:`
