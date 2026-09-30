import crypto from 'crypto';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, fs, path, repoRoot, temp, run, write } = utils;

const publisher = path.join(repoRoot, '.agents/skills/ws-benchmarks/scripts/publish_comparison.cjs');
const manager = path.join(repoRoot, '.agents/skills/ws-benchmarks/scripts/benchmarks_manager.cjs');

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function prdText() {
  return [
    '# Frozen PRD — comparison fixture',
    '',
    '## Acceptance Criteria',
    '',
    '- AC1: Helper formats durations.',
    '- AC2: Helper rejects negatives.',
    '',
    '## Negative Scenarios',
    '',
    '- NS1: Empty input fails loudly.',
    '',
  ].join('\n');
}

function judgeDef() {
  return {
    version: 1,
    checks: [
      { id: 'C1', text: 'Durations formatted', evidence: 'report.dimensions.completeness >= 0' },
      { id: 'C2', text: 'Negatives rejected', evidence: 'report.verdict present' },
      { id: 'C3', text: 'Empty input fails loudly', evidence: 'report.meta exists' },
    ],
  };
}

function sample(checks, model = 'model-roles-fixed-1', ts = '2026-09-30T12:00:00Z') {
  return {
    timestamp: ts,
    models: { planner: model, executor: model },
    checks,
    evidenceRefs: ['benchmarks/runs/static-test/report.json'],
  };
}

function manifest(runDir, prdHash, judgeHash, overrides = {}) {
  const base = {
    runId: 'fixed-models-001',
    prdSha256: prdHash,
    judgeSha256: judgeHash,
    columns: [
      {
        harness: 'workflow-skills',
        version: '0.0.0-test',
        settings: { mode: 'static', fixture: 'fx-node-helper' },
        defaults: { mode: 'static', fixture: 'fx-node-helper' },
        models: { planner: 'model-roles-fixed-1', executor: 'model-roles-fixed-1' },
        samples: [
          sample({ C1: 1, C2: 1, C3: 0 }),
          sample({ C1: 1, C2: 0, C3: 1 }),
          sample({ C1: 1, C2: 1, C3: 1 }),
        ],
      },
      {
        harness: 'ext-harness',
        version: '9.9.9',
        settings: { mode: 'static', defaults: true },
        defaults: { mode: 'static', defaults: true },
        models: { planner: 'ext-model-1', executor: 'ext-model-1' },
        samples: [
          sample({ C1: 1, C2: 1, C3: 1 }, 'ext-model-1'),
          sample({ C1: 0, C2: 1, C3: 1 }, 'ext-model-1'),
          sample({ C1: 1, C2: 0, C3: 1 }, 'ext-model-1'),
        ],
      },
    ],
    protocolExceptions: [],
    pendingComparators: [],
  };
  return { ...base, ...overrides };
}

function seedRepo() {
  const repo = temp('cmp-repo-');
  write(path.join(repo, 'scripts/harness-benchmark/cli.cjs'), "'use strict';\n");
  return repo;
}

function seedRun(tweaks = {}) {
  const repo = tweaks.repo || seedRepo();
  const dir = path.join(repo, 'comparisons', 'fixed-models-001');
  const resultsDir = tweaks.resultsDir || path.join(repo, 'benchmarks', 'results');
  const prd = prdText();
  const judge = judgeDef();
  const judgeBytes = `${JSON.stringify(judge, null, 2)}\n`;
  const prdHash = sha256(prd);
  const judgeHash = sha256(judgeBytes);
  write(path.join(dir, 'prd.md'), prd);
  write(path.join(dir, 'judge.json'), judgeBytes);
  const man = manifest(dir, prdHash, judgeHash, tweaks.manifest || {});
  if (tweaks.samples) man.columns = tweaks.samples(man.columns);
  write(path.join(dir, 'run-manifest.json'), `${JSON.stringify(man, null, 2)}\n`);
  return { repo, dir, resultsDir, man, prdHash, judgeHash };
}

