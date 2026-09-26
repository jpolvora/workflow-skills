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
  const candidates = [];
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
  candidates.push(packaged);
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
  resolveConfiguredPath,
  toRepoRelative,
} = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const STATUS_SUBFOLDERS = ['pending', 'completed', 'archived'];

function parseArgs(argv) {
  const options = {
    slug: null,
    repoRoot: null,
    specsDir: null,
    status: null,
    context: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: resolve_spec_path.cjs --slug <slug> [--repo-root <dir>] [--specs-dir <dir>] [--status pending|completed|archived] [--context] [--json]');
      process.exit(0);
    }
    if (arg === '--slug') {
      options.slug = argv[++index];
    } else if (arg === '--repo-root') {
      options.repoRoot = argv[++index];
    } else if (arg === '--specs-dir') {
      options.specsDir = argv[++index];
    } else if (arg === '--status') {
      options.status = argv[++index];
    } else if (arg === '--context') {
      options.context = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg.startsWith('--slug=')) {
      options.slug = arg.slice('--slug='.length);
    } else if (arg.startsWith('--repo-root=')) {
      options.repoRoot = arg.slice('--repo-root='.length);
    } else if (arg.startsWith('--specs-dir=')) {
      options.specsDir = arg.slice('--specs-dir='.length);
    } else if (arg.startsWith('--status=')) {
      options.status = arg.slice('--status='.length);
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }

  if (!options.slug) {
    console.error('missing --slug');
    process.exit(2);
  }

  if (options.status != null && !STATUS_SUBFOLDERS.includes(options.status)) {
    console.error(`invalid --status "${options.status}" (expected pending|completed|archived)`);
    process.exit(2);
  }

  return options;
}

function scanLocation(dir, cleanSlug, hits, existingPrefixes) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    const prefixMatch = name.match(/^(\d{4})-(.+)\.spec\.md$/);
    if (prefixMatch) {
      const num = Number(prefixMatch[1]);
      if (!Number.isNaN(num)) existingPrefixes.push(num);
      if (prefixMatch[2] === cleanSlug) {
        hits.push(name);
      }
    } else if (name === `${cleanSlug}.spec.md`) {
      hits.push(name);
    }
  }
}

function resolveSpecPath(options) {
  const context = resolveConsumerContext({
    repoRoot: options.repoRoot,
    scriptFile: __filename,
  });

  const config = context.config || {};
  const plans = config.plans || {};
  const enforceSpecPrefixOrdering = plans.enforceSpecPrefixOrdering === true;
  const statusSubfolders = plans.statusSubfolders === true;
  const specsRel = String(options.specsDir || '').trim() || plans.specsDir || '.agents/specs';
  const specsDir = path.isAbsolute(specsRel) ? path.resolve(specsRel) : path.resolve(context.repoRoot, specsRel);

  if (options.status != null && !STATUS_SUBFOLDERS.includes(options.status)) {
    throw new Error(`invalid status "${options.status}" (expected pending|completed|archived)`);
  }

  const cleanSlug = String(options.slug).replace(/^\d{4}-/, '');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(cleanSlug)) {
    throw new Error(`invalid slug "${options.slug}" (letters, digits, dot, underscore, hyphen only)`);
  }
  // Search root plus known status subfolders; each hit is a path relative
  // to specsDir using forward slashes (e.g. "pending/0001-foo.spec.md").
  const locations = ['', ...STATUS_SUBFOLDERS];
  const hits = [];
  const existingPrefixes = [];

  for (const location of locations) {
    const dir = location ? path.join(specsDir, location) : specsDir;
    if (!fs.existsSync(dir)) continue;
    const names = [];
    scanLocation(dir, cleanSlug, names, existingPrefixes);
    for (const name of names) {
      hits.push(location ? `${location}/${name}` : name);
    }
  }

  if (hits.length > 1) {
    throw new Error(
      `Ambiguous spec of record for "${cleanSlug}": ${hits.join(' and ')}`,
    );
  }

  const existingSpecRel = hits.length === 1 ? hits[0] : null;

  let finalRel;
  let isExisting = false;

  if (existingSpecRel) {
    finalRel = existingSpecRel;
    isExisting = true;
  } else {
    let finalFileName;
    if (enforceSpecPrefixOrdering) {
      const nextNum = existingPrefixes.length > 0 ? Math.max(...existingPrefixes) + 1 : 1;
      const prefix = String(nextNum).padStart(4, '0');
      finalFileName = `${prefix}-${cleanSlug}.spec.md`;
    } else {
      finalFileName = `${cleanSlug}.spec.md`;
    }
    const targetSubfolder = options.status != null
      ? options.status
      : (statusSubfolders ? 'pending' : '');
    finalRel = targetSubfolder ? `${targetSubfolder}/${finalFileName}` : finalFileName;
  }

  const specAbs = path.resolve(specsDir, ...finalRel.split('/'));
  const specRel = toRepoRelative(context.repoRoot, specAbs);
  const contextRel = finalRel.replace(/\.spec\.md$/, '.context.md');
  const contextAbs = path.resolve(specsDir, ...contextRel.split('/'));
  const contextRepoRel = toRepoRelative(context.repoRoot, contextAbs);

  // Containment: a resolved path must stay inside specsDir (defense in depth
  // against a crafted slug even though isSafeSlug already rejects traversal).
  const specsRoot = path.resolve(specsDir);
  for (const [label, abs] of [['spec path', specAbs], ['context path', contextAbs]]) {
    const rel = path.relative(specsRoot, abs);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`${label} escapes specsDir: ${toRepoRelative(context.repoRoot, abs)}`);
    }
  }

  return {
    slug: cleanSlug,
    specPath: specRel,
    contextPath: contextRepoRel,
    existing: isExisting,
    enforceSpecPrefixOrdering,
    statusSubfolders,
    specsDir: toRepoRelative(context.repoRoot, specsDir),
  };
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = resolveSpecPath(options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (options.context) {
      console.log(result.contextPath);
    } else {
      console.log(result.specPath);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}

module.exports = {
  resolveSpecPath,
  STATUS_SUBFOLDERS,
};
