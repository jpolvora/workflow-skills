/**
 * Test suite for ws-spec-manager skill and router integration.
 * Run: node test/test-ws-spec-manager.js
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');

console.log('--- Testing ws-spec-manager ---');

// 1. Skill Frontmatter & Structure (AC1, AC2, AC3, AC4)
console.log('1. Checking ws-spec-manager SKILL.md structure and frontmatter');
const skillFile = path.join(REPO, '.agents/skills/ws-spec-manager/SKILL.md');
assert.ok(fs.existsSync(skillFile), 'SKILL.md exists');
const skillContent = fs.readFileSync(skillFile, 'utf8');

assert.match(skillContent, /^name:\s*ws-spec-manager/m, 'frontmatter name is ws-spec-manager');
assert.match(skillContent, /^version:\s*0\.3\.63/m, 'frontmatter version matches package 0.3.63');
assert.match(skillContent, /^disable-model-invocation:\s*true/m, 'disable-model-invocation is true');
for (const alias of ['ws-spec-manager', 'spec-manager']) {
  assert.ok(skillContent.includes(`- ${alias}`), `invocation_names includes ${alias}`);
}
assert.ok(!skillContent.match(/^invocation_names:[\s\S]*?^- spec$/m), 'invocation_names excludes bare spec alias');
assert.ok(!skillContent.match(/^invocation_names:[\s\S]*?^- specs$/m), 'invocation_names excludes bare specs alias');
assert.match(skillContent, /> When this skill is loaded, output "ws-spec-manager loaded\."/, 'loaded banner directive present');
assert.match(skillContent, /config-resolution\.md/, 'entry check cites config-resolution.md');

// Check every step has a checkable Done when:
const stepsMatch = skillContent.match(/### \d+\..*?\n[\s\S]*?(?=### \d+|\n## Rules|$)/g);
assert.ok(stepsMatch && stepsMatch.length >= 4, 'at least 4 state machine steps defined');
for (const step of stepsMatch) {
  assert.ok(step.includes('**Done when:**'), `step contains checkable Done when: criteria:\n${step.split('\n')[0]}`);
}

// 2. Boundary Matrix & Non-Overlap Checks (AC8, AC9)
console.log('2. Checking boundary definitions and non-overlap documentation');
assert.match(skillContent, /ws-spec-update.*ws-spec-index sync/s, 'documents distinction between body drift and status sync');
assert.match(skillContent, /ws-spec-list.*ws-spec-explain/s, 'documents distinction between board and explain');
assert.match(skillContent, /ws-spec-write.*ws-spec-organizer/s, 'documents integration of creation pipeline');
assert.match(skillContent, /ws-spec-archive.*ws-cleanup/s, 'documents distinction between archive and cleanup');

// 3. Packaging & Dependencies Registration (AC11)
console.log('3. Checking skill-dependencies.json registration');
const depsBin = JSON.parse(fs.readFileSync(path.join(REPO, 'bin/skill-dependencies.json'), 'utf8'));
const depsShared = JSON.parse(fs.readFileSync(path.join(REPO, '.agents/skills/ws-shared/skill-dependencies.json'), 'utf8'));

assert.ok(depsBin.packages.workflows.skills.includes('ws-spec-manager'), 'ws-spec-manager in bin workflows package');
assert.ok(depsShared.packages.workflows.skills.includes('ws-spec-manager'), 'ws-spec-manager in ws-shared workflows package');

assert.ok('ws-spec-manager' in depsBin.dependencies, 'ws-spec-manager in bin dependencies map');
assert.ok('ws-spec-manager' in depsShared.dependencies, 'ws-spec-manager in ws-shared dependencies map');

const expectedDeps = [
  'ws-spec-write',
  'ws-spec-list',
  'ws-spec-index',
  'ws-spec-update',
  'ws-spec-explain',
  'ws-spec-organizer',
  'ws-spec-archive',
  'ws-spec-format',
  'ws-spec-from-provider',
  'ws-classify-complexity',
  'ws-configure-project',
];

for (const dep of expectedDeps) {
  assert.ok(depsBin.dependencies['ws-spec-manager'].includes(dep), `bin dependencies includes ${dep}`);
  assert.ok(depsShared.dependencies['ws-spec-manager'].includes(dep), `ws-shared dependencies includes ${dep}`);
}

// 4. Autoload & Router Integration (AC10)
console.log('4. Checking autoload.md router and keyword quick map');
const autoload = fs.readFileSync(path.join(REPO, '.agents/skills/ws-shared/autoload.md'), 'utf8');

assert.match(autoload, /\[`ws-spec-manager`\]\(\.\.\/ws-spec-manager\/SKILL\.md\)/, 'autoload.md router table contains ws-spec-manager');
assert.match(autoload, /manage specs.*`ws-spec-manager`/, 'autoload.md quick map routes manage specs to ws-spec-manager');
assert.match(autoload, /\/spec, \/specs.*`ws-spec-manager`/, 'autoload.md quick map routes /spec to ws-spec-manager');

// 5. Catalogs & Guide Documentation (AC12)
console.log('5. Checking CATALOG.md and SPEC-MANAGEMENT.md');
const catalogRoot = fs.readFileSync(path.join(REPO, 'CATALOG.md'), 'utf8');
const catalogShared = fs.readFileSync(path.join(REPO, '.agents/skills/ws-shared/CATALOG.md'), 'utf8');
const specGuide = fs.readFileSync(path.join(REPO, 'SPEC-MANAGEMENT.md'), 'utf8');

assert.match(catalogRoot, /`ws-spec-manager`/, 'root CATALOG.md includes ws-spec-manager');
assert.match(catalogShared, /`ws-spec-manager`/, 'shared CATALOG.md includes ws-spec-manager');
assert.match(specGuide, /`ws-spec-manager`/, 'SPEC-MANAGEMENT.md includes ws-spec-manager');
assert.match(specGuide, /### 0\. `ws-spec-manager` — Unified Front Door/, 'SPEC-MANAGEMENT.md details section 0 for ws-spec-manager');

// 6. Interactive & Subcommand Dispatch Completeness (AC5, AC6)
console.log('6. Checking dispatch actions and subcommands');
const requiredActions = [
  'Create / Draft new spec',
  'List & browse specs / plans',
  'Explain / inspect spec details',
  'Update spec requirements (drift)',
  'Sync spec status in index.PRD',
  'Track existing spec in index.PRD',
  'Organize & renumber specs',
  'Archive completed plan history',
  'Validate spec format & ACs',
  'Import backlog from GitHub / ADO',
  'Run / execute spec pipeline',
];

for (const action of requiredActions) {
  assert.ok(skillContent.includes(action), `SKILL.md menu includes action: ${action}`);
}

const requiredSubcommands = [
  '/spec create',
  '/spec list',
  '/spec explain',
  '/spec update',
  '/spec sync',
  '/spec track',
  '/spec organize',
  '/spec archive',
  '/spec validate',
  '/spec import',
  '/spec run',
];

for (const subcmd of requiredSubcommands) {
  assert.ok(skillContent.includes(subcmd), `SKILL.md includes direct subcommand: ${subcmd}`);
}

console.log('--- All ws-spec-manager tests PASSED ---');
