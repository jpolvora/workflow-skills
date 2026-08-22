import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, run } = utils;
const catalog = fs.readFileSync(path.join(repoRoot, 'CATALOG.md'), 'utf8');
const skills = fs.readdirSync(path.join(repoRoot, '.agents/skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'ws-shared' && fs.existsSync(path.join(repoRoot, '.agents/skills', entry.name, 'SKILL.md')))
  .map((entry) => entry.name);
for (const skill of skills) assert.match(catalog, new RegExp(`\\\`${skill}\\\``), `catalog includes ${skill}`);
for (const relative of [
  'README.md',
  'FEATURES.md',
  'CATALOG.md',
  'docs/index.html',
  '.agents/skills/ws-shared/AGENTS.md',
  '.agents/skills/ws-shared/CATALOG.md',
  '.agents/skills/ws-shared/CROSS-PLATFORM.md',
]) {
  assert.doesNotMatch(fs.readFileSync(path.join(repoRoot, relative), 'utf8'), /^(?:<{7}|={7}|>{7})/m, `${relative} has no conflict marker`);
}
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
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version, '0.3.29');
console.log('test-doc-sync: ok');
