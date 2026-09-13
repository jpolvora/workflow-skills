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

const NEW_REQUIRED_SECTIONS = [
  'Feature',
  'How it works',
];

const NEW_CONDITIONAL_SECTIONS = [
  'Backend',
  'Frontend',
  'Third-party services',
];

const VERBOSITY_LEVELS = ['condensed', 'detailed'];
const DEFAULT_VERBOSITY = 'condensed';

function normalizeVerbosity(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'condensed' || raw === 'detailed') return raw;
  return DEFAULT_VERBOSITY;
}

function hasSection(content, section) {
  const pattern = new RegExp(`^##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  return pattern.test(content);
}

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

function checkNewRequiredSections(content) {
  const missing = [];
  for (const section of NEW_REQUIRED_SECTIONS) {
    if (!hasSection(content, section)) {
      missing.push(section);
    }
  }
  return missing;
}

function classifyTemplate(content) {
  const missingNew = checkNewRequiredSections(content);
  const missingOld = checkRequiredSections(content);
  const hasAnyNew = NEW_REQUIRED_SECTIONS.some((s) => hasSection(content, s))
    || NEW_CONDITIONAL_SECTIONS.some((s) => hasSection(content, s));
  const hasAnyOld = REQUIRED_SECTIONS.some((s) => hasSection(content, s));
  if (missingNew.length === 0) {
    return { style: hasAnyOld ? 'mixed' : 'new', missingNew, missingOld, hasAnyNew, hasAnyOld };
  }
  if (missingOld.length === 0) {
    return { style: 'legacy', missingNew, missingOld, hasAnyNew, hasAnyOld };
  }
  return { style: 'malformed', missingNew, missingOld, hasAnyNew, hasAnyOld };
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

    // Check page template: new conditional format OR legacy 3-section (warn-only migration).
    const template = classifyTemplate(content);
    if (template.style === 'new') {
      // Conditional sections (Backend/Frontend/Third-party services) may be absent when not applicable.
    } else if (template.style === 'mixed') {
      warnings.push(`Mixed template in ${relPage}: page contains both new headings ("## Feature", "## How it works") and legacy 3-section headings; prefer the new template for new content.`);
    } else if (template.style === 'legacy') {
      warnings.push(`Legacy template in ${relPage}: page uses deprecated 3-section headings ("## Feature Overview", "## Business Rules & Logic", "## Technical Architecture"); migrate to "## Feature" + "## How it works" with conditional "## Backend" / "## Frontend" / "## Third-party services" on next touch.`);
    } else {
      if (template.hasAnyNew && !template.hasAnyOld) {
        errors.push(`Malformed feature page ${relPage}: missing required section heading(s): ${template.missingNew.map((s) => `"## ${s}"`).join(', ')} (new template requires "## Feature" + "## How it works"; conditional "## Backend" / "## Frontend" / "## Third-party services" may be omitted when not applicable)`);
      } else if (template.hasAnyOld && !template.hasAnyNew) {
        const missingSections = checkRequiredSections(content);
        errors.push(`Malformed feature page ${relPage}: missing required section heading(s): ${missingSections.map((s) => `"## ${s}"`).join(', ')}`);
      } else if (template.hasAnyNew || template.hasAnyOld) {
        errors.push(`Malformed feature page ${relPage}: missing required section heading(s): ${template.missingNew.map((s) => `"## ${s}"`).join(', ')}; legacy pages require ${template.missingOld.map((s) => `"## ${s}"`).join(', ')}`);
      } else {
        errors.push(`Malformed feature page ${relPage}: missing required section heading(s): ${template.missingNew.map((s) => `"## ${s}"`).join(', ')} (new template requires "## Feature" + "## How it works")`);
      }
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
  NEW_REQUIRED_SECTIONS,
  NEW_CONDITIONAL_SECTIONS,
  VERBOSITY_LEVELS,
  DEFAULT_VERBOSITY,
  normalizeVerbosity,
  classifyTemplate,
  checkNewRequiredSections,
  extractMarkdownLinks,
  checkRequiredSections,
};
