#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import { spawnSync } from 'child_process';
import readline from 'readline/promises';
import { fileURLToPath } from 'url';
import {
  HUB_WHITELIST,
  HUB_DEST_ALIASES,
  HUB_LAYOUT,
  isHubBackupArtifact,
  INSTALLED_SKILLS_FILE,
  SKILL_INTEGRITY_LOCAL_FILE,
  CONSUMER_OWNED_HUB_FILES,
  CONSUMER_OWNED_DIRS,
  SKIP_INSTALL_FILES,
  shouldSkipInstallEntry,
  isConsumerOwnedEntry,
  isBlockedInstallTarget,
  findWorkflowSkillsSourceRoot,
  resolveGlobalSkillsDir,
  resolveTargetSkillsDir,
  getHomeDir,
  isHomeDirectory,
  ensureWriteableDir,
  GLOBAL_HOST_TARGETS,
  getGlobalHostTargets,
  resolveHostTargetPath,
  detectExistingSecondaryTargets,
  computeTargetPreselectIds,
  projectSkillToTarget,
  getGeminiSkillsJsonPath,
  readGeminiSkillsJson,
  upsertGeminiSkillsJsonEntry,
  removeGeminiSkillsJsonEntry,
  cleanupLegacyGeminiSkills,
} from './install-rules.js';
import {
  MANIFEST_REL,
  HUB_DIR as INTEGRITY_HUB_DIR,
  buildLocalRecord,
  buildSkillEntry,
  buildHubEntry,
  evaluateVersionAndDigestCheck,
  loadJson,
  localIntegrityPath,
  verifyClosure,
  writeJsonStable,
} from './skill-integrity-lib.js';
import {
  pruneRetiredConsumerArtifacts,
  RETIRED_HUB_FILES,
  RETIRED_SKILL_DIRS,
  RETIRED_BARE_IDS,
  listRetiredManifestIds,
  stripRetiredConfigKeys,
} from './consumer-migration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageRoot = path.resolve(__dirname, '..');
const packageSkillsDir = path.join(packageRoot, '.agents', 'skills');
const skillGraphPath = fs.existsSync(path.join(packageRoot, 'bin', 'skill-dependencies.json'))
  ? path.join(packageRoot, 'bin', 'skill-dependencies.json')
  : path.join(packageRoot, '.agents', 'skills', 'ws-shared', 'runtime', 'skill-dependencies.json');
const integrityManifestPath = path.join(packageRoot, MANIFEST_REL);

const hasExplicitScopeFlag =
  process.argv.includes('--global') ||
  process.argv.includes('-g') ||
  process.argv.includes('--project') ||
  process.argv.includes('-p');

let targetDir = process.cwd();
let isGlobalScope = process.argv.includes('--global') || process.argv.includes('-g');

if (!hasExplicitScopeFlag && isHomeDirectory(targetDir)) {
  isGlobalScope = true;
}

let targetSkillsDir = resolveTargetSkillsDir({ isGlobal: isGlobalScope, targetDir });
let targetAgentsDir = path.dirname(targetSkillsDir);

function setScope(isGlobal, customDir = process.cwd()) {
  isGlobalScope = !!isGlobal;
  targetDir = path.resolve(customDir);
  targetSkillsDir = resolveTargetSkillsDir({ isGlobal: isGlobalScope, targetDir });
  targetAgentsDir = path.dirname(targetSkillsDir);
}

const CONFIG_FILE = 'config.json';
const HUB_DIR = 'ws-shared';
const PROJECT_HUB_DIR = '.ws';
function consumerHubDir() {
  if (isGlobalScope) return path.join(targetSkillsDir, HUB_DIR);
  return path.join(path.resolve(targetDir), PROJECT_HUB_DIR);
}
function legacyHubDir() {
  return path.join(targetSkillsDir, HUB_DIR);
}
function hubPresent() {
  if (fs.existsSync(consumerHubDir())) return true;
  return !isGlobalScope && fs.existsSync(legacyHubDir());
}
function hubDisplay() {
  return isGlobalScope ? 'ws-shared/' : '.ws/';
}
/**
 * Managed ws-shared content (runtime + templates) always lives in the skills
 * install: `{skillsRoot}/ws-shared` (project) or `{globalSkillsRoot}/ws-shared`
 * (global). It is never installed into the consumer hub (`.ws/runtime` banned).
 */
function managedHubDir() {
  return path.join(targetSkillsDir, HUB_DIR);
}
function managedDisplay() {
  return isGlobalScope ? 'ws-shared/' : '.agents/skills/ws-shared/';
}
/** Consumer-owned names that may live in a legacy pre-move skills-tree hub. */
const LEGACY_CONSUMER_HUB_NAMES = [
  CONFIG_FILE,
  `${CONFIG_FILE}.bak`,
  'config.local.json',
  'STACK.md',
  'stack.md',
  'MEMORY.md',
  'memory',
  'CHANGELOG.md',
  INSTALLED_SKILLS_FILE,
  SKILL_INTEGRITY_LOCAL_FILE,
  'host-capabilities.json',
  'backend.md',
  'frontend.md',
];
if (HUB_DIR !== INTEGRITY_HUB_DIR) {
  throw new Error('HUB_DIR mismatch between cli and skill-integrity-lib');
}

function packageHubPath(categoryName, relativePath) {
  const roots = HUB_LAYOUT.categories?.[categoryName]?.roots;
  if (!Array.isArray(roots) || roots.length !== 1) {
    throw new Error(`Invalid ws-shared layout: expected one root for ${categoryName}`);
  }
  return path.join(packageSkillsDir, HUB_DIR, roots[0], relativePath);
}

/**
 * Consumer-owned artifacts under the project hub (.ws/) — never copy upstream content into consumers.
 * Fresh install seeds config.json + STACK.md; existing consumer files are preserved.
 * MEMORY.md / CHANGELOG.md default to the repo root (rules.memoryDir / rules.changelogFile);
 * legacy hub copies are preserved as fallback but never seeded fresh.
 * Installer never writes consumer repo-root files (e.g. root AGENTS.md) — host/consumer-owned only.
 */

/**
 * Thin local hub pointer for global-hybrid trees (us-272 AC3).
 * Seeded only when the project-local hub exists without AGENTS.md
 * (e.g. hand-stripped local hub beside a global install). Normal updates
 * already refresh AGENTS.md from HUB_WHITELIST; this covers the residual
 * missing-file edge. Portable tokens only — no absolute paths.
 */
const LOCAL_HUB_POINTER_MD = `# Shared — Workflow Config & Consumer Data Hub (local pointer)

This is the project-local entrypoint for the consumer hub (\`.ws/\`). Managed hub content (runtime contracts, schemas, scripts, templates) resolves from the project skills install (\`{skillsRoot}/ws-shared/\`) when present, otherwise from \`{globalSkillsRoot}/ws-shared/\`. This folder keeps project-local config only. Project consumer data lives in this folder (\`config.json\`, \`STACK.md\`, \`installed-skills.json\`); MEMORY/changelog live at their configured locations (defaults: repo-root \`MEMORY.md\` + \`memory/\`, repo-root \`CHANGELOG.md\`).

- Full hub contract: \`{skillsRoot}/ws-shared/runtime/AGENTS.md\` (global fallback \`{globalSkillsRoot}/ws-shared/runtime/AGENTS.md\`).
- Config always resolves project-local first: \`$PWD/.ws/config.json\` overrides the global hub.
- \`rules.harness\` default (\`.ws/AGENTS.md\`) resolves to this file; follow the canonical runtime link above. Run installer \`update\` to refresh this pointer.
`;

/** Hub-root autoload link prefixes (managed runtime lives in the skills install). */
function managedRuntimeLinkPrefix() {
  return isGlobalScope ? 'runtime/' : '../.agents/skills/ws-shared/runtime/';
}
function managedSkillLinkPrefix() {
  return isGlobalScope ? '../' : '../.agents/skills/';
}
function renderConsumerAutoloadText(text) {
  const runtimePrefix = managedRuntimeLinkPrefix();
  for (const runtimeFile of [
    'AGENTS.md',
    'CROSS-PLATFORM.md',
    'config-resolution.md',
    'gates.md',
    'host-dispatch.md',
    'scm-provider-contract.md',
    'setup.md',
    'tools.md',
  ]) {
    text = text.split(`](${runtimeFile})`).join(`](${runtimePrefix}${runtimeFile})`);
  }
  return text.replace(/\]\(\.\.\/\.\.\/(ws-[^)]+)\)/g, `](${managedSkillLinkPrefix()}$1)`);
}

function renderConsumerAutoload(sourcePath) {
  return renderConsumerAutoloadText(fs.readFileSync(sourcePath, 'utf8'));
}

/** Root host pointers are consumer/host-owned — installer never seeds or overwrites them. */

let skillGraph = null;

function loadSkillGraph() {
  if (skillGraph) return skillGraph;
  if (!fs.existsSync(skillGraphPath)) {
    console.error(`Error: skill dependency map not found at ${skillGraphPath}`);
    process.exit(1);
  }
  skillGraph = JSON.parse(fs.readFileSync(skillGraphPath, 'utf8'));
  return skillGraph;
}

/** Spec-memo companions and other foreign skill ids — not this package's membership. */
function loadExternalSkillIds(graph = loadSkillGraph()) {
  const raw = graph.externalSkills || [];
  return new Set(
    raw
      .map((item) => (typeof item === 'string' ? item : item && item.id))
      .filter((id) => typeof id === 'string' && id)
  );
}

function excludeExternalSkillIds(names, graph = loadSkillGraph()) {
  const external = loadExternalSkillIds(graph);
  return names.filter((name) => !external.has(name));
}

function listSkillDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => {
    return fs.statSync(path.join(dir, name)).isDirectory();
  });
}

/** Top-level dirs with SKILL.md, excluding the ws-shared/ hub. */
function listInstallableSkills(dir = packageSkillsDir) {
  return listSkillDirs(dir)
    .filter((name) => name !== HUB_DIR)
    .filter((name) => fs.existsSync(path.join(dir, name, 'SKILL.md')))
    .sort((a, b) => a.localeCompare(b));
}

function resolveTransitiveDeps(skillName, graph = loadSkillGraph(), seen = new Set()) {
  if (seen.has(skillName)) return seen;
  seen.add(skillName);
  const deps = graph.dependencies?.[skillName] || [];
  for (const dep of deps) {
    resolveTransitiveDeps(dep, graph, seen);
  }
  return seen;
}

function installedSkillsManifestPath() {
  return path.join(consumerHubDir(), INSTALLED_SKILLS_FILE);
}

/** Disk scan: top-level skill folders with SKILL.md (excludes ws-shared/).
 * Foreign trees listed in skill-dependencies.json `externalSkills` (e.g. spec-memo
 * `ws-memo`) are not this package's membership and must not be bootstrapped into
 * installed-skills.json or pruned as managed extras solely because they are untracked.
 */
function scanInstalledSkillsOnDisk() {
  if (!fs.existsSync(targetSkillsDir)) return [];
  return excludeExternalSkillIds(listInstallableSkills(targetSkillsDir));
}

function readInstalledSkillsManifest() {
  const p = installedSkillsManifestPath();
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const skills = Array.isArray(data.skills)
      ? excludeExternalSkillIds(
        [...new Set(data.skills.filter((s) => typeof s === 'string' && s && s !== HUB_DIR))]
      ).sort()
      : [];
    let selected = Array.isArray(data.selected)
      ? excludeExternalSkillIds(
        [...new Set(data.selected.filter((s) => typeof s === 'string' && s && s !== HUB_DIR))]
      )
      : null;
    // Legacy / bootstrap: if selected missing, treat all skills as roots.
    if (!selected) selected = [...skills];
    selected = selected.filter((s) => skills.includes(s)).sort((a, b) => a.localeCompare(b));
    const globalTargets = Array.isArray(data.globalTargets) ? data.globalTargets : [];
    return { version: data.version || 1, updatedAt: data.updatedAt || null, skills, selected, globalTargets };
  } catch {
    console.warn(`Warning: could not parse ${INSTALLED_SKILLS_FILE}; will rebootstrap.`);
    return null;
  }
}

/**
 * Merge-on-write for recorded secondary global targets by target id.
 * Incoming entries win per id; an empty incoming list preserves existing.
 */
function mergeGlobalTargets(existing = [], incoming = []) {
  if (!incoming.length) return existing;
  const byId = new Map(existing.map((t) => [t.id, t]));
  for (const t of incoming) byId.set(t.id, { ...byId.get(t.id), ...t });
  return [...byId.values()];
}

