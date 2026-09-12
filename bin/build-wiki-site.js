#!/usr/bin/env node

/**
 * Build static HTML from the project wiki markdown tree.
 * Sync fs only; no network fetch; no npm markdown libraries.
 */

import fs from 'fs';
import path from 'path';

const SITE_BASE = 'https://jpolvora.github.io/workflow-skills';

function normalizeLf(text) {
  return text.replace(/\r\n?/g, '\n');
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isPathInside(parent, child) {
  const resolvedParent = path.resolve(parent);
  const resolvedChild = path.resolve(child);
  return resolvedChild === resolvedParent || resolvedChild.startsWith(resolvedParent + path.sep);
}

export function resolveWikiDir(repoRoot) {
  const configPath = path.join(repoRoot, '.agents', 'skills', 'ws-shared', 'config.json');
  let wikiRel = '.agents/specs/wiki';
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (typeof config.plans?.wikiDir === 'string' && config.plans.wikiDir.trim()) {
        wikiRel = config.plans.wikiDir.trim();
      }
    } catch {
      // fall through to default
    }
  }
  const resolved = path.resolve(repoRoot, wikiRel);
  if (!isPathInside(repoRoot, resolved)) {
    throw new Error(`wikiDir escapes repo root: ${wikiRel}`);
  }
  return resolved;
}

function collectWikiPages(wikiDir) {
  const pages = [];
  const indexPath = path.join(wikiDir, 'index.wiki.md');
  if (!fs.existsSync(indexPath)) {
    return pages;
  }
  if (!isPathInside(wikiDir, indexPath)) {
    return pages;
  }
  pages.push({ sourcePath: indexPath, relKey: 'index.wiki.md', outRel: 'index.html', depth: 1 });

  let domainEntries = [];
  try {
    domainEntries = fs.readdirSync(wikiDir, { withFileTypes: true });
  } catch {
    return pages;
  }

  for (const entry of domainEntries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    const domainDir = path.join(wikiDir, entry.name);
    if (!isPathInside(wikiDir, domainDir)) continue;

    let files = [];
    try {
      files = fs.readdirSync(domainDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.isFile()) continue;
      if (!file.name.endsWith('.md')) continue;
      if (file.name === 'sweep.state.json') continue;
      const sourcePath = path.join(domainDir, file.name);
      if (!isPathInside(wikiDir, sourcePath)) continue;
      const relKey = path.posix.join(entry.name, file.name);
      const outRel = path.posix.join(entry.name, file.name.replace(/\.md$/, '.html'));
      pages.push({ sourcePath, relKey, outRel, depth: 2 });
    }
  }

  return pages;
}

