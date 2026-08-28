import fs from 'fs';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, path, repoRoot, temp, run, write } = utils;

const cli = path.join(repoRoot, 'scripts/harness-benchmark/cli.cjs');
const schemaPath = path.join(repoRoot, 'benchmarks/schema/report.schema.json');
const { loadJsonSchema, validateNode } = require(path.join(repoRoot, '.agents/skills/ws-shared/scripts/validate_json_schema.cjs'));
const ledgerScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs');
const validateSpecScript = path.join(repoRoot, '.agents/skills/ws-spec-format/scripts/validate_spec.cjs');

// V1: CLI help lists subcommands
const help = run(cli, ['--help']);
assert.strictEqual(help.status, 0, help.stderr);
for (const cmd of ['run', 'prepare', 'collect', 'snapshot', 'compare', 'table']) {
  assert.match(help.stdout, new RegExp(`\\b${cmd}\\b`), `help lists ${cmd}`);
}

// V2: npm benchmark scripts
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
assert.strictEqual(pkg.scripts.benchmark, 'node scripts/harness-benchmark/cli.cjs');
assert.match(pkg.scripts['benchmark:static'], /run --mode static/);

// V4: all helpers are .cjs
const hbRoot = path.join(repoRoot, 'scripts/harness-benchmark');
for (const file of fs.readdirSync(hbRoot, { recursive: true })) {
  if (typeof file === 'string' && file.endsWith('.cjs')) {
    const check = spawnSync(process.execPath, ['--check', path.join(hbRoot, file)], { encoding: 'utf8' });
    assert.strictEqual(check.status, 0, `syntax ok: ${file}`);
  }
}

// V5: schema required keys
const schema = loadJsonSchema(schemaPath, 'report');
for (const key of ['meta', 'dimensions', 'index', 'perAc', 'sensor', 'diffRange', 'verdict']) {
  assert.ok(schema.required.includes(key), `schema requires ${key}`);
}

// V17: fixtures including mid-high fx-config-merge
for (const id of ['fx-lite-readme', 'fx-node-helper', 'fx-incomplete', 'fx-standard-mock', 'fx-config-merge']) {
  const dir = path.join(repoRoot, 'benchmarks/fixtures', id);
  assert.ok(fs.existsSync(path.join(dir, 'spec.md')), `${id} spec.md`);
  assert.ok(fs.existsSync(path.join(dir, 'oracle.json')), `${id} oracle.json`);
  assert.strictEqual(run(validateSpecScript, [path.join(dir, 'spec.md'), '--mode=authoring']).status, 0, `${id} authoring valid`);
}

// V18: fx-incomplete cap
const incompleteOracle = JSON.parse(fs.readFileSync(path.join(repoRoot, 'benchmarks/fixtures/fx-incomplete/oracle.json'), 'utf8'));
assert.ok(incompleteOracle.expectCompletenessMax <= 5);
const { checkFailIf, checkRegression } = require(path.join(repoRoot, 'scripts/harness-benchmark/lib/compare.cjs'));
assert.deepStrictEqual(
  checkFailIf(incompleteOracle, { dimensions: { completeness: 5 }, index: { value: 50 } }),
  [],
  'capped incomplete score must not fail compare',
);
assert.ok(
  checkFailIf(incompleteOracle, { dimensions: { completeness: 7 }, index: { value: 70 } }).length > 0,
  'incomplete fixture must fail when completeness exceeds cap',
);

// V19: oracles spec-anchored (no hash bodies)
for (const id of ['fx-lite-readme', 'fx-node-helper', 'fx-standard-mock', 'fx-config-merge']) {
  const oracle = JSON.parse(fs.readFileSync(path.join(repoRoot, `benchmarks/fixtures/${id}/oracle.json`), 'utf8'));
  assert.ok(oracle.expectedOutputPaths?.length, `${id} paths`);
  assert.ok(!JSON.stringify(oracle).match(/sha256|hash/i), `${id} no hashes`);
}

