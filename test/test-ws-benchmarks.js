import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot, run, temp } = utils;
const script = path.join(repoRoot, '.agents/skills/ws-benchmarks/scripts/benchmarks_manager.cjs');
const skillMd = path.join(repoRoot, '.agents/skills/ws-benchmarks/SKILL.md');

// 1. SKILL.md assertions
const skill = fs.readFileSync(skillMd, 'utf8');
assert.match(skill, /ws-benchmarks loaded/);
assert.match(skill, /Done when:/);
assert.match(skill, /disable-model-invocation: true/);
assert.match(skill, /benchmarks_manager\.cjs --check/);
assert.match(skill, /user-gate/);

// 2. Script --check on package root
const check = run(script, ['--check']);
assert.strictEqual(check.status, 0, check.stderr);
const checkJson = JSON.parse(check.stdout);
assert.strictEqual(checkJson.ok, true);
assert.ok(checkJson.repoRoot);
assert.ok(checkJson.baselineCount >= 10);

// 3. Script --check outside package root (negative test)
const outside = run(script, ['--check'], { cwd: temp('bench-outside-') });
assert.notStrictEqual(outside.status, 0);
assert.match(outside.stderr, /package root/);

// 4. Script --evolution Markdown rendering
const evo = run(script, ['--evolution']);
assert.strictEqual(evo.status, 0, evo.stderr);
assert.match(evo.stdout, /# Harness Benchmark Evolution Report/);
assert.match(evo.stdout, /\| Version \| Commit \| Fixture \| Mode \| Orch \| Score \| Verify \| Exec Time \| Tokens \| Model \| Verdict \|/);
assert.match(evo.stdout, /Multi-Dimensional Quality Breakdown/);
assert.match(evo.stdout, /0\.3\.48/);
assert.match(evo.stdout, /0\.3\.61/);

// 5. Script --update-comparison writes evolution & version tables
const updateRes = run(script, ['--update-comparison']);
assert.strictEqual(updateRes.status, 0, updateRes.stderr);
const evoPath = path.join(repoRoot, 'benchmarks/results/BENCHMARK_EVOLUTION.md');
assert.ok(fs.existsSync(evoPath), 'BENCHMARK_EVOLUTION.md created');
const evoContent = fs.readFileSync(evoPath, 'utf8');
assert.match(evoContent, /# Harness Benchmark Evolution Report/);
assert.match(evoContent, /0\.3\.61/);

// 6. Unit assertions on helper exports
const { formatWallSec, formatTokens, versionKey } = await import(`file://${script}`);
assert.strictEqual(formatWallSec(45), '45s');
assert.strictEqual(formatWallSec(125), '125s (2m 5s)');
assert.strictEqual(formatWallSec(null), 'n/a');
assert.strictEqual(formatTokens(15420), '15,420');
assert.strictEqual(formatTokens(null), 'n/a');
assert.ok(versionKey('0.3.61') > versionKey('0.3.48'));

// 7. Extra package inclusion in skill-dependencies.json
const extra = JSON.parse(fs.readFileSync(path.join(repoRoot, 'bin/skill-dependencies.json'), 'utf8'));
assert.ok(extra.packages.extra.skills.includes('ws-benchmarks'), 'bin/skill-dependencies.json Extra package includes ws-benchmarks');

const sharedExtra = JSON.parse(fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/skill-dependencies.json'), 'utf8'));
assert.ok(sharedExtra.packages.extra.skills.includes('ws-benchmarks'), 'ws-shared/runtime/skill-dependencies.json Extra package includes ws-benchmarks');

console.log('test-ws-benchmarks: ok');
