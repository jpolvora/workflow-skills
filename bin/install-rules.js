import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

/**
 * Shared installer include/skip rules — used by cli.js copy paths and skill-integrity hashing.
 * Keep copy and hash enumeration in lockstep; do not diverge these sets.
 */

const INSTALL_RULES_DIR = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_HUB_DIR = path.join(INSTALL_RULES_DIR, '..', '.agents', 'skills', 'ws-shared');
const HUB_LAYOUT_PATH = path.join(SOURCE_HUB_DIR, 'runtime', 'hub-layout.json');

function readHubLayout() {
  let layout;
  try {
    layout = JSON.parse(fs.readFileSync(HUB_LAYOUT_PATH, 'utf8'));
  } catch (err) {
    throw new Error(`Unable to read ws-shared hub layout manifest: ${err.message}`);
  }
  if (!layout || layout.version !== 1 || !layout.categories) {
    throw new Error('Invalid ws-shared hub layout manifest: expected version 1 categories');
  }
  return layout;
}

export const HUB_LAYOUT = readHubLayout();
export const HUB_LAYOUT_MANIFEST = 'runtime/hub-layout.json';

const HUB_LAYOUT_CATEGORIES = [
  'runtime',
  'templates',
  'consumerOwned',
  'generatedLocal',
  'installerMetadata',
];

function normalizeHubPath(value) {
  return String(value).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function layoutCategoryMatches(layout, relativePath) {
  const normalized = normalizeHubPath(relativePath);
  const matches = [];
  for (const [name, category] of Object.entries(layout.categories || {})) {
    for (const root of category.roots || []) {
      const normalizedRoot = normalizeHubPath(root);
      if (normalized === normalizedRoot || normalized.startsWith(`${normalizedRoot}/`)) {
        matches.push(name);
      }
    }
    for (const entry of category.paths || []) {
      const normalizedEntry = normalizeHubPath(entry);
      const isDirectory = !path.extname(normalizedEntry);
      if (
        normalized === normalizedEntry ||
        (isDirectory && normalized.startsWith(`${normalizedEntry}/`))
      ) {
        matches.push(name);
      }
    }
  }
  for (const [sourceName, destinationName] of Object.entries(
    Object.values(layout.categories || {}).reduce(
      (aliases, category) => ({ ...aliases, ...(category.destinationAliases || {}) }),
      {},
    ),
  )) {
    if (normalized === normalizeHubPath(destinationName)) {
      const sourceMatches = layoutCategoryMatches(layout, sourceName);
      matches.push(...sourceMatches);
    }
  }
  return [...new Set(matches)];
}

export function validateHubLayout(sharedRoot = SOURCE_HUB_DIR, layout = HUB_LAYOUT) {
  const errors = [];
  if (layout.version !== 1 || !layout.categories) {
    errors.push('manifest must declare version 1 and categories');
    return { ok: false, errors, unclassified: [], multiplyClassified: [] };
  }
  for (const name of HUB_LAYOUT_CATEGORIES) {
    if (!layout.categories[name]) errors.push(`missing category: ${name}`);
  }

  const unclassified = [];
  const multiplyClassified = [];
  const walk = (directory, relativeBase = '') => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = relativeBase ? path.join(relativeBase, entry.name) : entry.name;
      const matches = layoutCategoryMatches(layout, relative);
      if (matches.length === 0) unclassified.push(normalizeHubPath(relative));
      if (matches.length > 1) {
        multiplyClassified.push({ path: normalizeHubPath(relative), categories: matches });
      }
      if (entry.isDirectory()) walk(path.join(directory, entry.name), relative);
    }
  };
  if (fs.existsSync(sharedRoot)) walk(sharedRoot);
  if (unclassified.length) errors.push(`unclassified entries: ${unclassified.join(', ')}`);
  if (multiplyClassified.length) {
    errors.push(
      `multiply classified entries: ${multiplyClassified
        .map((entry) => `${entry.path} (${entry.categories.join(', ')})`)
        .join(', ')}`,
    );
  }
  return { ok: errors.length === 0, errors, unclassified, multiplyClassified };
}

const HUB_LAYOUT_VALIDATION = validateHubLayout();
if (!HUB_LAYOUT_VALIDATION.ok) {
  throw new Error(`Invalid ws-shared hub layout: ${HUB_LAYOUT_VALIDATION.errors.join('; ')}`);
}

/** Hub roots copied into consumer ws-shared/ from the layout manifest. */
export const HUB_WHITELIST = Object.values(HUB_LAYOUT.categories)
  .filter((category) => category.copy === true && Array.isArray(category.roots))
  .flatMap((category) => category.roots)
  .filter((value, index, values) => values.indexOf(value) === index);

