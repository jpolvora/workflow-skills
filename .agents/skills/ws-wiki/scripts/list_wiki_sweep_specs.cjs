#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  resolveConsumerContext,
  toRepoRelative,
} = require('../../ws-shared/runtime/scripts/resolve_consumer_root.cjs');

function parseArgs(argv) {
  const options = {
    repoRoot: null,
    specsDir: null,
    wikiDir: null,
    json: false,
    help: false,
  };

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
    if (!token.startsWith('--')) {
      console.error(`unknown argument: ${token}`);
      process.exit(2);
    }
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!Object.prototype.hasOwnProperty.call(options, key) || key === 'help' || key === 'json') {
      console.error(`unknown argument: ${token}`);
      process.exit(2);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      console.error(`missing value for ${token}`);
      process.exit(2);
    }
    options[key] = value;
    index += 1;
  }

  return options;
}

function assertContained(repoRoot, candidateAbs, label) {
  const resolvedRepo = path.resolve(repoRoot);
  const resolvedCandidate = path.resolve(candidateAbs);
  const rel = path.relative(resolvedRepo, resolvedCandidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`${label} must stay under repo root: ${toRepoRelative(resolvedRepo, resolvedCandidate, { allowOutside: true })}`);
  }
  return resolvedCandidate;
}

function listWikiSweepSpecs(options = {}) {
  const context = resolveConsumerContext({
    repoRoot: options.repoRoot,
    scriptFile: __filename,
  });

  const config = context.config || {};
  const plans = config.plans || {};
  const defaultSpecsRel = plans.specsDir || '.agents/specs';
  const defaultWikiRel = plans.wikiDir || '.agents/specs/wiki';

  const specsDir = assertContained(
    context.repoRoot,
    options.specsDir
      ? path.resolve(context.repoRoot, options.specsDir)
      : path.resolve(context.repoRoot, defaultSpecsRel),
    'specs-dir',
  );

  const wikiDir = path.resolve(
    context.repoRoot,
    options.wikiDir || defaultWikiRel,
  );

  const wikiRelFromSpecs = path.relative(specsDir, wikiDir);
  const wikiInsideSpecs = wikiRelFromSpecs && !wikiRelFromSpecs.startsWith('..') && !path.isAbsolute(wikiRelFromSpecs);

  const errors = [];
  const prefixed = [];
  const unprefixed = [];
  const slugIndex = new Map();

  if (!fs.existsSync(specsDir)) {
    return {
      ok: true,
      specs: [],
      errors: [],
      specsDir: toRepoRelative(context.repoRoot, specsDir, { allowOutside: true }),
    };
  }

  const entries = fs.readdirSync(specsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (!name.endsWith('.spec.md')) continue;
    if (name.endsWith('.context.md')) continue;

    const abs = path.join(specsDir, name);
    if (wikiInsideSpecs) {
      const relToWiki = path.relative(wikiDir, abs);
      if (!relToWiki.startsWith('..') && !path.isAbsolute(relToWiki)) {
        continue;
      }
    }

    const prefixMatch = name.match(/^(\d{4})-(.+)\.spec\.md$/);
    if (prefixMatch) {
      const prefix = Number(prefixMatch[1]);
      const slug = prefixMatch[2];
      prefixed.push({
        prefix,
        slug,
        file: toRepoRelative(context.repoRoot, abs, { allowOutside: true }),
        name,
      });
      if (!slugIndex.has(slug)) slugIndex.set(slug, { prefixed: [], unprefixed: [] });
      slugIndex.get(slug).prefixed.push(name);
    } else if (/^[^/\\]+\.spec\.md$/.test(name)) {
      const slug = name.replace(/\.spec\.md$/, '');
      unprefixed.push({
        prefix: null,
        slug,
        file: toRepoRelative(context.repoRoot, abs, { allowOutside: true }),
        name,
      });
      if (!slugIndex.has(slug)) slugIndex.set(slug, { prefixed: [], unprefixed: [] });
      slugIndex.get(slug).unprefixed.push(name);
    }
  }

  for (const [slug, hits] of slugIndex.entries()) {
    if (hits.prefixed.length > 0 && hits.unprefixed.length > 0) {
      errors.push(
        `Ambiguous spec of record for "${slug}": ${hits.unprefixed.join(', ')} and ${hits.prefixed.join(', ')}`,
      );
    }
  }

  const ambiguousSlugs = new Set(
    [...slugIndex.entries()]
      .filter(([, hits]) => hits.prefixed.length > 0 && hits.unprefixed.length > 0)
      .map(([slug]) => slug),
  );

  const specs = [];
  prefixed
    .filter((row) => !ambiguousSlugs.has(row.slug))
    .sort((a, b) => a.prefix - b.prefix || a.slug.localeCompare(b.slug))
    .forEach((row) => {
      specs.push({
        prefix: row.prefix,
        slug: row.slug,
        file: row.file,
      });
    });

  unprefixed
    .filter((row) => !ambiguousSlugs.has(row.slug))
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .forEach((row) => {
      specs.push({
        prefix: null,
        slug: row.slug,
        file: row.file,
      });
    });

  return {
    ok: true,
    specs,
    errors,
    specsDir: toRepoRelative(context.repoRoot, specsDir, { allowOutside: true }),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(`Usage: list_wiki_sweep_specs.cjs [options]

Options:
  --repo-root <dir>    Repository root (default: cwd)
  --specs-dir <dir>    Specs directory (default: plans.specsDir)
  --wiki-dir <dir>     Wiki directory to exclude when nested under specs (default: plans.wikiDir)
  --json               Output structured JSON
  --help, -h           Show help
`);
    process.exit(0);
  }

  try {
    const result = listWikiSweepSpecs(options);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      for (const row of result.specs) {
        process.stdout.write(`${row.file}\n`);
      }
      for (const err of result.errors) {
        process.stderr.write(`WARN: ${err}\n`);
      }
    }
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  listWikiSweepSpecs,
  assertContained,
};