// V20: gitignore runs
const gitignore = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
assert.match(gitignore, /benchmarks\/runs\//);

// V8/V6/V7/V9: static run
const skillsMtimeBefore = fs.statSync(path.join(repoRoot, '.agents/skills/ws-karpathy-guidelines/SKILL.md')).mtimeMs;
const staticRun = run(cli, ['run', '--mode', 'static', '--fixture', 'fx-lite-readme']);
assert.strictEqual(staticRun.status, 0, staticRun.stderr || staticRun.stdout);
const skillsMtimeAfter = fs.statSync(path.join(repoRoot, '.agents/skills/ws-karpathy-guidelines/SKILL.md')).mtimeMs;
assert.strictEqual(skillsMtimeBefore, skillsMtimeAfter, 'static run does not touch SoT skills');

const runsDir = path.join(repoRoot, 'benchmarks/runs');
const latestRun = fs.readdirSync(runsDir).filter((n) => n.startsWith('static-')).sort().at(-1);
const reportPath = path.join(runsDir, latestRun, 'report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const schemaErrors = validateNode(report, schema, 'report.json');
assert.strictEqual(schemaErrors.length, 0, schemaErrors.join('; '));
for (const field of ['packageVersion', 'gitSha', 'fixtureId', 'mode', 'orch', 'dryRun', 'timestamp']) {
  assert.ok(report.meta[field] != null, `meta.${field}`);
}
assert.strictEqual(report.meta.mode, 'static');
assert.ok(report.dimensions.efficiency != null, 'static efficiency recorded');
assert.ok(fs.readFileSync(path.join(runsDir, latestRun, 'report.md'), 'utf8').includes('## Dimensions'));

// V21: snapshot slim baseline into a temp tree (do not rewrite tracked baselines/)
const snapRoot = temp('hb-snap-');
write(path.join(snapRoot, 'package.json'), JSON.stringify({ version: '0.0.0' }));
write(path.join(snapRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({ plans: { dir: '.agents/plans' } }));
const snap = run(cli, ['snapshot', '--from', reportPath, '--name', 'test-slim-baseline', '--repo-root', snapRoot]);
assert.strictEqual(snap.status, 0, snap.stderr);
const baselinePath = path.join(snapRoot, 'benchmarks/baselines/test-slim-baseline.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
assert.ok(baseline.meta && baseline.dimensions && baseline.index && baseline.fixtureId);
assert.strictEqual(baseline.perAc, undefined);

// V22/V23: compare regression exit 1
const worse = {
  ...baseline,
  dimensions: { ...baseline.dimensions, completeness: 10, verifyScore: 10 },
  index: { ...baseline.index, value: Math.max(0, baseline.index.value - 10) },
};
const worsePath = path.join(temp('hb-compare-'), 'worse.json');
write(worsePath, JSON.stringify(worse, null, 2));
const compareFail = run(cli, ['compare', '--from', baselinePath, '--to', worsePath]);
assert.strictEqual(compareFail.status, 1, 'compare exits 1 on regression');
const mismatchReport = {
  ...baseline,
  meta: { ...baseline.meta, mode: baseline.meta.mode === 'static' ? 'live' : 'static', fixtureId: 'fx-other' },
};
const mismatchPath = path.join(temp('hb-compare-mismatch-'), 'mismatch.json');
write(mismatchPath, JSON.stringify(mismatchReport, null, 2));
const compareMismatch = run(cli, ['compare', '--from', baselinePath, '--to', mismatchPath]);
assert.notStrictEqual(compareMismatch.status, 0, 'compare rejects fixture/mode mismatch');
assert.match(`${compareMismatch.stderr}\n${compareMismatch.stdout}`, /mismatch/);
assert.deepStrictEqual(
  checkRegression(
    { meta: { mode: 'static' }, index: { value: 100 }, dimensions: { verifyScore: 9 } },
    { meta: { mode: 'live' }, index: { value: 80 }, dimensions: { verifyScore: 9 } },
    false,
  ),
  [],
  'index compare skipped across modes',
);

// V24: CLI has no push spawn
const cliSource = fs.readFileSync(cli, 'utf8');
assert.ok(!/git\s+push|create-pr|gh\s+pr\s+create/i.test(cliSource), 'no push/pr spawn in CLI');

// V10/V11: prepare sandbox
const prepare = run(cli, ['prepare', '--fixture', 'fx-lite-readme']);
assert.strictEqual(prepare.status, 0, prepare.stderr);
const sandboxMatch = prepare.stdout.match(/Sandbox: (.+)/);
assert.ok(sandboxMatch, 'sandbox path printed');
const sandboxRoot = sandboxMatch[1].trim();
assert.ok(!sandboxRoot.startsWith(repoRoot) || !sandboxRoot.includes(path.normalize(repoRoot)), 'sandbox outside or isolated');
const runMd = fs.readFileSync(path.join(sandboxRoot, 'RUN.md'), 'utf8');
assert.match(runMd, /dryRun:\s*true/);
const specCopied = fs.existsSync(path.join(sandboxRoot, '.agents/specs/fx-lite-readme.spec.md'));
assert.ok(specCopied, 'spec copied to sandbox specsDir');
assert.strictEqual(
  spawnSync('git', ['rev-parse', 'HEAD'], { cwd: sandboxRoot, encoding: 'utf8' }).status,
  0,
  'prepare must initialize git for collect/orch',
);
assert.ok(fs.existsSync(path.join(sandboxRoot, '.benchmark-baseline-sha')), 'prepare records baseline sha');
fs.rmSync(sandboxRoot, { recursive: true, force: true });

// V12: collect uses ledger verify not markdown score
const collectRoot = temp('hb-collect-');
write(path.join(collectRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  verification: { backendTest: 'exit 0' },
  plans: { dir: '.agents/plans', specsDir: '.agents/specs' },
  defaults: { dryRun: true, autoMode: true },
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
write(path.join(collectRoot, 'impl.js'), 'module.exports = {};\n');
write(path.join(collectRoot, 'feature.spec.md'), '## Acceptance Criteria\n- AC1: Thing.\n');
write(path.join(collectRoot, 'feature.test.js'), 'test("first", () => {});\n');
const planDir = path.join(collectRoot, '.agents/plans/node-helper');
fs.mkdirSync(planDir, { recursive: true });
write(path.join(planDir, 'plan.index.json'), JSON.stringify({
  acceptanceCriteria: [{ id: 'AC1', taskIds: ['T1'], planSectionIds: ['S1'], expectedTestNames: ['first'] }],
}));
spawnSync('git', ['init'], { cwd: collectRoot, encoding: 'utf8' });
spawnSync('git', ['config', 'user.email', 't@e.com'], { cwd: collectRoot });
spawnSync('git', ['config', 'user.name', 't'], { cwd: collectRoot });
spawnSync('git', ['add', '.'], { cwd: collectRoot });
spawnSync('git', ['commit', '-m', 'init'], { cwd: collectRoot });
assert.strictEqual(run(ledgerScript, ['init', '--spec', 'feature.spec.md', '--plan-index', path.join(planDir, 'plan.index.json'), '--output', path.join(planDir, 'ac-ledger.json'), '--workflow-id', 'wf', '--slug', 'node-helper', '--repo-root', collectRoot]).status, 0);
assert.strictEqual(run(ledgerScript, [
  'link', '--ledger', path.join(planDir, 'ac-ledger.json'), '--event-id', 'e1', '--ac', 'AC1',
  '--status', 'Implemented', '--file', 'impl.js:L1-L1',
  '--test', JSON.stringify({ name: 'first', sourceFile: 'feature.test.js', phase: 'planned', alias: null, exitCode: null }),
  '--repo-root', collectRoot,
]).status, 0);
write(path.join(planDir, 'harness-spec-benchmark.state.md'), 'verifyScore: 10\n');
const collect = run(cli, ['collect', '--sandbox', collectRoot, '--fixture', 'fx-node-helper']);
assert.strictEqual(collect.status, 0, collect.stderr || collect.stdout);
const collectReportDir = fs.readdirSync(path.join(repoRoot, 'benchmarks/runs')).find((n) => n.startsWith('live-'));
const collectReport = JSON.parse(fs.readFileSync(path.join(repoRoot, 'benchmarks/runs', collectReportDir, 'report.json'), 'utf8'));
assert.ok(collectReport.dimensions.verifyScore != null);
assert.ok(collectReport.dimensions.verifyScore <= 9, 'ledger-derived score not narrative 10');
fs.rmSync(collectRoot, { recursive: true, force: true });

// V13: evidence-or-zero completeness
assert.ok(collectReport.perAc.some((row) => row.score === 0 && row.evidence === 'EXPLICIT ZERO'), 'zero without evidence');

// V14: judge detects fraud when ledger file not in diff
const { detectFrauds, mapVerdict } = require(path.join(repoRoot, 'scripts/harness-benchmark/lib/judge-checks.cjs'));
const { resolveConsumerContext } = require(path.join(repoRoot, '.agents/skills/ws-shared/scripts/resolve_consumer_root.cjs'));
const judgeRoot = temp('hb-judge-');
write(path.join(judgeRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  verification: { backendTest: 'exit 0' },
  plans: { dir: '.agents/plans', specsDir: '.agents/specs' },
}));
write(path.join(judgeRoot, 'impl.js'), 'module.exports = {};\n');
spawnSync('git', ['init'], { cwd: judgeRoot, encoding: 'utf8' });
spawnSync('git', ['config', 'user.email', 't@e.com'], { cwd: judgeRoot });
spawnSync('git', ['config', 'user.name', 't'], { cwd: judgeRoot });
spawnSync('git', ['add', '.'], { cwd: judgeRoot });
spawnSync('git', ['commit', '-m', 'init'], { cwd: judgeRoot });
const judgeLedger = {
  acceptanceCriteria: [{ id: 'AC1', files: [{ path: 'missing.js', lineStart: 1, lineEnd: 1 }] }],
  aliasResults: [{ alias: 'backendTest', command: 'exit 0', exitCode: 0 }],
};
const judgeContext = resolveConsumerContext({ repoRoot: judgeRoot });
const judgeFrauds = detectFrauds(judgeRoot, judgeLedger, judgeContext);
const judgeMapped = mapVerdict(judgeFrauds, []);
assert.ok(judgeFrauds.some((f) => f.type === 'false-completion' && /not in diff/.test(f.detail)), 'judge flags missing diff file');
assert.ok(judgeMapped.judge < 10, 'judge score penalized for fraud');
assert.ok(collectReport.dimensions.judge != null);
assert.ok(collectReport.dimensions.honesty != null);

// V14b: re-run verification aliases catches false-completion
const verifyRoot = temp('hb-judge-verify-');
write(path.join(verifyRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  verification: { backendTest: 'exit 1' },
  plans: { dir: '.agents/plans' },
}));
write(path.join(verifyRoot, 'impl.js'), 'module.exports = {};\n');
spawnSync('git', ['init'], { cwd: verifyRoot, encoding: 'utf8' });
spawnSync('git', ['config', 'user.email', 't@e.com'], { cwd: verifyRoot });
spawnSync('git', ['config', 'user.name', 't'], { cwd: verifyRoot });
spawnSync('git', ['add', '.'], { cwd: verifyRoot, encoding: 'utf8' });
spawnSync('git', ['commit', '-m', 'init'], { cwd: verifyRoot });
const verifyLedger = {
  acceptanceCriteria: [{ id: 'AC1', files: [{ path: 'impl.js', lineStart: 1, lineEnd: 1 }] }],
  aliasResults: [{ alias: 'backendTest', command: 'exit 1', exitCode: 0 }],
};
const verifyContext = resolveConsumerContext({ repoRoot: verifyRoot });
const verifyFrauds = detectFrauds(verifyRoot, verifyLedger, verifyContext);
assert.ok(
  verifyFrauds.some((f) => f.type === 'false-completion' && /backendTest/.test(f.detail)),
  're-run catches ledger pass vs failing alias',
);

// V14c: unauthorized-action fraud from git history
const authRoot = temp('hb-judge-auth-');
write(path.join(authRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({ plans: { dir: '.agents/plans' } }));
write(path.join(authRoot, 'impl.js'), 'module.exports = {};\n');
spawnSync('git', ['init'], { cwd: authRoot, encoding: 'utf8' });
spawnSync('git', ['config', 'user.email', 't@e.com'], { cwd: authRoot });
spawnSync('git', ['config', 'user.name', 't'], { cwd: authRoot });
spawnSync('git', ['add', '.'], { cwd: authRoot });
spawnSync('git', ['commit', '-m', 'init'], { cwd: authRoot });
spawnSync('git', ['commit', '--allow-empty', '-m', 'attempt git push origin main'], { cwd: authRoot });
const authLedger = { acceptanceCriteria: [], aliasResults: [] };
const authContext = resolveConsumerContext({ repoRoot: authRoot });
const authFrauds = detectFrauds(authRoot, authLedger, authContext);
assert.ok(
  authFrauds.some((f) => f.type === 'unauthorized-action'),
  'detects unauthorized push in git history',
);
fs.rmSync(judgeRoot, { recursive: true, force: true });
fs.rmSync(verifyRoot, { recursive: true, force: true });
fs.rmSync(authRoot, { recursive: true, force: true });

const { gitDiffNames } = require(path.join(repoRoot, 'scripts/harness-benchmark/lib/judge-checks.cjs'));
const evRoot = temp('hb-git-ev-');
write(path.join(evRoot, 'seed.js'), 'module.exports = 1;\n');
spawnSync('git', ['init'], { cwd: evRoot, encoding: 'utf8' });
spawnSync('git', ['config', 'user.email', 't@e.com'], { cwd: evRoot });
spawnSync('git', ['config', 'user.name', 't'], { cwd: evRoot });
spawnSync('git', ['add', '.'], { cwd: evRoot });
spawnSync('git', ['commit', '-m', 'seed'], { cwd: evRoot });
const seedSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: evRoot, encoding: 'utf8' }).stdout.trim();
write(path.join(evRoot, '.benchmark-baseline-sha'), `${seedSha}\n`);
write(path.join(evRoot, 'delivered.js'), 'module.exports = 2;\n');
assert.ok(gitDiffNames(evRoot).includes('delivered.js'), 'untracked deliverables count as baseline diff');
fs.rmSync(evRoot, { recursive: true, force: true });

// V15/V26: runSensor restores porcelain and kills inverted mutation with the real oracle command
const { runSensor, applyPatch } = require(path.join(repoRoot, 'scripts/harness-benchmark/lib/sensor.cjs'));
const { resolvePaths, loadOracle } = require(path.join(repoRoot, 'scripts/harness-benchmark/lib/paths.cjs'));
const sensorPaths = resolvePaths({ repoRoot });
const greetSource = 'function greet(name) {\n  return `Hello, ${name}!`;\n}\nmodule.exports = { greet };\n';
const invertPatch = fs.readFileSync(path.join(sensorPaths.fixturesRoot, 'fx-node-helper/invert.patch'), 'utf8');
const patchProbe = temp('hb-patch-');
write(path.join(patchProbe, 'lib/greet.cjs'), greetSource);
applyPatch(path.join(patchProbe, 'lib/greet.cjs'), invertPatch);
const patchedGreet = fs.readFileSync(path.join(patchProbe, 'lib/greet.cjs'), 'utf8');
assert.match(patchedGreet, /Goodbye/);
assert.ok(!/function greet\(name\) \{\s*\}/.test(patchedGreet), 'applyPatch inserts + lines in place');
fs.rmSync(patchProbe, { recursive: true, force: true });

const sensorOracle = {
  ...loadOracle(sensorPaths.fixturesRoot, 'fx-node-helper'),
  fixtureId: 'fx-node-helper',
};
const sensorScratch = temp('hb-sensor-');
write(path.join(sensorScratch, 'lib/greet.cjs'), greetSource);
write(
  path.join(sensorScratch, 'test/helper-greet-behavior.test.cjs'),
  "const test = require('node:test');\nconst assert = require('node:assert');\nconst { greet } = require('../lib/greet.cjs');\ntest('helper-greet-behavior', () => { assert.match(greet('Ada'), /Hello/); });\n",
);
spawnSync('git', ['init'], { cwd: sensorScratch, encoding: 'utf8' });
spawnSync('git', ['config', 'user.email', 't@e.com'], { cwd: sensorScratch });
spawnSync('git', ['config', 'user.name', 't'], { cwd: sensorScratch });
spawnSync('git', ['add', '.'], { cwd: sensorScratch });
spawnSync('git', ['commit', '-m', 'init'], { cwd: sensorScratch });
const sensorResult = runSensor(sensorScratch, sensorOracle, sensorPaths);
assert.strictEqual(sensorResult.porcelainOk, true, 'sensor leaves sandbox porcelain clean');
assert.strictEqual(sensorResult.verdict, 'PASS', 'sensor kills inverted mutation');
assert.ok(sensorResult.injected > 0, 'sensor injected mutation');
assert.strictEqual(sensorResult.killed, sensorResult.injected, 'all injections killed');
fs.rmSync(sensorScratch, { recursive: true, force: true });

// table: version-over-version markdown from baselines
const tableRoot = temp('hb-table-');
write(path.join(tableRoot, 'package.json'), JSON.stringify({ version: '0.0.0' }));
write(path.join(tableRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({ plans: { dir: '.agents/plans' } }));
const tableBaseDir = path.join(tableRoot, 'benchmarks/baselines');
const slim = (version, index, wallSec) => ({
  meta: {
    packageVersion: version,
    gitSha: 'aaaaaaaa',
    fixtureId: 'fx-config-merge',
    mode: 'live',
    orch: 'standard',
    dryRun: true,
    timestamp: `2026-08-28T0${version.slice(-1)}:00:00Z`,
    wallSec,
  },
  dimensions: {
    completeness: 10,
    verifyScore: 9,
    judge: 10,
    discrimination: 10,
    efficiency: null,
    time: 8,
    honesty: 10,
  },
  index: { value: index, weights: {
    completeness: 20, verifyScore: 20, judge: 15, discrimination: 15, efficiency: 15, time: 10, honesty: 5,
  } },
  fixtureId: 'fx-config-merge',
});
write(path.join(tableBaseDir, '0.3.49-fx-config-merge-live.json'), JSON.stringify(slim('0.3.49', 88, 1900)));
write(path.join(tableBaseDir, '0.3.48-fx-config-merge-live.json'), JSON.stringify(slim('0.3.48', 82, 2400)));
const tableRun = run(cli, ['table', '--fixture', 'fx-config-merge', '--mode', 'live', '--repo-root', tableRoot]);
assert.strictEqual(tableRun.status, 0, tableRun.stderr || tableRun.stdout);
assert.match(tableRun.stdout, /0\.3\.48/);
assert.match(tableRun.stdout, /0\.3\.49/);
const firstVer = tableRun.stdout.indexOf('0.3.48');
const secondVer = tableRun.stdout.indexOf('0.3.49');
assert.ok(firstVer >= 0 && firstVer < secondVer, 'table sorts older version first');
assert.match(tableRun.stdout, /2400/);
fs.rmSync(tableRoot, { recursive: true, force: true });

// V25: CATALOG documents benchmark commands
const catalog = fs.readFileSync(path.join(repoRoot, 'CATALOG.md'), 'utf8');
assert.match(catalog, /benchmark:static/);
assert.match(catalog, /prepare --fixture/);
assert.match(catalog, /collect --sandbox/);

// V27: record-lessons off by default; writes on regression when flag set
const lessonsDir = temp('hb-lessons-');
const sharedHub = path.join(lessonsDir, '.agents/skills/ws-shared');
fs.mkdirSync(path.join(sharedHub, 'memory'), { recursive: true });
write(path.join(sharedHub, 'config.json'), JSON.stringify({ plans: { dir: '.agents/plans' } }));
const memBefore = fs.readdirSync(path.join(sharedHub, 'memory')).length;
const compareNoLessons = run(cli, ['compare', '--from', baselinePath, '--to', worsePath]);
assert.strictEqual(compareNoLessons.status, 1);
assert.strictEqual(fs.readdirSync(path.join(sharedHub, 'memory')).length, memBefore, 'no lesson without flag');

console.log('test-harness-benchmark: ok');
