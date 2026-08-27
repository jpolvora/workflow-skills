import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, run } = utils;
const catalog = fs.readFileSync(path.join(repoRoot, 'CATALOG.md'), 'utf8');
const skills = fs.readdirSync(path.join(repoRoot, '.agents/skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'ws-shared' && fs.existsSync(path.join(repoRoot, '.agents/skills', entry.name, 'SKILL.md')))
  .map((entry) => entry.name);
for (const skill of skills) assert.match(catalog, new RegExp(`\\\`${skill}\\\``), `catalog includes ${skill}`);
const configPath = path.join(repoRoot, '.agents/skills/ws-shared/config.json');
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : {};
const featuresMdEnabled = config.tracking?.featuresMdEnabled !== false;
const requiredDocs = [
  'README.md',
  'CATALOG.md',
  'docs/index.html',
  '.agents/skills/ws-shared/AGENTS.md',
  '.agents/skills/ws-shared/CATALOG.md',
  '.agents/skills/ws-shared/CROSS-PLATFORM.md',
];
if (featuresMdEnabled) requiredDocs.splice(1, 0, 'FEATURES.md');
for (const relative of requiredDocs) {
  assert.doesNotMatch(fs.readFileSync(path.join(repoRoot, relative), 'utf8'), /^(?:<{7}|={7}|>{7})/m, `${relative} has no conflict marker`);
}
const writeSpec = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-write-spec/SKILL.md'), 'utf8');
assert.match(writeSpec, /Standalone `index\.PRD` gate/, 'write-spec standalone index.PRD gate');
assert.match(writeSpec, /Add to index\.PRD \(Recommended\)/, 'write-spec index.PRD recommended option');
const specIndex = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-index/SKILL.md'), 'utf8');
assert.match(specIndex, /### 4\. `track`/, 'spec-index track mode');
const site = fs.readFileSync(path.join(repoRoot, 'docs/index.html'), 'utf8');
for (const heading of [
  'Context budgets and progressive disclosure',
  'AC ledger and derived scoring',
  'Atomic Node state runtime',
  'Telemetry and deterministic reporting',
  'Gate granularity and adaptive convergence',
]) assert.match(site, new RegExp(heading), `site documents ${heading}`);
const build = run(path.join(repoRoot, 'bin/build-site.js'), ['--check']);
assert.strictEqual(build.status, 0, build.stderr);
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version, '0.3.42');
const taskLifecycle = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-task-lifecycle/SKILL.md'), 'utf8');
assert.match(taskLifecycle, /featuresMdEnabled/, 'task-lifecycle honors tracking.featuresMdEnabled');
console.log('test-doc-sync: ok');
