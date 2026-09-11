import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, path, repoRoot, temp, run, write } = utils;
const runtimeScripts = path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts');
const { resolveStepStampStatus } = require(path.join(runtimeScripts, 'workflow_state.cjs'));
const update = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const register = path.join(repoRoot, '.agents/skills/ws-spec-provider-local/scripts/register_local_spec.cjs');
const reviewRound = path.join(repoRoot, '.agents/skills/ws-code-review/scripts/write_review_round.cjs');

function seedFixture(prefix) {
  const root = temp(prefix);
  write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans', specsDir: '.agents/specs' },
    verification: {},
    defaults: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  return root;
}

function seedState(root, slug, workflowId) {
  const stateRel = `.agents/plans/${slug}/${workflowId}.state.md`;
  write(path.join(root, stateRel), `---
stateVersion: 3
revision: 0
workflowId: ${workflowId}
slug: ${slug}
workflowType: standard
status: active
currentStep: 0
completedSteps: []
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 0
---
# State
`);
  return stateRel;
}

function frontmatterStatus(root, rel) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  const match = text.match(/^status:\s*(.+)$/m);
  assert.ok(match, `artifact carries a status field: ${rel}`);
  return match[1].trim();
}

// T1/NS1 (AC1): intermediate completed finish under active workflow stamps completed.
{
  const root = seedFixture('ws-stamp-completed-');
  const stateRel = seedState(root, 'stamp', 'wf-stamp');
  const artifactRel = '.agents/plans/stamp/step-01-stamp.plan.md';
  write(path.join(root, artifactRel), '# Plan\n');
  const common = ['--repo-root', root, '--jsonl-out', '.agents/plans/stamp/telemetry.jsonl'];
  assert.strictEqual(run(update, ['dispatch', stateRel, '--step', '1', ...common]).status, 0);
  assert.strictEqual(run(update, ['finish', stateRel, '--step', '1', ...common]).status, 0);
  assert.strictEqual(frontmatterStatus(root, artifactRel), 'completed', 'T1: completed finish stamps completed');
  const state = JSON.parse(fs.readFileSync(path.join(root, '.agents/plans/stamp/wf-stamp.state.json'), 'utf8'));
  assert.strictEqual(state.status, 'active', 'T1: workflow status stays active');
  assert.strictEqual(state.stepStatus['1'], 'completed', 'T1: per-step outcome recorded');
}

// T2/NS2 (AC2): intermediate failed finish under active workflow stamps failed.
{
  const root = seedFixture('ws-stamp-failed-');
  const stateRel = seedState(root, 'stamp', 'wf-stamp');
  const artifactRel = '.agents/plans/stamp/step-01-stamp.plan.md';
  write(path.join(root, artifactRel), '# Plan\n');
  const common = ['--repo-root', root, '--jsonl-out', '.agents/plans/stamp/telemetry.jsonl'];
  assert.strictEqual(run(update, ['dispatch', stateRel, '--step', '1', ...common]).status, 0);
  assert.strictEqual(run(update, ['finish', stateRel, '--step', '1', '--status', 'failed', ...common]).status, 0);
  assert.strictEqual(frontmatterStatus(root, artifactRel), 'failed', 'T2: failed finish stamps failed');
  const state = JSON.parse(fs.readFileSync(path.join(root, '.agents/plans/stamp/wf-stamp.state.json'), 'utf8'));
  assert.strictEqual(state.status, 'active', 'T2: workflow status stays active');
}

// T3/NS3 (AC3): intermediate skipped finish under active workflow stamps skipped.
{
  const root = seedFixture('ws-stamp-skipped-');
  const stateRel = seedState(root, 'stamp', 'wf-stamp');
  const artifactRel = '.agents/plans/stamp/step-01-stamp.plan.md';
  write(path.join(root, artifactRel), '# Plan\n');
  const common = ['--repo-root', root, '--jsonl-out', '.agents/plans/stamp/telemetry.jsonl'];
  assert.strictEqual(run(update, ['dispatch', stateRel, '--step', '1', ...common]).status, 0);
  assert.strictEqual(
    run(update, ['finish', stateRel, '--step', '1', '--status', 'skipped', '--reason', 'dag-disabled', ...common]).status,
    0,
  );
  assert.strictEqual(frontmatterStatus(root, artifactRel), 'skipped', 'T3: skipped finish stamps skipped');
}

// T4/NS5 (AC4): close-step finish keeps applyCloseAndShipStatus behavior; artifact carries step result.
{
  const root = seedFixture('ws-stamp-close-');
  const stateRel = seedState(root, 'stamp', 'wf-stamp');
  const artifactRel = '.agents/plans/stamp/step-08-stamp.result.md';
  write(path.join(root, artifactRel), '# Result\n');
  const common = ['--repo-root', root, '--jsonl-out', '.agents/plans/stamp/telemetry.jsonl'];
  assert.strictEqual(run(update, ['dispatch', stateRel, '--step', '8', ...common]).status, 0);
  assert.strictEqual(run(update, ['finish', stateRel, '--step', '8', ...common]).status, 0);
  assert.strictEqual(frontmatterStatus(root, artifactRel), 'completed', 'T4: close artifact carries step result');
  const state = JSON.parse(fs.readFileSync(path.join(root, '.agents/plans/stamp/wf-stamp.state.json'), 'utf8'));
  assert.strictEqual(state.status, 'completed', 'T4: close transitions workflow status');
  assert.strictEqual(state.shipStatus, 'pending', 'T4: close sets shipStatus pending');
  assert.ok(state.endedAt, 'T4: close sets endedAt');
}

