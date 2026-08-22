import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const resolver = require('../.agents/skills/ws-shared/scripts/resolve_consumer_root.cjs');
const { assert, path, repoRoot, temp, run, write } = utils;
const registerNode = path.join(repoRoot, '.agents/skills/ws-local-spec-provider/scripts/register_local_spec.cjs');
const probe = path.join(repoRoot, '.agents/skills/ws-testing/scripts/probe_test_surface.cjs');
const root = temp('ws-runtime-portability-');
write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans', specsDir: '.agents/specs' },
  defaults: { testGlobs: ['test/**/*.js'] },
  verification: { backendTest: 'node --test' },
  fable: { auditVerdictsBlockShip: true },
}));
write(path.join(root, 'input.spec.md'), `---
id: null
slug: portable
title: Portable
source: local
specDate: 2026-08-21
---
## Description
Portable.
## Acceptance Criteria
- AC1: Work.
`);
assert.strictEqual(run(registerNode, ['--input', 'input.spec.md', '--repo-root', root, '--json']).status, 0);
const registered = fs.readFileSync(path.join(root, '.agents/plans/portable/step-00-portable.spec.md'), 'utf8');
assert.match(registered, /source: local/);
assert.strictEqual(resolver.resolveConsumerContext({ repoRoot: root }).config.fable.auditVerdictsBlockShip, 'refuted');

let surface = run(probe, ['--repo-root', root]);
assert.strictEqual(surface.status, 0, surface.stderr);
assert.strictEqual(JSON.parse(surface.stdout).hasTestSurface, true, 'non-empty configured test alias is a machine test surface');
write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans' },
  defaults: { testGlobs: ['test/**/*.js'] },
  verification: { backendTest: '' },
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
surface = run(probe, ['--repo-root', root]);
assert.strictEqual(JSON.parse(surface.stdout).hasTestSurface, false);
write(path.join(root, 'test/example.js'), 'test("x", () => {});\n');
surface = run(probe, ['--repo-root', root]);
assert.strictEqual(JSON.parse(surface.stdout).hasTestSurface, true);

for (const relative of [
  '.agents/skills/ws-shared/tools.md',
  '.agents/skills/ws-shared/gates.md',
  '.agents/skills/ws-configure-project/INTERVIEW.md',
]) {
  const text = fs.readFileSync(path.join(repoRoot, relative), 'utf8');
  assert.doesNotMatch(text, /\b(?:Cursor|OpenCode|Antigravity)\b/i, `${relative} keeps runtime prose host-neutral`);
}
for (const relative of [
  '.agents/skills/ws-spec-to-pr/SKILL.md',
  '.agents/skills/ws-spec-to-pr-lite/SKILL.md',
  '.agents/skills/ws-local-spec-provider/SKILL.md',
  '.agents/skills/ws-self-learning/SKILL.md',
]) {
  const text = fs.readFileSync(path.join(repoRoot, relative), 'utf8');
  assert.doesNotMatch(text, /(?:update_state|validate_state|register_local_spec|detect_specs_dir|self_learning)\.py/, `${relative} invokes Node runtime ports`);
}
console.log('test-runtime-portability: ok');