function publish(args, seed) {
  const full = seed && seed.repo ? [...args, '--repo-root', seed.repo] : args;
  return run(publisher, full, { cwd: repoRoot });
}

// AC6: publisher exists and advertises run mode
{
  const help = publish(['--help']);
  assert.strictEqual(help.status, 0, help.stderr);
  assert.match(help.stdout, /--run/, 'help names --run');
}

// AC5: valid run publishes md+json with all required fields
{
  const seed = seedRun();
  const { dir, resultsDir } = seed;
  const res = publish(['--run', dir, '--results-dir', resultsDir], seed);
  assert.strictEqual(res.status, 0, res.stderr);
  const mdPath = path.join(resultsDir, 'comparison-fixed-models-001.md');
  const jsonPath = path.join(resultsDir, 'comparison-fixed-models-001.json');
  assert.ok(fs.existsSync(mdPath), 'report md written');
  assert.ok(fs.existsSync(jsonPath), 'report json written');
  const md = fs.readFileSync(mdPath, 'utf8');
  for (const token of ['PRD sha256', 'workflow-skills', 'ext-harness', 'model-roles-fixed-1', 'ext-model-1', 'C1', 'Aggregate', 'Judge', '2026-09-30T12:00:00Z']) {
    assert.match(md, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `report contains ${token}`);
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(data.runId, 'fixed-models-001');
  assert.ok(data.prdSha256 && data.judgeSha256, 'hashes recorded');
  assert.strictEqual(data.columns.length, 2, 'two scored columns');
  assert.strictEqual(data.columns[0].samples.length, 3, 'per-sample results preserved');
  assert.ok(typeof data.columns[0].aggregate.total === 'number', 'aggregates computed');
  assert.deepStrictEqual(data.columns[0].perSample, [2, 2, 3], 'binary sums, no partial credit');
  const evo = fs.readFileSync(path.join(resultsDir, 'BENCHMARK_EVOLUTION.md'), 'utf8');
  assert.match(evo, /## Fixed-Model Comparison Runs/, 'evolution section created');
  assert.match(evo, /comparison-fixed-models-001\.md/, 'run linked');
}

// AC1: PRD hash mismatch rejects publish
{
  const seed = seedRun({ manifest: { prdSha256: '0'.repeat(64) } });
  const { dir, resultsDir } = seed;
  const res = publish(['--run', dir, '--results-dir', resultsDir], seed);
  assert.notStrictEqual(res.status, 0, 'prd drift must fail');
  assert.match(res.stderr, /prd/i, 'names the PRD');
  assert.ok(!fs.existsSync(path.join(resultsDir, 'comparison-fixed-models-001.md')), 'no report on drift');
}

// AC2: mixed model versions within a column rejected
{
  const seed = seedRun({
    samples: (cols) => {
      cols[0].samples[2] = sample({ C1: 1, C2: 1, C3: 1 }, 'model-roles-fixed-2');
      return cols;
    },
  });
  const { dir, resultsDir } = seed;
  const res = publish(['--run', dir, '--results-dir', resultsDir], seed);
  assert.notStrictEqual(res.status, 0, 'model mix must fail');
  assert.match(res.stderr, /workflow-skills/, 'names the harness column');
}

// AC3: fewer than 3 samples blocks publication
{
  const seed = seedRun({
    samples: (cols) => {
      cols[1].samples = cols[1].samples.slice(0, 2);
      return cols;
    },
  });
  const { dir, resultsDir } = seed;
  const res = publish(['--run', dir, '--results-dir', resultsDir], seed);
  assert.notStrictEqual(res.status, 0, 'shortfall must fail');
  assert.match(res.stderr, /ext-harness/, 'names the short column');
}

// AC4: non-binary result rejected
{
  const seed = seedRun({
    samples: (cols) => {
      cols[0].samples[0] = sample({ C1: 0.5, C2: 1, C3: 1 });
      return cols;
    },
  });
  const { dir, resultsDir } = seed;
  const res = publish(['--run', dir, '--results-dir', resultsDir], seed);
  assert.notStrictEqual(res.status, 0, 'partial credit must fail');
  assert.match(res.stderr, /binary/i, 'names the binary rule');
}

// AC4: judge edit after scoring invalidates samples
{
  const seed = seedRun({ manifest: { judgeSha256: '1'.repeat(64) } });
  const { dir, resultsDir } = seed;
  const res = publish(['--run', dir, '--results-dir', resultsDir], seed);
  assert.notStrictEqual(res.status, 0, 'judge drift must fail');
  assert.match(res.stderr, /judge/i, 'names the judge');
}

// AC7: unlogged settings deviation fails the column; logged deviation passes
{
  const deviated = (cols) => {
    cols[1].settings = { mode: 'live', defaults: false };
    return cols;
  };
  const bad = seedRun({ samples: deviated });
  const resBad = publish(['--run', bad.dir, '--results-dir', bad.resultsDir], bad);
  assert.notStrictEqual(resBad.status, 0, 'unlogged deviation must fail');
  assert.match(resBad.stderr, /protocolExceptions|deviation/i, 'points at exceptions log');

  const good = seedRun();
  const man = JSON.parse(fs.readFileSync(path.join(good.dir, 'run-manifest.json'), 'utf8'));
  man.columns[1].settings = { mode: 'live', defaults: false };
  man.protocolExceptions = [{ harness: 'ext-harness', setting: 'mode', expected: 'static', actual: 'live', reason: 'fixture run' }];
  write(path.join(good.dir, 'run-manifest.json'), `${JSON.stringify(man, null, 2)}\n`);
  const resGood = publish(['--run', good.dir, '--results-dir', good.resultsDir], good);
  assert.strictEqual(resGood.status, 0, resGood.stderr);
  const md = fs.readFileSync(path.join(good.resultsDir, 'comparison-fixed-models-001.md'), 'utf8');
  assert.match(md, /protocolExceptions|Protocol exceptions/i, 'exception rendered');
}

// AC7b: pending comparators render without scores
{
  const seed = seedRun();
  const { dir, resultsDir } = seed;
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'run-manifest.json'), 'utf8'));
  man.pendingComparators = [{ harness: 'future-harness', reason: 'no evidence-backed samples', rerun: 'record 3 samples then re-publish' }];
  write(path.join(dir, 'run-manifest.json'), `${JSON.stringify(man, null, 2)}\n`);
  const res = publish(['--run', dir, '--results-dir', resultsDir], seed);
  assert.strictEqual(res.status, 0, res.stderr);
  const data = JSON.parse(fs.readFileSync(path.join(resultsDir, 'comparison-fixed-models-001.json'), 'utf8'));
  assert.strictEqual(data.columns.length, 2, 'pending excluded from scored columns');
  assert.strictEqual(data.pendingComparators.length, 1, 'pending recorded');
}