// T5/NS4 (AC6): unknown/missing step result fails closed, never stamped verbatim.
{
  assert.strictEqual(resolveStepStampStatus('completed'), 'completed');
  assert.strictEqual(resolveStepStampStatus('failed'), 'failed');
  assert.strictEqual(resolveStepStampStatus('skipped'), 'skipped');
  for (const bad of ['bogus', 'active', '', undefined, null]) {
    assert.throws(
      () => resolveStepStampStatus(bad),
      /step finish status must be one of: completed, failed, skipped/,
      `T5: rejects ${String(bad)}`,
    );
  }
  const root = seedFixture('ws-stamp-unknown-');
  const stateRel = seedState(root, 'stamp', 'wf-stamp');
  const artifactRel = '.agents/plans/stamp/step-01-stamp.plan.md';
  write(path.join(root, artifactRel), '# Plan\n');
  const common = ['--repo-root', root, '--jsonl-out', '.agents/plans/stamp/telemetry.jsonl'];
  assert.strictEqual(run(update, ['dispatch', stateRel, '--step', '1', ...common]).status, 0);
  const rejected = run(update, ['finish', stateRel, '--step', '1', '--status', 'bogus', ...common]);
  assert.notStrictEqual(rejected.status, 0, 'T5: CLI rejects unknown finish status');
  assert.doesNotMatch(
    fs.readFileSync(path.join(root, artifactRel), 'utf8'),
    /bogus/,
    'T5: unknown value never stamped verbatim',
  );
}

// T6 (AC5): single derivation path — one stamp call site, no state.status in the helper.
{
  const source = fs.readFileSync(path.join(runtimeScripts, 'workflow_state.cjs'), 'utf8');
  const helper = source.match(/function artifactStampFields[\s\S]*?\r?\n\}\r?\n/);
  assert.ok(helper, 'T6: artifactStampFields helper exists');
  assert.doesNotMatch(helper[0], /state\.status/, 'T6: helper never mirrors workflow status');
  const callSites = source.match(/stampStepArtifact\(path\.join\(paths\.usDir, artifact\), state, step, [A-Za-z0-9_]+\)/g) || [];
  assert.strictEqual(callSites.length, 1, 'T6: exactly one finish-flow stamp call site passes the step result');
}

// T7: register first-stamp provisional default + re-register preservation.
{
  const root = seedFixture('ws-stamp-register-');
  write(path.join(root, 'input.spec.md'), `---
id: null
slug: reg-demo
title: Register demo
source: local
specDate: 2026-09-10
---
## Description
Register stamp check.
`);
  const first = run(register, ['--input', 'input.spec.md', '--json', '--repo-root', root]);
  assert.strictEqual(first.status, 0, first.stderr);
  const workflowCopy = '.agents/plans/reg-demo/step-00-reg-demo.spec.md';
  assert.strictEqual(frontmatterStatus(root, workflowCopy), 'completed', 'T7: register first stamp uses defined default');
  write(path.join(root, 'input.spec.md'), `---
id: null
slug: reg-demo
title: Register demo
source: local
specDate: 2026-09-10
---
## Description
Register stamp check updated.
`);
  const stamped = fs.readFileSync(path.join(root, workflowCopy), 'utf8').replace(/^status: completed$/m, 'status: failed');
  write(path.join(root, workflowCopy), stamped);
  const again = run(register, ['--input', 'input.spec.md', '--force', '--json', '--repo-root', root]);
  assert.strictEqual(again.status, 0, again.stderr);
  const text = fs.readFileSync(path.join(root, workflowCopy), 'utf8');
  assert.match(text, /Register stamp check updated/, 'T7: re-register refreshes body');
  assert.strictEqual(frontmatterStatus(root, workflowCopy), 'failed', 'T7: re-register preserves finish-established result');
}

// T8: review-round stamps carry the completed round result, not workflow status.
{
  const root = seedFixture('ws-stamp-review-');
  const outDir = path.join(root, '.agents/plans/rev');
  const input = path.join(root, 'review.md');
  write(input, '## Review\n\nNo feedback.\n');
  const result = run(reviewRound, [
    '--round', '1', '--input', input, '--output-dir', outDir, '--slug', 'rev', '--repo-root', root,
  ]);
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.strictEqual(
    frontmatterStatus(root, '.agents/plans/rev/step-06-rev.review.r1.md'),
    'completed',
    'T8: review round stamps completed',
  );
}

console.log('test-artifact-stamp-status: T1-T8 passed');
