#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  resolveConsumerContext,
  toRepoRelative,
} = require('../../ws-shared/runtime/scripts/resolve_consumer_root.cjs');

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token.startsWith('--')) {
      const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      options[key] = argv[++index];
    }
  }
  return options;
}

function isSafeSlug(value) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(String(value || ''));
}

function normalizeDomain(domain) {
  return String(domain || 'general').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}

function syncWikiIndex(options = {}) {
  const context = resolveConsumerContext({
    repoRoot: options.repoRoot,
    scriptFile: __filename,
  });

  const defaultWikiRel = context.config?.plans?.wikiDir || '.agents/specs/wiki';
  const wikiDir = path.resolve(
    context.repoRoot,
    options.wikiDir || defaultWikiRel,
  );

  const domain = normalizeDomain(options.domain || 'core');
  const feature = String(options.feature || options.slug || '').trim();
  if (!feature || !isSafeSlug(feature)) {
    throw new Error('invalid --feature slug (use [A-Za-z0-9._-]): ' + feature);
  }

  if (options.file) {
    const candidate = String(options.file).trim().replace(/\\/g, '/');
    const abs = path.resolve(wikiDir, candidate);
    const rel = path.relative(path.resolve(wikiDir), abs);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error('--file must stay under the wiki directory: ' + candidate);
    }
  }

  const sanitizeOneLine = (v, fallback) => {
    const s = String(v ?? fallback).replace(/[\r\n]+/g, ' ').trim();
    return s;
  };
  const title = sanitizeOneLine(options.title, feature).replace(/[\[\]]/g, '');
  const description = sanitizeOneLine(options.description, 'Living feature documentation and business rules.');
  const rawLink = options.file ? String(options.file).trim().replace(/\\/g, '/') : `${domain}/${feature}.md`;
  if (/[\[\]()\n\r]/.test(rawLink)) {
    throw new Error('invalid linkPath: markdown metacharacters not allowed: ' + rawLink);
  }
  const linkPath = rawLink;

  fs.mkdirSync(wikiDir, { recursive: true });
  const indexFile = path.join(wikiDir, 'index.wiki.md');

  let content = '';
  if (fs.existsSync(indexFile)) {
    content = fs.readFileSync(indexFile, 'utf8');
  } else {
    content = `# Project Living Feature Wiki & Domain Knowledge Base

## System Vision & Overview
Living feature wiki and architectural documentation curated and continuously synchronized with delivered code.

## Domain Catalog
`;
  }

  const bulletLine = `- [${title}](${linkPath}): ${description}`;

  // Check if linkPath already exists anywhere in the index
  const escapedLink = linkPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingLinkRegex = new RegExp(`^[-*]\\s+\\[[^\\]]+\\]\\(${escapedLink}\\):?.*$`, 'm');

  if (existingLinkRegex.test(content)) {
    // Update existing link line
    content = content.replace(existingLinkRegex, bulletLine);
  } else {
    // Look for domain section: ## Domain: <domain> or ## <domain> (case-insensitive)
    const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const domainHeadingRegex = new RegExp(`^(#{2,3})\\s+(?:Domain:\\s+)?${escapedDomain}\\s*$`, 'im');
    const match = domainHeadingRegex.exec(content);

    if (match) {
      const headingIndex = match.index;
      const afterHeading = headingIndex + match[0].length;
      // Insert bullet immediately after heading (or after existing bullets)
      const rest = content.slice(afterHeading);
      const nextHeadingMatch = /\n#{1,3}\s+/.exec(rest);
      const insertPos = nextHeadingMatch ? afterHeading + nextHeadingMatch.index : content.length;

      const beforeSectionEnd = content.slice(0, insertPos).replace(/\s+$/, '');
      const afterSectionEnd = content.slice(insertPos);
      content = `${beforeSectionEnd}\n${bulletLine}\n${afterSectionEnd}`;
    } else {
      // Append new domain heading with bullet
      const trimmed = content.trimEnd();
      content = `${trimmed}\n\n## Domain: ${domain}\n\n${bulletLine}\n`;
    }
  }

  // Atomic write
  const tempFile = `${indexFile}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempFile, content, 'utf8');
  fs.renameSync(tempFile, indexFile);

  return {
    ok: true,
    indexFile: toRepoRelative(context.repoRoot, indexFile, { allowOutside: true }),
    domain,
    feature,
    title,
    linkPath,
    description,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(`Usage: sync_wiki_index.cjs [options]

Options:
  --wiki-dir <dir>       Path to wiki directory (default: plans.wikiDir or .agents/specs/wiki)
  --repo-root <dir>      Repository root
  --domain <domain>      Domain bounded context (e.g. identity, billing, core)
  --feature <slug>       Feature slug
  --title <title>        Feature display title
  --description <text>   One-line description
  --file <relPath>       Relative link path (default: {domain}/{feature}.md)
  --json                 Output structured JSON result
  --help, -h             Show help
`);
    process.exit(0);
  }

  const result = syncWikiIndex(options);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`Registered [${result.title}](${result.linkPath}) under domain "${result.domain}" in ${result.indexFile}\n`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  syncWikiIndex,
  normalizeDomain,
};
