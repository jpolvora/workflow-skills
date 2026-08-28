#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  resolveConsumerContext,
  resolveConfiguredPath,
  toRepoRelative,
} = require('../../ws-shared/scripts/resolve_consumer_root.cjs');

function parseArgs(argv) {
  const options = {
    slug: null,
    repoRoot: null,
    context: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: resolve_spec_path.cjs --slug <slug> [--repo-root <dir>] [--context] [--json]');
      process.exit(0);
    }
    if (arg === '--slug') {
      options.slug = argv[++index];
    } else if (arg === '--repo-root') {
      options.repoRoot = argv[++index];
    } else if (arg === '--context') {
      options.context = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg.startsWith('--slug=')) {
      options.slug = arg.slice('--slug='.length);
    } else if (arg.startsWith('--repo-root=')) {
      options.repoRoot = arg.slice('--repo-root='.length);
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }

  if (!options.slug) {
    console.error('missing --slug');
    process.exit(2);
  }

  return options;
}

function resolveSpecPath(options) {
  const context = resolveConsumerContext({
    repoRoot: options.repoRoot,
    scriptFile: __filename,
  });

  const config = context.config || {};
  const plans = config.plans || {};
  const enforceSpecPrefixOrdering = plans.enforceSpecPrefixOrdering === true;
  const specsRel = plans.specsDir || '.agents/specs';
  const specsDir = path.resolve(context.repoRoot, specsRel);

  const cleanSlug = String(options.slug).replace(/^\d{4}-/, '');
  let existingSpecFile = null;
  const existingPrefixes = [];

  if (fs.existsSync(specsDir)) {
    const entries = fs.readdirSync(specsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const name = entry.name;
      const prefixMatch = name.match(/^(\d{4})-(.+)\.spec\.md$/);
      if (prefixMatch) {
        const num = Number(prefixMatch[1]);
        if (!Number.isNaN(num)) existingPrefixes.push(num);
        if (prefixMatch[2] === cleanSlug) {
          existingSpecFile = name;
        }
      } else if (name === `${cleanSlug}.spec.md`) {
        existingSpecFile = name;
      }
    }
  }

  let finalFileName;
  let isExisting = false;

  if (existingSpecFile) {
    finalFileName = existingSpecFile;
    isExisting = true;
  } else if (enforceSpecPrefixOrdering) {
    const nextNum = existingPrefixes.length > 0 ? Math.max(...existingPrefixes) + 1 : 1;
    const prefix = String(nextNum).padStart(4, '0');
    finalFileName = `${prefix}-${cleanSlug}.spec.md`;
  } else {
    finalFileName = `${cleanSlug}.spec.md`;
  }

  const specAbs = path.join(specsDir, finalFileName);
  const specRel = toRepoRelative(context.repoRoot, specAbs);
  const contextFileName = finalFileName.replace(/\.spec\.md$/, '.context.md');
  const contextAbs = path.join(specsDir, contextFileName);
  const contextRel = toRepoRelative(context.repoRoot, contextAbs);

  return {
    slug: cleanSlug,
    specPath: specRel,
    contextPath: contextRel,
    existing: isExisting,
    enforceSpecPrefixOrdering,
    specsDir: toRepoRelative(context.repoRoot, specsDir),
  };
}

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  const result = resolveSpecPath(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (options.context) {
    console.log(result.contextPath);
  } else {
    console.log(result.specPath);
  }
}

module.exports = {
  resolveSpecPath,
};
