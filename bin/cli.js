#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import readline from 'readline/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageRoot = path.resolve(__dirname, '..');
const srcSkillsDir = path.join(packageRoot, '.agents', 'skills');
const srcAgentsIndex = path.join(packageRoot, '.agents', 'AGENTS.md');
const skillGraphPath = path.join(packageRoot, 'bin', 'skill-dependencies.json');
const targetDir = process.cwd();
const targetAgentsDir = path.join(targetDir, '.agents');
const targetSkillsDir = path.join(targetAgentsDir, 'skills');
const CONFIG_FILE = 'config.json';
const HUB_DIR = 'shared';

/** Hub files copied into consumer shared/ (config/docs only — not skills). */
const HUB_WHITELIST = [
  'config.json.example',
  'config.schema.json',
  'tools.md',
  'stack.md',
  'setup.md',
  'gates.md',
  'config-resolution.md',
  'AGENTS.md',
  '.gitignore',
];

/** Skills promoted out of shared/ — used for consumer migration. */
const PROMOTED_SKILLS = [
  'caveman',
  'gabarito',
  'karpathy-guidelines',
  'spec-format',
  'goal-loop',
  'self-learning',
  'changelog',
];

/** Old consumer folder names → current upstream skill folder names */
const SKILL_RENAMES = [{ from: 'us-workflow', to: 'spec-to-pr' }];

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

function listSkillDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => {
    return fs.statSync(path.join(dir, name)).isDirectory();
  });
}

/** Top-level dirs with SKILL.md, excluding the shared/ hub. */
function listInstallableSkills(dir = srcSkillsDir) {
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
    (n) => n === 'spec-to-pr' || n === 'spec-to-pr-lite' || workflows.has(n)
  );
}

/**
 * Migrate renamed skills in the consumer target.
 * Preserves config.json from the old folder, installs/updates the new folder, removes the old folder.
 */
function migrateRenamedSkills(skills) {
  if (!fs.existsSync(targetSkillsDir)) return;

  for (const { from, to } of SKILL_RENAMES) {
    const oldPath = path.join(targetSkillsDir, from);
    const newPath = path.join(targetSkillsDir, to);
    const srcPath = path.join(srcSkillsDir, to);

    if (!fs.existsSync(oldPath)) continue;
    if (!skills.includes(to) || !fs.existsSync(srcPath)) continue;

    console.log(`  Migrating '${from}' → '${to}'...`);
    const oldConfigPath = path.join(oldPath, CONFIG_FILE);
    const preservedConfig = fs.existsSync(oldConfigPath)
      ? fs.readFileSync(oldConfigPath)
      : null;

    if (fs.existsSync(newPath)) {
      copyDirPreservingConfig(srcPath, newPath, CONFIG_FILE);
    } else {
      copyDirSync(srcPath, newPath);
    }

    if (preservedConfig) {
      fs.writeFileSync(path.join(newPath, CONFIG_FILE), preservedConfig);
      console.log(`    Preserved ${CONFIG_FILE} from '${from}'`);
    }

    fs.rmSync(oldPath, { recursive: true, force: true });
    console.log(`  Migrated '${from}' → '${to}' (${CONFIG_FILE} preserved)`);
  }
}

/**
 * Migrate nested shared/<promoted>/ skills to top-level consumer paths.
 * Preserves self-learning/memory/ and MEMORY.md.
 */
