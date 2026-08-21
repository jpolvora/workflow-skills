import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;
const script = path.join(repoRoot, '.agents/skills/ws-configure-project/scripts/stack_fingerprint.cjs');
const root = temp('ws-stack-fingerprint-');
write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  rules: { stackFile: '.agents/skills/ws-shared/STACK.md' },
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
write(path.join(root, '.agents/skills/ws-shared/STACK.md'), '# Stack\n');
write(path.join(root, 'package.json'), '{"name":"fixture"}\n');
assert.strictEqual(run(script, ['write', '--repo-root', root]).status, 0);
assert.strictEqual(run(script, ['check', '--repo-root', root]).status, 0);
fs.appendFileSync(path.join(root, 'package.json'), ' ');
assert.strictEqual(run(script, ['check', '--repo-root', root]).status, 2);
console.log('test-stack-fingerprint: ok');
