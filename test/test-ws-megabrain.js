/**
 * ws-megabrain registration and companion-load contract.
 * Run: node test/test-ws-megabrain.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillMd = path.join(root, '.agents/skills/ws-megabrain/SKILL.md');
const depsPath = path.join(root, 'bin/skill-dependencies.json');
const autoloadPath = path.join(root, '.agents/skills/ws-shared/autoload.md');
const configurePy = path.join(
  root,
  '.agents/skills/ws-configure-project/scripts/configure_autoload.py',
);

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

const skill = fs.readFileSync(skillMd, 'utf8');
assert(skill.includes('name: ws-megabrain'), 'SKILL.md name');
assert(skill.includes('ws-megabrain loaded.'), 'loaded banner');
assert(!/`AskQuestion`/.test(skill) && !/`ask_questions`/.test(skill), 'no vendor ask-tool ids');
assert(skill.includes('../ws-fable-method/SKILL.md'), 'consumes fable');
assert(skill.includes('../ws-senior-developer/SKILL.md'), 'consumes senior-developer');
assert(skill.includes('../ws-karpathy-guidelines/SKILL.md'), 'consumes karpathy');
assert(skill.includes('../ws-tdah/SKILL.md'), 'consumes tdah');
assert(skill.includes('/ws-megabrain plan'), 'plan mode');
assert(skill.includes('/ws-megabrain research'), 'research mode');
assert(fs.existsSync(path.join(root, '.agents/skills/ws-megabrain/references/REVERSE.md')), 'REVERSE.md');
assert(fs.existsSync(path.join(root, '.agents/skills/ws-megabrain/references/DDD.md')), 'DDD.md');
assert(!fs.existsSync(path.join(root, '.agents/skills/ws-megabrain/scripts')), 'no scripts/ dir');

const deps = JSON.parse(fs.readFileSync(depsPath, 'utf8'));
assert(deps.packages.workflows.skills.includes('ws-megabrain'), 'workflows package');
const companions = deps.dependencies['ws-megabrain'] || [];
for (const id of [
  'ws-fable-method',
  'ws-senior-developer',
  'ws-karpathy-guidelines',
  'ws-tdah',
  'ws-self-learning',
  'ws-changelog',
]) {
  assert(companions.includes(id), `dep ${id}`);
}

const autoload = fs.readFileSync(autoloadPath, 'utf8');
assert(/\| `ws-megabrain` \|/.test(autoload), 'autoload.md Always-applied row');
const configure = fs.readFileSync(configurePy, 'utf8');
assert(configure.includes('"ws-megabrain"'), 'DEFAULT_ALWAYS_APPLIED includes ws-megabrain');

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll ws-megabrain checks passed.');
