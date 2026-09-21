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

const CANONICAL_AREAS = [
  { id: 'structure', title: 'Project structure & stack layout' },
  { id: 'frontend', title: 'Frontend application surface' },
  { id: 'backend', title: 'Backend services & APIs' },
  { id: 'ci-cd', title: 'CI/CD pipelines' },
  { id: 'docs', title: 'Project documentation' },
  { id: 'domains', title: 'Bounded contexts & domain modules' },
  { id: 'quality', title: 'Tests & code review artifacts' },
  { id: 'ship', title: 'Shipping & delivery configuration' },
  { id: 'git-surface', title: 'Local git surface (branches & recent commits)' },
];

function parseArgs(argv) {
  const options = {
    repoRoot: null,
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

function existsAt(repoRoot, relPath) {
  if (!relPath) return false;
  const abs = path.join(repoRoot, relPath);
  return fs.existsSync(abs);
}

function addUnique(paths, repoRoot, relPath) {
  if (!relPath) return;
  const normalized = relPath.replace(/\\/g, '/');
  let abs;
  try {
    abs = assertContained(repoRoot, path.resolve(repoRoot, normalized), 'candidate path');
  } catch {
    return;
  }
  if (!fs.existsSync(abs)) return;
  const posix = toRepoRelative(repoRoot, abs, { allowOutside: true });
  if (!paths.includes(posix)) {
    paths.push(posix);
  }
}

function collectDirFiles(repoRoot, dirRel, paths, maxDepth = 3, depth = 0) {
  if (!dirRel || depth > maxDepth) return;
  const abs = path.join(repoRoot, dirRel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return;
  addUnique(paths, repoRoot, dirRel);
  if (depth >= maxDepth) return;
  try {
    const entries = fs.readdirSync(abs, { withFileTypes: true });
    for (const entry of entries) {
      const childRel = path.join(dirRel, entry.name).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        collectDirFiles(repoRoot, childRel, paths, maxDepth, depth + 1);
      } else {
        addUnique(paths, repoRoot, childRel);
      }
    }
  } catch (error) {
    // I/O failures surface via errors array in caller when needed
  }
}

function collectStructurePaths(repoRoot, config) {
  const paths = [];
  addUnique(paths, repoRoot, '.ws/config.json');
  addUnique(paths, repoRoot, 'config.json');
  addUnique(paths, repoRoot, 'package.json');
  const stack = config.stack || {};
  const backend = stack.backend || {};
  if (backend.solutionFile) addUnique(paths, repoRoot, backend.solutionFile);
  if (backend.srcDir) addUnique(paths, repoRoot, backend.srcDir);
  for (const layer of backend.layers || []) {
    if (layer.path) addUnique(paths, repoRoot, layer.path);
  }
  const frontend = stack.frontend || {};
  if (frontend.buildDir) addUnique(paths, repoRoot, frontend.buildDir);
  return paths;
}

function collectFrontendPaths(repoRoot, config) {
  const paths = [];
  const sourceDir = config.stack?.frontend?.sourceDir;
  if (sourceDir) {
    addUnique(paths, repoRoot, sourceDir);
    collectDirFiles(repoRoot, sourceDir, paths, 2);
  }
  return paths;
}

function collectBackendPaths(repoRoot, config) {
  const paths = [];
  const backend = config.stack?.backend || {};
  if (backend.srcDir) {
    addUnique(paths, repoRoot, backend.srcDir);
    collectDirFiles(repoRoot, backend.srcDir, paths, 2);
  }
  for (const layer of backend.layers || []) {
    if (layer.path) {
      addUnique(paths, repoRoot, layer.path);
      collectDirFiles(repoRoot, layer.path, paths, 1);
    }
  }
  return paths;
}

function collectCiCdPaths(repoRoot) {
  const paths = [];
  const ciCandidates = [
    '.github/workflows',
    'azure-pipelines.yml',
    '.gitlab-ci.yml',
    'Jenkinsfile',
    '.circleci/config.yml',
    'bitbucket-pipelines.yml',
  ];
  for (const candidate of ciCandidates) {
    const abs = path.join(repoRoot, candidate);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) {
      collectDirFiles(repoRoot, candidate, paths, 2);
    } else {
      addUnique(paths, repoRoot, candidate);
    }
  }
  return paths;
}

function collectDocsPaths(repoRoot) {
  const paths = [];
  const docCandidates = [
    'README.md',
    'AGENTS.md',
    'STACK.md',
    'FEATURES.md',
    'index.PRD',
    'docs',
  ];
  for (const candidate of docCandidates) {
    const abs = path.join(repoRoot, candidate);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isDirectory()) {
      collectDirFiles(repoRoot, candidate, paths, 2);
    } else {
      addUnique(paths, repoRoot, candidate);
    }
  }
  return paths;
}

