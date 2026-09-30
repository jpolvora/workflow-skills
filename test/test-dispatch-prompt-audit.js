/**
 * test-dispatch-prompt-audit.js — Dispatch prompt audit trail (AC1-AC10).
 *
 * Covers: writer byte-exactness + manifest schema (AC1-AC3), dispatch/finish
 * provenance (AC4), DAG per-node pairs (AC5), re-dispatch revision + prior sha
 * (AC6), registry/cleanup/G2-code treatment (AC7), lite inline + skip markers
 * (AC8), pre-advance fail-closed gate (AC9), no-secrets writer output (AC10).
 *
 * Run: node test/test-dispatch-prompt-audit.js
 */
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import crypto from 'crypto';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, fs, path, repoRoot, temp, run, write } = utils;

const WRITER = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/write_dispatch_prompt_audit.cjs');
const BUILDER = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/build_dispatch_context.cjs');
const UPDATE_STATE = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const LITE_UPDATE = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs');
const VALIDATE_STATE = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/validate_state.cjs');
const G2 = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/commit_g2_code.cjs');
const { loadJsonSchema, validateNode } = require(path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/validate_json_schema.cjs'));

const stateSchema = loadJsonSchema(path.join(repoRoot, '.agents/skills/ws-shared/runtime/workflow-state.schema.json'), 'workflow state schema');
const telemetrySchema = loadJsonSchema(path.join(repoRoot, '.agents/skills/ws-shared/runtime/telemetry.schema.json'), 'telemetry schema');

const tempRoot = temp('ws-prompt-audit-');
process.on('exit', () => { try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch { /* ignore */ } });

function builderManifest(overrides = {}) {
  return {
    schemaVersion: 1, budgetBytes: 32000, fixedPreambleBytes: 9000, mandatoryBytes: 12000,
    totalBytes: 14000, memoryBytes: 500, acRefs: ['AC1', 'AC2'], sourceSkill: 'ws-plan-write/SKILL.md',
    ...overrides,
  };
}

function sha256Bytes(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function makeRepo(name) {
  const root = path.join(tempRoot, name);
  write(path.join(root, '.ws/config.json'), JSON.stringify({ plans: { dir: '.agents/plans' }, defaults: {} }));
  return root;
}

function makeUsDir(root, slug) {
  const usDir = path.join(root, '.agents/plans', slug);
  fs.mkdirSync(usDir, { recursive: true });
  return usDir;
}

function makeState(usDir, slug, workflowId, extra = {}) {
  const stateFile = path.join(usDir, `${workflowId}.state.md`);
  const lines = ['---', `workflowId: ${workflowId}`, `slug: ${slug}`, 'status: active', 'currentStep: 1', 'revision: 0'];
  for (const [key, value] of Object.entries(extra)) lines.push(`${key}: ${value}`);
  write(stateFile, `${lines.join('\n')}\n---\n# state\n`);
  return stateFile;
}

function stateJsonFor(stateFile) {
  return JSON.parse(fs.readFileSync(stateFile.replace(/\.state\.md$/, '.state.json'), 'utf8'));
}

function telemetryFor(usDir) {
  const file = path.join(usDir, 'telemetry.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

const SECRET_SHAPES = [/ghp_[A-Za-z0-9]{8,}/, /github_pat_[A-Za-z0-9_]{8,}/, /xox[bap]-[A-Za-z0-9-]{8,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /Bearer [A-Za-z0-9\-._~+/]{8,}={0,2}/];

// --- AC1/AC2/AC3: sequential writer output, manifest fields, byte-exactness ---
const unitDir = path.join(tempRoot, 'unit');
fs.mkdirSync(unitDir, { recursive: true });
const promptBytes = Buffer.from('# Portable workflow dispatch\n\nFollow the target skill contract.\n\nUnicode: \u00e9\u4e2d\n', 'utf8');
write(path.join(unitDir, 'prompt.md'), promptBytes.toString('utf8'));
write(path.join(unitDir, 'builder.json'), JSON.stringify(builderManifest()));
const slug = 'audit-demo';
const wr = run(WRITER, ['--us-dir', unitDir, '--step', '1', '--slug', slug, '--prompt-file', path.join(unitDir, 'prompt.md'), '--manifest', path.join(unitDir, 'builder.json'), '--json']);
assert.strictEqual(wr.status, 0, wr.stderr);
const wrOut = JSON.parse(wr.stdout);
const mdFile = path.join(unitDir, `step-01-${slug}.prompt.md`);
const jsonFile = path.join(unitDir, `step-01-${slug}.prompt.json`);
assert.ok(fs.existsSync(mdFile), 'AC1: prompt markdown exists');
assert.ok(fs.readFileSync(mdFile).equals(promptBytes), 'AC3: prompt bytes equal the exact builder output');
const manifest = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
for (const field of ['step', 'slug', 'sourceSkill', 'acRefs', 'budgetBytes', 'fixedPreambleBytes', 'mandatoryBytes', 'totalBytes', 'memoryBytes', 'promptSha256', 'createdAt', 'dispatchMode', 'revision']) {
  assert.ok(manifest[field] !== undefined, `AC2: manifest carries ${field}`);
}
assert.strictEqual(manifest.step, 1);
assert.strictEqual(manifest.slug, slug);
assert.strictEqual(manifest.dispatchMode, 'standard');
assert.strictEqual(manifest.revision, 1);
assert.strictEqual(manifest.promptSha256, sha256Bytes(mdFile), 'AC3: manifest sha matches the file');
assert.ok(Number.isFinite(Date.parse(manifest.createdAt)), 'AC2: createdAt is ISO');
assert.ok(manifest.fixedPreambleBytes <= 18000 && manifest.totalBytes <= manifest.budgetBytes, 'AC3: budget caps respected');
assert.strictEqual(wrOut.promptSha256, manifest.promptSha256);
assert.strictEqual(wrOut.revision, 1);
assert.strictEqual(wrOut.priorPromptSha256, null);
// AC10: manifest carries no secret shapes; markdown is verbatim input.
for (const shape of SECRET_SHAPES) {
  assert.ok(!shape.test(JSON.stringify(manifest)), `AC10: manifest has no secret shape ${shape}`);
}
assert.ok(!String(fs.readFileSync(WRITER, 'utf8')).match(/process\.env\.(GH_TOKEN|GITHUB_TOKEN|PAT|SECRET)/), 'AC10: writer reads no token env');
// Writer refuses an over-budget manifest before writing anything.
write(path.join(unitDir, 'builder-over.json'), JSON.stringify(builderManifest({ totalBytes: 33000 })));
const over = run(WRITER, ['--us-dir', unitDir, '--step', '2', '--slug', slug, '--prompt-file', path.join(unitDir, 'prompt.md'), '--manifest', path.join(unitDir, 'builder-over.json')]);
assert.notStrictEqual(over.status, 0, 'AC3: over-budget manifest refused');
assert.ok(!fs.existsSync(path.join(unitDir, `step-02-${slug}.prompt.md`)), 'AC3: no markdown on refusal');
assert.ok(!fs.existsSync(path.join(unitDir, `step-02-${slug}.prompt.json`)), 'AC3: no manifest on refusal');
// Unknown flags fail loudly.
assert.notStrictEqual(run(WRITER, ['--bogus', 'x']).status, 0, 'unknown flags fail loudly');

// --- AC3 builder fail-closed: over-budget dispatch output throws before any write ---
const overDir = path.join(repoRoot, 'test', `.tmp-prompt-over-${process.pid}`);
try {
  const rel = path.relative(repoRoot, overDir).replace(/\\/g, '/');
  write(path.join(overDir, 'over.state.md'), `---\nworkflowId: over\n---\n\n## Step outputs (compact)\n\n${'y'.repeat(40000)}\n`);
  write(path.join(overDir, 'over.state.json'), JSON.stringify({ workflowId: 'over' }));
  const built = run(BUILDER, ['--skill', '.agents/skills/ws-implement-tasks/SKILL.md', '--state', `${rel}/over.state.md`, '--output', `${rel}/dispatch.md`, '--manifest', `${rel}/dispatch-manifest.json`, '--repo-root', repoRoot]);
  assert.notStrictEqual(built.status, 0, 'AC3: over-budget builder input fails');
  assert.match(built.stderr, /exceeds/, 'AC3: builder names the budget breach');
  assert.ok(!fs.existsSync(path.join(overDir, 'dispatch.md')), 'AC3: no prompt bytes on builder failure');
} finally {
  fs.rmSync(overDir, { recursive: true, force: true });
}

// --- AC4: dispatch records promptPath/promptSha256 on stepDispatches + telemetry ---
const repoB = makeRepo('flow');
const usB = makeUsDir(repoB, slug);
const wfB = `${slug}-20260930T000000Z`;
const stateB = makeState(usB, slug, wfB);
write(path.join(usB, 'ac-ledger.json'), JSON.stringify({ schemaVersion: 1, slug, acceptanceCriteria: [] }));
write(path.join(usB, 'prompt-src.md'), '# dispatch one\n');
write(path.join(usB, 'builder-src.json'), JSON.stringify(builderManifest()));
const wq = run(WRITER, ['--us-dir', path.relative(repoB, usB).replace(/\\/g, '/'), '--step', '1', '--slug', slug, '--prompt-file', path.relative(repoB, path.join(usB, 'prompt-src.md')).replace(/\\/g, '/'), '--manifest', path.relative(repoB, path.join(usB, 'builder-src.json')).replace(/\\/g, '/'), '--json'], { cwd: repoB });
assert.strictEqual(wq.status, 0, wq.stderr);
const wqOut = JSON.parse(wq.stdout);
assert.ok(!path.isAbsolute(wqOut.promptPath), 'AC4: promptPath is repo-relative');
const d1 = run(UPDATE_STATE, ['dispatch', stateB, '--step', '1', '--prompt-path', wqOut.promptPath, '--prompt-sha256', wqOut.promptSha256, '--jsonl-out', path.join(usB, 'telemetry.jsonl')], { cwd: repoB });
assert.strictEqual(d1.status, 0, d1.stderr);
const st1 = stateJsonFor(stateB);
assert.strictEqual(st1.stepDispatches.length, 1);
assert.strictEqual(st1.stepDispatches[0].promptPath, wqOut.promptPath, 'AC4: entry records promptPath');
assert.strictEqual(st1.stepDispatches[0].promptSha256, wqOut.promptSha256, 'AC4: entry records promptSha256');
assert.strictEqual(validateNode(st1, stateSchema, 'state.json').length, 0, 'AC4: state validates with new fields');
const events1 = telemetryFor(usB);
assert.strictEqual(events1.length, 1);
assert.strictEqual(events1[0].promptPath, wqOut.promptPath, 'AC4: dispatch event records promptPath');
assert.strictEqual(events1[0].promptSha256, wqOut.promptSha256, 'AC4: dispatch event records promptSha256');
assert.strictEqual(validateNode(events1[0], telemetrySchema, 'telemetry.jsonl[0]').length, 0, 'AC4: telemetry validates with new fields');
// Re-dispatch without prompt flags fails closed (audit chain cannot silently drop).
const d1bare = run(UPDATE_STATE, ['dispatch', path.relative(repoB, stateB).replace(/\\/g, '/'), '--step', '1'], { cwd: repoB });
assert.notStrictEqual(d1bare.status, 0, 're-dispatch without prompt flags fails closed');
// CR-001: internal retry substeps inherit the recorded prompt; dag nodes must audit.
const dSub = run(UPDATE_STATE, ['dispatch', path.relative(repoB, stateB).replace(/\\/g, '/'), '--step', '1', '--substep', 'fixPrPlan'], { cwd: repoB });
assert.strictEqual(dSub.status, 0, `CR-001: fixPrPlan substep inherits (${dSub.stderr})`);
const stSub = stateJsonFor(stateB);
assert.strictEqual(stSub.stepDispatches[0].promptSha256, wqOut.promptSha256, 'CR-001: inherited entry keeps the sha');
const evSub = telemetryFor(usB).at(-1);
assert.strictEqual(evSub.promptSha256, wqOut.promptSha256, 'CR-001: inherited event carries the sha');
assert.strictEqual(evSub.priorPromptSha256, undefined, 'CR-001: inherited dispatch sets no prior sha');
const dDag = run(UPDATE_STATE, ['dispatch', path.relative(repoB, stateB).replace(/\\/g, '/'), '--step', '1', '--substep', 'dag'], { cwd: repoB });
assert.notStrictEqual(dDag.status, 0, 'CR-001: dag node dispatch without flags fails closed');

// --- AC6: re-dispatch overwrites, bumps revision, preserves prior sha ---
write(path.join(usB, 'prompt-src.md'), '# dispatch one revised\n');
const wq2 = run(WRITER, ['--us-dir', path.relative(repoB, usB).replace(/\\/g, '/'), '--step', '1', '--slug', slug, '--prompt-file', path.relative(repoB, path.join(usB, 'prompt-src.md')).replace(/\\/g, '/'), '--manifest', path.relative(repoB, path.join(usB, 'builder-src.json')).replace(/\\/g, '/'), '--json'], { cwd: repoB });
assert.strictEqual(wq2.status, 0, wq2.stderr);
const wq2Out = JSON.parse(wq2.stdout);
assert.strictEqual(wq2Out.revision, 2, 'AC6: revision bumps on overwrite');
assert.strictEqual(wq2Out.priorPromptSha256, wqOut.promptSha256, 'AC6: writer reports the prior sha');
const man2 = JSON.parse(fs.readFileSync(path.join(usB, `step-01-${slug}.prompt.json`), 'utf8'));
assert.strictEqual(man2.priorPromptSha256, wqOut.promptSha256, 'AC6: manifest preserves the prior sha');
const d1b = run(UPDATE_STATE, ['dispatch', stateB, '--step', '1', '--prompt-path', wq2Out.promptPath, '--prompt-sha256', wq2Out.promptSha256, '--jsonl-out', path.join(usB, 'telemetry.jsonl')], { cwd: repoB });
assert.strictEqual(d1b.status, 0, d1b.stderr);
const events2 = telemetryFor(usB);
assert.strictEqual(events2.length, 3);
assert.strictEqual(events2[2].priorPromptSha256, wqOut.promptSha256, 'AC6: re-dispatch event preserves the prior sha');
assert.strictEqual(validateNode(events2[2], telemetrySchema, 'telemetry.jsonl[2]').length, 0, 'AC6: re-dispatch event validates');
// Finish backfill must reject a prompt that differs from the dispatch record.
const f1bad = run(UPDATE_STATE, ['finish', path.relative(repoB, stateB).replace(/\\/g, '/'), '--step', '1', '--prompt-path', wq2Out.promptPath, '--prompt-sha256', 'd'.repeat(64)], { cwd: repoB });
assert.notStrictEqual(f1bad.status, 0, 'finish backfill rejects a divergent sha');
const f1 = run(UPDATE_STATE, ['finish', path.relative(repoB, stateB).replace(/\\/g, '/'), '--step', '1'], { cwd: repoB });
assert.strictEqual(f1.status, 0, f1.stderr);

// --- AC5: DAG per-node pairs coexist; step-4 gate verifies each node pair ---
const repoD = makeRepo('dag');
const usD = makeUsDir(repoD, slug);
const wfD = `${slug}-20260930T000001Z`;
const stateD = makeState(usD, slug, wfD);
write(path.join(usD, 'ac-ledger.json'), JSON.stringify({ schemaVersion: 1, slug, acceptanceCriteria: [] }));
write(path.join(usD, 'builder-src.json'), JSON.stringify(builderManifest()));
for (const node of ['T1', 'T2']) {
  const pf = path.join(usD, `prompt-${node}.md`);
  write(pf, `# dispatch node ${node}\n`);
  const wn = run(WRITER, ['--us-dir', path.relative(repoD, usD).replace(/\\/g, '/'), '--step', '4', '--slug', slug, '--node', node, '--prompt-file', path.relative(repoD, pf).replace(/\\/g, '/'), '--manifest', path.relative(repoD, path.join(usD, 'builder-src.json')).replace(/\\/g, '/'), '--json'], { cwd: repoD });
  assert.strictEqual(wn.status, 0, wn.stderr, `AC5: node ${node} write succeeds`);
}
const t1md = path.join(usD, `step-04-${slug}.prompt.T1.md`);
const t2md = path.join(usD, `step-04-${slug}.prompt.T2.md`);
assert.ok(fs.existsSync(t1md) && fs.existsSync(t2md), 'AC5: both per-node pairs exist');
assert.ok(fs.readFileSync(t1md, 'utf8').includes('node T1'), 'AC5: node pairs do not overwrite each other');
assert.ok(fs.readFileSync(t2md, 'utf8').includes('node T2'), 'AC5: node pairs do not overwrite each other');
assert.ok(!/[/\\]/.test('T1'), 'node ids stay filename-safe');
const weird = run(WRITER, ['--us-dir', path.relative(repoD, usD).replace(/\\/g, '/'), '--step', '4', '--slug', slug, '--node', 'a/b\\c:d', '--prompt-file', path.relative(repoD, path.join(usD, 'prompt-T1.md')).replace(/\\/g, '/'), '--manifest', path.relative(repoD, path.join(usD, 'builder-src.json')).replace(/\\/g, '/'), '--json'], { cwd: repoD });
assert.strictEqual(weird.status, 0, weird.stderr);
assert.ok(fs.existsSync(path.join(usD, `step-04-${slug}.prompt.a-b-c-d.md`)), 'node ids sanitize to filename-safe');
// Empty-after-sanitize node ids fail loudly.
assert.notStrictEqual(run(WRITER, ['--us-dir', path.relative(repoD, usD).replace(/\\/g, '/'), '--step', '4', '--slug', slug, '--node', '', '--prompt-file', path.relative(repoD, path.join(usD, 'prompt-T1.md')).replace(/\\/g, '/'), '--manifest', path.relative(repoD, path.join(usD, 'builder-src.json')).replace(/\\/g, '/')], { cwd: repoD }).status, 0, 'empty node id fails');

// --- AC9: pre-advance fails closed naming the step; grandfathered runs pass ---
function gateState(root, name, completed, dispatches, skipped = []) {
  const usDir = makeUsDir(root, slug);
  const wf = `${slug}-${name}`;
  const stateFile = path.join(usDir, `${wf}.state.md`);
  write(stateFile, '---\nworkflowId: ' + wf + '\nslug: ' + slug + '\nworkflowType: standard\nstatus: active\ncurrentStep: 2\nstateVersion: 3\nrevision: 1\n---\n# state\n');
  write(path.join(usDir, 'ac-ledger.json'), JSON.stringify({ schemaVersion: 1, slug, acceptanceCriteria: [] }));
  write(path.join(usDir, '.runtime/plan.index.json'), JSON.stringify({ schemaVersion: 1 }));
  const st = { workflowId: wf, slug, workflowType: 'standard', status: 'active', currentStep: 2, stateVersion: 3, revision: 1, completedSteps: completed, skippedSteps: skipped, stepDispatches: dispatches };
  write(stateFile.replace(/\.state\.md$/, '.state.json'), JSON.stringify(st));
  write(path.join(usDir, `step-01-${slug}.plan.md`), '---\nstep: 1\nslug: ' + slug + '\nworkflowId: ' + wf + '\nstatus: completed\nstartedAt: 2026-09-30T00:00:00Z\nendedAt: 2026-09-30T00:00:01Z\nacRefs: []\n---\n# plan\n');
  return { usDir, stateFile };
}
function promptPair(usDir, step, body = '# p\n') {
  write(path.join(usDir, 'g-prompt.md'), body);
  write(path.join(usDir, 'g-builder.json'), JSON.stringify(builderManifest()));
  const r = run(WRITER, ['--us-dir', usDir, '--step', String(step), '--slug', slug, '--prompt-file', path.join(usDir, 'g-prompt.md'), '--manifest', path.join(usDir, 'g-builder.json'), '--json']);
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
const repoG = makeRepo('gate');
{
  // Missing pair fails naming the step.
  const { stateFile } = gateState(repoG, '20260930T000010Z', [1], [{ step: 1, dispatchedAt: '2026-09-30T00:00:10Z', promptPath: `.agents/plans/${slug}/step-01-${slug}.prompt.md`, promptSha256: 'e'.repeat(64) }]);
  const g = run(VALIDATE_STATE, [stateFile, '--pre-advance', '2'], { cwd: repoG });
  assert.notStrictEqual(g.status, 0, 'AC9: missing pair fails pre-advance');
  assert.match(g.stderr, /step 1/, 'AC9: error names the step');
}
{
  // Tampered markdown fails with a mismatch naming the step.
  const { usDir, stateFile } = gateState(repoG, '20260930T000011Z', [1], [{ step: 1, dispatchedAt: '2026-09-30T00:00:11Z', promptPath: `.agents/plans/${slug}/step-01-${slug}.prompt.md`, promptSha256: 'e'.repeat(64) }]);
  promptPair(usDir, 1, '# tampered\n');
  const g = run(VALIDATE_STATE, [stateFile, '--pre-advance', '2'], { cwd: repoG });
  assert.notStrictEqual(g.status, 0, 'AC9: tampered markdown fails pre-advance');
  assert.match(g.stderr, /step 1/, 'AC9: mismatch error names the step');
}
{
  // Valid pair passes.
  const { usDir, stateFile } = gateState(repoG, '20260930T000012Z', [1], []);
  const made = promptPair(usDir, 1);
  const st = JSON.parse(fs.readFileSync(stateFile.replace(/\.state\.md$/, '.state.json'), 'utf8'));
  st.stepDispatches = [{ step: 1, dispatchedAt: '2026-09-30T00:00:12Z', promptPath: path.relative(repoG, path.join(usDir, `step-01-${slug}.prompt.md`)).replace(/\\/g, '/'), promptSha256: made.promptSha256 }];
  write(stateFile.replace(/\.state\.md$/, '.state.json'), JSON.stringify(st));
  const g = run(VALIDATE_STATE, [stateFile, '--pre-advance', '2'], { cwd: repoG });
  assert.strictEqual(g.status, 0, `AC9: valid pair passes (${g.stderr})`);
}
{
  // Grandfathered dispatch without promptPath passes (pre-feature runs keep advancing).
  const { stateFile } = gateState(repoG, '20260930T000013Z', [1], [{ step: 1, dispatchedAt: '2026-09-30T00:00:13Z', model: 'x' }]);
  const g = run(VALIDATE_STATE, [stateFile, '--pre-advance', '2'], { cwd: repoG });
  assert.strictEqual(g.status, 0, `AC9: grandfathered dispatch passes (${g.stderr})`);
}
{
  // Step-4 gate verifies every node pair: corrupt one sibling and it fails.
  const { usDir, stateFile } = gateState(repoG, '20260930T000014Z', [4], [{ step: 4, dispatchedAt: '2026-09-30T00:00:14Z', promptPath: `.agents/plans/${slug}/step-04-${slug}.prompt.md`, promptSha256: 'e'.repeat(64) }]);
  const made = promptPair(usDir, 4);
  const st = JSON.parse(fs.readFileSync(stateFile.replace(/\.state\.md$/, '.state.json'), 'utf8'));
  st.stepDispatches = [{ step: 4, dispatchedAt: '2026-09-30T00:00:14Z', promptPath: path.relative(repoG, path.join(usDir, `step-04-${slug}.prompt.md`)).replace(/\\/g, '/'), promptSha256: made.promptSha256 }];
  write(stateFile.replace(/\.state\.md$/, '.state.json'), JSON.stringify(st));
  write(path.join(usDir, 'n-prompt.md'), '# node\n');
  const wn = run(WRITER, ['--us-dir', usDir, '--step', '4', '--slug', slug, '--node', 'T9', '--prompt-file', path.join(usDir, 'n-prompt.md'), '--manifest', path.join(usDir, 'g-builder.json'), '--json']);
  assert.strictEqual(wn.status, 0, wn.stderr);
  let g = run(VALIDATE_STATE, [stateFile, '--pre-advance', '5'], { cwd: repoG });
  assert.strictEqual(g.status, 0, `AC5: plain + node pairs pass (${g.stderr})`);
  fs.appendFileSync(path.join(usDir, `step-04-${slug}.prompt.T9.md`), 'tamper\n');
  g = run(VALIDATE_STATE, [stateFile, '--pre-advance', '5'], { cwd: repoG });
  assert.notStrictEqual(g.status, 0, 'AC5: corrupt node pair fails the gate');
  assert.match(g.stderr, /step 4/, 'AC5: node failure names step 4');
}

// --- AC8: lite inline pair + skip marker; finish backfills provenance ---
const repoL = makeRepo('lite');
const usL = makeUsDir(repoL, slug);
const wfL = `${slug}-20260930T000020Z`;
const stateL = makeState(usL, slug, wfL);
write(path.join(usL, 'ac-ledger.json'), JSON.stringify({ schemaVersion: 1, slug, acceptanceCriteria: [] }));
write(path.join(usL, 'prompt-src.md'), '# inline step\n');
write(path.join(usL, 'builder-src.json'), JSON.stringify(builderManifest()));
const wl = run(WRITER, ['--us-dir', path.relative(repoL, usL).replace(/\\/g, '/'), '--step', '2', '--slug', slug, '--dispatch-mode', 'inline', '--prompt-file', path.relative(repoL, path.join(usL, 'prompt-src.md')).replace(/\\/g, '/'), '--manifest', path.relative(repoL, path.join(usL, 'builder-src.json')).replace(/\\/g, '/'), '--json'], { cwd: repoL });
assert.strictEqual(wl.status, 0, wl.stderr);
const wlOut = JSON.parse(wl.stdout);
const liteMan = JSON.parse(fs.readFileSync(path.join(usL, `step-02-${slug}.prompt.json`), 'utf8'));
assert.strictEqual(liteMan.dispatchMode, 'inline', 'AC8: lite pair uses dispatchMode inline');
const dl = run(LITE_UPDATE, ['dispatch', path.relative(repoL, stateL).replace(/\\/g, '/'), '--step', '2'], { cwd: repoL });
assert.strictEqual(dl.status, 0, dl.stderr);
const fl = run(LITE_UPDATE, ['finish', path.relative(repoL, stateL).replace(/\\/g, '/'), '--step', '2', '--prompt-path', wlOut.promptPath, '--prompt-sha256', wlOut.promptSha256], { cwd: repoL });
assert.strictEqual(fl.status, 0, fl.stderr);
const stL = stateJsonFor(stateL);
assert.strictEqual(stL.stepDispatches[0].promptSha256, wlOut.promptSha256, 'AC8: finish backfills the lite entry');
const sk = run(WRITER, ['--us-dir', path.relative(repoL, usL).replace(/\\/g, '/'), '--step', '3', '--slug', slug, '--dispatch-mode', 'inline', '--skip-marker', '--json'], { cwd: repoL });
assert.strictEqual(sk.status, 0, sk.stderr);
const skOut = JSON.parse(sk.stdout);
assert.strictEqual(skOut.skipped, true, 'AC8: skip marker reports skipped');
assert.ok(!fs.existsSync(path.join(usL, `step-03-${slug}.prompt.md`)), 'AC8: skip marker writes no markdown');
const skMan = JSON.parse(fs.readFileSync(path.join(usL, `step-03-${slug}.prompt.json`), 'utf8'));
assert.strictEqual(skMan.skipped, true, 'AC8: skip marker manifest flags skipped');
// Skip marker refused when a prompt was already written for the step.
write(path.join(usL, 'prompt-src.md'), '# already there\n');
assert.strictEqual(run(WRITER, ['--us-dir', path.relative(repoL, usL).replace(/\\/g, '/'), '--step', '2', '--slug', slug, '--dispatch-mode', 'inline', '--prompt-file', path.relative(repoL, path.join(usL, 'prompt-src.md')).replace(/\\/g, '/'), '--manifest', path.relative(repoL, path.join(usL, 'builder-src.json')).replace(/\\/g, '/')], { cwd: repoL }).status, 0);
assert.notStrictEqual(run(WRITER, ['--us-dir', path.relative(repoL, usL).replace(/\\/g, '/'), '--step', '2', '--slug', slug, '--dispatch-mode', 'inline', '--skip-marker'], { cwd: repoL }).status, 0, 'skip marker refused over an existing prompt');

// --- AC7: registry rows, never-staged glob, cleanup preservation, G2 exclusion ---
const artifacts = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/ARTIFACTS.md'), 'utf8');
assert.match(artifacts, /step-\{NN\}-\{slug\}\.prompt\.md/, 'AC7: registry lists the prompt markdown');
assert.match(artifacts, /step-\{NN\}-\{slug\}\.prompt\.json/, 'AC7: registry lists the prompt manifest');
assert.match(artifacts, /step-04-\{slug\}\.prompt\.\{node\}\.md/, 'AC7: registry lists the DAG per-node variant');
assert.match(artifacts, /step-\{NN\}-\{slug\}\.prompt\.\*/, 'AC7: never-staged glob covers prompt pairs');
const cleanup = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/protocols/artifact-cleanup.md'), 'utf8');
assert.match(cleanup, /\*\*Preserved:\*\*[^]*prompt/, 'AC7: cleanup preserves prompt pairs');
const deleteTargets = cleanup.split('\n').filter((line) => line.trim().startsWith('rm -f')).map((line) => line.trim().split(' ').at(-1));
assert.ok(deleteTargets.length > 0, 'AC7: Phase B delete list found');
for (const sample of [`step-01-${slug}.prompt.md`, `step-01-${slug}.prompt.json`, `step-04-${slug}.prompt.T1.md`, `step-04-${slug}.prompt.T1.json`]) {
  for (const target of deleteTargets) {
    const slugPattern = target.replace('{us-dir}/', '').replace('{slug}', slug).replace(/\./g, '\\.').replace(/\*/g, '.*');
    assert.ok(!new RegExp(`^${slugPattern}$`).test(sample), `AC7: Phase B delete ${target} keeps ${sample}`);
  }
}
const recipe = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md'), 'utf8');
assert.match(recipe, /write_dispatch_prompt_audit\.cjs/, 'AC7: dispatch recipe invokes the writer');
assert.match(recipe, /--prompt-path/, 'AC7: dispatch recipe passes provenance flags');
// G2-code stages product files but never prompt pairs under {us-dir}.
const gitCheck = spawnSync('git', ['--version'], { encoding: 'utf8' });
assert.strictEqual(gitCheck.status, 0, 'git is available for the G2 exclusion test');
const repoG2 = path.join(tempRoot, 'g2');
fs.mkdirSync(repoG2, { recursive: true });
const git = (...args) => {
  const r = spawnSync('git', args, { cwd: repoG2, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r;
};
git('init');
git('config', 'user.email', 'test@example.com');
git('config', 'user.name', 'test');
write(path.join(repoG2, '.ws/config.json'), JSON.stringify({ plans: { dir: '.agents/plans' }, defaults: {} }));
const usG2 = path.join(repoG2, '.agents/plans', slug);
fs.mkdirSync(usG2, { recursive: true });
const wfG2 = `${slug}-20260930T000030Z`;
const stateG2 = makeState(usG2, slug, wfG2);
const prodFile = path.join(repoG2, 'prod/app.js');
write(prodFile, 'v1\n');
git('add', '.');
git('commit', '-m', 'baseline');
write(prodFile, 'v2\n');
const promptG2 = path.join(usG2, `step-01-${slug}.prompt.md`);
write(promptG2, '# prompt\n');
write(path.join(usG2, `step-01-${slug}.prompt.json`), JSON.stringify({ promptSha256: 'x' }));
write(stateG2.replace(/\.state\.md$/, '.state.json'), JSON.stringify({ workflowId: wfG2, slug, status: 'active', currentStep: 5, revision: 1, workflowManifest: { created: [], modified: ['prod/app.js', `.agents/plans/${slug}/step-01-${slug}.prompt.md`], deleted: [] } }));
const g2res = run(G2, ['--state', path.relative(repoG2, stateG2).replace(/\\/g, '/'), '--step', '5', '--message', 'g2 test'], { cwd: repoG2 });
assert.strictEqual(g2res.status, 0, g2res.stderr);
const committed = git('show', '--name-only', '--pretty=format:', 'HEAD').stdout.split('\n').map((l) => l.trim()).filter(Boolean);
assert.ok(committed.includes('prod/app.js'), 'AC7: G2 commits the product file');
assert.ok(!committed.some((f) => f.includes('.prompt.')), 'AC7: G2 stages no prompt pairs');
assert.ok(!committed.some((f) => f.includes('.agents/plans/')), 'AC7: G2 stages no plan-dir files');

console.log('test-dispatch-prompt-audit: ok');
