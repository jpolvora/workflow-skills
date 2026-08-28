import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot, run, temp } = utils;
const script = path.join(repoRoot, '.agents/skills/ws-run-benchmark/scripts/context.cjs');
const skillMd = path.join(repoRoot, '.agents/skills/ws-run-benchmark/SKILL.md');

const skill = fs.readFileSync(skillMd, 'utf8');
assert.match(skill, /ws-run-benchmark loaded/);
assert.match(skill, /Done when:/);
assert.match(skill, /disable-model-invocation: true/);
assert.match(skill, /context\.cjs --check/);

const check = run(script, ['--check']);
assert.strictEqual(check.status, 0, check.stderr);
const checkJson = JSON.parse(check.stdout);
assert.strictEqual(checkJson.ok, true);
assert.ok(checkJson.packageVersion);
assert.ok(checkJson.fixtureCount >= 5);

const listed = run(script, ['--list']);
assert.strictEqual(listed.status, 0, listed.stderr);
const listJson = JSON.parse(listed.stdout);
const ids = listJson.fixtures.map((row) => row.id);
assert.ok(ids.includes('fx-node-helper'));
assert.ok(ids.includes('fx-config-merge'));

const ctx = run(script, ['--fixture', 'fx-node-helper']);
assert.strictEqual(ctx.status, 0, ctx.stderr);
const live = JSON.parse(ctx.stdout);
assert.strictEqual(live.orch, 'lite');
assert.strictEqual(live.orchSkill, 'ws-spec-to-pr-lite');
assert.strictEqual(live.specFile, 'fx-node-helper.spec.md');
assert.strictEqual(live.slug, 'node-helper');
assert.ok(live.hasSensor);
assert.match(live.snapshotName, /fx-node-helper-live$/);

const standard = JSON.parse(run(script, ['--fixture', 'fx-config-merge']).stdout);
assert.strictEqual(standard.orchSkill, 'ws-spec-to-pr');

const elsewhere = run(script, ['--check'], { cwd: temp('hb-run-bench-') });
assert.notStrictEqual(elsewhere.status, 0);
assert.match(elsewhere.stderr, /package root/);

const extra = JSON.parse(fs.readFileSync(path.join(repoRoot, 'bin/skill-dependencies.json'), 'utf8'));
assert.ok(extra.packages.extra.skills.includes('ws-run-benchmark'));

console.log('test-ws-run-benchmark: ok');