function writeInstalledSkillsManifest(skillNames, selectedNames = null, globalTargets = null) {
  const destShared = consumerHubDir();
  ensureWriteableDir(destShared);
  const skills = excludeExternalSkillIds(
    [...new Set(skillNames.filter((s) => s && s !== HUB_DIR))]
  ).sort((a, b) => a.localeCompare(b));
  const selectedSource = selectedNames == null ? skills : selectedNames;
  const selected = [...new Set(selectedSource.filter((s) => skills.includes(s)))].sort((a, b) =>
    a.localeCompare(b)
  );
  const existing = readInstalledSkillsManifest();
  const effectiveTargets = globalTargets !== null
    ? mergeGlobalTargets(existing?.globalTargets || [], globalTargets)
    : (existing?.globalTargets || []);
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    skills,
    selected,
    ...(effectiveTargets.length > 0 ? { globalTargets: effectiveTargets } : {}),
  };
  fs.writeFileSync(installedSkillsManifestPath(), `${JSON.stringify(payload, null, 2)}\n`);
  return { skills, selected, globalTargets: effectiveTargets };
}

/**
 * Load or bootstrap manifest. `extraSkills` merges into skills; `extraSelected` merges into selected roots.
 * `replaceWith` / `replaceSelected` replace entirely when provided.
 */
function syncInstalledSkillsManifest({
  extraSkills = [],
  extraSelected = [],
  replaceWith = null,
  replaceSelected = null,
  globalTargets = null,
} = {}) {
  const existing = readInstalledSkillsManifest();
  let skills;
  let selected;
  if (Array.isArray(replaceWith)) {
    skills = replaceWith;
    selected = Array.isArray(replaceSelected) ? replaceSelected : replaceWith;
  } else {
    const baseSkills = existing ? existing.skills : scanInstalledSkillsOnDisk();
    // Do not treat a disk scan as selected roots — callers pass extraSelected / replaceSelected.
    const baseSelected = existing ? existing.selected : [];
    skills = [...baseSkills, ...extraSkills];
    selected = [...baseSelected, ...extraSelected];
  }
  return writeInstalledSkillsManifest(skills, selected, globalTargets);
}

/**
 * Resolves secondary global host targets from CLI arguments or preset list.
 * Excludes canonical target (~/.agents/skills) which is always the primary installation root.
 */
function resolveSecondaryTargets(targetsList, symlink = true) {
  if (!isGlobalScope || !targetsList || targetsList.length === 0) return [];
  const allHostTargets = getGlobalHostTargets();
  const isAll = targetsList.some((t) => t.toLowerCase() === 'all');
  const secondary = [];

  for (const host of allHostTargets) {
    if (host.id === 'canonical') continue;
    if (isAll || targetsList.some((t) => t.toLowerCase() === host.id.toLowerCase())) {
      secondary.push({
        id: host.id,
        name: host.name,
        path: host.path,
        symlink,
        bestEffort: false,
      });
    }
  }

  for (const raw of targetsList) {
    const lower = raw.toLowerCase();
    if (lower === 'all' || lower === 'canonical') continue;
    if (!allHostTargets.some((h) => h.id.toLowerCase() === lower)) {
      secondary.push({
        id: path.basename(raw),
        name: path.basename(raw),
        path: path.resolve(raw),
        symlink,
        bestEffort: false,
      });
    }
  }
  return secondary;
}

function resolveTargetHomeDir(target) {
  try {
    const envHome = getHomeDir();
    if (target.path && (target.path === envHome || target.path.startsWith(envHome + path.sep))) return envHome;
  } catch {}
  if (target.path) {
    return path.dirname(path.dirname(path.dirname(target.path)));
  }
  return getHomeDir();
}

/**
 * Projects installed skills to secondary global targets using symlinks/junctions (with copy fallback).
 * Targets flagged `bestEffort: true` (auto-detected, never explicitly requested)
 * are isolated: a projection failure warns and continues so one broken
 * secondary never aborts the canonical install/update. Explicit targets stay
 * fail-closed and throw.
 */
