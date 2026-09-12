/**
 * Wiki site builder tests — temp wikiDir/outDir only; never mutates tracked wiki.
 * Run: node test/test-site-wiki.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';
import {
  buildWikiSite,
  buildSitemapXml,
} from '../bin/build-wiki-site.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BUILD_SITE = path.join(REPO_ROOT, 'bin/build-site.js');
const WIKI_BUILDER_SRC = fs.readFileSync(path.join(REPO_ROOT, 'bin/build-wiki-site.js'), 'utf8');
const STYLE_CSS = fs.readFileSync(path.join(REPO_ROOT, 'docs/assets/css/style.css'), 'utf8');

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`✅ ${msg}`);
  } else {
    console.error(`❌ ${msg}`);
    failures += 1;
  }
}

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function seedWiki(wikiDir) {
  write(
    path.join(wikiDir, 'index.wiki.md'),
    `# Wiki Home

## Domain: harness

- [Sample Feature](harness/sample.md): A sample page.
`,
  );
  write(
    path.join(wikiDir, 'harness', 'sample.md'),
    `# Sample Feature

## Feature Overview
Overview text.

## Business Rules & Logic
- Rule one

## Technical Architecture
Uses \`code\` and [home](index.wiki.md).
`,
  );
}

function testEmitsIndexAndFeatureHtml() {
  const wikiDir = tempDir('wiki-emit-');
  const outDir = tempDir('wiki-out-');
  seedWiki(wikiDir);
  const result = buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: false });
  assert(result.skipped === false, 'wiki build not skipped');
  assert(result.pages === 2, 'two pages emitted');
  assert(fs.existsSync(path.join(outDir, 'index.html')), 'index.html written');
  assert(fs.existsSync(path.join(outDir, 'harness/sample.html')), 'feature html written');
}

function testHtml5ChromeAndStylesheetDepth() {
  const wikiDir = tempDir('wiki-chrome-');
  const outDir = tempDir('wiki-chrome-out-');
  seedWiki(wikiDir);
  buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: false });
  const home = read(path.join(outDir, 'index.html'));
  const feature = read(path.join(outDir, 'harness/sample.html'));
  assert(/<!DOCTYPE html>/i.test(home), 'home has doctype');
  assert(home.includes('charset="utf-8"'), 'home has charset');
  assert(home.includes('name="viewport"'), 'home has viewport');
  assert(home.includes('<title>Wiki Home</title>'), 'home title from h1');
  assert(home.includes('href="../assets/css/style.css"'), 'home css depth');
  assert(feature.includes('href="../../assets/css/style.css"'), 'feature css depth');
}

function testRewritesWikiMarkdownLinks() {
  const wikiDir = tempDir('wiki-links-');
  const outDir = tempDir('wiki-links-out-');
  write(
    path.join(wikiDir, 'index.wiki.md'),
    `# Links

- [feature](harness/target.md#anchor)
- [external](https://example.com)
- [mail](mailto:a@b.com)
- [hash](#section)
`,
  );
  write(
    path.join(wikiDir, 'harness', 'target.md'),
    `# Target

## Feature Overview
x

## Business Rules & Logic
x

## Technical Architecture
x
`,
  );
  buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: false });
  const home = read(path.join(outDir, 'index.html'));
  assert(home.includes('href="harness/target.html#anchor"'), 'md link rewritten to html');
  assert(home.includes('href="https://example.com"'), 'https unchanged');
  assert(home.includes('href="mailto:a@b.com"'), 'mailto unchanged');
  assert(home.includes('href="#section"'), 'hash anchor kept');
}

function testLandingNavWikiHref() {
  const site = read(path.join(REPO_ROOT, 'docs/index.html'));
  assert(site.includes('href="wiki/"'), 'landing nav includes wiki href');
  const navLinks = site.match(/<div class="nav-links">[\s\S]*?<\/div>/);
  assert(navLinks && navLinks[0].includes('href="wiki/"'), 'nav-links has wiki href');
  const dotNav = site.match(/<aside class="dot-nav"[\s\S]*?<\/aside>/);
  assert(dotNav && dotNav[0].includes('href="wiki/"'), 'dot-nav has wiki href');
}

function testWikiChromeLinkHome() {
  const wikiDir = tempDir('wiki-home-link-');
  const outDir = tempDir('wiki-home-link-out-');
  seedWiki(wikiDir);
  buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: false });
  const home = read(path.join(outDir, 'index.html'));
  const feature = read(path.join(outDir, 'harness/sample.html'));
  assert(home.includes('href="../"'), 'home page links to landing');
  assert(feature.includes('href="../../"'), 'feature page links to landing');
}

function testEscapesScriptPayload() {
  const wikiDir = tempDir('wiki-xss-');
  const outDir = tempDir('wiki-xss-out-');
  write(
    path.join(wikiDir, 'index.wiki.md'),
    `# Safe

<script>alert(1)</script>

[javascript link](javascript:alert(1))
`,
  );
  buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: false });
  const html = read(path.join(outDir, 'index.html'));
  assert(!/<script>alert\(1\)<\/script>/.test(html), 'script tag not live');
  assert(!/href="javascript:/.test(html), 'javascript href not live');
  assert(html.includes('&lt;script&gt;'), 'script payload escaped');
}

function testPathContainment() {
  const wikiDir = tempDir('wiki-contain-');
  const outDir = tempDir('wiki-contain-out-');
  seedWiki(wikiDir);
  write(
    path.join(wikiDir, 'harness', 'escape.md'),
    `# Escape

## Feature Overview
[bad](../../package.json)

## Business Rules & Logic
x

## Technical Architecture
x
`,
  );
  buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: false });
  assert(!fs.existsSync(path.join(outDir, 'package.json')), 'package.json not copied');
  const escapeHtml = read(path.join(outDir, 'harness/escape.html'));
  assert(!escapeHtml.includes('href="../../package.json"'), 'traversal href dropped');
}

function testCheckFailsOnStaleWikiHtml() {
  const wikiDir = tempDir('wiki-stale-');
  const outDir = tempDir('wiki-stale-out-');
  seedWiki(wikiDir);
  buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: false });
  write(path.join(wikiDir, 'index.wiki.md'), '# Changed\n\nBody.');
  const result = buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: true });
  assert(result.staleReasons.length > 0, 'stale reasons present');
  assert(result.staleReasons.some((r) => r.includes('docs/wiki')), 'stale reason names docs/wiki');
}

function testCheckPassesWhenFresh() {
  const wikiDir = tempDir('wiki-fresh-');
  const outDir = tempDir('wiki-fresh-out-');
  seedWiki(wikiDir);
  buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: false });
  const result = buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: true });
  assert(result.staleReasons.length === 0, 'fresh wiki passes check');
}

function testSitemapListsWikiLocs() {
  const wikiDir = tempDir('wiki-sitemap-');
  const outDir = tempDir('wiki-sitemap-out-');
  seedWiki(wikiDir);
  const result = buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: false });
  assert(result.sitemapLocs.includes('https://jpolvora.github.io/workflow-skills/wiki/'), 'directory loc present');
  assert(result.sitemapLocs.includes('https://jpolvora.github.io/workflow-skills/wiki/harness/sample.html'), 'feature loc present');
  assert(!result.sitemapLocs.includes('https://jpolvora.github.io/workflow-skills/wiki/index.html'), 'index loc not duplicated');
  const xml = buildSitemapXml(result.sitemapLocs);
  assert(xml.includes('/workflow-skills/wiki/'), 'sitemap xml has wiki directory');
}

function testRendersHeadingsListsCodeLinks() {
  const wikiDir = tempDir('wiki-render-');
  const outDir = tempDir('wiki-render-out-');
  write(
    path.join(wikiDir, 'index.wiki.md'),
    `# Render Test

## Section

- item one
- item two

\`\`\`js
const x = 1;
\`\`\`

See \`inline\` and [page](harness/sample.md).
`,
  );
  write(
    path.join(wikiDir, 'harness', 'sample.md'),
    `# Sample

## Feature Overview
x

## Business Rules & Logic
x

## Technical Architecture
x
`,
  );
  buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: false });
  const html = read(path.join(outDir, 'index.html'));
  assert(html.includes('<h1>'), 'heading rendered');
  assert(html.includes('<ul>'), 'list rendered');
  assert(html.includes('<pre><code'), 'fence rendered');
  assert(html.includes('<code>inline</code>'), 'inline code rendered');
  assert(html.includes('href="harness/sample.html"'), 'catalog link rendered');
}

function testWikiCssUsesThemeTokens() {
  assert(STYLE_CSS.includes('.wiki-page'), 'wiki-page class exists');
  assert(STYLE_CSS.includes('.wiki-article'), 'wiki-article class exists');
  assert(STYLE_CSS.includes('.wiki-toc'), 'wiki-toc class exists');
  assert(/\.wiki-(page|article|toc)[\s\S]*var\(--text-main\)/.test(STYLE_CSS), 'wiki uses text token');
  assert(!/wiki-.*glow|neon/i.test(STYLE_CSS), 'no neon wiki chrome');
}

function testContentPresentWithoutJs() {
  const wikiDir = tempDir('wiki-static-');
  const outDir = tempDir('wiki-static-out-');
  seedWiki(wikiDir);
  buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: false });
  const html = read(path.join(outDir, 'index.html'));
  assert(html.includes('Wiki Home'), 'heading text in static html');
  assert(!html.includes('fetch('), 'no client fetch renderer');
}

function testUnknownFlagsStillUsage() {
  const wikiDir = tempDir('wiki-flag-');
  const outDir = tempDir('wiki-flag-out-');
  seedWiki(wikiDir);
  buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: false });
  const before = read(path.join(outDir, 'index.html'));
  const res = cp.spawnSync(process.execPath, [BUILD_SITE, '--wiki-only-typo'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert(res.status === 1, 'unknown flag exits 1');
  assert(/Usage:/i.test(res.stderr), 'stderr shows usage');
  const after = read(path.join(outDir, 'index.html'));
  assert(before === after, 'temp wiki outDir unchanged by unknown flag');
}

function testSkipWhenIndexWikiMissing() {
  const wikiDir = tempDir('wiki-skip-');
  const outDir = tempDir('wiki-skip-out-');
  write(path.join(wikiDir, 'harness', 'orphan.md'), '# Orphan');
  const result = buildWikiSite({ repoRoot: REPO_ROOT, wikiDir, outDir, check: true });
  assert(result.skipped === true, 'missing index skips');
  assert(result.staleReasons.length === 0, 'check does not require outDir when skipped');
}

function testNoNetworkInWikiBuilder() {
  assert(!/fetch\s*\(/.test(WIKI_BUILDER_SRC), 'no fetch in wiki builder');
  assert(!/https\.request/.test(WIKI_BUILDER_SRC), 'no https.request in wiki builder');
}

function testWikiBuilderIsSync() {
  assert(!/\basync\b/.test(WIKI_BUILDER_SRC), 'builder module not async');
  assert(!/\.then\s*\(/.test(WIKI_BUILDER_SRC), 'builder avoids floating then');
}

function testDocsMentionPublishedWiki() {
  const features = read(path.join(REPO_ROOT, 'FEATURES.md'));
  const readme = read(path.join(REPO_ROOT, 'README.md'));
  assert(/Wiki/i.test(features) && /wiki/i.test(features), 'FEATURES mentions wiki');
  assert(/Wiki/i.test(readme) && /wiki/i.test(readme), 'README mentions wiki');
  assert(/\.agents\/specs\/wiki|project wiki dir/i.test(features + readme), 'docs mention wiki source dir');
}

const tests = [
  testEmitsIndexAndFeatureHtml,
  testHtml5ChromeAndStylesheetDepth,
  testRewritesWikiMarkdownLinks,
  testLandingNavWikiHref,
  testWikiChromeLinkHome,
  testEscapesScriptPayload,
  testPathContainment,
  testCheckFailsOnStaleWikiHtml,
  testCheckPassesWhenFresh,
  testSitemapListsWikiLocs,
  testRendersHeadingsListsCodeLinks,
  testWikiCssUsesThemeTokens,
  testContentPresentWithoutJs,
  testUnknownFlagsStillUsage,
  testSkipWhenIndexWikiMissing,
  testNoNetworkInWikiBuilder,
  testWikiBuilderIsSync,
  testDocsMentionPublishedWiki,
];

for (const fn of tests) fn();

if (failures > 0) {
  console.error(`test-site-wiki: ${failures} failure(s)`);
  process.exit(1);
}
console.log('test-site-wiki: ok');
