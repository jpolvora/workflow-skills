#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { HUB_REL, resolveGlobalSkillsRoot } = require('../../ws-shared/runtime/scripts/resolve_consumer_root.cjs');

const LOCAL_SKILLS_REL = path.join('.agents', 'skills');
const SKILL_ID_RE = /^ws-[a-z0-9][a-z0-9-]*$/;

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

  let scope = 'none';
  if (mode === 'upstream') scope = 'upstream';
  else if (mode === 'consumer') {
    if (localIds.length > 0 && globalIds.length > 0) scope = 'hybrid';
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
  const representativeVersions = ['ws-check-harness', 'ws-tdah', 'ws-spec-to-pr', 'ws-senior-developer'];
  const globalVersion = (() => {
    for (const id of representativeVersions) {
      const version = frontmatterVersion(path.join(globalRoot, id, 'SKILL.md'));
      if (version) return version;
    }
    const counts = new Map();
    for (const id of globalIds) {
      const version = frontmatterVersion(path.join(globalRoot, id, 'SKILL.md'));
      if (version) counts.set(version, (counts.get(version) || 0) + 1);
    }
    let best = null;
    for (const [version, count] of counts) if (!best || count > best.count) best = { version, count };
    return best ? best.version : null;
  })();

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
    warnings.push('Package markers present without SoT under .agents/skills; classified consumer (markers alone are not upstream evidence).');
  }
  if (mode === 'none') {
    warnings.push('No ws-* SKILL.md found under .agents/skills or {globalSkillsRoot}; install the package or run from a package root.');
  }
  if (mode === 'consumer' && projectHubFiles.length === 0 && globalHubFiles.length === 0) {
    warnings.push('No ws-shared hub found (project or global); run ws-configure-project after install.');
  }
  if (mode === 'consumer' && scope === 'global') {
    notes.push('Global-only install: skill bodies resolve from {globalSkillsRoot}; project hub config still wins when present.');
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
