import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, run } = utils;
const runner = path.join(repoRoot, 'test', 'run-tests.cjs');

// Runner contract: --list resolves entries without executing them.
const listed = run(runner, ['--list']);
assert.strictEqual(listed.status, 0, listed.stderr);
const entries = listed.stdout.trim().split('\n').filter(Boolean);
assert.ok(entries.length > 100, `expected >100 entries, got ${entries.length}`);
// us-380 coverage work is wired: previously orphaned tests plus new gap tests.
for (const name of [
  'test-classifier-history.js',
  'test-spec-validation.js',
  'test-workflow-state-contract.js',
  'test-bootstrap-start.js',
  'test-ac-counts.js',
  'test-provider-listers.js',
  'test-write-verification-manifest.js',
  'test-generate-skill-evals.js',
  'test-runner-contract.js',
]) {
  assert.ok(entries.some((e) => e.includes(name)), `${name} listed by runner`);
}

console.log('test-runner-contract: ok');
