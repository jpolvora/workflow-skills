---
slug: us-436
title: Plan interview — documentation emphasis for four shipped clusters
status: completed
step: 2
workflowId: us-436-20260927T190308Z
acRefs: []
startedAt: "2026-09-27T19:03:08Z"
endedAt: "2026-09-27T19:06:52.879Z"
---
# Plan Interview — us-436

Audit of `step-01-us-436.plan.md` against the spec DoR, validation/observation notes, and negative scenarios.

## 1. Gap registry

| # | Gap | Resolution |
|---|-----|------------|
| G1 | Site surface could be hand-edited and lost on rebuild (NS1). | Resolved: cards live in the `bin/build-site.js` `efficiencyFeatureBlock` template inside the `<!-- efficiency-verifiability:start/end -->` marker block; a rebuild reproduces them. |
| G2 | Wiki links could point at renameable anchors (NS2). | Resolved: site cards link page-level (`wiki/<domain>/<page>.html`), not `#anchor`; `validate_wiki.cjs` validates. |
| G3 | A named key/skill could not ship (NS3). | Resolved: every key/id cross-checked against `.agents/skills/ws-shared/templates/config.json.example` and `bin/skill-dependencies.json`. |
| G4 | `FEATURES.md` could lag the site (NS4). | Resolved: add a named proof-of-work row; the other three clusters already appear. |
| G5 | Edited wiki page could lose required headings (NS5). | Resolved: edits are inside existing `## How it works` / `## Backend`; `## Feature` / `## How it works` preserved on all three pages. |
| G6 | Version could equal the merge-base (NS6). | Resolved: one patch bump `0.5.6` → `0.5.7` strictly above base. |

## 2. Resolved decisions (assumed-default, autoMode)

| Open question | Decision | Rationale |
|---------------|----------|-----------|
| New wiki page for `ws-spec-multi`? | Reuse `delivery/spec-to-pr-pipeline.md` | Already documents the batch behavior; avoids fragmentation (spec Notes). |
| Anchor vs page link in site cards? | Page-level links | Keeps `validate_wiki.cjs` green; avoids renameable-anchor breakage (NS2). |
| `README.md` change? | No | Already names all four clusters; `FEATURES.md` only needs the proof-of-work row (AC9). |
| Version bump scope | One patch, release PR | Package content (generator + shipped wiki) changes. |

## 3. Touchpoints verified against code

- `bin/build-site.js` lines 356–427: marker block replace + `#features` grid insert — the deterministic insertion point.
- `bin/build-wiki-site.js` `resolveWikiDir`: wiki source resolves to `.agents/specs/wiki` (no `plans.wikiDir` override in `.ws/config.json`); output to `docs/wiki/`.
- `validate_wiki.cjs` supports `--wiki-dir` / `--json` and validates links + required headings.
- Proof-of-work switches exist in `resolve_proof_of_work.cjs` / `gates.md`; `ws-spec-multi`, `ws-spec-organizer`, `ws-cleanup`, `ws-spec-archive`, `ws-spec-translate-to-human` all exist under `.agents/skills/`.

## 4. Exit

No blocking gap. No `force_interview`. Refinement proceeds; refined plan written beside this artifact.
