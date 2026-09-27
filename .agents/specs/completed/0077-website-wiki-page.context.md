# Feature Boundary

`0077-website-wiki-page` publishes this package’s `{wikiDir}` markdown as static HTML on GitHub Pages. It does not change `ws-wiki` authoring, sweep, or consumer installs.

In scope: `bin/build-site.js` wiki snapshot, `docs/wiki/**`, landing nav, sitemap, `--check` freshness, tests, FEATURES/README mention.

Out of scope: consumer site generation, SPA-only markdown, npm markdown libraries, wiki CMS.

# Implementation Decisions

1. **Page model.** Valid options: (a) one `docs/wiki.html` SPA that fetches markdown; (b) multi-page static `docs/wiki/**.html`; (c) iframe raw GitHub markdown. **Chosen: (b).** User asked for browser-ready pages with index, links, and subpages. (a) fails without JS and needs a fetch story on Pages. (c) is not a dedicated site page.

2. **Markdown engine.** Valid options: add `marked`; vendor a large library; small in-repo subset. **Chosen: small in-repo subset** covering headings, lists, links, fenced/inline code, emphasis, paragraphs. Matches zero-dependency Pages (0057) and wiki’s simple 3-section pages.

3. **Missing wiki source.** Valid options: fail the whole site build; emit a stub “wiki not initialized”; skip wiki emit. **Chosen: skip emit** when `{wikiDir}/index.wiki.md` is absent; `--check` only requires wiki HTML when that source exists. This repo always has a wiki.

4. **Nav placement.** Valid options: landing nav only; footer only; both nav and sitemap. **Chosen: landing nav Wiki link plus sitemap URLs** so humans and crawlers both find it.

# Deferred Ideas

- Full CommonMark / GFM tables/images if wiki pages grow those features.
- Client search box over wiki HTML (optional progressive enhancement).
- Copying generated wiki into `llms.txt` (keep `llms.txt` as the compact LLM surface unless a later spec says otherwise).
