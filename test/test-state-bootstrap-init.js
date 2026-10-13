import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, path, repoRoot, temp, run, write } = utils;
const { sha256 } = require(path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs'));
const update = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const updateLite = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs');
const validate = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/validate_state.cjs');
const runtime = path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs');

const BASELINE = 'abc1234def567890abc1234def567890abc12345';

// us-510: the sanctioned single-agent state bootstrap contract.
// AC1-AC7 (creation, pair, index, result) are shared with test-state-bootstrap.js;
// this module pins the required-flag contract, the idempotent replay window, every
// refusal rule, the canonical help text, and the Node-only / repo-relative invariants.
function makeRoot(prefix) {
  const root = temp(prefix);
  fs.mkdirSync(path.join(root, '.agents/skills/ws-shared/runtime'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
    path.join(root, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
  );
  write(path.join(root, '.ws/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans', specsDir: '.agents/specs' },
    verification: {},
    defaults: { dryRun: false },
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  return root;
}

function writeSpec(root, slug) {
  write(path.join(root, `.agents/plans/${slug}/step-00-${slug}.spec.md`), `---
id: null
slug: ${slug}
title: ${slug}
source: local
specDate: 2026-10-12
---
## Description
${slug}.
`);
}

function bootstrapArgs({ slug, workflowId, branch = 'develop', baseline = BASELINE, extra = [] }) {
  return ['--slug', slug, '--workflow-id', workflowId, '--branch', branch, '--baseline', baseline, ...extra];
}

function okInit(root, slug, workflowId) {
  writeSpec(root, slug);
  const stateRel = `.agents/plans/${slug}/${workflowId}.state.md`;
  const result = run(update, ['init', stateRel, ...bootstrapArgs({ slug, workflowId }), '--repo-root', root]);
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return { stateRel, jsonPath: path.join(root, `.agents/plans/${slug}/${workflowId}.state.json`), mdPath: path.join(root, stateRel), result };
}

// AC1/AC2/AC5/AC6/AC7: one documented entrypoint, explicit identity inputs, a
// validator-clean pair, and an index row created from an absent index.
{
  const root = makeRoot('ws-init-contract-');
  const slug = 'demo';
  const workflowId = 'demo-20260101T000000Z';
  assert.ok(!fs.existsSync(path.join(root, '.agents/plans/index.json')), 'precondition: no index yet');
  const { jsonPath, mdPath, stateRel, result } = okInit(root, slug, workflowId);

  const payload = JSON.parse(result.stdout);
  assert.strictEqual(payload.operation, 'init', 'AC1 result names the operation');
  assert.strictEqual(payload.workflowId, workflowId, 'AC7 result names the workflow id');
  assert.strictEqual(payload.state, stateRel.replace(/\\/g, '/'), 'AC7 result names .state.md');
  assert.ok(payload.runPath.endsWith('.state.json'), 'AC7 result names .state.json');
  assert.strictEqual(payload.index, '.agents/plans/index.json', 'AC7 result names the plans index');
  assert.ok(Number.isInteger(payload.revision) && payload.revision === 0, 'AC4 revision 0');
  assert.match(result.stdout, /"stateSha256":\s*"[0-9a-f]+"/, 'AC7 result carries the pair hash');

  const state = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(state.branch, 'develop', 'AC4 branch recorded');
  assert.strictEqual(state.baselineCommit, BASELINE, 'AC4 baseline recorded');

  // AC3: JSON is the SoT and the Markdown is its render, both under {us-dir}.
  assert.ok(fs.existsSync(jsonPath) && fs.existsSync(mdPath), 'AC3 both pair members written');
  const md = fs.readFileSync(mdPath, 'utf8');
  assert.match(md, new RegExp(`^workflowId: ${workflowId}$`, 'm'), 'AC3 md render carries workflowId');
  assert.match(md, /^branch: develop$/m, 'AC3 md render carries branch');

  // AC6: the absent index was created with a matching row.
  const index = JSON.parse(fs.readFileSync(path.join(root, '.agents/plans/index.json'), 'utf8'));
  const row = index.workflows.find((item) => item.workflowId === workflowId);
  assert.ok(row, 'AC6 index row created from an absent index');
  assert.strictEqual(row.stateSha256, sha256(fs.readFileSync(jsonPath, 'utf8')), 'AC6 row hash matches the written pair');

  // AC5: the validator accepts the pair with no follow-up write.
  assert.strictEqual(run(validate, [workflowId, '--repo-root', root]).status, 0, 'AC5 validateSnapshot accepts the pair');

  // AC21: no absolute machine path in the record or the result.
  assert.ok(!/^[A-Za-z]:/.test(state.statePath) && !state.statePath.includes('\\'), 'AC21 statePath is repo-relative');
  assert.ok(!/[A-Za-z]:[\\/]/.test(result.stdout), 'AC21 result emits no drive-letter path');
}

// AC2/AC13: missing or invalid identity flags are usage errors, nothing written.
{
  const root = makeRoot('ws-init-usage-');
  const slug = 'demo';
  writeSpec(root, slug);
  const stateRel = `.agents/plans/${slug}/demo-20260101T000000Z.state.md`;
  const jsonPath = path.join(root, `.agents/plans/${slug}/demo-20260101T000000Z.state.json`);
  const cases = [
    ['missing --branch', ['--slug', slug, '--workflow-id', 'demo-20260101T000000Z', '--baseline', BASELINE]],
    ['missing --baseline', ['--slug', slug, '--workflow-id', 'demo-20260101T000000Z', '--branch', 'develop']],
    ['empty --slug', ['--slug', '  ', '--workflow-id', 'demo-20260101T000000Z', '--branch', 'develop', '--baseline', BASELINE]],
    ['empty --workflow-id', ['--slug', slug, '--workflow-id', '', '--branch', 'develop', '--baseline', BASELINE]],
    ['non-hex baseline', ['--slug', slug, '--workflow-id', 'demo-20260101T000000Z', '--branch', 'develop', '--baseline', 'not-a-sha']],
    ['HEAD branch', ['--slug', slug, '--workflow-id', 'demo-20260101T000000Z', '--branch', 'HEAD', '--baseline', BASELINE]],
  ];
  for (const [label, args] of cases) {
    const result = run(update, ['init', stateRel, ...args, '--repo-root', root]);
    assert.notStrictEqual(result.status, 0, `AC2/AC13 ${label} rejected`);
    assert.match(result.stderr, /^ERROR: init /, `AC2/AC13 ${label} is a usage error`);
  }
  assert.ok(!fs.existsSync(jsonPath), 'AC13 no state written on a usage error');
  assert.ok(!fs.existsSync(path.join(root, stateRel)), 'AC13 no markdown written on a usage error');
  assert.ok(!fs.existsSync(path.join(root, '.agents/plans/index.json')), 'AC13 no index row written on a usage error');
}

// AC14/AC15: slug/directory mismatch and an out-of-shape workflow id are refused.
{
  const root = makeRoot('ws-init-identity-');
  const slug = 'demo';
  writeSpec(root, slug);
  const mismatch = run(update, ['init', '.agents/plans/other/demo-20260101T000000Z.state.md', ...bootstrapArgs({ slug, workflowId: 'demo-20260101T000000Z' }), '--repo-root', root]);
  assert.notStrictEqual(mismatch.status, 0, 'AC14 slug/directory mismatch refused');
  assert.match(mismatch.stderr, /slug\/directory mismatch/, 'AC14 names the mismatch');
  assert.match(mismatch.stderr, /other/, 'AC14 names the directory');

  const badShape = run(update, ['init', `.agents/plans/${slug}/uswf-demo-20260101T000000Z.state.md`, ...bootstrapArgs({ slug, workflowId: 'uswf-demo-20260101T000000Z' }), '--repo-root', root]);
  assert.notStrictEqual(badShape.status, 0, 'AC15 out-of-shape workflow id refused');
  assert.match(badShape.stderr, /\{slug\}-\{ISO8601\}/, 'AC15 quotes the expected shape');
  assert.ok(!fs.existsSync(path.join(root, `.agents/plans/${slug}/demo-20260101T000000Z.state.json`)), 'AC14/AC15 nothing written');
}

// AC8: an untouched revision-0 pair replays as a true no-op; the window closes
// as soon as the run progresses (AC9/AC10/AC11 refusals).
{
  const root = makeRoot('ws-init-replay-');
  const slug = 'demo';
  const workflowId = 'demo-20260101T000000Z';
  const { stateRel, jsonPath, mdPath } = okInit(root, slug, workflowId);
  const beforeJson = fs.readFileSync(jsonPath, 'utf8');
  const beforeMd = fs.readFileSync(mdPath, 'utf8');
  const replay = run(update, ['init', stateRel, ...bootstrapArgs({ slug, workflowId }), '--repo-root', root]);
  assert.strictEqual(replay.status, 0, replay.stderr || replay.stdout);
  assert.strictEqual(JSON.parse(replay.stdout).idempotentReplay, true, 'AC8 replay reported idempotent');
  assert.strictEqual(fs.readFileSync(jsonPath, 'utf8'), beforeJson, 'AC8 pair byte-identical (json)');
  assert.strictEqual(fs.readFileSync(mdPath, 'utf8'), beforeMd, 'AC8 pair byte-identical (md)');

  // AC9: revision > 0 refuses, leaving the files untouched.
  const bump = (mutate) => {
    const state = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    mutate(state);
    fs.writeFileSync(jsonPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    const text = fs.readFileSync(jsonPath, 'utf8');
    const result = run(update, ['init', stateRel, ...bootstrapArgs({ slug, workflowId }), '--repo-root', root]);
    assert.notStrictEqual(result.status, 0, 'progressed run refused');
    assert.match(result.stderr, /refuses to re-bootstrap a progressed run/, 'refusal is named');
    assert.strictEqual(fs.readFileSync(jsonPath, 'utf8'), text, 'refusal leaves .state.json byte-identical');
  };
  bump((state) => { state.revision = 3; });
  bump((state) => { state.revision = 0; state.completedSteps = [0]; });
  bump((state) => { state.revision = 0; state.completedSteps = []; state.status = 'completed'; });
}

// AC12: a lone pair member fails closed and names the missing one.
{
  const root = makeRoot('ws-init-partial-');
  const slug = 'demo';
  const workflowId = 'demo-20260101T000000Z';
  writeSpec(root, slug);
  const stateRel = `.agents/plans/${slug}/${workflowId}.state.md`;
  write(path.join(root, stateRel), `---\nstateVersion: 3\nworkflowId: ${workflowId}\n---\n`);
  const result = run(update, ['init', stateRel, ...bootstrapArgs({ slug, workflowId }), '--repo-root', root]);
  assert.notStrictEqual(result.status, 0, 'AC12 lone markdown refused');
  assert.match(result.stderr, /partial state pair/, 'AC12 names the partial pair');
  assert.match(result.stderr, /\.state\.json/, 'AC12 names the missing JSON member');
  assert.ok(!fs.existsSync(path.join(root, `.agents/plans/${slug}/${workflowId}.state.json`)), 'AC12 missing member not created');
}

// AC16: a failed write leaves no partial pair, no index row, and no temp residue.
{
  const root = makeRoot('ws-init-rollback-');
  const slug = 'demo';
  const workflowId = 'demo-20260101T000000Z';
  writeSpec(root, slug);
  const usDir = path.join(root, `.agents/plans/${slug}`);
  const foreign = path.join(usDir, 'foreign.state.md');
  write(foreign, '---\nstateVersion: 3\n---\n');
  const foreignBefore = fs.readFileSync(foreign, 'utf8');
  // Make the plans index unwritable by occupying the path with a directory, so
  // the pair is written first and the index refresh fails after it.
  fs.mkdirSync(path.join(root, '.agents/plans/index.json'), { recursive: true });
  const stateRel = `.agents/plans/${slug}/${workflowId}.state.md`;
  const result = run(update, ['init', stateRel, ...bootstrapArgs({ slug, workflowId }), '--repo-root', root]);
  assert.notStrictEqual(result.status, 0, 'AC16 failed index write surfaces non-zero');
  assert.ok(!fs.existsSync(path.join(usDir, `${workflowId}.state.json`)), 'AC16 no partial pair member (json)');
  assert.ok(!fs.existsSync(path.join(usDir, `${workflowId}.state.md`)), 'AC16 no partial pair member (md)');
  assert.ok(fs.statSync(path.join(root, '.agents/plans/index.json')).isDirectory(), 'AC16 index untouched');
  assert.strictEqual(fs.readFileSync(foreign, 'utf8'), foreignBefore, 'AC16 pre-existing state byte-identical');
  const residue = fs.readdirSync(usDir).filter((name) => name.includes('.tmp-'));
  assert.deepStrictEqual(residue, [], 'AC16 no temp residue left behind');
}

// AC17: the runtime help advertises the bootstrap usage line and a sample invocation.
{
  const help = run(update, ['init', '--help']);
  assert.strictEqual(help.status, 0, help.stderr || help.stdout);
  assert.match(help.stdout, /Usage: update_state\.cjs init <state> --slug <slug> --workflow-id <id> --branch <branch> --baseline <sha>/, 'AC17 init usage line');
  assert.match(help.stdout, /Example: node update_state\.cjs init .* --workflow-id .* --branch .* --baseline /, 'AC17 sample invocation');
  assert.match(help.stdout, /idempotent no-op/, 'AC17 replay rule stated');
  assert.match(help.stdout, /refuses/, 'AC17 refusal rules stated');
  const bare = run(update, ['--help']);
  assert.match(bare.stdout, /init <state> --slug <slug> --workflow-id <id> --branch <branch> --baseline <sha>/, 'AC17 generic usage lists the bootstrap');
  const lite = run(updateLite, ['init', '--help']);
  assert.match(lite.stdout, /--branch <branch> --baseline <sha>/, 'AC17 lite wrapper shares the bootstrap help');
}

// AC19: the bootstrap is Node 22 CommonJS and adds no Python dependency.
{
  assert.ok(runtime.endsWith('.cjs'), 'AC19 bootstrap runtime is a .cjs module');
  const scan = (dir) => {
    const out = [];
    const walk = (current) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(py|pyc|pyo)$/.test(entry.name)) out.push(full);
      }
    };
    walk(dir);
    return out;
  };
  assert.deepStrictEqual(scan(path.join(repoRoot, '.agents/skills')), [], 'AC19 no Python under .agents/skills');
  assert.deepStrictEqual(scan(path.join(repoRoot, 'bin')), [], 'AC19 no Python under bin');
}

// AC13: the lite wrapper shares the contract with workflowType lite.
{
  const root = makeRoot('ws-init-lite-');
  const slug = 'demo-lite';
  const workflowId = 'demo-lite-20260101T000000Z';
  writeSpec(root, slug);
  const stateRel = `.agents/plans/${slug}/${workflowId}.state.md`;
  const result = run(updateLite, ['init', stateRel, ...bootstrapArgs({ slug, workflowId }), '--repo-root', root]);
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  const state = JSON.parse(fs.readFileSync(path.join(root, `.agents/plans/${slug}/${workflowId}.state.json`), 'utf8'));
  assert.strictEqual(state.workflowType, 'lite', 'lite wrapper resolves workflowType lite');
  assert.strictEqual(state.branch, 'develop', 'lite wrapper records the branch');
}

console.log('test-state-bootstrap-init: ok');