/** Dest paths for nested managed files whose installed name differs. */
export const HUB_DEST_ALIASES = Object.fromEntries(
  Object.values(HUB_LAYOUT.categories)
    .flatMap((category) => Object.entries(category.destinationAliases || {})),
);

function categoryPaths(categoryName) {
  return new Set(HUB_LAYOUT.categories[categoryName]?.paths || []);
}

export const HUB_DIR = 'ws-shared';
export const INSTALLED_SKILLS_FILE = 'installed-skills.json';
export const SKILL_INTEGRITY_LOCAL_FILE = 'skill-integrity-local.json';

/**
 * Consumer-owned artifacts under ws-shared/ — never copy upstream content into consumers.
 * Fresh install seeds empty templates; existing consumer files are preserved.
 */
export const CONSUMER_OWNED_HUB_FILES = new Set(
  [...categoryPaths('consumerOwned'), ...categoryPaths('generatedLocal'), ...categoryPaths('installerMetadata')]
    .filter((entry) => !entry.includes('/')),
);

export const CONSUMER_OWNED_HUB_DIRS = new Set(
  [...categoryPaths('consumerOwned'), ...categoryPaths('generatedLocal'), ...categoryPaths('installerMetadata')]
    .filter((entry) => !path.extname(entry)),
);

export const GENERATED_LOCAL_HUB_PATHS = categoryPaths('generatedLocal');
export const INSTALLER_METADATA_HUB_PATHS = categoryPaths('installerMetadata');

export function hubLayoutPathCategory(relativePath) {
  const normalized = String(relativePath).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  for (const [name, category] of Object.entries(HUB_LAYOUT.categories)) {
    for (const root of category.roots || []) {
      if (normalized === root || normalized.startsWith(`${root}/`)) return name;
    }
    if ((category.paths || []).includes(normalized)) return name;
  }
  return null;
}

/** Pack / VCS metadata / bytecode / ephemeral runs — never install into consumer skill trees. */
export const SKIP_INSTALL_FILES = new Set(['.npmignore', '.gitignore', '__pycache__', 'runs']);

/** Legacy: never copy MEMORY.md / memory/ / config.json from skill folders into consumers. */
export const CONSUMER_OWNED_FILES = new Set(['config.json', 'MEMORY.md']);
export const CONSUMER_OWNED_DIRS = new Set(['memory']);

/** Skip bytecode, ephemeral runs/, and other non-skill artifacts during install/update copies. */
export function shouldSkipInstallEntry(name) {
  return (
    name === '__pycache__' ||
    name === 'runs' ||
    name.endsWith('.pyc') ||
    name.endsWith('.pyo')
  );
}

/**
 * True for manual backup/scratch files left in ws-shared/ (for example
 * `CATALOG.md.bak_20260907-1756` or `AGENTS.md.bak`). These are not managed
 * hub entries and are pruned during layout migration instead of failing update.
 */
export function isHubBackupArtifact(name) {
  if (name === 'config.json.bak') return false;
  return (
    name.startsWith('.tmp-') ||
    /\.bak_/i.test(name) ||
    /\.bak$/i.test(name) ||
    name.endsWith('~')
  );
}

/** True when this entry must never be copied from upstream (consumer-owned). */
export function isConsumerOwnedEntry(entryName, isDirectory) {
  if (CONSUMER_OWNED_FILES.has(entryName)) return true;
  if (isDirectory && CONSUMER_OWNED_DIRS.has(entryName)) return true;
  return false;
}

/**
 * True when `dir` is the workflow-skills upstream package root (authoring source).
 * Used to block remote `npx` installs into this repo — packageRoot alone is insufficient
 * because npx runs the CLI from a cache copy, not from cwd.
 */
export function isWorkflowSkillsSourceTree(dir) {
  const root = path.resolve(dir);
  const pkgPath = path.join(root, 'package.json');
  const cliPath = path.join(root, 'bin', 'cli.js');
  if (!fs.existsSync(pkgPath) || !fs.existsSync(cliPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.name !== 'workflow-skills') return false;
  } catch {
    return false;
  }
  return (
    fs.existsSync(path.join(root, 'bin', 'skill-dependencies.json')) ||
    fs.existsSync(path.join(root, '.agents', 'skills', 'ws-shared', 'runtime', 'skill-dependencies.json'))
  );
}