function rewriteLink(href, sourceRelKey, wikiDir) {
  const trimmed = href.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return trimmed;
  }
  if (/^(javascript|data):/i.test(trimmed)) {
    return null;
  }
  if (trimmed.startsWith('#')) {
    return trimmed;
  }

  const hashIdx = trimmed.indexOf('#');
  const pathPart = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed;
  const fragment = hashIdx >= 0 ? trimmed.slice(hashIdx) : '';

  if (!pathPart) {
    return fragment || null;
  }

  let targetMd = pathPart;
  const isRootIndexWiki = /^(?:\.\/)?index\.wiki\.md$/i.test(pathPart);
  if (targetMd.endsWith('index.wiki.md')) {
    targetMd = targetMd.replace(/index\.wiki\.md$/, 'index.html');
  } else if (/\.md$/i.test(targetMd)) {
    targetMd = targetMd.replace(/\.md$/i, '.html');
  } else if (!/\.html$/i.test(targetMd)) {
    return null;
  }

  const sourceDir = sourceRelKey.includes('/')
    ? path.posix.dirname(sourceRelKey)
    : '';
  const joinDir = isRootIndexWiki ? '' : sourceDir;
  const targetRootRel = path.posix.normalize(path.posix.join(joinDir || '.', targetMd));
  if (targetRootRel === '..' || targetRootRel.startsWith('../')) {
    return null;
  }

  const resolvedSource = path.resolve(wikiDir, sourceRelKey.replace(/\//g, path.sep));
  const resolvedTarget = isRootIndexWiki
    ? path.resolve(wikiDir, 'index.html')
    : path.resolve(path.dirname(resolvedSource), targetMd.replace(/\//g, path.sep));
  if (!isPathInside(wikiDir, resolvedTarget)) {
    return null;
  }

  const sourceOutRel = sourceRelKey
    .replace(/index\.wiki\.md$/i, 'index.html')
    .replace(/\.md$/i, '.html');
  const rel = path.posix.relative(path.posix.dirname(sourceOutRel), targetRootRel);
  return (rel || path.posix.basename(targetRootRel)) + fragment;
}

function renderInline(text, sourceRelKey, wikiDir) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const linkMatch = text.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const label = escapeHtml(linkMatch[1]);
      const rewritten = rewriteLink(linkMatch[2], sourceRelKey, wikiDir);
      if (rewritten) {
        out += `<a href="${escapeHtml(rewritten)}">${label}</a>`;
      } else {
        out += escapeHtml(linkMatch[0]);
      }
      i += linkMatch[0].length;
      continue;
    }

    const codeMatch = text.slice(i).match(/^`([^`]+)`/);
    if (codeMatch) {
      out += `<code>${escapeHtml(codeMatch[1])}</code>`;
      i += codeMatch[0].length;
      continue;
    }

    const strongMatch = text.slice(i).match(/^(\*\*|__)(.+?)\1/);
    if (strongMatch) {
      out += `<strong>${escapeHtml(strongMatch[2])}</strong>`;
      i += strongMatch[0].length;
      continue;
    }

    const emMatch = text.slice(i).match(/^(\*|_)([^*_]+)\1/);
    if (emMatch) {
      out += `<em>${escapeHtml(emMatch[2])}</em>`;
      i += emMatch[0].length;
      continue;
    }

    const nextSpecial = text.slice(i).search(/[\[`*_]/);
    if (nextSpecial === -1) {
      out += escapeHtml(text.slice(i));
      break;
    }
    if (nextSpecial > 0) {
      out += escapeHtml(text.slice(i, i + nextSpecial));
      i += nextSpecial;
      continue;
    }
    out += escapeHtml(text[i]);
    i += 1;
  }
  return out;
}

function renderMarkdown(markdown, sourceRelKey, wikiDir) {
  const lines = normalizeLf(markdown).split('\n');
  const htmlParts = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const fenceLang = line.slice(3).trim();
      i += 1;
      const codeLines = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && /^```/.test(lines[i])) i += 1;
      const code = escapeHtml(codeLines.join('\n'));
      if (fenceLang) {
        htmlParts.push(`<pre><code class="language-${escapeHtml(fenceLang)}">${code}</code></pre>`);
      } else {
        htmlParts.push(`<pre><code>${code}</code></pre>`);
      }
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      htmlParts.push(`<h${level}>${renderInline(headingMatch[2], sourceRelKey, wikiDir)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^[-*]\s+/, ''), sourceRelKey, wikiDir)}</li>`);
        i += 1;
      }
      htmlParts.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\d+\.\s+/, ''), sourceRelKey, wikiDir)}</li>`);
        i += 1;
      }
      htmlParts.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^#{1,6}\s/.test(lines[i]) && !/^[-*]\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i]) && !/^```/.test(lines[i])) {
      paraLines.push(lines[i]);
      i += 1;
    }
    htmlParts.push(`<p>${renderInline(paraLines.join(' '), sourceRelKey, wikiDir)}</p>`);
  }

  return htmlParts.join('\n');
}

