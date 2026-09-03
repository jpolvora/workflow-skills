import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, path, repoRoot, run } = utils;
const { fetchRetry } = require(path.join(repoRoot, '.agents/skills/ws-shared/scripts/http_retry.cjs'));

const validate = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/validate_state.cjs');
const memory = path.join(repoRoot, '.agents/skills/ws-self-learning/scripts/self_learning.cjs');
const detect = path.join(repoRoot, '.agents/skills/ws-spec-provider-local/scripts/detect_specs_dir.cjs');
const register = path.join(repoRoot, '.agents/skills/ws-spec-provider-local/scripts/register_local_spec.cjs');
const frozenUpdate = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.py');

for (const [script, needle] of [
  [validate, 'Usage:'],
  [memory, 'Usage:'],
  [detect, 'Usage:'],
  [register, 'Usage:'],
]) {
  const result = run(script, ['--help']);
  assert.strictEqual(result.status, 0, `${path.basename(script)} --help exits 0 (${result.stderr})`);
  assert.match(result.stdout, new RegExp(needle));
}

const frozen = require('fs').readFileSync(frozenUpdate, 'utf8');
assert.match(frozen, /update_state\.cjs/, 'update_state.py execs Node SoT');

let calls = 0;
const fakeFetch = async () => {
  calls += 1;
  if (calls < 3) {
    return { ok: false, status: 503 };
  }
  return { ok: true, status: 200 };
};
const recovered = await fetchRetry('https://example.test', {}, { attempts: 3, delay: 1, fetchImpl: fakeFetch });
assert.strictEqual(recovered.status, 200, 'fetchRetry succeeds after 503s');
assert.strictEqual(calls, 3, 'fetchRetry attempted three times');

console.log('test-script-resilience: ok');
