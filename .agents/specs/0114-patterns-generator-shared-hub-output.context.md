# Context — patterns-generator-shared-hub-output (merged #382 + hub output)

Companion to `0114-patterns-generator-shared-hub-output.spec.md`. Records the fit analysis issue #382 asked for (how `ws-self-learning`, `ws-patterns-generator`, the generated `ws-project-patterns`, and neighboring skills should integrate) and the design decisions for hosting the generated body under `{sharedDir}`. Supersedes the companion of the retired `0111-us-382.spec.md`.

## Feature Boundary

The integration owns: overlap analysis across memory, harvest, changelog, seeding, and hygiene paths; a draft plan with file list, mechanism, targets, and rollback; approved shared-helper extraction and duplication removal; measured performance work; and explicitly approved collaborative features with tests and docs.

The hub-output half owns: the generated body location (`{sharedDir}/ws-project-patterns/SKILL.md`), seed containment, the Always-applied row path and lifecycle, hub-layout classification, the hub ignore template, installer exclusion for the generated id, and the tests plus docs that name the generated path.

It does not own: MEMORY or vault trap write paths outside `ws-self-learning` via `update-memory`; the external spec-memo vault protocol; managed skill bodies outside the approved plan list; scheduling daemons; git commit and push; cross-project sharing; embeddings dedup.

## Implementation Decisions

### Integration (from the retired 0111 companion)

- **Option A, recommended: collaborate, keep skills separate.** `ws-self-learning` keeps MEMORY and trap ownership; `ws-patterns-generator` keeps harvest plus generated-body ownership; shared harvest readers or helpers move under `{skillsRoot}/ws-shared/runtime/scripts/` or the owning skill `scripts/` dir. The generated `ws-project-patterns` stays consumer-owned, installer-excluded, and autoloaded. Other skills collaborate through existing tools (`update-memory`, changelog append, configure seeding, secrets review) instead of merging.
- **Option B, rejected: full merge into one memory-plus-patterns skill.** Traps are anti-regression records with severity and frontmatter; steering prose is generative guidance with evidence pointers. Merging conflates two contracts, breaks autoload granularity, and complicates installer exclusion for generated content.
- **Option C, rejected: extend `ws-self-learning` with a skill-body projection.** Same rejection as `0110-us-378.context.md` Option B: projection conflates memory writes with steering prose and gives the generator MEMORY write paths it must not have.
- **Option D, rejected: revive retired `ws-patterns-backend` or `ws-patterns-frontend` with integration mode.** Those ids are absent from the current tree and model interactive per-correction capture, not cross-cutting harvest. Reuse their consumer-owned storage plus autoload conventions in current-layout form, not their shape.
- **Option E, rejected for now: merge `ws-changelog`, `ws-spec-memo`, `ws-configure-project`, or `ws-secrets-leak-review` into the patterns track.** Each owns a distinct contract (history, vault bridge, seeding, hygiene). Integration is protocol reuse plus shared helpers, not ownership transfer.
- **Harvest sharing:** readers over `{plansDir}` state plus telemetry plus logs, changelog, MEMORY, README plus AGENTS.md, `rules.*`, wiki, and stack file are shared by reference; missing sources are tolerated and named, never fatal.
- **Performance method:** measure before and after (`npm run test` wall time, touched script runtime, body byte size); land only non-regressed or justified changes.
- **Feature gating:** behavioral collaborative features ship behind explicit config flags with tests and docs; analysis-only findings ship as companion updates with no code.

### Hub-hosted generated body

- **Path:** `{sharedDir}/ws-project-patterns/SKILL.md` (hub root from `pathTokens.sharedDir`, default `.ws`). Rejected: keeping it under `{skillsRoot}` (mixes consumer content into the published tree; integrity manifests it) and a `{sharedDir}/skills/` sub-root (no second skills root needed for one autoload-only body).
- **Source control:** tracked. Harvested patterns are project knowledge reviewed in PRs; the hub template keeps `config.json` / `STACK.md` tracked while ignoring generated memory, so the body joins the tracked set as consumer-owned content.
- **Loading:** Always-applied row only. The body lives outside every skills root, so skills-root discovery is not a loader; the autoload row in `{sharedDir}/autoload.md` is.
- **Existence check:** `generatorManagedTreeExists` becomes hub-relative for generated ids; the global-skills fallback is dropped because the body is project-local by definition.
- **Legacy:** no migration. An existing `{skillsRoot}/ws-project-patterns` copy is already ignored by the installer; consumers delete it manually.
- **Containment:** the resolved-target rule from PR #383 stays: resolve the entire target path (root link, directory link, dangling leaf) and fail closed when resolution is impossible.

## Overlap Matrix (to be completed by the analysis run)

| Pair | Overlap | Recommendation |
|------|---------|----------------|
| `ws-self-learning` ↔ `ws-patterns-generator` | Shared harvest sources; memory versus steering contracts | Collaborate (Option A) |
| generated `ws-project-patterns` ↔ `ws-self-learning` | Evidence pointers versus traps | Keep separate; no MEMORY writes from the generator |
| `ws-self-learning` ↔ `ws-changelog` | Both record history; different granularity | Keep separate; protocol reuse |
| `ws-self-learning` ↔ `ws-spec-memo` | Memory backends and vault bridge | Keep separate; bridge-only |
| `ws-patterns-generator` ↔ `ws-configure-project` | Seeding and autoload row | Collaborate on row lifecycle |
| patterns track ↔ `ws-secrets-leak-review` | Hygiene gate over generated prose | Keep separate; reuse the gate |

## Performance Baselines (to be filled by the measured run)

| Signal | Baseline | After | Delta |
|--------|----------|-------|-------|
| `npm run test` wall time | pending | pending | pending |
| `seed_generated_skill.cjs` runtime | pending | pending | pending |
| Generated body bytes | pending | pending | pending |

## Deferred Ideas

- Host-scheduled recurring harvest with run-history retention.
- Automated overlap scoring across skill bodies.
- Embeddings-based dedup across traps and pattern bullets.
- Cross-project pattern sharing protocol.
- Deep MCP introspection beyond configured names and notes.
- Automatic commit of approved integration diffs.