function collectDomainsPaths(repoRoot, config) {
  const paths = [];
  const plans = config.plans || {};
  const wikiRel = plans.wikiDir || '.agents/specs/wiki';
  const wikiAbs = path.join(repoRoot, wikiRel);
  if (fs.existsSync(wikiAbs) && fs.statSync(wikiAbs).isDirectory()) {
    try {
      const entries = fs.readdirSync(wikiAbs, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          addUnique(paths, repoRoot, path.join(wikiRel, entry.name).replace(/\\/g, '/'));
        }
      }
    } catch {
      // skip
    }
  }
  for (const layer of config.stack?.backend?.layers || []) {
    if (layer.path && layer.role && /domain|module|context/i.test(layer.role)) {
      addUnique(paths, repoRoot, layer.path);
    }
  }
  return paths;
}

function collectQualityPaths(repoRoot, config) {
  const paths = [];
  const backend = config.stack?.backend || {};
  if (backend.testProject) addUnique(paths, repoRoot, backend.testProject);
  addUnique(paths, repoRoot, 'test');
  addUnique(paths, repoRoot, 'tests');
  const reviewsDir = config.reviews?.dir;
  if (reviewsDir) {
    addUnique(paths, repoRoot, reviewsDir);
    collectDirFiles(repoRoot, reviewsDir, paths, 1);
  }
  return paths;
}

function collectShipPaths(repoRoot, config) {
  const paths = [];
  const shipCandidates = [
    '.github/PULL_REQUEST_TEMPLATE.md',
    '.github/pull_request_template.md',
    'pull_request_template.md',
    'docs/ship',
    'SHIP.md',
  ];
  for (const candidate of shipCandidates) {
    addUnique(paths, repoRoot, candidate);
  }
  const project = config.project || {};
  if (project.baseBranch || project.workingBranch) {
    addUnique(paths, repoRoot, '.ws/config.json');
  }
  return paths;
}

const COLLECTORS = {
  structure: collectStructurePaths,
  frontend: collectFrontendPaths,
  backend: collectBackendPaths,
  'ci-cd': collectCiCdPaths,
  docs: collectDocsPaths,
  domains: collectDomainsPaths,
  quality: collectQualityPaths,
  ship: collectShipPaths,
  'git-surface': () => [],
};

function listWikiFromCodeAreas(options = {}) {
  const context = resolveConsumerContext({
    repoRoot: options.repoRoot,
    scriptFile: __filename,
  });

  const config = context.config || {};
  const areas = [];
  const skipped = [];
  const errors = [];

  for (const areaDef of CANONICAL_AREAS) {
    try {
      const collector = COLLECTORS[areaDef.id];
      const paths = collector(context.repoRoot, config);
      if (areaDef.id === 'git-surface') {
        areas.push({ id: areaDef.id, title: areaDef.title, paths: [] });
        continue;
      }
      if (paths.length === 0) {
        skipped.push({ id: areaDef.id, reason: 'no candidate paths' });
        continue;
      }
      areas.push({ id: areaDef.id, title: areaDef.title, paths });
    } catch (error) {
      errors.push(`${areaDef.id}: ${error.message}`);
    }
  }

  return {
    ok: errors.length === 0,
    areas,
    skipped,
    errors,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(`Usage: list_wiki_from_code_areas.cjs [options]

List investigation areas for /ws-wiki from-code genesis with existing candidate paths.

Options:
  --repo-root <dir>    Repository root (default: cwd)
  --json               Output structured JSON
  --help, -h           Show help

Area ids (canonical order): structure, frontend, backend, ci-cd, docs, domains, quality, ship, git-surface.

Filesystem areas with zero candidate paths are omitted from areas and recorded in skipped.
git-surface is always included in areas with paths: [] (local git only; no filesystem tree).
`);
    process.exit(0);
  }

  try {
    const result = listWikiFromCodeAreas(options);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      for (const area of result.areas) {
        process.stdout.write(`${area.id}: ${area.paths.length} path(s)\n`);
      }
      for (const row of result.skipped) {
        process.stderr.write(`SKIP: ${row.id} (${row.reason})\n`);
      }
      for (const err of result.errors) {
        process.stderr.write(`ERROR: ${err}\n`);
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
  listWikiFromCodeAreas,
  assertContained,
  CANONICAL_AREAS,
};
