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
const targetDir = process.cwd();
const targetAgentsDir = path.join(targetDir, '.agents');
const targetSkillsDir = path.join(targetAgentsDir, 'skills');
const CONFIG_FILE = 'config.json';

/** Old consumer folder names → current upstream skill folder names */
const SKILL_RENAMES = [{ from: 'us-workflow', to: 'spec-to-pr' }];

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

function cleanLegacyLearning(destPath) {
  // Legacy: remove old extra-skills/learning directory from pre-self-learning era
  const oldLearningPath = path.join(destPath, 'extra-skills', 'learning');
  if (fs.existsSync(oldLearningPath)) {
    console.log(`  Cleaning up legacy extra-skills/learning directory...`);
    fs.rmSync(oldLearningPath, { recursive: true, force: true });
  }
}

/**
 * Auto-install or update the `shared/` skill directory alongside any workflow
 * that depends on it (spec-to-pr or spec-to-pr-lite). Preserves config.json
 * and self-learning/memory/ contents.
 */
function ensureSharedInstalled(mode = 'install') {
  const srcShared = path.join(srcSkillsDir, 'shared');
  const destShared = path.join(targetSkillsDir, 'shared');
  if (!fs.existsSync(srcShared)) return;
  if (mode === 'update' || fs.existsSync(destShared)) {
    copyDirPreservingConfig(srcShared, destShared, CONFIG_FILE);
  } else {
    copyDirSync(srcShared, destShared);
  }

  // Ensure the target memory directory exists (since npm pack ignores empty folders)
  const targetMemoryDir = path.join(destShared, 'self-learning', 'memory');
  fs.mkdirSync(targetMemoryDir, { recursive: true });

  console.log(`  shared/ ${mode === 'update' ? 'updated' : 'installed'} (config.json + self-learning/memory preserved)`);
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

function listSkillDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => {
    return fs.statSync(path.join(dir, name)).isDirectory();
  });
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
      res.on('data', (chunk) => data += chunk);
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
  npx github:jpolvora/workflow-skills              Interactive install
  npx github:jpolvora/workflow-skills update       Update installed skills (preserves config.json)
  npx github:jpolvora/workflow-skills update --include-new
      Also install upstream skill folders not yet present locally
  npx github:jpolvora/workflow-skills --version    Print installed version
  npx github:jpolvora/workflow-skills --check      Compare installed vs latest online version
  npx github:jpolvora/workflow-skills --help
  npx github:jpolvora/workflow-skills@latest       Always fetch the latest from GitHub (bypass npx cache)

Notes:
  - Skills under .agents/skills/ are overwritten on update; config.json is preserved.
  - Packaged .agents/AGENTS.md (portability / upstream PR rules) is refreshed on install and update.
  - After installing or updating, run the "check-harness" skill to validate routing, detect
    phantom skills, fix broken links, and update indexes.
  - Prefer this Node CLI over install-skills.sh for update + config preservation.
  - Use @latest or @main suffix to force npx to fetch the latest online version instead of
    using the local npx cache. Example: npx github:jpolvora/workflow-skills@latest update
