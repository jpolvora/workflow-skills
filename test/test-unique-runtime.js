import fs from 'fs';
import { spawnSync } from 'child_process';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;
const gate = path.join(
  repoRoot,
  '.agents/skills/ws-check-harness/scripts/check_unique_runtime.cjs',
);

// AC17: gate is green on the unique-runtime tree.
{
  const res = run(gate, ['--json', '--repo-root', repoRoot]);
  assert.strictEqual(res.status, 0, res.stderr);
  assert.strictEqual(JSON.parse(res.stdout).ok, true, 'gate ok on clean tree');
}

// AC17: gate fails closed when a .py reappears under skills or bin.
{
  const root = temp('ws-unique-runtime-');
  const pySkill = path.join(root, '.agents/skills/ws-demo/scripts/legacy.py');
  const pyBin = path.join(root, 'bin/tool.py');
  write(pySkill, 'print(1)\n');
  write(pyBin, 'print(1)\n');
  const res = run(gate, ['--json', '--repo-root', root]);
  assert.strictEqual(res.status, 1, 'gate exits 1 on .py hits');
  const payload = JSON.parse(res.stdout);
  assert.strictEqual(payload.ok, false);
  assert.strictEqual(payload.findingCount, 2);
  assert.ok(
    payload.findings.some((f) => f.file === '.agents/skills/ws-demo/scripts/legacy.py'),
    'gate lists skills-tree hit',
  );
  assert.ok(
    payload.findings.some((f) => f.file === 'bin/tool.py'),
    'gate lists bin hit',
  );
}

// AC9: no tracked .py under the shipped skills tree or bin/.
{
  const tracked = spawnSync('git', ['ls-files', '--', '.agents/skills/**/*.py', 'bin/**/*.py'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.strictEqual(tracked.status, 0, tracked.stderr);
  assert.strictEqual(tracked.stdout.trim(), '', 'zero tracked .py under skills/bin');
}

// AC14: package test scripts never invoke a python binary.
{
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  for (const name of ['test', 'tests', 'tests:harness-efficiency']) {
    assert.ok(pkg.scripts[name], `package.json scripts.${name} exists`);
    assert.doesNotMatch(pkg.scripts[name], /(^|\s|["'`])python\d?(\s|$|["'`])/,
      `scripts.${name} invokes no python binary`);
  }
}

// AC16: engines pins Node >= 22.
{
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.ok(pkg.engines && pkg.engines.node, 'package.json declares engines.node');
  const major = parseInt(String(pkg.engines.node).match(/(\d+)/)[1], 10);
  assert.ok(major >= 22, `engines.node requires Node 22+ (got ${pkg.engines.node})`);
}

// AC15: no test file and no shipped helper spawns a python interpreter,
// so `npm run test` cannot require python on PATH.
{
  const offenders = [];
  const roots = [
    path.join(repoRoot, 'test'),
    path.join(repoRoot, '.agents/skills'),
    path.join(repoRoot, 'bin'),
  ];
  const stack = [...roots];
  while (stack.length) {
    const dir = stack.pop();
    if (!fs.existsSync(dir)) continue;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!/\.(js|cjs|mjs)$/.test(ent.name)) continue;
      const text = fs.readFileSync(abs, 'utf8');
      const rel = path.relative(repoRoot, abs).replace(/\\/g, '/');
      const lines = text.split('\n');
      lines.forEach((line, idx) => {
        const stripped = line.replace(/\/\/.*$/, '');
        if (/(spawnSync|spawn|execFile|execSync)\(\s*(['"])python\d?\2/.test(stripped)) {
          offenders.push(`${rel}:${idx + 1}: spawns python binary`);
        }
        if (/(spawnSync|spawn|execFile|execSync)\(\s*PYTHON\b/.test(stripped)) {
          offenders.push(`${rel}:${idx + 1}: spawns PYTHON variable`);
        }
      });
    }
  }
  assert.deepStrictEqual(offenders, [], `no python spawns in tests/skills/bin:\n${offenders.join('\n')}`);
}

console.log('test-unique-runtime: ok');
