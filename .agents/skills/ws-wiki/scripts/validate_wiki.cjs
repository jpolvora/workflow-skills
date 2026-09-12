#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  resolveConsumerContext,
  resolveConfiguredPath,
  toRepoRelative,
} = require('../../ws-shared/runtime/scripts/resolve_consumer_root.cjs');

const REQUIRED_SECTIONS = [
  'Feature Overview',
  'Business Rules & Logic',
  'Technical Architecture',
];

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
    if (token === '--check') {
      options.check = true;
      continue;
    }
    if (token.startsWith('--')) {
      const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      options[key] = argv[++index];
    }
  }
  return options;
}

function extractMarkdownLinks(content) {
  const links = [];
  // Standard markdown link pattern: [label](target)
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push({ text: match[1], target: match[2].trim() });
  }
  return links;
}

function isRelativeLink(target) {
  if (!target) return false;
  if (/^(https?:|mailto:|ftp:|#)/i.test(target)) return false;
  return true;
}

function stripAnchor(target) {
  const hashIdx = target.indexOf('#');
  return hashIdx >= 0 ? target.slice(0, hashIdx) : target;
}

function findMarkdownFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

function checkRequiredSections(content) {
  const missing = [];
  for (const section of REQUIRED_SECTIONS) {
    const pattern = new RegExp(`^##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
    if (!pattern.test(content)) {
      missing.push(section);
    }
  }
  return missing;
}

function validateWiki(options = {}) {
  const context = resolveConsumerContext({
    repoRoot: options.repoRoot,
    scriptFile: __filename,
  });

  const defaultWikiRel = context.config?.plans?.wikiDir || '.agents/specs/wiki';
  const wikiDir = path.resolve(
    context.repoRoot,
    options.wikiDir || defaultWikiRel,
  );

  const errors = [];
  const warnings = [];
  const validatedPages = [];

  if (!fs.existsSync(wikiDir)) {
    errors.push(`Wiki directory does not exist: ${toRepoRelative(context.repoRoot, wikiDir, { allowOutside: true })}`);
    return { ok: false, errors, warnings, validatedPages };
  }

  const indexFile = path.join(wikiDir, 'index.wiki.md');
  if (!fs.existsSync(indexFile)) {
    errors.push(`Root index.wiki.md not found in ${toRepoRelative(context.repoRoot, wikiDir, { allowOutside: true })}`);
    return { ok: false, errors, warnings, validatedPages };
  }

  validatedPages.push(toRepoRelative(context.repoRoot, indexFile, { allowOutside: true }));

  // 1. Validate index.wiki.md links
  const indexContent = fs.readFileSync(indexFile, 'utf8');
  const indexLinks = extractMarkdownLinks(indexContent);
  const indexedTargets = new Set();

  for (const link of indexLinks) {
    if (!isRelativeLink(link.target)) continue;
    const cleanTarget = stripAnchor(link.target);
    if (!cleanTarget) continue;

    const resolvedTarget = path.resolve(path.dirname(indexFile), cleanTarget);
    const relToWiki = path.relative(path.resolve(wikiDir), resolvedTarget);
    if (relToWiki.startsWith('..') || path.isAbsolute(relToWiki)) {
      errors.push(`Link target escapes wiki directory in index.wiki.md: [${link.text}](${link.target})`);
    } else if (!fs.existsSync(resolvedTarget)) {
      errors.push(`Broken relative link in index.wiki.md: [${link.text}](${link.target}) -> target file not found: ${toRepoRelative(context.repoRoot, resolvedTarget, { allowOutside: true })}`);
    } else {
      indexedTargets.add(path.normalize(resolvedTarget));
    }
  }

  // 2. Discover all domain feature subpages
  const allMdFiles = findMarkdownFiles(wikiDir);
  const featurePages = allMdFiles.filter((file) => path.normalize(file) !== path.normalize(indexFile));

  for (const pageFile of featurePages) {
    const relPage = toRepoRelative(context.repoRoot, pageFile, { allowOutside: true });
    validatedPages.push(relPage);
    const content = fs.readFileSync(pageFile, 'utf8');

    // Check 3-section format
    const missingSections = checkRequiredSections(content);
    if (missingSections.length > 0) {
      errors.push(`Malformed feature page ${relPage}: missing required section heading(s): ${missingSections.map((s) => `"## ${s}"`).join(', ')}`);
    }

    // Check links within feature page
    const pageLinks = extractMarkdownLinks(content);
    for (const link of pageLinks) {
      if (!isRelativeLink(link.target)) continue;
      const cleanTarget = stripAnchor(link.target);
      if (!cleanTarget) continue;

      const resolvedTarget = path.resolve(path.dirname(pageFile), cleanTarget);
      const relToWiki = path.relative(path.resolve(wikiDir), resolvedTarget);
      if (relToWiki.startsWith('..') || path.isAbsolute(relToWiki)) {
        errors.push(`Link target escapes wiki directory in ${relPage}: [${link.text}](${link.target})`);
      } else if (!fs.existsSync(resolvedTarget)) {
        errors.push(`Broken relative link in ${relPage}: [${link.text}](${link.target}) -> target file not found: ${toRepoRelative(context.repoRoot, resolvedTarget, { allowOutside: true })}`);
      }
    }

    // Check if indexed
    if (!indexedTargets.has(path.normalize(pageFile))) {
      warnings.push(`Unindexed feature page: ${relPage} is not linked from index.wiki.md`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    validatedPages,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(`Usage: validate_wiki.cjs [options]

Options:
  --wiki-dir <dir>    Path to wiki directory (default: plans.wikiDir or .agents/specs/wiki)
  --repo-root <dir>   Repository root
  --json              Output structured JSON result
  --check             Check mode
  --help, -h          Show help
`);
    process.exit(0);
  }

  const result = validateWiki(options);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    if (result.ok) {
      process.stdout.write(`PASS: Living wiki validated successfully (${result.validatedPages.length} page(s)).\n`);
      if (result.warnings.length > 0) {
        process.stdout.write(`Warnings (${result.warnings.length}):\n`);
        for (const warning of result.warnings) {
          process.stdout.write(`  - ${warning}\n`);
        }
      }
    } else {
      process.stderr.write(`FAIL: Living wiki validation failed (${result.errors.length} error(s)):\n`);
      for (const err of result.errors) {
        process.stderr.write(`  - ${err}\n`);
      }
      if (result.warnings.length > 0) {
        process.stderr.write(`Warnings (${result.warnings.length}):\n`);
        for (const warning of result.warnings) {
          process.stderr.write(`  - ${warning}\n`);
        }
      }
    }
  }

  process.exit(result.ok ? 0 : 1);
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
  validateWiki,
  REQUIRED_SECTIONS,
  extractMarkdownLinks,
  checkRequiredSections,
};
