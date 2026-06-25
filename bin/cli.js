#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const packageRoot = path.resolve(__dirname, '..');
const srcSkillsDir = path.join(packageRoot, '.agents', 'skills');
const targetDir = process.cwd();
const targetSkillsDir = path.join(targetDir, '.agents', 'skills');

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Commands execution
async function main() {
  if (!fs.existsSync(srcSkillsDir)) {
    console.error(`Error: Source skills directory not found at ${srcSkillsDir}`);
    process.exit(1);
  }

  const skills = fs.readdirSync(srcSkillsDir).filter(name => {
    return fs.statSync(path.join(srcSkillsDir, name)).isDirectory();
  });

  if (skills.length === 0) {
    console.log(`No skills found in ${srcSkillsDir}`);
    process.exit(0);
  }

  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'update') {
    runUpdate(skills);
  } else {
    await runInteractive(skills);
  }
}

// 1. Auto-update command execution
function runUpdate(skills) {
  console.log("============================================================");
  console.log("  Workflow Skills - Auto Updater");
  console.log("============================================================");
  console.log(`Target: ${targetSkillsDir}`);
  console.log("------------------------------------------------------------");

  if (!fs.existsSync(targetSkillsDir)) {
    console.log(`No skills directory found at: ${targetSkillsDir}`);
    console.log("Run `npx workflow-skills` to choose skills to install first.");
    process.exit(0);
  }

  const existingSkills = fs.readdirSync(targetSkillsDir).filter(name => {
    return fs.statSync(path.join(targetSkillsDir, name)).isDirectory() &&
           skills.includes(name);
  });

  if (existingSkills.length === 0) {
    console.log("No matching skills found in target directory to update.");
    console.log("Run `npx workflow-skills` to select and install skills.");
    process.exit(0);
  }

  console.log(`Updating ${existingSkills.length} skill(s)...`);
  for (const skillName of existingSkills) {
    const srcPath = path.join(srcSkillsDir, skillName);
    const destPath = path.join(targetSkillsDir, skillName);

    console.log(`  Updating '${skillName}'...`);
    fs.rmSync(destPath, { recursive: true, force: true });
    copyDirSync(srcPath, destPath);
  }
  
  console.log("\nUpdate complete!");
  process.exit(0);
}

// 2. Interactive installation menu
async function runInteractive(skills) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const selected = new Array(skills.length).fill(false);

  while (true) {
    console.clear();
    console.log("============================================================");
    console.log("  Workflow Skills - Skill Installer");
    console.log("============================================================");
    console.log(`Source: ${srcSkillsDir}`);
    console.log(`Target: ${targetSkillsDir}`);
    console.log("------------------------------------------------------------");
    console.log("Toggle selection by entering the number.");
    console.log("Enter 'a' to select/deselect all.");
    console.log("Enter 'y' or 'i' to install the selected skills.");
    console.log("Enter 'q' to quit.");
    console.log("------------------------------------------------------------\n");

    for (let i = 0; i < skills.length; i++) {
      const mark = selected[i] ? "x" : " ";
      console.log(`  [${mark}] ${String(i + 1).padStart(2)}) ${skills[i]}`);
    }
    console.log("");

    const answer = (await rl.question("Select action or toggle (e.g. 1, a, y, q): ")).trim().toLowerCase();

    if (/^\d+$/.test(answer)) {
      const idx = parseInt(answer, 10) - 1;
      if (idx >= 0 && idx < skills.length) {
        selected[idx] = !selected[idx];
      } else {
        await rl.question(`Invalid number: ${answer}. Press enter to continue...`);
      }
    } else if (answer === 'a') {
      const allSelected = selected.every(v => v);
      selected.fill(!allSelected);
    } else if (answer === 'y' || answer === 'i') {
      break;
    } else if (answer === 'q') {
      console.log("Exiting without installing.");
      rl.close();
      process.exit(0);
    } else {
      await rl.question(`Invalid action: ${answer}. Press enter to continue...`);
    }
  }

  const selectedCount = selected.filter(v => v).length;
  if (selectedCount === 0) {
    console.log("\nNo skills selected. Exiting.");
    rl.close();
    process.exit(0);
  }

  let installedCount = 0;
  console.log("\nStarting installation...");

  for (let i = 0; i < skills.length; i++) {
    if (selected[i]) {
      const skillName = skills[i];
      const srcPath = path.join(srcSkillsDir, skillName);
      const destPath = path.join(targetSkillsDir, skillName);

      console.log(`Installing '${skillName}'...`);

      if (fs.existsSync(destPath)) {
        console.log(`  Warning: Destination directory '.agents/skills/${skillName}' already exists.`);
        const confirm = (await rl.question(`  Overwrite? (y/n): `)).trim().toLowerCase();
        if (confirm !== 'y' && confirm !== 'yes') {
          console.log(`  Skipped: ${skillName}`);
          continue;
        }
        fs.rmSync(destPath, { recursive: true, force: true });
      }

      copyDirSync(srcPath, destPath);
      console.log(`  Installed: ${skillName} -> .agents/skills/${skillName}`);
      installedCount++;
    }
  }

  console.log("");
  if (installedCount > 0) {
    console.log(`Successfully installed ${installedCount} skill(s) into ${targetSkillsDir}`);
  } else {
    console.log("No skills were installed.");
  }

  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
