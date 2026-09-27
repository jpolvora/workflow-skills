---
step: 2
slug: simplify-skill-versioning
workflowId: simplify-skill-versioning-20260927T015020Z
status: completed
shared_understanding: confirmed
startedAt: "2026-09-27T01:50:20.000Z"
endedAt: "2026-09-27T01:54:32.610Z"
acRefs: []
---
# Plan interview — simplify-skill-versioning

## Interview registry

| id | class | section | gap | recommendation | resolution | resolutionSource | status |
|----|-------|---------|-----|----------------|------------|------------------|--------|
| G1 | blocking | §2.3 | Exact digest serialization for version binding not fixed | Prefix canonical semver before sorted file hash lines in `digestFromFilesMap` input string | Use `packageVersion\n` + semver + existing sorted `path:digest` lines (document in lib comment); golden test in `test-skill-integrity` | project | closed |
| G2 | blocking | §3 | One-shot strip of `version:` from all SoT SKILL.md | Same PR mechanical removal via script or codemod; no gradual migration | Spec Notes + AC3 require no per-skill frontmatter version; strip in implementation step 4 | project | closed |
| G3 | non-blocking | §2.5 | Fate of `skill-frontmatter.js` | Keep module only if non-version callers remain after bump change | Grep callers post-edit; delete module if only version rewrite remains | assumed-default | closed |
| G4 | non-blocking | §2.4 | `version.json` hub-layout entry shape | Add explicit managed path under `ws-shared` hub root in `hub-layout.json` categories | Matches AC9 + spec Notes (hub-layout-driven enumeration) | project | closed |
| G5 | blocking | §6 | NS1–NS3 negative tests before implement | Name fixtures in §5 before Step 4 | §5 table + dedicated integrity unit cases listed in refined plan | project | closed |

## Sweep evidence

- `bin/build-site.js` imports `rewriteSkillMarkdown` — removal target confirmed (AC3).
- `bin/skill-integrity-lib.js` `buildUpstreamManifest(packageRoot, packageVersion)` takes version param from `package.json` today — retarget to `version.json` reader.
- `bin/cli.js` `getLocalVersion()` reads `package.json` — sync with canonical reader + projection check.
- `hub-layout.json` has no `version.json` yet — G4 addition required.

## Escalation

0 user rounds (all gaps closed via project-context sweep + spec defaults).
