import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot, run, temp } = utils;
const result = run(path.join(repoRoot, 'bin/validate-evals.cjs'));
assert.strictEqual(result.status, 0, result.stderr);
assert.match(result.stdout, /Validated 44 eval files against \.agents\/skills\/ws-shared\/evals\.schema\.json/);

const missing = run(path.join(repoRoot, 'bin/validate-evals.cjs'), [temp('evals-missing-schema-')]);
assert.notStrictEqual(missing.status, 0);
assert.match(missing.stderr, /evals schema missing/);

const schemaDir = path.join(repoRoot, '.agents/skills/ws-shared');
const untyped = [];
function walkSchema(node, trail) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item, index) => walkSchema(item, `${trail}[${index}]`));
    return;
  }
  if (node.type === 'array' && node.items == null) untyped.push(trail);
  for (const [key, value] of Object.entries(node)) walkSchema(value, `${trail}.${key}`);
}
for (const name of fs.readdirSync(schemaDir).filter((file) => file.endsWith('.schema.json'))) {
  walkSchema(JSON.parse(fs.readFileSync(path.join(schemaDir, name), 'utf8')), name);
}
assert.deepStrictEqual(untyped, [], `schema arrays missing items: ${untyped.join(', ')}`);
assert.match(
  fs.readFileSync(path.join(repoRoot, 'bin/validate-evals.cjs'), 'utf8'),
  /validate_json_schema\.cjs/,
);
console.log('test-evals-schema: ok');
