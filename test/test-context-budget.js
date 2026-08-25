import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, run, write } = utils;
const indexScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/plan_index.cjs');
const contextScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/build_dispatch_context.cjs');
const measureScript = path.join(repoRoot, '.agents/skills/ws-check-harness/scripts/measure_harness.cjs');
const duplicateScript = path.join(repoRoot, '.agents/skills/ws-check-harness/scripts/check_duplicates.cjs');
const fixture = path.join(repoRoot, 'test', `.tmp-context-${process.pid}`);

try {
  write(path.join(fixture, 'spec.md'), '## Acceptance Criteria\n- AC1: Build context.\n');
  write(path.join(fixture, 'plan.md'), '## Build\n\nT00 implements AC1 in `test/context.test.js` with V1:context.\n');
  const relative = path.relative(repoRoot, fixture).replace(/\\/g, '/');
  assert.strictEqual(run(indexScript, ['build', '--plan', `${relative}/plan.md`, '--spec', `${relative}/spec.md`, '--output', `${relative}/plan.index.json`, '--repo-root', repoRoot]).status, 0);
  const index = JSON.parse(fs.readFileSync(path.join(fixture, 'plan.index.json'), 'utf8'));
  const result = run(contextScript, [
    '--skill', '.agents/skills/ws-implement-tasks/SKILL.md',
    '--plan-index', `${relative}/plan.index.json`,
    '--ac', index.acceptanceCriteria[0].id,
    '--path', 'src/feature.js',
    '--output', `${relative}/dispatch.md`,
    '--json', 'true',
    '--repo-root', repoRoot,
  ]);
  assert.strictEqual(result.status, 0, result.stderr);
  const metrics = JSON.parse(result.stdout);
  assert.ok(metrics.fixedPreambleBytes <= 18000);
  assert.ok(metrics.totalBytes <= 32000);
  assert.ok(metrics.memoryBytes <= 4000);

  const measured = run(measureScript, ['--scenario', 'standard', '--json', '--repo-root', repoRoot]);
  assert.strictEqual(measured.status, 0, measured.stderr);
  const report = JSON.parse(measured.stdout);
  assert.ok(report.harnessReductionPct >= 45 && report.artifactReductionPct >= 40);

  const utf8Size = (rel) => Buffer.byteLength(fs.readFileSync(path.join(repoRoot, rel), 'utf8').replace(/\r\n?/g, '\n'), 'utf8');
  // Root AGENTS.md is upstream dogfood only (installer never copies it to consumers).
  assert.ok(utf8Size('.agents/skills/ws-shared/AGENTS.md') <= 14000, 'shared AGENTS.md exceeds 14000 B');
  assert.ok(utf8Size('CATALOG.md') <= 24000, 'root CATALOG.md exceeds 24000 B');
  const protocols = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/PROTOCOLS.md'), 'utf8');
  const prefix = protocols.split('### Base Prompt Prefix')[1]?.split('### ')[0] || '';
  assert.doesNotMatch(prefix, /read full/i);
  assert.match(prefix, /injected MEMORY slice/);
  assert.doesNotMatch(prefix, /Grep `\{sharedDir\}\/MEMORY\.md`/);

  const repeated = [
    'Agents must preserve the assigned scope.',
    'They must use configured checks.',
    'They must retain hard stops.',
    'They must report exact evidence.',
    'They must avoid external mutation.',
    'They must return a structured result.',
  ].join('\n');
  write(path.join(fixture, 'one.md'), repeated);
  write(path.join(fixture, 'two.md'), repeated);
  assert.notStrictEqual(run(duplicateScript, ['--path', `${relative}/one.md`, '--path', `${relative}/two.md`, '--repo-root', repoRoot]).status, 0);
  const phases = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-check-harness/PHASES.md'), 'utf8');
  const skill = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-check-harness/SKILL.md'), 'utf8');
  assert.match(phases, /check_duplicates\.cjs/);
  assert.match(phases, /measure_harness\.cjs/);
  assert.match(skill, /check_duplicates\.cjs/);
  assert.match(skill, /measure_harness\.cjs/);
  console.log('test-context-budget: ok');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
