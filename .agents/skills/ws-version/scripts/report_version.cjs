'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

const skillDir = path.resolve(__dirname, '..');
const loadedSkillsRoot = path.resolve(skillDir, '..');
const globalSkillsRoot = path.resolve(
  process.env.WORKFLOW_SKILLS_GLOBAL_DIR || path.join(os.homedir(), '.agents', 'skills'),
);

function normalizeForCompare(filePath) {
  const resolved = path.resolve(filePath);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function isUnderGlobalSkillsRoot(absSkillDir, absGlobalRoot) {
  const skill = normalizeForCompare(absSkillDir);
  const root = normalizeForCompare(absGlobalRoot);
  const rel = path.relative(root, skill);
  if (rel === '') {
    return true;
  }
  return rel.length > 0 && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function readPackageVersion() {
  const versionPath = path.join(loadedSkillsRoot, 'ws-shared', 'version.json');
  if (!fs.existsSync(versionPath)) {
    return { ok: false };
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  } catch {
    return { ok: false };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false };
  }
  const version = data.version;
  if (typeof version !== 'string' || !SEMVER_RE.test(version)) {
    return { ok: false };
  }
  return { ok: true, version };
}

function readProjectConfig() {
  const configPath = path.join(process.cwd(), '.ws', 'config.json');
  if (!fs.existsSync(configPath)) {
    return { ok: false };
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return { ok: false };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false };
  }
  return { ok: true, data };
}

function storedValue(root, keyPath) {
  let cur = root;
  for (const key of keyPath) {
    if (!cur || typeof cur !== 'object') {
      return '(unset)';
    }
    cur = cur[key];
  }
  if (cur === undefined || cur === null) {
    return '(unset)';
  }
  return String(cur);
}

const installScope = isUnderGlobalSkillsRoot(skillDir, globalSkillsRoot)
  ? 'global'
  : 'project-local';
const versionResult = readPackageVersion();
const configResult = readProjectConfig();

console.log(`installScope: ${installScope}`);
console.log(`skillDir: ${skillDir}`);

let exitCode = 0;
if (versionResult.ok) {
  console.log(`packageVersion: ${versionResult.version}`);
} else {
  console.log('packageVersion: unavailable');
  exitCode = 1;
}

if (configResult.ok) {
  const cfg = configResult.data;
  console.log(`pathTokens.skillsRoot: ${storedValue(cfg, ['pathTokens', 'skillsRoot'])}`);
  console.log(`pathTokens.sharedDir: ${storedValue(cfg, ['pathTokens', 'sharedDir'])}`);
  console.log(`plans.dir: ${storedValue(cfg, ['plans', 'dir'])}`);
  console.log(`plans.specsDir: ${storedValue(cfg, ['plans', 'specsDir'])}`);
} else {
  console.log('project config: unavailable');
}

process.exit(exitCode);
