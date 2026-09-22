import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot, temp, run, write } = utils;
const generator = path.join(repoRoot, 'bin', 'generate-skill-evals.js');

// Hermetic: the generator honors WORKFLOW_SKILLS_EVALS_ROOT (test-only helper),
// so the real bin entry runs against a temp skills tree — never the repo.
const root = temp('ws-skill-evals-');
const fakeSkills = path.join(root, '.agents', 'skills');
fs.mkdirSync(path.join(fakeSkills, 'ws-demo'), { recursive: true });
fs.mkdirSync(path.join(fakeSkills, 'ws-noname'), { recursive: true });
write(path.join(fakeSkills, 'ws-demo', 'SKILL.md'), '---\nname: ws-demo\ndescription: Demo skill.\n---\n# Demo\n');
write(path.join(fakeSkills, 'ws-noname', 'SKILL.md'), '# No frontmatter\n');

const env = { WORKFLOW_SKILLS_EVALS_ROOT: fakeSkills };
const res = run(generator, [], { cwd: root, env });
assert.strictEqual(res.status, 0, res.stdout + res.stderr);
assert.match(res.stdout, /Total: 1 skills/);

// Named skill gets evals.json with >= 3 assertions per eval.
const payload = JSON.parse(fs.readFileSync(path.join(fakeSkills, 'ws-demo', 'evals', 'evals.json'), 'utf8'));
assert.strictEqual(payload.skill_name, 'ws-demo');
assert.ok(payload.evals.length >= 1, 'at least one eval');
for (const ev of payload.evals) {
  assert.ok(ev.assertions.length >= 3, `eval ${ev.id} has >= 3 assertions`);
}
// Skill without frontmatter name is skipped, not generated.
assert.ok(!fs.existsSync(path.join(fakeSkills, 'ws-noname', 'evals', 'evals.json')), 'nameless skill skipped');
// Nothing leaked into the real repo tree.
assert.ok(!fs.existsSync(path.join(repoRoot, '.agents', 'skills', 'ws-demo')), 'no real-tree writes');

// Idempotent: second run rewrites identical output.
const before = fs.readFileSync(path.join(fakeSkills, 'ws-demo', 'evals', 'evals.json'), 'utf8');
const res2 = run(generator, [], { cwd: root, env });
assert.strictEqual(res2.status, 0, res2.stderr);
assert.strictEqual(fs.readFileSync(path.join(fakeSkills, 'ws-demo', 'evals', 'evals.json'), 'utf8'), before);

console.log('test-generate-skill-evals: ok');
