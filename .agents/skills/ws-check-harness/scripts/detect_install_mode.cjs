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
const { HUB_REL, inside, resolveGlobalSkillsRoot } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const LOCAL_SKILLS_REL = path.join('.agents', 'skills');
const SKILL_ID_RE = /^ws-[a-z0-9][a-z0-9-]*$/;

// Root identity (AC10-AC12): resolve, then canonicalize on disk when possible, and keep the
// resolved absolute path when canonicalization is impossible (missing root, ACL, junction loop).
function canonicalizeForCompare(target) {
  const resolved = path.resolve(target);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    try {
      return fs.realpathSync(resolved);
    } catch {
      return resolved;
    }
  }
}

// Case-insensitive only where the host filesystem is (win32), matching the
// GIT_PATH_CASE_INSENSITIVE / trackedKey() precedent in workflow_state.cjs.
function sameRootPath(left, right) {
  const a = canonicalizeForCompare(left);
  const b = canonicalizeForCompare(right);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function listSkillIds(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SKILL_ID_RE.test(entry.name))
    .filter((entry) => fs.existsSync(path.join(dir, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
}

function frontmatterVersion(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    const match = text.match(/^version:\s*(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

// Version sources are untrusted on-disk input (AC19, AC20): parse defensively and accept only
// major.minor.patch semver before any value is reported.
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const REPRESENTATIVE_SKILL_IDS = ['ws-check-harness', 'ws-tdah', 'ws-spec-to-pr', 'ws-senior-developer'];
const GLOBAL_VERSION_FILE_REL = path.join('ws-shared', 'version.json');
const GLOBAL_MANIFEST_REL = path.join('ws-shared', 'runtime', 'skill-dependencies.json');

function readJsonIfPossible(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function semverOrNull(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return SEMVER_RE.test(text) ? text : null;
}

function externalSkillIds(files) {
  const ids = new Set();
  for (const file of files) {
    const parsed = file ? readJsonIfPossible(file) : null;
    if (!parsed) continue;
    const entries = Array.isArray(parsed.externalSkills) ? parsed.externalSkills : [];
    for (const entry of entries) {
      const id = entry && typeof entry === 'object' ? entry.id : entry;
      if (typeof id === 'string' && id.trim()) ids.add(id.trim());
    }
  }
  return ids;
}

// AC28: the read stays inside the resolved global skills root; SKILL_ID_RE already refuses
// separators, `.`/`..` ids and non-package folder names from the directory listing.
function readFrontmatterVersionInRoot(root, id) {
  if (!SKILL_ID_RE.test(id)) return null;
  const file = path.join(root, id, 'SKILL.md');
  if (!inside(file, root)) return null;
  return semverOrNull(frontmatterVersion(file));
}

// Precedence (AC16-AC23): canonical hub version file -> shipped projection manifest ->
// package-owned frontmatter (representative probe order, then package-scoped modal) -> null.
function resolveGlobalVersion(globalRoot, globalIds, markers) {
  const versionFile = readJsonIfPossible(path.join(globalRoot, GLOBAL_VERSION_FILE_REL));
  const hubVersion = versionFile ? semverOrNull(versionFile.version) : null;
  if (hubVersion) return hubVersion;

  const projection = readJsonIfPossible(path.join(globalRoot, GLOBAL_MANIFEST_REL));
  const projectionVersion = projection ? semverOrNull(projection.packageVersion) : null;
  if (projectionVersion) return projectionVersion;

  const external = externalSkillIds([
    markers ? markers.skillDependencies : null,
    path.join(globalRoot, GLOBAL_MANIFEST_REL),
  ]);
  const packageOwned = globalIds.filter((id) => !external.has(id));

  for (const id of REPRESENTATIVE_SKILL_IDS) {
    if (!packageOwned.includes(id)) continue;
    const version = readFrontmatterVersionInRoot(globalRoot, id);
    if (version) return version;
  }

  const counts = new Map();
  for (const id of packageOwned) {
    const version = readFrontmatterVersionInRoot(globalRoot, id);
    if (version) counts.set(version, (counts.get(version) || 0) + 1);
  }
  let best = null;
  for (const [version, count] of counts) if (!best || count > best.count) best = { version, count };
  return best ? best.version : null;
}

function pathIfExists(file) {
  return fs.existsSync(file) ? file : null;
}

function relativeIfInside(root, value) {
  if (!value) return null;
  const relative = path.relative(root, value).replace(/\\/g, '/');
  return relative && !relative.startsWith('..') ? relative : null;
}

function detect(repoRoot) {
  const root = path.resolve(repoRoot);
  const localRoot = path.join(root, LOCAL_SKILLS_REL);
  const globalRoot = resolveGlobalSkillsRoot();
  const hubRoot = path.join(root, HUB_REL);

  const localIds = listSkillIds(localRoot);
  const globalIds = listSkillIds(globalRoot);
  const markers = {
    skillDependencies: pathIfExists(path.join(root, 'bin', 'skill-dependencies.json')),
    cli: pathIfExists(path.join(root, 'bin', 'cli.js')),
  };
  const markersPresent = Boolean(markers.skillDependencies && markers.cli);
  const sotPresent = localIds.length > 0;
  const mode = markersPresent && sotPresent ? 'upstream' : sotPresent || globalIds.length > 0 ? 'consumer' : 'none';

  const rootsCoincide = sameRootPath(localRoot, globalRoot);

  let scope = 'none';
  if (mode === 'upstream') scope = 'upstream';
  else if (mode === 'consumer') {
    if (rootsCoincide && localIds.length + globalIds.length > 0) scope = 'global';
    else if (localIds.length > 0 && globalIds.length > 0) scope = 'hybrid';
    else if (localIds.length > 0) scope = 'project';
    else scope = 'global';
  }

  const scanRoots = [];
  if (mode === 'upstream' || scope === 'project') scanRoots.push(LOCAL_SKILLS_REL.replace(/\\/g, '/'));
  else if (scope === 'hybrid') scanRoots.push(LOCAL_SKILLS_REL.replace(/\\/g, '/'), '{globalSkillsRoot}');
  else if (scope === 'global') scanRoots.push('{globalSkillsRoot}');

  const projectHubCandidates = [
    path.join(hubRoot, 'AGENTS.md'),
    path.join(hubRoot, 'runtime', 'AGENTS.md'),
    path.join(hubRoot, 'config.json'),
    path.join(hubRoot, 'templates', 'config.json.example'),
  ];
  const projectHubFiles = projectHubCandidates.filter((file) => fs.existsSync(file));
  const globalHubFiles = [
    path.join(globalRoot, 'ws-shared', 'AGENTS.md'),
    path.join(globalRoot, 'ws-shared', 'runtime', 'AGENTS.md'),
    path.join(globalRoot, 'ws-shared', 'config.json'),
  ].filter((file) => fs.existsSync(file));

  let primaryHub = null;
  let primaryHubSource = null;
  if (mode === 'upstream') {
    primaryHub = pathIfExists(path.join(root, 'AGENTS.md'));
    primaryHubSource = primaryHub ? 'project' : null;
  } else if (projectHubFiles.length > 0) {
    primaryHub = projectHubFiles[0];
    primaryHubSource = 'project';
  } else if (globalHubFiles.length > 0) {
    primaryHub = globalHubFiles[0];
    primaryHubSource = 'global';
  }

  const packageVersion = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version || null;
    } catch {
      return null;
    }
  })();
  const globalVersion = resolveGlobalVersion(globalRoot, globalIds, markers);

  const globalPresent = globalIds.length > 0;
  const coexistence = {
    globalPresent,
    globalSkillsRoot: globalRoot,
    globalSkillCount: globalIds.length,
    globalVersion,
    packageVersion,
    globalVersionDrift: null,
    globalIdsOutsidePackage: null,
  };
  if (globalPresent && packageVersion && globalVersion) {
    if (globalVersion === packageVersion) coexistence.globalVersionDrift = 'same';
    else {
      const toNum = (v) => String(v).split('.').map((part) => Number(part) || 0);
      const [ga, gb, gc] = toNum(globalVersion);
      const [pa, pb, pc] = toNum(packageVersion);
      const diff = ga - pa || gb - pb || gc - pc;
      coexistence.globalVersionDrift = diff < 0 ? 'behind' : diff > 0 ? 'ahead' : 'same';
    }
  }
  let manifestUnreadable = false;
  if (globalPresent && markersPresent && sotPresent) {
    const packageIds = new Set(localIds);
    let externalIds = new Set();
    try {
      externalIds = new Set(
        (JSON.parse(fs.readFileSync(markers.skillDependencies, 'utf8')).externalSkills || []).map((entry) => entry.id),
      );
    } catch {
      manifestUnreadable = true;
    }
    coexistence.globalIdsOutsidePackage = globalIds.filter((id) => !packageIds.has(id) && !externalIds.has(id));
  }

  const notes = [];
  const warnings = [];
  if (manifestUnreadable) {
    warnings.push('Package manifest bin/skill-dependencies.json is unreadable; coexistence outside-package ids unknown.');
  }
  if (markersPresent && !sotPresent) {
    warnings.push(
      mode === 'consumer'
        ? 'Package markers present without SoT under .agents/skills; classified consumer (markers alone are not upstream evidence).'
        : 'Package markers present without SoT under .agents/skills and no global install; classified none (no skills found).',
    );
  }
  if (mode === 'none') {
    warnings.push('No ws-* SKILL.md found under .agents/skills or {globalSkillsRoot}; install the package or run from a package root.');
  }
  if (mode === 'consumer' && projectHubFiles.length === 0 && globalHubFiles.length === 0) {
    warnings.push('No shared hub found (.ws/ project hub or global ws-shared); run ws-configure-project after install.');
  }
  if (mode === 'consumer' && scope === 'global') {
    notes.push('Global-only install: skill bodies resolve from {globalSkillsRoot}; project hub config still wins when present.');
  }
  if (rootsCoincide) {
    notes.push('Local and global skills roots resolve to the same directory ({globalSkillsRoot}); reported as one global install tree, never hybrid.');
  }
  if (scope === 'hybrid') {
    notes.push('Hybrid install: {skillsRoot} bodies override {globalSkillsRoot}; do not flag duplicate name: entries across trees.');
  }
  if (mode === 'upstream' && globalPresent) {
    notes.push(`Upstream SoT wins; global install coexists (${globalIds.length} skills, version ${globalVersion || 'unknown'}). Scan only .agents/skills and never merge/compare duplicate ids as collisions.`);
    if (coexistence.globalVersionDrift && coexistence.globalVersionDrift !== 'same') {
      notes.push(`Global install version ${globalVersion} differs from package ${packageVersion} (${coexistence.globalVersionDrift}); informational only (invoke-vs-edit rule governs which tree an agent reads).`);
    }
    if ((coexistence.globalIdsOutsidePackage || []).length > 0) {
      notes.push(`Global ids outside this package: ${coexistence.globalIdsOutsidePackage.join(', ')}. Run installer update to prune retired folders; not an upstream harness finding.`);
    }
  }
  if (mode === 'upstream' && !globalPresent) {
    notes.push('No global ws-* install detected; upstream SoT is the only tree.');
  }
  if (mode !== 'upstream' && globalVersion && packageVersion && coexistence.globalVersionDrift && coexistence.globalVersionDrift !== 'same') {
    notes.push(`Global install version ${globalVersion} differs from package ${packageVersion} (${coexistence.globalVersionDrift}); informational only, run installer update to align.`);
  }

  return {
    schemaVersion: 1,
    repoRoot: '.',
    installMode: mode,
    installScope: scope,
    skillsScanRoots: scanRoots,
    primaryHub: relativeIfInside(root, primaryHub) || (primaryHub ? '{globalSkillsRoot}/' + path.relative(globalRoot, primaryHub).replace(/\\/g, '/') : null),
    primaryHubSource,
    integrityGate: mode === 'upstream' ? 'required' : 'skip',
    evidence: {
      packageMarkers: { skillDependencies: Boolean(markers.skillDependencies), cli: Boolean(markers.cli) },
      sotPresent,
      localSkills: { root: LOCAL_SKILLS_REL.replace(/\\/g, '/'), count: localIds.length },
      globalSkills: { root: '{globalSkillsRoot}', resolved: globalRoot, count: globalIds.length, version: globalVersion },
      projectHubPresent: projectHubFiles.length > 0,
      globalHubPresent: globalHubFiles.length > 0,
    },
    coexistence,
    warnings,
    notes,
  };
}

function main() {
  const argv = process.argv.slice(2);
  let json = false;
  let repoRoot = process.cwd();
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--json') json = true;
    else if (argv[index] === '--repo-root') repoRoot = argv[++index];
    else throw new Error(`unknown argument: ${argv[index]}`);
  }
  const report = detect(repoRoot);
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  const lines = [
    `Install mode: ${report.installMode}`,
    `Install scope: ${report.installScope}`,
    `Skills scan root: ${report.skillsScanRoots.join(', ') || '(none)'}`,
    `Primary hub: ${report.primaryHub || '(none)'}${report.primaryHubSource ? ` (${report.primaryHubSource})` : ''}`,
    `Integrity gate: ${report.integrityGate}`,
    `Local skills: ${report.evidence.localSkills.count} under ${report.evidence.localSkills.root}`,
    `Global skills: ${report.evidence.globalSkills.count} under {globalSkillsRoot}${report.evidence.globalSkills.version ? ` (v${report.evidence.globalSkills.version})` : ''}`,
  ];
  for (const note of report.notes) lines.push(`Note: ${note}`);
  for (const warning of report.warnings) lines.push(`Warning: ${warning}`);
  process.stdout.write(`${lines.join('\n')}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
