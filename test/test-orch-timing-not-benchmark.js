import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot } = utils;

const delivery = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-spec-to-pr/protocols/delivery-result.md'),
  'utf8',
);
const dispatch = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md'),
  'utf8',
);
const board = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-spec-to-pr/protocols/progress-board.md'),
  'utf8',
);
const orch = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/SKILL.md'), 'utf8');
const lite = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/SKILL.md'), 'utf8');
const testing = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-testing/SKILL.md'), 'utf8');
const consumerCatalog = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-shared/CATALOG.md'),
  'utf8',
);

assert.match(delivery, /^## Timing$/m);
assert.doesNotMatch(delivery, /^## Benchmark$/m);
assert.match(delivery, /Harness benchmark is forbidden/);
assert.match(delivery, /reporting telemetry only/);
assert.match(delivery, /Sum step elapsed times/);
assert.doesNotMatch(delivery, /Compute benchmark/);

assert.match(dispatch, /Timing Total wall-clock time/);
assert.doesNotMatch(dispatch, /dispatch-agent[` ]+`?ws-run-benchmark/);
assert.match(dispatch, /Never load `ws-run-benchmark`/);

assert.match(board, /after timing rollup/);
assert.doesNotMatch(board, /after benchmark/);
assert.match(board, /Do not start a harness benchmark/);

for (const [name, body] of [
  ['ws-spec-to-pr', orch],
  ['ws-spec-to-pr-lite', lite],
  ['ws-testing', testing],
]) {
  assert.match(body, /do not (load|run) `ws-run-benchmark`|Never run `npm run benchmark`/i, `${name} forbids harness benchmark`);
  assert.match(body, /npm run benchmark/, `${name} names the npm script to skip`);
}

assert.match(consumerCatalog, /never.*spec-to-pr/i);

console.log('test-orch-timing-not-benchmark: ok');