// Path containment: --run outside the repo is refused
{
  const repo = seedRepo();
  const outside = temp('cmp-outside-');
  const res = publish(['--run', outside], { repo });
  assert.notStrictEqual(res.status, 0, 'outside-root run must fail');
  assert.match(res.stderr, /outside|repo root|contain/i, 'names containment');
}

// Determinism: same inputs -> identical body modulo Generated stamp
{
  const seed = seedRun();
  const { dir, resultsDir } = seed;
  const first = publish(['--run', dir, '--results-dir', resultsDir], seed);
  assert.strictEqual(first.status, 0, first.stderr);
  const mdPath = path.join(resultsDir, 'comparison-fixed-models-001.md');
  const before = fs.readFileSync(mdPath, 'utf8');
  const second = publish(['--run', dir, '--results-dir', resultsDir], seed);
  assert.strictEqual(second.status, 0, second.stderr);
  const strip = (s) => s.replace(/^\*\*Generated:\*\* [^\n]*$/m, '');
  assert.strictEqual(strip(fs.readFileSync(mdPath, 'utf8')), strip(before), 'body deterministic');
  assert.match(second.stdout, /unchanged|skipped/i, 'second publish skips rewrite');
}

// AC6: no forked engine — publisher never reimplements engine internals
{
  const src = fs.readFileSync(publisher, 'utf8');
  for (const token of ['runStatic', 'prepareSandbox', 'collectRun', 'harness-benchmark/lib']) {
    assert.ok(!src.includes(token), `publisher must not contain ${token}`);
  }
}

