#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
// Managed runtime loads from its skills installation: the project-local
// skills tree ({skillsRoot}/ws-shared) or the global skills tree
// ({globalSkillsRoot}/ws-shared, override via WORKFLOW_SKILLS_GLOBAL_DIR).
// An explicit WORKFLOW_SKILLS_SHARED_DIR selects the shared hub root
// (<hub>/runtime/scripts is used). The project consumer hub (<repo>/.ws)
// holds only local config variable files (config.json, STACK.md, memory,
// changelog) and is not a managed-runtime source.
const HUB_SCRIPTS_DIR = (() => {
  const packaged = path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'scripts');
  const candidates = [packaged];
  const explicitShared = process.env.WORKFLOW_SKILLS_SHARED_DIR;
  if (explicitShared && String(explicitShared).trim()) {
    candidates.unshift(path.join(path.resolve(String(explicitShared).trim()), 'runtime', 'scripts'));
  }
  try {
    candidates.push(path.resolve(process.cwd(), '.agents', 'skills', 'ws-shared', 'runtime', 'scripts'));
  } catch {
    // Ignore cwd resolution failures; remaining candidates still apply.
  }
  const globalDir = process.env.WORKFLOW_SKILLS_GLOBAL_DIR;
  const globalRoot = globalDir && String(globalDir).trim()
    ? path.resolve(String(globalDir).trim())
    : path.join(require('os').homedir(), '.agents', 'skills');
  candidates.push(path.join(globalRoot, 'ws-shared', 'runtime', 'scripts'));
  for (const candidate of [...new Set(candidates)]) {
    try {
      require.resolve(path.join(candidate, 'resolve_consumer_root.cjs'));
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return packaged;
})();
const {
  resolveConsumerContext,
  toRepoRelative,
} = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

function parseArgs(argv) {
  const options = {
    repoRoot: null,
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

function findMarkdownFiles(dir) {
  const files = [];
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

function listWikiFeaturePages(options = {}) {
  const context = resolveConsumerContext({
    repoRoot: options.repoRoot,
    scriptFile: __filename,
  });

  const config = context.config || {};
  const plans = config.plans || {};
  const defaultWikiRel = plans.wikiDir || '.agents/specs/wiki';

  const wikiDir = assertContained(
    context.repoRoot,
    options.wikiDir
      ? path.resolve(context.repoRoot, options.wikiDir)
      : path.resolve(context.repoRoot, defaultWikiRel),
    'wiki-dir',
  );

  const errors = [];

  if (!fs.existsSync(wikiDir)) {
    return {
      ok: true,
      pages: [],
      errors,
      wikiDir: toRepoRelative(context.repoRoot, wikiDir, { allowOutside: true }),
    };
  }

  const rootIndex = path.join(path.resolve(wikiDir), 'index.wiki.md');
  const allMd = findMarkdownFiles(wikiDir);
  const pages = [];

  for (const abs of allMd) {
    const resolvedAbs = path.resolve(abs);
    if (resolvedAbs === path.resolve(rootIndex)) {
      continue;
    }
    const base = path.basename(resolvedAbs);
    if (base.endsWith('.state.json') || base.endsWith('.state.json.md')) {
      continue;
    }
    const relToWiki = path.relative(path.resolve(wikiDir), resolvedAbs).replace(/\\/g, '/');
    const parts = relToWiki.split('/');
    const file = toRepoRelative(context.repoRoot, resolvedAbs, { allowOutside: true }).replace(/\\/g, '/');
    let domain = '';
    let feature = '';
    if (parts.length <= 1) {
      domain = '';
      feature = base.replace(/\.md$/, '');
    } else {
      domain = parts[0];
      feature = base.replace(/\.md$/, '');
    }
    pages.push({ file, domain, feature });
  }

  pages.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));

  return {
    ok: true,
    pages,
    errors,
    wikiDir: toRepoRelative(context.repoRoot, wikiDir, { allowOutside: true }),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(`Usage: list_wiki_feature_pages.cjs [options]

Options:
  --repo-root <dir>    Repository root (default: cwd)
  --wiki-dir <dir>     Wiki directory (default: plans.wikiDir)
  --json               Output structured JSON
  --help, -h           Show help
`);
    process.exit(0);
  }

  try {
    const result = listWikiFeaturePages(options);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      for (const row of result.pages) {
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
  listWikiFeaturePages,
  assertContained,
};
