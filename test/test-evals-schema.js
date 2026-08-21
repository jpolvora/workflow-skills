import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, run } = utils;
const result = run(path.join(repoRoot, 'bin/validate-evals.cjs'));
assert.strictEqual(result.status, 0, result.stderr);
assert.match(result.stdout, /Validated 44 eval files/);
console.log('test-evals-schema: ok');
