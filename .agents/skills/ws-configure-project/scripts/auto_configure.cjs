#!/usr/bin/env node
'use strict';

/**
 * ws-configure-project — non-interactive auto fill for consumer config.json.
 *
 * Fills ONLY gaps (missing / empty-required / `<placeholder>`) with
 * auto-detected env values first, then JSON-Schema `default`, then concrete
 * `config.json.example` values. Existing filled keys are left untouched
 * unless `--force` is passed. Never prompts, never commits, never invents
 * secrets (org/repo/PAT stay unresolved when undetectable).
 *
 * Usage:
 *   node auto_configure.cjs [--repo-root DIR] [--section <name>] [--force] [--dry-run] [--json]
 *
 * Sections: project, stack, domain, providers, issueTrackers, verification,
 *   dagThresholds, defaults, plans, reviews, preview, rules, invariants,
 *   tracking, specMemo, fable, pathTokens, toolsFile.
 *
 * Exit codes: 0 = write (or dry-run) succeeded with no required gaps
 * remaining; 1 = completed but required gaps remain unresolved
 * (`ok:false`); 2 = usage / missing hub / unreadable JSON.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveConsumerContext, toRepoRelative } = require('../../ws-shared/scripts/resolve_consumer_root.cjs');

const SCRIPT_FILE = __filename;

const ALLOWED_SECTIONS = new Set([
  'project',
  'stack',
  'domain',
  'providers',
  'issueTrackers',
  'verification',
  'dagThresholds',
  'defaults',
  'plans',
  'reviews',
  'preview',
  'rules',
  'invariants',
  'tracking',
  'specMemo',
  'fable',
  'pathTokens',
  'toolsFile',
]);

const PLACEHOLDER_RE = /<[^<>\n]*>/;
const REQUIRED_EMPTY_GAP = new Set([
  'project.name',
  'project.baseBranch',
  'providers.active',
  'providers.scm',
  'plans.dir',
]);
// Empty string is a valid intentional value here — never treat as a gap.
const EMPTY_IS_VALID = new Set([
  'preview.dryRunCommand',
  'verification.mutationTest',
  'rules.viewPatterns',
  'rules.efMigrations',
  'domain.glossaryFile',
  'domain.designTokens',
  'specMemo.vaultRoot',
  'defaults.hostAdapter.cliTemplate',
]);

function parseArgs(argv) {
  const args = { repoRoot: null, section: null, force: false, dryRun: false, json: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--repo-root') args.repoRoot = argv[++i] || null;
    else if (a === '--section') args.section = argv[++i] || null;
    else if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node auto_configure.cjs [--repo-root DIR] [--section <name>] [--force] [--dry-run] [--json]');
      process.exit(0);
    } else {
      console.error(`ERROR: unknown flag ${a}`);
      process.exit(2);
    }
  }
  if (args.section && !ALLOWED_SECTIONS.has(args.section)) {
    console.error(`ERROR: unknown --section ${args.section} (allowed: ${[...ALLOWED_SECTIONS].join(', ')})`);
    process.exit(2);
  }
  return args;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isPlaceholderString(v) {
  return typeof v === 'string' && PLACEHOLDER_RE.test(v);
}

function isEmptyString(v) {
  return typeof v === 'string' && v.trim() === '';
}

function getByPath(obj, dotPath) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (const p of parts) {
    if (!isPlainObject(cur) || !Object.prototype.hasOwnProperty.call(cur, p)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setByPath(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!isPlainObject(cur[parts[i]])) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function isGap(existingVal, hasKey, dotPath) {
  if (!hasKey || existingVal === undefined) return 'missing';
  if (isPlaceholderString(existingVal)) return 'placeholder';
  // Empty string is an intentional value (fall-through / unset) everywhere
  // except required keys, where it means "needs a value".
  if (isEmptyString(existingVal) && REQUIRED_EMPTY_GAP.has(dotPath)) return 'empty-required';
  return null;
}

function emptyIsConcrete(dotPath) {
  if (EMPTY_IS_VALID.has(dotPath)) return true;
  // Model fall-through shape: "" means "fall through to the next layer".
  if (/(^|\.)stepModels\.[^.]+$/.test(dotPath)) return true;
  if (/modelPresets\.[^.]+\.steps\.[^.]+$/.test(dotPath)) return true;
  if (/(^|\.)(plannerModel|executionModel|reviewerModel|testingModel)$/.test(dotPath)) return true;
  return false;
}

function isConcreteWanted(v, dotPath) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') {
    if (isPlaceholderString(v)) return false;
    if (v.trim() === '' && !emptyIsConcrete(dotPath)) return false;
  }
  return true;
}

function runGit(repoRoot, gitArgs) {
  try {
    const run = spawnSync('git', gitArgs, {
      encoding: 'utf8',
      cwd: repoRoot,
      timeout: 5000,
      shell: process.platform === 'win32',
    });
    if (run.status !== 0) return null;
    const out = (run.stdout || '').trim();
    return out || null;
  } catch {
    return null;
  }
}

function detectGitRemote(repoRoot) {
  const url = runGit(repoRoot, ['remote', 'get-url', 'origin']);
  return url ? url.trim() : null;
}

function detectBaseBranch(repoRoot) {
  // Prefer the remote default branch, then the current checkout.
  const symbolic = runGit(repoRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD']);
  if (symbolic) {
    const leaf = symbolic.trim().split('/').pop();
    if (leaf) return leaf;
  }
  const current = runGit(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (current && current !== 'HEAD') return current;
  const showCurrent = runGit(repoRoot, ['branch', '--show-current']);
  if (showCurrent) return showCurrent;
  return null;
}

function parseGitHubOrgRepo(repoUrl) {
  if (!repoUrl || !repoUrl.includes('github.com')) return null;
  const m = repoUrl.match(/github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?\s*$/i);
  if (!m) return null;
  return { org: m[1], repo: m[2] };
}

function detectScmHost(repoUrl) {
  if (!repoUrl) return null;
  if (/github\.com/i.test(repoUrl)) return 'github';
  if (/dev\.azure\.com|visualstudio\.com/i.test(repoUrl)) return 'azure-devops';
  return null;
}

function readPackageJson(repoRoot) {
  try {
    const file = path.join(repoRoot, 'package.json');
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function fileExists(repoRoot, ...rel) {
  return fs.existsSync(path.join(repoRoot, ...rel));
}

function globExists(repoRoot, pattern) {
  // Minimal marker check: support `*.ext` in repo root only.
  if (/^\*\.[A-Za-z0-9]+$/.test(pattern)) {
    const ext = pattern.slice(1);
    try {
      return fs.readdirSync(repoRoot).some((e) => e.endsWith(ext));
    } catch {
      return false;
    }
  }
  return fileExists(repoRoot, pattern);
}

function schemaDefault(schema, dotPath) {
  const parts = dotPath.split('.');
  let node = schema;
  for (const p of parts) {
    const props = node && node.properties;
    if (!props || !props[p]) return undefined;
    node = props[p];
  }
  return node && Object.prototype.hasOwnProperty.call(node, 'default') ? node.default : undefined;
}

function exampleConcrete(example, dotPath) {
  const v = getByPath(example, dotPath);
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'string' && (isPlaceholderString(v) || (v.trim() === '' && !emptyIsConcrete(dotPath)))) return undefined;
  return v;
}

/**
 * Build a sparse `wanted` object: only concrete auto values with per-path
 * source labels. Precedence per leaf: detected > schema default > example.
 */
