#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const HUB_REL = path.join('.agents', 'skills', 'ws-shared');
const HUB_CONFIG = path.join(HUB_REL, 'config.json');
const HUB_CONFIG_EXAMPLE = path.join(HUB_REL, 'templates', 'config.json.example');
const HUB_RUNTIME_REL = path.join('runtime');
const HUB_TEMPLATES_REL = path.join('templates');

function inside(child, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveGlobalSkillsRoot() {
  return path.resolve(process.env.WORKFLOW_SKILLS_GLOBAL_DIR || path.join(os.homedir(), '.agents', 'skills'));
}

function resolveKnownGlobalSkillsRoots() {
  const home = os.homedir();
  const roots = [
    resolveGlobalSkillsRoot(),
    path.join(home, '.agents', 'skills'),
    path.join(home, '.claude', 'skills'),
    path.join(home, '.codex', 'skills'),
    path.join(home, '.gemini', 'config', 'skills'),
  ];
  return [...new Set(roots.map((root) => path.resolve(root)))];
}

function isGlobalSkillsRoot(dir) {
  const resolved = path.resolve(dir);
  return resolveKnownGlobalSkillsRoots().some((root) => resolved === root);
}

function resolveExecutionGlobalSkillsRoot(scriptFile) {
  if (scriptFile) {
    const resolvedScript = path.resolve(scriptFile);
    const match = resolveKnownGlobalSkillsRoots().find((root) => inside(resolvedScript, root));
    if (match) return match;
  }
  return resolveGlobalSkillsRoot();
}

function consumerHubExists(repoRoot) {
  const root = path.resolve(repoRoot);
  return fs.existsSync(path.join(root, HUB_CONFIG)) || fs.existsSync(path.join(root, HUB_CONFIG_EXAMPLE));
}

function resolveRepoRoot(override, { scriptFile } = {}) {
  if (override) return path.resolve(override);
  const cwd = path.resolve(process.cwd());
  if (consumerHubExists(cwd)) return cwd;
  if (isGlobalSkillsRoot(cwd)) {
    throw new Error(
      `Current directory is a global skills root (${cwd}); pass --repo-root to target a consumer project`,
    );
  }

  if (scriptFile && !resolveKnownGlobalSkillsRoots().some((root) => inside(scriptFile, root))) {
    let candidate = path.resolve(scriptFile);
    for (let depth = 0; depth <= 4; depth += 1) candidate = path.dirname(candidate);
    if (consumerHubExists(candidate)) return candidate;
  }
  return cwd;
}

function sharedDir(repoRoot) {
  const explicit = process.env.WORKFLOW_SKILLS_SHARED_DIR;
  return path.resolve(explicit || path.join(resolveRepoRoot(repoRoot), HUB_REL));
}

function resolveHubSource(context, relative) {
  const local = path.join(context.sharedDir, relative);
  if (fs.existsSync(local)) return local;
  if (context.executionScope === 'project-local') return local;
  const global = path.join(context.globalSkillsRoot, 'ws-shared', relative);
  if (fs.existsSync(global)) return global;
  return local;
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function normalizeConfig(config) {
  const normalized = { ...config, fable: { ...(config.fable || {}) } };
  const value = normalized.fable.auditVerdictsBlockShip;
  if (value === undefined || value === null || value === true) normalized.fable.auditVerdictsBlockShip = 'refuted';
  else if (value === false || value === 'refuted' || value === 'caveats') normalized.fable.auditVerdictsBlockShip = value;
  else throw new Error('fable.auditVerdictsBlockShip must be false, "refuted", or "caveats"');
  return normalized;
}

function resolveMinVerifyScore(config) {
  const n = config?.defaults?.minVerifyScore;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 10) return 9;
  return n;
}

function resolveMemoryRouting(config) {
  const specMemo = config?.specMemo || {};
  let enableMemoryFiles = config?.enableMemoryFiles ?? specMemo.enableMemoryFiles;
  let enableSpecMemoIntegration = config?.enableSpecMemoIntegration ?? specMemo.enableSpecMemoIntegration;

  // Persisted mode is authoritative when either boolean flag is absent (incomplete merges).
  const MODE_FLAGS = {
    disabled: { enableMemoryFiles: false, enableSpecMemoIntegration: false },
    local: { enableMemoryFiles: true, enableSpecMemoIntegration: false },
    vault: { enableMemoryFiles: false, enableSpecMemoIntegration: true },
    hybrid: { enableMemoryFiles: true, enableSpecMemoIntegration: true },
  };
  const fromMode = MODE_FLAGS[specMemo.mode];
  if (fromMode) {
    if (enableMemoryFiles === undefined) enableMemoryFiles = fromMode.enableMemoryFiles;
    if (enableSpecMemoIntegration === undefined) enableSpecMemoIntegration = fromMode.enableSpecMemoIntegration;
  } else {
    if (enableSpecMemoIntegration === undefined) {
      enableSpecMemoIntegration = specMemo.enabled !== undefined ? Boolean(specMemo.enabled) : false;
    }
    if (enableMemoryFiles === undefined) {
      // No recognized mode: default local files on (legacy enabled:false / empty config).
      enableMemoryFiles = true;
    }
  }

  return {
    enableMemoryFiles: Boolean(enableMemoryFiles),
    enableSpecMemoIntegration: Boolean(enableSpecMemoIntegration),
  };
}

function resolveSkillMdPath(context, skillId) {
  const local = path.join(context.repoRoot, '.agents', 'skills', skillId, 'SKILL.md');
  if (fs.existsSync(local)) return local;
  const global = path.join(context.globalSkillsRoot, skillId, 'SKILL.md');
  if (fs.existsSync(global)) return global;
  throw new Error(
    `SKILL.md not found for ${skillId} under ${path.join('.agents', 'skills', skillId)} or ${context.globalSkillsRoot}`,
  );
}

function resolveConsumerContext({ repoRoot, scriptFile, skillId } = {}) {
  const root = resolveRepoRoot(repoRoot, { scriptFile });
  const localSkillsRoot = path.join(root, '.agents', 'skills');
  const globalSkillsRoot = resolveExecutionGlobalSkillsRoot(scriptFile);
  const localSkill = skillId ? path.join(localSkillsRoot, skillId) : localSkillsRoot;
  const skillsRoot = fs.existsSync(localSkill) ? localSkillsRoot : globalSkillsRoot;
  const hub = sharedDir(root);
  const localConfig = path.join(hub, 'config.json');
  const localExample = path.join(hub, 'templates', 'config.json.example');
  const globalConfig = path.join(globalSkillsRoot, 'ws-shared', 'config.json');
  const globalExample = path.join(
    globalSkillsRoot,
    'ws-shared',
    'templates',
    'config.json.example',
  );
  const executionScope =
    scriptFile && resolveKnownGlobalSkillsRoots().some((globalRoot) => inside(scriptFile, globalRoot))
      ? 'global'
      : 'project-local';
  const configCandidates =
    executionScope === 'global'
      ? [localConfig, localExample, globalConfig, globalExample]
      : [localConfig, localExample];
  const configPath = configCandidates.find((file) => fs.existsSync(file)) || localConfig;
  const runtimeSource = resolveHubSource(
    { sharedDir: hub, globalSkillsRoot, executionScope },
    HUB_RUNTIME_REL,
  );
  const templateSource = resolveHubSource(
    { sharedDir: hub, globalSkillsRoot, executionScope },
    HUB_TEMPLATES_REL,
  );

  return {
    repoRoot: root,
    skillsRoot,
    sharedDir: hub,
    globalSkillsRoot,
    configPath,
    configSource: inside(configPath, root) ? 'project' : 'global',
    executionScope,
    runtimeSource,
    templateSource,
    config: normalizeConfig(loadJson(configPath)),
  };
}

function resolveConfiguredPath(repoRoot, value, fallback) {
  const raw = String(value || fallback || '');
  return path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(repoRoot, raw);
}

function toRepoRelative(repoRoot, value, { allowOutside = false } = {}) {
  const absolute = path.resolve(value);
  if (!inside(absolute, repoRoot)) {
    if (!allowOutside) throw new Error(`Path is outside repository: ${value}`);
    return path.basename(absolute).replace(/\\/g, '/');
  }
  return path.relative(path.resolve(repoRoot), absolute).replace(/\\/g, '/') || '.';
}

function reportResolved(context) {
  return {
    repoRoot: '.',
    skillsRoot: toRepoRelative(context.repoRoot, context.skillsRoot, { allowOutside: true }),
    sharedDir: toRepoRelative(context.repoRoot, context.sharedDir, { allowOutside: true }),
    globalSkillsRoot: '{globalSkillsRoot}',
    configPath: toRepoRelative(context.repoRoot, context.configPath, { allowOutside: true }),
    configSource: context.configSource,
    executionScope: context.executionScope,
    runtimeSource: toRepoRelative(context.repoRoot, context.runtimeSource, { allowOutside: true })
      .replace(/^[^/]+$/, '{globalSkillsRoot}/ws-shared/runtime'),
    templateSource: toRepoRelative(context.repoRoot, context.templateSource, { allowOutside: true })
      .replace(/^[^/]+$/, '{globalSkillsRoot}/ws-shared/templates'),
  };
}

function resolveSpecializedSubagentsDirectory(repoRoot, host, configOrDir = {}) {
  let dirOption = 'projectLevel';
  if (typeof configOrDir === 'string') {
    dirOption = configOrDir;
  } else if (configOrDir && typeof configOrDir === 'object') {
    const cfgSub = configOrDir.defaults?.specializedSubagents || configOrDir.specializedSubagents || configOrDir;
    dirOption = cfgSub.directory || cfgSub.scope || 'projectLevel';
  }

  const raw = String(dirOption || '').trim();
  const normalized = raw.toLowerCase();
  const isUserLevel = normalized === 'userlevel' || normalized === 'user';
  const isProjectLevel = normalized === 'projectlevel' || normalized === 'project';

  const root = path.resolve(repoRoot || process.cwd());
  const home = os.homedir();

  if (isUserLevel) {
    if (host === 'cursor') return path.join(home, '.cursor', 'agents');
    if (host === 'claude') return path.join(home, '.claude', 'agents');
    return path.join(home, '.agents', 'projections');
  }

  if (isProjectLevel || !raw) {
    if (host === 'cursor') return path.join(root, '.cursor', 'agents');
    if (host === 'claude') return path.join(root, '.claude', 'agents');
    return path.join(root, '.agents', 'projections');
  }

  // Explicit custom directory path
  let custom = raw;
  if (custom.startsWith('~/') || custom.startsWith('~\\')) {
    custom = path.join(home, custom.slice(2));
  } else if (custom.includes('$HOME') || custom.includes('%USERPROFILE%')) {
    custom = custom.replace(/\$HOME/g, home).replace(/%USERPROFILE%/g, home);
  }

  if (path.isAbsolute(custom)) {
    return path.resolve(custom);
  }

  // Dynamically load from project relative
  return path.resolve(root, custom);
}

module.exports = {
  HUB_REL,
  HUB_CONFIG,
  HUB_CONFIG_EXAMPLE,
  HUB_RUNTIME_REL,
  HUB_TEMPLATES_REL,
  inside,
  resolveGlobalSkillsRoot,
  resolveKnownGlobalSkillsRoots,
  isGlobalSkillsRoot,
  resolveExecutionGlobalSkillsRoot,
  consumerHubExists,
  resolveRepoRoot,
  sharedDir,
  resolveConsumerContext,
  resolveSkillMdPath,
  resolveConfiguredPath,
  toRepoRelative,
  reportResolved,
  normalizeConfig,
  resolveMinVerifyScore,
  resolveMemoryRouting,
  resolveSpecializedSubagentsDirectory,
};