`);
}

async function main() {
  if (!fs.existsSync(srcSkillsDir)) {
    console.error(`Error: Source skills directory not found at ${srcSkillsDir}`);
    process.exit(1);
  }

  const skills = listSkillDirs(srcSkillsDir);
  if (skills.length === 0) {
    console.log(`No skills found in ${srcSkillsDir}`);
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
        console.log('Run: npx github:jpolvora/workflow-skills@latest update');
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

  const existingSkills = listSkillDirs(targetSkillsDir).filter((name) => skills.includes(name));
  const missingNew = skills.filter((name) => !existingSkills.includes(name));

  if (existingSkills.length === 0 && !(includeNew && missingNew.length > 0)) {
    console.log('No matching skills found in target directory to update.');
    console.log('Run `npx github:jpolvora/workflow-skills` to select and install skills.');
    process.exit(0);
  }

  if (existingSkills.length > 0) {
    console.log(`Updating ${existingSkills.length} skill(s)...`);
    let sharedEnsured = false;
    for (const skillName of existingSkills) {
      const srcPath = path.join(srcSkillsDir, skillName);
      const destPath = path.join(targetSkillsDir, skillName);
      console.log(`  Updating '${skillName}'...`);
      copyDirPreservingConfig(srcPath, destPath, CONFIG_FILE);
      // Auto-update shared/ once when any workflow skill is updated
      if (!sharedEnsured && (skillName === 'spec-to-pr' || skillName === 'spec-to-pr-lite')) {
        ensureSharedInstalled('update');
        sharedEnsured = true;
      }
    }
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
    output: process.stdout
  });

  const selected = new Array(skills.length).fill(false);

  while (true) {
    console.clear();
    console.log('============================================================');
    console.log('  Workflow Skills - Skill Installer');
    console.log('============================================================');
    console.log(`Source: ${srcSkillsDir}`);
    console.log(`Target: ${targetSkillsDir}`);
    console.log('------------------------------------------------------------');
    console.log('Toggle selection by entering the number.');
    console.log("Enter 'a' to select/deselect all.");
    console.log("Enter 'y' or 'i' to install the selected skills.");
    console.log("Enter 'q' to quit.");
    console.log('------------------------------------------------------------\n');

    for (let i = 0; i < skills.length; i++) {
      const mark = selected[i] ? 'x' : ' ';
      console.log(`  [${mark}] ${String(i + 1).padStart(2)}) ${skills[i]}`);
    }
    console.log('');

    const answer = (await rl.question('Select action or toggle (e.g. 1, a, y, q): ')).trim().toLowerCase();

    if (/^\d+$/.test(answer)) {
      const idx = parseInt(answer, 10) - 1;
      if (idx >= 0 && idx < skills.length) {
        selected[idx] = !selected[idx];
      } else {
        await rl.question(`Invalid number: ${answer}. Press enter to continue...`);
      }
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

  let installedCount = 0;
  console.log('\nStarting installation...');
  migrateRenamedSkills(skills);

  for (let i = 0; i < skills.length; i++) {
    if (!selected[i]) continue;
    const skillName = skills[i];
    const srcPath = path.join(srcSkillsDir, skillName);
    const destPath = path.join(targetSkillsDir, skillName);

    console.log(`Installing '${skillName}'...`);

    if (fs.existsSync(destPath)) {
      console.log(`  Warning: Destination directory '.agents/skills/${skillName}' already exists.`);
      const confirm = (await rl.question('  Overwrite? (y/n): ')).trim().toLowerCase();
      if (confirm !== 'y' && confirm !== 'yes') {
        console.log(`  Skipped: ${skillName}`);
        continue;
      }
      // Preserve consumer config.json (same contract as `update`)
      const configPath = path.join(destPath, CONFIG_FILE);
      const preservedConfig = fs.existsSync(configPath) ? fs.readFileSync(configPath) : null;
      copyDirPreservingConfig(srcPath, destPath, CONFIG_FILE);
      if (preservedConfig) {
        fs.writeFileSync(configPath, preservedConfig);
        console.log(`    Preserved existing ${CONFIG_FILE}`);
      }
      // Auto-update shared/ when a workflow skill is re-installed
      if (skillName === 'spec-to-pr' || skillName === 'spec-to-pr-lite') {
        ensureSharedInstalled('update');
      }
      console.log(`  Installed: ${skillName} -> .agents/skills/${skillName}`);
      installedCount++;
      continue;
    }

    copyDirSync(srcPath, destPath);
    // Auto-install shared/ when a workflow skill is first installed
    if (skillName === 'spec-to-pr' || skillName === 'spec-to-pr-lite') {
      ensureSharedInstalled('install');
    }
    console.log(`  Installed: ${skillName} -> .agents/skills/${skillName}`);
    installedCount++;

  }

  installPackagedAgentsIndex();

  console.log('');
  if (installedCount > 0) {
    console.log(`Successfully installed ${installedCount} skill(s) into ${targetSkillsDir}`);
    console.log('\n\u26a0\ufe0f  After installing, run the `check-harness` skill to validate the harness:');
    console.log('   Load `.agents/skills/check-harness/SKILL.md` and execute Phases 0\u20135c.');
    console.log('   This detects phantom skills, broken links, stale references, and fixes routing/indexes.');
  } else {
    console.log('No skills were installed.');
  }

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