function buildWanted(repoRoot, example, schema) {
  const wanted = {};
  const sources = {};
  const want = (dotPath, value, source) => {
    if (!isConcreteWanted(value, dotPath)) return;
    setByPath(wanted, dotPath, value);
    sources[dotPath] = source;
  };
  const wantFallback = (dotPath) => {
    if (getByPath(wanted, dotPath) !== undefined) return;
    const d = schemaDefault(schema, dotPath);
    if (isConcreteWanted(d, dotPath)) { want(dotPath, d, 'schema-default'); return; }
    const e = exampleConcrete(example, dotPath);
    if (isConcreteWanted(e, dotPath) || (typeof e === 'string' && e === '' && EMPTY_IS_VALID.has(dotPath))) {
      want(dotPath, e, 'example');
    }
  };

  const pkg = readPackageJson(repoRoot);
  const repoUrl = detectGitRemote(repoRoot);
  const scmHost = detectScmHost(repoUrl);
  const gh = repoUrl ? parseGitHubOrgRepo(repoUrl) : null;
  const hasNode = !!pkg || fileExists(repoRoot, 'package.json');
  const hasDotnet = globExists(repoRoot, '*.sln') || globExists(repoRoot, '*.slnx') || globExists(repoRoot, '*.csproj');
  const hasPython = fileExists(repoRoot, 'pyproject.toml') || fileExists(repoRoot, 'requirements.txt');
  const hasGo = fileExists(repoRoot, 'go.mod');
  const hasRust = fileExists(repoRoot, 'Cargo.toml');

  // -- project --
  const dirName = path.basename(path.resolve(repoRoot)) || 'project';
  const pkgName = pkg && typeof pkg.name === 'string' && pkg.name.trim() ? pkg.name.trim() : null;
  want('project.name', pkgName || dirName, 'detected');
  const baseBranch = detectBaseBranch(repoRoot);
  if (baseBranch) want('project.baseBranch', baseBranch, 'detected');
  wantFallback('project.baseBranch');
  wantFallback('project.workingBranch');
  wantFallback('project.gitRemote');
  if (repoUrl) want('project.repoUrl', repoUrl, 'detected');
  else wantFallback('project.repoUrl');
  if (gh) want('project.org', gh.org, 'detected');
  else wantFallback('project.org');

  // -- providers / issueTrackers --
  if (scmHost === 'github') {
    want('providers.active', 'github', 'detected');
    want('providers.scm', 'github', 'detected');
    want('issueTrackers.github.enabled', true, 'detected');
    want('issueTrackers.azureDevOps.enabled', false, 'detected');
    if (gh) {
      want('issueTrackers.github.owner', gh.org, 'detected');
      want('issueTrackers.github.repo', gh.repo, 'detected');
    }
  } else if (scmHost === 'azure-devops') {
    want('providers.active', 'azure-devops', 'detected');
    want('providers.scm', 'azure-devops', 'detected');
    want('issueTrackers.azureDevOps.enabled', true, 'detected');
    want('issueTrackers.github.enabled', false, 'detected');
  } else if (!repoUrl) {
    // No remote: local specs, GitHub PR host as portable fallback (scm never local).
    want('providers.active', 'local', 'detected');
    want('providers.scm', 'github', 'fallback');
  }
  wantFallback('providers.active');
  wantFallback('providers.scm');
  wantFallback('issueTrackers.github.enabled');
  wantFallback('issueTrackers.azureDevOps.enabled');
  wantFallback('issueTrackers.github.cli');
  wantFallback('issueTrackers.github.issueToSpecScript');
  wantFallback('issueTrackers.azureDevOps.patEnvVar');
  wantFallback('issueTrackers.azureDevOps.apiBase');
  wantFallback('issueTrackers.azureDevOps.workItemToSpecScript');

  // -- verification (detection only; never invent commands) --
  if (hasNode && pkg && isPlainObject(pkg.scripts)) {
    const s = pkg.scripts;
    if (typeof s.build === 'string' && s.build.trim()) want('verification.backendBuild', 'npm run build', 'detected');
    if (typeof s.test === 'string' && s.test.trim()) want('verification.backendTest', 'npm test', 'detected');
    if (typeof s.lint === 'string' && s.lint.trim()) want('verification.backendFormat', 'npm run lint', 'detected');
  }
  if (hasDotnet) {
    const sln = (() => {
      try {
        const hit = fs.readdirSync(repoRoot).find((e) => e.endsWith('.slnx') || e.endsWith('.sln'));
        return hit || null;
      } catch { return null; }
    })();
    // Never overwrite verification aliases already detected from a
    // higher-precedence stack (e.g. Node in a polyglot repo).
    if (getByPath(wanted, 'verification.backendBuild') === undefined) {
      want('verification.backendBuild', sln ? `dotnet build ${sln}` : 'dotnet build', 'detected');
    }
    if (getByPath(wanted, 'verification.backendTest') === undefined) {
      want('verification.backendTest', 'dotnet test', 'detected');
    }
  }
  if (hasPython && getByPath(wanted, 'verification.backendTest') === undefined) {
    want('verification.backendTest', 'pytest', 'detected');
  }
  if (hasGo) {
    if (getByPath(wanted, 'verification.backendBuild') === undefined) {
      want('verification.backendBuild', 'go build ./...', 'detected');
    }
    if (getByPath(wanted, 'verification.backendTest') === undefined) {
      want('verification.backendTest', 'go test ./...', 'detected');
    }
  }
  if (hasRust) {
    if (getByPath(wanted, 'verification.backendBuild') === undefined) {
      want('verification.backendBuild', 'cargo build', 'detected');
    }
    if (getByPath(wanted, 'verification.backendTest') === undefined) {
      want('verification.backendTest', 'cargo test', 'detected');
    }
  }
  if (!hasNode && !hasDotnet && !hasPython && !hasGo && !hasRust && fileExists(repoRoot, '.agents', 'skills')) {
    want('verification.backendTest', 'python .agents/skills/ws-check-workflows/scripts/check_workflows.py', 'detected');
  }
  wantFallback('verification.mutationThreshold');
  wantFallback('verification.testGlobs');

  // -- plans / reviews --
  wantFallback('plans.dir');
  want('plans.specsDir', fileExists(repoRoot, 'specs') ? 'specs' : '.agents/specs', 'detected');
  wantFallback('plans.diagnosticsDir');
  wantFallback('plans.worktreesDir');
  wantFallback('plans.useWorktrees');
  wantFallback('plans.enforceSpecPrefixOrdering');
  wantFallback('reviews.dir');

  // -- rules (concrete installer paths) --
  for (const k of ['harness', 'seniorDeveloper', 'karpathyGuidelines', 'stackFile', 'changelogFile']) {
    wantFallback(`rules.${k}`);
  }

  // -- defaults (schema defaults first, then example concretes) --
  for (const k of ['autoMode', 'dryRun', 'skipTesting', 'skipMutationTesting', 'skipTests', 'fullMode',
    'scoreAndRefine', 'minVerifyScore', 'autoload', 'autoloadTaskLifecycle', 'enableDag',
    'verboseMode', 'contextBudget', 'parallelVerifyReview', 'gateGranularity',
    'plannerModel', 'executionModel', 'reviewerModel', 'testingModel']) {
    wantFallback(`defaults.${k}`);
  }
  wantFallback('defaults.providerCompat.stabilizeStaticPrefix');
  wantFallback('defaults.providerCompat.thinkingToolCompat');
  wantFallback('defaults.contextHygiene.pruneAfterStep');
  wantFallback('defaults.contextHygiene.backgroundVerboseSteps');
  wantFallback('defaults.reviewJury.size');
  wantFallback('defaults.convergence.initialDelaySec');
  wantFallback('defaults.convergence.minPollSec');
  wantFallback('defaults.convergence.maxPollSec');
  wantFallback('defaults.convergence.backoff');
  wantFallback('defaults.convergence.maxIterations');
  wantFallback('defaults.hostAdapter.mode');
  wantFallback('defaults.hostAdapter.browserTool');
  for (const k of ['includeRefinedPlan', 'includeDeliveryResult', 'includeSpec',
    'includeCheckReport', 'includeCodeReview', 'includeTestingReport']) {
    wantFallback(`defaults.deliveryCommitArtifacts.${k}`);
  }
  // Model bundles: copy the concrete example bundle only when the whole map is missing.
  if (example && isPlainObject(example.defaults)) {
    if (example.defaults.modelsPreset !== undefined) wantFallback('defaults.modelsPreset');
    if (isPlainObject(example.defaults.modelPresets)) {
      const cur = getByPath(wanted, 'defaults.modelPresets');
      if (cur === undefined) {
        const ex = exampleConcrete(example, 'defaults.modelPresets');
        if (ex !== undefined) { setByPath(wanted, 'defaults.modelPresets', ex); sources['defaults.modelPresets'] = 'example'; }
      }
    }
    if (isPlainObject(example.defaults.stepModels)) {
      const ex = exampleConcrete(example, 'defaults.stepModels');
      if (ex !== undefined && getByPath(wanted, 'defaults.stepModels') === undefined) {
        // stepModels example leaves are "" (fall-through) — copy the map shape as-is.
        setByPath(wanted, 'defaults.stepModels', JSON.parse(JSON.stringify(example.defaults.stepModels)));
        sources['defaults.stepModels'] = 'example';
      }
    }
  }

  // -- stack (minimal inference; never invent paths) --
  let stackId = null;
  if (hasNode) stackId = pkg && pkg.dependencies && (pkg.dependencies.next || (pkg.devDependencies && pkg.devDependencies.next)) ? 'node-nextjs' : 'node';
  else if (hasDotnet) stackId = 'dotnet';
  else if (hasPython) stackId = 'python';
  else if (hasGo) stackId = 'go';
  else if (hasRust) stackId = 'rust';
  if (stackId) {
    want('stack.id', stackId, 'detected');
    want('stack.description', `${stackId} project (auto-detected)`, 'detected');
  }
  if (hasNode) {
    want('stack.backend.language', 'TypeScript', 'fallback');
    want('stack.backend.solutionFile', 'package.json', 'detected');
    want('stack.backend.srcDir', fileExists(repoRoot, 'src') ? 'src' : 'src', 'fallback');
  } else if (hasDotnet) {
    want('stack.backend.language', 'C#', 'fallback');
    want('stack.backend.srcDir', fileExists(repoRoot, 'src') ? 'src' : 'src', 'fallback');
  } else if (hasPython) {
    want('stack.backend.language', 'Python', 'fallback');
    want('stack.backend.solutionFile', fileExists(repoRoot, 'pyproject.toml') ? 'pyproject.toml' : 'requirements.txt', 'detected');
    want('stack.backend.srcDir', fileExists(repoRoot, 'src') ? 'src' : 'src', 'fallback');
  }
  if (pkg && isPlainObject(pkg.scripts)) {
    if (typeof pkg.scripts.dev === 'string' && pkg.scripts.dev.trim()) want('stack.orchestration.devCommand', 'npm run dev', 'detected');
    if (typeof pkg.scripts.start === 'string' && pkg.scripts.start.trim()) want('stack.orchestration.startCommand', 'npm start', 'detected');
  }

  // -- dagThresholds / invariants / tracking / fable / domain --
  for (const k of ['maxImplementationSteps', 'maxExpectedFiles', 'maxLayers']) wantFallback(`dagThresholds.${k}`);
  wantFallback('invariants.skipQualityGates');
  wantFallback('tracking.featuresMdEnabled');
  for (const k of ['enabled', 'autoAudit', 'autoDetectDomain', 'auditVerdictsBlockShip']) wantFallback(`fable.${k}`);
  wantFallback('domain.tenancyField');

  // -- preview: empty is the valid unset state; never invent a backend. --
  want('preview.dryRunCommand', '', 'example');

  // -- specMemo: safe local-only defaults; never import/hook/bootstrap here. --
  want('specMemo.enabled', false, 'example');
  want('specMemo.enableMemoryFiles', true, 'example');
  want('specMemo.enableSpecMemoIntegration', false, 'example');
  wantFallback('specMemo.cli');
  wantFallback('specMemo.bootstrapOnSession');
  wantFallback('specMemo.writeBlockHook');
  wantFallback('specMemo.importOnEnable');
  wantFallback('specMemo.mcpServerName');
  if (getByPath(wanted, 'specMemo.mode') === undefined) {
    const exMode = example && example.specMemo ? example.specMemo.mode : undefined;
    if (typeof exMode === 'string' && exMode && !isPlaceholderString(exMode)) {
      // Preserve the shipped example mode only as a last resort; fresh local-only
      // setups resolve through the explicit boolean flags above.
      want('specMemo.mode', exMode, 'example');
    } else {
      want('specMemo.mode', 'local', 'fallback');
    }
  }

  // -- install layout --
  wantFallback('pathTokens.skillsRoot');
  wantFallback('pathTokens.sharedDir');
  if (typeof example.toolsFile === 'string' && example.toolsFile) want('toolsFile', example.toolsFile, 'example');

  return { wanted, sources };
}

