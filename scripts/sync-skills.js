import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const srcSkillsDir = path.join(root, 'src', 'skills');
const targetSkillsDir = path.join(root, '.agents', 'skills');

const CONSUMER_OWNED_HUB_FILES = new Set([
  'config.json',
  'config.local.json',
  'MEMORY.md',
  'STACK.md',
  'CHANGELOG.md',
  'installed-skills.json',
  'skill-integrity-local.json',
  '.gitignore',
]);

const CONSUMER_OWNED_HUB_DIRS = new Set(['memory']);

function syncSkills() {
  if (!fs.existsSync(srcSkillsDir)) {
    console.error(`Error: Source skills directory missing at ${srcSkillsDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(targetSkillsDir)) {
    fs.mkdirSync(targetSkillsDir, { recursive: true });
  }

  const entries = fs.readdirSync(srcSkillsDir, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    const srcPath = path.join(srcSkillsDir, name);
    const targetPath = path.join(targetSkillsDir, name);

    if (name === 'ws-shared') {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      const sharedItems = fs.readdirSync(srcPath, { withFileTypes: true });
      for (const item of sharedItems) {
        if (item.isDirectory() && CONSUMER_OWNED_HUB_DIRS.has(item.name)) {
          continue;
        }
        if (item.isFile() && CONSUMER_OWNED_HUB_FILES.has(item.name)) {
          continue;
        }
        fs.cpSync(path.join(srcPath, item.name), path.join(targetPath, item.name), {
          recursive: true,
          force: true,
        });
      }
      count++;
    } else {
      fs.cpSync(srcPath, targetPath, { recursive: true, force: true });
      count++;
    }
  }

  console.log(`Synced ${count} skill entries from src/skills -> .agents/skills`);
}

syncSkills();
