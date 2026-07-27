import fs from 'fs';
import path from 'path';

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
  'AGENTS.md',
  // npm cannot pack a file named .gitignore; ship hub.gitignore → install as .gitignore
  'hub.gitignore',
  'MEMORY.md.template',
  'CHANGELOG.md.template',
  'skill-dependencies.json',
];

/** Dest name when whitelist source name differs (pack vs consumer layout). */
export const HUB_DEST_ALIASES = {
  'hub.gitignore': '.gitignore',
};

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
  INSTALLED_SKILLS_FILE,
  SKILL_INTEGRITY_LOCAL_FILE,
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