function mergeAuto(existing, wanted, sources, schema, example, section, force, stats, details) {
  const topKeys = section ? [section] : Object.keys(wanted);
  for (const topKey of topKeys) {
    if (topKey === 'toolsFile') {
      mergeLeaf(existing, wanted, sources, topKey, force, stats, details);
      continue;
    }
    mergeNode(existing, wanted, sources, topKey, force, stats, details, topKey);
  }
  // Carry missing _comment keys from the example (docs only, never overwrite).
  if (example && isPlainObject(example)) {
    const commentKeys = section ? [`_comment_${section}`, '_comment'] : null;
    carryComments(existing, example, section, stats);
    void commentKeys;
  }
}

function mergeNode(existing, wanted, sources, key, force, stats, details, dotPath) {
  const wVal = wanted ? wanted[key] : undefined;
  if (!isPlainObject(wVal)) {
    mergeLeaf(existing, wanted, sources, key, force, stats, details, dotPath);
    return;
  }
  if (existing[key] === undefined) existing[key] = {};
  if (!isPlainObject(existing[key])) {
    if (force) {
      existing[key] = {};
    } else {
      stats.skipped += 1;
      details.push({ path: dotPath, action: 'skipped', reason: 'existing non-object kept (use --force to replace)' });
      return;
    }
  }
  for (const child of Object.keys(wVal)) {
    mergeNode(existing[key], wVal, sources, child, force, stats, details, `${dotPath}.${child}`);
  }
}

