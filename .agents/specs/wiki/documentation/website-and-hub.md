# Website & Hub Docs (`documentation`)

> Provenance: `docs/index.html`, `bin/build-site.js`, `test/test-doc-sync.js`, root `AGENTS.md` § Harness change protocol, `.agents/skills/ws-shared/runtime/AGENTS.md`, living synthesis of specs 0057, 0066, 0075, 0077.

## Feature

The public engineering site under `docs/` is a zero-dependency static GitHub Pages presentation of the harness. It uses restrained typography, terminal-style tabs, an FSM visualizer, catalog search, and a drawer layout rather than marketing-heavy visuals. `bin/build-site.js` rebuilds the site deterministically and enforces a doc-sync protocol: every shipped skill or CLI change must appear consistently across the site, `README.md`, root and `ws-shared` `AGENTS.md`, and optional `FEATURES.md`. Consumer hub documentation (`ws-shared/AGENTS.md`, `CATALOG.md`, `setup.md`, `autoload.md`) carries an explicit consumer identity with no upstream authoring prose mixed in, enforced mechanically by denylist rules and a context-budget cap in harness audits. The published site also renders the living wiki: every build snapshots `{wikiDir}` markdown into browser-ready HTML under `docs/wiki/**` with a landing Wiki link and matching sitemap entries, while `{wikiDir}` markdown stays the authoring source of truth.

## How it works

The site revamp contract forbids neon glows, looping video, and floating badges. Dark-first theming plus an accessible light theme must maintain contrast at or above 4.5:1, support keyboard navigation, and produce zero console errors on load. Doc-sync headings, version stamps, and deterministic `--check` gates survive visual changes. Catalog-only documentation fixes may rebuild via `node bin/build-site.js` without a version bump; package content changes require a strictly higher `package.json` version per release PR before push.

Hub prose is classified as `consumer-portable`, `upstream-only`, or `shared-reference` in the layout manifest. Upstream-only sections relocate toward root `AGENTS.md`; `HUB_WHITELIST` behavior and the default `rules.harness` path (`{sharedDir}/AGENTS.md`) stay unchanged. When features, CLI options, workflows, or skills change, maintainers update the site, `README.md`, both hub `AGENTS.md` files, and `FEATURES.md` in the same effort, then pass `ws-check-harness` before ship.

Wiki HTML is build output, never a hand-edited second source: intra-wiki `.md` links (including `index.wiki.md` and anchors) rewrite to `.html` while external links stay intact, generated pages reuse the existing dark/light theme with escaped content that cannot inject script, and only paths resolving inside `{wikiDir}` are converted so state files and escaping paths are never copied. `node bin/build-site.js --check` fails when the wiki tree is missing or stale, in the same fail-closed pattern as the landing page.

## Backend

Site assets include `docs/index.html`, `docs/assets/css/style.css`, and injected catalog layers from `bin/build-site.js`. Verification runs through `test/test-doc-sync.js` and `test/test-site-wiki.js` plus npm scripts `build-site` / `build-site:bump`; generated wiki pages live under `docs/wiki/**` and are refreshed in the same build that stamps the catalog and `docs/sitemap.xml`. Hub documentation splits root `AGENTS.md` (upstream contract and task router) from `ws-shared/AGENTS.md` (consumer hub). `ws-shared/autoload.md` defines the Always-applied promotion set plus the specs progressive-disclosure router. Dual-hub drift rules are audited in `ws-check-harness` phases that compare root override wording against consumer defaults.