/** Walk parents from startDir; return workflow-skills source root or null. */
export function findWorkflowSkillsSourceRoot(startDir) {
  let dir = path.resolve(startDir);
  const fsRoot = path.parse(dir).root;
  while (true) {
    if (isWorkflowSkillsSourceTree(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir || dir === fsRoot) return null;
    dir = parent;
  }
}

/**
 * Whether install/update/uninstall must refuse cwd.
 * @param {string} cwd - consumer target directory
 * @param {string} packageRoot - running CLI package root (local checkout or npx cache)
 */
export function isBlockedInstallTarget(cwd, packageRoot) {
  const resolvedCwd = path.resolve(cwd);
  const resolvedPackageRoot = path.resolve(packageRoot);
  const packageTestDir = path.join(resolvedPackageRoot, 'test');

  const isExactPackageRoot = resolvedCwd === resolvedPackageRoot;
  const isUnderPackageRoot = resolvedCwd.startsWith(resolvedPackageRoot + path.sep);
  const isPackageTestConsumer =
    resolvedCwd === packageTestDir || resolvedCwd.startsWith(packageTestDir + path.sep);

  if (isExactPackageRoot || (isUnderPackageRoot && !isPackageTestConsumer)) {
    return true;
  }

  const sourceRoot = findWorkflowSkillsSourceRoot(resolvedCwd);
  if (!sourceRoot) return false;

  const sourceTestDir = path.join(sourceRoot, 'test');
  const isSourceTestConsumer =
    resolvedCwd === sourceTestDir || resolvedCwd.startsWith(sourceTestDir + path.sep);
  return !isSourceTestConsumer;
}

/**
 * Resolves user home directory reliably across operating systems and environment configurations.
 * On Windows (win32), prioritizes USERPROFILE / HOMEDRIVE+HOMEPATH to avoid Git Bash POSIX path issues.
 * @returns {string} Absolute path to user home directory
 */
export function getHomeDir() {
  const pick = (p) => (p && typeof p === 'string' && p.trim() ? path.resolve(p.trim()) : null);
  const fromDrive = () =>
    process.env.HOMEDRIVE && process.env.HOMEPATH
      ? path.resolve(process.env.HOMEDRIVE + process.env.HOMEPATH)
      : null;

  if (process.platform === 'win32') {
    const userProfile = pick(process.env.USERPROFILE);
    if (userProfile) return userProfile;
    const drivePath = fromDrive();
    if (drivePath) return drivePath;
    if (process.env.HOME && !process.env.HOME.startsWith('/')) {
      const homePath = pick(process.env.HOME);
      if (homePath) return homePath;
    }
  } else {
    const homePath = pick(process.env.HOME);
    if (homePath) return homePath;
    const userProfile = pick(process.env.USERPROFILE);
    if (userProfile) return userProfile;
    const drivePath = fromDrive();
    if (drivePath) return drivePath;
  }

  try {
    const home = os.homedir();
    if (home && home.trim()) return path.resolve(home.trim());
  } catch {
    // Fall through to error
  }
  throw new Error(
    'Unable to determine user home directory across environment variables (USERPROFILE, HOME) or os.homedir().'
  );
}

/**
 * Checks whether a given directory is the user home directory.
 * @param {string} [dir=process.cwd()]
 * @returns {boolean}
 */
export function isHomeDirectory(dir = process.cwd()) {
  try {
    const home = getHomeDir();
    return path.resolve(dir) === path.resolve(home);
  } catch {
    return false;
  }
}

/**
 * Resolves the global skills directory based on environment override or user home default (~/.agents/skills).
 * 1. process.env.WORKFLOW_SKILLS_GLOBAL_DIR (if set)
 * 2. Default: ~/.agents/skills
 * @returns {string} Absolute path to global skills directory
 */
export function resolveGlobalSkillsDir() {
  if (process.env.WORKFLOW_SKILLS_GLOBAL_DIR && process.env.WORKFLOW_SKILLS_GLOBAL_DIR.trim()) {
    return path.resolve(process.env.WORKFLOW_SKILLS_GLOBAL_DIR.trim());
  }
  const home = getHomeDir();
  return path.join(home, '.agents', 'skills');
}

/**
 * Checks and ensures target directory exists and is writeable.
 * Throws a friendly, actionable Error if target cannot be created or written to.
 * @param {string} targetDirPath - Directory to check/create
 * @returns {string} Absolute path to ensured writeable directory
 */
export function ensureWriteableDir(targetDirPath) {
  const resolvedPath = path.resolve(targetDirPath);
  try {
    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true });
    }
    try {
      fs.accessSync(resolvedPath, fs.constants.W_OK);
    } catch {
      const probeFile = path.join(resolvedPath, `.probe-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      fs.writeFileSync(probeFile, 'test');
      fs.unlinkSync(probeFile);
    }
  } catch (err) {
    throw new Error(
      `Target directory "${resolvedPath}" is not writeable or cannot be created: ${err.message}. Please check write permissions.`
    );
  }
  return resolvedPath;
}

/**
 * Resolves the target skills directory for installation based on scope options.
 * @param {Object} options
 * @param {boolean} [options.isGlobal] - Whether target scope is global
 * @param {string} [options.targetDir] - Project root directory (defaults to process.cwd())
 */
export function resolveTargetSkillsDir(options = {}) {
  if (options.isGlobal) {
    return resolveGlobalSkillsDir();
  }
  const baseDir = options.targetDir ? path.resolve(options.targetDir) : process.cwd();
  return path.join(baseDir, '.agents', 'skills');
}

/**
 * Standard global host skill target definitions.
 */
export const GLOBAL_HOST_TARGETS = [
  {
    id: 'canonical',
    name: 'Canonical Agents',
    subpath: path.join('.agents', 'skills'),
    defaultSelected: true,
    description: 'Cursor, OpenCode, Codex, and portable agents (~/.agents/skills)',
  },
  {
    id: 'claude',
    name: 'Claude Code',
    subpath: path.join('.claude', 'skills'),
    defaultSelected: false,
    description: 'Claude Code user skills (~/.claude/skills)',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    subpath: path.join('.codex', 'skills'),
    defaultSelected: false,
    description: 'OpenAI Codex / GPT agent skills (~/.codex/skills)',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI / Antigravity IDE',
    subpath: path.join('.gemini', 'config', 'skills'),
    defaultSelected: false,
    description: 'Gemini CLI & Antigravity IDE global customizations (~/.gemini/config/skills)',
  },
];

/**
 * Returns the list of standard global host targets with absolute paths resolved against homeDir.
 * @param {string} [homeDir] - User home directory (defaults to getHomeDir())
 * @returns {Array<{ id: string, name: string, subpath: string, path: string, defaultSelected: boolean, description: string }>}
 */
export function getGlobalHostTargets(homeDir = getHomeDir()) {
  return GLOBAL_HOST_TARGETS.map((t) => ({
    ...t,
    path: path.join(homeDir, t.subpath),
  }));
}

/**
 * Resolves a target identifier or custom path to an absolute path.
 * @param {string} idOrPath - Target ID ('canonical', 'claude', 'codex', 'gemini') or custom path
 * @param {string} [homeDir] - User home directory (defaults to getHomeDir())
 * @returns {string} Absolute path to resolved target directory
 */
export function resolveHostTargetPath(idOrPath, homeDir = getHomeDir()) {
  const match = GLOBAL_HOST_TARGETS.find((t) => t.id === idOrPath.toLowerCase().trim());
  if (match) {
    return path.join(homeDir, match.subpath);
  }
  return path.resolve(idOrPath);
}

function simpleCopyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      simpleCopyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Projects a single skill directory from canonical location to a secondary target
 * via directory symlink (junction on Windows, dir on POSIX) with graceful fallback to copy.
 * @param {string} srcSkillPath - Absolute path to skill in canonical global root
 * @param {string} destSkillPath - Absolute path to skill destination in secondary target root
 * @param {Object} [options]
 * @param {boolean} [options.symlink] - Whether to attempt symlink creation (default true)
 * @param {Function} [options.copyFn] - Custom copy function (default simple recursive copy)
 * @returns {{ mode: 'symlink' | 'copy', fallback: boolean, error?: string }}
 */
export function projectSkillToTarget(srcSkillPath, destSkillPath, options = {}) {
  const useSymlink = options.symlink !== false;
  const copyFn = typeof options.copyFn === 'function' ? options.copyFn : simpleCopyDir;

  ensureWriteableDir(path.dirname(destSkillPath));

  if (fs.existsSync(destSkillPath)) {
    try {
      fs.rmSync(destSkillPath, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  if (useSymlink) {
    try {
      const type = process.platform === 'win32' ? 'junction' : 'dir';
      fs.symlinkSync(srcSkillPath, destSkillPath, type);
      return { mode: 'symlink', fallback: false };
    } catch (err) {
      copyFn(srcSkillPath, destSkillPath);
      return { mode: 'copy', fallback: true, error: err.message };
    }
  } else {
    copyFn(srcSkillPath, destSkillPath);
    return { mode: 'copy', fallback: false };
  }
}