function mergeLeaf(existing, wanted, sources, key, force, stats, details, dotPathArg) {
  const dotPath = dotPathArg || key;
  const hasExisting = Object.prototype.hasOwnProperty.call(existing, key);
  const existingVal = hasExisting ? existing[key] : undefined;
  const wVal = wanted ? wanted[key] : undefined;
  if (isPlainObject(wVal)) {
    mergeNode(existing, wanted, sources, key, force, stats, details, dotPath);
    return;
  }
  const gapKind = isGap(existingVal, hasExisting, dotPath);
  const concrete = isConcreteWanted(wVal, dotPath);
  if (gapKind) {
    if (concrete) {
      existing[key] = wVal;
      stats.filled += 1;
      details.push({ path: dotPath, action: 'filled', source: sourceFor(sources, dotPath), value: previewValue(wVal) });
    } else if (gapKind === 'missing') {
      // Optional key with no detection/default: leave absent silently.
      stats.skipped += 1;
      details.push({ path: dotPath, action: 'skipped', reason: 'no auto value; left missing' });
    } else {
      stats.unresolved += 1;
      details.push({ path: dotPath, action: 'unresolved', reason: 'no detection, schema default, or example value' });
    }
    return;
  }
  if (force && concrete) {
    if (JSON.stringify(existingVal) !== JSON.stringify(wVal)) {
      existing[key] = wVal;
      stats.overwritten += 1;
      details.push({ path: dotPath, action: 'overwritten', source: sourceFor(sources, dotPath), value: previewValue(wVal) });
    } else {
      stats.skipped += 1;
      details.push({ path: dotPath, action: 'skipped', reason: 'identical after --force' });
    }
    return;
  }
  stats.skipped += 1;
  details.push({ path: dotPath, action: 'skipped', reason: 'existing kept' });
}

