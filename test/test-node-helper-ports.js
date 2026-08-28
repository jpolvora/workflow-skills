import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;
const localScripts = path.join(repoRoot, '.agents/skills/ws-local-spec-provider/scripts');
const memoryScript = path.join(repoRoot, '.agents/skills/ws-self-learning/scripts/self_learning.cjs');
const root = temp('ws-node-ports-');
write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans', specsDir: '.agents/specs' },
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
write(path.join(root, 'input.spec.md'), `---
id: null
slug: node-ports
title: Node ports
source: local
specDate: 2026-08-21
---
## Description
Exercise Node ports.
## Acceptance Criteria
- AC1: Register the spec.
`);
const detected = run(path.join(localScripts, 'detect_specs_dir.cjs'), ['--detect', '--ensure', '--json', '--repo-root', root]);
assert.strictEqual(detected.status, 0, detected.stderr);
assert.strictEqual(JSON.parse(detected.stdout).specsDir, '.agents/specs');
const registered = run(path.join(localScripts, 'register_local_spec.cjs'), ['--input', 'input.spec.md', '--json', '--repo-root', root]);
assert.strictEqual(registered.status, 0, registered.stderr);
assert.ok(fs.existsSync(path.join(root, '.agents/plans/node-ports/step-00-node-ports.spec.md')));
assert.match(
  fs.readFileSync(path.join(root, '.agents/plans/node-ports/step-00-node-ports.spec.md'), 'utf8'),
  /^---\n[\s\S]*^step: 0\n/m,
);

const prefixedRoot = temp('ws-node-ports-prefixed-');
write(path.join(prefixedRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans', specsDir: '.agents/specs' },
}));
const specsDir = path.join(prefixedRoot, '.agents/specs');
const plansDir = path.join(prefixedRoot, '.agents/plans/prefix-demo');
fs.mkdirSync(specsDir, { recursive: true });
fs.mkdirSync(plansDir, { recursive: true });
write(path.join(specsDir, '0051-prefix-demo.spec.md'), `---
id: null
slug: prefix-demo
title: Prefix demo
source: local
specDate: 2026-08-28
---
## Description
Prefixed board spec.
`);
write(path.join(plansDir, 'step-00-prefix-demo.spec.md'), `---
id: null
slug: prefix-demo
title: Prefix demo updated
source: local
specDate: 2026-08-28
---
## Description
Workflow copy refresh.
`);
const reRegister = run(path.join(localScripts, 'register_local_spec.cjs'), [
  '--input', '.agents/plans/prefix-demo/step-00-prefix-demo.spec.md',
  '--force',
  '--json', '--repo-root', prefixedRoot,
]);
assert.strictEqual(reRegister.status, 0, reRegister.stderr);
const payload = JSON.parse(reRegister.stdout);
assert.strictEqual(payload.specsPath, '.agents/specs/0051-prefix-demo.spec.md', 'updates prefixed spec-of-record');
assert.ok(!fs.existsSync(path.join(specsDir, 'prefix-demo.spec.md')), 'does not create unprefixed duplicate');
assert.match(
  fs.readFileSync(path.join(specsDir, '0051-prefix-demo.spec.md'), 'utf8'),
  /Prefix demo updated/,
);

write(path.join(root, '.agents/skills/ws-shared/memory/2026-08-21-port.md'), `### [2026-08-21] Node port
- **Layer**: Runtime
- **Module**: Helpers
- **Severity**: Medium
- **PathPattern**: src/*
- **Scenario / Context**: Port parity
- **DO NOT**: bypass Node
- **INSTEAD DO**: invoke the CJS surface
`);
assert.strictEqual(run(memoryScript, ['--compile', '--repo-root', root]).status, 0);
assert.match(fs.readFileSync(path.join(root, '.agents/skills/ws-shared/MEMORY.md'), 'utf8'), /Node port/);

for (const relative of [
  '.agents/skills/ws-local-spec-provider/scripts/register_local_spec.py',
  '.agents/skills/ws-local-spec-provider/scripts/detect_specs_dir.py',
  '.agents/skills/ws-self-learning/scripts/self_learning.py',
  '.agents/skills/ws-spec-to-pr/scripts/update_state.py',
  '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py',
  '.agents/skills/ws-spec-to-pr/scripts/validate_state.py',
]) {
  const py = fs.readFileSync(path.join(repoRoot, relative), 'utf8');
  assert.ok(fs.existsSync(path.join(repoRoot, relative)), `frozen Python helper remains: ${relative}`);
  assert.match(py, /\.cjs/, `${relative} execs Node SoT`);
}
console.log('test-node-helper-ports: ok');
