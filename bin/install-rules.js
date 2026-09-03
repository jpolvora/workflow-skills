import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Shared installer include/skip rules — used by cli.js copy paths and skill-integrity hashing.
 * Keep copy and hash enumeration in lockstep; do not diverge these sets.
 */

/** Hub files copied into consumer ws-shared/ (upstream templates/docs — not consumer data). */
export const HUB_WHITELIST = [
  'config.json.example',
  'config.schema.json',
  'tools.md',
  'STACK.md.example',
  'setup.md',
  'gates.md',
  'config-resolution.md',
  'host-dispatch.md',
  'scm-provider-contract.md',
  'AGENTS.md',
  'CATALOG.md',
  'CROSS-PLATFORM.md',
  'autoload.md',
  'ac-ledger.schema.json',
  'plan-index.schema.json',
  'plans-index.schema.json',
  'run.schema.json',
  'step-artifact.schema.json',
  'telemetry.schema.json',
  'workflow-state.schema.json',
  'evals.schema.json',
  'schemas',
  // npm cannot pack a file named .gitignore; ship hub.gitignore → install as .gitignore
  'hub.gitignore',
  'MEMORY.md.template',
  'CHANGELOG.md.template',
  'skill-dependencies.json',
  'scripts',
];

/** Dest name when whitelist source name differs (pack vs consumer layout). */
export const HUB_DEST_ALIASES = {
  'hub.gitignore': '.gitignore',
};

export const HUB_DIR = 'ws-shared';
export const INSTALLED_SKILLS_FILE = 'installed-skills.json';
export const SKILL_INTEGRITY_LOCAL_FILE = 'skill-integrity-local.json';

/**
 * Consumer-owned artifacts under ws-shared/ — never copy upstream content into consumers.
 * Fresh install seeds empty templates; existing consumer files are preserved.
 */
export const CONSUMER_OWNED_HUB_FILES = new Set([
  'config.json',
  'MEMORY.md',
  'STACK.md',
  'CHANGELOG.md',
  'backend.md',
  'frontend.md',
  INSTALLED_SKILLS_FILE,
  SKILL_INTEGRITY_LOCAL_FILE,
  'host-capabilities.json',
]);

export const CONSUMER_OWNED_HUB_DIRS = new Set(['memory']);

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
    fs.existsSync(path.join(root, '.agents', 'skills', 'ws-shared', 'skill-dependencies.json'))
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