function carryComments(existing, example, section, stats) {
  const visit = (exNode, curNode) => {
    for (const [k, v] of Object.entries(exNode)) {
      if (k.startsWith('_comment')) {
        if (!Object.prototype.hasOwnProperty.call(curNode, k)) {
          curNode[k] = v;
          stats.commentsAdded += 1;
        }
        continue;
      }
      if (isPlainObject(v) && isPlainObject(curNode[k])) visit(v, curNode[k]);
    }
  };
  if (section) {
    if (isPlainObject(example[section]) && isPlainObject(existing[section])) visit(example[section], existing[section]);
    return;
  }
  visit(example, existing);
}

function sourceFor(sources, dotPath) {
  if (sources[dotPath] !== undefined) return sources[dotPath];
  // Walk up to the nearest parent with a recorded source (whole-map copies).
  const parts = dotPath.split('.');
  for (let i = parts.length - 1; i > 0; i -= 1) {
    const parent = parts.slice(0, i).join('.');
    if (sources[parent] !== undefined) return sources[parent];
  }
  return 'auto';
}

function previewValue(v) {
  if (typeof v === 'string') return v.length > 80 ? `${v.slice(0, 77)}...` : v;
  if (typeof v === 'object') return Array.isArray(v) ? `array[${v.length}]` : 'object';
  return v;
}