function extractTitle(markdown, fallback) {
  const match = normalizeLf(markdown).match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function buildDocument({ title, bodyHtml, depth }) {
  const cssHref = depth === 1 ? '../assets/css/style.css' : '../../assets/css/style.css';
  const homeHref = depth === 1 ? '../' : '../../';
  return normalizeLf(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${cssHref}">
</head>
<body class="wiki-page">
<nav class="wiki-chrome"><a href="${homeHref}">Home</a> · <a href="${depth === 1 ? 'index.html' : '../index.html'}">Wiki</a></nav>
<article class="wiki-article wiki-toc">${bodyHtml}</article>
</body>
</html>
`);
}

function listHtmlFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const walk = (current, relPrefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      const rel = relPrefix ? path.posix.join(relPrefix, entry.name) : entry.name;
      if (entry.isDirectory()) {
        walk(abs, rel);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        results.push(rel.replace(/\\/g, '/'));
      }
    }
  };
  walk(dir, '');
  return results.sort();
}

export function buildWikiSite({ repoRoot: _repoRoot, wikiDir, outDir, check = false }) {
  const staleReasons = [];
  const indexPath = path.join(wikiDir, 'index.wiki.md');

  if (!fs.existsSync(indexPath)) {
    return { skipped: true, pages: 0, sitemapLocs: [], staleReasons };
  }

  const pages = collectWikiPages(wikiDir);
  if (pages.length === 0) {
    return { skipped: true, pages: 0, sitemapLocs: [], staleReasons };
  }

  const generated = new Map();
  const sitemapLocs = [`${SITE_BASE}/wiki/`];

  for (const page of pages) {
    const markdown = fs.readFileSync(page.sourcePath, 'utf8');
    const title = extractTitle(markdown, path.basename(page.relKey, '.md'));
    const bodyHtml = renderMarkdown(markdown, page.relKey, wikiDir);
    const html = buildDocument({ title, bodyHtml, depth: page.depth });
    generated.set(page.outRel, html);

    if (page.outRel !== 'index.html') {
      sitemapLocs.push(`${SITE_BASE}/wiki/${page.outRel}`);
    }
  }

  const expectedFiles = [...generated.keys()].sort();
  const existingFiles = listHtmlFiles(outDir);

  if (check) {
    for (const rel of expectedFiles) {
      const target = path.join(outDir, rel);
      if (!fs.existsSync(target)) {
        staleReasons.push(`docs/wiki missing ${rel}`);
        continue;
      }
      const onDisk = normalizeLf(fs.readFileSync(target, 'utf8'));
      const expected = generated.get(rel);
      if (onDisk !== expected) {
        staleReasons.push(`docs/wiki stale ${rel}`);
      }
    }
    for (const extra of existingFiles) {
      if (!expectedFiles.includes(extra)) {
        staleReasons.push(`docs/wiki extra ${extra}`);
      }
    }
    return { skipped: false, pages: expectedFiles.length, sitemapLocs, staleReasons };
  }

  fs.mkdirSync(outDir, { recursive: true });
  for (const [rel, html] of generated.entries()) {
    const target = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html, 'utf8');
  }

  for (const extra of existingFiles) {
    if (!expectedFiles.includes(extra)) {
      fs.unlinkSync(path.join(outDir, extra));
    }
  }

  return { skipped: false, pages: expectedFiles.length, sitemapLocs, staleReasons };
}

export function buildSitemapXml(sitemapLocs) {
  const fixed = [
    `${SITE_BASE}/`,
    `${SITE_BASE}/llms.txt`,
    'https://github.com/jpolvora/workflow-skills',
  ];
  const locs = [...fixed];
  for (const loc of sitemapLocs) {
    if (!locs.includes(loc)) locs.push(loc);
  }

  const body = locs
    .map((loc) => `  <url>\n    <loc>${escapeHtml(loc)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${loc.endsWith('/wiki/') ? '0.9' : loc.includes('/wiki/') ? '0.7' : '0.8'}</priority>\n  </url>`)
    .join('\n');

  return normalizeLf(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
}
