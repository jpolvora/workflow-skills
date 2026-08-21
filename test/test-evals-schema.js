import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, run, temp } = utils;
const result = run(path.join(repoRoot, 'bin/validate-evals.cjs'));
assert.strictEqual(result.status, 0, result.stderr);
assert.match(result.stdout, /Validated 44 eval files against \.agents\/skills\/ws-shared\/evals\.schema\.json/);

const missing = run(path.join(repoRoot, 'bin/validate-evals.cjs'), [temp('evals-missing-schema-')]);
assert.notStrictEqual(missing.status, 0);
assert.match(missing.stderr, /evals schema missing/);
console.log('test-evals-schema: ok');