function requiredGaps(config) {
  const gaps = [];
  if (!isConcreteWanted(getByPath(config, 'project.name'), 'project.name')) gaps.push('project.name');
  if (!isConcreteWanted(getByPath(config, 'project.baseBranch'), 'project.baseBranch')) gaps.push('project.baseBranch');
  if (!['github', 'azure-devops', 'local'].includes(getByPath(config, 'providers.active'))) gaps.push('providers.active');
  if (!['github', 'azure-devops'].includes(getByPath(config, 'providers.scm'))) gaps.push('providers.scm');
  if (!isConcreteWanted(getByPath(config, 'plans.dir'), 'plans.dir')) gaps.push('plans.dir');
  const v = config.verification || {};
  const hasVerify = ['backendBuild', 'backendTest', 'backendFormat', 'frontendBuild', 'frontendTest']
    .some((k) => typeof v[k] === 'string' && v[k].trim() && !isPlaceholderString(v[k]));
  if (!hasVerify) gaps.push('verification (at least one build/test command)');
  return gaps;
}

function main() {
  const args = parseArgs(process.argv);
  const ctx = resolveConsumerContext({ repoRoot: args.repoRoot || undefined, scriptFile: SCRIPT_FILE });
  const repoRoot = ctx.repoRoot;
  const sharedDir = ctx.sharedDir;
  const configPath = path.join(sharedDir, 'config.json');
  const examplePath = path.join(sharedDir, 'config.json.example');
  const schemaPath = path.join(sharedDir, 'config.schema.json');

  if (!fs.existsSync(examplePath)) {
    console.error(`ERROR: missing ${toRepoRelative(repoRoot, examplePath, { allowOutside: true })} (hub not installed)`);
    process.exit(2);
  }

  let createdFromExample = false;
  if (!fs.existsSync(configPath)) {
    if (args.dryRun) {
      createdFromExample = true;
    } else {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.copyFileSync(examplePath, configPath);
      createdFromExample = true;
    }
  }

  let config;
  try {
    config = args.dryRun && !fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(examplePath, 'utf8'))
      : JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error(`ERROR: could not read or parse ${configPath} (${err.message})`);
    process.exit(2);
  }
  let example;
  try {
    example = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
  } catch (err) {
    console.error(`ERROR: could not parse example ${examplePath} (${err.message})`);
    process.exit(2);
  }
  let schema = { properties: {} };
  try {
    if (fs.existsSync(schemaPath)) schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch {
    schema = { properties: {} };
  }

  const { wanted, sources } = buildWanted(repoRoot, example, schema);
  const stats = { filled: 0, skipped: 0, overwritten: 0, unresolved: 0, commentsAdded: 0 };
  const details = [];
  mergeAuto(config, wanted, sources, schema, example, args.section, args.force, stats, details);

  const gaps = requiredGaps(args.section ? { ...config } : config);
  const sectionGaps = args.section
    ? gaps.filter((g) => g === args.section || g.startsWith(`${args.section}.`) || (args.section === 'verification' && g.startsWith('verification')))
    : gaps;
  const ok = sectionGaps.length === 0;

  let written = false;
  if (!args.dryRun) {
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    written = true;
  }

  const result = {
    ok,
    repoRoot: toRepoRelative(repoRoot, repoRoot),
    configPath: toRepoRelative(repoRoot, configPath, { allowOutside: true }),
    section: args.section,
    force: args.force,
    dryRun: args.dryRun,
    written,
    createdFromExample,
    stats,
    requiredGaps: gaps,
    changes: details.filter((d) => d.action === 'filled' || d.action === 'overwritten'),
    skipped: details.filter((d) => d.action === 'skipped').length,
    unresolved: details.filter((d) => d.action === 'unresolved').map((d) => d.path),
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log(`auto-configure ${args.section || 'all'}: filled=${stats.filled} overwritten=${stats.overwritten} skipped=${stats.skipped} unresolved=${stats.unresolved} written=${written}`);
    for (const c of result.changes) console.log(`  + ${c.path} (${c.source})`);
    if (result.unresolved.length) {
      console.log('unresolved (no detection/default — fill manually):');
      for (const u of result.unresolved) console.log(`  ? ${u}`);
    }
    if (!ok) console.log(`required gaps remain: ${gaps.join(', ')}`);
  }
  if (!ok) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error(`ERROR: ${err && err.message ? err.message : err}`);
  process.exit(2);
}
