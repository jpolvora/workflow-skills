import { spawnSync } from 'child_process';
import utils from './harness-test-utils.cjs';

const { assert, repoRoot } = utils;
const packed = spawnSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: repoRoot,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
assert.strictEqual(packed.status, 0, packed.stderr);
const files = JSON.parse(packed.stdout)[0].files.map((item) => item.path.replace(/\\/g, '/'));
for (const pattern of [
  /(?:^|\/)__pycache__(?:\/|$)/,
  /\.py[co]$/,
  /\/runs\//,
  /\/\.runtime\//,
  /\/\.audit-session-[^/]+\.json$/,
  /\/\.finding-step-[^/]+\.json$/,
  /^\.agents\/skills\/ws-shared\/(?:config\.json|STACK\.md|MEMORY\.md|CHANGELOG\.md|installed-skills\.json)$/,
]) assert.ok(!files.some((file) => pattern.test(file)), `tarball excludes ${pattern}`);
assert.ok(files.includes('.agents/skills/ws-spec-to-pr/scripts/update_state.py'), 'frozen Python helper remains packaged');
assert.ok(files.includes('.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'), 'Node orchestrator surface is packaged');
console.log('test-package-runtime-exclusions: ok');
