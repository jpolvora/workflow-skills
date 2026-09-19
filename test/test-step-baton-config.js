/**
 * Step baton run-config schema + fail-fast validation (AC1-AC4, NS4).
 * Run: node test/test-step-baton-config.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const baton = require('../.agents/skills/ws-shared/runtime/scripts/step_baton.cjs');

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function expectCode(fn, code, label) {
  let error = null;
  try {
    fn();
  } catch (caught) {
    error = caught;
  }
  if (!error) throw new Error(`${label}: expected throw with code ${code}, got success`);
  if (error.code !== code) throw new Error(`${label}: expected code ${code}, got ${error.code} (${error.message})`);
}

// AC1: full run config accepted.
const fixtureConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, 'test/fixtures/step-baton/config.baton.json'), 'utf8'));
const normalized = baton.validateRunConfig(fixtureConfig, 'lite');
if (normalized.stepRunners['3'] !== 'runner-a' || normalized.pollIntervalSeconds !== 30 || normalized.maxAttempts !== 2) {
  throw new Error('validateRunConfig did not normalize the fixture run config');
}

// AC1: shipped example config validates.
const exampleConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/templates/config.json.example'), 'utf8'));
baton.validateRunConfig(exampleConfig, 'standard');

// AC1: template substitution across all four tokens, incl spaces/quotes in paths.
const sub = baton.substituteRunnerTemplate('node worker.cjs --prompt "{prompt}" --cwd {cwd} --slug {slug} --step {step}', {
  prompt: '/tmp/my dir/step-4-dispatch-prompt.md',
  cwd: '/repo/with space',
  slug: 'demo-slug',
  step: 4,
});
if (sub.cmd !== 'node') throw new Error(`substitution cmd mismatch: ${sub.cmd}`);
const joined = sub.args.join('|');
for (const needle of ['/tmp/my dir/step-4-dispatch-prompt.md', '/repo/with space', 'demo-slug', '|4']) {
  if (!joined.includes(needle)) throw new Error(`substitution lost token value: ${needle} in ${joined}`);
}
// Quoted segments stay single argv elements; {step} is the vocabulary addition over Tier 2.
const quoted = baton.splitCommand('run --prompt "{prompt}" --step {step}');
if (quoted.length !== 5 || quoted[1] !== '--prompt' || quoted[2] !== '{prompt}' || quoted[3] !== '--step' || quoted[4] !== '{step}') {
  throw new Error(`quote-aware split mismatch: ${JSON.stringify(quoted)}`);
}
const single = baton.substituteRunnerTemplate('worker --label "step {step} for {slug}"', { slug: 's', step: 2 });
if (!single.args.includes('step 2 for s')) throw new Error('embedded-token argv element split incorrectly');
expectCode(() => baton.splitCommand('run "unterminated'), 'RUNNER_EMPTY_COMMAND', 'unterminated quote');
expectCode(() => baton.substituteRunnerTemplate('   ', {}), 'RUNNER_EMPTY_COMMAND', 'blank template');

// AC2 + NS4: unknown step key, unknown runner id, empty command fail fast with named errors.
expectCode(
  () => baton.validateRunConfig({ defaults: { stepRunners: { nope: 'runner-a' }, runners: { 'runner-a': { command: 'x', timeoutSeconds: 1 } } } }, 'standard'),
  'RUNNER_STEP_OUT_OF_RANGE',
  'unknown step key',
);
expectCode(
  () => baton.validateRunConfig({ defaults: { stepRunners: { 4: 'ghost' }, runners: { 'runner-a': { command: 'x', timeoutSeconds: 1 } } } }, 'standard'),
  'RUNNER_UNKNOWN_ID',
  'NS4 unknown runner id',
);
expectCode(
  () => baton.validateRunConfig({ defaults: { stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': { command: '  ', timeoutSeconds: 1 } } } }, 'standard'),
  'RUNNER_EMPTY_COMMAND',
  'empty command',
);
expectCode(
  () => baton.validateRunConfig({ defaults: { stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': { command: 'x', timeoutSeconds: 0 } } } }, 'standard'),
  'RUNNER_INVALID_TIMEOUT',
  'non-positive timeout',
);
// NS4: refusal happens before any dispatch side effect (pure validation; tmp dir stays empty).
const ns4Root = fs.mkdtempSync(path.join(os.tmpdir(), 'ns4-'));
try {
  expectCode(
    () => baton.validateRunConfig({ defaults: { stepRunners: { 4: 'ghost' }, runners: {} } }, 'standard'),
    'RUNNER_UNKNOWN_ID',
    'NS4 pure refusal',
  );
  if (fs.readdirSync(ns4Root).length !== 0) throw new Error('NS4 validation wrote side effects');
} finally {
  fs.rmSync(ns4Root, { recursive: true, force: true });
}

// AC3: any subset may map; unmapped steps resolve to single-host dispatch (null).
const subset = baton.validateRunConfig({ defaults: { stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': { command: 'x', timeoutSeconds: 1 } } } }, 'standard');
if (subset.stepRunners['4'] !== 'runner-a') throw new Error('single-step map lost its entry');
const subsetConfig = { defaults: { stepRunners: { 4: 'runner-a' } } };
if (baton.resolveMappedRunner(subsetConfig, 4) !== 'runner-a') throw new Error('mapped step did not resolve');
for (const step of [0, 1, 2, 3, 5, 9]) {
  if (baton.resolveMappedRunner(subsetConfig, step) !== null) throw new Error(`unmapped step ${step} should fall back to single-host dispatch`);
}
const empty = baton.validateRunConfig({ defaults: {} }, 'standard');
if (Object.keys(empty.stepRunners).length !== 0) throw new Error('empty map should validate as no baton runs');

// AC3: coordinator refuses an empty map with a named config error (nothing to drive).
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baton-empty-'));
  try {
    write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
      project: { name: 'empty-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { autoMode: true, stepRunners: {}, runners: {} },
    }));
    const usDir = path.join(root, '.agents/plans/empty-demo');
    const stateFile = path.join(usDir, 'wf-empty.state.json');
    write(stateFile, JSON.stringify({
      stateVersion: 3, revision: 1, workflowId: 'wf-empty', slug: 'empty-demo',
      workflowType: 'lite', status: 'active', currentStep: 3,
      completedSteps: [0, 1, 2], skippedSteps: [],
    }));
    const result = cp.spawnSync(process.execPath, [
      path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs'),
      '--state', stateFile, '--repo-root', root,
    ], { encoding: 'utf8' });
    if (result.status !== 3) throw new Error(`empty-map coordinator should exit 3, got ${result.status}: ${result.stderr || result.stdout}`);
    if (!/STEPBATON_EMPTY_MAP/.test(result.stderr || '')) throw new Error('empty-map refusal lacks the named error');
    if (fs.existsSync(path.join(usDir, 'telemetry.jsonl'))) throw new Error('empty-map refusal must not start a partial run');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// AC4: map keys validated against the owning workflowType step set.
baton.validateRunConfig({ defaults: { stepRunners: { 0: 'r', 9: 'r' }, runners: { r: { command: 'x', timeoutSeconds: 1 } } } }, 'standard');
expectCode(
  () => baton.validateRunConfig({ defaults: { stepRunners: { 10: 'r' }, runners: { r: { command: 'x', timeoutSeconds: 1 } } } }, 'standard'),
  'RUNNER_STEP_OUT_OF_RANGE',
  'standard rejects 10',
);
baton.validateRunConfig({ defaults: { stepRunners: { 0: 'r', 5: 'r' }, runners: { r: { command: 'x', timeoutSeconds: 1 } } } }, 'lite');
expectCode(
  () => baton.validateRunConfig({ defaults: { stepRunners: { 6: 'r' }, runners: { r: { command: 'x', timeoutSeconds: 1 } } } }, 'lite'),
  'RUNNER_STEP_OUT_OF_RANGE',
  'lite rejects 6',
);

// Poll interval + max attempts defaults and ranges.
const pollDefaults = baton.validateRunConfig({ defaults: {} }, 'standard');
if (pollDefaults.pollIntervalSeconds !== 30 || pollDefaults.maxAttempts !== 2) throw new Error('stepBaton defaults must be 30s / 2 attempts');
baton.validateRunConfig({ defaults: { stepBaton: { pollIntervalSeconds: 5 } } }, 'standard');
baton.validateRunConfig({ defaults: { stepBaton: { pollIntervalSeconds: 300 } } }, 'standard');
expectCode(() => baton.validateRunConfig({ defaults: { stepBaton: { pollIntervalSeconds: 4 } } }, 'standard'), 'STEPBATON_POLL_OUT_OF_RANGE', 'poll rejects 4');
expectCode(() => baton.validateRunConfig({ defaults: { stepBaton: { pollIntervalSeconds: 301 } } }, 'standard'), 'STEPBATON_POLL_OUT_OF_RANGE', 'poll rejects 301');
expectCode(() => baton.validateRunConfig({ defaults: { stepBaton: { maxAttempts: 0 } } }, 'standard'), 'STEPBATON_MAX_ATTEMPTS_INVALID', 'maxAttempts rejects 0');

// Envelope + lease helpers.
const envelope = baton.buildBatonEnvelope({ step: 4, holder: 'runner-a', leaseUntil: new Date(Date.now() + 1000).toISOString(), attempt: 1 });
if (envelope.step !== 4 || envelope.holder !== 'runner-a' || envelope.attempt !== 1) throw new Error('baton envelope mismatch');
const lease = baton.computeLeaseUntil(Date.parse('2026-01-01T00:00:00.000Z'), 60);
if (lease !== '2026-01-01T00:03:00.000Z') throw new Error(`lease must be 3x timeout, got ${lease}`);

// Harness neutrality: no host product name as contract term in new scripts.
for (const file of ['step_baton.cjs', 'step_coordinator.cjs']) {
  const body = fs.readFileSync(path.join(
    repoRoot,
    file === 'step_baton.cjs' ? '.agents/skills/ws-shared/runtime/scripts' : '.agents/skills/ws-spec-to-pr/scripts',
    file,
  ), 'utf8').toLowerCase();
  for (const term of ['cursor', 'claude', 'opencode', 'gemini', 'copilot', 'antigravity']) {
    if (body.includes(term)) throw new Error(`harness-neutrality violation: ${file} mentions ${term}`);
  }
}

// Docs mirror: tier ladder + lite carve-outs intact, coordinator pointers added, handoffs pointer kept.
const hostDispatch = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/host-dispatch.md'), 'utf8');
for (const needle of ['Tier 1', 'Tier 2', 'Tier 3', 'Inline Isolated Execution', '## 7. Step-level baton runs', '{step}', 'state.handoffs']) {
  if (!hostDispatch.includes(needle)) throw new Error(`host-dispatch.md lost required prose: ${needle}`);
}
if (!hostDispatch.includes('{us-dir}/.runtime/step-{N}-dispatch-prompt.md')) throw new Error('host-dispatch.md lacks the {prompt}-as-path effective resolution');
const gates = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/gates.md'), 'utf8');
if (!gates.includes('Coordinator gate surfacing')) throw new Error('gates.md lacks the coordinator surfacing note');
const orchSkill = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/SKILL.md'), 'utf8');
if (!orchSkill.includes('Step-level baton runs (multi-CLI)') || !orchSkill.includes('step_coordinator.cjs')) {
  throw new Error('ws-spec-to-pr SKILL.md lacks the baton-runs pointer');
}

console.log('PASS: test-step-baton-config (AC1-AC4, NS4)');
