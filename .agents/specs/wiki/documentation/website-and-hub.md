# Website & Hub Docs (`documentation`)

## Feature Overview

The public site (`docs/`, zero-dependency static GitHub Pages) presents the harness with a restrained engineering UI — dense typography, terminal tabs, FSM visualizer, catalog search, and drawer — rebuilt deterministically by `bin/build-site.js`, which also enforces doc-sync: every shipped skill change must be reflected across the site, `README.md`, root and `ws-shared` `AGENTS.md`, and `FEATURES.md`. The consumer hub docs (`ws-shared/AGENTS.md`, `CATALOG.md`, `setup.md`, `autoload.md`) carry an explicit consumer identity with no upstream authoring prose, enforced mechanically by denylist plus a context-budget cap.

## Business Rules & Logic

- **Restrained UI**: no neon glows, looping video, or floating badges; dark-first plus accessible light theme with contrast ≥ 4.5:1, keyboard navigation, and zero console errors.
- **Build contracts preserved**: all doc-sync headings, version stamps, and deterministic `--check` gates survive the revamp; catalog-only fixes rebuild without a version bump, package changes require a strictly-higher bump per release PR.
- **Hub split enforced**: managed hub sections are classified `consumer-portable` / `upstream-only` / `shared-reference`; upstream-only prose relocated root-ward; `HUB_WHITELIST` behavior and `rules.harness` default (`{sharedDir}/AGENTS.md`) unchanged.
- **Change protocol**: feature/CLI/skill changes update site + `README.md` + both `AGENTS.md` hubs + `FEATURES.md` in the same effort; `ws-check-harness` must pass before ship.

## Technical Architecture

- **Site**: `docs/index.html`, `docs/assets/css/style.css`, `bin/build-site.js` injection (layers/presets), `test/test-doc-sync.js`, `node bin/build-site.js` / `npm run build-site:bump`.
- **Hub docs**: root `AGENTS.md` (upstream contract + router) vs `ws-shared/AGENTS.md` (consumer hub); `ws-shared/autoload.md` Always-applied set + specs router; dual-hub drift rules in `ws-check-harness`.
- **Provenance**: living synthesis of specs 0057 and 0066 (plus 0075, documented at [Living Feature Wiki & Domain Knowledge Base](ws-wiki.md)).
