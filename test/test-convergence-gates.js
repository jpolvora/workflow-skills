import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;
const convergence = path.join(repoRoot, '.agents/skills/ws-goal-loop/scripts/convergence.cjs');
const fingerprint = path.join(repoRoot, '.agents/skills/ws-configure-project/scripts/stack_fingerprint.cjs');
const merge = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/merge_verify_review.cjs');
const root = temp('ws-convergence-');
write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans' },
  rules: { stackFile: '.agents/skills/ws-shared/STACK.md' },
  defaults: { gateGranularity: 'phase', convergence: { initialDelaySec: 0, minPollSec: 30, maxPollSec: 300, backoff: 2, maxIterations: 10 } },
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
write(path.join(root, '.agents/skills/ws-shared/STACK.md'), '# Stack\n');
write(path.join(root, 'package.json'), '{"name":"fixture"}\n');

function observe(name, payload) {
  write(path.join(root, `${name}.json`), JSON.stringify(payload));
  const result = run(convergence, ['--input', `${name}.json`, '--repo-root', root]);
  assert.strictEqual(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
const clean = observe('clean', { activeThreads: [], checks: [{ state: 'success' }] });
assert.strictEqual(clean.terminal, true);
assert.strictEqual(clean.armHeartbeat, false);
assert.strictEqual(clean.intervalSec, 0);
assert.strictEqual(observe('running', { activeThreads: [{}], checks: [{ state: 'in_progress' }] }).intervalSec, 30);
assert.strictEqual(observe('queued', { activeThreads: [{}], checks: [{ state: 'queued' }] }).intervalSec, 300);

const roundLog = path.join(root, '.agents/plans/pr-fixture/.runtime/round-1-verify.md');
write(path.join(root, 'round-input.json'), JSON.stringify({ activeThreads: [{}], checks: [{ state: 'success' }] }));
const withLog = run(convergence, [
  '--input', 'round-input.json',
  '--repo-root', root,
  '--round', '1',
  '--round-log', path.relative(root, roundLog).split(path.sep).join('/'),
], { cwd: root });
assert.strictEqual(withLog.status, 0, withLog.stderr);
assert.ok(fs.existsSync(roundLog), 'round-log written after fsync');
assert.match(fs.readFileSync(roundLog, 'utf8'), /Active threads: 1/);
assert.ok(!fs.readdirSync(path.dirname(roundLog)).some((name) => name.includes('.tmp-')), 'tmp round-log not left behind');

assert.strictEqual(run(fingerprint, ['write', '--repo-root', root]).status, 0);
assert.strictEqual(run(fingerprint, ['check', '--repo-root', root]).status, 0);
fs.appendFileSync(path.join(root, 'package.json'), ' ');
assert.strictEqual(run(fingerprint, ['check', '--repo-root', root]).status, 2, 'marker change invalidates fingerprint');

write(path.join(root, 'verify.json'), JSON.stringify({ score: 8, findings: [{ id: 'V-1', severity: 'Warning', path: 'b.js', line: 2 }] }));
write(path.join(root, 'review.json'), JSON.stringify({ findings: [{ id: 'CR-1', severity: 'Critical', path: 'a.js', line: 9 }] }));
assert.strictEqual(run(merge, ['--verify', 'verify.json', '--review', 'review.json', '--output', 'merged.json', '--repo-root', root]).status, 0);
const merged = JSON.parse(fs.readFileSync(path.join(root, 'merged.json'), 'utf8'));
assert.deepStrictEqual(merged.findings.map((item) => item.id), ['CR-1', 'V-1']);
assert.strictEqual(merged.requiresFix, true);

const gates = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/gates.md'), 'utf8');
assert.match(gates, /at most five blocking gates/i);
console.log('test-convergence-gates: ok');