// AC8: evolution link written and preserved by --update-comparison (hermetic: temp results dir)
{
  const evo = run(manager, ['--evolution']);
  assert.strictEqual(evo.status, 0, evo.stderr);
  const seed = seedRun();
  const first = publish(['--run', seed.dir, '--results-dir', seed.resultsDir], seed);
  assert.strictEqual(first.status, 0, first.stderr);
  const evoPath = path.join(seed.resultsDir, 'BENCHMARK_EVOLUTION.md');
  assert.match(fs.readFileSync(evoPath, 'utf8'), /comparison-fixed-models-001\.md/, 'run linked');
  const upd = run(manager, ['--update-comparison', '--results-dir', seed.resultsDir]);
  assert.strictEqual(upd.status, 0, upd.stderr);
  const after = fs.readFileSync(evoPath, 'utf8');
  assert.match(after, /## Fixed-Model Comparison Runs/, 'comparison section preserved across update');
  assert.match(after, /comparison-fixed-models-001\.md/, 'run link preserved');
  assert.match(after, /Version-over-Version Evolution Table/, 'version table regenerated around section');
  const again = run(manager, ['--update-comparison', '--results-dir', seed.resultsDir]);
  assert.strictEqual(again.status, 0, again.stderr);
  assert.match(again.stdout, /none written|Skipped unchanged/, 'second update skips unchanged tables');
}

// CR-001: traversal runId rejected, nothing written outside results
{
  const seed = seedRun({ manifest: { runId: '../evil' } });
  const res = publish(['--run', seed.dir, '--results-dir', seed.resultsDir], seed);
  assert.notStrictEqual(res.status, 0, 'traversal runId must fail');
  assert.match(res.stderr, /safe filename segment/i, 'names the segment rule');
  assert.ok(!fs.existsSync(path.join(seed.repo, 'evil.md')), 'no escape write');
  assert.ok(!fs.existsSync(path.join(seed.repo, 'benchmarks', 'evil.md')), 'no sibling write');
}

// CR-002: duplicate harness names rejected (AC2 split evasion)
{
  const seed = seedRun();
  const man = JSON.parse(fs.readFileSync(path.join(seed.dir, 'run-manifest.json'), 'utf8'));
  man.columns.push({ ...man.columns[1], harness: 'workflow-skills' });
  write(path.join(seed.dir, 'run-manifest.json'), `${JSON.stringify(man, null, 2)}\n`);
  const res = publish(['--run', seed.dir, '--results-dir', seed.resultsDir], seed);
  assert.notStrictEqual(res.status, 0, 'duplicate harness must fail');
  assert.match(res.stderr, /duplicate harness/i, 'names the dupe rule');
}

// CR-003: duplicate judge check ids rejected (double-count guard)
{
  const seed = seedRun();
  const judge = JSON.parse(fs.readFileSync(path.join(seed.dir, 'judge.json'), 'utf8'));
  judge.checks.push({ ...judge.checks[0] });
  const judgeBytes = `${JSON.stringify(judge, null, 2)}\n`;
  write(path.join(seed.dir, 'judge.json'), judgeBytes);
  const man = JSON.parse(fs.readFileSync(path.join(seed.dir, 'run-manifest.json'), 'utf8'));
  man.judgeSha256 = sha256(judgeBytes);
  write(path.join(seed.dir, 'run-manifest.json'), `${JSON.stringify(man, null, 2)}\n`);
  const res = publish(['--run', seed.dir, '--results-dir', seed.resultsDir], seed);
  assert.notStrictEqual(res.status, 0, 'duplicate check ids must fail');
  assert.match(res.stderr, /duplicate check/i, 'names the dupe rule');
}

// CR-004: manifest sample diverging from committed sample file rejected
{
  const seed = seedRun();
  const man = JSON.parse(fs.readFileSync(path.join(seed.dir, 'run-manifest.json'), 'utf8'));
  for (const col of man.columns) {
    col.samples.forEach((sample, idx) => {
      write(path.join(seed.dir, 'samples', col.harness, `sample-${idx + 1}.json`), `${JSON.stringify(sample, null, 2)}\n`);
    });
  }
  const match = publish(['--run', seed.dir, '--results-dir', seed.resultsDir], seed);
  assert.strictEqual(match.status, 0, match.stderr);
  const drifted = JSON.parse(fs.readFileSync(path.join(seed.dir, 'samples', 'workflow-skills', 'sample-1.json'), 'utf8'));
  drifted.checks.C1 = 0;
  write(path.join(seed.dir, 'samples', 'workflow-skills', 'sample-1.json'), `${JSON.stringify(drifted, null, 2)}\n`);
  const res = publish(['--run', seed.dir, '--results-dir', seed.resultsDir], seed);
  assert.notStrictEqual(res.status, 0, 'diverged sample file must fail');
  assert.match(res.stderr, /diverges/i, 'names the divergence');
}

// CR-005: collector refuses non-run dirs without deleting anything
{
  const collector = path.join(repoRoot, 'benchmarks/comparisons/fixed-models-001/collect_sample.cjs');
  const plain = temp('cmp-plain-');
  const fakeReport = path.join(plain, 'report.json');
  write(fakeReport, '{"verdict":"PASS","index":{"value":1}}');
  const res = run(collector, ['--run-dir', plain, '--sample', '1', '--engine-report', fakeReport], { cwd: repoRoot });
  assert.notStrictEqual(res.status, 0, 'non-run dir must fail');
  assert.match(res.stderr, /not a comparison run dir/i, 'names the marker rule');
  assert.ok(!fs.existsSync(path.join(plain, 'samples')), 'no dirs created outside a run');
}

// CR-006: every evidenceRef in the published run manifest resolves on disk
{
  const runDir = path.join(repoRoot, 'benchmarks/comparisons/fixed-models-001');
  const man = JSON.parse(fs.readFileSync(path.join(runDir, 'run-manifest.json'), 'utf8'));
  for (const col of man.columns) {
    for (const sample of col.samples) {
      for (const ref of sample.evidenceRefs) {
        assert.ok(fs.existsSync(path.join(repoRoot, ref)), `evidence resolves: ${ref}`);
        assert.ok(!ref.startsWith('benchmarks/runs/'), `evidence is committed, not gitignored: ${ref}`);
      }
    }
  }
}

// CR-007: key order does not affect settings-vs-defaults equality
{
  const seed = seedRun();
  const man = JSON.parse(fs.readFileSync(path.join(seed.dir, 'run-manifest.json'), 'utf8'));
  man.columns[1].settings = { defaults: true, mode: 'static' };
  write(path.join(seed.dir, 'run-manifest.json'), `${JSON.stringify(man, null, 2)}\n`);
  const res = publish(['--run', seed.dir, '--results-dir', seed.resultsDir], seed);
  assert.strictEqual(res.status, 0, res.stderr);
}

// CR-008: evolution row lands inside the section when trailing content exists
{
  const seed = seedRun();
  write(path.join(seed.resultsDir, 'BENCHMARK_EVOLUTION.md'), '# Evo\n\n## Fixed-Model Comparison Runs\n\n- [old](./comparison-old.md)\n\n## Appendix\n\nnotes\n');
  const res = publish(['--run', seed.dir, '--results-dir', seed.resultsDir], seed);
  assert.strictEqual(res.status, 0, res.stderr);
  const evo = fs.readFileSync(path.join(seed.resultsDir, 'BENCHMARK_EVOLUTION.md'), 'utf8');
  const rowIdx = evo.indexOf('comparison-fixed-models-001.md');
  const appIdx = evo.indexOf('## Appendix');
  assert.ok(rowIdx !== -1 && appIdx !== -1 && rowIdx < appIdx, 'row inserted before trailing section');
}

console.log('test-benchmark-comparison-publish: PASS');
