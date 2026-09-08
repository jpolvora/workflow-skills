# Context — ws-shared Hybrid Consumer Layout

## Feature Boundary

This specification separates managed workflow runtime assets, setup templates, consumer-owned project configuration, and installer-generated state. It also defines how `ws-configure-project` chooses a runtime source and a consumer target when the executing skill is global or local.

The stable consumer data root remains `{sharedDir}` and `config.json` remains its required project configuration path. The change does not redesign plan/spec/review paths or introduce a second configuration overlay.

## Implementation Decisions

### Selected: physical `runtime/` and `templates/` subfolders plus a layout manifest

- Put files required to execute and validate workflow skills under `ws-shared/runtime/`.
- Put seed-only files under `ws-shared/templates/`.
- Keep project-specific configuration and human-maintained companions at the `ws-shared/` root.
- Use one manifest to classify paths and drive installer copy, migration, integrity, package, and source-control reporting.
- Derive runtime/template source from the selected installation scope rather than copying managed global content into a hybrid consumer project.

This option makes the boundary visible in the filesystem and gives scripts a deterministic classification source. It also preserves the most important public consumer path, `{sharedDir}/config.json`, so the migration is narrower than moving the entire hub.

### Rejected for this scope: manifest-only classification

A manifest without physical subfolders would reduce migration work, but it would leave managed runtime files and setup templates visually mixed. It would not answer the user's source-control question from the directory tree and would continue to invite accidental edits to setup-only assets.

### Rejected for this scope: copy the complete global hub locally

Copying all global runtime, templates, schemas, and scripts into every consumer would make a hybrid project appear self-contained, but it would duplicate managed package content, create version drift, and blur whether local or global files are authoritative. Only consumer-specific configuration and required generated pointers/autoload files belong in the local project.

### Required implementation guardrails

- Preserve local-over-global precedence and never resolve consumer data from a skill file's `__file__` path.
- Treat a global skills root as an execution source, not as an implicit consumer project.
- Keep the local configuration path stable and preserve existing consumer files byte-for-byte.
- Fail closed on ambiguous migration collisions or an incomplete layout manifest.
- Keep source-control reporting tokenized and portable; do not emit author-machine absolute paths in shipped guidance.

## Deferred Ideas

- A future installer manifest could pin the exact global package version used by a hybrid project without copying package content.
- A future command could generate a fully vendored project install for offline or hermetic builds; that is different from normal hybrid mode.
- Teams may later choose to source-control selected memory or changelog files, but this specification keeps generated local state ignored by default.
- A future `doctor` command could explain which global runtime source would be used before configuration changes are made.