function migratePromotedSkills() {
  if (!fs.existsSync(targetSkillsDir)) return;

  const destShared = path.join(targetSkillsDir, HUB_DIR);

  for (const slug of PROMOTED_SKILLS) {
    const nested = path.join(destShared, slug);
    const top = path.join(targetSkillsDir, slug);
    if (!fs.existsSync(nested)) continue;

    console.log(`  Migrating shared/${slug}/ → ${slug}/...`);

    if (!fs.existsSync(top)) {
      fs.renameSync(nested, top);
      console.log(`    Moved shared/${slug}/ → ${slug}/`);
    } else {
      // Both exist: preserve consumer memory, refresh from nested then remove nested
      const nestedMemory = path.join(nested, 'memory');
      const topMemory = path.join(top, 'memory');
      if (fs.existsSync(nestedMemory)) {
        fs.mkdirSync(topMemory, { recursive: true });
        for (const entry of fs.readdirSync(nestedMemory, { withFileTypes: true })) {
          if (!entry.isFile()) continue;
          const destFile = path.join(topMemory, entry.name);
          if (!fs.existsSync(destFile)) {
            fs.copyFileSync(path.join(nestedMemory, entry.name), destFile);
            console.log(`    Preserved memory/${entry.name}`);
          }
        }
      }
      const nestedMemMd = path.join(nested, 'MEMORY.md');
      const topMemMd = path.join(top, 'MEMORY.md');
      if (fs.existsSync(nestedMemMd) && !fs.existsSync(topMemMd)) {
        fs.copyFileSync(nestedMemMd, topMemMd);
        console.log(`    Preserved MEMORY.md`);
      }
      fs.rmSync(nested, { recursive: true, force: true });
      console.log(`    Removed nested shared/${slug}/`);
    }
  }

  // Legacy memory under shared/self-learning/ when top-level self-learning already exists
  const legacyMemory = path.join(destShared, 'self-learning', 'memory');
  const topMemory = path.join(targetSkillsDir, 'self-learning', 'memory');
  if (fs.existsSync(legacyMemory)) {
    fs.mkdirSync(topMemory, { recursive: true });
    for (const entry of fs.readdirSync(legacyMemory, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const destFile = path.join(topMemory, entry.name);
      if (!fs.existsSync(destFile)) {
        fs.copyFileSync(path.join(legacyMemory, entry.name), destFile);
        console.log(`    Migrated memory file → self-learning/memory/${entry.name}`);
      }
    }
    const legacySelf = path.join(destShared, 'self-learning');
    if (fs.existsSync(legacySelf)) {
      fs.rmSync(legacySelf, { recursive: true, force: true });
      console.log(`    Removed legacy shared/self-learning/`);
    }
  }
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    const pathParts = srcPath.split(path.sep);
    const isInsideMemory = pathParts.includes('memory') && !entry.isDirectory();
    if (isInsideMemory) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyDirPreservingConfig(src, dest, preservedFile) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    const pathParts = srcPath.split(path.sep);
    const isMemoryFolder = pathParts.includes('memory');

    const isInsideMemory = isMemoryFolder && !entry.isDirectory();
    if (isInsideMemory) {
      continue;
    }

    let isPreserved = false;
    if (fs.existsSync(destPath)) {
      if (entry.name === preservedFile) {
        isPreserved = true;
      } else if (entry.name === 'MEMORY.md') {
        isPreserved = true;
      } else if (isMemoryFolder) {
        isPreserved = true;
      }
    }

    if (entry.isDirectory()) {
      copyDirPreservingConfig(srcPath, destPath, preservedFile);
    } else if (isPreserved) {
      console.log(`    Skipped (preserved): ${path.relative(dest, destPath) || entry.name}`);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Install/update shared/ hub (config + docs only). Preserves consumer config.json.
 * Does not create self-learning/memory under shared/.
 */
function ensureSharedHubInstalled(mode = 'install') {
  const srcShared = path.join(srcSkillsDir, HUB_DIR);
  const destShared = path.join(targetSkillsDir, HUB_DIR);
  if (!fs.existsSync(srcShared)) return;

  fs.mkdirSync(destShared, { recursive: true });

  for (const name of HUB_WHITELIST) {
    const srcPath = path.join(srcShared, name);
    if (!fs.existsSync(srcPath)) continue;
    const destPath = path.join(destShared, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  // Preserve consumer config.json if present; never overwrite from example
  const destConfig = path.join(destShared, CONFIG_FILE);
  if (!fs.existsSync(destConfig)) {
    const example = path.join(srcShared, 'config.json.example');
    if (mode === 'install' && fs.existsSync(example) && !fs.existsSync(destConfig)) {
      // Do not auto-copy example as config.json — consumer copies manually
    }
  }

  console.log(
    `  shared/ hub ${mode === 'update' ? 'updated' : 'installed'} (config.json preserved if present)`
  );
}

/** Install or refresh packaged `.agents/AGENTS.md` (consumer skill index + rules). */
function installPackagedAgentsIndex() {
  if (!fs.existsSync(srcAgentsIndex)) {
    console.log('  Note: packaged .agents/AGENTS.md not present in this release; skipped.');
    return;
  }
  fs.mkdirSync(targetAgentsDir, { recursive: true });
  const dest = path.join(targetAgentsDir, 'AGENTS.md');
  fs.copyFileSync(srcAgentsIndex, dest);
  console.log(`  Installed packaged index: .agents/AGENTS.md`);
}

/** Block installing into the source package itself (except test/ consumer). */
function assertNotSelfOverwrite() {
  const cwd = path.resolve(targetDir);
  const root = path.resolve(packageRoot);
  const testDir = path.resolve(packageRoot, 'test');

  const isExactRoot = cwd === root;
  const isUnderRoot = cwd.startsWith(root + path.sep);
  const isTestConsumer = cwd === testDir || cwd.startsWith(testDir + path.sep);

  if (isExactRoot || (isUnderRoot && !isTestConsumer)) {
    console.error('Error: Refusing to install into the workflow-skills source repository.');
    console.error(`  Package root: ${root}`);
    console.error(`  Current dir:  ${cwd}`);
    console.error('Run this command from a consumer project, or from the test/ folder.');
    process.exit(1);
  }
}

function getLocalVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function fetchRemoteVersion() {
  return new Promise((resolve, reject) => {
    const url = 'https://raw.githubusercontent.com/jpolvora/workflow-skills/main/package.json';
    https.get(url, { timeout: 10000 }, (res) => {
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
    }).on('error', reject);
  });
}

function parseVersion(v) {
  return v.split('.').map(Number);
}

function printHelp() {
  console.log(`Usage:
  npx --yes github:jpolvora/workflow-skills              Interactive install
  npx --yes github:jpolvora/workflow-skills install --full --yes
  npx --yes github:jpolvora/workflow-skills install --package workflows --yes
  npx --yes github:jpolvora/workflow-skills install --skills spec-to-pr,08-fix-pr --yes
  npx --yes github:jpolvora/workflow-skills update       Update installed skills (preserves config.json)
  npx --yes github:jpolvora/workflow-skills update --include-new
      Also install upstream skill folders not yet present locally
  npx --yes github:jpolvora/workflow-skills --version    Print installed version
  npx --yes github:jpolvora/workflow-skills --check      Compare installed vs latest online version
  npx --yes github:jpolvora/workflow-skills --help

Non-interactive install:
  install --full|--package <full|workflows|extra>|--skills <csv> [--yes]
  --yes  Overwrite existing skill dirs without prompts; always preserves config.json
  Non-TTY (CI/agents): --yes is required

Interactive package shortcuts:
  f  Full package (all installable skills + shared/ hub)
  w  Workflows package (orchestrators + pipeline deps + hub)
  e  Extra package (standalone review/design/meta skills)
  a  Select/deselect all
  #  Toggle individual skill (also selects transitive dependencies)
  y  Install selected skills

Notes:
  - Prefer: npx --yes github:jpolvora/workflow-skills (do NOT use github:…@latest or @main — npm exit 128).
  - Cache bust: clear the npx cache, then re-run with npx --yes (no @latest suffix on github:).
  - Skills under .agents/skills/ are overwritten on update/install --yes; config.json is preserved.
  - shared/ is a config/docs hub (not a selectable skill); installed with workflows/full.
  - self-learning/memory/ and MEMORY.md are preserved on update.
  - Dependency map: bin/skill-dependencies.json (update when installer graph changes).
  - Packaged .agents/AGENTS.md is refreshed on install and update.
  - After installing or updating, run the "check-harness" skill to validate the harness.
  - Prefer this Node CLI over install-skills.sh for packages, deps, and update.
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

  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--yes' || a === '-y') {
      yes = true;
    } else if (a === '--full') {
      full = true;
    } else if (a === '--package') {
      packageKey = rest[++i];
      if (!packageKey || packageKey.startsWith('-')) {
        console.error('Error: --package requires a value (full|workflows|extra).');
        process.exit(1);
      }
    } else if (a === '--skills') {
      skillCsv = rest[++i];
      if (!skillCsv || skillCsv.startsWith('-')) {
        console.error('Error: --skills requires a comma-separated list of skill names.');
        process.exit(1);
      }
    } else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Error: Unknown install argument: ${a}`);
      console.error('Use: install --full|--package <key>|--skills <csv> [--yes]');
      process.exit(1);
    }
  }

  const modeCount = [full, packageKey != null, skillCsv != null].filter(Boolean).length;
  if (modeCount !== 1) {
    console.error('Error: install requires exactly one of --full, --package <key>, or --skills <csv>.');
    console.error('Example: npx --yes github:jpolvora/workflow-skills install --full --yes');
    process.exit(1);
  }

  if (!process.stdin.isTTY && !yes) {
    console.error('Error: Non-interactive install (non-TTY stdin) requires --yes.');
    console.error('Example: npx --yes github:jpolvora/workflow-skills install --full --yes');
    process.exit(1);
  }

  const validPackages = new Set(['full', 'workflows', 'extra']);
  if (packageKey != null && !validPackages.has(packageKey)) {
    console.error(`Error: Unknown package '${packageKey}'. Use full|workflows|extra.`);
    process.exit(1);
  }

  let skillNames = null;
  if (skillCsv != null) {
    skillNames = skillCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillNames.length === 0) {
      console.error('Error: --skills list is empty.');
      process.exit(1);
    }
  }

  return { yes, full, packageKey, skillNames };
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

/** Shared post-selection install: copy skills, hub, packaged AGENTS.md. */
function installSelectedSkills(skills, selectedNames, { overwrite }) {
  let installedCount = 0;
  let hubEnsured = false;

  for (const skillName of selectedNames) {
    const srcPath = path.join(srcSkillsDir, skillName);
    const destPath = path.join(targetSkillsDir, skillName);
    if (!fs.existsSync(srcPath)) continue;

    console.log(`Installing '${skillName}'...`);

    if (fs.existsSync(destPath)) {
      if (!overwrite) {
        console.log(`  Skipped: ${skillName}`);
        continue;
      }
      copyDirPreservingConfig(srcPath, destPath, CONFIG_FILE);
      console.log(`  Installed: ${skillName} -> .agents/skills/${skillName}`);
      installedCount++;
      continue;
    }

    copyDirSync(srcPath, destPath);
    console.log(`  Installed: ${skillName} -> .agents/skills/${skillName}`);
    installedCount++;
  }

  if (shouldEnsureHub(selectedNames)) {
    ensureSharedHubInstalled(
      fs.existsSync(path.join(targetSkillsDir, HUB_DIR)) ? 'update' : 'install'
    );
    hubEnsured = true;
  }

  if (!hubEnsured && fs.existsSync(path.join(targetSkillsDir, HUB_DIR))) {
    ensureSharedHubInstalled('update');
  }

  installPackagedAgentsIndex();
  return installedCount;
}

async function confirmOverwriteExisting(existingNames) {
  if (existingNames.length === 0) return true;
  if (!process.stdin.isTTY) {
    console.error(
      `Error: ${existingNames.length} existing skill(s) would be overwritten, but stdin is not a TTY.`
    );
    console.error(
      'Re-run with non-interactive flags, e.g. install --full --yes (config.json is always preserved).'
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

async function runInstall(skills, opts) {
  console.log('============================================================');
  console.log('  Workflow Skills - Non-interactive Install');
  console.log('============================================================');
  console.log(`Target: ${targetSkillsDir}`);
  console.log('------------------------------------------------------------');

  const selected = buildSelectedFromInstallOpts(skills, opts);
  const selectedNames = skills.filter((_, i) => selected[i]);
  if (selectedNames.length === 0) {
    console.log('No skills selected. Exiting.');
    process.exit(0);
  }

  console.log(`Installing ${selectedNames.length} skill(s): ${selectedNames.join(', ')}`);
  migrateRenamedSkills(skills);
  migratePromotedSkills();

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

  const installedCount = installSelectedSkills(skills, selectedNames, { overwrite });

  console.log('');
  if (installedCount > 0) {
    console.log(`Successfully installed ${installedCount} skill(s) into ${targetSkillsDir}`);
    console.log(`Note: Existing '${CONFIG_FILE}' files were preserved and NOT overwritten.`);
    console.log('\n\u26a0\ufe0f  After installing, run the `check-harness` skill to validate the harness:');
    console.log('   Load `.agents/skills/check-harness/SKILL.md` and execute Phases 0\u20135c.');
  } else {
    console.log('No skills were installed.');
  }
  process.exit(0);
}

async function main() {
  if (!fs.existsSync(srcSkillsDir)) {
    console.error(`Error: Source skills directory not found at ${srcSkillsDir}`);
    process.exit(1);
  }

  loadSkillGraph();
  const skills = listInstallableSkills(srcSkillsDir);
  if (skills.length === 0) {
    console.log(`No installable skills found in ${srcSkillsDir}`);
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
    console.log(`Installed: v${local}`);
    try {
      const remote = await fetchRemoteVersion();
      const la = parseVersion(local);
      const ra = parseVersion(remote);
      const cmp = la[0] - ra[0] || la[1] - ra[1] || la[2] - ra[2];
      if (cmp < 0) {
        console.log(`Latest:    v${remote}  (newer available)`);
        console.log('Run: npx --yes github:jpolvora/workflow-skills update');
      } else if (cmp > 0) {
        console.log(`Latest:    v${remote}  (you are ahead)`);
      } else {
        console.log(`Latest:    v${remote}  (up to date)`);
      }
    } catch (e) {
      console.log(`Latest:    unreachable (${e.message})`);
      process.exit(1);
    }
    process.exit(0);
  }

  if (command === 'install') {
    const installOpts = parseInstallArgs(args);
    assertNotSelfOverwrite();
    await runInstall(skills, installOpts);
    return;
  }

  if (command === 'update') {
    if (args.includes('--help') || args.includes('-h')) {
      printHelp();
      process.exit(0);
    }
    const includeNew = args.includes('--include-new');
    assertNotSelfOverwrite();
    runUpdate(skills, includeNew);
  } else {
    assertNotSelfOverwrite();
    await runInteractive(skills);
  }
}

function runUpdate(skills, includeNew) {
  console.log('============================================================');
  console.log('  Workflow Skills - Auto Updater');
  console.log('============================================================');
  console.log(`Target: ${targetSkillsDir}`);
  console.log('------------------------------------------------------------');

  if (!fs.existsSync(targetSkillsDir)) {
    console.log(`No skills directory found at: ${targetSkillsDir}`);
    console.log('Run `npx github:jpolvora/workflow-skills` to choose skills to install first.');
    process.exit(0);
  }

  migrateRenamedSkills(skills);
  migratePromotedSkills();

  const existingDirs = listSkillDirs(targetSkillsDir).filter((name) => name !== HUB_DIR);
  const existingSkills = existingDirs.filter((name) => skills.includes(name));
  const missingNew = skills.filter((name) => !existingSkills.includes(name));

  if (existingSkills.length === 0 && !(includeNew && missingNew.length > 0)) {
    console.log('No matching skills found in target directory to update.');
    console.log('Run `npx github:jpolvora/workflow-skills` to select and install skills.');
    process.exit(0);
  }

  let hubEnsured = false;
  if (existingSkills.length > 0) {
    console.log(`Updating ${existingSkills.length} skill(s)...`);
    for (const skillName of existingSkills) {
      const srcPath = path.join(srcSkillsDir, skillName);
      const destPath = path.join(targetSkillsDir, skillName);
      if (!fs.existsSync(srcPath)) continue;
      console.log(`  Updating '${skillName}'...`);
      copyDirPreservingConfig(srcPath, destPath, CONFIG_FILE);
    }
    if (shouldEnsureHub(existingSkills)) {
      ensureSharedHubInstalled('update');
      hubEnsured = true;
    }
  }

  // Always refresh hub if present on consumer (config-preserving)
  if (!hubEnsured && fs.existsSync(path.join(targetSkillsDir, HUB_DIR))) {
    ensureSharedHubInstalled('update');
  }

  if (includeNew && missingNew.length > 0) {
    console.log(`Installing ${missingNew.length} new upstream skill(s)...`);
    for (const skillName of missingNew) {
      const srcPath = path.join(srcSkillsDir, skillName);
      const destPath = path.join(targetSkillsDir, skillName);
      console.log(`  Installing new '${skillName}'...`);
      copyDirSync(srcPath, destPath);
    }
  } else if (missingNew.length > 0) {
    console.log(`\nNote: ${missingNew.length} upstream skill(s) not installed locally:`);
    missingNew.slice(0, 10).forEach((n) => console.log(`  - ${n}`));
    if (missingNew.length > 10) console.log(`  ... and ${missingNew.length - 10} more`);
    console.log('Re-run with `update --include-new` to install them, or use the interactive installer.');
  }

  installPackagedAgentsIndex();

  console.log('\nUpdate complete!');
  console.log(`Note: Existing '${CONFIG_FILE}' files were preserved and NOT overwritten.`);
  console.log('\n\u26a0\ufe0f  After updating, run the `check-harness` skill to scan the harness:');
  console.log('   Load `.agents/skills/check-harness/SKILL.md` and execute Phases 0\u20135c.');
  console.log('   This detects phantom skills, broken links, stale references, and fixes routing/indexes.');
  process.exit(0);
}

async function runInteractive(skills) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const selected = new Array(skills.length).fill(false);

  while (true) {
    if (process.stdout.isTTY) console.clear();
    console.log('============================================================');
    console.log('  Workflow Skills - Skill Installer');
    console.log('============================================================');
    console.log(`Source: ${srcSkillsDir}`);
    console.log(`Target: ${targetSkillsDir}`);
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
  migrateRenamedSkills(skills);
  migratePromotedSkills();

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

  const installedCount = installSelectedSkills(skills, selectedNames, { overwrite });

  console.log('');
  if (installedCount > 0) {
    console.log(`Successfully installed ${installedCount} skill(s) into ${targetSkillsDir}`);
    console.log('\n\u26a0\ufe0f  After installing, run the `check-harness` skill to validate the harness:');
    console.log('   Load `.agents/skills/check-harness/SKILL.md` and execute Phases 0\u20135c.');
    console.log('   This detects phantom skills, broken links, stale references, and fixes routing/indexes.');
  } else {
    console.log('No skills were installed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