function projectSkillsToSecondaryTargets(skillNames, secondaryTargets) {
  if (!Array.isArray(secondaryTargets) || secondaryTargets.length === 0) return;
  console.log(`\nProjecting skills to ${secondaryTargets.length} secondary global target(s)...`);
  for (const target of secondaryTargets) {
    if (target.id === 'gemini') {
      const homeDir = resolveTargetHomeDir(target);
      const jsonPath = getGeminiSkillsJsonPath(homeDir);
      console.log(`  Target [gemini]: ${jsonPath} (skills.json entries)`);
      try {
        const globalDir = resolveGlobalSkillsDir();
        const defaultDir = path.join(homeDir, '.agents', 'skills');
        const entryPath = path.resolve(globalDir) === path.resolve(defaultDir)
          ? '~/.agents/skills'
          : globalDir;
        upsertGeminiSkillsJsonEntry(homeDir, { path: entryPath, include_only: ['ws-*'] });
        const cleaned = cleanupLegacyGeminiSkills(homeDir);
        if (cleaned > 0) {
          console.log(`    Cleaned up ${cleaned} legacy skill junction(s)/folder(s) from ~/.gemini/config/skills.`);
        }
      } catch (err) {
        if (target.bestEffort === true) {
          console.log(`    Warning: Skipping auto-detected target [gemini]: ${err.message}`);
          continue;
        }
        throw err;
      }
      continue;
    }

    const targetPath = target.path;
    const useSymlink = target.symlink !== false;
    const typeLabel = useSymlink ? (process.platform === 'win32' ? 'junction' : 'symlink') : 'copy';
    console.log(`  Target [${target.id}]: ${targetPath} (${typeLabel})`);
    try {
      ensureWriteableDir(targetPath);
    } catch (err) {
      if (target.bestEffort === true) {
        console.log(`    Warning: Skipping auto-detected target [${target.id}]: ${err.message}`);
        continue;
      }
      throw err;
    }

    try {
      for (const skillName of skillNames) {
        const srcSkill = path.join(targetSkillsDir, skillName);
        const destSkill = path.join(targetPath, skillName);
        if (!fs.existsSync(srcSkill)) continue;

        const result = projectSkillToTarget(srcSkill, destSkill, {
          symlink: useSymlink,
          copyFn: (s, d) => syncManagedSkillDir(s, d),
        });

        if (result.fallback) {
          console.log(`    Note: Symlink failed for '${skillName}' (${result.error}). Fell back to directory copy.`);
        }
      }
    } catch (err) {
      if (target.bestEffort === true) {
        console.log(`    Warning: Skipping auto-detected target [${target.id}]: ${err.message}`);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Removes uninstalled skills from secondary global targets (symlink or copy).
 * Only removes exact `<target>/<skillName>` entries; never touches the canonical tree.
 */
function removeSkillsFromSecondaryTargets(skillNames, secondaryTargets) {
  if (!Array.isArray(skillNames) || skillNames.length === 0) return 0;
  if (!Array.isArray(secondaryTargets) || secondaryTargets.length === 0) return 0;
  let removedCount = 0;
  for (const target of secondaryTargets) {
    if (!target) continue;
    if (target.id === 'gemini') {
      try {
        const homeDir = resolveTargetHomeDir(target);
        const globalDir = resolveGlobalSkillsDir();
        const defaultDir = path.join(homeDir, '.agents', 'skills');
        const entryPath = path.resolve(globalDir) === path.resolve(defaultDir)
          ? '~/.agents/skills'
          : globalDir;
        const res = removeGeminiSkillsJsonEntry(homeDir, entryPath);
        if (res.removed) {
          removedCount++;
        }
        removedCount += cleanupLegacyGeminiSkills(homeDir);
      } catch (err) {
        console.log(`    Note: Could not remove gemini skills.json entry: ${err.message}`);
      }
      continue;
    }
    if (!target.path) continue;
    for (const skillName of skillNames) {
      const destSkill = path.join(target.path, skillName);
      try {
        const stat = fs.lstatSync(destSkill);
        if (stat.isSymbolicLink()) {
          fs.unlinkSync(destSkill);
          removedCount++;
        } else if (stat.isDirectory()) {
          fs.rmSync(destSkill, { recursive: true, force: true });
          removedCount++;
        } else if (stat.isFile()) {
          fs.unlinkSync(destSkill);
          removedCount++;
        }
      } catch (err) {
        if (err?.code !== 'ENOENT') {
          console.log(`    Note: Could not remove '${skillName}' from [${target.id}]: ${err.message}`);
        }
      }
    }
  }
  return removedCount;
}

/**
 * Compute uninstall set using selected roots:
 * reverse-cascade dependents of named skills, then keep = closure(remaining selected).
 */
function computeUninstallSet(installed, selected, named) {
  const installedSet = new Set(installed);
  const selectedSet = new Set(selected.filter((s) => installedSet.has(s)));
  const toRemove = new Set(named.filter((n) => installedSet.has(n)));

  // Reverse cascade: remove anything that transitively depends on a removed skill.
  let changed = true;
  while (changed) {
    changed = false;
    for (const skill of installedSet) {
      if (toRemove.has(skill)) continue;
      const deps = resolveTransitiveDeps(skill);
      for (const d of deps) {
        if (d !== skill && toRemove.has(d)) {
          toRemove.add(skill);
          changed = true;
          break;
        }
      }
    }
  }

  const remainingSelected = [...selectedSet].filter((s) => !toRemove.has(s));
  const keep = new Set();
  for (const r of remainingSelected) {
    for (const d of resolveTransitiveDeps(r)) {
      if (installedSet.has(d)) keep.add(d);
    }
  }

  const remove = [...installedSet].filter((s) => !keep.has(s)).sort((a, b) => a.localeCompare(b));
  const keepList = [...keep].sort((a, b) => a.localeCompare(b));
  const keepSelected = remainingSelected.sort((a, b) => a.localeCompare(b));
  return { remove, keep: keepList, keepSelected };
}

function rmSkillDir(skillName) {
  const destPath = path.join(targetSkillsDir, skillName);
  if (!fs.existsSync(destPath)) return false;
  fs.rmSync(destPath, { recursive: true, force: true });
  return true;
}

/** Skills in `selectedNames` that are not dependencies of another selected skill. */
function inferSelectedRoots(selectedNames) {
  return selectedNames.filter((s) => {
    return !selectedNames.some((other) => {
      if (other === s) return false;
      const deps = resolveTransitiveDeps(other);
      return deps.has(s);
    });
  });
}

function applyPackageSelection(packageKey, skills, selected) {
  const graph = loadSkillGraph();
  const pkg = graph.packages?.[packageKey];
  if (!pkg) return;

  if (pkg.select === 'all-skills') {
    selected.fill(true);
  } else if (Array.isArray(pkg.skills)) {
    selected.fill(false);
    for (const name of pkg.skills) {
      const idx = skills.indexOf(name);
      if (idx >= 0) selected[idx] = true;
    }
  }
  applyTransitiveDeps(skills, selected);
}

function applyTransitiveDeps(skills, selected) {
  const toAdd = new Set();
  for (let i = 0; i < skills.length; i++) {
    if (!selected[i]) continue;
    for (const dep of resolveTransitiveDeps(skills[i])) {
      toAdd.add(dep);
    }
  }
  for (const dep of toAdd) {
    const idx = skills.indexOf(dep);
    if (idx >= 0) selected[idx] = true;
  }
}

function shouldEnsureHub(selectedNames) {
  const graph = loadSkillGraph();
  const workflows = new Set(graph.packages?.workflows?.skills || []);
  return selectedNames.some(
    (n) => n === 'ws-spec-to-pr' || n === 'ws-spec-to-pr-lite' || workflows.has(n)
  );
}

/**
 * Ensure config.json has pathTokens.skillsRoot / sharedDir (non-destructive merge).
 * Existing keys win; missing block or keys get install defaults.
 */
function ensurePathTokensInConfig(configPath) {
  if (!fs.existsSync(configPath)) return;
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return;
  }
  const defaults = {
    _comment:
      'Fixed install layout — expand brace tokens before tool calls. See {skillsRoot}/ws-shared/runtime/tools.md § Path tokens.',
    skillsRoot: '.agents/skills',
    sharedDir: '.ws',
  };
  const prev = cfg.pathTokens && typeof cfg.pathTokens === 'object' ? cfg.pathTokens : null;
  if (prev && typeof prev.skillsRoot === 'string' && prev.skillsRoot && typeof prev.sharedDir === 'string' && prev.sharedDir) {
    if (prev.sharedDir === '.agents/skills/ws-shared') {
      prev.sharedDir = '.ws';
      cfg.pathTokens = { ...prev };
      fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`);
      console.log(`    Migrated pathTokens.sharedDir from legacy ws-shared/ to .ws/`);
    }
    return;
  }
  cfg.pathTokens = {
    ...defaults,
    ...(prev || {}),
    skillsRoot: (prev && prev.skillsRoot) || defaults.skillsRoot,
    sharedDir: (prev && prev.sharedDir) || defaults.sharedDir,
  };
  fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`);
  console.log(`    Ensured ${hubDisplay()}config.json pathTokens ({skillsRoot}, {sharedDir})`);
}

function deepMergeConfig(templateObj, userObj) {
  if (!userObj || typeof userObj !== 'object' || Array.isArray(userObj)) {
    return userObj !== undefined ? userObj : templateObj;
  }
  if (!templateObj || typeof templateObj !== 'object' || Array.isArray(templateObj)) {
    return userObj;
  }

  const result = {};

  for (const [key, templateVal] of Object.entries(templateObj)) {
    if (!(key in userObj)) {
      result[key] = templateVal;
    } else {
      const userVal = userObj[key];
      if (
        templateVal &&
        userVal &&
        typeof templateVal === 'object' &&
        typeof userVal === 'object' &&
        !Array.isArray(templateVal) &&
        !Array.isArray(userVal)
      ) {
        result[key] = deepMergeConfig(templateVal, userVal);
      } else {
        result[key] = userVal;
      }
    }
  }

  for (const [key, userVal] of Object.entries(userObj)) {
    if (!(key in result)) {
      result[key] = userVal;
    }
  }

  return result;
}

function upgradeConfigToLatestFormat(templateObj, userObj) {
  const merged = deepMergeConfig(templateObj, userObj);

  // Managed runtime lives in the skills install: point editor-facing config
  // references at `{skillsRoot}/ws-shared/runtime` (project) instead of a
  // retired `.ws/runtime` copy. Global hub config keeps hub-relative paths.
  const runtimePrefix = isGlobalScope ? './runtime/' : '../.agents/skills/ws-shared/runtime/';
  if (merged.$schema) {
    merged.$schema = `${runtimePrefix}config.schema.json`;
  }
  if (merged.toolsFile && (merged.toolsFile === 'tools.md' || merged.toolsFile === './tools.md')) {
    merged.toolsFile = 'runtime/tools.md';
  }
  if (merged.toolsFile === 'runtime/tools.md') {
    merged.toolsFile = isGlobalScope ? 'runtime/tools.md' : `${runtimePrefix}tools.md`;
  }

  const prevTokens = (userObj && typeof userObj === 'object' && userObj.pathTokens) || {};
  const prevSharedDir = prevTokens.sharedDir === '.agents/skills/ws-shared' ? '.ws' : prevTokens.sharedDir;
  merged.pathTokens = {
    _comment:
      'Fixed install layout (not relocatable). Expand brace tokens before Read/Grep/Shell. Full contract: runtime/tools.md § Path tokens. plansDir/reviewsDir still resolve from plans.dir / reviews.dir.',
    skillsRoot: prevTokens.skillsRoot || '.agents/skills',
    sharedDir: prevSharedDir || '.ws',
    ...(merged.pathTokens || {}),
  };
  if (merged.pathTokens.sharedDir === '.agents/skills/ws-shared') merged.pathTokens.sharedDir = '.ws';

  const { cfg: stripped } = stripRetiredConfigKeys(merged);
  return stripped;
}

/**
 * Seed/preserve consumer-owned hub artifacts under the project hub (.ws/):
 * config.json, STACK.md, plus legacy MEMORY.md / memory/ / CHANGELOG.md when present.
 * Fresh installs do not seed MEMORY/CHANGELOG under the hub (defaults are repo-root);
 * the skills create those files on first use. Existing legacy copies are preserved as fallback.
 * Never writes consumer repo-root files (root AGENTS.md stays host/consumer-owned).
 */
/**
 * Extract consumer-owned hub artifacts from a legacy pre-move skills-tree hub
 * (`.agents/skills/ws-shared/`) into the project hub (`.ws/`). Managed content
 * (runtime/, templates/, flat managed docs) stays in the skills tree, where it
 * is refreshed from the package. Never writes consumer repo-root files.
 */
function relocateLegacyHub() {
  if (isGlobalScope) return;
  const legacy = legacyHubDir();
  const dest = consumerHubDir();
  if (!fs.existsSync(legacy)) return;
  if (path.resolve(legacy) === path.resolve(dest)) return;
  fs.mkdirSync(dest, { recursive: true });
  const moved = [];
  for (const name of LEGACY_CONSUMER_HUB_NAMES) {
    const source = path.join(legacy, name);
    const target = path.join(dest, name);
    if (!fs.existsSync(source) || fs.existsSync(target)) continue;
    fs.renameSync(source, target);
    moved.push(name);
  }
  if (moved.length > 0) {
    console.log(`    Extracted legacy ws-shared/ consumer data to .ws/ (${moved.join(', ')})`);
  }
}

function ensureSharedConsumerArtifacts(mode = 'install') {
  const destShared = consumerHubDir();
  ensureWriteableDir(destShared);

  const memoryDir = path.join(destShared, 'memory');

  const configPath = path.join(destShared, CONFIG_FILE);
  const configBakPath = path.join(destShared, `${CONFIG_FILE}.bak`);
  const templatePath = packageHubPath('templates', 'config.json.example');

  if (fs.existsSync(configPath)) {
    let existingConfig = null;
    let rawConfig = null;
    try {
      rawConfig = fs.readFileSync(configPath, 'utf8');
      existingConfig = JSON.parse(rawConfig);
    } catch (err) {
      console.warn(`    Warning: Could not parse ${hubDisplay()}config.json as JSON: ${err.message}`);
    }

    if (rawConfig) {
      fs.writeFileSync(configBakPath, rawConfig);
      console.log(`    Backed up ${hubDisplay()}config.json → ${hubDisplay()}config.json.bak`);
    }

    let templateConfig = null;
    if (fs.existsSync(templatePath)) {
      try {
        templateConfig = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
      } catch {
        /* ignore fallback */
      }
    }

    if (existingConfig && templateConfig) {
      const upgraded = upgradeConfigToLatestFormat(templateConfig, existingConfig);
      fs.writeFileSync(configPath, `${JSON.stringify(upgraded, null, 2)}\n`);
      console.log(`    Updated ${hubDisplay()}config.json to latest format (preserved user values)`);
    } else {
      console.log(`    Preserved existing ${hubDisplay()}config.json`);
    }
  } else {
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, configPath);
      console.log(`    Seeded ${hubDisplay()}config.json from config.json.example (run ws-configure-project to fill)`);
      ensurePathTokensInConfig(configPath);
    }
  }

  const memMd = path.join(destShared, 'MEMORY.md');
  if (fs.existsSync(memMd) || fs.existsSync(memoryDir)) {
    ensureWriteableDir(memoryDir);
    console.log(`    Preserved existing ${hubDisplay()}MEMORY.md + memory/ (legacy fallback; default memory dir is now repo root)`);
  }

  const stackPath = path.join(destShared, 'STACK.md');
  // Latest layout: STACK.md. Rename legacy ws-shared/stack.md when that exact casing is present.
  {
    const names = fs.readdirSync(destShared);
    if (names.includes('stack.md') && !names.includes('STACK.md')) {
      fs.renameSync(path.join(destShared, 'stack.md'), stackPath);
      console.log(`    Renamed ${hubDisplay()}stack.md → ${hubDisplay()}STACK.md`);
    } else if (names.includes('stack.md') && names.includes('STACK.md')) {
      fs.unlinkSync(path.join(destShared, 'stack.md'));
      console.log(`    Removed obsolete ${hubDisplay()}stack.md`);
    }
  }
  if (fs.existsSync(stackPath)) {
    console.log(`    Preserved existing ${hubDisplay()}STACK.md`);
  } else {
    const example = packageHubPath('templates', 'STACK.md.example');
    if (fs.existsSync(example)) {
      fs.copyFileSync(example, stackPath);
      console.log(`    Seeded ${hubDisplay()}STACK.md from STACK.md.example`);
    }
  }

  const changelogPath = path.join(destShared, 'CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
    console.log(`    Preserved existing ${hubDisplay()}CHANGELOG.md (legacy fallback; default is now repo-root CHANGELOG.md)`);
  }
}



function afterSkillCopy(skillName, destPath) {
  // Hub consumer artifacts are seeded when the hub is ensured (workflows / full).
  // Also seed when installing ws-self-learning alone so memory works without a workflow.
  if (skillName === 'ws-self-learning') {
    ensureSharedHubInstalled(
      hubPresent() ? 'update' : 'install'
    );
  }
}

function copyDirSync(src, dest) {
  ensureWriteableDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Never copy consumer-owned files/dirs from upstream (MEMORY.md, memory/, config.json).
    if (SKIP_INSTALL_FILES.has(entry.name) || shouldSkipInstallEntry(entry.name)) {
      continue;
    }
    if (isConsumerOwnedEntry(entry.name, entry.isDirectory())) {
      if (entry.isDirectory() && CONSUMER_OWNED_DIRS.has(entry.name)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      continue;
    }

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Remove dest-only managed files/dirs so update matches upstream layout.
 * Leaves consumer-owned names (config.json, MEMORY.md, memory/) untouched.
 */
function pruneManagedSkillExtras(src, dest) {
  if (!fs.existsSync(dest)) return;
  const entries = fs.readdirSync(dest, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_INSTALL_FILES.has(entry.name) || shouldSkipInstallEntry(entry.name)) {
      continue;
    }
    if (isConsumerOwnedEntry(entry.name, entry.isDirectory())) {
      continue;
    }
    const destPath = path.join(dest, entry.name);
    const srcPath = path.join(src, entry.name);
    if (!fs.existsSync(srcPath)) {
      fs.rmSync(destPath, { recursive: true, force: true });
      continue;
    }
    if (entry.isDirectory()) {
      pruneManagedSkillExtras(srcPath, destPath);
      // Drop empty leftover dirs after nested prune
      try {
        if (fs.readdirSync(destPath).length === 0) {
          fs.rmSync(destPath, { recursive: true, force: true });
        }
      } catch {
        /* ignore race / gone */
      }
    }
  }
}

/**
 * Managed skill packages: overlay upstream files, then prune retired managed paths.
 * Consumer-owned skill-local files (config.json / MEMORY.md / memory/) are preserved.
 * Hub consumer data is handled separately via ensureSharedHubInstalled.
 */
function syncManagedSkillDir(src, dest) {
  copyDirSync(src, dest);
  pruneManagedSkillExtras(src, dest);
}

function sameManagedEntry(source, destination) {
  if (!fs.existsSync(source) || !fs.existsSync(destination)) return false;
  const sourceStat = fs.statSync(source);
  const destinationStat = fs.statSync(destination);
  if (sourceStat.isDirectory() !== destinationStat.isDirectory()) return false;
  if (sourceStat.isDirectory()) {
    const sourceNames = fs.readdirSync(source).sort();
    const destinationNames = fs.readdirSync(destination).sort();
    if (sourceNames.length !== destinationNames.length) return false;
    return sourceNames.every((name, index) =>
      name === destinationNames[index] &&
      sameManagedEntry(path.join(source, name), path.join(destination, name))
    );
  }
  return fs.readFileSync(source).equals(fs.readFileSync(destination));
}

/** Case-insensitive dedup key for legacy hub paths (Windows stack.md.example === STACK.md.example). */
function legacyHubSourceKey(filePath) {
  return path.resolve(filePath).toLowerCase();
}

function isGeneratedHubEntrypoint(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  return (
    content.includes('project-local entrypoint') ||
    content.includes('global-hybrid install') ||
    content.includes('Full hub contract:')
  );
}

function migrateLegacyFlatHub(destShared) {
  if (!fs.existsSync(destShared)) return;

  const legacyPaths = HUB_LAYOUT.legacyPaths || {};
  for (const retiredName of RETIRED_HUB_FILES) {
    const retiredPath = path.join(destShared, retiredName);
    if (fs.existsSync(retiredPath)) {
      fs.rmSync(retiredPath, { recursive: true, force: true });
      console.log(`    Removed obsolete ${hubDisplay()}${retiredName}`);
    }
  }
  for (const name of fs.readdirSync(destShared)) {
    if (!isHubBackupArtifact(name)) continue;
    const artifactPath = path.join(destShared, name);
    fs.rmSync(artifactPath, { recursive: true, force: true });
    console.log(`    Removed ${hubDisplay()}backup artifact: ${name}`);
  }
  const allowedRootNames = new Set([
    'runtime',
    'templates',
    '.gitignore',
    'config.local.json',
    'stack.md',
    ...Object.keys(legacyPaths),
    ...Object.values(HUB_LAYOUT.categories || {})
      .flatMap((category) => category.paths || [])
      .filter((entry) => !entry.includes('/')),
  ]);
  const unknown = fs.readdirSync(destShared).filter((name) => !allowedRootNames.has(name));
  if (unknown.length > 0) {
    console.log(`    Preserved custom ws-shared entries: ${unknown.join(', ')}`);
  }

  const moves = [];
  const queuedSources = new Set();
  for (const [legacyName, canonicalName] of Object.entries(legacyPaths)) {
    const source = path.join(destShared, legacyName);
    const destination = path.join(destShared, canonicalName);
    if (!fs.existsSync(source)) continue;
    // AGENTS.md is now a generated local pointer. Keep an existing pointer;
    // only migrate the old full hub document.
    if (legacyName === 'AGENTS.md' && isGeneratedHubEntrypoint(source)) continue;
    // autoload.md is generated/consumer-local at the hub root. The managed
    // runtime copy is installed separately and must not replace local policy.
    if (legacyName === 'autoload.md') continue;
    if (path.resolve(source) === path.resolve(destination)) continue;
    const sourceKey = legacyHubSourceKey(source);
    if (queuedSources.has(sourceKey)) continue;
    queuedSources.add(sourceKey);
    if (fs.existsSync(destination)) {
      moves.push({ source, destination, removeOnly: true });
      continue;
    }
    moves.push({ source, destination, removeOnly: false });
  }

  for (const move of moves) {
    if (!fs.existsSync(move.source)) continue;
    if (move.removeOnly) {
      fs.rmSync(move.source, { recursive: true, force: true });
      console.log(`    Removed obsolete flat ${hubDisplay()}${path.relative(destShared, move.source).replace(/\\/g, '/')}`);
      continue;
    }
    fs.mkdirSync(path.dirname(move.destination), { recursive: true });
    fs.renameSync(move.source, move.destination);
    console.log(
      `    Migrated ${hubDisplay()}${path.relative(destShared, move.source).replace(/\\/g, '/')} → ` +
      `${hubDisplay()}${path.relative(destShared, move.destination).replace(/\\/g, '/')}`
    );
  }
}

/**
 * Install/update the consumer hub (templates/docs). Preserves consumer-owned hub files.
 * Seeds config.json + STACK.md when missing; preserves legacy MEMORY.md / CHANGELOG.md.
 * Never overwrites existing consumer config/MEMORY/STACK/CHANGELOG.
 * Never writes outside `.agents/skills/` (no consumer root AGENTS.md / host pointers).
 */
function ensureSharedHubInstalled(mode = 'install') {
  const srcShared = path.join(packageSkillsDir, HUB_DIR);
  relocateLegacyHub();
  const destShared = consumerHubDir();
  const destManaged = managedHubDir();
  if (!fs.existsSync(srcShared)) return;

  fs.mkdirSync(destShared, { recursive: true });
  fs.mkdirSync(destManaged, { recursive: true });
  migrateLegacyFlatHub(destManaged);
  retireProjectHubManagedContent(destShared);

  for (const name of HUB_WHITELIST) {
    const srcPath = path.join(srcShared, name);
    if (!fs.existsSync(srcPath)) continue;
    const destName = HUB_DEST_ALIASES[name] || name;
    const destPath = path.join(destManaged, destName);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
      pruneManagedSkillExtras(srcPath, destPath);
    } else if (CONSUMER_OWNED_HUB_FILES.has(destName) && fs.existsSync(destPath)) {
      console.log(`    Skipped (preserved): ${managedDisplay()}${destName}`);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  // Aliased source names (for example templates/hub.gitignore) are package
  // inputs only; consumers receive their declared destination in the hub root.
  for (const sourceName of Object.keys(HUB_DEST_ALIASES)) {
    const stalePath = path.join(destShared, sourceName);
    if (stalePath !== destShared && fs.existsSync(stalePath)) {
      fs.rmSync(stalePath, { recursive: true, force: true });
    }
    const staleManagedPath = path.join(destManaged, sourceName);
    if (staleManagedPath !== destManaged && fs.existsSync(staleManagedPath)) {
      fs.rmSync(staleManagedPath, { recursive: true, force: true });
    }
  }
  for (const [sourceName, destinationName] of Object.entries(HUB_DEST_ALIASES)) {
    const sourcePath = path.join(srcShared, sourceName);
    if (!fs.existsSync(sourcePath)) continue;
    for (const base of new Set([destManaged, destShared])) {
      const destinationPath = path.join(base, destinationName);
      if (CONSUMER_OWNED_HUB_FILES.has(destinationName) && fs.existsSync(destinationPath)) {
        continue;
      }
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }

  // Drop obsolete lowercase template only when it is a distinct file (case-sensitive FS).
  // On Windows / case-insensitive volumes, stack.md.example === STACK.md.example — never unlink.
  for (const templateDir of [destShared, path.join(destManaged, 'templates')]) {
    if (!fs.existsSync(templateDir)) continue;
    const names = fs.readdirSync(templateDir);
    if (names.includes('stack.md.example') && names.includes('STACK.md.example')) {
      fs.unlinkSync(path.join(templateDir, 'stack.md.example'));
      console.log(`    Removed obsolete stack.md.example`);
    }
  }

  // Never overwrite consumer config.json / STACK.md / MEMORY.md / CHANGELOG.md from upstream
  ensureSharedConsumerArtifacts(mode);
  const autoloadPath = path.join(destShared, 'autoload.md');
  const autoloadSource = packageHubPath('runtime', 'autoload.md');
  const staleAutoload = fs.existsSync(autoloadPath) &&
    [...RETIRED_SKILL_DIRS, ...RETIRED_BARE_IDS].some((id) => {
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`).test(fs.readFileSync(autoloadPath, 'utf8'));
    });
  if (fs.existsSync(autoloadSource) && (!fs.existsSync(autoloadPath) || staleAutoload)) {
    fs.writeFileSync(autoloadPath, renderConsumerAutoload(autoloadSource));
    if (staleAutoload) console.log(`    Refreshed stale ${hubDisplay()}autoload.md`);
  } else if (fs.existsSync(autoloadPath)) {
    const currentAutoload = fs.readFileSync(autoloadPath, 'utf8');
    const renderedAutoload = renderConsumerAutoloadText(currentAutoload);
    if (renderedAutoload !== currentAutoload) {
      fs.writeFileSync(autoloadPath, renderedAutoload);
      console.log(`    Refreshed ${hubDisplay()}autoload.md links`);
    }
  }
  pruneRetiredConsumerArtifacts(fs, path, { skillsDir: targetSkillsDir, sharedDir: destShared });
  // Seed or refresh the thin local entrypoint (`.ws/AGENTS.md`). Generated
  // pointers are refreshed so upgrades stop citing retired `.ws/runtime` paths;
  // consumer-authored files are left untouched. Never writes repo-root files.
  const hubPointerPath = path.join(destShared, 'AGENTS.md');
  if (!fs.existsSync(hubPointerPath)) {
    fs.writeFileSync(hubPointerPath, LOCAL_HUB_POINTER_MD);
    console.log(`    Seeded thin local ${hubDisplay()}AGENTS.md pointer to the managed hub`);
  } else if (isGeneratedHubEntrypoint(hubPointerPath)) {
    const currentPointer = fs.readFileSync(hubPointerPath, 'utf8');
    if (currentPointer !== LOCAL_HUB_POINTER_MD) {
      fs.writeFileSync(hubPointerPath, LOCAL_HUB_POINTER_MD);
      console.log(`    Refreshed ${hubDisplay()}AGENTS.md pointer to the managed hub`);
    }
  }
  if (!isGlobalScope) {
    const globalDir = resolveGlobalSkillsDir();
    if (
      path.resolve(globalDir) !== path.resolve(targetSkillsDir) &&
      fs.existsSync(globalDir)
    ) {
      console.log('  Checking global skills root for retired artifacts...');
      pruneRetiredConsumerArtifacts(fs, path, { skillsDir: globalDir });
    }
  }

  console.log(
    `  ${hubDisplay()} hub ${mode === 'update' ? 'updated' : 'installed'} (consumer config/MEMORY/stack/CHANGELOG preserved)`
  );
}

/**
 * Retire managed hub copies from the project consumer hub (`.ws/runtime`,
 * `.ws/templates`, and flat legacy managed docs). Managed content lives only
 * in the skills install (`{skillsRoot}|{globalSkillsRoot}/ws-shared/`).
 */
function retireProjectHubManagedContent(destShared) {
  if (isGlobalScope) return;
  for (const name of ['runtime', 'templates']) {
    const stale = path.join(destShared, name);
    if (fs.existsSync(stale)) {
      fs.rmSync(stale, { recursive: true, force: true });
      console.log(`    Removed obsolete ${hubDisplay()}${name}/ (managed content lives in ${managedDisplay()})`);
    }
  }
  for (const legacyName of Object.keys(HUB_LAYOUT.legacyPaths || {})) {
    if (legacyName === 'AGENTS.md' || legacyName === 'autoload.md') continue;
    if (LEGACY_CONSUMER_HUB_NAMES.includes(legacyName)) continue;
    const stale = path.join(destShared, legacyName);
    if (fs.existsSync(stale)) {
      fs.rmSync(stale, { recursive: true, force: true });
      console.log(`    Removed obsolete ${hubDisplay()}${legacyName} (managed content lives in ${managedDisplay()})`);
    }
  }
}

/** Block installing into the source package itself (except test/ consumer). */
function assertNotSelfOverwrite() {
  const dest = isGlobalScope ? resolveGlobalSkillsDir() : path.resolve(targetDir);
  const root = path.resolve(packageRoot);

  if (!isBlockedInstallTarget(dest, root)) return;

  const sourceRoot = findWorkflowSkillsSourceRoot(dest);
  console.error('Error: Refusing to install into the workflow-skills source repository.');
  console.error(`  CLI package:  ${root}`);
  console.error(`  Current dir:  ${path.resolve(targetDir)}`);
  if (sourceRoot && sourceRoot !== root) {
    console.error(`  Detected upstream source root at: ${sourceRoot}`);
    console.error('  Remote npx cannot install into the canonical upstream repo.');
  }
  console.error('Run this command from a consumer project, or from the test/ folder.');
  console.error('Upstream maintainers: use `node bin/cli.js` locally (not npx) under test/ only.');
  process.exit(1);
}

function getLocalVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function loadUpstreamIntegrityManifest() {
  if (!fs.existsSync(integrityManifestPath)) {
    console.error(`Error: integrity manifest missing at ${integrityManifestPath}`);
    console.error('Regenerate with: npm run generate-integrity');
    process.exit(1);
  }
  return loadJson(integrityManifestPath);
}

function willIncludeHub(selectedNames) {
  return (
    shouldEnsureHub(selectedNames) || hubPresent()
  );
}

function printIntegrityMismatches(mismatches) {
  for (const m of mismatches) {
    console.error(`  - ${m.path} (${m.reason})`);
  }
}

/**
 * Pre-copy source verify for the closure about to be installed/updated.
 * Fail-closed unless forceIntegrity. Does not copy anything.
 */
function preVerifySourceIntegrity(skillIds, { includeHub, force }) {
  const manifest = loadUpstreamIntegrityManifest();
  const result = verifyClosure({
    skillsDir: packageSkillsDir,
    manifest,
    skillIds,
    includeHub,
  });
  if (result.ok) {
    console.log(
      `Integrity: source OK (${skillIds.length} skill(s)${includeHub ? ' + hub' : ''})`
    );
    return manifest;
  }
  console.error('Integrity: source package mismatch vs bin/skill-integrity.json');
  printIntegrityMismatches(result.mismatches);
  if (force) {
    console.warn('Integrity: continuing due to --force-integrity (unsafe)');
    return manifest;
  }
  console.error('Aborting before any skill copy. Re-run with --force-integrity to override (unsafe).');
  process.exit(1);
}

/**
 * Post-copy consumer verify + write skill-integrity-local.json.
 * On mismatch: exit ≠0, no automatic rollback (tree may already be overwritten).
 * Local record is written only on verify OK or --force-integrity (never bless a failed tree).
 */
function postVerifyAndWriteLocal(skillIds, { includeHub, force, manifest }) {
  const expected = manifest || loadUpstreamIntegrityManifest();
  const result = verifyClosure({
    skillsDir: targetSkillsDir,
    manifest: expected,
    skillIds,
    includeHub,
    hubDir: managedHubDir(),
  });

  if (result.ok) {
    const isFull =
      listInstallableSkills(packageSkillsDir).length === skillIds.length && includeHub;
    const record = buildLocalRecord({
      packageVersion: expected.packageVersion || getLocalVersion(),
      fullPackageDigest: isFull ? expected.fullPackageDigest : null,
      skillIds,
      actualSkills: result.actualSkills,
      actualHub: result.actualHub,
    });
    const destShared = consumerHubDir();
    if (fs.existsSync(destShared) || includeHub) {
      fs.mkdirSync(destShared, { recursive: true });
      writeJsonStable(localIntegrityPath(targetSkillsDir, destShared), record);
      console.log(`Integrity: wrote ${hubDisplay()}${SKILL_INTEGRITY_LOCAL_FILE}`);
    }
    console.log(
      `Integrity: consumer OK (${skillIds.length} skill(s)${includeHub ? ' + hub' : ''})`
    );
    return;
  }

  console.error('Integrity: consumer tree mismatch after copy (no automatic rollback)');
  printIntegrityMismatches(result.mismatches);

  if (force) {
    // Unsafe override: baseline the actual on-disk digests so audit matches what landed.
    const actualSkills = {};
    for (const id of skillIds) {
      const root = path.join(targetSkillsDir, id);
      if (fs.existsSync(root)) actualSkills[id] = buildSkillEntry(root);
    }
    let actualHub = null;
    if (includeHub && fs.existsSync(managedHubDir())) {
      actualHub = buildHubEntry(managedHubDir());
    }
    const isFull =
      listInstallableSkills(packageSkillsDir).length === skillIds.length && includeHub;
    const record = buildLocalRecord({
      packageVersion: expected.packageVersion || getLocalVersion(),
      fullPackageDigest: isFull ? expected.fullPackageDigest : null,
      skillIds,
      actualSkills,
      actualHub,
    });
    const destShared = consumerHubDir();
    if (fs.existsSync(destShared) || includeHub) {
      fs.mkdirSync(destShared, { recursive: true });
      writeJsonStable(localIntegrityPath(targetSkillsDir, destShared), record);
      console.log(`Integrity: wrote ${hubDisplay()}${SKILL_INTEGRITY_LOCAL_FILE}`);
    }
    console.warn('Integrity: recorded actual digests due to --force-integrity (unsafe)');
    return;
  }

  process.exit(1);
}

/** Rewrite local integrity record for remaining installed skills (uninstall). */
function rewriteLocalIntegrityForRemaining(remainingSkillIds) {
  const localPath = localIntegrityPath(targetSkillsDir, consumerHubDir());
  const sharedExists = fs.existsSync(managedHubDir());
  if (!sharedExists) {
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    return;
  }
  if (remainingSkillIds.length === 0) {
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    return;
  }

  let prior = null;
  if (fs.existsSync(localPath)) {
    try {
      prior = loadJson(localPath);
    } catch {
      prior = null;
    }
  }

  const includeHub = prior?.hub != null;
  const actualSkills = {};
  for (const id of remainingSkillIds) {
    const root = path.join(targetSkillsDir, id);
    if (fs.existsSync(root)) actualSkills[id] = buildSkillEntry(root);
  }
  const actualHub = includeHub ? buildHubEntry(managedHubDir()) : null;
  const record = buildLocalRecord({
    packageVersion: prior?.packageVersion || getLocalVersion(),
    fullPackageDigest: null,
    skillIds: remainingSkillIds.filter((id) => actualSkills[id]),
    actualSkills,
    actualHub,
  });
  writeJsonStable(localPath, record);
  console.log(`Integrity: rewrote ${hubDisplay()}${SKILL_INTEGRITY_LOCAL_FILE} for remaining skills`);
}

function fetchRemoteJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('Request timeout')); });
    req.on('error', reject);
  });
}

function runIntegrityAudit() {
  const localPath = localIntegrityPath(targetSkillsDir, consumerHubDir());
  if (!fs.existsSync(localPath)) {
    console.error(`Error: missing ${hubDisplay()}${SKILL_INTEGRITY_LOCAL_FILE}`);
    console.error('Run install or update first to create the local integrity record.');
    process.exit(1);
  }
  const record = loadJson(localPath);
  const installed = readInstalledSkillsManifest();
  const skillIds = installed
    ? installed.skills
    : scanInstalledSkillsOnDisk();

  const mismatches = [];
  for (const id of skillIds) {
    const expected = record.skills?.[id];
    if (!expected) {
      mismatches.push({ path: id, reason: 'missing-from-local-record' });
      continue;
    }
    const skillRoot = path.join(targetSkillsDir, id);
    if (!fs.existsSync(skillRoot)) {
      mismatches.push({ path: id, reason: 'missing' });
      continue;
    }
    const actual = buildSkillEntry(skillRoot);
    for (const rel of Object.keys(expected.files || {}).sort()) {
      if (!actual.files[rel]) {
        mismatches.push({ path: `${id}/${rel}`, reason: 'missing' });
      } else if (actual.files[rel] !== expected.files[rel]) {
        mismatches.push({ path: `${id}/${rel}`, reason: 'digest-mismatch' });
      }
    }
    for (const rel of Object.keys(actual.files).sort()) {
      if (!expected.files?.[rel]) {
        mismatches.push({ path: `${id}/${rel}`, reason: 'extra' });
      }
    }
  }

  // Skills in record but not installed → skip (AC7)
  if (record.hub != null) {
    const actualHub = buildHubEntry(managedHubDir());
    for (const rel of Object.keys(record.hub.files || {}).sort()) {
      if (!actualHub.files[rel]) {
        mismatches.push({ path: `hub/${rel}`, reason: 'missing' });
      } else if (actualHub.files[rel] !== record.hub.files[rel]) {
        mismatches.push({ path: `hub/${rel}`, reason: 'digest-mismatch' });
      }
    }
    for (const rel of Object.keys(actualHub.files).sort()) {
      if (!record.hub.files?.[rel]) {
        mismatches.push({ path: `hub/${rel}`, reason: 'extra' });
      }
    }
  }

  if (mismatches.length === 0) {
    console.log(`Integrity audit OK (${skillIds.length} installed skill(s))`);
    process.exit(0);
  }
  console.error('Integrity audit FAILED:');
  printIntegrityMismatches(mismatches);
  process.exit(1);
}

function fetchRemoteVersion() {
  return new Promise((resolve, reject) => {
    const url = 'https://raw.githubusercontent.com/jpolvora/workflow-skills/main/package.json';
    const req = https.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const pkg = JSON.parse(data);
          resolve(pkg.version || '0.0.0');
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('Request timeout')); });
    req.on('error', reject);
  });
}

function runTelemetry(command = 'aggregate') {
  const scriptPath = path.join(__dirname, 'generate-telemetry-aggregate.cjs');
  if (!fs.existsSync(scriptPath)) {
    console.error(`Error: telemetry script not found at ${scriptPath}`);
    process.exit(1);
  }
  const result = spawnSync(process.execPath, command === 'report' ? [scriptPath, 'report'] : [scriptPath], {
    stdio: 'inherit',
    cwd: targetDir,
    env: process.env,
  });
  if (result.error) {
    console.error(`Error: failed to run telemetry aggregate: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

function printHelp() {
  console.log(`Usage:
  npx --yes github:jpolvora/workflow-skills              Interactive install
  npx --yes github:jpolvora/workflow-skills install --full --yes
  npx --yes github:jpolvora/workflow-skills install --package workflows --yes
  npx --yes github:jpolvora/workflow-skills install --skills ws-spec-to-pr,ws-goal-fix-pr --yes
  npx --yes github:jpolvora/workflow-skills update       Update installed skills (from the hub installed-skills.json)
  npx --yes github:jpolvora/workflow-skills update --include-new
      Also install upstream skill folders not yet present locally
  update --global [--targets <csv>] [--yes] [--symlink|--no-symlink]
      Interactive runs always prompt for host targets; --targets/--yes skip the prompt
  npx --yes github:jpolvora/workflow-skills uninstall --skills <csv> [--yes]
      Remove skills (+ cascade unused deps); never deletes consumer hub data
  npx --yes github:jpolvora/workflow-skills --version    Print installed version
  npx --yes github:jpolvora/workflow-skills --check      Compare version + fullPackageDigest vs main
  npx --yes github:jpolvora/workflow-skills integrity    Audit installed skills vs local integrity record
  npx --yes github:jpolvora/workflow-skills telemetry aggregate
      Regenerate {plansDir}/telemetry/aggregate.json from workflow state files
  npx --yes github:jpolvora/workflow-skills telemetry report
      Render a read-only Markdown summary with run and median telemetry
  npx --yes github:jpolvora/workflow-skills --help

Curl shim (same argv; requires Node.js):
  curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s --
  curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s -- install --full --yes
  curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s -- update
  curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s -- uninstall --skills ws-goal-fix-pr --yes

Non-interactive install:
  install --full|--package <key>|--skills <csv> [--yes] [--force-integrity] [--global] [--targets <csv>] [--symlink|--no-symlink]
  --yes  Overwrite existing skill dirs without prompts; always preserves consumer hub data
  --force-integrity  Unsafe: skip source/consumer integrity gates (still writes local record)
  --global, -g       Install globally into user home directory (~/.agents/skills)
  --targets <csv>    Global host targets: canonical, claude, codex, gemini, or custom paths (requires --global)
                     gemini configures declarative ~/.gemini/config/skills.json; claude and codex link skill folders.
                     Interactive --global install/update always prompts for host targets with recorded and
                     detected targets pre-selected (Enter keeps them). Piped stdin or --yes skips the prompt and
                     reuses recorded targets plus auto-detected host dirs (e.g. ~/.gemini for Antigravity).
                     Explicit --targets (even canonical-only) skips the prompt and auto-detect.
  --symlink          Link secondary global targets via directory symlinks/junctions (default)
  --no-symlink       Copy skill folders into secondary global targets instead of symlinking
  Non-TTY (CI/agents): --yes is required

Non-interactive uninstall:
  uninstall --skills <csv> [--yes]
  Removes named skills and any deps no longer required by remaining installed skills.
  Always preserves the consumer hub (config.json, MEMORY.md, STACK.md, CHANGELOG.md, installed-skills.json).

Interactive package shortcuts:
  f  Full package (all installable skills + consumer hub)
  w  Workflows package (orchestrators + pipeline deps + hub)
  e  Extra package (ws-write-a-skill, ws-show-harness, ws-preview, ws-run-benchmark)
  a  Select/deselect all
  #  Toggle individual skill (also selects transitive dependencies)
  y  Install selected skills

Notes:
  - Prefer: npx --yes github:jpolvora/workflow-skills (do NOT use github:…@latest or @main — npm exit 128).
  - Cache bust: clear the npx cache, then re-run with npx --yes (no @latest suffix on github:).
  - Skills under .agents/skills/ are overwritten on update/install --yes.
  - Consumer hub (.ws/ project-local, ws-shared/ under the global skills root) is installed with workflows/full (and when ws-self-learning is installed).
  - Consumer-owned under the hub (never copied from upstream): config.json, STACK.md, installed-skills.json, skill-integrity-local.json, plus legacy MEMORY.md, memory/*, CHANGELOG.md when present.
    Fresh install seeds config.json (from example) and STACK.md when missing; MEMORY/CHANGELOG default to the repo root and are created on first use; existing files are always preserved.
    installed-skills.json tracks managed skills for update/uninstall (bootstrapped from disk when missing).
    skill-integrity-local.json records digests after successful install/update (gitignored; never hashed).
  - Integrity: install/update verify source digests before copy and consumer digests after; mismatch exits ≠0 (no silent continue; --force-integrity is unsafe override). Post-copy failure does not auto-rollback.
  - Audit: integrity compares on-disk managed files to the hub skill-integrity-local.json. --check also compares fullPackageDigest when remote manifest is available (same trust as remote package.json).
  - Installer writes skills under .agents/skills/ and the consumer hub under .ws/ (project-local). Never creates/overwrites other consumer repo-root files (root AGENTS.md, host pointers).
  - Artifact paths (plans/reviews) come from consumer config.json (defaults: .agents/plans, .agents/codereviews) — not host-private folders.
  - Path tokens: config.json pathTokens.skillsRoot / sharedDir (defaults .agents/skills, .ws). Agents expand {skillsRoot}/{sharedDir}/{plansDir} per the hub runtime/tools.md before Read/Grep/Shell. Not relocatable.
  - Optional host pointer files are consumer-owned. Changelog defaults to repo-root CHANGELOG.md (rules.changelogFile); memory defaults to the repo root (rules.memoryDir).
  - Dependency map: bin/skill-dependencies.json (update when installer graph changes).
  - Consumer agent contract: .ws/AGENTS.md (installed with the consumer hub; no separate packaged index is copied).
  - After installing or updating, run the "ws-check-harness" skill to validate the harness.
  - Optional: run the "ws-configure-project" skill to interview/detect and fill .ws/config.json placeholders.
  - Install copies skip __pycache__ / *.pyc (not part of the skill surface).
  - Workflows use the executing session model at gates; switch via Pause → IDE/agent host → Resume (no --model/--model-chain).
  - install-skills.sh is a curl/bash shim that execs this CLI (or npx); prefer calling npx directly.
`);
}

/**
 * Parse `install` argv. Exactly one of --full / --package / --skills required.
 * --yes required when stdin is not a TTY.
 */
function parseInstallArgs(args) {
  const rest = args.slice(1);
  let yes = false;
  let full = false;
  let packageKey = null;
  let skillCsv = null;
  let forceIntegrity = false;
  let targets = null;
  let symlink = true;

  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--yes' || a === '-y') {
      yes = true;
      continue;
    }
    if (a === '--global' || a === '-g') {
      setScope(true);
      continue;
    }
    if (a === '--project' || a === '-p') {
      setScope(false);
      continue;
    }
    if (a === '--force-integrity') {
      forceIntegrity = true;
      continue;
    }
    if (a === '--full') {
      full = true;
      continue;
    }
    if (a === '--package') {
      packageKey = rest[++i];
      if (!packageKey) {
        console.error('Error: --package requires a key (workflows|extra|full)');
        process.exit(1);
      }
      continue;
    }
    if (a === '--skills') {
      skillCsv = rest[++i];
      if (!skillCsv) {
        console.error('Error: --skills requires a comma-separated list');
        process.exit(1);
      }
      continue;
    }
    if (a === '--targets') {
      const val = rest[++i];
      if (!val) {
        console.error('Error: --targets requires a comma-separated list of targets');
        process.exit(1);
      }
      targets = val.split(',').map((s) => s.trim()).filter(Boolean);
      continue;
    }
    if (a.startsWith('--targets=')) {
      targets = a.slice('--targets='.length).split(',').map((s) => s.trim()).filter(Boolean);
      continue;
    }
    if (a === '--symlink' || a === '--symlink=true') {
      symlink = true;
      continue;
    }
    if (a === '--no-symlink' || a === '--symlink=false') {
      symlink = false;
      continue;
    }
    if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
    console.error(`Error: Unknown install argument: ${a}`);
    console.error('Use: install --full|--package <key>|--skills <csv> [--yes] [--force-integrity] [--targets <csv>] [--symlink|--no-symlink]');
    process.exit(1);
  }

  const modes = [full, !!packageKey, !!skillCsv].filter(Boolean).length;
  if (modes !== 1) {
    console.error('Error: install requires exactly one of --full, --package <key>, or --skills <csv>');
    process.exit(1);
  }
  if (!process.stdin.isTTY && !yes) {
    console.error('Error: non-TTY install requires --yes');
    process.exit(1);
  }

  const validPackages = new Set(['full', 'workflows', 'extra']);
  if (packageKey != null && !validPackages.has(packageKey)) {
    console.error(`Error: Unknown package '${packageKey}'. Use full|workflows|extra.`);
    process.exit(1);
  }

  let skillNames = null;
  if (skillCsv) {
    skillNames = skillCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillNames.length === 0) {
      console.error('Error: --skills list is empty');
      process.exit(1);
    }
  }

  return { yes, full, packageKey, skillNames, forceIntegrity, targets, symlink };
}

function buildSelectedFromInstallOpts(skills, opts) {
  const selected = new Array(skills.length).fill(false);
  if (opts.full || opts.packageKey === 'full') {
    applyPackageSelection('full', skills, selected);
  } else if (opts.packageKey) {
    applyPackageSelection(opts.packageKey, skills, selected);
  } else if (opts.skillNames) {
    for (const name of opts.skillNames) {
      const idx = skills.indexOf(name);
      if (idx < 0) {
        console.error(`Error: Unknown skill '${name}'.`);
        process.exit(1);
      }
      selected[idx] = true;
    }
    applyTransitiveDeps(skills, selected);
  }
  return selected;
}

/** Shared post-selection install: copy skills and ws-shared hub. */
function installSelectedSkills(
  skills,
  selectedNames,
  { overwrite, forceIntegrity = false, secondaryTargets = [] }
) {
  let installedCount = 0;
  let hubEnsured = false;
  const includeHub = willIncludeHub(selectedNames);
  const manifest = preVerifySourceIntegrity(selectedNames, {
    includeHub,
    force: forceIntegrity,
  });

  for (const skillName of selectedNames) {
    const srcPath = path.join(packageSkillsDir, skillName);
    const destPath = path.join(targetSkillsDir, skillName);
    if (!fs.existsSync(srcPath)) continue;

    console.log(`Installing '${skillName}'...`);

    if (fs.existsSync(destPath)) {
      if (!overwrite) {
        console.log(`  Skipped: ${skillName}`);
        continue;
      }
      syncManagedSkillDir(srcPath, destPath);
      afterSkillCopy(skillName, destPath);
      console.log(`  Installed: ${skillName} -> .agents/skills/${skillName}`);
      installedCount++;
      continue;
    }

    copyDirSync(srcPath, destPath);
    afterSkillCopy(skillName, destPath);
    console.log(`  Installed: ${skillName} -> .agents/skills/${skillName}`);
    installedCount++;
  }

  relocateLegacyHub();
  if (shouldEnsureHub(selectedNames)) {
    ensureSharedHubInstalled(
      hubPresent() ? 'update' : 'install'
    );
    hubEnsured = true;
  }

  if (!hubEnsured && hubPresent()) {
    ensureSharedHubInstalled('update');
  }

  const roots = inferSelectedRoots(selectedNames);
  syncInstalledSkillsManifest({
    extraSkills: selectedNames,
    extraSelected: roots,
    globalTargets: secondaryTargets.length > 0 ? secondaryTargets : undefined,
  });

  // Post-verify the skills that were selected (closure), including skipped-overwrite
  // when dest already matched — still verify full selected set for AC5/AC7.
  const verifiedIds = selectedNames.filter((n) =>
    fs.existsSync(path.join(targetSkillsDir, n))
  );
  postVerifyAndWriteLocal(verifiedIds, {
    includeHub: includeHub || hubPresent(),
    force: forceIntegrity,
    manifest,
  });

  if (secondaryTargets.length > 0) {
    const skillsToProject = [...selectedNames];
    if (isGlobalScope && fs.existsSync(consumerHubDir())) {
      skillsToProject.push(HUB_DIR);
    }
    projectSkillsToSecondaryTargets(skillsToProject, secondaryTargets);
  }

  return installedCount;
}

async function confirmOverwriteExisting(existingNames) {
  if (existingNames.length === 0) return true;
  if (!process.stdin.isTTY) {
    console.error(
      `Error: ${existingNames.length} existing skill(s) would be overwritten, but stdin is not a TTY.`
    );
    console.error(
      'Re-run with non-interactive flags, e.g. install --full --yes (consumer hub data is always preserved).'
    );
    process.exit(1);
  }

  const preview =
    existingNames.length <= 8
      ? existingNames.join(', ')
      : `${existingNames.slice(0, 8).join(', ')}, … (+${existingNames.length - 8} more)`;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const confirm = (
    await rl.question(
      `Overwrite ${existingNames.length} existing skill(s)? (y/n): ${preview}\n> `
    )
  )
    .trim()
    .toLowerCase();
  rl.close();
  return confirm === 'y' || confirm === 'yes';
}

/**
 * Interactively selects secondary global host targets to project skills into.
 * Canonical (~/.agents/skills) is always the primary root and is not toggleable.
 * @param {Object} rl - readline/promises interface
 * @param {Object} [options]
 * @param {Array<string>} [options.preselectIds] - Target ids pre-marked with [x]
 * @param {string} [options.actionLabel] - Prompt verb, e.g. 'install into'
 * @param {boolean} [options.defaultSymlink] - Default for the symlink vs copy choice
 * @returns {Promise<{ targets: Array<Object>, useSymlink: boolean }>}
 */
async function promptSecondaryGlobalTargets(
  rl,
  { preselectIds = [], actionLabel = 'install into', defaultSymlink = true } = {}
) {
  const secondaryList = getGlobalHostTargets().filter((t) => t.id !== 'canonical');
  const targetSelected = secondaryList.map((t) => preselectIds.includes(t.id));

  while (true) {
    console.log(`Select agent host targets to ${actionLabel}:`);
    console.log('  [x] 1) Canonical Agents (~/.agents/skills) [Default / Primary]');
    for (let i = 0; i < secondaryList.length; i++) {
      const mark = targetSelected[i] ? 'x' : ' ';
      const t = secondaryList[i];
      console.log(`  [${mark}] ${i + 2}) ${t.name} (~/${t.subpath.replace(/\\/g, '/')})`);
    }
    console.log('');
    const ans = (await rl.question("Toggle targets, 'a' for all, or press Enter to continue [Default: 1]: "))
      .trim()
      .toLowerCase();
    if (!ans) break;
    if (ans === 'a') {
      const allOn = targetSelected.every(Boolean);
      targetSelected.fill(!allOn);
    } else {
      const parts = ans.split(/[\s,]+/);
      for (const p of parts) {
        const num = parseInt(p, 10);
        if (num >= 2 && num <= secondaryList.length + 1) {
          targetSelected[num - 2] = !targetSelected[num - 2];
        }
      }
    }
    console.log('');
  }

  let useSymlink = defaultSymlink;
  const anySecondary = targetSelected.some(Boolean);
  if (anySecondary) {
    console.log('Link secondary targets to canonical skills root via directory symlinks/junctions?');
    console.log(
      `  1) Symlinks / Junctions (Recommended — zero duplicate disk space, auto-sync)${defaultSymlink ? ' [Default]' : ''}`
    );
    console.log(`  2) Direct Copy (Independent full copies of skill folders)${defaultSymlink ? '' : ' [Default]'}`);
    const linkAns = (await rl.question(`Choice (1 or 2, default ${defaultSymlink ? 1 : 2}): `)).trim();
    if (linkAns === '1') useSymlink = true;
    else if (linkAns === '2') useSymlink = false;
    console.log('');
  }

  const targets = secondaryList
    .filter((_, i) => targetSelected[i])
    .map((t) => ({ id: t.id, name: t.name, path: t.path, symlink: useSymlink }));
  return { targets, useSymlink };
}

async function runInstall(skills, opts) {
  console.log('============================================================');
  console.log('  Workflow Skills - Non-interactive Install');
  console.log('============================================================');
  console.log(`Target: ${targetSkillsDir} [${isGlobalScope ? 'Global Scope' : 'Project Scope'}]`);
  console.log('------------------------------------------------------------');

  if (opts.targets?.length && !isGlobalScope) {
    console.error('Error: --targets requires --global (secondary host projection is global-only)');
    process.exit(1);
  }

  const selected = buildSelectedFromInstallOpts(skills, opts);
  const selectedNames = skills.filter((_, i) => selected[i]);
  if (selectedNames.length === 0) {
    console.log('No skills selected. Exiting.');
    process.exit(0);
  }

  console.log(`Installing ${selectedNames.length} skill(s): ${selectedNames.join(', ')}`);

  const existingNames = selectedNames.filter((n) =>
    fs.existsSync(path.join(targetSkillsDir, n))
  );

  let overwrite = !!opts.yes;
  if (existingNames.length > 0 && !overwrite) {
    overwrite = await confirmOverwriteExisting(existingNames);
    if (!overwrite) {
      console.log('Overwrite declined. Installing only new skill folders.');
    }
  }

  let secondaryTargets = resolveSecondaryTargets(opts.targets, opts.symlink);
  const explicitTargets = !!(opts.targets && opts.targets.length > 0);

  // Interactive --global installs always ask for host targets (recorded + detected
  // pre-selected; Enter keeps them). Non-interactive runs reuse recorded targets and
  // auto-detect pre-existing host dirs (e.g. ~/.gemini from Antigravity).
  if (isGlobalScope && !explicitTargets) {
    const recorded = readInstalledSkillsManifest()?.globalTargets || [];
    let detected = [];
    let homeForDetect = null;
    try {
      homeForDetect = getHomeDir();
      detected = detectExistingSecondaryTargets(homeForDetect, opts.symlink);
    } catch {
      homeForDetect = null;
    }

    if (process.stdin.isTTY && !opts.yes) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      try {
        const prompted = await promptSecondaryGlobalTargets(rl, {
          preselectIds: computeTargetPreselectIds(
            recorded.map((t) => t.id),
            detected.map((t) => t.id),
            getGlobalHostTargets().filter((t) => t.id !== 'canonical').map((t) => t.id)
          ),
          actionLabel: 'install into',
          defaultSymlink:
            recorded.length > 0 && recorded.every((t) => t.symlink === false)
              ? false
              : opts.symlink !== false,
        });
        secondaryTargets = prompted.targets;
      } finally {
        rl.close();
      }
    } else {
      if (recorded.length > 0) {
        console.log(`Reusing ${recorded.length} recorded global target(s) from ${INSTALLED_SKILLS_FILE} (--targets omitted).`);
        secondaryTargets = recorded.map((t) => ({ ...t }));
      }
      if (homeForDetect) {
        const knownIds = new Set(secondaryTargets.map((t) => t.id));
        const fresh = detected.filter((t) => !knownIds.has(t.id));
        if (fresh.length > 0) {
          console.log(`Auto-detected ${fresh.length} existing host target(s): ${fresh.map((t) => t.id).join(', ')}.`);
          secondaryTargets = [...secondaryTargets, ...fresh];
        }
      }
    }
  }
  const installedCount = installSelectedSkills(skills, selectedNames, {
    overwrite,
    forceIntegrity: !!opts.forceIntegrity,
    secondaryTargets,
  });

  console.log('');
  if (installedCount > 0) {
    console.log(`Successfully installed ${installedCount} skill(s) into ${targetSkillsDir}`);
    console.log(`Note: Existing '${CONFIG_FILE}' and consumer hub files were preserved and NOT overwritten.`);
    console.log('\n\u26a0\ufe0f  After installing, run the `ws-check-harness` skill to validate the harness:');
    console.log('   Load `.agents/skills/ws-check-harness/SKILL.md` and execute Phases 0\u20135c.');
    console.log('   Optional: run `ws-configure-project` to interview/detect and fill `.ws/config.json`.');
    console.log('   Path tokens: `{skillsRoot}/ws-shared/runtime/tools.md` § Path tokens (`pathTokens` in config.json).');
  } else {
    console.log('No skills were installed.');
  }
  process.exit(0);
}

async function main() {
  if (!fs.existsSync(packageSkillsDir)) {
    console.error(`Error: Source skills directory not found at ${packageSkillsDir}`);
    process.exit(1);
  }

  loadSkillGraph();
  const skills = listInstallableSkills(packageSkillsDir);
  if (skills.length === 0) {
    console.log(`No installable skills found in ${packageSkillsDir}`);
    process.exit(0);
  }

  const args = process.argv.slice(2);
  const command = args[0];

  if (command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    console.log(getLocalVersion());
    process.exit(0);
  }

  if (command === '--check' || command === 'check') {
    const local = getLocalVersion();
    let localDigest = null;
    if (fs.existsSync(integrityManifestPath)) {
      try {
        localDigest = loadJson(integrityManifestPath).fullPackageDigest || null;
      } catch {
        localDigest = null;
      }
    }
    try {
      const remote = await fetchRemoteVersion();
      let remoteDigest = null;
      let remoteDigestAvailable = false;
      try {
        const remoteIntegrity = await fetchRemoteJson(
          'https://raw.githubusercontent.com/jpolvora/workflow-skills/main/bin/skill-integrity.json'
        );
        remoteDigest = remoteIntegrity.fullPackageDigest || null;
        remoteDigestAvailable = !!remoteDigest;
      } catch {
        remoteDigestAvailable = false;
      }
      const evaluated = evaluateVersionAndDigestCheck({
        localVersion: local,
        remoteVersion: remote,
        localDigest,
        remoteDigest,
        remoteDigestAvailable,
      });
      for (const line of evaluated.lines) console.log(line);
      process.exit(evaluated.exitCode);
    } catch (e) {
      console.log(`Installed: v${local}`);
      console.log(`Latest:    unreachable (${e.message})`);
      process.exit(1);
    }
  }

  if (command === 'integrity') {
    assertNotSelfOverwrite();
    runIntegrityAudit();
    return;
  }

  if (command === 'telemetry') {
    const sub = args[1];
    if (sub === '--help' || sub === '-h' || sub === 'help') {
      printHelp();
      process.exit(0);
    }
    if (!sub || sub === 'aggregate') {
      runTelemetry('aggregate');
      return;
    }
    if (sub === 'report') {
      runTelemetry('report');
      return;
    }
    console.error(`Error: Unknown telemetry subcommand '${sub}'. Use: telemetry aggregate|report`);
    process.exit(1);
  }

  if (command === 'install') {
    const installOpts = parseInstallArgs(args);
    assertNotSelfOverwrite();
    await runInstall(skills, installOpts);
    return;
  }

  if (command === 'uninstall') {
    assertNotSelfOverwrite();
    await runUninstall(skills, args.slice(1));
    return;
  }

  if (command === 'update') {
    if (args.includes('--help') || args.includes('-h')) {
      printHelp();
      process.exit(0);
    }
    const includeNew = args.includes('--include-new');
    const forceIntegrity = args.includes('--force-integrity');
    const updateOpts = {};
    for (let i = 1; i < args.length; i++) {
      const a = args[i];
      if (a === '--global' || a === '-g') setScope(true);
      if (a === '--project' || a === '-p') setScope(false);
      if (a === '--targets') {
        const val = args[++i];
        if (val) updateOpts.targets = val.split(',').map((s) => s.trim()).filter(Boolean);
      } else if (a.startsWith('--targets=')) {
        updateOpts.targets = a.slice('--targets='.length).split(',').map((s) => s.trim()).filter(Boolean);
      } else if (a === '--no-symlink' || a === '--symlink=false') {
        updateOpts.symlink = false;
      } else if (a === '--symlink' || a === '--symlink=true') {
        updateOpts.symlink = true;
      } else if (a === '--yes' || a === '-y') {
        updateOpts.yes = true;
      }
    }
    assertNotSelfOverwrite();
    if (updateOpts.targets?.length && !isGlobalScope) {
      console.error('Error: --targets requires --global (secondary host projection is global-only)');
      process.exit(1);
    }
    await runUpdate(skills, includeNew, forceIntegrity, updateOpts);
  } else {
    const forceIntegrity = args.includes('--force-integrity');
    assertNotSelfOverwrite();
    await runInteractive(skills, forceIntegrity);
  }
}

function parseUninstallArgs(args) {
  let skillsCsv = null;
  let yes = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--yes' || a === '-y') {
      yes = true;
      continue;
    }
    if (a === '--global' || a === '-g') {
      setScope(true);
      continue;
    }
    if (a === '--project' || a === '-p') {
      setScope(false);
      continue;
    }
    if (a === '--skills') {
      skillsCsv = args[++i];
      if (!skillsCsv) {
        console.error('Error: --skills requires a comma-separated list');
        process.exit(1);
      }
      continue;
    }
    if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
    console.error(`Error: Unknown uninstall argument: ${a}`);
    console.error('Use: uninstall --skills <csv> [--yes]');
    process.exit(1);
  }
  if (!skillsCsv) {
    console.error('Error: uninstall requires --skills <csv>');
    process.exit(1);
  }
  const named = skillsCsv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (named.length === 0) {
    console.error('Error: --skills list is empty');
    process.exit(1);
  }
  return { named, yes };
}

async function runUninstall(_upstreamSkills, argv) {
  const opts = parseUninstallArgs(argv);

  console.log('============================================================');
  console.log('  Workflow Skills - Uninstall');
  console.log('============================================================');
  console.log(`Target: ${targetSkillsDir} [${isGlobalScope ? 'Global Scope' : 'Project Scope'}]`);
  console.log('------------------------------------------------------------');

  if (!fs.existsSync(targetSkillsDir)) {
    console.log(`No skills directory found at: ${targetSkillsDir}`);
    process.exit(0);
  }

  // Bootstrap manifest if missing, then use it as source of truth (+ disk extras).
  let manifest = readInstalledSkillsManifest();
  const fromDisk = scanInstalledSkillsOnDisk();
  if (!manifest) {
    manifest = {
      skills: fromDisk,
      selected: inferSelectedRoots(fromDisk),
    };
  }
  const installed = [
    ...new Set([...(manifest.skills || []), ...fromDisk]),
  ].sort((a, b) => a.localeCompare(b));
  const selected =
    manifest.selected && manifest.selected.length > 0
      ? manifest.selected.filter((s) => installed.includes(s))
      : inferSelectedRoots(installed);

  if (installed.length === 0) {
    console.log('No installed skills found.');
    process.exit(0);
  }

  const unknown = opts.named.filter((n) => !installed.includes(n));
  if (unknown.length > 0) {
    console.error(`Error: skill(s) not installed: ${unknown.join(', ')}`);
    process.exit(1);
  }

  const { remove, keep, keepSelected } = computeUninstallSet(installed, selected, opts.named);
  if (remove.length === 0) {
    console.log('Nothing to uninstall.');
    process.exit(0);
  }

  const cascaded = remove.filter((n) => !opts.named.includes(n));
  console.log(`Will remove ${remove.length} skill(s):`);
  for (const n of remove) {
    const tag = opts.named.includes(n) ? '' : ' (cascade)';
    console.log(`  - ${n}${tag}`);
  }
  if (cascaded.length > 0) {
    console.log(`(includes ${cascaded.length} cascaded dependent/orphan skill(s))`);
  }
  console.log(`Remaining: ${keep.length}`);
  console.log('Consumer hub data will be preserved.');

  let confirmed = !!opts.yes;
  if (!confirmed) {
    if (!process.stdin.isTTY) {
      console.error('Error: uninstall on non-TTY requires --yes');
      process.exit(1);
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question('Proceed with uninstall? (y/n): ')).trim().toLowerCase();
    rl.close();
    confirmed = answer === 'y' || answer === 'yes';
  }
  if (!confirmed) {
    console.log('Uninstall cancelled.');
    process.exit(0);
  }

  let removedCount = 0;
  for (const skillName of remove) {
    if (rmSkillDir(skillName)) {
      console.log(`  Removed: ${skillName}`);
      removedCount++;
    } else {
      console.log(`  Missing on disk (manifest only): ${skillName}`);
    }
  }

  if (isGlobalScope) {
    const manifestForTargets = readInstalledSkillsManifest();
    const recordedTargets = manifestForTargets?.globalTargets || [];
    if (recordedTargets.length > 0) {
      const remainingWsSkills = keep.filter((s) => s.startsWith('ws-'));
      // Only remove gemini skills.json entry if no ws-* skills remain installed globally
      const targetsToRemoveFrom = remainingWsSkills.length === 0
        ? recordedTargets
        : recordedTargets.filter((t) => t.id !== 'gemini');
      const secondaryRemoved = removeSkillsFromSecondaryTargets(remove, targetsToRemoveFrom);
      console.log(`  Removed ${secondaryRemoved} secondary projection(s) from ${recordedTargets.length} recorded global target(s).`);
      // Partial uninstall keeps the gemini skills.json entry, but legacy ws-*
      // junctions under ~/.gemini/config/skills/ must still be swept to avoid
      // duplicate discovery alongside the declarative entry.
      if (remainingWsSkills.length > 0) {
        let legacySwept = 0;
        for (const t of recordedTargets) {
          if (t && t.id === 'gemini') {
            try {
              legacySwept += cleanupLegacyGeminiSkills(resolveTargetHomeDir(t));
            } catch {}
          }
        }
        if (legacySwept > 0) {
          console.log(`  Swept ${legacySwept} legacy Gemini ws-* junction(s) while preserving skills.json entry.`);
        }
      }
    }
  }

  writeInstalledSkillsManifest(keep, keepSelected);
  rewriteLocalIntegrityForRemaining(keep);

  console.log('');
  console.log(`Uninstalled ${removedCount} skill folder(s). Manifest now lists ${keep.length} skill(s).`);
  console.log(`Note: consumer hub (${CONFIG_FILE}, MEMORY.md, STACK.md, ${INSTALLED_SKILLS_FILE}) was preserved.`);
  process.exit(0);
}

async function runUpdate(skills, includeNew, forceIntegrity = false, updateOpts = {}) {
  console.log('============================================================');
  console.log('  Workflow Skills - Auto Updater');
  console.log('============================================================');
  console.log(`Target: ${targetSkillsDir} [${isGlobalScope ? 'Global Scope' : 'Project Scope'}]`);
  console.log('------------------------------------------------------------');

  if (!fs.existsSync(targetSkillsDir)) {
    console.log(`No skills directory found at: ${targetSkillsDir}`);
    console.log('Run `npx --yes github:jpolvora/workflow-skills` to choose skills to install first.');
    process.exit(0);
  }

  // Prefer manifest; bootstrap from disk when missing.
  const existing = readInstalledSkillsManifest();
  let tracked;
  let trackedSelected;
  if (existing) {
    tracked = existing.skills;
    trackedSelected = existing.selected;
  } else {
    tracked = scanInstalledSkillsOnDisk();
    trackedSelected = inferSelectedRoots(tracked);
    writeInstalledSkillsManifest(tracked, trackedSelected);
    console.log(
      `Bootstrapped ${INSTALLED_SKILLS_FILE} from disk (${tracked.length} skill(s)).`
    );
  }

  const upstreamSet = new Set(skills);
  const existingSkills = tracked.filter((name) => upstreamSet.has(name));
  const staleLocal = tracked.filter((name) => !upstreamSet.has(name));
  const missingNew = skills.filter((name) => !tracked.includes(name));

  if (existingSkills.length === 0 && !(includeNew && missingNew.length > 0)) {
    console.log('No matching skills found in target directory to update.');
    console.log('Run `npx --yes github:jpolvora/workflow-skills` to select and install skills.');
    process.exit(0);
  }

  if (staleLocal.length > 0) {
    console.log(
      `Note: ${staleLocal.length} tracked skill(s) not in this upstream package (left as-is):`
    );
    staleLocal.slice(0, 10).forEach((n) => console.log(`  - ${n}`));
  }

  let hubEnsured = false;
  const skillsToCopy = [
    ...existingSkills,
    ...(includeNew ? missingNew : []),
  ];
  relocateLegacyHub();
  const includeHub =
    skillsToCopy.length > 0
      ? willIncludeHub(skillsToCopy)
      : hubPresent();

  let manifest = null;
  if (skillsToCopy.length > 0 || includeHub) {
    manifest = preVerifySourceIntegrity(
      skillsToCopy.length > 0 ? skillsToCopy : existingSkills,
      { includeHub, force: forceIntegrity }
    );
  }

  if (existingSkills.length > 0) {
    console.log(`Updating ${existingSkills.length} skill(s)...`);
    for (const skillName of existingSkills) {
      const srcPath = path.join(packageSkillsDir, skillName);
      const destPath = path.join(targetSkillsDir, skillName);
      if (!fs.existsSync(srcPath)) continue;
      console.log(`  Updating '${skillName}'...`);
      syncManagedSkillDir(srcPath, destPath);
      afterSkillCopy(skillName, destPath);
    }
    if (shouldEnsureHub(existingSkills)) {
      ensureSharedHubInstalled('update');
      hubEnsured = true;
    }
  }

  // Always refresh hub if present on consumer (config-preserving)
  if (!hubEnsured && hubPresent()) {
    ensureSharedHubInstalled('update');
  }

  let newlyInstalled = [];
  if (includeNew && missingNew.length > 0) {
    console.log(`Installing ${missingNew.length} new upstream skill(s)...`);
    for (const skillName of missingNew) {
      const srcPath = path.join(packageSkillsDir, skillName);
      const destPath = path.join(targetSkillsDir, skillName);
      console.log(`  Installing new '${skillName}'...`);
      syncManagedSkillDir(srcPath, destPath);
      afterSkillCopy(skillName, destPath);
    }
    newlyInstalled = missingNew;
  } else if (missingNew.length > 0) {
    console.log(`\nNote: ${missingNew.length} upstream skill(s) not installed locally:`);
    missingNew.slice(0, 10).forEach((n) => console.log(`  - ${n}`));
    if (missingNew.length > 10) console.log(`  ... and ${missingNew.length - 10} more`);
    console.log('Re-run with `update --include-new` to install them, or use the interactive installer.');
  }

  syncInstalledSkillsManifest({
    extraSkills: newlyInstalled,
    extraSelected: newlyInstalled,
  });

  // Fail closed when retired ids survive prune+sync (us-272 AC2/AC6):
  // prune-then-sync ordering must never silently re-add retired entries.
  {
    const synced = readInstalledSkillsManifest();
    const stale = synced ? listRetiredManifestIds(synced) : [];
    if (stale.length > 0) {
      console.error(
        `Error: retired skill id(s) remain in ${hubDisplay()}${INSTALLED_SKILLS_FILE} after update: ${stale.join(', ')}`,
      );
      process.exit(1);
    }
  }

  const afterManifest = readInstalledSkillsManifest();
  const verifyIds = afterManifest
    ? afterManifest.skills.filter((n) => upstreamSet.has(n) && fs.existsSync(path.join(targetSkillsDir, n)))
    : skillsToCopy.filter((n) => fs.existsSync(path.join(targetSkillsDir, n)));
  if (verifyIds.length > 0) {
    postVerifyAndWriteLocal(verifyIds, {
      includeHub: includeHub || hubPresent(),
      force: forceIntegrity,
      manifest: manifest || loadUpstreamIntegrityManifest(),
    });
  }

  // Secondary global targets: explicit --targets wins; interactive --global updates
  // always prompt (recorded + detected pre-selected); non-interactive runs reuse
  // recorded targets and auto-detect pre-existing host dirs (e.g. ~/.gemini).
  if (isGlobalScope) {
    const explicitTargets = updateOpts.targets && updateOpts.targets.length > 0;
    let targetsToSync = explicitTargets
      ? resolveSecondaryTargets(updateOpts.targets, updateOpts.symlink !== false)
      : (afterManifest?.globalTargets || []);
    let autoDetectedCount = 0;
    let promptedTargets = false;

    if (!explicitTargets && process.stdin.isTTY && !updateOpts.yes) {
      const recorded = afterManifest?.globalTargets || [];
      let detected = [];
      try {
        detected = detectExistingSecondaryTargets(getHomeDir(), updateOpts.symlink !== false);
      } catch {
        detected = [];
      }
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      try {
        const prompted = await promptSecondaryGlobalTargets(rl, {
          preselectIds: computeTargetPreselectIds(
            recorded.map((t) => t.id),
            detected.map((t) => t.id),
            getGlobalHostTargets().filter((t) => t.id !== 'canonical').map((t) => t.id)
          ),
          actionLabel: 'update / project into',
          defaultSymlink:
            recorded.length > 0 && recorded.every((t) => t.symlink === false)
              ? false
              : updateOpts.symlink !== false,
        });
        targetsToSync = prompted.targets;
        promptedTargets = true;
      } finally {
        rl.close();
      }
    } else if (!explicitTargets) {
      let homeForDetect = null;
      try {
        homeForDetect = getHomeDir();
      } catch {
        homeForDetect = null;
      }
      if (homeForDetect) {
        const detected = detectExistingSecondaryTargets(
          homeForDetect,
          updateOpts.symlink !== false
        );
        const knownIds = new Set(targetsToSync.map((t) => t.id));
        const fresh = detected.filter((t) => !knownIds.has(t.id));
        if (fresh.length > 0) {
          console.log(`Auto-detected ${fresh.length} existing host target(s): ${fresh.map((t) => t.id).join(', ')}.`);
          targetsToSync = [...targetsToSync, ...fresh];
          autoDetectedCount = fresh.length;
        }
      }
    }

    if (targetsToSync.length > 0) {
      const skillsToProject = [
        ...(afterManifest?.skills || existingSkills),
        ...(fs.existsSync(consumerHubDir()) ? [HUB_DIR] : []),
      ];
      projectSkillsToSecondaryTargets(skillsToProject, targetsToSync);
      if (explicitTargets || promptedTargets || autoDetectedCount > 0) {
        syncInstalledSkillsManifest({ globalTargets: targetsToSync });
      }
    }
  }

  console.log('\nUpdate complete!');
  console.log(`Note: Existing '${CONFIG_FILE}' and consumer hub files were preserved and NOT overwritten.`);
  console.log(
    `Note: Consumer hub MEMORY.md, memory/, STACK.md, config.json, and ${INSTALLED_SKILLS_FILE} are never overwritten by upstream.`
  );
  console.log('\n\u26a0\ufe0f  After updating, run the `ws-check-harness` skill to scan the harness:');
  console.log('   Load `.agents/skills/ws-check-harness/SKILL.md` and execute Phases 0\u20135c.');
  console.log('   This detects phantom skills, broken links, stale references, and fixes routing/indexes.');
  console.log('   Optional: run `ws-configure-project` if .ws/config.json still has placeholders.');
  console.log('   Path tokens: `{skillsRoot}/ws-shared/runtime/tools.md` § Path tokens (`pathTokens` in config.json).');
  process.exit(0);
}

async function runInteractive(skills, forceIntegrity = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (
    !process.argv.includes('--global') &&
    !process.argv.includes('-g') &&
    !process.argv.includes('--project') &&
    !process.argv.includes('-p')
  ) {
    if (process.stdin.isTTY) {
      const isHome = isHomeDirectory(process.cwd());
      if (isHome) {
        console.log('Detected current directory is your user home directory (~).');
        setScope(true);
        console.log('Scope: Global (~/.agents/skills)');
      } else {
        console.log('Select target installation scope:');
        console.log('  1) Project directory (.agents/skills in current directory) [Default]');
        console.log('  2) Global directory (~/.agents/skills)');
        const scopeAns = (await rl.question('Choice (1 or 2, default 1): ')).trim();
        if (scopeAns === '2') {
          setScope(true);
        } else {
          setScope(false);
        }
      }
      console.log('');
    }
  }

  let interactiveSecondaryTargets = [];
  if (isGlobalScope && process.stdin.isTTY) {
    // Pre-select hosts that already exist on disk (e.g. ~/.gemini) so
    // interactive installs default to keeping Antigravity / Gemini in sync.
    let preDetectedIds = [];
    try {
      preDetectedIds = detectExistingSecondaryTargets(getHomeDir(), true).map((t) => t.id);
      if (preDetectedIds.length > 0) {
        console.log(`Detected existing host dir(s): ${preDetectedIds.join(', ')} (pre-selected).`);
      }
    } catch {
      /* best-effort pre-selection only */
    }
    const prompted = await promptSecondaryGlobalTargets(rl, {
      preselectIds: preDetectedIds,
      actionLabel: 'install into',
    });
    interactiveSecondaryTargets = prompted.targets;
  }

  const selected = new Array(skills.length).fill(false);

  while (true) {
    if (process.stdout.isTTY) console.clear();
    console.log('============================================================');
    console.log('  Workflow Skills - Skill Installer');
    console.log('============================================================');
    console.log(`Source: ${packageSkillsDir}`);
    console.log(`Target: ${targetSkillsDir} [${isGlobalScope ? 'Global Scope' : 'Project Scope'}]`);
    console.log('------------------------------------------------------------');
    console.log("Packages: 'f' Full · 'w' Workflows · 'e' Extra");
    console.log("Toggle: number · 'a' all · Selecting a skill also selects its deps.");
    console.log("Deselect does not cascade (deps stay selected).");
    console.log("Enter 'y' or 'i' to install · 'q' to quit.");
    console.log('------------------------------------------------------------\n');

    for (let i = 0; i < skills.length; i++) {
      const mark = selected[i] ? 'x' : ' ';
      console.log(`  [${mark}] ${String(i + 1).padStart(2)}) ${skills[i]}`);
    }
    console.log('');
    const count = selected.filter(Boolean).length;
    console.log(`Selected: ${count} / ${skills.length}\n`);

    const answer = (await rl.question('Select action or toggle (e.g. 1, f, w, e, a, y, q): '))
      .trim()
      .toLowerCase();

    if (/^\d+$/.test(answer)) {
      const idx = parseInt(answer, 10) - 1;
      if (idx >= 0 && idx < skills.length) {
        if (!selected[idx]) {
          selected[idx] = true;
          applyTransitiveDeps(skills, selected);
        } else {
          // Toggle off: only this skill (no cascade deselect)
          selected[idx] = false;
        }
      } else {
        await rl.question(`Invalid number: ${answer}. Press enter to continue...`);
      }
    } else if (answer === 'f') {
      applyPackageSelection('full', skills, selected);
    } else if (answer === 'w') {
      applyPackageSelection('workflows', skills, selected);
    } else if (answer === 'e') {
      applyPackageSelection('extra', skills, selected);
    } else if (answer === 'a') {
      const allSelected = selected.every((v) => v);
      selected.fill(!allSelected);
    } else if (answer === 'y' || answer === 'i') {
      break;
    } else if (answer === 'q') {
      console.log('Exiting without installing.');
      rl.close();
      process.exit(0);
    } else {
      await rl.question(`Invalid action: ${answer}. Press enter to continue...`);
    }
  }

  const selectedCount = selected.filter((v) => v).length;
  if (selectedCount === 0) {
    console.log('\nNo skills selected. Exiting.');
    rl.close();
    process.exit(0);
  }

  const selectedNames = skills.filter((_, i) => selected[i]);
  console.log(`\nInstalling ${selectedNames.length} skill(s): ${selectedNames.join(', ')}`);
  console.log('Starting installation...');

  const existingNames = selectedNames.filter((n) =>
    fs.existsSync(path.join(targetSkillsDir, n))
  );

  // Close menu readline before optional overwrite prompt / install
  rl.close();

  let overwrite = false;
  if (existingNames.length > 0) {
    overwrite = await confirmOverwriteExisting(existingNames);
    if (!overwrite) {
      console.log('Overwrite declined. Installing only new skill folders.');
    }
  }

  const installedCount = installSelectedSkills(skills, selectedNames, {
    overwrite,
    forceIntegrity,
    secondaryTargets: interactiveSecondaryTargets,
  });

  console.log('');
  if (installedCount > 0) {
    console.log(`Successfully installed ${installedCount} skill(s) into ${targetSkillsDir}`);
    console.log(`Note: Existing '${CONFIG_FILE}' and consumer hub files were preserved and NOT overwritten.`);
    console.log('\n\u26a0\ufe0f  After installing, run the `ws-check-harness` skill to validate the harness:');
    console.log('   Load `.agents/skills/ws-check-harness/SKILL.md` and execute Phases 0\u20135c.');
    console.log('   This detects phantom skills, broken links, stale references, and fixes routing/indexes.');
    console.log('   Optional: run `ws-configure-project` to interview/detect and fill `.ws/config.json`.');
    console.log('   Path tokens: `{skillsRoot}/ws-shared/runtime/tools.md` § Path tokens (`pathTokens` in config.json).');
  } else {
    console.log('No skills were installed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
